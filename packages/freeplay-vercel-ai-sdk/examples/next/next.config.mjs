// @ts-check

import nextEnv from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from shared examples/.env
const projectDir = path.resolve(__dirname, "..");
loadEnvConfig(projectDir);

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["freeplay-vercel-ai-sdk"], // Transpile the linked package
  outputFileTracingRoot: path.join(__dirname, "../../"), // Support monorepo structure
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages in server-side code
      config.externals.push(
        "@ai-sdk/google-vertex",
        "@ai-sdk/openai",
        "@ai-sdk/anthropic",
        "@ai-sdk/google",
        "freeplay",
      );
    }
    return config;
  },
};

export default nextConfig;
