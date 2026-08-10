---
name: analyze-product-requirements
description: 将自然语言需求或现有需求文档整理为冻结的澄清前分析、按需澄清记录和完整 Product Requirement，按 frontend、backend 或 both 范围生成精简用户故事、逐故事输出规范与 Given/When/Then 验收标准。用于需求分析、需求澄清、PRD 或用户故事拆分。
---

# Analyze Product Requirements

IRON LAW：`product-analysis.md` 只能生成一次。首次写入成功后，其正文、frontmatter 和文件路径在当前 requirement 的整个生命周期内都不可变；后续轮次禁止编辑、覆盖、追加、格式化、移动或删除该文件。澄清决策只能写入 `requirement-clarification.md`，并通过重新生成合并到 `product-requirement.md`。原始需求同样只读。

本 skill 只定义需求，不分析完整代码依赖或生成实现代码。可对用户提供的仓库做定向事实搜索，但不得输出文件级影响分析。

## 输入与产物

- 必填：自然语言需求或原始需求文档路径。
- 可选：`target=frontend|backend|both` 或 `--target frontend|backend|both`；两种写法等价，默认 `both`。
- 可选：代码仓库、知识库、历史需求、API 文档、设计规范、业务规则、`project_root`、`requirement_id` 和 `output_dir`。
- 默认目录：`<project-root>/docs/product-analysis/<requirement-id>/`。
- 固定产物：该目录内的 `product-analysis.md`、`requirement-clarification.md`、`product-requirement.md`。

## Workflow

- [ ] Step 0：确认输入与写入边界 ⛔ BLOCKING
  - [ ] 原始需求必须足以识别业务目标；输入文件只读。
  - [ ] 将 `target=<value>` 和 `--target <value>` 归一化为唯一 target；缺省时为 `both`，非法值或冲突的多个值必须停止。
  - [ ] 在生成前明确回显“分析范围：frontend | backend | both”；三个产物的 `analysis_scope` 必须等于该归一化 target，后续不得自动扩大范围。
  - [ ] 确定项目根：显式 `project_root` > 仓库根 > 当前项目根。
  - [ ] 确定 requirement ID：显式值 > 需求标题 slug > `YYYYMMDD-<summary-slug>`；仅小写字母、数字和单连字符。
  - [ ] 确定目录：显式 `output_dir` 必须等于项目根下 `docs/product-analysis/<requirement-id>`；否则使用该默认目录。
  - [ ] 创建目录，三个产物写入同一目录；元数据使用同一 `requirement_id` 和相对 `project_root: ../../..`。
  - [ ] 输出路径不得与原始需求路径相同；已有目录来源不同则停止，不得混写。
  - [ ] 目标目录已有 `product-analysis.md` 时，验证同源后只读加载并跳过 Step 1；无论 pending 或 complete，都不得对该文件执行任何写操作。
  - [ ] 已有同源 pending 任务只能继续更新 Clarification 和 Product Requirement；如 Product Analysis 需要更正，停止当前 requirement，使用新的 `requirement_id` 和目录重新开始。其他产物覆盖先确认。
- [ ] Step 1：一次性生成并冻结 Product Analysis ⚠️ REQUIRED
  - [ ] 读取 `references/product-analysis-schema.md`。
  - [ ] 区分明确需求、推断需求和待确认问题。
  - [ ] 如提供仓库，只定向搜索可验证事实并记录 `CODE-FACT-*` 证据。
  - [ ] 仅按 target 生成精简故事骨架和逐故事初步输出规范：`frontend` 只生成 `FE-US-*`，`backend` 只生成 `BE-US-*`，`both` 才生成两端。
  - [ ] Product Analysis 只记录验收关注点，不创建正式 `AC-*` 或完整 Given/When/Then。
  - [ ] 有问题时使用 `ready-for-clarification`；无问题时使用 `no-clarification-required`。
  - [ ] 写入前完成全部分析内容，只允许一次创建；写入成功即冻结，当前及后续澄清轮次不得再调用写工具处理该路径。
- [ ] Step 2：建立澄清决策树 ⚠️ REQUIRED
  - [ ] 读取 `references/clarification-and-knowledge.md` 和 `references/requirement-clarification-schema.md`。
  - [ ] 有问题时列出 3–6 个顶层 `BR-*` 分支，按依赖排序，从最基础分支开始。
  - [ ] 每轮先给推荐答案和理由，只问一个主要问题；可合并同一决策分支内紧密耦合的子项，但不得混合无关分支。
  - [ ] 用户回答后先复核当前回答是否足以形成明确、唯一、可执行且可验收的最终决策；不得仅因用户已经回答就标记为 confirmed。
  - [ ] 回答不完整、存在多种合理解释、依赖未定义概念、与原始需求或已有决策冲突，或无法自然合并到范围、规则、输出规范和 AC 时，当前问题仍未解决；下一轮必须优先针对该回答的具体模糊点继续澄清，不得跳到其他分支。
  - [ ] 后续追问必须指出上一轮回答中仍不明确的内容，并收窄为可直接确认的决策点；不得原样重复上一轮问题。
  - [ ] 当前回答明确后，再重新识别其他剩余模糊点和回答新引入的模糊点；仅在它们会影响范围、规则、输出或验收时进入下一轮，总轮数不得超过 3 轮。
  - [ ] 第 3 轮后不得继续提问；仍有 P0/P1 时保持 `pending` 并说明阻断项，仍有 P2 时仅可按已记录的默认行为与影响处理。
  - [ ] 能由代码或资料确认的事实自行回答并附证据，不把现状当作产品决策。
  - [ ] 完成一个分支后再进入下一个；不得遗留模糊的“视情况而定”。
  - [ ] 无需澄清时使用三章精简记录，不伪造 `BR-*`、`Q-*` 或 `DEC-Q-*`。
- [ ] Step 3：记录 Requirement Clarification ⚠️ REQUIRED
  - [ ] 记录总澄清轮数，并为每个问题记录所属轮次、推荐答案、用户回答、最终决策、来源和目标位置；依赖、备选、代码证据和未确认影响仅在适用时记录。
  - [ ] P0/P1 未解决时保持 `pending`；P2 延后必须给出默认行为和影响。
- [ ] Step 4：重新生成 Product Requirement ⛔ BLOCKING
  - [ ] 读取 `references/product-requirement-schema.md` 和 `references/acceptance-criteria.md`。
  - [ ] 基于原始需求、冻结的 Product Analysis 和 Clarification 重新生成，不做字符串回写。
  - [ ] 优先级：用户确认决策 > 原始明确需求 > 已确认默认值 > 模型推断；代码库事实只用于理解现状、发现冲突和辅助澄清，不构成独立需求来源。
  - [ ] 不得把 `CODE-FACT-*`、仓库路径、代码符号、模块结构、数据表或当前实现过程原样写入 Product Requirement；代码事实只有经用户确认或被原始需求明确要求时，才能转换为不含实现细节的产品规则，证据仍只保留在 Product Analysis 和 Clarification。
  - [ ] 把决策自然合并到范围、规则、故事、逐故事输出规范和 AC，并在决策追溯中登记。
  - [ ] 用户故事只描述角色/使用方、目标/能力、价值、入口/触发方式和 AC 引用；详细产品行为只写在同 ID 输出规范中，正式 AC 嵌入该输出规范。
  - [ ] target 为 `backend` 或 `both` 时，后端故事只定义 API 的业务能力、输入输出语义、权限和规则；具体方法、路径及 DTO 留给依赖 skill。
- [ ] Step 5：验证并交付 ⛔ BLOCKING
  - [ ] 向 Product Analysis 和 Product Requirement 校验器传入归一化 target，再运行三个产物校验器和 validator matrix。
  - [ ] 确认 `product-analysis.md` 与进入澄清前的冻结版本完全一致。
  - [ ] 只有所有命令返回 0 才能声明完成。

完整格式示例按需读取 `references/example.md`；维护或 forward-test 时读取 `references/forward-test-cases.md`。不要为了执行校验而阅读脚本，直接运行。

## 完成规则

- `no-clarification-required` 仍生成三个产物；Clarification 使用“澄清结论、来源、合并结果”三章精简结构。
- `complete` Clarification 的全部分支必须 resolved，P0/P1 必须由用户确认，每个决策标记必须进入 Product Requirement 决策追溯。
- Product Requirement 必须自包含；读者不得依赖聊天、Product Analysis 或 Clarification 才能理解需求。
- Product Requirement 只描述目标产品行为，不记录代码库事实、证据位置或当前实现；不得出现 `CODE-FACT-*`、仓库文件路径、代码级类/函数/组件符号、模块调用关系、数据表名或实现算法。
- 不得生成独立用户角色、验收标准汇总、前后端契约、Open Questions、测试建议或独立边界 case 章节。

## Validation

把 `<skill-root>` 解析为本 `SKILL.md` 所在目录，全部参数使用绝对路径：

```bash
node <skill-root>/scripts/validate-product-analysis.mjs <product-analysis.md> --target <frontend|backend|both>
node <skill-root>/scripts/validate-product-requirement.mjs <product-requirement.md> --target <frontend|backend|both>
node <skill-root>/scripts/validate-requirement-clarification.mjs <product-analysis.md> <requirement-clarification.md> <product-requirement.md>
node <skill-root>/scripts/test-validators.mjs
```

澄清中的中间产物可加 `--allow-pending`；通过 pending 校验不代表完成。
