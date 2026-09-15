/**
 * One talent tree: header (name, spent points, per-tree reset) plus the
 * 7x4 CSS grid of focusable node buttons. Node placement uses generated
 * row/column classes (r0..r6, c0..c3) instead of inline styles.
 */
import { memo, useCallback } from 'react';
import type {
  Build,
  NodeAvailability,
  TalentNode,
  TalentTree,
} from '@domain/talents/types';
import { initials } from './messages';
import styles from './calculator.module.css';

export interface TreePanelProps {
  tree: TalentTree;
  nodes: TalentNode[];
  build: Build;
  availability: Map<string, NodeAvailability>;
  selectedId: string | null;
  readOnly: boolean;
  isMobile: boolean;
  activeOnMobile: boolean;
  points: number;
  onSelect: (id: string | null) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onResetTree: (treeId: string) => void;
  nodeRefs: { current: Map<string, HTMLButtonElement> };
}

type NodeVisualState = 'available' | 'partial' | 'maxed' | 'locked' | 'nobudget';

function nodeVisualState(
  node: TalentNode,
  rank: number,
  avail: NodeAvailability,
): NodeVisualState {
  if (rank >= node.maxRank) return 'maxed';
  if (rank > 0) return 'partial';
  if (avail.canAdd) return 'available';
  if (avail.addReason === 'budget_exceeded') return 'nobudget';
  return 'locked';
}

const STATE_ARIA: Record<NodeVisualState, string> = {
  available: 'available to learn',
  partial: 'partially learned',
  maxed: 'at maximum rank',
  locked: 'locked by requirements',
  nobudget: 'locked, no points remaining at this level',
};

function hasUnknownEffect(node: TalentNode, rank: number): boolean {
  if (rank > 0) {
    const cur = node.rankEffects.find((r) => r.rank === rank);
    if (!cur || cur.text === null) return true;
  }
  if (rank < node.maxRank) {
    const next = node.rankEffects.find((r) => r.rank === rank + 1);
    if (!next || next.text === null) return true;
  }
  return false;
}

export const TreePanel = memo(function TreePanel(props: TreePanelProps) {
  const {
    tree,
    nodes,
    build,
    availability,
    selectedId,
    readOnly,
    isMobile,
    activeOnMobile,
    points,
    onSelect,
    onAdd,
    onRemove,
    onResetTree,
    nodeRefs,
  } = props;

  const moveFocus = useCallback(
    (node: TalentNode, dRow: number, dCol: number) => {
      const target = nodes.find(
        (n) => n.row === node.row + dRow && n.column === node.column + dCol,
      );
      if (target) nodeRefs.current.get(target.talentId)?.focus();
    },
    [nodes, nodeRefs],
  );

  return (
    <section
      className={`${styles.treePanel} ${activeOnMobile ? styles.treePanelActive : ''}`}
      aria-label={`${tree.name} talent tree`}
    >
      <header className={styles.treeHeader}>
        <h2 className={styles.treeName}>
          {tree.name}
          {tree.nameZh ? <span className={styles.treeNameZh}> {tree.nameZh}</span> : null}
        </h2>
        <span className={styles.treePoints} aria-label={`${points} points in ${tree.name}`}>
          {points}
        </span>
        <button
          type="button"
          className={styles.smallButton}
          data-testid="btn-reset-tree"
          data-tree-id={tree.treeId}
          onClick={() => onResetTree(tree.treeId)}
          aria-disabled={readOnly || points === 0 || undefined}
          aria-label={`Reset all points in ${tree.name}`}
        >
          Reset
        </button>
      </header>
      <div
        className={styles.treeGrid}
        role="group"
        aria-label={`${tree.name} talents`}
      >
        {nodes.map((node) => {
          const rank = build.allocation[node.talentId] ?? 0;
          const avail = availability.get(node.talentId);
          if (!avail) return null;
          const state = nodeVisualState(node, rank, avail);
          const unknown = hasUnknownEffect(node, rank);
          const selected = selectedId === node.talentId;
          return (
            <button
              key={node.talentId}
              type="button"
              ref={(el) => {
                if (el) nodeRefs.current.set(node.talentId, el);
                else nodeRefs.current.delete(node.talentId);
              }}
              className={`${styles.node} ${styles[`r${node.row}`]} ${styles[`c${node.column}`]} ${styles[state]} ${selected ? styles.nodeSelected : ''}`}
              aria-disabled={readOnly || (rank === 0 && !avail.canAdd) || undefined}
              aria-label={`${node.name}, rank ${rank} of ${node.maxRank}, ${STATE_ARIA[state]}`}
              onClick={(e) => {
                onSelect(node.talentId);
                if (readOnly || isMobile) return;
                if (e.detail === 0) return; // keyboard activation selects only
                if (e.shiftKey) onRemove(node.talentId);
                else onAdd(node.talentId);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onSelect(node.talentId);
                if (!readOnly && !isMobile) onRemove(node.talentId);
              }}
              onFocus={() => onSelect(node.talentId)}
              onKeyDown={(e) => {
                if (e.key === '+' || e.key === '=') {
                  e.preventDefault();
                  onAdd(node.talentId);
                } else if (e.key === '-' || e.key === '_') {
                  e.preventDefault();
                  onRemove(node.talentId);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveFocus(node, -1, 0);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveFocus(node, 1, 0);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  moveFocus(node, 0, -1);
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  moveFocus(node, 0, 1);
                }
              }}
            >
              <span className={styles.nodeIcon} aria-hidden="true">
                {initials(node.name)}
              </span>
              {state === 'locked' ? (
                <span className={styles.lockIcon} aria-hidden="true" />
              ) : null}
              <span className={styles.rankBadge} aria-hidden="true">
                {rank}/{node.maxRank}
              </span>
              {unknown ? (
                <span className={styles.unknownBadge} aria-hidden="true" title="Effect unknown">
                  ?
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
});
