import { AppError } from "../types.js";

const invalid = (msg: string) => new AppError("invalid_input", 400, msg);

export const COMMUNITY_LIMITS = {
  nameMin: 2,
  nameMax: 60,
  descriptionMax: 200,
  riderNameMax: 40,
  textMax: 1000,
  audioMaxBytes: 2_000_000, // ~2 MB (60 s of Opus is ~250 KB; this leaves headroom for AAC/mp4)
  audioMinMs: 700,
  audioMaxMs: 60_000,
  pageSize: 50,
} as const;

/** Strip control chars (keeps \n), collapse runs of spaces. */
function cleanLine(v: string): string {
  return v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim();
}

export function cleanCommunityName(v: unknown): string {
  if (typeof v !== "string") throw invalid("Community name is required.");
  const t = cleanLine(v.replace(/\n/g, " "));
  if (t.length < COMMUNITY_LIMITS.nameMin || t.length > COMMUNITY_LIMITS.nameMax)
    throw invalid(`Community name must be ${COMMUNITY_LIMITS.nameMin}–${COMMUNITY_LIMITS.nameMax} characters.`);
  return t;
}

export function cleanDescription(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v !== "string") throw invalid("Description must be text.");
  const t = cleanLine(v.replace(/\n/g, " "));
  if (t.length > COMMUNITY_LIMITS.descriptionMax) throw invalid(`Description can be at most ${COMMUNITY_LIMITS.descriptionMax} characters.`);
  return t;
}

export function cleanMemberName(v: unknown): string {
  if (typeof v !== "string") throw invalid("Rider name is required.");
  const t = cleanLine(v.replace(/\n/g, " "));
  if (t.length < 1 || t.length > COMMUNITY_LIMITS.riderNameMax) throw invalid(`Rider name must be 1–${COMMUNITY_LIMITS.riderNameMax} characters.`);
  return t;
}

/** Message text: no empty/whitespace-only messages, bounded length, max 2 consecutive blank lines. */
export function cleanMessageText(v: unknown): string {
  if (typeof v !== "string") throw invalid("Message text is required.");
  const t = v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length === 0) throw invalid("Message can't be empty.");
  if (t.length > COMMUNITY_LIMITS.textMax) throw invalid(`Message is too long (max ${COMMUNITY_LIMITS.textMax} characters).`);
  return t;
}

const CODE_RE = /^MN[A-Z0-9]{3,14}$/;
export function parseCommunityCode(raw: unknown): string {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!CODE_RE.test(code)) throw new AppError("invalid_input", 400, "That community code doesn't look valid.");
  return code;
}

/** Normalise "audio/webm;codecs=opus" -> "audio/webm". Returns null when not an allowed audio type. */
const ALLOWED_AUDIO = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/x-m4a"]);
export function baseAudioMime(contentType: string | undefined): string | null {
  const base = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return ALLOWED_AUDIO.has(base) ? base : null;
}

/** Magic-byte sniff so a client can't upload arbitrary files labelled as audio. */
export function looksLikeAudio(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const ascii = (a: number, b: number) => buf.toString("latin1", a, b);
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true; // WebM / Matroska (EBML)
  if (ascii(0, 4) === "OggS") return true; // Ogg
  if (ascii(4, 8) === "ftyp") return true; // MP4 / M4A
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return true; // WAV
  if (ascii(0, 3) === "ID3") return true; // MP3 with tag
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true; // MPEG audio frame / ADTS
  return false;
}

const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/aac": "aac",
};
export const extForMime = (mime: string) => EXT[mime] ?? "bin";
