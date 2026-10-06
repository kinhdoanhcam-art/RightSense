// Postconditions checked AFTER the receipt says SUCCESS, against reloaded
// accepted state. A write is reported as done only when the state shows it.

import { pyStrip } from "./pytext.ts";
import type { Card } from "./types.ts";
import { MAX_INTERVAL_DAYS } from "./rules.ts";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function addVerified(c: Card | null, s: { id: string; me: string; term: string; sense: string }): boolean {
  return !!c && c.card_id === s.id && same(c.owner, s.me) && c.term === pyStrip(s.term) && c.sense === pyStrip(s.sense) &&
    c.interval === 1 && c.due_day === c.today && c.reviews === 0 && c.last_outcome === "";
}

export type PracticeCheck = { ok: true; outcome: "RIGHT_SENSE" | "OTHER_SENSE"; card: Card } | { ok: false };

/**
 * One more review; RIGHT_SENSE doubles the interval (cap 32) and counts a right,
 * OTHER_SENSE collapses it to 1; the next due day is the day of the practice plus
 * the new interval.
 */
export function practiceVerified(before: Card, after: Card | null): PracticeCheck {
  if (!after || after.reviews !== before.reviews + 1) return { ok: false };
  const day = after.due_day - after.interval;
  if (day < before.due_day || day > after.today) return { ok: false };
  if (after.last_outcome === "RIGHT_SENSE") {
    const ok = after.interval === Math.min(before.interval * 2, MAX_INTERVAL_DAYS) && after.rights === before.rights + 1;
    return ok ? { ok: true, outcome: "RIGHT_SENSE", card: after } : { ok: false };
  }
  if (after.last_outcome === "OTHER_SENSE") {
    const ok = after.interval === 1 && after.rights === before.rights;
    return ok ? { ok: true, outcome: "OTHER_SENSE", card: after } : { ok: false };
  }
  return { ok: false };
}
