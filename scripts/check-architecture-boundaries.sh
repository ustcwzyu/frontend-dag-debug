#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

boundary_doc="docs/architecture/runtime-boundaries.md"
if [[ ! -f "${boundary_doc}" ]]; then
  echo "architecture boundary 检查失败：缺少 ${boundary_doc}" >&2
  exit 1
fi

violations=()

check_ts_import_boundary() {
  local from_dir="$1"
  local forbidden_dir="$2"
  local label="$3"
  [[ -d "${from_dir}" && -d "${forbidden_dir}" ]] || return 0
  while IFS= read -r -d '' file; do
    if grep -Eq "from ['\"][^'\"]*${forbidden_dir}/|import\(['\"][^'\"]*${forbidden_dir}/|require\(['\"][^'\"]*${forbidden_dir}/" "${file}"; then
      violations+=("${label}: ${file} imports ${forbidden_dir}")
    fi
  done < <(find "${from_dir}" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \) -print0)
}

# These checks are intentionally optional and stack-agnostic. They activate only
# when a target repository has recognizable source directories.
check_ts_import_boundary "src/workflows" "src/commands" "workflow-runtime"
check_ts_import_boundary "src/executors" "src/commands" "executors"
check_ts_import_boundary "src/domain" "src/infrastructure" "domain"

if (( ${#violations[@]} > 0 )); then
  echo "architecture boundary 检查失败：" >&2
  for item in "${violations[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "请更新 ${boundary_doc} 中的层边界，或修正反向依赖。" >&2
  exit 1
fi

echo "architecture boundary 检查通过"
