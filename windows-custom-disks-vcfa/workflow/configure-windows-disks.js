/*
 * Workflow : LAB - EBS - CompProv Post - Configure Windows Disks
 * Folder   : LAB/02 Subscriptions/Storage
 * Input    : inputProperties (Properties) - EBS payload from Compute Post Provision
 *
 * For the cloud template "LAB - Windows - Custom Disks". The template creates the extra disks on the
 * SCSI controller and unit chosen per row and passes the rows as custom property labDiskLayout
 * (scsiController, unitNumber, sizeGb, driveLetter, label). This workflow:
 *   1. validates the rows (letter D-Z, unique letters and SCSI addresses, NTFS-safe label)
 *   2. finds the VM by instanceUUID and waits for the vSphere customization spec (sysprep)
 *   3. reads every SCSI disk of the VM (bus:unit:sizeGb) and checks that each requested disk exists
 *      at its SCSI address with the requested size
 *   4. runs LAB/Scripts/lab-windows-custom-disks.ps1 through "Guest OS Script Engine",
 *      which matches the disks inside Windows by SCSI address and sets letter + label
 *
 * Guest login from config element LAB/Windows/LAB_WindowsGuest (guestUsername, guestPassword).
 * Plain ES5.1 - no arrow functions, let/const or template strings.
 */

var LOG_PREFIX = "[LAB][ConfigureWindowsDisks] ";

var CONFIG_CATEGORY = "LAB/Windows";
var CONFIG_NAME = "LAB_WindowsGuest";
var SCRIPT_CATEGORY = "LAB/Scripts";
var SCRIPT_NAME = "lab-windows-custom-disks.ps1";
var SCRIPT_ENGINE_WORKFLOW_ID = "83a44b2f-24fa-40cc-b786-a805ba7e3f89"; // Guest OS Script Engine

var FIND_VM_TIMEOUT_MIN = 5;
var CUSTOMIZATION_TIMEOUT_MIN = 30;
var RUN_TIMEOUT_MIN = 15;
var RUN_ATTEMPTS = 3;
var POLL_SEC = 15;

// ------------------------------------------------------------------ helpers

function now() {
    return new Date().getTime();
}

function getConfigElement(categoryPath, name) {
    var category = Server.getConfigurationElementCategoryWithPath(categoryPath);
    if (!category) {
        throw "Config element folder not found: " + categoryPath;
    }
    var elements = category.configurationElements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].name === name) {
            return elements[i];
        }
    }
    throw "Config element not found: " + categoryPath + "/" + name;
}

function getConfigValue(element, key, required) {
    var attribute = element.getAttributeWithKey(key);
    var value = attribute ? attribute.value : null;
    if (required && (value === null || value === undefined || value === "")) {
        throw "Config element " + element.name + " is missing attribute: " + key;
    }
    return value;
}

function getResourceElement(categoryPath, name) {
    var category = Server.getResourceElementCategoryWithPath(categoryPath);
    if (!category) {
        throw "Resource element folder not found: " + categoryPath;
    }
    var elements = category.resourceElements;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].name === name) {
            return elements[i];
        }
    }
    throw "Resource element not found: " + categoryPath + "/" + name;
}

function getCustomProperty(props, key, fallback) {
    var customProperties = props.get("customProperties");
    if (!customProperties) {
        return fallback;
    }
    var value = customProperties.get(key);
    if (value === null || value === undefined || value === "") {
        return fallback;
    }
    return value;
}

function getField(item, key) {
    // Rows may arrive as plain JS objects (from JSON) or as vRO Properties
    var value = item[key];
    if ((value === undefined || value === null) && item.get) {
        try {
            value = item.get(key);
        } catch (e) {
            value = null;
        }
    }
    return value;
}

function parseDiskRows(raw) {
    if (raw === null || raw === undefined || raw === "") {
        return [];
    }
    var rows = raw;
    if (typeof raw === "string" || raw instanceof String) {
        rows = JSON.parse(String(raw));
    }
    var list = [];
    var i;
    if (rows.length === undefined && rows.size) {
        // Java list
        for (i = 0; i < rows.size(); i++) {
            list.push(rows.get(i));
        }
        return list;
    }
    for (i = 0; i < rows.length; i++) {
        list.push(rows[i]);
    }
    return list;
}

function toBus(controller) {
    // SCSI_Controller_1 -> 1 (also accepts a plain number)
    var match = /(\d+)\s*$/.exec(String(controller));
    if (!match) {
        throw "Invalid SCSI controller value: " + controller;
    }
    return parseInt(match[1], 10);
}

function buildRequests(rows) {
    var requests = [];
    var letters = {};
    var addresses = {};
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rowNo = i + 1;
        var bus = toBus(getField(row, "scsiController"));
        var unit = parseInt(getField(row, "unitNumber"), 10);
        var sizeGb = parseInt(getField(row, "sizeGb"), 10);
        var letter = String(getField(row, "driveLetter") || "").toUpperCase();
        var label = getField(row, "label");
        label = (label === null || label === undefined || String(label) === "") ? "Data_" + letter : String(label);

        if (bus < 0 || bus > 3) {
            throw "Disk row " + rowNo + ": SCSI bus must be 0-3, got " + bus;
        }
        if (isNaN(unit) || unit < 0 || unit > 15 || unit === 7) {
            throw "Disk row " + rowNo + ": unit number must be 0-15 and not 7, got " + getField(row, "unitNumber");
        }
        if (bus === 0 && unit === 0) {
            throw "Disk row " + rowNo + ": SCSI 0:0 is the OS disk";
        }
        if (!/^[D-Z]$/.test(letter)) {
            throw "Disk row " + rowNo + ": drive letter must be a single letter D-Z, got '" + letter + "'";
        }
        if (!/^[A-Za-z0-9 _.\-]{1,32}$/.test(label)) {
            throw "Disk row " + rowNo + ": label must be 1-32 letters, digits, space, dot, dash or underscore";
        }
        if (letters[letter]) {
            throw "Disk row " + rowNo + ": drive letter " + letter + ": is used by more than one disk";
        }
        if (addresses[bus + ":" + unit]) {
            throw "Disk row " + rowNo + ": SCSI " + bus + ":" + unit + " is used by more than one disk";
        }
        letters[letter] = true;
        addresses[bus + ":" + unit] = true;
        requests.push({ bus: bus, unit: unit, sizeGb: sizeGb, letter: letter, label: label });
    }
    return requests;
}

function getVcConnection(vcUuid) {
    // Only look at the vCenter named in the payload; other registered vCenters may be unreachable
    var conns = VcPlugin.allSdkConnections;
    for (var i = 0; i < conns.length; i++) {
        try {
            if (conns[i].about && conns[i].about.instanceUuid === vcUuid) {
                return conns[i];
            }
        } catch (e) {
            // unreachable connection, skip it
        }
    }
    return null;
}

function findVm(props) {
    var names = props.get("resourceNames");
    var vmName = (names && names.length > 0) ? names[0] : null;
    var instanceUuid = getCustomProperty(props, "instanceUUID", null);
    var vcUuid = getCustomProperty(props, "vcUuid", null);
    if (!instanceUuid || !vcUuid) {
        throw "EBS payload has no instanceUUID / vcUuid for " + vmName;
    }

    var deadline = now() + FIND_VM_TIMEOUT_MIN * 60000;
    while (now() < deadline) {
        var conn = getVcConnection(vcUuid);
        if (conn) {
            var vm = conn.searchIndex.findByUuid(null, instanceUuid, true, true);
            if (vm) {
                return vm;
            }
            System.log(LOG_PREFIX + "VM " + vmName + " (" + instanceUuid + ") not found yet, retrying");
        } else {
            System.warn(LOG_PREFIX + "vCenter " + vcUuid + " not reachable from vRO yet, retrying");
        }
        System.sleep(POLL_SEC * 1000);
    }
    throw "VM " + vmName + " (" + instanceUuid + ") not found on vCenter " + vcUuid + " after " + FIND_VM_TIMEOUT_MIN + " min";
}

function queryVmEvents(vm, eventTypeIds) {
    var spec = new VcEventFilterSpec();
    spec.entity = new VcEventFilterSpecByEntity();
    spec.entity.entity = vm.reference;
    spec.entity.recursion = VcEventFilterSpecRecursionOption.self;
    spec.eventTypeId = eventTypeIds;
    var events = vm.sdkConnection.eventManager.queryEvents(spec);
    return events ? events : [];
}

function waitForCustomization(vm) {
    var deadline = now() + CUSTOMIZATION_TIMEOUT_MIN * 60000;
    while (now() < deadline) {
        if (queryVmEvents(vm, ["CustomizationFailed"]).length > 0) {
            throw "vSphere guest customization FAILED on " + vm.name + " - check the customization spec";
        }
        if (queryVmEvents(vm, ["CustomizationSucceeded"]).length > 0) {
            System.log(LOG_PREFIX + "Guest customization succeeded on " + vm.name);
            return;
        }
        System.log(LOG_PREFIX + "Waiting for guest customization (sysprep) on " + vm.name);
        System.sleep(POLL_SEC * 1000);
    }
    throw "Timed out after " + CUSTOMIZATION_TIMEOUT_MIN + " min waiting for guest customization on " + vm.name;
}

function isScsiController(device) {
    // The abstract VcVirtualSCSIController does not match instanceof in vRO; SCSI controllers are the devices with sharedBus
    return device.sharedBus !== undefined && device.sharedBus !== null && device.busNumber !== undefined;
}

function getScsiDisks(vm) {
    // Every disk on a SCSI controller: [{bus, unit, sizeGb}]
    var devices = vm.config.hardware.device;
    var busByKey = {};
    var i;
    for (i = 0; i < devices.length; i++) {
        if (isScsiController(devices[i])) {
            busByKey[devices[i].key] = devices[i].busNumber;
        }
    }
    var disks = [];
    for (i = 0; i < devices.length; i++) {
        var dev = devices[i];
        if (dev instanceof VcVirtualDisk && busByKey[dev.controllerKey] !== undefined) {
            disks.push({ bus: busByKey[dev.controllerKey], unit: dev.unitNumber, sizeGb: Math.round(dev.capacityInKB / 1048576) });
        }
    }
    return disks;
}

function runScriptEngine(params) {
    var workflow = Server.getWorkflowWithId(SCRIPT_ENGINE_WORKFLOW_ID);
    if (!workflow) {
        throw "Workflow not found: " + SCRIPT_ENGINE_WORKFLOW_ID + " (Guest OS Script Engine)";
    }
    var token = workflow.execute(params);
    var deadline = now() + RUN_TIMEOUT_MIN * 60000;
    while (token.state === "running" || token.state === "waiting-signal" || token.state === "waiting") {
        if (now() > deadline) {
            throw "Guest OS Script Engine did not finish within " + RUN_TIMEOUT_MIN + " min (token " + token.id + ")";
        }
        System.sleep(5000);
    }
    return token;
}

function parseResult(output) {
    var match = /LAB_RESULT=(\d+)/.exec(output || "");
    return match ? match[1] : null;
}

// --------------------------------------------------------------------- main

var rows = parseDiskRows(getCustomProperty(inputProperties, "labDiskLayout", null));
var requests = buildRequests(rows);
if (requests.length === 0) {
    System.log(LOG_PREFIX + "No additional disks requested, nothing to do");
} else {
    var config = getConfigElement(CONFIG_CATEGORY, CONFIG_NAME);
    var guestUsername = getConfigValue(config, "guestUsername", true);
    var guestPassword = getConfigValue(config, "guestPassword", true);

    var vm = findVm(inputProperties);
    System.log(LOG_PREFIX + "Target VM: " + vm.name + " | " + requests.length + " disk(s) requested");

    // Check every requested disk exists at its SCSI address with the requested size
    var vmDisks = getScsiDisks(vm);
    var vmDiskParts = [];
    var byAddress = {};
    var d;
    for (d = 0; d < vmDisks.length; d++) {
        vmDiskParts.push(vmDisks[d].bus + ":" + vmDisks[d].unit + ":" + vmDisks[d].sizeGb);
        byAddress[vmDisks[d].bus + ":" + vmDisks[d].unit] = vmDisks[d];
    }
    var requestParts = [];
    for (d = 0; d < requests.length; d++) {
        var req = requests[d];
        var found = byAddress[req.bus + ":" + req.unit];
        if (!found) {
            throw "No disk at SCSI " + req.bus + ":" + req.unit + " on " + vm.name + " (VM disks: " + vmDiskParts.join(", ") + ")";
        }
        if (!isNaN(req.sizeGb) && found.sizeGb !== req.sizeGb) {
            throw "Disk at SCSI " + req.bus + ":" + req.unit + " is " + found.sizeGb + " GB, request says " + req.sizeGb + " GB";
        }
        requestParts.push(req.bus + "|" + req.unit + "|" + req.letter + "|" + req.label);
        System.log(LOG_PREFIX + "SCSI " + req.bus + ":" + req.unit + " (" + found.sizeGb + " GB) -> " + req.letter + ": [" + req.label + "]");
    }

    waitForCustomization(vm);

    // Every placeholder must be passed, otherwise it stays in the script as text
    var scriptVariables = new Properties();
    scriptVariables.put("LAB_VM_DISKS", vmDiskParts.join(","));
    scriptVariables.put("LAB_DISK_REQUESTS", requestParts.join(";"));

    var params = new Properties();
    params.put("scriptType", "powershell");
    params.put("vm", vm);
    params.put("vmUsername", guestUsername);
    params.put("vmPassword", guestPassword);
    params.put("resourceElement", getResourceElement(SCRIPT_CATEGORY, SCRIPT_NAME));
    params.put("scriptVariables", scriptVariables);
    params.put("toolsErrorRetryMax", "10");
    params.put("debug", false);

    var result = null;
    var output = "";
    var lastError = "";
    for (var attempt = 1; attempt <= RUN_ATTEMPTS; attempt++) {
        System.log(LOG_PREFIX + "Running " + SCRIPT_NAME + " in " + vm.name + ", attempt " + attempt + " of " + RUN_ATTEMPTS);
        var token = runScriptEngine(params);
        if (token.state === "completed") {
            output = token.getOutputParameters().get("scriptOutputTextOut") || "";
            result = parseResult(output);
            if (result !== null) {
                break;
            }
            lastError = "no LAB_RESULT line in the script output";
        } else {
            lastError = "Guest OS Script Engine ended " + token.state + ": " + token.exception;
        }
        // Right after sysprep the guest can still reject logons for a short while; the script is safe to re-run
        System.warn(LOG_PREFIX + "Attempt " + attempt + " failed: " + lastError);
        System.sleep(30000);
    }

    System.log(LOG_PREFIX + "Guest script output:\n" + output);
    if (result === null) {
        throw "Disk config on " + vm.name + " failed after " + RUN_ATTEMPTS + " attempts: " + lastError;
    }
    if (result !== "0") {
        throw "Disk config on " + vm.name + ": " + (result === "99" ? "script failed" : result + " disk(s) failed") +
            ". See C:\\ProgramData\\LAB\\Logs\\custom-disks.log in the guest";
    }
    System.log(LOG_PREFIX + "All " + requests.length + " disk(s) configured on " + vm.name);
}
