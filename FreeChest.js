var stackLimit = 2;
var cKey = "FreeChests";

handlers.FreeChestOpen = function (args) {
    try {
        
        var items = [];
        var currentTime = new Date();
        var waitTime = 240;
        
        var chests = [];
        var rData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [cKey] } );
        if(rData.Data.hasOwnProperty(cKey)) {
            chests = JSON.parse( rData.Data[cKey].Value );
        }else {
            for(var i=0; i< stackLimit; i++) {
                var chest = currentTime;
                chests.push(chest);
            }
        }
        
        for(var i=0; i< chests.length; i++) {
            
            var unLockDate = new Date( chests[i] );
            
            if(currentTime.getTime() >= unLockDate.getTime()) {
                
                var pull = server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: ["bundle_supply"] });
                items = MakeItemData(pull.ItemGrantResults);
                
                unLockDate = new Date();
                unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));
                chests[i] = unLockDate;
                
                break;
                
            }
            
        }
        
        var rdReq = {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        rdReq.Data[cKey] = JSON.stringify(chests);
        var rdR = server.UpdateUserReadOnlyData(rdReq);
        
        if(items.length == 0) { throw "result is nothing"; }
        
        return items;
        
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}
