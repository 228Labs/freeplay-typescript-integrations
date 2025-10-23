// @ts-check

import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from shared examples/.env
const projectDir = path.resolve(__dirname, "..");
loadEnvConfig(projectDir);

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["freeplay-vercel-ai-sdk"], // Transpile the linked package
  outputFileTracingRoot: path.join(__dirname, "../../"), // Support monorepo structure
};

export default nextConfig;
