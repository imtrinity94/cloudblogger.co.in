/**
 * testBuiltinsEs2021To2023
 * Rhino engine test: ES2021-ES2023 built-ins (at, replaceAll, Object.hasOwn, find, findLast, Array.of and Array.from).
 * Return type: void
 */
System.log([10, 20, 30].at(-1) + " " + "abc".at(-1)); // 30 c
System.log("a,b,c".replaceAll(",", "|"));             // a|b|c

System.log(Object.hasOwn({ a: 1 }, "a") + " " + Object.hasOwn({}, "toString")); // true false
var nullProto = Object.create(null);
nullProto.prop = "value";
System.log(Object.hasOwn(nullProto, "prop"));  // true (hasOwnProperty would fail here)

System.log([5, 12, 8].find(x => x > 10) + " " + [5, 12, 8].findIndex(x => x > 10)); // 12 1
System.log([1, 2, 3].findLast(x => x < 3));    // 2
System.log(JSON.stringify(Array.of(7, 8)) + " " + JSON.stringify(Array.from("hi"))); // [7,8] ["h","i"]
