import { describe, it, expect } from "vitest";
import { createRequestGuard } from "../src/requestGuard.js";

describe("createRequestGuard", () => {
  it("returns an increasing token from next()", () => {
    const guard = createRequestGuard();
    const first = guard.next();
    const second = guard.next();
    expect(second).toBe(first + 1);
  });

  it("treats a new token as current", () => {
    const guard = createRequestGuard();
    const token = guard.next();
    expect(guard.isCurrent(token)).toBe(true);
  });

  it("treats a token as stale after invalidate()", () => {
    const guard = createRequestGuard();
    const token = guard.next();
    guard.invalidate();
    expect(guard.isCurrent(token)).toBe(false);
  });

  it("invalidates an older token once a newer one is issued", () => {
    const guard = createRequestGuard();
    const old = guard.next();
    const newer = guard.next();
    expect(guard.isCurrent(old)).toBe(false);
    expect(guard.isCurrent(newer)).toBe(true);
  });

  it("treats an unknown token as stale", () => {
    const guard = createRequestGuard();
    guard.next();
    expect(guard.isCurrent(999)).toBe(false);
  });
});
