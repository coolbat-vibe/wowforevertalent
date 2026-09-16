/**
 * Legacy perk planner: spend a character's Legacy points (16 at launch)
 * across the three account-wide trees. Local-only draft (localStorage),
 * no share link — Legacy builds are small enough to re-enter, and the
 * reference data itself is rendered statically on the page for crawlers.
 */
import { useEffect, useMemo, useState, type JSX } from 'react';
import type { LegacyData, LegacyPerk } from '@data/loadSnapshot';
import { IconImg } from '@components/calculator/IconImg';
import styles from './legacy.module.css';

const STORAGE_KEY = 'wftc:legacy-draft';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function loadDraft(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isInteger(v) && v > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export default function LegacyPlanner(props: {
  data: LegacyData;
}): JSX.Element {
  const { data } = props;
  const [ranks, setRanks] = useState<Record<string, number>>(loadDraft);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ranks));
    } catch {
      /* storage optional */
    }
  }, [ranks]);

  const allPerks = useMemo(
    () => data.trees.flatMap((t) => t.perks),
    [data],
  );

  const spent = allPerks.reduce((n, p) => n + (ranks[p.perkId] ?? 0), 0);
  const remaining = data.spendCapPerCharacter - spent;

  const add = (perk: LegacyPerk) => {
    setRanks((prev) => {
      const current = prev[perk.perkId] ?? 0;
      if (current >= perk.maxRank || spent >= data.spendCapPerCharacter) {
        return prev;
      }
      return { ...prev, [perk.perkId]: current + 1 };
    });
  };

  const remove = (perk: LegacyPerk) => {
    setRanks((prev) => {
      const current = prev[perk.perkId] ?? 0;
      if (current === 0) return prev;
      const next = { ...prev, [perk.perkId]: current - 1 };
      if (next[perk.perkId] === 0) delete next[perk.perkId];
      return next;
    });
  };

  const reset = () => setRanks({});

  return (
    <div className={styles.planner} data-testid="legacy-planner">
      <div className={styles.plannerBar}>
        <p className={styles.pointsLeft}>
          <span className={styles.pointsNum} data-testid="legacy-points-left">
            {remaining}
          </span>{' '}
          of {data.spendCapPerCharacter} Legacy points left
        </p>
        <p className={styles.earnableNote}>
          {data.earnableCapAtStart} points earnable at launch — extra points
          feed the Legacy Reward Track, not this spend cap.
        </p>
        <button
          type="button"
          className={styles.resetBtn}
          data-testid="legacy-reset"
          onClick={reset}
          aria-disabled={spent === 0 || undefined}
        >
          Reset
        </button>
      </div>

      <div className={styles.trees}>
        {data.trees.map((tree) => {
          const treeSpent = tree.perks.reduce(
            (n, p) => n + (ranks[p.perkId] ?? 0),
            0,
          );
          return (
            <section
              key={tree.treeId}
              className={styles.treeCard}
              aria-label={`${tree.name} Legacy tree`}
            >
              <header className={styles.treeHeader}>
                <IconImg
                  src={`/icons/legacy/${tree.iconRef}.jpg`}
                  className={styles.treeIcon}
                  fallback={
                    <span className={`${styles.treeIcon} ${styles.iconFallback}`}>
                      {initials(tree.name)}
                    </span>
                  }
                />
                <h3 className={styles.treeName}>{tree.name}</h3>
                <span className={styles.treePoints} aria-label={`${treeSpent} points in ${tree.name}`}>
                  {treeSpent}
                </span>
              </header>
              <ul className={styles.perkList}>
                {tree.perks.map((perk) => {
                  const rank = ranks[perk.perkId] ?? 0;
                  const maxed = rank >= perk.maxRank;
                  const state = maxed
                    ? styles.perkMaxed
                    : rank > 0
                      ? styles.perkPartial
                      : '';
                  return (
                    <li key={perk.perkId} className={`${styles.perk} ${state}`}>
                      <IconImg
                        src={`/icons/legacy/${perk.iconRef}.jpg`}
                        className={styles.perkIcon}
                        fallback={
                          <span className={`${styles.perkIcon} ${styles.iconFallback}`}>
                            {initials(perk.name)}
                          </span>
                        }
                      />
                      <div className={styles.perkBody}>
                        <span className={styles.perkName}>{perk.name}</span>
                        <span className={styles.perkText}>{perk.text}</span>
                      </div>
                      <div className={styles.perkControls}>
                        <button
                          type="button"
                          className={styles.stepBtn}
                          aria-label={`Remove a point from ${perk.name}`}
                          aria-disabled={rank === 0 || undefined}
                          onClick={() => remove(perk)}
                        >
                          −
                        </button>
                        <span
                          className={styles.perkRank}
                          aria-label={`${perk.name}: rank ${rank} of ${perk.maxRank}`}
                        >
                          {rank}/{perk.maxRank}
                        </span>
                        <button
                          type="button"
                          className={styles.stepBtn}
                          aria-label={`Add a point to ${perk.name}`}
                          aria-disabled={
                            (maxed || remaining === 0) || undefined
                          }
                          onClick={() => add(perk)}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className={styles.plannerNote}>
        Your Legacy plan is stored in this browser only. Ranks shown “as seen
        in the BlizzCon demo” — expect the beta client to change details.
      </p>
    </div>
  );
}
