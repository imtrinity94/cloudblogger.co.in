/**
 * testSpread
 * Rhino engine test: spread in array and object literals, and apply() for function calls.
 * Return type: void
 */
var arr1 = [1, 2, 3];
var arr2 = [4, 5, 6];
System.log(JSON.stringify([...arr1, ...arr2]));        // [1,2,3,4,5,6]

var original = [1, 2, 3];
var copy = [...original];
copy.push(4);
System.log(JSON.stringify(original) + " " + JSON.stringify(copy)); // [1,2,3] [1,2,3,4]

System.log(JSON.stringify([..."abc"]));                // ["a","b","c"]
System.log(JSON.stringify([...new Set([1, 1, 2, 3])])); // [1,2,3]  (de-duplicate)

// Object spread works
var o = { ...{ a: 1 }, b: 2 };
System.log(o.a + " " + o.b); // 1 2

// NOT supported: spread in a function call
// Math.max(...arr1);  // SyntaxError
System.log(Math.max.apply(null, arr1)); // 3 - use apply instead
