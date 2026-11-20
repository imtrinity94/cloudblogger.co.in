/**
 * testRestParameters
 * Rhino engine test: rest parameters in regular functions.
 * Return type: void
 */
function sum(...numbers) {
    return numbers.reduce(function (acc, num) { return acc + num; }, 0);
}
System.log(sum(1, 2, 3, 4, 5)); // 15

function greetAll(greeting, ...names) {
    return names.map(name => greeting + ", " + name).join(" | ");
}
System.log(greetAll("Hello", "Alice", "Bob")); // Hello, Alice | Hello, Bob

System.log(Array.isArray((function (...r) { return r; })(1))); // true (a real array)

// NOT supported in arrow functions:
// var count = (...args) => args.length; // SyntaxError
