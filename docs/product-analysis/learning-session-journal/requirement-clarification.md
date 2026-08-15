---
artifact_version: "3.0"
artifact_type: requirement-clarification
requirement_id: learning-session-journal
project_root: ../../..
analysis_scope: frontend
source_product_analysis: ./product-analysis.md
requirement_status: complete
total_clarification_rounds: 2
---

# Requirement Clarification：第一课学习会话记录器

## 澄清总览

2 轮澄清：功能选型（复杂度高的需求）与 3 个 P1 语义决策。全部确认，无未决阻断项。

## 第 1 轮：功能选型

### Q-001 选哪个前端功能验证前端工作流

- 背景：用户要求「复杂度比较高的需求」以充分压测前端 DAG。
- 候选：A. 第一课结构化渲染器重构 / B. 全站学习工作台 / C. 学习会话记录器。
- 用户回答：C. 学习会话记录器。
- 最终决策：实现「学习会话记录器」——第一课工作台模式：8 步闭环逐步引导、5 模板草稿编辑与完成度校验、10 分量表自评、会话计时与摘要页；草稿 localStorage 持久化 + 与现有进度 API 同步；纯前端实现，不改后端。DEC-Q-001
- 目标位置：PRD 需求概述、需求范围；FE-US-001~004。

## 第 2 轮：P1 语义决策

### Q-002（P1-1）模板完成判定规则

- 候选：A. 文本非空即完成；B. 必须修改过骨架。
- 用户回答：必须修改过骨架。
- 最终决策：草稿文本与预填骨架文本不同（trim 后比较）才算该模板完成；仅预填未修改不算完成。DEC-Q-002
- 目标位置：PRD 业务规则、FE-US-002 验收标准、AC-FE-004/005。

### Q-003（P1-2）进度同步策略（PUT 整份覆盖的规避）

- 背景：PUT /api/v1/progress 整份覆盖进度对象，直接覆盖会清掉 weeklyLabCompleted。
- 候选：A. 合并后再 PUT（保留 weeklyLabCompleted，推荐）；B. 整体覆盖。
- 用户回答：合并后再 PUT。
- 最终决策：同步前先 GET 现有进度，构造 {firstLessonCompleted, evaluationScore, weeklyLabCompleted: 现有值} 后再 PUT；仅更新工作台拥有的字段。DEC-Q-003
- 目标位置：PRD 业务规则、FE-US-004 验收标准、AC-FE-009。

### Q-004（P1-3）会话计时器范围

- 背景：后端进度模型无时长字段，无法持久化到服务端。
- 候选：A. 本地累计时长（开始/暂停/继续/重置，随草稿存 localStorage，展示在摘要页）；B. 去掉计时器。
- 用户回答：本地累计时长。
- 最终决策：实现本地累计计时器，时长随草稿持久化并展示于摘要，不同步服务端。DEC-Q-004
- 目标位置：PRD 已确认需求、FE-US-003 验收标准、AC-FE-006/007。

## 决策汇总

| 决策 | 内容 | 影响 |
|---|---|---|
| DEC-Q-001 | 学习会话记录器（第一课工作台模式） | 范围与用户故事 |
| DEC-Q-002 | 模板完成=修改过骨架（trim 后不同） | 完成度校验规则 |
| DEC-Q-003 | 同步=合并后再 PUT，保留 weeklyLabCompleted | 进度同步语义 |
| DEC-Q-004 | 计时=本地累计时长，随草稿持久化 | 计时器范围 |