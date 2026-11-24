import { describe, it, expect, vi } from "vitest";
import {
  explainAvailability,
  validateInput,
  validateOutput,
  fallbackText,
  MAX_NOTE_LENGTH,
} from "../src/explain.js";
import { checkAvailabilityDetailed } from "../src/availability.js";

const t = (h, m = 0) => new Date(2026, 9, 27, h, m).getTime();
const NOW = t(8);
const room = { id: "R101", blocked: false };
const fresh = () => [
  { id: "B2", roomId: "R101", start: t(13), end: t(14) },
  { id: "B1", roomId: "R101", start: t(10), end: t(11) },
];

const baseInput = {
  roomLabel: "R101 Seminar room",
  start: "15:00",
  end: "16:00",
  isAvailable: true,
  reasonCode: null,
  userNote: "",
};

describe("explainAvailability — success cases", () => {
  it("explains an available slot", async () => {
    const { explanation } = await explainAvailability(baseInput, { mode: "ok" });
    expect(explanation).toContain("R101 Seminar room");
    expect(explanation).toContain("15:00");
    expect(explanation).toContain("16:00");
    expect(explanation).toMatch(/free/i);
  });

  it("explains an overlap rejection", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, isAvailable: false, reasonCode: "overlap" });
    expect(explanation).toContain("overlap");
  });

  it("explains a blocked room", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, isAvailable: false, reasonCode: "blocked" });
    expect(explanation).toContain("blocked");
  });

  it("explains an invalid range", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, isAvailable: false, reasonCode: "invalidRange" });
    expect(explanation).toContain("invalidRange");
  });

  it("explains a past slot", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, isAvailable: false, reasonCode: "past" });
    expect(explanation).toContain("past");
  });

  it("explains a too-long slot", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, isAvailable: false, reasonCode: "tooLong" });
    expect(explanation).toContain("tooLong");
  });

  it("never echoes the user note", async () => {
    const { explanation } = await explainAvailability({ ...baseInput, userNote: "SECRET-NOTE-123" });
    expect(explanation).not.toContain("SECRET-NOTE-123");
  });

  it("keeps the output within two sentences and 300 characters", async () => {
    const { explanation } = await explainAvailability(baseInput, { mode: "ok" });
    expect(validateOutput(explanation)).toBeNull();
  });
});

describe("explainAvailability — input validation", () => {
  it("rejects empty input", async () => {
    await expect(explainAvailability({}, { mode: "ok" })).rejects.toThrow("invalid input");
  });

  it("rejects missing fields via validateInput", () => {
    expect(validateInput({})).not.toBeNull();
    expect(validateInput({ ...baseInput, roomLabel: "" })).not.toBeNull();
    expect(validateInput({ ...baseInput, start: undefined })).not.toBeNull();
  });

  it("rejects malformed time fields", async () => {
    await expect(
      explainAvailability({ ...baseInput, start: "not-a-time" }, { mode: "ok" })
    ).rejects.toThrow("invalid input");
    await expect(
      explainAvailability({ ...baseInput, end: "25:99" }, { mode: "ok" })
    ).rejects.toThrow("invalid input");
  });

  it("rejects a note longer than 140 characters", async () => {
    const longNote = "x".repeat(MAX_NOTE_LENGTH + 1);
    expect(validateInput({ ...baseInput, userNote: longNote })).not.toBeNull();
    await expect(
      explainAvailability({ ...baseInput, userNote: longNote }, { mode: "ok" })
    ).rejects.toThrow("140 characters");
  });

  it("accepts a note of exactly 140 characters", () => {
    expect(validateInput({ ...baseInput, userNote: "x".repeat(MAX_NOTE_LENGTH) })).toBeNull();
  });
});

describe("explainAvailability — failure handling", () => {
  it("rejects when the adapter errors (mode error)", async () => {
    await expect(explainAvailability(baseInput, { mode: "error" })).rejects.toThrow("mock adapter failure");
  });

  it("times out after 2 seconds (mode timeout)", async () => {
    vi.useFakeTimers();
    try {
      const assertion = expect(explainAvailability(baseInput, { mode: "timeout" })).rejects.toThrow("explanation timed out");
      vi.advanceTimersByTime(2000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("validateOutput — untrusted model output is rejected", () => {
  it("accepts a one-sentence string", () => {
    expect(validateOutput("Room is free.")).toBeNull();
  });
  it("accepts a two-sentence string", () => {
    expect(validateOutput("Room is free. Enjoy your slot.")).toBeNull();
  });
  it("rejects empty output", () => {
    expect(validateOutput("")).not.toBeNull();
    expect(validateOutput("   ")).not.toBeNull();
  });
  it("rejects non-string output", () => {
    expect(validateOutput(null)).not.toBeNull();
    expect(validateOutput(undefined)).not.toBeNull();
    expect(validateOutput(42)).not.toBeNull();
  });
  it("rejects output over 300 characters", () => {
    expect(validateOutput("a".repeat(301))).not.toBeNull();
  });
  it("rejects more than two sentences", () => {
    expect(validateOutput("One. Two. Three.")).not.toBeNull();
  });
});

describe("fallbackText — deterministic fallback", () => {
  it("labels the fallback and reuses the reason text", () => {
    const text = fallbackText({ isAvailable: false, reasonCode: "overlap" });
    expect(text).toMatch(/^Fallback \(explanation unavailable\): /);
    expect(text).toContain("10:00–11:00");
  });
  it("uses the available message for available slots", () => {
    const text = fallbackText({ isAvailable: true, reasonCode: null });
    expect(text).toBe("Fallback (explanation unavailable): The selected time slot is free to use.");
  });
  it("uses the generic reason text for an unknown code", () => {
    const text = fallbackText({ isAvailable: false, reasonCode: "mystery" });
    expect(text).toContain("That slot is unavailable.");
  });
});

describe("explaining never mutates bookings or changes the status", () => {
  it("leaves bookings and the checker result untouched", async () => {
    const data = fresh();
    const copy = JSON.parse(JSON.stringify(data));
    const before = checkAvailabilityDetailed(room, data, t(10, 30), t(11, 30), NOW);
    const { explanation } = await explainAvailability(
      { ...baseInput, start: "10:30", end: "11:30", isAvailable: before.status === "Available", reasonCode: before.reason },
      { mode: "ok" }
    );
    expect(typeof explanation).toBe("string");
    expect(data).toEqual(copy);
    expect(checkAvailabilityDetailed(room, data, t(10, 30), t(11, 30), NOW)).toEqual(before);
  });
});
