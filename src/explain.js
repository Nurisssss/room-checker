// Mock "Explain availability" adapter. No fetch, no network, no API key.
// Builds text only from the supplied fields; the deterministic checker in
// availability.js stays authoritative for the Available/Unavailable result.
import { reasonText } from "./availability.js";

export const MAX_NOTE_LENGTH = 140;
const TIMEOUT_MS = 2000;
const MAX_OUTPUT_LENGTH = 300;
const TIME_RE = /^\d{1,2}:\d{2}$/;

export function validateInput(input = {}) {
  if (!input || typeof input !== "object") return "input must be an object";
  if (typeof input.roomLabel !== "string" || input.roomLabel.trim() === "") return "roomLabel must be a non-empty string";
  const validTime = (t) => {
    if (typeof t !== "string" || !TIME_RE.test(t)) return false;
    const [h, m] = t.split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };
  if (!validTime(input.start)) return "start must be a HH:MM time";
  if (!validTime(input.end)) return "end must be a HH:MM time";
  if (typeof input.isAvailable !== "boolean") return "isAvailable must be a boolean";
  if (input.reasonCode != null && typeof input.reasonCode !== "string") return "reasonCode must be a string or null";
  if (input.userNote != null) {
    if (typeof input.userNote !== "string") return "userNote must be a string";
    if (input.userNote.length > MAX_NOTE_LENGTH) return `userNote must be at most ${MAX_NOTE_LENGTH} characters`;
  }
  return null;
}

export function countSentences(text) {
  return text.split(/[.!?]+/).filter((part) => part.trim() !== "").length;
}

export function validateOutput(text) {
  if (typeof text !== "string") return "output must be a string";
  const trimmed = text.trim();
  if (trimmed.length < 1) return "output must not be empty";
  if (trimmed.length > MAX_OUTPUT_LENGTH) return `output must be at most ${MAX_OUTPUT_LENGTH} characters`;
  if (countSentences(trimmed) > 2) return "output must be at most two sentences";
  return null;
}

export function fallbackText({ isAvailable, reasonCode, ctx = {} } = {}) {
  const base = isAvailable
    ? "The selected time slot is free to use."
    : reasonText(reasonCode ?? "unknown", ctx);
  return `Fallback (explanation unavailable): ${base}`;
}

function mockText({ roomLabel, start, end, isAvailable, reasonCode }) {
  if (isAvailable) {
    return `Room ${roomLabel} is free from ${start} to ${end} under the current booking rules.`;
  }
  return `Room ${roomLabel} is unavailable from ${start} to ${end} because the check returned the reason "${reasonCode}".`;
}

// mode is "ok", "error" or "timeout" (for demos). userNote is validated but
// never echoed or obeyed. Resolves with { explanation } or rejects.
export function explainAvailability(input, options = {}) {
  const { mode = "ok" } = options;
  const validationError = validateInput(input);
  if (validationError) return Promise.reject(new Error(`invalid input: ${validationError}`));

  const explanation = mockText(input);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("explanation timed out")), TIMEOUT_MS);
    if (mode === "timeout") return; // never completes; the timeout rejects
    clearTimeout(timer);
    if (mode === "error") {
      reject(new Error("mock adapter failure"));
      return;
    }
    const outputError = validateOutput(explanation);
    if (outputError) {
      reject(new Error(`invalid output: ${outputError}`));
      return;
    }
    resolve({ explanation });
  });
}
