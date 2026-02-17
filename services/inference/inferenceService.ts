import { getEffectiveInferenceRouting, getResolvedAppConfig } from '../config/appConfig';
import { createGeminiProvider } from './geminiProvider';
import { createLocalOpenAICompatibleProvider } from './localOpenAICompatibleProvider';
import { InferenceProvider } from './provider';
import { InferenceJsonRequest, InferenceProviderKind, InferenceTextRequest } from './types';

const createProviders = (): Record<InferenceProviderKind, InferenceProvider> => {
  const config = getResolvedAppConfig();
  return {
    gemini: createGeminiProvider({
      apiKey: config.inference.providers.gemini.apiKey,
    }),
    local_openai_compatible: createLocalOpenAICompatibleProvider({
      baseURL: config.inference.providers.local_openai_compatible.baseURL || 'http://127.0.0.1:8841',
      apiKey: config.inference.providers.local_openai_compatible.apiKey,
    }),
    lmstudio: createLocalOpenAICompatibleProvider({
      baseURL: config.inference.providers.lmstudio.baseURL || 'http://127.0.0.1:1234',
      apiKey: config.inference.providers.lmstudio.apiKey,
    }),
  };
};

const providers = createProviders();

const resolveRequest = (request: InferenceTextRequest | InferenceJsonRequest) => {
  const power = request.power ?? 'normal';
  const routing = getEffectiveInferenceRouting();
  const target = routing[power];
  const provider = providers[target.provider] ?? providers.gemini;

  return {
    provider,
    request: {
      ...request,
      power,
      model: target.model,
    },
  };
};

export const generateText = async (request: InferenceTextRequest): Promise<string> => {
  const resolved = resolveRequest(request);
  return resolved.provider.generateText(resolved.request);
};

export const generateJson = async <T>(request: InferenceJsonRequest): Promise<T> => {
  const resolved = resolveRequest(request);
  return resolved.provider.generateJson<T>(resolved.request);
};
