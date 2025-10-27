# Freeplay Vercel AI SDK - Next.js Example

### Basic chat + MCP Example (`/chat`)

Demonstrates a basic chat endpoint using Next.js + the Vercel AI SDK instrumented with Freeplay's Vercel OpenTelemetry integration.

## Quick Start

### Option 1: Clone & Run (Recommended for Testing)

The easiest way to run this example from the repository:

```bash
# From repository root - installs all dependencies
pnpm install

# Run the Next.js example
pnpm example:next
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Standalone Setup (For Your Own Project)

To use this example as a starting point for your own project:

```bash
# 1. Copy this example directory to your project location
cp -r packages/freeplay-vercel-ai-sdk/examples/next my-freeplay-app
cd my-freeplay-app

# 2. Install dependencies (uses published package from npm)
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your keys

# 4. Run the development server
npm run dev
```

### Environment Variables

Required variables:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
FREEPLAY_API_KEY=your_freeplay_api_key_here
FREEPLAY_PROJECT_ID=your_freeplay_project_id_here
```

See the [main README](../../README.md) for how to obtain Freeplay credentials.
