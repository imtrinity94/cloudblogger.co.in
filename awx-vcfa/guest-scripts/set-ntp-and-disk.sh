#!/bin/bash
# Points systemd-timesyncd at the NTP servers in the env file, then grows the root filesystem
# to the full disk (plain partition or LVM).
NTP_LIST=$(grep '^NTP_SERVERS=' /root/awx-install.env | cut -d= -f2- | tr ',;' '  ' | xargs)
if [ -n "$NTP_LIST" ]; then
  mkdir -p /etc/systemd/timesyncd.conf.d
  printf "[Time]\nNTP=%s\n" "$NTP_LIST" > /etc/systemd/timesyncd.conf.d/custom-ntp.conf
  timedatectl set-ntp true
  systemctl restart systemd-timesyncd
fi
ROOTDEV=$(findmnt -n -o SOURCE /)
case "$ROOTDEV" in
  /dev/mapper/*)
    PV=$(pvs --noheadings -o pv_name | head -n1 | xargs)
    DISK=/dev/$(lsblk -no pkname "$PV" | head -n1)
    PARTNUM=$(echo "$PV" | grep -o '[0-9]*$')
    growpart "$DISK" "$PARTNUM" || true
    pvresize "$PV" || true
    lvextend -r -l +100%FREE "$ROOTDEV" || true
    ;;
esac
/usr/local/sbin/awx-status.sh "3/8 ntp '$NTP_LIST', root $(df -h / | awk 'NR==2 {print $2}')"
