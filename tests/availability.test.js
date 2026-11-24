import { describe, it, expect } from "vitest";
import { checkAvailability, checkAvailabilityDetailed, reasonText } from "../src/availability.js";

const t = (h, m = 0) => new Date(2026, 9, 27, h, m).getTime();
const NOW = t(8);
const room = { id: "R101", blocked: false };
const fresh = () => [
  { id: "B2", roomId: "R101", start: t(13), end: t(14) },
  { id: "B1", roomId: "R101", start: t(10), end: t(11) },
];

describe("Room availability", () => {
  it("TC01 start >= end is rejected (AC1)", () => {
    expect(checkAvailability(room, fresh(), t(12), t(12), NOW)).toBe("Unavailable");
  });
  it("TC02 request in the past is rejected (AC1)", () => {
    expect(checkAvailability(room, fresh(), t(7), t(7, 30), NOW)).toBe("Unavailable");
  });
  it("TC03 exactly 120 minutes is allowed (AC2)", () => {
    expect(checkAvailability(room, [], t(15), t(17), NOW)).toBe("Available");
  });
  it("TC04 121 minutes is rejected (AC2)", () => {
    expect(checkAvailability(room, [], t(15), t(17, 1), NOW)).toBe("Unavailable");
  });
  it("TC05 blocked room is rejected (AC3)", () => {
    expect(checkAvailability({ id: "R101", blocked: true }, [], t(15), t(16), NOW)).toBe("Unavailable");
  });
  it("TC06 real overlap is rejected (AC4)", () => {
    expect(checkAvailability(room, fresh(), t(10, 30), t(11, 30), NOW)).toBe("Unavailable");
  });
  it("TC07 booking that ends when another starts is allowed (AC4)", () => {
    expect(checkAvailability(room, fresh(), t(9), t(10), NOW)).toBe("Available");
  });
  it("TC08 booking that starts when another ends is allowed (AC4)", () => {
    expect(checkAvailability(room, fresh(), t(11), t(12), NOW)).toBe("Available");
  });
  it("TC09 free slot returns Available (AC5)", () => {
    expect(checkAvailability(room, fresh(), t(15), t(16), NOW)).toBe("Available");
  });
  it("TC10 bookings array is not changed (AC5)", () => {
    const data = fresh();
    const copy = JSON.parse(JSON.stringify(data));
    checkAvailability(room, data, t(15), t(16), NOW);
    expect(data).toEqual(copy);
  });
});

describe("Detailed reason codes — AC1–AC6 coverage", () => {
  // AC1: reject start >= end and past requests.
  it("returns invalidRange when start equals end (AC1)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(12), t(12), NOW)).toEqual({ status: "Unavailable", reason: "invalidRange" });
  });
  it("returns invalidRange when start is after end (AC1)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(14), t(12), NOW)).toEqual({ status: "Unavailable", reason: "invalidRange" });
  });
  it("returns past when the whole slot is before now (AC1)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(7), t(7, 30), NOW)).toEqual({ status: "Unavailable", reason: "past" });
  });
  it("returns past when start is before now even if end is after (AC1)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(7), t(9), NOW)).toEqual({ status: "Unavailable", reason: "past" });
  });

  // AC2: reject durations longer than 120 minutes; exactly 120 is allowed.
  it("returns tooLong for 121-minute duration (AC2)", () => {
    expect(checkAvailabilityDetailed(room, [], t(15), t(17, 1), NOW)).toEqual({ status: "Unavailable", reason: "tooLong" });
  });
  it("returns null reason for exactly 120-minute duration (AC2)", () => {
    expect(checkAvailabilityDetailed(room, [], t(15), t(17), NOW)).toEqual({ status: "Available", reason: null });
  });

  // AC3: reject a blocked room.
  it("returns blocked for a blocked room (AC3)", () => {
    expect(checkAvailabilityDetailed({ id: "R101", blocked: true }, [], t(15), t(16), NOW)).toEqual({ status: "Unavailable", reason: "blocked" });
  });

  // AC4: reject overlaps; allow bookings touching only at endpoints.
  it("returns overlap when slot straddles an existing booking (AC4)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(10, 30), t(11, 30), NOW)).toEqual({ status: "Unavailable", reason: "overlap" });
  });
  it("returns null when slot ends exactly when a booking starts (AC4)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(9), t(10), NOW)).toEqual({ status: "Available", reason: null });
  });
  it("returns null when slot starts exactly when a booking ends (AC4)", () => {
    expect(checkAvailabilityDetailed(room, fresh(), t(11), t(12), NOW)).toEqual({ status: "Available", reason: null });
  });
  it("ignores bookings for a different room (AC4)", () => {
    expect(checkAvailabilityDetailed(room, [{ id: "BX", roomId: "R999", start: t(10), end: t(11) }], t(10, 30), t(11, 30), NOW)).toEqual({ status: "Available", reason: null });
  });

  // AC5: do not mutate booking data.
  it("does not mutate bookings via checkAvailabilityDetailed (AC5)", () => {
    const data = fresh();
    const copy = JSON.parse(JSON.stringify(data));
    checkAvailabilityDetailed(room, data, t(15), t(16), NOW);
    expect(data).toEqual(copy);
  });
  it("does not mutate bookings even when an overlap is found (AC5)", () => {
    const data = fresh();
    const copy = JSON.parse(JSON.stringify(data));
    checkAvailabilityDetailed(room, data, t(10, 30), t(11, 30), NOW);
    expect(data).toEqual(copy);
  });

  // AC6: keep clear desktop/mobile feedback — reason codes map to user text.
  it("maps invalidRange to user-readable text (AC6)", () => {
    expect(reasonText("invalidRange")).toBe("End time must be later than the start time.");
  });
  it("maps past to user-readable text (AC6)", () => {
    expect(reasonText("past")).toBe("Start time cannot be in the past (now is 09:00).");
  });
  it("maps tooLong to user-readable text (AC6)", () => {
    expect(reasonText("tooLong")).toBe("Bookings can be no longer than 120 minutes.");
  });
  it("maps blocked to user-readable text (AC6)", () => {
    expect(reasonText("blocked")).toBe("This room is currently blocked.");
  });
  it("maps overlap to user-readable text (AC6)", () => {
    expect(reasonText("overlap")).toBe("That time overlaps with the 10:00–11:00 booking.");
  });
  it("falls back to a generic message for an unknown code (AC6)", () => {
    expect(reasonText("unknown")).toBe("That slot is unavailable.");
  });
  it("returns null reason text for available slots (AC6)", () => {
    const { status, reason } = checkAvailabilityDetailed(room, fresh(), t(15), t(16), NOW);
    expect(status).toBe("Available");
    expect(reason).toBeNull();
  });
});

describe("reasonText follows supplied context (AC6)", () => {
  it("uses the supplied now label in the past message", () => {
    expect(reasonText("past", { nowLabel: "08:00" })).toBe("Start time cannot be in the past (now is 08:00).");
  });
  it("uses the supplied booking labels in the overlap message", () => {
    expect(reasonText("overlap", { bookingLabels: ["13:00–14:00"] })).toBe("That time overlaps with the 13:00–14:00 booking.");
  });
});
