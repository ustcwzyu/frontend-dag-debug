// 学习实验归档中心（src/archive.ts）— 学习会话工作台之上的归档与复盘层。
//
// 功能（AC-003 / AC-ARC-003 / AC-ARC-004 / AC-ARC-005）：
// - 实验记录本地 CRUD：新建（校验：标题非空、route 必选 beginner|builder|advanced、
//   score 0–10 整数或空）、编辑复用同一表单、删除经 window.confirm 确认；
//   localStorage（key=frontend-dag-debug:archive）读写均 try/catch 静默降级，
//   不可用时显示「归档存储不可用」且不抛未捕获异常；
// - 多维度检索：title+note 不区分大小写包含匹配搜索；route × status 两轴筛选；
//   title/updatedAt/score 三字段排序（同字段再点切换升/降序，不同字段默认升序），
//   当前筛选/排序状态以 aria-pressed 标注；
// - 空态区分：从未创建记录显示「还没有实验记录」，搜索/筛选无匹配显示
//   「没有匹配的实验记录」；
// - 归档标记：点「标记为已归档」置 status=archived 并持久化、updatedAt 刷新；
//   仅 archived 记录计入摘要数字（归档实验数、已完成自评均值，无则 null）；
// - 登录后经 getProgress → mergeArchiveSummaryForSync → putProgress 合并同步
//   /api/v1/progress：合并体保持 ProgressData 三字段服务端原值（identity-preserving，
//   归档摘要数字仅本地展示，绝不覆盖服务端字段），GET 失败不执行 PUT，
//   任一失败显示「同步失败」且本地记录保留；未登录显示「登录后同步」且零网络请求。
//
// 隔离性：全部使用 archive-* 类名与独立存储 key，不触碰 :journal/:auth/:tasks key。
// 网络与存储调用收敛于本模块与 src/api.ts（main.ts 零 fetch/localStorage 字面量），
// 保持真实请求路径为默认，测试通过注入依赖覆盖合并/失败语义。
import { getProgress, putProgress } from './api.ts'
import type { ProgressData } from './types.ts'

export const ARCHIVE_STORAGE_KEY = 'frontend-dag-debug:archive'

export type ArchiveRoute = 'beginner' | 'builder' | 'advanced'
export type ArchiveStatus = 'planned' | 'running' | 'archived'
export type ArchiveSortField = 'title' | 'updatedAt' | 'score'
export type ArchiveSortDirection = 'asc' | 'desc'

export interface ArchiveEntry {
  id: string
  title: string
  route: ArchiveRoute
  status: ArchiveStatus
  score: number | null
  note: string
  createdAt: string
  updatedAt: string
}

export const ARCHIVE_ROUTES: readonly ArchiveRoute[] = ['beginner', 'builder', 'advanced']
export const ARCHIVE_STATUSES: readonly ArchiveStatus[] = ['planned', 'running', 'archived']

const ARCHIVE_ROUTE_LABELS: Record<ArchiveRoute, string> = {
  beginner: '入门',
  builder: '构建',
  advanced: '进阶',
}

// ── 校验 ──

export interface ArchiveEntryInput {
  title: string
  route: string
  score: string
}

export interface ArchiveValidationResult {
  valid: boolean
  errors: string[]
}

/** 自评校验：0–10 整数或空；11/-1/7.5 等拒绝（AC-003）。 */
export function validateArchiveScore(raw: string): {
  valid: boolean
  value: number | null
} {
  const trimmed = raw.trim()
  if (trimmed === '') return { valid: true, value: null }
  if (!/^-?\d+$/.test(trimmed)) return { valid: false, value: null }
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    return { valid: false, value: null }
  }
  return { valid: true, value }
}

/** 新建/编辑校验：标题非空、route 必选、score 0–10 整数或空（archive-create-invalid）。 */
export function validateArchiveEntry(input: ArchiveEntryInput): ArchiveValidationResult {
  const errors: string[] = []
  if (input.title.trim() === '') errors.push('标题不能为空')
  if (!(ARCHIVE_ROUTES as readonly string[]).includes(input.route)) {
    errors.push('路线必选：beginner | builder | advanced')
  }
  if (!validateArchiveScore(input.score).valid) {
    errors.push('评分须为 0–10 的整数或留空')
  }
  return { valid: errors.length === 0, errors }
}

// ── 搜索 / 筛选 / 排序（纯函数） ──

/** 搜索：title 与 note 不区分大小写包含匹配（archive-search）。 */
export function searchArchiveEntries(
  entries: ArchiveEntry[],
  query: string,
): ArchiveEntry[] {
  const q = query.trim().toLowerCase()
  if (q === '') return entries
  return entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(q) ||
      entry.note.toLowerCase().includes(q),
  )
}

/** 筛选：route × status 两轴组合过滤（archive-filter-route / archive-filter-status）。 */
export function filterArchiveEntries(
  entries: ArchiveEntry[],
  route: ArchiveRoute | 'all',
  status: ArchiveStatus | 'all',
): ArchiveEntry[] {
  return entries.filter(
    (entry) =>
      (route === 'all' || entry.route === route) &&
      (status === 'all' || entry.status === status),
  )
}

/** 排序：title/updatedAt/score 三字段；direction 决定升/降序（archive-sort）。 */
export function sortArchiveEntries(
  entries: ArchiveEntry[],
  field: ArchiveSortField,
  direction: ArchiveSortDirection,
): ArchiveEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp: number
    if (field === 'score') {
      // score 为空的记录按 -1 参与比较（升序时排最前）
      cmp = (a.score ?? -1) - (b.score ?? -1)
    } else if (field === 'title') {
      cmp = a.title < b.title ? -1 : a.title > b.title ? 1 : 0
    } else {
      cmp = a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0
    }
    return direction === 'asc' ? cmp : -cmp
  })
  return sorted
}

// ── 归档摘要与同步（AC-ARC-005） ──

export interface ArchiveSummary {
  archivedCount: number
  completedEvaluationMean: number | null
}

/** 仅 status=archived 记录计入摘要数字；无自评记录时均值为 null（archive-marked）。 */
export function computeArchiveSummary(entries: ArchiveEntry[]): ArchiveSummary {
  const archived = entries.filter((entry) => entry.status === 'archived')
  const scores = archived
    .map((entry) => entry.score)
    .filter((score): score is number => score !== null)
  const completedEvaluationMean =
    scores.length === 0
      ? null
      : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
  return { archivedCount: archived.length, completedEvaluationMean }
}

export interface ArchiveSession {
  token: string
  username: string
}

export interface SyncDeps {
  getProgress: (token: string) => Promise<ProgressData>
  putProgress: (token: string, progress: ProgressData) => Promise<ProgressData>
}

const defaultSyncDeps: SyncDeps = { getProgress, putProgress }

/** identity-preserving 合并：ProgressData 无扩展字段且服务端 PUT 严格校验，
 *  归档摘要数字仅本地展示，绝不写入 PUT 体（residual-risk 决策）；
 *  三字段保持 GET 原值，仅 PUT 响应刷新 updatedAt。 */
export function mergeArchiveSummaryForSync(
  server: ProgressData,
  _summary: ArchiveSummary,
): ProgressData {
  return {
    firstLessonCompleted: server.firstLessonCompleted,
    evaluationScore: server.evaluationScore,
    weeklyLabCompleted: server.weeklyLabCompleted,
  }
}

export type ArchiveSyncOutcome =
  | { ok: true; updatedAt: string | undefined }
  | { ok: false; reason: 'get-failed' | 'put-failed' }

/** 同步：先 GET 后合并再 PUT；GET 失败不执行 PUT；任何失败均不清空本地记录。 */
export async function syncArchiveProgress(
  token: string,
  summary: ArchiveSummary,
  deps: SyncDeps = defaultSyncDeps,
): Promise<ArchiveSyncOutcome> {
  let server: ProgressData
  try {
    server = await deps.getProgress(token)
  } catch {
    return { ok: false, reason: 'get-failed' }
  }
  const merged = mergeArchiveSummaryForSync(server, summary)
  try {
    const result = await deps.putProgress(token, merged)
    return { ok: true, updatedAt: result.updatedAt }
  } catch {
    return { ok: false, reason: 'put-failed' }
  }
}

// ── 持久化（AC-003）：读写均 try/catch 静默降级 ──

export function isValidArchiveEntry(data: unknown): data is ArchiveEntry {
  if (typeof data !== 'object' || data === null) return false
  const entry = data as ArchiveEntry
  return (
    typeof entry.id === 'string' &&
    entry.id !== '' &&
    typeof entry.title === 'string' &&
    (ARCHIVE_ROUTES as readonly string[]).includes(entry.route) &&
    (ARCHIVE_STATUSES as readonly string[]).includes(entry.status) &&
    (entry.score === null || typeof entry.score === 'number') &&
    typeof entry.note === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string'
  )
}

/** 读取：key 缺失返回 null（从未创建）；解析失败/形状不合法同样返回 null。 */
export function loadArchiveEntries(): ArchiveEntry[] | null {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isValidArchiveEntry)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveArchiveEntries(entries: ArchiveEntry[]): void {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // 存储不可用（隐私模式/配额）：静默失败，仅影响持久化
  }
}

/** 存储可用性探测：不可用（Node/隐私模式/配额）时不抛异常（storage-unavailable）。 */
export function archiveStorageAvailable(): boolean {
  try {
    localStorage.getItem(ARCHIVE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

// ── HTML 转义：用户内容注入前转义 ──

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── UI 初始化（仅浏览器运行时；Node 测试只导入纯函数） ──

let entries: ArchiveEntry[] | null = null
let currentSession: ArchiveSession | null = null
let syncDeps: SyncDeps = defaultSyncDeps
let editingId: string | null = null
let searchQuery = ''
let routeFilter: ArchiveRoute | 'all' = 'all'
let statusFilter: ArchiveStatus | 'all' = 'all'
let sortField: ArchiveSortField = 'updatedAt'
let sortDirection: ArchiveSortDirection = 'desc'

let formSectionEl: HTMLElement | null = null
let formTitleEl: HTMLInputElement | null = null
let formRouteEl: HTMLSelectElement | null = null
let formStatusEl: HTMLSelectElement | null = null
let formScoreEl: HTMLInputElement | null = null
let formNoteEl: HTMLTextAreaElement | null = null
let formErrorEl: HTMLElement | null = null
let formTitleHeadingEl: HTMLElement | null = null
let formSubmitBtn: HTMLButtonElement | null = null
let formCancelBtn: HTMLButtonElement | null = null
let storageErrorEl: HTMLElement | null = null
let searchInputEl: HTMLInputElement | null = null
let listEl: HTMLElement | null = null
let emptyEl: HTMLElement | null = null
let summaryCountEl: HTMLElement | null = null
let summaryMeanEl: HTMLElement | null = null
let syncBtnEl: HTMLButtonElement | null = null
let syncHintEl: HTMLElement | null = null
let syncStatusEl: HTMLElement | null = null
let sortBtns: HTMLButtonElement[] = []
let routeBtns: HTMLButtonElement[] = []
let statusBtns: HTMLButtonElement[] = []

const workbenchMarkup = `
  <div class="archive-workbench" id="archive-workbench">
    <p class="archive-storage-error" id="archive-storage-error" hidden>归档存储不可用：本地记录将不会保存</p>

    <form class="archive-form" id="archive-form" novalidate>
      <h3 class="archive-form__heading" id="archive-form-title">新建实验记录</h3>
      <div class="archive-form__fields">
        <label class="archive-form__field">
          <span>标题（必填）</span>
          <input type="text" id="archive-title-input" name="title" required />
        </label>
        <div class="archive-form__row">
          <label class="archive-form__field">
            <span>路线（必选）</span>
            <select id="archive-route-input" name="route">
              <option value="">请选择路线</option>
              <option value="beginner">入门</option>
              <option value="builder">构建</option>
              <option value="advanced">进阶</option>
            </select>
          </label>
          <label class="archive-form__field">
            <span>状态</span>
            <select id="archive-status-input" name="status">
              <option value="planned">planned</option>
              <option value="running">running</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>
        <label class="archive-form__field">
          <span>自评（0–10 整数，可空）</span>
          <input type="number" id="archive-score-input" min="0" max="10" step="1" placeholder="0–10" />
        </label>
        <label class="archive-form__field">
          <span>备注</span>
          <textarea id="archive-note-input" rows="3" spellcheck="false"></textarea>
        </label>
      </div>
      <p class="archive-form__error" id="archive-form-error" hidden></p>
      <div class="archive-form__actions">
        <button type="submit" class="btn btn--primary" id="archive-form-submit">保存记录</button>
        <button type="button" class="btn btn--secondary" id="archive-form-cancel" hidden>取消编辑</button>
      </div>
    </form>

    <section class="archive-card archive-summary" aria-labelledby="archive-summary-title">
      <h3 class="archive-card__title" id="archive-summary-title">归档摘要</h3>
      <dl class="archive-summary__list">
        <div class="archive-summary__item"><dt>归档实验数</dt><dd id="archive-summary-count">0</dd></div>
        <div class="archive-summary__item"><dt>已完成自评均值</dt><dd id="archive-summary-mean">—</dd></div>
      </dl>
    </section>

    <label class="archive-search">
      <span>搜索实验记录</span>
      <input type="search" id="archive-search-input" placeholder="按标题或备注搜索" />
    </label>

    <div class="archive-filters">
      <div class="archive-filter" role="group" aria-label="按路线筛选">
        <span class="archive-filter__label">路线</span>
        <button type="button" class="archive-filter__btn" data-route="all" aria-pressed="true">全部</button>
        <button type="button" class="archive-filter__btn" data-route="beginner" aria-pressed="false">入门</button>
        <button type="button" class="archive-filter__btn" data-route="builder" aria-pressed="false">构建</button>
        <button type="button" class="archive-filter__btn" data-route="advanced" aria-pressed="false">进阶</button>
      </div>
      <div class="archive-filter" role="group" aria-label="按状态筛选">
        <span class="archive-filter__label">状态</span>
        <button type="button" class="archive-filter__btn" data-status="all" aria-pressed="true">全部</button>
        <button type="button" class="archive-filter__btn" data-status="planned" aria-pressed="false">planned</button>
        <button type="button" class="archive-filter__btn" data-status="running" aria-pressed="false">running</button>
        <button type="button" class="archive-filter__btn" data-status="archived" aria-pressed="false">archived</button>
      </div>
    </div>

    <div class="archive-toolbar" role="group" aria-label="排序">
      <span class="archive-toolbar__label">排序</span>
      <button type="button" class="archive-toolbar__btn" data-sort="updatedAt" aria-pressed="true">更新时间</button>
      <button type="button" class="archive-toolbar__btn" data-sort="title" aria-pressed="false">标题</button>
      <button type="button" class="archive-toolbar__btn" data-sort="score" aria-pressed="false">评分</button>
    </div>

    <ul class="archive-list" id="archive-list"></ul>
    <p class="archive-list__empty" id="archive-empty" hidden></p>

    <section class="archive-card archive-sync" aria-labelledby="archive-sync-title">
      <h3 class="archive-card__title" id="archive-sync-title">同步摘要到进度</h3>
      <p class="archive-sync__hint" id="archive-sync-hint">登录后同步</p>
      <button type="button" class="btn btn--primary" id="archive-sync-btn" disabled>同步摘要到进度</button>
      <p class="archive-sync__status" id="archive-sync-status" aria-live="polite"></p>
    </section>
  </div>
`

function archiveCardMarkup(entry: ArchiveEntry): string {
  const scoreText = entry.score === null ? '未自评' : `${entry.score}/10`
  const statusClass = entry.status === 'archived' ? ' is-archived' : ''
  const noteText = entry.note === '' ? '无备注' : escapeHtml(entry.note)
  return `
    <li class="archive-card" data-id="${entry.id}">
      <div class="archive-card__head">
        <strong class="archive-card__title">${escapeHtml(entry.title)}</strong>
        <span class="archive-card__route">${ARCHIVE_ROUTE_LABELS[entry.route]}</span>
        <span class="archive-card__status${statusClass}">${entry.status}</span>
      </div>
      <p class="archive-card__meta">更新：${new Date(entry.updatedAt).toLocaleString()} · 自评：${scoreText} · 备注：${noteText}</p>
      <div class="archive-card__actions">
        <button type="button" class="btn btn--secondary" data-action="edit" data-id="${entry.id}">编辑</button>
        <button type="button" class="btn btn--secondary" data-action="mark-archived" data-id="${entry.id}">标记为已归档</button>
        <button type="button" class="btn btn--secondary" data-action="delete" data-id="${entry.id}">删除</button>
      </div>
    </li>`
}

function renderSummary(): void {
  if (!summaryCountEl || !summaryMeanEl) return
  const summary = computeArchiveSummary(entries ?? [])
  summaryCountEl.textContent = String(summary.archivedCount)
  summaryMeanEl.textContent =
    summary.completedEvaluationMean === null ? '—' : String(summary.completedEvaluationMean)
}

function renderSyncUi(): void {
  const loggedIn = currentSession !== null
  if (syncBtnEl) syncBtnEl.disabled = !loggedIn
  if (syncHintEl) syncHintEl.hidden = loggedIn
}

function renderToolbars(): void {
  sortBtns.forEach((btn) => {
    const field = btn.dataset.sort as ArchiveSortField
    const pressed = field === sortField
    btn.setAttribute('aria-pressed', String(pressed))
    const label = field === 'title' ? '标题' : field === 'score' ? '评分' : '更新时间'
    btn.textContent = pressed ? `${label} ${sortDirection === 'asc' ? '↑' : '↓'}` : label
  })
  routeBtns.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.route === routeFilter))
  })
  statusBtns.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.status === statusFilter))
  })
}

function renderList(): void {
  if (!listEl || !emptyEl) return
  if (entries === null || entries.length === 0) {
    // 从未创建记录（storage-unavailable 时由 storageErrorEl 另行提示）
    emptyEl.textContent = '还没有实验记录'
    emptyEl.hidden = false
    listEl.innerHTML = ''
    return
  }
  const visible = sortArchiveEntries(
    searchArchiveEntries(
      filterArchiveEntries(entries, routeFilter, statusFilter),
      searchQuery,
    ),
    sortField,
    sortDirection,
  )
  if (visible.length === 0) {
    emptyEl.textContent = '没有匹配的实验记录'
    emptyEl.hidden = false
    listEl.innerHTML = ''
    return
  }
  emptyEl.hidden = true
  listEl.innerHTML = visible.map(archiveCardMarkup).join('')
}

function renderArchive(): void {
  renderToolbars()
  renderList()
  renderSummary()
  renderSyncUi()
}

function generateArchiveId(): string {
  return `archive-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function persistArchive(): void {
  if (entries !== null) saveArchiveEntries(entries)
  renderSummary()
}

function resetArchiveForm(): void {
  editingId = null
  if (formTitleEl) formTitleEl.value = ''
  if (formRouteEl) formRouteEl.value = ''
  if (formStatusEl) formStatusEl.value = 'planned'
  if (formScoreEl) formScoreEl.value = ''
  if (formNoteEl) formNoteEl.value = ''
  if (formErrorEl) {
    formErrorEl.hidden = true
    formErrorEl.textContent = ''
  }
  if (formTitleHeadingEl) formTitleHeadingEl.textContent = '新建实验记录'
  if (formSubmitBtn) formSubmitBtn.textContent = '保存记录'
  if (formCancelBtn) formCancelBtn.hidden = true
}

function handleArchiveSubmit(event: Event): void {
  event.preventDefault()
  if (!formTitleEl || !formRouteEl || !formScoreEl || !formNoteEl || !formErrorEl) return
  const validation = validateArchiveEntry({
    title: formTitleEl.value,
    route: formRouteEl.value,
    score: formScoreEl.value,
  })
  if (!validation.valid) {
    formErrorEl.textContent = validation.errors.join('；')
    formErrorEl.hidden = false
    return
  }
  formErrorEl.hidden = true
  const now = new Date().toISOString()
  const scoreResult = validateArchiveScore(formScoreEl.value)
  if (editingId !== null && entries !== null) {
    const existing = entries.find((entry) => entry.id === editingId)
    if (existing) {
      existing.title = formTitleEl.value.trim()
      existing.route = formRouteEl.value as ArchiveRoute
      if (formStatusEl) existing.status = formStatusEl.value as ArchiveStatus
      existing.score = scoreResult.value
      existing.note = formNoteEl.value.trim()
      existing.updatedAt = now
    }
  } else {
    if (entries === null) entries = []
    entries.push({
      id: generateArchiveId(),
      title: formTitleEl.value.trim(),
      route: formRouteEl.value as ArchiveRoute,
      status: formStatusEl ? (formStatusEl.value as ArchiveStatus) : 'planned',
      score: scoreResult.value,
      note: formNoteEl.value.trim(),
      createdAt: now,
      updatedAt: now,
    })
  }
  editingId = null
  persistArchive()
  resetArchiveForm()
  renderList()
}

function handleArchiveListClick(event: Event): void {
  if (entries === null || listEl === null) return
  const target = event.target as HTMLElement
  const btn = target.closest<HTMLButtonElement>('button[data-action]')
  if (!btn) return
  const id = btn.dataset.id
  const action = btn.dataset.action
  if (!id || !action) return
  const entry = entries.find((item) => item.id === id)
  if (!entry) return
  if (action === 'edit') {
    // 复用同一表单并预填该记录字段（archive-edit-open）
    editingId = id
    if (formTitleEl) formTitleEl.value = entry.title
    if (formRouteEl) formRouteEl.value = entry.route
    if (formStatusEl) formStatusEl.value = entry.status
    if (formScoreEl) formScoreEl.value = entry.score === null ? '' : String(entry.score)
    if (formNoteEl) formNoteEl.value = entry.note
    if (formErrorEl) {
      formErrorEl.hidden = true
      formErrorEl.textContent = ''
    }
    if (formTitleHeadingEl) formTitleHeadingEl.textContent = '编辑实验记录'
    if (formSubmitBtn) formSubmitBtn.textContent = '保存修改'
    if (formCancelBtn) formCancelBtn.hidden = false
    formSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    return
  }
  if (action === 'mark-archived') {
    entry.status = 'archived'
    entry.updatedAt = new Date().toISOString()
    persistArchive()
    renderList()
    return
  }
  if (action === 'delete') {
    if (!window.confirm('确定删除该实验记录？')) return
    entries = entries.filter((item) => item.id !== id)
    if (editingId === id) resetArchiveForm()
    persistArchive()
    renderList()
  }
}

async function handleArchiveSync(): Promise<void> {
  if (!syncStatusEl) return
  if (!currentSession) {
    syncStatusEl.textContent = '登录后同步'
    return
  }
  syncStatusEl.textContent = '同步中…'
  const outcome = await syncArchiveProgress(
    currentSession.token,
    computeArchiveSummary(entries ?? []),
    syncDeps,
  )
  if (outcome.ok) {
    syncStatusEl.textContent = outcome.updatedAt
      ? `已同步：${new Date(outcome.updatedAt).toLocaleString()}`
      : '已同步'
  } else if (outcome.reason === 'get-failed') {
    syncStatusEl.textContent = '同步失败：无法读取服务端进度'
  } else {
    syncStatusEl.textContent = '同步失败：提交进度失败，已保留本地记录'
  }
}

/** 登录态联动：登录启用同步按钮，退出禁用（sync-logged-out）。 */
export function setArchiveSession(session: ArchiveSession | null): void {
  currentSession = session
  if (syncStatusEl) syncStatusEl.textContent = ''
  renderSyncUi()
}

export function initArchiveWorkbench(
  mount: HTMLElement,
  deps: SyncDeps = defaultSyncDeps,
): void {
  syncDeps = deps
  mount.innerHTML = workbenchMarkup

  formSectionEl = document.querySelector('.archive-form')
  formTitleEl = document.getElementById('archive-title-input') as HTMLInputElement | null
  formRouteEl = document.getElementById('archive-route-input') as HTMLSelectElement | null
  formStatusEl = document.getElementById('archive-status-input') as HTMLSelectElement | null
  formScoreEl = document.getElementById('archive-score-input') as HTMLInputElement | null
  formNoteEl = document.getElementById('archive-note-input') as HTMLTextAreaElement | null
  formErrorEl = document.getElementById('archive-form-error')
  formTitleHeadingEl = document.getElementById('archive-form-title')
  formSubmitBtn = document.getElementById('archive-form-submit') as HTMLButtonElement | null
  formCancelBtn = document.getElementById('archive-form-cancel') as HTMLButtonElement | null
  storageErrorEl = document.getElementById('archive-storage-error')
  searchInputEl = document.getElementById('archive-search-input') as HTMLInputElement | null
  listEl = document.getElementById('archive-list')
  emptyEl = document.getElementById('archive-empty')
  summaryCountEl = document.getElementById('archive-summary-count')
  summaryMeanEl = document.getElementById('archive-summary-mean')
  syncBtnEl = document.getElementById('archive-sync-btn') as HTMLButtonElement | null
  syncHintEl = document.getElementById('archive-sync-hint')
  syncStatusEl = document.getElementById('archive-sync-status')
  sortBtns = Array.from(mount.querySelectorAll<HTMLButtonElement>('.archive-toolbar__btn'))
  routeBtns = Array.from(mount.querySelectorAll<HTMLButtonElement>('.archive-filter__btn[data-route]'))
  statusBtns = Array.from(mount.querySelectorAll<HTMLButtonElement>('.archive-filter__btn[data-status]'))

  // 恢复记录：存储不可用或从未创建时 entries 为 null，不抛异常（storage-unavailable）
  const storageOk = archiveStorageAvailable()
  entries = storageOk ? loadArchiveEntries() : null
  if (storageErrorEl) storageErrorEl.hidden = storageOk
  const formControlsDisabled = !storageOk
  ;[formTitleEl, formRouteEl, formStatusEl, formScoreEl, formNoteEl, searchInputEl].forEach(
    (el) => {
      if (el) el.disabled = formControlsDisabled
    },
  )
  if (formSubmitBtn) formSubmitBtn.disabled = formControlsDisabled

  document
    .getElementById('archive-create-btn')
    ?.addEventListener('click', () => {
      resetArchiveForm()
      formSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

  formCancelBtn?.addEventListener('click', () => resetArchiveForm())

  document
    .querySelector<HTMLFormElement>('#archive-form')
    ?.addEventListener('submit', (event) => handleArchiveSubmit(event))

  listEl?.addEventListener('click', (event) => handleArchiveListClick(event))

  searchInputEl?.addEventListener('input', () => {
    searchQuery = searchInputEl?.value ?? ''
    renderList()
  })

  sortBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort as ArchiveSortField
      if (field === sortField) {
        // 同字段再次点击切换升/降序
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        // 不同字段默认升序
        sortField = field
        sortDirection = 'asc'
      }
      renderToolbars()
      renderList()
    })
  })

  routeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      routeFilter = btn.dataset.route as ArchiveRoute | 'all'
      renderToolbars()
      renderList()
    })
  })

  statusBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      statusFilter = btn.dataset.status as ArchiveStatus | 'all'
      renderToolbars()
      renderList()
    })
  })

  syncBtnEl?.addEventListener('click', () => {
    void handleArchiveSync()
  })

  renderArchive()
}
