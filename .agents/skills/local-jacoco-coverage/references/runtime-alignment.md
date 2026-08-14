# Runtime Alignment — 与 loop-agent runtime 的字段与契约真源对齐

本 skill 不重新定义 runtime 字段，只把"本 skill 用到的字段"映射到 runtime 真源，避免漂移。**字段含义以本表"真源"列为准；本 skill 文档与之冲突时，以真源为准。**

## 1. backend-test DAG 的 `jacocoCoverage`（Step 2 注入字段）

| 字段 | 类型 | 必填 | 默认 | 真源 |
| --- | --- | --- | --- | --- |
| `endpoint` | `string`（`host:port`） | 是 | — | `src/workflows/dag/types.ts` `dagShellConfigSchema.jacocoCoverage.endpoint` |
| `cliJarPath` | `string`（绝对路径） | 是 | — | `src/workflows/dag/types.ts` `jacocoCoverage.cliJarPath` |
| `includes` | `string` | 否 | `*` | `src/workflows/dag/types.ts` `jacocoCoverage.includes` |
| `connectTimeoutMs` | `number`（正整数） | 否 | `5000` | `src/workflows/dag/types.ts` `jacocoCoverage.connectTimeoutMs` |

注入位置：task.json 的执行节点 `execute-backend-pytest-and-html-report-shell` 的 `shell` 块。该节点 pipeline 必须是 `markdown-execute-html`。

## 2. runtime 收集链路（本 skill 不重造）

```text
Java 服务启动挂 jacocoagent.jar (output=tcpserver)
        │ pytest 跑完，HTTP 请求覆盖 Java 代码
        ▼
backend-test 节点 7 跨网络 TCP 连 host:<port>，dump 出 reports/jacoco.exec
        │  collectJacocoCoverage (backend-test-markdown-workflow.ts)
        ▼
jacococli.jar 把 .exec 转成 reports/jacoco.xml
        │
        ▼
parseJacocoXml → contracts/code-coverage-v1.json (backend-test-coverage-contract.ts)
        │
        ▼
computeL5ReportMetrics → reports/backend-test-l5-dashboard.html
```

真源：
- `src/workflows/dag/backend-test-markdown-workflow.ts` — `collectJacocoCoverage`
- `src/workflows/dag/backend-test-coverage-contract.ts` — `parseJacocoXml`、`readCoverageArtifact`、`formatCoverageMarkdown`
- `src/executors/shell-executor.ts` — 节点 7 `markdown-execute-html` pipeline

## 3. JaCoCo agent 启动参数（Step 1）

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| `output` | `tcpserver` | **必须**；默认 file 模式跨网络读不到 |
| `address` | `0.0.0.0` | 测试环境允许跨机器；**生产禁用** |
| `port` | `6300`（约定，可改） | 需与 `jacocoCoverage.endpoint` 一致 |
| `includes` | `<业务包>.*` | **必须改**；默认 `*` 会统计框架代码 |
| `append` | `false` | 每次 dump 后重置，保本轮增量 |

版本约定：agent 与 cli 都用 `0.8.12`（或同版本），版本不一致会导致 `.exec` 无法解析。

## 4. `loop-agent coverage report`（Step 3 CLI）

真源：`src/commands/coverage-report.ts`、`src/workflows/dag/backend-test-coverage-contract.ts`。

```
loop-agent coverage report \
  --language java \
  --input <jacoco.xml> \
  [--requirement-id REQ-...|BR-...|AC-...] (可重复) \
  [--source-scope path1,path2] \
  [--commit <sha>] [--expected-sha256 <sha256>] \
  [--tool-version <ver>] \
  [--json|--markdown] \
  [--output <path>]
```

约束（来自 `backend-test-coverage-contract.ts` 的 zod schema）：

- `--requirement-id` 正则：`^(?:REQ|BR|AC)-[A-Z0-9]+(?:-[A-Z0-9]+)*$`。不合规的 ID 会被拒绝。
- `--source-scope` 路径不得含 `..`（unsafe source scope path）。
- `--language java` 时输入必须是 JaCoCo XML；`--language python` 时输入必须是 coverage.py JSON。本 skill 只用 `java`。
- 输出契约字段：`sourceScope.requirementIds`、`sourceScope.paths`、line/branch/function 三类 `{ covered, missed, total, percent }`、`artifact.sha256`、`missingData[]`。

`missingData` 可能值（决定 PARTIAL/unavailable 标注）：

- `source-scope-requirement-id-missing` — 没给 `--requirement-id`
- `source-scope-not-found-in-artifact` — `--source-scope` 的路径在 artifact 里完全找不到

## 5. 容错表（JaCoCo 收集失败安全）

来自 `docs/operations/backend-test-jacoco-coverage.md`。任一环节出错都**不阻断** pytest 与 L-5 报告：

| 失败场景 | 结果 |
| --- | --- |
| `endpoint` 不通 / 端口未放行 | coverage 降级 `unavailable` |
| `jacococli.jar` 缺失或执行失败 | coverage 降级 `unavailable` |
| Java 服务没挂 agent | dump 拿到空数据，coverage 降级 `unavailable` |
| `jacoco.xml` 解析失败 | coverage 降级 `unavailable` |
| task 未配置 `jacocoCoverage` | 完全跳过，行为同未启用 |

**pytest 与 L-5 dashboard 永远不会被覆盖率收集阻断。** 因此 Step 2 的 backend-test DAG 终态可能是 FINISHED 但 `jacoco.xml` 缺失——这时进 Step 3 前必须先按排查清单修复。

## 6. 排查清单（覆盖率 unavailable / 全 0）

1. Java 服务进程是否挂了 agent？`ps aux | grep jacocoagent`
2. 端口是否放行？`nc -zv <host> <port>`（在 backend-test 机器上）
3. `address` 是否 `0.0.0.0`？（`127.0.0.1` 跨机器连不上）
4. `includes` 业务包名是否正确？（写错 → 0 个类）
5. `jacocoCoverage.cliJarPath` 是否正确且 `java -jar <cli> --help` 可用？
6. agent 与 cli 版本是否一致？

## 7. 安全约束

- JaCoCo agent 暴露代码执行细节，**仅限测试环境**，生产**严禁**挂载。
- `address=0.0.0.0` 意味着任何能访问 `<port>` 的机器都能 dump；务必用安全组限制到 backend-test 机器。
- `append=false` 保证每次测试数据隔离。
