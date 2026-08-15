// 学习会话工作台契约测试（node --test）：运行时纯函数断言 + 静态源码断言。
// 运行时：Node 26 原生 TS type-stripping 直接导入 src/journal.ts 验证纯函数
// （isTemplateCompleted / computeFirstLessonCompleted / mergeProgressForSync /
// validateScore / formatDuration / syncJournalProgress 失败语义等）。
// 静态：断言 main.ts 挂载点位于 progress-panel 之后、登录态联动、隔离性
// （journal-* 类名与 frontend-dag-debug:journal key，不触碰 auth/tasks key）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  JOURNAL_STORAGE_KEY,
  SAVE_DEBOUNCE_MS,
  STEP_LABELS,
  TEMPLATE_IDS,
  TEMPLATE_SKELETONS,
  clearJournalDraft,
  computeFirstLessonCompleted,
  countCompletedTemplates,
  countSteps,
  createEmptyDraft,
  currentElapsedSeconds,
  formatDuration,
  isTemplateCompleted,
  loadJournalDraft,
  mergeProgressForSync,
  saveJournalDraft,
  syncJournalProgress,
  validateScore,
} from '../src/journal.ts'

const readMain = () =>
  readFile(new URL('../src/main.ts', import.meta.url), 'utf8')
const readJournal = () =>
  readFile(new URL('../src/journal.ts', import.meta.url), 'utf8')

// ── 常量与初始状态（AC-FE-001 / AC-FE-003 / uiState initial-load） ──

test('八步闭环标签与课程区一致：目标→输入/上下文→计划→执行→工具/环境→输出→评估→记录', async () => {
  assert.deepEqual(STEP_LABELS, [
    '目标',
    '输入/上下文',
    '计划',
    '执行',
    '工具/环境',
    '输出',
    '评估',
    '记录',
  ])
  assert.equal(STEP_LABELS.length, 8)
  const main = await readMain()
  for (const label of STEP_LABELS) {
    assert.ok(main.includes(label), `课程区缺少闭环步骤 ${label}`)
  }
})

test('五份模板 id 与骨架齐全，骨架逐行与课程区 pre 一致（AC-FE-003）', async () => {
  assert.deepEqual(TEMPLATE_IDS, [
    'run-contract',
    'input-freeze',
    'run-log',
    'evaluation',
    'retrospective',
  ])
  const main = await readMain()
  for (const id of TEMPLATE_IDS) {
    const skeleton = TEMPLATE_SKELETONS[id]
    assert.equal(typeof skeleton, 'string')
    assert.ok(skeleton.trim().startsWith(`# ${id}.md`), `${id} 骨架缺少标题行`)
    for (const line of skeleton.trim().split('\n')) {
      assert.ok(main.includes(line), `${id} 骨架行未出现在课程区 pre：${line}`)
    }
  }
})

test('createEmptyDraft：八步未勾选、五模板预填骨架、自评空、计时 00:00（initial-load）', () => {
  const draft = createEmptyDraft()
  assert.equal(draft.steps.length, 8)
  assert.ok(draft.steps.every((value) => value === false))
  assert.equal(countSteps(draft), 0)
  for (const id of TEMPLATE_IDS) {
    assert.equal(draft.templates[id], TEMPLATE_SKELETONS[id])
  }
  assert.equal(countCompletedTemplates(draft), 0)
  assert.equal(draft.score, null)
  assert.equal(draft.elapsedSeconds, 0)
  assert.equal(draft.running, false)
  assert.equal(formatDuration(draft.elapsedSeconds), '00:00')
})

// ── 步骤勾选与全部完成（AC-FE-001 / AC-FE-002 / uiState steps-all-done） ──

test('步骤计数实时计算：X/8，八步全勾选达到 8/8', () => {
  const draft = createEmptyDraft()
  draft.steps[0] = true
  draft.steps[3] = true
  assert.equal(countSteps(draft), 2)
  draft.steps = draft.steps.map(() => true)
  assert.equal(countSteps(draft), 8)
  // 取消任一勾选后回到 7/8
  draft.steps[0] = false
  assert.equal(countSteps(draft), 7)
})

test('八步全部完成提示文案与计数元素存在（AC-FE-002）', async () => {
  const journal = await readJournal()
  assert.match(journal, /八步全部完成/)
  assert.match(journal, /journal-steps-count/)
  assert.match(journal, /aria-live="polite"/)
})

// ── 模板完成判定（AC-FE-004 / AC-FE-005 / BR-JOURNAL-001 / uiState template-completed） ──

test('isTemplateCompleted：与骨架不同且非空才为已完成（BR-JOURNAL-001）', () => {
  const skeleton = TEMPLATE_SKELETONS['run-contract']
  // 未修改（含首尾空白）→ 未完成
  assert.equal(isTemplateCompleted(skeleton, skeleton), false)
  assert.equal(isTemplateCompleted(`  ${skeleton}  `, skeleton), false)
  // 清空 → 未完成
  assert.equal(isTemplateCompleted('', skeleton), false)
  assert.equal(isTemplateCompleted('   ', skeleton), false)
  // 与骨架不同且非空 → 已完成
  assert.equal(isTemplateCompleted(`${skeleton}\n补充一条记录`, skeleton), true)
  assert.equal(isTemplateCompleted('我的完整任务合约内容', skeleton), true)
})

test('countCompletedTemplates：Y/5 实时增减（AC-FE-005）', () => {
  const draft = createEmptyDraft()
  assert.equal(countCompletedTemplates(draft), 0)
  draft.templates['run-contract'] = '已编辑的合约'
  assert.equal(countCompletedTemplates(draft), 1)
  for (const id of TEMPLATE_IDS) {
    draft.templates[id] = `编辑后的 ${id} 内容`
  }
  assert.equal(countCompletedTemplates(draft), 5)
  // 删回与骨架一致 → 回落
  draft.templates['input-freeze'] = TEMPLATE_SKELETONS['input-freeze']
  assert.equal(countCompletedTemplates(draft), 4)
  // 清空 → 回落
  draft.templates['run-log'] = ''
  assert.equal(countCompletedTemplates(draft), 3)
})

// ── 自评校验（AC-FE-006 / uiState score-invalid） ──

test('validateScore：0–10 整数或空合法；11/-1/7.5/10.0 拒绝（AC-FE-006）', () => {
  assert.deepEqual(validateScore(''), { valid: true, value: null })
  assert.deepEqual(validateScore('   '), { valid: true, value: null })
  assert.deepEqual(validateScore('0'), { valid: true, value: 0 })
  assert.deepEqual(validateScore('10'), { valid: true, value: 10 })
  assert.deepEqual(validateScore('8'), { valid: true, value: 8 })
  assert.equal(validateScore('11').valid, false)
  assert.equal(validateScore('-1').valid, false)
  assert.equal(validateScore('7.5').valid, false)
  assert.equal(validateScore('10.0').valid, false)
  assert.equal(validateScore('abc').valid, false)
})

test('自评输入框带 0–10/整数约束与范围提示（AC-FE-006 / score-invalid）', async () => {
  const journal = await readJournal()
  assert.match(journal, /journal-score-input/)
  assert.match(journal, /min="0" max="10" step="1"/)
  assert.match(journal, /请输入 0–10 的整数/)
  assert.match(journal, /validateScore\(/)
})

// ── 计时器（AC-FE-007 / uiState timer-running） ──

test('formatDuration：mm:ss 零填充', () => {
  assert.equal(formatDuration(0), '00:00')
  assert.equal(formatDuration(59), '00:59')
  assert.equal(formatDuration(60), '01:00')
  assert.equal(formatDuration(3599), '59:59')
  assert.equal(formatDuration(3600), '60:00')
})

test('currentElapsedSeconds：运行中按起始时间戳累计，暂停后固定（AC-FE-007）', () => {
  const draft = createEmptyDraft()
  assert.equal(currentElapsedSeconds(draft, 10_000), 0)
  draft.running = true
  draft.lastStartedAt = 0
  assert.equal(currentElapsedSeconds(draft, 5_000), 5)
  // 暂停：结算到 elapsedSeconds，lastStartedAt 置空
  draft.elapsedSeconds = currentElapsedSeconds(draft, 5_000)
  draft.running = false
  draft.lastStartedAt = null
  assert.equal(currentElapsedSeconds(draft, 100_000), 5)
  // 继续：从新起始时间戳继续累计（已结算 5s + 新增 5s = 10s）
  draft.running = true
  draft.lastStartedAt = 100_000
  assert.equal(currentElapsedSeconds(draft, 105_000), 10)
})

test('计时器控件、mm:ss 展示与开始/暂停/继续/重置按钮存在（AC-FE-007）', async () => {
  const journal = await readJournal()
  assert.match(journal, /journal-timer-display/)
  assert.match(journal, /formatDuration\(/)
  assert.match(journal, /setInterval/)
  for (const label of ['开始', '暂停', '继续', '重置']) {
    assert.ok(journal.includes(label), `缺少计时按钮 ${label}`)
  }
})

// ── 摘要区（AC-FE-008） ──

test('摘要区展示步骤 X/8、模板 Y/5、未自评占位、mm:ss 与最近保存（AC-FE-008）', async () => {
  const journal = await readJournal()
  assert.match(journal, /journal-summary-steps/)
  assert.match(journal, /journal-summary-templates/)
  assert.match(journal, /journal-summary-score/)
  assert.match(journal, /journal-summary-timer/)
  assert.match(journal, /journal-summary-saved/)
  assert.match(journal, /未自评/)
})

// ── 完成条件与合并（BR-JOURNAL-002 / BR-JOURNAL-003） ──

test('computeFirstLessonCompleted：仅 X=8 且 Y=5 且自评分非空为 true（BR-JOURNAL-002）', () => {
  assert.equal(computeFirstLessonCompleted(8, 5, 8), true)
  assert.equal(computeFirstLessonCompleted(8, 5, 0), true)
  assert.equal(computeFirstLessonCompleted(8, 5, null), false)
  assert.equal(computeFirstLessonCompleted(8, 4, 8), false)
  assert.equal(computeFirstLessonCompleted(7, 5, 8), false)
  assert.equal(computeFirstLessonCompleted(0, 0, null), false)
})

test('mergeProgressForSync：weeklyLabCompleted 无条件取 GET 原值（BR-JOURNAL-003）', () => {
  const server = {
    firstLessonCompleted: true,
    evaluationScore: 7,
    weeklyLabCompleted: true,
  }
  // 完成条件满足时 firstLessonCompleted 按计算值（覆盖服务端既有 true/false）
  assert.deepEqual(
    mergeProgressForSync(server, { stepsDone: 8, templatesDone: 5, score: 9 }),
    { firstLessonCompleted: true, evaluationScore: 9, weeklyLabCompleted: true },
  )
  // 自评空 → evaluationScore 保留 GET 原值；weeklyLabCompleted 保留 true 不被覆盖
  assert.deepEqual(
    mergeProgressForSync(server, { stepsDone: 8, templatesDone: 5, score: null }),
    { firstLessonCompleted: false, evaluationScore: 7, weeklyLabCompleted: true },
  )
  // GET 原值 weeklyLabCompleted=false 时也原样保留
  assert.deepEqual(
    mergeProgressForSync(
      { ...server, weeklyLabCompleted: false },
      { stepsDone: 8, templatesDone: 5, score: 9 },
    ),
    { firstLessonCompleted: true, evaluationScore: 9, weeklyLabCompleted: false },
  )
})

// ── 同步（AC-FE-010 / BR-JOURNAL-005 / uiState sync-synced / sync-failed） ──

test('syncJournalProgress：成功路径先 GET 后 PUT，合并体正确（sync-synced）', async () => {
  const calls = []
  const deps = {
    getProgress: async () => {
      calls.push('get')
      return {
        firstLessonCompleted: true,
        evaluationScore: 7,
        weeklyLabCompleted: true,
        updatedAt: '2026-08-15T00:00:00.000Z',
      }
    },
    putProgress: async (token, body) => {
      calls.push('put')
      assert.equal(token, 'test-token')
      assert.deepEqual(body, {
        firstLessonCompleted: true,
        evaluationScore: 9,
        weeklyLabCompleted: true,
      })
      return { ...body, updatedAt: '2026-08-15T01:00:00.000Z' }
    },
  }
  const outcome = await syncJournalProgress(
    'test-token',
    { stepsDone: 8, templatesDone: 5, score: 9 },
    deps,
  )
  assert.equal(outcome.ok, true)
  assert.equal(outcome.updatedAt, '2026-08-15T01:00:00.000Z')
  assert.deepEqual(calls, ['get', 'put'])
})

test('syncJournalProgress：GET 失败不执行 PUT（BR-JOURNAL-005 / sync-failed）', async () => {
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
  const outcome = await syncJournalProgress(
    'test-token',
    { stepsDone: 3, templatesDone: 2, score: null },
    deps,
  )
  assert.deepEqual(outcome, { ok: false, reason: 'get-failed' })
  assert.equal(putCalled, false)
})

test('syncJournalProgress：PUT 失败返回 put-failed 且不抛异常，本地值保留', async () => {
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
  const outcome = await syncJournalProgress(
    'test-token',
    { stepsDone: 8, templatesDone: 5, score: 8 },
    deps,
  )
  assert.deepEqual(outcome, { ok: false, reason: 'put-failed' })
})

test('同步按钮默认 disabled 并提示「登录后同步」（AC-FE-010 / sync-logged-out）', async () => {
  const journal = await readJournal()
  assert.match(journal, /journal-sync-btn/)
  assert.match(journal, /disabled/)
  assert.match(journal, /登录后同步/)
  assert.match(journal, /已同步/)
  assert.match(journal, /同步失败/)
})

// ── 持久化（AC-FE-009 / BR-JOURNAL-004 / uiState draft-saved） ──

test('存储 key 为 frontend-dag-debug:journal 且不触碰 auth/tasks key（AC-FE-009 / BR-JOURNAL-006）', async () => {
  assert.equal(JOURNAL_STORAGE_KEY, 'frontend-dag-debug:journal')
  const journal = await readJournal()
  assert.match(journal, /frontend-dag-debug:journal/)
  assert.doesNotMatch(journal, /frontend-dag-debug:auth/)
  assert.doesNotMatch(journal, /frontend-dag-debug:tasks/)
})

test('load/save/clearJournalDraft：读写均 try/catch 静默降级，不抛异常（BR-JOURNAL-004）', () => {
  clearJournalDraft()
  assert.equal(loadJournalDraft(), null)
  assert.doesNotThrow(() => saveJournalDraft(createEmptyDraft()))
  assert.doesNotThrow(() => loadJournalDraft())
  assert.doesNotThrow(() => clearJournalDraft())
  assert.equal(loadJournalDraft(), null)
})

test('loadJournalDraft 往返恢复与形状校验（存在 localStorage 时）', () => {
  if (typeof localStorage === 'undefined') return
  clearJournalDraft()
  const draft = createEmptyDraft()
  draft.steps[0] = true
  draft.steps[7] = true
  draft.templates['run-contract'] = '已编辑的合约'
  draft.score = 8
  draft.elapsedSeconds = 125
  saveJournalDraft(draft)
  const restored = loadJournalDraft()
  assert.ok(restored !== null)
  assert.equal(restored.steps[0], true)
  assert.equal(restored.steps[7], true)
  assert.equal(restored.templates['run-contract'], '已编辑的合约')
  assert.equal(restored.score, 8)
  assert.equal(restored.elapsedSeconds, 125)
  clearJournalDraft()
  assert.equal(loadJournalDraft(), null)
})

test('textarea 防抖约 300ms 自动保存（AC-FE-009 / draft-saved）', async () => {
  assert.equal(SAVE_DEBOUNCE_MS, 300)
  const journal = await readJournal()
  assert.match(journal, /setTimeout/)
  assert.match(journal, /SAVE_DEBOUNCE_MS/)
  assert.match(journal, /textarea/)
})

// ── main.ts 挂载与登录态联动（AC-FE-001 / uiState sync-logged-out） ──

test('main.ts：工作台挂载点位于 progress-panel 之后并调用 initJournalWorkbench（AC-FE-001 / BR-JOURNAL-006）', async () => {
  const main = await readMain()
  const progressIndex = main.indexOf('id="progress-panel"')
  const mountIndex = main.indexOf('id="journal-workbench-mount"')
  assert.ok(progressIndex !== -1, 'progress-panel 存在')
  assert.ok(mountIndex !== -1, 'journal-workbench-mount 存在')
  assert.ok(mountIndex > progressIndex, '工作台挂载点必须位于 progress-panel 之后')
  assert.match(main, /getElementById\(['"]journal-workbench-mount['"]\)/)
  assert.match(main, /initJournalWorkbench\(/)
  assert.match(main, /setJournalSession\(/)
})

test('main.ts：登录/退出分别联动 setJournalSession 启用/禁用同步（sync-logged-out）', async () => {
  const main = await readMain()
  assert.match(main, /enterLoggedIn[\s\S]{0,400}setJournalSession\(currentSession\)/)
  assert.match(main, /enterLoggedOut[\s\S]{0,400}setJournalSession\(null\)/)
})

// ── 隔离性（BR-JOURNAL-006） ──

test('journal.ts 使用独立 journal-* 类名，不查询课程区/进度面板/任务看板标识', async () => {
  const journal = await readJournal()
  assert.match(journal, /journal-/)
  assert.doesNotMatch(journal, /first-lesson-beginner/)
  assert.doesNotMatch(journal, /progress-panel/)
  assert.doesNotMatch(journal, /progress-form/)
  assert.doesNotMatch(journal, /auth-form/)
  assert.doesNotMatch(journal, /task-board/)
})

test('style.css：工作台样式使用 journal-* 类名且未新增动画（R4 保持恰好 1 处 @keyframes）', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
  assert.match(css, /\.journal-workbench/)
  assert.match(css, /\.journal-card/)
  assert.match(css, /\.journal-template__textarea/)
  assert.match(css, /\.journal-timer__display/)
  assert.equal((css.match(/@keyframes/g) || []).length, 1)
})

// ── 文档（vt-governance 配套） ──

test('README 记录学习会话工作台与独立存储 key', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
  assert.match(readme, /学习会话工作台/)
  assert.match(readme, /frontend-dag-debug:journal/)
  assert.match(readme, /frontend-journal\.test\.mjs/)
})

test('验证矩阵登记学习会话工作台验证入口', async () => {
  const matrix = await readFile(
    new URL('../ai_workspace/loop-agent/verification-matrix.md', import.meta.url),
    'utf8',
  )
  assert.match(matrix, /frontend-journal\.test\.mjs/)
  assert.match(matrix, /学习会话工作台/)
})
