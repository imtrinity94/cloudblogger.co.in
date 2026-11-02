#!/bin/bash
# Seal a Linux VM template so every clone gets clean network and cloud-init state.
# Run inside the template VM (converted to a VM), then shut down and convert back to a template.
# cloudblogger.co.in
set -u
echo '===== BACKUP'
sudo mkdir -p /root/template-backup
sudo cp -a /etc/netplan /root/template-backup/ 2>/dev/null && echo 'netplan backed up to /root/template-backup'
echo '===== REMOVE NETPLAN FILES BOUND TO THE TEMPLATE NIC'
sudo rm -fv /etc/netplan/50-cloud-init.yaml
sudo rm -fv /etc/netplan/00-installer-config.yaml /etc/netplan/99-netcfg-vmware.yaml
echo '===== CLEAN CLOUD-INIT STATE (new instance on every clone)'
sudo cloud-init clean --logs --seed
echo '===== RESET MACHINE-ID'
sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -s /etc/machine-id /var/lib/dbus/machine-id
echo '===== REMOVE SSH HOST KEYS AND DHCP LEASES (regenerated on first boot)'
sudo rm -f /etc/ssh/ssh_host_*
sudo rm -f /var/lib/dhcp/* 2>/dev/null
echo '===== VERIFY'
ls -l /etc/netplan/
sudo ls /var/lib/cloud/ 2>&1
echo "machine-id bytes: $(stat -c %s /etc/machine-id)"
echo 'DONE - shut down the VM and convert it back to a template'
