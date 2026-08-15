// 学习会话工作台（src/journal.ts）— 独立于课程区与进度面板的纯前端模块。
//
// 功能（AC-FE-001~010 / BR-JOURNAL-001~006）：
// - 八步闭环逐项勾选（目标/输入上下文/计划/执行/工具环境/输出/评估/记录），X/8 实时计数；
// - 五份模板草稿（run-contract / input-freeze / run-log / evaluation / retrospective）
//   textarea 预填与课程区 pre 一致的骨架（静态常量副本，课程加载失败仍齐全），
//   与骨架不同且非空即完成，Y/5 实时计数；
// - 10 分量表自评（0–10 整数或空，非法值拒绝并提示）；
// - 本地会话计时（开始/暂停/继续/重置，运行态与累计秒随草稿持久化）；
// - 摘要区与最近保存时间实时更新；
// - 草稿自动保存到 localStorage（key=frontend-dag-debug:journal，textarea 防抖 300ms），
//   读写均 try/catch 静默降级；
// - 登录后经 getProgress → mergeProgressForSync → putProgress 合并同步 /api/v1/progress
//   （weeklyLabCompleted 无条件保留服务端原值，自评空时 evaluationScore 保留原值，
//   firstLessonCompleted 仅当 X=8 且 Y=5 且自评分非空为 true）；GET 失败不执行 PUT，
//   任何失败均保留本地草稿与勾选。
//
// 隔离性（BR-JOURNAL-006）：全部使用 journal-* 类名与独立存储 key，不查询课程区 DOM、
// 不触碰进度面板表单与任务看板 key。网络与存储调用收敛于本模块（main.ts 零
// fetch/localStorage 字面量），保持真实请求路径为默认，测试通过注入依赖覆盖合并语义。
import { getProgress, putProgress } from './api.ts'
import type { ProgressData } from './types.ts'

export const JOURNAL_STORAGE_KEY = 'frontend-dag-debug:journal'
export const SAVE_DEBOUNCE_MS = 300
export const TOTAL_STEPS = 8
export const TOTAL_TEMPLATES = 5

// 八步闭环：与课程区「八步最小闭环」逐字一致（AC-FE-001）
export const STEP_LABELS = [
  '目标',
  '输入/上下文',
  '计划',
  '执行',
  '工具/环境',
  '输出',
  '评估',
  '记录',
] as const

export const TEMPLATE_IDS = [
  'run-contract',
  'input-freeze',
  'run-log',
  'evaluation',
  'retrospective',
] as const

// 五份模板骨架：与课程区 pre 块逐字一致的静态常量副本（AC-FE-003），
// 课程内容加载失败时仍齐全、页面不报错不白屏。
export const TEMPLATE_SKELETONS: Record<string, string> = {
  'run-contract': `# run-contract.md — 研究助手 v0 任务合约
- 任务：只根据 [S1]/[S2] 回答研究问题，给出三条带来源标注的区别。
- 目标：判定成败的唯一标准，可观察、可核对。
- 输入：[S1]/[S2] 摘录原文 + 研究问题原文（冻结于 input-freeze.md）。
- 约束：零网络、零账号、零 API key；不使用资料外外部事实；回答不超过 200 字。
- 工具边界：仅读取本页内联资料；无检索、无远程调用。
- 停止条件：三条区别、每条标注来源、字数达标、格式符合模板，即停止。
- 输出格式：三条编号区别，每条以「来源：[S1]/[S2]」结尾。
- 成功标准：三条均出自资料、来源标注齐全、可被 10 分量表逐项核对。`,
  'input-freeze': `# input-freeze.md — 输入冻结记录
- 冻结时间：____年__月__日 __:__
- 研究问题原文：（抄写）
- [S1] 摘录原文：（抄写）
- [S2] 摘录原文：（抄写）
- 冻结承诺：本次 run 不新增、不更换任何输入资料。`,
  'run-log': `# run-log.md — 执行记录
- Run ID：run-____（与 run-contract.md 一致）
- 步骤 1：____（决策：____）
- 步骤 2：____（决策：____）
- 步骤 3：____（决策：____）
- 输出快照：（粘贴最终回答）
- 停止条件核对：____（是否达成）`,
  evaluation: `# evaluation.md — 评估表
- 目标清晰（1 分）：____ 通过 / 不通过
- 输入冻结（1 分）：____ 通过 / 不通过
- 来源完整（2 分）：____ / 2
- 约束遵守（1 分）：____ 通过 / 不通过
- 输出结构（1 分）：____ 通过 / 不通过
- 停止条件（1 分）：____ 通过 / 不通过
- 证据记录（1 分）：____ 通过 / 不通过
- 复盘具体（1 分）：____ 通过 / 不通过
- 总分：____ 分（8 分及以上才算完成）`,
  retrospective: `# retrospective.md — 复盘结论
- 本次目标：____
- 最不确定处：____
- 一次失败或边界：____
- 证据（指向 run-log / evaluation 记录）：____
- 下一步改进：____`,
}

// ── 草稿形状 ──

export interface JournalDraft {
  steps: boolean[]
  templates: Record<string, string>
  score: number | null
  elapsedSeconds: number
  running: boolean
  lastStartedAt: number | null
  savedAt: string | null
}

export interface JournalSession {
  token: string
  username: string
}

export function createEmptyDraft(): JournalDraft {
  return {
    steps: STEP_LABELS.map(() => false),
    templates: Object.fromEntries(
      TEMPLATE_IDS.map((id) => [id, TEMPLATE_SKELETONS[id]]),
    ),
    score: null,
    elapsedSeconds: 0,
    running: false,
    lastStartedAt: null,
    savedAt: null,
  }
}

// ── 纯状态函数 ──

export function countSteps(draft: JournalDraft): number {
  return draft.steps.filter(Boolean).length
}

/** 模板完成判定：草稿 trim 后与骨架 trim 后不同且非空才为已完成（BR-JOURNAL-001）。 */
export function isTemplateCompleted(draftText: string, skeleton: string): boolean {
  const draft = draftText.trim()
  const base = skeleton.trim()
  return draft !== '' && draft !== base
}

export function countCompletedTemplates(draft: JournalDraft): number {
  return TEMPLATE_IDS.filter((id) =>
    isTemplateCompleted(draft.templates[id] ?? '', TEMPLATE_SKELETONS[id]),
  ).length
}

/** 第一课完成条件：仅 X=8 且 Y=5 且自评分非空为 true（BR-JOURNAL-002）。 */
export function computeFirstLessonCompleted(
  stepsDone: number,
  templatesDone: number,
  score: number | null,
): boolean {
  return (
    stepsDone === TOTAL_STEPS &&
    templatesDone === TOTAL_TEMPLATES &&
    score !== null
  )
}

/** 自评校验：0–10 整数或空；11/-1/7.5 等拒绝（AC-FE-006）。 */
export function validateScore(raw: string): {
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

// ── 计时 ──

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** 当前累计秒：运行中按 lastStartedAt 实时推算，暂停后取已结算值（AC-FE-007）。 */
export function currentElapsedSeconds(draft: JournalDraft, now: number): number {
  if (draft.running && draft.lastStartedAt !== null) {
    return draft.elapsedSeconds + Math.floor((now - draft.lastStartedAt) / 1000)
  }
  return draft.elapsedSeconds
}

// ── 服务端合并与同步（AC-FE-010 / BR-JOURNAL-003 / BR-JOURNAL-005） ──

export interface SyncState {
  stepsDone: number
  templatesDone: number
  score: number | null
}

export interface SyncDeps {
  getProgress: (token: string) => Promise<ProgressData>
  putProgress: (token: string, progress: ProgressData) => Promise<ProgressData>
}

const defaultSyncDeps: SyncDeps = { getProgress, putProgress }

/** 合并：weeklyLabCompleted 无条件取 GET 原值；自评空时 evaluationScore 取 GET 原值；
 *  firstLessonCompleted 按完成条件计算（BR-JOURNAL-003）。 */
export function mergeProgressForSync(
  server: ProgressData,
  state: SyncState,
): ProgressData {
  return {
    firstLessonCompleted: computeFirstLessonCompleted(
      state.stepsDone,
      state.templatesDone,
      state.score,
    ),
    evaluationScore:
      state.score === null ? server.evaluationScore : state.score,
    weeklyLabCompleted: server.weeklyLabCompleted,
  }
}

export type SyncOutcome =
  | { ok: true; updatedAt: string | undefined }
  | { ok: false; reason: 'get-failed' | 'put-failed' }

/** 同步：先 GET 后合并再 PUT；GET 失败不执行 PUT；任何失败均不清空本地值（BR-JOURNAL-005）。 */
export async function syncJournalProgress(
  token: string,
  state: SyncState,
  deps: SyncDeps = defaultSyncDeps,
): Promise<SyncOutcome> {
  let server: ProgressData
  try {
    server = await deps.getProgress(token)
  } catch {
    return { ok: false, reason: 'get-failed' }
  }
  const merged = mergeProgressForSync(server, state)
  try {
    const result = await deps.putProgress(token, merged)
    return { ok: true, updatedAt: result.updatedAt }
  } catch {
    return { ok: false, reason: 'put-failed' }
  }
}

// ── 持久化（BR-JOURNAL-004）：读写均 try/catch 静默降级 ──

export function isValidDraft(data: unknown): data is JournalDraft {
  if (typeof data !== 'object' || data === null) return false
  const draft = data as JournalDraft
  if (!Array.isArray(draft.steps) || draft.steps.length !== TOTAL_STEPS) {
    return false
  }
  if (!draft.steps.every((value) => typeof value === 'boolean')) return false
  if (typeof draft.templates !== 'object' || draft.templates === null) {
    return false
  }
  if (
    !TEMPLATE_IDS.every((id) => typeof draft.templates[id] === 'string')
  ) {
    return false
  }
  if (draft.score !== null && typeof draft.score !== 'number') return false
  if (typeof draft.elapsedSeconds !== 'number') return false
  if (typeof draft.running !== 'boolean') return false
  if (draft.lastStartedAt !== null && typeof draft.lastStartedAt !== 'number') {
    return false
  }
  if (draft.savedAt !== null && typeof draft.savedAt !== 'string') return false
  return true
}

export function loadJournalDraft(): JournalDraft | null {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (isValidDraft(parsed)) return parsed
    return null
  } catch {
    return null
  }
}

export function saveJournalDraft(draft: JournalDraft): void {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // 存储不可用（隐私模式/配额）：静默失败，仅影响持久化
  }
}

export function clearJournalDraft(): void {
  try {
    localStorage.removeItem(JOURNAL_STORAGE_KEY)
  } catch {
    // 存储不可用：忽略
  }
}

// ── UI 初始化（仅浏览器运行时；Node 测试只导入纯函数） ──

let currentDraft: JournalDraft = createEmptyDraft()
let currentSession: JournalSession | null = null
let syncDeps: SyncDeps = defaultSyncDeps
let saveTimer: number | null = null

let stepsCheckboxes: HTMLInputElement[] = []
let templateTextareas: HTMLTextAreaElement[] = []
let stepsCountEl: HTMLElement | null = null
let stepsDoneHintEl: HTMLElement | null = null
let templatesCountEl: HTMLElement | null = null
let scoreInputEl: HTMLInputElement | null = null
let scoreErrorEl: HTMLElement | null = null
let timerDisplayEl: HTMLElement | null = null
let summaryStepsEl: HTMLElement | null = null
let summaryTemplatesEl: HTMLElement | null = null
let summaryScoreEl: HTMLElement | null = null
let summaryTimerEl: HTMLElement | null = null
let summarySavedEl: HTMLElement | null = null
let syncBtnEl: HTMLButtonElement | null = null
let syncHintEl: HTMLElement | null = null
let syncStatusEl: HTMLElement | null = null

const workbenchMarkup = `
  <section class="journal-workbench container" id="journal-workbench" aria-labelledby="journal-workbench-title">
    <p class="section-kicker">学习会话工作台</p>
    <h2 class="section-title" id="journal-workbench-title">八步闭环 · 五份模板 · 自评与计时</h2>
    <p class="journal-workbench__intro">
      按八步闭环逐项完成本课会话：勾选步骤、编辑五份模板草稿（与骨架不同且非空即完成）、
      自评 0–10 分、本地计时；草稿自动保存，登录后可同步到服务端进度。
    </p>

    <div class="journal-grid">
      <section class="journal-card journal-steps" aria-labelledby="journal-steps-title">
        <h3 class="journal-card__title" id="journal-steps-title">八步闭环</h3>
        <p class="journal-card__count" id="journal-steps-count" aria-live="polite">0/8</p>
        <ul class="journal-steps__list">
          ${STEP_LABELS.map(
            (label, index) => `
            <li class="journal-step">
              <label class="journal-step__label">
                <input type="checkbox" class="journal-step__checkbox" data-step="${index}" />
                <span class="journal-step__text">${index + 1} ${label}</span>
              </label>
            </li>`,
          ).join('')}
        </ul>
        <p class="journal-steps__hint" id="journal-steps-done" hidden>八步全部完成</p>
      </section>

      <section class="journal-card journal-templates" aria-labelledby="journal-templates-title">
        <h3 class="journal-card__title" id="journal-templates-title">五份模板草稿</h3>
        <p class="journal-card__count" id="journal-templates-count" aria-live="polite">0/5</p>
        <div class="journal-templates__list">
          ${TEMPLATE_IDS.map(
            (id) => `
            <div class="journal-template" data-template="${id}">
              <div class="journal-template__head">
                <label class="journal-template__name" for="journal-template-${id}">${id}</label>
                <span class="journal-template__status" id="journal-template-status-${id}">未完成</span>
              </div>
              <textarea id="journal-template-${id}" class="journal-template__textarea" rows="9" spellcheck="false"></textarea>
            </div>`,
          ).join('')}
        </div>
      </section>

      <section class="journal-card journal-selfscore" aria-labelledby="journal-score-title">
        <h3 class="journal-card__title" id="journal-score-title">10 分量表自评</h3>
        <label class="journal-score__field">
          <span>自评分（0–10 整数，可空）</span>
          <input type="number" id="journal-score-input" class="journal-score__input" min="0" max="10" step="1" placeholder="0–10" />
        </label>
        <p class="journal-score__error" id="journal-score-error" hidden>请输入 0–10 的整数</p>
      </section>

      <section class="journal-card journal-timer" aria-labelledby="journal-timer-title">
        <h3 class="journal-card__title" id="journal-timer-title">本地会话计时</h3>
        <p class="journal-timer__display" id="journal-timer-display" aria-live="polite">00:00</p>
        <div class="journal-timer__actions">
          <button type="button" class="btn btn--primary" id="journal-timer-start">开始</button>
          <button type="button" class="btn btn--secondary" id="journal-timer-pause">暂停</button>
          <button type="button" class="btn btn--secondary" id="journal-timer-resume">继续</button>
          <button type="button" class="btn btn--secondary" id="journal-timer-reset">重置</button>
        </div>
      </section>
    </div>

    <section class="journal-card journal-summary" aria-labelledby="journal-summary-title">
      <h3 class="journal-card__title" id="journal-summary-title">会话摘要</h3>
      <dl class="journal-summary__list">
        <div class="journal-summary__item"><dt>步骤</dt><dd id="journal-summary-steps">0/8</dd></div>
        <div class="journal-summary__item"><dt>模板</dt><dd id="journal-summary-templates">0/5</dd></div>
        <div class="journal-summary__item"><dt>自评</dt><dd id="journal-summary-score">未自评</dd></div>
        <div class="journal-summary__item"><dt>累计时长</dt><dd id="journal-summary-timer">00:00</dd></div>
        <div class="journal-summary__item"><dt>最近保存</dt><dd id="journal-summary-saved">—</dd></div>
      </dl>
    </section>

    <section class="journal-card journal-sync" aria-labelledby="journal-sync-title">
      <h3 class="journal-card__title" id="journal-sync-title">同步到服务端</h3>
      <p class="journal-sync__hint" id="journal-sync-hint">登录后同步</p>
      <button type="button" class="btn btn--primary" id="journal-sync-btn" disabled>同步到服务端</button>
      <p class="journal-sync__status" id="journal-sync-status" aria-live="polite"></p>
    </section>

    <div class="journal-workbench__footer">
      <button type="button" class="btn btn--secondary" id="journal-reset-btn">重置工作台</button>
    </div>
  </section>
`

function renderSteps(): void {
  stepsCheckboxes.forEach((checkbox, index) => {
    checkbox.checked = Boolean(currentDraft.steps[index])
  })
  const done = countSteps(currentDraft)
  if (stepsCountEl) stepsCountEl.textContent = `${done}/${TOTAL_STEPS}`
  if (stepsDoneHintEl) stepsDoneHintEl.hidden = done !== TOTAL_STEPS
  if (summaryStepsEl) summaryStepsEl.textContent = `${done}/${TOTAL_STEPS}`
}

function renderTemplates(): void {
  templateTextareas.forEach((textarea) => {
    const id = textarea.dataset.template ?? textarea.id.replace('journal-template-', '')
    textarea.value = currentDraft.templates[id] ?? TEMPLATE_SKELETONS[id]
    const statusEl = document.getElementById(`journal-template-status-${id}`)
    const completed = isTemplateCompleted(
      textarea.value,
      TEMPLATE_SKELETONS[id],
    )
    if (statusEl) {
      statusEl.textContent = completed ? '已完成' : '未完成'
      statusEl.classList.toggle('is-completed', completed)
    }
  })
  const done = countCompletedTemplates(currentDraft)
  if (templatesCountEl) templatesCountEl.textContent = `${done}/${TOTAL_TEMPLATES}`
  if (summaryTemplatesEl) {
    summaryTemplatesEl.textContent = `${done}/${TOTAL_TEMPLATES}`
  }
}

function renderScore(): void {
  if (summaryScoreEl) {
    summaryScoreEl.textContent =
      currentDraft.score === null ? '未自评' : String(currentDraft.score)
  }
}

function renderTimer(): void {
  const text = formatDuration(currentElapsedSeconds(currentDraft, Date.now()))
  if (timerDisplayEl) timerDisplayEl.textContent = text
  if (summaryTimerEl) summaryTimerEl.textContent = text
}

function renderSummarySaved(): void {
  if (summarySavedEl) {
    summarySavedEl.textContent = currentDraft.savedAt
      ? new Date(currentDraft.savedAt).toLocaleString()
      : '—'
  }
}

function renderSyncUi(): void {
  const loggedIn = currentSession !== null
  if (syncBtnEl) syncBtnEl.disabled = !loggedIn
  if (syncHintEl) syncHintEl.hidden = loggedIn
}

function renderAll(): void {
  renderSteps()
  renderTemplates()
  renderScore()
  renderTimer()
  renderSummarySaved()
  renderSyncUi()
}

function persistDraft(): void {
  currentDraft.savedAt = new Date().toISOString()
  saveJournalDraft(currentDraft)
  renderSummarySaved()
}

/** 改动经防抖自动保存（textarea 约 300ms，其余改动同源防抖）。 */
function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    persistDraft()
  }, SAVE_DEBOUNCE_MS)
}

function startTimer(): void {
  if (currentDraft.running) return
  currentDraft.running = true
  currentDraft.lastStartedAt = Date.now()
  scheduleSave()
  renderTimer()
}

function pauseTimer(): void {
  if (!currentDraft.running) return
  currentDraft.elapsedSeconds = currentElapsedSeconds(currentDraft, Date.now())
  currentDraft.running = false
  currentDraft.lastStartedAt = null
  scheduleSave()
  renderTimer()
}

function resumeTimer(): void {
  if (currentDraft.running) return
  currentDraft.running = true
  currentDraft.lastStartedAt = Date.now()
  scheduleSave()
  renderTimer()
}

function resetTimer(): void {
  currentDraft.elapsedSeconds = 0
  currentDraft.running = false
  currentDraft.lastStartedAt = null
  scheduleSave()
  renderTimer()
}

function handleScoreInput(): void {
  if (!scoreInputEl || !scoreErrorEl) return
  const result = validateScore(scoreInputEl.value)
  if (!result.valid) {
    // 非法值：仅提示，不写入状态、摘要与草稿
    scoreErrorEl.hidden = false
    return
  }
  scoreErrorEl.hidden = true
  currentDraft.score = result.value
  scheduleSave()
  renderScore()
}

async function handleSyncClick(): Promise<void> {
  if (!syncStatusEl) return
  if (!currentSession) {
    syncStatusEl.textContent = '登录后同步'
    return
  }
  syncStatusEl.textContent = '同步中…'
  const outcome = await syncJournalProgress(
    currentSession.token,
    {
      stepsDone: countSteps(currentDraft),
      templatesDone: countCompletedTemplates(currentDraft),
      score: currentDraft.score,
    },
    syncDeps,
  )
  if (outcome.ok) {
    syncStatusEl.textContent = outcome.updatedAt
      ? `已同步：${new Date(outcome.updatedAt).toLocaleString()}`
      : '已同步'
  } else if (outcome.reason === 'get-failed') {
    syncStatusEl.textContent = '同步失败：无法读取服务端进度'
  } else {
    syncStatusEl.textContent = '同步失败：提交进度失败，已保留本地内容'
  }
}

function resetWorkbench(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  clearJournalDraft()
  currentDraft = createEmptyDraft()
  renderAll()
}

/** 登录态联动：登录启用同步按钮，退出禁用（sync-logged-out）。 */
export function setJournalSession(session: JournalSession | null): void {
  currentSession = session
  if (syncStatusEl) syncStatusEl.textContent = ''
  renderSyncUi()
}

export function initJournalWorkbench(
  mount: HTMLElement,
  deps: SyncDeps = defaultSyncDeps,
): void {
  syncDeps = deps
  mount.innerHTML = workbenchMarkup

  stepsCheckboxes = Array.from(
    mount.querySelectorAll<HTMLInputElement>('.journal-step__checkbox'),
  )
  templateTextareas = Array.from(
    mount.querySelectorAll<HTMLTextAreaElement>('.journal-template__textarea'),
  )
  stepsCountEl = document.getElementById('journal-steps-count')
  stepsDoneHintEl = document.getElementById('journal-steps-done')
  templatesCountEl = document.getElementById('journal-templates-count')
  scoreInputEl = document.getElementById('journal-score-input') as HTMLInputElement | null
  scoreErrorEl = document.getElementById('journal-score-error')
  timerDisplayEl = document.getElementById('journal-timer-display')
  summaryStepsEl = document.getElementById('journal-summary-steps')
  summaryTemplatesEl = document.getElementById('journal-summary-templates')
  summaryScoreEl = document.getElementById('journal-summary-score')
  summaryTimerEl = document.getElementById('journal-summary-timer')
  summarySavedEl = document.getElementById('journal-summary-saved')
  syncBtnEl = document.getElementById('journal-sync-btn') as HTMLButtonElement | null
  syncHintEl = document.getElementById('journal-sync-hint')
  syncStatusEl = document.getElementById('journal-sync-status')

  // 恢复草稿（localStorage 不可用或被清空时以初始空状态加载，不报错）
  currentDraft = loadJournalDraft() ?? createEmptyDraft()

  stepsCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const index = Number(checkbox.dataset.step)
      if (Number.isInteger(index) && index >= 0 && index < TOTAL_STEPS) {
        currentDraft.steps[index] = checkbox.checked
      }
      scheduleSave()
      renderSteps()
    })
  })

  templateTextareas.forEach((textarea) => {
    textarea.addEventListener('input', () => {
      const id =
        textarea.dataset.template ??
        textarea.id.replace('journal-template-', '')
      currentDraft.templates[id] = textarea.value
      scheduleSave()
      renderTemplates()
    })
  })

  if (scoreInputEl) {
    scoreInputEl.addEventListener('input', () => handleScoreInput())
  }

  const startBtn = document.getElementById('journal-timer-start')
  const pauseBtn = document.getElementById('journal-timer-pause')
  const resumeBtn = document.getElementById('journal-timer-resume')
  const resetTimerBtn = document.getElementById('journal-timer-reset')
  startBtn?.addEventListener('click', () => startTimer())
  pauseBtn?.addEventListener('click', () => pauseTimer())
  resumeBtn?.addEventListener('click', () => resumeTimer())
  resetTimerBtn?.addEventListener('click', () => resetTimer())

  syncBtnEl?.addEventListener('click', () => {
    void handleSyncClick()
  })

  document
    .getElementById('journal-reset-btn')
    ?.addEventListener('click', () => resetWorkbench())

  renderAll()

  // 运行中每秒递增展示；暂停/继续/重置即时重绘
  window.setInterval(() => {
    if (currentDraft.running) renderTimer()
  }, 1000)
}
