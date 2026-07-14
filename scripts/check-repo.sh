#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

checks=(
  "scripts/check-engineering-structure.sh"
  "scripts/check-doc-index.sh"
  "scripts/check-doc-links.sh"
  "scripts/check-active-plan-status.sh"
  "scripts/check-exec-plan-index-sync.sh"
  "scripts/check-harness-runtime-clean.sh"
  "scripts/check-architecture-boundaries.sh"
  "scripts/check-skill-entry.sh"
  "scripts/check-product-line-docs.sh"
)

for check in "${checks[@]}"; do
  echo "==> bash ${check}"
  bash "${check}"
  echo
done

echo "仓库治理检查全部通过"
