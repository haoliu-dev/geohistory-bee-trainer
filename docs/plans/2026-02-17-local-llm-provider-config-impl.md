# Local LLM Provider Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move LLM provider configuration from server-side env vars to browser localStorage, enabling static HTML distribution.

**Architecture:** Add localStorage-based provider secrets storage with dynamic UI. Existing routing override continues to work; new provider config key stores API keys and per-provider settings.

**Tech Stack:** TypeScript, React, localStorage

---

## Task 1: Add localStorage provider config functions

**Files:**
- Modify: `services/config/appConfig.ts:148-165`

**Step 1: Add provider config localStorage functions after existing override functions**

Add these functions after line 165:

```typescript
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
```

**Step 2: Commit**

```bash
git add services/config/appConfig.ts
git commit -m "feat: add localStorage provider config functions"
```

---

## Task 2: Check for missing config on app load and auto-open modal

**Files:**
- Modify: `App.tsx`

**Step 1: Read App.tsx to understand current load logic**

```bash
cat App.tsx
```

**Step 2: Add check for provider config on initial load**

In App component, add state for initial config check:

```typescript
const [configChecked, setConfigChecked] = useState(false);

// After other useEffect that checks initial config
useEffect(() => {
  if (configChecked) return;
  const providers = getAllProviderConfigs();
  const hasAnyKey = Object.values(providers).some(p => p && p.apiKey);
  if (!hasAnyKey) {
    setConfigOpen(true);
  }
  setConfigChecked(true);
}, [configChecked]);
```

**Step 3: Pass autoOpen prop to StartScreen**

Modify StartScreen to accept optional `autoOpenConfig` prop and trigger config modal when true.

**Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: auto-open config modal when no API key configured"
```

---

## Task 3: Update InferenceConfigModal with provider settings section

**Files:**
- Modify: `components/InferenceConfigModal.tsx`

**Step 1: Add provider settings form section**

Add state and UI for provider configuration at the top of the modal:

```typescript
const [activeProviderTab, setActiveProviderTab] = useState<string>('gemini');
const [providerSecrets, setProviderSecrets] = useState<Record<string, Record<string, string>>>({});
const [secretError, setSecretError] = useState<string | null>(null);

useEffect(() => {
  const configs = getAllProviderConfigs();
  setProviderSecrets(configs);
}, [isOpen]);
```

Add this UI after the modal header, before the existing light/normal sections:

```tsx
{/* Provider Settings Section */}
<div className="mb-4">
  <h4 className="text-sm font-semibold text-slate-700 mb-2">Provider Settings</h4>
  <div className="flex gap-1 mb-2">
    {providers.map((p) => (
      <button
        key={p}
        type="button"
        onClick={() => setActiveProviderTab(p)}
        className={`px-3 py-1 text-xs rounded ${
          activeProviderTab === p 
            ? 'bg-indigo-600 text-white' 
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {p}
      </button>
    ))}
  </div>
  <div className="p-3 border border-slate-200 rounded-lg space-y-2">
    <div>
      <label className="block text-xs text-slate-600 mb-1">API Key</label>
      <input
        type="password"
        value={providerSecrets[activeProviderTab]?.apiKey || ''}
        onChange={(e) => {
          const current = providerSecrets[activeProviderTab] || {};
          setProviderSecrets({
            ...providerSecrets,
            [activeProviderTab]: { ...current, apiKey: e.target.value }
          });
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Enter API key"
      />
    </div>
    {(activeProviderTab === 'local_openai_compatible' || activeProviderTab === 'lmstudio') && (
      <div>
        <label className="block text-xs text-slate-600 mb-1">Base URL</label>
        <input
          type="text"
          value={providerSecrets[activeProviderTab]?.baseURL || ''}
          onChange={(e) => {
            const current = providerSecrets[activeProviderTab] || {};
            setProviderSecrets({
              ...providerSecrets,
              [activeProviderTab]: { ...current, baseURL: e.target.value }
            });
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="http://127.0.0.1:8841"
        />
      </div>
    )}
    <div className="flex gap-2">
      <Button 
        type="button" 
        size="sm"
        onClick={() => {
          const config = providerSecrets[activeProviderTab];
          if (config) {
            saveProviderConfig(activeProviderTab, config);
          }
        }}
      >
        Save
      </Button>
      <Button 
        type="button" 
        variant="secondary" 
        size="sm"
        onClick={() => {
          const current = providerSecrets[activeProviderTab] || {};
          setProviderSecrets({
            ...providerSecrets,
            [activeProviderTab]: { ...current, apiKey: '' }
          });
        }}
      >
        Clear
      </Button>
    </div>
    {secretError && <p className="text-xs text-red-500 mt-1">{secretError}</p>}
  </div>
</div>
```

**Step 2: Pass hasApiKey prop from parent**

Update parent component to pass whether API key exists.

**Step 3: Commit**

```bash
git add components/InferenceConfigModal.tsx
git commit -m "feat: add provider settings section to config modal"
```

---

## Task 4: Disable light/normal sections when no API key

**Files:**
- Modify: `components/InferenceConfigModal.tsx`

**Step 1: Add disabled state logic**

```typescript
const hasApiKey = providers.some(p => 
  providerSecrets[p]?.apiKey && providerSecrets[p].apiKey.length > 0
);
```

**Step 2: Disable light/normal sections when no API key**

Wrap each level section with:

```tsx
<div className={`rounded-xl border p-3 ${!hasApiKey ? 'opacity-50 pointer-events-none' : 'border-slate-200'}`}>
  {/* existing content */}
  {!hasApiKey && (
    <p className="text-xs text-amber-600 mt-2">Add API key above to enable</p>
  )}
</div>
```

**Step 3: Commit**

```bash
git add components/InferenceConfigModal.tsx
git commit -m "feat: disable inference settings when no API key"
```

---

## Task 5: Validate API key by fetching models on save

**Files:**
- Modify: `components/InferenceConfigModal.tsx`, `services/config/appConfig.ts`

**Step 1: Add validation on save**

In the save handler for provider config, after saving, trigger model fetch to validate:

```typescript
onClick={async () => {
  const config = providerSecrets[activeProviderTab];
  if (config) {
    saveProviderConfig(activeProviderTab, config);
    // Validate by fetching models
    try {
      const models = await listProviderModels(activeProvider as InferenceProviderKind);
      if (models.length === 0) {
        setSecretError('Failed to fetch models - check API key');
      } else {
        setSecretError(null);
      }
    } catch (e) {
      setSecretError('Invalid API key');
    }
  }
}}
```

**Step 2: Commit**

```bash
git add components/InferenceConfigModal.tsx
git commit -m "feat: validate API key by fetching models"
```

---

## Task 6: Update inference service to use localStorage API keys

**Files:**
- Modify: `services/inference/geminiProvider.ts`, `services/inference/localOpenAICompatibleProvider.ts`

**Step 1: Update geminiProvider to read from localStorage**

In geminiProvider.ts, update the API key source:

```typescript
import { getProviderConfig } from '../config/appConfig';

// In function that uses API key:
const apiKey = getProviderConfig('gemini')?.apiKey || config.apiKey;
```

**Step 2: Similar update for localOpenAICompatibleProvider**

Update to read baseURL and apiKey from localStorage first.

**Step 3: Commit**

```bash
git add services/inference/geminiProvider.ts services/inference/localOpenAICompatibleProvider.ts
git commit -m "feat: read API keys from localStorage"
```

---

## Task 7: Handle corrupted localStorage gracefully

**Files:**
- Modify: `App.tsx`, `services/config/appConfig.ts`

**Step 1: Return indicator when config is corrupted**

In `getAllProviderConfigs`, if parse fails, return a special marker or throw:

```typescript
export const getAllProviderConfigs = (): Record<string, Record<string, string> | null> => {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(PROVIDER_CONFIG_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, Record<string, string> | null>;
  } catch {
    window.localStorage.removeItem(PROVIDER_CONFIG_KEY);
    window.localStorage.removeItem('inference_config_override_v1'); // Clear both to be safe
    return {}; // App will detect empty and prompt
  }
};
```

**Step 2: Show appropriate message in modal**

When auto-opening due to empty/cleared config, show context-appropriate message.

**Step 3: Commit**

```bash
git add services/config/appConfig.ts App.tsx
git commit -m "feat: handle corrupted localStorage gracefully"
```

---

## Task 8: Test end-to-end flow

**Step 1: Clear localStorage in browser devtools**

```javascript
localStorage.clear()
```

**Step 2: Refresh app**

Verify: Modal auto-opens with warning banner.

**Step 3: Enter API key and save**

Verify: Model list loads for that provider.

**Step 4: Verify light/normal sections become enabled**

**Step 5: Complete config, start game**

Verify: Inference works with the configured provider.

**Step 6: Commit**

```bash
git commit --allow-empty -m "test: verify end-to-end local provider config flow"
```

---

## Plan complete

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
