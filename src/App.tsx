import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { CONTRACT_ADDRESS, EXPLORER_BASE, SOURCE_SHA256 } from "./lib/config";
import { errorMessage } from "./lib/errors";
import { connectedWallet, getCard, getDeck, getLimits, requestWallet, sendWrite, waitForVerdict } from "./lib/genlayer";
import { cardIdOf, sentenceKey, short } from "./lib/ids";
import type { Limits } from "./lib/parse";
import { pyLen, pyStrip } from "./lib/pytext";
import {
  addBlock, dueLine, LADDER, MAX_SENSE_LENGTH, MAX_SENTENCE_LENGTH, MAX_TERM_LENGTH, nextInterval, practiceBlock, REVERTS, UI,
} from "./lib/rules";
import type { Attempt, Card, Deck, TxStatus } from "./lib/types";
import { addVerified, practiceVerified } from "./lib/verify";

type Verify = () => Promise<string | null>;
type View = "overview" | "deck" | "add" | "verify";

const IDLE: TxStatus = { phase: "idle", message: "" };
const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "deck", label: "Deck" },
  { id: "add", label: "Add a card" },
  { id: "verify", label: "Verification" },
];
const USED_KEY = "rightsense.used";
const LOG_KEY = "rightsense.log";
const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the contract still refuses a reused sentence */
  }
}

function deckFromUrl(): string {
  const d = (new URLSearchParams(window.location.search).get("deck") ?? "").trim();
  return WALLET_RE.test(d) ? d.toLowerCase() : "";
}

function setDeckInUrl(wallet: string) {
  const url = new URL(window.location.href);
  if (wallet) url.searchParams.set("deck", wallet);
  else url.searchParams.delete("deck");
  window.history.replaceState(null, "", url.toString());
}

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export default function App() {
  const urlDeck = deckFromUrl();
  const [view, setView] = useState<View>(urlDeck ? "deck" : "overview");
  const [me, setMe] = useState("");
  const [deckOwner, setDeckOwner] = useState(urlDeck);
  const [lookup, setLookup] = useState(urlDeck);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckState, setDeckState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [limits, setLimits] = useState<Limits | null>(null);

  const [used, setUsed] = useState<string[]>(() => readStore<string[]>(USED_KEY, []));
  const [log, setLog] = useState<Record<string, Attempt[]>>(() => readStore<Record<string, Attempt[]>>(LOG_KEY, {}));
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [term, setTerm] = useState("");
  const [sense, setSense] = useState("");
  const [taken, setTaken] = useState(false);
  const [myCount, setMyCount] = useState(0);

  const [status, setStatus] = useState<TxStatus>(IDLE);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const recheck = useRef<Verify | null>(null);

  // ---------- reads ----------
  const loadDeck = useCallback(async (wallet: string) => {
    if (!wallet) {
      setDeck(null);
      setDeckState("idle");
      return;
    }
    setDeckState("loading");
    try {
      const d = await getDeck(wallet);
      setDeck(d);
      setDeckState("ready");
    } catch {
      setDeckState("error");
    }
  }, []);

  useEffect(() => {
    connectedWallet().then((w) => {
      setMe(w);
      if (w && !deckFromUrl()) {
        setDeckOwner(w);
        setLookup(w);
      }
    }).catch(() => setMe(""));
    window.ethereum?.on?.("accountsChanged", (accounts: string[]) => {
      const w = (accounts?.[0] ?? "").toLowerCase();
      setMe(w);
      if (w) {
        setDeckOwner(w);
        setLookup(w);
      }
      recheck.current = null;
      setStatus(IDLE);
      setFresh(null);
    });
    getLimits().then(setLimits).catch(() => setLimits(null));
  }, []);

  useEffect(() => {
    setDeckInUrl(deckOwner);
    void loadDeck(deckOwner);
  }, [deckOwner, loadDeck]);

  useEffect(() => {
    if (!me) return setMyCount(0);
    getDeck(me).then((d) => setMyCount(d?.count ?? 0)).catch(() => setMyCount(0));
  }, [me, deck]);

  useEffect(() => writeStore(USED_KEY, used), [used]);
  useEffect(() => writeStore(LOG_KEY, log), [log]);

  // ---------- derived ----------
  const newId = me && pyLen(pyStrip(term)) > 0 && pyLen(pyStrip(sense)) > 0 ? cardIdOf(me, term, sense) : "";
  useEffect(() => {
    let live = true;
    setTaken(false);
    if (!newId) return;
    const t = setTimeout(() => {
      getCard(newId).then((c) => live && setTaken(!!c)).catch(() => undefined);
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [newId]);
  const addBytes = useMemo(() => calldataBytes("add_card", [term, sense]), [term, sense]);
  const addReason = addBlock({ me, term, sense, deckCount: myCount, exists: taken, bytes: addBytes });
  const mine = !!me && deckOwner === me.toLowerCase();
  const dueCount = deck ? deck.cards.filter((c) => c.due_now).length : 0;

  // ---------- writes ----------
  async function connect() {
    try {
      const w = await requestWallet();
      setMe(w);
      setDeckOwner(w);
      setLookup(w);
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e) });
    }
  }

  async function runWrite(action: string, method: string, args: unknown[], verify: Verify) {
    setBusy(true);
    recheck.current = null;
    try {
      setStatus({ phase: "signing", message: "Confirm the transaction in your wallet…", action });
      const hash = await sendWrite(me, method, args, 0n);
      setStatus({ phase: "submitted", message: "Submitted. Waiting for validators to accept it…", hash, action });
      const verdict = await waitForVerdict(hash);
      if (verdict.kind === "error") {
        setStatus({ phase: "error", message: verdict.reason, hash, action });
        return;
      }
      if (verdict.kind === "pending") {
        recheck.current = verify;
        setStatus({ phase: "delayed", message: "Submitted — confirmation delayed. Check again re-reads the accepted state; do not send it twice.", hash, action });
        return;
      }
      setStatus({ phase: "checking", message: "Executed. Reading the accepted state…", hash, action });
      const done = await verify();
      if (done) {
        setStatus({ phase: "success", message: done, hash, action });
      } else {
        recheck.current = verify;
        setStatus({ phase: "delayed", message: "Executed, but the accepted state does not show the change yet. Check again in a moment.", hash, action });
      }
    } catch (e) {
      setStatus({ phase: "error", message: errorMessage(e), action });
    } finally {
      setBusy(false);
    }
  }

  async function checkAgain() {
    const verify = recheck.current;
    if (!verify) return;
    setBusy(true);
    try {
      const done = await verify();
      if (done) {
        recheck.current = null;
        setStatus((s) => ({ ...s, phase: "success", message: done }));
      } else {
        setStatus((s) => ({ ...s, message: "The accepted state does not show the change yet. Try again shortly." }));
      }
    } catch (e) {
      setStatus((s) => ({ ...s, message: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  }

  async function onAdd() {
    if (addReason) return;
    const s = { id: cardIdOf(me, term, sense), me, term, sense };
    if (await getCard(s.id)) {
      setTaken(true);
      return;
    }
    await runWrite("Add card", "add_card", [pyStrip(term), pyStrip(sense)], async () => {
      const c = await getCard(s.id);
      if (!addVerified(c, s)) return null;
      setTerm("");
      setSense("");
      setFresh(s.id);
      setDeckOwner(me.toLowerCase());
      setLookup(me.toLowerCase());
      await loadDeck(me.toLowerCase());
      setView("deck");
      return `Card added: "${c!.term}" as "${c!.sense}". It is due today — practise it with a sentence of your own.`;
    });
  }

  async function onPractice(c0: Card) {
    const id = c0.card_id;
    const text = drafts[id] ?? "";
    const c = await getCard(id);
    if (!c) return;
    const key = sentenceKey(id, text);
    if (practiceBlock(c, me, text, used.includes(key), calldataBytes("practice", [id, text]))) return;
    await runWrite("Practice", "practice", [id, pyStrip(text)], async () => {
      const after = await getCard(id);
      const check = practiceVerified(c, after);
      if (!check.ok) return null;
      setUsed((u) => (u.includes(key) ? u : [...u, key]));
      setLog((l) => ({ ...l, [id]: [{ sentence: pyStrip(text), outcome: check.outcome, day: after!.today }, ...(l[id] ?? [])].slice(0, 20) }));
      setDrafts((d) => ({ ...d, [id]: "" }));
      setFresh(id);
      await loadDeck(deckOwner);
      if (check.outcome === "RIGHT_SENSE") {
        return `Validators read it as RIGHT_SENSE: "${after!.term}" carries the sense you declared. Interval ${days(after!.interval)} — back on day ${after!.due_day}.`;
      }
      return `Validators read it as OTHER_SENSE: here "${after!.term}" does not carry "${after!.sense}". The card comes back tomorrow (day ${after!.due_day}).`;
    });
  }

  function onLookup() {
    const w = lookup.trim();
    if (!WALLET_RE.test(w)) {
      setStatus({ phase: "error", message: "Enter a wallet address (0x followed by 40 hex characters).", action: "Deck" });
      return;
    }
    setDeckOwner(w.toLowerCase());
  }

  async function copyDeck() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus({ phase: "success", message: "Deck link copied. Anyone can read this deck; only its owner can practise it.", action: "Share" });
    } catch {
      setStatus({ phase: "error", message: "Could not copy; copy the address bar instead.", action: "Share" });
    }
  }

  // ---------- one flashcard (a render function, not a component: the sentence box keeps focus) ----------
  function renderCard(c: Card) {
    const id = c.card_id;
    const draft = drafts[id] ?? "";
    const bytes = calldataBytes("practice", [id, draft]);
    const reason = practiceBlock(c, me, draft, used.includes(sentenceKey(id, draft)), bytes);
    const quiet = reason === REVERTS.sentenceEmpty || (reason === REVERTS.noTerm && !draft);
    const attempts = log[id] ?? [];
    const tone = c.last_outcome === "RIGHT_SENSE" ? "right" : c.last_outcome === "OTHER_SENSE" ? "other" : "new";
    return (
      <article key={id} className={`flash tone-${tone} ${c.due_now ? "due" : ""} ${fresh === id ? "fresh" : ""}`}>
        <header className="flash-top">
          <span className={`due-pill ${c.due_now ? "now" : ""}`}>{dueLine(c)}</span>
          {c.last_outcome && <span className={`verdict v-${tone}`}>{c.last_outcome}</span>}
        </header>
        <h3 className="term">{c.term}</h3>
        <p className="sense"><span className="sense-label">Declared sense</span>{c.sense}</p>
        <div className="ladder" aria-label={`Interval ${c.interval} days`}>
          {LADDER.map((n) => (
            <span key={n} className={`rung ${n === c.interval ? "on" : n < c.interval ? "past" : ""}`}>{n}d</span>
          ))}
        </div>
        <dl className="stats">
          <div><dt>Interval</dt><dd>{days(c.interval)}</dd></div>
          <div><dt>Reviews</dt><dd>{c.reviews}</dd></div>
          <div><dt>Right sense</dt><dd>{c.rights}</dd></div>
        </dl>
        {mine && (
          <div className="practise">
            <label className="fine" htmlFor={`s-${id}`}>Practise: write a sentence that uses “{c.term}” in this sense</label>
            <textarea id={`s-${id}`} rows={2} value={draft} disabled={busy || !c.due_now}
              placeholder={c.due_now ? "Your own sentence…" : "Not due yet — come back on the due day."}
              onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))} />
            <div className="form-foot">
              <span className={`meter mono ${bytes > CALLDATA_LIMIT ? "over" : ""}`}>
                {pyLen(pyStrip(draft))} / {MAX_SENTENCE_LENGTH} · {bytes} / {CALLDATA_LIMIT} bytes
              </span>
              <span className="action">
                {reason && !quiet && <span className="reason">{reason}</span>}
                <button className="btn btn-primary" onClick={() => onPractice(c)} disabled={busy || !!reason}>Practise</button>
              </span>
            </div>
            <p className="fine">
              Right sense → back in {days(nextInterval(c, "RIGHT_SENSE"))} · Other sense → back tomorrow
            </p>
          </div>
        )}
        {!mine && (
          <div className="practise readonly">
            <button className="btn btn-ghost" disabled>Practise</button>
            <span className="reason">{me ? REVERTS.notOwner : UI.noWallet}</span>
          </div>
        )}
        {attempts.length > 0 && (
          <ol className="attempts">
            {attempts.map((a, i) => (
              <li key={i} className={a.outcome === "RIGHT_SENSE" ? "a-right" : "a-other"}>
                <span className="mono">{a.outcome === "RIGHT_SENSE" ? "RIGHT" : "OTHER"}</span>
                <span>{a.sentence}</span>
              </li>
            ))}
          </ol>
        )}
        <footer className="flash-foot mono">{short(id, 8, 6)}</footer>
      </article>
    );
  }

  // ---------- view ----------
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="badge"><img src="/logo-192.png" alt="" width={34} height={34} /></span>
          <div>
            <div className="brand-name">RightSense</div>
            <div className="brand-sub">SENSE-CHECKED FLASHCARDS</div>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} className={`tab ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>{n.label}</button>
          ))}
        </nav>
        {me ? (
          <div className="wallet mono" title={me}>◆ {short(me)}</div>
        ) : (
          <button className="btn btn-ghost" onClick={connect}>◆ Connect wallet</button>
        )}
      </header>

      <div className={`runtime runtime-${status.phase}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        <span className="runtime-tag">{status.phase === "idle" ? "STUDIONET" : (status.action ?? "STATUS").toUpperCase()}</span>
        <span className="runtime-msg">
          {status.phase === "idle" ? <>Contract <a className="mono" href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS, 6, 4)}</a> on GenLayer StudioNet · chain 61999</> : status.message}
        </span>
        {status.hash && <a className="mono runtime-link" href={`${EXPLORER_BASE}/tx/${status.hash}`} target="_blank" rel="noreferrer">tx {short(status.hash, 10, 8)}</a>}
        {status.phase === "delayed" && recheck.current && <button className="btn btn-ghost small" onClick={checkAgain} disabled={busy}>Check again</button>}
      </div>

      <main className="main">
        {view === "overview" && (
          <>
            <section className="hero">
              <div className="hero-left">
                <p className="eyebrow">SPACED REPETITION · AI-READ · GENLAYER</p>
                <h1>Flashcards that know which bank you mean.</h1>
                <p className="lede">
                  Declare the one sense of a word you are learning, then practise it in your own sentences. GenLayer
                  validators read each sentence once: if the word carries your sense, the card waits twice as long; if it
                  carries another, it comes back tomorrow.
                </p>
                <div className="cta">
                  <button className="btn btn-primary big" onClick={() => setView("add")}>Add a card →</button>
                  <button className="btn btn-ghost big" onClick={() => setView("deck")}>Open my deck</button>
                </div>
              </div>
              <div className="hero-right">
                {[
                  ["01", "Declare the sense", "One term, one sense: “bank” as the land along a river — or as a business that keeps money."],
                  ["02", "Write, don't pick", "Practise a due card with a sentence of your own. A sentence without the whole word is refused before any model runs."],
                  ["03", "Meaning sets the schedule", "RIGHT_SENSE doubles the gap (2, 4, 8 … 32 days). OTHER_SENSE brings the card back tomorrow."],
                ].map(([n, t, d], i) => (
                  <div className={`step ${i === 0 ? "lit" : ""}`} key={n}>
                    <span className="step-n mono">{n}</span>
                    <div><p className="step-t">{t}</p><p className="step-d">{d}</p></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="features">
              <div className="feature">
                <span className="f-icon" aria-hidden="true">◇</span>
                <h2>Same frame, opposite outcome</h2>
                <p>“After the flood, the bank was covered in broken branches.” is right for the river sense and wrong for the money sense — and the reverse holds for “After the crash…”.</p>
              </div>
              <div className="feature">
                <span className="f-icon" aria-hidden="true">✦</span>
                <h2>One reading per sentence</h2>
                <p>Each sentence can be used once per card, whatever its case or spacing. Unclear readings count as OTHER_SENSE, so a card never skips ahead on a guess.</p>
              </div>
              <div className="feature">
                <span className="f-icon" aria-hidden="true">↗</span>
                <h2>Days from the chain</h2>
                <p>Due days are UTC days taken from each transaction's time. A card that is not due cannot be practised; only its owner can practise it. No money is held.</p>
              </div>
            </section>
          </>
        )}

        {view === "deck" && (
          <>
            <section className="panel head">
              <div>
                <p className="eyebrow">DECK</p>
                <h1>{mine ? "Your deck" : deckOwner ? `Deck of ${short(deckOwner)}` : "A deck"}</h1>
                <p className="muted">
                  {deck ? `${deck.count} card${deck.count === 1 ? "" : "s"} · ${dueCount} due today · today is day ${deck.today}` : "Sorted by due day, the next review first."}
                </p>
              </div>
              <div className="row">
                <input className="mono" aria-label="Wallet" placeholder="0x… wallet" value={lookup} onChange={(e) => setLookup(e.target.value)} spellCheck={false} />
                <button className="btn btn-ghost" onClick={onLookup}>Open</button>
                {me && !mine && <button className="btn btn-ghost" onClick={() => { setDeckOwner(me.toLowerCase()); setLookup(me.toLowerCase()); }}>Mine</button>}
                <button className="btn btn-ghost" onClick={copyDeck} disabled={!deckOwner}>Copy deck link</button>
              </div>
            </section>
            {!deckOwner && <section className="panel empty"><p className="muted">{UI.noWallet}, or open any wallet's deck.</p></section>}
            {deckState === "loading" && <section className="panel empty"><p className="muted mono">Reading the deck…</p></section>}
            {deckState === "error" && <section className="panel empty"><p className="reason">Could not read this deck. Try again.</p></section>}
            {deckState === "ready" && deck && deck.count === 0 && (
              <section className="panel empty">
                <p className="muted">No cards yet.</p>
                {mine && <button className="btn btn-primary" onClick={() => setView("add")}>Add a card →</button>}
              </section>
            )}
            <div className="grid">{deck?.cards.map((c) => renderCard(c))}</div>
          </>
        )}

        {view === "add" && (
          <section className="panel form">
            <p className="eyebrow">ADD A CARD</p>
            <h1>One term, one sense</h1>
            <p className="muted">Write the sense in your own words. The same term with another sense is another card.</p>
            <label htmlFor="term">Term</label>
            <input id="term" placeholder="bank" value={term} onChange={(e) => setTerm(e.target.value)} spellCheck={false} />
            <span className="fine">{pyLen(pyStrip(term))} / {MAX_TERM_LENGTH} characters</span>
            <label htmlFor="sense">Sense you are learning</label>
            <textarea id="sense" rows={2} placeholder="the land along the side of a river" value={sense} onChange={(e) => setSense(e.target.value)} />
            <span className="fine">{pyLen(pyStrip(sense))} / {MAX_SENSE_LENGTH} characters</span>
            <div className="form-foot">
              <span className={`meter mono ${addBytes > CALLDATA_LIMIT ? "over" : ""}`}>{addBytes} / {CALLDATA_LIMIT} bytes · {myCount} / {limits?.max_cards_per_owner ?? 50} cards</span>
              <span className="action">
                {(term || sense) && addReason && addReason !== REVERTS.senseEmpty && <span className="reason">{addReason}</span>}
                <button className="btn btn-primary" onClick={onAdd} disabled={busy || !!addReason}>Add card</button>
              </span>
            </div>
            {newId && <p className="fine mono">Card id: {newId}</p>}
          </section>
        )}

        {view === "verify" && (
          <section className="panel form">
            <p className="eyebrow">VERIFICATION</p>
            <h1>What you are talking to</h1>
            <dl className="facts">
              <div><dt>Contract</dt><dd className="mono"><a href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a></dd></div>
              <div><dt>Source SHA-256</dt><dd className="mono">{SOURCE_SHA256}</dd></div>
              <div><dt>Contract name · version</dt><dd className="mono">{limits ? `${limits.contract_name ?? "?"} · ${limits.version ?? "?"}` : "reading…"}</dd></div>
              <div><dt>Rubric hash (from get_limits)</dt><dd className="mono">{limits?.rubric_hash ?? "reading…"}</dd></div>
              <div><dt>Longest interval · cards per deck</dt><dd className="mono">{limits ? `${limits.max_interval_days} days · ${limits.max_cards_per_owner}` : "reading…"}</dd></div>
            </dl>
            <p className="muted">
              Every revert the app can predict disables the button and shows the contract's own sentence — including the
              whole-word check, run here exactly as the contract runs it. Whether a sentence carries the declared sense is
              decided only by validators inside practice(); the app reads the outcome back from the contract. No money is held.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
