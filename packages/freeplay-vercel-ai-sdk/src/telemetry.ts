import { OpenInferenceSimpleSpanProcessor } from "@arizeai/openinference-vercel";
import type { Attributes } from "@opentelemetry/api";
import type {
  ReadableSpan,
  SpanExporter,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPHttpProtoTraceExporter } from "@vercel/otel";
import {
  bufferToolSpan,
  extractToolCallIdsFromResponse,
  flushBufferedToolSpans,
} from "./tools.js";

/**
 * Helper type to allow mutation of ReadableSpan properties.
 *
 * ReadableSpan properties are readonly by design to prevent accidental modifications.
 * However, we need to mutate span attributes and names during our preprocessing phase
 * before they're exported (e.g., mapping Vercel AI SDK attributes to Freeplay/OpenInference
 * conventions, enriching tool spans with parent metadata).
 *
 * This type removes the readonly modifiers, making it clear when we're intentionally
 * bypassing the readonly constraint for our specific use case.
 */
type MutableSpan = {
  -readonly [K in keyof ReadableSpan]: ReadableSpan[K];
};

const DEFAULT_COLLECTOR_URL = "https://api.freeplay.ai/api/v0/otel/v1/traces";
const API_KEY_ENV = "FREEPLAY_API_KEY";
const PROJECT_ID_ENV = "FREEPLAY_PROJECT_ID";
const ENDPOINT_ENV = "FREEPLAY_OTEL_ENDPOINT";

export interface CreateFreeplaySpanProcessorOptions {
  /**
   * Freeplay API key used to authenticate OTLP trace ingestion.
   * Falls back to the FREEPLAY_API_KEY environment variable if omitted.
   */
  apiKey?: string;
  /**
   * Freeplay project identifier for associating telemetry with the correct workspace.
   * Falls back to the FREEPLAY_PROJECT_ID environment variable if omitted.
   */
  projectId?: string;
  /**
   * Optional override for the OTLP collector endpoint.
   * Falls back to FREEPLAY_OTEL_ENDPOINT or the production default.
   */
  endpoint?: string;
}

/**
 * Create a Freeplay span processor that can be passed to registerOTel().
 * Handles attribute mapping, tool call linking, and span buffering.
 */
export const createFreeplaySpanProcessor = (
  options: CreateFreeplaySpanProcessorOptions = {},
): SpanProcessor => {
  const env = process.env;

  const apiKey = options.apiKey ?? env?.[API_KEY_ENV];
  if (!apiKey) {
    throw new Error(
      "Missing Freeplay API key. Provide one via options.apiKey or the FREEPLAY_API_KEY environment variable.",
    );
  }

  const projectId = options.projectId ?? env?.[PROJECT_ID_ENV];
  if (!projectId) {
    throw new Error(
      "Missing Freeplay project ID. Provide one via options.projectId or the FREEPLAY_PROJECT_ID environment variable.",
    );
  }

  const endpoint =
    options.endpoint ?? env?.[ENDPOINT_ENV] ?? DEFAULT_COLLECTOR_URL;

  let baseExporter: SpanExporter;
  try {
    baseExporter = new OTLPHttpProtoTraceExporter({
      url: endpoint,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Freeplay-Project-Id": projectId,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to initialize OTLP HTTP exporter with endpoint ${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const exporter = createBufferingExporter(baseExporter);

  const spanFilter = (span: ReadableSpan): boolean => {
    applyStandardAttributeMappings(span);
    sanitizeSpanAttributes(span);
    return true;
  };

  return new OpenInferenceSimpleSpanProcessor({
    exporter,
    spanFilter,
  });
};

const sanitizeSpanAttributes = (span: ReadableSpan): void => {
  const cleanedAttributes: Attributes = {};
  for (const [key, value] of Object.entries(span.attributes ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      cleanedAttributes[key] = value;
    }
  }
  (span as unknown as MutableSpan).attributes = cleanedAttributes;
};

/**
 * Apply Freeplay-specific attribute mappings to spans.
 *
 * Maps Vercel AI SDK metadata to Freeplay's expected attribute names.
 */
const applyStandardAttributeMappings = (span: ReadableSpan): void => {
  const attrs = (span.attributes ?? {}) as Attributes;

  // 1) Map sessionId: ai.telemetry.metadata.sessionId -> freeplay.session.id
  const sessionIdRaw = attrs["ai.telemetry.metadata.sessionId"];
  if (sessionIdRaw != null) {
    const sessionId = (
      typeof sessionIdRaw === "string" ? sessionIdRaw : String(sessionIdRaw)
    ).trim();
    if (sessionId && !attrs["freeplay.session.id"]) {
      attrs["freeplay.session.id"] = sessionId;
    }
    delete attrs["ai.telemetry.metadata.sessionId"];
  }

  // 2) Map functionId: ai.telemetry.functionId -> span.name
  const functionIdRaw = attrs["ai.telemetry.functionId"];
  if (functionIdRaw != null) {
    const functionId =
      typeof functionIdRaw === "string" ? functionIdRaw : String(functionIdRaw);
    const trimmedId = functionId.trim();
    if (trimmedId.length > 0) {
      (span as unknown as MutableSpan).name = trimmedId;
    }
    delete attrs["ai.telemetry.functionId"];
  }

  (span as unknown as MutableSpan).attributes = attrs;
};

/**
 * Creates a buffering exporter that wraps a delegate exporter.
 *
 * This exporter intercepts TOOL spans and holds them until their parent LLM span
 * arrives, allowing us to properly link them together before export.
 */
const createBufferingExporter = (delegate: SpanExporter): SpanExporter => {
  return {
    export: (spans: ReadableSpan[], resultCallback) => {
      try {
        const toExport: ReadableSpan[] = [];
        const toolCallIds: string[] = [];
        let llmParentSpanId: string | undefined;
        let llmSessionId: string | undefined;

        // First pass: extract tool call IDs from LLM spans and collect spans to export
        for (const span of spans) {
          const attrs = (span.attributes ?? {}) as Attributes;
          const oiKind = attrs["openinference.span.kind"];

          if (oiKind === "TOOL") {
            bufferToolSpan(span);
            continue;
          }

          if (oiKind === "LLM") {
            // Extract tool call IDs from this LLM span
            const toolCallsRaw = attrs["ai.response.toolCalls"];
            const extractedIds = extractToolCallIdsFromResponse(toolCallsRaw);
            if (extractedIds.length > 0) {
              const currentSpanId = span.spanContext().spanId;
              llmParentSpanId = currentSpanId;
              llmSessionId = attrs["freeplay.session.id"] as string | undefined;
              toolCallIds.push(...extractedIds);
            }
          }

          toExport.push(span);
        }

        // Second pass: flush any buffered tool spans that match this LLM's tool calls
        if (toolCallIds.length > 0 && llmParentSpanId) {
          const flushedToolSpans = flushBufferedToolSpans(
            llmParentSpanId,
            llmSessionId,
            toolCallIds,
          );
          toExport.push(...flushedToolSpans);
        }

        if (toExport.length === 0) {
          resultCallback({ code: 0 });
          return;
        }

        return delegate.export(toExport, resultCallback);
      } catch (error) {
        // Report error to the callback rather than crashing
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        resultCallback({
          code: 1,
          error: new Error(
            `Error processing spans in buffering exporter: ${errorMessage}`,
          ),
        });
      }
    },
    shutdown: () => delegate.shutdown(),
    forceFlush: () => delegate.forceFlush?.() ?? Promise.resolve(),
  };
};
