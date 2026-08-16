import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (rel) => readFile(new URL(rel, import.meta.url), 'utf8')

// 截取第一课课程 section 的源码区域（用于「课程区无交互控件」等区域级断言）
function lessonRegion(source) {
  const start = source.indexOf(
    '<section class="lesson container" id="first-lesson-beginner"',
  )
  const end = source.indexOf('<section class="capability-map')
  assert.ok(start !== -1 && end !== -1 && end > start, '无法定位第一课 section 区域')
  return source.slice(start, end)
}

// 截取第二课课程 section 的源码区域（第二课模板字面量位于 lessonPlaceholderMarkup 定义之前）
function secondLessonRegion(source) {
  const start = source.indexOf(
    '<section class="lesson container" id="second-lesson-beginner"',
  )
  const end = source.indexOf('const lessonPlaceholderMarkup', start)
  assert.ok(start !== -1 && end !== -1 && end > start, '无法定位第二课 section 区域')
  return source.slice(start, end)
}

// ── 站点身份与 Hero（AC-AGENT-001 / REQ-AGENT-001） ──

test('站点身份：Agent 学习实验室与主张', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /Agent 学习实验室/)
  assert.match(source, /让 Agent 不再靠运气工作/)
})

test('首屏包含主 CTA（指向第一课路由）与次 CTA（能力地图）', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /href="#\/lesson\/beginner"/)
  assert.match(source, /href="#\/"/)
  assert.match(source, /查看能力地图/)
  assert.match(source, /开始入门路线/)
})

// ── 默认唯一选中（AC-AGENT-002 / uiState initial-load-default-path） ──

test('初始加载默认选中「入门」：唯一 aria-pressed=true', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /data-route="beginner"[^>]*aria-pressed="true"/)
  assert.match(source, /data-route="builder"[^>]*aria-pressed="false"/)
  assert.match(source, /data-route="advanced"[^>]*aria-pressed="false"/)
})

test('默认课程详情展示入门受众/周期/课程数/第一课动作', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /首次构建 Agent 的开发者/)
  assert.match(source, /约 2 周/)
  assert.match(source, /12 节课/)
  assert.match(source, /让一个模型调用跑起来/)
})

// ── 路线切换同步（AC-AGENT-003 / BR-AGENT-002 / uiStates build/advanced） ──

test('路线 tab 点击经 navigate 导航到对应课程页（hash 路由）', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /navigate\(`#\/lesson\/\$\{routeId\}`\)/)
  assert.match(source, /data-route=/)
  assert.match(source, /\.route-tab/)
  assert.match(source, /#\/lesson\/beginner/)
})

test('切换不刷新页面、无网络请求、无 localStorage 写入', async () => {
  const source = await read('../src/main.ts')
  assert.doesNotMatch(source, /fetch\(/)
  assert.doesNotMatch(source, /XMLHttpRequest/)
  assert.doesNotMatch(source, /localStorage/)
  assert.doesNotMatch(source, /location\.reload/)
})

// ── 执行轨迹（AC-AGENT-005 / REQ-AGENT-004 / uiState trace-active-state） ──

test('执行轨迹：输入→计划→工具→评估四阶段与可辨识状态', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /trace__node-status/)
  assert.match(source, /trace__connector/)
  assert.match(source, /trace__token/)
})

test('路线切换时轨迹节点状态文字同步变化', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /用户提问与可用工具清单/)
  assert.match(source, /目标拆解为子任务/)
  assert.match(source, /跨系统请求与权限上下文/)
  assert.match(source, /并行调用多个 Tool 并处理失败/)
  assert.match(source, /聚合评估与可观测性审计/)
})

// ── 能力地图（AC-AGENT-004 / REQ-AGENT-003） ──

test('能力地图覆盖六类中文主题', async () => {
  const source = await read('../src/main.ts')
  const esc = (s) => s.replace(/[()（）]/g, '\\$&')
  for (const topic of [
    '模型与提示',
    'Tool（工具调用）',
    'Memory（记忆与上下文）',
    '规划与编排',
    'Eval 与可观测性',
    '安全与边界',
  ]) {
    assert.match(source, new RegExp(esc(topic)))
  }
  assert.match(source, /capability-map/)
})

// ── 本周实验（AC-AGENT-005 / REQ-AGENT-005） ──

test('本周实验：研究助手目标/输入/工具/成功标准/约 45 分钟', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /本周实验：研究助手/)
  assert.match(source, /查资料、带引用回答并接受评估的研究助手/)
  assert.match(source, /一组候选资料/)
  assert.match(source, /检索工具/)
  assert.match(source, /成功标准/)
  assert.match(source, /约 45 分钟/)
})

// ── 旧 UI 移除（AC-AGENT-001 / BR-AGENT-004） ──

test('旧首页内容（hello world/弹窗/任务看板/刷新列表）已移除', async () => {
  const source = await read('../src/main.ts')
  assert.doesNotMatch(source, /hello world/)
  assert.doesNotMatch(source, /打开弹窗/)
  assert.doesNotMatch(source, /greeting-modal/)
  assert.doesNotMatch(source, /task-board/)
  assert.doesNotMatch(source, /刷新列表/)
  assert.doesNotMatch(source, /initTaskBoard/)
})

// ── 无障碍（AC-AGENT-008 / REQ-AGENT-006 / uiState focus-state） ──

test('无障碍：原生按钮 + aria-live 详情 + focus-visible 样式', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /type="button"/)
  assert.match(source, /aria-live="polite"/)
  const css = await read('../src/style.css')
  assert.match(css, /:focus-visible/)
  assert.match(css, /outline/)
})

test('prefers-reduced-motion: reduce 禁用轨迹动画与平滑滚动', async () => {
  const css = await read('../src/style.css')
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /scroll-behavior:\s*smooth/)
  assert.match(css, /scroll-behavior:\s*auto/)
  assert.match(css, /animation:\s*none/)
})

// ── 文档与元信息（AC-AGENT-009 / REQ-AGENT-007） ──

test('index.html 中文语言、标题、描述、theme-color 与 favicon', async () => {
  const html = await read('../index.html')
  assert.match(html, /lang="zh-CN"/)
  assert.match(html, /<title>[^<]*Agent 学习实验室/)
  assert.match(html, /name="description"/)
  assert.match(html, /name="theme-color"/)
  assert.match(html, /favicon\.svg/)
})

test('favicon 使用主题 token 配色', async () => {
  const favicon = await read('../public/favicon.svg')
  assert.match(favicon, /<svg/)
  assert.match(favicon, /#0B1B2A/)
  assert.match(favicon, /#C9C4FF/)
  assert.match(favicon, /#FF5A36/)
  assert.match(favicon, /#9FE3C2/)
})

test('style.css 使用 PRD 指定的六个 token 色值', async () => {
  const css = await read('../src/style.css')
  assert.match(css, /--color-mist:\s*#e7eef2/)
  assert.match(css, /--color-ink:\s*#10263a/)
  assert.match(css, /--color-navy:\s*#0b1b2a/)
  assert.match(css, /--color-coral:\s*#ff5a36/)
  assert.match(css, /--color-spring:\s*#9fe3c2/)
  assert.match(css, /--color-lilac:\s*#c9c4ff/)
})

test('字体：condensed 显示栈与 ui-monospace 数据标签', async () => {
  const css = await read('../src/style.css')
  assert.match(css, /Arial Narrow/)
  assert.match(css, /ui-monospace/)
})

test('README 人类维护区描述新站点与验证命令，managed block 保留', async () => {
  const readme = await read('../README.md')
  assert.match(readme, /Agent 学习实验室/)
  assert.match(readme, /npm run typecheck/)
  assert.match(readme, /npm run build/)
  assert.match(readme, /npm test/)
  assert.match(readme, /LOOP_AGENT_INIT_START/)
  assert.match(readme, /LOOP_AGENT_INIT_END/)
})

// ── 第一课：结构（AC-002 / AC-005 / uiState initial-load-default-path） ──

test('第一课：空锚点替换为可见课程 section（id + 5.5rem 滚动补偿 + 头部信息）', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /<section class="lesson container" id="first-lesson-beginner"/)
  assert.doesNotMatch(source, /first-lesson-anchor" id="first-lesson-beginner"/)
  assert.match(source, /第 01 课/)
  assert.match(source, /预计用时：60–90 分钟/)
  assert.match(source, /从一次模型调用到可验证的 Agent Run/)
  const css = await read('../src/style.css')
  assert.match(css, /\.lesson\s*\{[\s\S]*?scroll-margin-top:\s*5\.5rem/)
})

test('第一课：hero 与路线详情双 CTA 初始 href 均为 #/lesson/beginner', async () => {
  const source = await read('../src/main.ts')
  const hrefs = source.match(/href="#\/lesson\/beginner"/g) || []
  assert.ok(hrefs.length >= 2, `期望至少 2 个 #/lesson/beginner href，实际 ${hrefs.length}`)
})

test('第一课：单次模型调用 ≠ 完整 Agent、八步闭环与三项学习目标（AC-002 / AC-DEEP-002）', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /单次模型调用 ≠ 完整 Agent/)
  assert.match(source, /目标、输入\/上下文、可执行步骤或工具、停止条件与评估/)
  for (const step of [
    '1 目标',
    '2 输入/上下文',
    '3 计划',
    '4 执行',
    '5 工具/环境',
    '6 输出',
    '7 评估',
    '8 记录',
  ]) {
    assert.ok(source.includes(`<li>${step}</li>`), `缺少闭环步骤 ${step}`)
  }
  assert.match(source, /实际系统可循环/)
  assert.match(source, /本课固定执行一次 run/)
  assert.match(source, /能辨别「一次模型调用」与「一个 Agent run」/)
  assert.match(source, /八项任务合约/)
  assert.match(source, /评估一次 run 并记录结果/)
})

// ── 第一课深化：课程定位与路径（AC-DEEP-001） ──

test('第一课深化：课程定位五要素（适合人群/用时/前置知识/能力/产物）', async () => {
  const source = await read('../src/main.ts')
  for (const key of ['适合人群', '预计用时', '前置知识', '完成后能力', '课程产物']) {
    assert.ok(source.includes(`<dt>${key}</dt>`), `缺少定位项 ${key}`)
  }
  assert.ok(source.includes('60–90 分钟'))
  assert.ok(source.includes('有基础开发经验'))
  assert.ok(source.includes('第一次系统学习 Agent'))
})

test('第一课深化：六段学习路径（概念→拆解→设计→实验→评估→复盘）', async () => {
  const source = await read('../src/main.ts')
  for (const phase of ['概念', '拆解', '设计', '实验', '评估', '复盘']) {
    assert.ok(source.includes(`<td>${phase}</td>`), `缺少路径阶段 ${phase}`)
  }
  assert.ok(source.includes('六段学习路径：目的、学习动作与产出'))
  assert.ok(source.includes('学习动作'))
  assert.ok(source.includes('产出'))
  assert.ok(source.includes('目的'))
})

test('第一课深化：「读完 vs 完成」区分与五类交付物验收关系', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('「读完」与「完成」不是一回事'))
  for (const deliverable of ['任务合约', '冻结输入记录', '执行记录', '评估表', '复盘结论']) {
    assert.ok(source.includes(deliverable), `缺少交付物 ${deliverable}`)
  }
  assert.ok(source.includes('五类交付物：验收关系、最低标准、优秀标准与补救路径'))
  for (const col of ['验收关系', '最低完成标准', '优秀标准', '补救路径']) {
    assert.ok(source.includes(col), `缺少验收列 ${col}`)
  }
  assert.ok(source.includes('任务合约（run-contract.md，八项完整）'))
  assert.ok(source.includes('冻结输入记录（input-freeze.md，含 [S1]/[S2] 摘录原文）'))
})

// ── 第一课深化：概念与对照（AC-002 / AC-DEEP-002） ──

test('第一课深化：模型调用 vs Agent Run 八项差异对照表', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('模型调用与 Agent Run 的八项差异'))
  for (const dim of [
    '目标',
    '状态',
    '步骤/工具',
    '停止条件',
    '输出',
    '评估',
    '失败恢复',
    '可观测证据',
  ]) {
    assert.ok(source.includes(`<th scope="row">${dim}</th>`), `缺少对照表维度 ${dim}`)
  }
  assert.ok(source.includes('单次模型调用'))
  assert.ok(source.includes('一个 Agent Run'))
})

test('第一课深化：五个边界问题与三类例子', async () => {
  const source = await read('../src/main.ts')
  for (const q of ['谁定义目标？', '谁提供事实？', '谁允许行动？', '何时停止？', '谁判断成功？']) {
    assert.ok(source.includes(q), `缺少边界问题 ${q}`)
  }
  assert.ok(source.includes('非 Agent'))
  assert.ok(source.includes('接近但还不是'))
  assert.ok(source.includes('是 Agent Run'))
})

test('第一课深化：静态 run 样例字段与五类风险说明（AC-002 / AC-DEEP-002）', async () => {
  const source = await read('../src/main.ts')
  for (const field of [
    'Run ID',
    '目标',
    '输入快照',
    '步骤与决策',
    '工具边界',
    '停止条件',
    '输出',
    '评估',
    '证据引用',
  ]) {
    assert.ok(source.includes(`<th scope="row">${field}</th>`), `缺少 run 字段 ${field}`)
  }
  assert.ok(source.includes('run-2026-08-13-study-v0-01'))
  for (const risk of ['目标模糊', '输入漂移', '无停止条件', '无评估', '无记录']) {
    assert.ok(source.includes(risk), `缺少风险说明 ${risk}`)
  }
})

test('第一课深化：不可验证失败样例与改写样例', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('看起来回答正确但不可验证'))
  assert.ok(source.includes('失败样例'))
  assert.ok(source.includes('改写样例（加入来源、约束、评估）'))
})

// ── 第一课深化：实验与模板（AC-DEEP-003） ──

test('第一课深化：零网络实验、[S1]/[S2] 约定与三步速览', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /零网络、零账号、零 API key/)
  assert.match(source, /\[S1\]/)
  assert.match(source, /\[S2\]/)
  assert.match(source, /\[S1\]\/\[S2\]/)
  assert.match(source, /冻结输入：/)
  assert.match(source, /执行一次：/)
  assert.match(source, /评估并记录：/)
  assert.match(source, /输出格式示例/)
})

test('第一课深化：五阶段实验（动作/检查点/产物/常见错误）', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('五阶段实验：动作、检查点、产物与常见错误'))
  for (const stage of ['准备', '冻结', '执行', '评估', '复盘']) {
    assert.ok(source.includes(`<th scope="row">${stage}</th>`), `缺少实验阶段 ${stage}`)
  }
  for (const col of ['动作', '检查点', '产物', '常见错误']) {
    assert.ok(source.includes(`<th>${col}</th>`), `缺少阶段列 ${col}`)
  }
})

test('第一课深化：五个可直接复制的本地文本模板（pre 块）', async () => {
  const source = await read('../src/main.ts')
  for (const file of [
    'run-contract.md',
    'input-freeze.md',
    'run-log.md',
    'evaluation.md',
    'retrospective.md',
  ]) {
    assert.ok(source.includes(`# ${file}`), `缺少模板 ${file}`)
  }
  const lesson = lessonRegion(source)
  const preCount = (lesson.match(/<pre><code>/g) || []).length
  assert.ok(preCount >= 5, `期望至少 5 个 pre 块，实际 ${preCount}`)
})

test('第一课深化：八项任务合约模板字段', async () => {
  const source = await read('../src/main.ts')
  for (const field of [
    '任务：',
    '目标：',
    '输入：',
    '约束：',
    '工具边界：',
    '停止条件：',
    '输出格式：',
    '成功标准：',
  ]) {
    assert.ok(source.includes(`- ${field}`), `缺少合约字段 ${field}`)
  }
  assert.ok(source.includes('八项任务合约模板'))
})

// ── 第一课深化：评估与自测（AC-DEEP-004） ──

test('第一课深化：四类故意失败样例与修复提示', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('四类故意失败样例与修复提示'))
  for (const problem of [
    '无来源——结论无法核对',
    '超出边界——引入资料外外部事实',
    '无停止条件——无限扩写',
    '无评估记录——成败无人判定',
  ]) {
    assert.ok(source.includes(problem), `缺少失败样例 ${problem}`)
  }
  assert.ok(source.includes('修复提示'))
})

test('第一课深化：10 分评估量表逐项检查与判定依据', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('10 分评估量表'))
  const items = [
    ['目标清晰', '1 分'],
    ['输入冻结', '1 分'],
    ['来源完整', '2 分'],
    ['约束遵守', '1 分'],
    ['输出结构', '1 分'],
    ['停止条件', '1 分'],
    ['证据记录', '1 分'],
    ['复盘具体', '1 分'],
  ]
  for (const [name, score] of items) {
    assert.ok(source.includes(`<th scope="row">${name}</th>`), `缺少量表项 ${name}`)
    assert.ok(source.includes(`<td>${score}</td>`), `缺少分值 ${score}`)
  }
  assert.ok(source.includes('8 分及以上才算完成'))
  assert.ok(source.includes('低于 8 分必须重跑或修订'))
  assert.ok(source.includes('检查问题'))
  assert.ok(source.includes('通过/不通过判定依据'))
})

test('第一课深化：四道自测题与可直接阅读的参考答案区', async () => {
  const source = await read('../src/main.ts')
  assert.ok(source.includes('自测题与参考答案'))
  for (const q of [
    '为什么一次调用不是 Agent？',
    '输入冻结解决什么风险？',
    '没有评估会怎样？',
    '何时应该停止？',
  ]) {
    assert.ok(source.includes(q), `缺少自测题 ${q}`)
  }
  assert.ok(source.includes('参考答案'))
  const lesson = lessonRegion(source)
  assert.doesNotMatch(lesson, /<details/i)
  assert.doesNotMatch(lesson, /<button/i)
})

test('第一课深化：复盘模板五字段', async () => {
  const source = await read('../src/main.ts')
  for (const field of ['本次目标', '最不确定处', '一次失败或边界', '证据', '下一步改进']) {
    assert.ok(source.includes(field), `缺少复盘字段 ${field}`)
  }
  assert.ok(source.includes('# retrospective.md'))
})

// ── 第一课：静态回归（AC-005 / AC-DEEP-005 / BR-LESSON-001/002/003） ──

test('第一课：builder/advanced 保持空锚点，课程区无交互控件且不被 JS 触碰', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /first-lesson-anchor" id="first-lesson-builder"/)
  assert.match(source, /first-lesson-anchor" id="first-lesson-advanced"/)
  assert.doesNotMatch(source, /<section[^>]*id="first-lesson-builder"/)
  assert.doesNotMatch(source, /<section[^>]*id="first-lesson-advanced"/)
  assert.doesNotMatch(source, /querySelector(?:All)?\([^)]*first-lesson-beginner/)
  assert.doesNotMatch(source, /aria-live="polite"[^>]*first-lesson/)

  const lesson = lessonRegion(source)
  for (const pattern of [
    /<button/i,
    /<details/i,
    /<input/i,
    /<select/i,
    /<textarea/i,
    /checkbox/i,
    /aria-live/i,
  ]) {
    assert.doesNotMatch(lesson, pattern)
  }
})

test('第一课：课程区无网络请求、无 localStorage 写入（BR-LESSON-001）', async () => {
  const source = await read('../src/main.ts')
  assert.doesNotMatch(source, /fetch\(/)
  assert.doesNotMatch(source, /XMLHttpRequest/)
  assert.doesNotMatch(source, /localStorage/)
  assert.doesNotMatch(source, /location\.reload/)
})

test('第一课：下一课预告为纯文字，不指向虚构页面', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /下一课：接入第一个 Tool/)
  assert.match(source, /预告不指向任何虚构页面/)
})

// ── 第一课：响应式与无障碍样式（AC-006 / AC-DEEP-006 / uiState focus/reduced-motion） ──

test('第一课：课程区无新增动画；表格局部滚动；pre 内容级换行避免 390px 横向溢出', async () => {
  const css = await read('../src/style.css')
  assert.equal((css.match(/@keyframes/g) || []).length, 1)
  assert.match(css, /\.lesson-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/)
  assert.match(css, /\.lesson-table\s*\{[\s\S]*?min-width/)
  assert.match(css, /\.lesson-block pre\s*\{[\s\S]*?white-space:\s*pre-wrap/)
  assert.match(css, /\.lesson-loop\s*\{[\s\S]*?repeat\(4,\s*minmax\(0,\s*1fr\)/)
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.lesson\b/)
})

test('第一课深化：语义化表格均带 caption；章节编号与标签齐全', async () => {
  const source = await read('../src/main.ts')
  const captions = (source.match(/<caption>/g) || []).length
  assert.ok(captions >= 5, `期望至少 5 个带 caption 的表格，实际 ${captions}`)
  assert.match(source, /<table class="lesson-table">/)
  for (const chapter of ['01 · 课程定位', '02 · 概念', '03 · 拆解', '04 · 设计', '05 · 实验', '06 · 评估']) {
    assert.ok(source.includes(chapter), `缺少章节编号 ${chapter}`)
  }
  assert.match(source, /lesson-badge/)
})

test('第一课深化：:focus-visible 与 prefers-reduced-motion 行为保留', async () => {
  const css = await read('../src/style.css')
  assert.match(css, /:focus-visible\s*\{[\s\S]*?outline:\s*3px solid var\(--color-coral\)/)
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none/)
  assert.match(css, /scroll-behavior:\s*auto/)
})

// ── 治理与文档（AC-007 / AC-DEEP-007 / vt-governance） ──

test('README 记录第一课深化切片与治理边界', async () => {
  const readme = await read('../README.md')
  assert.match(readme, /从一次模型调用到可验证的 Agent Run/)
  assert.match(readme, /#first-lesson-beginner/)
  assert.match(readme, /#first-lesson-builder/)
  assert.match(readme, /#first-lesson-advanced/)
  assert.match(readme, /空锚点/)
  assert.match(readme, /零网络、零账号、零 API key/)
  assert.match(readme, /60–90 分钟/)
})

test('README 记录 check-repo.sh 运行态阻断与 HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 行为', async () => {
  const readme = await read('../README.md')
  assert.match(readme, /bash scripts\/check-repo\.sh/)
  assert.match(readme, /运行态阻断/)
  assert.match(readme, /HARNESS_ALLOW_ACTIVE_DAG_RUNS=1/)
  assert.match(readme, /\.harness\/dag-runs\/active/)
})

// ── 第二课：接入第一个 Tool（AC-L2-001 / AC-L2-005 / AC-L2-006 / AC-FE-004） ──

test('第二课：section 源码位于第一课之后且开标签含 second-lesson-title（AC-L2-001）', async () => {
  const source = await read('../src/main.ts')
  const first = source.indexOf('<section class="lesson container" id="first-lesson-beginner"')
  const second = source.indexOf('<section class="lesson container" id="second-lesson-beginner"')
  assert.ok(first !== -1 && second !== -1 && second > first, '第二课 section 应位于第一课之后')
  assert.match(
    source,
    /id="second-lesson-beginner"[^>]*aria-labelledby="second-lesson-title"/,
  )
  // 拼接顺序：第一课 → 第二课 → 服务横幅
  const lessonPage = source.slice(source.indexOf('function lessonPageMarkup'))
  assert.match(lessonPage, /lessonSectionMarkup[\s\S]*secondLessonSectionMarkup[\s\S]*serviceBannerMarkup/)
  // 渲染路径无 querySelector 触碰第二课
  assert.doesNotMatch(source, /querySelector(?:All)?\([^)]*second-lesson-beginner/)
})

test('第二课：课程定位五要素、六段学习路径与课程产物（AC-L2-005）', async () => {
  const source = await read('../src/main.ts')
  const lesson = secondLessonRegion(source)
  for (const key of ['适合人群', '预计用时', '前置知识', '完成后能力', '课程产物']) {
    assert.ok(lesson.includes(`<dt>${key}</dt>`), `缺少定位项 ${key}`)
  }
  assert.ok(lesson.includes('六段学习路径'))
  for (const phase of ['概念', '拆解', '设计', '实验', '评估', '复盘']) {
    assert.ok(lesson.includes(`<td>${phase}</td>`), `缺少路径阶段 ${phase}`)
  }
  assert.ok(lesson.includes('tool-contract.md'))
  assert.ok(lesson.includes('tool-call-log.md'))
  assert.ok(lesson.includes('search_research'))
})

test('第二课：06 评估段含 10 分量表、四类失败样例、自测题与复盘模板（AC-L2-005）', async () => {
  const source = await read('../src/main.ts')
  const lesson = secondLessonRegion(source)
  assert.ok(lesson.includes('lesson2-06-title'))
  // 10 分量表：各项合计 10 分、8 分及以上完成判定
  assert.ok(lesson.includes('10 分评估量表'))
  assert.ok(lesson.includes('8 分及以上才算完成'))
  assert.ok(lesson.includes('检查问题'))
  assert.ok(lesson.includes('通过/不通过判定依据'))
  const scores = [...lesson.matchAll(/<td>(\d+) 分<\/td>/g)].map((m) => Number(m[1]))
  assert.ok(scores.length >= 6, `期望至少 6 个分项，实际 ${scores.length}`)
  assert.equal(scores.reduce((a, b) => a + b, 0), 10)
  // 四类故意失败样例与修复提示
  assert.ok(lesson.includes('四类故意失败样例与修复提示'))
  for (const problem of ['无参数 Schema', '工具名幻觉', '失败不重试', '调用无记录']) {
    assert.ok(lesson.includes(problem), `缺少失败样例 ${problem}`)
  }
  assert.ok(lesson.includes('修复提示'))
  // 自测题与直接可读参考答案区（3–4 道）
  assert.ok(lesson.includes('自测题与参考答案'))
  const questions = (lesson.match(/<th scope="row">[^<]*？<\/th>/g) || []).length
  assert.ok(questions >= 3 && questions <= 4, `期望 3–4 道自测题，实际 ${questions}`)
  // 复盘模板
  assert.ok(lesson.includes('复盘'))
  assert.ok(lesson.includes('retrospective.md'))
})

test('第二课：区域纯净（无交互控件/aria-live）且第一课 next 指向本页第二课（AC-L2-006 / AC-FE-004）', async () => {
  const source = await read('../src/main.ts')
  const lesson = secondLessonRegion(source)
  for (const pattern of [
    /<button/i,
    /<details/i,
    /<input/i,
    /<select/i,
    /<textarea/i,
    /checkbox/i,
    /aria-live/i,
    /@keyframes/,
  ]) {
    assert.doesNotMatch(lesson, pattern)
  }
  // 第一课 next 保留既有断言子串并新增指向本页第二课的文案
  assert.match(source, /下一课：接入第一个 Tool/)
  assert.match(source, /预告不指向任何虚构页面/)
  assert.match(source, /第二课「接入第一个 Tool：声明可验证的工具调用」/)
  assert.match(source, /second-lesson-beginner 区块/)
})
