import './style.css'

type RouteId = 'beginner' | 'builder' | 'advanced'

interface Route {
  id: RouteId
  name: string
  audience: string
  duration: string
  lessonCount: string
  summary: string
  stages: string[]
  firstLesson: string
  traceStates: readonly [string, string, string, string]
}

// ── 静态课程数据：全部内联于前端源码，无网络请求（BR-AGENT-001） ──

const traceLabels = ['输入', '计划', '工具', '评估'] as const

const routes: Route[] = [
  {
    id: 'beginner',
    name: '入门',
    audience: '首次构建 Agent 的开发者',
    duration: '约 2 周',
    lessonCount: '12 节课',
    summary:
      '从提示与模型调用开始，用可验证的小项目跑通一个 Agent 的完整生命周期：输入、计划、工具、评估。',
    stages: [
      '提示与模型调用',
      '接入第一个 Tool',
      '加入 Memory 与上下文',
      '用 Eval 验证收尾',
    ],
    firstLesson: '让一个模型调用跑起来',
    traceStates: [
      '用户提问与可用工具清单',
      '单步计划：查询 → 回答',
      '调用 Tool：检索并计算',
      '检查回答是否引用来源',
    ],
  },
  {
    id: 'builder',
    name: '构建',
    audience: '已有原型、想构建可交付 Agent 的开发者',
    duration: '约 4 周',
    lessonCount: '20 节课',
    summary:
      '围绕可观测性与安全边界，把原型打磨成可评估、可回滚的生产级 Agent。',
    stages: [
      '规划与编排',
      'Eval 与可观测性',
      '安全与边界',
      '发布与回滚',
    ],
    firstLesson: '为原型建立一条 Eval 基线',
    traceStates: [
      '目标拆解为子任务',
      '多步计划：拆解 → 执行 → 汇总',
      '并行调用多个 Tool 并处理失败',
      '按 Eval 指标评估并记录',
    ],
  },
  {
    id: 'advanced',
    name: '进阶',
    audience: '负责多智能体系统或 Agent 平台的开发者',
    duration: '约 6 周',
    lessonCount: '28 节课',
    summary:
      '深入多智能体协作与评估驱动迭代，构建能持续进化的 Agent 平台。',
    stages: [
      '多智能体编排',
      '评估驱动迭代',
      '系统级安全',
      '规模化与治理',
    ],
    firstLesson: '设计一次子 Agent 委派',
    traceStates: [
      '跨系统请求与权限上下文',
      '编排计划：委派 → 监督 → 合并',
      '协调子 Agent 的工具调用与重试',
      '聚合评估与可观测性审计',
    ],
  },
]

// ── 能力地图：六类能力，从学习者可控制/可验证角度书写（REQ-AGENT-003） ──

const capabilities = [
  {
    title: '模型与提示',
    desc: '选择模型、写提示并度量输出质量，先让单次调用可控。',
  },
  {
    title: 'Tool（工具调用）',
    desc: '给 Agent 声明可用的工具，验证调用参数、失败与重试路径。',
  },
  {
    title: 'Memory（记忆与上下文）',
    desc: '管理上下文窗口与持久记忆，让 Agent 记住该记住的、忘掉该忘的。',
  },
  {
    title: '规划与编排',
    desc: '把大目标拆成可执行的小步骤，控制执行顺序与任务边界。',
  },
  {
    title: 'Eval 与可观测性',
    desc: '用评估集与运行轨迹度量每次改动，不靠感觉上线。',
  },
  {
    title: '安全与边界',
    desc: '限制权限、校验输出并设计护栏，让失败可控、可回滚。',
  },
]

// ── 本周实验（REQ-AGENT-005） ──

const weeklyLab = {
  title: '研究助手',
  goal: '构建一个会查资料、带引用回答并接受评估的研究助手。',
  input: '一篇主题与一组候选资料（你提供的文本或本地文件）。',
  tools: '检索工具 + 引用记录：查找资料、抽取要点并记录来源。',
  criteria: '回答包含明确引用，评估集通过，跑一次完整 trace 可复现。',
  duration: '约 45 分钟',
}

// ── 首屏执行轨迹：编码真实 Agent 四阶段（输入→计划→工具→评估） ──

const traceMarkup = traceLabels
  .map(
    (label, index) => `
      <li class="trace__node is-done">
        <span class="trace__node-dot" aria-hidden="true"></span>
        <strong class="trace__node-label">${label}</strong>
        <span class="trace__node-status">${routes[0].traceStates[index]}</span>
      </li>`,
  )
  .join('')

// 初始路线 tab：静态字面量，默认「入门」为唯一 aria-pressed=true（AC-AGENT-002）
// 运行时切换由 selectRoute 同步更新，保证任一时刻恰好一个选中（BR-AGENT-002）。
const routeTabsMarkup = `
  <button
    type="button"
    class="route-tab is-active"
    data-route="beginner"
    aria-pressed="true"
  >入门</button>
  <button
    type="button"
    class="route-tab"
    data-route="builder"
    aria-pressed="false"
  >构建</button>
  <button
    type="button"
    class="route-tab"
    data-route="advanced"
    aria-pressed="false"
  >进阶</button>`

const capabilityMarkup = capabilities
  .map(
    (capability) => `
      <li class="capability-card">
        <h3 class="capability-card__title">${capability.title}</h3>
        <p class="capability-card__desc">${capability.desc}</p>
      </li>`,
  )
  .join('')

const weeklyLabFacts = [
  `目标：${weeklyLab.goal}`,
  `输入：${weeklyLab.input}`,
  `工具：${weeklyLab.tools}`,
  `成功标准：${weeklyLab.criteria}`,
  `时长：${weeklyLab.duration}`,
]

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('缺少 #app 挂载点')

app.innerHTML = `
  <header class="site-header">
    <div class="container site-header__inner">
      <p class="site-header__brand">
        <span class="site-header__dot" aria-hidden="true"></span>Agent 学习实验室
      </p>
      <p class="site-header__note">零后端 · 零网络请求 · 课程数据内联</p>
    </div>
  </header>

  <main id="main">
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__content">
          <p class="hero__overline">Agent 学习版图</p>
          <h1 class="hero__title">让 Agent 不再靠运气工作</h1>
          <p class="hero__lead">
            用可验证的小项目理解 Agent 的运行骨架。入门、构建、进阶三条路线，
            覆盖模型与提示、Tool（工具调用）、Memory（记忆与上下文）、规划与编排、
            Eval 与可观测性、安全与边界六类能力。
          </p>
          <div class="hero__actions">
            <a class="btn btn--primary" id="hero-first-lesson-link" href="#first-lesson-beginner">开始入门路线 · 第一课</a>
            <a class="btn btn--secondary" href="#capability-map">查看能力地图</a>
          </div>
        </div>

        <aside class="trace" aria-label="Agent 执行轨迹：输入、计划、工具、评估">
          <div class="trace__header">
            <p class="trace__title">执行轨迹</p>
            <p class="trace__caption">一个 Agent run 的四个真实阶段</p>
          </div>
          <div class="trace__stage">
            <span class="trace__connector" aria-hidden="true"></span>
            <span class="trace__token" aria-hidden="true"></span>
            <ul class="trace__nodes">${traceMarkup}</ul>
          </div>
        </aside>
      </div>
    </section>

    <section class="route-picker container" id="route-picker">
      <p class="section-kicker">学习路线</p>
      <h2 class="section-title">选择你的起点</h2>
      <div class="route-tabs" role="group" aria-label="学习路线选择">${routeTabsMarkup}</div>

      <section class="route-detail" id="route-detail" aria-live="polite" aria-label="当前路线的课程详情">
        <p class="route-detail__eyebrow">当前路线</p>
        <h3 class="route-detail__name" id="route-name">入门</h3>
        <p class="route-detail__meta">
          <span id="route-audience">首次构建 Agent 的开发者</span><span aria-hidden="true"> · </span>
          <span id="route-duration">约 2 周</span><span aria-hidden="true"> · </span>
          <span id="route-lesson-count">12 节课</span>
        </p>
        <p class="route-detail__summary" id="route-summary">从提示与模型调用开始，用可验证的小项目跑通一个 Agent 的完整生命周期：输入、计划、工具、评估。</p>
        <ol class="route-detail__stages" id="route-stages">
          <li>提示与模型调用</li>
          <li>接入第一个 Tool</li>
          <li>加入 Memory 与上下文</li>
          <li>用 Eval 验证收尾</li>
        </ol>
        <a class="btn btn--primary route-detail__cta" id="first-lesson-link" href="#first-lesson-beginner">开始入门路线 · 第一课：让一个模型调用跑起来</a>
        <span class="first-lesson-anchor" id="first-lesson-beginner"></span>
        <span class="first-lesson-anchor" id="first-lesson-builder"></span>
        <span class="first-lesson-anchor" id="first-lesson-advanced"></span>
      </section>
    </section>

    <section class="capability-map container" id="capability-map">
      <p class="section-kicker">能力地图</p>
      <h2 class="section-title">六类能力，从可控到可验证</h2>
      <ul class="capability-grid">${capabilityMarkup}</ul>
    </section>

    <section class="weekly-lab container" id="weekly-lab">
      <p class="section-kicker">本周实验</p>
      <h2 class="section-title">本周实验：研究助手</h2>
      <ul class="weekly-lab__facts">
        ${weeklyLabFacts.map((fact) => `<li class="weekly-lab__fact">${fact}</li>`).join('')}
      </ul>
      <p class="weekly-lab__hint">做完第一课即可开始；每一步都用可验证的结果说话。</p>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>Agent 学习实验室 · 无网络请求、无第三方运行时依赖，全部课程数据静态内联于前端源码</p>
    </div>
  </footer>
`

// ── 交互：任一时刻恰好一条路线选中（aria-pressed 与内容/轨迹/CTA 同步） ──

const routeButtons = document.querySelectorAll<HTMLButtonElement>('.route-tab')
const routeNameEl = document.querySelector<HTMLElement>('#route-name')!
const routeAudienceEl = document.querySelector<HTMLElement>('#route-audience')!
const routeDurationEl = document.querySelector<HTMLElement>('#route-duration')!
const routeLessonCountEl = document.querySelector<HTMLElement>('#route-lesson-count')!
const routeSummaryEl = document.querySelector<HTMLElement>('#route-summary')!
const routeStagesEl = document.querySelector<HTMLOListElement>('#route-stages')!
const traceStatusEls = Array.from(
  document.querySelectorAll<HTMLElement>('.trace__node-status'),
)
const firstLessonLink = document.querySelector<HTMLAnchorElement>('#first-lesson-link')!
const heroFirstLessonLink = document.querySelector<HTMLAnchorElement>('#hero-first-lesson-link')!

function selectRoute(routeId: RouteId): void {
  const route = routes.find((item) => item.id === routeId)
  if (!route) return

  routeButtons.forEach((btn) => {
    const isActive = btn.dataset.route === routeId
    btn.setAttribute('aria-pressed', String(isActive))
    btn.classList.toggle('is-active', isActive)
  })

  routeNameEl.textContent = route.name
  routeAudienceEl.textContent = route.audience
  routeDurationEl.textContent = route.duration
  routeLessonCountEl.textContent = route.lessonCount
  routeSummaryEl.textContent = route.summary
  routeStagesEl.innerHTML = route.stages.map((stage) => `<li>${stage}</li>`).join('')
  traceStatusEls.forEach((el, index) => {
    el.textContent = route.traceStates[index]
  })
  firstLessonLink.href = `#first-lesson-${route.id}`
  firstLessonLink.textContent = `开始${route.name}路线 · 第一课：${route.firstLesson}`
  heroFirstLessonLink.href = `#first-lesson-${route.id}`
  heroFirstLessonLink.textContent = `开始${route.name}路线 · 第一课`
}

routeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectRoute(btn.dataset.route as RouteId)
  })
})

// 初始状态：默认选中「入门」
selectRoute('beginner')
