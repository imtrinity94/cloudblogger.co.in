/**
 * testJavaInterop
 * Rhino engine test: how Java collections are converted to JavaScript types.
 * Return type: void
 */
var map = new java.util.HashMap();
map.put("key1", "value1");
map.put("key2", "value2");
System.log(map.key1);        // value1 (property access works)
System.log(map["key2"]);     // value2
System.log(map.get("key1")); // value1
// map.size();               // TypeError: Cannot find function size.

var list = new java.util.ArrayList();
System.log(Array.isArray(list)); // true - it's a JavaScript array now
// list.add("apple");            // TypeError: Cannot find function add.
list.push("banana");
System.log(list.length);         // 1
delete list[0];                  // leaves a hole, doesn't remove the item
System.log(JSON.stringify(list)); // [null]
