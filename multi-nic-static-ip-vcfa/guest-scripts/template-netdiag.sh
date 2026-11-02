#!/bin/bash
# Read-only check of a Linux VM template before it is used by VCF Automation.
# Shows leftover netplan files, cloud-init state and machine-id. Changes nothing.
# cloudblogger.co.in
echo '===== OS'; head -2 /etc/os-release
echo '===== IP'; ip -br a
echo '===== NETPLAN FILES'; ls -l /etc/netplan/
for f in /etc/netplan/*.yaml; do echo "--- $f"; sudo cat "$f"; done
echo '===== CLOUD-INIT'; cloud-init --version; sudo cloud-init status --long
echo '===== CLOUD-INIT INSTANCES'; sudo ls /var/lib/cloud/instances/ 2>&1
echo '===== DATASOURCE / VMWARE CUSTOMIZATION'; sudo grep -rs 'datasource_list\|disable_vmware_customization' /etc/cloud/cloud.cfg /etc/cloud/cloud.cfg.d/
echo '===== MACHINE-ID'; cat /etc/machine-id
echo '===== OPEN-VM-TOOLS'; dpkg -l open-vm-tools 2>/dev/null | tail -1 || rpm -q open-vm-tools
