var PER_WIN_CHEST = 3; // 전투 보상 상자 얻기위한 승리 수 
var DT_CHEST_BATTLE = "dropTable_battleChest"; // 전투 보상 상자의 드롭테이블
var IC_CHEST_BATTLE = "BattleChest"; // 전투 보상 상자의 ItemClass
var KEY_PLAYER_CHESTS_BATTLE = "playerBattleChests"; // 전투 보상 상자배열의 키값 
var MAXIMUM_CHEST_BATTLE = 4; // 전투 보상 상자 최대 수량
var MinutePerGem = 12; // 젬당 분 계수
var VIRTUAL_CURRENCY_CODE = "GE";
var REDUCETIME_AD = 30;

// 전투 보상 상자 여는 함수
handlers.unlockChest = function (args, context) {
    try {
        // 상자 정보 가져오기
        var chestDataResult = GetItemData(args.InstanceId);
        if(chestDataResult == null) {
            throw "해당 아이템 찾지 못함";
        }
        
        if(chestDataResult.CustomData.hasOwnProperty("openTime")) {
            var unLockDate = new Date( chestDataResult.CustomData.openTime );
            var currentTime = new Date();
            
            if(currentTime.getTime() < unLockDate.getTime()) {
                throw "상자 언락 할 시간이 안됨";
            }
        }else {
            throw "상자에 openTime 키가 없음";
        }
        
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
        }
        // 상자 카달로그 정보 가져오기
        var catalogDataResult = GetItemCatalogData(chestDataResult.ItemId);
        
        if(catalogDataResult == null) {
            throw "해당 아이템 카달로그 찾지 못함";
        }
        
        // 보상 상자 시간 설정
        var customObj = JSON.parse(catalogDataResult.CustomData);
        
        var unLockDate = new Date();
        var currentTime = new Date();
        var waitTime = parseInt(customObj.time);
                
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

        var result = server.UpdateUserInventoryItemCustomData(UpdateUserInventoryItemCustomDataRequest);
        
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
        }
        
        // 보상 상자 시간 설정
        var unLockDate = new Date( chestDataResult.CustomData.openTime );
        var startTime = new Date( chestDataResult.CustomData.startTime );
        var reduceTime = REDUCETIME_AD * 60 * 1000; //단축되는 시간
            
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

        var result = server.UpdateUserInventoryItemCustomData(UpdateUserInventoryItemCustomDataRequest);    
        
        // 보상 상자         
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

handlers.openGem = function (args, context) {
    try {
        // 유저 인벤토리 가져오기
        var GetUserInventoryRequest = {
            "PlayFabId": currentPlayerId
        };
        var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
        
        // 상자 정보 가져오기
        var chestDataResult;
        
        for(var index in GetUserInventoryResult.Inventory)
        {
            if(GetUserInventoryResult.Inventory[index].ItemInstanceId === args.InstanceId)
            {
                chestDataResult = GetUserInventoryResult.Inventory[index];
            }
        }
        
        if(chestDataResult == null) {
            throw "해당 아이템 찾지 못함";
        }
        
        // 남은 시간으로 필요한 젬코스트 계산
        
        var unLockDate = new Date();
        var currentTime = new Date();
        
        var chestCustomData = {};
        if(chestDataResult.CustomData != null)
            chestCustomData = chestDataResult.CustomData;
        
        if("openTime" in chestCustomData) {
            
            unLockDate = new Date( chestCustomData.openTime );
            
        }else {
            // LOCK 상태의 상자, 카달로그에서 정보를 받아온다
            // 상자 카달로그 정보 가져오기
            var catalogDataResult = GetItemCatalogData(chestDataResult.ItemId);
        
            if(catalogDataResult == null) {
                throw "해당 아이템 카달로그 찾지 못함";
            }
            
            // 보상 상자 시간 설정
            var customObj = JSON.parse(catalogDataResult.CustomData);
            
            var waitTime = parseInt(customObj.time);
            unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));
        }
        
        var leftTime = unLockDate - currentTime; // 남은 시간 계산
        var needGem = Math.ceil(leftTime / (MinutePerGem * 60 * 1000)); // 필요한 젬코스트 계산식
                                
        if(GetUserInventoryResult.VirtualCurrency.GE < needGem) {
            throw "GEM이 부족함";
        }else {
            var GemCostRequest = {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": VIRTUAL_CURRENCY_CODE,
                "Amount": needGem   
            };
            var GemCostResult = server.SubtractUserVirtualCurrency(GemCostRequest); 
        }
        
        
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


// 전투 보상 상자 수여 함수
handlers.grantChest = function (args, context) {
    try {
        // 상자 개수 체크
        var GetUserInventoryRequest = {
            "PlayFabId": currentPlayerId
        };
        var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
        
        var _cnt = 0;
        for(var index in GetUserInventoryResult.Inventory)
        {
            if(GetUserInventoryResult.Inventory[index].ItemClass === IC_CHEST_BATTLE)
            {
                _cnt++;
            }
        }
        
        // 상자 수여
        var chestValue = "NONE";
        
        if(_cnt < MAXIMUM_CHEST_BATTLE) {
            chestValue = ProcessGrantChest();   
        }else {
            throw "상자 제한수 초과!";    
        }

        return chestValue;
        
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
    var instId = results[0].ItemInstanceId;
    
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

function GetItemCatalogData(id) {
    var itemResult;
    var GetCatalogItemsRequest = {
            "PlayFabId": currentPlayerId
    };
    var GetCatalogItemsResult = server.GetCatalogItems(GetCatalogItemsRequest);
    
    for(var index in GetCatalogItemsResult.Catalog)
    {
        if(GetCatalogItemsResult.Catalog[index].ItemId === id)
        {
            itemResult = GetCatalogItemsResult.Catalog[index];
        }
    }
    return itemResult;
}

// 타이틀데이터 테스트용 함수
handlers.testFunc = function (args, context) {
    try {
        var result = {};
        result = {
                  "titleInterKey" : testTitleInternalDataKey
                 };
        
        return JSON.stringify(result);
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

}
