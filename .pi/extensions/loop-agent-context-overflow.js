/**
 * loop-agent Pi context overflow extension
 * Path: .pi/extensions/loop-agent-context-overflow.js
 *
 * On assistant message_end, rewrite overflow errorMessage to start with
 * "context_length_exceeded:" so Pi's native overflow recovery can run.
 * Idempotent. Does not write user settings or model context windows.
 */
const EXTENSION_PATH = ".pi/extensions/loop-agent-context-overflow.js";
const CONTEXT_OVERFLOW_PHRASES = ["请求上下文过大","context_length_exceeded","context overflow","context length overflow","too many tokens","maximum context","prompt is too long","request_too_large","context window"];
const OVERFLOW_PATTERN = new RegExp(
  CONTEXT_OVERFLOW_PHRASES.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|"),
  "i",
);
const NORMALIZED_PREFIX = "context_length_exceeded:";

function isOverflowMessage(text) {
  if (typeof text !== "string" || !text) return false;
  return OVERFLOW_PATTERN.test(text);
}

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
