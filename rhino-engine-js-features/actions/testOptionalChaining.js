/**
 * testOptionalChaining
 * Rhino engine test: optional chaining, nullish coalescing and logical assignment.
 * Return type: void
 */
var vm = { spec: { cpu: 2 }, greet() { return "Hello!"; } };
System.log(vm.spec?.cpu);       // 2
System.log(vm.disk?.size);      // undefined (no TypeError)
System.log(vm.spec?.["cpu"]);   // 2
System.log(vm.greet?.());       // Hello!
System.log(vm.sayBye?.());      // undefined
var list = null;
System.log(list?.[0]);          // undefined

var val = null;
System.log(val ?? "default");   // default
System.log(0 ?? 42);            // 0  (?? only replaces null/undefined)
System.log(0 || 42);            // 42 (|| replaces any falsy value)

var a = null; a ||= 5;
var b = 1;    b &&= 2;
var c;        c ??= "set";
System.log(a + " " + b + " " + c); // 5 2 set
