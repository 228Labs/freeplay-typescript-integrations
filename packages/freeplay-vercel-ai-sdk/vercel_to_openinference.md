OpenInference attributes emitted (via @arizeai/openinference-vercel)

This document lists the OpenInference attributes produced from Vercel AI SDK spans when processed by `@arizeai/openinference-vercel` (v2.3.4). It consolidates the AI SDK Telemetry docs with the library’s source code to show exactly what our ingestion endpoint should expect.

Key points:

- Span attributes are mutated on span end to add OpenInference attributes.
- `openinference.span.kind` is derived from the Vercel `operation.name` mapping unless already present.
- Some Vercel attributes are not mapped to OpenInference by the library (see “Not mapped” section).

## Span kind mapping (operation.name → openinference.span.kind)

If `openinference.span.kind` is not already set, it is inferred from `operation.name`:

- ai.generateText → CHAIN
- ai.generateText.doGenerate → LLM
- ai.generateObject → CHAIN
- ai.generateObject.doGenerate → LLM
- ai.streamText → CHAIN
- ai.streamText.doStream → LLM
- ai.streamObject → CHAIN
- ai.streamObject.doStream → LLM
- ai.embed → CHAIN
- ai.embed.doEmbed → EMBEDDING
- ai.embedMany → CHAIN
- ai.embedMany.doEmbed → EMBEDDING
- ai.toolCall → TOOL

Emitted attribute:

- openinference.span.kind: "LLM" | "CHAIN" | "EMBEDDING" | "TOOL"

## Model attributes

- For LLM spans: `llm.model_name = ai.model.id`
- For EMBEDDING spans: `embedding.model_name = ai.model.id`

## Invocation parameters (from ai.settings.\*)

- All `ai.settings.<param>` keys are aggregated into an object and emitted as a JSON string:
  - `llm.invocation_parameters = JSON.stringify({ <param>: value, ... })`

## Token counts (LLM only)

- `llm.token_count.prompt = ai.usage.promptTokens`
- `llm.token_count.completion = ai.usage.completionTokens`

Note: token counts are only emitted for spans whose `openinference.span.kind` resolves to LLM (not for CHAIN/EMBEDDING/TOOL).

## Input/output values and MIME type

MIME inference rule: a string value is considered JSON if it parses to a non-null object; otherwise TEXT.

- From `ai.prompt`:
  - `input.value`
  - `input.mime_type` ("application/json" vs "text/plain")

- From `ai.response.text` or `ai.response.object`:
  - `output.value`
  - `output.mime_type` ("application/json" vs "text/plain")

## LLM input messages (from ai.prompt.messages)

When `ai.prompt.messages` is a JSON-stringified array of message objects, it is expanded to `llm.input_messages.N.*`:

- Always:
  - `llm.input_messages.N.message.role`

- If `message.role === "tool"`:
  - `llm.input_messages.N.message.tool_call_id`
  - `llm.input_messages.N.tool.name`
  - `llm.input_messages.N.message.content` (string or JSON-stringified result)

- If `message.content` is an array of content parts, each part K yields:
  - `llm.input_messages.N.message.contents.K.type`
  - `llm.input_messages.N.message.contents.K.text`
  - `llm.input_messages.N.message.contents.K.image`
  - Tool call information per part (when present):
    - `llm.input_messages.N.message.tool_calls.K.tool_call_id`
    - `llm.input_messages.N.message.tool_calls.K.function.name`
    - `llm.input_messages.N.message.tool_calls.K.function.arguments_json`

- If `message.content` is a plain string:
  - `llm.input_messages.N.message.content`

## LLM output tool calls (from ai.response.toolCalls)

When `ai.response.toolCalls` is a JSON-stringified array, the processor emits a single assistant output message with tool calls:

- `llm.output_messages.0.message.role = "assistant"`
- For each tool call K:
  - `llm.output_messages.0.message.tool_calls.K.function.name`
  - `llm.output_messages.0.message.tool_calls.K.function.arguments_json`

## Metadata (from ai.telemetry.metadata.\*)

- Each `ai.telemetry.metadata.<key>` becomes:
  - `metadata.<key>`

## Tool spans (ai.toolCall)

Direct tool attributes:

- `tool.call_id = ai.toolCall.id`
- `tool.name = ai.toolCall.name`
- `tool.parameters = ai.toolCall.args`

Additionally, for TOOL spans only:

- Treat arguments as input:
  - `input.value = ai.toolCall.args`
  - `input.mime_type = inferred from args`
- Treat result as output (only if present):
  - `output.value = ai.toolCall.result`
  - `output.mime_type = inferred from result`

## Embeddings

The processor normalizes embedding values (stringified arrays → arrays when possible):

- Single value (from `ai.value` or `ai.embedding`):
  - `embedding.embeddings.0.embedding_text` or `embedding.embeddings.0.embedding_vector`

- Arrays (from `ai.values` or `ai.embeddings`):
  - `embedding.embeddings.N.embedding_text` or `embedding.embeddings.N.embedding_vector`

## Not mapped by the processor (won’t become OpenInference attributes)

These Vercel AI SDK telemetry attributes appear in the docs but are not translated by `@arizeai/openinference-vercel` into OpenInference keys (unless you mirror them under `ai.telemetry.metadata.*`, which then become `metadata.<key>`):

- `ai.response.finishReason`
- `ai.response.msToFirstChunk`
- `ai.response.msToFinish`
- `ai.response.avgCompletionTokensPerSecond`
- `ai.response.id`
- `ai.response.timestamp`
- `ai.response.model`
- `ai.operationId`
- `ai.prompt.tools` (definitions)
- `ai.prompt.toolChoice`
- `ai.schema`, `ai.schema.name`, `ai.schema.description`
- `ai.request.headers.*`
- `ai.response.providerMetadata`
- `gen_ai.*` (OpenTelemetry GenAI semconv fields listed in docs)
- `ai.model.provider`
- `ai.usage.tokens`
- `resource.name`

Note: these may still appear as raw Vercel attributes on the span, but the OpenInference processor does not map them into the OpenInference namespace.

## Field reference (source → emitted OpenInference)

- `operation.name` → `openinference.span.kind` (by mapping; preserved if already set)
- `ai.model.id` → `llm.model_name` (LLM) or `embedding.model_name` (EMBEDDING)
- `ai.settings.*` → `llm.invocation_parameters` (JSON string of aggregated settings)
- `ai.usage.promptTokens` → `llm.token_count.prompt` (LLM only)
- `ai.usage.completionTokens` → `llm.token_count.completion` (LLM only)
- `ai.prompt` → `input.value`, `input.mime_type`
- `ai.prompt.messages` → `llm.input_messages.N.*`
- `ai.response.text` → `output.value`, `output.mime_type`
- `ai.response.object` → `output.value`, `output.mime_type`
- `ai.response.toolCalls` → `llm.output_messages.0.message.*` (assistant role + tool_calls)
- `ai.telemetry.metadata.*` → `metadata.<key>`
- `ai.value` / `ai.values` → `embedding.embeddings.N.embedding_text`
- `ai.embedding` / `ai.embeddings` → `embedding.embeddings.N.embedding_vector`
- `ai.toolCall.id` → `tool.call_id`
- `ai.toolCall.name` → `tool.name`
- `ai.toolCall.args` → `tool.parameters` (and on TOOL spans also `input.value/mime_type`)
- `ai.toolCall.result` → on TOOL spans only: `output.value/mime_type`

## Notes and edge cases

- MIME detection is best-effort: if a string parses to a non-null object, it’s treated as JSON; otherwise TEXT.
- `ai.prompt.messages` and `ai.response.toolCalls` must be valid JSON strings for message/tool-call expansions to emit attributes.
- Token counts are suppressed on non-LLM spans to prevent double-counting when CHAIN spans wrap LLM spans.
