#!/bin/bash
# Installs k3s and the AWX Operator, creates the AWX instance behind Traefik on 443, waits for it.
set -eo pipefail
exec >> /var/log/awx-install.log 2>&1
trap '/usr/local/sbin/awx-status.sh "FAILED at line $LINENO - see /var/log/awx-install.log"' ERR
ENVF=/root/awx-install.env
getv() { grep "^$1=" "$ENVF" | head -n1 | cut -d= -f2-; }
IP=$(getv NET_IP); DOM=$(getv NET_DOMAIN); FQDN=$(getv AWX_FQDN)
OPV=$(getv AWX_OPERATOR_VERSION); ADMIN_PASS=$(getv AWX_ADMIN_PASS)
case "$ADMIN_PASS" in "((secret:"*) /usr/local/sbin/awx-status.sh "FAILED admin password reached the guest still encrypted"; exit 1;; esac
export DEBIAN_FRONTEND=noninteractive
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
for i in $(seq 1 10); do timeout 300 apt-get update && break; echo "apt-get update retry $i"; sleep 15; done
apt-get install -y curl git ca-certificates openssl jq dnsutils
/usr/local/sbin/awx-status.sh "4/8 installing k3s"
for i in $(seq 1 5); do curl -sfL --retry 5 https://get.k3s.io -o /tmp/k3s-install.sh && break; sleep 15; done
INSTALL_K3S_CHANNEL=stable sh /tmp/k3s-install.sh --write-kubeconfig-mode 644
for i in $(seq 1 60); do kubectl get nodes 2>/dev/null | grep -q ' Ready' && break; sleep 5; done
for i in $(seq 1 120); do kubectl -n kube-system get deploy traefik >/dev/null 2>&1 && break; sleep 5; done
kubectl -n kube-system rollout status deploy/traefik --timeout=900s
/usr/local/sbin/awx-status.sh "5/8 k3s $(k3s --version | head -n1 | awk '{print $3}') ready, installing AWX Operator $OPV"
mkdir -p /opt/awx/operator /opt/awx/instance
chmod 700 /opt/awx
cd /opt/awx
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -keyout tls.key -out tls.crt \
  -subj "/CN=$FQDN" -addext "subjectAltName=DNS:$FQDN,IP:$IP"
kubectl create namespace awx --dry-run=client -o yaml | kubectl apply -f -
kubectl -n awx create secret tls awx-tls --cert=tls.crt --key=tls.key --dry-run=client -o yaml | kubectl apply -f -
kubectl -n awx create secret generic awx-admin-password --from-literal=password="$ADMIN_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -
cat > /opt/awx/operator/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - github.com/ansible/awx-operator/config/default?ref=$OPV
images:
  - name: quay.io/ansible/awx-operator
    newTag: $OPV
  - name: gcr.io/kubebuilder/kube-rbac-proxy
    newName: quay.io/brancz/kube-rbac-proxy
namespace: awx
EOF
for i in $(seq 1 5); do kubectl apply -k /opt/awx/operator && break; echo "operator apply retry $i"; sleep 20; done
kubectl -n awx rollout status deploy/awx-operator-controller-manager --timeout=900s
/usr/local/sbin/awx-status.sh "6/8 AWX Operator running, creating AWX instance"
cat > /opt/awx/instance/awx.yaml <<EOF
apiVersion: awx.ansible.com/v1beta1
kind: AWX
metadata:
  name: awx
  namespace: awx
spec:
  service_type: ClusterIP
  ingress_type: ingress
  ingress_class_name: traefik
  ingress_hosts:
    - hostname: $FQDN
      tls_secret: awx-tls
  admin_user: admin
  admin_password_secret: awx-admin-password
  postgres_data_volume_init: true
  postgres_storage_class: local-path
  postgres_storage_requirements:
    requests:
      storage: 10Gi
  extra_settings:
    - setting: CSRF_TRUSTED_ORIGINS
      value:
        - https://$FQDN
        - https://$IP
---
# Lets AWX answer on the bare IP too, and makes the AWX certificate Traefik's default certificate
apiVersion: traefik.io/v1alpha1
kind: TLSStore
metadata:
  name: default
  namespace: awx
spec:
  defaultCertificate:
    secretName: awx-tls
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: awx-by-ip
  namespace: awx
spec:
  ingressClassName: traefik
  tls:
    - secretName: awx-tls
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: awx-service
                port:
                  number: 80
EOF
for i in $(seq 1 10); do kubectl apply -f /opt/awx/instance/awx.yaml && break; echo "instance apply retry $i"; sleep 15; done
/usr/local/sbin/awx-status.sh "7/8 AWX instance created, waiting for pods and database migrations"
VER=""
for i in $(seq 1 180); do
  VER=$(curl -sk --max-time 10 https://127.0.0.1/api/v2/ping/ -H "Host: $FQDN" | jq -r '.version // empty' 2>/dev/null || true)
  [ -n "$VER" ] && break
  if [ $((i % 6)) -eq 0 ]; then
    /usr/local/sbin/awx-status.sh "7/8 waiting for AWX ($((i / 6)) min) - $(kubectl -n awx get pods --no-headers 2>/dev/null | awk '{print $1":"$3}' | tr '\n' ' ')"
  fi
  sleep 10
done
if [ -z "$VER" ]; then
  /usr/local/sbin/awx-status.sh "FAILED AWX API not answering after 30 min - check kubectl -n awx get pods and operator logs"
  exit 1
fi
# Try a dynamic DNS update for the AWX name (works only if the zone allows non-secure updates)
DNS1=$(getv NET_DNS | cut -d, -f1 | xargs)
ZONE=$(echo "$FQDN" | cut -d. -f2-)
DNSRES="dns not registered"
if printf 'server %s\nzone %s\nupdate delete %s. A\nupdate add %s. 3600 A %s\nsend\n' "$DNS1" "$ZONE" "$FQDN" "$FQDN" "$IP" | timeout 20 nsupdate -v; then
  sleep 3
  if [ "$(dig +short @"$DNS1" "$FQDN" A | head -n1)" = "$IP" ]; then DNSRES="dns $FQDN -> $IP registered"; fi
fi
# Self-test: admin login through the IP ingress. The operator creates the admin user a few minutes
# after the API first answers, so retry for up to 10 minutes.
ME=""
for i in $(seq 1 60); do
  ME=$(curl -sk --max-time 15 -u "admin:$ADMIN_PASS" https://$IP/api/v2/me/ | jq -r '.results[0].username // empty' 2>/dev/null || true)
  [ "$ME" = "admin" ] && break
  sleep 10
done
rm -f "$ENVF" /tmp/k3s-install.sh
if [ "$ME" = "admin" ]; then AUTH="admin login ok"; else AUTH="WARNING admin login check failed"; fi
/usr/local/sbin/awx-status.sh "DONE AWX $VER ready on https://$IP/ and https://$FQDN/ - $AUTH - $DNSRES"
