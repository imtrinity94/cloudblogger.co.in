/**
 * testPromises
 * Rhino engine test: the Promise executor runs immediately, while then() callbacks run only after the script returns.
 * Return type: void
 */
var results = [];
new Promise(function (resolve) {
    System.log("executor runs immediately"); // logged
    resolve(1);
});
Promise.resolve("value").then(function (v) { results.push(v); });
System.log(results.length); // 0 - the callback hasn't run yet

// What this means in practice:
// - Don't use Promises to compute values you need later in the same script.
// - Orchestrator APIs are synchronous anyway; keep the code synchronous.
