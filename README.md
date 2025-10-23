# Freeplay Agent SDKs Integrations

This repository contains Freeplay integrations for TypeScript agent frameworks.

## Packages

This is a monorepo containing the following packages:

### [freeplay-vercel-ai-sdk](packages/freeplay-vercel-ai-sdk/README.md)

Freeplay integration for Vercel AI SDK with OpenTelemetry observability.

## Examples

Ready-to-run examples demonstrating how to use Freeplay with popular frameworks:

### Quick Start

```bash
# Install all dependencies
pnpm install

# Run Next.js example
pnpm example:next

# Run Node.js example (both server and client)
pnpm example:node
```

### Available Examples

- **[Next.js Example](packages/freeplay-vercel-ai-sdk/examples/next/)** - Full-featured Next.js app with MCP support
- **[Node.js Example](packages/freeplay-vercel-ai-sdk/examples/node/)** - Express backend + React frontend with streaming

📖 See the [examples directory](packages/freeplay-vercel-ai-sdk/examples/) for detailed documentation and [SETUP.md](packages/freeplay-vercel-ai-sdk/examples/SETUP.md) for a complete setup guide.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

## License

See LICENSE file for details.
