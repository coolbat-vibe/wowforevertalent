/**
 * My Builds island: lists locally saved named builds with open / rename /
 * delete / export / import. When storage is unavailable the page degrades
 * to an explanation plus import-validation preview (nothing is saved).
 */
import { useEffect, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import type { StoredBuild } from '@domain/talents/types';
import { spentPoints } from '@domain/talents/rules';
import { buildShareUrl, encodeBuild } from '@domain/sharing/codec';
import {
  MAX_NAME_LENGTH,
  deleteBuild,
  exportBuildJson,
  importBuildJson,
  listBuilds,
  renameBuild,
  saveNamedBuild,
  storageAvailable,
} from '@features/builds/storage';
import type { SiteManifest } from '@data/loadSnapshot';
import styles from './mybuilds.module.css';

export interface MyBuildsAppProps {
  manifest: SiteManifest;
}

interface ImportPreview {
  name: string | undefined;
  classId: string;
  level: number;
  points: number;
  snapshotId: string;
}

export default function MyBuildsApp({ manifest }: MyBuildsAppProps): JSX.Element {
  const [available, setAvailable] = useState(true);
  const [builds, setBuilds] = useState<StoredBuild[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

  const refresh = () => setBuilds(listBuilds());

  useEffect(() => {
    const ok = storageAvailable();
    setAvailable(ok);
    if (ok) refresh();
  }, []);

  const snapshotKnown = (snapshotId: string) => snapshotId === manifest.snapshotId;

  const onOpen = (b: StoredBuild) => {
    try {
      const url = buildShareUrl(window.location.origin, b.classId, encodeBuild(b));
      window.location.assign(url);
    } catch {
      setMessage('Could not create a share link for this build.');
    }
  };

  const onStartRename = (b: StoredBuild) => {
    setRenamingId(b.id);
    setRenameText(b.name);
    setConfirmDeleteId(null);
  };

  const onConfirmRename = () => {
    if (!renamingId) return;
    const result = renameBuild(renamingId, renameText);
    if (result.ok) {
      setMessage('Build renamed.');
      setRenamingId(null);
      refresh();
    } else {
      setMessage(`Could not rename: ${result.error.message}`);
    }
  };

  const onDelete = (id: string) => {
    deleteBuild(id);
    setConfirmDeleteId(null);
    setMessage('Build deleted.');
    refresh();
  };

  const onExport = (b: StoredBuild) => {
    const json = exportBuildJson(b);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b.name.replace(/[^a-z0-9-_]+/gi, '_') || 'build'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported “${b.name}” as JSON.`);
  };

  const handleImport = (text: string) => {
    const result = importBuildJson(text);
    if (!result.ok) {
      setImportPreview(null);
      setMessage(`Import failed: ${result.error.message}`);
      return;
    }
    const value = result.value;
    setImportPreview({
      name: value.name,
      classId: value.classId,
      level: value.level,
      points: spentPoints(value.allocation),
      snapshotId: value.snapshotId,
    });
    if (!available) {
      setMessage('The import is valid, but storage is unavailable on this device — nothing was saved.');
      return;
    }
    const saved = saveNamedBuild(value, value.name ?? 'Imported build');
    if (!saved.ok) {
      setMessage(`Import failed: ${saved.error.message}`);
      return;
    }
    setMessage(`Imported “${saved.value.name}”.`);
    refresh();
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(handleImport);
    e.target.value = '';
  };

  return (
    <div className={styles.myBuilds}>
      {!available ? (
        <div className={styles.warningBanner} role="status">
          <p>
            Local storage is not available on this device, so saved builds cannot be listed or
            stored. You can still validate an import below, and share links keep working on the
            calculator pages.
          </p>
        </div>
      ) : null}

      {message ? (
        <p className={styles.statusLine} role="status">
          {message}
        </p>
      ) : null}

      {available ? (
        builds.length === 0 ? (
          <p className={styles.empty}>
            No saved builds yet. Open a class calculator, allocate points, and use “Save build”.
          </p>
        ) : (
          <ul className={styles.buildList}>
            {builds.map((b) => (
              <li key={b.id} className={styles.buildItem}>
                <div className={styles.buildInfo}>
                  {renamingId === b.id ? (
                    <div className={styles.renameRow}>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={renameText}
                        maxLength={MAX_NAME_LENGTH}
                        aria-label="New build name"
                        onChange={(e) => setRenameText(e.target.value)}
                      />
                      <button type="button" className={styles.button} onClick={onConfirmRename}>
                        Save name
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setRenamingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h2 className={styles.buildName}>{b.name}</h2>
                  )}
                  <p className={styles.buildMeta}>
                    {b.classId} · level {b.level} · {spentPoints(b.allocation)} points · snapshot{' '}
                    {b.snapshotId}
                    {snapshotKnown(b.snapshotId) ? '' : ' (not the current snapshot)'} · updated{' '}
                    {b.updatedAt.slice(0, 10)}
                  </p>
                </div>
                <div className={styles.buildActions}>
                  <button type="button" className={styles.button} onClick={() => onOpen(b)}>
                    Open
                  </button>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => onStartRename(b)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => onExport(b)}
                  >
                    Export JSON
                  </button>
                  {confirmDeleteId === b.id ? (
                    <>
                      <button
                        type="button"
                        className={styles.buttonDanger}
                        onClick={() => onDelete(b.id)}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => {
                        setConfirmDeleteId(b.id);
                        setRenamingId(null);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <section className={styles.importSection} aria-label="Import a build">
        <h2>Import a build</h2>
        <div className={styles.importRow}>
          <label className={styles.fileLabel}>
            From JSON file
            <input type="file" accept=".json,application/json" onChange={onImportFile} />
          </label>
        </div>
        <label className={styles.field}>
          Or paste build JSON
          <textarea
            className={styles.textArea}
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Build JSON to import"
          />
        </label>
        <button
          type="button"
          className={styles.button}
          onClick={() => handleImport(importText)}
          disabled={importText.trim().length === 0}
        >
          Validate and import
        </button>

        {importPreview ? (
          <div className={styles.preview} role="status">
            <h3>Import looks valid</h3>
            <p>
              {importPreview.name ? `“${importPreview.name}” · ` : ''}
              {importPreview.classId} · level {importPreview.level} · {importPreview.points} points
              · snapshot {importPreview.snapshotId}
              {snapshotKnown(importPreview.snapshotId) ? '' : ' (not the current snapshot)'}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
