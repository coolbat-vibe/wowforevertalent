/**
 * Local persistence for drafts and named builds (PRD §7.4).
 * All access is wrapped: when storage is unavailable or full, callers get
 * a typed failure and the calculator keeps working in memory.
 */
import type { Build, RuleError, StoredBuild } from '@domain/talents/types';

const DRAFT_PREFIX = 'wftc:draft:';
const BUILDS_KEY = 'wftc:builds';
export const MAX_NAMED_BUILDS = 50;
export const MAX_NAME_LENGTH = 80;
const MAX_STORED_BYTES = 64 * 1024;

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RuleError };

function storageError(message: string): StorageResult<never> {
  return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message } };
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__wftc_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return getStorage() !== null;
}

function draftKey(classId: string, snapshotId: string): string {
  return `${DRAFT_PREFIX}${classId}:${snapshotId}`;
}

function isValidBuildShape(value: unknown): value is Build {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  if (typeof b.classId !== 'string' || typeof b.snapshotId !== 'string') return false;
  if (typeof b.rulesetId !== 'string' || b.budgetProfile !== 'standard') return false;
  if (typeof b.level !== 'number' || !Number.isInteger(b.level)) return false;
  if (typeof b.schemaVersion !== 'number') return false;
  if (!b.allocation || typeof b.allocation !== 'object' || Array.isArray(b.allocation)) {
    return false;
  }
  for (const [k, v] of Object.entries(b.allocation as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length > 64) return false;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 99) return false;
  }
  return true;
}

export function saveDraft(build: Build): StorageResult<null> {
  const storage = getStorage();
  if (!storage) return storageError('local storage is not available on this device');
  try {
    storage.setItem(
      draftKey(build.classId, build.snapshotId),
      JSON.stringify(build),
    );
    return { ok: true, value: null };
  } catch {
    return storageError('could not save draft (quota exceeded)');
  }
}

export function loadDraft(classId: string, snapshotId: string): Build | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(draftKey(classId, snapshotId));
    if (!raw || raw.length > MAX_STORED_BYTES) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidBuildShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(classId: string, snapshotId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(draftKey(classId, snapshotId));
  } catch {
    /* ignore */
  }
}

function readBuilds(storage: Storage): StoredBuild[] {
  try {
    const raw = storage.getItem(BUILDS_KEY);
    if (!raw || raw.length > MAX_NAMED_BUILDS * MAX_STORED_BYTES) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredBuild =>
        isValidBuildShape(item) &&
        typeof (item as StoredBuild).id === 'string' &&
        typeof (item as StoredBuild).name === 'string' &&
        typeof (item as StoredBuild).createdAt === 'string' &&
        typeof (item as StoredBuild).updatedAt === 'string',
    );
  } catch {
    return [];
  }
}

export function listBuilds(): StoredBuild[] {
  const storage = getStorage();
  if (!storage) return [];
  return readBuilds(storage).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getBuild(id: string): StoredBuild | null {
  const storage = getStorage();
  if (!storage) return null;
  return readBuilds(storage).find((b) => b.id === id) ?? null;
}

export function saveNamedBuild(
  build: Build,
  name: string,
  existingId?: string,
): StorageResult<StoredBuild> {
  const storage = getStorage();
  if (!storage) return storageError('local storage is not available on this device');
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'build name is empty' } };
  }
  const builds = readBuilds(storage);
  const now = new Date().toISOString();
  const existing = existingId ? builds.find((b) => b.id === existingId) : undefined;
  if (!existing && builds.length >= MAX_NAMED_BUILDS) {
    return {
      ok: false,
      error: {
        code: 'STORAGE_UNAVAILABLE',
        message: `at most ${MAX_NAMED_BUILDS} named builds can be stored`,
      },
    };
  }
  const stored: StoredBuild = {
    ...build,
    id: existing?.id ?? crypto.randomUUID(),
    name: trimmed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const next = existing
    ? builds.map((b) => (b.id === existing.id ? stored : b))
    : [...builds, stored];
  try {
    storage.setItem(BUILDS_KEY, JSON.stringify(next));
    return { ok: true, value: stored };
  } catch {
    return storageError('could not save build (quota exceeded)');
  }
}

export function deleteBuild(id: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      BUILDS_KEY,
      JSON.stringify(readBuilds(storage).filter((b) => b.id !== id)),
    );
  } catch {
    /* ignore */
  }
}

export function renameBuild(id: string, name: string): StorageResult<null> {
  const storage = getStorage();
  if (!storage) return storageError('local storage is not available on this device');
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'build name is empty' } };
  }
  const builds = readBuilds(storage);
  const target = builds.find((b) => b.id === id);
  if (!target) {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'build not found' } };
  }
  try {
    storage.setItem(
      BUILDS_KEY,
      JSON.stringify(
        builds.map((b) =>
          b.id === id ? { ...b, name: trimmed, updatedAt: new Date().toISOString() } : b,
        ),
      ),
    );
    return { ok: true, value: null };
  } catch {
    return storageError('could not rename build (quota exceeded)');
  }
}

/** Export a stored build as portable JSON (no device identifiers). */
export function exportBuildJson(build: StoredBuild): string {
  const { classId, level, budgetProfile, schemaVersion, snapshotId, rulesetId, allocation, name } =
    build;
  return JSON.stringify(
    { classId, level, budgetProfile, schemaVersion, snapshotId, rulesetId, allocation, name },
    null,
    2,
  );
}

/** Parse an imported build JSON; validates shape and size. */
export function importBuildJson(text: string): StorageResult<Build & { name?: string }> {
  if (text.length > MAX_STORED_BYTES) {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'import file too large' } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'import is not valid JSON' } };
  }
  if (!isValidBuildShape(parsed)) {
    return { ok: false, error: { code: 'INVALID_PAYLOAD', message: 'import does not match the build schema' } };
  }
  const name = (parsed as unknown as Record<string, unknown>).name;
  return {
    ok: true,
    value: {
      ...parsed,
      name: typeof name === 'string' ? name.slice(0, MAX_NAME_LENGTH) : undefined,
    },
  };
}
