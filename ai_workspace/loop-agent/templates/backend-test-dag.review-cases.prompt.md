# Backend Test DAG Review Cases Prompt Template

## Purpose

供 `review-and-revise-backend-md-cases-pi` 使用。该节点是 `executor: "pi"`、`role: "reviewer"`、`toolProfile: "write"` 的受限 reviewer，只能直接修订 `testcase/md/**`，不得生成 pytest 或修改任务源、生产代码和配置。

## 当前合同

把 Markdown 用例视为面向测试、研发、产品与评审人员的正式文档，而不是模型中间产物。

### 阅读体验

- `testcase/md/README.md` 是简洁入口，包含测试目标、环境、隔离/清理策略、模块汇总和可跳转的用例索引。
- 模块文件采用中文用例卡片；每条以 `## BE-<MODULE>-<NNN>｜<中文用例名称>` 开始；`<NNN>` 必须是三位补零序号（`001`，禁止 `01`）。Reviewer 发现两位序号或模块下划线时，必须在标题、README 索引与自动化映射中一致规范化（如 `BE-RESOURCE_NOTES-01` → `BE-RESOURCE-NOTES-001`）。
- 新文档优先使用：`测试目的`、`验收标准`、`需求依据`、`前置条件`、`测试数据`、`操作步骤`、`预期结果`、`自动化映射`。
- validator 同时接受上述中文分节和历史英文分节；机器 ID、HTTP 方法、路径、字段、枚举、文件名、函数名与 source citation 必须保持精确。
- 步骤和预期可以用紧凑表格，也可以分别使用编号/项目列表；必须可执行、可独立断言。
- 自动化内部限制应简短或放进 `<details>`，不能淹没人类主要阅读路径。

### 正确性

- 对照每条 `需求依据` 和环境报告检查 AC、接口、字段/响应形状、状态码、错误语义、状态转换、正向/异常/边界场景。
- 删除无依据场景、合并重复用例、补齐有依据的遗漏；无法确认的内容写入中文证据缺口，不猜测行为或凭据。
- 拒绝“符合预期”“正常工作”等模糊结果，以及无意义的中英双写和大段重复 boilerplate。
- 若能确定脚本与函数命名，在 `自动化映射` 中写明计划脚本路径与 pytest 函数/方法名；脚本路径必须等于模块 one-to-one 路径 `testcase/test_<module>.py`，`<module>` 来自当前 Markdown 文件名 stem，不得使用 Case-ID 式模块名（如 `BE-HEALTH.md`）或与模块 stem 不一致的映射。

## 推荐输出

完成文件修订后，仅用简短中文说明：

- 修订了哪些文档；
- 用例数与主要模块；
- 修复了哪些需求一致性或阅读问题；
- 仍有哪些证据缺口。

不得输出 JSON，不得执行测试。
