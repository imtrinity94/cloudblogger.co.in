/**
 * testBuiltinsEs2017To2019
 * Rhino engine test: ES2017-ES2019 built-ins (fromEntries, property descriptors, padding, trimming, flat and flatMap).
 * Return type: void
 */
System.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));  // {"a":1,"b":2}
System.log(JSON.stringify(Object.fromEntries(new Map([["x", 9]]))));   // {"x":9}

var source = { get foo() { return "bar"; } };
var clone = Object.create(Object.getPrototypeOf(source), Object.getOwnPropertyDescriptors(source));
System.log(clone.foo); // bar (getter copied, not its value)

System.log("42".padStart(5, "0") + " " + "42".padEnd(5, "-"));        // 00042 42---
System.log("[" + "  hello  ".trimStart() + "][" + "  hello  ".trimEnd() + "]"); // [hello  ][  hello]

var nested = [1, 2, [3, 4, [5, 6]]];
System.log(JSON.stringify(nested.flat()));         // [1,2,3,4,[5,6]]
System.log(JSON.stringify(nested.flat(Infinity))); // [1,2,3,4,5,6]
System.log(JSON.stringify(["Hello World", "Foo Bar"].flatMap(s => s.split(" ")))); // ["Hello","World","Foo","Bar"]
