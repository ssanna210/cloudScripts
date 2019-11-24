var IC_CHEST_BATTLE = "BattleChest";
var MinPerGem = 12;
var REDUCETIME_AD = 30;
var RND_TIER = 3;

handlers.unlockChest = function (args, context) {
    try {
        var ItemR = GetItemData([args.InstanceId]);
        if(ItemR.length == 0) { throw "Item instance not found"; }
        var chestR = ItemR[0];
        if(chestR.CustomData.hasOwnProperty("openTime")) {
            var uDate = new Date( chestR.CustomData.openTime );
            var ctime = new Date();
            
            if(ctime.getTime() < uDate.getTime()) {
                throw "Time is shot yet";
            }
        }else {
            throw "not have key : openTime ";
        }
        var r = server.UnlockContainerInstance({ PlayFabId: currentPlayerId, ContainerItemInstanceId: args.InstanceId });  
        
        return MakeItemData(r.GrantedItems);
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};

function MakeItemData(items) {
    try {
        var cId = currentPlayerId;
        var StcR = server.GetPlayerStatistics({ "PlayFabId": cId, "StatisticNames": [ "TotalTier" ] });
        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        if(StcR.Statistics.length > 0) {
            for(var index in StcR.Statistics) {
                if(StcR.Statistics[index].StatisticName == "TotalTier") tierStc = StcR.Statistics[index];
            }
        }
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        var TitleR = server.GetTitleData( { "Keys" : [ "ItemStatTable", "TierTable", "SkillTable" ] } );
        var itemT = JSON.parse( TitleR.Data["ItemStatTable"] );
        var tierT = JSON.parse( TitleR.Data["TierTable"] );
        var skillT = JSON.parse( TitleR.Data["SkillTable"] );
        var equipA = [];
        var equipLD = {};
        
        for(var i = 0; i < tierT.EquipList.length; i++) {
            if(tierT.EquipList[i].Tier <= totalTier) {
                equipA.push(tierT.EquipList[i]);
            }
        }
        
        var CatalR = server.GetCatalogItems({ "PlayFabId": cId });
        var equipD = [];
        
        for(var key in items) {
            var tierI = {};
            var rndTier = 1;
            if(items[key].CustomData !== undefined && items[key].CustomData.hasOwnProperty("tier")) { 
                rndTier = items[key].CustomData["tier"]; 
            }else { rndTier = GetRandomTier ( tier ); }
            for(var i in tierT.TierInfos) {
                if(tierT.TierInfos[i].Tier == rndTier) {
                    tierI = tierT.TierInfos[i];    
                }
            }
            var catalD = {};
            for(var i in CatalR.Catalog)
            {
                if(CatalR.Catalog[i].ItemId === items[key].ItemId)
                {
                    catalD = CatalR.Catalog[i];
                }
            }
            if(catalD == null) throw "catalog not found";
            if(catalD.CustomData === undefined) throw "catalD.CustomData is undefined";
            var customObj = JSON.parse(catalD.CustomData);
            if(!equipLD.hasOwnProperty(items[key].ItemClass)) {
                var tempList = [];
                for(var i=0; i< equipA.length; i++) {
                    if(equipA[i].hasOwnProperty(items[key].ItemClass)) {
                        tempList.push(equipA[i][items[key].ItemClass]);
                    }
                }
                equipLD[items[key].ItemClass] = tempList.join(',');
            }
            
            var equipList = equipLD[items[key].ItemClass].split(",");
            var rndV = parseInt(Math.random() * equipList.length);
            var itemId = equipList[rndV];
            var t = {};
            var info = {};
            var stat = {};
            var skill = {};
            equipD[key] = {};
            equipD[key].Info = "NONE";
            equipD[key].Stat = "NONE";
            equipD[key].Skill = "NONE";
            equipD[key].Tier = rndTier.toString();
            // set stat
            for(var i in itemT.Equipments) {
                if(itemT.Equipments[i].ItemID == itemId) t = CopyObj( itemT.Equipments[i] );
            }
            //Lev, Atk, Hp
            stat.Lev = 1;
            stat.Exp = 0;
            if(t.hasOwnProperty("AtkX")) {
                stat.Atk = parseInt( tierI.StatAmount * t.AtkX );
                stat.Atk += parseInt( Math.random() * stat.Atk * 0.3 );
            }
            if(t.hasOwnProperty("HpX")) {
                stat.Hp = parseInt( tierI.StatAmount * t.HpX );
                stat.Hp += parseInt( Math.random() * stat.Hp * 0.3 );
            }
            if(t.hasOwnProperty("Sta")) {
                stat.Sta = t.Sta;
            }
            if(t.hasOwnProperty("StaReX")) {
                stat.StaReX = t.StaReX;
            }
            if(t.hasOwnProperty("Wg")) {
                stat.Wg = t.Wg;
            }
            if(customObj.grade == "rare" || customObj.grade == "legend") {
                skill = GetRandomSkill( t.ItemClass, skillT.SkillInfos, equipLD, equipA );
                if(customObj.grade == "rare") { skill.Lev = 20 + (parseInt(Math.random() * 10) - 8); }
                if(customObj.grade == "legend") { skill.Lev = skill.Limit; }
            }
            info.ItemID = t.ItemID;
            // set character
            if(t.ItemClass == "character") {
                info.hc = parseInt(Math.random() * 6); // hair color
                info.sc = parseInt(Math.random() * 3); // skin color
                var hairIdList = t["HairRange"].split(",");
                info.ht = hairIdList[ parseInt(Math.random() * hairIdList.length) ];   // hair type
                // acc slot count
                if( parseInt(Math.random() * 100) < 2 ) { info.slot = "2,3,4,4"; }
                else { info.slot = "2,3,4"; }
            }

            equipD[key].Info = JSON.stringify( info );
            equipD[key].Stat = JSON.stringify( stat );
            equipD[key].Skill = JSON.stringify( skill );            
            server.UpdateUserInventoryItemCustomData( { PlayFabId: cId, ItemInstanceId: items[key].ItemInstanceId, Data: equipD[key] } );
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
        var cId = currentPlayerId;
        var ItemD = GetItemData([args.InstanceId]);
        if(ItemD.length == 0) { throw "Item instance not found"; }
        var chestD = ItemD[0];
        var catalD = GetItemCatalogData(chestD.ItemId);
        if(catalD == null) throw "catalog not found";
        
        var StcR = server.GetPlayerStatistics( { "PlayFabId": cId, "StatisticNames": [ "TotalTier" ] } );
        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        if(StcR.Statistics.length > 0) {
            for(var index in StcR.Statistics) {
                if(StcR.Statistics[index].StatisticName == "TotalTier") tierStc = StcR.Statistics[index];
            }
        }
        
        var totalTier = tierStc.Value;
        var tier = parseInt( totalTier % 100 );
        var ranTier = GetRandomTier( tier );
        ranTier = ranTier.toString();
        var customObj = JSON.parse(catalD.CustomData);
        var uD = new Date();
        var cT = new Date();
        var wT = parseInt(customObj.time);
        uD.setTime(cT.getTime() + (wT * 1000 * 60));
        var req= { 
            PlayFabId: cId,
            ItemInstanceId: args.InstanceId,
            Data: {
                "openTime" : uD,
                "startTime" : cT,
                "state" : "OPENING",
                "tier" : ranTier
            }
        }

        return server.UpdateUserInventoryItemCustomData(req);
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
        var uD = new Date( chestD.CustomData.openTime );
        var sT = new Date( chestD.CustomData.startTime );
        var rT = REDUCETIME_AD * 60 * 1000;
        uD.setTime(uD.getTime() - rT);
        if(uD.getTime() < sT.getTime()) uD.setTime(sT.getTime());
        var req = { 
            PlayFabId: currentPlayerId,
            ItemInstanceId: args.InstanceId,
            Data: { "openTime" : uD }
        }

        return server.UpdateUserInventoryItemCustomData(req);
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};

handlers.openGem = function (args, context) {
    try {
        var cId = currentPlayerId;
        var inv = server.GetUserInventory( { "PlayFabId": cId } );
        var chestD;
        
        for(var i in inv.Inventory)
        {
            if(inv.Inventory[i].ItemInstanceId === args.InstanceId) chestD = inv.Inventory[i];
        }
        if(chestD == null) throw "Item instance not found";
        
        var uD = new Date();
        var cT = new Date();
        var customD = {};
        if(chestD.CustomData != null) customD = chestD.CustomData;
        
        if("openTime" in customD) {
            uD = new Date( customD.openTime );
        }else {
            var catalD = GetItemCatalogData(chestD.ItemId);
            if(catalD == null) throw "catalog not found";
            var cusObj = JSON.parse(catalD.CustomData);
            var wT = parseInt(cusObj.time);
            uD.setTime(cT.getTime() + (wT * 1000 * 60));
        }
        
        var lT = uD - cT;
        var needGem = Math.ceil(lT / (MinPerGem * 60 * 1000));
        if(inv.VirtualCurrency.GE < needGem) {
            throw "lack of GEM";
        }else {
            server.SubtractUserVirtualCurrency( { PlayFabId: cId, VirtualCurrency: "GE", Amount: needGem } ); 
        }
        var r = server.UnlockContainerInstance({ PlayFabId: cId, ContainerItemInstanceId: args.InstanceId });  
        
        return MakeItemData(r.GrantedItems);
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
            if(inv.Inventory[i].ItemClass === IC_CHEST_BATTLE) { _cnt++; }
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
    var dT = server.EvaluateRandomResultTable({ TableId : "dropTable_battleChest" });
    var pull = server.GrantItemsToUser({ 
        PlayFabId: currentPlayerId, 
        ItemIds: [dT.ResultItemId]
    });
    var r = pull.ItemGrantResults;
    var instId = r[0].ItemInstanceId;
    
    return instId;
}

// 0: normal 1: promotion
handlers.BattleResult = function (args, context) {
    try {
        var cId = currentPlayerId;
        var r = {};
        var stcR = server.GetPlayerStatistics({ PlayFabId: cId });
        var trophyStc = {}; var tierStc = {}; var hTrpStc = {}; var BPStc = {};
        trophyStc.StatisticName = "Trophy"; trophyStc.Value = 0;
        tierStc.StatisticName = "TotalTier"; tierStc.Value = 1;
        hTrpStc.StatisticName = HTN; hTrpStc.Value = 0;
        BPStc.StatisticName = "BP"; BPStc.Value = 0;
        if(stcR.Statistics.length > 0) {
            for(var index in stcR.Statistics) {
                if(stcR.Statistics[index].StatisticName == "Trophy") trophyStc = stcR.Statistics[index];
                if(stcR.Statistics[index].StatisticName == "TotalTier") tierStc = stcR.Statistics[index];
                if(stcR.Statistics[index].StatisticName == HTN) hTrpStc = stcR.Statistics[index];
                if(stcR.Statistics[index].StatisticName == "BP") BPStc = stcR.Statistics[index];
            }
        }
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        var internalD = server.GetUserInternalData( {PlayFabId : cId, Keys : [ "WinCount", "WinningStreak", "BeforeWin" ]} );
        var userD = {};
        if(internalD.Data.hasOwnProperty("WinCount")) userD.WinCount = parseInt( internalD.Data["WinCount"].Value );
        else userD.WinCount = 0;
        if(internalD.Data.hasOwnProperty("WinningStreak")) 
            userD.WinningStreak = parseInt( internalD.Data["WinningStreak"].Value );
        else userD.WinningStreak = 0;
        // 1 : true, 0 : false
        if(internalD.Data.hasOwnProperty("BeforeWin")) userD.BeforeWin = parseInt( internalD.Data["BeforeWin"].Value );
        else userD.BeforeWin = 0;
        
        var TitleR = server.GetTitleData( { Keys : [ "TierTable", "General"  ] } );
        var tierT = JSON.parse( TitleR.Data["TierTable"] );
        var generalT = JSON.parse( TitleR.Data["General"] );
        var tierInfo = {};
        for(var i in tierT.TierInfos) { if( tierT.TierInfos[i].Tier == tierStc.Value) tierInfo = tierT.TierInfos[i]; }
        var trpAmnt = 0;
        var trpLimit = parseInt(tierInfo.TrophyLimit);
        var tierLimit = tierT.TierLimit;
        var rebLimit = tierT.RebirthLimit;
        var stkLimit = tierT.StreakLimit;
        var trpUnit = tierT.Unit;
        r.isHT = (hTrpStc.Value > 0);   // bool HT
        if(args.mode == 0) {
            if(args.isVictory) {
                if(userD.BeforeWin == 1) userD.WinningStreak += 1; // streak
                if(userD.WinningStreak > stkLimit) trpAmnt = trpUnit + stkLimit;
                else trpAmnt = trpUnit + userD.WinningStreak;
                if(trophyStc.Value < trpLimit) {
                    trophyStc.Value += trpAmnt;
                    if(trophyStc.Value > trpLimit) trophyStc.Value = trpLimit;
                }else{
                    if(tier == tierLimit && rebirth == rebLimit) hTrpStc.Value += trpAmnt;
                }
                // check win cnt
                userD.WinCount += 1;
                if(userD.WinCount >= generalT.PerWinChest) {
                    r.chestValue = grantChest();
                    delete r.chestValue;
                    userD.WinCount = 0;
                }
                userD.BeforeWin = 1;
                BPStc.Value += 1;
            }else {
                userD.BeforeWin = 0; // 0: false
                userD.WinningStreak = 0;
                if(r.isHT){
                    hTrpStc.Value -= Math.ceil(trpUnit * tierT.HTLoseX);
                    if(hTrpStc.Value < 0) hTrpStc = 0;
                }
                BPStc.Value -= 1;
            }   
        }
        var promoD = {};
        promoD.isPromotion = false;
        promoD.beforeTier = tier;
        promoD.afterTier = 0;
        promoD.gold = 0;
        promoD.gem = 0;
        if(args.mode == 1) {
            if(trophyStc.Value < trpLimit) throw "lack of Trophy";
            if(tier >= tierLimit) throw "tier Max";
            if(args.isVictory) {
                tier++;
                totalTier = rebirth * 100 + tier;
                tierStc.Value = totalTier;
                promoD.afterTier = totalTier;
                promoD.isPromotion = true;
                promoD.gold = parseInt( parseInt(tierInfo.StatAmount) * tierT.GoldX );
                promoD.gem = generalT.PromoReward.Gem;
                promoD.sp = generalT.PromoReward.SP;
                trpAmnt = 1;
                trophyStc.Value += trpAmnt;
                server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: promoD.gold, VirtualCurrency: "GO" });
                server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: promoD.gem, VirtualCurrency: "GE" });
                server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: promoD.sp, VirtualCurrency: "SP" });
                BPStc.Value = 0;
            }else {
                trpAmnt = generalT.Promopenalty;
                trophyStc.Value -= trpAmnt;
                if(trophyStc.Value < 0) trophyStc.Value = 0;
            }
        }
        server.UpdatePlayerStatistics({ PlayFabId: cId, Statistics: [trophyStc, tierStc, hTrpStc, BPStc] });
        server.UpdateUserInternalData({ PlayFabId : cId, Data : userD });
        r.mode = args.mode;
        r.totalTier = tierStc.Value;
        r.trophy = tierStc.Value;
        r.userData = userD;
        r.trophyAmount = trpAmnt;
        r.perWinChest = generalT.PerWinChest;
        r.promoData = promoD;
        return r;
    } catch(e) {
        var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj;
    }
}

handlers.Rebirth = function (args, context) {
    try {
        var cId = currentPlayerId;
        var r = {};
        r.isRebirth = false;
        var stcR = server.GetPlayerStatistics( { PlayFabId: cId, StatisticNames: [ "Trophy", "TotalTier" ] } );
        var trophyStc = {};
        var tierStc = {};
        trophyStc.StatisticName = "Trophy"; trophyStc.Value = 0;
        tierStc.StatisticName = "TotalTier"; tierStc.Value = 1;
        BPStc.StatisticName = "BP"; BPStc.Value = 0;
        if(stcR.Statistics.length > 0) {
            for(var i in stcR.Statistics) {
                if(stcR.Statistics[i].StatisticName == "Trophy") trophyStc = stcR.Statistics[i];
                if(stcR.Statistics[i].StatisticName == "TotalTier") tierStc = stcR.Statistics[i];
                if(stcR.Statistics[i].StatisticName == "BP") BPStc = stcR.Statistics[i];
            }
        }
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        var TitleR = server.GetTitleData( { "Keys" : [ "TierTable", "General" ] } );
        var tierT = JSON.parse( TitleR.Data["TierTable"] );
        var generalT = JSON.parse( TitleR.Data["General"] );
        
        if(tier < parseInt(tierT.TierLimit)) throw "lack of Tier";
        if(rebirth >= parseInt(tierT.RebirthLimit)) throw "rebirth MAX";
        rebirth ++;
        // reset
        tier = 1;
        tierStc.Value = rebirth * 100 + tier;
        ResetInv("GO");
        server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: generalT.RebirthReward.Gem, VirtualCurrency: "GE" });
        server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: generalT.RebirthReward.SP, VirtualCurrency: "SP" });
        trophyStc.Value += tierT.RebirthTrophy;
        BPStc.Value = 0;
        r.isRebirth = true;
        server.UpdatePlayerStatistics({ PlayFabId: cId, Statistics: [trophyStc, tierStc, BPStc] });
        return r;
    } catch(e) {
        var retObj = {}; retObj["errorDetails"] = "Error: " + e; return retObj;
    }
}

function ResetInv( vcType ) {
    try {
        var cId = currentPlayerId;
        var inv = server.GetUserInventory({PlayFabId: cId});
        var amnt = 0;
        if(inv.VirtualCurrency.hasOwnProperty(vcType)) {
            amnt = inv.VirtualCurrency[vcType];    
        }else {
            throw "have not key ";   
        }
        
        if(amnt > 0)
            server.SubtractUserVirtualCurrency({ PlayFabId: cId, Amount: amnt, VirtualCurrency: vcType });
        
        var totalItem = [];
        var items = [];
        for(var i in inv.Inventory) {
            if(inv.Inventory[i].ItemClass != IC_CHEST_BATTLE ) {
                totalItem.push( { ItemInstanceId : inv.Inventory[i].ItemInstanceId, PlayFabId : cId  } );
            }
        }
        while(totalItem.length > 0) {
            items.push(totalItem.splice(0, 25));
        }
        for(var i in items) {
            server.RevokeInventoryItems({ Items : items[i] });
        }
        
        return 0;
        
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function GetItemData(ids) {
    var r = [];
    var inv = server.GetUserInventory({ PlayFabId: currentPlayerId });
    
    for(var i in inv.Inventory)
    {
        for(var j in ids) {
            if(inv.Inventory[i].ItemInstanceId === ids[j])
            {
                r.push( inv.Inventory[i] );
            }
        }
    }
    return r;
}

function GetItemCatalogData(id) {
    var itemR;
    var ctgR = server.GetCatalogItems( { PlayFabId: currentPlayerId } );
    
    for(var i in ctgR.Catalog)
    {
        if(ctgR.Catalog[i].ItemId === id)
        {
            itemR = ctgR.Catalog[i];
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

function SellItem_internal(soldInstId, vcType) {
    
    var cId = currentPlayerId;
    var TitleR = server.GetTitleData( { Keys : [ "WorthTable" ] } );
    var worthT = JSON.parse( TitleR.Data.WorthTable );
    if(!worthT) throw "WorthTable not found";
    var ids = [];
    ids.push(soldInstId);
    // get item
    var ItemR = GetItemData(ids);
    if(ItemR.length == 0) { throw "item instance not found"; }
    var itemD = ItemR[0];
    if(itemD.CustomData === undefined){
        throw "itemInstance.CustomData is undefined";
    }
    stat = JSON.parse(itemD.CustomData.Stat);
    var worth = CalculItemWorth(itemD.CustomData, worthT);
    
    var price = Math.ceil(worth * worthT.SellGoldX);
    server.AddUserVirtualCurrency({ PlayFabId: cId, Amount: price, VirtualCurrency: vcType });
    server.RevokeInventoryItem({ PlayFabId: cId, ItemInstanceId: soldInstId });
    
    return price;
}

handlers.SellItem = function (args) {
    if (!args || !args.soldItemInstanceId)
        throw "Invalid input parameters";
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
    if(!skill.hasOwnProperty("Lev")) skill.Lev = 0;
    
    var r = (wTable.Grade * grade) + (wTable.Tier * tier) + ( wTable.Stat * (atk + hp + sta) ) + (wTable.SkillLev * skill.Lev) * lev;
    
    return r;
    
}

handlers.ExpUp = function (args) {
    
     if (!args || !args.targetItemInstanceId || !args.rawItemInstanceId)
        throw "Invalid input parameters";
    return ExpUp_internal(args.targetItemInstanceId, args.rawItemInstanceId);  
}

function ExpUp_internal ( targeInstId, rawInstId ) {
    var cId = currentPlayerId;
    var TitleR = server.GetTitleData( { Keys : [ "LevelTable", "WorthTable" ] } );
    var worthT = JSON.parse( TitleR.Data.WorthTable );
    var levT = JSON.parse( TitleR.Data.LevelTable );
    // check item
    var inv = server.GetUserInventory({ PlayFabId: cId });
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
    var levLimit = CalculLevLimit( parseInt( targetItem.CustomData.Tier ), levT );
    targetStat = JSON.parse( targetItem.CustomData.Stat );
    rawStat = JSON.parse( rawItem.CustomData.Stat );
    if(targetStat.Lev >= levLimit) { targetStat.Lev = levLimit;  throw "item level MAX"; }
    
    // 아이템 가치 계산
    var targetWorth = CalculItemWorth(targetItem.CustomData, worthT);
    var rawWorth = CalculItemWorth(rawItem.CustomData, worthT);
    var exp = Math.ceil(rawWorth * worthT.ExpX);
    var levUpCost = Math.ceil( rawWorth * worthT.LevUpCostX );
    if(levUpCost > inv.VirtualCurrency["GO"]) throw "lack of Gold";
    
    // Exp Up
    targetStat.Exp += exp;
    if(targetStat.Exp >= targetWorth) { 
        targetStat.Exp = targetStat.Exp - targetWorth;
        targetStat.Lev += 1;
        if(targetStat.hasOwnProperty("Atk")) targetStat.Atk += Math.ceil( targetStat.Atk * levT.XperLevel );
        if(targetStat.hasOwnProperty("Hp")) targetStat.Hp += Math.ceil( targetStat.Hp * levT.XperLevel );
        if(targetStat.hasOwnProperty("Sta")) targetStat.Sta += Math.ceil( targetStat.Sta * levT.XperLevel );
        
        if(targetStat.Lev >= levLimit) { targetStat.Lev = levLimit; }
    }
    targetItem.CustomData.Stat = JSON.stringify( targetStat );
    
    server.UpdateUserInventoryItemCustomData( {PlayFabId: cId, ItemInstanceId: targeInstId, Data: targetItem.CustomData} );
    
    server.SubtractUserVirtualCurrency({ PlayFabId: cId, Amount: levUpCost, VirtualCurrency: "GO" });
    server.RevokeInventoryItem({ PlayFabId: cId, ItemInstanceId: rawInstId });
    
    return exp;
}

function CalculLevLimit ( tier, levTable ) {
    var cnt = 0;
    cnt = (tier % 5);
    if (cnt == 0) cnt = 5;
    var r = levTable.LimitList[cnt-1];
    return r;
}

handlers.UpdatePartyTabData = function (args) {
    var cId = currentPlayerId;
    if (!args || !args.tab1 || !args.tab2 || !args.tab3 || !args.lastTab)
        throw "Invalid input parameters";
    server.UpdateUserData( {  PlayFabId: cId, Data : args } );
    
    if(!args.hasOwnProperty(args.lastTab)) { throw "args not have key : args.lastTab"; }
    var equipI = JSON.parse( args[args.lastTab] );
    var cD = [];
    var invR = server.GetUserInventory( {PlayFabId: cId} );
    var item = null;
    for(var i in equipI) {
        if(equipI[i] == null) {
            cD.push(null);
        }else {
            item = null;
            for(var j in invR.Inventory)
            {
                if(invR.Inventory[j].ItemInstanceId === equipI[i])
                {
                    item = invR.Inventory[j];
                }
            }
            if(item == null) cD.push(null);
            else cD.push(item.CustomData);
        }
    }
    
    var cInfo = JSON.stringify(cD);
    server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : { "CharacterInfo" : cInfo }, Permission : "Public" } );
    
}

// args.ID : mastery ID
handlers.MasteryUpgrade = function (args) {
    try {
        var cId = currentPlayerId;
        var userD = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: ["Mastery"] } );
        var inv = server.GetUserInventory( { PlayFabId: cId } );
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
        
        var mD = {};
        for(var i in tableD.Mastery) {
            if(tableD.Mastery[i].ID == args.ID) {
                mD = tableD.Mastery[i];
            }
        }
        
        if(value >= mD.Limit) {
            throw "mastery lev full";
        }
        
        var needSP = 0;
        needSP = mD.Cost * (value + 1);
        if( inv.VirtualCurrency.SP < needSP ) {
            throw "SP lack";
        }else {
            // skill up
            value += 1;
            mObj[String(args.ID)] = String(value);
            // cost
            var costR = server.SubtractUserVirtualCurrency( {PlayFabId: cId, VirtualCurrency: "SP", Amount: needSP} ); 
        }
        
        var value = JSON.stringify(mObj);
        
        return server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : { "Mastery" : value }, Permission : "Public" } );
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
};


handlers.FirstCheck = function (args) {
    var cId = currentPlayerId;
    var r = {};
    var d = server.GetUserInternalData( { PlayFabId: cId, Keys: ["isFirstGift", "isTutoComplete"] } );
    if(d.Data.hasOwnProperty("isFirstGift") && isTrue( d.Data["isFirstGift"].Value )) {
        r.isFirstGift = d.Data["isFirstGift"].Value;
    }else {
        // first gift
        server.GrantItemsToUser({ PlayFabId: cId, ItemIds: ["chest_first"] });
        var pull = server.UnlockContainerItem( { PlayFabId: cId, ContainerItemId: "chest_first" } );
        r.items = MakeItemData(pull.GrantedItems);
        server.UpdateUserInternalData( { PlayFabId: cId, Data: {"isFirstGift": "true"} } );
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
        
        server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : rdata, Permission : "Public" } );
    }
    if(d.Data.hasOwnProperty("isTutoComplete") && isTrue( d.Data["isTutoComplete"].Value )) {
        r.isTutoComplete = d.Data["isTutoComplete"].Value;
    }else {
        r.isTutoComplete = false;
    }
    return r;
}

function ResetUpgradeSlot(t) {
    
    var slot = {};
    var r = {};
    for(var i in t.ItemUpgradeSlot) {
        slot.state = t.ItemUpgradeSlot[i].Default;
        r[t.ItemUpgradeSlot[i].ID] = JSON.stringify(slot);
    }
    return r;
    
}

// args.slotID, args.itemIds, state: ING, FAIL, LOCK, NONE, READY
handlers.ItemUpgradeStart = function (args) {
    try {
        var items = [];
        items = GetItemData(args.itemIds);
        if(items.length != args.itemIds.length) { throw "Item instance not found"; }
        var slot = {};
        var slotD = {};
        var TitleR = server.GetTitleData({ "Keys" : "General" });
        var generalD = {};
        generalD = JSON.parse(TitleR.Data["General"]);
        for(var i in generalD.ItemUpgradeSlot) {
            if(generalD.ItemUpgradeSlot[i].ID == args.slotID) {
                slotD = generalD.ItemUpgradeSlot[i];
            }
        }
        var uD = new Date();
        var cT = new Date();
        var wT = slotD.NeedTime;
        uD.setTime(cT.getTime() + (wT * 1000 * 60));
        slot.openTime = uD;
        slot.itemIds = args.itemIds;
        slot.state = "ING";
        
        var upD = {};
        upD[slotD.ID] = JSON.stringify(slot);
        
        return server.UpdateUserReadOnlyData( {  PlayFabId: currentPlayerId, Data : upD, Permission : "Public" } );;
        
    } catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

// args.slotID
handlers.ItemUpgradeFinish = function (args) {
    try {
        var cId = currentPlayerId;
        var r = {};
        r.isUp = false;
        r.isLackTime = false;
        
        var userD = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [args.slotID] } );
        if(!userD.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userD.Data[args.slotID].Value );
        
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
        
        var items = [];
        items = GetItemData(slot.itemIds);
        if(items.length == 0) { throw "Item instance not found"; }
        
        var StcR = server.GetPlayerStatistics({ PlayFabId: cId, StatisticNames: [ "TotalTier" ] });

        var tierStc = {};
        tierStc.StatisticName = "TotalTier";
        tierStc.Value = 1;
        
        if(StcR.Statistics.length > 0) {
            for(var i in StcR.Statistics) {
                if(StcR.Statistics[i].StatisticName == "TotalTier") 
                    tierStc = StcR.Statistics[i];
            }
        }
        
        var totalTier = tierStc.Value;
        var tier = parseInt(totalTier % 100);
        var rebirth = parseInt( totalTier / 100 );
        
        var tD = server.GetTitleData({ Keys : [ "ItemStatTable", "TierTable", "SkillTable", "General" ] });
        
        var itemT = JSON.parse( tD.Data["ItemStatTable"] );
        var tierT = JSON.parse( tD.Data["TierTable"] );
        var skillT = JSON.parse( tD.Data["SkillTable"] );
        var generalT = JSON.parse( tD.Data["General"] );
        // get slot table data
        var slotData = {};
        for(var index in generalT.ItemUpgradeSlot) {
            if(generalT.ItemUpgradeSlot[index].ID == args.slotID) { slotData = generalT.ItemUpgradeSlot[index]; }
        }
        
        var upData = {};
        
        var rndTry = Math.floor(Math.random() * 100) + 1;
        
        if(rndTry > slotData.Rate) { 
            // upgrade failed
            r.items = items;
            slot.state = "FAIL";
            upData[slotData.ID] = JSON.stringify(slot);
            
            server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : upData, Permission : "Public" } );;
            
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
            
            server.UpdateUserInventoryItemCustomData
            ( {PlayFabId: cId, ItemInstanceId: items[index].ItemInstanceId, Data: items[index].CustomData} );
            
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[slotData.ID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : upData, Permission : "Public" } );;
        
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
        var cId = currentPlayerId;
        var r = {};
        r.isLackGem = false;
        r.isSuccess = false;
        
        var userD = server.GetUserReadOnlyData( { PlayFabId: cId, Keys: [args.slotID] } );
        var tD = server.GetTitleData( { Keys : [ "General", "WorthTable" ] } );
        var generalT = JSON.parse( tD.Data["General"] );
        var worthT = JSON.parse( tD.Data.WorthTable );
        
        if(!userD.Data.hasOwnProperty(args.slotID)) { throw "slot not found"; }
        var slot = {};
        slot = JSON.parse( userD.Data[args.slotID].Value );
        //get items
        var items = [];
        items = GetItemData(slot.itemIds);
        if(items.length == 0) { throw "Item instance not found"; }
        
        var itemIds = [];
        for(var i in slot.itemIds) {
            itemIds.push( { ItemInstanceId : slot.itemIds[i], PlayFabId : cId  } );
        }
        
        var inv = server.GetUserInventory({PlayFabId : cId});
        var needGem = 0;
        for(var index in items) {
            needGem += Math.ceil(CalculItemWorth( items[index].CustomData, worthT ) / generalT.WorthPerGem);
        }
        
        var upData = {};
        
        if(args.isRestore) {
            
            if(inv.VirtualCurrency["GE"] < needGem) { 
                r.isLackGem = true;
                return r;
            }
            
            r.isSuccess = true;
            server.SubtractUserVirtualCurrency({ PlayFabId: cId, Amount: needGem, VirtualCurrency: "GE" });
            
        }else {
            server.RevokeInventoryItems({ Items : itemIds }); 
        }
        
        slot.state = "NONE";
        slot.itemIds = null;
        slot.openTime = null;
        
        upData[args.slotID] = JSON.stringify(slot);
        
        server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : upData, Permission : "Public" } );;
        
        return r;
        
    }catch(e) {
        var retObj = {};
        retObj["errorDetails"] = "Error: " + e;
        return retObj;
    }
}

function GetRandomSkill( itemClass, SkillInfos, EquipListData, EquipArray ) {
    
    var skill = {};
    var sIdL = [];
    for(var i in SkillInfos) {
        if(SkillInfos[i].ItemClass == itemClass) {
            sIdL.push( SkillInfos[i].Skill );
        }
    }
    var rndSId = sIdL[parseInt( Math.random() * sIdL.length )];
    for(var i in SkillInfos) {
        if(SkillInfos[i].Skill == rndSId) {
            skill = CopyObj( SkillInfos[i] );
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
