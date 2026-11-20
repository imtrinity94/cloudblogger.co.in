/**
 * testSuperAndObjectLiterals
 * Rhino engine test: super in object-literal methods, Symbol.species and object literal shorthand.
 * Return type: void
 */
var parent = { say: function () { return "Hello"; } };
var kid = { say() { return super.say() + " World"; } };
Object.setPrototypeOf(kid, parent);
System.log(kid.say()); // Hello World

System.log(typeof Symbol.species);           // symbol
System.log(Array[Symbol.species] === Array); // true

// Shorthand properties, computed keys, method shorthand, getters
var host = "vra";
var o = {
    host,
    ["key_" + host]: 1,
    greet() { return "hi " + this.host; },
    get upper() { return this.host.toUpperCase(); }
};
System.log(o.host + " " + o.key_vra + " " + o.greet() + " " + o.upper); // vra 1 hi vra VRA
