// Smart Campus - room availability (FIXED VERSION)
export const MAX_MINUTES = 120;

export function overlaps(aStart, aEnd, bStart, bEnd) {
  // FIX-A: strict < so touching endpoints are not a conflict
  return aStart < bEnd && bStart < aEnd;
}

export function checkAvailabilityDetailed(room, bookings, start, end, now) {
  if (start >= end) return { status: "Unavailable", reason: "invalidRange" };
  if (start < now) return { status: "Unavailable", reason: "past" };
  if ((end - start) / 60000 > MAX_MINUTES) return { status: "Unavailable", reason: "tooLong" };
  if (room.blocked) return { status: "Unavailable", reason: "blocked" };

  // FIX-B: copy the array before sorting, original stays the same
  const sorted = [...bookings].sort((a, b) => a.start - b.start);
  for (const b of sorted) {
    if (b.roomId === room.id && overlaps(start, end, b.start, b.end)) {
      return { status: "Unavailable", reason: "overlap" };
    }
  }
  return { status: "Available", reason: null };
}

export function checkAvailability(room, bookings, start, end, now) {
  return checkAvailabilityDetailed(room, bookings, start, end, now).status;
}

export function reasonText(code, ctx = {}) {
  const nowLabel = ctx.nowLabel ?? "09:00";
  const bookingLabel = (ctx.bookingLabels ?? ["10:00–11:00"]).join(", ");
  const messages = {
    invalidRange: "End time must be later than the start time.",
    past: `Start time cannot be in the past (now is ${nowLabel}).`,
    tooLong: `Bookings can be no longer than ${MAX_MINUTES} minutes.`,
    blocked: "This room is currently blocked.",
    overlap: `That time overlaps with the ${bookingLabel} booking.`,
  };
  return messages[code] ?? "That slot is unavailable.";
}
