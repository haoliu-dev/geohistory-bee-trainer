import { GoogleGenAI } from '@google/genai';
import { InferenceProvider } from './provider';
import { InferenceError, InferenceJsonRequest, InferencePower, InferenceTextRequest } from './types';

const MODEL_BY_POWER: Record<InferencePower, string> = {
  light: 'gemini-3-flash-preview',
  normal: 'gemini-3-flash-preview',
};

export interface GeminiProviderConfig {
  apiKey?: string;
}

export const createGeminiProvider = (config?: GeminiProviderConfig): InferenceProvider => {
  const ai = new GoogleGenAI({ apiKey: config?.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.API_KEY });

  const resolveModel = (power?: InferencePower, model?: string): string =>
    model ?? MODEL_BY_POWER[power ?? 'normal'];

  return {
    async generateText(request: InferenceTextRequest): Promise<string> {
      try {
        const response = await ai.models.generateContent({
          model: resolveModel(request.power, request.model),
          contents: request.prompt,
          config: {
            responseMimeType: 'text/plain',
            systemInstruction: request.systemInstruction,
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new InferenceError('Provider returned empty text response', 'response_parse');
        }
        return text;
      } catch (error) {
        if (error instanceof InferenceError) throw error;
        throw new InferenceError('Gemini text generation failed', 'provider_call', error);
      }
    },

    async generateJson<T>(request: InferenceJsonRequest): Promise<T> {
      try {
        const response = await ai.models.generateContent({
          model: resolveModel(request.power, request.model),
          contents: request.prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: request.schema as any,
            systemInstruction: request.systemInstruction,
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
          },
        });

        const text = response.text;
        if (!text) {
          throw new InferenceError('Provider returned empty JSON response', 'response_parse');
        }

        try {
          return JSON.parse(text) as T;
        } catch (parseError) {
          throw new InferenceError('Failed to parse provider JSON response', 'response_parse', parseError);
        }
      } catch (error) {
        if (error instanceof InferenceError) throw error;
        throw new InferenceError('Gemini JSON generation failed', 'provider_call', error);
      }
    },
  };
};
