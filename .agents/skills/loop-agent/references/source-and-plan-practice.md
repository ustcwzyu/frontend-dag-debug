# Source 与 Exec-plan 最佳实践

很多用户只跑「主路径 DAG」四步，**漏掉** `import-prd` 与 `plan create`。二者**不是** `dag run-task` 的硬依赖，但在「有原始 PRD / 非微小实现」场景下应成为默认纪律。本文给出**何时用、何时可跳、命令顺序与案例**。

相关命令细节：`command-reference.md`（import-prd / plan / status）。  
Task 目录布局：`task-workflow.md`。  
仓库治理全文：目标仓 `governanceRoot` 下 `feature-workflow.md`（若有）。

## 先分清三层

| 层 | 命令 / 路径 | 作用 | 主路径 DAG 是否强制 |
| --- | --- | --- | --- |
| Source 事实 | `import-prd` → `source/references/*` + `source-manifest.json` | 原始 PRD **不可变**归档 | 否（有 PRD 文件时**强烈推荐**） |
| Source 契约 | `task source prepare --apply` 投影 `source/需求.md`、`执行约束.md` + managed paths | DAG 生成与验收真源 | **是**（至少 `需求.md`；默认不手写） |
| Exec-plan | `plan create` / `plan complete` / `plan check` | 仓库级计划索引与交接 | 否（**非微小**推荐） |
| DAG 运行时 | `dag run-task` → `dag validate` → `run-dag` | 可执行编排 | **是**（常规实现） |

规则记忆：

1. **`new-task` 不自动 import-prd，也不自动绑 plan。**
2. **`dag run-task` 主要消费派生 `需求.md`**；会校验 plan **索引一致性**，但不要求当前 task 已有 active plan。
3. 冲突时：**`source/references/*`（原始）> 派生 `需求.md` > 聊天口述。**

## 决策：何时 `import-prd`

### 应该用（默认「有就 import」）

- 用户给了独立 PRD / 需求文档 / 设计说明文件（`.md` / 导出稿）。
- 多轮对话已把需求定稿，且希望 **hash 可追溯**（避免模型把原文改成「唯一 source」）。
- Worker / 多人协作：后续 review 必须三方对照 references + 需求.md + 实现。
- 目标仓 `ai_workspace/loop-agent/` 或 `docs/` 里已有权威 PRD/spec，任务只是执行切片。

### 可以跳过 import-prd

- 真正微小：单文件 typo、一行配置、纯脚本命令说明，**没有**独立需求文档。
- 用户只在聊天里给了 3～5 条验收点，且你当场写入 `需求.md` 并标明「来源：会话 YYYY-MM-DD」（仍建议短小、可验证）。
- 已有 task 的 `source/references/` 与 manifest 完好，本次只是 re-run DAG。

### 反模式

- 把用户 PRD **整篇改写**进 `需求.md` 后删掉原文路径。
- AI 直接 edit `source/references/*`。
- 只把 PRD 路径写在聊天里，不落盘到 task 容器。

### 推荐顺序（有 PRD 时）

```bash
loop-agent new-task <task-id> "简短标题"
loop-agent import-prd <task-id> --file <path-to-original-prd.md> [--json]
loop-agent task source prepare <task-id> --use-imported-prd --allowed-path "<glob>" --apply --json
# 默认无 LLM 写 source；工程边界用 flags 显式给出
#   .harness/tasks/<task-id>/source/需求.md
#   .harness/tasks/<task-id>/source/执行约束.md
# 同步 task.json.allowedPaths / forbiddenPaths
loop-agent dag run-task <task-id> --profile auto --strict-models
loop-agent dag validate --dag .harness/tasks/<task-id>/dag.json --strict-models --strict-governance
loop-agent run-dag --dag .harness/tasks/<task-id>/dag.json --cwd <repo-root>
```

`import-prd` 后用 `status` / `instructions source` 确认 source readiness，再生成 DAG。

## 决策：何时 `plan create`

### 应该用（默认「非微小就 create」）

- 跨多文件 / 多模块、需要 **Contract → 分块 → 验证 → 交接** 的实现。
- 预计超过一次会话，或要交给其他 agent / 人继续。
- 会改 CLI、runtime、init 投影、发布面、治理脚本等 **高 blast-radius** 区域。
- 团队要求 active plan 进 `docs/exec-plans/`（或目标仓 `governanceRoot/exec-plans/`）索引。
- 本仓库 `AGENTS.md` 对「非微小实现」要求 plan + DAG 时。

### 可以跳过 plan create

- 真正 one-shot：路径已知、验收一条命令、无长期决策要记。
- 纯 operator 维护：改一个 README 链接、修索引笔误（仍应验证，但不必开 plan）。
- 已有 **进行中** active plan 覆盖同一工作块：更新该 plan，而不是平行再开一个同题 plan。

### 与 task 的关系

- **一个 plan 可覆盖多个 task**；**一个 task 也不强制 1:1 plan**。
- plan id 建议 `YYYY-MM-DD-<slug>`；task id 可更短（业务切片名）。
- 完成后：`plan complete <plan-id> --summary "..."`（或目标仓等价流程），不要只关 task 忘了 plan 索引。

### 推荐顺序（非微小 + 有 PRD）

```bash
loop-agent plan create <plan-id> "<title>"
# 在 plan 中写清范围、非目标、验证、允许路径（人类/agent 共读）
loop-agent new-task <task-id> "切片标题"
loop-agent import-prd <task-id> --file <prd>
# 写 需求.md / 执行约束.md / task.json 边界
loop-agent dag run-task <task-id> --profile auto --strict-models
# … validate → run-dag → promote-run → closeout …
loop-agent plan complete <plan-id> --summary "结果导向摘要 + 验证证据"
```

微小 escape hatch（须在 handoff / plan 或 task 备注写明边界）：

```bash
loop-agent new-task <task-id> "微小修复"
# 直接 需求.md（可选 import-prd）
loop-agent dag run-task <task-id> --profile auto --strict-models
# …
```

## 实践案例

### 案例 A — 用户丢来一份 PRD 文件（默认完整路径）

**信号**：`帮我按这个 PRD 实现…` + 附件/路径。  
**做法**：非微小则先 `plan create`（或复用 active plan）→ `new-task` → **`import-prd`** → 派生 `需求.md`（目标/非目标/AC，锚回 references）→ 路径边界 → DAG。  
**验收**：`source/references/` 有原文；manifest hash 在；review 能三方对照。

### 案例 B — 聊天里三句话小需求（可跳过 import + plan）

**信号**：`把 X 按钮文案改成 Y`，单文件。  
**做法**：`new-task` → 短 `需求.md`（写清唯一验收）→ `dag run-task`…  
**不要**：为了「流程完整」空跑 `import-prd`（无文件）或堆一个空洞 plan。

### 案例 C — 源仓改 CLI 默认行为（必须 plan，PRD 视情况）

**信号**：行为变更、CHANGELOG、skills/init 多表面。  
**做法**：**`plan create`** 先冻结契约与工作块 → 按块 `new-task` → 有设计文档则 import → DAG → 定向验证 → `plan complete`。  
**验收**：active/completed 索引与 plan 正文一致；`plan check` / `dag run-task` 索引 preflight 不红。

### 案例 D — agent-worker / Feature 已 materialize source_docs

**信号**：TaskSpec 已把 `source_docs` 拷进 `source/references/`。  
**做法**：通常 **不必再 import-prd** 同一文件；检查 references + 派生 `需求.md` 顶部「冲突以 references 为准」→ 补边界 → DAG。  
**仍建议**：产品线级大功能在 Feature / 仓库层有 plan 或 Feature Packet 记录。

### 案例 E — 用户说「loop-agent 帮我完成 XXX」无附件

**信号**：强路由进 DAG，但无 PRD 路径。  
**做法**：主会话 **先问清**是否有 PRD 文件；有则 import；无则把会话共识写入 `需求.md` 并标来源 → 判断微小 vs 非微小决定是否 `plan create` → 再 `dag run-task`。  
**禁止**：主会话直接写业务代码代替 DAG。

## 宿主 agent 检查清单（编排时）

在第一次 `dag run-task` 前快速自问：

1. 是否存在用户/仓库原始需求文件？→ **有则 `import-prd`**。
2. `source/需求.md` 是否含目标、非目标、可验证验收？→ **无则先写**。
3. `allowedPaths` / `forbiddenPaths` 是否已结构化？→ **无则先写**。
4. 是否非微小 / 跨会话 / 高 blast-radius？→ **`plan create` 或更新已有 active plan**。
5. 是否仅聊天约束？→ **落盘到 source 或 plan**，不要只留在对话。

## 与「主路径 DAG」文档的关系

`SKILL.md` / `command-reference.md` 的 **主路径 DAG** 仍是最短 runtime 闭环（便于抄命令）。  
**系统化默认**应读作：

```text
[非微小?] plan create（或复用 active plan）
new-task
[有 PRD?] import-prd
派生 需求.md / 执行约束.md / task.json 路径边界
dag run-task → validate → run-dag → promote/closeout
[有 plan?] plan complete
```

不要把 `import-prd` / `plan create` 伪造成「无文件也必须执行」的假步骤；用本节决策表选择，而不是一律省略。
