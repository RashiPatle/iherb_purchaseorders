// webapp/formatter/formatter.js
sap.ui.define([], function () {
    "use strict";
    return {
        mapTimezone: function (tzCode) {
            const map = {
                "CST": "America/Chicago",
                "PST": "America/Los_Angeles",
                "MST": "America/Denver"
            };
            return map[tzCode] || "UTC";
        }
    };
});
