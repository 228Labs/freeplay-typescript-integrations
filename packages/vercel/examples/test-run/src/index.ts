import { NodeSDK } from "@opentelemetry/sdk-node";
import { ModelMessage, streamText } from "ai";
import dotenv from "dotenv";
import Freeplay from "freeplay";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFreeplaySpanProcessor,
  getPrompt,
  FreeplayModel,
  createFreeplayTelemetry,
} from "@freeplayai/vercel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from shared examples/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate required environment variables
const FREEPLAY_API_KEY = process.env.FREEPLAY_API_KEY;
const FREEPLAY_PROJECT_ID = process.env.FREEPLAY_PROJECT_ID;

if (!FREEPLAY_API_KEY) {
  throw new Error("FREEPLAY_API_KEY is not set in environment variables");
}
if (!FREEPLAY_PROJECT_ID) {
  throw new Error("FREEPLAY_PROJECT_ID is not set in environment variables");
}

// ============================================
// Configuration - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  PROJECT_ID: FREEPLAY_PROJECT_ID,
  TRACE_DATASET_NAME: "YOUR_DATASET_NAME", // TODO: Replace with your trace dataset name
  TEST_RUN_NAME: "End-to-End Test Run", // TODO: Replace with your test run name
  TEMPLATE_NAME: "funny-accent", // TODO: Replace with your prompt template name
  TEMPLATE_ENV: "sandbox" as "sandbox" | "latest" | "production", // or 'latest' | 'production'
  AGENT_NAME: "TestAgent", // TODO: Replace with your agent name
};

// Initialize OpenTelemetry with Freeplay
const sdk = new NodeSDK({
  spanProcessors: [createFreeplaySpanProcessor()],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
});

// Initialize Freeplay client
const fpClient = new Freeplay({
  freeplayApiKey: FREEPLAY_API_KEY,
  baseUrl: "http://localhost:8080/api",
});

/**
 * Run agent with streamText and record to Freeplay
 */
async function runAgent(options: {
  sessionId: string;
  variables: Record<string, any>;
  messages: Array<{ role: string; content: string }>;
  testRunId?: string;
  testCaseId?: string;
}): Promise<string> {
  const { sessionId, variables, messages, testRunId, testCaseId } = options;

  // Get prompt from Freeplay
  const prompt = await getPrompt({
    templateName: CONFIG.TEMPLATE_NAME,
    environment: CONFIG.TEMPLATE_ENV,
    variables,
    messages,
  });

  // Automatically select the correct model provider based on the prompt
  const model = await FreeplayModel(prompt);

  // Create metadata for test run tracking
  const metadata: Record<string, any> = {
    version: "1.0.0",
    ...variables,
  };

  if (testRunId) {
    metadata.testRunId = testRunId;
  }
  if (testCaseId) {
    metadata.testCaseId = testCaseId;
  }

  // Stream the response
  const result = streamText({
    model,
    system: prompt.systemContent,
    messages: messages as ModelMessage[],
    experimental_telemetry: createFreeplayTelemetry(prompt, {
      functionId: CONFIG.AGENT_NAME,
      sessionId: sessionId,
      inputVariables: variables,
      metadata, // Pass test run metadata here
    }),
  });

  // Collect the full response
  let fullResponse = "";
  for await (const chunk of result.textStream) {
    fullResponse += chunk;
  }

  return fullResponse;
}

/**
 * Main test run execution
 */
async function main() {
  console.log("🚀 Starting end-to-end test run...\n");

  try {
    // Create a Test Run on your dataset (agent/trace)
    console.log(`Creating test run: ${CONFIG.TEST_RUN_NAME}`);
    const testRun = await fpClient.testRuns.create({
      projectId: CONFIG.PROJECT_ID,
      testList: CONFIG.TRACE_DATASET_NAME,
      name: CONFIG.TEST_RUN_NAME,
    });

    console.log(`✅ Test run created with ID: ${testRun.testRunId}\n`);

    // Get test cases from the trace dataset
    const testCases = testRun.tracesTestCases || [];

    if (testCases.length === 0) {
      console.log("⚠️  No test cases found in the dataset");
      return;
    }

    console.log(`Found ${testCases.length} test cases to run\n`);

    // Iterate through test cases
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(
        `\n[${i + 1}/${testCases.length}] Running test case: ${testCase.id}`,
      );

      // Extract input and variables from test case
      const question = testCase.input || "";
      const variables = testCase.input || {};

      console.log(`  Input: ${question}`);

      // Create session + trace
      const session = fpClient.sessions.create();

      //   const trace = await session.createTrace({
      //     projectId: CONFIG.PROJECT_ID,
      //     input: question || variables.userInput || "",
      //     agentName: CONFIG.AGENT_NAME,
      //     customMetadata: {
      //       version: "1.0.0",
      //       testRunId: testRun.testRunId,
      //       testCaseId: testCase.id,
      //     },
      //   });

      console.log(`  Session: ${session.sessionId}`);
      //   console.log(`  Trace: ${trace.traceId}`);

      try {
        // Run the agent
        const assistantText = await runAgent({
          sessionId: session.sessionId,
          variables,
          messages: [{ role: "user", content: question }],
          testRunId: testRun.testRunId,
          testCaseId: testCase.id,
        });

        console.log(`  Response: ${assistantText}`);

        console.log(`  ✅ Test case completed`);
      } catch (error) {
        console.error(`  ❌ Error running test case:`, error);
        // Continue with next test case
      }
    }

    console.log("\n\n✅ Test run complete!");
    console.log(
      `📊 Review results in Freeplay: https://app.freeplay.ai/projects/${CONFIG.PROJECT_ID}/test-runs/${testRun.id}`,
    );
  } catch (error) {
    console.error("❌ Error during test run:", error);
    throw error;
  } finally {
    // Shutdown OpenTelemetry SDK
    await sdk.shutdown();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏳ SIGINT received, shutting down gracefully...");
  try {
    await sdk.shutdown();
    console.log("✅ OpenTelemetry SDK shut down successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error shutting down SDK:", error);
    process.exit(1);
  }
});

// Run the test
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
