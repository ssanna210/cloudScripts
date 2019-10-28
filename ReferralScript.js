handlers.RedeemRef = function(args) {
    try{
        var cId = currentPlayerId;
        if(args == null || typeof args.code === undefined || args.code === ""){ throw "1000"; }
        else if(args.code === cId) { throw "1001"; }
        var TitleR = server.GetTitleData({ "Keys" : [ "Promotion" ] });
        var pT = JSON.parse( TitleR.Data["Promotion"] ).Referral;
        var invR = server.GetUserInventory({ "PlayFabId": cId });
        for(var i in invR.Inventory) { if(invR.Inventory[i].ItemId === pT.Badge) throw "1002"; }
        var rData = server.GetUserReadOnlyData({ "PlayFabId": args.code, "Keys": [ "Referrals" ] });
        var rValues = [];
        if(!rData.Data.hasOwnProperty("Referrals")) {
            rValues.push(cId);
            ProcessRef(args.code, rValues, pT.RefOtherGem);
        } else {
            rValues = JSON.parse(rData.Data["Referrals"].Value);
            if(Array.isArray(rValues)) {
                if(rValues.length < pT.Limit) {
                    rValues.push(cId);
                    ProcessRef(args.code, rValues);
                } else { log.info("Player:" + args.code + " max REFs (" + REF_MAX + ")." ); }
            } else {
                throw "1003";
            }
        }
        return GrantRefBonus(cId, args.code, pT.RefMyGem, pT.Badge);
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}
function ProcessRef(id, referrals, amount)
{
    var rdReq = { "PlayFabId": id, "Data": {} };
    rdReq.Data["Referrals"] = JSON.stringify(referrals);
    var rdR = server.UpdateUserReadOnlyData(rdReq);
    var r = server.AddUserVirtualCurrency({ "PlayFabId" : id, "VirtualCurrency": "GE", "Amount": amount });
    log.info(amount + " " + "GE" + " granted to " + id);
}
function GrantRefBonus(id, code, amount, badgeId)
{
    var req = { "PlayFabId" : id, "ItemIds" : [ badgeId ], "Annotation" : "Referred by: " + code };
    server.GrantItemsToUser(req);
    var vR = server.AddUserVirtualCurrency({ "PlayFabId" : id, "VirtualCurrency": "GE", "Amount": amount });
    return vR.BalanceChange;
}
