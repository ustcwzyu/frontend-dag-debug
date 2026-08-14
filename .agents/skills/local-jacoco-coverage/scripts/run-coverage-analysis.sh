#!/usr/bin/env bash
# run-coverage-analysis.sh
# 端到端串联 Step 3：读取 requirement-source-mapping.json，对每个需求调一次
# `loop-agent coverage report`，把 Markdown 切片落到 --output-dir，并生成 index.md 汇总。
#
# 本脚本只调 CLI + 聚合文件，不自己解析 jacoco.xml、不算覆盖率数字。
# 需求：loop-agent 已安装并可在 PATH 中执行（或通过 --loop-agent 指定）。
#
# 用法：
#   bash run-coverage-analysis.sh \
#       --jacoco-xml <run-dir>/reports/jacoco.xml \
#       --mapping docs/test-reports/coverage/requirement-source-mapping.json \
#       --output-dir docs/test-reports/coverage \
#       [--loop-agent <path>] [--language java]
#
# 退出码：
#   0  全部需求切片成功（含 unavailable 标注）
#   2  参数错误
#   3  --jacoco-xml 不存在或为空
#   4  --mapping 不存在或不是合法 JSON
#   5  mapping 里 requirements 为空
#   *  继承最后一个 coverage report 的非零退出码

set -euo pipefail

log() { printf '[run-coverage-analysis] %s\n' "$*" >&2; }
die() { printf '[run-coverage-analysis] ERROR: %s\n' "$*" >&2; exit "${2:-1}"; }

JACOCO_XML=""
MAPPING=""
OUTPUT_DIR=""
LOOP_AGENT="${LOOP_AGENT:-loop-agent}"
LANGUAGE="java"

args=("$@")
for ((i = 0; i < ${#args[@]}; i++)); do
	case "${args[$i]}" in
		--jacoco-xml)
			((i + 1 < ${#args[@]})) || die "--jacoco-xml 需要一个值" 2
			JACOCO_XML="${args[$((i + 1))]}"; ((i++))
			;;
		--mapping)
			((i + 1 < ${#args[@]})) || die "--mapping 需要一个值" 2
			MAPPING="${args[$((i + 1))]}"; ((i++))
			;;
		--output-dir)
			((i + 1 < ${#args[@]})) || die "--output-dir 需要一个值" 2
			OUTPUT_DIR="${args[$((i + 1))]}"; ((i++))
			;;
		--loop-agent)
			((i + 1 < ${#args[@]})) || die "--loop-agent 需要一个值" 2
			LOOP_AGENT="${args[$((i + 1))]}"; ((i++))
			;;
		--language)
			((i + 1 < ${#args[@]})) || die "--language 需要一个值" 2
			LANGUAGE="${args[$((i + 1))]}"; ((i++))
			;;
		--help|-h)
			sed -n '2,30p' "$0"
			exit 0
			;;
		*)
			die "未知参数: ${args[$i]}" 2
			;;
	esac
done

[[ -n "$JACOCO_XML" ]] || die "缺少必填 --jacoco-xml <path>" 2
[[ -s "$JACOCO_XML" ]] || die "--jacoco-xml 不存在或为空: $JACOCO_XML" 3
[[ -n "$MAPPING" ]] || die "缺少必填 --mapping <path>" 2
[[ -f "$MAPPING" ]] || die "--mapping 不存在: $MAPPING" 4
[[ -n "$OUTPUT_DIR" ]] || die "缺少必填 --output-dir <path>" 2

command -v jq >/dev/null 2>&1 || die "需要 jq 来解析 mapping 文件" 2
command -v "$LOOP_AGENT" >/dev/null 2>&1 || die "找不到 loop-agent 可执行文件（可用 --loop-agent 指定）: $LOOP_AGENT" 2

mkdir -p "$OUTPUT_DIR"

# 校验 mapping 结构
req_count=$(jq '.requirements | length' "$MAPPING")
[[ "$req_count" -gt 0 ]] || die "mapping 里 requirements 为空" 5

log "jacoco xml : $JACOCO_XML"
log "mapping    : $MAPPING"
log "output dir : $OUTPUT_DIR"
log "loop-agent : $LOOP_AGENT"
log "requirements: $req_count"
log ""

INDEX="$OUTPUT_DIR/index.md"
{
	printf '%s\n\n' '# 需求覆盖率切片汇总'
	printf '%s\n' "- 输入: \`$JACOCO_XML\`"
	printf '%s\n' "- mapping: \`$MAPPING\`"
	printf '%s\n' "- 生成时间: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
	printf '%s\n' ''
	printf '%s\n' '| 需求 ID | source files | line | branch | function | 状态 | 切片文件 |'
	printf '%s\n' '| --- | ---: | ---: | ---: | ---: | --- | --- |'
} > "$INDEX"

last_exit=0
for ((i = 0; i < req_count; i++)); do
	ids_json=$(jq -c ".requirements[$i].ids" "$MAPPING")
	scope_json=$(jq -c ".requirements[$i].sourceScope" "$MAPPING")

	# 拼 CLI 参数
	req_args=()
	while IFS= read -r id; do
		[[ -n "$id" ]] && req_args+=(--requirement-id "$id")
	done < <(jq -r '.[]' <<<"$ids_json")

	scope_csv=$(jq -r '. | map(.) | join(",")' <<<"$scope_json")
	scope_n=$(jq -r 'length' <<<"$scope_json")
	first_id=$(jq -r '.[0]' <<<"$ids_json")

	out_file="$OUTPUT_DIR/${first_id}.md"
	log "[$((i + 1))/$req_count] $first_id  (source files: $scope_n)"

	# 调 runtime 归一化器
	if "$LOOP_AGENT" coverage report \
		--language "$LANGUAGE" \
		--input "$JACOCO_XML" \
		"${req_args[@]}" \
		--source-scope "$scope_csv" \
		--markdown \
		--output "$out_file"; then

		# 从产出的 markdown 里抓 line/branch/function 覆盖率（容错：抓不到就标 unavailable）
		line_pct=$(grep -iE '^\- *line' "$out_file" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 || true)
		branch_pct=$(grep -iE '^\- *branch' "$out_file" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 || true)
		func_pct=$(grep -iE '^\- *function' "$out_file" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 || true)
		status="COVERED"
		[[ -z "$line_pct" && -z "$branch_pct" ]] && status="unavailable/PARTIAL"

		printf '| %s | %d | %s | %s | %s | %s | [%s](%s) |\n' \
			"$first_id" "$scope_n" \
			"${line_pct:-unavailable}" "${branch_pct:-unavailable}" "${func_pct:-unavailable}" \
			"$status" "$first_id.md" "$first_id" >> "$INDEX"
	else
		last_exit=$?
		log "[$((i + 1))/$req_count] $first_id  coverage report 失败 (exit $last_exit)"
		printf '| %s | %d | - | - | - | ERROR(exit %d) | - |\n' "$first_id" "$scope_n" "$last_exit" >> "$INDEX"
	fi
done

log ""
log "汇总已写入: $INDEX"
exit "$last_exit"
