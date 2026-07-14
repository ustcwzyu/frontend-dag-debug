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
4. Runtime state belongs in `.harness/`; durable decisions belong in `docs/`.
5. Model writer nodes must be bounded by explicit allowed and forbidden paths.
6. Advisory model output must be followed by deterministic verification.
7. Repeated constraints should become docs, tests, scripts, checks, or templates.
8. Do not keep hidden process state only in chat.
9. Do not add placeholders as completed implementation.
10. Prefer existing local project patterns before adding new abstractions.

## Target Project Adaptation

The initialized scripts provide language-neutral governance. The initialization model should adapt project-specific verification commands after reading the target project's actual files and toolchain.
