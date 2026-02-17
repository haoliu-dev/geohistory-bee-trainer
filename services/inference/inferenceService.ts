import { getEffectiveInferenceRouting, getResolvedAppConfig, getProviderConfig } from '../config/appConfig';
import { createGeminiProvider } from './geminiProvider';
import { createLocalOpenAICompatibleProvider } from './localOpenAICompatibleProvider';
import { createAnthropicsProvider } from './anthropicsProvider';
import { InferenceProvider } from './provider';
import { InferenceJsonRequest, InferenceProviderKind, InferenceTextRequest } from './types';

const createProviders = (): Record<InferenceProviderKind, InferenceProvider> => {
  const config = getResolvedAppConfig();

  const getGeminiApiKey = (): string | undefined => {
    const local = getProviderConfig('gemini');
    return local?.apiKey || config.inference.providers.gemini.apiKey;
  };

  const getLocalOpenAIApiKey = (provider: 'local_openai_compatible' | 'lmstudio'): string | undefined => {
    const local = getProviderConfig(provider);
    return local?.apiKey || config.inference.providers[provider].apiKey;
  };

  const getLocalOpenAIBaseURL = (provider: 'local_openai_compatible' | 'lmstudio'): string => {
    const local = getProviderConfig(provider);
    return local?.baseURL || config.inference.providers[provider].baseURL || (provider === 'local_openai_compatible' ? 'http://127.0.0.1:8841' : 'http://127.0.0.1:1234');
  };

  const getAnthropicsApiKey = (): string | undefined => {
    const local = getProviderConfig('anthropics');
    return local?.apiKey || local?.token || config.inference.providers.anthropics.apiKey;
  };

  const getAnthropicsBaseURL = (): string => {
    const local = getProviderConfig('anthropics');
    return local?.baseURL || config.inference.providers.anthropics.baseURL || 'https://api.anthropic.com';
  };

  return {
    gemini: createGeminiProvider({
      apiKey: getGeminiApiKey(),
    }),
    local_openai_compatible: createLocalOpenAICompatibleProvider({
      baseURL: getLocalOpenAIBaseURL('local_openai_compatible'),
      apiKey: getLocalOpenAIApiKey('local_openai_compatible'),
    }),
    lmstudio: createLocalOpenAICompatibleProvider({
      baseURL: getLocalOpenAIBaseURL('lmstudio'),
      apiKey: getLocalOpenAIApiKey('lmstudio'),
    }),
    anthropics: createAnthropicsProvider({
      baseURL: getAnthropicsBaseURL(),
      apiKey: getAnthropicsApiKey() || '',
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
