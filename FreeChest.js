var cLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";

handlers.FreeChestOpen = function (args) {
    try {

        var items = [];
        var cTime = new Date();
        var uDate = new Date();
        var waitTime = 240 * (1000 * 60);
        var leftTime = 0;
        var chest = {};

        var rData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [cKey] } );
        if(rData.Data.hasOwnProperty(cKey)) {
            chest = JSON.parse(rData.Data[cKey].Value);
            uDate = new Date(chest.uDate);
            leftTime = cTime.getTime() - uDate.getTime() - chest.leftTime;
            for(var i=0; i<cLimit; i++){
                leftTime -= waitTime;
                if(leftTime >= 0){chest.cnt += 1}
                else{leftTime += waitTime; break;}
            }
            if(chest.cnt >= cLimit) {
                chest.cnt = cLimit;
                leftTime = 0;
            }
        }else {
            chest.cnt = cLimit;
            chest.uDate = new Date();
            chest.leftTime = 0;
        }
        if(chest.cnt <= 0) { throw "FreeChest not yet"; }

        if(GetChestCnt(cSupID) == 0) {
            server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: [cSupID] });
        }

        var pull = server.UnlockContainerItem( { PlayFabId: currentPlayerId, ContainerItemId: cSupID } );
        chest.cnt -= 1;
        items = MakeItemData(pull.GrantedItems);

        uDate = new Date();
        chest.uDate = uDate;
        chest.leftTime = leftTime;

        var rdReq = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        rdReq.Data[cKey] = JSON.stringify( chest );
        var rdR = server.UpdateUserReadOnlyData(rdReq);

        if(items.length == 0) { throw "result is nothing"; }

        return items;

    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function GetChestCnt (id) {
    var r = 0;
    var inv = server.GetUserInventory({ PlayFabId: currentPlayerId });
    for(var i in inv.Inventory) {
        if(inv.Inventory[i].ItemId == id) { r++ }
    }
    return r;
}
