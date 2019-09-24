var cLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";
var cMedID = "chest_medal";
handlers.FreeChestOpen = function (args, context) {
    try {
        var cId = currentPlayerId;
        var items = []; var chest = {};
        var rData = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [cKey] } );
        if(!rData.Data.hasOwnProperty(cKey)) throw "rData not found :"+ cKey;
        chest = JSON.parse(rData.Data[cKey].Value);
        var cnt = GetChestCnt(cSupID);
        if(cnt <= 0) throw "1004";
        var pull = server.UnlockContainerItem( { PlayFabId: cId, ContainerItemId: cSupID } );
        items = MakeItemData(pull.GrantedItems);
        chest.uDate = new Date();
        rdUpdate(cKey,chest);
        if(items.length == 0) { throw "1005"; }

        return items;
    }catch(e) {
        var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj;
    }
}
handlers.GetFreeChestInfo = function (args, context) {
    try {
        var cId = currentPlayerId;
        var cTime = new Date();
        var uDate = new Date();
        var wTime = 240 * (1000 * 60);
        var lTime = 0;
        var chest = {};
        chest.uDate = new Date();
        chest.lTime = 0;
        var cnt = 0;
        var rData = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [cKey] } );
        if(rData.Data.hasOwnProperty(cKey)) {
            chest = JSON.parse(rData.Data[cKey].Value);
            if(chest.lTime === undefined) {
                cnt = cLimit;
                chest.lTime = 0;
            }
            uDate = new Date(chest.uDate);
            lTime = cTime.getTime() - uDate.getTime() - chest.lTime;
            for(var i=0; i<cLimit; i++){
                lTime -= wTime;
                if(lTime >= 0) cnt += 1
                else { lTime += wTime; break; }
            }
            if(cnt >= cLimit) {
                cnt = cLimit;
                lTime = 0;
            }
        }else { cnt = cLimit; }
        cnt -= GetChestCnt(cSupID);
        var iIds = [];
        for(var i=0; i<cnt; i++) iIds.push(cSupID);
        if(cnt > 0) server.GrantItemsToUser({ PlayFabId: cId, ItemIds: iIds });
        rdUpdate(cKey,chest);
        
        return chest;
    }catch(e) { var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj; }
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
        for(var i in t.SubContentsList){ if(t.SubContentsList[i] == args.mode) isReal = true; }
        if(!isReal || amount < 0) { throw "1006"; }
        if(vc >= t.ChestMedalLimit) { throw "1007"; }
        if(vc + amount > t.ChestMedalLimit) { amount = t.ChestMedalLimit - vc; }
        
        var stcR = server.GetPlayerStatistics( {PlayFabId: cId, StatisticNames: [ args.mode ]} );
        if(stcR.Statistics.length > 0) { stc = stcR.Statistics[0]; }
        stc.Value = args.score;
        server.UpdatePlayerStatistics({ PlayFabId: cId, Statistics: [stc] });
        if(amount > 0) {
            server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: args.amount, VirtualCurrency: "CM" });
        }
    }catch(e) { var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj; }
}
handlers.MedalChestOpen = function (args, context) {
    try {
        var cId = currentPlayerId;
        var inv = server.GetUserInventory({ PlayFabId: cId });
        var cD = GetItemCatalogData(cMedID);
        if(cD == null) { throw "catalog not found"; }
        var customD = JSON.parse(cD.CustomData);
        for(var i in customD.costs) {
            if(!inv.VirtualCurrency.hasOwnProperty(customD.costs[i].vc) || inv.VirtualCurrency[customD.costs[i].vc] < customD.costs[i].cost) {
                throw "lack:" + customD.costs[i].vc;
            }
        }
        if(GetChestCnt(cMedID) == 0) { server.GrantItemsToUser({ PlayFabId: cId, ItemIds: [cMedID] }); }
        var pull = server.UnlockContainerItem( { PlayFabId: cId, ContainerItemId: cMedID } );
        var items = MakeItemData(pull.GrantedItems);
        for(var i in customD.costs) {
            server.SubtractUserVirtualCurrency({ PlayFabId: cId, Amount: customD.costs[i].cost, VirtualCurrency: customD.costs[i].vc });
        }
        
        return items;
    }catch(e) { var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj; }
}
