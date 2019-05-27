var stackLimit = 2;
var cKey = "FreeChest";
var cSupID = "chest_supply";

handlers.FreeChestOpen = function (args) {
    try {
        
        var items = [];
        var currentTime = new Date();
        var unLockDate = new Date();
        var waitTime = 240 * (1000 * 60);
        var cnt = 0;
        var ids = [];
        
        var rData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [cKey] } );

        var remain = GetChestCnt(cSupID);
        
        if(remain == 0) {
            
            if(rData.Data.hasOwnProperty(cKey)) {
            
                unLockDate = new Date( rData.Data[cKey].Value );
            
                cnt = parseInt((unLockDate.getTime() - currentTime.getTime()) / waitTime);
            
            }else {
            
                cnt = stackLimit;
            
            }
        
            if(cnt > stackLimit) { cnt = stackLimit; }
            if(cnt == 0) { throw "FreeChest not yet"; }
            
            for(var i=0; i< cnt; i++) { 
                ids.push(cSupID);
            }
            
            server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: ids });
            
        }
        
        var pull = server.UnlockContainerItem( { PlayFabId: currentPlayerId, ContainerItemId: cSupID } );
        items = MakeItemData(pull.GrantedItems);
        
        remain = GetChestCnt(cSupID);
        
        if(remain == 0) {
            unLockDate.setTime(currentTime.getTime() + waitTime);
        
            var rdReq = {
                "PlayFabId": currentPlayerId,
                "Data": {}
            };
            rdReq.Data[cKey] = JSON.stringify( unLockDate );
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

function GetChestCnt (itemId) {
    
    var cnt = 0;
    var inv = server.GetUserInventory({ PlayFabId: currentPlayerId });
    for(var index in inv.Inventory) {
        if(inv.Inventory[index].ItemId == itemId) { cnt++ }
    }
    
    return cnt;
    
}
