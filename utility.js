var utility = new function () {
    this.last = function (list) {
        return list[list.length - 1];
    };
    this.scan = function (list, func, fail) {
        for (var n = 0; n < list.length; n++) {
            var result = func(list[n]);
            if (typeof result != "undefined") return result;
        } if (arguments.length > 2) return fail(list);
    };
};
