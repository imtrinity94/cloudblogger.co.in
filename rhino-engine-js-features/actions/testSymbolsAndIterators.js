/**
 * testSymbolsAndIterators
 * Rhino engine test: Symbols, Symbol.iterator and custom iterables.
 * Return type: void
 */
var sym1 = Symbol("description");
var sym2 = Symbol("description");
System.log(sym1 === sym2);   // false - every symbol is unique
System.log(sym1.toString()); // Symbol(description)

var obj = { visible: 1 };
var privateKey = Symbol("private");
obj[privateKey] = "secret value";
System.log(obj[privateKey]);                // secret value
System.log(JSON.stringify(Object.keys(obj))); // ["visible"] - symbols are hidden
System.log(JSON.stringify(obj));              // {"visible":1}
System.log(Symbol.for("app") === Symbol.for("app")); // true

var it = [1, 2, 3][Symbol.iterator]();
System.log(JSON.stringify(it.next())); // {"value":1,"done":false}

// Make your own iterable
var range = { from: 1, to: 3 };
range[Symbol.iterator] = function () {
    var c = this.from, t = this.to;
    return { next: function () { return c <= t ? { value: c++, done: false } : { value: undefined, done: true }; } };
};
for (var x of range) { System.log(x); } // 1, 2, 3
