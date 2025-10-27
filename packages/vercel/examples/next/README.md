# Freeplay Vercel AI SDK - Next.js Example

### Basic chat + MCP Example (`/chat`)

Demonstrates a basic chat endpoint using Next.js + the Vercel AI SDK instrumented with Freeplay's Vercel OpenTelemetry integration.

## How to run

### Environment Setup

Create a `.env` or `.env.local` file within the `examples` directory, following the format specified [here](../../README.md#environment).

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
cp -r packages/vercel/examples/next my-freeplay-app
cd my-freeplay-app

# 2. Install dependencies (uses published package from npm)
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your keys

# 4. Run the development server
npm run dev
```
