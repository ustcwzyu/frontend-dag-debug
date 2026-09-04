// 学习任务规划中心契约测试（jest）：planner.ts 纯函数单元断言 + 静态集成契约断言。
// 覆盖 AC-PLN-001~011 / REQ-PLN-001~010：校验、搜索、组合筛选、排序、汇总、
// 队列归一化/移动/上限、CRUD 纯函数、存储降级及静态集成契约。
// Jest 全局提供 test（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseHash } from '../src/router.ts'
import {
  PLANNER_STORAGE_KEY,
  STORAGE_UNAVAILABLE_MESSAGE,
  MAX_FOCUS_QUEUE,
  validateMissionInput,
  validateDueDate,
  isValidMission,
  searchMissions,
  filterMissions,
  applyMissionView,
  sortMissions,
  computePlannerSummary,
  normalizeFocusQueue,
  canJoinFocusQueue,
  joinFocusQueue,
  leaveFocusQueue,
  moveFocusQueueItem,
  computeFocusQueueMinutes,
  createMission,
  updateMission,
  deleteMission,
  changeMissionStatus,
  loadPlannerState,
  savePlannerState,
  clearPlannerState,
} from '../src/planner.ts'

const routerSource = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
const plannerSource = readFileSync(new URL('../src/planner.ts', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

function baseInput(overrides = {}) {
  return {
    title: '完成第一课实验',
    route: 'beginner',
    priority: 'medium',
    status: 'backlog',
    estimateMinutes: '30',
    dueDate: '',
    notes: '',
    ...overrides,
  }
}

function mission(overrides = {}) {
  return {
    id: 'm-1',
    title: '完成第一课实验',
    route: 'beginner',
    priority: 'medium',
    status: 'backlog',
    estimateMinutes: 30,
    dueDate: '',
    notes: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── [AC-PLN-001] 路由 ──

test('[AC-PLN-001] #/planner 精确解析为 planner，#/planner/ 保持 404', () => {
  assert.deepEqual(parseHash('#/planner'), { page: 'planner', routeId: null })
  assert.deepEqual(parseHash('#/planner/'), { page: 'not-found', routeId: null })
})

test('[AC-PLN-001] 既有路由不回归：home/lesson/progress/archive/export/login', () => {
  assert.deepEqual(parseHash(''), { page: 'home', routeId: null })
  assert.deepEqual(parseHash('#/lesson/beginner'), { page: 'lesson', routeId: 'beginner' })
  assert.deepEqual(parseHash('#/progress'), { page: 'progress', routeId: null })
  assert.deepEqual(parseHash('#/archive'), { page: 'archive', routeId: null })
  assert.deepEqual(parseHash('#/export'), { page: 'export', routeId: null })
  assert.deepEqual(parseHash('#/login'), { page: 'login', routeId: null })
})

// ── [AC-PLN-003] 校验 ──

test('[AC-PLN-003] 标题 trim 后 1–80 字符：空/空白/超长非法', () => {
  assert.equal(validateMissionInput(baseInput({ title: '  ' })).valid, false)
  assert.equal(validateMissionInput(baseInput({ title: '' })).valid, false)
  assert.equal(validateMissionInput(baseInput({ title: 'x'.repeat(81) })).valid, false)
  assert.equal(validateMissionInput(baseInput({ title: '  ok  ' })).valid, true)
  assert.equal(validateMissionInput(baseInput({ title: 'x'.repeat(80) })).valid, true)
})

test('[AC-PLN-003] 备注 0–300 字符：300 合法、301 非法', () => {
  assert.equal(validateMissionInput(baseInput({ notes: 'n'.repeat(300) })).valid, true)
  const r = validateMissionInput(baseInput({ notes: 'n'.repeat(301) }))
  assert.equal(r.valid, false)
  assert.match(r.errors.join('；'), /备注/)
})

test('[AC-PLN-003] 截止日期为空或合法日历日期：非法格式与不存在日期拒绝', () => {
  assert.equal(validateDueDate(''), true)
  assert.equal(validateDueDate('2026-09-30'), true)
  assert.equal(validateDueDate('2026-02-30'), false)
  assert.equal(validateDueDate('2026-13-01'), false)
  assert.equal(validateDueDate('not-a-date'), false)
  assert.equal(validateMissionInput(baseInput({ dueDate: '2026-02-30' })).valid, false)
})

test('[AC-PLN-003] 非法提交返回全部错误摘要', () => {
  const r = validateMissionInput(
    baseInput({ title: ' ', dueDate: 'bad', notes: 'n'.repeat(301), route: 'x' }),
  )
  assert.equal(r.valid, false)
  assert.ok(r.errors.length >= 3)
})

test('[AC-PLN-008] isValidMission 拒绝非法任务形状', () => {
  assert.equal(isValidMission(mission()), true)
  assert.equal(isValidMission({ ...mission(), id: '' }), false)
  assert.equal(isValidMission({ ...mission(), title: '  ' }), false)
  assert.equal(isValidMission({ ...mission(), route: 'x' }), false)
  assert.equal(isValidMission({ ...mission(), estimateMinutes: 20 }), false)
  assert.equal(isValidMission({ ...mission(), dueDate: '2026-02-30' }), false)
  assert.equal(isValidMission({ ...mission(), notes: 'n'.repeat(301) }), false)
})

// ── [AC-PLN-005] 搜索 / 筛选 / 排序 ──

test('[AC-PLN-005] 搜索覆盖标题与备注且忽略大小写', () => {
  const list = [
    mission({ id: 'a', title: 'Agent Run 实验', notes: '' }),
    mission({ id: 'b', title: '其他', notes: 'Tool 调用记录' }),
    mission({ id: 'c', title: '无关', notes: '无关备注' }),
  ]
  assert.deepEqual(searchMissions(list, 'agent run').map((m) => m.id), ['a'])
  assert.deepEqual(searchMissions(list, 'tool').map((m) => m.id), ['b'])
  assert.deepEqual(searchMissions(list, '  ').map((m) => m.id), ['a', 'b', 'c'])
})

test('[AC-PLN-005] 路线、状态、优先级可组合筛选', () => {
  const list = [
    mission({ id: 'a', route: 'beginner', status: 'backlog', priority: 'high' }),
    mission({ id: 'b', route: 'builder', status: 'active', priority: 'low' }),
    mission({ id: 'c', route: 'beginner', status: 'active', priority: 'high' }),
  ]
  assert.deepEqual(
    filterMissions(list, { route: 'beginner', status: 'all', priority: 'high' }).map((m) => m.id),
    ['a', 'c'],
  )
  assert.deepEqual(
    filterMissions(list, { route: 'beginner', status: 'active', priority: 'high' }).map((m) => m.id),
    ['c'],
  )
  assert.deepEqual(
    filterMissions(list, { route: 'all', status: 'all', priority: 'all' }).map((m) => m.id),
    ['a', 'b', 'c'],
  )
})

test('[AC-PLN-005] applyMissionView 先搜索后筛选且不修改输入', () => {
  const list = [
    mission({ id: 'a', title: 'Agent 实验', route: 'beginner', status: 'backlog', priority: 'high' }),
    mission({ id: 'b', title: 'Agent 复盘', route: 'builder', status: 'backlog', priority: 'high' }),
  ]
  const before = JSON.stringify(list)
  const view = applyMissionView(list, 'agent', { route: 'beginner', status: 'all', priority: 'all' })
  assert.deepEqual(view.map((m) => m.id), ['a'])
  assert.equal(JSON.stringify(list), before)
})

test('[AC-PLN-005] 排序：空截止日期始终在末尾（升序与降序皆然）', () => {
  const list = [
    mission({ id: 'a', dueDate: '', updatedAt: '2026-09-03T00:00:00.000Z' }),
    mission({ id: 'b', dueDate: '2026-09-10', updatedAt: '2026-09-01T00:00:00.000Z' }),
    mission({ id: 'c', dueDate: '2026-09-05', updatedAt: '2026-09-02T00:00:00.000Z' }),
  ]
  assert.deepEqual(sortMissions(list, 'dueDate', 'asc').map((m) => m.id), ['c', 'b', 'a'])
  assert.deepEqual(sortMissions(list, 'dueDate', 'desc').map((m) => m.id), ['b', 'c', 'a'])
})

test('[AC-PLN-005] 排序：优先级 high→low，更新时间升降序', () => {
  const list = [
    mission({ id: 'a', priority: 'low', updatedAt: '2026-09-01T00:00:00.000Z' }),
    mission({ id: 'b', priority: 'high', updatedAt: '2026-09-02T00:00:00.000Z' }),
    mission({ id: 'c', priority: 'medium', updatedAt: '2026-09-03T00:00:00.000Z' }),
  ]
  assert.deepEqual(sortMissions(list, 'priority', 'asc').map((m) => m.id), ['b', 'c', 'a'])
  assert.deepEqual(sortMissions(list, 'priority', 'desc').map((m) => m.id), ['a', 'c', 'b'])
  assert.deepEqual(sortMissions(list, 'updatedAt', 'asc').map((m) => m.id), ['a', 'b', 'c'])
})

// ── [AC-PLN-006] 汇总 ──

test('[AC-PLN-006] 汇总实时展示总数、三种状态计数与未完成预计分钟数', () => {
  const list = [
    mission({ id: 'a', status: 'backlog', estimateMinutes: 15 }),
    mission({ id: 'b', status: 'active', estimateMinutes: 60 }),
    mission({ id: 'c', status: 'done', estimateMinutes: 90 }),
  ]
  assert.deepEqual(computePlannerSummary(list), {
    total: 3,
    backlog: 1,
    active: 1,
    done: 1,
    pendingMinutes: 75,
  })
  assert.deepEqual(computePlannerSummary([]), {
    total: 0,
    backlog: 0,
    active: 0,
    done: 0,
    pendingMinutes: 0,
  })
})

// ── [AC-PLN-007] 专注队列 ──

test('[AC-PLN-007] 归一化清除重复/失效/已完成 ID 并截断前三项', () => {
  const list = [
    mission({ id: 'a', status: 'backlog' }),
    mission({ id: 'b', status: 'active' }),
    mission({ id: 'c', status: 'done' }),
    mission({ id: 'd', status: 'backlog' }),
    mission({ id: 'e', status: 'backlog' }),
  ]
  assert.deepEqual(normalizeFocusQueue(['a', 'a', 'missing', 'c', 'b', 'd', 'e'], list), ['a', 'b', 'd'])
  assert.equal(MAX_FOCUS_QUEUE, 3)
})

test('[AC-PLN-007] 加入约束：重复/已完成/已满时拒绝', () => {
  const list = [
    mission({ id: 'a', status: 'backlog' }),
    mission({ id: 'b', status: 'backlog' }),
    mission({ id: 'c', status: 'backlog' }),
    mission({ id: 'd', status: 'backlog' }),
    mission({ id: 'z', status: 'done' }),
  ]
  assert.equal(canJoinFocusQueue('a', [], list).ok, true)
  assert.equal(canJoinFocusQueue('a', ['a'], list).ok, false)
  assert.equal(canJoinFocusQueue('z', [], list).ok, false)
  assert.equal(canJoinFocusQueue('d', ['a', 'b', 'c'], list).ok, false)
  assert.deepEqual(joinFocusQueue(['a', 'b', 'c'], 'd', list), ['a', 'b', 'c'])
  assert.deepEqual(joinFocusQueue(['a'], 'b', list), ['a', 'b'])
})

test('[AC-PLN-007] 移出与上移/下移含边界保持', () => {
  assert.deepEqual(leaveFocusQueue(['a', 'b'], 'a'), ['b'])
  assert.deepEqual(moveFocusQueueItem(['a', 'b', 'c'], 'b', 'up'), ['b', 'a', 'c'])
  assert.deepEqual(moveFocusQueueItem(['a', 'b', 'c'], 'b', 'down'), ['a', 'c', 'b'])
  assert.deepEqual(moveFocusQueueItem(['a', 'b'], 'a', 'up'), ['a', 'b'])
  assert.deepEqual(moveFocusQueueItem(['a', 'b'], 'b', 'down'), ['a', 'b'])
})

test('[AC-PLN-007] 队列预计总时长随任务编辑实时可算', () => {
  const list = [
    mission({ id: 'a', estimateMinutes: 30 }),
    mission({ id: 'b', estimateMinutes: 45 }),
  ]
  assert.equal(computeFocusQueueMinutes(['a', 'b'], list), 75)
  assert.equal(computeFocusQueueMinutes(['a', 'missing'], list), 30)
})

// ── [AC-PLN-004] CRUD 纯函数 ──

test('[AC-PLN-004] 创建合法任务并清空由调用方处理；非法不新增', () => {
  const before = []
  const ok = createMission(before, baseInput(), '2026-09-01T00:00:00.000Z', 'm-1')
  assert.equal(ok.mission?.id, 'm-1')
  assert.equal(ok.missions.length, 1)
  assert.equal(before.length, 0)
  const bad = createMission([], baseInput({ title: '' }), '2026-09-01T00:00:00.000Z', 'm-2')
  assert.equal(bad.mission, null)
  assert.ok(bad.errors.length > 0)
})

test('[AC-PLN-004] 编辑保持 id/createdAt 并刷新 updatedAt；取消由 UI 层处理', () => {
  const list = [mission({ id: 'm-1', createdAt: '2020-01-01T00:00:00.000Z' })]
  const r = updateMission(list, 'm-1', baseInput({ title: '新标题' }), '2026-09-02T00:00:00.000Z')
  assert.equal(r.mission?.id, 'm-1')
  assert.equal(r.mission?.createdAt, '2020-01-01T00:00:00.000Z')
  assert.equal(r.mission?.title, '新标题')
  assert.equal(r.mission?.updatedAt, '2026-09-02T00:00:00.000Z')
  assert.equal(list[0].title, '完成第一课实验')
})

test('[AC-PLN-004] 删除与状态流转返回新数组', () => {
  const list = [mission({ id: 'a' }), mission({ id: 'b' })]
  assert.deepEqual(deleteMission(list, 'a').map((m) => m.id), ['b'])
  assert.equal(list.length, 2)
  const moved = changeMissionStatus(list, 'a', 'done', '2026-09-02T00:00:00.000Z')
  assert.equal(moved.find((m) => m.id === 'a')?.status, 'done')
  assert.equal(list.find((m) => m.id === 'a')?.status, 'backlog')
})

// ── [AC-PLN-009/010] 存储降级 ──

test('[AC-PLN-010] Node 无 localStorage 时加载降级且保存/清除返回 false', () => {
  assert.equal(typeof localStorage, 'undefined')
  const loaded = loadPlannerState()
  assert.deepEqual(loaded.missions, [])
  assert.deepEqual(loaded.focusQueueIds, [])
  assert.equal(loaded.storageAvailable, false)
  assert.equal(savePlannerState([], []), false)
  assert.equal(clearPlannerState(), false)
})

test('[AC-PLN-009] 持久化往返与隔离：仅读写 planner key', async () => {
  const store = new Map()
  const fake = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  }
  // @ts-ignore Node 测试桩
  globalThis.localStorage = fake
  try {
    const list = [mission({ id: 'a' }), mission({ id: 'b', status: 'done' })]
    assert.equal(savePlannerState(list, ['a', 'b', 'a']), true)
    assert.equal(store.has(PLANNER_STORAGE_KEY), true)
    assert.deepEqual([...store.keys()], [PLANNER_STORAGE_KEY])
    const loaded = loadPlannerState()
    assert.equal(loaded.storageAvailable, true)
    assert.deepEqual(loaded.missions.map((m) => m.id), ['a', 'b'])
    assert.deepEqual(loaded.focusQueueIds, ['a'])
    assert.equal(clearPlannerState(), true)
    assert.equal(store.has(PLANNER_STORAGE_KEY), false)
  } finally {
    // @ts-ignore 恢复无存储环境
    delete globalThis.localStorage
  }
})

test('[AC-PLN-008] 破损载荷降级为空且不抛出', async () => {
  const store = new Map([[PLANNER_STORAGE_KEY, 'not-json{{{']])
  // @ts-ignore Node 测试桩
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  }
  try {
    const loaded = loadPlannerState()
    assert.deepEqual(loaded.missions, [])
    assert.equal(loaded.storageAvailable, false)
  } finally {
    // @ts-ignore 恢复无存储环境
    delete globalThis.localStorage
  }
})

// ── 静态集成契约 ──

test('[AC-PLN-002] 静态契约：main 渲染标题、本机说明、挂载点与工作台接线', () => {
  assert.match(mainSource, /学习任务规划中心/)
  assert.match(mainSource, /id="planner-title"/)
  assert.match(mainSource, /数据只保存在本机/)
  assert.match(mainSource, /planner-workbench-mount/)
  assert.match(mainSource, /initPlannerWorkbench\(host\)/)
  assert.match(mainSource, /wirePlannerPage/)
  assert.match(mainSource, /aria-labelledby="planner-title"/)
})

test('[AC-PLN-002] 静态契约：主导航「计划」指向 #\/planner 且当前页语义', () => {
  assert.match(mainSource, /'#\/planner'/)
  assert.match(mainSource, /计划/)
  assert.match(mainSource, /aria-current="page"/)
})

test('[AC-PLN-002] 静态契约：创建表单覆盖全部字段且按钮类型明确', () => {
  assert.match(plannerSource, /planner-title/)
  assert.match(plannerSource, /planner-route/)
  assert.match(plannerSource, /planner-priority/)
  assert.match(plannerSource, /planner-status/)
  assert.match(plannerSource, /planner-estimate/)
  assert.match(plannerSource, /planner-due/)
  assert.match(plannerSource, /planner-notes/)
  assert.match(plannerSource, /type="submit"/)
  assert.match(plannerSource, /type="button"/)
})

test('[AC-PLN-004] 静态契约：编辑/删除经 confirm，删除与完成同步移出队列', () => {
  assert.match(plannerSource, /window\.confirm/)
  assert.match(plannerSource, /leaveFocusQueue\(focusQueueIds, id\)/)
  assert.match(plannerSource, /aria-live="polite"/)
})

test('[AC-PLN-006] 静态契约：空态文案与汇总口径', () => {
  assert.match(plannerSource, /还没有学习任务/)
  assert.match(plannerSource, /没有符合当前条件的任务/)
  assert.match(plannerSource, /computePlannerSummary\(missions\)/)
})

test('[AC-PLN-009] 静态契约：唯一新增 key 且存储收敛于 planner.ts', () => {
  assert.match(plannerSource, /frontend-dag-debug:planner/)
  assert.doesNotMatch(mainSource, /localStorage/)
  assert.doesNotMatch(mainSource, /fetch\(/)
  assert.match(plannerSource, /try \{/)
  assert.match(plannerSource, /catch \{/)
})

test('[AC-PLN-010] 静态契约：降级提示文案与零网络', () => {
  assert.match(plannerSource, /本地计划存储不可用，本次修改仅在当前页面保留/)
  assert.equal(STORAGE_UNAVAILABLE_MESSAGE, '本地计划存储不可用，本次修改仅在当前页面保留')
  assert.doesNotMatch(plannerSource, /fetch\(/)
  assert.doesNotMatch(plannerSource, /XMLHttpRequest/)
})

test('[AC-PLN-011] [AC-PLN-012] [VT-PLN-009-012] 静态契约：响应式与视觉约束（键盘可达/aria-live/480px单栏）', () => {
  assert.match(styleSource, /\.planner-layout/)
  assert.match(styleSource, /\.planner-card/)
  assert.match(styleSource, /@media \(max-width: 480px\)/)
  assert.match(styleSource, /grid-template-columns: 1fr/)
  const plannerBlock = styleSource.slice(styleSource.indexOf('.planner-panel'))
  assert.doesNotMatch(plannerBlock, /@keyframes/)
  assert.doesNotMatch(plannerBlock, /linear-gradient/)
})

test('[AC-PLN-013] [AC-PLN-014] [VT-PLN-013-014] 静态契约：router 零依赖纯净且 main 无任务看板回退', () => {
  assert.doesNotMatch(routerSource, /localStorage/)
  assert.doesNotMatch(routerSource, /document\./)
  assert.doesNotMatch(routerSource, /fetch\(/)
  assert.doesNotMatch(mainSource, /刷新列表/)
})
