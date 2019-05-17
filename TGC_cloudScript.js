var DT_CHEST_BATTLE = "dropTable_battleChest";
var IC_CHEST_BATTLE = "BattleChest";
var MAXIMUM_CHEST_BATTLE = 4;
var MinutePerGem = 12;
var REDUCETIME_AD = 30;
var RANDOM_TIER_AMOUNT = 3;

handlers.unlockChest = function (args, context) {
    try {
        
        var GetItemDataResult = GetItemData([args.InstanceId]);
        if(GetItemDataResult.length == 0) { throw "Item instance not found"; }
        var chestDataResult = GetItemDataResult[0];
        
        if(chestDataResult.CustomData.hasOwnProperty("openTime")) {
            var unLockDate = new Date( chestDataResult.CustomData.openTime );
            var currentTime = new Date();
            
            if(currentTime.getTime() < unLockDate.getTime()) {
                throw "Time is shot yet";
            }
        }else {
            throw "not have key : openTime ";
        }
        
        var result = server.UnlockContainerInstance({ PlayFabId: currentPlayerId, ContainerItemInstanceId: args.InstanceId });  
        
        // make item data
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
        
        var StatisticsResult = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] });

        var tierStatistic = {};
        tierStatistic.StatisticName = "TotalTier";
        tierStatistic.Value = 1;
        
        if(StatisticsResult.Statistics.length > 0) {
            for(var index in StatisticsResult.Statistics) {
                if(StatisticsResult.Statistics[index].StatisticName == "TotalTier") 
                    tierStatistic = StatisticsResult.Statistics[index];
            }
        }
        
        var totalTier = tierStatistic.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        
        var GetTitleDataResult = server.GetTitleData( { "Keys" : [ "ItemStatTable", "TierTable", "SkillTable" ] } );

        var itemTable = JSON.parse( GetTitleDataResult.Data["ItemStatTable"] );
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
        var skillTable = JSON.parse( GetTitleDataResult.Data["SkillTable"] );
        
        var EquipArray = [];
        var EquipListData = {};
        
        for(var i = 0; i < tierTable.EquipList.length; i++) {
            if(tierTable.EquipList[i].Tier <= totalTier) {
                EquipArray.push(tierTable.EquipList[i]);
            }
        }
        
        // get item catalog
        var GetCatalogItemsResult = server.GetCatalogItems({ "PlayFabId": currentPlayerId });
        
        var equipmentData = [];
        
        for(var key in items) {
            
            var tierInfo = {};
            var randomTier = 1;
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
                throw "catalog not found";
            }
            if(catalogDataResult.CustomData === undefined){
                throw "catalogDataResult.CustomData is undefined";
                //throw JSON.stringify(items[key]);
            }
            var customObj = JSON.parse(catalogDataResult.CustomData);
            
            if(!EquipListData.hasOwnProperty(items[key].ItemClass)) {
                var tempList = [];
                for(var i=0; i< EquipArray.length; i++) {
                    if(EquipArray[i].hasOwnProperty(items[key].ItemClass)) {
                        tempList.push(EquipArray[i][items[key].ItemClass]);
                    }
                }
                EquipListData[items[key].ItemClass] = tempList.join(',');
            }
            
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
            equipmentData[key].Tier = randomTier.toString();
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
                stat.Atk += parseInt( Math.random() * tier );
            }
            if(tableData.hasOwnProperty("HpX")) {
                stat.Hp = parseInt( tierInfo.StatAmount * tableData.HpX );
                stat.Hp += parseInt( Math.random() * tier );
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
            
            if(customObj.grade == "rare" || customObj.grade == "legend") {
                
                skill = GetRandomSkill( tableData.ItemClass, skillTable.SkillInfos, EquipListData, EquipArray );
                
                if(customObj.grade == "rare") { skill.Lev = 20 + (parseInt(Math.random() * 10) - 8); }
                if(customObj.grade == "legend") { skill.Lev = skill.Limit; }
                
            }
            // customData.info 설정
            info.ItemID = tableData.ItemID;
            
            // 캐릭터 설정
            if(tableData.ItemClass == "character") {
                
                info.hc = parseInt(Math.random() * 6); // 헤어 컬러
                info.sc = parseInt(Math.random() * 3); // 스킨 컬러
                var hairIdList = tableData["HairRange"].split(",");
                info.ht = hairIdList[ parseInt(Math.random() * hairIdList.length) ];   // 헤어 타입
                // acc 슬롯 개수 정하기
                if( parseInt(Math.random() * 100) < 2 ) { info.slot = "2,3,4,4"; }
                else { info.slot = "2,3,4"; }
            }
            
            equipmentData[key].Info = JSON.stringify( info );
            equipmentData[key].Stat = JSON.stringify( stat );
            equipmentData[key].Skill = JSON.stringify( skill );
            // update item data
            server.UpdateUserInventoryItemCustomData( { "PlayFabId": currentPlayerId, "ItemInstanceId": items[key].ItemInstanceId, "Data": equipmentData[key] } );
            
        }
        
        return equipmentData;
  
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

handlers.openStartChest = function (args, context) {
    try {
        
        var GetItemDataResult = GetItemData([args.InstanceId]);
        if(GetItemDataResult.length == 0) { throw "Item instance not found"; }
        var chestDataResult = GetItemDataResult[0];
        
        var catalogDataResult = GetItemCatalogData(chestDataResult.ItemId);
        
        if(catalogDataResult == null) {
            throw "catalog not found";
        }
        
        var StatisticsResult = server.GetPlayerStatistics( { "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] } );

        var tierStatistic = {};
        tierStatistic.StatisticName = "TotalTier";
        tierStatistic.Value = 1;
        
        if(StatisticsResult.Statistics.length > 0) {
            for(var index in StatisticsResult.Statistics) {
                if(StatisticsResult.Statistics[index].StatisticName == "TotalTier") 
                    tierStatistic = StatisticsResult.Statistics[index];
            }
        }
        
        var totalTier = tierStatistic.Value; // 총 티어
        var tier = parseInt( totalTier % 100 ); // 유저 티어

        var randomTier = GetRandomTier( tier );
        randomTier = randomTier.toString();
        // 보상 상자 시간 설정
        var customObj = JSON.parse(catalogDataResult.CustomData);
        
        var unLockDate = new Date();
        var currentTime = new Date();
        var waitTime = parseInt(customObj.time);
                
        unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));

        var CustomRequest= { 
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": args.InstanceId,
            "Data": {
                "openTime" : unLockDate,
                "startTime" : currentTime,
                "state" : "OPENING",
                "tier" : randomTier
            }
        }

        var result = server.UpdateUserInventoryItemCustomData(CustomRequest);
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

handlers.videoChest = function (args, context) {
    try {
        
        var GetItemDataResult = GetItemData([args.InstanceId]);
        if(GetItemDataResult.length == 0) { throw "Item instance not found"; }
        var chestDataResult = GetItemDataResult[0];
        
        // 보상 상자 시간 설정
        var unLockDate = new Date( chestDataResult.CustomData.openTime );
        var startTime = new Date( chestDataResult.CustomData.startTime );
        var reduceTime = REDUCETIME_AD * 60 * 1000; //단축되는 시간
            
        unLockDate.setTime(unLockDate.getTime() - reduceTime);
            
        if(unLockDate.getTime() < startTime.getTime()) {
            unLockDate.setTime(startTime.getTime());
        }
            
        var customRequest= { 
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": args.InstanceId,
            "Data": {
                "openTime" : unLockDate
            }
        }

        var result = server.UpdateUserInventoryItemCustomData(customRequest);    
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

handlers.openGem = function (args, context) {
    try {
        
        var invResult = server.GetUserInventory( { "PlayFabId": currentPlayerId } );
        
        var chestDataResult;
        
        for(var index in invResult.Inventory)
        {
            if(invResult.Inventory[index].ItemInstanceId === args.InstanceId)
            {
                chestDataResult = invResult.Inventory[index];
            }
        }
        
        if(chestDataResult == null) {
            throw "Item instance not found";
        }
        
        var unLockDate = new Date();
        var currentTime = new Date();
        
        var chestCustomData = {};
        if(chestDataResult.CustomData != null)
            chestCustomData = chestDataResult.CustomData;
        
        if("openTime" in chestCustomData) {
            
            unLockDate = new Date( chestCustomData.openTime );
            
        }else {
            
            var catalogDataResult = GetItemCatalogData(chestDataResult.ItemId);
        
            if(catalogDataResult == null) {
                throw "catalog not found";
            }
            
            var customObj = JSON.parse(catalogDataResult.CustomData);
            
            var waitTime = parseInt(customObj.time);
            unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));
        }
        
        var leftTime = unLockDate - currentTime;
        var needGem = Math.ceil(leftTime / (MinutePerGem * 60 * 1000));
                                
        if(invResult.VirtualCurrency.GE < needGem) {
            throw "lack of GEM";
        }else {
            var GemCostRequest = {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GE",
                "Amount": needGem   
            };
            var GemCostResult = server.SubtractUserVirtualCurrency(GemCostRequest); 
        }
        
        var result = server.UnlockContainerInstance({ PlayFabId: currentPlayerId, ContainerItemInstanceId: args.InstanceId });  
        
        var itemValues = MakeItemData(result.GrantedItems);
        
        return itemValues;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

function grantChest () {
    try {
        
        var invResult = server.GetUserInventory({ "PlayFabId": currentPlayerId });
        
        var _cnt = 0;
        for(var index in invResult.Inventory)
        {
            if(invResult.Inventory[index].ItemClass === IC_CHEST_BATTLE)
            {
                _cnt++;
            }
        }
        
        var chestValue = "NONE";
        
        if(_cnt < MAXIMUM_CHEST_BATTLE) {
            chestValue = ProcessGrantChest();   
        }else {
            throw "chest counts over";    
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
    var DTresult = server.EvaluateRandomResultTable({ TableId : DT_CHEST_BATTLE });
    
    var pull = server.GrantItemsToUser({ 
        PlayFabId: currentPlayerId, 
        ItemIds: [DTresult.ResultItemId]
    });
    var results = pull.ItemGrantResults;
    var instId = results[0].ItemInstanceId;
    
    return instId;
}

// args.mode, 0: normal mode 1: promotion mode
handlers.BattleResult = function (args, context) {
    try {
        var result = {};
        var stcResult = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "Trophy", "TotalTier" ] });

        var trophyStc = {};
        var tierStc = {};
        trophyStc.StatisticName = "Trophy"; trophyStc.Value = 0;
        tierStc.StatisticName = "TotalTier"; tierStc.Value = 1;
        
        if(stcResult.Statistics.length > 0) {
            for(var index in stcResult.Statistics) {
                if(stcResult.Statistics[index].StatisticName == "Trophy") 
                    trophyStc = stcResult.Statistics[index];
                if(stcResult.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = stcResult.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value; // 총 티어
        var tier = parseInt(totalTier % 100); // 유저 티어
        var rebirth = parseInt( totalTier / 100 ); // 유저 환생
        
        // 승수, 연승수, 전에 이겼는지
        var internalRequest = {
            "PlayFabId" : currentPlayerId,   
            "Keys" : [ "WinCount", "WinningStreak", "BeforeWin" ]
        }
        var internalData = server.GetUserInternalData(internalRequest);
        
        var userData = {};
        
        if(internalData.Data.hasOwnProperty("WinCount")) {
            userData.WinCount = parseInt( internalData.Data["WinCount"].Value );
        }else {
            userData.WinCount = 0;
        }
        
        if(internalData.Data.hasOwnProperty("WinningStreak")) {
            userData.WinningStreak = parseInt( internalData.Data["WinningStreak"].Value );
        }else {
            userData.WinningStreak = 0;
        }
        // 1 : true, 0 : false
        if(internalData.Data.hasOwnProperty("BeforeWin")) {
            userData.BeforeWin = parseInt( internalData.Data["BeforeWin"].Value );
        }else {
            userData.BeforeWin = 0;
        }
        
        var GetTitleDataResult = server.GetTitleData( { "Keys" : [ "TierTable", "General"  ] } );
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
        var generalTable = JSON.parse( GetTitleDataResult.Data["General"] );
        
        var tierInfo = {};
        for(var index in tierTable.TierInfos) {
            if( tierTable.TierInfos[index].Tier == tierStc.Value) {
                tierInfo = tierTable.TierInfos[index];
            }
        }
        var trophyAmount = 0; // 보상 트로피 양
        // 일반 모드
        if(args.mode == 0) {
            // victory
            if(args.isVictory) {
                // 연승 계산
                if(userData.BeforeWin == 1) {
                    userData.WinningStreak += 1; // 연승 추가
                }
                if(trophyStc.Value < parseInt(tierInfo.TrophyLimit)) {
                
                    if(userData.WinningStreak > parseInt(tierTable.StreakLimit)) {
                        trophyAmount = parseInt(tierTable.Unit) + parseInt(tierTable.StreakLimit);
                    }else {
                        trophyAmount = parseInt(tierTable.Unit) + userData.WinningStreak;
                    }
                
                    trophyStc.Value += trophyAmount;
                
                    if(trophyStc.Value > parseInt(tierInfo.TrophyLimit)) {
                        trophyStc.Value = parseInt(tierInfo.TrophyLimit);
                    }
                }
                // 이긴 횟수 체크
                userData.WinCount += 1; // 승리 추가
                if(userData.WinCount >= generalTable.PerWinChest) {
                    result.chestValue = grantChest();
                    delete result.chestValue;       // 그냥 생략
                
                    userData.WinCount = 0;
                }
                userData.BeforeWin = 1; // 다음 연산을 위하여

            }else {
                // fail
                userData.BeforeWin = 0; // 0: false
                userData.WinningStreak = 0; // 연승 초기화
            }   
        }
        
        
        var promoData = {};
        promoData.isPromotion = false;
        promoData.beforeTier = tier;
        promoData.afterTier = 0;
        promoData.gold = 0;
        promoData.gem = 0;
        
        if(args.mode == 1) {
            // check
            if(trophyStc.Value < parseInt(tierInfo.TrophyLimit)) {
                throw "lack of Trophy";
            }
            if(tier >= parseInt(tierInfo.TierLimit)) {
                throw "tier Max";
            }
            
            if(args.isVictory) {
                // victory
                tier++;
                totalTier = rebirth * 100 + tier;
                tierStc.Value = totalTier;
                promoData.afterTier = totalTier;
                promoData.isPromotion = true;
                
                promoData.gold = parseInt( parseInt(tierInfo.StatAmount) * tierTable.GoldX );
                promoData.gem = generalTable.PromoReward.Gem;
                promoData.sp = generalTable.PromoReward.SP;
                
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.gold, VirtualCurrency: "GO" });
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.gem, VirtualCurrency: "GE" });
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.sp, VirtualCurrency: "SP" });
                
            }else {
                // fail
                trophyAmount = generalTable.Promopenalty;
                trophyStc.Value -= trophyAmount;
                if(trophyStc.Value < 0) trophyStc.Value = 0;
            }
        }
        
        server.UpdatePlayerStatistics({ "PlayFabId": currentPlayerId, "Statistics": [trophyStc, tierStc] });
        server.UpdateUserInternalData({ "PlayFabId" : currentPlayerId, "Data" : userData });
        
        result.mode = args.mode;
        result.totalTier = tierStc.Value;
        result.trophy = tierStc.Value;
        result.userData = userData;
        result.trophyAmount = trophyAmount;
        result.perWinChest = generalTable.PerWinChest;
        result.promoData = promoData;
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

}

// 환생 함수
handlers.Rebirth = function (args, context) {
    try {
        var result = {};
        result.isRebirth = false;
        
        var stcRequest = {
            "PlayFabId": currentPlayerId,
            "StatisticNames": [ "Trophy", "TotalTier" ]
        };
        var stcResult = server.GetPlayerStatistics( stcRequest );

        var trophyStc = {};
        var tierStc = {};
        trophyStc.StatisticName = "Trophy"; trophyStc.Value = 0;
        tierStc.StatisticName = "TotalTier"; tierStc.Value = 1;
        
        if(stcResult.Statistics.length > 0) {
            for(var index in stcResult.Statistics) {
                if(stcResult.Statistics[index].StatisticName == "Trophy") 
                    trophyStc = stcResult.Statistics[index];
                if(stcResult.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = stcResult.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value; // 총 티어
        var tier = parseInt(totalTier % 100); // 유저 티어
        var rebirth = parseInt( totalTier / 100 ); // 유저 환생
        
        var GetTitleDataResult = server.GetTitleData( { "Keys" : [ "TierTable", "General" ] } );
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
        var generalTable = JSON.parse( GetTitleDataResult.Data["General"] );
        
        if(tier < parseInt(tierTable.TierLimit)) {
            throw "lack of Tier";
        }
        if(rebirth >= parseInt(tierTable.RebirthLimit)) {
            throw "rebirth MAX";   
        }
        
        rebirth ++;
        // 초기화
        tier = 1;
        tierStc.Value = rebirth * 100 + tier;
        
        ResetInv("GO");
        //
        
        server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: generalTable.RebirthReward.Gem, VirtualCurrency: "GE" });
        server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: generalTable.RebirthReward.SP, VirtualCurrency: "SP" });
        trophyStc.Value += tierTable.RebirthTrophy;
        
        result.isRebirth = true;
        
        server.UpdatePlayerStatistics({ "PlayFabId": currentPlayerId, "Statistics": [trophyStc, tierStc] });
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

}

function ResetInv( vcType ) {
    try {
        
        var inventory = server.GetUserInventory({"PlayFabId": currentPlayerId});
        var vcAmount = 0;
        if(inventory.VirtualCurrency.hasOwnProperty(vcType)) {
            vcAmount = inventory.VirtualCurrency[vcType];    
        }else {
            throw "have not key ";   
        }
        
        if(vcAmount > 0)
            server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: vcAmount, VirtualCurrency: vcType });
        
        var totalItem = [];
        var items = [];
        for(var index in inventory.Inventory) {
            if(inventory.Inventory[index].ItemClass != IC_CHEST_BATTLE ) {
                totalItem.push( { ItemInstanceId : inventory.Inventory[index].ItemInstanceId, PlayFabId : currentPlayerId  } );
            }
        }
        while(totalItem.length > 0) {
            items.push(totalItem.splice(0, 25));
        }
        for(var index in items) {
            server.RevokeInventoryItems({ "Items" : items[index] });
        }
        
        return 0;
        
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}
// ids : array type
function GetItemData(ids) {
    var itemResult = [];
    var invResult = server.GetUserInventory({ "PlayFabId": currentPlayerId });
    
    for(var index in invResult.Inventory)
    {
        for(var j in ids) {
            if(invResult.Inventory[index].ItemInstanceId === ids[j])
            {
                itemResult.push( invResult.Inventory[index] );
            }
        }
    }
    return itemResult;
}

function GetItemCatalogData(id) {
    var itemResult;
    var ctgResult = server.GetCatalogItems( { "PlayFabId": currentPlayerId } );
    
    for(var index in ctgResult.Catalog)
    {
        if(ctgResult.Catalog[index].ItemId === id)
        {
            itemResult = ctgResult.Catalog[index];
        }
    }
    return itemResult;
}

function GetInternalDataUser(keys) {
    return server.GetUserInternalData( { "PlayFabId" : currentPlayerId, "Keys" : keys } );   
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
    
    var GetTitleDataResult = server.GetTitleData( { "Keys" : [ "WorthTable" ] } );
    var worthTable = JSON.parse( GetTitleDataResult.Data.WorthTable );
    if(!worthTable) throw "WorthTable not found";
    var ids = [];
    ids.push(soldItemInstanceId);
    // get item
    var GetItemDataResult = GetItemData(ids);
    if(GetItemDataResult.length == 0) { throw "해당 아이템 찾지 못함"; }
    var itemInstance = GetItemDataResult[0];
    if (!itemInstance)
        throw "Item instance not found";
    if(itemInstance.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    // 
    var itemWorth = CalculItemWorth(itemInstance.CustomData, worthTable);
    
    var sellPrice = Math.ceil(itemWorth * worthTable.SellGoldX);
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
    var skill = JSON.parse( customData.Skill );
    var lev = stat.Lev;
    var atk = 0; var hp = 0; var sta = 0;
    if(stat.hasOwnProperty("Atk")) atk = stat.Atk;
    if(stat.hasOwnProperty("Hp")) hp = stat.Hp;
    if(stat.hasOwnProperty("Sta")) sta = Math.ceil(stat.Sta);
    
    var result = (worthTable.Grade * grade) + (worthTable.Tier * tier) + (worthTable.Lev * lev) + ( worthTable.Stat * (atk + hp + sta) ) + (worthTable.SkillLev * skill.Lev);
    
    return result;
    
}

handlers.ExpUp = function (args) {
    
     if (!args || !args.targetItemInstanceId || !args.rawItemInstanceId)
        throw "Invalid input parameters, expected TargetItemInstanceId and RawItemInstanceId";
    return ExpUp_internal(args.targetItemInstanceId, args.rawItemInstanceId);  
}

function ExpUp_internal ( targeInstId, rawInstId ) {
    
    var GetTitleDataResult = server.GetTitleData( { "Keys" : [ "LevelTable", "WorthTable" ] } );
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
        throw "Item instance not found";
    if(targetItemInstance.CustomData === undefined || rawItemInstance.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    var targetItemStat = {};
    var rawItemStat = {};
    var levLimit = CalculLevLimit( parseInt( targetItemInstance.CustomData.Tier ), levelTable );
    targetItemStat = JSON.parse( targetItemInstance.CustomData.Stat );
    rawItemStat = JSON.parse( rawItemInstance.CustomData.Stat );
    if(targetItemStat.Lev >= levLimit) { targetItemStat.Lev = levLimit;  throw "아이템 레벨 MAX"; }
    
    // 아이템 가치 계산
    var targetItemWorth = CalculItemWorth(targetItemInstance.CustomData, worthTable);
    var rawItemWorth = CalculItemWorth(rawItemInstance.CustomData, worthTable);
    var exp = Math.ceil(rawItemWorth * worthTable.ExpX * rawItemStat.Lev);
    var levUpCost = rawItemStat.Lev * Math.ceil( rawItemWorth * worthTable.LevUpCostX );
    if(levUpCost > inventory.VirtualCurrency["GO"]) throw "Gold가 모자릅니다.";
    
    // Exp Up
    targetItemStat.Exp += exp;
    if(targetItemStat.Exp >= targetItemWorth) { 
        targetItemStat.Exp = targetItemStat.Exp - targetItemWorth;
        targetItemStat.Lev += 1;
        if(targetItemStat.hasOwnProperty("Atk")) targetItemStat.Atk += Math.ceil( targetItemStat.Atk * levelTable.XperLevel );
        if(targetItemStat.hasOwnProperty("Hp")) targetItemStat.Hp += Math.ceil( targetItemStat.Hp * levelTable.XperLevel );
        if(targetItemStat.hasOwnProperty("Sta")) targetItemStat.Sta += Math.ceil( targetItemStat.Sta * levelTable.XperLevel );
        
        if(targetItemStat.Lev >= levLimit) { targetItemStat.Lev = levLimit; }
    }
    targetItemInstance.CustomData.Stat = JSON.stringify( targetItemStat );
    
    var customRequest = {
        "PlayFabId": currentPlayerId,
        "ItemInstanceId": targeInstId,
        "Data": targetItemInstance.CustomData
    }
    server.UpdateUserInventoryItemCustomData(customRequest);
    
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
    
    if (!args || !args.tab1 || !args.tab2 || !args.tab3 || !args.lastTab)
        throw "Invalid input parameters";
    server.UpdateUserData( {  PlayFabId: currentPlayerId, Data : args } );
    
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
    server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : { "CharacterInfo" : characterInfo }, Permission : "Public" } );
    
}

// args.ID : 마스터리 ID
handlers.MasteryUpgrade = function (args) {
    try {
        var userData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: ["Mastery"] } );
        var inventory = server.GetUserInventory( { PlayFabId: currentPlayerId } );
        var GetTitleDataResult = server.GetTitleData( { Keys: ["MasteryTable"] } );
        var tableData = JSON.parse( GetTitleDataResult.Data["MasteryTable"] );
        
        var masteryObj = {};
        if(userData.Data.hasOwnProperty("Mastery")) {
            masteryObj = JSON.parse( userData.Data["Mastery"].Value );
        }else {
            // 스킬 마스터리 처음일때
            masteryObj = resetMasteryValue(tableData);
        }
        // 체크
        if(!tableData.Mastery.hasOwnProperty(String(args.ID))) { throw "MasteryId not found in table"; }
        if(!masteryObj.hasOwnProperty(String(args.ID))) {
            masteryObj[String(args.ID)] = "0";
        }
        
        var value = parseInt(masteryObj[String(args.ID)]);
        
        var masteryData = {};
        for(var index in tableData.Mastery) {
            if(tableData.Mastery[index].ID == args.ID) {
                masteryData = tableData.Mastery[index];
            }
        }
        // 레벨 Limit 체크
        if(value >= masteryData.Limit) {
            throw "마스터리 레벨 제한";
        }
        // 코스트 체크
        var needSP = 0;
        needSP = masteryData.Cost * (value + 1);
        if( inventory.VirtualCurrency.SP < needSP ) {
            throw "SP 부족";
        }else {
            // 스킬 업그레이드
            value += 1;
            masteryObj[String(args.ID)] = String(value);
            // 코스트
            var spCostRequest = {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "SP",
                "Amount": needSP   
            };
            var costResult = server.SubtractUserVirtualCurrency(spCostRequest); 
        }
        
        var value = JSON.stringify(masteryObj);
        
        return server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : { "Mastery" : value }, Permission : "Public" } );
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};

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
        // mastery init
        var GetTitleDataResult = server.GetTitleData( { Keys: ["MasteryTable", "General"] } );
        var tableData = JSON.parse( GetTitleDataResult.Data["MasteryTable"] );
        var generalData = JSON.parse( GetTitleDataResult.Data["General"] );
        var masteryObj = resetMasteryValue(tableData);
        var rdata = {};
        rdata.Mastery = JSON.stringify(masteryObj);
        // slot init
        var slotObj = ResetUpgradeSlot(generalData);
        
        Object.assign(rdata, slotObj);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : rdata, Permission : "Public" } );
        
    }
    if(internalData.Data.hasOwnProperty("isTutoComplete") && isTrue( internalData.Data["isTutoComplete"].Value )) {
        result.isTutoComplete = internalData.Data["isTutoComplete"].Value;
    }else {
        result.isTutoComplete = false;
    }
    
    return result;
}

function ResetUpgradeSlot(table) {
    
    var slot = {};
    var result = {};
    for(var index in table.ItemUpgradeSlot) {
        slot.state = table.ItemUpgradeSlot[index].Default;
        result[table.ItemUpgradeSlot[index].ID] = JSON.stringify(slot);
    }
    return result;
    
}

// args.slotID, args.itemIds, state: ING, FAIL, LOCK, NONE, READY
handlers.ItemUpgradeStart = function (args) {
    try {
        // get item data
        var items = [];
        items = GetItemData(args.itemIds);
        if(items.length != args.itemIds.length) { throw "Item instance not found"; }
        // get title data
        var slot = {};
        var slotData = {};
        var GetTitleDataResult = server.GetTitleData({ "Keys" : "General" });
        var generalData = {};
        generalData = JSON.parse(GetTitleDataResult.Data["General"]);
        for(var index in generalData.ItemUpgradeSlot) {
            if(generalData.ItemUpgradeSlot[index].ID == args.slotID) {
                slotData = generalData.ItemUpgradeSlot[index];
            }
        }
        var unLockDate = new Date();
        var currentTime = new Date();
        var waitTime = slotData.NeedTime;
        
        unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));
        
        slot.openTime = unLockDate;
        slot.itemIds = args.itemIds;
        slot.state = "ING";
        
        var upData = {};
        upData[slotData.ID] = JSON.stringify(slot);
        
        return server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

// args.slotID
handlers.ItemUpgradeFinish = function (args) {
    try {
        
        var result = {};
        result.isUp = false;
        result.isLackTime = false;
        
        // get user slot data
        var userData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [args.slotID] } );
        if(!userData.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userData.Data[args.slotID].Value );
        // time check
        if(slot.hasOwnProperty("openTime")) {
            var unLockDate = new Date( slot.openTime );
            var currentTime = new Date();
            
            if(currentTime.getTime() < unLockDate.getTime()) {
                result.isLackTime = true;
                return result;
            }
        }else {
            throw "slot has not openTime's key";
        }
        // get item check
        var items = [];
        items = GetItemData(slot.itemIds);
        if(items.length == 0) { throw "Item instance not found"; }
        
        
        var StcResult = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] });

        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        
        if(StcResult.Statistics.length > 0) {
            for(var index in StcResult.Statistics) {
                if(StcResult.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = StcResult.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value; // 총 티어
        var tier = parseInt(totalTier % 100); // 유저 티어
        var rebirth = parseInt( totalTier / 100 ); // 유저 환생
    
        // get item table
        var itemTableRequest = {
            "Keys" : [ "ItemStatTable", "TierTable", "SkillTable", "General" ]
        }
        var GetTitleDataResult = server.GetTitleData(itemTableRequest);

        var itemTable = JSON.parse( GetTitleDataResult.Data["ItemStatTable"] );
        var tierTable = JSON.parse( GetTitleDataResult.Data["TierTable"] );
        var skillTable = JSON.parse( GetTitleDataResult.Data["SkillTable"] );
        var generalTable = JSON.parse( GetTitleDataResult.Data["General"] );
        // get slot table data
        var slotData = {};
        for(var index in generalTable.ItemUpgradeSlot) {
            if(generalTable.ItemUpgradeSlot[index].ID == args.slotID) { slotData = generalTable.ItemUpgradeSlot[index]; }
        }
        
        var upData = {};
        
        // 아이템 확률계산
        var randomTry = Math.floor(Math.random() * 100) + 1;
        
        if(randomTry > slotData.Rate) { 
            // upgrade failed
            result.items = items;
            slot.state = "FAIL";
            upData[slotData.ID] = JSON.stringify(slot);
            
            server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
            
            return result; 
        } 
        
        // upgrade success
        for(var index in items) {
            // 스탯 설정
            var skill = {};
            skill = JSON.parse(items[index].CustomData.Skill);
            
            var itemInfo = JSON.parse( items[index].CustomData.Info );
            
            if(skill.hasOwnProperty("Lev")) {
                skill.Lev += slotData.Amount;
                // limit check
                if(skill.Lev >= skill.Limit) { 
                    skill.Lev = skill.Limit;
                }
            }else {
                
                var tableData = {};
                for(var j in itemTable.Equipments) {
                    if(itemTable.Equipments[j].ItemID == itemInfo.ItemID) {
                        tableData = CopyObj( itemTable.Equipments[j] );
                    }
                }
        
                // 테이블 가져오기
                var EquipArray = [];
                var EquipListData = {};
        
                for(var i = 0; i < tierTable.EquipList.length; i++) {
                    if(tierTable.EquipList[i].Tier <= totalTier) {
                        EquipArray.push(tierTable.EquipList[i]);
                    }
                }
                
                skill = GetRandomSkill( tableData.ItemClass, skillTable.SkillInfos, EquipListData, EquipArray );
                
            }
            
            items[index].CustomData.Skill = JSON.stringify(skill);
            
            var customRequest = {
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": items[index].ItemInstanceId,
                "Data": items[index].CustomData
            }
            server.UpdateUserInventoryItemCustomData(customRequest);
            
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[slotData.ID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
        
        result.isUp = true;
        result.items = items;
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

// args.isRestore, args.slotID
handlers.FailedItemRestore = function (args) {
    try {
        
        if(!args.hasOwnProperty("isRestore")) { throw "isRestore not found"; }
        
        var result = {};
        result.isLackGem = false;
        result.isSuccess = false;
        
        var userData = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [args.slotID] } );
        var titleResult = server.GetTitleData( { "Keys" : [ "General", "WorthTable" ] } );
        var generalTable = JSON.parse( titleResult.Data["General"] );
        var worthTable = JSON.parse( titleResult.Data.WorthTable );
        
        if(!userData.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userData.Data[args.slotID].Value );
        //get items
        var items = [];
        items = GetItemData(slot.itemIds);
        if(items.length == 0) { throw "Item instance not found"; }
        
        var itemIds = [];
        for(var index in slot.itemIds) {
            itemIds.push( { ItemInstanceId : slot.itemIds[index], PlayFabId : currentPlayerId  } );
        }
        
        var inventory = server.GetUserInventory({PlayFabId : currentPlayerId});
        var needGem = 0;
        for(var index in items) {
            needGem += Math.ceil(CalculItemWorth( items[index].CustomData, worthTable ) / generalTable.WorthPerGem);
        }
        
        var upData = {};
        
        if(args.isRestore) {
            
            if(inventory.VirtualCurrency["GE"] < needGem) { 
                result.isLackGem = true;
                return result;
            }
            
            result.isSuccess = true;
            server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: needGem, VirtualCurrency: "GE" });
            
        }else {
            server.RevokeInventoryItems({ "Items" : itemIds }); 
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[args.slotID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
        
        return result;
        
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function GetRandomSkill( itemClass, SkillInfos, EquipListData, EquipArray ) {
    
    var skill = {};
    var skillIdList = [];
    for(var index in SkillInfos) {
        if(SkillInfos[index].ItemClass == itemClass) {
            skillIdList.push( SkillInfos[index].Skill );
        }
    }
    var randomSkillId = skillIdList[parseInt( Math.random() * skillIdList.length )];
    for(var index in SkillInfos) {
        if(SkillInfos[index].Skill == randomSkillId) {
            skill = CopyObj( SkillInfos[index] );
        }
    }
    
    skill.Lev = 1;
    
    // 타겟 장비ID 리스트에서 랜덤뽑기
    if(!EquipListData.hasOwnProperty(skill.TargetClass)) {
        var tempList = [];
        for(var i=0; i< EquipArray.length; i++) {
            if(EquipArray[i].hasOwnProperty(skill.TargetClass)) {
                tempList.push(EquipArray[i][skill.TargetClass]);
            }
        }
        EquipListData[skill.TargetClass] = tempList.join(',');
    }
    var equipIdList = EquipListData[skill.TargetClass].split(",");
    skill.TargetId = equipIdList[ parseInt(Math.random() * equipIdList.length) ];
    
    // 아이템 커스텀데이터 정리하기
    delete skill.ItemClass;
    delete skill.Skill;
    delete skill.TargetClass;
    
    return skill;
    
}

function resetMasteryValue(table){
    // 스킬 마스터리 처음일때
    var result = {};
    for(var index in table.Mastery) {
        result[String(table.Mastery[index].ID)] = String(0);
    }
    return result;
}

// string -> bool
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
