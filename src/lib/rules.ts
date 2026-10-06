// Mirrors every revert of contracts/WordSense.py that can be predicted from state
// already read, in the SAME order the contract checks them. Whether a sentence
// carries the declared sense is NEVER decided here: only validators decide that,
// inside practice(). The outcome is read back from the view.

import { usesTerm } from "./ids.ts";
import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Card } from "./types.ts";

export const MAX_TERM_LENGTH = 30;
export const MAX_SENSE_LENGTH = 100;
export const MAX_SENTENCE_LENGTH = 140;
export const MAX_CARDS_PER_OWNER = 50;
export const MAX_INTERVAL_DAYS = 32;

export const RESERVED_TOKENS = [
  "<UNTRUSTED_TERM>",
  "</UNTRUSTED_TERM>",
  "<UNTRUSTED_SENSE>",
  "</UNTRUSTED_SENSE>",
  "<UNTRUSTED_SENTENCE>",
  "</UNTRUSTED_SENTENCE>",
  "RIGHT_SENSE",
  "OTHER_SENSE",
] as const;

export const REVERTS = {
  termEmpty: "Term is empty",
  termTooLong: "Term is too long",
  senseEmpty: "Sense is empty",
  senseTooLong: "Sense is too long",
  reserved: "Text contains a reserved token",
  deckFull: "Your deck is full",
  exists: "You already have this card",
  unknown: "Unknown card id",
  notOwner: "Only the card's owner may practise it",
  notDue: "This card is not due yet",
  sentenceEmpty: "Sentence is empty",
  sentenceTooLong: "Sentence is too long",
  noTerm: "The sentence does not use the term",
  used: "You have already used this sentence",
} as const;

/** UI-only reasons (the contract never sees these calls). */
export const UI = {
  noWallet: "Connect a wallet first",
  tooManyBytes: "This text is over the 255-byte calldata limit; shorten it",
} as const;

const same = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export type AddInput = { me: string; term: string; sense: string; deckCount: number; exists: boolean; bytes: number };

/** add_card order: term -> sense -> reserved -> deck size -> not already in the deck. */
export function addBlock(i: AddInput): string | null {
  if (!i.me) return UI.noWallet;
  const t = pyStrip(i.term);
  if (pyLen(t) === 0) return REVERTS.termEmpty;
  if (pyLen(t) > MAX_TERM_LENGTH) return REVERTS.termTooLong;
  const s = pyStrip(i.sense);
  if (pyLen(s) === 0) return REVERTS.senseEmpty;
  if (pyLen(s) > MAX_SENSE_LENGTH) return REVERTS.senseTooLong;
  if (pyContainsToken(t, RESERVED_TOKENS) || pyContainsToken(s, RESERVED_TOKENS)) return REVERTS.reserved;
  if (i.deckCount >= MAX_CARDS_PER_OWNER) return REVERTS.deckFull;
  if (i.exists) return REVERTS.exists;
  if (i.bytes > 255) return UI.tooManyBytes;
  return null;
}

/**
 * practice order: owner -> due -> sentence -> reserved -> whole-word term -> not used before.
 * "Used before" is what this browser knows: the contract keeps only a hash of each sentence.
 */
export function practiceBlock(c: Card, me: string, sentence: string, usedHere: boolean, bytes: number): string | null {
  if (!me) return UI.noWallet;
  if (!same(c.owner, me)) return REVERTS.notOwner;
  if (c.today < c.due_day) return REVERTS.notDue;
  const s = pyStrip(sentence);
  if (pyLen(s) === 0) return REVERTS.sentenceEmpty;
  if (pyLen(s) > MAX_SENTENCE_LENGTH) return REVERTS.sentenceTooLong;
  if (pyContainsToken(s, RESERVED_TOKENS)) return REVERTS.reserved;
  if (!usesTerm(s, c.term)) return REVERTS.noTerm;
  if (usedHere) return REVERTS.used;
  if (bytes > 255) return UI.tooManyBytes;
  return null;
}

/** The schedule as the contract writes it, for the "if right / if other" preview. */
export function nextInterval(c: Card, outcome: "RIGHT_SENSE" | "OTHER_SENSE"): number {
  return outcome === "RIGHT_SENSE" ? Math.min(c.interval * 2, MAX_INTERVAL_DAYS) : 1;
}

export function dueLine(c: Card): string {
  if (c.due_now) return c.reviews === 0 ? "New — due today" : "Due today";
  const d = c.days_until_due;
  return `Due in ${d} day${d === 1 ? "" : "s"} (day ${c.due_day})`;
}

/** The ladder 1 → 2 → 4 → 8 → 16 → 32 and where the card sits on it. */
export const LADDER = [1, 2, 4, 8, 16, 32];
