#!/usr/bin/env bash
set -euo pipefail
mkdir -p ./secret-dumps
chmod 700 ./secret-dumps
targets=(
  "mars gradsystem-prod gradsystem k8s-prod"
  "mars gradsystem-dev gradsystem-dev k8s-dev"
  "junjie prod gradsystem k3s-prod"
  "junjie dev gradsystem-dev k3s-dev"
)
for t in "${targets[@]}"; do
  read -r ctx ns deploy label <<< "$t"
  secret_name=$(
    kubectl --context "$ctx" -n "$ns" get deploy "$deploy" -o json \
    | jq -r '.spec.template.spec.containers[].env[]
      | select(.valueFrom.secretKeyRef.name != null)
      | .valueFrom.secretKeyRef.name' \
    | grep -E '^gradsystem-secret' \
    | head -n1
  )
  if [ -z "$secret_name" ]; then
    echo "[$label] 找不到 deployment 正在使用的 gradsystem-secret" >&2
    exit 1
  fi
  out="./secret-dumps/${label}.env"
  kubectl --context "$ctx" -n "$ns" get secret "$secret_name" -o json \
  | jq -r '
      .data
      | to_entries
      | sort_by(.key)
      | .[]
      | "\(.key)=\(.value|@base64d)"
    ' > "$out"
  chmod 600 "$out"
  echo "[$label] secret=$secret_name -> $out"
done