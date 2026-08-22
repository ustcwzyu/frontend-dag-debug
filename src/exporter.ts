// 学习实验导出中心（src/exporter.ts）— 把本地学习数据汇总为可配置的文本/JSON 导出产物。
//
// 功能（AC-003 / AC-EXP-003~006 / AC-004 / AC-005）：
// - 字段选择：11 项稳定序字段（标题/来源/步骤计数/模板计数/自评/实验标题/实验路线/
//   实验状态/实验评分/备注/导出时间），aria-pressed 切换按钮 + 全选/全不选；
//   空集时「生成导出」disabled 并提示「请至少选择一项导出字段」；
// - 格式选择 text/json，预览实时重算：text 人类可读（标题行+分隔线），
//   json 为 JSON.stringify(value, null, 2)，均来自同一 serializeExport 纯函数；
// - 序列化纯函数内无 Date.now/随机数：exportedAt 由调用侧注入 ISO 字符串，
//   字段顺序固定（EXPORT_FIELD_LABELS 稳定序），null 数据占位「—」；
// - 导出历史（localStorage，key=frontend-dag-debug:export-history，上限 10 条最旧丢弃）：
//   recordExportHistory/loadExportHistory/exportStorageAvailable 读写均 try/catch 静默降级，
//   不可用时历史区显示「导出存储不可用」且不抛未捕获异常（沿用 archive 降级模式）；
// - 复制到剪贴板 navigator.clipboard.writeText try/catch：成功「已复制」、失败「复制失败」；
//   下载 Blob + URL.createObjectURL → learning-export-<timestamp>.txt|.json，
//   objectURL 不可用时降级提示「下载不可用：请使用复制」；
// - 进度摘要区：未登录显示「登录后同步导出」且零网络请求（collectExportData 的注入
//   getProgress 在 session 为 null 时绝不调用）；登录后经 getProgress → /api/v1/progress
//   展示第一课完成/自评/本周实验/最近保存与会话时长，读取失败静默降级（缺省展示、页面不崩）；
//   token 绝不进入导出产物与历史记录。
//
// 隔离性：全部使用 export-* 类名与独立存储 key（frontend-dag-debug:export-history），
// 不触碰 :journal/:archive/:auth/:tasks key。网络调用收敛于 src/api.ts getProgress，
// 存储调用收敛于本模块（main.ts 零 fetch/localStorage 字面量），
// 真实请求路径保持默认，测试通过注入依赖覆盖未登录零请求语义。
import { getProgress } from './api.ts'
import type { ProgressData } from './types.ts'
import {
  countCompletedTemplates,
  countSteps,
  currentElapsedSeconds,
  formatDuration,
  loadJournalDraft,
  validateScore,
} from './journal.ts'
import type { JournalDraft } from './journal.ts'
import { escapeHtml, loadArchiveEntries } from './archive.ts'
import type { ArchiveEntry } from './archive.ts'

export const EXPORT_HISTORY_KEY = 'frontend-dag-debug:export-history'
export const EXPORT_HISTORY_LIMIT = 10

export type ExportFormat = 'text' | 'json'

export type ExportFieldKey =
  | 'title'
  | 'source'
  | 'stepsCount'
  | 'templatesCount'
  | 'selfScore'
  | 'entryTitle'
  | 'entryRoute'
  | 'entryStatus'
  | 'entryScore'
  | 'entryNote'
  | 'exportedAt'

/** 11 项字段稳定序：序列化输出按此顺序（AC-003 / AC-EXP-003）。 */
export const EXPORT_FIELD_LABELS: readonly [ExportFieldKey, string][] = [
  ['title', '标题'],
  ['source', '来源'],
  ['stepsCount', '步骤计数'],
  ['templatesCount', '模板计数'],
  ['selfScore', '自评'],
  ['entryTitle', '实验标题'],
  ['entryRoute', '实验路线'],
  ['entryStatus', '实验状态'],
  ['entryScore', '实验评分'],
  ['entryNote', '备注'],
  ['exportedAt', '导出时间'],
]

const EXPORT_FIELD_LABEL_MAP: Record<string, string> = Object.fromEntries(
  EXPORT_FIELD_LABELS.map(([key, label]) => [key, label]),
)

const EXPORT_TEXT_TITLE = '学习实验导出'
const EXPORT_TEXT_SEPARATOR = '----------------'
const EXPORT_ROUTE_LABELS: Record<string, string> = {
  beginner: '入门',
  builder: '构建',
  advanced: '进阶',
}

// ── 校验（export-fields-empty） ──

export interface ExportFieldsValidation {
  valid: boolean
  message: string
}

/** 字段校验：空集 invalid + 精确提示（AC-EXP-003 / export-fields-empty）。 */
export function validateExportFields(
  selected: readonly ExportFieldKey[],
): ExportFieldsValidation {
  if (selected.length === 0) {
    return { valid: false, message: '请至少选择一项导出字段' }
  }
  return { valid: true, message: '' }
}

// ── 摘要构建（buildExportSummary，纯函数：无 Date.now/随机数） ──

export interface ExportData {
  title: string
  source: string
  stepsCount: number | null
  templatesCount: number | null
  selfScore: number | null
  entryTitle: string | null
  entryRoute: string | null
  entryStatus: string | null
  entryScore: number | null
  entryNote: string | null
}

export interface ProgressSummary {
  firstLessonCompleted: boolean | null
  evaluationScore: number | null
  weeklyLabCompleted: boolean | null
  updatedAt: string | null
}

export interface ExportSummary {
  data: ExportData
  /** journal 会话时长展示值（不参与序列化），formatDuration 输出。 */
  duration: string
  /** 服务端进度摘要（登录且读取成功时非空；仅展示，不参与序列化）。 */
  progress: ProgressSummary | null
}

/** 归档记录取最近 updatedAt 的一条参与汇总。 */
function pickLatestEntry(entries: ArchiveEntry[] | null): ArchiveEntry | null {
  if (entries === null || entries.length === 0) return null
  const sorted = [...entries].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  )
  return sorted[0] ?? null
}

function describeSource(
  draft: JournalDraft | null,
  entries: ArchiveEntry[] | null,
): string {
  const parts: string[] = []
  if (draft !== null) parts.push('工作台草稿')
  if (entries !== null && entries.length > 0) parts.push('归档记录')
  return parts.length > 0 ? parts.join(' + ') : '无本地数据'
}

function summarizeProgress(progress: ProgressData): ProgressSummary {
  return {
    firstLessonCompleted: progress.firstLessonCompleted,
    evaluationScore: progress.evaluationScore,
    weeklyLabCompleted: progress.weeklyLabCompleted,
    updatedAt: progress.updatedAt ?? null,
  }
}

/** 汇总 journal 草稿（countSteps/countCompletedTemplates/validateScore/formatDuration）、
 *  archive 归档记录与进度摘要；null 数据占位处理；纯函数（now 由调用侧注入）。 */
export function buildExportSummary(
  draft: JournalDraft | null,
  entries: ArchiveEntry[] | null,
  progress: ProgressData | null,
  now: number,
): ExportSummary {
  const latest = pickLatestEntry(entries)
  const scoreResult = validateScore(
    draft === null || draft.score === null ? '' : String(draft.score),
  )
  const duration =
    draft === null ? '—' : formatDuration(currentElapsedSeconds(draft, now))
  return {
    data: {
      title: EXPORT_TEXT_TITLE,
      source: describeSource(draft, entries),
      stepsCount: draft === null ? null : countSteps(draft),
      templatesCount: draft === null ? null : countCompletedTemplates(draft),
      selfScore: scoreResult.valid ? scoreResult.value : null,
      entryTitle: latest === null ? null : latest.title,
      entryRoute: latest === null ? null : latest.route,
      entryStatus: latest === null ? null : latest.status,
      entryScore: latest === null ? null : latest.score,
      entryNote: latest === null ? null : latest.note,
    },
    duration,
    progress: progress === null ? null : summarizeProgress(progress),
  }
}

// ── 序列化（serializeExport，纯函数：无 Date.now/随机数） ──

function formatExportValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function displayFieldValue(fieldKey: string, raw: unknown): string {
  if (fieldKey === 'entryRoute' && typeof raw === 'string') {
    return EXPORT_ROUTE_LABELS[raw] ?? raw
  }
  return formatExportValue(raw)
}

/** text 人类可读（标题行+分隔线）；json 为 JSON.stringify(value, null, 2）。
 *  仅序列化选中字段，字段顺序与 EXPORT_FIELD_LABELS 一致；
 *  exportedAt 由调用侧注入 ISO 字符串，本函数内无 Date.now/随机数。 */
export function serializeExport(
  data: ExportData,
  selectedFields: readonly ExportFieldKey[],
  format: ExportFormat,
  exportedAt: string,
): string {
  const value: Record<string, unknown> = {}
  for (const [fieldKey] of EXPORT_FIELD_LABELS) {
    if (!selectedFields.includes(fieldKey)) continue
    if (fieldKey === 'exportedAt') {
      value.exportedAt = exportedAt
    } else if (fieldKey in data) {
      value[fieldKey] = data[fieldKey]
    }
  }
  if (format === 'json') {
    return JSON.stringify(value, null, 2)
  }
  const lines = Object.entries(value).map(([fieldKey, raw]) => {
    const label = EXPORT_FIELD_LABEL_MAP[fieldKey] ?? fieldKey
    return `${label}：${displayFieldValue(fieldKey, raw)}`
  })
  return `${EXPORT_TEXT_TITLE}\n${EXPORT_TEXT_SEPARATOR}\n${lines.join('\n')}`
}

// ── 持久化（AC-EXP-004）：读写均 try/catch 静默降级 ──

export interface ExportHistoryEntry {
  id: string
  format: ExportFormat
  fieldCount: number
  exportedAt: string
}

export function isValidExportHistoryEntry(data: unknown): data is ExportHistoryEntry {
  if (typeof data !== 'object' || data === null) return false
  const entry = data as ExportHistoryEntry
  return (
    typeof entry.id === 'string' &&
    entry.id !== '' &&
    (entry.format === 'text' || entry.format === 'json') &&
    typeof entry.fieldCount === 'number' &&
    typeof entry.exportedAt === 'string'
  )
}

/** 读取：key 缺失返回 null（从未导出）；解析失败/形状不合法同样返回 null。 */
export function loadExportHistory(): ExportHistoryEntry[] | null {
  try {
    const raw = localStorage.getItem(EXPORT_HISTORY_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isValidExportHistoryEntry)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveExportHistory(entries: ExportHistoryEntry[]): void {
  try {
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // 存储不可用（隐私模式/配额）：静默失败，仅影响持久化
  }
}

/** 记录一条导出历史（新记录在前）：上限 EXPORT_HISTORY_LIMIT 条、最旧丢弃；
 *  id 由调用侧生成（本函数无 Date.now/随机数）；返回新历史列表，存储不可用时
 *  load/save 内部已静默降级，仍返回计算后的列表（仅本次会话可见）。 */
export function recordExportHistory(entry: ExportHistoryEntry): ExportHistoryEntry[] {
  const history = loadExportHistory() ?? []
  const next = [entry, ...history].slice(0, EXPORT_HISTORY_LIMIT)
  saveExportHistory(next)
  return next
}

/** 存储可用性探测：不可用（Node/隐私模式/配额）时不抛异常（storage-unavailable）。 */
export function exportStorageAvailable(): boolean {
  try {
    localStorage.getItem(EXPORT_HISTORY_KEY)
    return true
  } catch {
    return false
  }
}

// ── 数据收集（AC-EXP-005）：session 为 null 时绝不调用注入的 getProgress ──

export interface ExportSession {
  token: string
  username: string
}

export interface CollectExportDeps {
  getProgress: (token: string) => Promise<ProgressData>
  loadJournalDraft: () => JournalDraft | null
  loadArchiveEntries: () => ArchiveEntry[] | null
}

const defaultExportDeps: CollectExportDeps = {
  getProgress,
  loadJournalDraft,
  loadArchiveEntries,
}

/** 汇总本地数据 + 登录态进度摘要；未登录（session 为 null）时进度摘要为 null
 *  且 getProgress 零调用（零网络请求，Node 测试以 spy 断言）。 */
export async function collectExportData(
  deps: CollectExportDeps = defaultExportDeps,
): Promise<ExportSummary> {
  const draft = deps.loadJournalDraft()
  const entries = deps.loadArchiveEntries()
  let progress: ProgressData | null = null
  if (currentExportSession !== null) {
    try {
      progress = await deps.getProgress(currentExportSession.token)
    } catch {
      progress = null
    }
  }
  return buildExportSummary(draft, entries, progress, Date.now())
}

// ── UI 初始化（仅浏览器运行时；Node 测试只导入纯函数） ──

let currentExportSession: ExportSession | null = null
let exportDeps: CollectExportDeps = defaultExportDeps
let currentSummary: ExportSummary = buildExportSummary(null, null, null, 0)
let currentData: ExportData = currentSummary.data
let selectedFields: ExportFieldKey[] = EXPORT_FIELD_LABELS.map(([key]) => key)
let currentFormat: ExportFormat = 'text'
let currentHistory: ExportHistoryEntry[] | null = null
let storageOk = false

let generateBtnEl: HTMLButtonElement | null = null
let selectAllBtn: HTMLButtonElement | null = null
let selectNoneBtn: HTMLButtonElement | null = null
let formatSelectEl: HTMLSelectElement | null = null
let copyBtnEl: HTMLButtonElement | null = null
let downloadBtnEl: HTMLButtonElement | null = null
let statusEl: HTMLElement | null = null
let storageErrorEl: HTMLElement | null = null
let previewEl: HTMLElement | null = null
let historyListEl: HTMLElement | null = null
let historyEmptyEl: HTMLElement | null = null
let progressHintEl: HTMLElement | null = null
let progressListEl: HTMLElement | null = null
let progressStatusEl: HTMLElement | null = null
let progressLessonEl: HTMLElement | null = null
let progressScoreEl: HTMLElement | null = null
let progressLabEl: HTMLElement | null = null
let progressSavedEl: HTMLElement | null = null
let progressDurationEl: HTMLElement | null = null
let fieldBtns: HTMLButtonElement[] = []

const workbenchMarkup = `
  <div class="export-workbench" id="export-workbench">
    <p class="export-error" id="export-storage-error" hidden>导出存储不可用：导出历史将不会保存</p>

    <section class="export-card export-sync" aria-labelledby="export-progress-title">
      <h3 class="export-card__title" id="export-progress-title">进度摘要</h3>
      <p class="export-sync__hint" id="export-progress-hint">登录后同步导出</p>
      <dl class="export-sync__list" id="export-progress-list" hidden>
        <div class="export-sync__item"><dt>第一课完成</dt><dd id="export-progress-lesson">—</dd></div>
        <div class="export-sync__item"><dt>自评</dt><dd id="export-progress-score">—</dd></div>
        <div class="export-sync__item"><dt>本周实验</dt><dd id="export-progress-lab">—</dd></div>
        <div class="export-sync__item"><dt>最近保存</dt><dd id="export-progress-saved">—</dd></div>
        <div class="export-sync__item"><dt>会话时长</dt><dd id="export-progress-duration">—</dd></div>
      </dl>
      <p class="export-sync__status" id="export-progress-status" aria-live="polite"></p>
    </section>

    <section class="export-card export-form" aria-labelledby="export-fields-title">
      <h3 class="export-card__title" id="export-fields-title">导出字段</h3>
      <p class="export-form__hint">选择要纳入导出的字段（至少一项）。</p>
      <div class="export-toolbar" role="group" aria-label="字段批量选择">
        <button type="button" class="export-toolbar__btn" id="export-select-all" aria-pressed="true">全选</button>
        <button type="button" class="export-toolbar__btn" id="export-select-none" aria-pressed="false">全不选</button>
      </div>
      <div class="export-filter" id="export-field-list" role="group" aria-label="导出字段选择"></div>
      <label class="export-form__field">
        <span>导出格式</span>
        <select id="export-format-select">
          <option value="text">文本（text）</option>
          <option value="json">JSON</option>
        </select>
      </label>
    </section>

    <section class="export-card export-preview" aria-labelledby="export-preview-title">
      <h3 class="export-card__title" id="export-preview-title">序列化预览</h3>
      <pre class="export-preview__code" id="export-preview"></pre>
    </section>

    <div class="export-toolbar export-actions" role="group" aria-label="导出操作">
      <button type="button" class="btn btn--secondary" id="export-copy-btn" disabled>复制到剪贴板</button>
      <button type="button" class="btn btn--secondary" id="export-download-btn" disabled>下载文件</button>
    </div>
    <p class="export-status" id="export-status" aria-live="polite"></p>

    <section class="export-card export-history" aria-labelledby="export-history-title">
      <h3 class="export-card__title" id="export-history-title">导出历史</h3>
      <p class="export-list__empty" id="export-history-empty" hidden>还没有导出记录</p>
      <ul class="export-list" id="export-list"></ul>
    </section>
  </div>
`

function historyCardMarkup(entry: ExportHistoryEntry): string {
  const formatLabel = entry.format === 'json' ? 'JSON' : '文本'
  const timeText = new Date(entry.exportedAt).toLocaleString()
  return `
    <li class="export-card export-history__card" data-id="${escapeHtml(entry.id)}">
      <div class="export-card__head">
        <strong class="export-card__title">${formatLabel}导出</strong>
        <span class="export-card__badge">${entry.fieldCount} 项字段</span>
      </div>
      <p class="export-card__meta">导出时间：${escapeHtml(timeText)}</p>
    </li>`
}

function setStatus(message: string): void {
  if (statusEl) statusEl.textContent = message
}

function renderFields(): void {
  fieldBtns.forEach((btn) => {
    const field = btn.dataset.field as ExportFieldKey
    btn.setAttribute('aria-pressed', String(selectedFields.includes(field)))
  })
  if (selectAllBtn) {
    selectAllBtn.setAttribute(
      'aria-pressed',
      String(selectedFields.length === EXPORT_FIELD_LABELS.length),
    )
  }
  if (selectNoneBtn) {
    selectNoneBtn.setAttribute('aria-pressed', String(selectedFields.length === 0))
  }
}

function updateControls(): void {
  const enabled = validateExportFields(selectedFields).valid
  if (generateBtnEl) generateBtnEl.disabled = !enabled
  if (copyBtnEl) copyBtnEl.disabled = !enabled
  if (downloadBtnEl) downloadBtnEl.disabled = !enabled
}

function currentSerialization(): string {
  return serializeExport(currentData, selectedFields, currentFormat, new Date().toISOString())
}

function renderPreview(): void {
  if (!previewEl) return
  const validation = validateExportFields(selectedFields)
  if (!validation.valid) {
    previewEl.textContent = validation.message
    return
  }
  previewEl.textContent = currentSerialization()
}

function renderHistory(): void {
  if (!historyListEl || !historyEmptyEl) return
  if (!storageOk) {
    historyEmptyEl.textContent = '导出存储不可用'
    historyEmptyEl.hidden = false
    historyListEl.innerHTML = ''
    return
  }
  const history = currentHistory
  if (history === null || history.length === 0) {
    historyEmptyEl.textContent = '还没有导出记录'
    historyEmptyEl.hidden = false
    historyListEl.innerHTML = ''
    return
  }
  historyEmptyEl.hidden = true
  historyListEl.innerHTML = history.map(historyCardMarkup).join('')
}

function renderProgressValues(progress: ProgressSummary): void {
  if (progressLessonEl) {
    progressLessonEl.textContent = progress.firstLessonCompleted ? '是' : '否'
  }
  if (progressScoreEl) {
    progressScoreEl.textContent =
      progress.evaluationScore === null ? '未自评' : String(progress.evaluationScore)
  }
  if (progressLabEl) {
    progressLabEl.textContent = progress.weeklyLabCompleted ? '是' : '否'
  }
  if (progressSavedEl) {
    progressSavedEl.textContent = progress.updatedAt
      ? new Date(progress.updatedAt).toLocaleString()
      : '—'
  }
  if (progressDurationEl) {
    progressDurationEl.textContent = currentSummary.duration
  }
}

async function refreshProgressSummary(): Promise<void> {
  if (!progressStatusEl) return
  const loggedIn = currentExportSession !== null
  if (progressHintEl) progressHintEl.hidden = loggedIn
  if (progressListEl) progressListEl.hidden = !loggedIn
  if (loggedIn) progressStatusEl.textContent = '读取进度摘要中…'
  const summary = await collectExportData(exportDeps)
  currentSummary = summary
  currentData = summary.data
  if (loggedIn) {
    if (summary.progress === null) {
      progressStatusEl.textContent = '进度摘要读取失败'
    } else {
      renderProgressValues(summary.progress)
      progressStatusEl.textContent = ''
    }
  }
  renderPreview()
}

function generateExportId(): string {
  return `export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function handleGenerate(): void {
  const validation = validateExportFields(selectedFields)
  if (!validation.valid) {
    setStatus(validation.message)
    return
  }
  const exportedAt = new Date().toISOString()
  // 产物即预览展示的 serializeExport 输出（同输入同输出、exportedAt 注入）
  currentHistory = recordExportHistory({
    id: generateExportId(),
    format: currentFormat,
    fieldCount: selectedFields.length,
    exportedAt,
  })
  renderHistory()
  setStatus('已生成导出')
}

function handleSelectAll(): void {
  selectedFields = EXPORT_FIELD_LABELS.map(([key]) => key)
  renderFields()
  renderPreview()
  updateControls()
}

function handleSelectNone(): void {
  selectedFields = []
  renderFields()
  renderPreview()
  updateControls()
}

function handleFieldToggle(field: ExportFieldKey): void {
  if (selectedFields.includes(field)) {
    selectedFields = selectedFields.filter((key) => key !== field)
  } else {
    selectedFields = [...selectedFields, field]
  }
  renderFields()
  renderPreview()
  updateControls()
}

function handleFormatChange(): void {
  if (!formatSelectEl) return
  currentFormat = formatSelectEl.value === 'json' ? 'json' : 'text'
  renderPreview()
}

function handleCopy(): void {
  try {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.clipboard === 'undefined' ||
      typeof navigator.clipboard.writeText !== 'function'
    ) {
      setStatus('复制失败')
      return
    }
    const serialized = currentSerialization()
    navigator.clipboard.writeText(serialized).then(
      () => setStatus('已复制'),
      () => setStatus('复制失败'),
    )
  } catch {
    setStatus('复制失败')
  }
}

function handleDownload(): void {
  try {
    if (
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function' ||
      typeof Blob === 'undefined'
    ) {
      setStatus('下载不可用：请使用复制')
      return
    }
    const serialized = currentSerialization()
    const timestamp = Date.now().toString()
    const filename = `learning-export-${timestamp}.${currentFormat === 'json' ? 'json' : 'txt'}`
    const blob = new Blob([serialized], {
      type: currentFormat === 'json' ? 'application/json' : 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('已开始下载')
  } catch {
    setStatus('下载不可用：请使用复制')
  }
}

/** 登录态联动：登录/退出同步 exporter 会话（auth-transition / AC-EXP-005）。 */
export function setExportSession(session: ExportSession | null): void {
  currentExportSession = session
  if (progressStatusEl) progressStatusEl.textContent = ''
}

export function initExportCenter(
  mount: HTMLElement,
  session: ExportSession | null,
  deps: CollectExportDeps = defaultExportDeps,
): void {
  currentExportSession = session
  exportDeps = deps
  mount.innerHTML = workbenchMarkup

  generateBtnEl = document.getElementById('export-generate-btn') as HTMLButtonElement | null
  selectAllBtn = document.getElementById('export-select-all') as HTMLButtonElement | null
  selectNoneBtn = document.getElementById('export-select-none') as HTMLButtonElement | null
  formatSelectEl = document.getElementById('export-format-select') as HTMLSelectElement | null
  copyBtnEl = document.getElementById('export-copy-btn') as HTMLButtonElement | null
  downloadBtnEl = document.getElementById('export-download-btn') as HTMLButtonElement | null
  statusEl = document.getElementById('export-status')
  storageErrorEl = document.getElementById('export-storage-error')
  previewEl = document.getElementById('export-preview')
  historyListEl = document.getElementById('export-list')
  historyEmptyEl = document.getElementById('export-history-empty')
  progressHintEl = document.getElementById('export-progress-hint')
  progressListEl = document.getElementById('export-progress-list')
  progressStatusEl = document.getElementById('export-progress-status')
  progressLessonEl = document.getElementById('export-progress-lesson')
  progressScoreEl = document.getElementById('export-progress-score')
  progressLabEl = document.getElementById('export-progress-lab')
  progressSavedEl = document.getElementById('export-progress-saved')
  progressDurationEl = document.getElementById('export-progress-duration')

  const fieldListEl = mount.querySelector<HTMLElement>('#export-field-list')
  if (fieldListEl) {
    fieldListEl.innerHTML = EXPORT_FIELD_LABELS.map(
      ([key, label]) => `
      <button type="button" class="export-filter__btn" data-field="${key}" aria-pressed="true">${label}</button>`,
    ).join('')
  }
  fieldBtns = Array.from(mount.querySelectorAll<HTMLButtonElement>('.export-filter__btn'))

  // 恢复历史：存储不可用（Node/隐私模式/配额）时 currentHistory 为 null，不抛异常
  storageOk = exportStorageAvailable()
  currentHistory = storageOk ? loadExportHistory() : null
  if (storageErrorEl) storageErrorEl.hidden = storageOk

  generateBtnEl?.addEventListener('click', () => handleGenerate())
  selectAllBtn?.addEventListener('click', () => handleSelectAll())
  selectNoneBtn?.addEventListener('click', () => handleSelectNone())
  formatSelectEl?.addEventListener('change', () => handleFormatChange())
  copyBtnEl?.addEventListener('click', () => handleCopy())
  downloadBtnEl?.addEventListener('click', () => handleDownload())
  fieldBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field as ExportFieldKey
      handleFieldToggle(field)
    })
  })

  renderFields()
  renderPreview()
  updateControls()
  renderHistory()
  void refreshProgressSummary()
}
