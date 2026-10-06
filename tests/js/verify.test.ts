// Postconditions: a write is reported as done only when the reloaded state shows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addVerified, practiceVerified } from "../../src/lib/verify.ts";
import { A, A1, B, card, RIVER } from "./fixture.ts";

test("add: my card, my stripped text, interval 1, due today, no review yet", () => {
  const s = { id: A1, me: A.toUpperCase().replace("0X", "0x"), term: " bank ", sense: RIVER };
  assert.ok(addVerified(card(), s));
  assert.ok(!addVerified(card({ owner: B }), s));
  assert.ok(!addVerified(card({ due_day: 20733 }), s));
  assert.ok(!addVerified(null, s));
});

test("practice: the on-chain rows — RIGHT_SENSE doubles to 2, OTHER_SENSE collapses to 1", () => {
  const right = card({ interval: 2, due_day: 20734, reviews: 1, rights: 1, last_outcome: "RIGHT_SENSE", due_now: false, days_until_due: 2 });
  assert.deepEqual(practiceVerified(card(), right), { ok: true, outcome: "RIGHT_SENSE", card: right });
  const other = card({ interval: 1, due_day: 20733, reviews: 1, rights: 0, last_outcome: "OTHER_SENSE", due_now: false, days_until_due: 1 });
  assert.equal(practiceVerified(card(), other).ok, true);
});

test("practice: the cap at 32, a late review counted from its own day, and wrong states refused", () => {
  const before = card({ interval: 32, due_day: 20700, reviews: 6, rights: 6, today: 20732 });
  const after = card({ interval: 32, due_day: 20764, reviews: 7, rights: 7, last_outcome: "RIGHT_SENSE", today: 20732, due_now: false });
  assert.ok(practiceVerified(before, after).ok);
  assert.ok(!practiceVerified(card(), card({ interval: 2, due_day: 20734, reviews: 1, rights: 0, last_outcome: "RIGHT_SENSE" })).ok, "right not counted");
  assert.ok(!practiceVerified(card(), card({ interval: 2, due_day: 20733, reviews: 1, rights: 1, last_outcome: "RIGHT_SENSE" })).ok, "due day off");
  assert.ok(!practiceVerified(card({ interval: 4 }), card({ interval: 4, due_day: 20733, reviews: 1, last_outcome: "OTHER_SENSE" })).ok, "no collapse");
  assert.ok(!practiceVerified(card(), card()).ok, "no review recorded");
  assert.ok(!practiceVerified(card(), null).ok);
});
