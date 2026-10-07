import { randomInt } from "node:crypto";

// No 0/O/1/I/L — codes are read aloud and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Cryptographically random 6-char ride code (~887M combinations). */
export function generateRideCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
