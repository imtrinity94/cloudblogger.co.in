# Custom disks with drive letters and labels in VCF Automation (no Cloudbase-Init)

A VCF Automation 9 (VM Apps) cloud template and an Orchestrator Compute Post Provision subscription that give every extra Windows disk its own drive letter and NTFS volume label at request time, without Cloudbase-Init in the template:

- one row per disk on the request: SCSI controller, unit number, size, drive letter, label
- VCF Automation creates each disk on the SCSI address of its row
- the vRO workflow checks each disk at its SCSI address, waits for sysprep, and runs a PowerShell script in the guest through VMware Tools (Guest OS Script Engine)
- disks are matched inside Windows by SCSI address and size, not by order
- a CD/DVD drive holding a requested letter is moved out of the way
- safe to run again: existing volumes only get their letter and label corrected

Companion to the cloudblogger.co.in post *Custom disks with drive letters and labels in VCF Automation, without Cloudbase-Init*. Based on the idea in [How to add custom disks with drive letters and labels in Aria Automation](https://cosmin.us/how-to-add-custom-disks-with-drive-letters-and-labels-in-aria-automation-vmware-by-broadcom/) (cosmin.us), which does the same with Cloudbase-Init.

## What's inside

| Path | What it is |
| --- | --- |
| `cloud-template/lab-windows-custom-disks.yaml` | Cloud template `LAB - Windows - Custom Disks` (1.0.1) |
| `workflow/configure-windows-disks.js` | Script of the workflow `LAB - EBS - CompProv Post - Configure Windows Disks` (1.1.0) |
| `guest-scripts/lab-windows-custom-disks.ps1` | Guest script: matches disks by SCSI address, sets letter and label |
| `guest-scripts/lab-windows-disk-check.ps1` | Read-only check: volumes, labels, disk states, last boot |
| `in.co.cloudblogger.windowscustomdisks_v1.1.0_20261120.package` | vRO package (to be added) |

Orchestrator objects in the package:

| Object | Name |
| --- | --- |
| Workflow | `LAB - EBS - CompProv Post - Configure Windows Disks` (folder `LAB/02 Subscriptions/Storage`) |
| Workflow | `Guest OS Script Engine`: runs a script from a resource element in the guest through VMware Tools |
| Action | `com.vmware.coe.vcenter.vm.guest/getVmGuestFamily` (used by Guest OS Script Engine) |
| Resource elements | `LAB/Scripts/lab-windows-custom-disks.ps1`, `LAB/Scripts/lab-windows-disk-check.ps1`, `cmdANSI.exe` |
| Config element | `LAB/Windows/LAB_WindowsGuest` (`guestUsername`, `guestPassword`; the password is not exported) |

## Setup

1. Import the package in Orchestrator (**Assets > Packages > Import**).
2. Set `guestPassword` in `LAB/Windows/LAB_WindowsGuest` to the local Administrator password your customization spec sets.
3. Create a cloud template from `cloud-template/lab-windows-custom-disks.yaml`. Change `imageRef`, the `customizationSpec` name and the network tag for your environment, then version and release it.
4. Create the subscription:

   | Setting | Value |
   | --- | --- |
   | Event topic | Compute post provision |
   | Blocking | Yes, timeout 60 minutes |
   | Workflow | `LAB - EBS - CompProv Post - Configure Windows Disks` |
   | Condition | `event.data.customProperties['labCustomDisks'] === 'windows'` |
   | Project | the project of the template |

5. Request the template with one row per disk.

## Tested on

VCF Automation 9.1.1 (VM Apps organization) with its embedded VCF Operations Orchestrator 9.1.1 (build 25643527), Windows Server 2022 template with VMware Tools and no Cloudbase-Init. Final test: a clean request of template 1.0.1 with F: AppData on SCSI 1:0 (25 GB) and T: TempDB on SCSI 2:0 (12 GB). Earlier tests: three disks on two controllers (D:, E:, L:), a reboot, a second run on the same VM, and nine bad-input cases.

## Notes

- Keep `allocatePerInstance: true` on the disk resource. Without it every disk gets the first row's controller, unit and size, and the request fails with "SCSIController ... and UnitNumber ... is already assigned".
- Windows does not number disks in vSphere order, and its SCSI port numbers are not the vSphere bus numbers. The script matches each guest port to the bus with the same unit:size layout; two controllers with an identical layout cannot be told apart and are reported as an error.
- Unit 7 is reserved on SCSI controllers, and 0:0 is the OS disk.
- Labels: 1-32 letters, digits, space, dot, dash or underscore.
- Disclaimer: provided as is, without warranty. Test in a lab before using in production.
