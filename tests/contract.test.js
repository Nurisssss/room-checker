import { describe, it, expect } from "vitest";
import { evaluateRequest, contractMessage } from "../src/contract.js";

const NOW = 9 * 60; // 09:00
const MIN = 60000;
const ROOM_ID = "B-204";
const bookings = () => [{ id: "B1", roomId: ROOM_ID, start: 10 * 60 * MIN, end: 11 * 60 * MIN }];

describe("evaluateRequest — contract tests", () => {
  it("T1: 09:15 + 30 min is available", () => {
    const data = bookings();
    const r = evaluateRequest({ startTime: "09:15", durationMinutes: 30, blocked: false }, data, NOW);
    expect(r).toEqual({ valid: true, available: true, reasonCode: null, message: expect.any(String), durationMinutes: 30 });
  });

  it("T2: 10:30 + 30 min overlaps and is unavailable", () => {
    const r = evaluateRequest({ startTime: "10:30", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(true);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("OVERLAP");
  });

  it("T3: 15:00 + 30 min with blocked room is unavailable", () => {
    const r = evaluateRequest({ startTime: "15:00", durationMinutes: 30, blocked: true }, bookings(), NOW);
    expect(r.valid).toBe(true);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("BLOCKED");
  });

  it("T4: duration 0 is rejected as DURATION_NOT_POSITIVE", () => {
    const r = evaluateRequest({ startTime: "09:15", durationMinutes: 0, blocked: false }, bookings(), NOW);
    expect(r).toEqual({ valid: false, available: null, reasonCode: "DURATION_NOT_POSITIVE", message: expect.any(String) });
  });

  it("T5: duration 121 is rejected as DURATION_TOO_LONG", () => {
    const r = evaluateRequest({ startTime: "09:15", durationMinutes: 121, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(false);
    expect(r.available).toBeNull();
    expect(r.reasonCode).toBe("DURATION_TOO_LONG");
  });

  it("T6: 08:30 + 30 min is rejected as PAST_START", () => {
    const r = evaluateRequest({ startTime: "08:30", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(false);
    expect(r.available).toBeNull();
    expect(r.reasonCode).toBe("PAST_START");
  });

  it("T7a: 11:00 + 30 min is available (endpoint-touching)", () => {
    const r = evaluateRequest({ startTime: "11:00", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(true);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBeNull();
  });

  it("T7b: 09:30 + 30 min is available", () => {
    const r = evaluateRequest({ startTime: "09:30", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(true);
    expect(r.available).toBe(true);
  });

  it("T8: bookings are deep-equal before and after every check", () => {
    const cases = [
      { startTime: "09:15", durationMinutes: 30, blocked: false },
      { startTime: "10:30", durationMinutes: 30, blocked: false },
      { startTime: "15:00", durationMinutes: 30, blocked: true },
      { startTime: "09:15", durationMinutes: 0, blocked: false },
      { startTime: "09:15", durationMinutes: 121, blocked: false },
      { startTime: "08:30", durationMinutes: 30, blocked: false },
      { startTime: "11:00", durationMinutes: 30, blocked: false },
      { startTime: "", durationMinutes: 30, blocked: false },
      { startTime: "abc", durationMinutes: 30, blocked: false },
      { startTime: "09:15", durationMinutes: "x", blocked: false },
      { startTime: "09:15", durationMinutes: 30.5, blocked: false },
    ];
    for (const c of cases) {
      const data = bookings();
      const copy = JSON.parse(JSON.stringify(data));
      evaluateRequest(c, data, NOW);
      expect(data).toEqual(copy);
    }
  });

  it("empty start time is rejected as INVALID_START", () => {
    const r = evaluateRequest({ startTime: "", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r).toEqual({ valid: false, available: null, reasonCode: "INVALID_START", message: expect.any(String) });
  });

  it('startTime "abc" is rejected as INVALID_START', () => {
    const r = evaluateRequest({ startTime: "abc", durationMinutes: 30, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe("INVALID_START");
  });

  it('duration "x" is rejected as DURATION_INVALID', () => {
    const r = evaluateRequest({ startTime: "09:15", durationMinutes: "x", blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe("DURATION_INVALID");
  });

  it("duration 30.5 is rejected as DURATION_INVALID", () => {
    const r = evaluateRequest({ startTime: "09:15", durationMinutes: 30.5, blocked: false }, bookings(), NOW);
    expect(r.valid).toBe(false);
    expect(r.reasonCode).toBe("DURATION_INVALID");
  });

  it("contractMessage returns a non-empty string for every code", () => {
    for (const code of ["INVALID_START", "DURATION_INVALID", "DURATION_NOT_POSITIVE", "DURATION_TOO_LONG", "PAST_START", "BLOCKED", "OVERLAP"]) {
      expect(typeof contractMessage(code)).toBe("string");
      expect(contractMessage(code).length).toBeGreaterThan(0);
    }
  });
});
