# 前端任务执行约束模板

本模板只承载**通用探索协议 + 结果 schema + 缺失/冲突时 fail-closed 规则**，不包含任何具体业务组件名、项目专属路径或项目专属命令。项目事实由生成期能力探测（`openspec/schemas/**`、`openspec/project-specs/**`、`ai_workspace/**`）产出并经语义归类注入任务契约。

## 技术约束

- **要探索什么**：项目 `package.json` 的直接依赖与 scripts、框架/路由/状态/数据获取/组件库/样式/测试/构建相关配置与引导文件，以及 `openspec/schemas/**` 与 `openspec/project-specs/rules/**` 中声明技术边界的规范。
- **结果必须包含**：每一条适用技术规则的源路径、命中章节与行号；被排除依赖的明确理由；与既有技术栈一致的运行时要求（编译、构建、入口、环境变量）。
- **缺失/冲突时如何 fail-closed**：无法找到技术规范来源时，显式标注 `source: unavailable` 并只采用任务源与现有代码的可验证事实；发现冲突规则时不臆造取舍，先记录冲突并返回 `request-revision`/blocked，而不是静默采用邻近代码惯例。

## 代码风格约束

- **要探索什么**：`openspec/project-specs/templates/**`（代码模板）与 `openspec/project-specs/rules/**` 中组件/钩子/工具等代码风格规则，以及现有组件、主题/Token、stories 与测试作为较弱 repository fallback。
- **结果必须包含**：命中模板/规则的源路径、章节与行号；命名、目录、导出、类型、样式组织等可执行约定；冲突字段逐条列出。
- **缺失/冲突时如何 fail-closed**：没有模板/规则命中时明确说明并记录 `repository fallback` 证据；冲突未解决时不得进入实现，必须返回阻塞信息。

## 设计约束

- **要探索什么**：`openspec/project-specs/ui/**`（主题/组件目录）与 `openspec/project-specs/rules/**` 中页面/组件拆分、交互、UI 状态与响应式相关规则。
- **结果必须包含**：命中设计规范/组件目录的源路径、章节与行号；组件拆分与复用边界、样式与设计系统映射、UI 状态与响应式范围。
- **缺失/冲突时如何 fail-closed**：设计规范缺失时明确记录来源为 `unavailable` 并保留为已知风险；组件/主题冲突时必须阻断，不能按邻近代码自行决定。

## 验证约束

- **要探索什么**：项目 `package.json` scripts 中真实存在的 lint/typecheck/build/test 命令，以及任务源 `需求.md`/`执行约束.md` 中声明的验证命令。
- **结果必须包含**：命令的 label、原始命令文本与来源（scripts/任务源）；每条命令可自终止（启动→断言→退出）的说明。
- **缺失/冲突时如何 fail-closed**：只在确定命令真实存在时写入冻结命令集；不发明 shell 命令。命令不可执行或漂移时 fail closed，不宣称验证通过。

## Mock 约束（数据型任务）

本段决定生成期 `allowedMockStrategies` 与冻结的 Mock 验证命令。只有当生成期**能证明任务确实包含 Mock 且有确定性验证命令**时，DAG 才会放行 `native` / `browser-intercept` / `request-adapter`；否则自动收敛为 `not-needed`，design review 若按项目规范改选 `native`，会在 prewrite 被 `mock-strategy-outside-allowed` 拦截、`implement` 被跳过。

- **何时必须填**：项目规范（`openspec/project-specs/**`、`ai_workspace/**`、mock 规则或类似 DEC-* 决策）要求/建议 Mock；或需求涉及远端接口且后端未就绪。规范要求 Mock 时，优先 `task.json.frontendMock.policy: "required"`。
- **命令要探索、不要硬编码**：到项目 `package.json` scripts 里找实际存在的 Mock 相关脚本（如 `mock`、`mock:*`、`dev:mock`，或名字含 mock 的脚本），结合既有 service root 的 handler/fixture/bootstrap 启动方式，确定一条**真实存在、确定、可自终止**（启动→断言→退出 0）的验证命令。常驻 dev server 必须包装成自终止脚本（start→assert→stop），否则 verify shell 会超时 fail-closed。
- **写入 task.json**：把探索到的命令原样写进 `frontendMock.verifyCommands`（`label` 唯一、`command` 与项目脚本一致）。`label` 会进入冻结命令集，implementation contract 的 `verificationTarget.commandLabel` 必须逐字引用它。
- **命令来源白名单**：只允许项目 `package.json` 已有脚本、Mock capability seed、或本段声明的 `verifyCommands`；plan/design 阶段不能发明 shell 命令。
- **Mock/API/schema 规范路径**：到 `openspec/project-specs/**`（rules 中的 mock/api 规则、templates 中的接口模板）与 `ai_workspace/**` 检索；结果必须列出源路径、章节与行号。缺失或冲突时 fail closed，不自行发明接口契约。
- **既有 Mock service root、handler/fixture/bootstrap**：检索项目现有 Mock 服务根目录、handler、fixture 与 bootstrap 启动方式；结果必须列出发现路径，未发现时明确记录 `unavailable`。
- **既有 browser/e2e interception 或 request adapter/DI seam**：检索项目现有浏览器/e2e 拦截或请求适配层/依赖注入 seam；结果必须列出发现路径或明确记录缺失。
- **production 禁用边界**：结果必须说明真实请求为默认路径、Mock 仅通过显式测试/开发开关启用的具体边界；无法证明生产默认关闭时返回 `blocked`。
- **真实请求默认路径与 Mock 显式启用方式**：结果必须写出真实请求默认路径与 Mock 显式启用方式（如环境变量/构建开关），不得通过注释真实请求或在生产组件内硬编码假数据实现。
- **`task.json.frontendMock.policy`**：`auto | required | disabled`（规范强制 Mock 用 `required`）
- **被拦截时怎么修**：`mock-strategy-outside-allowed` / `no authorized Mock verification commands` 是**生成期契约问题，不是 plan 问题**——补 `frontendMock.verifyCommands`（或 `policy: "required"` + 命令）后**重新生成 DAG** 再跑，plan-revision 无法修复它。

## allowedPaths

- **要探索什么**：任务源 `需求.md`/`执行约束.md`/`task.json` 中声明的写入边界，以及本次交付实际涉及的文件/目录。
- **结果必须包含**：与 `task.json.allowedPaths` 一致且窄化的路径列表；任何越界路径都必须在 plan 中记为阻断性 scope conflict。
- **缺失/冲突时如何 fail-closed**：缺失允许路径或发现计划目标在允许路径之外时，不得擅自扩大边界，返回 blocked。

## forbiddenPaths

- **要探索什么**：任务源与 `task.json` 中声明的禁止写入路径（运行时产物、依赖目录、构建输出、私有路径等）。
- **结果必须包含**：禁止写入的路径清单，以及实现/验证步骤不触碰这些路径的确认。
- **缺失/冲突时如何 fail-closed**：任何写入落入禁止路径立即阻断；禁止路径语义不变，不得新增读取权限字段或扩大写入边界。

## OpenSpec 必读与引用核验（frontendOpenspec）

- **要探索什么**：`task.json.frontendOpenspec.requiredReadPaths`（契约显式声明的必读 openspec 路径）与任务源 `需求.md`/`执行约束.md` 中显式引用的 openspec 路径。
- **结果必须包含**：cited 模式候选集 = `requiredReadPaths` ∪ 任务源显式引用（去重排序）；每个候选在 plan 的 fenced `openspec-citations` 引用块中逐条出现（每行一个 JSON `{"path","section","line"}`），且每条引用都能在真实 read 事件中背书。
- **缺失/冲突时如何 fail-closed**：候选非空而引用块缺失/不可解析 → `openspec-citation-block-unparseable`；候选未引用 → `openspec-not-cited`；引用存在但无成功 read 事件 → `openspec-citation-not-read`。三个 code 均为 `retryable-invalid`。候选为空时不强制并写 advisory（可声明 `requiredReadPaths` 增强）。`scan-strict` 模式保留全量必读语义与 `openspec-not-read`。
- **`task.json.frontendOpenspec`**：`policy` 为 `cited | scan-strict`（缺省 `cited`）；`requiredReadPaths` 为 repo 相对路径数组，经 `isOpenspecSpecFilePath` 校验，非法路径生成期确定性失败。
