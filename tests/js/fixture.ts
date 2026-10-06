// get_card views as the contract returns them (the on-chain Intelligent Contract run, day 20732).
import type { Card } from "../../src/lib/types.ts";

export const A = "0x3065e31b1d993d7c0d59e6786844cba56780b2d3";
export const B = "0xdae8968571c6e84f44f86d06f1071bbc8f807500";
export const A1 = "724ea068db37ca6731f26d69c0069c641507dfa68b35fbb97b1938b79acc79f1";
export const RIVER = "the land along the side of a river";
export const MONEY = "a business that keeps and lends money";

export function card(over: Partial<Card> = {}): Card {
  return {
    card_id: A1, owner: A, term: "bank", sense: RIVER, interval: 1, due_day: 20732, reviews: 0, rights: 0,
    last_outcome: "", today: 20732, due_now: true, days_until_due: 0, ...over,
  };
}
