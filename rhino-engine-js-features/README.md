# Rhino engine JavaScript feature tests for VCF Operations Orchestrator

Thirty small actions that show which modern JavaScript features the Rhino engine in Orchestrator (vRO) supports. Import the package, run an action from the action editor and read the log: every `System.log` line has the expected 9.1.1 result in a comment next to it.

Companion to the cloudblogger.co.in post [Orchestrator Rhino Engine 8.x vs 9.x - Comprehensive guide to Modern JavaScript in vRO](https://cloudblogger.co.in/2025/11/23/orchestrator-rhino-engine-8-x-vs-9-x-comprehensive-guide-to-modern-javascript-in-vro/).

## What's inside

Package: `com.cloudblogger.rhino_v1.0.0_20261120.package`
Action module: `com.cloudblogger.rhino`

| Action | What it covers |
| --- | --- |
| `getRhinoVersion` | Rhino engine version and language version of your Orchestrator |
| `testArrowFunctions` | Arrow functions and lexical `this` |
| `testClasses` | `class` is not available; constructor functions instead |
| `testTemplateLiterals` | Template literals, tagged templates, `String.raw` |
| `testBigInt` | BigInt literals and arithmetic |
| `testDestructuring` | Object, nested, array and parameter destructuring |
| `testDefaultParameters` | Default function parameters |
| `testRestParameters` | Rest parameters in regular functions |
| `testSpread` | Spread in array and object literals, `apply()` for calls |
| `testLetAndConst` | Block scoping, const reassignment and loop binding behaviour |
| `testForOf` | `for...of` over arrays and strings |
| `testMapAndSet` | `Map`, `Set`, `WeakMap` |
| `testPromises` | Promise executor and when `then()` callbacks run |
| `testGenerators` | `function*`, `yield`, `yield*` |
| `testSymbolsAndIterators` | Symbols, `Symbol.iterator`, custom iterables |
| `testProxyAndReflect` | Proxy traps and the Reflect API |
| `testSuperAndObjectLiterals` | `super` in object methods, `Symbol.species`, literal shorthand |
| `testBuiltinsEs2016To2017` | `**`, `includes`, string helpers, `Object.values` / `entries` |
| `testBuiltinsEs2017To2019` | `fromEntries`, property descriptors, padding, trimming, `flat` / `flatMap` |
| `testBuiltinsEs2021To2023` | `at`, `replaceAll`, `Object.hasOwn`, `find`, `findLast`, `Array.of` / `from` |
| `testOptionalCatchBinding` | Optional catch binding, numeric separators |
| `testOptionalChaining` | `?.`, `??`, `||=`, `&&=`, `??=` |
| `testRegularExpressions` | `y` and `u` flags, named groups, dotAll, lookbehind, `matchAll` |
| `testJsonAndNumber` | JSON superset, `Number` and `Math` additions |
| `testLegacyJs17` | Array comprehensions, expression closures, E4X |
| `testStrictMode` | Strict mode behaviour |
| `testGlobalThis` | `globalThis` |
| `testErrorStack` | `Error.stack` frames |
| `testConsoleAndIntl` | `console` and `Intl` are missing; locale formatting |
| `testJavaInterop` | How Java collections are converted to JavaScript types |

The `actions/` folder has the same scripts as plain `.js` files, so you can read them without importing anything.

## How to use

1. Import the package in Orchestrator (Assets > Packages > Import).
2. Open an action in the `com.cloudblogger.rhino` module, go to the Script tab and click Run.
3. Compare the log lines with the comments in the script.

If your Orchestrator runs an older Rhino, an action that uses unsupported syntax fails to compile, and the error tells you which feature is missing. Nothing is changed on the server: the actions only write to the log.

`getRhinoVersion` needs the system property `com.vmware.scripting.javascript.allow-native-object` set to `true`. That property opens native Java access to every script, so use it in a lab and switch it off afterwards.

## Tested on

VCF Operations Orchestrator 9.1.1 (build 25643527), embedded in VCF Automation. Rhino 1.9.1, language version 200.

## Notes

- These actions use ES6+ syntax on purpose. Keep production code in plain ES5.1 if it must also run on Orchestrator 8.x.
- Disclaimer: provided as is, without warranty. Test in a lab before using in production.
