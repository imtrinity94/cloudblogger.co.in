/**
 * Workflow: CloudBlogger - EBS - NetConf Pre - Apply Static IP
 * Folder  : CloudBlogger/Multi NIC Static IP
 * Input   : inputProperties (Properties)  - event payload from VCF Automation
 * Outputs : addresses, cidrs, gateways, dnsServers, domains, dnsSearchDomains (all Array/Array)
 *           Output names must match the Network Configure event topic fields.
 *
 * Builds the per-NIC network outputs for up to 3 NICs.
 * Only NICs with a real network selected are counted (blank or the "no networks" message
 * are skipped), so NIC1 + NIC3 selected = vNIC0 + vNIC1 on the VM.
 * Per NIC : cpNic<n>Network, cpNic<n>Dhcp ('Yes'/'No'), cpNic<n>IpAddress, cpNic<n>Netmask
 * Common  : cpGateway (first static NIC only), cpDNS (comma separated), cpDomain
 * DHCP NICs get empty values.
 * cloudblogger.co.in
 */
var LOG = "[Apply Static IP] ";
var NO_NETWORKS_MSG = "No networks available for this environment yet";
var MAX_NICS = 3;

var cp = inputProperties.customProperties || {};

function clean(value) {
    if (value === null || value === undefined) { return ""; }
    return String(value).replace(/^\s+|\s+$/g, "");
}

function isRealNetwork(name) {
    return name !== "" && name !== NO_NETWORKS_MSG;
}

var gatewayValue = clean(cp.cpGateway);
var domainValue = clean(cp.cpDomain);
var dnsList = [];
var dnsParts = clean(cp.cpDNS).split(",");
for (var d = 0; d < dnsParts.length; d++) {
    var dnsEntry = clean(dnsParts[d]);
    if (dnsEntry !== "") { dnsList.push(dnsEntry); }
}

var vmAddresses = [];
var vmGateways = [];
var vmDnsServers = [];
var vmDomains = [];
var vmDnsSearch = [];
var vmCidrs = [];

var gatewayUsed = false;
var vnicIndex = 0;

for (var n = 1; n <= MAX_NICS; n++) {
    var network = clean(cp["cpNic" + n + "Network"]);
    if (!isRealNetwork(network)) {
        System.log(LOG + "NIC" + n + ": no network selected, skipped");
        continue;
    }

    var isStatic = clean(cp["cpNic" + n + "Dhcp"]) === "No";
    var ip = clean(cp["cpNic" + n + "IpAddress"]);
    var mask = clean(cp["cpNic" + n + "Netmask"]);

    if (isStatic && (ip === "" || mask === "")) {
        throw LOG + "NIC" + n + " (" + network + ") is set to static but IP address or netmask is empty";
    }

    if (isStatic) {
        var cidr = System.getModule("in.co.cloudblogger.multinic").calculateCidrNotation(ip, mask);
        var nicGateway = [];
        if (!gatewayUsed && gatewayValue !== "") {
            nicGateway.push(gatewayValue);
            gatewayUsed = true;
        }
        vmAddresses.push(ip);
        vmGateways.push(nicGateway);
        vmDnsServers.push(dnsList);
        vmDomains.push(domainValue);
        vmDnsSearch.push(domainValue === "" ? [] : [domainValue]);
        vmCidrs.push(cidr);
        System.log(LOG + "vNIC" + vnicIndex + " (NIC" + n + ", " + network + "): static " + ip + " / " + mask +
                   " (" + cidr + ")" + (nicGateway.length > 0 ? " gw " + nicGateway[0] : ""));
    } else {
        vmAddresses.push("");
        vmGateways.push([]);
        vmDnsServers.push([]);
        vmDomains.push("");
        vmDnsSearch.push([]);
        vmCidrs.push("");
        System.log(LOG + "vNIC" + vnicIndex + " (NIC" + n + ", " + network + "): DHCP");
    }
    vnicIndex++;
}

if (vnicIndex === 0) {
    System.log(LOG + "No NICs selected, nothing to configure");
}

// One machine per request: wrap the per-NIC arrays in the machine dimension
addresses = [vmAddresses];
gateways = [vmGateways];
dnsServers = [vmDnsServers];
domains = [vmDomains];
dnsSearchDomains = [vmDnsSearch];
cidrs = [vmCidrs];

System.log(LOG + "addresses: " + JSON.stringify(addresses));
System.log(LOG + "cidrs: " + JSON.stringify(cidrs));
System.log(LOG + "gateways: " + JSON.stringify(gateways));
System.log(LOG + "dnsServers: " + JSON.stringify(dnsServers));
System.log(LOG + "domains: " + JSON.stringify(domains));
System.log(LOG + "dnsSearchDomains: " + JSON.stringify(dnsSearchDomains));
