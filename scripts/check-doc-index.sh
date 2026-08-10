#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

required_docs=(
  "ai_workspace/loop-agent/README.md"
  "ai_workspace/loop-agent/development-principles.md"
  "ai_workspace/loop-agent/feature-workflow.md"
  "ai_workspace/loop-agent/verification-matrix.md"
  "ai_workspace/loop-agent/architecture/runtime-boundaries.md"
  "ai_workspace/loop-agent/loop-agent-harness.md"
  "ai_workspace/loop-agent/harness-methodology-tdd.md"
  "ai_workspace/loop-agent/harness-methodology-verification.md"
  "ai_workspace/loop-agent/harness-methodology-debugging.md"
  "ai_workspace/loop-agent/templates"
  "ai_workspace/loop-agent/exec-plans/active/README.md"
  "ai_workspace/loop-agent/exec-plans/completed/README.md"
  "ai_workspace/loop-agent/progress/README.md"
  "ai_workspace/loop-agent/reports/README.md"
  "ai_workspace/loop-agent/decisions/README.md"
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
