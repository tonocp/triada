import {
  getIndexedDb,
  indexedDbIndexes,
  indexedDbStores,
  initDatabase as initIndexedDb,
} from '@/data/database/indexeddb';
import { generateUUID, getCurrentTimestamp } from '@/data/database/utils';
import type {
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
} from '@/domain/entities';
import {
  BUCKET_ORDER,
  BUCKET_PERCENTAGES,
  compareBuckets,
  type BucketType,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import type { BudgetRepository } from './BudgetRepository.types';

interface BudgetYearRow {
  id: string;
  monthly_income: number;
  year: number;
  currency: SupportedCurrency;
  created_at: string;
  updated_at: string;
}

interface BudgetMonthRow {
  id: string;
  budget_year_id: string;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

interface BudgetAllocationRow {
  id: string;
  budget_month_id: string;
  bucket: BucketType;
  allocated: number;
  spent: number;
  created_at: string;
  updated_at: string;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function toTimestamp(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function insertBudgetYear(row: BudgetYearRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetYears, 'readwrite');
  tx.objectStore(indexedDbStores.budgetYears).put(row);
  await transactionDone(tx);
}

async function insertBudgetMonth(row: BudgetMonthRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetMonths, 'readwrite');
  tx.objectStore(indexedDbStores.budgetMonths).put(row);
  await transactionDone(tx);
}

async function insertBudgetAllocation(row: BudgetAllocationRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetAllocations, 'readwrite');
  tx.objectStore(indexedDbStores.budgetAllocations).put(row);
  await transactionDone(tx);
}

async function readAllBudgetYears(): Promise<BudgetYearRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetYears, 'readonly');
  const result = (await requestToPromise(
    tx.objectStore(indexedDbStores.budgetYears).getAll(),
  )) as BudgetYearRow[];
  await transactionDone(tx);
  return result;
}

async function findBudgetMonthRow(
  budgetYearId: string,
  month: number,
): Promise<BudgetMonthRow | null> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetMonths, 'readonly');
  const store = tx.objectStore(indexedDbStores.budgetMonths);
  const index = store.index(indexedDbIndexes.budgetMonthByYearMonth);
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.only([budgetYearId, month])),
  )) as BudgetMonthRow[];
  await transactionDone(tx);
  return rows[0] ?? null;
}

async function readAllocationRowsByMonth(budgetMonthId: string): Promise<BudgetAllocationRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetAllocations, 'readonly');
  const store = tx.objectStore(indexedDbStores.budgetAllocations);
  const index = store.index(indexedDbIndexes.allocationsByMonth);
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.only(budgetMonthId)),
  )) as BudgetAllocationRow[];
  await transactionDone(tx);
  return rows;
}

async function readAllBudgetMonths(): Promise<BudgetMonthRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetMonths, 'readonly');
  const rows = (await requestToPromise(
    tx.objectStore(indexedDbStores.budgetMonths).getAll(),
  )) as BudgetMonthRow[];
  await transactionDone(tx);
  return rows;
}

async function hasBudgetMonthsForYear(budgetYearId: string): Promise<boolean> {
  const months = await readAllBudgetMonths();
  return months.some((month) => month.budget_year_id === budgetYearId);
}

export const indexedDbBudgetRepository: BudgetRepository = {
  async createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear> {
    await initIndexedDb();

    const id = generateUUID();
    const now = getCurrentTimestamp();

    await insertBudgetYear({
      id,
      monthly_income: input.monthlyIncome,
      year: input.year,
      currency: input.currency,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      monthlyIncome: input.monthlyIncome,
      year: input.year,
      currency: input.currency,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getLatestBudgetYear(): Promise<BudgetYear | null> {
    await initIndexedDb();

    const rows = await readAllBudgetYears();
    if (rows.length === 0) {
      return null;
    }

    const sorted = rows.sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }

      return toTimestamp(b.created_at) - toTimestamp(a.created_at);
    });

    let latest: BudgetYearRow | undefined;
    for (const row of sorted) {
      const hasMonths = await hasBudgetMonthsForYear(row.id);
      if (hasMonths) {
        latest = row;
        break;
      }
    }

    if (!latest) {
      return null;
    }

    return {
      id: latest.id,
      monthlyIncome: latest.monthly_income,
      year: latest.year,
      currency: latest.currency,
      createdAt: latest.created_at,
      updatedAt: latest.updated_at,
    };
  },

  async getBudgetYearByYear(year: number): Promise<BudgetYear | null> {
    await initIndexedDb();

    const rows = await readAllBudgetYears();
    const candidates = rows
      .filter((row) => row.year === year)
      .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));

    let found: BudgetYearRow | undefined;
    for (const candidate of candidates) {
      const hasMonths = await hasBudgetMonthsForYear(candidate.id);
      if (hasMonths) {
        found = candidate;
        break;
      }
    }

    if (!found) {
      return null;
    }

    return {
      id: found.id,
      monthlyIncome: found.monthly_income,
      year: found.year,
      currency: found.currency,
      createdAt: found.created_at,
      updatedAt: found.updated_at,
    };
  },

  async createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
    await initIndexedDb();

    const id = generateUUID();
    const now = getCurrentTimestamp();

    await insertBudgetMonth({
      id,
      budget_year_id: input.budgetYearId,
      month: input.month,
      year: input.year,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      budgetYearId: input.budgetYearId,
      month: input.month,
      year: input.year,
      allocations: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  async getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null> {
    await initIndexedDb();

    const row = await findBudgetMonthRow(budgetYearId, month);
    if (!row) {
      return null;
    }

    const allocations = await indexedDbBudgetRepository.getAllocationsByMonth(row.id);

    return {
      id: row.id,
      budgetYearId: row.budget_year_id,
      month: row.month,
      year: row.year,
      allocations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation> {
    await initIndexedDb();

    const id = generateUUID();
    const now = getCurrentTimestamp();

    await insertBudgetAllocation({
      id,
      budget_month_id: input.budgetMonthId,
      bucket: input.bucket,
      allocated: input.allocated,
      spent: 0,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      budgetMonthId: input.budgetMonthId,
      bucket: input.bucket,
      allocated: input.allocated,
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
    await initIndexedDb();

    const rows = await readAllocationRowsByMonth(budgetMonthId);

    return rows
      .map((row) => ({
        id: row.id,
        budgetMonthId: row.budget_month_id,
        bucket: row.bucket,
        allocated: row.allocated,
        spent: row.spent,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
      .sort((left, right) => compareBuckets(left.bucket, right.bucket));
  },

  async createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
    const budgetYear = await indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome,
      year,
      currency,
    });
    const months: BudgetMonth[] = [];

    for (let month = 1; month <= 12; month++) {
      const budgetMonth = await indexedDbBudgetRepository.createBudgetMonth({
        budgetYearId: budgetYear.id,
        month,
        year,
      });

      const allocations: BudgetAllocation[] = [];

      for (const bucket of BUCKET_ORDER) {
        const percentage = BUCKET_PERCENTAGES[bucket];
        const allocated = Math.floor((monthlyIncome * percentage) / 100);
        const allocation = await indexedDbBudgetRepository.createBudgetAllocation({
          budgetMonthId: budgetMonth.id,
          bucket,
          allocated,
        });
        allocations.push(allocation);
      }

      months.push({
        ...budgetMonth,
        allocations,
      });
    }

    return { budgetYear, months };
  },
};
