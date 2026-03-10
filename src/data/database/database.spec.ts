import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPlatformMock = vi.fn<() => string>();

const checkConnectionsConsistencyMock = vi.fn();
const isConnectionMock = vi.fn();
const retrieveConnectionMock = vi.fn();
const createConnectionMock = vi.fn();
const closeConnectionMock = vi.fn();

const dbIsOpenMock = vi.fn();
const dbOpenMock = vi.fn();
const dbExecuteMock = vi.fn();
const dbQueryMock = vi.fn();
const dbRunMock = vi.fn();
const dbCloseMock = vi.fn();

describe('data/database sqlite runtime', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getPlatformMock.mockReturnValue('ios');
    checkConnectionsConsistencyMock.mockResolvedValue({ result: true });
    isConnectionMock.mockResolvedValue({ result: false });

    dbIsOpenMock.mockResolvedValue({ result: false });
    dbOpenMock.mockResolvedValue(undefined);
    dbExecuteMock.mockResolvedValue({});
    dbQueryMock.mockResolvedValue({ values: [] });
    dbRunMock.mockResolvedValue({});
    dbCloseMock.mockResolvedValue(undefined);

    createConnectionMock.mockResolvedValue({
      isDBOpen: dbIsOpenMock,
      open: dbOpenMock,
      execute: dbExecuteMock,
      query: dbQueryMock,
      run: dbRunMock,
      close: dbCloseMock,
    });

    retrieveConnectionMock.mockResolvedValue({
      isDBOpen: dbIsOpenMock,
      open: dbOpenMock,
      execute: dbExecuteMock,
      query: dbQueryMock,
      run: dbRunMock,
      close: dbCloseMock,
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        getPlatform: getPlatformMock,
      },
    }));

    vi.doMock('@capacitor-community/sqlite', () => ({
      CapacitorSQLite: {},
      SQLiteConnection: class {
        checkConnectionsConsistency = checkConnectionsConsistencyMock;
        isConnection = isConnectionMock;
        retrieveConnection = retrieveConnectionMock;
        createConnection = createConnectionMock;
        closeConnection = closeConnectionMock;
      },
    }));
  });

  it('should throw when initializing on web runtime', async () => {
    getPlatformMock.mockReturnValue('web');
    const database = await import('./database');

    await expect(database.initDatabase()).rejects.toThrow(
      'SQLite is only available on native platforms',
    );
  });

  it('should initialize database and mark it as ready', async () => {
    const database = await import('./database');

    await database.initDatabase();

    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(dbOpenMock).toHaveBeenCalledTimes(1);
    expect(dbExecuteMock).toHaveBeenCalledTimes(7);
    expect(database.isDatabaseReady()).toBe(true);
  });

  it('should reuse retrieved connection when consistency allows', async () => {
    checkConnectionsConsistencyMock.mockResolvedValue({ result: true });
    isConnectionMock.mockResolvedValue({ result: true });

    const database = await import('./database');
    await database.initDatabase();

    expect(retrieveConnectionMock).toHaveBeenCalledTimes(1);
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it('should ignore consistency errors and still create a connection', async () => {
    checkConnectionsConsistencyMock.mockRejectedValue(new Error('consistency error'));
    isConnectionMock.mockResolvedValue({ result: false });

    const database = await import('./database');
    await database.initDatabase();

    expect(createConnectionMock).toHaveBeenCalledTimes(1);
  });

  it('should not reinitialize when already ready', async () => {
    const database = await import('./database');
    await database.initDatabase();
    await database.initDatabase();

    expect(dbExecuteMock).toHaveBeenCalledTimes(7);
  });

  it('should execute query and run operations', async () => {
    dbQueryMock.mockResolvedValueOnce({ values: [{ id: 1 }] });

    const database = await import('./database');
    // noinspection SqlNoDataSourceInspection
    const executeResult = await database.execute('SELECT 1;');
    // noinspection SqlNoDataSourceInspection
    const queryResult = await database.query<{ id: number }>('SELECT id FROM table', []);
    // noinspection SqlNoDataSourceInspection
    const runResult = await database.run('INSERT INTO table VALUES (?)', [1]);

    expect(executeResult).toEqual({});
    expect(queryResult).toEqual([{ id: 1 }]);
    expect(runResult).toEqual({});
  });

  it('should initialize implicitly when running statements before init', async () => {
    const database = await import('./database');

    // noinspection SqlNoDataSourceInspection
    await database.run('INSERT INTO table VALUES (?)', [1]);

    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(dbRunMock).toHaveBeenCalledTimes(1);
  });

  it('should wait while initialization is already in progress', async () => {
    type ConnectionMock = {
      isDBOpen: typeof dbIsOpenMock;
      open: typeof dbOpenMock;
      execute: typeof dbExecuteMock;
      query: typeof dbQueryMock;
      run: typeof dbRunMock;
      close: typeof dbCloseMock;
    };

    const deferredControl: { resolve: (value: ConnectionMock) => void } = {
      resolve: () => undefined,
    };

    const deferredConnection = new Promise<ConnectionMock>((resolve) => {
      deferredControl.resolve = resolve;
    });

    createConnectionMock.mockReset();
    createConnectionMock.mockReturnValueOnce(deferredConnection);

    const database = await import('./database');
    const firstInit = database.initDatabase();

    const secondInit = database.initDatabase();

    deferredControl.resolve({
      isDBOpen: dbIsOpenMock,
      open: dbOpenMock,
      execute: dbExecuteMock,
      query: dbQueryMock,
      run: dbRunMock,
      close: dbCloseMock,
    });

    await Promise.all([firstInit, secondInit]);

    expect(createConnectionMock).toHaveBeenCalledTimes(1);
    expect(dbExecuteMock).toHaveBeenCalledTimes(7);
  });

  it('should return empty array when query has no values', async () => {
    dbQueryMock.mockResolvedValueOnce({ values: undefined });

    const database = await import('./database');
    // noinspection SqlNoDataSourceInspection
    const result = await database.query('SELECT id FROM table', []);

    expect(result).toEqual([]);
  });

  it('should handle close when there is no connection', async () => {
    const database = await import('./database');

    await database.closeDatabase();

    expect(database.isDatabaseReady()).toBe(false);
  });

  it('should swallow close errors and reset state', async () => {
    dbCloseMock.mockRejectedValueOnce(new Error('close failed'));
    closeConnectionMock.mockRejectedValueOnce(new Error('close connection failed'));

    const database = await import('./database');
    await database.initDatabase();
    await database.closeDatabase();

    expect(database.isDatabaseReady()).toBe(false);
  });
});
