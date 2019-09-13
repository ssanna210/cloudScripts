var HTN = "HighTrophy";
handlers.HTCheck = function (args, context) {
    try {
        var cId = currentPlayerId;
        var lp = 0;
        var stcR = server.GetPlayerStatistics({ "PlayFabId": cId });
        var hTStc = {};
        var tStc = {};
        tStc.StatisticName = "TotalTier";
        tStc.Value = 1;
        for(var i in stcR.Statistics) {
            if(stcR.Statistics[i].StatisticName == "TotalTier") tStc = stcR.Statistics[i];
        }
        var verR = server.GetPlayerStatisticVersions({"StatisticName": HTN});
        var hTVer = verR.StatisticVersions[0] - 1;
        var TitleR = server.GetTitleData( { "Keys" : [ "General" ] } );
        var gT = JSON.parse( TitleR.Data["General"] );
        if(hTVer < 0 || tStc.Value < gT.TierForHighTrophy) { return lp; }
        var iD = server.GetUserInternalData( {PlayFabId : cId} );
        if(iD.Data.hasOwnProperty("HTBVer")){
            if(iD.Data.HTBVer >= hTVer) return lp;
        }
        var stcR2 = server.GetPlayerStatistics
            ({ "PlayFabId": cId, "StatisticNameVersions":[{"StatisticName":HTN, "Version": hTVer }] });
        for(var i in stcR2.Statistics){
           if(stcR2.Statistics[i].StatisticName == HTN) hTStc = stcR2.Statistics[i];
        }
        if(hTStc.Value === undefined) return lp;
        var uData = {};
        uData.HTBVer = hTVer;
        lp = hTStc.Value * gT.HTtoLPx;
        server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: lp, VirtualCurrency: "LP" });
        server.UpdateUserInternalData({ PlayFabId : cId, Data : uData });
        
        return lp;
    }catch(e) {
        var r = {};
        r["errorDetails"] = "Error: " + e;
        return r;
    }
}
