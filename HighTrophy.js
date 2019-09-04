HTN = "HighTrophy";

handlers.HTCheck = function (args, context) {
    try {
        var cId = currentPlayerId;
        var lp = 0;
        var stcR = server.GetPlayerStatistics({ "PlayFabId": cId });
        var hTStc = {};
        var tStc = {};
        tStc.StatisticName = "TotalTier";
        tStc.Value = 1;
                                              
        if(StcR.Statistics.length == 0) {throw "nothing Stc";}
        for(var i in stcR.Statistics) {
            if(stcR.Statistics[i].StatisticName == HTN) 
                hTStc = stcR.Statistics[i];
            if(stcR.Statistics[i].StatisticName == "TotalTier") 
                tStc = stcR.Statistics[i];
        }
        var hTVer = 0;
        if(hTStc.hasOwnProperty("Version")) {
            hTVer = hTStc.Version;
        }
        
        var TitleR = server.GetTitleData( { "Keys" : [ "General" ] } );
        var gT = JSON.parse( TitleR.Data["General"] );
        if(tStc.Value < gT.TierForHighTrophy) { throw "not yet tier for "+ HTN; }
        
        var iD = server.GetUserInternalData( {PlayFabId : cId} );
        if(iD.Data.hasOwnProperty("HTBVer")){
            if(iD.Data.HTBVer >= hTStc.Version) throw "aleady get reward";
        }
        var stcR2 = server.GetPlayerStatistics
            ({ "PlayFabId": cId, "StatisticNameVersions":[{"StatisticName":HTN, "Version": hTVer -1 }] });
        for(var i in stcR2.Statistics){
           if(stcR2.Statistics[i].StatisticName == HTN) hTStc = stcR2.Statistics[i];
        }
        if(hTStc.Version == htVer) throw "not found";
        var uData = {};
        uData.HTBVer = hTVer-1;
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
