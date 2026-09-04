// 学习实验导出中心契约测试（jest）：运行时纯函数断言 + 静态源码断言。
// 运行时：babel-jest 类型剥离后直接导入 src/exporter.ts 验证纯函数
// （validateExportFields / buildExportSummary / serializeExport / recordExportHistory /
// loadExportHistory / exportStorageAvailable / collectExportData 未登录零请求等）。
// 静态：断言 main.ts export 页面骨架（精确标题、type="button"、aria-labelledby、
// 挂载点、登录态联动、零 fetch/localStorage）、exporter.ts 精确文案与降级结构、
// style.css export-* 类与 480px 收窄、router.ts PageName/路由、jest 入口与发现规则登记。
// Jest 全局提供 test（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  EXPORT_FIELD_LABELS,
  EXPORT_HISTORY_KEY,
  EXPORT_HISTORY_LIMIT,
  buildExportSummary,
  collectExportData,
  exportStorageAvailable,
  loadExportHistory,
  recordExportHistory,
  serializeExport,
  setExportSession,
  validateExportFields,
} from '../src/exporter.ts'

const readFile = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const exporterSource = readFile('../src/exporter.ts')
const mainSource = readFile('../src/main.ts')
const routerSource = readFile('../src/router.ts')
const cssSource = readFile('../src/style.css')
const pkgSource = readFile('../package.json')
const jestConfigSource = readFile('../jest.config.mjs')

const ALL_FIELDS = EXPORT_FIELD_LABELS.map(([key]) => key)

// ── 常量（AC-003 / AC-EXP-003） ──

test('常量：存储 key 精确 + 历史上限 10 + 11 项字段稳定序（AC-003 / AC-EXP-003）', () => {
  assert.equal(EXPORT_HISTORY_KEY, 'frontend-dag-debug:export-history')
  assert.equal(EXPORT_HISTORY_LIMIT, 10)
  assert.equal(EXPORT_FIELD_LABELS.length, 11)
  assert.deepEqual(
    EXPORT_FIELD_LABELS.map(([key]) => key),
    [
      'title', 'source', 'stepsCount', 'templatesCount', 'selfScore',
      'entryTitle', 'entryRoute', 'entryStatus', 'entryScore', 'entryNote',
      'exportedAt',
    ],
  )
  assert.deepEqual(EXPORT_FIELD_LABELS.map(([, label]) => label), [
    '标题', '来源', '步骤计数', '模板计数', '自评',
    '实验标题', '实验路线', '实验状态', '实验评分', '备注', '导出时间',
  ])
})

test('exporter.ts 存储 key 为 frontend-dag-debug:export-history 且不触碰其他 key（AC-003）', () => {
  assert.match(exporterSource, /frontend-dag-debug:export-history/)
  assert.doesNotMatch(exporterSource, /frontend-dag-debug:journal/)
  assert.doesNotMatch(exporterSource, /frontend-dag-debug:archive/)
  assert.doesNotMatch(exporterSource, /frontend-dag-debug:auth/)
  assert.doesNotMatch(exporterSource, /frontend-dag-debug:tasks/)
})

// ── 字段校验（export-fields-empty） ──

test('validateExportFields：空集 invalid + 精确提示（AC-EXP-003 / export-fields-empty）', () => {
  assert.deepEqual(validateExportFields([]), {
    valid: false,
    message: '请至少选择一项导出字段',
  })
  assert.deepEqual(validateExportFields(['title']), { valid: true, message: '' })
  assert.equal(validateExportFields(ALL_FIELDS).valid, true)
})

// ── 序列化（preview-updating / export-generated） ──

function sampleData() {
  return {
    title: '学习实验导出',
    source: '工作台草稿',
    stepsCount: 3,
    templatesCount: 2,
    selfScore: 8,
    entryTitle: '研究助手复现',
    entryRoute: 'beginner',
    entryStatus: 'archived',
    entryScore: 9,
    entryNote: '复现三条区别',
  }
}

function emptyData() {
  return {
    title: '学习实验导出',
    source: '无本地数据',
    stepsCount: null,
    templatesCount: null,
    selfScore: null,
    entryTitle: null,
    entryRoute: null,
    entryStatus: null,
    entryScore: null,
    entryNote: null,
  }
}

test('serializeExport：text/json 同输入同输出、字段稳定序、exportedAt 注入（AC-003）', () => {
  const iso = '2026-08-21T10:00:00.000Z'
  const text1 = serializeExport(sampleData(), ALL_FIELDS, 'text', iso)
  const text2 = serializeExport(sampleData(), ALL_FIELDS, 'text', iso)
  assert.equal(text1, text2, '同输入同输出必须逐字一致')
  assert.ok(text1.startsWith('学习实验导出\n'), 'text 应以标题行开头')
  assert.ok(text1.includes('----------------'), 'text 应含分隔线')
  assert.ok(text1.includes('标题：学习实验导出'))
  assert.ok(text1.includes('来源：工作台草稿'))
  assert.ok(text1.includes('步骤计数：3'))
  assert.ok(text1.includes('实验路线：入门'), 'text 中路线应为人类可读中文标签')
  assert.ok(text1.includes('导出时间：2026-08-21T10:00:00.000Z'))
  // 字段稳定序：与 EXPORT_FIELD_LABELS 一致
  assert.ok(text1.indexOf('标题：') < text1.indexOf('来源：'))
  assert.ok(text1.indexOf('来源：') < text1.indexOf('步骤计数：'))
  assert.ok(text1.indexOf('步骤计数：') < text1.indexOf('模板计数：'))
  assert.ok(text1.indexOf('模板计数：') < text1.indexOf('导出时间：'))

  const json = serializeExport(sampleData(), ALL_FIELDS, 'json', iso)
  const json2 = serializeExport(sampleData(), ALL_FIELDS, 'json', iso)
  assert.equal(json, json2, 'json 同输入同输出必须逐字一致')
  assert.equal(JSON.stringify(JSON.parse(json), null, 2), json, 'json 为格式化输出')
  assert.equal(JSON.parse(json).exportedAt, iso)
  assert.equal(JSON.parse(json).entryRoute, 'beginner', 'json 保留原始枚举值')
})

test('serializeExport：空数据（全部 null）确定性占位（数据无来源场景）', () => {
  const iso = '2026-08-21T00:00:00.000Z'
  const text = serializeExport(emptyData(), ALL_FIELDS, 'text', iso)
  assert.ok(text.includes('步骤计数：—'), 'null 应占位为 —')
  assert.ok(text.includes('自评：—'))
  assert.ok(text.includes('实验标题：—'))
  assert.ok(text.includes('来源：无本地数据'))
  assert.equal(serializeExport(emptyData(), ALL_FIELDS, 'text', iso), text)
  const json = serializeExport(emptyData(), ALL_FIELDS, 'json', iso)
  assert.equal(JSON.parse(json).stepsCount, null)
  assert.equal(json, serializeExport(emptyData(), ALL_FIELDS, 'json', iso))
})

test('serializeExport：仅选中字段序列化、顺序稳定、exportedAt 注入（export-fields-selected）', () => {
  const iso = '2026-08-21T12:00:00.000Z'
  const json = serializeExport(sampleData(), ['title', 'stepsCount', 'exportedAt'], 'json', iso)
  const parsed = JSON.parse(json)
  assert.deepEqual(Object.keys(parsed), ['title', 'stepsCount', 'exportedAt'])
  assert.equal(parsed.exportedAt, iso)
  const text = serializeExport(sampleData(), ['entryNote', 'exportedAt'], 'text', iso)
  assert.ok(text.includes('备注：复现三条区别'))
  assert.ok(!text.includes('步骤计数'))
})

// ── 摘要构建（buildExportSummary） ──

function sampleDraft() {
  return {
    steps: [true, true, false, false, false, false, false, false],
    templates: {
      'run-contract': '已编辑的合约',
      'input-freeze': '自定义输入冻结记录',
      'run-log': '自定义执行记录',
      evaluation: '自定义评估表',
      retrospective: '自定义复盘',
    },
    score: 8,
    elapsedSeconds: 125,
    running: false,
    lastStartedAt: null,
    savedAt: null,
  }
}

function sampleEntries() {
  return [
    {
      id: 'archive-a',
      title: '旧实验记录',
      route: 'beginner',
      status: 'planned',
      score: 7,
      note: '旧备注',
      createdAt: '2026-08-19T00:00:00.000Z',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    {
      id: 'archive-b',
      title: '最新实验',
      route: 'advanced',
      status: 'archived',
      score: 9,
      note: '复现完成',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ]
}

test('buildExportSummary：journal 计数/自评校验 + archive 最新记录 + 会话时长（AC-003）', () => {
  const summary = buildExportSummary(sampleDraft(), sampleEntries(), null, 125_000)
  assert.equal(summary.data.stepsCount, 2)
  assert.equal(summary.data.templatesCount, 5)
  assert.equal(summary.data.selfScore, 8)
  assert.equal(summary.data.entryTitle, '最新实验', '取最近 updatedAt 的归档记录')
  assert.equal(summary.data.entryRoute, 'advanced')
  assert.equal(summary.data.entryStatus, 'archived')
  assert.equal(summary.data.entryScore, 9)
  assert.equal(summary.data.entryNote, '复现完成')
  assert.equal(summary.data.source, '工作台草稿 + 归档记录')
  assert.equal(summary.duration, '02:05', 'formatDuration 输出')
  assert.equal(summary.progress, null, '未登录时进度摘要为 null')
})

test('buildExportSummary：null 数据占位处理（从未创建 journal/archive）', () => {
  const summary = buildExportSummary(null, null, null, 0)
  assert.equal(summary.data.stepsCount, null)
  assert.equal(summary.data.templatesCount, null)
  assert.equal(summary.data.selfScore, null)
  assert.equal(summary.data.entryTitle, null)
  assert.equal(summary.data.source, '无本地数据')
  assert.equal(summary.duration, '—')
})

// ── 历史（export-generated / history-empty / storage-unavailable） ──

test('recordExportHistory：Node 无 localStorage 静默降级不抛异常（AC-EXP-003 / storage-unavailable）', () => {
  assert.equal(typeof localStorage, 'undefined')
  assert.equal(exportStorageAvailable(), false)
  assert.equal(loadExportHistory(), null)
  assert.doesNotThrow(() =>
    recordExportHistory({
      id: 'export-x',
      format: 'json',
      fieldCount: 5,
      exportedAt: '2026-08-21T00:00:00.000Z',
    }),
  )
})

test('recordExportHistory：注入 localStorage 后上限 10 条、最旧丢弃（AC-EXP-003 / export-generated）', () => {
  // Node 无全局 localStorage：注入最小模拟验证截断语义，finally 还原
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  try {
    assert.equal(exportStorageAvailable(), true)
    assert.equal(loadExportHistory(), null)
    let history = null
    for (let i = 1; i <= 12; i++) {
      history = recordExportHistory({
        id: `export-${i}`,
        format: 'text',
        fieldCount: i,
        exportedAt: `2026-08-21T${String(i % 10).padStart(2, '0')}:00:00.000Z`,
      })
    }
    assert.ok(history !== null)
    assert.equal(history.length, EXPORT_HISTORY_LIMIT)
    assert.equal(history[0].id, 'export-12', '最新记录在前')
    assert.equal(history[history.length - 1].id, 'export-3')
    assert.ok(
      history.every((entry) => entry.id !== 'export-1' && entry.id !== 'export-2'),
      '最旧两条应被丢弃',
    )
    // 往返：loadExportHistory 读回同样内容
    assert.equal(loadExportHistory()?.length, EXPORT_HISTORY_LIMIT)
  } finally {
    delete globalThis.localStorage
  }
})

// ── 数据收集（login-sync-prompt / AC-EXP-005）：未登录零请求 ──

test('collectExportData：未登录（session null）getProgress 零调用（AC-EXP-005）', async () => {
  let getCalls = 0
  const summary = await collectExportData({
    getProgress: async () => {
      getCalls++
      return { firstLessonCompleted: true, evaluationScore: 8, weeklyLabCompleted: true }
    },
    loadJournalDraft: () => null,
    loadArchiveEntries: () => null,
  })
  assert.equal(getCalls, 0, '未登录绝不调用 getProgress')
  assert.equal(summary.progress, null)
  assert.equal(summary.data.source, '无本地数据')
})

test('collectExportData：登录态经注入 getProgress 读取进度且 token 传入正确（AC-EXP-005）', async () => {
  setExportSession({ token: 'test-token', username: 'tester' })
  const calls = []
  const summary = await collectExportData({
    getProgress: async (token) => {
      calls.push(token)
      return {
        firstLessonCompleted: true,
        evaluationScore: 7,
        weeklyLabCompleted: false,
        updatedAt: '2026-08-20T00:00:00.000Z',
      }
    },
    loadJournalDraft: () => null,
    loadArchiveEntries: () => null,
  })
  assert.deepEqual(calls, ['test-token'])
  assert.deepEqual(summary.progress, {
    firstLessonCompleted: true,
    evaluationScore: 7,
    weeklyLabCompleted: false,
    updatedAt: '2026-08-20T00:00:00.000Z',
  })
  setExportSession(null)
})

// ── 静态：exporter.ts 结构与文案 ──

test('exporter.ts 精确文案：空字段提示/复制/下载/历史空态/存储不可用/登录提示（AC-004/005/EXP-003/004/005）', () => {
  assert.match(exporterSource, /请至少选择一项导出字段/)
  assert.match(exporterSource, /已复制/)
  assert.match(exporterSource, /复制失败/)
  assert.match(exporterSource, /下载不可用：请使用复制/)
  assert.match(exporterSource, /还没有导出记录/)
  assert.match(exporterSource, /导出存储不可用/)
  assert.match(exporterSource, /登录后同步导出/)
  assert.match(exporterSource, /读取进度摘要中…/)
  assert.match(exporterSource, /进度摘要读取失败/)
  assert.match(exporterSource, /已生成导出/)
})

test('exporter.ts 交互控件 type="button" + aria-pressed + aria-labelledby + aria-live（OSPEC-FE-REFRESH-001）', () => {
  assert.match(exporterSource, /type="button"/)
  assert.match(exporterSource, /aria-pressed/)
  assert.match(exporterSource, /aria-labelledby="export-progress-title"/)
  assert.match(exporterSource, /aria-labelledby="export-fields-title"/)
  assert.match(exporterSource, /aria-labelledby="export-preview-title"/)
  assert.match(exporterSource, /aria-labelledby="export-history-title"/)
  assert.match(exporterSource, /aria-live="polite"/)
  assert.match(exporterSource, /class="export-filter"/)
})

test('exporter.ts 网络收敛：经 api.ts getProgress，无 fetch 字面量（R2）', () => {
  assert.match(exporterSource, /import \{ getProgress \} from '\.\/api\.ts'/)
  assert.doesNotMatch(exporterSource, /fetch\(/)
})

test('exporter.ts 剪贴板/下载降级：clipboard.writeText try/catch、Blob + objectURL（AC-005）', () => {
  assert.match(exporterSource, /navigator\.clipboard/)
  assert.match(exporterSource, /writeText\(/)
  assert.match(exporterSource, /new Blob\(/)
  assert.match(exporterSource, /URL\.createObjectURL\(/)
  assert.match(exporterSource, /revokeObjectURL\(/)
  assert.match(exporterSource, /learning-export-/)
  assert.match(exporterSource, /try \{/)
  assert.match(exporterSource, /catch \{/)
})

test('exporter.ts 历史列表语义 <ul>/<li> + 复用 archive.ts escapeHtml（AC-003）', () => {
  assert.match(exporterSource, /<ul class="export-list"/)
  assert.match(exporterSource, /<li class="export-card export-history__card"/)
  assert.match(
    exporterSource,
    /import \{ escapeHtml, loadArchiveEntries \} from '\.\/archive\.ts'/,
  )
})

test('exporter.ts 纯函数区无 Date.now/随机数（确定性保证，AC-003）', () => {
  const pureBlock = exporterSource.slice(
    exporterSource.indexOf('export function validateExportFields'),
    exporterSource.indexOf('export async function collectExportData'),
  )
  assert.doesNotMatch(pureBlock, /Date\.now\(\)/)
  assert.doesNotMatch(pureBlock, /Math\.random/)
})

// ── 静态：main.ts 页面骨架与接线（AC-002 / vt-main-wiring） ──

test('main.ts export 页面容器：精确标题 + 生成导出 type="button" + aria-labelledby（AC-002）', () => {
  assert.match(
    mainSource,
    /<section class="export-panel container" id="export-panel" aria-labelledby="export-title"/,
  )
  assert.match(
    mainSource,
    /<h2 class="section-title" id="export-title">学习实验导出中心<\/h2>/,
  )
  assert.match(
    mainSource,
    /<button type="button" class="btn btn--primary" id="export-generate-btn">生成导出<\/button>/,
  )
  assert.match(mainSource, /id="export-workbench-mount"/)
})

test('main.ts render() 接线 export 分支并初始化工作台（vt-main-wiring）', () => {
  assert.match(mainSource, /parsed\.page === 'export'/)
  assert.match(mainSource, /initExportCenter\(host, currentSession\)/)
  assert.match(mainSource, /getElementById\('export-workbench-mount'\)/)
  assert.match(
    mainSource,
    /import \{ initExportCenter, setExportSession \} from '\.\/exporter\.ts'/,
  )
  assert.match(mainSource, /case 'export':/)
})

test('main.ts 登录/退出联动 setExportSession（auth-transition / AC-EXP-005）', () => {
  assert.match(mainSource, /enterLoggedIn[\s\S]{0,500}setExportSession\(currentSession\)/)
  assert.match(mainSource, /enterLoggedOut[\s\S]{0,500}setExportSession\(null\)/)
})

test('main.ts 主导航提供 #/export 导出入口且无 fetch/localStorage 字面量（routes: /export）', () => {
  assert.match(mainSource, /'#\/export'/)
  assert.match(mainSource, /label: '导出'/)
  assert.doesNotMatch(mainSource, /fetch\(/)
  assert.doesNotMatch(mainSource, /localStorage/)
})

// ── 静态：router.ts 路由（AC-001 / AC-EXP-001） ──

test('router.ts PageName 含 export 且 #/export 全等匹配（AC-EXP-001）', () => {
  assert.match(
    routerSource,
    /export type PageName = 'home' \| 'lesson' \| 'progress' \| 'archive' \| 'export' \| 'login' \| 'not-found'/,
  )
  assert.match(routerSource, /value === '#\/export'/)
  assert.match(routerSource, /page: 'export', routeId: null/)
})

// ── 静态：style.css（vt-export-style / AC-006） ──

test('style.css export-* 类齐全：容器/工作台/字段/工具栏/列表卡片/进度同步/错误/状态', () => {
  assert.match(cssSource, /\.export-panel/)
  assert.match(cssSource, /\.export-workbench/)
  assert.match(cssSource, /\.export-form/)
  assert.match(cssSource, /\.export-filter__btn\[aria-pressed='true'\]/)
  assert.match(cssSource, /\.export-toolbar/)
  assert.match(cssSource, /\.export-list/)
  assert.match(cssSource, /\.export-card/)
  assert.match(cssSource, /\.export-sync/)
  assert.match(cssSource, /\.export-error/)
  assert.match(cssSource, /\.export-status/)
})

test('style.css 480px 收窄（flex-wrap + flex: 1 1 auto）+ 无新增 @keyframes（R4 保持恰好 1 处）', () => {
  const mobile = cssSource.indexOf('@media (max-width: 480px)')
  assert.ok(mobile !== -1)
  const mobileTail = cssSource.slice(mobile)
  assert.match(mobileTail, /\.export-filter__btn,\s*\n\s*\.export-toolbar__btn/)
  assert.match(mobileTail, /flex: 1 1 auto/)
  assert.equal((cssSource.match(/@keyframes/g) || []).length, 1)
})

// ── 静态：jest 入口与发现规则（AC-EXP-006 / AC-006） ──

test('package.json test 脚本走 jest 入口且 jest 发现规则覆盖本文件（AC-EXP-006）', () => {
  assert.match(pkgSource, /node --experimental-vm-modules node_modules\/jest\/bin\/jest\.js/)
  assert.match(pkgSource, /jest/)
  assert.match(jestConfigSource, /test\/\*\.test\.mjs/)
})
