/**
 * testClasses
 * Rhino engine test: class syntax is not available, so constructor functions and prototypes are used instead.
 * Return type: void
 */
// Fails on 9.1.1:
// class Parent { say() { return "Hello"; } }

// Works:
function Parent(name) { this.name = name; }
Parent.prototype.say = function () { return "Hello " + this.name; };
System.log(new Parent("vRO").say()); // Hello vRO
