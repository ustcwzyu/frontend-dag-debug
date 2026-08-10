---
name: init-capability-evolution
description: 用于 loop-agent 本仓库的初始化能力演化审查，判断代码、skill、模板、包范围或 DAG 默认能力变化是否需要同步更新目标项目 init surface。
---

# Init Capability Evolution

本 skill 用于 loop-agent 本仓库。当变更可能影响 `loop-agent init` 初始化其他项目的能力时使用。

## Goal

让模型自行判断并维护初始化能力，而不是依赖人工记忆：

- 新能力是否应该进入目标项目。
- 新增/修改的 skill 是否应随 npm 包和 `init --profile full` 投影。
- 目标项目的 `AGENTS.md`、README managed block、治理 docs、scripts 或 templates 是否需要更新。
- `package.json files` 与 `ai_workspace/loop-agent/init-surface.manifest.json` 是否仍覆盖真实发布范围。
- 是否需要目标项目 smoke、init doctor、docs audit 或 package dry-run 证据。

## Trigger Tiers

按 `ai_workspace/loop-agent/init-surface.manifest.json` 的 `evolutionReview.tiers` 判断成本：

- `advisory`：只记录提示，不阻塞。
- `surface-check`：运行 `bash scripts/check-init-surface.sh`；通过即可。
- `model-review`：写一份简短 init evolution review，必要时修改 init surface、包范围、文档、skill 或测试。

不要把小改动升级成重流程。只有当变化可能改变目标项目初始化体验、默认 DAG 行为、skill resolution、发布包边界或 init 生成物时，才进入 model-review。

## Review Questions

审查时逐条回答：

1. 本次变更会改变目标项目执行 `loop-agent init --profile full --merge` 后得到的文件、规则或能力吗？
2. 是否新增、删除或重命名了 `.agents/skills/**`，并且目标项目需要 repo-local 可审计副本？
3. 是否改变了默认 DAG role skills、skill resolution、strict skill audit 或 task prompt 注入？
4. 是否新增通用治理模板、script matrix、production readiness 或 operator recovery 文档，需要目标项目初始化后可见？
5. `package.json files` 是否包含所有 npm 运行和初始化所需静态资料？
6. `ai_workspace/loop-agent/init-surface.manifest.json` 是否更新了 package / init / exclude / trigger contract？
7. 旧目标项目是否只需 advisory、需要手工复制新增文件，还是需要未来 `init audit/update` 迁移能力？

## Output

轻量审查可以只在 handoff 中说明。高影响审查应写入：

```text
ai_workspace/loop-agent/reports/init-evolution/YYYY-MM-DD-init-evolution-review.md
```

报告保持短小，包含：

- changed surface
- 可由 Git 解析的 Base 和 Head commit/ref；严格检查要求 Base 精确匹配所选 `--base`，Head 可以是运行时当前 `HEAD` 或它的一个可解析祖先提交。若 Head 是祖先，则 `reportHead..HEAD` 区间内一旦出现新的 `model-review` 高影响路径就会拒绝该报告；仅有 `advisory` 或 `surface-check` 变化不会让已完成的高影响审查失效。`working tree`、不可解析文字、无关历史报告都不能为其他变更范围放行严格检查。
- decision: no init impact / surface check only / init update required
- files updated
- verification commands and results
- residual risk

## Required Verification

按影响面选择最小命令：

```bash
bash scripts/check-init-surface.sh
bash scripts/check-repo.sh
npm test -- init-command dag-skills dag-validate-command
npm pack --dry-run --ignore-scripts
```

如果没有新鲜验证证据，不要宣称 init evolution 已完成。
