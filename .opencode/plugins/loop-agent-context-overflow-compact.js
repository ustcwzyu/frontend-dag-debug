/**
 * loop-agent OpenCode context overflow compact plugin
 * Path: .opencode/plugins/loop-agent-context-overflow-compact.js
 *
 * On context overflow (including Chinese "请求上下文过大"), compact/summarize
 * then resume the same session a limited number of times. Does NOT handle
 * provider transport / 502 recovery (that is loop-agent-transient-retry.js).
 */
const PLUGIN_PATH = ".opencode/plugins/loop-agent-context-overflow-compact.js";
const MAX_OVERFLOW_RECOVERIES = 1;
const CONTEXT_OVERFLOW_PHRASES = ["请求上下文过大","上下文过大","上下文太大","上下文过长","上下文超限","context_length_exceeded","context overflow","context length overflow","too many tokens","maximum context","prompt is too long","prompt too long","request_too_large","reduce the length of the messages","context window"];
const OVERFLOW_PATTERN = new RegExp(
  CONTEXT_OVERFLOW_PHRASES.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|"),
  "i",
);
function tryParseJson(text) {
  if (typeof text !== "string") return undefined;
  const trimmed = text.trim();
  const candidates = [trimmed];
  const dataPrefix = trimmed.match(/^data:\s*(\{[\s\S]*)$/i);
  if (dataPrefix) candidates.push(dataPrefix[1]);
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
  }
  return undefined;
}
function collectFields(value, depth, out) {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") {
    if (value) out.push(value);
    const nested = tryParseJson(value);
    if (nested !== undefined && nested !== value) collectFields(nested, depth + 1, out);
    return;
  }
  if (typeof value !== "object") return;
  if (typeof value.message === "string") collectFields(value.message, depth + 1, out);
  if (typeof value.errorMessage === "string") collectFields(value.errorMessage, depth + 1, out);
  if (value.error) collectFields(value.error, depth + 1, out);
}
function isOverflowMessage(text) {
  if (typeof text !== "string" || !text) return false;
  const fields = [text];
  collectFields(text, 0, fields);
  collectFields(tryParseJson(text), 0, fields);
  const combined = fields.join("\n");
  if (!OVERFLOW_PATTERN.test(combined)) return false;
  if (/\((?:BadRequestError|AuthenticationError)\s+40[13]\)/i.test(combined)) return false;
  return true;
}

const sessionState = new Map();
const sessionStatus = new Map();
const pendingOverflow = new Map();
const deferredResume = new Map();
const recoveryWorkers = new Map();

function getState(sessionId) {
  let state = sessionState.get(sessionId);
  if (!state) {
    state = {
      attempt: 0,
      locked: false,
      rerunRequested: false,
      deferredIdleConfirmed: false,
    };
    sessionState.set(sessionId, state);
  }
  return state;
}

function textOf(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isContextOverflow(error) {
  return isOverflowMessage(textOf(error));
}

function buildOverflowResumePrompt(sessionId, error, attempt) {
  return [
    "[loop-agent context overflow recovery] session=" + sessionId + " attempt=" + attempt,
    "Previous model turn failed because the request context was too large: " + textOf(error),
    "Session history was compacted/summarized before this resume.",
    "Before continuing any work, first inspect already completed tool calls and existing file modifications in this session.",
    "Do not re-run side-effecting tools or rewrite files that already reflect successful prior work.",
    "Resume only the remaining unfinished work after that check.",
    "续接前请先检查本 session 已有工具调用与文件改动，避免重复执行有副作用的操作。",
  ].join("\n");
}

function statusType(status) {
  const type = status && typeof status.type === "string" ? status.type : undefined;
  return type === "idle" || type === "retry" || type === "busy" ? type : undefined;
}

async function readSessionStatus(client, sessionId) {
  const cached = sessionStatus.get(sessionId);
  if (cached === "retry" || cached === "busy") {
    return { ok: true, type: cached };
  }
  try {
    const response = await client.session.status({ throwOnError: true });
    if (!response || typeof response !== "object" || response.error != null) {
      return { ok: false };
    }
    const current = statusType(response?.data?.[sessionId]);
    if (!current) return { ok: false };
    sessionStatus.set(sessionId, current);
    return { ok: true, type: current };
  } catch {
    return { ok: false };
  }
}

function promptWasAccepted(response) {
  return Boolean(
    response &&
      typeof response === "object" &&
      response.error == null &&
      Object.prototype.hasOwnProperty.call(response, "data") &&
      response.data !== null &&
      typeof response.data === "object",
  );
}

async function compactOrSummarize(client, sessionId) {
  const body = { path: { id: sessionId }, throwOnError: true };
  if (typeof client.session.compact === "function") {
    await client.session.compact(body);
    return "compact";
  }
  if (typeof client.session.summarize === "function") {
    await client.session.summarize(body);
    return "summarize";
  }
  throw new Error("session.compact and session.summarize are unavailable");
}

export default async function loopAgentContextOverflowCompactPlugin({ client, $ }) {
  void $;
  void PLUGIN_PATH;

  async function promptDeferredResume(sessionId, idleConfirmed = false) {
    const deferred = deferredResume.get(sessionId);
    if (!deferred) return;

    if (!idleConfirmed) {
      const status = await readSessionStatus(client, sessionId);
      if (deferredResume.get(sessionId) !== deferred) return;
      if (!status.ok || status.type !== "idle") return;
    }

    // An explicit idle event is authoritative even if the SDK status snapshot
    // still lags at busy. Keep deferred facts until promptAsync is accepted so
    // later idle can retry without another compact/summarize.
    const prompt = buildOverflowResumePrompt(sessionId, deferred.error, deferred.attempt);
    let response;
    try {
      response = await client.session.promptAsync({
        path: { id: sessionId },
        body: { parts: [{ type: "text", text: prompt }] },
        throwOnError: true,
      });
    } catch {
      return;
    }
    if (deferredResume.get(sessionId) !== deferred) return;
    if (!promptWasAccepted(response)) return;
    deferredResume.delete(sessionId);
    getState(sessionId).deferredIdleConfirmed = false;
  }

  async function drainPendingOverflow(sessionId) {
    const state = getState(sessionId);
    // Deferred resume path: only promptAsync, never compact/summarize again.
    if (deferredResume.has(sessionId)) {
      const idleConfirmed = state.deferredIdleConfirmed;
      state.deferredIdleConfirmed = false;
      await promptDeferredResume(sessionId, idleConfirmed);
      return;
    }

    const pending = pendingOverflow.get(sessionId);
    if (!pending) return;
    if (state.attempt >= MAX_OVERFLOW_RECOVERIES) {
      pendingOverflow.delete(sessionId);
      return;
    }

    const before = await readSessionStatus(client, sessionId);
    if (pendingOverflow.get(sessionId) !== pending) return;
    if (!before.ok || before.type !== "idle") return;

    try {
      await compactOrSummarize(client, sessionId);
    } catch {
      // Compact itself failed: do not consume budget (no compact side-effect yet).
      return;
    }
    // Session cleanup may remove this work while compact is in flight. Do not
    // let that stale worker consume the reset budget or recreate deferred state.
    // Concurrent overflow cannot replace pending because session.error preserves
    // the first in-flight recovery facts below.
    if (pendingOverflow.get(sessionId) !== pending) return;

    // Consume budget immediately and exactly once after an active recovery's
    // successful compact/summarize.
    const nextAttempt = Math.min(state.attempt + 1, MAX_OVERFLOW_RECOVERIES);
    state.attempt = nextAttempt;
    pendingOverflow.delete(sessionId);
    // Keep resume facts across temporary post-compact busy/unknown status.
    deferredResume.set(sessionId, { error: pending.error, attempt: nextAttempt });
    await promptDeferredResume(sessionId);
  }

  function startRecoveryWorker(sessionId, deferredIdleConfirmed = false) {
    const state = getState(sessionId);
    if (deferredIdleConfirmed && deferredResume.has(sessionId)) {
      state.deferredIdleConfirmed = true;
    }
    if (recoveryWorkers.has(sessionId)) {
      state.rerunRequested = true;
      return;
    }
    state.locked = true;
    state.rerunRequested = false;
    const worker = drainPendingOverflow(sessionId)
      .catch(() => {})
      .finally(() => {
        recoveryWorkers.delete(sessionId);
        const rerun = state.rerunRequested;
        state.rerunRequested = false;
        state.locked = false;
        if (rerun && (pendingOverflow.has(sessionId) || deferredResume.has(sessionId))) {
          startRecoveryWorker(sessionId);
        }
      });
    recoveryWorkers.set(sessionId, worker);
  }

  function clearSession(sessionId) {
    pendingOverflow.delete(sessionId);
    deferredResume.delete(sessionId);
    sessionStatus.delete(sessionId);
    const state = sessionState.get(sessionId);
    if (state) {
      state.attempt = 0;
      state.rerunRequested = false;
      state.deferredIdleConfirmed = false;
      if (!recoveryWorkers.has(sessionId)) state.locked = false;
    }
  }

  function hasWork(sessionId) {
    return pendingOverflow.has(sessionId) || deferredResume.has(sessionId);
  }

  return {
    event: async ({ event }) => {
      if (!event || typeof event !== "object") return;
      const properties = event.properties || {};
      const sessionId =
        properties.sessionID || properties.sessionId || properties.id || properties.info?.id;

      if (event.type === "session.status") {
        const current = statusType(properties.status);
        if (sessionId && current) sessionStatus.set(sessionId, current);
        if (sessionId && current === "idle" && hasWork(sessionId)) {
          startRecoveryWorker(sessionId, deferredResume.has(sessionId));
        }
        return;
      }

      if (event.type === "session.idle") {
        if (sessionId) {
          sessionStatus.set(sessionId, "idle");
          if (hasWork(sessionId)) {
            startRecoveryWorker(sessionId, deferredResume.has(sessionId));
          }
        }
        return;
      }

      if (event.type === "session.deleted") {
        if (sessionId) clearSession(sessionId);
        return;
      }

      if (event.type === "message.updated") {
        const info = properties.info;
        if (
          info?.role === "assistant" &&
          info.sessionID &&
          (info.status === undefined || info.status === "completed") &&
          info.time?.completed != null &&
          info.error == null
        ) {
          clearSession(info.sessionID);
        }
        return;
      }

      if (event.type === "session.error") {
        if (!sessionId) return;
        const error = properties.error || properties;
        if (!isContextOverflow(error)) {
          return;
        }
        if (getState(sessionId).attempt >= MAX_OVERFLOW_RECOVERIES) {
          pendingOverflow.delete(sessionId);
          return { interaction: "plugin-ignore-overflow-cap", reason: "plugin-ignore-overflow-cap" };
        }
        // Preserve the first overflow facts while compact or deferred resume is
        // in flight. Concurrent overflow must not replace them or queue compact.
        if (pendingOverflow.has(sessionId) || deferredResume.has(sessionId)) {
          return { pending: true };
        }
        pendingOverflow.set(sessionId, { error });
        startRecoveryWorker(sessionId);
        return { pending: true };
      }
    },
  };
}
