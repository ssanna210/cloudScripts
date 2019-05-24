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
        
        var invResult = server.GetUserInventory({ "PlayFabId": currentPlayerId });
        for(var index in invResult.Inventory)
        {
            if(invResult.Inventory[index].ItemId === REFERRAL_BADGE)
            {
                throw "You are only allowed one Referral Badge.";
            }
        }
        
        var rData = server.GetUserReadOnlyData({ "PlayFabId": args.referralCode, "Keys": [ "Referrals" ] });
        var referralValues = [];

        if(!rData.Data.hasOwnProperty("Referrals"))
        {
            referralValues.push(currentPlayerId);
            ProcessReferrer(args.referralCode, referralValues);
        }
        else
        {
            referralValues = JSON.parse(rData.Data["Referrals"].Value);
            if(Array.isArray(referralValues))
            {
                if(referralValues.length < 10)
                {
                    referralValues.push(currentPlayerId);
                    ProcessReferrer(args.referralCode, referralValues);
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
    
    var rdRequest = {
        "PlayFabId": id,
        "Data": {}
    };
    rdRequest.Data["Referrals"] = JSON.stringify(referrals);
    var UpdateUserReadOnlyDataResult = server.UpdateUserReadOnlyData(rdRequest);
    
    var vcRequest = {
        "PlayFabId" : id,
        "VirtualCurrency": "GE",
        "Amount": 10
    };
    var result = server.AddUserVirtualCurrency(vcRequest);

    log.info(vcRequest.Amount + " " + "GE" + " granted to " + id);
}


function GrantReferralBonus(code)
{
    var request = {
        "PlayFabId" : currentPlayerId,
        "ItemIds" : [ REFERRAL_BADGE, REFERRAL_BONUS_BUNDLE ],
        "Annotation" : "Referred by: " + code
    };

    var result = server.GrantItemsToUser(request);
    return result.ItemGrantResults;
}
