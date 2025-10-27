import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  convertToModelMessages,
  experimental_createMCPClient,
  stepCountIs,
  streamText,
} from "ai";
import {
  getPrompt,
  FreeplayModel,
  createFreeplayTelemetry,
} from "freeplay-vercel-ai-sdk";

export async function POST(req: Request) {
  const url = new URL("http://localhost:3000/mcp/server");
  const transport = new StreamableHTTPClientTransport(url);

  const [client, { messages, id }] = await Promise.all([
    experimental_createMCPClient({
      transport,
    }),
    req.json(),
  ]);

  try {
    const inputVariables = {
      accent: "cowboy",
    };
    // Get prompt from Freeplay
    const prompt = await getPrompt({
      templateName: "funny-accent", // TODO: Replace with your prompt name
      variables: inputVariables,
      messages,
    });

    // Automatically select the correct model provider based on the prompt
    const model = await FreeplayModel(prompt);

    const tools = await client.tools();

    const result = streamText({
      model,
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolResults }) => {
        console.log(`STEP RESULTS: ${JSON.stringify(toolResults, null, 2)}`);
      },
      system: prompt.systemContent,
      messages: convertToModelMessages(messages),
      onFinish: async () => {
        await client.close();
      },
      experimental_telemetry: createFreeplayTelemetry(prompt, {
        functionId: "demo for rob",
        sessionId: id,
        inputVariables,
      }),
      // Optional, enables immediate clean up of resources but connection will not be retained for retries:
      // onError: async error => {
      //   await client.close();
      // },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
