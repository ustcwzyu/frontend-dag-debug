# Development Principles

`frontend-dag-debug` uses loop-agent governed development. These principles apply regardless of language, framework, or deployment model.

## Operating Stance

- The repository is the record system. Decisions, contracts, plans, tests, reports, and handoffs belong in tracked files.
- Work advances in small, reversible, verifiable increments.
- Baseline verification comes before new work when the current state is uncertain.
- Completion is defined by fresh evidence, not by intent or confidence.
- Preserve unrelated user changes.

## Principles

1. One task advances one bounded work block.
2. Search existing code, docs, scripts, and tests before designing new behavior.
3. Shell verification is the completion authority.
4. Runtime state belongs in `.harness/`; durable decisions belong in `ai_workspace/loop-agent/`.
5. Model writer nodes must be bounded by explicit allowed and forbidden paths.
6. Advisory model output must be followed by deterministic verification.
7. Repeated constraints should become docs, tests, scripts, checks, or templates.
8. Do not keep hidden process state only in chat.
9. Do not add placeholders as completed implementation.
10. Prefer existing local project patterns before adding new abstractions.

## Task Slicing: Vertical Tracer Bullets First

Principle 1 covers **granularity** (one bounded block). This section covers **shape**: each slice should cross the real integration layers the work needs and leave an independently verifiable narrow loop.

- Every slice needs its own acceptance criteria, verification commands, and failure conditions.
- Prefer vertical tracer bullets over horizontal layering. Paths like "schema → API → UI → tests" are *possible* examples only; do not assume every project has those layers.
- Horizontal anti-patterns: finish all of one layer before the next; or write every test first, then implement everything.
- For behavior changes, use one failing test → minimal implementation → green → next behavior. Do not batch all RED then all GREEN.
- Split large features into multiple independently runnable tasks/DAGs instead of one oversized writer across every layer.

### Autonomy vs Governance (independent layers)

| Dimension | Meaning | How to decide |
|---|---|---|
| Autonomy | Whether the slice needs synchronous human judgment, external access, or non-automatable decisions | Declare AFK/HITL in Contract, open questions, or human gate signals |
| Governance | How strong review, repair, write-set, and verification gates must be | Default `--profile auto`; route to `minimal` / `standard` / `reviewed` / `supervised` by risk and delivery signals |

- AFK does not mean `minimal` is required; ordinary automatable work may land on `standard` or `reviewed`.
- HITL does not mean choosing `supervised` alone yields a correct human decision; require a concrete pause reason / decision gate.
- Use `minimal` only for a single narrow writer, deterministic post shell verification, and no escalation signals.
- High-risk, public-contract, init/runtime/CI/governance surface, or real human judgment gates should escalate via `auto`, or explicitly choose `reviewed` / `supervised`.

## Target Project Adaptation

The initialized scripts provide language-neutral governance. The initialization model should adapt project-specific verification commands after reading the target project's actual files and toolchain.

Repo-local skills live under `.agents/skills/` (mirrored from the package `skills/` fallback).
