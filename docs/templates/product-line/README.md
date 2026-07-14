# Product-line feature packet

Copy this directory for each product feature. Replace angle-bracket placeholders, keep IDs stable, and run:

```bash
agent-worker task validate-feature <feature-dir>
```

The validator checks acceptance ID uniqueness, task references and dependencies, cycles, TaskSpec/path/verification completeness, and QA evidence before a successful closeout.
