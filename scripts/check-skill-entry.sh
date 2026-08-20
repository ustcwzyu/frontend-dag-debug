#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

check_skill() {
  local skill_name="$1"
  shift
  local skill_dir=".agents/skills/${skill_name}"
  local skill_md="${skill_dir}/SKILL.md"
  local missing=()

  if [[ ! -f "${skill_md}" ]]; then
    echo "skill entry 检查失败：缺少 ${skill_md}" >&2
    exit 1
  fi
  grep -Eq "^name:[[:space:]]*${skill_name}[[:space:]]*$" "${skill_md}" || missing+=("frontmatter name")
  grep -Eq '^description:[[:space:]]*[^[:space:]]' "${skill_md}" || missing+=("frontmatter description")

  local ref
  for ref in "$@"; do
    [[ -f "${skill_dir}/${ref}" ]] || missing+=("${ref}")
    grep -Fq "${ref}" "${skill_md}" || missing+=("SKILL.md -> ${ref}")
  done
  if (( ${#missing[@]} > 0 )); then
    echo "skill entry 检查失败（${skill_name}）：" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    exit 1
  fi

  local line_count
  line_count="$(wc -l < "${skill_md}" | tr -d ' ')"
  if [[ "${line_count}" =~ ^[0-9]+$ && "${line_count}" -gt 180 ]]; then
    echo "skill entry 检查失败：${skill_md} 行数为 ${line_count}，入口应保持精简" >&2
    exit 1
  fi
  echo "skill entry 检查通过：${skill_name} references ok, lines=${line_count}"
}

check_skill "loop-agent" \
  "references/harness-policy.md" \
  "references/hybrid-dag.md" \
  "references/verification-and-failure-handling.md" \
  "references/command-reference.md" \
  "references/source-and-plan-practice.md"
check_skill "agent-worker" "references/agent-worker-operator.md"

# loop-agent description is a YAML folded block (>-); grep ^description: only
# captures the indicator line. Validate the general-demand trigger terms
# against the whole skill file so host auto-discovery phrasing cannot drift.
loop_agent_skill=".agents/skills/loop-agent/SKILL.md"
loop_agent_text="$(tr '[:upper:]' '[:lower:]' < "${loop_agent_skill}")"
for term in "loop-agent 帮我完成" "帮我实现" "帮我修复" "帮我开发" "agent dag" "task advance" "task status" "dag validate" "dag execute"; do
  if [[ "${loop_agent_text}" != *"${term}"* ]]; then
    echo "skill entry 检查失败（loop-agent）：description 缺少触发/路由词 ${term}" >&2
    exit 1
  fi
done

description_line="$(grep -E '^description:' .agents/skills/agent-worker/SKILL.md | head -n 1 | tr '[:upper:]' '[:lower:]')"
for term in "agent-worker" "feature packet" "taskspec" "task pool" "self-host" "candidate" "loop-agent"; do
  if [[ "${description_line}" != *"${term}"* ]]; then
    echo "skill entry 检查失败（agent-worker）：description 缺少触发/路由词 ${term}" >&2
    exit 1
  fi
done
