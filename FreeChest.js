var cLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";

handlers.FreeChestOpen = function (args) {
    try {
        
        var items = [];
        var cTime = new Date();
        var uDate = new Date();
        var waitTime = 240 * (1000 * 60);
        var cnt = 0;
        var ids = [];

        var rData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [cKey] } );

        if(GetChestCnt(cSupID) == 0) {

            if(rData.Data.hasOwnProperty(cKey)) {
                uDate = new Date( rData.Data[cKey].Value );
                cnt = parseInt( ( uDate.getTime() - cTime.getTime() ) / waitTime );
            }else {
                cnt = cLimit;
            }

            if(cnt > cLimit) { cnt = cLimit; }
            if(cnt <= 0) { throw "FreeChest not yet"; }

            for(var i=0; i< cnt; i++) { 
                ids.push(cSupID);
            }

            server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: ids });

        }

        var pull = server.UnlockContainerItem( { PlayFabId: currentPlayerId, ContainerItemId: cSupID } );
        items = MakeItemData(pull.GrantedItems);

        if(GetChestCnt(cSupID) == 0) {
            uDate.setTime(cTime.getTime() + waitTime);

            var rdReq = {
                "PlayFabId": currentPlayerId,
                "Data": {}
            };
            rdReq.Data[cKey] = JSON.stringify( uDate );
            var rdR = server.UpdateUserReadOnlyData(rdReq);
        }

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
