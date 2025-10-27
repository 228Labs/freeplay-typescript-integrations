import FreeplayImport, {
  FormattedPrompt,
  InputVariables,
  ProviderMessage,
} from "freeplay";
import type { LanguageModel, ModelMessage } from "ai";

// Handle both ESM and CommonJS module formats for webpack compatibility
const Freeplay = (FreeplayImport as any).default ?? FreeplayImport;

let fpClient: InstanceType<typeof Freeplay> | null = null;

// Lazy initialization of Freeplay client
const getFreeplayClient = () => {
  if (!fpClient) {
    fpClient = new Freeplay({
      freeplayApiKey: process.env["FREEPLAY_API_KEY"] ?? "",
      baseUrl: process.env["FREEPLAY_BASE_URL"] ?? "http://localhost:8080/api",
    });
  }
  return fpClient;
};

export const getPrompt = async ({
  templateName,
  messages,
  environment = "latest",
  projectID = process.env["FREEPLAY_PROJECT_ID"],
  variables = {},
}: {
  templateName: string;
  messages: ModelMessage[];
  environment?: string;
  projectID?: string;
  variables?: InputVariables;
}): Promise<FormattedPrompt<ProviderMessage>> => {
  if (!projectID) {
    throw new Error(
      "FREEPLAY_PROJECT_ID is not set. Please set the FREEPLAY_PROJECT_ID environment variable or pass it as a parameter to the getPrompt function.",
    );
  }

  const client = getFreeplayClient();
  return client.prompts.getFormatted({
    projectId: projectID,
    templateName: templateName,
    environment: environment,
    variables: variables,
    history: messages,
  });
};

/**
 * Creates a model instance using the model string from the prompt result
 * and automatically selects the appropriate AI SDK provider.
 *
 * @param prompt - The formatted prompt result from getPrompt()
 * @returns A LanguageModel instance configured with the model from the prompt
 *
 * @example
 * ```typescript
 * import { getPrompt, FreeplayModel } from '@freeplayai/vercel';
 *
 * const prompt = await getPrompt({ templateName: 'my-template' });
 * const model = await FreeplayModel(prompt);
 * ```
 */
export const FreeplayModel = async (
  prompt: FormattedPrompt<ProviderMessage>,
): Promise<LanguageModel> => {
  const { model, provider } = prompt.promptInfo;

  // Normalize provider name to lowercase for matching
  const normalizedProvider = provider.toLowerCase();

  if (process.env.AI_GATEWAY_API_KEY) {
    return `${normalizedProvider}/${model}`;
  }
  // Dynamically import the provider to avoid bundling issues in edge environments
  if (normalizedProvider === "openai") {
    const { openai } = await import("@ai-sdk/openai");
    return openai(model);
  } else if (normalizedProvider === "anthropic") {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return anthropic(model);
  } else if (normalizedProvider === "google") {
    const { google } = await import("@ai-sdk/google");
    return google(model);
  } else if (normalizedProvider === "vertex") {
    const { vertex } = await import("@ai-sdk/google-vertex");
    return vertex(model);
  } else {
    throw new Error(
      `Unsupported provider "${provider}". Supported providers: openai, anthropic, google, vertex`,
    );
  }
};
