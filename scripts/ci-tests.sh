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

if [[ -f package.json ]]; then
  if command -v npm >/dev/null 2>&1; then
    for script in lint typecheck test build; do
      if has_npm_script "${script}"; then
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
  echo "loop-agent 治理检查仍可运行；请让初始化模型根据目标项目技术栈补充 scripts/ci-tests.sh 与 docs/verification-matrix.md。"
fi

if (( ${#notes[@]} > 0 )); then
  echo "项目验证探测备注："
  for note in "${notes[@]}"; do
    echo "  - ${note}"
  done
fi
