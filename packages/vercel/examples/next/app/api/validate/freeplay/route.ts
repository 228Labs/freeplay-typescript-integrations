export async function GET() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for at least one model provider API key
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasVertex =
    !!process.env.GOOGLE_VERTEX_PROJECT && !!process.env.GOOGLE_CLIENT_EMAIL;
  const hasAIGateway = !!process.env.AI_GATEWAY_API_KEY;

  if (
    !hasOpenAI &&
    !hasAnthropic &&
    !hasGoogle &&
    !hasVertex &&
    !hasAIGateway
  ) {
    errors.push(
      "No model provider API key found. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or configure Google Vertex AI",
    );
  }

  // Add helpful warnings
  if (!process.env.FREEPLAY_OTEL_ENDPOINT) {
    warnings.push(
      "FREEPLAY_OTEL_ENDPOINT is not set. Using default: https://api.freeplay.ai/api/v0/otel/v1/traces",
    );
  }

  return Response.json({
    valid: errors.length === 0,
    errors,
    warnings,
  });
}
