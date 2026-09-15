/**
 * Share protocol codec (PRD §12.3).
 *
 * Payload: schemaVersion + snapshotId + rulesetId + classId + level +
 * budgetProfile + non-zero allocation, serialized as stable-sorted UTF-8
 * JSON and Base64URL-encoded. Carried in the URL fragment (#b=...).
 * Base64URL is an encoding, not encryption; payloads never include names
 * or other private fields.
 */
import {
  SHARE_MAX_DECODED_BYTES,
  SHARE_MAX_ENCODED_BYTES,
  SHARE_SCHEMA_VERSION,
  type Allocation,
  type Build,
  type DecodeResult,
  type RuleError,
  type Ruleset,
  type SharePayloadV1,
} from '../talents/types';

const MAX_ALLOCATION_KEYS = 200;
const MAX_KEY_LENGTH = 64;
const MAX_STRING_LENGTH = 128;
const KEY_PATTERN = /^[a-z0-9:-]+$/;
const B64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(payload: string): string {
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function encodeBuild(build: Build): string {
  const allocation: Allocation = {};
  for (const [id, rank] of Object.entries(build.allocation)) {
    if (Number.isInteger(rank) && rank > 0) allocation[id] = rank;
  }
  const payload: SharePayloadV1 = {
    v: SHARE_SCHEMA_VERSION,
    s: build.snapshotId,
    r: build.rulesetId,
    c: build.classId,
    l: build.level,
    b: build.budgetProfile,
    a: allocation,
  };
  const encoded = toBase64Url(stableStringify(payload));
  if (encoded.length > SHARE_MAX_ENCODED_BYTES) {
    throw new Error(`encoded payload exceeds ${SHARE_MAX_ENCODED_BYTES} bytes`);
  }
  return encoded;
}

function decodeErr(code: RuleError['code'], message: string): DecodeResult {
  return { ok: false, error: { code, message } };
}

/**
 * Decode and structurally validate a payload. Does not fetch anything;
 * snapshotId must resolve against the caller-provided allow list.
 * Legality of the allocation itself is checked separately via validateBuild.
 */
export function decodeBuild(
  payload: string,
  allowedSnapshotIds: readonly string[],
  ruleset: Ruleset,
): DecodeResult {
  if (typeof payload !== 'string' || payload.length === 0) {
    return decodeErr('INVALID_PAYLOAD', 'empty payload');
  }
  if (payload.length > SHARE_MAX_ENCODED_BYTES) {
    return decodeErr('INVALID_PAYLOAD', 'payload too large');
  }
  if (!B64URL_PATTERN.test(payload)) {
    return decodeErr('INVALID_PAYLOAD', 'payload contains invalid characters');
  }

  let text: string;
  try {
    text = fromBase64Url(payload);
  } catch {
    return decodeErr('INVALID_PAYLOAD', 'payload is not valid Base64URL');
  }
  if (text.length > SHARE_MAX_DECODED_BYTES) {
    return decodeErr('INVALID_PAYLOAD', 'decoded payload too large');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return decodeErr('INVALID_PAYLOAD', 'payload is not valid JSON');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return decodeErr('INVALID_PAYLOAD', 'payload is not an object');
  }
  const p = raw as Record<string, unknown>;

  if (p.v !== SHARE_SCHEMA_VERSION) {
    return decodeErr('UNSUPPORTED_VERSION', `unsupported schema version ${String(p.v)}`);
  }
  for (const key of ['s', 'r', 'c', 'b'] as const) {
    if (
      typeof p[key] !== 'string' ||
      (p[key] as string).length === 0 ||
      (p[key] as string).length > MAX_STRING_LENGTH
    ) {
      return decodeErr('INVALID_PAYLOAD', `field ${key} missing or invalid`);
    }
  }
  if (!allowedSnapshotIds.includes(p.s as string)) {
    return decodeErr('UNSUPPORTED_VERSION', `unknown snapshot ${String(p.s)}`);
  }
  if (p.b !== 'standard') {
    return decodeErr('UNSUPPORTED_VERSION', `unsupported budget profile ${String(p.b)}`);
  }
  if (
    typeof p.l !== 'number' ||
    !Number.isInteger(p.l) ||
    p.l < ruleset.minLevel ||
    p.l > ruleset.maxLevel
  ) {
    return decodeErr(
      'INVALID_PAYLOAD',
      `level must be an integer ${ruleset.minLevel}–${ruleset.maxLevel}`,
    );
  }
  if (!p.a || typeof p.a !== 'object' || Array.isArray(p.a)) {
    return decodeErr('INVALID_PAYLOAD', 'allocation missing or invalid');
  }
  const entries = Object.entries(p.a as Record<string, unknown>);
  if (entries.length > MAX_ALLOCATION_KEYS) {
    return decodeErr('INVALID_PAYLOAD', 'too many allocation entries');
  }
  const allocation: Allocation = {};
  for (const [key, value] of entries) {
    if (key.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(key)) {
      return decodeErr('INVALID_PAYLOAD', `invalid talent key ${key.slice(0, 32)}`);
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
      return decodeErr('INVALID_PAYLOAD', `invalid rank for ${key.slice(0, 32)}`);
    }
    if (value > 0) allocation[key] = value;
  }

  return {
    ok: true,
    build: {
      classId: p.c as string,
      level: p.l as number,
      budgetProfile: 'standard',
      schemaVersion: SHARE_SCHEMA_VERSION,
      snapshotId: p.s as string,
      rulesetId: p.r as string,
      allocation,
    },
  };
}

/** Build the full share URL for a class page. */
export function buildShareUrl(origin: string, classId: string, payload: string): string {
  return `${origin}/talent-calculator/${classId}/#b=${payload}`;
}

/** Extract the payload from a location hash like "#b=...". */
export function payloadFromHash(hash: string): string | null {
  const match = /^#b=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? match[1] : null;
}
