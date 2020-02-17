handlers.FindAnother = function (args, context) {
    try {
        if(args.cost < 1) throw "cost error";
        var cId = currentPlayerId;
        var inv = server.GetUserInventory({PlayFabId:cId});
        if(inv.VirtualCurrency.GO < args.cost) throw "lack gold";
        return server.SubtractUserVirtualCurrency({ PlayFabId: cId, Amount: args.cost, VirtualCurrency: "GO" });
    }catch(e) { var r = {}; r["errorDetails"] = "Error: " + e; return r; }
}
