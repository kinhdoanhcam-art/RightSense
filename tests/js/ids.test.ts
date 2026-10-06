import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardIdOf, idsFromInput, sentenceKey, usesTerm } from "../../src/lib/ids.ts";

const v = JSON.parse(readFileSync(new URL("./id-vectors.json", import.meta.url), "utf8"));

test("card ids match the contract, including whitespace and Unicode edge cases", () => {
  assert.ok(v.cards.length >= 8);
  for (const row of v.cards) {
    assert.equal(cardIdOf(v.owner, row.term, row.sense), row.card_id, JSON.stringify(row));
    assert.equal(cardIdOf(v.owner.toLowerCase(), row.term, row.sense), row.card_id);
  }
});

test("the whole-word term check matches the contract on every vector", () => {
  for (const row of v.matches) assert.equal(usesTerm(row.sentence, row.term), row.uses, JSON.stringify(row));
});

test("a sentence reused with other case or spacing has the same key", () => {
  for (const row of v.used) assert.equal(sentenceKey("ab".repeat(32), row.sentence), row.key);
});

test("the cards of the on-chain run are reproduced from the two wallets", () => {
  const A = "0x3065E31B1D993d7C0D59E6786844cBa56780B2d3", B = "0xdaE8968571C6E84f44F86d06F1071bbc8F807500";
  assert.equal(cardIdOf(A, "bank", "the land along the side of a river"), "724ea068db37ca6731f26d69c0069c641507dfa68b35fbb97b1938b79acc79f1");
  assert.equal(cardIdOf(B, "bank", "a business that keeps and lends money"), "69e8709471a2f9c86e6789f783b38eedea0c5c9fdd0a9a1aab5a327699a09ff1");
});

test("ids are found in a bare id, a 0x id, a link or a list", () => {
  const a = "724ea068db37ca6731f26d69c0069c641507dfa68b35fbb97b1938b79acc79f1";
  assert.deepEqual(idsFromInput("0x" + a.toUpperCase()), [a]);
  assert.deepEqual(idsFromInput(`x?c=${a},${a}`), [a]);
  assert.deepEqual(idsFromInput(a + "ab"), []);
});
