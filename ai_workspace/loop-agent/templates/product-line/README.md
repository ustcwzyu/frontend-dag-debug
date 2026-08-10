# Product-line feature packet

**推荐入口（确定性脚手架）：**

```bash
agent-worker feature scaffold --repo . --template backend-only \
  --feature-id F-2026-010 --title "..." \
  --be-path services/example/** \
  --verify-command "npm run typecheck" --verify-command "npm test"
agent-worker task validate-feature features/F-2026-010
```

批量示例见 [`feature-scaffold-batch.example.yaml`](feature-scaffold-batch.example.yaml)。

**生成快照（可读、防漂移，非 dogfood）**见 [`scaffold-samples/`](scaffold-samples/)：`backend-only` / `frontend-only` / `fe-with-api`。刷新：`node --import tsx/esm scripts/generate-scaffold-samples.mjs`；校验：同脚本 `--check` 或 `bash scripts/check-scaffold-samples.sh`。

操作说明以 skill 包内 `skills/agent-worker/references/agent-worker-operator.md` § Feature Packet Scaffold 为准（不依赖 website 是否随包）。

也可手工复制本目录占位文件，替换 angle-bracket placeholders，保持 IDs 稳定，然后运行：

```bash
agent-worker task validate-feature <feature-dir>
```

The validator checks acceptance ID uniqueness, task references and dependencies, cycles, TaskSpec/path/verification completeness, and QA evidence before a successful closeout.

## Profiles

| Profile | How to declare | Behavior |
|---|---|---|
| `generic`（默认） | 省略 `feature.yaml`，或 `profile: generic` | 保持 legacy 校验；不强制 `execution.workflow` / 双覆盖 AC |
| `fullstack-v1` | `feature.yaml` 中 `profile: fullstack-v1` 并声明 `scope` | 强制显式 workflow、required AC 双覆盖、frontend-test 依赖、writer writeSet 串行等结构门禁 |

端到端全栈 dogfood 样板见仓库 `features/F-2026-005/`（欢迎语链路：契约 → BE/FE 实现 → backend-test / frontend-test → Final Verification）。

## Minimal files

- `feature.yaml`（可选；fullstack 必填）
- `requirement.md` / `design.md` / `test-plan.md`
- `acceptance.yaml`
- `tasks/task-graph.yaml` + `tasks/*.yaml`
- `links.md` / `closeout.yaml`（按交付阶段）
