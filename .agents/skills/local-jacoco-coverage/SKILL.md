---
name: local-jacoco-coverage
description: >-
  本地对 Java 后端服务做代码覆盖率检测与分析的端到端编排 skill。在本地或测试环境启动后端服务并挂载 JaCoCo
  agent（tcpserver 模式），随后用 loop-agent 的 backend-test DAG 跑后端测试，最后把 dump 出的 JaCoCo
  报告与需求文档（PRD/AC/BR）对齐做覆盖率切片分析。用于：本地 jacoco 覆盖率、需求覆盖率分析、Java 服务覆盖率、
  后端测试覆盖率、backend-test jacoco、本地挂 jacocoagent、覆盖率对照需求。
  触发词：本地覆盖率检测、覆盖率分析、jacoco 覆盖率、后端代码覆盖率、需求覆盖率、挂载 jacocoagent、
  local coverage analysis、jacoco tcpserver dump、backend-test 覆盖率分析、按需求分析覆盖率。
references:
  - path: references/runtime-alignment.md
    required: true
  - path: references/requirement-to-source-mapping.md
    required: true
---

# Local JaCoCo Coverage（本地 Java 后端覆盖率检测与分析）

本 skill 是**编排型操作手册**，不是覆盖率引擎本身。它复用 loop-agent runtime 已内置的 JaCoCo 收集与归一化能力，把"起服务挂 agent → 跑后端测试 DAG → 结合需求分析覆盖率"三件事串成一条可审计、可重复、可验证的本地链路。**禁止重造 runtime 已有的 dump/parse/归一化逻辑**；细节字段真源见 `references/runtime-alignment.md`。

## 默认立场

- 三阶段顺序强约束：**① 起服务挂 agent → ② 跑 backend-test DAG → ③ dump + 按需求切片分析**。前一阶段未拿到可验证证据前，不得进入下一阶段。
- JaCoCo agent 只在**测试环境**挂载；**生产环境严禁**挂载 `address=0.0.0.0` 的 tcpserver。
- `includes` 必须显式写**业务包名**（如 `com.yourcompany.*`）；用默认 `*` 会把 Spring/Tomcat 等框架也算进去，覆盖率虚低、无参考价值。
- 覆盖率数据不是"通过/失败"判据，是**质量观测**。pytest 与 backend-test DAG 的执行结论以 backend-test DAG 本身的 shell verification 为准；JaCoCo 收集**全程失败安全**，任一环节出错都不阻断测试（见 `references/runtime-alignment.md` 容错表）。
- 需求覆盖率分析必须基于**真实的需求 ID**（`REQ-*`/`BR-*`/`AC-*`）与**真实的源码路径**；禁止凭需求文档文本臆测代码路径或编造覆盖率数字。
- 本 skill 不写业务代码、不修改生产配置、不写 `.env` 或 credential 文件；它只在测试环境启动 Java 服务、运行 loop-agent CLI、产出 `reports/` 与 `docs/test-reports/` 下的报告。

## 前置确认（BLOCKING）

进入 Step 1 前，必须与用户确认以下事实，缺一项则停下询问，不要猜：

| 项 | 说明 | 示例 |
| --- | --- | --- |
| Java 服务仓库与启动方式 | 能否加 JVM 启动参数（mvn / java -jar / docker） | `mvn spring-boot:run` |
| 业务包名 | JaCoCo `includes` 的过滤前缀，**强烈建议显式指定** | `com.coms.bpm.*` |
| jacocoagent.jar 路径 | Java 服务所在机器上的 agent jar 绝对路径 | `/opt/jacoco/jacocoagent.jar` |
| jacococli.jar 路径 | **跑 backend-test 的机器**上的 cli jar 绝对路径（用于 `.exec → xml`） | `/opt/jacoco/jacococli.jar` |
| dump 端口 | tcpserver 监听端口，需与 backend-test 机器连通 | `6300` |
| loop-agent 控制器 | 已发布的 npm 包版本，按 AGENTS.md 记录实际版本 | `loop-agent --version` |
| 需求文档 | PRD / 用户故事 / AC / BR 的路径，Step 3 切片分析的输入 | `docs/product-analysis/<id>/product-requirement.md` |

确认后**回显**给用户："分析范围：业务包 `<X>`，agent 端口 `<port>`，cli jar `<path>`，需求文档 `<path>`"。

## Step 1：本地启动后端服务并挂载 JaCoCo agent（tcpserver）

目标：让 Java 服务在测试期间把执行数据暴露成一个可被 backend-test DAG 跨网络 dump 的 tcpserver。

### 1.1 用封装脚本启动（推荐）

```bash
# <skill-root> 解析为本 SKILL.md 所在目录
bash <skill-root>/scripts/start-jacoco-agent.sh \
  --agent-jar /opt/jacoco/jacocoagent.jar \
  --includes "com.yourcompany.*" \
  --port 6300 \
  -- mvn spring-boot:run
# 或直接 java -jar：
# bash <skill-root>/scripts/start-jacoco-agent.sh ... -- java -jar your-app.jar
```

脚本只做三件事：校验 `--agent-jar` 存在、拼装 `-javaagent:...=output=tcpserver,address=0.0.0.0,port=<port>,includes=<pkg>,append=false`、把 `--` 之后的原始启动命令交给 exec。**它不会修改你的启动命令语义**，只前置 agent 参数。

### 1.2 等价的手工写法（脚本不可用时）

```bash
java -javaagent:/opt/jacoco/jacocoagent.jar=output=tcpserver,address=0.0.0.0,port=6300,includes=com.yourcompany.*,append=false \
     -jar your-app.jar
```

Maven 项目：

```bash
JACOCO_AGENT="$HOME/.m2/repository/org/jacoco/org.jacoco.agent/0.8.12/org.jacoco.agent-0.8.12-runtime.jar"
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-javaagent:${JACOCO_AGENT}=output=tcpserver,address=0.0.0.0,port=6300,includes=com.yourcompany.*,append=false"
```

Docker：

```dockerfile
ENV JAVA_TOOL_OPTIONS="-javaagent:/opt/jacoco/jacocoagent.jar=output=tcpserver,address=0.0.0.0,port=6300,includes=com.yourcompany.*,append=false"
```

```bash
docker run -p 8080:8080 -p 6300:6300 your-image
```

### 1.3 自检（BLOCKING，必须通过才进 Step 2）

```bash
# Java 服务进程里确实带了 jacocoagent
ps aux | grep -i jacocoagent | grep -v grep

# 端口对 backend-test 机器放行（在 backend-test 机器上跑）
nc -zv <java-service-host> 6300
```

`address` 必须是 `0.0.0.0`（跨机器可达）；设成 `127.0.0.1` 则 backend-test 连不上。安全组只放行 backend-test 机器。

> 字段含义、参数取值、安全约束的真源见 `references/runtime-alignment.md` 与项目 `docs/operations/backend-test-jacoco-coverage.md`。

## Step 2：启动后端测试 DAG（backend-test）

目标：让 backend-test DAG 在 Step 7（`execute-backend-pytest-and-html-report-shell`）跑完 pytest，并跨网络 dump JaCoCo 数据。backend-test DAG 是固定 9 节点 Markdown-first 工作流，真源见 `docs/runtime/backend-test-workflow.md`。

### 2.1 建任务并进 writeSet gate

```bash
loop-agent task advance <task-id> "后端测试 + JaCoCo 覆盖率" \
  --task-kind backend-test \
  --prd <需求或测试范围 PRD> \
  --allowed-path "testcase/**" \
  --forbidden-path ".harness/**" \
  --verify "<label>:<项目 AGENTS.md 登记的后端测试命令>" \
  --json
```

`--task-kind backend-test` 是选用该 DAG 的唯一方式（**不是** `--profile`）。`--verify` 命令必须取自目标项目 `AGENTS.md` / `docs/governance/verification-matrix.md` 登记的命令，不要假定 `pytest` 存在。

### 2.2 审查返回的 writeSet / gate.digest，批准并长跑

```bash
loop-agent task advance <task-id> \
  --approve-gate "write-set-review:<digest>" \
  --json
```

### 2.3 在 task.json 注入 jacocoCoverage（让节点 7 自动 dump）

backend-test DAG 默认**不会**收集 JaCoCo，除非任务的执行节点 shell 配置里带 `jacocoCoverage`。字段 schema 真源：`src/workflows/dag/types.ts` 的 `dagShellConfigSchema`。

在 `.harness/tasks/<task-id>/task.json` 的执行节点（`execute-backend-pytest-and-html-report-shell`）`shell` 里加：

```json
{
  "id": "execute-backend-pytest-and-html-report-shell",
  "shell": {
    "backendTestPipeline": "markdown-execute-html",
    "jacocoCoverage": {
      "endpoint": "<java-service-host>:6300",
      "cliJarPath": "/opt/jacoco/jacococli.jar",
      "includes": "com.yourcompany.*",
      "connectTimeoutMs": 5000
    }
  }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `endpoint` | 是 | JaCoCo tcpserver 地址，`host:port`，**必须**与 Step 1.3 自检通过的一致 |
| `cliJarPath` | 是 | **backend-test 机器**上 `jacococli.jar` 的绝对路径，用于 `.exec → jacoco.xml` |
| `includes` | 否 | 业务包过滤，默认 `*`（**强烈建议显式指定业务包名**，与 Step 1 一致） |
| `connectTimeoutMs` | 否 | TCP 连接超时，默认 `5000` |

> 注入时机：若在 Step 2.1 之前注入，`task advance` 会 strict validate 时就带上；若事后补，需重新 `task advance` 触发 DAG 校验。**不要**在 DAG 执行期间修改 task.json。

### 2.4 持续监视直到终态

```bash
loop-agent task status <task-id> --json
```

判活用可靠方式：`state.json` 的 `runner.heartbeatAt` 持续刷新 + `session-events.jsonl` 增长 + `dag doctor` 的 `liveness`，不要只靠进程过滤。主 agent 必须持续轮询直到 FINISHED / FAILED / 需要 approve，**不能**轮询一次就走。

### 2.5 产物（DAG run 目录 `.harness/dag-runs/<run-id>/` 下）

- `reports/jacoco.exec` — dump 出的执行数据
- `reports/jacoco.xml` — cli 转换后的 XML（**Step 3 的输入**）
- `contracts/code-coverage-v1.json` — runtime 解析后的归一化契约
- `reports/backend-test-l5-dashboard.html` — L-5 dashboard，line/branch 覆盖率已从 unavailable 变为真实数值

**BLOCKING**：进 Step 3 前确认 `reports/jacoco.xml` 存在且非空。若 Step 2.5 没有 `jacoco.xml`，说明 JaCoCo 收集降级了，按 `references/runtime-alignment.md` 的"排查清单"先修，不要带着空数据做分析。

## Step 3：结合需求文档做覆盖率切片分析

目标：把 Step 2 的 `jacoco.xml` 与需求文档对齐，产出"每个需求覆盖了哪些代码、覆盖率多少、哪些需求路径完全没被测试触达"的切片报告。

### 3.1 把需求映射成可切片的 scope（必读）

先读 `references/requirement-to-source-mapping.md`。核心约束：

- 需求 ID 必须是 `REQ-*` / `BR-*` / `AC-*` 形态（runtime 归一化器的正则要求）。PRD 里的章节标题、用户故事编号要先归一化成这三类前缀。
- `--source-scope` 必须是**真实存在的源码相对路径**（相对仓库根，逗号分隔）。禁止从需求文本猜路径；路径必须来自 Step 2 的 backend-test facts 或对仓库的定向事实搜索（`rg`/CodeGraph）。
- 一个需求 ↔ 一组源码路径的映射，是一次**可审计的决策**，不是模型自由发挥。

### 3.2 用 runtime 归一化器产出按需求切片的覆盖率

`loop-agent coverage report` 是 runtime 提供的归一化 CLI（真源 `src/commands/coverage-report.ts`、`src/workflows/dag/backend-test-coverage-contract.ts`）。它接收 `jacoco.xml` + 需求 ID + 源码 scope，输出结构化契约或 Markdown：

```bash
loop-agent coverage report \
  --language java \
  --input <run-dir>/reports/jacoco.xml \
  --requirement-id BR-CREATE-ORDER \
  --requirement-id AC-CREATE-ORDER-001 \
  --source-scope src/main/java/com/yourcompany/order/OrderService.java,src/main/java/com/yourcompany/order/OrderController.java \
  --markdown \
  --output docs/test-reports/coverage/BR-CREATE-ORDER.md
```

参数：

| 参数 | 说明 |
| --- | --- |
| `--language java` | **必须** `java`（本 skill 只处理 Java/JaCoCo） |
| `--input` | Step 2.5 的 `jacoco.xml`，**仓库根相对 POSIX 路径**（runtime 拒绝绝对路径：`artifact path must be a safe relative POSIX path`） |
| `--requirement-id` | 可重复；格式 `REQ-*`/`BR-*`/`AC-*`；来自需求文档归一化 |
| `--source-scope` | 逗号分隔的源码相对路径；来自事实搜索，不是猜测 |
| `--markdown` / `--json` | 输出格式，二选一 |
| `--output` | 输出文件路径；省略则打到 stdout |
| `--commit` / `--expected-sha256` | 可选，绑定 commit 与 artifact 指纹做审计 |

### 3.3 端到端串联（多需求批量切片）

```bash
bash <skill-root>/scripts/run-coverage-analysis.sh \
  --jacoco-xml <run-dir>/reports/jacoco.xml \
  --mapping docs/test-reports/coverage/requirement-source-mapping.json \
  --output-dir docs/test-reports/coverage
```

`requirement-source-mapping.json` 是你在 3.1 产出的映射，格式：

```json
{
  "requirements": [
    {
      "ids": ["BR-CREATE-ORDER", "AC-CREATE-ORDER-001"],
      "sourceScope": [
        "src/main/java/com/yourcompany/order/OrderService.java",
        "src/main/java/com/yourcompany/order/OrderController.java"
      ]
    },
    {
      "ids": ["BR-CANCEL-ORDER"],
      "sourceScope": [
        "src/main/java/com/yourcompany/order/OrderService.java"
      ]
    }
  ]
}
```

脚本对每个需求调一次 `loop-agent coverage report`，产物落到 `--output-dir/<first-id>.md`，并生成一份汇总 `index.md`（列出每个需求的 line/branch/function 覆盖率与 `unavailable` 标记）。脚本**只调 CLI + 聚合文件**，不自己解析 XML、不算覆盖率。

### 3.4 解读与 GAP 标注

分析结论必须区分：

- **COVERED**：scope 内文件在 `jacoco.xml` 里有命中，覆盖率数值有效。
- **PARTIAL**：scope 内部分文件有命中、部分文件 0 命中或不在 artifact 里。
- **GAP**：scope 内文件完全没被任何测试触达（`jacoco.xml` 里该文件 counter 全 0 或缺失）→ 这是**测试缺口**，不是"覆盖率低"，应回灌到 backend-test 的 Coverage Matrix 作为 `GAP`。
- **unavailable**：JaCoCo 收集本身降级（endpoint 不通、cli 缺失等）→ 先修基础设施，不要把 unavailable 当成 0% 写进报告。

## 完成规则

- Step 1 必须有 `ps`/`nc` 自检证据；Step 2 必须有 backend-test DAG 终态 + `reports/jacoco.xml` 非空证据；Step 3 每个需求的覆盖率必须来自 `loop-agent coverage report` 的真实输出，不得手写数字。
- 没有新鲜验证证据不声明完成；`unavailable` 必须如实标注并给出排查动作。
- 产物路径默认 `docs/test-reports/coverage/`；写入前确认目录与项目写入边界一致。
- 安全收尾：测试结束后建议关闭 Java 服务的 jacocoagent（重启服务不带 `-javaagent`），回收 `6300` 端口放行。

## 排查速查

覆盖率是 `unavailable` 或全 0？按顺序：

1. Java 服务进程参数里有没有 `jacocoagent`？（`ps aux | grep jacocoagent`）
2. `address` 是不是 `0.0.0.0`？端口对 backend-test 机器放行了吗？（`nc -zv <host> 6300`）
3. `includes` 业务包名写对了吗？（写错 → 统计到 0 个类）
4. `jacocoCoverage.endpoint` 与 Step 1 的 `host:port` 一致吗？
5. `jacocoCoverage.cliJarPath` 路径正确且 `java -jar <cli> --help` 可用吗？
6. agent 与 cli 版本一致吗？（都 `0.8.12`）

详见 `references/runtime-alignment.md`。

## References

- Required：`references/runtime-alignment.md`、`references/requirement-to-source-mapping.md`
- 项目级真源（只读引用，不复制）：`docs/operations/backend-test-jacoco-coverage.md`（落地手册）、`docs/runtime/backend-test-workflow.md`（DAG 真源）、`src/workflows/dag/types.ts`（`jacocoCoverage` schema）、`src/commands/coverage-report.ts`（`coverage report` CLI）
