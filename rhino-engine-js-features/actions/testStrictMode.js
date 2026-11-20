/**
 * testStrictMode
 * Rhino engine test: strict mode behaviour, including the value of this in a plain function call.
 * Return type: void
 */
(function () {
    "use strict";
    try { undeclaredVar = 1; } catch (e) { System.log(e.name); } // ReferenceError

    var frozen = Object.freeze({ a: 1 });
    try { frozen.a = 2; } catch (e) { System.log(e.name); }      // TypeError
})();

// But: "this" in a plain function call is NOT undefined
var self = (function () { "use strict"; return String(this); })();
System.log(self); // [object Main] - still the global scope
