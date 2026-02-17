# Inference YAML Config Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace env-only inference routing with a YAML-based app config, remove `heavy` level (keep only `light` and `normal`), and add a StartScreen config UI that lets users choose provider/model per level with safe local persistence and fallback.

**Architecture:** Introduce `config/app.config.yaml` as the canonical non-secret app config for inference and gameplay defaults. Add a typed config loader/validator that resolves provider secrets from `.env.local` via env-key references and merges user overrides from `localStorage` with strict conflict fallback. Refactor inference routing to per-level (`light`,`normal`) provider+model selection and expose a config modal in StartScreen that applies on `Start Training`.

**Tech Stack:** React 19, TypeScript, Vite 6, Bun, localStorage, YAML parsing (`yaml` package), existing inference provider abstraction.

---

### Task 1: Add YAML App Config Foundation

**Files:**
- Create: `config/app.config.yaml`
- Create: `services/config/types.ts`
- Create: `services/config/appConfig.ts`
- Modify: `package.json`
- Test: `services/config/appConfig.test.ts`

**Step 1: Write failing config test (RED)**

Create `services/config/appConfig.test.ts` with Bun tests that expect:
- YAML parse returns `version`, `inference`, `gameplayDefaults`.
- unknown level key (`heavy`) is rejected/ignored.
- unknown provider in routing falls back to defaults.

Example skeleton:
```ts
import { describe, expect, test } from 'bun:test';
import { validateAppConfig } from './appConfig';

test('rejects heavy level in routing', () => {
  const bad = { ... };
  const result = validateAppConfig(bad);
  expect(result.routing.heavy).toBeUndefined();
});
```

**Step 2: Run test to verify failure**

Run: `bun test services/config/appConfig.test.ts`
Expected: FAIL (module/functions missing).

**Step 3: Implement YAML config + loader/validator (GREEN)**

- Add `yaml` dependency in `package.json`.
- Add `config/app.config.yaml` with:
  - `version: 1`
  - `inference.providers` (gemini + local_openai_compatible)
  - `inference.routing.light/normal` (provider + model)
  - `gameplayDefaults` (category/difficulty/questionCount/scope)
- Implement parser/validator in `services/config/appConfig.ts`:
  - Import YAML file as raw text and parse.
  - Validate strict schema keys.
  - Enforce levels = `light|normal` only.
  - Resolve provider secrets via `apiKeyEnv` + `process.env[...]`.
  - Expose a typed, validated config API.

**Step 4: Re-run targeted tests**

Run: `bun test services/config/appConfig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json bun.lock config/app.config.yaml services/config/types.ts services/config/appConfig.ts services/config/appConfig.test.ts
git commit -m "feat(config): add yaml app config loader and validator"
```

### Task 2: Refactor Inference Levels to `light | normal`

**Files:**
- Modify: `services/inference/types.ts`
- Modify: `services/inference/geminiProvider.ts`
- Modify: `services/inference/localOpenAICompatibleProvider.ts`
- Modify: `services/inference/inferenceService.ts`
- Modify: `services/inference/operations.ts`
- Test: `services/inference/inferenceService.test.ts`

**Step 1: Write failing inference-level tests (RED)**

Add tests asserting:
- `checkAnswerWithAI` uses `light`.
- `generateQuiz`, `extractScopeFromContent`, `generateStudyAdvice` resolve to `normal`.
- no `heavy` enum/value is accepted.

**Step 2: Run tests to verify failure**

Run: `bun test services/inference/inferenceService.test.ts`
Expected: FAIL due existing `heavy` type/maps and missing routing logic.

**Step 3: Implement level reduction + routing integration (GREEN)**

- Update `InferencePower` to `light | normal` only.
- Remove `heavy` model maps/usages from providers.
- Refactor inference service to route by YAML config:
  - select provider per level (`light`/`normal`),
  - select model from routing config,
  - dispatch to provider adapter with explicit model.
- Preserve operation behavior (`checkAnswerWithAI` stays `light`).

**Step 4: Verify no `heavy` remains**

Run: `rg -n "heavy" services/inference services/config App.tsx screens`
Expected: no runtime inference-level usage remains (except historical docs/tests intentionally asserting migration behavior).

**Step 5: Re-run tests**

Run: `bun test services/inference/inferenceService.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add services/inference/types.ts services/inference/geminiProvider.ts services/inference/localOpenAICompatibleProvider.ts services/inference/inferenceService.ts services/inference/operations.ts services/inference/inferenceService.test.ts
git commit -m "refactor(inference): reduce levels to light and normal with yaml routing"
```

### Task 3: Add User Overrides + Conflict Fallback

**Files:**
- Create: `services/config/runtimeInferenceConfig.ts`
- Test: `services/config/runtimeInferenceConfig.test.ts`
- Modify: `services/config/appConfig.ts`

**Step 1: Write failing override tests (RED)**

Test scenarios:
- valid local override applies.
- provider removed in YAML => fallback to YAML defaults for invalid field.
- model removed => fallback to provider level default.
- stale `heavy` key ignored.

**Step 2: Run tests to verify failure**

Run: `bun test services/config/runtimeInferenceConfig.test.ts`
Expected: FAIL (module missing).

**Step 3: Implement override + sanitize logic (GREEN)**

- Add versioned localStorage key (e.g. `inference_config_override_v1`).
- Implement sanitize/merge:
  - keep only `light|normal`.
  - validate provider exists in YAML providers.
  - validate/normalize model.
  - auto-fallback per invalid field.
- Expose `getEffectiveInferenceConfig()` and `saveInferenceOverride()`.

**Step 4: Re-run tests**

Run: `bun test services/config/runtimeInferenceConfig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add services/config/runtimeInferenceConfig.ts services/config/runtimeInferenceConfig.test.ts services/config/appConfig.ts
git commit -m "feat(config): add inference override persistence with conflict fallback"
```

### Task 4: Add StartScreen Config UI (Apply on Start)

**Files:**
- Modify: `screens/StartScreen.tsx`
- Modify: `App.tsx`
- Create: `components/InferenceConfigModal.tsx`
- Modify: `types.ts` (if shared UI config types needed)
- Test: `bun run build`

**Step 1: Write failing UI behavior test or script (RED)**

If no UI test harness exists, add a deterministic integration script/test to assert:
- pending config changes are not applied until `Start Training`.
- applied config is persisted and reused.

**Step 2: Run verification to see failure**

Run: chosen UI/integration check command.
Expected: FAIL before implementation.

**Step 3: Implement modal + staged apply flow (GREEN)**

- Add `Config` button in StartScreen.
- Add modal fields:
  - Light: provider + model
  - Normal: provider + model
- Maintain `draftConfig` in StartScreen.
- On `Start Training`, call apply/save routine then start game.
- Keep existing “remember last game settings” behavior intact.

**Step 4: Verify behavior manually + build**

Run:
- `bun run build`
- optional manual smoke in browser:
  - open modal, change light provider/model,
  - click Start Training,
  - restart and verify persisted values.

Expected: build PASS and behavior matches apply-on-start rule.

**Step 5: Commit**

```bash
git add screens/StartScreen.tsx App.tsx components/InferenceConfigModal.tsx types.ts
git commit -m "feat(ui): add start screen inference config modal with apply-on-start behavior"
```

### Task 5: Wire Gameplay Defaults from YAML

**Files:**
- Modify: `App.tsx`
- Modify: `screens/StartScreen.tsx`
- Modify: `services/config/appConfig.ts`
- Test: `bun run build`

**Step 1: Write failing check (RED)**

Add/assert config-driven defaults for:
- category
- difficulty
- questionCount
- scope

**Step 2: Run verification to confirm mismatch**

Run: targeted check/test.
Expected: FAIL while hardcoded defaults remain.

**Step 3: Implement YAML-backed defaults (GREEN)**

- Initialize StartScreen defaults from `gameplayDefaults` in resolved config.
- Keep fallback to current hardcoded safe defaults if YAML missing/invalid.

**Step 4: Re-verify**

Run: `bun run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add App.tsx screens/StartScreen.tsx services/config/appConfig.ts
git commit -m "feat(config): drive gameplay defaults from yaml config"
```

### Task 6: Documentation + Migration Guide

**Files:**
- Modify: `README.md`
- Create: `docs/configuration.md`
- Modify: `docs/design.md`
- Test: `bun run build`

**Step 1: Update README with user guide**

Add clear sections:
- YAML location and purpose.
- `.env.local` secrets-only pattern.
- provider/model examples for light/normal.
- conflict fallback behavior.
- quick troubleshooting table.

**Step 2: Add detailed config doc**

Create `docs/configuration.md` with:
- full annotated YAML example,
- override behavior,
- migration notes from env-based inference config.

**Step 3: Sync design doc**

Update `docs/design.md` for:
- no `heavy`,
- YAML-driven routing,
- StartScreen config modal + apply-on-start.

**Step 4: Final verification**

Run:
- `bun test`
- `bun run build`
- `rg -n "heavy" services/inference services/config screens App.tsx`

Expected:
- tests PASS,
- build PASS,
- no `heavy` inference-level usage.

**Step 5: Commit**

```bash
git add README.md docs/configuration.md docs/design.md
git commit -m "docs: add yaml config guide and inference refactor documentation"
```

### Task 7: Final Review Gate

**Files:**
- No new files unless fixes needed.

**Step 1: Inspect final diff**

Run:
- `git status --short`
- `git diff --stat`

Expected: only intended files changed.

**Step 2: Acceptance checklist**

- [ ] Only `light|normal` exist in inference power levels.
- [ ] User can configure provider/model for light/normal in StartScreen.
- [ ] Apply happens on `Start Training`.
- [ ] Overrides persist and fallback on conflict.
- [ ] YAML config is canonical for inference + gameplay defaults.
- [ ] `.env.local` is used only for secrets.
- [ ] README has working examples.

**Step 3: Final commit (if needed)**

```bash
git add -A
git commit -m "chore: finalize yaml-based inference and app config refactor"
```
