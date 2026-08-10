# Agent DAG Decision Gate Dogfood Report Template

> Copy to `docs/reports/dogfood/YYYY-MM-DD-agent-dag-decision-gate-dogfood.md` after each dogfood run.

## Run Metadata

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Topic |  |
| DAG input | `<temp-dir>/<topic>-decision-gate-dag.json` |
| Run ID |  |
| Run facts | `.harness/dag-runs/completed/<run-id>/` |
| Gate type | `acceptance-gate` |
| Decision node | `decision-pi` |
| Model | `gpt-5.5` via `executorModels.pi.HIGH` |

## Work Type

Choose one:

- [ ] Low-risk docs/template change — expected `auto-approve` or `approve-with-constraints`
- [ ] Runtime/loop-agent change — expected `request-revision`, `run-more-verification`, or `auto-approve`
- [ ] Contract/security/high-risk simulation — expected `escalate-to-human`

## Deterministic Evidence

| Evidence | Status | Notes |
|---|---|---|
| `verify-shell/result.summary.md` | verified / partial / missing |  |
| `state.json` | verified / partial / missing |  |
| git diff / changed file list | verified / partial / missing |  |
| progress/report/artifacts | verified / partial / missing |  |

## Decision Envelope Summary

Paste the **exact** ` ```DECISION_ENVELOPE_JSON ` fenced block from `decision-pi/result.summary.md` (info string must be `DECISION_ENVELOPE_JSON`, not `json`). Also record `decision`, `requiresHuman`, `nextAction`, and verified evidence count.

```DECISION_ENVELOPE_JSON
{
  "schemaVersion": 1,
  "gateType": "acceptance-gate",
  "decisionScope": "dag-run",
  "decision": "auto-approve",
  "confidence": 0.88,
  "riskLevel": "low",
  "requiresHuman": false,
  "nextAction": "continue",
  "policyVersion": "agent-dag-decision-gate-v1",
  "policyChecks": {
    "mustEscalateFlags": [],
    "evidenceComplete": true,
    "allowedAutoApprove": true
  },
  "rationale": ["..."],
  "evidence": [
    {
      "path": ".harness/dag-runs/completed/<run-id>/verify-shell/result.summary.md",
      "kind": "shell-output",
      "status": "verified",
      "summary": "verification commands passed"
    }
  ],
  "blockingFindings": [],
  "requiredRevisions": [],
  "riskFlags": [],
  "humanEscalation": null,
  "audit": {
    "runId": "<run-id>",
    "nodeId": "decision-pi",
    "model": "gpt-5.5"
  }
}
```

## Quality Metrics

| Metric | Value | Notes |
|---|---:|---|
| `decisionLatencyMs` |  | From node duration |
| `tokenCostEstimate` |  | If available |
| `humanInterruptCount` |  | Should be 0 for low-risk auto decisions |
| `falseEscalation` | yes / no | Escalated when policy allowed auto decision |
| `missedEscalation` | yes / no | Auto-approved when policy required human escalation |
| `revisionCaughtBeforeHuman` | yes / no | Gate requested revision before human involvement |
| `verifyPassAfterGate` | yes / no | Later verification passed after gate action |
| `evidenceCompleteness` | complete / partial / missing | Based on verified evidence count |

## Evaluation

### What the gate got right

- 

### What the gate got wrong or over/under-weighted

- 

### Prompt / policy adjustments needed

- 

## Recommendation

Choose one:

- [ ] `proceed` — enough evidence to move toward parser/runtime work
- [ ] `needs-more-dogfood` — continue M1/M2 advisory runs
- [ ] `defer` — gate quality not yet good enough

Rationale:

- 

## Follow-ups

- 
