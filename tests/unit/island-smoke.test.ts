// Temporary smoke test: SSR-render all three islands with real data.
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import TalentCalculator from '@components/calculator/TalentCalculator';
import CompareApp from '@features/compare/CompareApp';
import MyBuildsApp from '@features/builds/MyBuildsApp';
import { loadManifest, loadClassSnapshot } from '@data/loadSnapshot';

describe('island SSR smoke', () => {
  const manifest = loadManifest();

  it('renders TalentCalculator for all 9 classes', () => {
    for (const c of manifest.classes) {
      const snapshot = loadClassSnapshot(c.classId);
      const html = renderToString(
        createElement(TalentCalculator, { snapshot, manifest }),
      );
      expect(html).toContain('data-testid="points-remaining"');
      expect(html).toContain('data-testid="btn-share"');
      expect(html).toContain('data-testid="panel-detail"');
      expect(html).toContain(`tree-tab-${snapshot.trees[0].treeId}`);
    }
  });

  it('renders CompareApp', () => {
    const html = renderToString(createElement(CompareApp, { manifest }));
    expect(html).toContain('data-testid="compare-select-a"');
    expect(html).toContain('data-testid="btn-compare"');
  });

  it('renders MyBuildsApp', () => {
    const html = renderToString(createElement(MyBuildsApp, { manifest }));
    expect(html).toContain('Import a build');
  });
});
