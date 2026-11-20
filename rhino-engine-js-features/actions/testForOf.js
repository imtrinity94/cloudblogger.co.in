/**
 * testForOf
 * Rhino engine test: for...of loops over arrays and strings.
 * Return type: void
 */
for (var fruit of ["apple", "banana"]) {
    System.log(fruit); // apple, banana
}

for (var ch of "Hello") {
    System.log(ch); // H, e, l, l, o
}

// NOT supported: const in for...of
// for (const item of [1, 2]) { }  // SyntaxError - use let or var
// Note: let in for...of shares one binding too (closures see the last value)
