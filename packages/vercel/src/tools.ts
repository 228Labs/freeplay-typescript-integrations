import type { Attributes } from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";

/**
 * Represents a tool span that is temporarily buffered while waiting for its parent LLM span.
 *
 * Tool spans arrive at the exporter before we know which LLM span invoked them.
 * We buffer them here so we can enrich them with parent span metadata when the LLM span arrives.
 */
interface BufferedToolSpan {
  span: ReadableSpan;
}

/**
 * In-memory buffer storing tool spans indexed by their toolCallId.
 *
 * When a TOOL span arrives, we don't yet have the parent LLM span's ID or session.
 * This buffer holds tool spans until their corresponding LLM span is processed,
 * at which point we can link them together and export them as a unit.
 */
const toolSpanBuffer = new Map<string, BufferedToolSpan>();

/**
 * Adds a tool span to the buffer for later processing.
 *
 * The span will be held until its parent LLM span arrives with matching tool call IDs.
 * If the span doesn't have an `ai.toolCall.id` attribute, it won't be buffered.
 *
 * @param span - The tool span to buffer
 */
export const bufferToolSpan = (span: ReadableSpan): void => {
  const attrs = (span.attributes ?? {}) as Attributes;
  const toolCallId = attrs["ai.toolCall.id"];
  if (typeof toolCallId !== "string") return;

  toolSpanBuffer.set(toolCallId, { span });
};

/**
 * Retrieves and enriches buffered tool spans that match the given tool call IDs.
 *
 * This function is called when an LLM span is processed. It:
 * 1. Looks up each tool call ID in the buffer
 * 2. Enriches matching tool spans with the parent span ID and session ID
 * 3. Removes them from the buffer
 * 4. Returns them ready for export
 *
 * @param parentSpanId - The span ID of the LLM span that invoked these tools
 * @param sessionId - The session ID to propagate to the tool spans
 * @param toolCallIds - Array of tool call IDs extracted from the LLM span's response
 * @returns Array of enriched tool spans ready to be exported
 */
export const flushBufferedToolSpans = (
  parentSpanId: string,
  sessionId: string | undefined,
  toolCallIds: string[],
): ReadableSpan[] => {
  const flushed: ReadableSpan[] = [];

  for (const toolCallId of toolCallIds) {
    const buffered = toolSpanBuffer.get(toolCallId);
    if (!buffered) {
      continue;
    }

    const span = buffered.span;
    const attrs = (span.attributes ?? {}) as Attributes;

    // Enrich the tool span with parent LLM span metadata
    if (!attrs["parent_span_id"]) {
      attrs["parent_span_id"] = parentSpanId;
    }
    if (!attrs["freeplay.session.id"]) {
      attrs["freeplay.session.id"] = sessionId ?? "";
    }

    (span as unknown as { attributes: Attributes }).attributes = attrs;

    flushed.push(span);
    toolSpanBuffer.delete(toolCallId);
  }

  return flushed;
};

/**
 * Extracts tool call IDs from an LLM response's serialized tool calls attribute.
 *
 * The Vercel AI SDK stores tool calls as a JSON string in the `ai.response.toolCalls` attribute.
 * This function parses that string and extracts the `toolCallId` from each tool call object.
 *
 * @param toolCallsRaw - The raw value from `ai.response.toolCalls` (expected to be a JSON string)
 * @returns Array of tool call IDs, or empty array if parsing fails or no IDs found
 */
export const extractToolCallIdsFromResponse = (
  toolCallsRaw: unknown,
): string[] => {
  if (typeof toolCallsRaw !== "string") return [];
  try {
    const parsed = JSON.parse(toolCallsRaw);
    if (!Array.isArray(parsed)) return [];

    const toolCallIds: string[] = [];
    for (const tc of parsed) {
      if (tc && typeof tc.toolCallId === "string") {
        toolCallIds.push(tc.toolCallId);
      }
    }
    return toolCallIds;
  } catch {
    return [];
  }
};
