# GeoHistory Bee Trainer - Implemented Design (Code-Aligned)

## 1. Purpose and Status
This document describes the behavior currently implemented in code.

Implemented product scope:
- Single-player History/Geography quiz flow.
- AI-generated quiz items with progressive clues.
- AI-assisted answer checking with deterministic exact-match fast path.
- AI-generated post-game study advice.
- Optional scope extraction from uploaded study files.
- YAML-driven app configuration for inference and gameplay defaults.
- StartScreen inference config modal for per-level runtime switching.

Not implemented in current code:
- Persistent cross-session knowledge observation/profile storage.
- Adaptive targeted generation from weak/medium/strong profile buckets.
- Import/export profile data.
- "Analyze My Knowledge" action.
- Training mode selector (adaptive vs manual).

## 2. Runtime Architecture
### 2.1 App State Machine (`App.tsx`)
`App` controls top-level game lifecycle with in-memory state only:
- `IDLE` -> show `StartScreen`
- `LOADING` -> show loading variant of `StartScreen`
- `PLAYING` -> show `GameScreen`
- `FINISHED` -> show `ResultScreen`

Data is ephemeral per browser tab session:
- `questions: QuizItem[]`
- `results: QuestionResult[]`
- Last StartScreen game config is preserved in `App` for easier retry/tuning.

### 2.2 Screen Integration
- `StartScreen` submits `GameConfig` to `App.handleStartGame`.
- `App` calls `generateQuiz(...)`.
- `GameScreen` runs question loop and emits final `QuestionResult[]`.
- `ResultScreen` renders score/history and calls `generateStudyAdvice(...)`.

## 3. Domain Model (`types.ts`)
Core types currently used:
- `GameCategory = History | Geography`
- `DifficultyLevel = HIGH_SCHOOL | COLLEGE | PROFESSIONAL`
- `GameStatus = IDLE | LOADING | PLAYING | FINISHED`
- `GameConfig { category, questionCount, scope, difficulty }`
- `QuizItem { id, subject, acceptedAnswers, clues, category, difficulty? }`
- `QuestionResult { questionIndex, subject, cluesTotal, cluesUsed, incorrectAttempts, success, userAnswer? }`
- `StudyAdvice { overallFeedback, weakAreas, studyResources[] }`

No knowledge-profile schemas (for example `KnowledgeEventV1`/`ScopeProfileV1`) exist in current code.

## 4. Configuration Architecture
### 4.1 Canonical App Config
- File: `config/app.config.yaml`
- Parsed and validated by `services/config/appConfig.ts`
- Covers:
  - provider definitions and per-level model defaults,
  - active per-level routing,
  - gameplay defaults.

### 4.2 Secret Handling
- `.env.local` is used for secrets only.
- YAML stores env variable names (`apiKeyEnv`) rather than raw keys.
- Vite injects secrets into runtime via `__APP_SECRETS__`.

### 4.3 Runtime Override Layer
- StartScreen `Config` modal edits a draft per-level inference routing:
  - `light`: provider + model
  - `normal`: provider + model
- Override is persisted to localStorage when user clicks `Start Training`.
- Effective routing is computed by sanitizing override against YAML config.
- Conflict fallback:
  - removed/unknown provider -> fallback to YAML routing for that level,
  - empty model -> fallback to provider level default model,
  - unsupported levels (for example `heavy`) ignored.

## 5. Start Screen Behavior (`screens/StartScreen.tsx`)
### 5.1 Inputs
User-configurable fields:
- Category (History/Geography)
- Difficulty (3 levels)
- Question count (range 1-20)
- Scope (manual keywords, default `*`)
- Last used game settings are preserved by `App` and re-applied when returning to `StartScreen` after a round.

Defaults come from YAML `gameplayDefaults`, then user edits are preserved by `App` across rounds.

### 5.2 Inference Config UX
- `Config` button opens modal.
- Modal allows provider/model selection for `light` and `normal` levels.
- Changes are staged and applied only when `Start Training` is pressed.

### 5.3 Scope Sources
Two scope entry modes:
- Manual keyword input.
- Uploaded study materials (`.txt`, `.md`, `.html`, `.pdf`, `.doc`, `.docx`) then AI scope extraction.

Flow for uploaded files:
1. Parse file text via `processUploadedFiles(...)`.
2. Call `extractScopeFromContent(content, category)`.
3. Fill extracted scope back into manual input.

## 6. Gameplay Behavior (`screens/GameScreen.tsx`)
### 6.1 Round Progression
- One clue is visible at round start.
- User may reveal clues sequentially.
- User may submit guesses repeatedly before giving up or solving.

### 6.2 Answer Validation
`checkAnswerWithAI(...)` logic:
1. Deterministic exact case-insensitive match against `subject + acceptedAnswers`.
2. If no exact match, call AI JSON validation (`{ correct: boolean }`) with `power: light`.
3. On AI failure, return `false` (safe fallback).

### 6.3 Scoring
Per-question behavior:
- Correct guess score: `max(1, 10 - clueIndex)` where `clueIndex` is zero-based at solve time.
- Incorrect guess penalty: `-10` per wrong attempt.
- `incorrectAttempts` count is stored in `QuestionResult`.

Game-level score display in `GameScreen` is maintained in local component state during play.

## 7. Inference Architecture (`services/inference/*`)
### 7.1 Abstraction
Current code uses a provider abstraction:
- `InferenceProvider` interface with `generateText` and `generateJson`.
- `InferencePower` levels are `light | normal` only.

### 7.2 Providers
- `geminiProvider.ts` implements Gemini via `@google/genai`.
- `localOpenAICompatibleProvider.ts` implements OpenAI-compatible chat completions.
- `lmstudio` is supported through the same OpenAI-compatible adapter path with its own configured `baseURL` and models.

### 7.3 Routing and Models
- `inferenceService.ts` resolves effective routing per request from config layer.
- Each request is routed by level (`light` or `normal`) to:
  - chosen provider,
  - chosen model.
- Provider adapters honor request model overrides.

### 7.4 Operations Layer
`services/inference/operations.ts` defines product operations:
- `extractScopeFromContent`
- `generateQuiz`
- `checkAnswerWithAI`
- `generateStudyAdvice`

UI imports these operations only (no direct vendor SDK imports in screens/components).

### 7.5 Compatibility Shim
`services/geminiService.ts` re-exports operations as a compatibility shim.

## 8. File Parsing Pipeline (`utils/fileHelpers.ts`)
Supported formats and strategy:
- Text-like (`txt`, `md`, `html`, `htm`): `FileReader.readAsText`
- DOCX: `mammoth.extractRawText`
- PDF: `pdfjs-dist` page-by-page text extraction

Additional behavior:
- PDF worker source is configured via CDN.
- Multiple files are concatenated with `--- NEXT FILE ---` separators.

## 9. UI Layout Baseline
### 9.1 Viewport/Scroll
- `index.html` body: `min-h-screen overflow-y-auto`
- `index.html` root: `min-h-screen`
- `App.tsx` shell: `min-h-screen`

This allows vertical scroll when needed and avoids clipped content on shorter viewports.

### 9.2 Landing Layout
`StartScreen` uses a compact responsive layout:
- Two columns on large screens (`lg:grid-cols-2`).
- Start button spans both columns (`lg:col-span-2`).
- Start/Loading states are rendered through the same `StartScreen` component instance, so clicking `Start Training` does not reset inputs during loading.

## 10. Error Handling and Fallbacks
Implemented patterns:
- Quiz generation failure: user alert + return to `IDLE`.
- File analysis failure: user alert, no crash.
- Answer-check AI failure: treat guess as incorrect.
- Study-advice AI failure: fallback advice object and/or fallback UI message.
- Local OpenAI-compatible provider:
  - Throws `InferenceError` on transport/non-200 provider failures.
  - Parses strict JSON response text for structured outputs.
- Inference override conflict fallback:
  - invalid override provider/model is sanitized to YAML defaults.

## 11. Code-to-Doc Consistency Notes
This file intentionally documents implemented behavior only.

PRD roadmap items in `docs/prd.md` for knowledge observation/adaptive profiling remain planned and are not yet reflected in runtime code paths.
