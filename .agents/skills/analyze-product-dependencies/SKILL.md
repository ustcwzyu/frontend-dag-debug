---
name: analyze-product-dependencies
description: 基于 complete Product Requirement 探索代码库，按 frontend、backend 或 both 范围将故事、输出规范和验收标准映射到真实文件、组件、服务、数据、权限与证据，并仅为 API 型后端故事生成精简 Swagger 风格 Markdown API 文档。用于代码影响分析、依赖分析、API 文档或需求到代码映射。
---

# Analyze Product Dependencies

IRON LAW：`product-requirement.md` 是唯一需求事实源。不得从原始需求、Product Analysis、Clarification 或聊天重新解释需求，不得修改代码或上游产物。

## 输入与产物

- 必填：complete `product-requirement.md` 的实际路径和可读取代码仓库路径；Product Requirement 必须位于项目根的需求目录。
- 可选：`target=frontend|backend|both` 或 `--target frontend|backend|both`；两种写法等价，默认继承上游 scope。
- 输出写回 Product Requirement 所在目录；始终生成 `dependency-analysis.md`，选中 API 型后端故事时额外生成 `api-documentation.md`。

## Workflow

- [ ] Step 0：输入门禁 ⛔ BLOCKING
  - [ ] 读取 `references/input-contract.md` 并运行 Product Requirement 输入校验器。
  - [ ] 将 `target=<value>` 和 `--target <value>` 归一化为唯一 target；缺省时继承上游 scope，非法值或冲突的多个值必须停止。
  - [ ] 从 Product Requirement 继承 `requirement_id`、`project_root` 和输出目录；显式 target 必须是上游 scope 的子集，只校验和分析选中故事。
  - [ ] 在代码侦察前明确回显“分析范围：frontend | backend | both”；新增产物的 `analysis_scope` 必须等于该归一化 target，后续不得自动扩大范围。
  - [ ] 门禁失败时只生成 blocked Dependency Analysis，不伪造 API 或代码落点。
- [ ] Step 1：完整代码侦察 ⚠️ REQUIRED
  - [ ] 读取 `references/scouting-rules.md`。
  - [ ] 逐个读取选中故事及其同 ID 输出规范和 AC，再定位入口、调用链、状态、类型、数据、权限、错误、日志和测试；`frontend` 不分析 `BE-US-*`，`backend` 不分析 `FE-US-*`。
  - [ ] 区分 confirmed、inferred、unknown，并为每项结论提供证据。
- [ ] Step 2：判断 API 适用性 ⚠️ REQUIRED
  - [ ] 只要一个选中的 `BE-US-*` 触发方式为 API，就必须生成 API 文档。
  - [ ] target 为 `frontend` 时不读取或分析后端故事，不生成 API 文档或 API 实现映射。
  - [ ] 定时任务、事件、消息、数据迁移或纯内部调用且不形成 HTTP 契约时，不生成空 API 文档。
  - [ ] 无 API 时 Dependency Analysis 使用 `source_api_documentation: none`，API 实现映射明确写不适用。
- [ ] Step 3：建立 Canonical API Model ⚠️ REQUIRED
  - [ ] API 场景读取 `references/api-documentation-schema.md`。
  - [ ] 结合 Product Requirement 的业务契约与仓库现有 API 规范，确定方法、路径、参数、响应、错误、Schema、分页、示例和代码落点。API 文档不输出认证方式或权限要求。
  - [ ] 定义接口字段前，先搜索共享 DTO/Schema、OpenAPI components、统一响应和分页模型；命中时直接复用，不重复定义，不在 API 文档中输出搜索过程或“复用检查”。
  - [ ] 定义返回 code 前，先搜索全局错误枚举、code 映射和错误响应外壳；命中时直接复用，仅未命中时才定义局部 code，不在 API 文档中输出搜索过程或“复用检查”。
  - [ ] 分页接口将每页条数参数定义为可选，可选值必须完整包含 `10`、`20`、`50`、`100`；默认值仅在 Product Requirement 或仓库通用分页定义明确时写入。
  - [ ] 产品需求优先于现状；业务语义缺失时阻断，不由本 skill 发明产品决策。
  - [ ] API 文档只保留 HTTP 契约、字段、响应、错误与分页参数；完全移除认证方式、权限要求、业务规则、处理流程、分支逻辑、数据读写逻辑和实现算法及其相关内容。
  - [ ] API 文档与依赖分析必须从同一模型渲染。
- [ ] Step 4：生成产物 ⚠️ REQUIRED
  - [ ] 读取 `references/dependency-analysis-schema.md`。
  - [ ] API 场景先写 Swagger 风格 Markdown `api-documentation.md`，再写 `dependency-analysis.md`。
  - [ ] `frontend` 产物只包含前端故事覆盖和前端依赖详情；`backend` 只包含后端故事覆盖、后端依赖详情和适用的 API 映射；`both` 才包含两端。
  - [ ] `影响文件` 是每个故事的完整权威文件清单，使用 `F1`、`F2` 编号和 add/modify/reuse；其他落点字段引用这些编号，不重复完整路径。
  - [ ] Dependency 的 API 实现映射只保留 API ID、Operation ID、方法路径和代码入口，不复制故事、AC 或完整接口文档。
  - [ ] 所有新增产物与 Product Requirement 使用相同 `requirement_id`，同目录引用使用 `./文件名`。
- [ ] Step 5：验证并交付 ⛔ BLOCKING
  - [ ] Product Requirement 输入校验必须通过。
  - [ ] 向 Product Requirement、Dependency 和适用的 API 校验器传入归一化 target；API 场景运行 API 和 Dependency 两个校验器，非 API 场景只运行 Dependency 校验器。
  - [ ] 覆盖矩阵承担全局追溯，不生成重复的文末追溯汇总。
  - [ ] 运行 validator matrix，修复全部错误后再声明完成。

完整示例按需读取 `references/example.md`；维护或 forward-test 时读取 `references/forward-test-cases.md`。

## Validation

```bash
node <skill-root>/scripts/validate-product-requirement-input.mjs <product-requirement.md> --target <frontend|backend|both>
node <skill-root>/scripts/validate-api-documentation.mjs <product-requirement.md> <api-documentation.md> --target <backend|both>
node <skill-root>/scripts/validate-dependency-analysis.mjs <product-requirement.md> <dependency-analysis.md> [api-documentation.md] --target <frontend|backend|both>
node <skill-root>/scripts/test-validators.mjs
```

非 API 场景省略 API 校验器和 Dependency 校验命令的第三个参数。
缺少 Product Requirement 的 blocked 场景使用 `none` 作为 Dependency 校验命令的第一个参数。
