/**
 * testJsonAndNumber
 * Rhino engine test: JSON superset and the Number and Math additions.
 * Return type: void
 */
// U+2028 / U+2029 are now allowed inside string literals
System.log(JSON.parse('" "').length); // 1

System.log(Number.EPSILON);           // 2.220446049250313e-16
System.log(0.1 + 0.2 === 0.3);        // false
System.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // true

System.log(Number.isInteger(5));               // true
System.log(Number.isSafeInteger(2 ** 53));     // false
System.log(Number.MAX_SAFE_INTEGER);           // 9007199254740991
System.log(Math.trunc(4.7) + " " + Math.sign(-3)); // 4 -1
