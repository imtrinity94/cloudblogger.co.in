/**
 * testTemplateLiterals
 * Rhino engine test: template literals, tagged templates and String.raw.
 * Return type: void
 */
var name = "World";
System.log(`Hello, ${name}!`); // Hello, World!

var a = 10, b = 20;
System.log(`The sum of ${a} and ${b} is ${a + b}`); // The sum of 10 and 20 is 30

// Multi-line strings
var multiLine = `line 1
line 2`;
System.log(multiLine.split("\n").length); // 2

// Tagged templates
function tag(strings, v1) { return strings[0] + "[" + v1 + "]" + strings[1]; }
System.log(tag`value ${42} here`); // value [42] here

// String.raw keeps backslashes as-is
System.log(String.raw`C:\Users\Admin\Documents`); // C:\Users\Admin\Documents
System.log(String.raw`Line 1\nLine 2`);           // Line 1\nLine 2
