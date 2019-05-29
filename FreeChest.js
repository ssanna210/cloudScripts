var cLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";

handlers.FreeChestOpen = function (args) {
    try {

        var items = [];
        var cTime = new Date();
        var uDate = new Date();
        var wTime = 240 * (1000 * 60);
        var lTime = 0;
        var chest = {};

        var rData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [cKey] } );
        if(rData.Data.hasOwnProperty(cKey)) {
            chest = JSON.parse(rData.Data[cKey].Value);
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
            chest.uDate = new Date();
            chest.lTime = 0;
        }
        if(chest.cnt == null) {chest.cnt = 2; rdUpdate(cKey,chest);}
        if(chest.cnt <= 0) { throw "FreeChest not yet"; }

        if(GetChestCnt(cSupID) == 0) {
            server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: [cSupID] });
        }

        var pull = server.UnlockContainerItem( { PlayFabId: currentPlayerId, ContainerItemId: cSupID } );
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
