import { anthropic } from "@ai-sdk/anthropic";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  convertToModelMessages,
  experimental_createMCPClient,
  stepCountIs,
  streamText,
} from "ai";

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
    const tools = await client.tools();

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      tools,
      stopWhen: stepCountIs(5),
      onStepFinish: async ({ toolResults }) => {
        console.log(`STEP RESULTS: ${JSON.stringify(toolResults, null, 2)}`);
      },
      system: "You are a helpful chatbot capable of basic arithmetic problems",
      messages: convertToModelMessages(messages),
      onFinish: async () => {
        await client.close();
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "demo for rob",
        metadata: {
          sessionId: id,
        },
      },
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
