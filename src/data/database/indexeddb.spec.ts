import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface IndexedDbMockResult {
  db: IDBDatabase;
  open: ReturnType<typeof vi.fn>;
  storeCreateIndexMap: Record<string, ReturnType<typeof vi.fn>>;
}

function setupIndexedDbMock(options?: {
  failOpen?: boolean;
  failOpenWithoutError?: boolean;
  existingStores?: Array<
    | 'budget_years'
    | 'budget_months'
    | 'budget_allocations'
    | 'budget_expenses'
    | 'recurring_expense_rules'
    | 'expense_categories'
  >;
  existingIndexes?: Record<string, string[]>;
}): IndexedDbMockResult {
  const storeCreateIndexMap: Record<string, ReturnType<typeof vi.fn>> = {};
  const existingStores = new Set(options?.existingStores ?? []);
  const existingIndexes = options?.existingIndexes ?? {};

  const createStoreMock = (storeName: string) => {
    const createIndex = vi.fn((indexName: string) => {
      if (!existingIndexes[storeName]) {
        existingIndexes[storeName] = [];
      }
      if (!existingIndexes[storeName]?.includes(indexName)) {
        existingIndexes[storeName]?.push(indexName);
      }
    });
    storeCreateIndexMap[storeName] = createIndex;

    return {
      createIndex,
      indexNames: {
        contains: vi.fn((indexName: string) => !!existingIndexes[storeName]?.includes(indexName)),
      },
    } as unknown as IDBObjectStore;
  };

  const createObjectStore = vi.fn((storeName: string) => {
    existingStores.add(storeName as never);
    return createStoreMock(storeName);
  });

  const db = {
    objectStoreNames: {
      contains: vi.fn((storeName: string) => existingStores.has(storeName as never)),
    },
    createObjectStore,
    close: vi.fn(),
    onversionchange: null,
  } as unknown as IDBDatabase;

  const open = vi.fn((_name: string, _version: number) => {
    const request = {
      result: db,
      error: options?.failOpen ? new Error('IndexedDB unavailable') : null,
      transaction: {
        objectStore: vi.fn((storeName: string) => createStoreMock(storeName)),
      } as unknown as IDBTransaction,
      onupgradeneeded: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
      onsuccess: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
    } as unknown as IDBOpenDBRequest;

    queueMicrotask(() => {
      if (options?.failOpen || options?.failOpenWithoutError) {
        if (options.failOpenWithoutError) {
          (request as unknown as { error: null }).error = null;
        }
        request.onerror?.(new Event('error'));
        return;
      }

      request.onupgradeneeded?.(new Event('upgradeneeded') as unknown as IDBVersionChangeEvent);
      request.onsuccess?.(new Event('success'));
    });

    return request;
  });

  vi.stubGlobal('indexedDB', { open });

  return {
    db,
    open,
    storeCreateIndexMap,
  };
}

describe('data/database indexeddb', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize database stores and indexes', async () => {
    const indexedDbMock = setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.initDatabase();

    expect(indexedDbMock.open).toHaveBeenCalledWith('triada-web', 5);
    expect(indexedDbModule.isDatabaseReady()).toBe(true);

    expect(indexedDbModule.indexedDbStores.budgetYears).toBe('budget_years');
    expect(indexedDbModule.indexedDbStores.budgetMonths).toBe('budget_months');
    expect(indexedDbModule.indexedDbStores.budgetAllocations).toBe('budget_allocations');
    expect(indexedDbModule.indexedDbStores.budgetExpenses).toBe('budget_expenses');
    expect(indexedDbModule.indexedDbStores.recurringExpenseRules).toBe('recurring_expense_rules');
    expect(indexedDbModule.indexedDbStores.expenseCategories).toBe('expense_categories');

    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetMonths],
    ).toBeDefined();
    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetMonths],
    ).toHaveBeenCalledWith(
      indexedDbModule.indexedDbIndexes.budgetMonthByYearMonth,
      ['budget_year_id', 'month'],
      {
        unique: true,
      },
    );

    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetAllocations],
    ).toHaveBeenCalledWith(indexedDbModule.indexedDbIndexes.allocationsByMonth, 'budget_month_id', {
      unique: false,
    });

    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetExpenses],
    ).toHaveBeenCalledWith(indexedDbModule.indexedDbIndexes.expensesByMonthGroup, [
      'budget_month_id',
      'group',
    ]);
    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetExpenses],
    ).toHaveBeenCalledWith(indexedDbModule.indexedDbIndexes.expensesByRule, 'recurring_rule_id', {
      unique: false,
    });

    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.expenseCategories],
    ).toHaveBeenCalledWith(indexedDbModule.indexedDbIndexes.categoriesByGroup, 'group', {
      unique: false,
    });
  });

  it('should auto-initialize when getting database before explicit init', async () => {
    const indexedDbMock = setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    const db = await indexedDbModule.getIndexedDb();

    expect(db).toBe(indexedDbMock.db);
    expect(indexedDbModule.isDatabaseReady()).toBe(true);
    expect(indexedDbMock.open).toHaveBeenCalledTimes(1);
  });

  it('should close database and reset readiness', async () => {
    const indexedDbMock = setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.initDatabase();
    await indexedDbModule.closeDatabase();

    expect(indexedDbMock.db.close).toHaveBeenCalledTimes(1);
    expect(indexedDbModule.isDatabaseReady()).toBe(false);
  });

  it('should close opened connection on version change', async () => {
    const indexedDbMock = setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.initDatabase();
    indexedDbMock.db.onversionchange?.(
      new Event('versionchange') as unknown as IDBVersionChangeEvent,
    );

    expect(indexedDbMock.db.close).toHaveBeenCalledTimes(1);
  });

  it('should not create stores that already exist', async () => {
    const indexedDbMock = setupIndexedDbMock({
      existingStores: [
        'budget_years',
        'budget_months',
        'budget_allocations',
        'budget_expenses',
        'recurring_expense_rules',
        'expense_categories',
      ],
      existingIndexes: {
        budget_months: ['by_budget_year_month'],
        budget_allocations: ['by_budget_month'],
        budget_expenses: ['by_budget_month_group', 'by_recurring_rule_id'],
        expense_categories: ['by_group'],
      },
    });
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.initDatabase();

    expect(indexedDbMock.db.createObjectStore).not.toHaveBeenCalled();
  });

  it('should add missing recurring rule index when expenses store already exists', async () => {
    const indexedDbMock = setupIndexedDbMock({
      existingStores: ['budget_expenses'],
      existingIndexes: {
        budget_expenses: ['by_budget_month_group'],
      },
    });
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.initDatabase();

    expect(
      indexedDbMock.storeCreateIndexMap[indexedDbModule.indexedDbStores.budgetExpenses],
    ).toHaveBeenCalledWith(indexedDbModule.indexedDbIndexes.expensesByRule, 'recurring_rule_id', {
      unique: false,
    });
  });

  it('should ignore close when database was never initialized', async () => {
    setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.closeDatabase();

    expect(indexedDbModule.isDatabaseReady()).toBe(false);
  });

  it('should reopen a new connection after close', async () => {
    const indexedDbMock = setupIndexedDbMock();
    const indexedDbModule = await import('./indexeddb');

    await indexedDbModule.getIndexedDb();
    await indexedDbModule.closeDatabase();
    await indexedDbModule.getIndexedDb();

    expect(indexedDbMock.open).toHaveBeenCalledTimes(2);
  });

  it('should throw when opening IndexedDB fails', async () => {
    setupIndexedDbMock({ failOpen: true });
    const indexedDbModule = await import('./indexeddb');

    await expect(indexedDbModule.initDatabase()).rejects.toThrow('IndexedDB unavailable');
    expect(indexedDbModule.isDatabaseReady()).toBe(false);
  });

  it('should throw fallback error when IndexedDB fails without explicit request error', async () => {
    setupIndexedDbMock({ failOpenWithoutError: true });
    const indexedDbModule = await import('./indexeddb');

    await expect(indexedDbModule.initDatabase()).rejects.toThrow('Failed to open IndexedDB');
    expect(indexedDbModule.isDatabaseReady()).toBe(false);
  });
});
