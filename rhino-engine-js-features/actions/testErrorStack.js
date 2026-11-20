/**
 * testErrorStack
 * Rhino engine test: Error.stack frames.
 * Return type: void
 */
function level3() { throw new Error("Something went wrong"); }
function level2() { level3(); }
function level1() { level2(); }
try {
    level1();
} catch (e) {
    System.log(e.message); // Something went wrong
    System.log(e.stack);   // one frame per line: module/action:line (function)
}
