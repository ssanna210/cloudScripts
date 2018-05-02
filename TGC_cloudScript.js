var PER_WIN_CHEST = 3; // 전투 보상 상자 얻기위한 승리 수 
var DT_CHEST_BATTLE = "dropTable_battleChest"; // 전투 보상 상자의 드롭테이블
var IC_CHEST_BATTLE = "battleChest"; // 전투 보상 상자의 ItemClass
var KEY_PLAYER_CHESTS_BATTLE = "playerBattleChests"; // 전투 보상 상자배열의 키값 
var MAXIMUM_CHEST_BATTLE = 4; // 전투 보상 상자 최대 수량


// 전투 보상 상자 여는 함수
handlers.unlockChest = function (args, context) {
    try {
        // 상자 정보 가져오기
        var chestDataResult = GetItemData(args.InstanceId);
        
        //보상 상자 남은 시간 체크
        
    
        //상자 열기
        var request = {
            PlayFabId: currentPlayerId,
            ContainerItemInstanceId: args.InstanceId
        };
        
        var result = server.UnlockContainerInstance(request);  
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

handlers.openStartChest = function (args, context) {
    try {
        // 상자 정보 가져오기
        var chestDataResult = GetItemData(args.InstanceId);        
        
        if(chestDataResult == null) {
            throw "해당 아이템 찾지 못함";
        }else {
            // 보상 상자 시간 설정
            var unLockDate = new Date();
            var currentTime = new Date();
            var waitTime = parseInt(chestDataResult.time);
                
            unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));

            var UpdateUserInventoryItemCustomDataRequest= { 
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": args.InstanceId,
                "Data": {
                    "openTime" : unLockDate,
                    "startTime" : currentTime,
                    "state" : "OPENING"
                }
            }

            var result = UpdateUserInventoryItemCustomData(UpdateUserInventoryItemCustomDataRequest);
            
        }
        
        // 보상 상자         
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

// 동영상 광고 보상 시간단축 함수
handlers.videoChest = function (args, context) {
    try {
        // 상자 정보 가져오기
        var chestDataResult = GetItemData(args.InstanceId);        
        
        if(chestDataResult == null) {
            throw "해당 아이템 찾지 못함";
        }else {
            // 보상 상자 시간 설정
            var unLockDate = new Date( chestDataResult.openTime );
            var currentTime = new Date();
            var startTime = new Date( chestDataResult.startTime );
            var reduceTime = 30 * 60 * 1000; //단축되는 시간
            
            unLockDate.setTime(unLockDate.getTime() - reduceTime);
            
            if(unLockDate.getTime() < startTime.getTime()) {
                   unLockDate.setTime(startTime.getTime());
            }
            
            var UpdateUserInventoryItemCustomDataRequest= { 
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": args.InstanceId,
                "Data": {
                    "openTime" : unLockDate
                }
            }

            var result = UpdateUserInventoryItemCustomData(UpdateUserInventoryItemCustomDataRequest);
            
        }
        
        // 보상 상자         
        return result;
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

// 전투 보상 상자 수여 함수
handlers.grantChest = function (args, context) {
    try {
        
        //상자 정보 가져오기
        var GetUserDataRequest= { 
            "PlayFabId": currentPlayerId,
            "Keys": [ KEY_PLAYER_CHESTS_BATTLE ]
        }
        var GetUserDataResult = server.GetUserData(GetUserDataRequest);
        
        var chestValues = [];
        
        if(!GetUserDataResult.Data.hasOwnProperty(KEY_PLAYER_CHESTS_BATTLE))
        {
            //처음으로 보상상자를 보냄
            chestValues.push(ProcessGrantChest());
        }
        else
        {
            // This was a valid referral code, now we need to extract the JSON array
            chestValues = JSON.parse(GetUserDataResult.Data[KEY_PLAYER_CHESTS_BATTLE].Value);
            if(Array.isArray(referralValues))
            {
                // need to ensure we have not exceded the MAXIMUM_CHEST_BATTLE
                if(chestValues.length < MAXIMUM_CHEST_BATTLE)
                {
                    // 보상상자 추가 가능, so we will add the current player 
                    chestValues.push(ProcessGrantChest());
                }
                else
                {
                    // 보상상자 갯수 다참, 추가 불가능
                    // this is not an error, but the referrer does not get thier reward.
                    log.info("Player:" + args.referralCode + " has hit the maximum number of referrals (" + MAXIMUM_REFERRALS + ")." );
                }
            }
            else
            {
                throw "An error occured when parsing player's battle chest data.";
            }
        }
        
        UpdateUserDataRequest.Data[KEY_PLAYER_CHESTS_BATTLE] = JSON.stringify(chestValues);
        var UpdateUserDataResult = server.UpdateUserData(UpdateUserDataRequest);

        return UpdateUserDataResult;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

}

function ProcessGrantChest()
{
    var DTresult = server.EvaluateRandomResultTable({ TableId : DT_CHEST_BATTLE }); // 전투 보상 상자 티어 뽑기
    // 전투 보상 상자 유저 인벤토리에 넣기
    var pull = server.GrantItemsToUser({ 
        PlayFabId: currentPlayerId, 
        ItemIds: [DTresult.ResultItemId]
    });
    var results = pull.ItemGrantResults;
    var instId = results.ItemInstanceId;

    return instId; // 상자 InstanceId 값 리턴
}

function GetItemData(id) {
    var itemResult;
    var GetUserInventoryRequest = {
            "PlayFabId": currentPlayerId
    };
    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
    
    for(var index in GetUserInventoryResult.Inventory)
    {
        if(GetUserInventoryResult.Inventory[index].ItemInstanceId === id)
        {
            itemResult = GetUserInventoryResult.Inventory[index];
        }
    }
    return itemResult;
}



handlers.userUpdate = function (args, context) {

    server.UpdateUserInventoryItemCustomData({ 

      PlayFabId: currentPlayerId, 

      ItemInstanceId: instId 

      Data: { Time: position }

    });

}

