import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (rel) => readFile(new URL(rel, import.meta.url), 'utf8')

// ── 站点身份与 Hero（AC-AGENT-001 / REQ-AGENT-001） ──

test('站点身份：Agent 学习实验室与主张', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /Agent 学习实验室/)
  assert.match(source, /让 Agent 不再靠运气工作/)
})

test('首屏包含主 CTA（指向第一课锚点）与次 CTA（能力地图）', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /href="#first-lesson-beginner"/)
  assert.match(source, /href="#capability-map"/)
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

test('路线切换同步 aria-pressed、活动样式与详情字段', async () => {
  const source = await read('../src/main.ts')
  assert.match(source, /setAttribute\(['"]aria-pressed['"]/)
  assert.match(source, /classList\.toggle/)
  assert.match(source, /routeNameEl/)
  assert.match(source, /routeAudienceEl/)
  assert.match(source, /routeDurationEl/)
  assert.match(source, /routeLessonCountEl/)
  assert.match(source, /routeSummaryEl/)
  assert.match(source, /routeStagesEl/)
  assert.match(source, /traceStatusEls/)
  assert.match(source, /firstLessonLink/)
  assert.match(source, /#first-lesson-\$\{route\.id\}/)
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
