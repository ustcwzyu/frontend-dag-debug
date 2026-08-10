# Forward-Test Cases

## Case 1：缩小为 frontend

使用 complete、scope 为 both 的 Product Requirement 和真实仓库，指定 `--target frontend`。核对：只生成 `dependency-analysis.md`；`analysis_scope` 为 `frontend`；不生成空 API 文档；没有后端依赖章节、`BE-US-*` 或 API 实现映射；每个 FE 故事有文件证据和状态边界落点。

## Case 2：backend API

```text
Use $analyze-product-dependencies with a complete backend Product Requirement whose BE-US-001 trigger is API, plus a repository.
```

核对：两个文件写入 Product Requirement 的同一需求目录；API 索引覆盖 API ID、Operation ID、方法路径、故事和 AC；Dependency 的 API 映射只保留 API ID、Operation ID、方法路径和代码入口；影响文件使用唯一 F 编号。

同时核对：API 文档不含认证方式、权限要求、业务规则、业务逻辑或实现逻辑及其相关内容；字段与 code 在生成前内部搜索共享定义，但 API 文档不输出“复用检查”或搜索证据。若接口分页，每页条数参数必须可选，允许值完整包含 `10/20/50/100`。

## Case 3：backend 定时任务

使用触发方式为定时任务的归档需求。核对：只生成 Dependency；`source_api_documentation: none`；API 映射写不适用；重点定位 scheduler、job、幂等、批次、数据库和恢复测试。

## Case 4：业务契约缺失

使用缺少权限范围或输出语义的 API 型 Product Requirement。核对：不得发明产品决策；生成 blocked 依赖产物并返回上游补充。

## Case 5：不存在的目标能力

代码库中没有对应实现。核对：允许结论为新增，但证据必须展示已搜索范围和邻近模式；不得虚构文件已经存在。

## Case 6：缩小分析范围

使用 scope 为 both 的 Product Requirement，并指定 `target=backend`。核对：输入门禁通过；只要求 BE 故事覆盖；Dependency 和适用的 API 文档使用 `analysis_scope: backend`，不强制生成前端详情。

## Case 7：缺少输入

分别缺少 Product Requirement 和代码仓库。核对：只生成四个固定章节的 blocked Dependency；前者使用 `source_product_requirement: none`，后者允许 `repository_root: none`；不得生成 API 文档或确定性代码位置。
