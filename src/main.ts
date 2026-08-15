import './style.css'
import {
  loadCourseContent,
  register,
  login,
  getProgress,
  putProgress,
} from './api.ts'
import { loadSession, saveSession, clearSession } from './auth.ts'
import { initJournalWorkbench, setJournalSession } from './journal.ts'
import { navigate, parseHash, startRouter } from './router.ts'
import type { PageName, ParsedRoute, RouteId } from './router.ts'
import type { CapabilityData, LabData, LessonData } from './api.ts'

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

// ── 第一课：完整中文静态课程（AC-002 / AC-DEEP-001~007）。课程区为纯静态内容：
//     无交互控件、无 aria-live、无动画、无网络/存储写入（AC-FE-004 / R2 裁决）。 ──

const lessonSectionMarkup = `
    <section class="lesson container" id="first-lesson-beginner" aria-labelledby="first-lesson-title">
      <div class="lesson__header">
        <p class="lesson__kicker">入门路线 · 第 01 课</p>
        <h2 class="lesson__title" id="first-lesson-title">从一次模型调用到可验证的 Agent Run</h2>
        <p class="lesson__meta">预计用时：60–90 分钟 · 完整交付：五份本地文件</p>
      </div>

      <div class="lesson__body">
        <section class="lesson-block" aria-labelledby="lesson-01-title">
          <h3 id="lesson-01-title">01 · 课程定位：这门课交付什么</h3>

          <dl class="lesson-facts">
            <div class="lesson-fact">
              <dt>适合人群</dt>
              <dd>有基础开发经验、第一次系统学习 Agent 的学习者；不需要任何 Agent 框架经验。</dd>
            </div>
            <div class="lesson-fact">
              <dt>预计用时</dt>
              <dd>60–90 分钟，其中实验与评估约占一半。</dd>
            </div>
            <div class="lesson-fact">
              <dt>前置知识</dt>
              <dd>会写代码、会用命令行；了解「调用一个接口返回文本」即可，不需要账号、后端或 API key。</dd>
            </div>
            <div class="lesson-fact">
              <dt>完成后能力</dt>
              <dd>能辨别「一次模型调用」与「一个 Agent run」；能为研究助手 v0 写出八项任务合约；能用 10 分评估量表判定一次 run 是否合格。</dd>
            </div>
            <div class="lesson-fact">
              <dt>课程产物</dt>
              <dd>五份本地文本文件：run-contract.md、input-freeze.md、run-log.md、evaluation.md、retrospective.md（模板见下方，可直接复制）。</dd>
            </div>
          </dl>

          <h4>六段学习路径</h4>
          <p>概念 → 拆解 → 设计 → 实验 → 评估 → 复盘。每段都有明确目的、学习动作与产出：</p>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>六段学习路径：目的、学习动作与产出</caption>
              <thead>
                <tr><th>阶段</th><th>目的</th><th>学习动作</th><th>产出</th></tr>
              </thead>
              <tbody>
                <tr><td>概念</td><td>建立「模型调用 ≠ Agent Run」心智模型</td><td>读八项差异对照表、八步闭环、五个边界问题</td><td>能口头说出三条关键区别</td></tr>
                <tr><td>拆解</td><td>读懂一条 run 轨迹的每个字段</td><td>逐字段对照风险说明</td><td>能解释每个字段解决什么问题</td></tr>
                <tr><td>设计</td><td>把研究问题写成可判定成败的任务合约</td><td>按八项模板逐项填写</td><td>run-contract.md</td></tr>
                <tr><td>实验</td><td>用 [S1]/[S2] 完成一次本地 run</td><td>冻结输入 → 执行 → 记录</td><td>input-freeze.md + run-log.md</td></tr>
                <tr><td>评估</td><td>用量表逐项核对并给分</td><td>逐项检查，写下通过/不通过依据</td><td>evaluation.md</td></tr>
                <tr><td>复盘</td><td>写下结论与下一步改进</td><td>填复盘五字段模板</td><td>retrospective.md</td></tr>
              </tbody>
            </table>
          </div>

          <h4>「读完」与「完成」不是一回事</h4>
          <p>读完 = 看完本页全部内容，大约 20 分钟；完成 = 交付以下五份文件并通过评估（8 分及以上）：</p>
          <ul class="lesson-contract">
            <li>任务合约（run-contract.md，八项完整）</li>
            <li>冻结输入记录（input-freeze.md，含 [S1]/[S2] 摘录原文）</li>
            <li>执行记录（run-log.md，步骤、决策与输出快照）</li>
            <li>评估表（evaluation.md，逐项判定依据与总分）</li>
            <li>复盘结论（retrospective.md，最不确定处与改进）</li>
          </ul>

          <h4>五类交付物验收关系</h4>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>五类交付物：验收关系、最低标准、优秀标准与补救路径</caption>
              <thead>
                <tr><th>交付物</th><th>验收关系</th><th>最低完成标准</th><th>优秀标准</th><th>补救路径</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">任务合约</th><td>run-contract.md，八项完整</td><td>八项字段均有具体值</td><td>目标可观察、停止条件可判定</td><td>修订：补全缺失字段后重做评估</td></tr>
                <tr><th scope="row">冻结输入记录</th><td>input-freeze.md，含 [S1]/[S2] 原文</td><td>两份摘录与研究问题一字不差</td><td>含冻结时间与冻结承诺</td><td>重跑：修正输入后从冻结阶段重来</td></tr>
                <tr><th scope="row">执行记录</th><td>run-log.md，步骤与决策</td><td>至少三步决策与输出快照</td><td>每步决策有理由、停止条件核对明确</td><td>重跑：补齐记录后重新评估</td></tr>
                <tr><th scope="row">评估表</th><td>evaluation.md，逐项判定</td><td>八项均有通过/不通过依据</td><td>每项依据引用具体证据</td><td>修订：依据缺失则补写并重新计分</td></tr>
                <tr><th scope="row">复盘结论</th><td>retrospective.md，五字段</td><td>最不确定处与改进各一句具体内容</td><td>指向 run-log / evaluation 证据</td><td>修订：补写具体结论后收尾</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="lesson-block" aria-labelledby="lesson-02-title">
          <h3 id="lesson-02-title">02 · 概念：单次模型调用 ≠ 完整 Agent</h3>
          <p class="lesson__core-statement">
            一次模型调用只是「文本进、文本出」；一个 Agent run 才是完整的学习对象。
          </p>
          <p>
            一次模型调用：输入提示、返回文本，没有目标、不调用工具、不会自行停止、也不评估结果。
            一个 Agent run 需要目标、输入/上下文、可执行步骤或工具、停止条件与评估，
            同一个 run 中可能包含多次模型调用。
          </p>

          <h4>八项差异对照表</h4>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>模型调用与 Agent Run 的八项差异</caption>
              <thead>
                <tr><th>维度</th><th>单次模型调用</th><th>一个 Agent Run</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">目标</th><td>无；只响应提示</td><td>有明确目标，目标决定成败</td></tr>
                <tr><th scope="row">状态</th><td>单次「文本进、文本出」</td><td>多阶段状态：输入 → 计划 → 执行 → 评估 → 记录</td></tr>
                <tr><th scope="row">步骤/工具</th><td>无步骤，不调用工具</td><td>可编排步骤，可调用工具</td></tr>
                <tr><th scope="row">停止条件</th><td>输出结束即停</td><td>有明确停止条件，达成才停</td></tr>
                <tr><th scope="row">输出</th><td>一段文本</td><td>结构化产物 + 评估结果</td></tr>
                <tr><th scope="row">评估</th><td>无内置评估</td><td>有评估环节，可判定成败</td></tr>
                <tr><th scope="row">失败恢复</th><td>重试或改写提示</td><td>记录失败、按边界重试或重跑</td></tr>
                <tr><th scope="row">可观测证据</th><td>只有输入与输出</td><td>有 run 记录：日志、决策、证据引用</td></tr>
              </tbody>
            </table>
          </div>

          <h4>八步最小闭环</h4>
          <ol class="lesson-loop" aria-label="Agent 最小闭环八步：目标、输入/上下文、计划、执行、工具/环境、输出、评估、记录">
            <li>1 目标</li>
            <li>2 输入/上下文</li>
            <li>3 计划</li>
            <li>4 执行</li>
            <li>5 工具/环境</li>
            <li>6 输出</li>
            <li>7 评估</li>
            <li>8 记录</li>
          </ol>
          <p class="lesson__loop-note">实际系统可循环：评估后可进入下一轮 run；本课固定执行一次 run。</p>

          <h4>五个边界问题</h4>
          <p>设计任何一个 run，先回答这五个问题：</p>
          <ul class="lesson-contract">
            <li><strong>谁定义目标？</strong>学习者——写进任务合约，作为成败标准。</li>
            <li><strong>谁提供事实？</strong>[S1]/[S2]——本课唯一事实来源，冻结后不得新增。</li>
            <li><strong>谁允许行动？</strong>任务合约的工具边界——仅读取本页内联资料。</li>
            <li><strong>何时停止？</strong>停止条件——三条区别、不超过 200 字、来源齐全，达成即停。</li>
            <li><strong>谁判断成功？</strong>10 分评估量表——逐项核对，8 分及以上才算完成。</li>
          </ul>

          <h4>非 Agent 与接近 Agent 的例子</h4>
          <ol>
            <li><span class="lesson-badge">非 Agent</span>把一句中文翻译成英文的单次调用：无目标、无工具、不评估，一次即停。</li>
            <li><span class="lesson-badge">接近但还不是</span>用一段很长的提示让模型「查资料并回答」：仍是单次调用，没有检索工具、没有停止条件、没有评估。</li>
            <li><span class="lesson-badge">是 Agent Run</span>研究助手 v0 完整 run：冻结输入 → 检索 [S1]/[S2] → 逐条核对来源 → 按量表评估 → 记录证据。</li>
          </ol>

          <h4>本课学习目标</h4>
          <ul>
            <li>能辨别「一次模型调用」与「一个 Agent run」</li>
            <li>能为研究助手 v0 写出八项任务合约</li>
            <li>能用 10 分评估量表评估一次 run 并记录结果</li>
          </ul>
        </section>

        <section class="lesson-block" aria-labelledby="lesson-03-title">
          <h3 id="lesson-03-title">03 · 拆解：一条可验证的 run 轨迹</h3>
          <p>下面是研究助手 v0 的一条静态 run 样例。每个字段右侧都写着「解决什么问题、缺失时会发生什么」——字段不是装饰，每一个都对应一类真实风险。</p>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>研究助手 v0 静态 run 样例：字段、取值与风险说明</caption>
              <thead>
                <tr><th>字段</th><th>本 run 的值</th><th>解决什么问题 · 缺失时会发生什么</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Run ID</th><td><code>run-2026-08-13-study-v0-01</code></td><td>让一次 run 可被唯一指认与回溯；缺失时无法区分多次 run，证据对不上。</td></tr>
                <tr><th scope="row">目标</th><td>只根据 [S1]/[S2] 说明「单次模型调用」与「一个 Agent Run」的三个关键区别，每条标注来源。</td><td>目标模糊时无人知道要交付什么，输出无法判定对错（目标模糊风险）。</td></tr>
                <tr><th scope="row">输入快照</th><td>[S1]/[S2] 摘录原文 + 研究问题原文，记录于 input-freeze.md，冻结时间 2026-08-13 10:20。</td><td>锁定事实来源、防止输入漂移；缺失时中途更换资料，结论无法复现（输入漂移风险）。</td></tr>
                <tr><th scope="row">步骤与决策</th><td><ol>
                  <li>读取冻结输入，确认问题与两份资料（决策：输入不变更）</li>
                  <li>从 [S1]/[S2] 提取三条区别候选（决策：只使用资料内事实）</li>
                  <li>逐条核对来源并标注（决策：引用不一致即修订）</li>
                  <li>核对停止条件后停止（决策：达标即停，不追加内容）</li>
                </ol></td><td>记录每一步决策让执行可复核；缺失时无法知道结论是怎么来的。</td></tr>
                <tr><th scope="row">工具边界</th><td>仅本页内联资料；无检索工具、无外部来源、无远程请求。</td><td>约束行动范围；缺失时可能引入资料外事实或远程请求（超出边界）。</td></tr>
                <tr><th scope="row">停止条件</th><td>三条区别均出自资料、每条标注来源、回答不超过 200 字、格式符合模板。</td><td>明确何时停；缺失时无限扩写、超时或超字数（无停止条件风险）。</td></tr>
                <tr><th scope="row">输出</th><td>三条编号区别，每条以「来源：[S1]/[S2]」结尾。</td><td>结构化交付物便于逐项核对；格式不一致时评估无从下手。</td></tr>
                <tr><th scope="row">评估</th><td>对照 10 分量表逐项核对，得分 8 分及以上判定完成；低于 8 分修订后重跑。</td><td>判定成败；无评估时「看起来正确」与「实际正确」不可区分（无评估风险）。</td></tr>
                <tr><th scope="row">证据引用</th><td>input-freeze.md 快照、run-log.md 步骤记录、evaluation.md 评分明细。</td><td>让复核者找到原始记录；无记录时任何结论都无法复核（无记录风险）。</td></tr>
              </tbody>
            </table>
          </div>

          <h4>「看起来回答正确但不可验证」</h4>
          <div class="lesson-sample">
            <span class="lesson-sample__label">失败样例</span>
            <p>「一次模型调用只是文本进文本出；Agent run 是完整执行，区别在于 Agent 更聪明。」</p>
            <p class="lesson-sample__why">看起来正确，但没有来源、没有约束、没有评估——无法核对，不可验证。</p>
          </div>
          <div class="lesson-sample lesson-sample--fixed">
            <span class="lesson-sample__label">改写样例（加入来源、约束、评估）</span>
            <p>区别一：单次模型调用输入提示、返回文本，本身无目标、无工具、无评估（来源：[S1]）。区别二：Agent run 由目标驱动，包含输入/上下文、可执行步骤或工具、停止条件与评估，可包含多次模型调用（来源：[S2]）。区别三：单次调用是 run 的组成单元，一次 run 才是可评估的完整对象（来源：[S1] [S2]）。约束：仅使用 [S1]/[S2]，不超过 200 字。评估：来源、字数、格式逐项核对通过。</p>
          </div>
        </section>

        <section class="lesson-block" aria-labelledby="lesson-04-title">
          <h3 id="lesson-04-title">04 · 设计：写出研究助手 v0 任务合约</h3>
          <p class="lesson__lab-note">
            本实验零网络、零账号、零 API key：只使用下方 [S1]/[S2] 两份资料，
            用本地文本文件完成一次 run，不发起任何远程请求。
          </p>

          <h4>研究问题</h4>
          <p>只根据 [S1]/[S2]，说明「单次模型调用」与「一个 Agent run」的三个关键区别。</p>

          <h4>来源约定（[S1]/[S2]）</h4>
          <ul>
            <li><code>[S1]</code> 资料一《模型调用》讲义摘录：模型调用等于输入提示、返回文本，本身无目标、无工具、无评估。</li>
            <li><code>[S2]</code> 资料二《Agent Run》讲义摘录：run 由目标驱动，包含输入/上下文、可执行步骤或工具、停止条件与评估，可包含多次模型调用。</li>
          </ul>

          <h4>八项任务合约模板</h4>
          <p>复制下面的 run-contract.md 模板，逐项填写后再开始实验。八项缺一不可：</p>
          <pre><code># run-contract.md — 研究助手 v0 任务合约
- 任务：只根据 [S1]/[S2] 回答研究问题，给出三条带来源标注的区别。
- 目标：判定成败的唯一标准，可观察、可核对。
- 输入：[S1]/[S2] 摘录原文 + 研究问题原文（冻结于 input-freeze.md）。
- 约束：零网络、零账号、零 API key；不使用资料外外部事实；回答不超过 200 字。
- 工具边界：仅读取本页内联资料；无检索、无远程调用。
- 停止条件：三条区别、每条标注来源、字数达标、格式符合模板，即停止。
- 输出格式：三条编号区别，每条以「来源：[S1]/[S2]」结尾。
- 成功标准：三条均出自资料、来源标注齐全、可被 10 分量表逐项核对。</code></pre>

          <h4>输出格式示例</h4>
          <pre><code>输出格式示例：
1. 区别一……（来源：[S1]）
2. 区别二……（来源：[S2]）
3. 区别三……（来源：[S1]）</code></pre>
        </section>

        <section class="lesson-block" aria-labelledby="lesson-05-title">
          <h3 id="lesson-05-title">05 · 实验：五阶段本地 run</h3>
          <p>三步速览：<strong>冻结输入：</strong>把 [S1]/[S2] 摘录与研究问题抄进 input-freeze.md，锁定本次 run 的输入。<strong>执行一次：</strong>按任务合约只读地做一次回答，不调用任何远程 API。<strong>评估并记录：</strong>用下方 10 分量表逐项核对，记录评估结果与最终答案。</p>
          <p>展开成五阶段，每阶段都有动作、检查点、产物与常见错误：</p>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>五阶段实验：动作、检查点、产物与常见错误</caption>
              <thead>
                <tr><th>阶段</th><th>动作</th><th>检查点</th><th>产物</th><th>常见错误</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">准备</th><td>按八项模板填写任务合约</td><td>八项全部填写；目标可观察；停止条件可判定</td><td>run-contract.md</td><td>照抄模板不填具体值；目标写成口号</td></tr>
                <tr><th scope="row">冻结</th><td>抄录 [S1]/[S2] 摘录与研究问题原文，记录冻结时间</td><td>输入与页面 [S1]/[S2] 一字不差；冻结后不再增删</td><td>input-freeze.md</td><td>边写边想「再查点资料」——输入漂移</td></tr>
                <tr><th scope="row">执行</th><td>按合约只读执行一次，记录步骤、决策与输出快照</td><td>每个决策可追溯；无外部事实；达成停止条件即停</td><td>run-log.md</td><td>一次 run 内多次改输入；超字数仍继续</td></tr>
                <tr><th scope="row">评估</th><td>用 10 分量表逐项核对，写清每项判定依据与得分</td><td>每项有通过/不通过理由；总分与各项一致</td><td>evaluation.md</td><td>全打勾不给依据；「整体不错」式评估</td></tr>
                <tr><th scope="row">复盘</th><td>填五字段模板，写最不确定处、一次失败或边界、证据与改进</td><td>结论具体、指向证据；改进可执行</td><td>retrospective.md</td><td>口号式复盘；不指向证据</td></tr>
              </tbody>
            </table>
          </div>

          <h4>本地模板（可直接复制；run-contract.md 见「04 · 设计」）</h4>
          <pre><code># input-freeze.md — 输入冻结记录
- 冻结时间：____年__月__日 __:__
- 研究问题原文：（抄写）
- [S1] 摘录原文：（抄写）
- [S2] 摘录原文：（抄写）
- 冻结承诺：本次 run 不新增、不更换任何输入资料。</code></pre>
          <pre><code># run-log.md — 执行记录
- Run ID：run-____（与 run-contract.md 一致）
- 步骤 1：____（决策：____）
- 步骤 2：____（决策：____）
- 步骤 3：____（决策：____）
- 输出快照：（粘贴最终回答）
- 停止条件核对：____（是否达成）</code></pre>
          <pre><code># evaluation.md — 评估表
- 目标清晰（1 分）：____ 通过 / 不通过
- 输入冻结（1 分）：____ 通过 / 不通过
- 来源完整（2 分）：____ / 2
- 约束遵守（1 分）：____ 通过 / 不通过
- 输出结构（1 分）：____ 通过 / 不通过
- 停止条件（1 分）：____ 通过 / 不通过
- 证据记录（1 分）：____ 通过 / 不通过
- 复盘具体（1 分）：____ 通过 / 不通过
- 总分：____ 分（8 分及以上才算完成）</code></pre>
          <pre><code># retrospective.md — 复盘结论
- 本次目标：____
- 最不确定处：____
- 一次失败或边界：____
- 证据（指向 run-log / evaluation 记录）：____
- 下一步改进：____</code></pre>
        </section>

        <section class="lesson-block" aria-labelledby="lesson-06-title">
          <h3 id="lesson-06-title">06 · 评估：量表、失败样例与自测</h3>

          <h4>四类故意失败样例</h4>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>四类故意失败样例与修复提示</caption>
              <thead>
                <tr><th>样例</th><th>问题</th><th>修复提示</th></tr>
              </thead>
              <tbody>
                <tr><td>「Agent 就是会自己思考的程序。」</td><td>无来源——结论无法核对</td><td>补标注「来源：[S1]」并核对原文</td></tr>
                <tr><td>「根据维基百科，Agent 是……」</td><td>超出边界——引入资料外外部事实</td><td>删除外部事实，只使用 [S1]/[S2]</td></tr>
                <tr><td>「区别还能补充：第四点、第五点……」</td><td>无停止条件——无限扩写</td><td>合约写明三条即停、不超过 200 字，达成即停</td></tr>
                <tr><td>「输出完了，没有评估记录。」</td><td>无评估记录——成败无人判定</td><td>用 10 分量表逐项核对并写入 evaluation.md</td></tr>
              </tbody>
            </table>
          </div>

          <h4>10 分评估量表</h4>
          <p>逐项检查并写下判定依据；8 分及以上才算完成，低于 8 分必须重跑或修订（修订 = 改合约后重做评估；重跑 = 修正输入后从冻结阶段重来）。</p>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>10 分评估量表：逐项检查问题与通过/不通过判定依据</caption>
              <thead>
                <tr><th>项</th><th>分值</th><th>检查问题</th><th>通过/不通过判定依据</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">目标清晰</th><td>1 分</td><td>合约是否写明了「只根据 [S1]/[S2] 回答研究问题」这一可判定的目标？</td><td>目标含对象、范围与可观察结果 → 通过；只写「回答问题」→ 不通过</td></tr>
                <tr><th scope="row">输入冻结</th><td>1 分</td><td>input-freeze.md 是否记录了 [S1]/[S2] 摘录原文、研究问题原文与冻结时间？</td><td>输入可完整复现 → 通过；执行中新增或更换资料 → 不通过</td></tr>
                <tr><th scope="row">来源完整</th><td>2 分</td><td>每条结论是否标注了 [S1] 或 [S2]，且与原文一致？</td><td>全部标注且引用一致 → 2 分；部分标注 → 1 分；无标注 → 0 分</td></tr>
                <tr><th scope="row">约束遵守</th><td>1 分</td><td>是否出现资料外的外部事实、远程请求或 API key 使用？</td><td>全部内容来自 [S1]/[S2] → 通过；出现外部事实 → 不通过</td></tr>
                <tr><th scope="row">输出结构</th><td>1 分</td><td>是否按模板输出三条编号区别、每条以「来源：[S…]」结尾且不超过 200 字？</td><td>完全符合 → 通过；缺编号或缺来源尾注 → 不通过</td></tr>
                <tr><th scope="row">停止条件</th><td>1 分</td><td>合约是否写明停止条件，执行是否在达成后停止？</td><td>条件明确且执行中达成即停 → 通过；无条件或继续扩写 → 不通过</td></tr>
                <tr><th scope="row">证据记录</th><td>1 分</td><td>run-log.md 是否记录了步骤、决策与输出快照？</td><td>记录完整、可复核 → 通过；无记录或仅一句总结 → 不通过</td></tr>
                <tr><th scope="row">复盘具体</th><td>1 分</td><td>复盘是否写了最不确定处与下一步改进，而非「整体不错」？</td><td>具体、指向证据、可执行 → 通过；口号式 → 不通过</td></tr>
              </tbody>
            </table>
          </div>

          <h4>四道自测题（参考答案区，直接可读）</h4>
          <div class="lesson-table-wrap">
            <table class="lesson-table">
              <caption>自测题与参考答案</caption>
              <thead>
                <tr><th>问题</th><th>参考答案</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">为什么一次调用不是 Agent？</th><td>单次调用无目标、无工具、无停止条件、无评估（[S1]），缺少 run 的最小要素，无法被判定成败。</td></tr>
                <tr><th scope="row">输入冻结解决什么风险？</th><td>防止输入漂移：中途更换资料会让结论无法复现、评估失去参照。</td></tr>
                <tr><th scope="row">没有评估会怎样？</th><td>无法判断输出是否成功，「看起来正确」与「实际正确」不可区分，run 不可验证。</td></tr>
                <tr><th scope="row">何时应该停止？</th><td>达到合约写明的停止条件（三条区别、不超过 200 字、来源标注齐全）即停；条件未达仍继续输出就是失控。</td></tr>
              </tbody>
            </table>
          </div>

          <h4>复盘模板</h4>
          <p>评估通过后再花五分钟复盘，五字段见 retrospective.md 模板（实验区）：本次目标、最不确定处、一次失败或边界、证据、下一步改进。</p>

          <p class="lesson__next">
            下一课：接入第一个 Tool —— 为研究助手声明第一个可验证的工具调用。
            本页面仅完成第一课，预告不指向任何虚构页面或后端能力。
          </p>
        </section>
      </div>
    </section>`

// builder/advanced 课程占位：内容筹备中 + 返回主页链接 + 静态空锚点 span（AC-FE-005）。
const lessonPlaceholderMarkup = `
    <div class="lesson-placeholder container">
      <p class="section-kicker">内容筹备中</p>
      <h2 class="section-title">该路线课程内容筹备中</h2>
      <p class="lesson-placeholder__lead">本路线课程内容正在筹备中，敬请期待。</p>
      <a class="btn btn--primary" href="#/">返回主页</a>
      <span class="first-lesson-anchor" id="first-lesson-builder"></span>
      <span class="first-lesson-anchor" id="first-lesson-advanced"></span>
    </div>`

// ── 能力地图：六类能力（REQ-AGENT-003） ──

const capabilityMarkup = capabilities
  .map(
    (capability) => `
      <li class="capability-card">
        <h3 class="capability-card__title">${capability.title}</h3>
        <p class="capability-card__desc">${capability.desc}</p>
      </li>`,
  )
  .join('')

const capabilityMapSectionMarkup = `
    <section class="capability-map container" id="capability-map">
      <p class="section-kicker">能力地图</p>
      <h2 class="section-title">六类能力，从可控到可验证</h2>
      <ul class="capability-grid">${capabilityMarkup}</ul>
    </section>`

// ── 本周实验（REQ-AGENT-005） ──

const weeklyLabFacts = [
  `目标：${weeklyLab.goal}`,
  `输入：${weeklyLab.input}`,
  `工具：${weeklyLab.tools}`,
  `成功标准：${weeklyLab.criteria}`,
  `时长：${weeklyLab.duration}`,
]

const weeklyLabSectionMarkup = `
    <section class="weekly-lab container" id="weekly-lab">
      <p class="section-kicker">本周实验</p>
      <h2 class="section-title">本周实验：研究助手</h2>
      <ul class="weekly-lab__facts">
        ${weeklyLabFacts.map((fact) => `<li class="weekly-lab__fact">${fact}</li>`).join('')}
      </ul>
      <p class="weekly-lab__hint">做完第一课即可开始；每一步都用可验证的结果说话。</p>
    </section>`

// ── 共享服务降级横幅：所有页面经 render() 统一按 contentLoadFailed 显示（AC-FE-003） ──

const serviceBannerMarkup = `
      <p class="service-banner" id="service-unavailable" hidden>服务不可用：课程内容以本地缓存展示，进度保存暂不可用</p>`

// ── 页脚 ──

const footerMarkup = `
  <footer class="site-footer">
    <div class="container">
      <p>Agent 学习实验室 · 课程数据静态内联于前端源码，进度保存经后端 API 同步</p>
    </div>
  </footer>`

// ── 主页：初始路线 tab 静态字面量，默认「入门」为唯一 aria-pressed=true（AC-AGENT-002）。
//     运行时点击经 navigate(`#/lesson/${routeId}`) 进入对应课程页（AC-FE-002）。 ──

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

const routeDetailMarkup = `
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
        <a class="btn btn--primary route-detail__cta" id="first-lesson-link" href="#/lesson/beginner">开始入门路线 · 第一课：让一个模型调用跑起来</a>
      </section>`

// ── 登录页（AC-FE-007/008） ──

const loginPageMarkup = `
    <section class="login-panel container" id="login-panel" aria-labelledby="login-title">
      <p class="section-kicker">账号</p>
      <h2 class="section-title" id="login-title">登录 · 注册</h2>
      ${serviceBannerMarkup}
      <form class="auth-form" id="auth-form">
        <p class="auth-form__hint">登录后可在不同设备恢复你的进度（演示环境，无邮箱验证）。</p>
        <label class="auth-form__field">
          <span>用户名</span>
          <input type="text" id="auth-username" name="username" autocomplete="username" required />
        </label>
        <label class="auth-form__field">
          <span>密码</span>
          <input type="password" id="auth-password" name="password" autocomplete="current-password" required />
        </label>
        <div class="auth-form__actions">
          <button type="submit" class="btn btn--primary" id="auth-submit-login">登录</button>
          <button type="button" class="btn btn--secondary" id="auth-toggle">注册</button>
        </div>
        <p class="auth-form__error" id="auth-error" hidden></p>
      </form>
    </section>`

// ── 进度页：未登录 guest 提示（BR-RT-005） / 已登录进度表单 ──

const guestProgressMarkup = `
    <section class="progress-panel container" id="progress-panel" aria-labelledby="progress-title">
      <p class="section-kicker">学习进度</p>
      <h2 class="section-title" id="progress-title">保存你的学习进度</h2>
      ${serviceBannerMarkup}
      <div class="progress-guest" id="progress-guest">
        <p class="progress-guest__lead">请先登录后再查看与保存你的学习进度。</p>
        <a class="btn btn--primary" href="#/login">前往登录</a>
      </div>
    </section>`

const loggedInProgressMarkup = `
    <section class="progress-panel container" id="progress-panel" aria-labelledby="progress-title">
      <p class="section-kicker">学习进度</p>
      <h2 class="section-title" id="progress-title">保存你的学习进度</h2>
      ${serviceBannerMarkup}
      <div id="progress-panel-body">
        <form class="progress-form" id="progress-form">
          <p class="progress-form__who">登录用户：<strong id="progress-username"></strong></p>
          <label class="progress-form__field">
            <input type="checkbox" id="progress-first-lesson" />
            <span>第一课完成</span>
          </label>
          <label class="progress-form__field">
            <span>第一课评估分（0–10，可空）</span>
            <input type="number" id="progress-score" min="0" max="10" step="1" />
          </label>
          <label class="progress-form__field">
            <input type="checkbox" id="progress-lab" />
            <span>本周实验完成</span>
          </label>
          <div class="progress-form__actions">
            <button type="submit" class="btn btn--primary" id="progress-save">保存进度</button>
            <button type="button" class="btn btn--secondary" id="progress-logout">退出登录</button>
          </div>
          <p class="progress-form__status" id="progress-status" aria-live="polite"></p>
        </form>
      </div>
    </section>`

// ── 404 兜底页（AC-FE-010 / BR-RT-001）：地址栏保留用户输入，不自动重定向 ──

const notFoundMarkup = `
    <section class="not-found container" id="not-found" aria-labelledby="not-found-title">
      <p class="section-kicker">404</p>
      <h2 class="section-title" id="not-found-title">页面不存在</h2>
      <p class="not-found__lead">你访问的地址不存在或已失效。</p>
      <a class="btn btn--primary" href="#/">返回主页</a>
    </section>`

// ── 主导航：主页/课程/进度/登录四入口（AC-FE-001 / BR-RT-003），
//     当前路由对应项 is-active；404 无对应导航高亮。 ──

interface NavItem {
  hash: string
  label: string
  page: PageName
}

const navItems: NavItem[] = [
  { hash: '#/', label: '主页', page: 'home' },
  { hash: '#/lesson/beginner', label: '课程', page: 'lesson' },
  { hash: '#/progress', label: '进度', page: 'progress' },
  { hash: '#/login', label: '登录', page: 'login' },
]

function siteHeaderMarkup(parsed: ParsedRoute): string {
  return `
  <header class="site-header">
    <div class="container site-header__inner">
      <p class="site-header__brand">
        <span class="site-header__dot" aria-hidden="true"></span>Agent 学习实验室
      </p>
      <nav class="site-header__nav" aria-label="主导航">
        ${navItems
          .map((item) => {
            const active = item.page === parsed.page
            return `<a class="site-header__link${active ? ' is-active' : ''}" href="${item.hash}"${active ? ' aria-current="page"' : ''}>${item.label}</a>`
          })
          .join('')}
      </nav>
    </div>
  </header>`
}

// ── 页面组合 ──

function homePageMarkup(): string {
  return `
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
            <a class="btn btn--primary" id="hero-first-lesson-link" href="#/lesson/beginner">开始入门路线 · 第一课</a>
            <a class="btn btn--secondary" id="hero-capability-link" href="#/">查看能力地图</a>
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
      ${routeDetailMarkup}
    </section>

    ${serviceBannerMarkup}

    ${capabilityMapSectionMarkup}

    ${weeklyLabSectionMarkup}`
}

function lessonPageMarkup(routeId: RouteId): string {
  if (routeId === 'builder' || routeId === 'advanced') {
    return lessonPlaceholderMarkup
  }
  return `${lessonSectionMarkup}
    ${serviceBannerMarkup}`
}

function progressPageMarkup(): string {
  return `${currentSession ? loggedInProgressMarkup : guestProgressMarkup}
    <div id="journal-workbench-mount"></div>`
}

function pageMainMarkup(parsed: ParsedRoute): string {
  switch (parsed.page) {
    case 'home':
      return homePageMarkup()
    case 'lesson':
      return lessonPageMarkup(parsed.routeId as RouteId)
    case 'progress':
      return progressPageMarkup()
    case 'login':
      return loginPageMarkup
    case 'not-found':
      return notFoundMarkup
  }
}

// ── 模块级跨页状态（AC-FE-011 / BR-RT-006/007）：登录态、服务端内容缓存与降级标志 ──

let currentCapabilities = capabilities
let currentLab = weeklyLab
let cachedContent: { lesson: LessonData } | null = null
let contentLoadFailed = false
let currentSession = loadSession()
let authMode: 'login' | 'register' = 'login'
let workbenchMount: HTMLElement | null = null
let serviceBanner: HTMLElement | null = null
let authErrorEl: HTMLElement | null = null

const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) throw new Error('缺少 #app 挂载点')
const app: HTMLDivElement = appRoot

// ── 渲染：按 parseHash 分派到四个页面与 404 兜底（vt-router-dispatch） ──

function render(): void {
  const parsed = parseHash(window.location.hash)
  if (parsed.page === 'login' && currentSession) {
    // 已登录访问 #/login：自动前往进度页，不白屏、不刷新（BR-RT-004 / AC-FE-008）
    navigate('#/progress')
    return
  }
  app.innerHTML = `${siteHeaderMarkup(parsed)}
  <main id="main">
${pageMainMarkup(parsed)}
  </main>
${footerMarkup}`
  serviceBanner = document.getElementById('service-unavailable')
  applyServiceBanner()
  if (parsed.page === 'home') {
    renderCapabilities(currentCapabilities)
    renderWeeklyLab(currentLab)
    wireRouteTabs()
  } else if (parsed.page === 'lesson') {
    renderLesson(parsed.routeId as RouteId)
  } else if (parsed.page === 'progress') {
    wireProgressPage()
    mountJournalWorkbench()
  } else if (parsed.page === 'login') {
    wireLoginPage()
  }
}

/** 横幅按模块级 contentLoadFailed 统一显示/隐藏（AC-FE-003 / vt-banner-cache）。 */
function applyServiceBanner(): void {
  if (!serviceBanner) return
  if (contentLoadFailed) {
    serviceBanner.hidden = false
  } else {
    serviceBanner.hidden = true
  }
}

// ── 服务端内容：成功缓存并经同一 getElementById 替换路径；失败仅显示横幅（BR-RT-006） ──

interface LoadedContent {
  capabilities: CapabilityData[]
  lab: LabData
  lesson: LessonData
}

function applyLessonContent(): void {
  const section = document.getElementById('first-lesson-beginner')
  if (section && cachedContent && cachedContent.lesson.html) {
    section.innerHTML = cachedContent.lesson.html
  }
}

function renderLesson(routeId: RouteId): void {
  if (routeId !== 'beginner') return
  applyLessonContent()
}

function applyCourseContent(content: LoadedContent): void {
  currentCapabilities = content.capabilities
  currentLab = content.lab
  cachedContent = { lesson: content.lesson }
  contentLoadFailed = false
  applyLessonContent()
  render()
}

async function loadServerContent(): Promise<boolean> {
  try {
    const content = await loadCourseContent()
    applyCourseContent({
      capabilities: content.capabilities,
      lab: content.lab,
      lesson: content.lesson,
    })
    return true
  } catch {
    contentLoadFailed = true
    cachedContent = null
    render()
    return false
  }
}

function renderCapabilities(items: CapabilityData[]): void {
  const list = document.querySelector<HTMLUListElement>('.capability-grid')
  if (!list) return
  list.innerHTML = items
    .map(
      (item) => `
      <li class="capability-card">
        <h3 class="capability-card__title">${item.title}</h3>
        <p class="capability-card__desc">${item.desc}</p>
      </li>`,
    )
    .join('')
}

function renderWeeklyLab(lab: LabData): void {
  const list = document.querySelector<HTMLUListElement>('.weekly-lab__facts')
  if (!list) return
  list.innerHTML = [
    `目标：${lab.goal}`,
    `输入：${lab.input}`,
    `工具：${lab.tools}`,
    `成功标准：${lab.criteria}`,
    `时长：${lab.duration}`,
  ]
    .map((fact) => `<li class="weekly-lab__fact">${fact}</li>`)
    .join('')
}

// ── 主页交互：路线 tab 点击 navigate 到对应课程页（AC-FE-002 / route-tab-click） ──

function wireRouteTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('.route-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const routeId = btn.dataset.route
      if (routeId) navigate(`#/lesson/${routeId}`)
    })
  })
}

// ── 登录页交互（AC-FE-007 / auth-submit / auth-toggle / login-error） ──

function showAuthError(message: string): void {
  if (authErrorEl) {
    authErrorEl.textContent = message
    authErrorEl.hidden = false
  }
}

function clearAuthError(): void {
  if (authErrorEl) {
    authErrorEl.hidden = true
    authErrorEl.textContent = ''
  }
}

function wireLoginPage(): void {
  const authFormEl = document.getElementById('auth-form') as HTMLFormElement | null
  const usernameInput = document.getElementById('auth-username') as HTMLInputElement | null
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement | null
  const authSubmitBtn = document.getElementById('auth-submit-login') as HTMLButtonElement | null
  const authToggleBtn = document.getElementById('auth-toggle') as HTMLButtonElement | null
  authErrorEl = document.getElementById('auth-error')

  if (authSubmitBtn) {
    authSubmitBtn.textContent = authMode === 'login' ? '登录' : '注册'
  }
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', () => {
      authMode = authMode === 'login' ? 'register' : 'login'
      if (authSubmitBtn) {
        authSubmitBtn.textContent = authMode === 'login' ? '登录' : '注册'
      }
      clearAuthError()
    })
  }
  if (authFormEl) {
    authFormEl.addEventListener('submit', (event) => {
      event.preventDefault()
      if (!usernameInput || !passwordInput) return
      const username = usernameInput.value.trim()
      const password = passwordInput.value
      clearAuthError()
      const attempt =
        authMode === 'login' ? login(username, password) : register(username, password)
      void attempt.then(
        (session) => {
          enterLoggedIn(session.username, session.token)
        },
        (err: Error) => {
          showAuthError(err.message)
        },
      )
    })
  }
}

// ── 登录态：saveSession/clearSession 收敛于 src/auth.ts；路由切换不调用（AC-FE-011） ──

function enterLoggedIn(username: string, token: string): void {
  currentSession = { token, username }
  saveSession(currentSession)
  setJournalSession(currentSession)
  render()
}

function enterLoggedOut(): void {
  currentSession = null
  clearSession()
  setJournalSession(null)
  render()
}

// ── 进度页交互（AC-FE-009 / progress-save / progress-logout） ──

function wireProgressPage(): void {
  if (!currentSession) return
  const progressUsernameEl = document.getElementById('progress-username')
  if (progressUsernameEl) {
    progressUsernameEl.textContent = currentSession.username
  }
  const firstLessonChk = document.getElementById('progress-first-lesson') as HTMLInputElement | null
  const scoreInput = document.getElementById('progress-score') as HTMLInputElement | null
  const labChk = document.getElementById('progress-lab') as HTMLInputElement | null
  const progressFormEl = document.getElementById('progress-form') as HTMLFormElement | null
  const progressLogoutBtn = document.getElementById('progress-logout') as HTMLButtonElement | null
  const progressStatusEl = document.getElementById('progress-status')

  function setProgressStatus(message: string): void {
    if (progressStatusEl) progressStatusEl.textContent = message
  }

  async function refreshProgress(): Promise<void> {
    if (!currentSession || !firstLessonChk || !scoreInput || !labChk) return
    try {
      const progress = await getProgress(currentSession.token)
      firstLessonChk.checked = progress.firstLessonCompleted
      scoreInput.value =
        progress.evaluationScore === null ? '' : String(progress.evaluationScore)
      labChk.checked = progress.weeklyLabCompleted
      if (progress.updatedAt) {
        setProgressStatus(`最近保存：${new Date(progress.updatedAt).toLocaleString()}`)
      }
    } catch {
      setProgressStatus('无法读取服务端进度')
    }
  }

  async function saveProgress(): Promise<void> {
    if (!currentSession || !firstLessonChk || !scoreInput || !labChk) return
    const raw = scoreInput.value
    const score = raw === '' ? null : Number(raw)
    setProgressStatus('保存中…')
    try {
      const progress = await putProgress(currentSession.token, {
        firstLessonCompleted: firstLessonChk.checked,
        evaluationScore: score,
        weeklyLabCompleted: labChk.checked,
      })
      if (scoreInput) {
        scoreInput.value =
          progress.evaluationScore === null ? '' : String(progress.evaluationScore)
      }
      if (progress.updatedAt) {
        setProgressStatus(`已保存：${new Date(progress.updatedAt).toLocaleString()}`)
      } else {
        setProgressStatus('已保存')
      }
    } catch {
      setProgressStatus('保存失败，已保留当前填写内容')
    }
  }

  if (progressFormEl) {
    progressFormEl.addEventListener('submit', (event) => {
      event.preventDefault()
      void saveProgress()
    })
  }
  if (progressLogoutBtn) {
    progressLogoutBtn.addEventListener('click', () => {
      enterLoggedOut()
    })
  }
  void refreshProgress()
}

// ── 学习会话工作台：位于 progress-panel 之后；仅初始化一次，切页复用节点（BR-RT-002/007） ──

function mountJournalWorkbench(): void {
  const host = document.getElementById('journal-workbench-mount')
  if (!host) return
  if (workbenchMount) {
    // 复用：同一工作台节点迁回新挂载点，不重复 initJournalWorkbench、不累积 setInterval
    host.replaceChildren(workbenchMount)
    return
  }
  initJournalWorkbench(host)
  workbenchMount = document.getElementById('journal-workbench')
}

// ── 启动：注册唯一 hashchange 监听并完成首次渲染分派；随后后台拉取服务端内容 ──

startRouter(() => render())
void loadServerContent()
