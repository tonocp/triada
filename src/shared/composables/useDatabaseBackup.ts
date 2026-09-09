import { exportDatabase, importDatabase } from '@/data/repositories';
import type { BudgetDatabaseSnapshot } from '@/data/repositories/BudgetRepository.snapshot';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { markBackedUp } from './useBackupReminder';

/** What the user perceives happened to the file — the caller maps this to copy. */
export type ExportVia = 'downloads' | 'shared' | 'file';

export type ExportResult =
  | { status: 'exported'; via: ExportVia; fileName: string }
  | { status: 'cancelled' }
  | { status: 'error' };

export type ImportResult = { status: 'imported' } | { status: 'error'; reason: string };

/** i18n key for the success-toast detail of an export result. */
export function exportDetailKey(result: Extract<ExportResult, { status: 'exported' }>): string {
  if (result.via === 'downloads') {
    return 'dashboard.databaseExportedToDownloads';
  }
  if (result.via === 'shared') {
    return 'dashboard.databaseExportedSharedFallback';
  }
  return 'dashboard.databaseExported';
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function backupFileName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `triada-backup-${year}-${month}-${day}.json`;
}

function triggerDownload(payload: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Try each transport in order; the first that lands (or is cancelled) wins. */
async function sendBackup(payload: string, fileName: string): Promise<ExportResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative && Capacitor.getPlatform() === 'android') {
    try {
      await Filesystem.requestPermissions();
    } catch {
      // best effort — the write below may still succeed or fall through
    }
    try {
      await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: payload,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return { status: 'exported', via: 'downloads', fileName };
    } catch {
      // fall through to share
    }
  }

  if (isNative) {
    try {
      const written = await Filesystem.writeFile({
        path: fileName,
        data: payload,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({ title: fileName, url: written.uri });
      return { status: 'exported', via: 'shared', fileName };
    } catch (error) {
      if (isAbort(error)) {
        return { status: 'cancelled' };
      }
      // fall through to web share / download
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        files: [new File([payload], fileName, { type: 'application/json' })],
      });
      return { status: 'exported', via: 'shared', fileName };
    } catch (error) {
      if (isAbort(error)) {
        return { status: 'cancelled' };
      }
      // fall through to download
    }
  }

  triggerDownload(payload, fileName);
  return { status: 'exported', via: 'file', fileName };
}

async function runExport(): Promise<ExportResult> {
  let payload: string;
  try {
    payload = JSON.stringify(await exportDatabase());
  } catch {
    return { status: 'error' };
  }

  const result = await sendBackup(payload, backupFileName());
  if (result.status === 'exported') {
    markBackedUp();
  }
  return result;
}

async function runImport(file: File): Promise<ImportResult> {
  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    await importDatabase(parsed);
    // importDatabase validated the snapshot: exportedAt is a real ISO date. Treat
    // the file's own age as our last-backup point, not "now".
    const exportedAt = Date.parse((parsed as BudgetDatabaseSnapshot).meta.exportedAt);
    if (Number.isFinite(exportedAt)) {
      markBackedUp(exportedAt);
    }
    return { status: 'imported' };
  } catch (error) {
    return { status: 'error', reason: error instanceof Error ? error.message : 'unknown' };
  }
}

export function useDatabaseBackup() {
  return { exportBackup: runExport, importBackup: runImport };
}
