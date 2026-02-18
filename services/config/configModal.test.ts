import { describe, expect, test, beforeEach } from 'bun:test';

const mockLocalStorage: Record<string, string> = {};

const setupMocks = () => {
  mockLocalStorage['inference_config_override_v1'] = JSON.stringify({
    light: { provider: 'anthropics', model: 'claude-3-haiku-20240307' },
    normal: { provider: 'anthropics', model: 'claude-3-5-sonnet-20241022' },
  });
  mockLocalStorage['geohistory_provider_config_v1'] = JSON.stringify({
    anthropics: { baseURL: 'https://custom.anthropic.com', apiKey: 'test-key-123' },
    gemini: { apiKey: 'gemini-key' },
  });

  global.window = {
    localStorage: {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
      removeItem: (key: string) => { delete mockLocalStorage[key]; },
    },
  } as any;
};

describe('StartScreen config modal initialization', () => {
  beforeEach(() => {
    setupMocks();
  });

  test('getEffectiveInferenceRouting returns saved provider from localStorage', () => {
    const { getEffectiveInferenceRouting } = require('../config/appConfig');
    const routing = getEffectiveInferenceRouting();
    
    expect(routing.light.provider).toBe('anthropics');
    expect(routing.light.model).toBe('claude-3-haiku-20240307');
    expect(routing.normal.provider).toBe('anthropics');
    expect(routing.normal.model).toBe('claude-3-5-sonnet-20241022');
  });

  test('getAllProviderConfigs returns saved provider configs', () => {
    const { getAllProviderConfigs } = require('../config/appConfig');
    const configs = getAllProviderConfigs();
    
    expect(configs.anthropics).toEqual({ baseURL: 'https://custom.anthropic.com', apiKey: 'test-key-123' });
    expect(configs.gemini).toEqual({ apiKey: 'gemini-key' });
  });
});
