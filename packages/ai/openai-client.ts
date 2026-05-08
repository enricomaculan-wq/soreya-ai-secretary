import { z } from "zod";

export type OpenAIClientConfig = {
  apiKey: string | null;
  model: string;
};

export type OpenAIJsonResult<T> = {
  data: T | null;
  aiProvider: "openai" | "heuristic";
  aiModel: string | null;
  usedFallback: boolean;
  error: string | null;
};

type OpenAIJsonCallInput<T> = {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  timeoutMs?: number;
};

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_TIMEOUT_MS = 12_000;

export function readOpenAIConfig(): OpenAIClientConfig {
  const env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {};

  return {
    apiKey: readEnvString(env.OPENAI_API_KEY),
    model: readEnvString(env.OPENAI_MODEL) ?? DEFAULT_MODEL,
  };
}

export function isOpenAIConfigured(): boolean {
  return Boolean(readOpenAIConfig().apiKey);
}

export async function callOpenAIJson<T>(input: OpenAIJsonCallInput<T>): Promise<OpenAIJsonResult<T>> {
  const config = readOpenAIConfig();

  if (!config.apiKey) {
    return fallbackResult(config.model, "OPENAI_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: input.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackResult(config.model, `OpenAI request failed with status ${response.status}.`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackResult(config.model, "OpenAI response did not include JSON content.");
    }

    const parsedJson = JSON.parse(stripJsonFence(content)) as unknown;
    const parsed = input.schema.safeParse(parsedJson);

    if (!parsed.success) {
      return fallbackResult(config.model, "OpenAI JSON did not match the expected schema.");
    }

    return {
      data: parsed.data,
      aiProvider: "openai",
      aiModel: config.model,
      usedFallback: false,
      error: null,
    };
  } catch (error) {
    return fallbackResult(config.model, error instanceof Error ? error.message : "OpenAI request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackResult<T>(model: string, error: string): OpenAIJsonResult<T> {
  return {
    data: null,
    aiProvider: "heuristic",
    aiModel: model,
    usedFallback: true,
    error,
  };
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function readEnvString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
