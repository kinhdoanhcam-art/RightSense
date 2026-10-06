// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const ID = "f".repeat(64);
export const WALLET = "0x" + "1".repeat(40);

// Every practice sentence of the test cases (each pair shares its frame).
export const CASES = {
  R1: "We sat on the bank and watched the boats drift past.",
  R2: "The heron stood very still on the muddy bank.",
  R3: "After the flood, the bank was covered in broken branches.",
  R4: "She tied the canoe to a willow on the far bank.",
  R5: "Kids slid down the grassy bank into the shallow water.",
  O1: "We sat in the bank and watched the clerks count notes.",
  O2: "The heron logo stood out on the bank's new card.",
  O3: "After the crash, the bank was covered in angry headlines.",
  O4: "She tied her savings to a fund at the bank on Main Street.",
  O5: "Kids saved coins in a plastic bank shaped like a pig.",
};

/** HARD BLOCK: any of these over 255 bytes stops the release. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({ name: `practice ${name}`, method: "practice", args: [ID, text] }));
  rows.push({ name: "practice (140-character sentence, the contract cap)", method: "practice", args: [ID, "s".repeat(140)] });
  rows.push({ name: "add_card (30-character term + 100-character sense, both caps)", method: "add_card", args: ["t".repeat(30), "s".repeat(100)] });
  rows.push({ name: "add_card (bank, river sense)", method: "add_card", args: ["bank", "the land along the side of a river"] });
  return rows;
}

/** MEASURE ONLY: non-ASCII text takes more bytes per character. */
export function measureOnlyRows() {
  return [{ name: "practice with a 140-character sentence of 2-byte letters", method: "practice", args: [ID, "é".repeat(140)] }];
}
