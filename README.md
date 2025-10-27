# Freeplay Agent SDKs Integrations

This repository contains Freeplay integrations for TypeScript agent frameworks.

## Packages

This is a monorepo containing the following packages:

### [vercel](packages/vercel/README.md)

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

- **[Next.js Example](packages/vercel/examples/next/)** - Full-featured Next.js app with MCP support
- **[Node.js Example](packages/vercel/examples/node/)** - Express backend + React frontend with streaming

📖 See the [examples directory](packages/vercel/examples/) for detailed documentation and [SETUP.md](packages/vercel/examples/SETUP.md) for a complete setup guide.

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
