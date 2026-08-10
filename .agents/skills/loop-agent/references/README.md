# loop-agent Skill References

本目录是 `../SKILL.md` 的 progressive-disclosure reference layer。`SKILL.md`
只负责 trigger、入口选择和硬规则；较长的 command details、operational procedures、
failure handling 与 workflow 细节放在这里，避免主 skill 变成百科。

## 使用方式

1. 先读 `../SKILL.md`，确认当前任务是否真的需要 `loop-agent`。
2. 根据任务类型只打开相关 reference，不要一次加载整个目录。
3. 执行时遵循 Agent DAG 路径；历史顺序式 `run ...` workflow 已移除。
4. 如果 reference 与 `harness.json` 或 repo-local `ai_workspace/loop-agent/loop-agent-harness.md` / `specs/loop-agent-harness.md` 冲突，以
   `harness.json` 的机器可读 policy 和本目录的 shared policy 为准，并回头修正文档漂移。

## 快速路由

| 场景 | 优先读取 |
|---|---|
| 通用 loop-agent harness workflow policy、跨 repo 共同规则 | `harness-policy.md` |
| 中大型 autonomous implementation、harness-governed work | `harness-policy.md`、`hybrid-dag.md`、`orchestrator-and-interventions.md`、`verification-and-failure-handling.md` |
| 需要查精确 CLI 用法、setup、goal、docs helper、stats | `command-reference.md` |
| 低风险 micro task、旧任务目录兼容、DAG runtime 修复 | `task-workflow.md`、`verification-and-failure-handling.md` |
| DAG 运行中要判断 main session 是否能手术式补丁、是否需要 sidecar prompt | `orchestrator-and-interventions.md` |
| 短时 one-shot Pi SDK 调用，不创建 `.harness/tasks/` | `pi-prompt.md` |
| 解释 `.harness/runs/`、one-shot evidence、active 残留或 promotion | `one-shot-runs.md` |
| 多 worktree 并行委派、delegate/harvest | `multi-worktree.md` |
| 模型、provider、profile、fallback routing | `model-routing.md` |
| Long-running `loop` 命令、action 规则、auto mode、signals、loop closeout | `long-running-loop.md` |
| Three-pass convergence、repair artifact / spine audit / knowledge curate、SePO-lite prompt evolution | `harness-policy.md` |
| Cursor bounded write 后的独立复核、verify knobs、failure handling | `verification-and-failure-handling.md` |

## Reference 索引

| Reference | 使用场景 |
|---|---|
| `harness-policy.md` | 通用 loop-agent harness policy：DAG、命令分层、source materials、loop/sidecar 边界、facts/verification/handoff 规则；repo-local harness docs 应引用它而不是复制规则 |
| `orchestrator-and-interventions.md` | 协调长时间 autonomous DAG work；判断 main session 是否可以 edit；使用 one-shot Pi/Cursor sidecar；恢复 in-flight workflow |
| `command-reference.md` | 需要 `.` 的精确 CLI 命令、setup、goal lifecycle、docs helper、stats |
| `task-workflow.md` | 处理 task source material、task config、repo adapter 或 legacy task 目录布局 |
| `pi-prompt.md` | 运行短时 one-shot Pi SDK task，且不创建 `.harness/tasks/` |
| `one-shot-runs.md` | 解释 `.harness/runs/{active,completed,failed}` 的创建条件、生命周期、治理清理与 `promote-run` 关系 |
| `hybrid-dag.md` | 使用 Agent DAG Level 2 `dag validate` / `run-dag`，Level 3 `dag init-hybrid` / `dag run-task`，或查看 write policy、DAG source-of-truth 规则 |
| `pi-subagent-assisted-mode.md` | 启用 `piSubagentMode`，或在 Pi step 内配置 read-only scout / planner / reviewer subagent |
| `model-routing.md` | 查看或修改 model/provider 默认、profile、routing 或 fallback 行为 |
| `post-implementation-and-patterns.md` | 处理 post-verify handoff、PRD item 拆分、fast bounded task、quick status 或 Pi timeout |
| `multi-worktree.md` | 用 isolated worktree、`delegate` 与 `harvest` 并发执行互不重叠的 independent task |
| `verification-and-failure-handling.md` | 选择 verify knob、Cursor bounded write 后的独立复核、解释 failure mode、执行 completion audit 与 closeout |
| `long-running-loop.md` | 使用 experimental long-running `loop` outer state：命令入口、action 规则、auto mode 写入边界、signals 与 loop closeout |

## 边界与状态源

- `references/harness-policy.md` 是 shared workflow policy source，供多个 repo 的 thin adapter docs 引用。
- `../SKILL.md` 是 skill trigger 与 routing source，不承载长流程细节。
- `ai_workspace/loop-agent/loop-agent-harness.md` / repo-local `specs/loop-agent-harness.md` 是本仓库或目标仓库的 adapter 文档：只描述 runtime 位置、governance root、验证入口和本地边界。
- `harness.json` 是 workflowPolicy、script entrypoints、artifacts 目录与 model routing 的机器可读 source of truth。
- `.harness/tasks/<task-id>/` 是 task 运行态状态；不要把运行态事实写进本目录。
- `.harness/runs/completed/<run-id>/` 是 one-shot tool run evidence；reference 文档只能解释如何读取和 promotion，不应复制 run facts。
- `.harness/dag-runs/completed/<run-id>/` 是单次 DAG run 的不可变 facts；reference 文档只能解释如何读取和收口，不应复制 run facts。

## 维护规则

- 不要把长段落复制回 `SKILL.md`；需要新增细节时，在本目录新增或更新 reference，并在 `SKILL.md` 添加 routing row。
- 让 `SKILL.md` 保持 120-180 行以内；reference 文件承担细节。
- 新 reference 应有清晰标题、触发场景、最小步骤、失败处理和维护边界。
- 如果某个 reference 变成可独立触发、跨项目通用且不再依赖本仓库上下文，再考虑拆成独立 skill。
- 更新 command、workflow policy 或 verification 规则时，同步核对 `harness.json`、`references/harness-policy.md`、repo-local harness adapter docs 和 verification matrix。
- `~/.pi/agent/.agents/skills/loop-agent` 是指向本目录的 symlink，所以仓库内 edits 会直接更新 Pi skill。
