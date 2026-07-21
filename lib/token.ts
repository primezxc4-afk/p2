// lib/token.ts  ← single source of truth, change here to rotate
import crypto from "crypto";
import { SALT } from "./salt";
// 🔁 Rotate these constants every few weeks

const FIELD_MAP = {
  id: "a7d9f2c14b8e63e591f4",
  fToken: "d3b84a71e5c9f2618af43d7b",
  ts: "91c7a54ef23bd6a18f4e",
  token: "f4b91d87c2e6a53b1f8d4c79",
  title: "6d8c1af74b3e952f0a41",
  year: "cb52e81f74d93a6b15ef",
  season: "18fa7c3e9d41b652af80c73d",
  episode: "e73b4c91af2856d1c0f94e8a",
  imdbId: "42d9fe81b7c36a5ef190d4bc",
} as const;

export { FIELD_MAP };

export function generateFrontendToken(id: string) {
  const rt = Date.now();
  // 🔁 Rotate: swap order, add SALT, change hash algo to sha512 truncated
  const xt = crypto
    .createHash("sha512")
    .update(`${rt}:${SALT}:${id}`) // was: `${id}:${ts}`
    .digest("hex")
    .slice(0, 64); // truncate to 64 chars

  return { xt, rt }; // was: { f_token, f_ts }
}
