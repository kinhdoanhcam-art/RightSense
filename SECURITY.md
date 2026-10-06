# SECURITY

## No money

The contract holds no GEN and moves none. Every write sends value 0.

## Where the central rule lives

Whether the term carries the declared sense is decided only by validators inside `practice`. What follows is
deterministic in the contract: RIGHT_SENSE doubles the interval up to 32 days, OTHER_SENSE sets it to 1, and the next
due day is the day of the practice plus the interval. The app never decides the outcome: it reads `last_outcome`,
`interval` and `due_day` back from `get_card` and reports a practice only when the change matches the schedule (checked
by `tests/js/verify.test.ts`).

## Fail-safe

Unusable or unclear output reads OTHER_SENSE: the card comes back tomorrow; it never skips ahead on a guess.

## Before the model

The whole-word term check, the owner check and the due check run before any model call, so a sentence without the term,
another wallet, or a card that is not due never reaches validators. The app runs the same term check (code points,
Python letter rules) and disables *Practise* with the contract's sentence.

## Prompt fence

The term, the sense and the sentence sit inside their own `<UNTRUSTED_…>` tags. The six tags and both labels are refused
in any letter case on input and stripped to a fixed point inside the prompt. The model sees no wallet, interval, due day
or review count.

## Grinding

Each sentence is accepted once per card (case and spacing do not make a new one), and a card can be practised only when
due, so a learner cannot resend a sentence until a reading suits them. The app remembers the sentences sent from this
browser to disable a repeat early; the contract refuses it anyway.

## Frontend

- No MetaMask Snap: the app switches the network with `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
- One same-origin RPC proxy (`/genlayer-rpc`, in `vite.config.ts` and `vercel.json`) for reads, receipts and writes.
- A write is reported only after the leader receipt says SUCCESS **and** consensus has reached ACCEPTED, and only after
  the reloaded state shows the change; otherwise "confirmation delayed" with a Check again button that re-reads state.
- Contract text is rendered as React text; no raw HTML. Local storage holds the sentences this browser sent and their
  outcomes — nothing else.

## Remaining limits

See "Honest limitation" in the README.
