# Frontend Code Standards

Discover rules from task constraints, `design-spec.md` source order, config, code,
tests, manifests, and generated types. Regardless of knowledge-base results,
applicable `openspec/schemas/`, `openspec/project-specs/`, and `ai_workspace/` rules are normative.
Preferences are not rules, and docs do not override installed APIs without an
explicit compatibility decision.

## Discover And Cite

- Find routing and server/client boundaries; state, forms, data/cache, and errors;
  API/mock/UI/schema/test locations and naming; supported tests; dependency rules.

Cite representative files/config for each convention. Describe conflicts instead of
silently selecting one.

## Plan And Implement

- Map criteria to code and checks. Define placement, state ownership, request
  lifecycle, validation/failures, API compatibility, mocks, and fixtures.
- Trace fixtures to API evidence; label gaps. Prefer native mocks, then browser
  interception for existing e2e, then a reversible request adapter/DI preview seam.
- Real API stays default; mock activation is explicit, local/test-only,
  non-production, and removable.
- Reuse helpers/public APIs and preserve out-of-contract behavior. Keep rendering,
  transitions, validation, and side effects testable; cover lifecycle races/bounds
  when relevant. Update supported tests; stay in `writeSet`.

## Prohibited

- Do not relax checks, add unapproved dependencies, comment real requests, hardcode
  fixtures in production UI, import test mocks into production, store fixture
  secrets, equate mock evidence with real integration, or report unrun checks as verified.
