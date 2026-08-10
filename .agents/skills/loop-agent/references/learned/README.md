# Learned loop-agent Patterns

本目录是 SePO-lite prompt evolution 的 human-gated target。

Rules:

- Files 仅为 Markdown guidance。
- `retrospective` 可 propose `.harness/tasks/<task-id>/source/prompt-delta.md`；不得自动 merge 到此。
- 不要添加 shell commands、credential handling、tool permission expansion 或 completion-authority bypass rules。
- DAG implementer prompts 在 node 已 request `loop-agent` skill 时，可将 repo-specific 文件 `<repo>.md` 或 `default.md` 作为 bounded inline guidance 加载。
- 保持条目 short 且 pattern-oriented：failure class、fix scope shape、invariant、verification evidence。

Acceptance checklist before merging a prompt delta:

- Proposal 仅为 Markdown-only process guidance。
- 不含 shell/runtime command lines 或 fenced command blocks。
- Credential material、tokens、passwords、secrets 与 API keys 保持不可触达。
- Tool permissions、path allowlists、`allowedPaths`、`forbiddenPaths` 与 `writeSet` 保持既有边界。
- Shell verification、tests、write guards、decision gates、human gates 与 completion evidence 均为保留门禁。
- Completed DAG 与 one-shot run facts 保持只读。
- Learned file 编辑后 `loop-agent docs audit` 须 pass。
