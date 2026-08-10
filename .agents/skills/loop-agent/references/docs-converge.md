# Docs Converge（文档收敛）

本 reference 把会话协议中的 **Converge Docs** 落成可执行检查表。
定位是**收敛 / 同步**，不是「每次重新 invent 文档大纲」。

权威规划：`ai_workspace/loop-agent/exec-plans/completed/2026-07-14-website-docs-ia-and-converge.md`。
站与治理双树边界：`website/README.md`。

## 何时触发

在以下任一情况**加载本文件并跑检查表**：

- 用户可见行为变更（CLI 输出、默认工作流、init 投影、Observe/Worker 主路径）。
- 新增 / 修改 / 删除 CLI 命令或关键 flags。
- runtime / 架构边界变更（`ai_workspace/loop-agent/architecture/*`、executor 角色、Worker 边界）。
- active plan 创建、blocked、完成或归档。
- 准备发布或写 `CHANGELOG.md` 版本条目。
- 用户明确要求「文档收敛」「docs converge」「同步 website docs」。
- handoff 前需要声明「本轮是否更新了站上文档」。

**不要**在无关的纯内部重构（无用户可见行为、无命令面变化）上强制大改站上正文；此时 handoff 写明豁免理由即可。

## 受众矩阵

| 受众 | 主要入口 | 权威细节 |
| --- | --- | --- |
| 新贡献者 | `website/docs/intro.md` → `overview/architecture` → `overview/roadmap` → first-run | 根 `ai_workspace/loop-agent/architecture/*`、active plans |
| 使用者 | `overview/feature-map`、`quick-start/*`、`guides/*`、`reference/*` | CLI help、根 `CHANGELOG.md` |
| 维护者 / agent | 本检查表 + `AGENTS.md` Converge Docs | `ai_workspace/loop-agent/`、`.agents/skills/`、`scripts/check-*.sh` |

## 页面清单（站上活文档）

| 页面 | 职责 |
| --- | --- |
| `website/docs/intro.md` | 概念地图 + 30 分钟路径；非能力堆砌 |
| `website/docs/overview/feature-map.md` | 功能导览 → guide/CLI |
| `website/docs/overview/architecture.md` | 架构导读；链到 `ai_workspace/loop-agent/architecture/` |
| `website/docs/overview/roadmap.md` | 当前有效规划短索引 |
| `website/docs/quick-start/*` | 安装 / init / first-run |
| `website/docs/guides/*` | 主路径操作说明 |
| `website/docs/reference/cli.md` | 用户向 CLI 参考 |
| `website/docs/reference/config.md` | 配置参考 |
| `website/docs/changelog.md` | 读者摘要；完整版本以根 `CHANGELOG.md` 为准 |

治理全文、exec-plans、reports **不**搬进 Docusaurus。

## 变更 → 文档检查表

按本轮实际 diff 勾选（有则必须处理，无则跳过并记豁免）：

| 若变更了… | 必须检查 / 更新 |
| --- | --- |
| 新/改 CLI 命令 | `website/docs/reference/cli.md` + `.agents/skills/loop-agent/references/command-reference.md`（及 agent-worker 相关 reference） |
| 用户可见行为 | 对应 `guides/*` 或 `quick-start/*`；根 `CHANGELOG.md`；必要时 `overview/feature-map.md` / `intro.md` |
| runtime / 边界 | 根 `ai_workspace/loop-agent/architecture/*`；站上 `overview/architecture.md` 导语与外链 |
| 默认工作流 | `intro.md` 流程图 + `guides/agent-dag.md` / `guides/harness-policy.md` |
| active plan 状态 | `overview/roadmap.md` 短索引 + `ai_workspace/loop-agent/exec-plans/active/README.md` |
| 发布 | 根 `CHANGELOG.md` 为版本事实源；`website/docs/changelog.md` 只写摘要与链接；roadmap 仅在规划状态变化时更新 |
| skill / init 投影 | `ai_workspace/loop-agent/init-surface.manifest.json`、相关测试、必要时 `ai_workspace/loop-agent/.agents/skills/*` |

跨树链接规则：

- 站内页面用 Docusaurus 相对文档链接。
- 链到根目录 `ai_workspace/loop-agent/`、`AGENTS.md`、`CHANGELOG.md` 等时，使用
  `https://github.com/tea-agent/loop-agent/blob/main/<repo-path>`，
  正文同时写出 repo-relative path；禁止伪造站内 `/ai_workspace/loop-agent/architecture/...` 作为根目录文档路由。

## 执行步骤（最小闭环）

1. **列出本轮用户可见 diff**（命令、行为、边界、计划状态）。
2. **对照上表**产出缺口清单（页面路径 + 要改的一句话）。
3. **最小补丁**：只改清单内页面；禁止顺手重写 practices 或迁移整个 `ai_workspace/loop-agent/`。
4. **验证**（见下节）。
5. **Handoff** 二选一：
   - 已更新：列出改动页面与验证命令结果。
   - 无需站上更新：写明「本轮无需站上更新，原因：…」。

## 验证命令

站上正文、侧栏或 `docusaurus.config.ts` 有改动时：

```bash
npm run docs:build
```

涉及治理文档、脚本、skill、init surface 时再跑：

```bash
bash scripts/check-repo.sh
# 或定向：
bash scripts/check-skill-entry.sh
bash scripts/check-command-registry-drift.sh
bash scripts/check-init-surface.sh
node bin/loop-agent.js docs audit --repo-root .
```

skill / package 投影相关：

```bash
npx vitest run test/init-command.test.ts test/package-surface.test.ts
```

## 禁止事项

- 每次会话从头撰写全新文档大纲或「重新规划整个 docs 树」。
- 把 `ai_workspace/loop-agent/design/`、exec-plans、reports 全文复制进 `website/docs/`。
- 在站上建立第二套与 `ai_workspace/loop-agent/architecture/*` 冲突的架构真源。
- 未读 `website/README.md` 与相关 exec-plan 就扩大 scope。
- 用删测试、降 `onBrokenMarkdownLinks` 或忽略 `docs:build` 失败制造「完成」。
- 新增独立公共 skill 目录承载本检查表（应留在 `.agents/skills/loop-agent/references/`）。

## 与现有能力的关系

| 能力 | 关系 |
| --- | --- |
| `loop-agent docs audit` | L0 腐化检查（断链、计划状态等）；**不**替代本表内容审计 |
| `npm run docs:build` | 站上改动硬门禁（含 Markdown 断链 fail-fast） |
| `grill-with-docs` | ADR / 术语；不替代本 reference |
| 历史 2026-07-05 docs governance dogfood | 仅经验输入；新 workflow 必须 Pi-only，不复用已退役原生 Cursor DAG |

## 快速自检（handoff 前 30 秒）

- [ ] 用户可见变更是否对照检查表处理或已豁免？
- [ ] intro 是否仍是概念地图（而非能力 bullet 堆砌）？
- [ ] roadmap 是否只含当前有效 active 项？
- [ ] 需要时 `docs:build` / `check-repo` 是否有新鲜输出？
