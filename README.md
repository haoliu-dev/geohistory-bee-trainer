<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GeoHistory Bee Trainer

An interactive single-player training app for Geography Bee and History Bee contestants, using progressive clue-based quizzes and AI feedback.

## Run Locally

Prerequisites:
- `bun` (latest stable)

1. Install dependencies:
   `bun install`
2. Configure secrets in `.env.local`:
   - `GEMINI_API_KEY=...`
   - Optional: `LOCAL_OPENAI_API_KEY=...`
   - Optional: `LMSTUDIO_API_KEY=...`
3. Configure non-secret app settings in:
   - `/Users/haoliu/projects/_geo/geohistory-bee-trainer/config/app.config.yaml`
4. Start the dev server:
   `bun run dev`

## Configure App

### 1) Canonical settings file (YAML)

`config/app.config.yaml` controls:
- Inference providers and default models
- Per-level routing (`light`, `normal`)
- Gameplay defaults (category, difficulty, questionCount, scope)

Example:

```yaml
version: 1

inference:
  providers:
    gemini:
      apiKeyEnv: GEMINI_API_KEY
      models:
        light: gemini-3-flash-preview
        normal: gemini-3-flash-preview
    local_openai_compatible:
      baseURL: http://127.0.0.1:8841
      apiKeyEnv: LOCAL_OPENAI_API_KEY
      models:
        light: claude-haiku-4-5-20251001
        normal: claude-sonnet-4-5-20250929
    lmstudio:
      baseURL: http://127.0.0.1:1234
      apiKeyEnv: LMSTUDIO_API_KEY
      models:
        light: qwen/qwen3-vl-8b
        normal: qwen/qwen3-vl-8b
  routing:
    light:
      provider: local_openai_compatible
      model: claude-haiku-4-5-20251001
    normal:
      provider: local_openai_compatible
      model: claude-sonnet-4-5-20250929

gameplayDefaults:
  category: History
  difficulty: HIGH_SCHOOL
  questionCount: 10
  scope: "*"
```

### 2) Runtime per-level switching in UI

On StartScreen, click `Config` to set provider/model separately for:
- `light` inference
- `normal` inference

Behavior:
- Changes are staged in the modal.
- Changes apply only when you click `Start Training`.
- Overrides are persisted in browser `localStorage`.
- If an override conflicts with current app config (for example provider removed), the app safely falls back to YAML defaults.
- When a provider is selected, the app loads available models and lets you pick from a dropdown.

### 3) Secrets policy

Only keep secrets in `.env.local`.
Do not store raw API keys in YAML.
Use `apiKeyEnv` references in `app.config.yaml`.

See detailed guide: `/Users/haoliu/projects/_geo/geohistory-bee-trainer/docs/configuration.md`

## Build / Preview

- Build: `bun run build`
- Preview: `bun run preview`
