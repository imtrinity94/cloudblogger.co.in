/**
 * testGlobalThis
 * Rhino engine test: globalThis.
 * Return type: void
 */
System.log(typeof globalThis); // object
globalThis.myGlobalVar = "Hello from global";
System.log(myGlobalVar);       // Hello from global
