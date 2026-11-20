/**
 * testLetAndConst
 * Rhino engine test: let and const block scoping, including the const reassignment and loop binding behaviours.
 * Return type: void
 */
const PI = 3.14159;
System.log(PI); // 3.14159

function testScope() {
    let x = 10;
    if (true) {
        let x = 20;
        System.log(x); // 20
    }
    System.log(x);     // 10
    for (let i = 0; i < 3; i++) { }
    System.log(typeof i); // undefined (i stays inside the loop)
}
testScope();

const config = { debug: true };
config.debug = false;      // OK - the object itself is mutable
config.timeout = 5000;
System.log(JSON.stringify(config)); // {"debug":false,"timeout":5000}

// Gotcha 1: reassigning a const is silently ignored (no error)
const K = 1;
K = 2;
System.log(K); // 1

// Gotcha 2: no new binding per loop iteration
var fns = [];
for (let j = 0; j < 3; j++) { fns.push(function () { return j; }); }
System.log(fns.map(function (f) { return f(); }).join(",")); // 3,3,3 (not 0,1,2)

// Fix: declare a let inside the loop body (or use forEach)
var fixed = [];
for (let j = 0; j < 3; j++) { let k = j; fixed.push(function () { return k; }); }
System.log(fixed.map(function (f) { return f(); }).join(",")); // 0,1,2
