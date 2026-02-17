# AGENT.md

## Purpose
This repository is a production-oriented single-player training app for Geography Bee and History Bee practice. Contributions must prioritize correctness, reliability, maintainability, and safe AI integration.

## Runtime and Tooling
- Runtime/package manager: `bun`
- Dev server: `bun run dev`
- Build: `bun run build`
- Preview: `bun run preview`
- TypeScript + React + Vite only; keep the stack simple.

## Engineering Quality Bar
- Preserve existing behavior unless the task explicitly changes product behavior.
- Every change should be minimal, scoped, and reversible.
- Prefer explicit types and clear interfaces over implicit shapes.
- Avoid hidden coupling across screens/services.
- Remove dead code and unused branches when touched.

## Code Standards
- Keep files focused; split large modules by responsibility.
- Prefer pure helper functions for scoring, parsing, and transformation logic.
- Avoid `any`; if unavoidable, isolate and document why.
- Use descriptive names for domain concepts (`scopeTag`, `knowledgeEvent`, `strengthScore`).
- Keep UI components presentational; keep domain logic in services.

## State and Data Flow
- Source of truth should be explicit and singular per concern.
- Derive state when possible; avoid duplicating state that can drift.
- For cross-session data, use adapter-based persistence APIs.
- Add schema versioning for persisted data.

## AI Integration Rules
- Treat model output as untrusted input.
- Use strict response schemas whenever possible.
- Validate and sanitize AI output before persisting or rendering.
- Always provide deterministic fallback behavior when AI calls fail.
- Never leak secrets in prompts, logs, or client-visible error messages.
- Always refer to the latest official documentation for API usage; do not assume API behavior, parameters, or compatibility from memory.

## Error Handling
- Fail gracefully with actionable user feedback.
- Do not block core gameplay for non-critical AI feature failures.
- Catch and log errors at service boundaries.
- Keep error messages specific for developers, safe for users.

## Security and Privacy
- Never commit secrets or tokens.
- Keep user performance data local unless explicit export is requested.
- Validate imported JSON strictly (size, schema, required fields).
- Reject malformed or oversized payloads safely.

## Performance
- Keep question-round interactions responsive.
- Avoid expensive recomputation in render paths.
- Prefer batched/local updates for profile aggregation.
- Cap historical data where appropriate and recompute safely.

## Testing Expectations
- Add/update tests for each behavior change in domain logic.
- Prioritize tests for:
  - scoring/aggregation math,
  - import/export validation,
  - adaptive scope bucket selection,
  - fallback behavior on AI/storage failure.
- Run relevant verification before claiming completion.

## Observability
- Log operational errors with context (`service`, `action`, `reason`).
- Do not log secrets or sensitive user content.
- Keep console noise low in normal flow.

## Git and Review Discipline
- Keep commits atomic and message intent clear.
- Do not mix unrelated refactors with feature work.
- Document non-obvious tradeoffs in PR description or docs.
- If requirements are ambiguous, ask before implementing high-impact assumptions.

## Design Doc Synchronization (Mandatory)
- Every behavior/layout/data-flow change must update `/docs/design.md` in the same task.
- Design doc updates must remove or rewrite stale statements; do not append contradictory notes.
- Keep `/docs/design.md` non-redundant:
  - one canonical statement per decision,
  - no repeated requirements across sections unless strictly necessary for traceability.
- Keep `/docs/design.md` conflict-free:
  - no internal contradictions,
  - no mismatch with implemented code paths, UI behavior, or persisted schemas.
- Before completion, run a consistency pass across `code <-> /docs/design.md <-> /docs/prd.md` and resolve drift explicitly.

## Definition of Done
A change is done only when all are true:
1. Behavior matches requirements.
2. Edge cases are handled explicitly.
3. Type checks/build/tests (as applicable) pass.
4. Documentation is updated for new behavior or workflows, including mandatory `/docs/design.md` synchronization.
5. No secrets or generated artifacts are accidentally committed.
