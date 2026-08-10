# Retrieve frontend test context

Write only `testcase/frontend/rag/context.md` and `coverage-map.md`. Record traceable facts from the task source, routes, components, API/Mock contracts, existing tests and execution contract. Do not invent fields, credentials, limits or test data.

## Base URL resolution (required)

Resolve a single absolute browser base URL and record it explicitly in `context.md` (both a human-readable `base URL` line and a machine-readable `baseUrl: <url>` line):

1. Prefer frontend URL facts from task source `config.md` (including `source/references/**/config.md` or any attached reference named `config.md`): keys such as `baseUrl`, `base_url`, `frontendBaseUrl`, `FRONTEND_BASE_URL`, `url`, or labeled frontend base URL text.
2. If no usable absolute `http://` / `https://` URL is found in `config.md` (or equivalent source facts), default to `http://localhost:5173`.
3. Never use production hosts. Prefer local / isolated non-production URLs.
4. Also record `baseUrlSource: config.md|<path>` or `baseUrlSource: default-localhost-5173` so later nodes can audit the choice.
5. Write `environmentProbe: pending`. The environment preflight shell will replace this with `reachable`, `unreachable`, or `curl-unavailable` plus a structured `blockedReason` (for example `frontend-base-url-unreachable`).
6. Include the exact browser start prefix that generators must copy:
   `playwright-cli open --browser=chrome --headed <resolved-base-url>`.

Do not claim the environment is reachable until preflight completes. Preflight does not start the application.
