import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportDatabaseMock = vi.fn();
const importDatabaseMock = vi.fn();
const isNativePlatformMock = vi.fn<() => boolean>();
const getPlatformMock = vi.fn<() => string>();
const requestPermissionsMock = vi.fn();
const writeFileMock = vi.fn();
const shareMock = vi.fn();
const markBackedUpMock = vi.fn();

function mockModules(): void {
  vi.doMock('@/data/repositories', () => ({
    exportDatabase: exportDatabaseMock,
    importDatabase: importDatabaseMock,
  }));
  vi.doMock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: isNativePlatformMock, getPlatform: getPlatformMock },
  }));
  vi.doMock('@capacitor/filesystem', () => ({
    Directory: { ExternalStorage: 'EXTERNAL', Cache: 'CACHE' },
    Encoding: { UTF8: 'utf8' },
    Filesystem: { requestPermissions: requestPermissionsMock, writeFile: writeFileMock },
  }));
  vi.doMock('@capacitor/share', () => ({ Share: { share: shareMock } }));
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
  isNativePlatformMock.mockReturnValue(false);
  getPlatformMock.mockReturnValue('web');
  writeFileMock.mockResolvedValue({ uri: 'file:///cache/backup.json' });
  requestPermissionsMock.mockResolvedValue({});
  shareMock.mockResolvedValue(undefined);
});

describe('exportDetailKey', () => {
  it('should map the transport to a toast-detail key', async () => {
    const { exportDetailKey } = await loadModule();
    const fileName = 'b.json';
    expect(exportDetailKey({ status: 'exported', via: 'downloads', fileName })).toBe(
      'dashboard.databaseExportedToDownloads',
    );
    expect(exportDetailKey({ status: 'exported', via: 'shared', fileName })).toBe(
      'dashboard.databaseExportedSharedFallback',
    );
    expect(exportDetailKey({ status: 'exported', via: 'file', fileName })).toBe(
      'dashboard.databaseExported',
    );
  });
});

describe('useDatabaseBackup - export web', () => {
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

describe('useDatabaseBackup - export native', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReturnValue(true);
  });

  it('should write to the Android downloads directory', async () => {
    getPlatformMock.mockReturnValue('android');
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(requestPermissionsMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(expect.objectContaining({ directory: 'EXTERNAL' }));
    expect(result).toMatchObject({ status: 'exported', via: 'downloads' });
  });

  it('should fall back to the native share sheet when the downloads write fails', async () => {
    getPlatformMock.mockReturnValue('android');
    writeFileMock
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce({ uri: 'file:///cache/backup.json' });
    const result = await (await loadModule()).useDatabaseBackup().exportBackup();

    expect(shareMock).toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'exported', via: 'shared' });
  });

  it('should use the native share sheet on iOS', async () => {
    getPlatformMock.mockReturnValue('ios');
    expect(await (await loadModule()).useDatabaseBackup().exportBackup()).toMatchObject({
      status: 'exported',
      via: 'shared',
    });
  });

  it('should report cancellation when the native share sheet is dismissed', async () => {
    getPlatformMock.mockReturnValue('ios');
    shareMock.mockRejectedValue(abortError());
    expect(await (await loadModule()).useDatabaseBackup().exportBackup()).toEqual({
      status: 'cancelled',
    });
  });

  it('should fall back to download when native share fails otherwise', async () => {
    getPlatformMock.mockReturnValue('ios');
    shareMock.mockRejectedValue(new Error('no target'));
    expect((await (await loadModule()).useDatabaseBackup().exportBackup()).status).toBe('exported');
  });

  it('should tolerate a permissions request rejection', async () => {
    getPlatformMock.mockReturnValue('android');
    requestPermissionsMock.mockRejectedValue(new Error('no prompt'));
    expect((await (await loadModule()).useDatabaseBackup().exportBackup()).status).toBe('exported');
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
