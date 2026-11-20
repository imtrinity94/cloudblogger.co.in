# Changelog

## 1.1.0 - 2026-11-20
- Workflow `LAB - EBS - CompProv Post - Configure Windows Disks` 1.1.0: runs the guest script through Guest OS Script Engine instead of Run Script in Linux or Windows (Consolidated).
- Added the read-only check script `lab-windows-disk-check.ps1`.

## 1.0.1 - 2026-11-18
- Cloud template: `allocatePerInstance: true` on the data disks, so each disk gets its own row's SCSI controller, unit and size.

## 1.0.0 - 2026-11-18
- First version: cloud template, Compute Post Provision workflow and guest script.
