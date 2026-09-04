#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

ran=0
notes=()

run_cmd() {
  echo "==> $*"
  "$@"
  ran=1
}

run_bash() {
  echo "==> $*"
  bash -lc "$*"
  ran=1
}

has_make_target() {
  local target="$1"
  [[ -f Makefile || -f makefile ]] || return 1
  grep -Eq "^[[:alnum:]_.-]*${target}[[:alnum:]_.-]*:" Makefile makefile 2>/dev/null
}

has_npm_script() {
  local script="$1"
  [[ -f package.json ]] || return 1
  command -v node >/dev/null 2>&1 || return 1
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1)" "${script}" >/dev/null 2>&1
}

dag_lint_assessment_allows_skip() {
  [[ -n "${HARNESS_DAG_RUN_DIR:-}" ]] || return 1
  command -v node >/dev/null 2>&1 || return 1
  node - "${HARNESS_DAG_RUN_DIR}" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const runDir = path.resolve(process.argv[2]);
const assessmentPath = path.join(runDir, "contracts", "frontend-lint-assessment.json");
const fail = () => process.exit(1);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readContained = (relative) => {
  if (typeof relative !== "string" || path.isAbsolute(relative)) fail();
  const absolute = path.resolve(runDir, relative);
  if (absolute !== runDir && !absolute.startsWith(runDir + path.sep)) fail();
  return fs.readFileSync(absolute);
};
let assessment;
try {
  assessment = JSON.parse(fs.readFileSync(assessmentPath, "utf8"));
} catch {
  fail();
}
if (
  assessment.schemaVersion !== 1 ||
  assessment.schemaId !== "frontend-lint-assessment-v1" ||
  !["passed", "baseline-debt"].includes(assessment.status) ||
  !assessment.commandIdentity ||
  !Array.isArray(assessment.commandIdentity.commands) ||
  assessment.commandIdentity.commands.length === 0 ||
  !Array.isArray(assessment.writerChangedFiles) ||
  !Array.isArray(assessment.blockingDiagnostics) ||
  assessment.blockingDiagnostics.length !== 0 ||
  !Array.isArray(assessment.blockingReasons) ||
  assessment.blockingReasons.length !== 0
) fail();
const commandHash = sha256(JSON.stringify(assessment.commandIdentity.commands));
if (commandHash !== assessment.commandIdentity.sha256) fail();
if (!assessment.commandIdentity.commands.every((command) =>
  /(?:^|[\s'"])npm(?:['"])?\s+(?:['"])?run(?:['"])?\s+(?:['"])?lint(?:['"])?(?:\s|$)/.test(command)
)) fail();
if (
  (assessment.status === "passed" && assessment.currentExitCode !== 0) ||
  (assessment.status === "baseline-debt" && assessment.currentExitCode === 0)
) fail();
if (!assessment.baselineRef || assessment.baselineRef.nodeId !== "frontend-writer-admission-shell") fail();
const baselineRaw = readContained(assessment.baselineRef.path);
if (sha256(baselineRaw) !== assessment.baselineRef.sha256) fail();
let baseline;
try {
  baseline = JSON.parse(baselineRaw);
} catch {
  fail();
}
if (
  baseline.schemaVersion !== 1 ||
  baseline.schemaId !== "frontend-lint-baseline-v1" ||
  baseline.status !== "available" ||
  baseline.commandIdentity?.sha256 !== assessment.commandIdentity.sha256
) fail();
if (assessment.status === "baseline-debt") {
  if (
    !Array.isArray(assessment.currentDiagnostics) ||
    assessment.currentDiagnostics.length === 0 ||
    assessment.currentDiagnostics.length !== assessment.toleratedDiagnosticCount ||
    !Array.isArray(baseline.diagnostics)
  ) fail();
  const key = (item) => JSON.stringify([
    item.file, item.line, item.column, item.severity, item.message, item.ruleId ?? null,
  ]);
  const baselineCounts = new Map();
  for (const item of baseline.diagnostics) {
    const value = key(item);
    baselineCounts.set(value, (baselineCounts.get(value) || 0) + 1);
  }
  const changed = new Set(assessment.writerChangedFiles);
  for (const item of assessment.currentDiagnostics) {
    if (changed.has(item.file)) fail();
    const value = key(item);
    const count = baselineCounts.get(value) || 0;
    if (count === 0) fail();
    baselineCounts.set(value, count - 1);
  }
}
if (!Array.isArray(assessment.rawEvidenceRefs) || assessment.rawEvidenceRefs.length === 0) fail();
for (const ref of assessment.rawEvidenceRefs) {
  if (sha256(readContained(ref.path)) !== ref.sha256) fail();
}
process.exit(0);
NODE
}

if [[ -f package.json ]]; then
  if command -v npm >/dev/null 2>&1; then
    for script in lint typecheck test build; do
      if has_npm_script "${script}"; then
        if [[ "${script}" == "lint" ]] && dag_lint_assessment_allows_skip; then
          echo "==> lint handled by frontend DAG assessment (status: passed or baseline-debt)"
          ran=1
          continue
        fi
        run_cmd npm run "${script}"
      fi
    done
  else
    notes+=("package.json exists but npm is not available")
  fi
fi

if has_make_target verify; then
  run_cmd make verify
elif has_make_target test; then
  run_cmd make test
fi

if [[ -f go.mod ]]; then
  if command -v go >/dev/null 2>&1; then
    run_cmd go test ./...
  else
    notes+=("go.mod exists but go is not available")
  fi
fi

if [[ -f Cargo.toml ]]; then
  if command -v cargo >/dev/null 2>&1; then
    run_cmd cargo test
  else
    notes+=("Cargo.toml exists but cargo is not available")
  fi
fi

if [[ -f pyproject.toml || -f pytest.ini || -f tox.ini ]]; then
  if command -v pytest >/dev/null 2>&1; then
    run_cmd pytest
  elif command -v tox >/dev/null 2>&1 && [[ -f tox.ini ]]; then
    run_cmd tox
  else
    notes+=("Python project metadata found but pytest/tox is not available")
  fi
fi

if [[ -f pom.xml ]]; then
  if command -v mvn >/dev/null 2>&1; then
    run_cmd mvn test
  else
    notes+=("pom.xml exists but mvn is not available")
  fi
fi

if [[ -f build.gradle || -f build.gradle.kts || -f settings.gradle || -f settings.gradle.kts ]]; then
  if [[ -x ./gradlew ]]; then
    run_cmd ./gradlew test
  elif command -v gradle >/dev/null 2>&1; then
    run_cmd gradle test
  else
    notes+=("Gradle project metadata found but gradle/gradlew is not available")
  fi
fi

if compgen -G "*.sln" >/dev/null || compgen -G "*.csproj" >/dev/null; then
  if command -v dotnet >/dev/null 2>&1; then
    run_cmd dotnet test
  else
    notes+=(".NET project metadata found but dotnet is not available")
  fi
fi

if (( ran == 0 )); then
  echo "未检测到可安全自动运行的项目测试入口。"
  echo "loop-agent 治理检查仍可运行；请让初始化模型根据目标项目技术栈补充 scripts/ci-tests.sh 与 ai_workspace/loop-agent/verification-matrix.md。"
fi

if (( ${#notes[@]} > 0 )); then
  echo "项目验证探测备注："
  for note in "${notes[@]}"; do
    echo "  - ${note}"
  done
fi
