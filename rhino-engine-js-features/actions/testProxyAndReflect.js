/**
 * testProxyAndReflect
 * Rhino engine test: Proxy traps and the Reflect API.
 * Return type: void
 */
var target = { name: "Alice", age: 30 };
var proxy = new Proxy(target, {
    get: function (obj, prop) {
        System.log("get " + String(prop));
        return prop in obj ? obj[prop] : "Property not found";
    },
    set: function (obj, prop, value) {
        System.log("set " + prop + " = " + value);
        obj[prop] = value;
        return true;
    }
});
System.log(proxy.name);  // get name -> Alice
System.log(proxy.city);  // get city -> Property not found
proxy.age = 31;          // set age = 31
System.log(target.age);  // 31

System.log(Reflect.has(target, "name"));            // true
System.log(Reflect.get(target, "age"));             // 31
Reflect.set(target, "city", "NYC");
System.log(JSON.stringify(Reflect.ownKeys(target))); // ["name","age","city"]

// Practical use: validate input objects
var vmSpec = new Proxy({}, {
    set: function (o, k, v) {
        if (typeof v !== "number") { throw new TypeError(k + " must be a number"); }
        o[k] = v;
        return true;
    }
});
try { vmSpec.cpu = "two"; } catch (e) { System.log(e.message); } // cpu must be a number
