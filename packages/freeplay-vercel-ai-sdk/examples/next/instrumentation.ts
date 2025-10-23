import { registerOTel } from "@vercel/otel";
import { createFreeplaySpanProcessor } from "freeplay-vercel-ai-sdk";

export function register() {
  const freeplayProcessor = createFreeplaySpanProcessor();

  registerOTel({
    serviceName: "fp-otel-nextjs-example",
    spanProcessors: [freeplayProcessor],
  });
}
