var REF_REW = "bundle_referral";
var REF_BADGE = "badge_referral";
var REF_MAX = 10;
handlers.RedeemRef = function(args) {
    try{
        var cId = currentPlayerId;
        if(args == null || typeof args.code === undefined || args.code === ""){ throw "1000"; }
        else if(args.code === cId) { throw "1001"; }
        var invR = server.GetUserInventory({ "PlayFabId": cId });
        for(var i in invR.Inventory) { if(invR.Inventory[i].ItemId === REF_BADGE) throw "1002"; }
        var rData = server.GetUserReadOnlyData({ "PlayFabId": args.code, "Keys": [ "Referrals" ] });
        var rValues = [];
        if(!rData.Data.hasOwnProperty("Referrals")) {
            rValues.push(cId);
            ProcessRef(args.code, rValues);
        } else {
            rValues = JSON.parse(rData.Data["Referrals"].Value);
            if(Array.isArray(rValues)) {
                if(rValues.length < REF_MAX) {
                    rValues.push(cId);
                    ProcessRef(args.code, rValues);
                } else { log.info("Player:" + args.code + " max REFs (" + REF_MAX + ")." ); }
            } else {
                throw "1003";
            }
        }
        return GrantRefBonus(cId, args.code);
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}
function ProcessRef(id, referrals)
{
    var rdReq = { "PlayFabId": id, "Data": {} };
    rdReq.Data["Referrals"] = JSON.stringify(referrals);
    var rdR = server.UpdateUserReadOnlyData(rdReq);
    var r = server.AddUserVirtualCurrency({ "PlayFabId" : id, "VirtualCurrency": "GE", "Amount": 10 });
    log.info(vcReq.Amount + " " + "GE" + " granted to " + id);
}
function GrantRefBonus(id, code)
{
    var req = { "PlayFabId" : id, "ItemIds" : [ REF_BADGE ], "Annotation" : "Referred by: " + code };
    server.GrantItemsToUser(req);
    var vR = server.AddUserVirtualCurrency({ "PlayFabId" : id, "VirtualCurrency": "GE", "Amount": 100 });
    return vR.BalanceChange;
}
