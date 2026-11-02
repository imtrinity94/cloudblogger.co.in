/**
 * Action: in.co.cloudblogger.multinic/calculateCidrNotation
 * Inputs : ipAddress (string), subnetMask (string)
 * Returns: string, e.g. ("172.10.20.145", "255.255.255.0") -> "172.10.20.0/24"
 * cloudblogger.co.in
 */
var logPrefix = "[calculateCidrNotation] ";

if (!ipAddress || !subnetMask) {
    throw logPrefix + "ipAddress and subnetMask are required";
}

var ipParts = String(ipAddress).split(".");
var maskParts = String(subnetMask).split(".");
if (ipParts.length !== 4 || maskParts.length !== 4) {
    throw logPrefix + "Invalid IP '" + ipAddress + "' or mask '" + subnetMask + "'";
}

var prefixLength = 0;
var networkParts = [];
for (var i = 0; i < 4; i++) {
    var ipOctet = parseInt(ipParts[i], 10);
    var maskOctet = parseInt(maskParts[i], 10);
    if (isNaN(ipOctet) || isNaN(maskOctet) || ipOctet < 0 || ipOctet > 255 || maskOctet < 0 || maskOctet > 255) {
        throw logPrefix + "Invalid IP '" + ipAddress + "' or mask '" + subnetMask + "'";
    }
    networkParts.push(ipOctet & maskOctet);
    var bits = maskOctet.toString(2);
    for (var b = 0; b < bits.length; b++) {
        if (bits.charAt(b) === "1") { prefixLength++; }
    }
}

return networkParts.join(".") + "/" + prefixLength;
