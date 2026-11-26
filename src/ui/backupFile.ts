import { serializeAppState } from '../domain/backup';
import { today } from '../domain/dates';
import type { AppState } from '../domain/types';

/**
 * Hands the backup to the person. On iPhone the share sheet ("Save to Files")
 * is the reliable path; elsewhere fall back to a download link.
 */
export async function exportBackup(state: AppState): Promise<void> {
  const name = `training-backup-${today()}.json`;
  const blob = new Blob([serializeAppState(state)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
