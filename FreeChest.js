var cLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";

handlers.FreeChestOpen = function (args, context) {
    try {
        var cId = currentPlayerId;
        var items = [];
        var cTime = new Date();
        var uDate = new Date();
        var wTime = 240 * (1000 * 60);
        var lTime = 0;
        var chest = {};
        chest.uDate = new Date();
        chest.lTime = 0;

        var rData = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [cKey] } );
        if(rData.Data.hasOwnProperty(cKey)) {
            chest = JSON.parse(rData.Data[cKey].Value);

            if(chest.cnt == null || chest.lTime === undefined) {
                chest.cnt = cLimit;
                chest.lTime = 0;
                rdUpdate(cKey,chest);
            }

            uDate = new Date(chest.uDate);
            lTime = cTime.getTime() - uDate.getTime() - chest.lTime;
            for(var i=0; i<cLimit; i++){
                lTime -= wTime;
                if(lTime >= 0){chest.cnt += 1}
                else{lTime += wTime; break;}
            }
            if(chest.cnt >= cLimit) {
                chest.cnt = cLimit;
                lTime = 0;
            }
        }else {
            chest.cnt = cLimit;
        }

        if(chest.cnt <= 0) { throw "FreeChest not yet"; }

        if(GetChestCnt(cSupID) == 0) {
            server.GrantItemsToUser({ PlayFabId: cId, ItemIds: [cSupID] });
        }

        var pull = server.UnlockContainerItem( { PlayFabId: cId, ContainerItemId: cSupID } );
        chest.cnt -= 1;
        items = MakeItemData(pull.GrantedItems);

        uDate = new Date();
        chest.uDate = uDate;
        chest.lTime = lTime;

        rdUpdate(cKey,chest);

        if(items.length == 0) { throw "result is nothing"; }

        return items;

    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function rdUpdate(key,obj){
    var req = { "PlayFabId": currentPlayerId, "Data": {} }
    req.Data[key] = JSON.stringify(obj);
    return server.UpdateUserReadOnlyData(req);
}

function GetChestCnt (id) {
    var r = 0;
    var inv = server.GetUserInventory({ PlayFabId: currentPlayerId });
    for(var i in inv.Inventory) {
        if(inv.Inventory[i].ItemId == id) { r++ }
    }
    return r;
}

handlers.SubUpdate = function (args, context) {
    try {
        var cId = currentPlayerId;
        var inven = server.GetUserInventory({PlayFabId:cId});
        var vc = inven.VirtualCurrency["CM"];
        var amount = args.amount;
        
        var stc = {};
        stc.StatisticName = args.mode;
        stc.Value = 1;
        
        var tD = server.GetTitleData( { "Keys" : [ "General"] } );
        var t = JSON.parse(tD.Data["General"]);
        var isReal = false;
        for(var i in t.SubContentsList){ if(t[i] == args.mode) isReal = true; }
        if(!isReal || amount < 0) { throw "invalid input parameters"; }
        if(vc >= t.ChestMedalLimit) { throw "vc full"; }
        
        if(vc + amount > t.ChestMedalLimit) { amount = t.ChestMedalLimit - vc; }
        
        var stcR = server.GetPlayerStatistics( {PlayFabId: cId, StatisticNames: [ args.mode ]} );
        if(stcR.Statistics.length > 0) { stc = stcR.Statistics[0]; }
        stc.Value = args.score;
        server.UpdatePlayerStatistics({ PlayFabId: cId, Statistics: [stc] });
        if(amount > 0) {
            server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: args.amount, VirtualCurrency: "CM" });
        }
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}


