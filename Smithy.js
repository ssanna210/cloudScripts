handlers.ItemUpgradeStart = function (args) { // args.slotID, args.itemIds, state: ING, FAIL, LOCK, NONE, READY
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
        var r = {}; r["errorDetails"] = "Error: " + e; return r;
    }
}
handlers.ItemUpgradeFinish = function (args) { // args.slotID
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
        if(rndTry > slotData.Rate) { // upgrade failed
            r.items = items;
            slot.state = "FAIL";
            upData[slotData.ID] = JSON.stringify(slot);
            server.UpdateUserReadOnlyData( {  PlayFabId: cId, Data : upData, Permission : "Public" } );;
            return r; 
        } 
        for(var index in items) { // upgrade success
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
handlers.FailedItemRestore = function (args) { // args.isRestore, args.slotID
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
        var r = {}; r["errorDetails"] = "Error: " + e; return r;
    }
}
