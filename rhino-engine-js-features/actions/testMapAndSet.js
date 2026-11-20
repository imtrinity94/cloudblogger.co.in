/**
 * testMapAndSet
 * Rhino engine test: Map, Set and WeakMap with for...of.
 * Return type: void
 */
var map = new Map();
map.set("a", 1);
map.set("b", 2);
for (var [key, value] of map) {
    System.log(key + " = " + value); // a = 1, b = 2
}
System.log(map.size + " " + map.has("a"));       // 2 true
System.log(Array.from(map.keys()).join(","));    // a,b

var set = new Set([1, 2, 2, 3]);
for (var num of set) {
    System.log(num); // 1, 2, 3
}

var wm = new WeakMap();
var k = {};
wm.set(k, "v");
System.log(wm.get(k)); // v
