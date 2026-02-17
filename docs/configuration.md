# Configuration Guide

## Overview
This app uses a two-layer configuration model:
- Non-secret settings in YAML: `config/app.config.yaml`
- Secrets in local env file: `.env.local`

## YAML Schema

`config/app.config.yaml` fields:

- `version`: schema version (`1` currently)
- `inference.providers`: provider definitions
  - `baseURL` (if provider uses HTTP endpoint)
  - `apiKeyEnv` (env var name for secret)
  - `models.light` and `models.normal`
- `inference.routing`: active provider + model for each level
  - `light`
  - `normal`
- `gameplayDefaults`:
  - `category`
  - `difficulty`
  - `questionCount`
  - `scope`

## Secrets

Set secrets in `.env.local` (example):

```env
GEMINI_API_KEY=your-gemini-key
LOCAL_OPENAI_API_KEY=your-local-provider-key-if-needed
LMSTUDIO_API_KEY=your-lmstudio-key-if-needed
```

The YAML reads these via `apiKeyEnv` references.

## Runtime Overrides (StartScreen Config)

StartScreen `Config` button lets users set provider/model for `light` and `normal` on the fly.

Rules:
- Edits are staged.
- Applied only on `Start Training`.
- Persisted to browser localStorage.
- Invalid/stale overrides are auto-sanitized and fall back to YAML routing.

## Conflict Fallback Behavior

If user override conflicts with current app config:
- Unknown/removed provider: fallback to YAML default route for that level.
- Empty model: fallback to provider default model for that level.
- Legacy/unknown level keys (for example `heavy`): ignored.

## Example: Local OpenAI-Compatible Default

```yaml
inference:
  providers:
    local_openai_compatible:
      baseURL: http://127.0.0.1:8841
      apiKeyEnv: LOCAL_OPENAI_API_KEY
      models:
        light: claude-haiku-4-5-20251001
        normal: claude-sonnet-4-5-20250929
  routing:
    light:
      provider: local_openai_compatible
      model: claude-haiku-4-5-20251001
    normal:
      provider: local_openai_compatible
      model: claude-sonnet-4-5-20250929
```

## Example: LMStudio Routing

```yaml
inference:
  providers:
    lmstudio:
      baseURL: http://127.0.0.1:1234
      apiKeyEnv: LMSTUDIO_API_KEY
      models:
        light: qwen/qwen3-vl-8b
        normal: qwen/qwen3-vl-8b
  routing:
    light:
      provider: lmstudio
      model: qwen/qwen3-vl-8b
    normal:
      provider: lmstudio
      model: qwen/qwen3-vl-8b
```

## Troubleshooting

- App fails to infer with Gemini:
  - Check `.env.local` has `GEMINI_API_KEY`
  - Ensure `apiKeyEnv: GEMINI_API_KEY` in YAML
- Local provider not reachable:
  - Verify `baseURL` (for example `http://127.0.0.1:8841`)
  - Verify local server is running
- LMStudio provider not reachable:
  - Verify LMStudio local server URL (for example `http://127.0.0.1:1234`)
  - Confirm LMStudio OpenAI-compatible API mode is enabled
- Unexpected model/provider applied:
  - Open StartScreen `Config`, confirm values
  - Restart from Start and click `Start Training` to apply
  - Clear browser localStorage if needed
