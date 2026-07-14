#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v agent-worker >/dev/null 2>&1; then
  echo "product-line docs check skipped: agent-worker is not installed"
  exit 0
fi

feature_dirs=()
for root in features product/features dogfood/features; do
  [[ -d "${root}" ]] || continue
  while IFS= read -r feature_dir; do
    if [[ ! -f "${feature_dir}/acceptance.yaml" ]]; then
      echo "product-line docs check failed: incomplete feature packet missing acceptance.yaml: ${feature_dir}" >&2
      exit 1
    fi
    feature_dirs+=("${feature_dir}")
  done < <(find "${root}" -mindepth 1 -maxdepth 1 -type d | sort)
done

if [[ ${#feature_dirs[@]} -eq 0 ]]; then
  echo "product-line docs check skipped: no feature packets found"
  exit 0
fi

for feature_dir in "${feature_dirs[@]}"; do
  echo "==> validate product-line feature: ${feature_dir}"
  agent-worker task validate-feature "${feature_dir}"
done

echo "product-line docs checks passed: ${#feature_dirs[@]} feature packet(s)"
