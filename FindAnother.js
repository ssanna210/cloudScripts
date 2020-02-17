handlers.FindAnother = function (args, context) {
    try {
        var cId = currentPlayerId;
        var rData = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [cKey] } );
        if(!rData.Data.hasOwnProperty(cKey)) throw "rData not found :"+ cKey;
        chest = JSON.parse(rData.Data[cKey].Value);
        var cnt = GetChestCnt(cSupID);
        if(cnt <= 0) throw "1004";
        var pull = server.UnlockContainerItem( { PlayFabId: cId, ContainerItemId: cSupID } );
        items = MakeItemData(pull.GrantedItems);
        chest.uDate = new Date();
        rdUpdate(cKey,chest);
        if(items.length == 0) throw "1005";
        chest.items = items; chest.cnt = cnt-1;
        return chest;
    }catch(e) {
        var r = {}; r["errorDetails"] = "Error: " + e; return r;
    }
}
