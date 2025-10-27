import { registerOTel } from "@vercel/otel";
import { createFreeplaySpanProcessor } from "@freeplayai/vercel";

export function register() {
  const freeplayProcessor = createFreeplaySpanProcessor();

  registerOTel({
    serviceName: "fp-otel-nextjs-example",
    spanProcessors: [freeplayProcessor],
  });
}
