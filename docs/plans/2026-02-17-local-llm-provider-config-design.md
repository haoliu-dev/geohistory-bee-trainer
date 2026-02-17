# Local LLM Provider Configuration Design

**Date:** 2026-02-17  
**Status:** Approved

## Overview

Move LLM provider configuration from server-side environment variables to browser localStorage, enabling distribution of static HTML-based web-apps. This design supports heterogeneous provider configurations (API keys, base URLs, etc.) with future extensibility.

## Data Structure

```typescript
interface ProviderSecrets {
  apiKey?: string;
  baseURL?: string;
  [key: string]: string | undefined;
}

interface AllProviderSecrets {
  [provider: string]: ProviderSecrets | undefined;
}
```

- **Gemini**: `{ apiKey: "..." }`
- **local_openai_compatible**: `{ baseURL: "http://localhost:8841", apiKey?: "..." }`
- **Future providers**: Any combination of fields

## Architecture

### Storage

- **LocalStorage key:** `geohistory_provider_config_v1`
- Stored as JSON stringified `AllProviderSecrets`

### New Exports (appConfig.ts)

| Function | Description |
|----------|-------------|
| `getAllProviderConfigs(): AllProviderSecrets` | Load all provider configs from localStorage |
| `getProviderConfig(provider: string): ProviderSecrets | null` | Get config for specific provider |
| `saveProviderConfig(provider: string, config: ProviderSecrets): void` | Save config for a provider |
| `clearProviderConfigs(): void` | Clear all provider configs |

### Config Resolution

- `getResolvedAppConfig()`: Returns static config from YAML (default models, fallback URLs)
- `getEffectiveInferenceRouting()`: Returns routing override from localStorage
- Provider API keys retrieved via `getProviderConfig()` at runtime when making inference calls

## UI Flow

### Initial Load

1. App checks localStorage for `geohistory_provider_config_v1`
2. If missing, corrupted, or empty → auto-open config modal with "API Key Required" banner
3. Banner explains: "Configure your LLM provider to enable inference settings"

### Config Modal Layout

```
┌─────────────────────────────────────┐
│ Inference Configuration             │
│ [Warning Banner if no API key]      │
├─────────────────────────────────────┤
│ Provider Settings                    │
│ ┌─────────────────────────────────┐ │
│ │ Provider: [Gemini ▼]            │ │
│ │ API Key: [••••••••••••]         │ │
│ │ Base URL: [optional]             │ │
│ │ [Save] [Clear]                   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Light Inference   [DISABLED if no   │
│ Provider: [••••••]   API key]       │
│ Model:   [••••••]                   │
├─────────────────────────────────────┤
│ Normal Inference  [Same as above]   │
│ Provider: [••••••]                  │
│ Model:   [••••••]                   │
└─────────────────────────────────────┘
```

### Validation

- When user saves provider config → trigger model list fetch to validate
- If `listProviderModels()` returns empty or throws → show inline error "Invalid API key"
- On successful model load → key is considered valid

## Error Handling

| Scenario | Behavior |
|----------|-----------|
| localStorage parse error | Clear storage, auto-open modal with "Config was corrupted" |
| No API key configured | Light/Normal sections disabled with tooltip |
| Model fetch fails | Show error in modal, allow retry |
| Invalid API key | Inline error, provider/model selects still functional |

## Backward Compatibility

- Existing `inference_config_override_v1` key continues to work for routing
- Server-side env var fallback remains for builds that still use Vite secrets
- `getProviderConfig()` returns null if no localStorage config → callers fall back to env var

## Implementation Steps

1. Add localStorage functions to `appConfig.ts`
2. Update `InferenceConfigModal` with dynamic provider settings form
3. Add `hasApiKey` check to disable light/normal until configured
4. Add auto-open logic on app load
5. Update inference service to read API keys from localStorage
6. Add validation feedback on model fetch

## Testing Considerations

- Unit test localStorage parse/serialize
- Integration test model list fetch with valid/invalid keys
- Manual test: clear localStorage → verify modal auto-opens
