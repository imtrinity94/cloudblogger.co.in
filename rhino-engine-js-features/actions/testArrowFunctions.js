/**
 * testArrowFunctions
 * Rhino engine test: arrow functions. Logs each result so you can compare it with the expected value in the comment.
 * Return type: void
 */
var add = (a, b) => a + b;
System.log(add(5, 3)); // 8

var numbers = [1, 2, 3, 4, 5];
System.log(numbers.map(n => n * 2));          // 2,4,6,8,10
System.log(numbers.filter(n => n % 2 === 0)); // 2,4

var greet = name => {
    var message = "Hello, " + name;
    return message;
};
System.log(greet("World")); // Hello, World

// Lexical "this" works as expected
var counter = {
    count: 0,
    start: function () {
        [1, 2, 3].forEach(() => { this.count++; });
        return this.count;
    }
};
System.log(counter.start()); // 3

// NOT supported: rest parameter in an arrow function
// var count = (...args) => args.length; // SyntaxError
