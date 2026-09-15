/**
 * Home page calculator: the tool is usable on the landing page itself
 * (premium tool page pattern — no navigation required). Class switching
 * happens in-page; each class snapshot is fetched once on demand and cached.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { ClassSnapshot } from '@domain/talents/types';
import type { SiteManifest } from '@data/loadSnapshot';
import TalentCalculator from './TalentCalculator';
import styles from './home.module.css';

export interface HomeClassEntry {
  classId: string;
  name: string;
  color: string;
  iconRef: string;
}

export interface HomeCalculatorProps {
  manifest: SiteManifest;
  initialSnapshot: ClassSnapshot;
  classes: HomeClassEntry[];
}

const LAST_CLASS_KEY = 'wftc:lastClass';

export default function HomeCalculator(props: HomeCalculatorProps): JSX.Element {
  const { manifest, initialSnapshot, classes } = props;
  const [snapshots, setSnapshots] = useState<Record<string, ClassSnapshot>>({
    [initialSnapshot.classDef.classId]: initialSnapshot,
  });
  const [currentId, setCurrentId] = useState(initialSnapshot.classDef.classId);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const selectClass = useCallback(
    async (classId: string, updateStored = true) => {
      if (updateStored) {
        try {
          localStorage.setItem(LAST_CLASS_KEY, classId);
        } catch {
          /* storage optional */
        }
      }
      if (snapshots[classId]) {
        setCurrentId(classId);
        setLoadError(null);
        return;
      }
      const file = manifest.classes.find((c) => c.classId === classId);
      if (!file) {
        setLoadError(`Unknown class: ${classId}`);
        return;
      }
      const requestId = ++requestRef.current;
      setLoadingId(classId);
      setLoadError(null);
      try {
        const res = await fetch(file.path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snapshot = (await res.json()) as ClassSnapshot;
        if (snapshot.classDef.classId !== classId) {
          throw new Error('snapshot class mismatch');
        }
        if (requestRef.current !== requestId) return; // superseded
        setSnapshots((prev) => ({ ...prev, [classId]: snapshot }));
        setCurrentId(classId);
      } catch {
        if (requestRef.current === requestId) {
          setLoadError(`Could not load ${classId} talent data. Check your connection and try again.`);
        }
      } finally {
        if (requestRef.current === requestId) setLoadingId(null);
      }
    },
    [manifest, snapshots],
  );

  // Restore the visitor's last class on first mount.
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_CLASS_KEY);
      if (last && last !== initialSnapshot.classDef.classId) {
        void selectClass(last, false);
      }
    } catch {
      /* storage optional */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = snapshots[currentId];

  return (
    <div className={styles.homeCalc}>
      <div
        className={styles.classTabs}
        role="group"
        aria-label="Choose a class to plan talents"
        data-testid="home-class-tabs"
      >
        {classes.map((c) => (
          <a
            key={c.classId}
            href={`/${c.classId}/`}
            className={styles.classTab}
            style={{ '--tab-class-color': c.color } as React.CSSProperties}
            aria-current={currentId === c.classId ? 'true' : undefined}
            aria-label={`${c.name} talent calculator`}
            data-testid={`home-class-tab-${c.classId}`}
            onClick={(e) => {
              // In-page switch with JS; the real href keeps the class pages
              // crawlable and lets users open them in a new tab.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              void selectClass(c.classId);
            }}
          >
            <img
              src={`/icons/classes/${c.iconRef}.jpg`}
              alt=""
              width={40}
              height={40}
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className={styles.tabName}>{c.name}</span>
          </a>
        ))}
      </div>

      {loadError ? (
        <p className={styles.loadError} role="alert" data-testid="home-load-error">
          {loadError}{' '}
          <button type="button" onClick={() => void selectClass(currentId, false)}>
            Retry
          </button>
        </p>
      ) : null}

      {loadingId ? (
        <p className={styles.loading} role="status">
          Loading {classes.find((c) => c.classId === loadingId)?.name ?? loadingId} talents…
        </p>
      ) : null}

      {current ? (
        <TalentCalculator
          key={currentId}
          snapshot={current}
          manifest={manifest}
        />
      ) : null}
    </div>
  );
}
