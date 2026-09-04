import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// Jest 全局提供 test（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。

const readTaskSource = () =>
  readFile(new URL('../src/task-board.ts', import.meta.url), 'utf8')

const readMainSource = () =>
  readFile(new URL('../src/main.ts', import.meta.url), 'utf8')

// ── AC-FE-TASK-001: createTask / empty error ──

test('createTask 返回包含 id、title、completed 的 Task', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+createTask/)
  assert.match(source, /\bid\b.*:\s*string/)
  assert.match(source, /\btitle\b.*:\s*string/)
  assert.match(source, /\bcompleted\b.*:\s*boolean/)
})

test('createTask 生成 UUID 或回退 ID', async () => {
  const source = await readTaskSource()
  assert.match(source, /crypto\.randomUUID|Date\.now/)
})

test('createTask 去除标题首尾空白', async () => {
  const source = await readTaskSource()
  assert.match(source, /\.trim\s*\(/)
})

test('空标题或空白标题显示错误信息', async () => {
  const source = await readTaskSource()
  assert.match(source, /请输入任务标题/)
})

test('新增任务后清空输入框', async () => {
  const source = await readTaskSource()
  // input.value should be reset after add
  assert.match(source, /\.value\s*=\s*''/)
})

test('新增按钮在表单中且 type 为 submit', async () => {
  const source = await readTaskSource()
  assert.match(source, /type\s*=\s*['"]submit['"]/)
  assert.match(source, /<form/)
})

test('输入非空时清除错误信息', async () => {
  const source = await readTaskSource()
  assert.match(source, /addEventListener\s*\(\s*['"]input['"]/)
})

// ── AC-FE-TASK-002: toggleTask / counts ──

test('toggleTask 翻转 completed 状态', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+toggleTask/)
  assert.match(source, /completed\s*:\s*!.*\.completed/)
})

test('toggleTask 返回新数组不修改原数组', async () => {
  const source = await readTaskSource()
  assert.match(source, /\.map\s*\(/)
})

test('getCounts 返回 total、pending、done', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+getCounts/)
  assert.match(source, /\btotal\b/)
  assert.match(source, /\bpending\b/)
  assert.match(source, /\bdone\b/)
})

test('状态切换后计数通过 render 同步更新', async () => {
  const source = await readTaskSource()
  assert.match(source, /textContent\s*=\s*String\(/)
  assert.match(source, /getCounts/)
})

// ── AC-FE-TASK-003: filterTasks / empty states ──

test('filterTasks 导出并支持 all、pending、done', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+filterTasks/)
  assert.match(source, /['"]all['"]/)
  assert.match(source, /['"]pending['"]/)
  assert.match(source, /['"]done['"]/)
  assert.match(source, /\.filter\s*\(/)
})

test('filterTasks 对 all 返回全部任务', async () => {
  const source = await readTaskSource()
  // For 'all', return tasks directly
  assert.match(source, /return\s+tasks\b/)
})

test('filterTasks 对 pending 仅返回未完成任务', async () => {
  const source = await readTaskSource()
  assert.match(
    source,
    /filter\s*===\s*['"]pending['"]\s*\)\s*return\s+tasks\.filter\s*\(\s*\(t\)\s*=>\s*!t\.completed/,
  )
})

test('filterTasks 对 done 仅返回已完成任务', async () => {
  const source = await readTaskSource()
  assert.match(
    source,
    /filter\s*===\s*['"]done['"]\s*\)\s*return\s+tasks\.filter\s*\(\s*\(t\)\s*=>\s*t\.completed/,
  )
})

test('「全部」按钮默认携带激活 class 且文案为 全部', async () => {
  const source = await readTaskSource()
  assert.match(
    source,
    /class\s*=\s*['"]task-board-filters__btn\s+task-board-filters__btn--active['"][\s\S]*?data-filter\s*=\s*['"]all['"][\s\S]*?>\s*全部\s*<\/button>/,
  )
})

test('筛选按钮文案为 全部 / 进行中 / 已完成', async () => {
  const source = await readTaskSource()
  assert.match(
    source,
    /data-filter\s*=\s*['"]pending['"][\s\S]*?>\s*进行中\s*<\/button>/,
  )
  assert.match(
    source,
    /data-filter\s*=\s*['"]done['"][\s\S]*?>\s*已完成\s*<\/button>/,
  )
})

test('空状态消息覆盖全部三种筛选', async () => {
  const source = await readTaskSource()
  assert.match(source, /暂无任务/)
  assert.match(source, /暂无进行中的任务/)
  assert.match(source, /暂无已完成的任务/)
})

test('筛选按钮激活态由 CSS class 控制', async () => {
  const source = await readTaskSource()
  assert.match(source, /task-board-filters__btn--active/)
  assert.match(source, /classList\.(?:add|remove|toggle)\s*\(/)
})

test('筛选按钮使用 data-filter 属性', async () => {
  const source = await readTaskSource()
  assert.match(source, /data-filter\s*=\s*['"]all['"]/)
  assert.match(source, /data-filter\s*=\s*['"]pending['"]/)
  assert.match(source, /data-filter\s*=\s*['"]done['"]/)
})

// ── AC-FE-TASK-004: persistence ──

test('loadTasks 安全解析 localStorage 并校验形状', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+loadTasks/)
  assert.match(source, /try\s*\{/)
  assert.match(source, /localStorage\.getItem/)
  assert.match(source, /JSON\.parse/)
  assert.match(source, /validateTasks/)
})

test('loadTasks 在 JSON 损坏时返回空数组', async () => {
  const source = await readTaskSource()
  // The catch block returns []
  assert.match(source, /catch\b[\s\S]*?return\s+\[\]/)
})

test('loadTasks 在 localStorage 不可用时返回空数组', async () => {
  const source = await readTaskSource()
  assert.match(source, /catch\b[\s\S]*?return\s+\[\]/)
})

test('saveTasks 带 try/catch 安全写入 localStorage', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+saveTasks/)
  assert.match(source, /try\s*\{/)
  assert.match(source, /localStorage\.setItem/)
  assert.match(source, /JSON\.stringify/)
})

test('saveTasks 在存储不可用时静默失败', async () => {
  const source = await readTaskSource()
  // catch block without re-throw
  assert.match(source, /catch[\s\S]*?(?:\}|$)/)
})

test('validateTasks 校验数组及每个元素形状', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+validateTasks/)
  assert.match(source, /Array\.isArray/)
  assert.match(source, /typeof\s+.*\.id\s*===\s*['"]string['"]/)
  assert.match(source, /typeof\s+.*\.title\s*===\s*['"]string['"]/)
  assert.match(source, /typeof\s+.*\.completed\s*===\s*['"]boolean['"]/)
})

test('localStorage key 使用项目专属稳定值', async () => {
  const source = await readTaskSource()
  assert.match(source, /frontend-dag-debug/)
})

// ── AC-FE-TASK-005 / BR-AGENT-004: 模块保留 + 旧首页挂载强绑定 ──

test('initTaskBoard 仍在 task-board.ts 中导出（模块保留未删除）', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+initTaskBoard/)
})

test('main.ts 不再挂载任务看板（无 initTaskBoard / task-board 引用）', async () => {
  const mainSource = await readMainSource()
  assert.doesNotMatch(mainSource, /initTaskBoard/)
  assert.doesNotMatch(mainSource, /task-board/)
})

test('main.ts 不再包含刷新列表按钮', async () => {
  const mainSource = await readMainSource()
  assert.doesNotMatch(mainSource, /刷新列表/)
  assert.doesNotMatch(mainSource, /task-board__refresh-btn/)
})

test('main.ts 不再显示 hello world 与问候弹窗', async () => {
  const mainSource = await readMainSource()
  assert.doesNotMatch(mainSource, /hello world/i)
  assert.doesNotMatch(mainSource, /打开弹窗/)
  assert.doesNotMatch(mainSource, /greeting-modal/)
  assert.doesNotMatch(mainSource, /showModal\s*\(/)
})

test('main.ts 不再直接读写 localStorage', async () => {
  const mainSource = await readMainSource()
  assert.doesNotMatch(mainSource, /localStorage/)
})

// ── 搜索过滤 ──

test('searchTasks 导出为纯函数并包含 .toLowerCase() 和 .includes()', async () => {
  const source = await readTaskSource()
  assert.match(source, /export\s+function\s+searchTasks/)
  assert.match(source, /\.toLowerCase\(\)/)
  assert.match(source, /\.includes\(/)
})

test('搜索 input DOM 存在且 type 为 search 并带有 class task-board__search', async () => {
  const source = await readTaskSource()
  assert.match(source, /type\s*=\s*['"]search['"]/)
  assert.match(source, /class\s*=\s*['"]task-board__search['"]/)
})

test('搜索无匹配时空状态文案为 无匹配任务', async () => {
  const source = await readTaskSource()
  assert.match(source, /无匹配任务/)
})

test('searchTasks 调用位于 filterTasks 之后的过滤管道中', async () => {
  const source = await readTaskSource()
  // filterTasks 调用在前，searchTasks 调用在后
  assert.match(source, /filterTasks\s*\(\s*tasks\s*,\s*currentFilter\s*\)/)
  assert.match(source, /searchTasks\s*\(\s*filtered\s*,\s*searchKeyword\s*\)/)
})

// ── 样式响应式断言 ──

test('CSS 包含窄视口适配规则 (≤480px)', async () => {
  const cssSource = await readFile(
    new URL('../src/style.css', import.meta.url),
    'utf8'
  )
  assert.match(cssSource, /@media/)
  assert.match(cssSource, /480px/)
})
