#!/bin/bash
# Creates the AWX objects VCF Automation needs for the end-to-end test:
#   inventory "VCFA Deployments", machine credential "VCFA Lab VM Login",
#   job template "VCFA - Hello World" (Demo Project, hello_world.yml, Prompt on launch for Limit).
# Safe to run again: existing objects are reused, not duplicated.
AWX=https://10.20.44.70
AUTH="admin:<AWX admin password>"
VM_USER=ansible
VM_PASS='<password the test VMs get from cloud-init>'

api() { curl -sk -u "$AUTH" -H 'Content-Type: application/json' "$@"; }
idof() { api "$AWX/api/v2/$1/?name=$(printf %s "$2" | jq -sRr @uri)" | jq -r '.results[0].id // empty'; }

ORG=$(idof organizations "Default")
PROJ=$(idof projects "Demo Project")
echo "organization Default=$ORG, project Demo Project=$PROJ"

# Make sure the Demo Project has synced from GitHub before using its playbooks
api -X POST "$AWX/api/v2/projects/$PROJ/update/" -o /dev/null
for i in $(seq 1 30); do
  S=$(api "$AWX/api/v2/projects/$PROJ/" | jq -r .status)
  [ "$S" = "successful" ] && break
  sleep 5
done
echo "project sync: $S"

INV=$(idof inventories "VCFA Deployments")
if [ -z "$INV" ]; then
  INV=$(api -X POST "$AWX/api/v2/inventories/" \
    -d "{\"name\":\"VCFA Deployments\",\"description\":\"Hosts added by VCF Automation deployments\",\"organization\":$ORG}" | jq -r .id)
fi
echo "inventory VCFA Deployments=$INV"

CTYPE=$(api "$AWX/api/v2/credential_types/?kind=ssh" | jq -r '.results[0].id')
CRED=$(idof credentials "VCFA Lab VM Login")
if [ -z "$CRED" ]; then
  CRED=$(api -X POST "$AWX/api/v2/credentials/" \
    -d "{\"name\":\"VCFA Lab VM Login\",\"description\":\"SSH login created by cloud-init on VCF Automation test VMs\",\"organization\":$ORG,\"credential_type\":$CTYPE,\"inputs\":{\"username\":\"$VM_USER\",\"password\":\"$VM_PASS\",\"become_method\":\"sudo\",\"become_password\":\"$VM_PASS\"}}" | jq -r .id)
fi
echo "credential VCFA Lab VM Login=$CRED"

JT=$(idof job_templates "VCFA - Hello World")
if [ -z "$JT" ]; then
  JT=$(api -X POST "$AWX/api/v2/job_templates/" \
    -d "{\"name\":\"VCFA - Hello World\",\"description\":\"Runs hello_world.yml on the machine VCF Automation just deployed\",\"job_type\":\"run\",\"inventory\":$INV,\"project\":$PROJ,\"playbook\":\"hello_world.yml\",\"ask_limit_on_launch\":true}" | jq -r .id)
  api -X POST "$AWX/api/v2/job_templates/$JT/credentials/" -d "{\"id\":$CRED}" -o /dev/null
fi
echo "job template VCFA - Hello World=$JT"
api "$AWX/api/v2/job_templates/$JT/" | jq -r '"  playbook=" + .playbook + " ask_limit_on_launch=" + (.ask_limit_on_launch|tostring) + " credentials=" + ([.summary_fields.credentials[].name]|join(","))'
