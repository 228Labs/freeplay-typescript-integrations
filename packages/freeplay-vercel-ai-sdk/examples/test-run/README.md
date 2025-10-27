# Freeplay Vercel AI SDK - End-to-End Test Run Example

This example demonstrates how to run end-to-end tests using Freeplay's test run functionality with the Vercel AI SDK.

## What This Does

This script:

1. Creates a test run against a trace dataset in Freeplay
2. Iterates through all test cases in the dataset
3. Executes each test case through your AI system using `streamText`
4. Records all telemetry and results back to Freeplay
5. Links test run metadata (test run ID and test case ID) to each execution

## Prerequisites

- A Freeplay account with a project set up
- A trace dataset (agent dataset) created in Freeplay with test cases
- A prompt template configured in Freeplay
- API keys for your LLM provider (Anthropic, OpenAI, etc.)

## Configuration

Before running, update the following values in `src/index.ts`:

```typescript
const CONFIG = {
  PROJECT_ID: FREEPLAY_PROJECT_ID, // Set via env var
  TRACE_DATASET_NAME: "YOUR_DATASET_NAME", // Name of your trace dataset
  TEST_RUN_NAME: "End-to-End Test Run", // Name for this test run
  TEMPLATE_NAME: "funny-accent", // Your prompt template name
  TEMPLATE_ENV: "sandbox", // 'sandbox' | 'latest' | 'production'
  AGENT_NAME: "TestAgent", // Your agent name
};
```

## Environment Variables

Required environment variables (create a `.env` file in the `examples/` directory or set them in your environment):

```env
# Freeplay credentials
FREEPLAY_API_KEY=your_freeplay_api_key_here
FREEPLAY_PROJECT_ID=your_freeplay_project_id_here

# LLM Provider credentials (depending on which model you're using)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Quick Start

### Option 1: Clone & Run (Recommended for Testing)

From the repository root:

```bash
# Install dependencies
pnpm install

# Run the test
pnpm --filter freeplay-vercel-ai-sdk-test-run-example start
```

### Option 2: Standalone Setup

```bash
# 1. Copy this directory to your project
cp -r packages/freeplay-vercel-ai-sdk/examples/test-run my-test-runner
cd my-test-runner

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp ../examples/.env.example .env
# Edit .env and add your keys

# 4. Update configuration in src/index.ts

# 5. Run the test
npm start
```

## How It Works

### 1. Test Run Creation

The script creates a test run against your trace dataset:

```typescript
const testRun = await fpClient.testRuns.create({
  projectId: CONFIG.PROJECT_ID,
  testlist: CONFIG.TRACE_DATASET_NAME,
  name: CONFIG.TEST_RUN_NAME,
});
```

### 2. Test Case Execution

For each test case, the script:

- Creates a session and trace
- Runs the agent using `streamText` with Freeplay telemetry
- Passes test run metadata in the telemetry call

```typescript
const result = streamText({
  model,
  system: prompt.systemContent,
  messages: messages,
  experimental_telemetry: createFreeplayTelemetry(prompt, {
    functionId: CONFIG.AGENT_NAME,
    sessionId: sessionId,
    inputVariables: variables,
    metadata: {
      testRunId: testRun.id,
      testCaseId: testCase.id,
    },
  }),
});
```

### 3. Results Recording

After execution, results are recorded back to Freeplay:

```typescript
await trace.recordOutput({
  projectId: CONFIG.PROJECT_ID,
  output: assistantText,
  evalResults,
  testRunInfo: {
    testRunId: testRun.id,
    testCaseId: testCase.id,
  },
});
```

## Adding Custom Evaluations

To add custom evaluation logic, modify the `evalResults` section:

```typescript
const evalResults = {
  evaluation_score: calculateScore(assistantText),
  is_high_quality: assessQuality(assistantText),
  custom_metric: yourCustomMetric(assistantText),
};
```

## Viewing Results

After the test run completes, view results in Freeplay:

- Navigate to your project's test runs page
- Find your test run by name
- Review aggregate metrics and individual test case results
- Compare different test runs to track improvements

## Advanced Usage

### Multi-Agent Systems

For systems with multiple agents, create separate traces or calls for each agent:

```typescript
// Primary agent
const primaryResponse = await runAgent({
  sessionId,
  variables: { ...variables, agent: "primary" },
  messages: [{ role: "user", content: question }],
  testRunId: testRun.id,
  testCaseId: testCase.id,
});

// Specialist agent if needed
if (requiresSpecialist(primaryResponse)) {
  const finalResponse = await runAgent({
    sessionId,
    variables: { ...variables, agent: "specialist", context: primaryResponse },
    messages: [{ role: "user", content: question }],
    testRunId: testRun.id,
    testCaseId: testCase.id,
  });
}
```

### Tool Usage

If your agent uses tools, the Vercel AI SDK automatically tracks tool calls through the telemetry system. Simply add tools to your `streamText` call:

```typescript
const result = streamText({
  model,
  tools: yourTools,
  system: prompt.systemContent,
  messages: messages,
  experimental_telemetry: createFreeplayTelemetry(prompt, {
    functionId: CONFIG.AGENT_NAME,
    sessionId: sessionId,
    inputVariables: variables,
    metadata: { testRunId, testCaseId },
  }),
});
```

## Troubleshooting

**No test cases found**: Ensure your trace dataset name is correct and contains test cases

**Authentication errors**: Verify your API keys are set correctly in environment variables

**Model not found**: Ensure your prompt template specifies a valid model and you have the correct provider API key

## Learn More

- [Freeplay End-to-End Testing Docs](https://docs.freeplay.ai/docs/end-to-end-testing)
- [Freeplay Vercel AI SDK Integration](https://docs.freeplay.ai/docs/vercel-ai-sdk)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai)
