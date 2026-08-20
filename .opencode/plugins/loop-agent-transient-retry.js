/**
 * loop-agent OpenCode transient recovery plugin
 * Path: .opencode/plugins/loop-agent-transient-retry.js
 *
 * Compensates transient UnknownError cases that OpenCode built-in APIError
 * retry does not cover. Never runs concurrently with session.status === "retry".
 * Permanent failures use interaction "plugin-ignore-permanent-error".
 * User aborts (MessageAbortedError / cancel words) are silently cleared.
 * Best-effort file log: .opencode/plugins/loop-agent-transient-retry.log.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendFile, mkdir } from "node:fs/promises";

const PLUGIN_PATH = ".opencode/plugins/loop-agent-transient-retry.js";
const LOG_FILE_NAME = "loop-agent-transient-retry.log";
const LOG_PATH = (() => {
  try {
    const dir =
      import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
    return path.join(dir, LOG_FILE_NAME);
  } catch {
    return ".opencode/plugins/loop-agent-transient-retry.log";
  }
})();
const PERMANENT_INTERACTION = "plugin-ignore-permanent-error";
const BACKOFF_MS = [2000,4000,8000,16000,30000];
const MAX_RETRIES = 5;
const CONTEXT_OVERFLOW_PHRASES = ["请求上下文过大","context_length_exceeded","context overflow","context length overflow","too many tokens","maximum context","prompt is too long","request_too_large","context window"];
const OVERFLOW_PATTERN = new RegExp(
  CONTEXT_OVERFLOW_PHRASES.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|"),
  "i",
);
void logToFile("load ok");

const sessionState = new Map();
const sessionStatus = new Map();
const pendingErrors = new Map();
const recoveryWorkers = new Map();

function getState(sessionId) {
  let state = sessionState.get(sessionId);
  if (!state) {
    state = { attempt: 0, locked: false, rerunRequested: false };
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

async function logToFile(line) {
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(
      LOG_PATH,
      new Date().toISOString() + " " + line + "\n",
      "utf-8",
    );
  } catch {
    // Best-effort observability log; never throw (ENOENT/EISDIR tolerated).
  }
}

function isUserAbort(error) {
  if (error && typeof error === "object" && typeof error.name === "string") {
    if (/^MessageAbortedError$/i.test(error.name)) return true;
  }
  return /aborted by user|user cancel|cancelled|canceled/i.test(textOf(error));
}

function isPermanent(error) {
  const text = textOf(error);
  if (error && typeof error === "object" && typeof error.name === "string") {
    if (/^APIError$/i.test(error.name)) return true;
    if (/^(AuthError|PermissionError)$/i.test(error.name)) return true;
  }
  return (
    OVERFLOW_PATTERN.test(text) ||
    /\b(401|403|unauthorized|forbidden|quota|rate.?limit|cancelled|canceled|business validation|invalid task|schema validation)\b/i.test(text)
  );
}

function isTransientUnknown(error) {
  if (isPermanent(error)) return false;
  const text = textOf(error);
  const hasUnknown = /UnknownError/i.test(text) || (error && /UnknownError/i.test(String(error.name || "")));
  const hasTypeValidation =
    /\bTypeValidationError\b/i.test(text) ||
    /Type validation failed/i.test(text) ||
    (error && /TypeValidationError/i.test(String(error.name || "")));
  if (!hasUnknown && !hasTypeValidation) return false;
  return (
    /\b(code[:\s]*502|502|LLMRequestError|network fluctuation|timeout|transient provider failure|non-standard)\b/i.test(
      text,
    ) ||
    (error && (error.code === 502 || error.status === 502))
  );
}

function buildResumePrompt(sessionId, error, attempt) {
  return [
    "[loop-agent transient recovery] session=" + sessionId + " attempt=" + attempt,
    "Previous model turn failed with a transient UnknownError: " + textOf(error),
    "Before continuing any work, first inspect already completed tool calls and existing file modifications in this session.",
    "Do not re-run side-effecting tools or rewrite files that already reflect successful prior work.",
    "Resume only the remaining unfinished work after that check.",
    "续接前请先检查本 session 已有工具调用与文件改动，避免重复执行有副作用的操作。",
  ].join("\n");
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export default async function loopAgentTransientRetryPlugin({ client, $ }) {
  void $;
  void PLUGIN_PATH;
  void logToFile("setup ok");

  async function drainPendingRecovery(sessionId) {
    const state = getState(sessionId);
    const pending = pendingErrors.get(sessionId);
    if (!pending) return;
    if (state.attempt >= MAX_RETRIES) {
      pendingErrors.delete(sessionId);
      return;
    }

    // A status event may be stale by the time this worker runs. Confirm idle via
    // the SDK before and after backoff; every other outcome keeps the error pending.
    const beforeDelay = await readSessionStatus(client, sessionId);
    if (pendingErrors.get(sessionId) !== pending) return;
    if (!beforeDelay.ok || beforeDelay.type !== "idle") return;

    const delay = BACKOFF_MS[state.attempt];
    if (typeof delay !== "number") {
      pendingErrors.delete(sessionId);
      return;
    }
    await wait(delay);
    if (pendingErrors.get(sessionId) !== pending) return;

    const beforePrompt = await readSessionStatus(client, sessionId);
    if (pendingErrors.get(sessionId) !== pending) return;
    if (!beforePrompt.ok || beforePrompt.type !== "idle") return;

    const nextAttempt = state.attempt + 1;
    const prompt = buildResumePrompt(sessionId, pending.error, nextAttempt);
    let response;
    try {
      response = await client.session.promptAsync({
        path: { id: sessionId },
        body: { parts: [{ type: "text", text: prompt }] },
        throwOnError: true,
      });
    } catch {
      void logToFile(
        "prompt attempt=" + nextAttempt + " accepted=false session=" + sessionId,
      );
      return;
    }
    const accepted = promptWasAccepted(response);
    void logToFile(
      "prompt attempt=" + nextAttempt + " accepted=" + accepted + " session=" + sessionId,
    );
    if (!accepted) return;

    state.attempt = nextAttempt;
    if (pendingErrors.get(sessionId) === pending) {
      pendingErrors.delete(sessionId);
    }
  }

  function startRecoveryWorker(sessionId) {
    const state = getState(sessionId);
    if (recoveryWorkers.has(sessionId)) {
      state.rerunRequested = true;
      return;
    }
    state.locked = true;
    state.rerunRequested = false;
    void logToFile("worker start session=" + sessionId);
    const worker = drainPendingRecovery(sessionId)
      .catch(() => {})
      .finally(() => {
        void logToFile("worker end session=" + sessionId);
        recoveryWorkers.delete(sessionId);
        const rerun = state.rerunRequested;
        state.rerunRequested = false;
        state.locked = false;
        if (rerun && pendingErrors.has(sessionId)) {
          startRecoveryWorker(sessionId);
        }
      });
    recoveryWorkers.set(sessionId, worker);
  }

  function clearSession(sessionId) {
    pendingErrors.delete(sessionId);
    sessionStatus.delete(sessionId);
    const state = sessionState.get(sessionId);
    if (state) {
      state.attempt = 0;
      state.rerunRequested = false;
      if (!recoveryWorkers.has(sessionId)) state.locked = false;
    }
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
        if (sessionId && current === "idle" && pendingErrors.has(sessionId)) {
          startRecoveryWorker(sessionId);
        }
        return;
      }

      if (event.type === "session.idle") {
        if (sessionId) {
          sessionStatus.set(sessionId, "idle");
          if (pendingErrors.has(sessionId)) startRecoveryWorker(sessionId);
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
        if (isUserAbort(error)) {
          clearSession(sessionId);
          void logToFile("classify abort session=" + sessionId);
          return undefined;
        }
        if (!isTransientUnknown(error)) {
          pendingErrors.delete(sessionId);
          getState(sessionId).rerunRequested = false;
          void logToFile("classify permanent session=" + sessionId);
          return { interaction: PERMANENT_INTERACTION, reason: "plugin-ignore-permanent-error" };
        }
        pendingErrors.set(sessionId, { error });
        void logToFile("classify transient session=" + sessionId);
        startRecoveryWorker(sessionId);
        return { pending: true };
      }
    },
  };
}
