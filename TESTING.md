# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Automated gates (run before release; CI runs them on every push)

| Gate | Command | Result |
|---|---|---|
| Kill-set + rubric gate | `python3 WORDSENSE_KILLSET_CHECK.py contracts/WordSense.py` | rc 0 — no word or word pair separates the classes; the rubric shares no content word with any case |
| genvm-linter | `python3 -m genvm_linter.cli lint contracts/WordSense.py` | pass |
| Contract tests (Direct Mode: the real py-genlayer v0.2.16 SDK, model mocked) | `python3 -m pytest tests/contract -q -p no:cacheprovider` | 58 passed |
| Mutation check | `python3 tools/mutate.py .` | 30/30 deliberate faults caught |
| Frontend build | `npm run build` | rc 0 |
| Frontend tests | `npm test` | 44 passed |
| Source hash | `npm run verify:source` | `contracts/WordSense.py` matches `SOURCE_SHA256.txt` |
| Calldata table | `node tools/calldata-bytes.mjs` | every write ≤ 255 bytes (largest: `practice` at the 140-character cap, 236) |
| Calldata on the RPC | `node tools/probe-calldata.mjs <address>` | runs in CI against both addresses in `deployments.json` |

The mocked model labels drive the deterministic code paths; they say nothing about what the real model returns. The
on-chain runs do.

### What the mutation check catches

Each fault is applied to the contract alone and the suite must go red (`tests/mutations.py`): RIGHT_SENSE not doubling
the interval, no 32-day cap, OTHER_SENSE keeping the interval, the next due day ignoring the new interval, the due check
off by one, a new card not due on the day it is added, rights not counted, the fail-safe flipped, an unknown label read
as RIGHT_SENSE, the validator accepting any label, anyone allowed to practise, the due check before the owner check, a
sentence reused (also through case or spacing), the term check skipped or missing a boundary before or after the term,
a case-sensitive term check, only the first occurrence checked, reserved tokens not checked on the sentence or the
sense, the deck cap and sentence cap off by one, the card id ignoring whitespace or the owner, a single-pass fence, a
wallet leaking into the prompt, the day helper shifting the wrong months, and the deck view not sorted by due day.

### Calldata

Encoded exactly as genlayer-js 1.1.8 `writeContract` does. The ten case sentences measure 141–154 bytes; `practice` at
the 140-character cap 236; `add_card` at both caps 162. The longest ASCII sentence that fits is 159 characters. A
sentence of non-ASCII letters takes more bytes per character (140 two-byte letters measure 378), so the sentence box
shows a byte meter and disables *Practise* above 255 bytes.

## Frontend checks

- **Revert sentences** (`tests/js/rules.test.ts`): the set in `src/lib/rules.ts` equals the 14 sentences in the source,
  and for both writes the UI reports the earliest failing check in the source's order — owner before due, as in row 6
  of the on-chain run.
- **Card ids, the term check and sentence keys** (`tests/js/ids.test.ts`): equal to vectors produced by the contract on
  the real SDK — Unicode letters as boundaries, `bank's` accepted, `banked` and `riverbank` refused, multi-word terms —
  and to the cards of the on-chain run.
- **Postconditions** (`tests/js/verify.test.ts`): a practice is reported only when the reloaded card has one more review
  and an interval and due day that match the outcome (doubling with the 32-day cap, or back to 1), counted from the day
  of the practice.
- **Receipts** (`tests/js/receipt.test.ts`): a leader SUCCESS while validators are still proposing, committing or
  revealing is pending, not success.
- **Interface check** (Playwright against `vite preview`, the RPC mocked by decoding calldata): overview, your deck with
  a due and a not-due card, typing a sentence key by key (the box keeps focus) and the whole-word refusal, another
  wallet's deck with *Practise* disabled for the owner check, the add form with an existing and a new card, and 390 px —
  no page error, no horizontal scroll.

## On-chain runs

See `RUNTIME_EVIDENCE.md`: the Project run through this app (4 transactions) and the Intelligent Contract run (11
transactions, every must-verify row PASS), one hash per row.

Project run through the app: one sentence, "After the flood, the bank was covered in broken branches.", was read
**OTHER_SENSE** on a money-sense card (back tomorrow) and **RIGHT_SENSE** on a river-sense card (back in 2 days); a
sentence without the whole word, a card not yet due, and another wallet's card each disabled *Practise* with the
contract's sentence. Every result was reported only after the app re-read the card: **PASS**.

Intelligent Contract run: R1 → RIGHT_SENSE and O1 → OTHER_SENSE on two river-sense cards; on two money-sense cards R3 →
OTHER_SENSE and O3 → RIGHT_SENSE; the not-due, owner and whole-word reverts each fired with the contract's sentence:
**PASS**.

## Consensus behaviour

The model is called once per practice sentence. Validators re-run the reading and must agree on the exact label; a
disagreement rotates the leader or ends the transaction without recording the practice — the card stays due and the
sentence stays unused. `add_card` and every check before the model are deterministic.

## What this run does NOT prove

- Each case is sent once; label stability across repeated runs or validator sets is not measured.
- Only the first step of the schedule is checked on-chain; later doublings, the 32-day cap and the due-day boundary are
  covered by the offline tests with a moved clock.
- "Already used" is predicted only for sentences sent from this browser (the contract keeps a hash); the contract
  refuses a reused sentence anyway.
- Prompt-injection resistance rests on the fence and the reserved-token check; no adversarial model run is done.
