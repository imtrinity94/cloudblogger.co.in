/**
 * Action: in.co.cloudblogger.multinic/getNetworksByEnvironment
 * Inputs : environment (string) - Lab | Production | Staging (case-insensitive)
 * Returns: Array/string
 *
 * Feeds the NIC network dropdowns of the request form.
 * Each value must match a capability tag net:<value in lower case> on a VCF Automation network.
 * Returns an empty list while the form is loading, and a single message entry when an
 * environment has no networks yet (the cloud template ignores that entry).
 * cloudblogger.co.in
 */
var logPrefix = "[getNetworksByEnvironment] ";
var NO_NETWORKS_MSG = "No networks available for this environment yet";

// Edit this list for your environments. Values become net:<lower case value> tags.
var networkCatalog = {
    "LAB": [
        "lab-vm-mgmt"
    ],
    "PRODUCTION": [],
    "STAGING": []
};

var result = [];
if (!environment) {
    return result;
}

var envKey = String(environment).replace(/^\s+|\s+$/g, "").toUpperCase();
var names = networkCatalog[envKey];

if (!names || names.length === 0) {
    System.log(logPrefix + "No networks defined for " + envKey);
    result.push(NO_NETWORKS_MSG);
    return result;
}

for (var i = 0; i < names.length; i++) {
    result.push(names[i]);
}
System.log(logPrefix + "Returning " + result.length + " networks for " + envKey);
return result;
