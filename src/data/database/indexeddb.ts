const DB_NAME = 'triada-web';
const DB_VERSION = 2;

const STORE_BUDGET_YEARS = 'budget_years';
const STORE_BUDGET_MONTHS = 'budget_months';
const STORE_BUDGET_ALLOCATIONS = 'budget_allocations';
const STORE_BUDGET_EXPENSES = 'budget_expenses';

const INDEX_BUDGET_MONTH_BY_YEAR_MONTH = 'by_budget_year_month';
const INDEX_ALLOCATIONS_BY_MONTH = 'by_budget_month';
const INDEX_EXPENSES_BY_MONTH_BUCKET = 'by_budget_month_bucket';

let dbPromise: Promise<IDBDatabase> | null = null;
let isDbReady = false;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_BUDGET_YEARS)) {
        db.createObjectStore(STORE_BUDGET_YEARS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_BUDGET_MONTHS)) {
        const months = db.createObjectStore(STORE_BUDGET_MONTHS, { keyPath: 'id' });
        months.createIndex(INDEX_BUDGET_MONTH_BY_YEAR_MONTH, ['budget_year_id', 'month'], {
          unique: true,
        });
      }

      if (!db.objectStoreNames.contains(STORE_BUDGET_ALLOCATIONS)) {
        const allocations = db.createObjectStore(STORE_BUDGET_ALLOCATIONS, { keyPath: 'id' });
        allocations.createIndex(INDEX_ALLOCATIONS_BY_MONTH, 'budget_month_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_BUDGET_EXPENSES)) {
        const expenses = db.createObjectStore(STORE_BUDGET_EXPENSES, { keyPath: 'id' });
        expenses.createIndex(INDEX_EXPENSES_BY_MONTH_BUCKET, ['budget_month_id', 'bucket']);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  await openDatabase();
  isDbReady = true;
}

export async function getIndexedDb(): Promise<IDBDatabase> {
  if (!isDbReady) {
    await initDatabase();
  }

  return openDatabase();
}

export async function closeDatabase(): Promise<void> {
  if (!dbPromise) {
    return;
  }

  const db = await dbPromise;
  db.close();
  dbPromise = null;
  isDbReady = false;
}

export function isDatabaseReady(): boolean {
  return isDbReady;
}

export const indexedDbStores = {
  budgetYears: STORE_BUDGET_YEARS,
  budgetMonths: STORE_BUDGET_MONTHS,
  budgetAllocations: STORE_BUDGET_ALLOCATIONS,
  budgetExpenses: STORE_BUDGET_EXPENSES,
} as const;

export const indexedDbIndexes = {
  budgetMonthByYearMonth: INDEX_BUDGET_MONTH_BY_YEAR_MONTH,
  allocationsByMonth: INDEX_ALLOCATIONS_BY_MONTH,
  expensesByMonthBucket: INDEX_EXPENSES_BY_MONTH_BUCKET,
} as const;
