#!/bin/bash
# Read-only check of a VM built from the multi NIC template: login user, NICs, routes,
# DNS, disks, NTP and cloud-init. Changes nothing.
# Run it inside the VM, or from vRO with "Run Script in Linux or Windows (Consolidated)"
# (it is in the package as the resource element lab-mnic-verify.sh).
# Change the gateway in the last line to yours.
# cloudblogger.co.in
echo '===== WHOAMI'; id
echo '===== HOSTNAME'; hostname; hostname -f; hostname -d
echo '===== IP'; ip -br a
echo '===== ROUTE'; ip r
echo '===== DNS'; resolvectl status | grep -E 'Link|Current DNS|DNS Servers|DNS Domain'
echo '===== NETPLAN'; ls /etc/netplan/
echo '===== DISKS'; lsblk -d -o NAME,SIZE,TYPE | grep disk; df -h / | tail -1
echo '===== NTP'; timedatectl show-timesync | grep -E 'ServerName|SystemNTPServers'; cat /etc/systemd/timesyncd.conf.d/custom-ntp.conf 2>/dev/null
echo '===== CLOUD-INIT'; cloud-init status; cat /var/log/cloudinit-done.log 2>/dev/null
echo '===== PING GW'; ping -c 2 -W 2 172.10.20.1 | tail -2
