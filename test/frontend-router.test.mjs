// 前端 hash 路由契约测试（node --test）：parseHash 纯函数单元断言 + router/main 静态结构断言。
// 覆盖 vt-parse-hash / vt-router-purity / vt-router-dispatch / vt-auth-gates / vt-state-keep / vt-banner-cache。
// 路由零依赖：src/router.ts 可在 Node 中直接导入（模块级零副作用、零网络、零存储）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseHash } from '../src/router.ts'

const routerSource = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')

// ── vt-parse-hash：固定路由表（BR-RT-001） ──

test('parseHash：空/#/#/ → home（AC-FE-001）', () => {
  for (const hash of ['', '#', '#/']) {
    assert.deepEqual(parseHash(hash), { page: 'home', routeId: null }, `hash=${hash}`)
  }
})

test('parseHash：#/lesson/{beginner|builder|advanced} → lesson（BR-RT-001 / AC-FE-002）', () => {
  for (const routeId of ['beginner', 'builder', 'advanced']) {
    assert.deepEqual(
      parseHash(`#/lesson/${routeId}`),
      { page: 'lesson', routeId },
      `route=${routeId}`,
    )
  }
})

test('parseHash：#/progress、#/login → progress、login（BR-RT-001）', () => {
  assert.deepEqual(parseHash('#/progress'), { page: 'progress', routeId: null })
  assert.deepEqual(parseHash('#/login'), { page: 'login', routeId: null })
})

test('parseHash：#/archive → archive（全等匹配，AC-001 / AC-ARC-001）', () => {
  assert.deepEqual(parseHash('#/archive'), { page: 'archive', routeId: null })
  // 带尾斜杠 '#/archive/' 落入 not-found，与 #/progress/、#/login/ 同构
  assert.deepEqual(parseHash('#/archive/'), { page: 'not-found', routeId: null })
})

test('parseHash：#/export → export（全等匹配，AC-001 / AC-EXP-001）', () => {
  assert.deepEqual(parseHash('#/export'), { page: 'export', routeId: null })
  // 带尾斜杠 '#/export/' 落入 not-found，与 #/archive/ 同构
  assert.deepEqual(parseHash('#/export/'), { page: 'not-found', routeId: null })
})

test('parseHash：其余（含 #/lesson/unknown、#/nonsense）→ not-found（AC-FE-010 / BR-RT-001）', () => {
  for (const hash of [
    '#/nonsense',
    '#/lesson/unknown',
    '#/lesson/',
    '#/lesson',
    '#/progress/',
    '#/login/',
    '#/archive/',
    '#/capability-map',
    '#first-lesson-beginner',
    '#foo',
  ]) {
    assert.deepEqual(parseHash(hash), { page: 'not-found', routeId: null }, `hash=${hash}`)
  }
})

// ── vt-router-purity：router.ts 纯净（BR-RT-001） ──

test('router.ts 零依赖纯净：无网络/存储/重载字面量、无 document 访问', () => {
  assert.doesNotMatch(routerSource, /fetch\(/)
  assert.doesNotMatch(routerSource, /localStorage/)
  assert.doesNotMatch(routerSource, /XMLHttpRequest/)
  assert.doesNotMatch(routerSource, /location\.reload/)
  assert.doesNotMatch(routerSource, /document\./)
})

test('router.ts 幂等导航：hash 相同不赋值（AC-FE-012 / BR-RT-002）', () => {
  assert.match(routerSource, /window\.location\.hash !== hash/)
})

test('router.ts startRouter：routerStarted 守卫 + 唯一 hashchange 监听 + 首次分派（BR-RT-002）', () => {
  assert.match(routerSource, /let routerStarted = false/)
  assert.match(routerSource, /if \(routerStarted\) return/)
  assert.match(routerSource, /addEventListener\('hashchange', dispatch\)/)
  assert.match(routerSource, /dispatch\(\)/)
})

// ── vt-router-dispatch：main.ts 接入 startRouter（BR-RT-002/003） ──

test('main.ts 经 startRouter 注册唯一 hashchange 并首次分派 render', () => {
  assert.match(mainSource, /startRouter\(\(\) => render\(\)\)/)
  assert.match(mainSource, /parseHash\(window\.location\.hash\)/)
  assert.doesNotMatch(mainSource, /addEventListener\('hashchange'/)
})

test('main.ts 主导航四入口驱动 hash 切换，当前路由 is-active（BR-RT-003 / AC-FE-012）', () => {
  assert.match(mainSource, /'#\/'/)
  assert.match(mainSource, /'#\/lesson\/beginner'/)
  assert.match(mainSource, /'#\/progress'/)
  assert.match(mainSource, /'#\/login'/)
  assert.match(mainSource, /site-header__link/)
  assert.match(mainSource, /is-active/)
  assert.match(mainSource, /href="\$\{item\.hash\}"/)
})

test('main.ts 路线 tab 点击 navigate 到对应课程页（AC-FE-002 / route-tab-click）', () => {
  assert.match(mainSource, /navigate\(`#\/lesson\/\$\{routeId\}`\)/)
})

test('main.ts 重复渲染不累积监听：事件仅绑定于每次渲染重建的节点（BR-RT-002）', () => {
  assert.match(mainSource, /querySelectorAll<HTMLButtonElement>\('\.route-tab'\)/)
})

// ── vt-auth-gates：登录门与登录/注册（AC-FE-007/008 / BR-RT-004/005） ──

test('main.ts 已登录访问 #/login 自动 navigate(#/progress)（BR-RT-004 / login-redirect）', () => {
  assert.match(mainSource, /parsed\.page === 'login' && currentSession/)
  assert.match(mainSource, /navigate\('#\/progress'\)/)
})

test('main.ts 登录/注册提交经 api.ts 且成功进入登录态（AC-FE-007 / auth-submit）', () => {
  assert.match(mainSource, /login\(username, password\)/)
  assert.match(mainSource, /register\(username, password\)/)
  assert.match(mainSource, /enterLoggedIn\(session\.username, session\.token\)/)
  assert.match(mainSource, /saveSession\(currentSession\)/)
})

test('main.ts 登录失败展示 auth-error，表单保留已填内容（AC-FE-007 / login-error）', () => {
  assert.match(mainSource, /showAuthError\(err\.message\)/)
  assert.match(mainSource, /id="auth-error"/)
})

test('main.ts 未登录访问 #/progress 渲染 guest 提示与 #/login 链接（BR-RT-005 / progress-guest-prompt）', () => {
  assert.match(mainSource, /请先登录/)
  assert.match(mainSource, /href="#\/login"/)
})

test('main.ts 退出登录清会话并重渲染当前路由（progress-logout / AC-FE-009）', () => {
  assert.match(mainSource, /enterLoggedOut[\s\S]{0,120}clearSession\(\)/)
  assert.match(mainSource, /enterLoggedOut[\s\S]{0,120}setJournalSession\(null\)/)
})

// ── vt-state-keep / vt-banner-cache：缓存、降级与工作台复用（BR-RT-006/007） ──

test('main.ts 模块级缓存与降级标志（BR-RT-006 / AC-FE-003 / vt-banner-cache）', () => {
  assert.match(mainSource, /let cachedContent/)
  assert.match(mainSource, /let contentLoadFailed/)
  assert.match(mainSource, /contentLoadFailed = false/)
  assert.match(mainSource, /contentLoadFailed = true/)
  assert.match(mainSource, /<p class="service-banner" id="service-unavailable" hidden>/)
  assert.match(mainSource, /服务不可用：课程内容以本地缓存展示，进度保存暂不可用/)
  assert.match(mainSource, /serviceBanner\.hidden = false/)
  assert.match(mainSource, /serviceBanner\.hidden = true/)
})

test('main.ts 课程替换路径仅 getElementById（AC-FE-006 / vt-router-purity）', () => {
  assert.match(mainSource, /getElementById\('first-lesson-beginner'\)/)
  assert.doesNotMatch(mainSource, /querySelector(?:All)?\([^)]*first-lesson-beginner/)
})

test('main.ts 工作台节点复用：仅初始化一次、切页 replaceChildren 迁回（BR-RT-002/007 / vt-state-keep）', () => {
  assert.match(mainSource, /let workbenchMount/)
  assert.match(mainSource, /replaceChildren\(workbenchMount\)/)
  assert.match(mainSource, /initJournalWorkbench\(host\)/)
  assert.match(mainSource, /getElementById\('journal-workbench-mount'\)/)
})

test('main.ts 路由切换不登出：clearSession 仅出现在 enterLoggedOut（AC-FE-011 / BR-RT-007）', () => {
  assert.match(mainSource, /enterLoggedIn[\s\S]{0,200}saveSession\(currentSession\)/)
  const loginBlocks = mainSource.match(/clearSession\(\)/g) || []
  assert.equal(loginBlocks.length, 1, 'clearSession 只应出现一次（enterLoggedOut 内）')
})

// ── 404 兜底页（AC-FE-010 / not-found） ──

test('main.ts 404 兜底：页面不存在 + 返回主页链接，无自动重定向字面量', () => {
  assert.match(mainSource, /页面不存在/)
  assert.match(mainSource, /返回主页/)
  assert.doesNotMatch(mainSource, /location\.replace/)
  assert.doesNotMatch(mainSource, /location\.reload/)
})

// ── 课程占位（AC-FE-005 / lesson-placeholder） ──

test('main.ts builder/advanced 占位含静态空锚点 span 且不渲染为 section（AC-FE-005）', () => {
  assert.match(mainSource, /first-lesson-anchor" id="first-lesson-builder"/)
  assert.match(mainSource, /first-lesson-anchor" id="first-lesson-advanced"/)
  assert.doesNotMatch(mainSource, /<section[^>]*id="first-lesson-builder"/)
  assert.doesNotMatch(mainSource, /<section[^>]*id="first-lesson-advanced"/)
  assert.match(mainSource, /内容筹备中/)
})
