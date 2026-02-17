import { describe, expect, test } from 'bun:test';
import { listProviderModels } from './appConfig';

describe('listProviderModels', () => {
  test('loads models from Gemini list API and merges YAML fallbacks', async () => {
    const models = await listProviderModels('gemini', {
      listGeminiModels: async () => ['gemini-2.5-flash', 'models/gemini-2.5-pro'],
    });

    expect(models).toContain('gemini-2.5-flash');
    expect(models).toContain('gemini-2.5-pro');
    expect(models).toContain('gemini-3-flash-preview');
  });
});
