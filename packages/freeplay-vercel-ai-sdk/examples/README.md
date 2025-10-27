# Freeplay Vercel AI SDK Examples

Example applications demonstrating how to use the Freeplay Vercel AI SDK in different environments.

## Examples

Ready-to-run examples demonstrating integration with popular frameworks:

- **[Next.js Example](./next/)** - Full-featured Next.js app with MCP support
- **[Node.js Example](./node/)** - Express backend + React frontend with streaming
- **[Test Run Example](./test-run/)** - End-to-end test runner for trace datasets

## Usage

Each example can be run in two ways:

### Clone & Run (Development/Testing)

From the repository root:

```bash
pnpm install
pnpm example:next      # Run Next.js example
pnpm example:node      # Run Node.js example
pnpm example:test-run  # Run test-run example
```

This uses workspace dependencies and is ideal for testing or contributing.

### Standalone (Starting Your Own Project)

Each example can be copied out and used independently. The examples reference the published `freeplay-vercel-ai-sdk` package from npm, so they work as standalone starting points for your own projects.

See each example's README for detailed standalone setup instructions.
