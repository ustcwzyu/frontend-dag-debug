#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

active_dir="docs/exec-plans/active"
[[ -d "${active_dir}" ]] || { echo "active plan 检查失败：缺少 ${active_dir}" >&2; exit 1; }

bad=()
while IFS= read -r -d '' file; do
  name="$(basename "${file}")"
  [[ "${name}" == "README.md" ]] && continue
  if grep -Eiq 'status:[[:space:]]*(completed|done|closed)|状态[:：][[:space:]]*(已完成|完成|关闭)' "${file}"; then
    bad+=("${file}")
  fi
done < <(find "${active_dir}" -maxdepth 1 -type f -name '*.md' -print0)

if (( ${#bad[@]} > 0 )); then
  echo "active plan 状态检查失败：已完成计划不应留在 active 目录：" >&2
  for item in "${bad[@]}"; do
    echo "  - ${item}" >&2
  done
  exit 1
fi

echo "active plan 状态检查通过"
