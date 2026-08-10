# Frontend Design And Component Specification

## Required Source Sequence

Knowledge base, OpenSpec, and `ai_workspace/` are parallel specification sources:

1. Attempt the configured component/design knowledge-base query first when a
   connector is available in the execution environment.
2. Regardless of knowledge-base success, failure, timeout, no match, or no
   configuration, also recursively search `openspec/schemas/`,
   `openspec/project-specs/`, and `ai_workspace/` for index files and relevant content.
3. Treat relevant matches from both sources as the current project's
   specification for this run.
4. Only then use component source, tokens, stories, tests, and pages as
   non-normative repository fallback.

Never skip local OpenSpec or `ai_workspace/` sources for neighboring-code
conventions, even when a knowledge-base query returned results. Report source
conflicts instead of combining them. Explicit task requirements remain the
contract; flag conflicts with knowledge-base or openspec specification rules.

## Knowledge Base Connection — TODO

Request format is undecided. TODO: define connector/owner, namespaces, secret-free
auth, query fields, result identity/version/time, and failure behavior.

Attempt only a connector actually available in the execution environment. Otherwise
record `not-configured` and run the openspec fallback; never invent a connection.

## openspec Fallback Procedure

- Inspect `<repoRoot>/openspec/schemas/`, `<repoRoot>/openspec/project-specs/`,
  and `<repoRoot>/ai_workspace/` when present; enumerate supported files recursively.
- Read indexes first, then search names/content using task, route, component,
  interaction, theme, token, and state terms.
- Read relevant matches in context; do not treat a filename-only hit as a rule.
- Record search terms, inspected/matched paths, headings or tight line ranges,
  applied rules, and conflicts.
- If both directories or relevant rules are absent, record that fact before using
  repository fallback.

## Retrieval Evidence

Record source as `knowledge-base`, `openspec fallback`, `repository fallback`, or
`unavailable`. Knowledge-base evidence includes query, source ID/version/time, rules,
and conflicts. `openspec fallback` includes terms, paths/headings/lines, rules, and conflicts.

## Rules To Retrieve Or Discover

- Components, variants, props, composition, accessibility, deprecations, placement, forms, overlays, navigation, and state patterns.
- Tokens, typography, color, layout, breakpoints, motion, focus/keyboard/contrast, exceptions, design debt, and forbidden patterns.

## Gate Expectations

- Reuse confirmed primitives unless a new pattern is authorized.
- Define applicable states and responsive behavior before implementation.
- Cite knowledge-base or openspec specification evidence for component/token
  choices; label weaker repository fallback.
- Make deviations and unresolved gaps explicit.
