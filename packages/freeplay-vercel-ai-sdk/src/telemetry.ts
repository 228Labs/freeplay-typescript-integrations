import { OpenInferenceSimpleSpanProcessor } from "@arizeai/openinference-vercel";
import { type Tracer } from "@opentelemetry/api";
import type {
  ReadableSpan,
  SpanExporter,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPHttpProtoTraceExporter } from "@vercel/otel";

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

export interface ExperimentalTelemetryConfig {
  isEnabled: boolean;
  recordInputs?: boolean;
  recordOutputs?: boolean;
  functionId?: string;
  metadata?: Record<string, unknown>;
  tracer?: Tracer;
}

/**
 * Create a Freeplay span processor that can be passed to registerOTel().
 * Handles attribute mapping, tool call linking, and span buffering.
 */
export const createFreeplaySpanProcessor = (
  options: CreateFreeplaySpanProcessorOptions = {},
): SpanProcessor => {
  const env = getProcessEnv();

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
  const headers = buildHeaders(apiKey, projectId);

  let baseExporter: SpanExporter;
  try {
    baseExporter = new OTLPHttpProtoTraceExporter({
      url: endpoint,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Failed to initialize OTLP HTTP exporter with endpoint ${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const exporter = createBufferingExporter(baseExporter);

  const spanFilter = (span: ReadableSpan): boolean => {
    applyStandardAttributeMappings(span);
    return createDefaultSpanFilter(span);
  };

  return new OpenInferenceSimpleSpanProcessor({
    exporter,
    spanFilter,
  });
};

/**
 * Default span filter that allows all spans and sanitizes attributes.
 */
export const createDefaultSpanFilter = (span: ReadableSpan): boolean => {
  sanitizeSpanAttributes(span);
  return true;
};

const sanitizeSpanAttributes = (span: ReadableSpan): void => {
  const cleanedAttributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(span.attributes ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      cleanedAttributes[key] = value;
    }
  }
  (span as unknown as { attributes: Record<string, unknown> }).attributes =
    cleanedAttributes;
};

export const FREEPLAY_DEFAULT_COLLECTOR_URL = DEFAULT_COLLECTOR_URL;

const getProcessEnv = (): NodeJS.ProcessEnv | undefined => {
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return undefined;
};

const buildHeaders = (
  apiKey: string,
  projectId: string,
  overrides?: Record<string, string>,
): Record<string, string> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "X-Freeplay-Project-Id": projectId,
  };

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        headers[key] = value;
      }
    }
  }

  return headers;
};

// Simple cache mapping toolCallId -> {spanId, sessionId}
// Used to link tool spans to their parent LLM spans
const toolCallIdCache = new Map<
  string,
  { spanId: string; sessionId: string }
>();

const cacheToolCallMetadata = (
  toolCallId: string,
  spanId: string,
  sessionId: string,
): void => {
  toolCallIdCache.set(toolCallId, { spanId, sessionId });
};

const getToolCallMetadata = (
  toolCallId: string,
): { spanId: string; sessionId: string } | undefined => {
  return toolCallIdCache.get(toolCallId);
};

const extractAndCacheToolCalls = (
  span: ReadableSpan,
  sessionId: string,
): void => {
  try {
    const attrs = (span.attributes ?? {}) as Record<string, unknown>;
    const toolCallsRaw = attrs["ai.response.toolCalls"];
    if (typeof toolCallsRaw !== "string") return;

    const parsed = JSON.parse(toolCallsRaw);
    if (!Array.isArray(parsed)) return;

    const spanId = span.spanContext().spanId;
    for (const tc of parsed) {
      if (tc && typeof tc.toolCallId === "string") {
        cacheToolCallMetadata(tc.toolCallId, spanId, sessionId);
      }
    }
  } catch {
    // ignore parsing errors
  }
};

const applyToolCallMetadataIfMatches = (span: ReadableSpan): void => {
  const attrs = (span.attributes ?? {}) as Record<string, unknown>;
  const toolCallId = attrs["ai.toolCall.id"];
  if (typeof toolCallId !== "string") return;

  const cached = getToolCallMetadata(toolCallId);
  if (!cached) {
    return;
  }

  // Set cached parent spanId and sessionId on the tool span
  if (!attrs["parent_span_id"]) {
    attrs["parent_span_id"] = cached.spanId;
  }
  if (!attrs["freeplay.session.id"]) {
    attrs["freeplay.session.id"] = cached.sessionId;
  }
  (span as unknown as { attributes: Record<string, unknown> }).attributes =
    attrs;
};

/**
 * Apply our built-in attribute mappings and cache tool call metadata.
 */
const applyStandardAttributeMappings = (span: ReadableSpan): void => {
  const attrs = (span.attributes ?? {}) as Record<string, unknown>;

  // Check for tool call metadata early
  applyToolCallMetadataIfMatches(span);

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

  // Extract and cache tool call IDs from ai.response.toolCalls if present
  const mappedSession = attrs["freeplay.session.id"];
  if (typeof mappedSession === "string" && mappedSession.length > 0) {
    extractAndCacheToolCalls(span, mappedSession);
  }

  // 2) Map functionId: ai.telemetry.functionId -> span.name
  const functionIdRaw = attrs["ai.telemetry.functionId"];
  if (functionIdRaw != null) {
    const functionId =
      typeof functionIdRaw === "string" ? functionIdRaw : String(functionIdRaw);
    const trimmedId = functionId.trim();
    if (trimmedId.length > 0) {
      (span as unknown as { name: string }).name = trimmedId;
    }
    delete attrs["ai.telemetry.functionId"];
  }

  (span as unknown as { attributes: Record<string, unknown> }).attributes =
    attrs;
};

// Buffer for tool spans waiting for their parent LLM span data
interface BufferedToolSpan {
  span: ReadableSpan;
}

const toolSpanBuffer = new Map<string, BufferedToolSpan>(); // keyed by toolCallId

const bufferToolSpan = (span: ReadableSpan): void => {
  const attrs = (span.attributes ?? {}) as Record<string, unknown>;
  const toolCallId = attrs["ai.toolCall.id"];
  if (typeof toolCallId !== "string") return;

  toolSpanBuffer.set(toolCallId, { span });
};

const flushBufferedToolSpans = (
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
    const attrs = (span.attributes ?? {}) as Record<string, unknown>;

    // Enrich with parent data
    if (!attrs["parent_span_id"]) {
      attrs["parent_span_id"] = parentSpanId;
    }
    if (!attrs["freeplay.session.id"]) {
      attrs["freeplay.session.id"] = sessionId ?? "";
    }

    (span as unknown as { attributes: Record<string, unknown> }).attributes =
      attrs;

    flushed.push(span);
    toolSpanBuffer.delete(toolCallId);
  }

  return flushed;
};

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
          const attrs = (span.attributes ?? {}) as Record<string, unknown>;
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

const extractToolCallIdsFromResponse = (toolCallsRaw: unknown): string[] => {
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
