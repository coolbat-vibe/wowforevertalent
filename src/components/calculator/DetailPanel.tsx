/**
 * Talent detail panel. One instance serves both layouts: CSS places it as a
 * sticky sidebar on wide screens and as a collapsible bottom sheet on mobile.
 * Unknown rank effects are stated explicitly and never fabricated.
 */
import { useState } from 'react';
import type {
  Build,
  ClassSnapshot,
  NodeAvailability,
  TalentNode,
} from '@domain/talents/types';
import { earlierRowPoints } from '@domain/talents/rules';
import type { SiteManifest } from '@data/loadSnapshot';
import { UNKNOWN_RANK_TEXT, evidenceLabel, initials } from './messages';
import { IconImg } from './IconImg';
import styles from './calculator.module.css';

export interface DetailPanelProps {
  node: TalentNode | null;
  build: Build;
  snapshot: ClassSnapshot;
  manifest: SiteManifest;
  availability: NodeAvailability | null;
  readOnly: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function DetailPanel(props: DetailPanelProps) {
  const { node, build, snapshot, manifest, availability, readOnly, onAdd, onRemove, onClose } =
    props;
  const [expanded, setExpanded] = useState(true);

  const tree = node ? snapshot.trees.find((t) => t.treeId === node.treeId) : undefined;
  const rank = node ? (build.allocation[node.talentId] ?? 0) : 0;

  const body = node ? (
    <div className={styles.detailBody}>
      <div className={styles.pointRow}>
        <button
          type="button"
          className={styles.pointButton}
          data-testid="btn-remove-point"
          aria-disabled={readOnly || !availability?.canRemove || undefined}
          aria-label={`Remove one point from ${node.name}`}
          onClick={() => {
            if (!readOnly && availability?.canRemove) onRemove(node.talentId);
          }}
        >
          −
        </button>
        <span className={styles.pointValue} aria-label={`Rank ${rank} of ${node.maxRank}`}>
          {rank} / {node.maxRank}
        </span>
        <button
          type="button"
          className={styles.pointButton}
          data-testid="btn-add-point"
          aria-disabled={readOnly || !availability?.canAdd || undefined}
          aria-label={`Add one point to ${node.name}`}
          onClick={() => {
            if (!readOnly && availability?.canAdd) onAdd(node.talentId);
          }}
        >
          +
        </button>
      </div>

      <p className={styles.detailMeta}>
        {node.passive ? 'Passive' : 'Active'}
        {node.cost ? ` · ${node.cost}` : ''}
        {tree?.nameZh ? ` · ${tree.nameZh}` : ''}
      </p>

      {rank > 0 ? (
        <section className={styles.effectBlock}>
          <h3>Current rank {rank}</h3>
          <p>{node.rankEffects.find((r) => r.rank === rank)?.text ?? UNKNOWN_RANK_TEXT}</p>
          <p className={styles.sourceLine}>
            Source: {evidenceLabel(node.rankEffects.find((r) => r.rank === rank)?.evidenceStatus)}
          </p>
        </section>
      ) : null}

      {rank < node.maxRank ? (
        <section className={styles.effectBlock}>
          <h3>Next rank {rank + 1}</h3>
          <p>{node.rankEffects.find((r) => r.rank === rank + 1)?.text ?? UNKNOWN_RANK_TEXT}</p>
          <p className={styles.sourceLine}>
            Source:{' '}
            {evidenceLabel(node.rankEffects.find((r) => r.rank === rank + 1)?.evidenceStatus)}
          </p>
        </section>
      ) : null}

      <section className={styles.effectBlock}>
        <h3>Requirements</h3>
        <ul className={styles.condList}>
          {node.requiredEarlierPoints > 0 ? (
            <li>
              Requires {node.requiredEarlierPoints} points in earlier rows of {tree?.name} —
              currently {earlierRowPoints(build.allocation, snapshot, node.treeId, node.row)}
              {earlierRowPoints(build.allocation, snapshot, node.treeId, node.row) >=
              node.requiredEarlierPoints
                ? ' (met)'
                : ' (not met)'}
            </li>
          ) : null}
          {node.prerequisites.map((pre) => {
            const target = snapshot.talents.find((t) => t.talentId === pre.talentId);
            const have = build.allocation[pre.talentId] ?? 0;
            return (
              <li key={pre.talentId}>
                Requires {target?.name ?? pre.talentId} rank {pre.requiredRank} — currently {have}
                {have >= pre.requiredRank ? ' (met)' : ' (not met)'}
              </li>
            );
          })}
          {node.requirementText ? <li>{node.requirementText}</li> : null}
          {availability && !availability.canAdd && availability.addReason === 'budget_exceeded' ? (
            <li>No points remaining at level {build.level}.</li>
          ) : null}
          {availability &&
          !availability.canRemove &&
          availability.removeReason === 'dependents' ? (
            <li>
              Points here are required by:{' '}
              {availability.blockingDependents
                .map((id) => snapshot.talents.find((t) => t.talentId === id)?.name ?? id)
                .join(', ')}
              .
            </li>
          ) : null}
          {node.requiredEarlierPoints === 0 &&
          node.prerequisites.length === 0 &&
          !node.requirementText ? (
            <li>No requirements.</li>
          ) : null}
        </ul>
      </section>

      {node.classic ? (
        <section className={styles.effectBlock}>
          <h3>Classic reference</h3>
          <p>
            Status: {node.classic.status}
            {node.classic.tree ? ` · was in ${node.classic.tree}` : ''}
            {node.classic.maxRank !== null ? ` · max rank ${node.classic.maxRank}` : ''}
          </p>
          {node.classic.text ? <p>{node.classic.text}</p> : null}
          <p className={styles.sourceLine}>
            Source: {evidenceLabel(node.classic.evidenceStatus)} (reference, not verified by this
            site)
          </p>
        </section>
      ) : null}

      {node.note ? <p className={styles.noteLine}>{node.note}</p> : null}

      <p className={styles.sourceLine}>Data updated: {manifest.publishedAt}</p>
    </div>
  ) : (
    <div className={styles.detailBody}>
      <p className={styles.detailHint}>
        Select a talent to view its ranks, requirements, and data source.
      </p>
    </div>
  );

  return (
    <aside className={styles.detail} data-testid="panel-detail" aria-label="Talent details">
      <div className={styles.detailHeader}>
        {node ? (
          <IconImg
            src={`/icons/talents/${node.iconRef}.jpg`}
            className={styles.detailIcon}
            fallback={
              <span className={styles.detailIconFallback} aria-hidden="true">
                {initials(node.name)}
              </span>
            }
          />
        ) : null}
        <div className={styles.detailHeading}>
          <h2 className={styles.detailTitle}>{node ? node.name : 'Talent details'}</h2>
          {node ? (
            <p className={styles.detailSubline}>
              {tree?.name ?? ''} · Rank {rank}/{node.maxRank}
            </p>
          ) : null}
        </div>
        <div className={styles.detailHeaderButtons}>
          {node ? (
            <button
              type="button"
              className={styles.smallButton}
              onClick={onClose}
              aria-label="Close details"
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            className={styles.smallButton}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse detail panel' : 'Expand detail panel'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▾' : '▴'}
          </button>
        </div>
      </div>
      {expanded ? body : null}
    </aside>
  );
}
