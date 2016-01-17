// A simple wrapper for the document.cookie API.

var cookies = new function () {
    this.set = function (name, value) {
        if (typeof value != "undefined") document.cookie = encodeURIComponent(name)
            + "=" + encodeURIComponent(JSON.stringify(value))
            + ";expires=" + (new Date((new Date).valueOf() + 4e13)).toUTCString();
        else document.cookie = encodeURIComponent(name) + "=;expires=" + (new Date).toUTCString();
    };
    this.get = function (name, fallback) {
        name = encodeURIComponent(name);
        return utility.scan(document.cookie.split(";"), function (pair) {
            pair = pair.split("=");
            if (pair[0].replace(/^\s+|\s+$/g, "") == name) {
                try { return JSON.parse(decodeURIComponent(pair[1])); }
                catch (e) { return; }
            }
        }, function () { return fallback; });
    };
};

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
