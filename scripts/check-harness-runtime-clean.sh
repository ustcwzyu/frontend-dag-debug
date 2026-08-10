#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

failures=()

count_entries() {
  local dir="$1"
  if [[ ! -d "${dir}" ]]; then
    echo 0
    return
  fi
  find "${dir}" -mindepth 1 -maxdepth 1 ! -name .gitkeep | wc -l | tr -d ' '
}

if [[ "${HARNESS_ALLOW_ACTIVE_DAG_RUNS:-}" != "1" ]]; then
  active_dag_count="$(count_entries ".harness/dag-runs/active")"
  [[ "${active_dag_count}" == "0" ]] || failures+=(".harness/dag-runs/active contains ${active_dag_count} entries")
fi

if [[ "${HARNESS_ALLOW_ACTIVE_TOOL_RUNS:-${HARNESS_ALLOW_ACTIVE_ONE_SHOT_RUNS:-}}" != "1" ]]; then
  active_run_count="$(count_entries ".harness/runs/active")"
  [[ "${active_run_count}" == "0" ]] || failures+=(".harness/runs/active contains ${active_run_count} entries")
fi

if [[ -d artifacts ]]; then
  artifact_count="$(find artifacts -mindepth 1 -maxdepth 1 ! -name .gitkeep | wc -l | tr -d ' ')"
  [[ "${artifact_count}" == "0" ]] || failures+=("root artifacts/ contains ${artifact_count} entries; use ai_workspace/loop-agent/reports or .harness run artifacts")
fi

if (( ${#failures[@]} > 0 )); then
  echo "[HARNESS RUNTIME DIRTY]" >&2
  for item in "${failures[@]}"; do
    echo "  - ${item}" >&2
  done
  exit 1
fi

echo "harness runtime clean check passed"
