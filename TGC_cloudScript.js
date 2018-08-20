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
        var tier = 0; // 유저 티어
        var rebirth = 0; // 유저 환생
        var totalTier = 0; // 총 티어
    
        if(GetUserInternalDataResult.Data.hasOwnProperty("Tier")) {
            tier = parseInt( GetUserInternalDataResult.Data["Tier"].Value );
        }else {
            tier = 1;
        }
    
        if(GetUserInternalDataResult.Data.hasOwnProperty("Rebirth")) {
            rebirth = parseInt( GetUserInternalDataResult.Data["Rebirth"].Value );
        }else {
            rebirth = 0;
        }
    
        totalTier = tier + (rebirth * 100);
    
        // 아이템 테이블 받아오기
        var itemTableRequest = {
            "Keys" : [ "ItemStatTable", "TierTable", "SkillTable" ]
        }
        var GetTitleDataResult = server.GetTitleData(itemTableRequest);

        var itemTable = JSON.parse( GetTitleDataResult.Data["ItemStatTable"] );
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
        var skillTable = JSON.parse( GetTitleDataResult.Data["SkillTable"] );
        
        // 테이블 가져오기
        var EquipListData = {};
        
        for(var i = 0; i < tierTable.EquipList.length; i++) {
            if(tierTable.EquipList[i].Tier <= totalTier) {
                EquipListData = tierTable.EquipList[i];
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
            var info = {};
            var stat = {};
            var skill = {};
            equipmentData[key] = {};
            equipmentData[key].Info = "NONE";
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
            stat.Lev = 1;
            stat.Exp = 0;
            if(tableData.hasOwnProperty("AtkX")) {
                stat.Atk = parseInt( tierInfo.StatAmount * tableData.AtkX );
                stat.Atk += parseInt( Math.random() * tier );   // 티어값만큼 랜덤 스탯 추가
            }
            if(tableData.hasOwnProperty("HpX")) {
                stat.Hp = parseInt( tierInfo.StatAmount * tableData.HpX );
                stat.Hp += parseInt( Math.random() * tier );    // 티어값만큼 랜덤 스탯 추가
            }
            if(tableData.hasOwnProperty("Sta")) {
                stat.Sta = tableData.Sta;
            }
            if(tableData.hasOwnProperty("StaReX")) {
                stat.StaReX = tableData.StaReX;
            }
            if(tableData.hasOwnProperty("Wg")) {
                stat.Wg = tableData.Wg;
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
                
                if(customObj.grade == "rare") { skill.Lev = 20 + (parseInt(Math.random() * 10) - 8); }
                if(customObj.grade == "legend") { skill.Lev = skill.Limit; }
                
                // 타겟 장비ID 리스트에서 랜덤뽑기
                var equipIdList = EquipListData[skill.TargetClass].split(",");
                skill.TargetId = equipIdList[ parseInt(Math.random() * equipIdList.length) ];
                
                // 아이템 커스텀데이터 정리하기
                delete skill.ItemClass;
                delete skill.Skill;
                delete skill.TargetClass;
            }
            // customData.info 설정
            info.ItemID = tableData.ItemID;
            
            // 캐릭터 설정
            if(tableData.ItemClass == "character") {
                // 캐릭터 외형 설정하기
                info.hc = parseInt(Math.random() * 6); // 헤어 컬러
                info.sc = parseInt(Math.random() * 3); // 스킨 컬러
                var hairIdList = tableData["HairRange"].split(",");
                info.ht = hairIdList[ parseInt(Math.random() * hairIdList.length) ];   // 헤어 타입
                // acc 슬롯 개수 정하기 ex) 2: 무기슬롯, 3: 아머슬롯, 4: 악세서리 슬롯 => "2,3,4" or "2,3,4,4"
                if( parseInt(Math.random() * 100) < 2 ) { info.slot = "2,3,4,4"; }
                else { info.slot = "2,3,4"; }
            }
            
            // 데이터들 stringify 하기
            equipmentData[key].Info = JSON.stringify( info );
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
        var GetTitleDataResult = server.GetTitleData(tierTableRequest);
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
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
            if(userData.WinCount >=  GetTitleDataResult.Data["PerWinChest"]) {
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
        result.perWinChest = GetTitleDataResult.Data["PerWinChest"];
        
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

function SellItem_internal(soldItemInstanceId, requestedVcType) {
    // 아이템 테이블 받아오기
    var tableRequest = {
        "Keys" : [ "WorthTable" ]
    }
    var GetTitleDataResult = server.GetTitleData(tableRequest);
    var worthTable = JSON.parse( GetTitleDataResult.Data.WorthTable );        // 가치 테이블
    if(!worthTable) throw "WorthTable not found";
    
    // get item
    var itemInstance = GetItemData(soldItemInstanceId);
    if (!itemInstance)
        throw "Item instance not found"; // Protection against client providing incorrect data
    if(itemInstance.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    // 아이템 가치 계산
    var itemWorth = CalculItemWorth(itemInstance.CustomData, worthTable);
    
    // Once we get here all safety checks are passed - Perform the sell
    var sellPrice = Math.floor(itemWorth * worthTable.SellGoldX);
    server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: sellPrice, VirtualCurrency: requestedVcType });
    server.RevokeInventoryItem({ PlayFabId: currentPlayerId, ItemInstanceId: soldItemInstanceId });
    
    return sellPrice;
}

handlers.SellItem = function (args) {
    if (!args || !args.soldItemInstanceId)
        throw "Invalid input parameters, expected soldItemInstanceId and requestedVcType";
    return SellItem_internal(args.soldItemInstanceId, "GO");
};

function CalculItemWorth ( customData, worthTable ) {
    
    // stat : Atk, Hp, Sta
    var tier = parseInt( customData.Tier );
    var grade = (tier - 1) / 5;
    var stat = JSON.parse( customData.Stat );
    var lev = stat.Lev;
    var atk = 0; var hp = 0; var sta = 0;
    if(stat.hasOwnProperty("Atk")) atk = stat.Atk;
    if(stat.hasOwnProperty("Hp")) atk = stat.Hp;
    if(stat.hasOwnProperty("Sta")) atk = stat.Sta;
    
    var result = (worthTable.Grade * grade) + (worthTable.Tier * tier) + (worthTable.Lev * lev) + ( worthTable.Stat * (atk + hp + sta) );
    
    return result;
    
}

handlers.ExpUp = function (args) {
    // targetItem : 경험치업 할 대상 아이템, rawItem : 제물 아이템
     if (!args || !args.targetItemInstanceId || !args.rawItemInstanceId)
        throw "Invalid input parameters, expected TargetItemInstanceId and RawItemInstanceId";
    return ExpUp_internal(args.targetItemInstanceId, args.rawItemInstanceId);  
}

function ExpUp_internal ( targeInstId, rawInstId ) {
     // 아이템 테이블 받아오기
    var tableRequest = {
        "Keys" : [ "LevelTable", "WorthTable" ]
    }
    var GetTitleDataResult = server.GetTitleData(tableRequest);
    var worthTable = JSON.parse( GetTitleDataResult.Data.WorthTable );        // 가치 테이블
    var levelTable = JSON.parse( GetTitleDataResult.Data.LevelTable );        // 가치 테이블
    // 아이템 검수
    var inventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var targetItemInstance = null;
    var rawItemInstance = null;
    for (var i = 0; i < inventory.Inventory.length; i++) {
        if (inventory.Inventory[i].ItemInstanceId === targeInstId)
            targetItemInstance = inventory.Inventory[i];
        else if (inventory.Inventory[i].ItemInstanceId === rawInstId)
            rawItemInstance = inventory.Inventory[i];
    }
    if (!targetItemInstance || !rawItemInstance)
        throw "Item instance not found"; // Protection against client providing incorrect data
    if(targetItemInstance.CustomData === undefined || rawItemInstance.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    var targetItemStat = {};
    var levLimit = CalculLevLimit( parseInt( targetItemInstance.CustomData.Tier ), levelTable );
    targetItemStat = JSON.parse( targetItemInstance.CustomData.Stat );
    if(targetItemStat.Lev >= levLimit) { targetItemStat.Lev = levLimit;  throw "아이템 레벨 MAX"; }
    
    // 아이템 가치 계산
    var targetItemWorth = CalculItemWorth(targetItemInstance.CustomData, worthTable);
    var rawItemWorth = CalculItemWorth(rawItemInstance.CustomData, worthTable);
    var exp = Math.floor(rawItemWorth * worthTable.ExpX);
    var levUpCost = Math.floor( rawItemWorth * worthTable.LevUpCostX );
    if(levUpCost > inventory.VirtualCurrency["GO"]) throw "Gold가 모자릅니다.";
    
    // Exp Up
    targetItemStat.Exp += exp;
    if(targetItemStat.Exp >= targetItemWorth) { 
        targetItemStat.Exp = targetItemStat.Exp - targetItemWorth;
        targetItemStat.Lev += 1;
        if(targetItemStat.hasOwnProperty("Atk")) targetItemStat.Atk += Math.floor( targetItemStat.Atk * levelTable.XperLevel );
        if(targetItemStat.hasOwnProperty("Hp")) targetItemStat.Hp += Math.floor( targetItemStat.Hp * levelTable.XperLevel );
        if(targetItemStat.hasOwnProperty("Sta")) targetItemStat.Sta += Math.floor( targetItemStat.Sta * levelTable.XperLevel );
        
        if(targetItemStat.Lev >= levLimit) { targetItemStat.Lev = levLimit; }
    }
    targetItemInstance.CustomData.Stat = JSON.stringify( targetItemStat );
    // 아이템 데이터 업데이트
    var UpdateItemCustomDataRequest = {
        "PlayFabId": currentPlayerId,
        "ItemInstanceId": targeInstId,
        "Data": targetItemInstance.CustomData
    }
    server.UpdateUserInventoryItemCustomData(UpdateItemCustomDataRequest);

    // 코스트 처리
    server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: levUpCost, VirtualCurrency: "GO" });
    server.RevokeInventoryItem({ PlayFabId: currentPlayerId, ItemInstanceId: rawInstId });
    
    return exp;
}

function CalculLevLimit ( tier, levelTable ) {
    var starCnt = 0;
    starCnt = (tier % 5);
    if (starCnt == 0) starCnt = 5;
    var result = levelTable.LimitList[starCnt-1];
    return result;
}

handlers.UpdatePartyTabData = function (args) {
    // targetItem : 경험치업 할 대상 아이템, rawItem : 제물 아이템
    if (!args || !args.tab1 || !args.tab2 || !args.tab3 || !args.lastTab)
        throw "Invalid input parameters";
    server.UpdateUserInternalData( {  PlayFabId: currentPlayerId, Data : args } );
    
    if(!args.hasOwnProperty(args.lastTab)) { throw "args에 lastTab의 value 값 키가 없음"; }
    var equipInfo = JSON.parse( args[args.lastTab] );
    var customDatas = [];
    var inventoryResult = server.GetUserInventory( {"PlayFabId": currentPlayerId} );
    var item = null;
    for(var index in equipInfo) {
        if(equipInfo[index] == null) {
            customDatas.push(null);
        }else {
            item = null;
            for(var i in inventoryResult.Inventory)
            {
                if(inventoryResult.Inventory[i].ItemInstanceId === equipInfo[index])
                {
                    item = inventoryResult.Inventory[i];
                }
            }
            if(item == null) customDatas.push(null);
            else customDatas.push(item.CustomData);
        }
    }
    var characterInfo = JSON.stringify(customDatas);
    server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : { "CharacterInfo" : characterInfo } } );
}

// 유저가 처음 접속했는지 체크하는 함수
handlers.FirstCheck = function (args) {
    var result = {};
    var internalData = server.GetUserInternalData( { PlayFabId: currentPlayerId, Keys: ["isFirstGift", "isTutoComplete"] } );
    if(internalData.Data.hasOwnProperty("isFirstGift") && isTrue( internalData.Data["isFirstGift"].Value )) {
        result.isFirstGift = internalData.Data["isFirstGift"].Value;
    }else {
        // 처음 접속이면 아이템 증정
        var pull = server.GrantItemsToUser({ 
            PlayFabId: currentPlayerId, 
            ItemIds: ["bundle_firstGift"]
        });
        MakeItemData(pull.ItemGrantResults);
        server.UpdateUserInternalData( { PlayFabId: currentPlayerId, Data: {"isFirstGift": "true"} } );
        result.isFirstGift = true;
    }
    if(internalData.Data.hasOwnProperty("isTutoComplete") && isTrue( internalData.Data["isTutoComplete"].Value )) {
        result.isTutoComplete = internalData.Data["isTutoComplete"].Value;
    }else {
        result.isTutoComplete = false;
    }
    
    return result;
}
// string -> bool 변환 함수
function isTrue(value){
    if (typeof(value) === 'string'){
        value = value.trim().toLowerCase();
    }
    switch(value){
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default: 
            return false;
    }
}
