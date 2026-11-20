/**
 * getRhinoVersion
 * Logs the Rhino engine version and language version of this Orchestrator. Needs the system property com.vmware.scripting.javascript.allow-native-object set to true.
 * Return type: void
 */
// Needs com.vmware.scripting.javascript.allow-native-object = true
var context = org.mozilla.javascript.Context.enter();
try {
    System.log("Rhino version: " + context.getImplementationVersion());     // Rhino 1.9.1
    System.log("Language version: " + String(context.getLanguageVersion())); // 200
} finally {
    org.mozilla.javascript.Context.exit();
}
