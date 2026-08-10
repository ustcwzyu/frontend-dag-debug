# Product Requirement 输入契约

首选输入为 complete V3 `product-requirement.md`。迁移期允许读取 complete V2，但不修改上游产物；新产物始终使用 V3。

V3 必须包含精简用户故事、同 ID 输出规范和嵌入规范的 AC。故事与规范一一对应，故事 AC 引用与规范内 AC 完全一致。V2 继续按其原有嵌入故事的 AC 读取。

必须提供存在、可读的代码仓库。Product Requirement 位于 `<project-root>/docs/product-analysis/<requirement-id>/`；新增产物写回同目录并继承 ID。显式 target 必须是上游 scope 的子集。

任一选中后端故事的触发方式为 API 时生成 `api-documentation.md`；非 HTTP 触发不得生成空 API 文档。业务输入输出、权限、核心规则或安全边界缺失时阻断。

门禁失败时 Dependency Analysis 只包含分析范围、输入与代码基线、阻断原因、恢复条件。`blocked_on` 使用 requirement-missing、requirement-invalid、requirement-not-complete、repository-missing、repository-unreadable、scope-mismatch、missing-stories、missing-acceptance、api-business-contract-incomplete。
