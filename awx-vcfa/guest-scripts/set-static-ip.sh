#!/bin/bash
# Applies a static IPv4 config (address, gateway, DNS, search domain) to the first NIC through netplan.
ENVF=/root/awx-install.env
getv() { grep "^$1=" "$ENVF" | head -n1 | cut -d= -f2-; }
IP=$(getv NET_IP); PFX=$(getv NET_PREFIX); GW=$(getv NET_GW)
DNS=$(getv NET_DNS | tr -d ' ' | sed 's/,/, /g'); DOM=$(getv NET_DOMAIN)
NIC=$(ls /sys/class/net | grep -v '^lo$' | head -n1)
echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
mkdir -p /etc/netplan/backup
for F in /etc/netplan/*.yaml; do [ -e "$F" ] && mv "$F" /etc/netplan/backup/; done
cat > /etc/netplan/60-static.yaml <<EOF
network:
  version: 2
  ethernets:
    $NIC:
      dhcp4: false
      dhcp6: false
      addresses: [$IP/$PFX]
      routes:
        - to: default
          via: $GW
      nameservers:
        addresses: [$DNS]
        search: [$DOM]
EOF
chmod 600 /etc/netplan/60-static.yaml
netplan apply
for i in $(seq 1 24); do
  if timeout 5 getent hosts archive.ubuntu.com >/dev/null; then
    /usr/local/sbin/awx-status.sh "2/8 network ready $NIC $IP/$PFX dns $DNS"
    exit 0
  fi
  sleep 5
done
/usr/local/sbin/awx-status.sh "2/8 WARNING $NIC $IP/$PFX set but DNS $DNS not resolving archive.ubuntu.com"
