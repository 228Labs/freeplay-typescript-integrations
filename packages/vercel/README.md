# @freeplayai/vercel

Freeplay integration for the [Vercel AI SDK](https://ai-sdk.dev/docs) with OpenTelemetry observability and Freeplay prompt management.

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

## ⛰️ Choose your own adventure

### 🚀 Quick Start Examples

Want see the library in action ASAP? Go straight to the [examples](./examples/README.md) and see Freeplay Telemetry flowing in minutes.

### 📚 Existing Project Integration

If you're already using the Vercel AI SDK, you can easily integrate with Freeplay by jumping straight to the [Quick Start](#quick-start) guide.

## Quick Start

### Environment

Create a `.env` or `.env.local` file with your Freeplay credentials:

```env
FREEPLAY_API_KEY=your_api_key_here
FREEPLAY_PROJECT_ID=your_project_id_here
# Optional: defaults to https://api.freeplay.ai/api/v0/otel/v1/traces
FREEPLAY_OTEL_ENDPOINT=https://your-subdomain.freeplay.ai/api/v0/otel/v1/traces
```

<details>
<summary>Supported model providers</summary>

```bash
# AI Gateway - Model still must be OpenAI, Anthropic, Google or Vertex
AI_GATEWAY_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google
GOOGLE_GENERATIVE_AI_API_KEY=

# Google Vertex
GOOGLE_VERTEX_LOCATION=
GOOGLE_VERTEX_PROJECT=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_PRIVATE_KEY_ID=
```

</details>

### Next.js Setup

Create an `instrumentation.ts` file at your project root:

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";
import { createFreeplaySpanProcessor } from "@freeplayai/vercel";

export function register() {
  registerOTel({
    serviceName: "otel-nextjs-example",
    spanProcessors: [createFreeplaySpanProcessor()],
  });
}
```

Then use telemetry in your API routes:

#### Without Freeplay prompt management (pure OpenTelemetry)

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

#### With Freeplay prompt management

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import {
  getPrompt,
  FreeplayModel,
  createFreeplayTelemetry,
} from "@freeplayai/vercel";

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  const inputVariables = {
    accent: "cowboy",
  };

  // Get prompt from Freeplay
  const prompt = await getPrompt({
    templateName: "funny-accent", // Replace with your prompt name
    variables: inputVariables,
    messages,
  });

  // Automatically select the correct model provider based on the prompt
  const model = await FreeplayModel(prompt);

  const result = streamText({
    model,
    messages,
    system: prompt.systemContent,
    experimental_telemetry: createFreeplayTelemetry(prompt, {
      functionId: "nextjs-streamText",
      sessionId: chatId,
      inputVariables,
    }),
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

#### Without Freeplay prompt management (pure OpenTelemetry)

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

#### With Freeplay prompt management

```ts
import {
  getPrompt,
  FreeplayModel,
  createFreeplayTelemetry,
} from "@freeplayai/vercel";
import { streamText } from "ai";

// Define input variables for your prompt
const inputVariables = {
  accent: "cowboy",
};

// Get prompt from Freeplay
const prompt = await getPrompt({
  templateName: "funny-accent",
  variables: inputVariables,
  messages,
});

// Automatically select the correct model provider based on the prompt
const model = await FreeplayModel(prompt);

const result = streamText({
  model,
  system: prompt.systemContent,
  messages,
  experimental_telemetry: createFreeplayTelemetry(prompt, {
    functionId: "chat-function",
    sessionId: chatId,
    inputVariables,
  }),
});
```

## Documentation

### `createFreeplaySpanProcessor(options?)`

Creates a span processor that handles OpenTelemetry trace export to Freeplay, including attribute mapping and tool call linking.

```ts
interface CreateFreeplaySpanProcessorOptions {
  apiKey?: string; // Defaults to FREEPLAY_API_KEY
  projectId?: string; // Defaults to FREEPLAY_PROJECT_ID
  endpoint?: string; // Defaults to FREEPLAY_OTEL_ENDPOINT
}
```

**Example:**

```ts
createFreeplaySpanProcessor();

// or with explicit options
createFreeplaySpanProcessor({
  apiKey: string,
  projectId: string,
  endpoint: string,
});
```

### `createFreeplayTelemetry(prompt, options)`

Creates a telemetry configuration object for use with Vercel AI SDK's `experimental_telemetry`. Automatically extracts and attaches Freeplay prompt metadata from the prompt object.

```ts
interface CreateFreeplayTelemetryOptions {
  functionId: string;
  sessionId: string;
  inputVariables?: Record<string, any>;
  additionalMetadata?: Record<string, any>;
}
```

**Example:**

```ts
createFreeplayTelemetry(prompt, {
  functionId: "nextjs-streamText",
  sessionId: chatId,
  inputVariables: { accent: "cowboy" },
  additionalMetadata: { userId: "user-123" },
});
```

### `getPrompt(options)`

Fetches a formatted prompt from Freeplay with the specified template name and variables.

```ts
async function getPrompt(options: {
  templateName: string;
  messages: ModelMessage[];
  environment?: string;
  projectID?: string;
  variables?: InputVariables;
}): Promise<FormattedPrompt<ProviderMessage>>;
```

**Example:**

```ts
const prompt = await getPrompt({
  templateName: "funny-accent",
  messages: conversationHistory,
  environment: "production",
  variables: { accent: "cowboy" },
});
```

### `FreeplayModel(prompt)`

Creates a model instance using the model string from the prompt result and automatically selects the appropriate AI SDK provider.

Supports direct use of OpenAI, Anthropic, Google, and Vertex AI, or proxying via the Vercel AI Gateway.

**Example:**

```ts
const prompt = await getPrompt({ templateName: "my-template", messages: [] });
const model = await FreeplayModel(prompt);

// model is now configured with the correct provider (openai, anthropic, google, or vertex) or proxied via the Vercel AI Gateway
const result = await streamText({
  model,
  messages,
  system: prompt.systemContent,
});
```

## Requirements

- Node.js ≥18
- TypeScript ≥5.0 (for development)
- Vercel AI SDK v5.0.0 or later
