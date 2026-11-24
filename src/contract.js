// Pure validation/decision layer for the Smart Campus availability contract.
// Reuses checkAvailabilityDetailed for blocked and overlap; adds format and
// duration validation and maps every outcome to the contract shape.
import { checkAvailabilityDetailed } from "./availability.js";

export const REASONS = {
  INVALID_START: "INVALID_START",
  DURATION_INVALID: "DURATION_INVALID",
  DURATION_NOT_POSITIVE: "DURATION_NOT_POSITIVE",
  DURATION_TOO_LONG: "DURATION_TOO_LONG",
  PAST_START: "PAST_START",
  BLOCKED: "BLOCKED",
  OVERLAP: "OVERLAP",
};

const invalid = (reasonCode, message) => ({ valid: false, available: null, reasonCode, message });
const unavailable = (reasonCode, message) => ({ valid: true, available: false, reasonCode, message });

const START_RE = /^\d{1,2}:\d{2}$/;

// messages are presentation; codes are the contract
const MESSAGES = {
  INVALID_START: "Start time must be a valid HH:MM time.",
  DURATION_INVALID: "Duration must be a whole number of minutes.",
  DURATION_NOT_POSITIVE: "Duration must be greater than zero minutes.",
  DURATION_TOO_LONG: "Duration must be at most 120 minutes.",
  PAST_START: "Start time cannot be before the current time (09:00).",
  BLOCKED: "This room is currently blocked.",
  OVERLAP: "That time overlaps with the 10:00–11:00 booking.",
  UNAVAILABLE: "That slot is unavailable.",
};

export function contractMessage(reasonCode) {
  return MESSAGES[reasonCode] ?? MESSAGES.UNAVAILABLE;
}

export function evaluateRequest({ startTime, durationMinutes, blocked }, bookings, nowMinutes) {
  if (typeof startTime !== "string" || !START_RE.test(startTime)) {
    return invalid(REASONS.INVALID_START, contractMessage(REASONS.INVALID_START));
  }
  const [h, m] = startTime.split(":").map(Number);
  if (h > 23 || m > 59) {
    return invalid(REASONS.INVALID_START, contractMessage(REASONS.INVALID_START));
  }
  const start = h * 60 + m;

  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes)) {
    return invalid(REASONS.DURATION_INVALID, contractMessage(REASONS.DURATION_INVALID));
  }
  if (durationMinutes <= 0) {
    return invalid(REASONS.DURATION_NOT_POSITIVE, contractMessage(REASONS.DURATION_NOT_POSITIVE));
  }
  if (durationMinutes > 120) {
    return invalid(REASONS.DURATION_TOO_LONG, contractMessage(REASONS.DURATION_TOO_LONG));
  }
  if (start < nowMinutes) {
    return invalid(REASONS.PAST_START, contractMessage(REASONS.PAST_START));
  }

  // Delegate the booking rules to the existing deterministic checker.
  // bookings are ms timestamps as in the rest of the app; nowMinutes -> ms.
  const MIN = 60000;
  const room = { id: "B-204", blocked: Boolean(blocked) };
  const end = start * MIN + durationMinutes * MIN;
  const { status, reason } = checkAvailabilityDetailed(room, bookings, start * MIN, end, nowMinutes * MIN);

  if (status === "Unavailable") {
    const code = reason === "blocked" ? REASONS.BLOCKED : REASONS.OVERLAP;
    return unavailable(code, contractMessage(code));
  }
  return { valid: true, available: true, reasonCode: null, message: "Room is available for this time slot.", durationMinutes };
}
