var REF_REW = "premiumStarterPack";
var REF_BADGE = "referralBadge";

handlers.RedeemReferral = function(args) {

    try{
        
        var cId = currentPlayerId;
        
        if(args == null || typeof args.referralCode === undefined || args.referralCode === "")
        {
            throw "1000";
        }
        else if(args.referralCode === cId)
        {
            throw "1001";
        }
        
        var invR = server.GetUserInventory({ "PlayFabId": cId });
        for(var i in invR.Inventory)
        {
            if(invR.Inventory[i].ItemId === REF_BADGE) throw "1002";
        }
        
        var rData = server.GetUserReadOnlyData({ "PlayFabId": args.referralCode, "Keys": [ "Referrals" ] });
        var rValues = [];

        if(!rData.Data.hasOwnProperty("Referrals"))
        {
            rValues.push(cId);
            ProcessReferrer(args.referralCode, rValues);
        }
        else
        {
            rValues = JSON.parse(rData.Data["Referrals"].Value);
            if(Array.isArray(rValues))
            {
                if(rValues.length < 10)
                {
                    rValues.push(cId);
                    ProcessReferrer(args.referralCode, rValues);
                }
                else
                {
                    log.info("Player:" + args.referralCode + " has hit the maximum number of referrals (" + 10 + ")." );
                }
            }
            else
            {
                throw "1003";
            }
        }
        
        return GrantReferralBonus(args.referralCode);
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};



function ProcessReferrer(id, referrals)
{
    
    var rdReq = {
        "PlayFabId": id,
        "Data": {}
    };
    rdReq.Data["Referrals"] = JSON.stringify(referrals);
    var rdR = server.UpdateUserReadOnlyData(rdReq);
    
    var vcReq = {
        "PlayFabId" : id,
        "VirtualCurrency": "GE",
        "Amount": 10
    };
    var result = server.AddUserVirtualCurrency(vcReq);

    log.info(vcReq.Amount + " " + "GE" + " granted to " + id);
}


function GrantReferralBonus(code)
{
    var req = {
        "PlayFabId" : currentPlayerId,
        "ItemIds" : [ REF_BADGE, REF_REW ],
        "Annotation" : "Referred by: " + code
    };

    var r = server.GrantItemsToUser(req);
    return r.ItemGrantResults;
}
