# Retrieve frontend test context

Write only `testcase/frontend/rag/context.md` and `coverage-map.md`. Record traceable facts from the task source, routes, components, API/Mock contracts, existing tests and execution contract. Do not invent fields, credentials, limits or test data.

## Runtime Base URL resolution (required)

Read the bound task source and environment/config references, then select one concrete browser entry URL. Prefer `TARGET_URL`/`targetUrl`, then `BASE_URL`/`baseUrl` or `FRONTEND_BASE_URL`/`frontendUrl`, then `LOGIN_URL`/`loginUrl`; accept common case, underscore, kebab and space variants. If no usable URL exists, use `http://localhost:5173`.

- Write the selected value and its bound source into `context.md` as `baseUrl: <url>` and `baseUrlSource: <source>|default-localhost-5173`.
- Never select API-only endpoints, production hosts, credential URLs, query-bearing URLs or fragment URLs.
- Write `environmentProbe: pending`. The following environment shell deterministically parses `context.md`, validates URL safety, probes curl HEAD→GET, and replaces this with `reachable`, `unreachable`, or `curl-unavailable` plus a structured `blockedReason`.
- Include the exact browser start prefix using the selected concrete URL:
  `playwright-cli open --browser=chrome <resolved-base-url>`.

Do not claim the environment is reachable until preflight completes. Preflight does not start the application.


## Standard scenario coverage

- Copy or reference `docs/templates/frontend-test-standard-scenarios.v1.json` into `testcase/frontend/rag/standard-scenarios.v1.json` when available.
- Add `## Standard scenario coverage` to coverage-map.md with planned/n/a for each must scenario.
