/**
 * testOptionalCatchBinding
 * Rhino engine test: optional catch binding and numeric separators.
 * Return type: void
 */
try {
    throw new Error("Something went wrong");
} catch {
    System.log("An error occurred"); // no (e) needed
}

var big = 1_000_000;
System.log(big); // 1000000
