# Local OpenAI-Compatible Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new inference provider (`localOpenAICompatible`) that calls `http://127.0.0.1:8841` via OpenAI-compatible Chat Completions, with model routing `light -> claude-haiku-4-5-20251001` and `normal/heavy -> claude-opus-4-6`.

**Architecture:** Introduce a second provider implementation behind the existing `InferenceProvider` interface, then add provider selection in `inferenceService.ts` via environment/config. Keep operation call sites unchanged (`generateText`/`generateJson`). Preserve deterministic fallbacks in operation layer and keep Gemini as a selectable provider for rollback.

**Tech Stack:** TypeScript, React, Vite, fetch API, existing inference abstraction (`services/inference/*`).

---

### Task 1: Add Provider Configuration Surface

**Files:**
- Modify: `services/inference/types.ts`
- Modify: `services/inference/inferenceService.ts`
- Modify: `vite.config.ts`
- Test: `bun run build`

**Step 1: Write the failing check (config contract mismatch)**

Document expected compile-time contract to support provider choice and base URL:
```ts
// target shape after this task
type InferenceProviderKind = 'gemini' | 'local_openai_compatible';
interface InferenceRuntimeConfig {
  provider: InferenceProviderKind;
  localOpenAIBaseURL?: string;
  localOpenAIApiKey?: string;
}
```

**Step 2: Run build to capture current baseline**

Run: `bun run build`
Expected: PASS before refactor.

**Step 3: Implement config plumbing**

- Extend inference types with provider-kind/config types.
- In `inferenceService.ts`, load provider choice from env (for example `INFERENCE_PROVIDER`, default `gemini`).
- In `vite.config.ts`, expose needed env vars:
  - `INFERENCE_PROVIDER`
  - `LOCAL_OPENAI_BASE_URL` (default target: `http://127.0.0.1:8841`)
  - `LOCAL_OPENAI_API_KEY` (optional)

**Step 4: Re-run build**

Run: `bun run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add services/inference/types.ts services/inference/inferenceService.ts vite.config.ts
git commit -m "feat(inference): add provider runtime config plumbing"
```

### Task 2: Implement `localOpenAICompatible` Provider

**Files:**
- Create: `services/inference/localOpenAICompatibleProvider.ts`
- Modify: `services/inference/inferenceService.ts`
- Test: `bun run build`

**Step 1: Write failing integration point**

In `inferenceService.ts`, add provider selection branch for `local_openai_compatible` referencing `createLocalOpenAICompatibleProvider` (which does not exist yet).

**Step 2: Run build to verify failure**

Run: `bun run build`
Expected: FAIL with missing module/symbol for local provider.

**Step 3: Implement provider with required model routing**

Implement `createLocalOpenAICompatibleProvider(config)` that:
- Uses endpoint: `${baseURL}/v1/chat/completions`.
- Uses `fetch` with JSON body compatible with OpenAI Chat Completions.
- Maps power to model:
  - `light => claude-haiku-4-5-20251001`
  - `normal => claude-opus-4-6`
  - `heavy => claude-opus-4-6`
- For `generateText`:
  - send user/system messages,
  - parse `choices[0].message.content` into text,
  - throw `InferenceError` on malformed/empty payload.
- For `generateJson`:
  - request JSON-structured output (schema when possible),
  - parse content to object,
  - throw `InferenceError` on parse/transport failures.
- Keep error stage mapping aligned with existing `InferenceError` conventions.

**Step 4: Wire provider selection**

In `inferenceService.ts`:
- Instantiate provider by `INFERENCE_PROVIDER`.
- Keep default `power: 'normal'` behavior unchanged.
- Preserve Gemini path for rollback safety.

**Step 5: Re-run build**

Run: `bun run build`
Expected: PASS.

**Step 6: Commit**

```bash
git add services/inference/localOpenAICompatibleProvider.ts services/inference/inferenceService.ts
git commit -m "feat(inference): add local OpenAI-compatible provider"
```

### Task 3: Validate Behavior and Failure Modes

**Files:**
- Modify: `services/inference/localOpenAICompatibleProvider.ts` (if fixes needed)
- Optional Test Harness: `scripts/smoke-inference-local.ts` (if project prefers scripted smoke checks)
- Test: `bun run build`

**Step 1: Run local smoke checks against running endpoint**

Manual checks (with local service up at `http://127.0.0.1:8841`):
- `generateText` request succeeds.
- `generateJson` request succeeds for quiz/advice schemas.
- `checkAnswerWithAI` still returns deterministic exact matches without API call.

**Step 2: Validate model routing explicitly**

Verify request payload model field for:
- light path (`checkAnswerWithAI`) -> `claude-haiku-4-5-20251001`
- normal path (`generateQuiz`, `generateStudyAdvice`, `extractScopeFromContent`) -> `claude-opus-4-6`

**Step 3: Validate error handling**

Simulate endpoint-down scenario:
- confirm provider throws `InferenceError` with `provider_call` stage.
- confirm app-level fallbacks remain intact (existing alerts/fallback payloads).

**Step 4: Re-run build after any adjustments**

Run: `bun run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add services/inference/localOpenAICompatibleProvider.ts scripts/smoke-inference-local.ts
git commit -m "test(inference): validate local provider routing and failure handling"
```

### Task 4: Documentation and Operational Notes

**Files:**
- Modify: `docs/design.md`
- Modify: `README.md`
- Test: `bun run build`

**Step 1: Update design doc provider architecture**

Document:
- provider registry/selection,
- local OpenAI-compatible endpoint,
- model mapping by power tier,
- fallback and rollback path.

**Step 2: Update README setup**

Add env examples:
- `INFERENCE_PROVIDER=local_openai_compatible`
- `LOCAL_OPENAI_BASE_URL=http://127.0.0.1:8841`
- optional `LOCAL_OPENAI_API_KEY=...`

Keep Gemini setup documented as alternative.

**Step 3: Final verification**

Run: `bun run build`
Expected: PASS.

**Step 4: Commit**

```bash
git add docs/design.md README.md
git commit -m "docs: document local OpenAI-compatible inference provider"
```

### Task 5: Final Review Gate

**Files:**
- No code changes required unless issues found.

**Step 1: Inspect final diff**

Run: `git status --short && git diff --stat`
Expected: only intended files changed.

**Step 2: Confirm behavior checklist**

- Provider switch works via env.
- Local endpoint defaults to `http://127.0.0.1:8841` when provider is local.
- Model routing is exactly:
  - light -> `claude-haiku-4-5-20251001`
  - normal/heavy -> `claude-opus-4-6`
- Existing operations API and call sites remain unchanged.

**Step 3: Final commit (if any remaining fixes)**

```bash
git add -A
git commit -m "chore: finalize local openai-compatible provider integration"
```
