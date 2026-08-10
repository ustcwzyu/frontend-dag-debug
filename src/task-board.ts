/** 前端任务看板 — 纯本地状态，无后端依赖 */

export interface Task {
  id: string
  title: string
  completed: boolean
}

export type Filter = 'all' | 'pending' | 'done'

const STORAGE_KEY = 'frontend-dag-debug:tasks'

// ── 纯状态函数 ──

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export function createTask(title: string): Task {
  return {
    id: generateId(),
    title: title.trim(),
    completed: false,
  }
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  )
}

export function filterTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === 'pending') return tasks.filter((t) => !t.completed)
  if (filter === 'done') return tasks.filter((t) => t.completed)
  return tasks
}

export function getCounts(
  tasks: Task[],
): { total: number; pending: number; done: number } {
  const pending = tasks.filter((t) => !t.completed).length
  const done = tasks.filter((t) => t.completed).length
  return { total: tasks.length, pending, done }
}

// ── 搜索过滤 ──

/**
 * 按关键字过滤任务列表 — 不区分大小写，仅匹配 title。
 * 关键字为空或仅包含空白时返回全部任务。
 * 如果未来 Task 增加 description 字段，可在 filter 回调中同时检查 task.description。
 */
export function searchTasks(tasks: Task[], keyword: string): Task[] {
  if (keyword.trim() === '') return tasks
  const lower = keyword.toLowerCase()
  return tasks.filter((task) => task.title.toLowerCase().includes(lower))
}

// ── 持久化 ──

export function validateTasks(data: unknown): data is Task[] {
  if (!Array.isArray(data)) return false
  return data.every(
    (item): boolean =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Task).id === 'string' &&
      typeof (item as Task).title === 'string' &&
      typeof (item as Task).completed === 'boolean',
  )
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (validateTasks(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // 静默失败：存储不可用时不影响功能
  }
}

// ── HTML 转义 ──

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── UI 初始化 ──

export function initTaskBoard(root: HTMLElement): void {
  let tasks: Task[] = loadTasks()
  let currentFilter: Filter = 'all'
  let searchKeyword = ''

  // 创建 DOM 结构
  root.innerHTML = `
    <div class="task-board">
      <h2 class="task-board__title">任务清单</h2>
      <form class="task-board__form" autocomplete="off">
        <input
          type="text"
          class="task-board__input"
          placeholder="请输入任务标题"
          aria-label="任务标题"
        />
        <button type="submit" class="task-board__btn">新增</button>
      </form>
      <p class="task-board__error" aria-live="polite"></p>
      <div class="task-board__summary">
        <span class="task-board__summary-item">
          总数：<strong id="task-board-count-total">0</strong>
        </span>
        <span class="task-board__summary-item">
          待完成：<strong id="task-board-count-pending">0</strong>
        </span>
        <span class="task-board__summary-item">
          已完成：<strong id="task-board-count-done">0</strong>
        </span>
      </div>
      <div class="task-board__filters">
        <input
          type="search"
          class="task-board__search"
          placeholder="搜索任务"
          aria-label="搜索任务"
        />
        <button
          type="button"
          class="task-board-filters__btn task-board-filters__btn--active"
          data-filter="all"
        >
          全部
        </button>
        <button
          type="button"
          class="task-board-filters__btn"
          data-filter="pending"
        >
          待完成
        </button>
        <button
          type="button"
          class="task-board-filters__btn"
          data-filter="done"
        >
          已完成
        </button>
      </div>
      <ul class="task-board__list"></ul>
      <p class="task-board__empty" aria-live="polite"></p>
    </div>
  `

  // 引用核心 DOM 元素
  const form = root.querySelector<HTMLFormElement>('.task-board__form')!
  const input = root.querySelector<HTMLInputElement>('.task-board__input')!
  const errorEl = root.querySelector<HTMLParagraphElement>('.task-board__error')!
  const listEl = root.querySelector<HTMLUListElement>('.task-board__list')!
  const emptyEl = root.querySelector<HTMLParagraphElement>('.task-board__empty')!
  const totalEl = root.querySelector<HTMLElement>('#task-board-count-total')!
  const pendingEl = root.querySelector<HTMLElement>(
    '#task-board-count-pending',
  )!
  const doneEl = root.querySelector<HTMLElement>('#task-board-count-done')!
  const filterBtns = root.querySelectorAll<HTMLButtonElement>(
    '.task-board-filters__btn',
  )
  const searchInput = root.querySelector<HTMLInputElement>(
    '.task-board__search',
  )!

  // 渲染函数：统一更新计数、列表、空状态
  function render(): void {
    const counts = getCounts(tasks)
    totalEl.textContent = String(counts.total)
    pendingEl.textContent = String(counts.pending)
    doneEl.textContent = String(counts.done)

    const filtered = filterTasks(tasks, currentFilter)
    const visible = searchTasks(filtered, searchKeyword)

    if (visible.length === 0 && tasks.length === 0) {
      // 默认空状态
      listEl.innerHTML = ''
      emptyEl.textContent = '暂无任务'
    } else if (visible.length === 0 && searchKeyword.trim() !== '') {
      // 搜索无匹配空状态（优先级高于筛选空状态）
      listEl.innerHTML = ''
      emptyEl.textContent = '无匹配任务'
    } else if (visible.length === 0) {
      // 筛选空状态
      listEl.innerHTML = ''
      if (currentFilter === 'pending') {
        emptyEl.textContent = '暂无待完成的任务'
      } else if (currentFilter === 'done') {
        emptyEl.textContent = '暂无已完成的任务'
      } else {
        emptyEl.textContent = ''
      }
    } else {
      // 有可见任务
      emptyEl.textContent = ''
      listEl.innerHTML = visible
        .map(
          (task) => `
          <li class="task-board__item">
            <label class="task-board__label">
              <input
                type="checkbox"
                class="task-board__checkbox"
                data-id="${task.id}"
                ${task.completed ? 'checked' : ''}
              />
              <span class="task-board__title${
                task.completed ? ' task-board__title--done' : ''
              }">${escapeHtml(task.title)}</span>
            </label>
          </li>
        `,
        )
        .join('')

      // 绑定 checkbox 变更事件
      listEl
        .querySelectorAll<HTMLInputElement>('.task-board__checkbox')
        .forEach((cb) => {
          cb.addEventListener('change', () => {
            const id = cb.dataset.id!
            tasks = toggleTask(tasks, id)
            saveTasks(tasks)
            render()
          })
        })
    }
  }

  // 表单提交：新增任务
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const title = input.value

    if (title.trim() === '') {
      errorEl.textContent = '请输入任务标题'
      return
    }

    errorEl.textContent = ''
    tasks = [...tasks, createTask(title)]
    saveTasks(tasks)
    input.value = ''
    render()
  })

  // 输入变化时清除错误
  input.addEventListener('input', () => {
    if (input.value.trim() !== '') {
      errorEl.textContent = ''
    }
  })

  // 搜索输入变化
  searchInput.addEventListener('input', () => {
    searchKeyword = searchInput.value
    render()
  })

  // 筛选按钮点击
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter as Filter
      currentFilter = filter
      filterBtns.forEach((b) =>
        b.classList.remove('task-board-filters__btn--active'),
      )
      btn.classList.add('task-board-filters__btn--active')
      render()
    })
  })

  // 初次渲染
  render()
}
