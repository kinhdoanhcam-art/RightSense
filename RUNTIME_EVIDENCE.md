# RUNTIME_EVIDENCE

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

Both deployments run the same frozen source, SHA-256 `a3c8003f4a6d9118d3c1580b6a31af649520b5e4a036259ef98b06f672608f76`.

## Project run (address `0x139a515380ab68eA4c9ae5f9005D4Cd365888ED5`, through this app)

Deploy tx [`0x72bf8f55…71f7591d`](https://explorer-studio.genlayer.com/tx/0x72bf8f55a93fc0c2560f38b75a3fac5b482bf016b65960cd6049935971f7591d). The run through the app is recorded here once it has been made.

## Intelligent Contract run (address `0x8A38F1c8c3FF97fe67AE45dD4c029fAF9C92C6f4`, Studio)

Wallets: **A** = learner A `0x3065E31B1D993d7C0D59E6786844cBa56780B2d3` · **B** = learner B `0xdaE8968571C6E84f44F86d06F1071bbc8F807500`, each with their own deck. Contract [`0x8A38F1c8c3FF97fe67AE45dD4c029fAF9C92C6f4`](https://explorer-studio.genlayer.com/address/0x8A38F1c8c3FF97fe67AE45dD4c029fAF9C92C6f4) · deploy tx [`0x8ac1447e…1a569ba9`](https://explorer-studio.genlayer.com/tx/0x8ac1447e7d18cfb67ed54945f8538937ce1e37d949e353e34fa9d9331a569ba9) · source SHA-256 `a3c8003f4a6d9118d3c1580b6a31af649520b5e4a036259ef98b06f672608f76`. Run date 2026-10-06 (UTC day 20732), GenLayer Studio, Normal (Full Consensus).

Every case is judged on a card with the term `bank`. The gate cases assume the declared sense `the land along the side of a river` (cards A1, B1). Rows 9 and 11 reuse the R3/O3 frame on cards declaring `a business that keeps and lends money` (A2, B2), where the expected labels swap: the outcome depends on the declared sense, not on the sentence alone. `today` and `due_day` are UTC days since 1970-01-01, read from the transaction's datetime.

The table has 12 rows and 11 transactions, all FINALIZED (12 with the deploy).

Card ids (keccak of owner, term and sense): A1 `724ea068db37ca6731f26d69c0069c641507dfa68b35fbb97b1938b79acc79f1` · B1 `516f0ad407d9e14b8bb91e33dba33cfe36807f1169ddaebe40499d7ae8f59ac4` · A2 `f6451b5e220ab79ab018f992897ad9f45be14ca351354e37605a8866b70581d4` · B2 `69e8709471a2f9c86e6789f783b38eedea0c5c9fdd0a9a1aab5a327699a09ff1`.

| # | Wallet | Call | Expected | Tx hash | Result |
|---|---|---|---|---|---|
| 1 | A | `add_card("bank", "the land along the side of a river")` | card A1, interval 1; get_card(A1): due_day == today, due_now true — **Clock check** | [`0x5657864e…359410ce`](https://explorer-studio.genlayer.com/tx/0x5657864e156b1d61b66beffbb8d5f8892d6551453f7640973723558b359410ce) | SUCCESS; get_card(A1): interval 1, due_day **20732** = today **20732** (2026-10-06), due_now true |
| 2 | B | `add_card("bank", "the land along the side of a river")` | card B1 (a different id from A1), due_day == today | [`0xc6e4d1a7…5acd2740`](https://explorer-studio.genlayer.com/tx/0xc6e4d1a762642287f97ca5a8e3728061908a43d6167f7b0d3fdff7985acd2740) | SUCCESS; card B1 (id differs from A1), interval 1, due_day 20732 |
| 3 | A | `practice(A1, R1)` | RIGHT_SENSE; interval 2, due_day = today + 2 — **Check 1a** | [`0x15c36050…d2b5783f`](https://explorer-studio.genlayer.com/tx/0x15c360509f1b9fe4f986791d17e67d27438dabf3a5e90ac07ce9e9aad2b5783f) | **RIGHT_SENSE**; interval **2**, due_day **20734**, rights 1 |
| 4 | B | `practice(B1, O1)` | OTHER_SENSE; interval 1, due_day = today + 1 — **Check 1b** | [`0x8c4809be…38571658`](https://explorer-studio.genlayer.com/tx/0x8c4809be0d3b56e145720e5aabec57c928187c942f44274f39c36af638571658) | **OTHER_SENSE**; interval **1**, due_day **20733** |
| 5 | A | `practice(A1, R2)` | revert *This card is not due yet* | [`0x3bf26856…ab9be3d2`](https://explorer-studio.genlayer.com/tx/0x3bf268564245f464edbc27ac59f0b36241fe70d869df4ceceb83e6ddab9be3d2) | reverted, *This card is not due yet* |
| 6 | B | `practice(A1, R4)` | revert *Only the card's owner may practise it* | [`0xc41c4e8d…adf2dde0`](https://explorer-studio.genlayer.com/tx/0xc41c4e8d06102a3f788579a847f32fa535ce23d57a4180200e942d7eadf2dde0) | reverted, *Only the card's owner may practise it* |
| 7 | A | `add_card("bank", "a business that keeps and lends money")` | card A2 (the money sense), due_day == today | [`0x0db04583…c632ce9e`](https://explorer-studio.genlayer.com/tx/0x0db045838fff9816986243b4731ae934488b3a00d08c0fec78fa9f17c632ce9e) | SUCCESS; card A2, interval 1, due_day 20732 |
| 8 | A | `practice(A2, "We banked the fire before bed.")` | revert *The sentence does not use the term* | [`0x09a9f503…bfe16939`](https://explorer-studio.genlayer.com/tx/0x09a9f503c45c80439db741b0e54fcfca197f1e9023f5b3f40ee129c0bfe16939) | reverted, *The sentence does not use the term* |
| 9 | A | `practice(A2, R3)` | OTHER_SENSE; interval 1, due_day = today + 1 — **Check 2a** | [`0x13832209…46bbf3d5`](https://explorer-studio.genlayer.com/tx/0x138322098ed3f8ec53460fe06dba9f003f86c51c671a4e279eb734ba46bbf3d5) | **OTHER_SENSE**; interval **1**, due_day **20733** |
| 10 | B | `add_card("bank", "a business that keeps and lends money")` | card B2 (the money sense) | [`0x5c26efdf…de785010`](https://explorer-studio.genlayer.com/tx/0x5c26efdf61e1ade4d4c4b598a16402f1ba2473236c52cae84f3a98d5de785010) | SUCCESS; card B2, interval 1, due_day 20732 |
| 11 | B | `practice(B2, O3)` | RIGHT_SENSE; interval 2, due_day = today + 2 — **Check 2b** | [`0x17ec589b…205cf347`](https://explorer-studio.genlayer.com/tx/0x17ec589bd3826b2f7a643137368642ab18872dd0f4a1503a2cdedf06205cf347) | **RIGHT_SENSE**; interval **2**, due_day **20734**, rights 1 |
| 12 | — | `get_deck(A)` ; `get_deck(B)` | read: A — A2 (interval 1, today + 1) then A1 (interval 2, today + 2); B — B1 (interval 1, today + 1) then B2 (interval 2, today + 2) | — (read) | A: A2 (OTHER_SENSE, interval 1, due 20733) then A1 (RIGHT_SENSE, interval 2, due 20734); B: B1 (OTHER_SENSE, interval 1, due 20733) then B2 (RIGHT_SENSE, interval 2, due 20734); today 20732 |

Must-verify rows:

- **Clock check** — right after add_card, get_card(A1) shows due_day equal to today, a plausible UTC day number (row 1): **PASS**
- **Check 1** — R1 → RIGHT_SENSE (interval 2) and O1 → OTHER_SENSE (interval 1) on two cards with the same content (rows 3, 4): **PASS**
- **Check 2** — on a card declaring the money sense, R3 → OTHER_SENSE and O3 → RIGHT_SENSE (rows 9, 11): **PASS**
