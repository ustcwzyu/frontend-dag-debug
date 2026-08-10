# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## 使用说明（optional but recommended）

- CONTEXT.md is a glossary and nothing else.
- Do not store implementation details, draft specs, plan status, or architecture decisions.

## 术语 / Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

Prefer the target repository's existing heading style（本仓库使用「术语」与 `_避免_`）。

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_` / `_避免_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Glossary only.** No implementation details, specs, plan status, or ADRs.
- **Only include terms specific to this project's context.** General programming concepts do not belong.
- **Group terms under subheadings** when natural clusters emerge.

## Single vs multi-context repos

**Single context (most repos):** One `CONTEXT.md` at the repo root.

**Multiple contexts:** A `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate.

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find contexts
- If only a root `CONTEXT.md` exists, single context
- If neither exists, propose a root `CONTEXT.md` lazily when the first term is resolved — create only when write permission exists

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.

## Write boundary

Only edit `CONTEXT.md` when current task `allowedPaths` / DAG `writeSet` allow it. Otherwise return a suggested patch.
