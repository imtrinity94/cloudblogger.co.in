/**
 * testDefaultParameters
 * Rhino engine test: default function parameters.
 * Return type: void
 */
function greet(name = "Guest", greeting = "Hello") {
    return greeting + ", " + name + "!";
}
System.log(greet());              // Hello, Guest!
System.log(greet("Alice"));       // Hello, Alice!
System.log(greet("Bob", "Hi"));   // Hi, Bob!
System.log(greet(undefined, "Hey")); // Hey, Guest!   (undefined uses the default)
System.log(greet(null));          // Hello, null!   (null does not)

function createArray(length = 10, fill = 0) { return Array(length).fill(fill); }
System.log(JSON.stringify(createArray(5, 1))); // [1,1,1,1,1]
System.log(JSON.stringify(createArray(3)));    // [0,0,0]

function total(a, b = a * 2) { return a + b; }  // defaults can use earlier params
System.log(total(3)); // 9
