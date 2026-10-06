// The Project's own deployment of the frozen WordSense source (a separate
// address from the Intelligent Contract submission). VITE_CONTRACT_ADDRESS
// overrides it, e.g. for a fork.
export const PROJECT_DEPLOYMENT = "0x139a515380ab68eA4c9ae5f9005D4Cd365888ED5";
export const CONTRACT_ADDRESS = (String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim() || PROJECT_DEPLOYMENT) as `0x${string}` | "";

// Same-origin proxy declared in BOTH vite.config.ts and vercel.json.
// Every read, every receipt poll and the write client use this one URL.
export const RPC_PATH = "/genlayer-rpc";

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";
// Only used when MetaMask must add the network (wallet_addEthereumChain needs an absolute URL).
export const WALLET_ADD_RPC = "https://studio.genlayer.com/api";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export const SOURCE_SHA256 = "a3c8003f4a6d9118d3c1580b6a31af649520b5e4a036259ef98b06f672608f76";

export const RECEIPT_TIMEOUT_MS = 150_000;
export const RECEIPT_POLL_MS = 3_000;
