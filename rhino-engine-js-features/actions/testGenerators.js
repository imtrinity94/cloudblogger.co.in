/**
 * testGenerators
 * Rhino engine test: ES6 generator functions, yield and yield*.
 * Return type: void
 */
function* fibonacci() {
    var a = 0, b = 1;
    while (true) {
        yield a;
        var t = a; a = b; b = t + b;
    }
}
var fib = fibonacci();
var first = [];
for (var i = 0; i < 6; i++) { first.push(fib.next().value); }
System.log(first.join(",")); // 0,1,1,2,3,5

function* range(n) { for (var i = 0; i < n; i++) { yield i; } }
for (var v of range(4)) { System.log(v); }   // 0, 1, 2, 3
System.log(JSON.stringify([...range(3)]));   // [0,1,2]

function* inner() { yield 1; yield 2; }
function* outer() { yield 0; yield* inner(); }
System.log(JSON.stringify([...outer()]));    // [0,1,2]
