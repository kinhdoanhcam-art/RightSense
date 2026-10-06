import { keccak256, stringToBytes } from "viem";
import { pyLen, pyNormalize, pyStrip } from "./pytext.ts";

// Keccak-256 (Ethereum), not NIST SHA3-256. Same payload as the contract:
//   keccak256("WORD_SENSE:CARD:V1|" + owner_lower + "|" + len(t) + "|" + t + "|" + len(s) + "|" + s)
// where t and s are the term and the sense, Python-stripped with whitespace collapsed.
export function cardIdOf(owner: string, term: string, sense: string): string {
  const t = pyNormalize(pyStrip(term));
  const s = pyNormalize(pyStrip(sense));
  const payload = "WORD_SENSE:CARD:V1|" + owner.toLowerCase() + "|" + pyLen(t) + "|" + t + "|" + pyLen(s) + "|" + s;
  return keccak256(stringToBytes(payload)).slice(2);
}

const isLetter = (ch: string | undefined) => !!ch && /\p{L}/u.test(ch);

/**
 * The contract's _uses_term: whole-word match in any letter case, after collapsing
 * whitespace in both. The character right before and right after the term must not be
 * a letter (Python str.isalpha). Works on code points, like Python indices.
 */
export function usesTerm(sentence: string, term: string): boolean {
  const hay = Array.from(pyNormalize(sentence).toLowerCase());
  const needle = Array.from(pyNormalize(term).toLowerCase());
  if (needle.length === 0) return false;
  for (let start = 0; start + needle.length <= hay.length; start += 1) {
    let match = true;
    for (let i = 0; i < needle.length; i += 1) {
      if (hay[start + i] !== needle[i]) { match = false; break; }
    }
    if (!match) continue;
    const end = start + needle.length;
    if ((start === 0 || !isLetter(hay[start - 1])) && (end === hay.length || !isLetter(hay[end]))) return true;
  }
  return false;
}

/** The contract's used-sentence key: card id + "|" + keccak(normalized lower-case sentence). */
export function sentenceKey(cardId: string, sentence: string): string {
  return cardId + "|" + keccak256(stringToBytes(pyNormalize(sentence).toLowerCase())).slice(2);
}

/** Every 64-hex id found in a bare id, a 0x id, a link or a comma list. */
export function idsFromInput(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(/(?<![0-9a-fA-F])([0-9a-fA-F]{64})(?![0-9a-fA-F])/g)) {
    const id = m[1].toLowerCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function short(value: string, head = 6, tail = 4): string {
  if (!value || value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
