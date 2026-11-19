// Reads the AWX install progress that the LAB - AWX - Ubuntu template publishes to the
// VM advanced setting guestinfo.awx.status. Plain ES5, runs as a scriptable task or action.
// Change the VM name pattern to match your deployment.
var vm = VcPlugin.getAllVirtualMachines(null, "xpath:matches(name,'lab-awx01.*')")[0];
var status = null;
var extraConfig = vm.config.extraConfig;
for (var i = 0; i < extraConfig.length; i++) {
    if (extraConfig[i].key == "guestinfo.awx.status") {
        status = "" + extraConfig[i].value;
    }
}
System.log(vm.name + " (" + vm.guest.ipAddress + "): " + status);
