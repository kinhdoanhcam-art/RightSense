// Calldata size of every write method, encoded exactly as genlayer-js 1.1.8 does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calldataBytes, CALLDATA_LIMIT } from "../../src/lib/calldata.ts";
import { CASES, hardBlockRows, ID } from "../../tools/calldata-rows.mjs";

test("ten case sentences + every write at its cap stay under 255 bytes", () => {
  assert.equal(Object.keys(CASES).length, 10);
  for (const row of hardBlockRows()) {
    const n = calldataBytes(row.method, row.args);
    assert.ok(n <= CALLDATA_LIMIT, `${row.name}: ${n} bytes`);
  }
});

test("a 140-character ASCII sentence fits (236 bytes); non-ASCII can pass the cliff, so the meter must catch it", () => {
  assert.equal(calldataBytes("practice", [ID, "s".repeat(140)]), 236);
  assert.ok(calldataBytes("practice", [ID, "x".repeat(159)]) <= CALLDATA_LIMIT);
  assert.ok(calldataBytes("practice", [ID, "x".repeat(160)]) > CALLDATA_LIMIT);
  assert.ok(calldataBytes("practice", [ID, "é".repeat(140)]) > CALLDATA_LIMIT);
});
