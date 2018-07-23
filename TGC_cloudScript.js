var DT_CHEST_BATTLE = "dropTable_battleChest"; // 전투 보상 상자의 드롭테이블
var IC_CHEST_BATTLE = "BattleChest"; // 전투 보상 상자의 ItemClass
var KEY_PLAYER_CHESTS_BATTLE = "playerBattleChests"; // 전투 보상 상자배열의 키값 
var MAXIMUM_CHEST_BATTLE = 4; // 전투 보상 상자 최대 수량
var MinutePerGem = 12; // 젬당 분 계수
var VIRTUAL_CURRENCY_CODE = "GE";
var REDUCETIME_AD = 30;
var RANDOM_TIER_AMOUNT = 3;
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
        
        //아이템 데이터 부여
        var itemValues = MakeItemData(result.GrantedItems);
        
        return itemValues;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

};

function MakeItemData(items) {
    try {
        // 유저 티어 가져오기
        var GetUserInternalDataResult = GetInternalDataUser( ["Tier", "Rebirth"] );
        var tier; // 유저 티어
        var rebirth; // 유저 환생
        var totalTier; // 총 티어
    
        if(GetUserInternalDataResult.Data.hasOwnProperty("Tier")) {
            tier = GetUserInternalDataResult.Data["Tier"].Value;
        }else {
            tier = 1;
        }
    
        if(GetUserInternalDataResult.Data.hasOwnProperty("Rebirth")) {
            rebirth = GetUserInternalDataResult.Data["Rebirth"].Value;
        }else {
            rebirth = 0;
        }
    
        totalTier = tier + (rebirth * 100);
    
        // 아이템 테이블 받아오기
        var itemTableRequest = {
            "Keys" : [ "ItemStatTable", "TierTable", "SkillTable" ]
        }
        var GetTitleInternalDataResult = server.GetTitleInternalData(itemTableRequest);

        var itemTable = JSON.parse( GetTitleInternalDataResult.Data["ItemStatTable"] );
        var tierTable = JSON.parse( GetTitleInternalDataResult.Data["TierTable"] );
        var skillTable = JSON.parse( GetTitleInternalDataResult.Data["SkillTable"] );
        
        // 테이블 가져오기
        var EquipListData = {};
        for(var index in tierTable.EquipList) {
            if(tierTable.EquipList[index].Tier <= totalTier) {
                EquipListData = tierTable.EquipList[index];
            }
        }
        
    
        // 아이템 카달로그 받아오기
        var GetCatalogItemsRequest = {
            "PlayFabId": currentPlayerId
        };
        var GetCatalogItemsResult = server.GetCatalogItems(GetCatalogItemsRequest);
        
        var equipmentData = []; // 아이템 정보 담을 오브젝트
        
        for(var key in items) {
            // 해당 아이템 티어 테이블 받아오기
            var tierInfo = {};
            var randomTier = 1; // 해당 아이템 티어
            if(items[key].CustomData !== undefined && items[key].CustomData.hasOwnProperty("tier")) { 
                randomTier = items[key].CustomData["tier"]; 
            }else { randomTier = GetRandomTier ( tier ); }   // randomTier 값 없으면 새로 생성
            
            for(var index in tierTable.TierInfos) {
                if(tierTable.TierInfos[index].Tier == randomTier) {
                    tierInfo = tierTable.TierInfos[index];    
                }
            }
            
            var catalogDataResult = {};
            for(var index in GetCatalogItemsResult.Catalog)
            {
                if(GetCatalogItemsResult.Catalog[index].ItemId === items[key].ItemId)
                {
                    catalogDataResult = GetCatalogItemsResult.Catalog[index];
                }
            }
            if(catalogDataResult == null){
                throw "해당 아이템 카달로그 찾지 못함";
            }
            if(catalogDataResult.CustomData === undefined){
                throw "catalogDataResult.CustomData is undefined";
                //throw JSON.stringify(items[key]);
            }
            var customObj = JSON.parse(catalogDataResult.CustomData);
            
            // 장비 리스트에서 랜덤뽑기
            var equipList = EquipListData[items[key].ItemClass].split(",");
            var randomValue = parseInt(Math.random() * equipList.length);
            var itemId = equipList[randomValue];
            //
            var tableData = {};
            var stat = {};
            var skill = {};
            equipmentData[key] = {};
            equipmentData[key].TableData = "NONE";
            equipmentData[key].Stat = "NONE";
            equipmentData[key].Skill = "NONE";
            equipmentData[key].Tier = randomTier.toString();    //아이템 티어
            // 스탯 설정
            for(var index in itemTable.Equipments) {
                if(itemTable.Equipments[index].ItemID == itemId) {
                    tableData = CopyObj( itemTable.Equipments[index] );
                }
            }
            //Lev, Atk, Hp
            stat.Lev = "1";
            if(tableData.hasOwnProperty("AtkX")) {
                stat.Atk = parseInt( tierInfo.StatAmount * tableData.AtkX );
                stat.Atk = stat.Atk.toString();
                delete tableData.AtkX; // 정리하기
            }
            if(tableData.hasOwnProperty("HpX")) {
                stat.Hp = parseInt( tierInfo.StatAmount * tableData.HpX );
                stat.Hp = stat.Hp.toString();
                delete tableData.HpX; // 정리하기
            }
            if(tableData.hasOwnProperty("Sta")) {
                stat.Sta = tableData.Sta;
                delete tableData.Sta; // 정리하기
            }
            if(tableData.hasOwnProperty("StaReX")) {
                stat.StaReX = tableData.StaReX;
                delete tableData.StaReX; // 정리하기
            }
            if(tableData.hasOwnProperty("Wg")) {
                stat.Wg = tableData.Wg;
                delete tableData.Wg; // 정리하기
            }
            // 스킬 설정
            if(customObj.grade == "rare" || customObj.grade == "legend") {
                var skillIdList = [];
                for(var index in skillTable.SkillInfos) {
                    if(skillTable.SkillInfos[index].ItemClass == tableData.ItemClass) {
                        skillIdList.push( skillTable.SkillInfos[index].Skill );
                    }
                }
                var randomSkillId = skillIdList[parseInt( Math.random() * skillIdList.length )];
                for(var index in skillTable.SkillInfos) {
                    if(skillTable.SkillInfos[index].Skill == randomSkillId) {
                        skill = CopyObj( skillTable.SkillInfos[index] );
                    }
                }
                
                if(customObj.grade == "rare") { skill.Lev = "20"; }
                if(customObj.grade == "legend") { skill.Lev = skill.Limit; }
                
                // 아이템 커스텀데이터 정리하기
                delete skill.ItemClass;
                delete skill.Skill;
            }
            // 커스텀 데이터 정리하기
            delete tableData.ItemClass; // 아이템 클래스는 ItemInstance 에도 있다
            // 데이터들 stringify 하기
            equipmentData[key].TableData = JSON.stringify( tableData );
            equipmentData[key].Stat = JSON.stringify( stat );
            equipmentData[key].Skill = JSON.stringify( skill );
            // 아이템 데이터 업데이트
            var UpdateItemCustomDataRequest = {
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": items[key].ItemInstanceId,
                "Data": equipmentData[key]
            }
            server.UpdateUserInventoryItemCustomData(UpdateItemCustomDataRequest);
            
        }
        
        return equipmentData; // 값 반환하기
  
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function ProgressItemData(item) {
    
}

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
        // 유저 티어 가져오기
        var GetUserInternalDataResult = GetInternalDataUser( [ "Tier"] );
        var randomTier = GetRandomTier( parseInt( GetUserInternalDataResult.Data["Tier"].Value ) );
        randomTier = randomTier.toString();
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
                "state" : "OPENING",
                "tier" : randomTier
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
        
        //아이템 데이터 부여
        var itemValues = MakeItemData(result.GrantedItems);
        
        return itemValues;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};


// 전투 보상 상자 수여 함수
function grantChest () {
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

// 전투 결과 보상 함수
handlers.BattleResult = function (args, context) {
    try {
        var result = {};
        // 유저 통계 가져오기 : 트로피
        var GetPlayerStatisticsRequest = {
            "PlayFabId": currentPlayerId,
            "StatisticNames": [ "Trophy" ]
        };
        var GetPlayerStatisticsResult = server.GetPlayerStatistics(GetPlayerStatisticsRequest);

        var trophyStatistic = {};
        if(GetPlayerStatisticsResult.Statistics.length > 0) {
            trophyStatistic = GetPlayerStatisticsResult.Statistics[0];
        }else {
            trophyStatistic.StatisticName = "Trophy";
            trophyStatistic.Value = 0;
            GetPlayerStatisticsResult.Statistics.push(trophyStatistic);
        }
        
        // 유저 티어 가져오기
        var GetUserInternalDataRequest = {
            "PlayFabId" : currentPlayerId,   
            "Keys" : [ "Tier", "Rebirth", "WinCount", "WinningStreak", "BeforeWin" ]
        }
        var GetUserInternalDataResult = server.GetUserInternalData(GetUserInternalDataRequest);
        
        var userData = {};
        
        if(GetUserInternalDataResult.Data.hasOwnProperty("Tier")) {
            userData.Tier = parseInt( GetUserInternalDataResult.Data["Tier"].Value );
        }else {
            userData.Tier = 1;
        }
    
        if(GetUserInternalDataResult.Data.hasOwnProperty("Rebirth")) {
            userData.Rebirth = parseInt( GetUserInternalDataResult.Data["Rebirth"].Value );
        }else {
            userData.Rebirth = 0;
        }
        
        if(GetUserInternalDataResult.Data.hasOwnProperty("WinCount")) {
            userData.WinCount = parseInt( GetUserInternalDataResult.Data["WinCount"].Value );
        }else {
            userData.WinCount = 0;
        }
        
        if(GetUserInternalDataResult.Data.hasOwnProperty("WinningStreak")) {
            userData.WinningStreak = parseInt( GetUserInternalDataResult.Data["WinningStreak"].Value );
        }else {
            userData.WinningStreak = 0;
        }
        // 1 : true, 0 : false
        if(GetUserInternalDataResult.Data.hasOwnProperty("BeforeWin")) {
            userData.BeforeWin = parseInt( GetUserInternalDataResult.Data["BeforeWin"].Value );
        }else {
            userData.BeforeWin = 0;
        }
        
        var tier = userData.Tier + (userData.Rebirth * 100); // 환생까지 계산된 실제 티어값
    
        // 트로피 관련 테이블 가져오기
        var tierTableRequest = {
            "Keys" : [ "TierTable", "PerWinChest"  ]
        }
        var GetTitleInternalDataResult = server.GetTitleInternalData(tierTableRequest);
        var tierTable = JSON.parse( GetTitleInternalDataResult.Data["TierTable"] );
        // 트로피 계산
        var tierInfo = {};
        for(var index in tierTable.TierInfos) {
            if( tierTable.TierInfos[index].Tier == tier) {
                tierInfo = tierTable.TierInfos[index];
            }
        }
        var trophyAmount = 0; // 보상 트로피 양
        if(args.isVictory) {
            // 연승 계산
            if(userData.BeforeWin == 1) {
                userData.WinningStreak += 1; // 연승 추가
            }
            
            // 이긴 경우
            if(trophyStatistic.Value < tierInfo.TrophyLimit) {
                
                if(userData.WinningStreak > parseInt(tierTable.StreakLimit)) {
                    trophyAmount = parseInt(tierTable.Unit) + parseInt(tierTable.StreakLimit);
                }else {
                    trophyAmount = parseInt(tierTable.Unit) + userData.WinningStreak;
                }
                
                trophyStatistic.Value += trophyAmount;
                
                if(trophyStatistic.Value > parseInt(tierInfo.TrophyLimit)) {
                    trophyStatistic.Value = parseInt(tierInfo.TrophyLimit);
                }
            }
            // 이긴 횟수 체크
            userData.WinCount += 1; // 승리 추가
            if(userData.WinCount >=  GetTitleInternalDataResult.Data["PerWinChest"]) {
                result.chestValue = grantChest();
                delete result.chestValue;       // 그냥 생략
                
                userData.WinCount = 0;
            }
            
            userData.BeforeWin = 1; // 다음 연산을 위하여
            
        }else {
            // 패배할 경우
            userData.BeforeWin = 0; // 0: false
            userData.WinningStreak = 0; // 연승 초기화
        }
        
        // 유저 통계 업데이트 : 트로피
        var UpdatePlayerStatisticsRequest = {
            "PlayFabId": currentPlayerId,
            "Statistics": [trophyStatistic]
        };
        var UpdatePlayerStatisticsResult = server.UpdatePlayerStatistics(UpdatePlayerStatisticsRequest);
        // 유저 정보 업데이트
        var UpdateUserInternalDataRequest = {
            "PlayFabId" : currentPlayerId,   
            "Data" : userData
        }
        server.UpdateUserInternalData(UpdateUserInternalDataRequest);
        
        result.trophy = trophyStatistic.Value;
        result.userData = userData;
        result.trophyAmount = trophyAmount;
        result.perWinChest = GetTitleInternalDataResult.Data["PerWinChest"];
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

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

function GetInternalDataUser(keys) {
    var GetUserInternalDataRequest = {
        "PlayFabId" : currentPlayerId,   
        "Keys" : keys
    }
    return server.GetUserInternalData(GetUserInternalDataRequest);   
}

function GetRandomTier (tier) {
    var result = tier - parseInt(Math.random() * RANDOM_TIER_AMOUNT);   
    if(result < 1) { result = 1; }

    return result;
}

function CopyObj(obj) {
  var copy = {};
  if (typeof obj === 'object' && obj !== null) {
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = CopyObj(obj[attr]);
      }
    }
  } else {
    copy = obj;
  }
  return copy;
}
