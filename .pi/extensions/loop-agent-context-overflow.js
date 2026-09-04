/**
 * loop-agent Pi context overflow extension
 * Path: .pi/extensions/loop-agent-context-overflow.js
 *
 * On assistant message_end, rewrite overflow errorMessage to start with
 * "context_length_exceeded:" so Pi's native overflow recovery can run.
 * Idempotent. Does not write user settings or model context windows.
 */
const EXTENSION_PATH = ".pi/extensions/loop-agent-context-overflow.js";
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
const NORMALIZED_PREFIX = "context_length_exceeded:";

export default function loopAgentContextOverflowExtension(pi) {
  void EXTENSION_PATH;
  pi.on("message_end", (event) => {
    const message = event && event.message;
    if (!message || message.role !== "assistant") return;
    const current = message.errorMessage;
    if (typeof current !== "string" || !current) return;
    if (current.startsWith(NORMALIZED_PREFIX) || /context_length_exceeded/i.test(current)) {
      return;
    }
    if (!isOverflowMessage(current)) return;
    return {
      message: {
        ...message,
        errorMessage: NORMALIZED_PREFIX + " " + current,
      },
    };
  });
}
