var REFERRAL_BONUS_BUNDLE = "premiumStarterPack";
var REFERRAL_BADGE = "referralBadge";

handlers.RedeemReferral = function(args) {

    try{
        if(args == null || typeof args.referralCode === undefined || args.referralCode === "")
        {
            throw "Failed to redeem. args.referralCode is undefined or blank";
        }
        else if(args.referralCode === currentPlayerId)
        {
            throw "You are not allowed to refer yourself.";
        }
        
        var invR = server.GetUserInventory({ "PlayFabId": currentPlayerId });
        for(var index in invR.Inventory)
        {
            if(invR.Inventory[index].ItemId === REFERRAL_BADGE)
            {
                throw "You are only allowed one Referral Badge.";
            }
        }
        
        var rData = server.GetUserReadOnlyData({ "PlayFabId": args.referralCode, "Keys": [ "Referrals" ] });
        var rValues = [];

        if(!rData.Data.hasOwnProperty("Referrals"))
        {
            rValues.push(currentPlayerId);
            ProcessReferrer(args.referralCode, rValues);
        }
        else
        {
            rValues = JSON.parse(rData.Data["Referrals"].Value);
            if(Array.isArray(rValues))
            {
                if(rValues.length < 10)
                {
                    rValues.push(currentPlayerId);
                    ProcessReferrer(args.referralCode, rValues);
                }
                else
                {
                    log.info("Player:" + args.referralCode + " has hit the maximum number of referrals (" + 10 + ")." );
                }
            }
            else
            {
                throw "An error occured when parsing the referrer's player data.";
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
        "ItemIds" : [ REFERRAL_BADGE, REFERRAL_BONUS_BUNDLE ],
        "Annotation" : "Referred by: " + code
    };

    var result = server.GrantItemsToUser(req);
    return result.ItemGrantResults;
}
