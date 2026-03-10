const DB_NAME = 'triada-web';
const DB_VERSION = 4;

const STORE_BUDGET_YEARS = 'budget_years';
const STORE_BUDGET_MONTHS = 'budget_months';
const STORE_BUDGET_ALLOCATIONS = 'budget_allocations';
const STORE_BUDGET_EXPENSES = 'budget_expenses';
const STORE_RECURRING_EXPENSE_RULES = 'recurring_expense_rules';

const INDEX_BUDGET_MONTH_BY_YEAR_MONTH = 'by_budget_year_month';
const INDEX_ALLOCATIONS_BY_MONTH = 'by_budget_month';
const INDEX_EXPENSES_BY_MONTH_GROUP = 'by_budget_month_group';
const INDEX_EXPENSES_BY_RULE = 'by_recurring_rule_id';

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
      const upgradeTransaction = request.transaction as IDBTransaction;

      const getOrCreateStore = (
        storeName: string,
        options?: IDBObjectStoreParameters,
      ): IDBObjectStore => {
        if (db.objectStoreNames.contains(storeName)) {
          return upgradeTransaction.objectStore(storeName);
        }

        return db.createObjectStore(storeName, options);
      };

      getOrCreateStore(STORE_BUDGET_YEARS, { keyPath: 'id' });

      {
        const months = getOrCreateStore(STORE_BUDGET_MONTHS, { keyPath: 'id' });
        if (!months.indexNames.contains(INDEX_BUDGET_MONTH_BY_YEAR_MONTH)) {
          months.createIndex(INDEX_BUDGET_MONTH_BY_YEAR_MONTH, ['budget_year_id', 'month'], {
            unique: true,
          });
        }
      }

      {
        const allocations = getOrCreateStore(STORE_BUDGET_ALLOCATIONS, { keyPath: 'id' });
        if (!allocations.indexNames.contains(INDEX_ALLOCATIONS_BY_MONTH)) {
          allocations.createIndex(INDEX_ALLOCATIONS_BY_MONTH, 'budget_month_id', { unique: false });
        }
      }

      {
        const expenses = getOrCreateStore(STORE_BUDGET_EXPENSES, { keyPath: 'id' });
        if (!expenses.indexNames.contains(INDEX_EXPENSES_BY_MONTH_GROUP)) {
          expenses.createIndex(INDEX_EXPENSES_BY_MONTH_GROUP, ['budget_month_id', 'group']);
        }
        if (!expenses.indexNames.contains(INDEX_EXPENSES_BY_RULE)) {
          expenses.createIndex(INDEX_EXPENSES_BY_RULE, 'recurring_rule_id', { unique: false });
        }
      }

      getOrCreateStore(STORE_RECURRING_EXPENSE_RULES, { keyPath: 'id' });
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
  recurringExpenseRules: STORE_RECURRING_EXPENSE_RULES,
} as const;

export const indexedDbIndexes = {
  budgetMonthByYearMonth: INDEX_BUDGET_MONTH_BY_YEAR_MONTH,
  allocationsByMonth: INDEX_ALLOCATIONS_BY_MONTH,
  expensesByMonthGroup: INDEX_EXPENSES_BY_MONTH_GROUP,
  expensesByRule: INDEX_EXPENSES_BY_RULE,
} as const;
