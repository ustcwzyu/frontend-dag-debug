# Swagger 风格 Markdown API 文档 V3 契约

文件名固定为 `api-documentation.md`。它采用 Swagger 的信息组织方式，但不是 OpenAPI YAML。

```yaml
---
artifact_version: "3.0"
artifact_type: api-documentation
requirement_id: <与 Product Requirement 一致>
project_root: ../../..
api_status: complete
analysis_scope: backend | both
source_product_requirement: ./product-requirement.md
repository_root: ../../..
---
```

固定章节：通用约定、API 索引、API 详情、数据模型、错误码。API 索引同时承担目录和故事/AC 追溯，不生成重复汇总。API 文档中完全移除认证方式、权限要求、业务规则、业务逻辑、处理逻辑和实现逻辑及其相关内容。

通用约定包含 Base URL、统一响应结构、错误响应结构、分页约定、时间和标识符规范。不输出公共定义的搜索过程、命中证据或“复用检查”章节。

每个接口标题使用 `### API-001 名称`，随后写 Swagger 风格方法路径。固定子章节：基本信息、成功响应、错误响应。非认证请求头、Path 参数、Query 参数、Request Body 按适用性生成；URL 有模板参数时必须生成 Path 参数。字段层面只写名称、类型、必填/可空、格式、枚举、契约约束和语义，不写计算、转换、查询或分支逻辑。

基本信息只包含 Operation ID、变更类型和幂等性，不重复 API ID。API 索引包含 API ID、Method + Path、Operation ID、用户故事、AC、变更类型。

成功响应包含至少一个 2xx 和合法 JSON 示例；错误响应包含至少一个 4xx/5xx 和合法 JSON 示例。变更类型使用新增、修改、复用。

分页接口在 Query 参数中定义每页条数参数：必填性为“否”，允许值完整列为 `10 | 20 | 50 | 100`。参数名优先复用仓库现有约定，例如 `pageSize`、`page_size` 或 `limit`。只有 Product Requirement 或仓库通用分页定义明确时才写默认值，不再生成 `<100`、`=100`、`>100` 分页场景。

“数据模型”只定义实际使用的 Schema 和字段；“错误码”只说明 HTTP 状态、code 和可观测的触发条件。两个章节均不新增“复用检查”，不输出公共定义搜索过程，不展开业务判定或实现逻辑。
