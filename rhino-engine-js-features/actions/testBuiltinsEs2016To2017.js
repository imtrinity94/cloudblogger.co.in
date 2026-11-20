/**
 * testBuiltinsEs2016To2017
 * Rhino engine test: ES2016-ES2017 built-ins (exponentiation, includes, string helpers, Object.values and entries).
 * Return type: void
 */
System.log(2 ** 3);          // 8
var n = 2; n **= 3;
System.log(n);               // 8
System.log(10 ** -1);        // 0.1

System.log([1, 2, 3].includes(2));                    // true
System.log([NaN].includes(NaN) + " " + [NaN].indexOf(NaN)); // true -1
System.log("abc".startsWith("a") + " " + "abc".endsWith("c") + " " + "ab".repeat(2)); // true true abab

var person = { name: "Alice", age: 30, city: "NYC" };
System.log(JSON.stringify(Object.values(person)));   // ["Alice",30,"NYC"]
System.log(JSON.stringify(Object.entries(person)));  // [["name","Alice"],["age",30],["city","NYC"]]
for (var [key, value] of Object.entries(person)) {
    System.log(key + ": " + value);                  // name: Alice ...
}
