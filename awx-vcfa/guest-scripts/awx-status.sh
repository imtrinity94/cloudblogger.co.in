#!/bin/bash
# Usage: awx-status.sh "<text>" - logs a step and publishes it to guestinfo.awx.status
echo "$(date '+%F %T') $1" >> /var/log/awx-install.log
vmware-rpctool "info-set guestinfo.awx.status $1" >/dev/null 2>&1 || true
