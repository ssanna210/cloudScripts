var IC_CHEST_BATTLE = "BattleChest";
var MinutePerGem = 12;
var REDUCETIME_AD = 30;
var RND_TIER = 3;

handlers.unlockChest = function (args, context) {
    try {
        
        var ItemR = GetItemData([args.InstanceId]);
        if(ItemR.length == 0) { throw "Item instance not found"; }
        var chestR = ItemR[0];
        
        if(chestR.CustomData.hasOwnProperty("openTime")) {
            var unLockDate = new Date( chestR.CustomData.openTime );
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
        
        var StatisticsR = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] });

        var tierStatistic = {};
        tierStatistic.StatisticName = "TotalTier";
        tierStatistic.Value = 1;
        
        if(StatisticsR.Statistics.length > 0) {
            for(var index in StatisticsR.Statistics) {
                if(StatisticsR.Statistics[index].StatisticName == "TotalTier") 
                    tierStatistic = StatisticsR.Statistics[index];
            }
        }
        
        var totalTier = tierStatistic.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        
        var TitleR = server.GetTitleData( { "Keys" : [ "ItemStatTable", "TierTable", "SkillTable" ] } );

        var itemTable = JSON.parse( TitleR.Data["ItemStatTable"] );
        var tierTable = JSON.parse( TitleR.Data["TierTable"] );
        var skillTable = JSON.parse( TitleR.Data["SkillTable"] );
        
        var EquipArray = [];
        var EquipListData = {};
        
        for(var i = 0; i < tierTable.EquipList.length; i++) {
            if(tierTable.EquipList[i].Tier <= totalTier) {
                EquipArray.push(tierTable.EquipList[i]);
            }
        }
        
        // get item catalog
        var CatalR = server.GetCatalogItems({ "PlayFabId": currentPlayerId });
        
        var equipD = [];
        
        for(var key in items) {
            
            var tierInfo = {};
            var randomTier = 1;
            if(items[key].CustomData !== undefined && items[key].CustomData.hasOwnProperty("tier")) { 
                randomTier = items[key].CustomData["tier"]; 
            }else { randomTier = GetRandomTier ( tier ); }
            
            for(var index in tierTable.TierInfos) {
                if(tierTable.TierInfos[index].Tier == randomTier) {
                    tierInfo = tierTable.TierInfos[index];    
                }
            }
            
            var catalD = {};
            for(var index in CatalR.Catalog)
            {
                if(CatalR.Catalog[index].ItemId === items[key].ItemId)
                {
                    catalD = CatalR.Catalog[index];
                }
            }
            if(catalD == null){
                throw "catalog not found";
            }
            if(catalD.CustomData === undefined){
                throw "catalD.CustomData is undefined";
            }
            var customObj = JSON.parse(catalD.CustomData);
            
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
            equipD[key] = {};
            equipD[key].Info = "NONE";
            equipD[key].Stat = "NONE";
            equipD[key].Skill = "NONE";
            equipD[key].Tier = randomTier.toString();
            // set stat
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
            // customData.info
            info.ItemID = tableData.ItemID;
            
            // set character
            if(tableData.ItemClass == "character") {
                
                info.hc = parseInt(Math.random() * 6); // hair color
                info.sc = parseInt(Math.random() * 3); // skin color
                var hairIdList = tableData["HairRange"].split(",");
                info.ht = hairIdList[ parseInt(Math.random() * hairIdList.length) ];   // hair type
                // acc slot count
                if( parseInt(Math.random() * 100) < 2 ) { info.slot = "2,3,4,4"; }
                else { info.slot = "2,3,4"; }
            }
            
            equipD[key].Info = JSON.stringify( info );
            equipD[key].Stat = JSON.stringify( stat );
            equipD[key].Skill = JSON.stringify( skill );
            // update item data
            server.UpdateUserInventoryItemCustomData( { "PlayFabId": currentPlayerId, "ItemInstanceId": items[key].ItemInstanceId, "Data": equipD[key] } );
            
        }
        
        return equipD;
  
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

handlers.openStartChest = function (args, context) {
    try {
        
        var ItemD = GetItemData([args.InstanceId]);
        if(ItemD.length == 0) { throw "Item instance not found"; }
        var chestD = ItemD[0];
        
        var catalD = GetItemCatalogData(chestD.ItemId);
        
        if(catalD == null) {
            throw "catalog not found";
        }
        
        var StcR = server.GetPlayerStatistics( { "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] } );

        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        
        if(StcR.Statistics.length > 0) {
            for(var index in StcR.Statistics) {
                if(StcR.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = StcR.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value;
        var tier = parseInt( totalTier % 100 );

        var randomTier = GetRandomTier( tier );
        randomTier = randomTier.toString();
        // set time
        var customObj = JSON.parse(catalD.CustomData);
        
        var unLockDate = new Date();
        var currentTime = new Date();
        var waitTime = parseInt(customObj.time);
                
        unLockDate.setTime(currentTime.getTime() + (waitTime * 1000 * 60));

        var req= { 
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": args.InstanceId,
            "Data": {
                "openTime" : unLockDate,
                "startTime" : currentTime,
                "state" : "OPENING",
                "tier" : randomTier
            }
        }

        var result = server.UpdateUserInventoryItemCustomData(req);
        
        return result;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

};

handlers.videoChest = function (args, context) {
    try {
        
        var ItemR = GetItemData([args.InstanceId]);
        if(ItemR.length == 0) { throw "Item instance not found"; }
        var chestD = ItemR[0];
        
        // 보상 상자 시간 설정
        var unLockDate = new Date( chestD.CustomData.openTime );
        var startTime = new Date( chestD.CustomData.startTime );
        var reduceTime = REDUCETIME_AD * 60 * 1000; //단축되는 시간
            
        unLockDate.setTime(unLockDate.getTime() - reduceTime);
            
        if(unLockDate.getTime() < startTime.getTime()) {
            unLockDate.setTime(startTime.getTime());
        }
            
        var req = { 
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": args.InstanceId,
            "Data": {
                "openTime" : unLockDate
            }
        }

        var result = server.UpdateUserInventoryItemCustomData(req);    
        
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
        
        var chestD;
        
        for(var index in invResult.Inventory)
        {
            if(invResult.Inventory[index].ItemInstanceId === args.InstanceId)
            {
                chestD = invResult.Inventory[index];
            }
        }
        
        if(chestD == null) {
            throw "Item instance not found";
        }
        
        var unLockDate = new Date();
        var currentTime = new Date();
        
        var chestCustomData = {};
        if(chestD.CustomData != null)
            chestCustomData = chestD.CustomData;
        
        if("openTime" in chestCustomData) {
            
            unLockDate = new Date( chestCustomData.openTime );
            
        }else {
            
            var catalD = GetItemCatalogData(chestD.ItemId);
        
            if(catalD == null) {
                throw "catalog not found";
            }
            
            var customObj = JSON.parse(catalD.CustomData);
            
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
            var GemCostR = server.SubtractUserVirtualCurrency(GemCostRequest); 
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

        var inv = server.GetUserInventory({ "PlayFabId": currentPlayerId });

        var _cnt = 0;
        for(var i in inv.Inventory)
        {
            if(inv.Inventory[i].ItemClass === IC_CHEST_BATTLE) {_cnt++;}
        }

        var r = "NONE";

        if(_cnt < 4) {
            r = ProcessGrantChest();   
        }else {
            throw "chest counts over";    
        }

        return r;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
    

}

function ProcessGrantChest()
{
    var DTresult = server.EvaluateRandomResultTable({ TableId : "dropTable_battleChest" });
    
    var pull = server.GrantItemsToUser({ 
        PlayFabId: currentPlayerId, 
        ItemIds: [DTresult.ResultItemId]
    });
    var r = pull.ItemGrantResults;
    var instId = r[0].ItemInstanceId;
    
    return instId;
}

// args.mode, 0: normal 1: promotion
handlers.BattleResult = function (args, context) {
    try {
        var r = {};
        var stcR = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "Trophy", "TotalTier" ] });

        var trophyStc = {};
        var tierStc = {};
        trophyStc.StatisticName = "Trophy"; trophyStc.Value = 0;
        tierStc.StatisticName = "TotalTier"; tierStc.Value = 1;
        
        if(stcR.Statistics.length > 0) {
            for(var index in stcR.Statistics) {
                if(stcR.Statistics[index].StatisticName == "Trophy") 
                    trophyStc = stcR.Statistics[index];
                if(stcR.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = stcR.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        
        var internalReq = {
            "PlayFabId" : currentPlayerId,   
            "Keys" : [ "WinCount", "WinningStreak", "BeforeWin" ]
        }
        var internalD = server.GetUserInternalData(internalReq);
        
        var userD = {};
        
        if(internalD.Data.hasOwnProperty("WinCount")) {
            userD.WinCount = parseInt( internalD.Data["WinCount"].Value );
        }else {
            userD.WinCount = 0;
        }
        
        if(internalD.Data.hasOwnProperty("WinningStreak")) {
            userD.WinningStreak = parseInt( internalD.Data["WinningStreak"].Value );
        }else {
            userD.WinningStreak = 0;
        }
        // 1 : true, 0 : false
        if(internalD.Data.hasOwnProperty("BeforeWin")) {
            userD.BeforeWin = parseInt( internalD.Data["BeforeWin"].Value );
        }else {
            userD.BeforeWin = 0;
        }
        
        var TitleR = server.GetTitleData( { "Keys" : [ "TierTable", "General"  ] } );
        var tierT = JSON.parse( TitleR.Data["TierTable"] );
        var generalT = JSON.parse( TitleR.Data["General"] );
        
        var tierInfo = {};
        for(var index in tierT.TierInfos) {
            if( tierT.TierInfos[index].Tier == tierStc.Value) {
                tierInfo = tierT.TierInfos[index];
            }
        }
        var trophyAmount = 0;
        // normal
        if(args.mode == 0) {
            // victory
            if(args.isVictory) {
                // streak
                if(userD.BeforeWin == 1) {
                    userD.WinningStreak += 1;
                }
                if(trophyStc.Value < parseInt(tierInfo.TrophyLimit)) {
                
                    if(userD.WinningStreak > parseInt(tierT.StreakLimit)) {
                        trophyAmount = parseInt(tierT.Unit) + parseInt(tierT.StreakLimit);
                    }else {
                        trophyAmount = parseInt(tierT.Unit) + userD.WinningStreak;
                    }
                
                    trophyStc.Value += trophyAmount;
                
                    if(trophyStc.Value > parseInt(tierInfo.TrophyLimit)) {
                        trophyStc.Value = parseInt(tierInfo.TrophyLimit);
                    }
                }
                // check win cnt
                userD.WinCount += 1;
                if(userD.WinCount >= generalT.PerWinChest) {
                    r.chestValue = grantChest();
                    delete r.chestValue;
                
                    userD.WinCount = 0;
                }
                userD.BeforeWin = 1; // 다음 연산을 위하여

            }else {
                // fail
                userD.BeforeWin = 0; // 0: false
                userD.WinningStreak = 0; // 연승 초기화
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
                
                promoData.gold = parseInt( parseInt(tierInfo.StatAmount) * tierT.GoldX );
                promoData.gem = generalT.PromoReward.Gem;
                promoData.sp = generalT.PromoReward.SP;
                
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.gold, VirtualCurrency: "GO" });
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.gem, VirtualCurrency: "GE" });
                server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: promoData.sp, VirtualCurrency: "SP" });
                
            }else {
                // fail
                trophyAmount = generalT.Promopenalty;
                trophyStc.Value -= trophyAmount;
                if(trophyStc.Value < 0) trophyStc.Value = 0;
            }
        }
        
        server.UpdatePlayerStatistics({ "PlayFabId": currentPlayerId, "Statistics": [trophyStc, tierStc] });
        server.UpdateUserInternalData({ "PlayFabId" : currentPlayerId, "Data" : userD });
        
        r.mode = args.mode;
        r.totalTier = tierStc.Value;
        r.trophy = tierStc.Value;
        r.userData = userD;
        r.trophyAmount = trophyAmount;
        r.perWinChest = generalT.PerWinChest;
        r.promoData = promoData;
        
        return r;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

}


handlers.Rebirth = function (args, context) {
    try {
        var r = {};
        r.isRebirth = false;
        
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
        
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        
        var TitleR = server.GetTitleData( { "Keys" : [ "TierTable", "General" ] } );
        var tierTable = JSON.parse( TitleR.Data["TierTable"] );
        var generalT = JSON.parse( TitleR.Data["General"] );
        
        if(tier < parseInt(tierTable.TierLimit)) {
            throw "lack of Tier";
        }
        if(rebirth >= parseInt(tierTable.RebirthLimit)) {
            throw "rebirth MAX";   
        }
        
        rebirth ++;
        // reset
        tier = 1;
        tierStc.Value = rebirth * 100 + tier;
        
        ResetInv("GO");
        //
        
        server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: generalT.RebirthReward.Gem, VirtualCurrency: "GE" });
        server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: generalT.RebirthReward.SP, VirtualCurrency: "SP" });
        trophyStc.Value += tierTable.RebirthTrophy;
        
        r.isRebirth = true;
        
        server.UpdatePlayerStatistics({ "PlayFabId": currentPlayerId, "Statistics": [trophyStc, tierStc] });
        
        return r;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }

}

function ResetInv( vcType ) {
    try {
        
        var inv = server.GetUserInventory({"PlayFabId": currentPlayerId});
        var vcAmount = 0;
        if(inv.VirtualCurrency.hasOwnProperty(vcType)) {
            vcAmount = inv.VirtualCurrency[vcType];    
        }else {
            throw "have not key ";   
        }
        
        if(vcAmount > 0)
            server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: vcAmount, VirtualCurrency: vcType });
        
        var totalItem = [];
        var items = [];
        for(var index in inv.Inventory) {
            if(inv.Inventory[index].ItemClass != IC_CHEST_BATTLE ) {
                totalItem.push( { ItemInstanceId : inv.Inventory[index].ItemInstanceId, PlayFabId : currentPlayerId  } );
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
    var r = [];
    var inv = server.GetUserInventory({ "PlayFabId": currentPlayerId });
    
    for(var index in inv.Inventory)
    {
        for(var j in ids) {
            if(inv.Inventory[index].ItemInstanceId === ids[j])
            {
                r.push( inv.Inventory[index] );
            }
        }
    }
    return r;
}

function GetItemCatalogData(id) {
    var itemR;
    var ctgR = server.GetCatalogItems( { "PlayFabId": currentPlayerId } );
    
    for(var index in ctgR.Catalog)
    {
        if(ctgR.Catalog[index].ItemId === id)
        {
            itemR = ctgR.Catalog[index];
        }
    }
    return itemR;
}

function GetRandomTier (tier) {
    var r = tier - parseInt(Math.random() * RND_TIER);   
    if(r < 1) { r = 1; }

    return r;
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

function SellItem_internal(slodInstId, vcType) {
    
    var TitleR = server.GetTitleData( { "Keys" : [ "WorthTable" ] } );
    var worthT = JSON.parse( TitleR.Data.WorthTable );
    if(!worthT) throw "WorthTable not found";
    var ids = [];
    ids.push(slodInstId);
    // get item
    var ItemR = GetItemData(ids);
    if(ItemR.length == 0) { throw "item instance not found"; }
    var itemD = ItemR[0];
    if (!itemD)
        throw "Item instance not found";
    if(itemD.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    // 
    var itemWorth = CalculItemWorth(itemD.CustomData, worthT);
    
    var sellPrice = Math.ceil(itemWorth * worthT.SellGoldX);
    server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: sellPrice, VirtualCurrency: vcType });
    server.RevokeInventoryItem({ PlayFabId: currentPlayerId, ItemInstanceId: slodInstId });
    
    return sellPrice;
}

handlers.SellItem = function (args) {
    if (!args || !args.soldItemInstanceId)
        throw "Invalid input parameters, expected soldItemInstanceId and requestedVcType";
    return SellItem_internal(args.soldItemInstanceId, "GO");
};

function CalculItemWorth ( cData, wTable ) {
    
    // stat : Atk, Hp, Sta
    var tier = parseInt( cData.Tier );
    var grade = (tier - 1) / 5;
    var stat = JSON.parse( cData.Stat );
    var skill = JSON.parse( cData.Skill );
    var lev = stat.Lev;
    var atk = 0; var hp = 0; var sta = 0;
    if(stat.hasOwnProperty("Atk")) atk = stat.Atk;
    if(stat.hasOwnProperty("Hp")) hp = stat.Hp;
    if(stat.hasOwnProperty("Sta")) sta = Math.ceil(stat.Sta);
    
    var r = (wTable.Grade * grade) + (wTable.Tier * tier) + (wTable.Lev * lev) + ( wTable.Stat * (atk + hp + sta) ) + (wTable.SkillLev * skill.Lev);
    
    return r;
    
}

handlers.ExpUp = function (args) {
    
     if (!args || !args.targetItemInstanceId || !args.rawItemInstanceId)
        throw "Invalid input parameters, expected TargetItemInstanceId and RawItemInstanceId";
    return ExpUp_internal(args.targetItemInstanceId, args.rawItemInstanceId);  
}

function ExpUp_internal ( targeInstId, rawInstId ) {
    
    var TitleR = server.GetTitleData( { "Keys" : [ "LevelTable", "WorthTable" ] } );
    var worthTable = JSON.parse( TitleR.Data.WorthTable );
    var levelTable = JSON.parse( TitleR.Data.LevelTable );
    // check item
    var inv = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var targetItem = null;
    var rawItem = null;
    for (var i = 0; i < inv.Inventory.length; i++) {
        if (inv.Inventory[i].ItemInstanceId === targeInstId)
            targetItem = inv.Inventory[i];
        else if (inv.Inventory[i].ItemInstanceId === rawInstId)
            rawItem = inv.Inventory[i];
    }
    if (!targetItem || !rawItem)
        throw "Item instance not found";
    if(targetItem.CustomData === undefined || rawItem.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    var targetStat = {};
    var rawStat = {};
    var levLimit = CalculLevLimit( parseInt( targetItem.CustomData.Tier ), levelTable );
    targetStat = JSON.parse( targetItem.CustomData.Stat );
    rawStat = JSON.parse( rawItem.CustomData.Stat );
    if(targetStat.Lev >= levLimit) { targetStat.Lev = levLimit;  throw "item level MAX"; }
    
    // 아이템 가치 계산
    var targetWorth = CalculItemWorth(targetItem.CustomData, worthTable);
    var rawWorth = CalculItemWorth(rawItem.CustomData, worthTable);
    var exp = Math.ceil(rawWorth * worthTable.ExpX * rawStat.Lev);
    var levUpCost = rawStat.Lev * Math.ceil( rawWorth * worthTable.LevUpCostX );
    if(levUpCost > inv.VirtualCurrency["GO"]) throw "lack of Gold";
    
    // Exp Up
    targetStat.Exp += exp;
    if(targetStat.Exp >= targetWorth) { 
        targetStat.Exp = targetStat.Exp - targetWorth;
        targetStat.Lev += 1;
        if(targetStat.hasOwnProperty("Atk")) targetStat.Atk += Math.ceil( targetStat.Atk * levelTable.XperLevel );
        if(targetStat.hasOwnProperty("Hp")) targetStat.Hp += Math.ceil( targetStat.Hp * levelTable.XperLevel );
        if(targetStat.hasOwnProperty("Sta")) targetStat.Sta += Math.ceil( targetStat.Sta * levelTable.XperLevel );
        
        if(targetStat.Lev >= levLimit) { targetStat.Lev = levLimit; }
    }
    targetItem.CustomData.Stat = JSON.stringify( targetStat );
    
    var customReq = {
        "PlayFabId": currentPlayerId,
        "ItemInstanceId": targeInstId,
        "Data": targetItem.CustomData
    }
    server.UpdateUserInventoryItemCustomData(customReq);
    
    server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: levUpCost, VirtualCurrency: "GO" });
    server.RevokeInventoryItem({ PlayFabId: currentPlayerId, ItemInstanceId: rawInstId });
    
    return exp;
}

function CalculLevLimit ( tier, levelTable ) {
    var cnt = 0;
    cnt = (tier % 5);
    if (cnt == 0) cnt = 5;
    var r = levelTable.LimitList[cnt-1];
    return r;
}

handlers.UpdatePartyTabData = function (args) {
    
    if (!args || !args.tab1 || !args.tab2 || !args.tab3 || !args.lastTab)
        throw "Invalid input parameters";
    server.UpdateUserData( {  PlayFabId: currentPlayerId, Data : args } );
    
    if(!args.hasOwnProperty(args.lastTab)) { throw "args not have key : args.lastTab"; }
    var equipInfo = JSON.parse( args[args.lastTab] );
    var customDatas = [];
    var invR = server.GetUserInventory( {"PlayFabId": currentPlayerId} );
    var item = null;
    for(var index in equipInfo) {
        if(equipInfo[index] == null) {
            customDatas.push(null);
        }else {
            item = null;
            for(var i in invR.Inventory)
            {
                if(invR.Inventory[i].ItemInstanceId === equipInfo[index])
                {
                    item = invR.Inventory[i];
                }
            }
            if(item == null) customDatas.push(null);
            else customDatas.push(item.CustomData);
        }
    }
    
    var cInfo = JSON.stringify(customDatas);
    server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : { "CharacterInfo" : cInfo }, Permission : "Public" } );
    
}

// args.ID : mastery ID
handlers.MasteryUpgrade = function (args) {
    try {
        var userD = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: ["Mastery"] } );
        var inv = server.GetUserInventory( { PlayFabId: currentPlayerId } );
        var TitleR = server.GetTitleData( { Keys: ["MasteryTable"] } );
        var tableD = JSON.parse( TitleR.Data["MasteryTable"] );
        
        var mObj = {};
        if(userD.Data.hasOwnProperty("Mastery")) {
            mObj = JSON.parse( userD.Data["Mastery"].Value );
        }else {
            mObj = resetMasteryValue(tableD);
        }
        // check
        if(!tableD.Mastery.hasOwnProperty(String(args.ID))) { throw "MasteryId not found in table"; }
        if(!mObj.hasOwnProperty(String(args.ID))) {
            mObj[String(args.ID)] = "0";
        }
        
        var value = parseInt(mObj[String(args.ID)]);
        
        var masteryD = {};
        for(var index in tableD.Mastery) {
            if(tableD.Mastery[index].ID == args.ID) {
                masteryD = tableD.Mastery[index];
            }
        }
        // Limit check
        if(value >= masteryD.Limit) {
            throw "마스터리 레벨 제한";
        }
        // cost check
        var needSP = 0;
        needSP = masteryD.Cost * (value + 1);
        if( inv.VirtualCurrency.SP < needSP ) {
            throw "SP 부족";
        }else {
            // skill up
            value += 1;
            mObj[String(args.ID)] = String(value);
            // cost
            var spCostReq = {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "SP",
                "Amount": needSP   
            };
            var costR = server.SubtractUserVirtualCurrency(spCostReq); 
        }
        
        var value = JSON.stringify(mObj);
        
        return server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : { "Mastery" : value }, Permission : "Public" } );
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};


handlers.FirstCheck = function (args) {
    var r = {};
    var internalD = server.GetUserInternalData( { PlayFabId: currentPlayerId, Keys: ["isFirstGift", "isTutoComplete"] } );
    if(internalD.Data.hasOwnProperty("isFirstGift") && isTrue( internalD.Data["isFirstGift"].Value )) {
        r.isFirstGift = internalD.Data["isFirstGift"].Value;
    }else {
        // first gift
        var pull = server.GrantItemsToUser({ 
            PlayFabId: currentPlayerId, 
            ItemIds: ["bundle_firstGift"]
        });
        MakeItemData(pull.ItemGrantResults);
        server.UpdateUserInternalData( { PlayFabId: currentPlayerId, Data: {"isFirstGift": "true"} } );
        r.isFirstGift = true;
        // mastery init
        var TitleR = server.GetTitleData( { Keys: ["MasteryTable", "General"] } );
        var tableD = JSON.parse( TitleR.Data["MasteryTable"] );
        var generalD = JSON.parse( TitleR.Data["General"] );
        var mObj = resetMasteryValue(tableD);
        var rdata = {};
        rdata.Mastery = JSON.stringify(mObj);
        // slot init
        var slotObj = ResetUpgradeSlot(generalD);
        
        Object.assign(rdata, slotObj);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : rdata, Permission : "Public" } );
        
    }
    if(internalD.Data.hasOwnProperty("isTutoComplete") && isTrue( internalD.Data["isTutoComplete"].Value )) {
        r.isTutoComplete = internalD.Data["isTutoComplete"].Value;
    }else {
        r.isTutoComplete = false;
    }
    
    return r;
}

function ResetUpgradeSlot(t) {
    
    var slot = {};
    var r = {};
    for(var index in t.ItemUpgradeSlot) {
        slot.state = t.ItemUpgradeSlot[index].Default;
        r[t.ItemUpgradeSlot[index].ID] = JSON.stringify(slot);
    }
    return r;
    
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
        var TitleR = server.GetTitleData({ "Keys" : "General" });
        var generalD = {};
        generalD = JSON.parse(TitleR.Data["General"]);
        for(var index in generalD.ItemUpgradeSlot) {
            if(generalD.ItemUpgradeSlot[index].ID == args.slotID) {
                slotData = generalD.ItemUpgradeSlot[index];
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
        
        var r = {};
        r.isUp = false;
        r.isLackTime = false;
        
        // get user slot data
        var userD = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [args.slotID] } );
        if(!userD.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userD.Data[args.slotID].Value );
        // time check
        if(slot.hasOwnProperty("openTime")) {
            var unLockDate = new Date( slot.openTime );
            var currentTime = new Date();
            
            if(currentTime.getTime() < unLockDate.getTime()) {
                r.isLackTime = true;
                return r;
            }
        }else {
            throw "slot has not openTime's key";
        }
        // get item check
        var items = [];
        items = GetItemData(slot.itemIds);
        if(items.length == 0) { throw "Item instance not found"; }
        
        
        var StcR = server.GetPlayerStatistics({ "PlayFabId": currentPlayerId, "StatisticNames": [ "TotalTier" ] });

        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        
        if(StcR.Statistics.length > 0) {
            for(var index in StcR.Statistics) {
                if(StcR.Statistics[index].StatisticName == "TotalTier") 
                    tierStc = StcR.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
    
        // get item table
        var TitleR = server.GetTitleData({ "Keys" : [ "ItemStatTable", "TierTable", "SkillTable", "General" ] });
        
        var itemT = JSON.parse( TitleR.Data["ItemStatTable"] );
        var tierT = JSON.parse( TitleR.Data["TierTable"] );
        var skillT = JSON.parse( TitleR.Data["SkillTable"] );
        var generalT = JSON.parse( TitleR.Data["General"] );
        // get slot table data
        var slotData = {};
        for(var index in generalT.ItemUpgradeSlot) {
            if(generalT.ItemUpgradeSlot[index].ID == args.slotID) { slotData = generalT.ItemUpgradeSlot[index]; }
        }
        
        var upData = {};
        
        var randomTry = Math.floor(Math.random() * 100) + 1;
        
        if(randomTry > slotData.Rate) { 
            // upgrade failed
            r.items = items;
            slot.state = "FAIL";
            upData[slotData.ID] = JSON.stringify(slot);
            
            server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
            
            return r; 
        } 
        
        // upgrade success
        for(var index in items) {
            // set stat
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
                
                var tableD = {};
                for(var j in itemT.Equipments) {
                    if(itemT.Equipments[j].ItemID == itemInfo.ItemID) {
                        tableD = CopyObj( itemT.Equipments[j] );
                    }
                }
        
                // 테이블 가져오기
                var EquipArray = [];
                var EquipListData = {};
        
                for(var i = 0; i < tierT.EquipList.length; i++) {
                    if(tierT.EquipList[i].Tier <= totalTier) {
                        EquipArray.push(tierT.EquipList[i]);
                    }
                }
                
                skill = GetRandomSkill( tableD.ItemClass, skillT.SkillInfos, EquipListData, EquipArray );
                
            }
            
            items[index].CustomData.Skill = JSON.stringify(skill);
            
            var customReq = {
                "PlayFabId": currentPlayerId,
                "ItemInstanceId": items[index].ItemInstanceId,
                "Data": items[index].CustomData
            }
            server.UpdateUserInventoryItemCustomData(customReq);
            
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[slotData.ID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
        
        r.isUp = true;
        r.items = items;
        
        return r;
        
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
        
        var r = {};
        r.isLackGem = false;
        r.isSuccess = false;
        
        var userD = server.GetUserReadOnlyData( { PlayFabId: currentPlayerId, Keys: [args.slotID] } );
        var titleR = server.GetTitleData( { "Keys" : [ "General", "WorthTable" ] } );
        var generalT = JSON.parse( titleR.Data["General"] );
        var worthT = JSON.parse( titleR.Data.WorthTable );
        
        if(!userD.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userD.Data[args.slotID].Value );
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
            needGem += Math.ceil(CalculItemWorth( items[index].CustomData, worthT ) / generalT.WorthPerGem);
        }
        
        var upData = {};
        
        if(args.isRestore) {
            
            if(inventory.VirtualCurrency["GE"] < needGem) { 
                r.isLackGem = true;
                return r;
            }
            
            r.isSuccess = true;
            server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, Amount: needGem, VirtualCurrency: "GE" });
            
        }else {
            server.RevokeInventoryItems({ "Items" : itemIds }); 
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[args.slotID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upData, Permission : "Public" } );;
        
        return r;
        
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
    
    // random
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
    
    
    delete skill.ItemClass;
    delete skill.Skill;
    delete skill.TargetClass;
    
    return skill;
    
}

function resetMasteryValue(t){
    
    var r = {};
    for(var i in t.Mastery) {
        r[String(t.Mastery[i].ID)] = String(0);
    }
    return r;
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
