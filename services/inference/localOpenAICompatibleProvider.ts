import { InferenceProvider } from './provider';
import { InferenceError, InferenceJsonRequest, InferencePower, InferenceTextRequest } from './types';

interface LocalOpenAICompatibleConfig {
  baseURL: string;
  apiKey?: string;
}

const MODEL_BY_POWER: Record<InferencePower, string> = {
  light: 'claude-haiku-4-5-20251001',
  normal: 'claude-sonnet-4-5-20250929',
};

interface ChatCompletionChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const GENERIC_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: true,
};

const extractMessageText = (response: ChatCompletionResponse): string => {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (part && part.type === 'text' ? part.text ?? '' : ''))
      .join('')
      .trim();
    return text;
  }

  return '';
};

export const createLocalOpenAICompatibleProvider = (
  config: LocalOpenAICompatibleConfig
): InferenceProvider => {
  const baseURL = trimTrailingSlash(config.baseURL || 'http://127.0.0.1:8841');

  const resolveModel = (power?: InferencePower, model?: string): string =>
    model ?? MODEL_BY_POWER[power ?? 'normal'];

  const postChatCompletions = async (
    request: InferenceTextRequest | InferenceJsonRequest,
    expectJson: boolean
  ): Promise<string> => {
    const url = `${baseURL}/v1/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const payload: Record<string, unknown> = {
      model: resolveModel(request.power, request.model),
      messages: [
        ...(request.systemInstruction
          ? [{ role: 'system', content: request.systemInstruction }]
          : []),
        { role: 'user', content: request.prompt },
      ],
      temperature: request.temperature,
      max_tokens: request.maxOutputTokens,
    };

    if (expectJson) {
      const schema = 'schema' in request && request.schema ? request.schema : GENERIC_JSON_SCHEMA;
      payload.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'inference_response',
          strict: true,
          schema,
        },
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new InferenceError(
          `Local OpenAI-compatible request failed (${response.status}): ${body || response.statusText}`,
          'provider_call'
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const text = extractMessageText(data);

      if (!text) {
        throw new InferenceError('Provider returned empty response text', 'response_parse');
      }

      return text;
    } catch (error) {
      if (error instanceof InferenceError) {
        throw error;
      }
      throw new InferenceError('Local OpenAI-compatible request failed', 'provider_call', error);
    }
  };

  return {
    async generateText(request: InferenceTextRequest): Promise<string> {
      return postChatCompletions(request, false);
    },

    async generateJson<T>(request: InferenceJsonRequest): Promise<T> {
      const text = await postChatCompletions(request, true);
      try {
        return JSON.parse(text) as T;
      } catch (error) {
        throw new InferenceError('Failed to parse provider JSON response', 'response_parse', error);
      }
    },
  };
};
