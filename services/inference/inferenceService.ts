import { getEffectiveInferenceRouting, getResolvedAppConfig, getProviderConfig } from '../config/appConfig';
import { createGeminiProvider } from './geminiProvider';
import { createLocalOpenAICompatibleProvider } from './localOpenAICompatibleProvider';
import { createAnthropicsProvider } from './anthropicsProvider';
import { InferenceProvider } from './provider';
import { InferenceJsonRequest, InferenceProviderKind, InferenceTextRequest } from './types';

const createProvider = (provider: InferenceProviderKind): InferenceProvider => {
  const config = getResolvedAppConfig();
  const providerConfig = config.inference.providers[provider];

  switch (provider) {
    case 'gemini': {
      const local = getProviderConfig('gemini');
      const apiKey = local?.apiKey || providerConfig.apiKey;
      return createGeminiProvider({ apiKey });
    }
    case 'local_openai_compatible': {
      const local = getProviderConfig('local_openai_compatible');
      const baseURL = local?.baseURL || providerConfig.baseURL || 'http://127.0.0.1:8841';
      const apiKey = local?.apiKey || providerConfig.apiKey;
      return createLocalOpenAICompatibleProvider({ baseURL, apiKey });
    }
    case 'lmstudio': {
      const local = getProviderConfig('lmstudio');
      const baseURL = local?.baseURL || providerConfig.baseURL || 'http://127.0.0.1:1234';
      const apiKey = local?.apiKey || providerConfig.apiKey;
      return createLocalOpenAICompatibleProvider({ baseURL, apiKey });
    }
    case 'anthropics': {
      const local = getProviderConfig('anthropics');
      const baseURL = local?.baseURL || providerConfig.baseURL || 'https://api.anthropic.com';
      const apiKey = local?.apiKey || local?.token || providerConfig.apiKey || '';
      return createAnthropicsProvider({ baseURL, apiKey });
    }
    default:
      return createGeminiProvider({ apiKey: providerConfig?.apiKey });
  }
};

const getProvider = (provider: InferenceProviderKind): InferenceProvider => {
  return createProvider(provider);
};

const resolveRequest = (request: InferenceTextRequest | InferenceJsonRequest) => {
  const power = request.power ?? 'normal';
  const routing = getEffectiveInferenceRouting();
  const target = routing[power];
  const provider = getProvider(target.provider);

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
