# Pi Subagent Assisted Mode

loop-agent task 启用 `piSubagentMode`、在 analyze/plan/spec/retrospective 内需要 read-only scout/planner/reviewer subagents，或配置 project-local agents/prompts 时使用本文。

`task.json` 支持可选字段 `piSubagentMode`，用于 step 级 `subagent` tool delegation：

| Mode | analyze | plan | spec | implement | retrospective | verify |
|------|---------|------|------|-----------|----------------|--------|
| `off`（默认） | read only | read only | read only | +write/edit/bash | read only | read only |
| `analyze-plan` | **+subagent** | **+subagent** | **+subagent** | 同 off | 同 off | 同 off |
| `full` | **+subagent** | **+subagent** | **+subagent** | 同 off | **+subagent** | 同 off |

### 何时启用

在 `task.json` 设 `piSubagentMode: "analyze-plan"` 或 `piSubagentMode: "full"` 当：
- task 涉及大规模 codebase 阅读，适合 parallel scout agents
- analysis 或 planning 需多角度调查（如跨模块比较实现）
- retrospective review 适合独立 reviewer subagent（`full` mode）

### step 内使用 `subagent` 的指引

subagent 可用时，**仅用于 read-only task**：
- **Parallel scout**：dispatch 多个 subagent 同时搜索/阅读不同区域
- **Chain**：一个 subagent scout，另一个基于发现 planning
- **Reviewer**：用 subagent 在定稿前 review analysis/plan

**不要**用 subagent 做 writing、editing 或执行命令。subagent 输出仅 advisory；务必 verify 并将发现并入自己的输出。**不要**把 subagent 结果当作权威 state 或 artifact source。

### 前置条件

- Pi runtime 环境须有 `subagent` tool（经 Pi subagent extension 加载）
- 推荐用 Pi 自带 example 文件安装：

```bash
mkdir -p ~/.pi/agent/extensions/subagent ~/.pi/agent/agents ~/.pi/agent/prompts

ln -sf /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/index.ts ~/.pi/agent/extensions/subagent/index.ts
ln -sf /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/agents.ts ~/.pi/agent/extensions/subagent/agents.ts

for f in /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/agents/*.md; do
  ln -sf "$f" ~/.pi/agent/agents/$(basename "$f")
done

for f in /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/prompts/*.md; do
  ln -sf "$f" ~/.pi/agent/prompts/$(basename "$f")
done
```

- 最小 smoke check：

```bash
pi -p --no-session --no-context-files --no-skills --tools subagent "Reply with exactly OK."
```

  预期输出：`OK`
- mode 按 task opt-in；默认 `off` 保持向后兼容
- 任何 mode 下 `implement` 都不给 `subagent`（防止 nested multi-writer）

### 内置 Project-Local Agents 与 Prompts

本 repo 提供 `.pi/agents/` 与 `.pi/prompts/` 模板，供 `piSubagentMode` 使用：

**Agents**（`.pi/agents/`）

| Agent | Role | 对应阶段 |
|-------|------|----------|
| `loop-agent-scout` | 只读侦察：code、tests、docs、governance | Scout |
| `loop-agent-planner` | 最小可执行计划；强调验证与回退 | Plan |
| `loop-agent-reviewer` | 严格审查：范围漂移、验证缺口、契约破坏 | Verify / Review |
| `loop-agent-worker` | 有界实现与修补 | Implement |

另有通用 agents：`scout` / `planner` / `worker` / `reviewer`（中文提示，可被通用 prompt 模板调用）。模型以各 agent frontmatter 为准（当前仓库默认对齐 `harness.json` 的 Pi executor）。

**Prompt Templates**（`.pi/prompts/`）：输入 `/loop-agent-*` 或通用模板名调用

| Template | Flow |
|----------|------|
| `loop-agent-scout-and-plan` | parallel scout → planner |
| `loop-agent-analyze-wide` | 3 parallel scouts → 结构化分析 |
| `loop-agent-review-only` | 独立审查计划/实现/验证 |
| `loop-agent-implement-and-review` | worker → reviewer → worker |
| `scout-and-plan` / `implement` / `implement-and-review` | 通用 chain（调用 `scout`/`planner`/`worker`/`reviewer`） |

传 `agentScope: "both"` + `confirmProjectAgents: false` 以访问 repo-local agents。
