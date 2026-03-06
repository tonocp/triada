import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPlatformMock = vi.fn<() => string>();
const initSqliteMock = vi.fn<() => Promise<void>>();
const closeSqliteMock = vi.fn<() => Promise<void>>();
const isSqliteReadyMock = vi.fn<() => boolean>();

const initIndexedDbMock = vi.fn<() => Promise<void>>();
const closeIndexedDbMock = vi.fn<() => Promise<void>>();
const isIndexedDbReadyMock = vi.fn<() => boolean>();

describe('data/database index facade', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getPlatformMock.mockReturnValue('web');
    isSqliteReadyMock.mockReturnValue(false);
    isIndexedDbReadyMock.mockReturnValue(false);

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        getPlatform: getPlatformMock,
      },
    }));

    vi.doMock('./database', () => ({
      initDatabase: initSqliteMock,
      closeDatabase: closeSqliteMock,
      isDatabaseReady: isSqliteReadyMock,
    }));

    vi.doMock('./indexeddb', () => ({
      initDatabase: initIndexedDbMock,
      closeDatabase: closeIndexedDbMock,
      isDatabaseReady: isIndexedDbReadyMock,
    }));
  });

  it('should initialize IndexedDB on web platform', async () => {
    getPlatformMock.mockReturnValue('web');
    const database = await import('./index');

    await database.initDatabase();

    expect(initIndexedDbMock).toHaveBeenCalledTimes(1);
    expect(initSqliteMock).not.toHaveBeenCalled();
  });

  it('should initialize SQLite on native platforms', async () => {
    getPlatformMock.mockReturnValue('ios');
    const database = await import('./index');

    await database.initDatabase();

    expect(initSqliteMock).toHaveBeenCalledTimes(1);
    expect(initIndexedDbMock).not.toHaveBeenCalled();
  });

  it('should close IndexedDB on web platform', async () => {
    getPlatformMock.mockReturnValue('web');
    const database = await import('./index');

    await database.closeDatabase();

    expect(closeIndexedDbMock).toHaveBeenCalledTimes(1);
    expect(closeSqliteMock).not.toHaveBeenCalled();
  });

  it('should close SQLite on native platforms', async () => {
    getPlatformMock.mockReturnValue('android');
    const database = await import('./index');

    await database.closeDatabase();

    expect(closeSqliteMock).toHaveBeenCalledTimes(1);
    expect(closeIndexedDbMock).not.toHaveBeenCalled();
  });

  it('should read readiness from IndexedDB on web platform', async () => {
    getPlatformMock.mockReturnValue('web');
    isIndexedDbReadyMock.mockReturnValue(true);

    const database = await import('./index');

    expect(database.isDatabaseReady()).toBe(true);
    expect(isIndexedDbReadyMock).toHaveBeenCalledTimes(1);
    expect(isSqliteReadyMock).not.toHaveBeenCalled();
  });

  it('should read readiness from SQLite on native platforms', async () => {
    getPlatformMock.mockReturnValue('ios');
    isSqliteReadyMock.mockReturnValue(true);

    const database = await import('./index');

    expect(database.isDatabaseReady()).toBe(true);
    expect(isSqliteReadyMock).toHaveBeenCalledTimes(1);
    expect(isIndexedDbReadyMock).not.toHaveBeenCalled();
  });
});
