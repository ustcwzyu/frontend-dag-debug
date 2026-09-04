// 学习实验归档中心契约测试（jest）：运行时纯函数断言 + 静态源码断言。
// 运行时：babel-jest 类型剥离后直接导入 src/archive.ts 验证纯函数
// （validateArchiveEntry / searchArchiveEntries / filterArchiveEntries /
// sortArchiveEntries / computeArchiveSummary / mergeArchiveSummaryForSync /
// syncArchiveProgress 失败语义 / 存储降级 / escapeHtml 等）。
// 静态：断言 main.ts archive 页面骨架（精确文案、type="button"、aria-labelledby、
// 挂载点、登录态联动、零 fetch/localStorage）、archive.ts 结构与 window.confirm、
// style.css archive-* 类与 390px 收窄、jest 入口与发现规则登记本测试文件。
// Jest 全局提供 test（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ARCHIVE_ROUTES,
  ARCHIVE_STATUSES,
  ARCHIVE_STORAGE_KEY,
  archiveStorageAvailable,
  computeArchiveSummary,
  escapeHtml,
  filterArchiveEntries,
  isValidArchiveEntry,
  loadArchiveEntries,
  mergeArchiveSummaryForSync,
  saveArchiveEntries,
  searchArchiveEntries,
  sortArchiveEntries,
  syncArchiveProgress,
  validateArchiveEntry,
  validateArchiveScore,
} from '../src/archive.ts'

const readFile = (path) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')
const archiveSource = readFile('../src/archive.ts')
const mainSource = readFile('../src/main.ts')
const routerSource = readFile('../src/router.ts')
const cssSource = readFile('../src/style.css')
const pkgSource = readFile('../package.json')
const jestConfigSource = readFile('../jest.config.mjs')

// ── 常量与隔离（AC-ARC-003 / AC-003） ──

test('存储 key 为 frontend-dag-debug:archive 且不触碰 journal/auth/tasks key（AC-003）', () => {
  assert.equal(ARCHIVE_STORAGE_KEY, 'frontend-dag-debug:archive')
  assert.deepEqual(ARCHIVE_ROUTES, ['beginner', 'builder', 'advanced'])
  assert.deepEqual(ARCHIVE_STATUSES, ['planned', 'running', 'archived'])
  assert.match(archiveSource, /frontend-dag-debug:archive/)
  assert.doesNotMatch(archiveSource, /frontend-dag-debug:journal/)
  assert.doesNotMatch(archiveSource, /frontend-dag-debug:auth/)
  assert.doesNotMatch(archiveSource, /frontend-dag-debug:tasks/)
})

// ── 校验（AC-003 / uiState create-invalid） ──

test('validateArchiveScore：0–10 整数或空合法；11/-1/7.5/10.0 拒绝（AC-003）', () => {
  assert.deepEqual(validateArchiveScore(''), { valid: true, value: null })
  assert.deepEqual(validateArchiveScore('   '), { valid: true, value: null })
  assert.deepEqual(validateArchiveScore('0'), { valid: true, value: 0 })
  assert.deepEqual(validateArchiveScore('10'), { valid: true, value: 10 })
  assert.equal(validateArchiveScore('11').valid, false)
  assert.equal(validateArchiveScore('-1').valid, false)
  assert.equal(validateArchiveScore('7.5').valid, false)
  assert.equal(validateArchiveScore('10.0').valid, false)
  assert.equal(validateArchiveScore('abc').valid, false)
})

test('validateArchiveEntry：标题空/route 未选/score 非法均拒绝并给出错误（create-invalid）', () => {
  const valid = validateArchiveEntry({ title: '研究助手 run-01', route: 'beginner', score: '8' })
  assert.deepEqual(valid, { valid: true, errors: [] })
  // 标题空
  const noTitle = validateArchiveEntry({ title: '   ', route: 'beginner', score: '8' })
  assert.equal(noTitle.valid, false)
  assert.ok(noTitle.errors.some((err) => err.includes('标题不能为空')))
  // route 未选
  const noRoute = validateArchiveEntry({ title: 'run-01', route: '', score: '8' })
  assert.equal(noRoute.valid, false)
  assert.ok(noRoute.errors.some((err) => err.includes('路线必选')))
  // score 非法
  const badScore = validateArchiveEntry({ title: 'run-01', route: 'beginner', score: '11' })
  assert.equal(badScore.valid, false)
  assert.ok(badScore.errors.some((err) => err.includes('0–10 的整数')))
})

// ── 搜索 / 筛选 / 排序（AC-ARC-004 / archive-search / filter / sort） ──

function sampleEntry(overrides = {}) {
  return {
    id: 'archive-1',
    title: '研究助手 v0 复现实验',
    route: 'beginner',
    status: 'planned',
    score: 8,
    note: '复现 [S1]/[S2] 三条区别',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  }
}

test('searchArchiveEntries：title+note 不区分大小写包含匹配；空查询返回全部（AC-ARC-004）', () => {
  const entries = [
    sampleEntry({ id: 'a', title: '研究助手复现', note: '复现三条区别' }),
    sampleEntry({ id: 'b', title: 'Tool 接入实验', note: '声明 search_research 工具' }),
    sampleEntry({ id: 'c', title: '评估驱动迭代', note: '复盘 [S1] 来源' }),
  ]
  // title 匹配
  assert.deepEqual(searchArchiveEntries(entries, '实验').map((e) => e.id), ['b'])
  // 大小写不敏感（TOOL ↔ Tool）
  assert.deepEqual(searchArchiveEntries(entries, 'TOOL').map((e) => e.id), ['b'])
  // note 匹配
  assert.deepEqual(searchArchiveEntries(entries, 'search_research').map((e) => e.id), ['b'])
  assert.deepEqual(searchArchiveEntries(entries, '工具').map((e) => e.id), ['b'])
  // 空查询
  assert.equal(searchArchiveEntries(entries, '').length, 3)
  assert.equal(searchArchiveEntries(entries, '   ').length, 3)
  // 无匹配
  assert.deepEqual(searchArchiveEntries(entries, '不存在的关键词'), [])
})

test('filterArchiveEntries：route × status 两轴组合过滤；all 不过滤（AC-ARC-004）', () => {
  const entries = [
    sampleEntry({ id: 'a', route: 'beginner', status: 'planned' }),
    sampleEntry({ id: 'b', route: 'builder', status: 'running' }),
    sampleEntry({ id: 'c', route: 'advanced', status: 'archived' }),
    sampleEntry({ id: 'd', route: 'beginner', status: 'archived' }),
  ]
  assert.deepEqual(filterArchiveEntries(entries, 'all', 'all').map((e) => e.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(filterArchiveEntries(entries, 'beginner', 'all').map((e) => e.id), ['a', 'd'])
  assert.deepEqual(filterArchiveEntries(entries, 'all', 'archived').map((e) => e.id), ['c', 'd'])
  assert.deepEqual(filterArchiveEntries(entries, 'beginner', 'archived').map((e) => e.id), ['d'])
  assert.deepEqual(filterArchiveEntries(entries, 'builder', 'archived'), [])
})

test('sortArchiveEntries：title/updatedAt/score 三字段升降序（archive-sort）', () => {
  const entries = [
    sampleEntry({ id: 'a', title: 'Alpha run', updatedAt: '2026-08-20T10:00:00.000Z', score: 8 }),
    sampleEntry({ id: 'b', title: 'Bravo run', updatedAt: '2026-08-21T10:00:00.000Z', score: 5 }),
    sampleEntry({ id: 'c', title: 'Charlie run', updatedAt: '2026-08-19T10:00:00.000Z', score: null }),
  ]
  // title 升序（按字符串比较）
  assert.deepEqual(sortArchiveEntries(entries, 'title', 'asc').map((e) => e.id), ['a', 'b', 'c'])
  assert.deepEqual(sortArchiveEntries(entries, 'title', 'desc').map((e) => e.id), ['c', 'b', 'a'])
  // updatedAt 升/降序
  assert.deepEqual(sortArchiveEntries(entries, 'updatedAt', 'asc').map((e) => e.id), ['c', 'a', 'b'])
  assert.deepEqual(sortArchiveEntries(entries, 'updatedAt', 'desc').map((e) => e.id), ['b', 'a', 'c'])
  // score：空值按 -1 参与比较（升序排最前、降序排最后）
  assert.deepEqual(sortArchiveEntries(entries, 'score', 'asc').map((e) => e.id), ['c', 'b', 'a'])
  assert.deepEqual(sortArchiveEntries(entries, 'score', 'desc').map((e) => e.id), ['a', 'b', 'c'])
  // 不修改入参数组
  assert.equal(entries.length, 3)
})

// ── 归档摘要（archive-marked） ──

test('computeArchiveSummary：仅 archived 记录计入；无自评记录均值为 null（AC-ARC-005）', () => {
  assert.deepEqual(computeArchiveSummary([]), { archivedCount: 0, completedEvaluationMean: null })
  const entries = [
    sampleEntry({ id: 'a', status: 'planned', score: 9 }),
    sampleEntry({ id: 'b', status: 'archived', score: 8 }),
    sampleEntry({ id: 'c', status: 'archived', score: 9 }),
    sampleEntry({ id: 'd', status: 'archived', score: null }),
  ]
  // 仅 archived 计数；均值只含非空自评
  assert.deepEqual(computeArchiveSummary(entries), {
    archivedCount: 3,
    completedEvaluationMean: 8.5,
  })
  // 全部 archived 但自评皆空 → 均值 null
  const noScores = [
    sampleEntry({ id: 'x', status: 'archived', score: null }),
    sampleEntry({ id: 'y', status: 'archived', score: null }),
  ]
  assert.deepEqual(computeArchiveSummary(noScores), {
    archivedCount: 2,
    completedEvaluationMean: null,
  })
})

// ── 同步（AC-ARC-005 / sync-synced / sync-failed） ──

test('mergeArchiveSummaryForSync：identity-preserving，三字段保持服务端原值（AC-ARC-005）', () => {
  const server = {
    firstLessonCompleted: true,
    evaluationScore: 7,
    weeklyLabCompleted: false,
  }
  // 无论本地摘要数字如何，均不覆盖服务端字段（ProgressData 无扩展字段、PUT 严格校验）
  const merged = mergeArchiveSummaryForSync(server, {
    archivedCount: 3,
    completedEvaluationMean: 8.5,
  })
  assert.deepEqual(merged, server)
  assert.deepEqual(mergeArchiveSummaryForSync(server, { archivedCount: 0, completedEvaluationMean: null }), server)
})

test('syncArchiveProgress：成功路径先 GET 后 PUT，合并体保持服务端原值（sync-synced）', async () => {
  const calls = []
  const deps = {
    getProgress: async () => {
      calls.push('get')
      return {
        firstLessonCompleted: true,
        evaluationScore: 7,
        weeklyLabCompleted: true,
        updatedAt: '2026-08-20T00:00:00.000Z',
      }
    },
    putProgress: async (token, body) => {
      calls.push('put')
      assert.equal(token, 'test-token')
      assert.deepEqual(body, {
        firstLessonCompleted: true,
        evaluationScore: 7,
        weeklyLabCompleted: true,
      })
      return { ...body, updatedAt: '2026-08-21T01:00:00.000Z' }
    },
  }
  const outcome = await syncArchiveProgress(
    'test-token',
    { archivedCount: 3, completedEvaluationMean: 8.5 },
    deps,
  )
  assert.equal(outcome.ok, true)
  assert.equal(outcome.updatedAt, '2026-08-21T01:00:00.000Z')
  assert.deepEqual(calls, ['get', 'put'])
})

test('syncArchiveProgress：GET 失败不执行 PUT（sync-failed）', async () => {
  let putCalled = false
  const deps = {
    getProgress: async () => {
      throw new Error('network down')
    },
    putProgress: async () => {
      putCalled = true
      throw new Error('must not run')
    },
  }
  const outcome = await syncArchiveProgress(
    'test-token',
    { archivedCount: 1, completedEvaluationMean: null },
    deps,
  )
  assert.deepEqual(outcome, { ok: false, reason: 'get-failed' })
  assert.equal(putCalled, false)
})

test('syncArchiveProgress：PUT 失败返回 put-failed 且不抛异常，本地记录保留', async () => {
  const deps = {
    getProgress: async () => ({
      firstLessonCompleted: false,
      evaluationScore: null,
      weeklyLabCompleted: false,
    }),
    putProgress: async () => {
      throw new Error('500')
    },
  }
  const outcome = await syncArchiveProgress(
    'test-token',
    { archivedCount: 2, completedEvaluationMean: 8 },
    deps,
  )
  assert.deepEqual(outcome, { ok: false, reason: 'put-failed' })
})

// ── 持久化降级（AC-003 / uiState storage-unavailable）：Node 无全局 localStorage ──

test('load/saveArchiveEntries 在 Node（无 localStorage）下静默降级不抛异常（AC-003）', () => {
  assert.equal(typeof localStorage, 'undefined')
  assert.equal(archiveStorageAvailable(), false)
  assert.equal(loadArchiveEntries(), null)
  assert.doesNotThrow(() => saveArchiveEntries([]))
  assert.doesNotThrow(() => saveArchiveEntries([sampleEntry()]))
  assert.doesNotThrow(() => loadArchiveEntries())
})

test('isValidArchiveEntry：形状守卫拒绝缺字段/非法 route/status（AC-ARC-003）', () => {
  assert.equal(isValidArchiveEntry(sampleEntry()), true)
  assert.equal(isValidArchiveEntry(null), false)
  assert.equal(isValidArchiveEntry({ ...sampleEntry(), route: 'expert' }), false)
  assert.equal(isValidArchiveEntry({ ...sampleEntry(), status: 'done' }), false)
  assert.equal(isValidArchiveEntry({ ...sampleEntry(), id: '' }), false)
  assert.equal(isValidArchiveEntry({ ...sampleEntry(), score: '8' }), false)
})

// ── HTML 转义 ──

test('escapeHtml：转义 & < > " \' 防止注入（AC-ARC-003）', () => {
  assert.equal(escapeHtml('a & b < c > d "e" \'f\''), 'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;')
})

// ── 静态：archive.ts 结构与文案 ──

test('archive.ts 删除经 window.confirm 确认（archive-delete / delete-confirm）', () => {
  assert.match(archiveSource, /window\.confirm/)
  assert.match(archiveSource, /if \(!window\.confirm/)
})

test('archive.ts 两种空态文案可区分（AC-004 / initial-load / no-search-results）', () => {
  assert.match(archiveSource, /还没有实验记录/)
  assert.match(archiveSource, /没有匹配的实验记录/)
  const first = archiveSource.indexOf('还没有实验记录')
  const second = archiveSource.indexOf('没有匹配的实验记录')
  assert.ok(first !== -1 && second !== -1, '两种空态文案都必须存在')
  assert.notEqual(first, second)
})

test('archive.ts 存储不可用提示与静默降级（storage-unavailable）', () => {
  assert.match(archiveSource, /归档存储不可用/)
  assert.match(archiveSource, /archiveStorageAvailable\(\)/)
  assert.match(archiveSource, /try \{/)
  assert.match(archiveSource, /catch \{/)
})

test('archive.ts 同步状态文案与 aria 结构（sync-logged-out / sync-in-progress / sync-synced / sync-failed）', () => {
  assert.match(archiveSource, /登录后同步/)
  assert.match(archiveSource, /同步中…/)
  assert.match(archiveSource, /已同步/)
  assert.match(archiveSource, /同步失败/)
  assert.match(archiveSource, /aria-live="polite"/)
  assert.match(archiveSource, /if \(!currentSession\)/)
  assert.match(archiveSource, /archive-sync-btn/)
  assert.match(archiveSource, /disabled/)
})

test('archive.ts 列表为语义 <ul>/<li>，交互控件 type="button"，aria-pressed 标注（FR-ARC-006）', () => {
  assert.match(archiveSource, /<ul class="archive-list"/)
  assert.match(archiveSource, /<li class="archive-card"/)
  assert.match(archiveSource, /aria-pressed/)
  assert.match(archiveSource, /type="button"/)
  assert.match(archiveSource, /aria-labelledby="archive-summary-title"/)
  assert.match(archiveSource, /aria-labelledby="archive-sync-title"/)
})

test('archive.ts 网络收敛：经 api.ts getProgress/putProgress，无 fetch 字面量（R2）', () => {
  assert.match(archiveSource, /getProgress, putProgress/)
  assert.match(archiveSource, /import \{ getProgress, putProgress \} from '\.\/api\.ts'/)
  assert.doesNotMatch(archiveSource, /fetch\(/)
  assert.match(archiveSource, /localStorage/)
})

test('archive.ts 排序切换语义：同字段切换升/降序，不同字段默认升序（archive-sort）', () => {
  assert.match(archiveSource, /sortDirection === 'asc' \? 'desc' : 'asc'/)
  assert.match(archiveSource, /sortDirection = 'asc'/)
})

// ── 静态：main.ts 页面骨架与接线（AC-002 / AC-ARC-002 / AC-005） ──

test('main.ts archive 页面容器：精确文案 + 新建按钮 type="button" + aria-labelledby（AC-002）', () => {
  assert.match(mainSource, /<section class="archive-panel container" id="archive-panel" aria-labelledby="archive-title"/)
  assert.match(mainSource, /<h2 class="section-title" id="archive-title">学习实验归档中心<\/h2>/)
  assert.match(mainSource, /<button type="button" class="btn btn--primary" id="archive-create-btn">新建实验记录<\/button>/)
  assert.match(mainSource, /id="archive-workbench-mount"/)
})

test('main.ts render() 接线 archive 分支并初始化工作台（AC-ARC-002）', () => {
  assert.match(mainSource, /parsed\.page === 'archive'/)
  assert.match(mainSource, /initArchiveWorkbench\(host\)/)
  assert.match(mainSource, /getElementById\('archive-workbench-mount'\)/)
  assert.match(mainSource, /import \{ initArchiveWorkbench, setArchiveSession \} from '\.\/archive\.ts'/)
  assert.match(mainSource, /case 'archive':/)
})

test('main.ts 登录/退出联动 setArchiveSession（AC-ARC-005 / sync-logged-out）', () => {
  assert.match(mainSource, /enterLoggedIn[\s\S]{0,400}setArchiveSession\(currentSession\)/)
  assert.match(mainSource, /enterLoggedOut[\s\S]{0,400}setArchiveSession\(null\)/)
})

test('main.ts 全程无 fetch/localStorage 字面量（R1/R2 裁决）', () => {
  assert.doesNotMatch(mainSource, /fetch\(/)
  assert.doesNotMatch(mainSource, /localStorage/)
})

test('main.ts 主导航提供 #/archive 归档入口（routes: /archive）', () => {
  assert.match(mainSource, /'#\/archive'/)
})

// ── 静态：router.ts 路由（AC-001 / AC-ARC-001） ──

test('router.ts PageName 含 archive/export 且 #/archive 全等匹配（AC-ARC-001 / AC-EXP-001）', () => {
  assert.match(routerSource, /export type PageName = 'home' \| 'lesson' \| 'progress' \| 'archive' \| 'export' \| 'login' \| 'not-found'/)
  assert.match(routerSource, /value === '#\/archive'/)
  assert.match(routerSource, /page: 'archive', routeId: null/)
})

// ── 静态：style.css（AC-ARC-006 / FR-ARC-006） ──

test('style.css archive-* 类齐全：容器/表单/工具栏/列表卡片/状态区（vt-archive-style）', () => {
  assert.match(cssSource, /\.archive-panel/)
  assert.match(cssSource, /\.archive-workbench/)
  assert.match(cssSource, /\.archive-form/)
  assert.match(cssSource, /\.archive-toolbar/)
  assert.match(cssSource, /\.archive-filter__btn\[aria-pressed='true'\]/)
  assert.match(cssSource, /\.archive-list/)
  assert.match(cssSource, /\.archive-card/)
  assert.match(cssSource, /\.archive-sync/)
  assert.match(cssSource, /\.archive-storage-error/)
})

test('style.css 工具栏 flex-wrap + 480px 收窄 + 无新增 @keyframes（R4 保持恰好 1 处）', () => {
  assert.match(cssSource, /\.archive-filter,\s*\n\s*\.archive-toolbar \{[\s\S]*flex-wrap: wrap;/)
  const mobile = cssSource.indexOf('@media (max-width: 480px)')
  const mobileTail = cssSource.slice(mobile)
  assert.match(mobileTail, /\.archive-filter__btn,\s*\n\s*\.archive-toolbar__btn/)
  assert.equal((cssSource.match(/@keyframes/g) || []).length, 1)
})

// ── 静态：jest 入口与发现规则（AC-006） ──

test('package.json test 脚本走 jest 入口且 jest 发现规则覆盖本文件（AC-006）', () => {
  assert.match(pkgSource, /node --experimental-vm-modules node_modules\/jest\/bin\/jest\.js/)
  assert.match(pkgSource, /jest/)
  assert.match(jestConfigSource, /test\/\*\.test\.mjs/)
})
