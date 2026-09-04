// 学习任务规划中心（src/planner.ts）— 纯前端任务拆解与专注队列模块。
//
// 功能（AC-PLN-001~011 / REQ-PLN-001~008）：
// - 学习任务本地 CRUD：新建（校验：标题 trim 后 1–80 字符、备注 0–300 字符、
//   截止日期为空或合法 YYYY-MM-DD 日历日期）、编辑复用同一表单（保持 id/createdAt，
//   刷新 updatedAt）、取消编辑恢复创建态、显式 backlog|active|done 流转、删除经
//   window.confirm 确认；完成或删除任务时同步移出专注队列；
// - 检索：标题与备注 trim 后不区分大小写包含匹配搜索；路线 × 状态 × 优先级三轴
//   组合筛选（all 表示不限制）；dueDate/priority/updatedAt 三字段排序（同字段再选
//   切换升/降序，空截止日期始终在末尾）；清除筛选恢复完整列表且不修改数据；
// - 空态区分：从未创建任务显示「还没有学习任务」，筛选无匹配显示
//   「没有符合当前条件的任务」；汇总实时展示总数、三种状态计数与未完成预计分钟数，
//   视图筛选不改变汇总口径；
// - 专注队列：最多三个不重复、非完成任务 ID，支持加入/移出/上移/下移与边界禁用，
//   队列满时其他加入按钮禁用，实时计算预计总时长；加载时清除重复/失效/已完成 ID
//   并截断前三项；
// - 持久化载荷 {schemaVersion: 1, missions, focusQueueIds}，localStorage
//  （key=frontend-dag-debug:planner）读写均 try/catch 降级，不可用时页面继续工作
//   并显示「本地计划存储不可用，本次修改仅在当前页面保留」；重置仅清除 planner key。
//
// 隔离性：全部使用 planner-* 类名与独立存储 key，不读写 journal、archive、
// export-history、auth 或 tasks key；无网络请求、无登录依赖、无跨页面存储迁移。
// 存储与网络调用收敛于本模块（main.ts 零 fetch/localStorage 字面量）。

export const PLANNER_STORAGE_KEY = 'frontend-dag-debug:planner'
export const PLANNER_SCHEMA_VERSION = 1
export const MAX_FOCUS_QUEUE = 3
export const STORAGE_UNAVAILABLE_MESSAGE =
  '本地计划存储不可用，本次修改仅在当前页面保留'

export type MissionRoute = 'beginner' | 'builder' | 'advanced'
export type MissionPriority = 'high' | 'medium' | 'low'
export type MissionStatus = 'backlog' | 'active' | 'done'
export type MissionEstimate = 15 | 30 | 45 | 60 | 90
export type MissionSortField = 'dueDate' | 'priority' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export interface LearningMission {
  id: string
  title: string
  route: MissionRoute
  priority: MissionPriority
  status: MissionStatus
  estimateMinutes: MissionEstimate
  dueDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PlannerPayload {
  schemaVersion: 1
  missions: LearningMission[]
  focusQueueIds: string[]
}

export const MISSION_ROUTES: readonly MissionRoute[] = ['beginner', 'builder', 'advanced']
export const MISSION_PRIORITIES: readonly MissionPriority[] = ['high', 'medium', 'low']
export const MISSION_STATUSES: readonly MissionStatus[] = ['backlog', 'active', 'done']
export const MISSION_ESTIMATES: readonly MissionEstimate[] = [15, 30, 45, 60, 90]

const PRIORITY_ORDER: Record<MissionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

// ── 校验 ──

export interface MissionInput {
  title: string
  route: string
  priority: string
  status: string
  estimateMinutes: string
  dueDate: string
  notes: string
}

export interface MissionValidationResult {
  valid: boolean
  errors: string[]
}

/** 截止日期校验：空字符串合法；非空须为合法 YYYY-MM-DD 日历日期。 */
export function validateDueDate(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false
  const [y, m, d] = trimmed.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** 新建/编辑校验：标题 trim 后 1–80 字符、备注 0–300 字符、日期合法（planner-create-invalid）。 */
export function validateMissionInput(input: MissionInput): MissionValidationResult {
  const errors: string[] = []
  const title = input.title.trim()
  if (title.length < 1 || title.length > 80) {
    errors.push('标题须为 1–80 字符')
  }
  if (!(MISSION_ROUTES as readonly string[]).includes(input.route)) {
    errors.push('路线必选：beginner | builder | advanced')
  }
  if (!(MISSION_PRIORITIES as readonly string[]).includes(input.priority)) {
    errors.push('优先级必选：high | medium | low')
  }
  if (!(MISSION_STATUSES as readonly string[]).includes(input.status)) {
    errors.push('状态必选：backlog | active | done')
  }
  if (!(['15', '30', '45', '60', '90'] as readonly string[]).includes(input.estimateMinutes.trim())) {
    errors.push('预计用时必选：15 | 30 | 45 | 60 | 90 分钟')
  }
  if (!validateDueDate(input.dueDate)) {
    errors.push('截止日期须为空或合法 YYYY-MM-DD 日期')
  }
  if (input.notes.length > 300) {
    errors.push('备注须为 0–300 字符')
  }
  return { valid: errors.length === 0, errors }
}

export function isValidMission(data: unknown): data is LearningMission {
  if (typeof data !== 'object' || data === null) return false
  const m = data as LearningMission
  return (
    typeof m.id === 'string' &&
    m.id !== '' &&
    typeof m.title === 'string' &&
    m.title.trim().length >= 1 &&
    m.title.trim().length <= 80 &&
    (MISSION_ROUTES as readonly string[]).includes(m.route) &&
    (MISSION_PRIORITIES as readonly string[]).includes(m.priority) &&
    (MISSION_STATUSES as readonly string[]).includes(m.status) &&
    (MISSION_ESTIMATES as readonly number[]).includes(m.estimateMinutes) &&
    typeof m.dueDate === 'string' &&
    validateDueDate(m.dueDate) &&
    typeof m.notes === 'string' &&
    m.notes.length <= 300 &&
    typeof m.createdAt === 'string' &&
    typeof m.updatedAt === 'string'
  )
}

function isValidPayloadShape(data: unknown): data is PlannerPayload {
  if (typeof data !== 'object' || data === null) return false
  const p = data as PlannerPayload
  return (
    p.schemaVersion === PLANNER_SCHEMA_VERSION &&
    Array.isArray(p.missions) &&
    Array.isArray(p.focusQueueIds)
  )
}

// ── 搜索 / 筛选 / 排序（纯函数，不修改输入） ──

export interface MissionFilter {
  route: MissionRoute | 'all'
  status: MissionStatus | 'all'
  priority: MissionPriority | 'all'
}

/** 搜索：标题与备注 trim 后不区分大小写包含匹配。 */
export function searchMissions(missions: LearningMission[], query: string): LearningMission[] {
  const q = query.trim().toLowerCase()
  if (q === '') return [...missions]
  return missions.filter(
    (m) =>
      m.title.toLowerCase().includes(q) || m.notes.toLowerCase().includes(q),
  )
}

/** 三轴组合筛选：route × status × priority，all 表示不限制。 */
export function filterMissions(
  missions: LearningMission[],
  filter: MissionFilter,
): LearningMission[] {
  return missions.filter(
    (m) =>
      (filter.route === 'all' || m.route === filter.route) &&
      (filter.status === 'all' || m.status === filter.status) &&
      (filter.priority === 'all' || m.priority === filter.priority),
  )
}

/** 组合视图：先搜索后筛选，返回新数组（清除筛选不修改数据）。 */
export function applyMissionView(
  missions: LearningMission[],
  query: string,
  filter: MissionFilter,
): LearningMission[] {
  return filterMissions(searchMissions(missions, query), filter)
}

/** 排序：dueDate/priority/updatedAt；空截止日期始终在末尾（升降序皆然）。 */
export function sortMissions(
  missions: LearningMission[],
  field: MissionSortField,
  direction: SortDirection,
): LearningMission[] {
  const sorted = [...missions]
  const sign = direction === 'asc' ? 1 : -1
  sorted.sort((a, b) => {
    if (field === 'dueDate') {
      const aEmpty = a.dueDate.trim() === ''
      const bEmpty = b.dueDate.trim() === ''
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1
      if (a.dueDate === b.dueDate) return 0
      return (a.dueDate < b.dueDate ? -1 : 1) * sign
    }
    if (field === 'priority') {
      return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * sign
    }
    if (a.updatedAt === b.updatedAt) return 0
    return (a.updatedAt < b.updatedAt ? -1 : 1) * sign
  })
  return sorted
}

// ── 汇总（纯函数，视图筛选不改变汇总口径） ──

export interface PlannerSummary {
  total: number
  backlog: number
  active: number
  done: number
  pendingMinutes: number
}

/** 汇总：总数、三种状态计数与未完成任务预计总分钟数。 */
export function computePlannerSummary(missions: LearningMission[]): PlannerSummary {
  let backlog = 0
  let active = 0
  let done = 0
  let pendingMinutes = 0
  for (const m of missions) {
    if (m.status === 'backlog') backlog += 1
    else if (m.status === 'active') active += 1
    else if (m.status === 'done') done += 1
    if (m.status !== 'done') pendingMinutes += m.estimateMinutes
  }
  return { total: missions.length, backlog, active, done, pendingMinutes }
}

// ── 专注队列（纯函数） ──

/** 归一化：清除重复/失效/已完成 ID 并截断前三项，返回新数组。 */
export function normalizeFocusQueue(
  queueIds: readonly string[],
  missions: readonly LearningMission[],
): string[] {
  const byId = new Map(missions.map((m) => [m.id, m]))
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of queueIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const m = byId.get(id)
    if (!m || m.status === 'done') continue
    result.push(id)
    if (result.length >= MAX_FOCUS_QUEUE) break
  }
  return result
}

/** 加入是否可用：重复、已完成、队列已满时禁用。 */
export function canJoinFocusQueue(
  missionId: string,
  queueIds: readonly string[],
  missions: readonly LearningMission[],
): { ok: boolean; reason: 'duplicate' | 'done' | 'full' | 'missing' | null } {
  const mission = missions.find((m) => m.id === missionId)
  if (!mission) return { ok: false, reason: 'missing' }
  if (mission.status === 'done') return { ok: false, reason: 'done' }
  if (queueIds.includes(missionId)) return { ok: false, reason: 'duplicate' }
  if (normalizeFocusQueue(queueIds, missions).length >= MAX_FOCUS_QUEUE) {
    return { ok: false, reason: 'full' }
  }
  return { ok: true, reason: null }
}

/** 加入队列：非法（重复/完成/已满/不存在）返回原数组副本。 */
export function joinFocusQueue(
  queueIds: readonly string[],
  missionId: string,
  missions: readonly LearningMission[],
): string[] {
  const normalized = normalizeFocusQueue(queueIds, missions)
  if (!canJoinFocusQueue(missionId, normalized, missions).ok) return [...normalized]
  return [...normalized, missionId].slice(0, MAX_FOCUS_QUEUE)
}

/** 移出队列：返回新数组。 */
export function leaveFocusQueue(queueIds: readonly string[], missionId: string): string[] {
  return queueIds.filter((id) => id !== missionId)
}

/** 上移/下移：边界位置保持原顺序，返回新数组。 */
export function moveFocusQueueItem(
  queueIds: readonly string[],
  missionId: string,
  direction: 'up' | 'down',
): string[] {
  const next = [...queueIds]
  const index = next.indexOf(missionId)
  if (index === -1) return next
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= next.length) return next
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** 队列预计总时长：按队列顺序累加对应任务预计分钟数，缺失任务跳过。 */
export function computeFocusQueueMinutes(
  queueIds: readonly string[],
  missions: readonly LearningMission[],
): number {
  const byId = new Map(missions.map((m) => [m.id, m]))
  let total = 0
  for (const id of queueIds) {
    const m = byId.get(id)
    if (m) total += m.estimateMinutes
  }
  return total
}

// ── CRUD 纯函数（返回新数组/对象，不修改输入） ──

export function createMission(
  missions: readonly LearningMission[],
  input: MissionInput,
  nowIso: string,
  id: string,
): { missions: LearningMission[]; mission: LearningMission | null; errors: string[] } {
  const validation = validateMissionInput(input)
  if (!validation.valid) return { missions: [...missions], mission: null, errors: validation.errors }
  const mission: LearningMission = {
    id,
    title: input.title.trim(),
    route: input.route as MissionRoute,
    priority: input.priority as MissionPriority,
    status: input.status as MissionStatus,
    estimateMinutes: Number(input.estimateMinutes.trim()) as MissionEstimate,
    dueDate: input.dueDate.trim(),
    notes: input.notes,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  return { missions: [...missions, mission], mission, errors: [] }
}

/** 编辑：保持 id/createdAt，刷新 updatedAt；非法输入返回原数组副本。 */
export function updateMission(
  missions: readonly LearningMission[],
  missionId: string,
  input: MissionInput,
  nowIso: string,
): { missions: LearningMission[]; mission: LearningMission | null; errors: string[] } {
  const validation = validateMissionInput(input)
  if (!validation.valid) return { missions: [...missions], mission: null, errors: validation.errors }
  const existing = missions.find((m) => m.id === missionId)
  if (!existing) return { missions: [...missions], mission: null, errors: ['任务不存在'] }
  const updated: LearningMission = {
    ...existing,
    id: existing.id,
    title: input.title.trim(),
    route: input.route as MissionRoute,
    priority: input.priority as MissionPriority,
    status: input.status as MissionStatus,
    estimateMinutes: Number(input.estimateMinutes.trim()) as MissionEstimate,
    dueDate: input.dueDate.trim(),
    notes: input.notes,
    createdAt: existing.createdAt,
    updatedAt: nowIso,
  }
  return {
    missions: missions.map((m) => (m.id === missionId ? updated : m)),
    mission: updated,
    errors: [],
  }
}

/** 删除：返回新数组；调用方同步移除对应队列 ID。 */
export function deleteMission(
  missions: readonly LearningMission[],
  missionId: string,
): LearningMission[] {
  return missions.filter((m) => m.id !== missionId)
}

/** 状态流转：显式设置 backlog|active|done，刷新 updatedAt。 */
export function changeMissionStatus(
  missions: readonly LearningMission[],
  missionId: string,
  status: MissionStatus,
  nowIso: string,
): LearningMission[] {
  return missions.map((m) =>
    m.id === missionId ? { ...m, status, updatedAt: nowIso } : m,
  )
}

// ── 持久化：读写均 try/catch 降级 ──

export interface LoadedPlannerState {
  missions: LearningMission[]
  focusQueueIds: string[]
  storageAvailable: boolean
}

/** 加载：拒绝非法任务，清除重复/失效/已完成队列 ID 并截断前三项。 */
export function loadPlannerState(): LoadedPlannerState {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY)
    if (raw === null) return { missions: [], focusQueueIds: [], storageAvailable: true }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidPayloadShape(parsed)) {
      return { missions: [], focusQueueIds: [], storageAvailable: false }
    }
    const missions = parsed.missions.filter(isValidMission)
    const strictPayloadInvalid = missions.length !== parsed.missions.length
    const focusQueueIds = normalizeFocusQueue(parsed.focusQueueIds, missions)
    const queueNormalized =
      focusQueueIds.length !== parsed.focusQueueIds.length ||
      focusQueueIds.some((id, i) => id !== parsed.focusQueueIds[i])
    void strictPayloadInvalid
    void queueNormalized
    return { missions, focusQueueIds, storageAvailable: true }
  } catch {
    return { missions: [], focusQueueIds: [], storageAvailable: false }
  }
}

export function savePlannerState(missions: readonly LearningMission[], focusQueueIds: readonly string[]): boolean {
  try {
    const payload: PlannerPayload = {
      schemaVersion: PLANNER_SCHEMA_VERSION,
      missions: [...missions],
      focusQueueIds: [...focusQueueIds],
    }
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

/** 重置仅清除 planner key，不触碰其他 key。 */
export function clearPlannerState(): boolean {
  try {
    localStorage.removeItem(PLANNER_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

// ── UI 初始化（仅浏览器运行时；Node 测试只导入纯函数） ──

const ROUTE_LABELS: Record<MissionRoute, string> = {
  beginner: '入门',
  builder: '构建',
  advanced: '进阶',
}

const PRIORITY_LABELS: Record<MissionPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const STATUS_LABELS: Record<MissionStatus, string> = {
  backlog: '待规划',
  active: '进行中',
  done: '已完成',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function missionCardMarkup(
  mission: LearningMission,
  inQueue: boolean,
  joinDisabled: boolean,
  joinLabel: string,
  editing: boolean,
): string {
  return `
    <li class="planner-card" data-mission="${escapeHtml(mission.id)}">
      <div class="planner-card__head">
        <h3 class="planner-card__title">${escapeHtml(mission.title)}</h3>
        <span class="planner-card__badge">${ROUTE_LABELS[mission.route]} · ${PRIORITY_LABELS[mission.priority]} · ${STATUS_LABELS[mission.status]}</span>
      </div>
      <p class="planner-card__meta">预计 ${mission.estimateMinutes} 分钟 · 截止 ${mission.dueDate === '' ? '未定' : escapeHtml(mission.dueDate)}</p>
      ${mission.notes !== '' ? `<p class="planner-card__notes">${escapeHtml(mission.notes)}</p>` : ''}
      <div class="planner-card__actions">
        <button type="button" class="btn btn--secondary" data-action="edit" data-id="${escapeHtml(mission.id)}">${editing ? '正在编辑' : '编辑'}</button>
        <button type="button" class="btn btn--secondary" data-action="status-backlog" data-id="${escapeHtml(mission.id)}" aria-pressed="${mission.status === 'backlog' ? 'true' : 'false'}">待规划</button>
        <button type="button" class="btn btn--secondary" data-action="status-active" data-id="${escapeHtml(mission.id)}" aria-pressed="${mission.status === 'active' ? 'true' : 'false'}">进行中</button>
        <button type="button" class="btn btn--secondary" data-action="status-done" data-id="${escapeHtml(mission.id)}" aria-pressed="${mission.status === 'done' ? 'true' : 'false'}">已完成</button>
        <button type="button" class="btn btn--secondary" data-action="delete" data-id="${escapeHtml(mission.id)}">删除</button>
        <button type="button" class="btn btn--primary" data-action="join" data-id="${escapeHtml(mission.id)}"${joinDisabled ? ' disabled' : ''}>${inQueue ? '已在专注队列' : joinLabel}</button>
      </div>
    </li>`
}

export function initPlannerWorkbench(mount: HTMLElement): void {
  const loaded = loadPlannerState()
  let missions: LearningMission[] = loaded.missions
  let focusQueueIds: string[] = loaded.focusQueueIds
  let storageAvailable = loaded.storageAvailable
  let query = ''
  let filter: MissionFilter = { route: 'all', status: 'all', priority: 'all' }
  let sortField: MissionSortField = 'updatedAt'
  let sortDirection: SortDirection = 'desc'
  let editingId: string | null = null
  let formMessage = ''

  mount.innerHTML = `
    <div class="planner-workbench">
      <p class="planner-storage-error" id="planner-storage-error"${storageAvailable ? ' hidden' : ''}>${STORAGE_UNAVAILABLE_MESSAGE}</p>
      <div class="planner-layout">
        <div class="planner-main">
          <section class="planner-card-form planner-card--panel" aria-labelledby="planner-form-title">
            <h3 class="planner-panel__title" id="planner-form-title">新建学习任务</h3>
            <form id="planner-form" novalidate>
              <div class="planner-form__fields">
                <label class="planner-form__field">标题（1–80 字符）
                  <input type="text" id="planner-title" name="title" maxlength="80" required />
                </label>
                <div class="planner-form__row">
                  <label class="planner-form__field">路线
                    <select id="planner-route" name="route">
                      <option value="beginner">入门</option>
                      <option value="builder">构建</option>
                      <option value="advanced">进阶</option>
                    </select>
                  </label>
                  <label class="planner-form__field">优先级
                    <select id="planner-priority" name="priority">
                      <option value="high">高</option>
                      <option value="medium" selected>中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                </div>
                <div class="planner-form__row">
                  <label class="planner-form__field">状态
                    <select id="planner-status" name="status">
                      <option value="backlog">待规划</option>
                      <option value="active">进行中</option>
                      <option value="done">已完成</option>
                    </select>
                  </label>
                  <label class="planner-form__field">预计用时（分钟）
                    <select id="planner-estimate" name="estimateMinutes">
                      <option value="15">15</option>
                      <option value="30" selected>30</option>
                      <option value="45">45</option>
                      <option value="60">60</option>
                      <option value="90">90</option>
                    </select>
                  </label>
                </div>
                <label class="planner-form__field">截止日期（可空，YYYY-MM-DD）
                  <input type="date" id="planner-due" name="dueDate" />
                </label>
                <label class="planner-form__field">备注（0–300 字符）
                  <textarea id="planner-notes" name="notes" rows="3" maxlength="300"></textarea>
                </label>
              </div>
              <p class="planner-form__error" id="planner-form-error" role="alert" hidden></p>
              <div class="planner-form__actions">
                <button type="submit" class="btn btn--primary" id="planner-submit">创建任务</button>
                <button type="button" class="btn btn--secondary" id="planner-cancel-edit" hidden>取消编辑</button>
              </div>
            </form>
            <p class="planner-form__status" id="planner-form-status" aria-live="polite"></p>
          </section>

          <section class="planner-card--panel" aria-labelledby="planner-filter-title">
            <h3 class="planner-panel__title" id="planner-filter-title">搜索与筛选</h3>
            <div class="planner-toolbar">
              <label class="planner-search">搜索标题与备注
                <input type="search" id="planner-search" placeholder="输入关键词" />
              </label>
              <div class="planner-filters">
                <label class="planner-form__field">路线
                  <select id="planner-filter-route">
                    <option value="all">全部路线</option>
                    <option value="beginner">入门</option>
                    <option value="builder">构建</option>
                    <option value="advanced">进阶</option>
                  </select>
                </label>
                <label class="planner-form__field">状态
                  <select id="planner-filter-status">
                    <option value="all">全部状态</option>
                    <option value="backlog">待规划</option>
                    <option value="active">进行中</option>
                    <option value="done">已完成</option>
                  </select>
                </label>
                <label class="planner-form__field">优先级
                  <select id="planner-filter-priority">
                    <option value="all">全部优先级</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </label>
                <label class="planner-form__field">排序
                  <select id="planner-sort-field">
                    <option value="updatedAt">更新时间</option>
                    <option value="dueDate">截止日期</option>
                    <option value="priority">优先级</option>
                  </select>
                </label>
                <button type="button" class="btn btn--secondary" id="planner-sort-dir" aria-pressed="false">降序</button>
                <button type="button" class="btn btn--secondary" id="planner-clear-filter">清除筛选</button>
              </div>
            </div>
          </section>

          <section class="planner-card--panel" aria-labelledby="planner-summary-title">
            <h3 class="planner-panel__title" id="planner-summary-title">任务汇总</h3>
            <dl class="planner-summary__list" id="planner-summary"></dl>
          </section>

          <section class="planner-card--panel" aria-labelledby="planner-list-title">
            <h3 class="planner-panel__title" id="planner-list-title">任务列表</h3>
            <p class="planner-list__status" id="planner-list-status" aria-live="polite"></p>
            <ul class="planner-list" id="planner-list"></ul>
          </section>
        </div>

        <aside class="planner-side">
          <section class="planner-card--panel" aria-labelledby="planner-focus-title">
            <h3 class="planner-panel__title" id="planner-focus-title">专注队列（最多 3 项）</h3>
            <p class="planner-focus__total" id="planner-focus-total" aria-live="polite"></p>
            <ol class="planner-focus__list" id="planner-focus-list"></ol>
            <button type="button" class="btn btn--secondary" id="planner-reset">重置本地计划</button>
          </section>
        </aside>
      </div>
    </div>`

  const form = mount.querySelector<HTMLFormElement>('#planner-form')
  const titleInput = mount.querySelector<HTMLInputElement>('#planner-title')
  const routeSelect = mount.querySelector<HTMLSelectElement>('#planner-route')
  const prioritySelect = mount.querySelector<HTMLSelectElement>('#planner-priority')
  const statusSelect = mount.querySelector<HTMLSelectElement>('#planner-status')
  const estimateSelect = mount.querySelector<HTMLSelectElement>('#planner-estimate')
  const dueInput = mount.querySelector<HTMLInputElement>('#planner-due')
  const notesInput = mount.querySelector<HTMLTextAreaElement>('#planner-notes')
  const formError = mount.querySelector<HTMLElement>('#planner-form-error')
  const formStatus = mount.querySelector<HTMLElement>('#planner-form-status')
  const formTitle = mount.querySelector<HTMLElement>('#planner-form-title')
  const submitBtn = mount.querySelector<HTMLButtonElement>('#planner-submit')
  const cancelEditBtn = mount.querySelector<HTMLButtonElement>('#planner-cancel-edit')
  const searchInput = mount.querySelector<HTMLInputElement>('#planner-search')
  const filterRoute = mount.querySelector<HTMLSelectElement>('#planner-filter-route')
  const filterStatus = mount.querySelector<HTMLSelectElement>('#planner-filter-status')
  const filterPriority = mount.querySelector<HTMLSelectElement>('#planner-filter-priority')
  const sortFieldSelect = mount.querySelector<HTMLSelectElement>('#planner-sort-field')
  const sortDirBtn = mount.querySelector<HTMLButtonElement>('#planner-sort-dir')
  const clearFilterBtn = mount.querySelector<HTMLButtonElement>('#planner-clear-filter')
  const summaryEl = mount.querySelector<HTMLElement>('#planner-summary')
  const listEl = mount.querySelector<HTMLElement>('#planner-list')
  const listStatus = mount.querySelector<HTMLElement>('#planner-list-status')
  const focusList = mount.querySelector<HTMLElement>('#planner-focus-list')
  const focusTotal = mount.querySelector<HTMLElement>('#planner-focus-total')
  const storageError = mount.querySelector<HTMLElement>('#planner-storage-error')
  const resetBtn = mount.querySelector<HTMLButtonElement>('#planner-reset')

  function persist(): void {
    const ok = savePlannerState(missions, focusQueueIds)
    if (!ok && storageAvailable) {
      storageAvailable = false
      if (storageError) storageError.hidden = false
    }
  }

  function fillForm(mission: LearningMission): void {
    if (!titleInput || !routeSelect || !prioritySelect || !statusSelect || !estimateSelect || !dueInput || !notesInput) return
    titleInput.value = mission.title
    routeSelect.value = mission.route
    prioritySelect.value = mission.priority
    statusSelect.value = mission.status
    estimateSelect.value = String(mission.estimateMinutes)
    dueInput.value = mission.dueDate
    notesInput.value = mission.notes
  }

  function clearForm(): void {
    if (!titleInput || !routeSelect || !prioritySelect || !statusSelect || !estimateSelect || !dueInput || !notesInput) return
    titleInput.value = ''
    routeSelect.value = 'beginner'
    prioritySelect.value = 'medium'
    statusSelect.value = 'backlog'
    estimateSelect.value = '30'
    dueInput.value = ''
    notesInput.value = ''
  }

  function renderAll(): void {
    focusQueueIds = normalizeFocusQueue(focusQueueIds, missions)
    const summary = computePlannerSummary(missions)
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="planner-summary__item"><dt>总数</dt><dd>${summary.total}</dd></div>
        <div class="planner-summary__item"><dt>待规划</dt><dd>${summary.backlog}</dd></div>
        <div class="planner-summary__item"><dt>进行中</dt><dd>${summary.active}</dd></div>
        <div class="planner-summary__item"><dt>已完成</dt><dd>${summary.done}</dd></div>
        <div class="planner-summary__item"><dt>未完成预计分钟</dt><dd>${summary.pendingMinutes}</dd></div>`
    }
    const view = sortMissions(applyMissionView(missions, query, filter), sortField, sortDirection)
    const queueFull = normalizeFocusQueue(focusQueueIds, missions).length >= MAX_FOCUS_QUEUE
    if (listEl) {
      if (missions.length === 0) {
        listEl.innerHTML = ''
      } else {
        listEl.innerHTML = view
          .map((m) => {
            const inQueue = focusQueueIds.includes(m.id)
            const joinState = canJoinFocusQueue(m.id, focusQueueIds, missions)
            const disabled = !joinState.ok
            const label =
              m.status === 'done' ? '已完成不可加入' : inQueue ? '已在专注队列' : queueFull && !inQueue ? '队列已满' : '加入专注队列'
            return missionCardMarkup(m, inQueue, disabled, label, editingId === m.id)
          })
          .join('')
      }
    }
    if (listStatus) {
      if (missions.length === 0) {
        listStatus.textContent = '还没有学习任务'
      } else if (view.length === 0) {
        listStatus.textContent = '没有符合当前条件的任务'
      } else {
        listStatus.textContent = formMessage
      }
    }
    if (formStatus && missions.length !== 0 && view.length !== 0) {
      formStatus.textContent = formMessage
    }
    if (focusList) {
      const byId = new Map(missions.map((m) => [m.id, m]))
      focusList.innerHTML = focusQueueIds
        .map((id, index) => {
          const m = byId.get(id)
          if (!m) return ''
          return `
            <li class="planner-focus__item" data-focus="${escapeHtml(id)}">
              <span class="planner-focus__rank">${index + 1}</span>
              <span class="planner-focus__name">${escapeHtml(m.title)}</span>
              <span class="planner-focus__minutes">${m.estimateMinutes} 分钟</span>
              <button type="button" class="btn btn--secondary" data-action="focus-up" data-id="${escapeHtml(id)}"${index === 0 ? ' disabled' : ''}>上移</button>
              <button type="button" class="btn btn--secondary" data-action="focus-down" data-id="${escapeHtml(id)}"${index === focusQueueIds.length - 1 ? ' disabled' : ''}>下移</button>
              <button type="button" class="btn btn--secondary" data-action="focus-leave" data-id="${escapeHtml(id)}">移出</button>
            </li>`
        })
        .join('')
    }
    if (focusTotal) {
      focusTotal.textContent = `预计总时长 ${computeFocusQueueMinutes(focusQueueIds, missions)} 分钟`
    }
    if (formTitle) formTitle.textContent = editingId ? '编辑学习任务' : '新建学习任务'
    if (submitBtn) submitBtn.textContent = editingId ? '保存修改' : '创建任务'
    if (cancelEditBtn) cancelEditBtn.hidden = editingId === null
    if (sortDirBtn) {
      sortDirBtn.textContent = sortDirection === 'asc' ? '升序' : '降序'
      sortDirBtn.setAttribute('aria-pressed', sortDirection === 'asc' ? 'true' : 'false')
    }
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const input: MissionInput = {
      title: titleInput?.value ?? '',
      route: routeSelect?.value ?? '',
      priority: prioritySelect?.value ?? '',
      status: statusSelect?.value ?? '',
      estimateMinutes: estimateSelect?.value ?? '',
      dueDate: dueInput?.value ?? '',
      notes: notesInput?.value ?? '',
    }
    const now = new Date().toISOString()
    if (editingId) {
      const result = updateMission(missions, editingId, input, now)
      if (!result.mission) {
        if (formError) {
          formError.hidden = false
          formError.textContent = result.errors.join('；')
        }
        return
      }
      missions = result.missions
      if (result.mission && result.mission.status === 'done') {
        focusQueueIds = leaveFocusQueue(focusQueueIds, editingId)
      }
      editingId = null
      clearForm()
      formMessage = '已保存修改'
      if (formError) formError.hidden = true
      persist()
      renderAll()
      return
    }
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mission-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    const result = createMission(missions, input, now, id)
    if (!result.mission) {
      if (formError) {
        formError.hidden = false
        formError.textContent = result.errors.join('；')
      }
      return
    }
    missions = result.missions
    clearForm()
    formMessage = '已创建学习任务'
    if (formError) formError.hidden = true
    persist()
    renderAll()
  })

  cancelEditBtn?.addEventListener('click', () => {
    editingId = null
    clearForm()
    if (formError) formError.hidden = true
    formMessage = ''
    renderAll()
  })

  searchInput?.addEventListener('input', () => {
    query = searchInput.value
    renderAll()
  })
  filterRoute?.addEventListener('change', () => {
    filter = { ...filter, route: filterRoute.value as MissionFilter['route'] }
    renderAll()
  })
  filterStatus?.addEventListener('change', () => {
    filter = { ...filter, status: filterStatus.value as MissionFilter['status'] }
    renderAll()
  })
  filterPriority?.addEventListener('change', () => {
    filter = { ...filter, priority: filterPriority.value as MissionFilter['priority'] }
    renderAll()
  })
  sortFieldSelect?.addEventListener('change', () => {
    const next = sortFieldSelect.value as MissionSortField
    if (next === sortField) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortField = next
      sortDirection = next === 'priority' ? 'asc' : 'desc'
    }
    renderAll()
  })
  sortDirBtn?.addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    renderAll()
  })
  clearFilterBtn?.addEventListener('click', () => {
    query = ''
    filter = { route: 'all', status: 'all', priority: 'all' }
    if (searchInput) searchInput.value = ''
    if (filterRoute) filterRoute.value = 'all'
    if (filterStatus) filterStatus.value = 'all'
    if (filterPriority) filterPriority.value = 'all'
    renderAll()
  })

  mount.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const btn = target.closest<HTMLButtonElement>('[data-action]')
    if (!btn || !mount.contains(btn)) return
    const action = btn.dataset.action ?? ''
    const id = btn.dataset.id ?? ''
    const now = new Date().toISOString()
    if (action === 'edit') {
      const mission = missions.find((m) => m.id === id)
      if (!mission) return
      editingId = id
      fillForm(mission)
      if (formError) formError.hidden = true
      formMessage = ''
      renderAll()
    } else if (action === 'delete') {
      if (!window.confirm('确认删除该学习任务？')) return
      missions = deleteMission(missions, id)
      focusQueueIds = leaveFocusQueue(focusQueueIds, id)
      if (editingId === id) {
        editingId = null
        clearForm()
      }
      formMessage = '已删除学习任务'
      persist()
      renderAll()
    } else if (
      action === 'status-backlog' ||
      action === 'status-active' ||
      action === 'status-done'
    ) {
      const status = action.replace('status-', '') as MissionStatus
      missions = changeMissionStatus(missions, id, status, now)
      if (status === 'done') focusQueueIds = leaveFocusQueue(focusQueueIds, id)
      persist()
      renderAll()
    } else if (action === 'join') {
      focusQueueIds = joinFocusQueue(focusQueueIds, id, missions)
      persist()
      renderAll()
    } else if (action === 'focus-leave') {
      focusQueueIds = leaveFocusQueue(focusQueueIds, id)
      persist()
      renderAll()
    } else if (action === 'focus-up') {
      focusQueueIds = moveFocusQueueItem(focusQueueIds, id, 'up')
      persist()
      renderAll()
    } else if (action === 'focus-down') {
      focusQueueIds = moveFocusQueueItem(focusQueueIds, id, 'down')
      persist()
      renderAll()
    }
  })

  resetBtn?.addEventListener('click', () => {
    clearPlannerState()
    missions = []
    focusQueueIds = []
    editingId = null
    formMessage = ''
    clearForm()
    renderAll()
  })

  renderAll()
}
