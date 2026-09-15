import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ClassSnapshot, DatasetManifest, Ruleset } from '../../src/domain/talents/types';

const root = path.resolve(__dirname, '../..');

export function loadManifest(): DatasetManifest & { ruleset: Ruleset } {
  return JSON.parse(readFileSync(path.join(root, 'public/data/manifest.json'), 'utf8'));
}

export function loadSnapshot(classId: string): ClassSnapshot {
  const manifest = loadManifest();
  const file = manifest.classes.find((c) => c.classId === classId);
  if (!file) throw new Error(`class not in manifest: ${classId}`);
  return JSON.parse(readFileSync(path.join(root, 'public', file.path), 'utf8'));
}

export function loadRuleset(): Ruleset {
  return loadManifest().ruleset;
}

/** Deterministic PRNG (mulberry32) for property tests. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
