import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCard, parseDeck, parseLimits } from "../../src/lib/parse.ts";
import { A, card } from "./fixture.ts";

const RAW = JSON.stringify(card({ interval: 2, due_day: 20734, reviews: 1, rights: 1, last_outcome: "RIGHT_SENSE", due_now: false, days_until_due: 2 }));
const DECK = JSON.stringify({ wallet: A, today: 20732, count: 1, max_cards: 50, cards: [JSON.parse(RAW)] });

test("views are parsed as JSON once, or twice when the RPC double-encodes them", () => {
  assert.equal(parseCard(RAW)?.last_outcome, "RIGHT_SENSE");
  assert.equal(parseCard(JSON.stringify(RAW))?.due_day, 20734);
  assert.equal(parseDeck(DECK)?.cards[0].interval, 2);
  assert.equal(parseDeck(JSON.stringify(DECK))?.count, 1);
  assert.equal(parseLimits('{"max_interval_days": 32}')?.max_interval_days, 32);
});

test("unknown id, broken JSON or a wrong shape read as nothing", () => {
  assert.equal(parseCard("{}"), null);
  assert.equal(parseCard("nope"), null);
  assert.equal(parseCard(RAW.replace('"due_day":20734', '"due_day":"20734"')), null);
  assert.equal(parseDeck(DECK.replace('"cards":[', '"items":[')), null);
  assert.equal(parseDeck(JSON.stringify({ wallet: A, today: 1, count: 1, cards: [{}] })), null);
});
