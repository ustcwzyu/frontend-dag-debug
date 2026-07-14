# Worker Dogfood Setup Template

Use this template to create a disposable target repository for a real `agent-worker` sample. It is deliberately a target-repo recipe, not a substitute for product requirements.

## Preconditions

- Install one published controller version and record it:

  ```bash
  npm install -g @tea-agent/loop-agent@<version>
  npm list -g @tea-agent/loop-agent --depth=0
  loop-agent --version
  agent-worker --help
  ```

- Create a clean, disposable target repository. Do not use `npm link`, `npm run dev`, or a workspace controller for a real-evidence run.
- Put requirement, acceptance, design, test plan, and QA case matrix next to the TaskSpec. `agent-worker` materializes immutable copies into the harness task source before DAG generation.

## Setup checklist

- [ ] Target has a committed baseline and a passing `loop-agent init --profile full --merge` preflight.
- [ ] Existing test demonstrates the desired behavior is missing or unimplemented.
- [ ] TaskSpec has narrow `allowed_paths` and explicit `forbidden_paths`.
- [ ] Task Pool dependencies are either backed by real prior runs or intentionally recorded as pre-existing evidence.
- [ ] The chosen model/provider and `--pi-model` smoke override, if any, are recorded.

## Execute

```bash
agent-worker batch run-ready \
  --feature-dir <feature-dir> \
  --repo <target-repo> \
  --limit 1 \
  --check-repo \
  [--pi-model <model>]

agent-worker observe snapshot --repo <target-repo> > <evidence-dir>/observe-snapshot.json
agent-worker report morning --repo <target-repo> --output <evidence-dir>/morning-report.md
```

For a failed task, do not delete state or alter JSONL evidence. Fix the external/root cause, then make the retry explicit:

```bash
agent-worker task retry <task-id> --repo <target-repo> --reason "<root cause corrected>"
agent-worker batch run-ready --feature-dir <feature-dir> --repo <target-repo> --limit 1 --check-repo
```

The retry run must have a distinct `workerRunId` and retain `retryOfWorkerRunId` in its Task Pool evidence.
