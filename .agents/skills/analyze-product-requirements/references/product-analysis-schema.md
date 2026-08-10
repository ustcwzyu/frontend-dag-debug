# Product Analysis V3 输出契约

Product Analysis 是澄清前快照，只允许一次创建。首次写入后，正文、frontmatter 和路径全部冻结；需要更正时使用新的 `requirement_id`。

```yaml
---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: <lowercase-slug>
project_root: ../../..
analysis_scope: frontend | backend | both
analysis_status: ready-for-clarification | no-clarification-required
source_requirement: <路径或 inline>
repository_root: <路径或 none>
---
```

文件固定为 `<project-root>/docs/product-analysis/<requirement-id>/product-analysis.md`。

固定章节：原始需求、需求概述、业务目标、需求分析、外部事实。需求分析包含明确需求、推断需求、待确认问题、初步非目标；外部事实包含知识库事实、代码库事实。

按 scope 追加“初步前端用户故事/初步前端输出规范”或“初步后端用户故事/初步后端输出规范”。不得生成独立用户角色或验收标准汇总。

前端故事字段：角色、目标、价值、入口、验收关注点。

后端故事字段：系统能力、使用方、业务价值、触发方式、验收关注点。触发方式使用 API、定时任务、事件、消息、内部调用或数据迁移。

每个故事必须恰好存在一个同 ID 输出规范。前端输出规范字段：页面/组件、展示内容、交互动作、UI 状态、表单校验、权限可见性、边界处理。后端输出规范字段：输入语义、输出语义、数据读写、权限规则、业务规则、安全要求、幂等与并发、错误与边界。

Product Analysis 只记录验收关注点，不得出现正式 `AC-FE-*`、`AC-BE-*` 或 Given/When/Then 块。

`no-clarification-required` 的待确认问题明确写“无”和理由，不得出现问题标记、优先级或问句；`ready-for-clarification` 至少包含一个带优先级或问号的问题。
