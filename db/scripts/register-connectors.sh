#!/usr/bin/env bash
set -euo pipefail

CONNECT_URL="${CONNECT_URL:-http://localhost:8083}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONNECTORS_DIR="${SCRIPT_DIR}/../connectors"

echo "==> En attente de Kafka Connect sur ${CONNECT_URL}..."
until curl -sf "${CONNECT_URL}/connectors" > /dev/null 2>&1; do
  printf '.'
  sleep 3
done
echo " prêt."

register() {
  local file="$1"
  local name
  name=$(grep -oP '"name"\s*:\s*"\K[^"]+' "${file}" | head -1)

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "${CONNECT_URL}/connectors/${name}")

  if [ "${status}" = "200" ]; then
    echo "==> Connecteur '${name}' existe déjà — mise à jour de la config..."
    curl -s -X PUT \
      -H "Content-Type: application/json" \
      --data "$(python3 -c "import json,sys; d=json.load(open('${file}')); print(json.dumps(d['config']))")" \
      "${CONNECT_URL}/connectors/${name}/config"
  else
    echo "==> Enregistrement du connecteur '${name}'..."
    curl -s -X POST \
      -H "Content-Type: application/json" \
      --data @"${file}" \
      "${CONNECT_URL}/connectors"
  fi
  echo ""
}

register "${CONNECTORS_DIR}/postgres-source.json"
register "${CONNECTORS_DIR}/mssql-sink.json"

echo ""
echo "==> Connecteurs actifs :"
curl -s "${CONNECT_URL}/connectors?expand=status"
echo ""
