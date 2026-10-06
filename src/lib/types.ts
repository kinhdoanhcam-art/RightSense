// Shapes of the contract's JSON views.

export type Card = {
  card_id: string;
  owner: string;
  term: string;
  sense: string;
  interval: number;
  due_day: number;
  reviews: number;
  rights: number;
  last_outcome: "RIGHT_SENSE" | "OTHER_SENSE" | "" | string;
  today: number;
  due_now: boolean;
  days_until_due: number;
  index?: number;
};

export type Deck = { wallet: string; today: number; count: number; max_cards: number; cards: Card[] };

/** One practice sentence this browser sent, with the outcome read back from the contract. */
export type Attempt = { sentence: string; outcome: string; day: number; hash?: string };

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = {
  phase: TxPhase;
  message: string;
  hash?: string;
  action?: string;
};
