// 前端后端化静态契约测试（node --test）：断言 src 层源码结构与架构裁决 R1/R2。
// 覆盖 AC-FE-001~006 的静态可验证部分：API 客户端、令牌持久化、降级横幅、进度面板。
import { test } from 'node:test'
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
