/**
 * testBigInt
 * Rhino engine test: BigInt literals and arithmetic.
 * Return type: void
 */
var bigNum = 9007199254740991n;
var anotherBig = BigInt("9007199254740992");

System.log(bigNum + 1n);       // 9007199254740992
System.log(anotherBig * 2n);   // 18014398509481984
System.log(typeof bigNum);     // bigint
System.log(2n ** 64n);         // 18446744073709551616

// Mixing BigInt and Number throws
// var bad = 10n + 5;  // TypeError: Cannot convert BigInt to a number
var good = 10n + BigInt(5);
System.log(good);              // 15

// Store BigInts as strings in Properties, attributes and outputs
var props = new Properties();
props.put("big", (2n ** 64n).toString());
