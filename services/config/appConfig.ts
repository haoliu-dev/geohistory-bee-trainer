import { parse } from 'yaml';
import { GoogleGenAI } from '@google/genai';
import { DifficultyLevel, GameCategory } from '../../types';
import { InferenceProviderKind } from '../inference/types';
import { AppConfig, AppInferenceProviderConfig, InferenceRouteConfig, InferenceRoutingOverride } from './types';
import appConfigRaw from '../../config/app.config.yaml?raw';

const getSecret = (key: string): string | undefined => {
  const viteSecrets =
    typeof globalThis !== 'undefined' && '__APP_SECRETS__' in globalThis
      ? (globalThis as any).__APP_SECRETS__
      : undefined;
  return viteSecrets?.[key] ?? process.env[key];
};

const isProviderKind = (value: string): value is InferenceProviderKind => {
  return value === 'gemini' || value === 'local_openai_compatible' || value === 'lmstudio';
};

const sanitizeRoute = (
  route: Partial<InferenceRouteConfig> | undefined,
  providers: Record<InferenceProviderKind, AppInferenceProviderConfig>,
  fallback: InferenceRouteConfig,
  level: 'light' | 'normal'
): InferenceRouteConfig => {
  const routeProvider = route?.provider;
  const provider = routeProvider && isProviderKind(routeProvider) ? routeProvider : fallback.provider;

  if (!providers[provider]) {
    return fallback;
  }

  const routeModel = route?.model?.trim();
  const model = routeModel || providers[provider].models[level] || fallback.model;

  return {
    provider,
    model,
  };
};

export const getResolvedAppConfig = (): AppConfig => {
  const parsed = parse(appConfigRaw) as Partial<AppConfig>;
  const defaults = {
    gemini: {
      apiKeyEnv: 'GEMINI_API_KEY',
      models: {
        light: 'gemini-3-flash-preview',
        normal: 'gemini-3-flash-preview',
      },
    },
    local_openai_compatible: {
      baseURL: 'http://127.0.0.1:8841',
      apiKeyEnv: 'LOCAL_OPENAI_API_KEY',
      models: {
        light: 'claude-haiku-4-5-20251001',
        normal: 'claude-sonnet-4-5-20250929',
      },
    },
    lmstudio: {
      baseURL: 'http://127.0.0.1:1234',
      apiKeyEnv: 'LMSTUDIO_API_KEY',
      models: {
        light: 'qwen/qwen3-vl-8b',
        normal: 'qwen/qwen3-vl-8b',
      },
    },
    anthropics: {
      baseURL: 'https://api.anthropic.com',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      models: {
        light: 'claude-3-haiku-20240307',
        normal: 'claude-3-5-sonnet-20241022',
      },
    },
  } satisfies Record<InferenceProviderKind, AppInferenceProviderConfig>;

  const providers = {
    gemini: {
      ...defaults.gemini,
      ...(parsed.inference?.providers?.gemini ?? {}),
      models: {
        ...defaults.gemini.models,
        ...(parsed.inference?.providers?.gemini?.models ?? {}),
      },
    },
    local_openai_compatible: {
      ...defaults.local_openai_compatible,
      ...(parsed.inference?.providers?.local_openai_compatible ?? {}),
      models: {
        ...defaults.local_openai_compatible.models,
        ...(parsed.inference?.providers?.local_openai_compatible?.models ?? {}),
      },
    },
    lmstudio: {
      ...defaults.lmstudio,
      ...(parsed.inference?.providers?.lmstudio ?? {}),
      models: {
        ...defaults.lmstudio.models,
        ...(parsed.inference?.providers?.lmstudio?.models ?? {}),
      },
    },
    anthropics: {
      ...defaults.anthropics,
      ...(parsed.inference?.providers?.anthropics ?? {}),
      models: {
        ...defaults.anthropics.models,
        ...(parsed.inference?.providers?.anthropics?.models ?? {}),
      },
    },
  } satisfies Record<InferenceProviderKind, AppInferenceProviderConfig>;

  (Object.keys(providers) as InferenceProviderKind[]).forEach((providerKey) => {
    const apiKeyEnv = providers[providerKey].apiKeyEnv;
    if (apiKeyEnv) {
      providers[providerKey].apiKey = getSecret(apiKeyEnv);
    }
  });

  const defaultRouting: InferenceRoutingOverride = {
    light: {
      provider: 'local_openai_compatible',
      model: providers.local_openai_compatible.models.light,
    },
    normal: {
      provider: 'local_openai_compatible',
      model: providers.local_openai_compatible.models.normal,
    },
  };

  const routing = {
    light: sanitizeRoute(parsed.inference?.routing?.light, providers, defaultRouting.light, 'light'),
    normal: sanitizeRoute(parsed.inference?.routing?.normal, providers, defaultRouting.normal, 'normal'),
  };

  const rawCategory = parsed.gameplayDefaults?.category;
  const rawDifficulty = parsed.gameplayDefaults?.difficulty;

  const gameplayDefaults = {
    category:
      rawCategory === GameCategory.GEOGRAPHY || rawCategory === GameCategory.HISTORY
        ? rawCategory
        : GameCategory.HISTORY,
    difficulty:
      rawDifficulty === DifficultyLevel.COLLEGE ||
      rawDifficulty === DifficultyLevel.PROFESSIONAL ||
      rawDifficulty === DifficultyLevel.HIGH_SCHOOL
        ? rawDifficulty
        : DifficultyLevel.HIGH_SCHOOL,
    questionCount: Math.max(1, Math.min(20, Number(parsed.gameplayDefaults?.questionCount ?? 10))),
    scope: parsed.gameplayDefaults?.scope ?? '*',
  };

  return {
    version: Number(parsed.version ?? 1),
    inference: {
      providers,
      routing,
    },
    gameplayDefaults,
  };
};

const OVERRIDE_KEY = 'inference_config_override_v1';

export const getInferenceOverride = (): Partial<InferenceRoutingOverride> | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(OVERRIDE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<InferenceRoutingOverride>;
  } catch {
    return null;
  }
};

export const saveInferenceOverride = (override: InferenceRoutingOverride): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(override));
};

const PROVIDER_CONFIG_KEY = 'geohistory_provider_config_v1';

export const getAllProviderConfigs = (): Record<string, Record<string, string> | null> => {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(PROVIDER_CONFIG_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, Record<string, string> | null>;
  } catch {
    window.localStorage.removeItem(PROVIDER_CONFIG_KEY);
    return {};
  }
};

export const getProviderConfig = (provider: string): Record<string, string> | null => {
  const all = getAllProviderConfigs();
  return all[provider] ?? null;
};

export const saveProviderConfig = (provider: string, config: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  const all = getAllProviderConfigs();
  all[provider] = config;
  window.localStorage.setItem(PROVIDER_CONFIG_KEY, JSON.stringify(all));
};

export const clearProviderConfigs = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PROVIDER_CONFIG_KEY);
};

export const getEffectiveInferenceRouting = (): InferenceRoutingOverride => {
  const config = getResolvedAppConfig();
  const override = getInferenceOverride();
  if (!override) {
    return config.inference.routing;
  }

  return {
    light: sanitizeRoute(override.light, config.inference.providers, config.inference.routing.light, 'light'),
    normal: sanitizeRoute(override.normal, config.inference.providers, config.inference.routing.normal, 'normal'),
  };
};

export const getInferenceLevelOptions = (level: 'light' | 'normal') => {
  const config = getResolvedAppConfig();
  return (Object.keys(config.inference.providers) as InferenceProviderKind[]).map((provider) => ({
    provider,
    defaultModel: config.inference.providers[provider].models[level],
  }));
};

export const getLocalOpenAIBaseURL = (): string => {
  const config = getResolvedAppConfig();
  return config.inference.providers.local_openai_compatible.baseURL || 'http://127.0.0.1:8841';
};

const uniqueModels = (models: string[]): string[] => {
  return Array.from(new Set(models.filter(Boolean)));
};

const normalizeGeminiModelName = (name: string): string => name.replace(/^models\//, '').trim();

const fetchOpenAICompatibleModels = async (baseURL: string): Promise<string[]> => {
  const response = await fetch(`${baseURL.replace(/\/+$/, '')}/v1/models`);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  return (payload.data ?? [])
    .map((item) => item.id?.trim() ?? '')
    .filter(Boolean);
};

const listGeminiModels = async (apiKey?: string): Promise<string[]> => {
  if (!apiKey) {
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.list();
  const candidates = ((response as any).models ?? (response as any).page ?? []) as Array<{ name?: string }>;
  return candidates
    .map((model) => normalizeGeminiModelName(model.name ?? ''))
    .filter(Boolean);
};

interface ProviderModelDiscoveryDeps {
  fetchOpenAICompatibleModels?: (baseURL: string) => Promise<string[]>;
  listGeminiModels?: (apiKey?: string) => Promise<string[]>;
}

export const listProviderModels = async (
  provider: InferenceProviderKind,
  deps?: ProviderModelDiscoveryDeps
): Promise<string[]> => {
  const config = getResolvedAppConfig();
  const providerConfig = config.inference.providers[provider];
  const fallback = uniqueModels([providerConfig.models.light, providerConfig.models.normal]);

  if (provider === 'gemini') {
    try {
      const remoteModels = uniqueModels(
        (await (deps?.listGeminiModels ?? listGeminiModels)(providerConfig.apiKey)).map(normalizeGeminiModelName)
      );
      const merged = uniqueModels([...remoteModels, ...fallback]);
      return merged.length > 0 ? merged : fallback;
    } catch {
      return fallback;
    }
  }

  if (!providerConfig.baseURL) {
    return fallback;
  }

  try {
    const remoteModels = await (deps?.fetchOpenAICompatibleModels ?? fetchOpenAICompatibleModels)(providerConfig.baseURL);
    const merged = uniqueModels([...remoteModels, ...fallback]);
    return merged.length > 0 ? merged : fallback;
  } catch {
    return fallback;
  }
};
