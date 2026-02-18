import { describe, expect, test, beforeEach, mock } from 'bun:test';

const mockGetEffectiveInferenceRouting = mock(() => ({
  light: { provider: 'anthropics' as const, model: 'claude-3-haiku-20240307' },
  normal: { provider: 'anthropics' as const, model: 'claude-3-5-sonnet-20241022' },
}));

const mockGetResolvedAppConfig = mock(() => ({
  inference: {
    providers: {
      anthropics: {
        baseURL: 'https://api.anthropic.com',
        apiKey: undefined,
        models: { light: 'claude-3-haiku-20240307', normal: 'claude-3-5-sonnet-20241022' },
      },
      gemini: {
        apiKey: 'test-gemini-key',
        models: { light: 'gemini-3-flash-preview', normal: 'gemini-3-flash-preview' },
      },
    },
  },
}));

const mockGetProviderConfig = mock((provider: string) => {
  if (provider === 'anthropics') {
    return { baseURL: 'https://custom-anthropic.example.com', apiKey: 'test-anthropic-key' };
  }
  return null;
});

mock.module('../config/appConfig', () => ({
  getEffectiveInferenceRouting: mockGetEffectiveInferenceRouting,
  getResolvedAppConfig: mockGetResolvedAppConfig,
  getProviderConfig: mockGetProviderConfig,
}));

const { generateText, generateJson } = await import('./inferenceService');

describe('inferenceService provider resolution', () => {
  beforeEach(() => {
    mockGetEffectiveInferenceRouting.mockClear();
    mockGetResolvedAppConfig.mockClear();
    mockGetProviderConfig.mockClear();
  });

  test('uses anthropics provider when routing specifies anthropics', async () => {
    let usedProvider = '';
    let usedBaseURL = '';
    let usedApiKey = '';

    mock.module('./anthropicsProvider', () => ({
      createAnthropicsProvider: (config: { baseURL: string; apiKey: string }) => {
        usedBaseURL = config.baseURL;
        usedApiKey = config.apiKey;
        return {
          generateText: async () => {
            usedProvider = 'anthropics';
            return 'test response';
          },
          generateJson: async () => {
            usedProvider = 'anthropics';
            return { result: 'test' };
          },
        };
      },
    }));

    const { generateText: testGenerateText, generateJson: testGenerateJson } = await import('./inferenceService');

    await testGenerateText({ prompt: 'hello' });
    expect(usedProvider).toBe('anthropics');

    await testGenerateJson<{ result: string }>({ prompt: 'hello', schema: {} });
    expect(usedProvider).toBe('anthropics');
  });

  test('passes correct baseURL and apiKey from localStorage to anthropics provider', async () => {
    let capturedConfig: { baseURL: string; apiKey: string } | null = null;

    mock.module('./anthropicsProvider', () => ({
      createAnthropicsProvider: (config: { baseURL: string; apiKey: string }) => {
        capturedConfig = config;
        return {
          generateText: async () => 'test response',
          generateJson: async () => ({ result: 'test' }),
        };
      },
    }));

    const { generateText: testGenerateText } = await import('./inferenceService');

    await testGenerateText({ prompt: 'hello' });

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig?.baseURL).toBe('https://custom-anthropic.example.com');
    expect(capturedConfig?.apiKey).toBe('test-anthropic-key');
  });

  test('falls back to default baseURL when localStorage has no custom URL', async () => {
    mockGetProviderConfig.mockImplementation((provider: string) => {
      if (provider === 'anthropics') {
        return { apiKey: 'test-key' };
      }
      return null;
    });

    let capturedConfig: { baseURL: string; apiKey: string } | null = null;

    mock.module('./anthropicsProvider', () => ({
      createAnthropicsProvider: (config: { baseURL: string; apiKey: string }) => {
        capturedConfig = config;
        return {
          generateText: async () => 'test response',
          generateJson: async () => ({ result: 'test' }),
        };
      },
    }));

    const { generateText: testGenerateText } = await import('./inferenceService');

    await testGenerateText({ prompt: 'hello' });

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig?.baseURL).toBe('https://api.anthropic.com');
    expect(capturedConfig?.apiKey).toBe('test-key');
  });
});
