# Freeplay Vercel AI SDK - Node.js Example

### Basic chat + MCP Example

Demonstrates a Node.js Express backend with a React frontend using the Vercel AI SDK instrumented with Freeplay's Vercel OpenTelemetry integration.

## Quick Start

### Option 1: Clone & Run (Recommended for Testing)

The easiest way to run this example from the repository:

```bash
# From repository root - installs all dependencies
pnpm install

# Run both server and client in parallel
pnpm example:node
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Standalone Setup (For Your Own Project)

To use this example as a starting point for your own project:

```bash
# 1. Copy the server and client directories
cp -r packages/freeplay-vercel-ai-sdk/examples/node/server my-app/server
cp -r packages/freeplay-vercel-ai-sdk/examples/node/client my-app/client
cd my-app

# 2. Install server dependencies
cd server
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your keys

# 4. Start the server
npm run dev

# 5. In a new terminal, install and start the client
cd ../client
npm install
npm run dev
```

### Environment Variables

Server requires these variables in `server/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
FREEPLAY_API_KEY=your_freeplay_api_key_here
FREEPLAY_PROJECT_ID=your_freeplay_project_id_here
```

See the [main README](../../README.md) for how to obtain Freeplay credentials.
