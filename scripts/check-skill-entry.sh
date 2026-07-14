#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

skill_md="skills/loop-agent/SKILL.md"
if [[ ! -f "${skill_md}" ]]; then
  echo "skill entry 检查失败：缺少 ${skill_md}" >&2
  exit 1
fi

required_refs=(
  "references/harness-policy.md"
  "references/hybrid-dag.md"
  "references/verification-and-failure-handling.md"
  "references/command-reference.md"
)

missing=()
for ref in "${required_refs[@]}"; do
  [[ -f "skills/loop-agent/${ref}" ]] || missing+=("${ref}")
done

while IFS= read -r ref; do
  [[ -z "${ref}" ]] && continue
  [[ -f "skills/loop-agent/${ref}" ]] || missing+=("${ref}")
done < <(grep -Eo 'references/[A-Za-z0-9._/-]+\.md' "${skill_md}" | sort -u || true)

if (( ${#missing[@]} > 0 )); then
  echo "skill entry 检查失败：引用的 reference 文件不存在：" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

line_count="$(wc -l < "${skill_md}" | tr -d ' ')"
if [[ "${line_count}" =~ ^[0-9]+$ && "${line_count}" -gt 220 ]]; then
  echo "skill entry 检查警告：${skill_md} 行数为 ${line_count}，建议保持入口精简并把细节放入 references/" >&2
fi

echo "skill entry 检查通过：references ok, lines=${line_count}"
