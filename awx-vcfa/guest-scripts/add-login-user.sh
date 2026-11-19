#!/bin/bash
# Usage: add-login-user.sh "<username>" "<password>"
U="$1"; P="$2"
if [ -z "$U" ]; then echo "add-login-user: no username given, skipped"; exit 0; fi
id "$U" >/dev/null 2>&1 || useradd -m -s /bin/bash "$U"
usermod -aG sudo "$U"
if [ -n "$P" ]; then echo "$U:$P" | chpasswd; passwd -u "$U" >/dev/null 2>&1; fi
/usr/local/sbin/awx-status.sh "1/8 login user $U ready"
