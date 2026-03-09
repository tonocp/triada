import {
  getIndexedDb,
  indexedDbIndexes,
  indexedDbStores,
  initDatabase as initIndexedDb,
} from '@/data/database/indexeddb';
import { generateUUID, getCurrentTimestamp } from '@/data/database/utils';
import type {
  AddExpenseToAllocationInput,
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
  CreateExpenseInput,
  DeleteExpenseInput,
  Expense,
  UpdateExpenseInput,
  UpdateMonthlyIncomeFromMonthInput,
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
  monthly_income: number;
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

interface ExpenseRow {
  id: string;
  budget_month_id: string;
  bucket: BucketType;
  amount: number;
  description: string;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RecurringExpenseRuleRow {
  id: string;
  budget_year_id: string;
  bucket: BucketType;
  amount: number;
  description: string;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
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

async function insertExpense(row: ExpenseRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readwrite');
  tx.objectStore(indexedDbStores.budgetExpenses).put(row);
  await transactionDone(tx);
}

async function insertRecurringExpenseRule(row: RecurringExpenseRuleRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.recurringExpenseRules, 'readwrite');
  tx.objectStore(indexedDbStores.recurringExpenseRules).put(row);
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

async function readExpenseRowsByMonthAndBucket(
  budgetMonthId: string,
  bucket: BucketType,
): Promise<ExpenseRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readonly');
  const store = tx.objectStore(indexedDbStores.budgetExpenses);
  const index = store.index(indexedDbIndexes.expensesByMonthBucket);
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.only([budgetMonthId, bucket])),
  )) as ExpenseRow[];
  await transactionDone(tx);
  return rows;
}

async function findExpenseRowById(expenseId: string): Promise<ExpenseRow | null> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readonly');
  const row = (await requestToPromise(
    tx.objectStore(indexedDbStores.budgetExpenses).get(expenseId),
  )) as ExpenseRow | undefined;
  await transactionDone(tx);
  return row ?? null;
}

async function deleteExpenseRow(expenseId: string): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readwrite');
  tx.objectStore(indexedDbStores.budgetExpenses).delete(expenseId);
  await transactionDone(tx);
}

async function findRecurringExpenseRuleById(
  ruleId: string,
): Promise<RecurringExpenseRuleRow | null> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.recurringExpenseRules, 'readonly');
  const row = (await requestToPromise(
    tx.objectStore(indexedDbStores.recurringExpenseRules).get(ruleId),
  )) as RecurringExpenseRuleRow | undefined;
  await transactionDone(tx);
  return row ?? null;
}

async function readExpenseRowsByRuleId(ruleId: string): Promise<ExpenseRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readonly');
  const store = tx.objectStore(indexedDbStores.budgetExpenses);
  const index = store.index(indexedDbIndexes.expensesByRule);
  const rows = (await requestToPromise(index.getAll(IDBKeyRange.only(ruleId)))) as ExpenseRow[];
  await transactionDone(tx);
  return rows;
}

function mapAllocationRow(row: BudgetAllocationRow): BudgetAllocation {
  return {
    id: row.id,
    budgetMonthId: row.budget_month_id,
    bucket: row.bucket,
    allocated: row.allocated,
    spent: row.spent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExpenseRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    budgetMonthId: row.budget_month_id,
    bucket: row.bucket,
    amount: row.amount,
    description: row.description,
    recurringRuleId: row.recurring_rule_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  return { year: year - 1, month: 12 };
}

function allocationForBucket(monthlyIncome: number, bucket: BucketType): number {
  const percentage = BUCKET_PERCENTAGES[bucket];
  return Math.floor((monthlyIncome * percentage) / 100);
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
    const resolvedMonthlyIncome =
      input.monthlyIncome ??
      (await readAllBudgetYears()).find((year) => year.id === input.budgetYearId)?.monthly_income ??
      0;

    await insertBudgetMonth({
      id,
      budget_year_id: input.budgetYearId,
      month: input.month,
      year: input.year,
      monthly_income: resolvedMonthlyIncome,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      budgetYearId: input.budgetYearId,
      month: input.month,
      year: input.year,
      monthlyIncome: resolvedMonthlyIncome,
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
      monthlyIncome: row.monthly_income ?? 0,
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

  async addExpenseToAllocation(input: AddExpenseToAllocationInput): Promise<BudgetAllocation> {
    await initIndexedDb();

    const rows = await readAllocationRowsByMonth(input.budgetMonthId);
    const existing = rows.find((row) => row.bucket === input.bucket);

    if (!existing) {
      throw new Error(
        `Allocation not found for month ${input.budgetMonthId} and bucket ${input.bucket}`,
      );
    }

    const now = getCurrentTimestamp();
    const updatedRow: BudgetAllocationRow = {
      ...existing,
      spent: existing.spent + input.amount,
      updated_at: now,
    };

    await insertBudgetAllocation(updatedRow);

    return mapAllocationRow(updatedRow);
  },

  async addExpense(input: CreateExpenseInput): Promise<Expense> {
    await initIndexedDb();

    const now = getCurrentTimestamp();

    if (!input.isRecurring) {
      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: input.budgetMonthId,
        bucket: input.bucket,
        amount: input.amount,
      });

      const row: ExpenseRow = {
        id: generateUUID(),
        budget_month_id: input.budgetMonthId,
        bucket: input.bucket,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: null,
        created_at: now,
        updated_at: now,
      };

      await insertExpense(row);
      return mapExpenseRow(row);
    }

    const allMonths = await readAllBudgetMonths();
    const targetMonth = allMonths.find((month) => month.id === input.budgetMonthId);
    if (!targetMonth) {
      throw new Error(`Budget month not found with id ${input.budgetMonthId}`);
    }

    const recurringRuleId = generateUUID();
    await insertRecurringExpenseRule({
      id: recurringRuleId,
      budget_year_id: targetMonth.budget_year_id,
      bucket: input.bucket,
      amount: input.amount,
      description: input.description,
      start_year: targetMonth.year,
      start_month: targetMonth.month,
      end_year: null,
      end_month: null,
      created_at: now,
      updated_at: now,
    });

    const futureMonths = allMonths
      .filter(
        (month) =>
          month.budget_year_id === targetMonth.budget_year_id && month.month >= targetMonth.month,
      )
      .sort((left, right) => left.month - right.month);

    let created: Expense | null = null;
    for (const month of futureMonths) {
      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: month.id,
        bucket: input.bucket,
        amount: input.amount,
      });

      const row: ExpenseRow = {
        id: generateUUID(),
        budget_month_id: month.id,
        bucket: input.bucket,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: recurringRuleId,
        created_at: now,
        updated_at: now,
      };

      await insertExpense(row);
      if (month.id === targetMonth.id) {
        created = mapExpenseRow(row);
      }
    }

    return (
      created ??
      mapExpenseRow({
        id: generateUUID(),
        budget_month_id: input.budgetMonthId,
        bucket: input.bucket,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: recurringRuleId,
        created_at: now,
        updated_at: now,
      })
    );
  },

  async getExpensesByMonthAndBucket(budgetMonthId: string, bucket: BucketType): Promise<Expense[]> {
    await initIndexedDb();

    const rows = await readExpenseRowsByMonthAndBucket(budgetMonthId, bucket);

    return rows
      .map(mapExpenseRow)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
  },

  async updateExpense(input: UpdateExpenseInput): Promise<Expense> {
    await initIndexedDb();

    const existing = await findExpenseRowById(input.expenseId);

    if (!existing) {
      throw new Error(`Expense not found with id ${input.expenseId}`);
    }

    if (existing.recurring_rule_id && input.applyToFuture !== false) {
      const months = await readAllBudgetMonths();
      const targetMonth = months.find((month) => month.id === existing.budget_month_id) ?? {
        id: existing.budget_month_id,
        budget_year_id: '',
        month: 1,
        year: new Date().getFullYear(),
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      };

      const previousMonth = getPreviousMonth(targetMonth.year, targetMonth.month);
      const now = getCurrentTimestamp();

      const existingRule = (await findRecurringExpenseRuleById(existing.recurring_rule_id)) ?? {
        id: existing.recurring_rule_id,
        budget_year_id: targetMonth.budget_year_id,
        bucket: existing.bucket,
        amount: existing.amount,
        description: existing.description,
        start_year: targetMonth.year,
        start_month: targetMonth.month,
        end_year: null,
        end_month: null,
        created_at: now,
        updated_at: now,
      };

      await insertRecurringExpenseRule({
        ...existingRule,
        end_year: previousMonth.year,
        end_month: previousMonth.month,
        updated_at: now,
      });

      const newRuleId = generateUUID();
      await insertRecurringExpenseRule({
        id: newRuleId,
        budget_year_id: targetMonth.budget_year_id,
        bucket: existing.bucket,
        amount: input.amount,
        description: input.description,
        start_year: targetMonth.year,
        start_month: targetMonth.month,
        end_year: null,
        end_month: null,
        created_at: now,
        updated_at: now,
      });

      const ruleExpenses = await readExpenseRowsByRuleId(existing.recurring_rule_id);
      const futureExpenses = ruleExpenses.filter((expense) => {
        const month = months.find((candidate) => candidate.id === expense.budget_month_id);
        return (
          month &&
          month.budget_year_id === targetMonth.budget_year_id &&
          month.month >= targetMonth.month
        );
      });

      for (const expense of futureExpenses) {
        const delta = input.amount - expense.amount;
        await indexedDbBudgetRepository.addExpenseToAllocation({
          budgetMonthId: expense.budget_month_id,
          bucket: expense.bucket,
          amount: delta,
        });

        await insertExpense({
          ...expense,
          amount: input.amount,
          description: input.description,
          recurring_rule_id: newRuleId,
          updated_at: now,
        });
      }

      const updatedTarget = (await findExpenseRowById(input.expenseId)) ?? {
        ...existing,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: newRuleId,
        updated_at: now,
      };

      return mapExpenseRow(updatedTarget);
    }

    const delta = input.amount - existing.amount;

    await indexedDbBudgetRepository.addExpenseToAllocation({
      budgetMonthId: existing.budget_month_id,
      bucket: existing.bucket,
      amount: delta,
    });

    const now = getCurrentTimestamp();
    const updatedRow: ExpenseRow = {
      ...existing,
      amount: input.amount,
      description: input.description,
      recurring_rule_id: null,
      updated_at: now,
    };

    await insertExpense(updatedRow);

    return mapExpenseRow(updatedRow);
  },

  async deleteExpense(input: DeleteExpenseInput): Promise<void> {
    await initIndexedDb();

    const existing = await findExpenseRowById(input.expenseId);

    if (!existing) {
      throw new Error(`Expense not found with id ${input.expenseId}`);
    }

    if (existing.recurring_rule_id && input.applyToFuture !== false) {
      const months = await readAllBudgetMonths();
      const targetMonth = months.find((month) => month.id === existing.budget_month_id) ?? {
        id: existing.budget_month_id,
        budget_year_id: '',
        month: 1,
        year: new Date().getFullYear(),
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
      };

      const previousMonth = getPreviousMonth(targetMonth.year, targetMonth.month);
      const now = getCurrentTimestamp();

      const existingRule = (await findRecurringExpenseRuleById(existing.recurring_rule_id)) ?? {
        id: existing.recurring_rule_id,
        budget_year_id: targetMonth.budget_year_id,
        bucket: existing.bucket,
        amount: existing.amount,
        description: existing.description,
        start_year: targetMonth.year,
        start_month: targetMonth.month,
        end_year: null,
        end_month: null,
        created_at: now,
        updated_at: now,
      };

      await insertRecurringExpenseRule({
        ...existingRule,
        end_year: previousMonth.year,
        end_month: previousMonth.month,
        updated_at: now,
      });

      const ruleExpenses = await readExpenseRowsByRuleId(existing.recurring_rule_id);
      const futureExpenses = ruleExpenses.filter((expense) => {
        const month = months.find((candidate) => candidate.id === expense.budget_month_id);
        return (
          month &&
          month.budget_year_id === targetMonth.budget_year_id &&
          month.month >= targetMonth.month
        );
      });

      for (const expense of futureExpenses) {
        await indexedDbBudgetRepository.addExpenseToAllocation({
          budgetMonthId: expense.budget_month_id,
          bucket: expense.bucket,
          amount: -expense.amount,
        });

        await deleteExpenseRow(expense.id);
      }

      return;
    }

    await indexedDbBudgetRepository.addExpenseToAllocation({
      budgetMonthId: existing.budget_month_id,
      bucket: existing.bucket,
      amount: -existing.amount,
    });

    await deleteExpenseRow(input.expenseId);
  },

  async getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
    await initIndexedDb();

    const rows = await readAllocationRowsByMonth(budgetMonthId);

    return rows
      .map(mapAllocationRow)
      .sort((left, right) => compareBuckets(left.bucket, right.bucket));
  },

  async updateMonthlyIncomeFromMonth(input: UpdateMonthlyIncomeFromMonthInput): Promise<void> {
    await initIndexedDb();

    const now = getCurrentTimestamp();
    const allMonths = await readAllBudgetMonths();
    const targetMonths = allMonths
      .filter(
        (month) => month.budget_year_id === input.budgetYearId && month.month >= input.fromMonth,
      )
      .sort((left, right) => left.month - right.month);

    for (const month of targetMonths) {
      await insertBudgetMonth({
        ...month,
        monthly_income: input.monthlyIncome,
        updated_at: now,
      });

      const allocations = await readAllocationRowsByMonth(month.id);
      for (const allocation of allocations) {
        await insertBudgetAllocation({
          ...allocation,
          allocated: allocationForBucket(input.monthlyIncome, allocation.bucket),
          updated_at: now,
        });
      }
    }
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
        monthlyIncome,
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
