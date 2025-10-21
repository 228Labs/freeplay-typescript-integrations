# Freeplay Telemetry for the Vercel AI SDK

Instrument the [Vercel AI SDK](https://ai-sdk.dev/docs) with OpenTelemetry and forward spans straight to Freeplay. This package installs the correct span processors, exports a ready-to-use OTLP HTTP exporter, and gives you helpers for wiring the AI SDK’s `experimental_telemetry` flag into your routes and agents.

## What you get

- ✅ `registerFreeplayTelemetry` – registers `@vercel/otel` with Freeplay defaults
- ✅ `createFreeplayTelemetry` – produces AI SDK `experimental_telemetry` payloads with project metadata
- ✅ Opinionated OpenInference span processor that removes problematic attributes before export
- ✅ Fully typed configuration with environment fallbacks for keys, project IDs, and OTLP endpoints
- ✅ Batteries-included dev tooling (TypeScript, tsup, ESLint, Prettier, Vitest)

## Installation

```bash
npm install freeplay-vercel-ai-sdk
```

Install the required peer dependencies alongside your AI SDK application:

```bash
npm install \
  @vercel/otel \
  @arizeai/openinference-vercel \
  @opentelemetry/api \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/exporter-trace-otlp-proto
```

## Setup

### 1. Instrument your runtime

For Next.js (App Router), add an `instrumentation.ts` file at the project root:

```ts
// instrumentation.ts
import { registerFreeplayTelemetry } from "freeplay-vercel-ai-sdk";

export function register() {
  registerFreeplayTelemetry({
    serviceName: "freeplay-vercel-ai-app",
    resourceAttributes: {
      "service.version": "1.0.0",
    },
  });
}
```

This should run before your application code (Next.js automatically calls `register()` on boot).

### 2. Configure environment variables

- `FREEPLAY_API_KEY` – Freeplay API key for OTLP ingestion
- `FREEPLAY_PROJECT_ID` – Freeplay project identifier used for routing spans

Optional overrides:

- `FREEPLAY_OTEL_ENDPOINT` – Custom OTLP collector (defaults to Freeplay production)
- `OTEL_SERVICE_NAME` – Service name override (the helper fills this if missing)
- `OTEL_RESOURCE_ATTRIBUTES` – Additional OTEL resource attributes (`key=value,key2=value2`)

### 3. Capture spans from AI SDK calls

Enable telemetry per invocation using the AI SDK’s `experimental_telemetry` option. `createFreeplayTelemetry` builds the correct payload and injects metadata so downstream spans are tagged with your project.

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createFreeplayTelemetry } from "freeplay-vercel-ai-sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const telemetry = createFreeplayTelemetry({
    functionId: "app.api.chat",
    metadata: { route: "chat" },
  });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: convertToModelMessages(messages),
    experimental_telemetry: telemetry,
  });

  return result.toUIMessageStreamResponse();
}
```

You can apply the same helper to `generateText`, `generateObject`, `embedMany`, agents, or any other AI SDK call:

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const { text } = await generateText({
  model: openai("gpt-4.1"),
  prompt: "Summarise the conversation.",
  experimental_telemetry: createFreeplayTelemetry({
    functionId: "actions.summarise",
    recordInputs: false, // redact raw prompts if required
  }),
});
```

## Configuration reference

- `registerFreeplayTelemetry(options)` lets you override OTLP endpoints, headers, span processors, or supply a preconfigured exporter. Pass `spanFilter` if you need custom attribute sanitisation.
- `createFreeplayTelemetry(options)` returns the object expected by the AI SDK `experimental_telemetry` flag. It automatically sets `isEnabled: true` and adds a `freeplay.projectId` metadata field unless `includeProjectMetadata` is disabled. You can override `functionId`, attach additional metadata, or provide a custom `Tracer`.

Need more control? Call `registerFreeplayTelemetry` with a custom exporter and use the returned `createTelemetry` builder to tweak per-call defaults while still benefiting from Freeplay metadata injection.

## Development scripts

```bash
npm install      # Install dependencies
npm run lint     # Static analysis (ESLint + TypeScript rules)
npm run test     # Vitest unit tests
npm run build    # Bundle ESM/CJS outputs + type declarations
npm run format   # Prettier formatting check
```

## Project layout

- `src/telemetry.ts` – Telemetry registration, configuration helpers, and utilities
- `tests/telemetry.test.ts` – Unit coverage for registration, telemetry builders, and span filtering
- `dist/` – Build artefacts (generated via `npm run build`)

## License

MIT © Freeplay
