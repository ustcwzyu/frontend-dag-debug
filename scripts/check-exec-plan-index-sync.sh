#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

required=(
  "ai_workspace/loop-agent/exec-plans/README.md"
  "ai_workspace/loop-agent/exec-plans/active/README.md"
  "ai_workspace/loop-agent/exec-plans/completed/README.md"
)

for item in "${required[@]}"; do
  if [[ ! -f "${item}" ]]; then
    echo "exec-plan 索引同步检查失败：缺少 ${item}" >&2
    exit 1
  fi
done

echo "exec-plan 索引同步检查通过"
