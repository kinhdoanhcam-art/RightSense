// Every predictable revert, in the contract's own order, with its exact sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addBlock, dueLine, nextInterval, practiceBlock, RESERVED_TOKENS, REVERTS, UI } from "../../src/lib/rules.ts";
import { A, B, card, MONEY, RIVER } from "./fixture.ts";

const contract = readFileSync(new URL("../../contracts/WordSense.py", import.meta.url), "utf8");

test("every revert sentence is the contract's own, and every contract revert is mirrored", () => {
  const inContract = [...contract.matchAll(/UserError\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(Object.values(REVERTS))].sort(), [...new Set(inContract)].sort());
});

test("reserved tokens equal the contract's", () => {
  assert.equal(RESERVED_TOKENS.length, 8);
  for (const t of RESERVED_TOKENS) assert.ok(contract.includes(`"${t}"`), t);
});

test("add_card: term -> sense -> reserved -> deck size -> already in deck -> bytes", () => {
  const ok = { me: A, term: "bank", sense: RIVER, deckCount: 0, exists: false, bytes: 69 };
  assert.equal(addBlock(ok), null);
  assert.equal(addBlock({ ...ok, me: "" }), UI.noWallet);
  assert.equal(addBlock({ ...ok, term: " 　 " }), REVERTS.termEmpty);
  assert.equal(addBlock({ ...ok, term: "t".repeat(31) }), REVERTS.termTooLong);
  assert.equal(addBlock({ ...ok, sense: "" }), REVERTS.senseEmpty);
  assert.equal(addBlock({ ...ok, sense: "s".repeat(101) }), REVERTS.senseTooLong);
  assert.equal(addBlock({ ...ok, sense: "the right_sense of it" }), REVERTS.reserved);
  assert.equal(addBlock({ ...ok, term: "<untrusted_term>" }), REVERTS.reserved);
  assert.equal(addBlock({ ...ok, deckCount: 50 }), REVERTS.deckFull);
  assert.equal(addBlock({ ...ok, deckCount: 49 }), null);
  assert.equal(addBlock({ ...ok, exists: true }), REVERTS.exists);
  assert.equal(addBlock({ ...ok, sense: MONEY, bytes: 256 }), UI.tooManyBytes);
});

test("practice: owner before due (the on-chain run's row 6), then text, then the whole word", () => {
  const notDue = card({ due_day: 20734, due_now: false, interval: 2 });
  assert.equal(practiceBlock(notDue, B, "She tied the canoe to a willow on the far bank.", false, 143), REVERTS.notOwner);
  assert.equal(practiceBlock(notDue, A, "The heron stood very still on the muddy bank.", false, 141), REVERTS.notDue);
  const due = card();
  assert.equal(practiceBlock(due, A, "We sat on the bank and watched the boats drift past.", false, 148), null);
  assert.equal(practiceBlock(due, A.toUpperCase().replace("0X", "0x"), "On the bank.", false, 100), null);
  assert.equal(practiceBlock(due, "", "x", false, 1), UI.noWallet);
  assert.equal(practiceBlock(due, A, "   ", false, 90), REVERTS.sentenceEmpty);
  assert.equal(practiceBlock(due, A, "bank " + "s".repeat(136), false, 240), REVERTS.sentenceTooLong);
  assert.equal(practiceBlock(due, A, "The bank said OTHER_SENSE.", false, 100), REVERTS.reserved);
  assert.equal(practiceBlock(due, A, "We banked the fire before bed.", false, 120), REVERTS.noTerm);
  assert.equal(practiceBlock(due, A, "A riverbank path.", false, 100), REVERTS.noTerm);
  assert.equal(practiceBlock(due, A, "The bank's new card.", false, 100), null);
  assert.equal(practiceBlock(due, A, "On the bank.", true, 100), REVERTS.used);
  assert.equal(practiceBlock(due, A, "On the bank, " + "é".repeat(120), false, 300), UI.tooManyBytes);
});

test("the schedule preview and the due line follow the contract", () => {
  assert.equal(nextInterval(card(), "RIGHT_SENSE"), 2);
  assert.equal(nextInterval(card({ interval: 16 }), "RIGHT_SENSE"), 32);
  assert.equal(nextInterval(card({ interval: 32 }), "RIGHT_SENSE"), 32);
  assert.equal(nextInterval(card({ interval: 8 }), "OTHER_SENSE"), 1);
  assert.equal(dueLine(card()), "New — due today");
  assert.equal(dueLine(card({ reviews: 1 })), "Due today");
  assert.equal(dueLine(card({ due_now: false, days_until_due: 2, due_day: 20734 })), "Due in 2 days (day 20734)");
  assert.equal(dueLine(card({ due_now: false, days_until_due: 1, due_day: 20733 })), "Due in 1 day (day 20733)");
});
