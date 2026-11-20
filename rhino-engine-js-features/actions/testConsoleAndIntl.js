/**
 * testConsoleAndIntl
 * Rhino engine test: console and Intl are not available; locale formatting behaviour.
 * Return type: void
 */
System.log(typeof console); // undefined - use System.log / System.warn / System.error
System.log(typeof Intl);    // undefined

// Careful with locale formatting:
// (1234567.891).toLocaleString("en-US");  // RangeError: illegal radix 0
System.log((1234567.891).toLocaleString());  // 1234567.891 (no grouping)
System.log((1234567.891).toFixed(2));        // 1234567.89
System.log(new Date(Date.UTC(2025, 9, 15)).toLocaleDateString("en-US")); // 10/15/25
System.log(new Date(Date.UTC(2025, 9, 15)).toISOString()); // 2025-10-15T00:00:00.000Z
