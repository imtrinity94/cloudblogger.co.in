/**
 * testLegacyJs17
 * Rhino engine test: legacy Rhino extensions (array comprehensions, expression closures and E4X).
 * Return type: void
 */
var squares = [x * x for each (x in [1, 2, 3])];   // array comprehension
System.log(squares.join(","));                      // 1,4,9

var double = function (x) x * 2;                    // expression closure
System.log(double(4));                              // 8

var xml = <vm><name>web01</name><cpu>2</cpu></vm>;  // E4X
System.log(xml.name + " cpu " + xml.cpu);           // web01 cpu 2
