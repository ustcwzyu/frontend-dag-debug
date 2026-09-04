// 前端后端化静态契约测试（jest）：断言 src 层源码结构与架构裁决 R1/R2。
// 覆盖 AC-FE-001~006 的静态可验证部分：API 客户端、令牌持久化、降级横幅、进度面板。
// Jest 全局提供 test（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8')
const authSource = readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8')

test('AC-FE-001 api.ts 请求全部内容端点并做形状校验', () => {
  assert.match(apiSource, /fetch\(`\$\{BASE\}\/routes`\)/)
  assert.match(apiSource, /fetch\(`\$\{BASE\}\/capabilities`\)/)
  assert.match(apiSource, /fetch\(`\$\{BASE\}\/lab`\)/)
  assert.match(apiSource, /fetch\(`\$\{BASE\}\/lessons\/beginner`\)/)
  assert.match(apiSource, /Promise\.all/)
  assert.match(apiSource, /routes payload is empty or malformed/)
  assert.match(apiSource, /capabilities payload is malformed/)
  assert.match(apiSource, /lesson payload is malformed/)
})

test('AC-FE-001 main.ts 启动即加载服务端内容（降级路径存在）', () => {
  assert.match(mainSource, /loadServerContent\(\)/)
  assert.match(mainSource, /void loadServerContent\(\)/)
  assert.match(mainSource, /service-unavailable/)
  assert.match(mainSource, /服务不可用：课程内容以本地缓存展示，进度保存暂不可用/)
  assert.match(mainSource, /serviceBanner\.hidden = true/)
})

test('AC-FE-002 降级横幅默认隐藏，失败时展示', () => {
  assert.match(mainSource, /<p class="service-banner" id="service-unavailable" hidden>/)
  assert.match(mainSource, /serviceBanner\.hidden = false/)
})

test('AC-FE-003/004 登录注册表单与登录态切换', () => {
  assert.match(mainSource, /<form class="auth-form" id="auth-form">/)
  assert.match(mainSource, /id="auth-username"/)
  assert.match(mainSource, /id="auth-password"/)
  assert.match(mainSource, /id="auth-submit-login"/)
  assert.match(mainSource, /id="auth-toggle"/)
  assert.match(mainSource, /id="auth-error"/)
  assert.match(mainSource, /login\(username, password\)/)
  assert.match(mainSource, /register\(username, password\)/)
  assert.match(mainSource, /enterLoggedIn\(session\.username, session\.token\)/)
  assert.match(mainSource, /saveSession\(currentSession\)/)
  assert.match(mainSource, /clearSession\(\)/)
  assert.match(mainSource, /id="progress-logout"/)
})

test('AC-FE-005/006 进度面板：控件、保存与恢复', () => {
  assert.match(mainSource, /<section class="progress-panel container" id="progress-panel"/)
  assert.match(mainSource, /id="progress-first-lesson"/)
  assert.match(mainSource, /id="progress-score"/)
  assert.match(mainSource, /min="0" max="10" step="1"/)
  assert.match(mainSource, /id="progress-lab"/)
  assert.match(mainSource, /id="progress-save"/)
  assert.match(mainSource, /id="progress-status" aria-live="polite"/)
  assert.match(mainSource, /getProgress\(currentSession\.token\)/)
  assert.match(mainSource, /putProgress\(currentSession\.token,/)
  assert.match(mainSource, /保存失败，已保留当前填写内容/)
  assert.match(mainSource, /登录后可在不同设备恢复你的进度/)
})

test('R1/R2 裁决：main.ts 不出现网络与存储字面量', () => {
  assert.doesNotMatch(mainSource, /fetch\(/)
  assert.doesNotMatch(mainSource, /localStorage/)
  assert.doesNotMatch(mainSource, /XMLHttpRequest/)
  assert.doesNotMatch(mainSource, /location\.reload/)
})

test('R1/R2 裁决：网络仅收敛于 api.ts、存储仅收敛于 auth.ts', () => {
  assert.match(apiSource, /fetch\(/)
  assert.match(authSource, /localStorage/)
  assert.doesNotMatch(authSource, /fetch\(/)
  assert.doesNotMatch(apiSource, /localStorage/)
})

test('R1 裁决：会话 key 与 task-board 的 tasks key 严格区分', () => {
  assert.match(authSource, /SESSION_KEY = 'frontend-dag-debug:auth'/)
  assert.doesNotMatch(mainSource, /frontend-dag-debug:tasks/)
  assert.doesNotMatch(apiSource, /frontend-dag-debug:tasks/)
  assert.doesNotMatch(mainSource, /frontend-dag-debug:auth/)
})

test('R2 裁决：课程区仍无交互控件（lessonRegion 纯净）', () => {
  const start = mainSource.indexOf('<section class="lesson container" id="first-lesson-beginner"')
  const end = mainSource.indexOf('<section class="capability-map')
  assert.ok(start >= 0, 'first-lesson-beginner section 存在')
  assert.ok(end > start, 'capability-map 在课程区之后')
  const lesson = mainSource.slice(start, end)
  assert.doesNotMatch(lesson, /<button/)
  assert.doesNotMatch(lesson, /<details/)
  assert.doesNotMatch(lesson, /<input/)
  assert.doesNotMatch(lesson, /<select/)
  assert.doesNotMatch(lesson, /<textarea/)
  assert.doesNotMatch(lesson, /<checkbox/)
  assert.doesNotMatch(lesson, /aria-live/)
})

test('R2 裁决：课程重渲染不经过 querySelector(...first-lesson-beginner)', () => {
  assert.doesNotMatch(mainSource, /querySelector(?:All)?\([^)]*first-lesson-beginner/)
  assert.match(mainSource, /getElementById\('first-lesson-beginner'\)/)
})

test('R4 裁决：style.css 仍只有一处 @keyframes', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
  const matches = css.match(/@keyframes/g) || []
  assert.equal(matches.length, 1)
  assert.match(css, /\.service-banner/)
  assert.match(css, /\.progress-panel/)
  assert.match(css, /\.auth-form/)
  assert.match(css, /\.progress-form/)
})

// ── 第二课：接入第一个 Tool（AC-L2-005 / AC-L2-006 / AC-L2-008 / AC-FE-004） ──

test('AC-L2-008 api.ts 并行拉取第二课端点并做形状校验', () => {
  assert.match(apiSource, /fetch\(`\$\{BASE\}\/lessons\/beginner-2`\)/)
  assert.match(apiSource, /lesson2 payload is malformed/)
  assert.match(apiSource, /return \{ routes, capabilities, lab, lesson, lesson2 \}/)
  const contentFetches = (apiSource.match(/fetch\(`\$\{BASE\}\//g) || []).length
  assert.ok(contentFetches >= 5, `期望至少 5 个内容 fetch 端点，实际 ${contentFetches}`)
})

test('AC-L2-008 main.ts 双课替换路径与缓存类型扩展', () => {
  assert.match(mainSource, /getElementById\('first-lesson-beginner'\)/)
  assert.match(mainSource, /getElementById\('second-lesson-beginner'\)/)
  // 第二课替换带存在性与内容非空条件
  assert.match(
    mainSource,
    /getElementById\('second-lesson-beginner'\)[\s\S]{0,400}cachedContent\.lesson2\.html/,
  )
  assert.match(mainSource, /cachedContent: \{ lesson: LessonData; lesson2: LessonData \}/)
  assert.match(mainSource, /cachedContent = \{ lesson: content\.lesson, lesson2: content\.lesson2 \}/)
  assert.doesNotMatch(mainSource, /querySelector(?:All)?\([^)]*second-lesson-beginner/)
  assert.match(mainSource, /lessonPageMarkup[\s\S]*lessonSectionMarkup[\s\S]*secondLessonSectionMarkup/)
})

test('AC-L2-005/006 第二课落入课程区纯净断言范围且 main.ts 无网络/存储字面量', () => {
  const start = mainSource.indexOf('<section class="lesson container" id="second-lesson-beginner"')
  const end = mainSource.indexOf('const lessonPlaceholderMarkup', start)
  assert.ok(start >= 0, 'second-lesson-beginner section 存在')
  assert.ok(end > start, '第二课区域可定位')
  const secondLesson = mainSource.slice(start, end)
  for (const pattern of [
    /<button/i,
    /<details/i,
    /<input/i,
    /<select/i,
    /<textarea/i,
    /checkbox/i,
    /aria-live/i,
  ]) {
    assert.doesNotMatch(secondLesson, pattern)
  }
  // 第二课内容不引入网络/存储字面量（fetch 仅收敛于 src/api.ts）
  assert.doesNotMatch(secondLesson, /fetch\(/)
  assert.doesNotMatch(secondLesson, /localStorage/)
  assert.doesNotMatch(secondLesson, /XMLHttpRequest/)
  assert.doesNotMatch(secondLesson, /location\.reload/)
})

test('R3 裁决：第二课 main.ts 内层与 server/content.ts 逐字一致（AC-L2-005）', () => {
  const serverSource = readFileSync(new URL('../server/content.ts', import.meta.url), 'utf8')
  const open = '<section class="lesson container" id="second-lesson-beginner"'
  const start = mainSource.indexOf(open)
  assert.ok(start >= 0, 'main.ts 第二课 section 存在')
  const literalStart = mainSource.indexOf('const secondLessonSectionMarkup = `')
  const contentStart = mainSource.indexOf('`', literalStart) + 1
  const contentEnd = mainSource.indexOf('`', contentStart)
  const mainSection = mainSource.slice(contentStart, contentEnd)
  const mainInner = mainSection
    .replace(/^\s*<section class="lesson container" id="second-lesson-beginner"[^>]*>\n/, '')
    .replace(/\n\s*<\/section>\s*$/, '')
  const serverLiteralStart = serverSource.indexOf('lessonBeginnerSecondHtml = `')
  assert.ok(serverLiteralStart >= 0, 'server 第二课字面量存在')
  const serverContentStart = serverSource.indexOf('`', serverLiteralStart) + 1
  const serverContentEnd = serverSource.indexOf('`', serverContentStart)
  const serverInner = serverSource.slice(serverContentStart, serverContentEnd)
  // 规范化：逐行去尾部空白并去掉首尾空行，其余（含行内缩进）逐字比较
  const canonical = (text) =>
    text
      .split('\n')
      .map((line) => line.replace(/\s+$/, ''))
      .join('\n')
      .replace(/^\n+|\n+$/g, '')
  assert.equal(canonical(mainInner), canonical(serverInner))
  // 关键锚点：六个 lesson2-0X-title、tool-contract.md、tool-call-log.md、10 分评估量表
  for (let i = 1; i <= 6; i++) {
    assert.ok(mainInner.includes(`lesson2-0${i}-title`), `main.ts 缺少 lesson2-0${i}-title`)
    assert.ok(serverInner.includes(`lesson2-0${i}-title`), `server 缺少 lesson2-0${i}-title`)
  }
  for (const anchor of ['tool-contract.md', 'tool-call-log.md', '10 分评估量表', '8 分及以上才算完成']) {
    assert.ok(mainInner.includes(anchor), `main.ts 第二课缺少锚点 ${anchor}`)
    assert.ok(serverInner.includes(anchor), `server 第二课缺少锚点 ${anchor}`)
  }
})
