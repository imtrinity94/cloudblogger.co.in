/**
 * testDestructuring
 * Rhino engine test: object, nested, array and parameter destructuring.
 * Return type: void
 */
var person = { name: "John", age: 30, city: "NYC" };
var { name, age } = person;
System.log(name + " " + age);   // John 30

var { country = "USA" } = person;  // default value
System.log(country);               // USA

var { name: fullName } = person;   // renaming
System.log(fullName);              // John

var user = { id: 1, details: { name: "Alice", email: "alice@example.com" } };
var { details: { name: userName, email } } = user;  // nested
System.log(userName + " " + email); // Alice alice@example.com

var [first, , third = 9, fourth = 4] = [1, 2, 3];   // arrays, holes, defaults
System.log(first + " " + third + " " + fourth);     // 1 3 4

var x = 1, y = 2;
[x, y] = [y, x];                   // swap
System.log(x + " " + y);           // 2 1

function show({ host, port = 443 }) { return host + ":" + port; }  // parameters
System.log(show({ host: "vcfa.example.com" })); // vcfa.example.com:443

// NOT supported: object rest
// var { a, ...rest } = { a: 1, b: 2 };
// SyntaxError: object rest properties in destructuring are not supported
