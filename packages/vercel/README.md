# Freeplay Vercel AI SDK

OpenTelemetry instrumentation for the [Vercel AI SDK](https://ai-sdk.dev/docs) with Freeplay integration.

## Features

- ✅ Automatic tracing of LLM calls and tool executions
- ✅ Drop-in span processor for `@vercel/otel`
- ✅ Session tracking and metadata support
- ✅ Works with Next.js and Node.js

## Installation

```bash
npm install @freeplayai/vercel @vercel/otel @arizeai/openinference-vercel @opentelemetry/api @opentelemetry/sdk-trace-base
```

<details>
<summary>Other package managers</summary>

```bash
# pnpm
pnpm add @freeplayai/vercel @vercel/otel @arizeai/openinference-vercel @opentelemetry/api @opentelemetry/sdk-trace-base

# yarn
yarn add @freeplayai/vercel @vercel/otel @arizeai/openinference-vercel @opentelemetry/api @opentelemetry/sdk-trace-base

# bun
bun add @freeplayai/vercel @vercel/otel @arizeai/openinference-vercel @opentelemetry/api @opentelemetry/sdk-trace-base
```

</details>

## Quick Start

### Environment

Create a `.env` or `.env.local` file with your Freeplay credentials:

```env
FREEPLAY_API_KEY=your_api_key_here
FREEPLAY_PROJECT_ID=your_project_id_here
```

Optional: customize the endpoint (defaults to `https://api.freeplay.ai/api/v0/otel/v1/traces`):

```env
FREEPLAY_OTEL_ENDPOINT=https://your-subdomain.freeplay.ai/api/v0/otel/v1/traces
```

### Next.js Setup

Create an `instrumentation.ts` file at your project root:

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";
import { createFreeplaySpanProcessor } from "@freeplayai/vercel";

export function register() {
  registerOTel({
    serviceName: "fp-otel-nextjs-example",
    spanProcessors: [createFreeplaySpanProcessor()],
  });
}
```

Then use telemetry in your API routes:

```ts
// app/api/chat/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    messages,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "nextjs-streamText",
      metadata: {
        sessionId: chatId,
      },
    },
  });

  return result.toDataStreamResponse();
}
```

### Node.js Setup

Initialize the SDK at the top of your entry point:

```ts
// server.ts or index.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { createFreeplaySpanProcessor } from "@freeplayai/vercel";

const sdk = new NodeSDK({
  spanProcessors: [createFreeplaySpanProcessor()],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
});
```

Then use telemetry in your AI calls:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const result = streamText({
  model: anthropic("claude-haiku-4-5"),
  messages,
  experimental_telemetry: {
    isEnabled: true,
    functionId: "node-example-chat",
    metadata: {
      sessionId: chatId,
    },
  },
});
```

## How It Works

The span processor:

1. Intercepts spans from the Vercel AI SDK
2. Maps AI SDK attributes to Freeplay's format
3. Buffers tool spans until their parent LLM span arrives
4. Links tool calls with parent spans and session metadata
5. Exports processed spans to Freeplay via OTLP/HTTP

## Configuration

### `createFreeplaySpanProcessor(options?)`

```ts
interface CreateFreeplaySpanProcessorOptions {
  apiKey?: string; // Defaults to FREEPLAY_API_KEY
  projectId?: string; // Defaults to FREEPLAY_PROJECT_ID
  endpoint?: string; // Defaults to FREEPLAY_OTEL_ENDPOINT
}
```

**Example:**

```ts
createFreeplaySpanProcessor({
  apiKey: "fp_...",
  projectId: "my-project-123",
  endpoint: "https://custom.freeplay.ai/api/v0/otel/v1/traces",
});
```

## Advanced Usage

### Tool Call Tracing

Tool calls are automatically traced and linked to their parent LLM spans:

```ts
import { tool } from "ai";
import { z } from "zod";

const result = streamText({
  model: anthropic("claude-haiku-4-5"),
  tools: {
    add: tool({
      description: "Add two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a + b,
    }),
    multiply: tool({
      description: "Multiply two numbers",
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a * b,
    }),
  },
  prompt: "What is 5 plus 3, then multiply that by 2?",
  experimental_telemetry: {
    isEnabled: true,
    functionId: "math-calculation",
    metadata: {
      sessionId: chatId,
    },
  },
});
```

### MCP (Model Context Protocol) Support

The library works seamlessly with MCP tools. See the [examples](./examples/) for complete implementations:

```ts
import { experimental_createMCPClient } from "ai";

const client = await experimental_createMCPClient({ transport });
const tools = await client.tools();

const result = streamText({
  model: anthropic("claude-haiku-4-5"),
  tools, // MCP tools are automatically traced
  experimental_telemetry: {
    isEnabled: true,
    functionId: "mcp-chat",
  },
});
```

## Examples

Ready-to-run examples demonstrating integration with popular frameworks:

- **[Next.js Example](./examples/next/)** - Full-featured Next.js app with MCP support
- **[Node.js Example](./examples/node/)** - Express backend + React frontend with streaming

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Type checking
pnpm typecheck

# Lint and format
pnpm lint
pnpm format
```

## Requirements

- Node.js ≥18
- TypeScript ≥5.0 (for development)
- Vercel AI SDK with `experimental_telemetry` support

## License

MIT
