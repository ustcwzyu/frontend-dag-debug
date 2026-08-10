# Product Requirement V3 输出契约

Product Requirement 是澄清后的完整需求文档和下游唯一需求事实源。

```yaml
---
artifact_version: "3.0"
artifact_type: product-requirement
requirement_id: <lowercase-slug>
project_root: ../../..
requirement_status: pending | complete
analysis_scope: frontend | backend | both
source_requirement: <路径或 inline>
source_product_analysis: ./product-analysis.md
source_clarification: ./requirement-clarification.md
---
```

固定章节：需求概述、业务目标、需求范围、业务规则、决策追溯。需求范围包含已确认需求、非目标、默认假设、未决事项。不得生成独立用户角色或验收标准汇总。

Product Requirement 只描述目标产品行为，不承载代码侦察记录。不得包含 `CODE-FACT-*`、仓库文件路径、代码级类/函数/组件符号、模块调用关系、数据表名、证据位置、当前实现过程或实现算法。产品层的页面或组件名称仍可用于描述用户可见输出。代码库事实只可在经用户确认或被原始需求明确要求后，转换为不含实现细节的产品规则；原始证据保留在 Product Analysis 或 Clarification。

按 scope 追加前端/后端用户故事和同域输出规范。

前端故事字段：角色、目标、价值、入口、验收标准。后端故事字段：系统能力、使用方、业务价值、触发方式、验收标准。

每个故事必须恰好存在一个同 ID 输出规范。前端规范字段：页面/组件、展示内容、交互动作、UI 状态、表单校验、权限可见性、边界处理。后端规范字段：输入语义、输出语义、数据读写、权限规则、业务规则、安全要求、幂等与并发、错误与边界。

正式 `AC-FE-*` 或 `AC-BE-*` 作为四级标题嵌入对应输出规范。故事的验收标准引用必须与该规范中的 AC 完全一致；AC 遵循 `acceptance-criteria.md`。

后端触发方式明确写 API、定时任务、事件、消息、内部调用或数据迁移，供下游判断 API 适用性。

`complete` 不得包含未解决 P0/P1。真实未决项以 `P0：`、`P1：` 或 `P2：` 开头。澄清决策使用 `DEC-Q-*` 在决策追溯中登记并定位到正式章节。
