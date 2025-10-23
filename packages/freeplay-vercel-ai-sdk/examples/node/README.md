# Freeplay Vercel AI SDK - Node.js Example

### Basic chat + MCP Example

Demonstrates a Node.js Express backend with a React frontend using the Vercel AI SDK instrumented with Freeplay's Vercel OpenTelemetry integration.

## Quick Start

### Environment

Create a `.env` file in this directory with your API keys:

```bash
# In packages/freeplay-vercel-ai-sdk/examples/node/
cp .env.example .env
# Edit .env and add your keys
```

Required variables:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
FREEPLAY_API_KEY=your_freeplay_api_key_here
FREEPLAY_PROJECT_ID=your_freeplay_project_id_here
```

See the [main README](../../README.md) for how to obtain Freeplay credentials.

### Running the example

The easiest way to run this example:

```bash
# From repository root - installs all dependencies
pnpm install

# Run both server and client in parallel
pnpm example:node
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.
