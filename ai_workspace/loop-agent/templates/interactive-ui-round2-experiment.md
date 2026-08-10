# Interactive UI Round-2 A/B/C Experiment

## Frozen inputs

- Target repo / commit:
- Controller version:
- TaskSpec / acceptance hash:
- Base DAG:
- Model matrix:

Prepare the fixture and three DAGs after installing a published controller that contains `interactive-ui` support:

```bash
bash scripts-local/setup-drill-round2-react.sh /tmp/drill-round2-react-target
npm run build
node scripts-local/prepare-round2-ui-experiment.mjs \
  /tmp/drill-round2-react-target \
  features/F-2026-001/tasks/FE-001.yaml \
  /tmp/round2-ui-experiment \
  loop-agent
node scripts-local/build-round2-ui-variants.mjs \
  /tmp/round2-ui-experiment/round2-ui-base.json \
  /tmp/round2-ui-experiment/variants
```

Validate every generated variant with the same frozen controller before running it. Use a unique run ID for A, B, and C; do not rewrite `executorModels`.

## Variants

| Variant | Writer prompt | Writer tier | Run ID | Result |
| --- | --- | --- | --- | --- |
| A | interactive-ui contract | MED | | |
| B | default contract | HIGH | | |
| C | interactive-ui contract | HIGH | | |

## Metrics

| Metric | A | B | C |
| --- | --- | --- | --- |
| First-pass review gate pass | | | |
| Framework-native `.tsx` component | | | |
| Route/parent integration | | | |
| DOM interaction tests | | | |
| Helper-only escape | | | |
| Duration | | | |
| Tokens | | | |

## Required evidence per run

- DAG JSON and run ID
- implement/repair writer model and prompt profile
- changed component path
- integration path
- interaction test path
- DOM assertions mapped to AC-FE-001
- review verdict and deterministic test output
- diff boundary audit

## Decision

- Production default:
- Evidence:
- Cost/quality trade-off:
- Follow-up:

Do not conclude from a single run when provider or environment failures occurred. Re-run the affected variant with the same frozen inputs and a new run ID.
