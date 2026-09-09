import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportDatabaseMock = vi.fn();
const importDatabaseMock = vi.fn();
const markBackedUpMock = vi.fn();

function mockModules(): void {
  vi.doMock('@/data/repositories', () => ({
    exportDatabase: exportDatabaseMock,
    importDatabase: importDatabaseMock,
  }));
  vi.doMock('./useBackupReminder', () => ({ markBackedUp: markBackedUpMock }));
}

async function loadModule() {
  mockModules();
  return import('./useDatabaseBackup');
}

function abortError(): Error {
  const error = new Error('user cancelled');
  error.name = 'AbortError';
  return error;
}

function fakeFile(contents: string): File {
  return { text: () => Promise.resolve(contents) } as unknown as File;
}

const SNAPSHOT = { meta: { exportedAt: '2026-01-10T00:00:00.000Z' }, data: {} };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  exportDatabaseMock.mockResolvedValue(SNAPSHOT);
  importDatabaseMock.mockResolvedValue(undefined);
});

describe('useDatabaseBackup - export', () => {
  it('should download a file and record the backup when no share API is available', async () => {
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(result).toEqual({
      status: 'exported',
      via: 'file',
      fileName: expect.stringMatching(/^triada-backup-\d{4}-\d{2}-\d{2}\.json$/),
    });
    expect(markBackedUpMock).toHaveBeenCalledOnce();
  });

  it('should use the Web Share API when present', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
    });
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(result).toMatchObject({ status: 'exported', via: 'shared' });
  });

  it('should report cancellation and not record a backup when the share sheet is dismissed', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortError()),
      configurable: true,
    });
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(result).toEqual({ status: 'cancelled' });
    expect(markBackedUpMock).not.toHaveBeenCalled();
  });

  it('should fall back to download when web share fails for another reason', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('no permission')),
      configurable: true,
    });
    expect((await (await loadModule()).useDatabaseBackup().exportBackup()).status).toBe('exported');
  });

  it('should report an error and not record a backup when the snapshot cannot be built', async () => {
    exportDatabaseMock.mockRejectedValue(new Error('db locked'));
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(result).toEqual({ status: 'error' });
    expect(markBackedUpMock).not.toHaveBeenCalled();
  });
});

describe('useDatabaseBackup - import', () => {
  it("should import a snapshot and record the backup at the file's own export date", async () => {
    const result = await (await loadModule())
      .useDatabaseBackup()
      .importBackup(fakeFile(JSON.stringify(SNAPSHOT)));

    expect(importDatabaseMock).toHaveBeenCalledWith(SNAPSHOT);
    expect(result).toEqual({ status: 'imported' });
    expect(markBackedUpMock).toHaveBeenCalledWith(Date.parse('2026-01-10T00:00:00.000Z'));
  });

  it('should return the parse/import error reason', async () => {
    importDatabaseMock.mockRejectedValue(new Error('bad schema version'));
    const result = await (await loadModule()).useDatabaseBackup().importBackup(fakeFile('{}'));

    expect(result).toEqual({ status: 'error', reason: 'bad schema version' });
    expect(markBackedUpMock).not.toHaveBeenCalled();
  });
});
