var VIRTUAL_CURRENCY_CODE = "GM";
var PLAYER_REFERRAL_KEY = "Referrals";
var MAXIMUM_REFERRALS = 10;
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
        
        var GetUserInventoryRequest = {
            "PlayFabId": currentPlayerId
        };

        var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
        for(var index in GetUserInventoryResult.Inventory)
        {
            if(GetUserInventoryResult.Inventory[index].ItemId === REFERRAL_BADGE)
            {
                throw "You are only allowed one Referral Badge.";
            }
        }
        
        var GetUserReadOnlyDataRequest = {
            "PlayFabId": args.referralCode,
            "Keys": [ PLAYER_REFERRAL_KEY ]
        }; 
        var GetUserReadOnlyDataResult = server.GetUserReadOnlyData(GetUserReadOnlyDataRequest);
        var referralValues = [];

        if(!GetUserReadOnlyDataResult.Data.hasOwnProperty(PLAYER_REFERRAL_KEY))
        {
            referralValues.push(currentPlayerId);
            ProcessReferrer(args.referralCode, referralValues);
        }
        else
        {
            referralValues = JSON.parse(GetUserReadOnlyDataResult.Data[PLAYER_REFERRAL_KEY].Value);
            if(Array.isArray(referralValues))
            {
                if(referralValues.length < MAXIMUM_REFERRALS)
                {
                    referralValues.push(currentPlayerId);
                    ProcessReferrer(args.referralCode, referralValues);
                }
                else
                {
                    log.info("Player:" + args.referralCode + " has hit the maximum number of referrals (" + MAXIMUM_REFERRALS + ")." );
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
    
    var UpdateUserReadOnlyDataRequest = {
        "PlayFabId": id,
        "Data": {}
    };
    UpdateUserReadOnlyDataRequest.Data[PLAYER_REFERRAL_KEY] = JSON.stringify(referrals);
    var UpdateUserReadOnlyDataResult = server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
    
    var AddUserVirtualCurrencyRequest = {
        "PlayFabId" : id,
        "VirtualCurrency": VIRTUAL_CURRENCY_CODE,
        "Amount": 10
    };
    var AddUserVirtualCurrencyResult = server.AddUserVirtualCurrency(AddUserVirtualCurrencyRequest);

    log.info(AddUserVirtualCurrencyRequest.Amount + " " + VIRTUAL_CURRENCY_CODE + " granted to " + id);
}


function GrantReferralBonus(code)
{
    var GrantItemsToUserRequest = {
        "PlayFabId" : currentPlayerId,
        "ItemIds" : [ REFERRAL_BADGE, REFERRAL_BONUS_BUNDLE ],
        "Annotation" : "Referred by: " + code
    };

    var GrantItemsToUserResult = server.GrantItemsToUser(GrantItemsToUserRequest);
    return GrantItemsToUserResult.ItemGrantResults;
}
