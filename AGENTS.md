# AGENTS.md

## Project
Smart Campus room availability checker; one room, fictional data.

## Constraints
Preserve AC1–AC6; no backend, login or booking creation.
AC1: reject start >= end and past requests.
AC2: reject durations longer than 120 minutes.
AC3: reject a blocked room.
AC4: reject overlaps; allow bookings touching only at endpoints.
AC5–AC6: do not mutate booking data; keep clear desktop/mobile feedback.

## Engineering rules
Prefer pure functions and minimal changes; use at most 2 justified patterns.
Do not mutate booking fixtures; keep responsive UI feedback.
Do not add Singleton, Factory or class hierarchies without a concrete need.
Do not change the existing UI design or fixture data.
Do not modify or delete src_buggy.
Do not introduce secrets, API keys, tokens or credentials, and do not create .env files with real values.
Do not deploy, publish or push to any external host; publishing is done only by the human.
Fixture booking times, room data and the fixed NOW value stay unchanged. User-facing message text may be changed only to satisfy AC6, and only together with a regression test.
Keep changes inside the files named in the task; reject unrelated refactoring.

## Verification
Run `npm run test` and `npm run build`; both must succeed before proposing acceptance.
Add focused regression tests for any new behavior and never delete or weaken existing assertions.
Never report a test as passed unless it was executed; list any checks not run.
Report changed files, rationale and test evidence, then wait for human approval of the diff.