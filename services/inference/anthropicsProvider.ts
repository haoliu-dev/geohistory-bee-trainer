import { InferenceProvider } from './provider';
import { InferenceError, InferenceJsonRequest, InferencePower, InferenceTextRequest } from './types';

interface AnthropicsConfig {
  baseURL: string;
  apiKey: string;
}

const MODEL_BY_POWER: Record<InferencePower, string> = {
  light: 'claude-3-haiku-20240307',
  normal: 'claude-3-5-sonnet-20241022',
};

export const createAnthropicsProvider = (config: AnthropicsConfig): InferenceProvider => {
  const baseURL = config.baseURL.replace(/\/+$/, '');
  const apiKey = config.apiKey;

  const resolveModel = (power?: InferencePower, model?: string): string =>
    model ?? MODEL_BY_POWER[power ?? 'normal'];

  const postMessage = async (
    request: InferenceTextRequest | InferenceJsonRequest,
    expectJson: boolean
  ): Promise<string> => {
    const url = `${baseURL}/v1/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    const payload: Record<string, unknown> = {
      model: resolveModel(request.power, request.model),
      max_tokens: request.maxOutputTokens || 1024,
      messages: [
        ...(request.systemInstruction
          ? [{ role: 'user', content: request.systemInstruction + '\n\n' + request.prompt }]
          : [{ role: 'user', content: request.prompt }]),
      ],
    };

    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }

    if (expectJson && 'schema' in request && request.schema) {
      payload.system = 'You must respond with valid JSON matching this schema: ' + JSON.stringify(request.schema);
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
          `Anthropics request failed (${response.status}): ${body || response.statusText}`,
          'provider_call'
        );
      }

      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      const text = data.content?.[0]?.text;

      if (!text) {
        throw new InferenceError('Provider returned empty response', 'response_parse');
      }

      return text;
    } catch (error) {
      if (error instanceof InferenceError) {
        throw error;
      }
      throw new InferenceError('Anthropics request failed', 'provider_call', error);
    }
  };

  return {
    async generateText(request: InferenceTextRequest): Promise<string> {
      return postMessage(request, false);
    },

    async generateJson<T>(request: InferenceJsonRequest): Promise<T> {
      const text = await postMessage(request, true);
      try {
        return JSON.parse(text) as T;
      } catch (error) {
        throw new InferenceError('Failed to parse provider JSON response', 'response_parse', error);
      }
    },
  };
};
