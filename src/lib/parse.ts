// Contract views return JSON strings. WordSense holds no money: every number is a
// small counter or a day number.
import type { Card, Deck } from "./types.ts";

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isCard(o: Record<string, unknown> | null): boolean {
  return !!o && typeof o.card_id === "string" && typeof o.term === "string" && typeof o.interval === "number" &&
    typeof o.due_day === "number" && typeof o.today === "number";
}

export function parseCard(raw: string): Card | null {
  const o = parseObject(raw);
  return isCard(o) ? (o as unknown as Card) : null;
}

export function parseDeck(raw: string): Deck | null {
  const o = parseObject(raw);
  if (!o || typeof o.wallet !== "string" || !Array.isArray(o.cards) || typeof o.today !== "number") return null;
  if (!o.cards.every((c) => isCard(c as Record<string, unknown>))) return null;
  return o as unknown as Deck;
}

export type Limits = {
  rubric_hash?: string; contract_name?: string; version?: string; max_interval_days?: number;
  max_cards_per_owner?: number; max_sentence_length?: number;
};

export function parseLimits(raw: string): Limits | null {
  return parseObject(raw) as Limits | null;
}
