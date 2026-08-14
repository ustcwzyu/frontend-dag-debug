#!/usr/bin/env bash
# start-jacoco-agent.sh
# 在本地/测试环境启动 Java 后端服务并挂载 JaCoCo agent（tcpserver 模式）。
# 本脚本只做三件事：校验 --agent-jar 存在、拼装 -javaagent 参数、把 -- 之后的原始启动命令交给 exec。
# 它不修改启动命令的语义，只前置 agent 参数。
#
# 用法：
#   bash start-jacoco-agent.sh --agent-jar <path> [--includes <pkg>] [--port <n>]
#                              [--address <ip>] [--append <bool>] -- <启动命令...>
# 示例：
#   bash start-jacoco-agent.sh --agent-jar /opt/jacoco/jacocoagent.jar \
#       --includes "com.yourcompany.*" --port 6300 -- mvn spring-boot:run
#   bash start-jacoco-agent.sh --agent-jar /opt/jacoco/jacocoagent.jar \
#       --includes "com.yourcompany.*" -- java -jar your-app.jar
#
# 退出码：
#   0  服务正常退出
#   2  参数错误
#   3  --agent-jar 不存在
#   4  未提供 -- 之后的启动命令
#   *  继承被启动命令的退出码

set -euo pipefail

log() { printf '[start-jacoco-agent] %s\n' "$*" >&2; }
die() { printf '[start-jacoco-agent] ERROR: %s\n' "$*" >&2; exit "${2:-1}"; }

AGENT_JAR=""
INCLUDES="*"
PORT="6300"
ADDRESS="0.0.0.0"
APPEND="false"
SEPARATOR_IDX=-1

args=("$@")
for ((i = 0; i < ${#args[@]}; i++)); do
	case "${args[$i]}" in
		--agent-jar)
			((i + 1 < ${#args[@]})) || die "--agent-jar 需要一个值" 2
			AGENT_JAR="${args[$((i + 1))]}"
			((i++))
			;;
		--includes)
			((i + 1 < ${#args[@]})) || die "--includes 需要一个值" 2
			INCLUDES="${args[$((i + 1))]}"
			((i++))
			;;
		--port)
			((i + 1 < ${#args[@]})) || die "--port 需要一个值" 2
			PORT="${args[$((i + 1))]}"
			((i++))
			;;
		--address)
			((i + 1 < ${#args[@]})) || die "--address 需要一个值" 2
			ADDRESS="${args[$((i + 1))]}"
			((i++))
			;;
		--append)
			((i + 1 < ${#args[@]})) || die "--append 需要一个值" 2
			APPEND="${args[$((i + 1))]}"
			((i++))
			;;
		--)
			SEPARATOR_IDX=$((i + 1))
			break
			;;
		--help|-h)
			sed -n '2,30p' "$0"
			exit 0
			;;
		*)
			die "未知参数: ${args[$i]}（启动命令请放在 -- 之后）" 2
			;;
	esac
done

[[ -n "$AGENT_JAR" ]] || die "缺少必填 --agent-jar <path>" 2
[[ -f "$AGENT_JAR" ]] || die "--agent-jar 不存在: $AGENT_JAR" 3
[[ "$SEPARATOR_IDX" -ge 0 && "$SEPARATOR_IDX" -lt ${#args[@]} ]] || die "未提供 -- 之后的启动命令" 4

# 拼装 -javaagent 参数（JaCoCo tcpserver 模式）
AGENT_OPTS="output=tcpserver,address=${ADDRESS},port=${PORT},includes=${INCLUDES},append=${APPEND}"
JAVA_AGENT="-javaagent:${AGENT_JAR}=${AGENT_OPTS}"

# 取出 -- 之后的启动命令
launch=("${args[@]:$SEPARATOR_IDX}")
[[ ${#launch[@]} -gt 0 ]] || die "-- 之后没有启动命令" 4

log "agent jar     : $AGENT_JAR"
log "agent options : $AGENT_OPTS"
log "launch command: ${launch[*]}"
log ""
log "⚠️  JaCoCo agent 仅限测试环境；生产环境严禁挂载。"
log "⚠️  address=$ADDRESS 意味着任何能访问 $PORT 的机器都能 dump，请用安全组限制。"
log ""

# 若启动命令是 java*，直接前置 -javaagent；
# 若是 mvn*，转成 -Dspring-boot.run.jvmArguments（Spring Boot Maven 插件约定）；
# 其它命令：前置 JAVA_TOOL_OPTIONS（最通用，但无法覆盖命令里已有的 -javaagent）。
case "${launch[0]}" in
	java)
		exec "${launch[0]}" "$JAVA_AGENT" "${launch[@]:1}"
		;;
	mvn)
		exec "${launch[0]}" "${launch[@]:1}" "-Dspring-boot.run.jvmArguments=$JAVA_AGENT"
		;;
	*)
		JAVA_TOOL_OPTIONS="$JAVA_AGENT" exec "${launch[@]}"
		;;
esac
