#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -d "docs" ]]; then
  echo "docs 链接检查失败：缺少 docs/" >&2
  exit 1
fi

missing=()
while IFS= read -r -d '' file; do
  while IFS= read -r link; do
    [[ -z "${link}" ]] && continue
    [[ "${link}" == http://* || "${link}" == https://* || "${link}" == mailto:* || "${link}" == "#"* ]] && continue
    [[ "${link}" == *"://"* ]] && continue
    target="${link%%#*}"
    [[ -z "${target}" ]] && continue
    [[ "${target}" == /* ]] && continue
    base="$(dirname "${file}")"
    if [[ ! -e "${base}/${target}" ]]; then
      missing+=("${file}: ${link}")
    fi
  done < <(grep -Eo '\[[^]]+\]\([^)]+\)' "${file}" | sed -E 's/^.*\(([^)]+)\)$/\1/' || true)
done < <(find "docs" -type f -name '*.md' -print0)

if (( ${#missing[@]} > 0 )); then
  echo "docs 链接检查失败：" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  exit 1
fi

echo "docs 链接检查通过"
