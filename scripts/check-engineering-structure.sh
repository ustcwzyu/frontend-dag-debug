#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

required_paths=(
  "README.md"
  "harness.json"
  "AGENTS.md"
  "docs/README.md"
  "docs/development-principles.md"
  "docs/feature-workflow.md"
  "docs/verification-matrix.md"
  "docs/architecture/runtime-boundaries.md"
  "docs/templates"
  "skills/loop-agent/SKILL.md"
  ".harness/prompts/analyze.md"
  ".harness/prompts/plan.md"
  ".harness/tasks"
  ".harness/dag-runs/active"
  ".harness/dag-runs/completed"
  ".harness/dag-runs/paused"
  ".harness/runs/active"
  ".harness/runs/completed"
  ".harness/runs/failed"
  "scripts/check-engineering-structure.sh"
  "scripts/check-doc-index.sh"
  "scripts/check-doc-links.sh"
  "scripts/check-active-plan-status.sh"
  "scripts/check-exec-plan-index-sync.sh"
  "scripts/check-harness-runtime-clean.sh"
  "scripts/check-architecture-boundaries.sh"
  "scripts/check-skill-entry.sh"
  "scripts/check-repo.sh"
  "scripts/ci-governance.sh"
  "scripts/ci-tests.sh"
  "scripts/ci.sh"
)

missing=()
for item in "${required_paths[@]}"; do
  if [[ ! -e "${item}" ]]; then
    missing+=("${item}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "loop-agent 初始化检查失败，缺少必要路径："
  for item in "${missing[@]}"; do
    echo "  - ${item}"
  done
  exit 1
fi

echo "loop-agent 工程结构检查通过"
