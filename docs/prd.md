# GeoHistory Bee Trainer PRD

## 1. Product Summary
GeoHistory Bee Trainer is a single-player web app for History Bee and Geography Bee practice. The app generates progressive clue-based questions with AI, lets users guess at any clue depth, scores performance, and returns coaching feedback.

This PRD defines:
- Current MVP behavior already present in the app.
- A new feature: persistent knowledge observation for strong/weak topic tracking.
- Adaptive, targeted question generation based on observed knowledge profile.

## 2. Problem Statement
Current gameplay is strong for a single session but has no memory across sessions. As a result:
- The app cannot distinguish long-term weak topics from temporary mistakes.
- Question generation cannot adapt to user-specific gaps.
- Improvement is not measurable over time.

Users need training that gets progressively personalized while remaining simple and single-player.

## 3. Goals
1. Preserve existing fast single-player flow and progressive-clue gameplay.
2. Add durable per-user knowledge logging in local-first storage.
3. Build a topic-level profile of strengths and weaknesses over time.
4. Use the profile to generate targeted question sets with an adaptive blend:
- 60% weak scopes
- 25% medium/uncertain scopes
- 15% strong scopes (retention)
5. Provide export/import of profile and logs for backup and portability.
6. Use AI-assisted profiling to infer nuanced knowledge scope patterns from lightweight logs.

## 4. Non-Goals
- Multiplayer gameplay.
- Accounts, cloud sync, social features, leaderboard.
- Full analytics dashboard in v1 of this feature.
- Replacing deterministic metrics with AI-only scoring.

## 5. Target Users
- Primary: middle/high school bee competitors.
- Secondary: college-level quiz bowl / bee learners.
- Tertiary: coaches or parents supporting learner preparation on a single device.

## 6. User Stories
1. As a learner, I want my mistakes and successes tracked by topic so practice becomes more relevant over time.
2. As a learner, I want future question sets to focus more on weak areas without ignoring strong ones.
3. As a learner, I want to export my training profile and import it later on another browser/device.
4. As a learner, I want clear feedback without setting up accounts.

## 7. Current Product Scope (Baseline)
- Category: History / Geography.
- Difficulty: High School / College / Professional.
- Scope: manual keywords or extracted from uploaded files.
- Question count: 1-20.
- Gameplay: progressive clues, freeform guesses, optional give-up.
- Scoring:
  - Correct score by clue depth (max 10, min 1).
  - Incorrect guess penalty: -10 each.
- Results:
  - Per-question history.
  - AI-generated study advice and reading links.

## 8. New Feature Scope: Knowledge Observation + Targeted Sets
### 8.1 Lightweight Session Logging
Log each question outcome (no heavy transcript required):
- `questionId`, timestamp, category, difficulty, sessionId.
- `subject`.
- `scopeTags` (normalized topical tags).
- `success`.
- `cluesUsed` / `cluesTotal`.
- `incorrectAttempts`.

### 8.2 Persistent Knowledge Profile
Maintain a local profile with per-scope mastery signals:
- `scopeTag`.
- `strengthScore` (bounded normalized metric).
- rolling counters (seen/correct/incorrect/high-clue solves).
- recency metadata (`lastSeenAt`).
- confidence score (how much evidence exists).

### 8.3 AI-Assisted Profiling
On-demand AI pass over lightweight logs (triggered by a main UI button) to:
- identify latent weak scopes not obvious from raw counters.
- cluster related topics (e.g., “Interwar Europe diplomacy”).
- produce profile insights and candidate scope recommendations.

AI outputs remain advisory and must be merged with deterministic safety checks.

### 8.4 Adaptive Targeted Generation
Before quiz generation, the app composes a scope pack based on profile buckets:
- Weak (60%),
- Medium/uncertain (25%),
- Strong retention (15%).

### 8.5 Export / Import
- Export: JSON file containing profile + recent logs + schema version.
- Import: validation + merge strategy + duplicate handling.

## 9. Functional Requirements
1. System shall persist logs and profile locally across browser restarts.
2. System shall update profile after every completed question.
3. System shall generate normalized `scopeTags` for each question.
4. System shall provide targeted mode that uses adaptive blend by default.
5. System shall allow user to export data as JSON.
6. System shall allow user to import previously exported JSON.
7. System shall validate import schema version and reject invalid payloads safely.
8. System shall continue working when AI profiling fails (graceful fallback to deterministic profile).
9. System shall expose an explicit user action to run AI profiling on demand (button label: "Analyze My Knowledge").

## 10. Non-Functional Requirements
- Performance: profile update < 50ms per question on average device.
- Resilience: corrupted import cannot crash gameplay.
- Privacy: all data stays local unless user manually exports.
- Maintainability: clear storage adapter for future backend migration.

## 11. UX Requirements
- Keep current Start -> Game -> Results flow intact.
- Add minimal “Training Mode” selector on Start screen:
  - `Balanced Adaptive` (default, profile-guided)
  - `Manual Scope Only` (current behavior)
- Add “Analyze My Knowledge” button in Results or Settings area to trigger AI profiling on demand.
- Add “Export Profile” and “Import Profile” actions in Results or Settings area.
- Show lightweight profile summary:
  - top 3 weak scopes,
  - top 3 strong scopes,
  - total questions tracked.

## 12. Success Metrics
1. Personalization adoption rate: % sessions using adaptive mode.
2. Weak-scope improvement: reduction in clues used and incorrect attempts over last N exposures.
3. Retention stability: strong-scope accuracy not degrading over time.
4. User continuity: export/import usage and repeat sessions.

## 13. Risks and Mitigations
- AI profiling hallucination: constrain output schema, merge with deterministic rules, confidence thresholds.
- Tag quality inconsistency: centralized tag normalization + canonical taxonomy map.
- Local storage limits: use compact event schema and capped history window.
- Data drift over long periods: add recency weighting and periodic profile recompute.

## 14. Rollout Plan
1. Phase 1: local logging + deterministic profile + adaptive generation.
2. Phase 2: AI-assisted profiling and merge logic.
3. Phase 3: export/import UX and schema migration support.
4. Phase 4: quality tuning using observed outcomes.

## 15. Open Decisions (Resolved)
- Product shape: single-player only.
- Storage: local-first with backend-ready adapter.
- Portability: export/import supported.
- Profiling: AI-assisted model with deterministic guardrails.
- Target mix: 60/25/15 weak/medium/strong.
