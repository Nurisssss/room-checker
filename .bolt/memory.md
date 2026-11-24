# Project memory

## Product intent & audience

- Smart Campus room availability checker (web UI).
- Core feature: deterministic room booking availability checks (`checkAvailabilityDetailed`).
- New optional feature: "Explain availability" — mock AI-style explanation of a check result, display-only, never authoritative.
- Audience: campus users checking room booking slots.

## Brand personality & voice

- Practical, campus-tool tone.
- Explanations labeled clearly as mock/non-confirmed to avoid misleading users.

## Visual design & UX direction

- Vanilla JS + CSS; `main.js` drives DOM, `style.css` for styles.
- Status panel and explanation panel are visually separate boxes.
- Explanation box labeled "AI-generated explanation (mock) – not a confirmed booking status".
- Explain UI appears after a check result: button, 140-char note input, failure-mode select (None/Error/Timeout).
- Fallback explanations clearly labeled as fallback.
- All user/model text rendered via `textContent`, never `innerHTML`.

## Decisions, constraints & rationale

- `checkAvailabilityDetailed` remains the sole authority for Available/Unavailable and bookings; explanations never mutate state or results.
- `src/explain.js` is a MOCK adapter only: no fetch, no network, no API key; builds text only from supplied fields, ≤2 sentences, no invented booking details.
- Input validation: reject missing/empty/malformed fields; `userNote` ≤140 chars (validated, never echoed/obeyed); times validated as real clock values (not just digit shape — bug caught and fixed).
- Output validation: string 1–300 chars, ≤2 sentences.
- Failure handling: 2-second timeout; on timeout/error/invalid output, show deterministic fallback from existing `reasonText(reason)` or available message.
- `mode` values: "ok", "error", "timeout" (demo simulation).
- Constraints from task: layout, text, fixture data, NOW, and `src_buggy/` stay unchanged; existing tests preserved; follow `AGENTS.md`.

## Open questions & assumptions

- Tech stack: vitest, npm scripts (`npm run test`, `npm run build`); build is small/fast (6 modules).
- `reasonText(reason)` maps reason codes to human-readable text; reason codes include overlap, blocked, invalidRange, past, tooLong.
- Test count: 32 existing availability tests + 25 new explain tests = 57 total, all passing.
- `.bolt/prompt` is authoritative for explicit user/global instructions (currently none); not restated here.