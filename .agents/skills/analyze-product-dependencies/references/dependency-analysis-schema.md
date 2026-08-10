# Dependency Analysis V3 输出契约

```yaml
---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: <与 Product Requirement 一致>
project_root: ../../..
analysis_scope: frontend | backend | both
source_product_requirement: ./product-requirement.md | none
source_api_documentation: ./api-documentation.md | none
repository_root: ../../.. | none
analysis_status: complete | blocked
blocked_on: none | <原因列表>
---
```

Complete 固定章节：输入与代码基线、用户故事覆盖矩阵、按 scope 的依赖详情、后端场景的 API 实现映射、跨故事共享依赖、风险与未定位项。覆盖矩阵承担全局追溯，不生成独立分析范围或追溯汇总。

前端详情字段：验收标准、影响文件、页面/路由、组件、状态、API client/类型、状态与边界落点、定位证据、风险、置信度。

后端详情字段：验收标准、API 文档引用、影响文件、路由/入口、Controller/Handler、Service/领域逻辑、DTO/Schema、数据依赖、权限依赖、错误/日志/审计、测试落点、定位证据、风险、置信度。

`影响文件` 是完整权威清单，每项使用唯一 `F<number>`、add/modify/reuse、真实路径和用途；其他代码落点字段引用这些编号，不重复完整路径。

API 实现映射只登记 API ID、Operation ID、方法路径和代码入口。无 API 时写：`不适用。本次需求不涉及 HTTP API。`

Blocked 产物只含分析范围、输入与代码基线、阻断原因、恢复条件，不得包含确定性代码位置或 API 契约。
