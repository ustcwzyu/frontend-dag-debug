# Worker Dogfood Setup Template

Use this template to create a disposable target repository for a real `agent-worker` sample. It is deliberately a target-repo recipe, not a substitute for product requirements.

## Preconditions

- Install one published controller version and record it:

  ```bash
  npm install -g @tea-agent/loop-agent@<version>
  npm list -g @tea-agent/loop-agent --depth=0
  loop-agent --version
  agent-worker --version
  agent-worker --help
  ```

- Before any write-capable Worker command, resolve one controller identity for the batch. Record its package version, absolute launch entry, binary SHA-256, and portable package fingerprint. If the run is part of a release or self-hosting train, carry the expected version/fingerprint as explicit CLI gates.
- Create a clean, disposable target repository. Do not use `npm link`, `npm run dev`, or a workspace controller for a real-evidence run.
- Put requirement, acceptance, design, test plan, and QA case matrix next to the TaskSpec. `agent-worker` materializes immutable copies into the harness task source before DAG generation.

## Setup checklist

- [ ] Target has a committed baseline and a passing `loop-agent init --profile full --merge` preflight.
- [ ] Existing test demonstrates the desired behavior is missing or unimplemented.
- [ ] TaskSpec has narrow `allowed_paths` and explicit `forbidden_paths`.
- [ ] Task Pool dependencies are either backed by real prior runs or intentionally recorded as pre-existing evidence.
- [ ] The chosen model/provider and `--pi-model` smoke override, if any, are recorded.
- [ ] `--loop-agent-bin` resolves to the intended published package, and expected controller version/fingerprint are recorded before target writes.
- [ ] If this is a self-hosting run, published N remains fixed for the whole batch; candidate N+1 is installed and verified in a separate slot.

## Execute

```bash
agent-worker batch run-ready \
  --feature-dir <feature-dir> \
  --repo <target-repo> \
  --loop-agent-bin <published-loop-agent-entry> \
  --expected-controller-version <version> \
  --expected-controller-fingerprint <sha256:value> \
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

## Versioned self-hosting takeover

From a source checkout, use the repo-maintainer deterministic canary after building or packing candidate N+1:

```bash
npm run self-host:canary -- \
  --deterministic \
  --tarball <candidate.tgz> \
  --output <candidate-canary-evidence.json>
```

The deterministic canary must prove isolated-slot containment, both candidate bin identities, package fingerprint, full init/governance checks, a zero-execution Feature dry-run, static/shell-only observed DAG executors, and no PATH controller fallback. It does not claim to trap every possible Pi SDK/absolute path and does not replace a separately authorized live Pi run or the DAG skill-snapshot tests.
