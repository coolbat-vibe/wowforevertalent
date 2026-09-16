import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  decodeBuild,
  encodeBuild,
  payloadFromHash,
} from '../../src/domain/sharing/codec';
import { emptyBuild, validateBuild } from '../../src/domain/talents/rules';
import { loadManifest, loadRuleset, loadSnapshot } from '../helpers/snapshot';

const manifest = loadManifest();
const ruleset = loadRuleset();
const mage = loadSnapshot('mage');
const allowed = [manifest.snapshotId];

function sampleBuild() {
  const t1 = mage.talents.find((t) => t.row === 0)!;
  const t2 = mage.talents.find((t) => t.row === 0 && t.talentId !== t1.talentId)!;
  return {
    ...emptyBuild('mage', manifest.snapshotId, ruleset, 60),
    allocation: {
      [t1.talentId]: Math.min(3, t1.maxRank),
      [t2.talentId]: Math.min(2, t2.maxRank),
    },
  };
}

describe('share codec', () => {
  it('round-trips a build losslessly', () => {
    const build = sampleBuild();
    const encoded = encodeBuild(build);
    const decoded = decodeBuild(encoded, allowed, ruleset);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.build).toEqual(build);
      expect(validateBuild(decoded.build, mage, ruleset).valid).toBe(true);
    }
  });

  it('omits zero ranks from the payload', () => {
    const build = sampleBuild();
    build.allocation['mage:nonexistent-zero'] = 0;
    const encoded = encodeBuild(build);
    const decoded = decodeBuild(encoded, allowed, ruleset);
    expect(decoded.ok && decoded.build.allocation['mage:nonexistent-zero']).toBeUndefined();
  });

  it('is deterministic regardless of allocation key order', () => {
    const build = sampleBuild();
    const reversed = {
      ...build,
      allocation: Object.fromEntries(Object.entries(build.allocation).reverse()),
    };
    expect(encodeBuild(build)).toBe(encodeBuild(reversed));
  });

  it('rejects unknown snapshots without touching any state', () => {
    const encoded = encodeBuild(sampleBuild());
    const decoded = decodeBuild(encoded, ['snap-different'], ruleset);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error.code).toBe('UNSUPPORTED_VERSION');
  });

  it('rejects tampered payloads', () => {
    const encoded = encodeBuild(sampleBuild());
    const tampered = encoded.slice(0, -2) + (encoded.endsWith('AA') ? 'BB' : 'AA');
    const decoded = decodeBuild(tampered, allowed, ruleset);
    expect(decoded.ok).toBe(false);
  });

  it('rejects invalid characters and oversize payloads', () => {
    expect(decodeBuild('!!!not-base64!!!', allowed, ruleset).ok).toBe(false);
    expect(decodeBuild('A'.repeat(13 * 1024), allowed, ruleset).ok).toBe(false);
    expect(decodeBuild('', allowed, ruleset).ok).toBe(false);
  });

  it('rejects wrong schema versions and levels outside range', () => {
    const build = sampleBuild();
    const encoded = encodeBuild(build);
    const decoded = decodeBuild(encoded, allowed, ruleset);
    expect(decoded.ok).toBe(true);

    // Manually craft a version-2 payload.
    const json = JSON.stringify({ v: 2, s: manifest.snapshotId, r: build.rulesetId, c: 'mage', l: 60, b: 'standard', a: {} });
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = decodeBuild(b64, allowed, ruleset);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNSUPPORTED_VERSION');
  });

  it('builds and parses share URLs via the fragment', () => {
    const encoded = encodeBuild(sampleBuild());
    const url = buildShareUrl('https://wowforevertalent.app', 'mage', encoded);
    expect(url).toBe(
      `https://wowforevertalent.app/mage/#b=${encoded}`,
    );
    const hash = new URL(url).hash;
    expect(payloadFromHash(hash)).toBe(encoded);
    expect(payloadFromHash('#other=1')).toBeNull();
    expect(payloadFromHash('')).toBeNull();
  });
});
