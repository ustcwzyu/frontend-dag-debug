#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

required_docs=(
  "docs/README.md"
  "docs/development-principles.md"
  "docs/feature-workflow.md"
  "docs/verification-matrix.md"
  "docs/architecture/runtime-boundaries.md"
  "docs/loop-agent-harness.md"
  "docs/harness-methodology-tdd.md"
  "docs/harness-methodology-verification.md"
  "docs/harness-methodology-debugging.md"
  "docs/templates"
  "docs/exec-plans/active/README.md"
  "docs/exec-plans/completed/README.md"
  "docs/progress/README.md"
  "docs/reports/README.md"
  "docs/decisions/README.md"
)

missing=()
for item in "${required_docs[@]}"; do
  if [[ ! -e "${item}" ]]; then
    missing+=("${item}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "docs 索引检查失败，缺少必要文档或目录：" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  exit 1
fi

echo "docs 索引检查通过"
