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
  Category,
  CategoryId,
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
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BY_GROUP,
  GROUP_ORDER,
  GROUP_PERCENTAGES,
  compareGroups,
  isDefaultCategoryId,
  isValidCategoryForGroup,
  type GroupType,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import {
  assertValidBudgetDatabaseSnapshot,
  createBudgetDatabaseSnapshot,
  type BudgetDatabaseSnapshot,
  type BudgetDatabaseSnapshotData,
} from './BudgetRepository.snapshot';
import type { BudgetRepository } from './BudgetRepository.types';

const APP_VERSION = '0.0.1';

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
  group: GroupType;
  allocated: number;
  spent: number;
  created_at: string;
  updated_at: string;
}

interface ExpenseRow {
  id: string;
  budget_month_id: string;
  group: GroupType;
  category_id: CategoryId;
  amount: number;
  description: string;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RecurringExpenseRuleRow {
  id: string;
  budget_year_id: string;
  group: GroupType;
  category_id: CategoryId;
  amount: number;
  description: string;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: CategoryId;
  group: GroupType;
  order: number;
  name?: string;
  is_default: boolean;
  is_active: boolean;
  deleted_at: string | null;
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

async function insertCategory(row: CategoryRow): Promise<void> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.expenseCategories, 'readwrite');
  tx.objectStore(indexedDbStores.expenseCategories).put(row);
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

async function readAllCategoryRows(): Promise<CategoryRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.expenseCategories, 'readonly');
  const result = (await requestToPromise(
    tx.objectStore(indexedDbStores.expenseCategories).getAll(),
  )) as CategoryRow[];
  await transactionDone(tx);
  return result;
}

async function findCategoryRowById(categoryId: CategoryId): Promise<CategoryRow | null> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.expenseCategories, 'readonly');
  const row = (await requestToPromise(
    tx.objectStore(indexedDbStores.expenseCategories).get(categoryId),
  )) as CategoryRow | undefined;
  await transactionDone(tx);
  return row ?? null;
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

async function readExpenseRowsByMonthAndGroup(
  budgetMonthId: string,
  group: GroupType,
): Promise<ExpenseRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readonly');
  const store = tx.objectStore(indexedDbStores.budgetExpenses);
  const index = store.index(indexedDbIndexes.expensesByMonthGroup);
  const rows = (await requestToPromise(
    index.getAll(IDBKeyRange.only([budgetMonthId, group])),
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
    group: row.group,
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
    group: row.group,
    categoryId: row.category_id,
    amount: row.amount,
    description: row.description,
    recurringRuleId: row.recurring_rule_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    group: row.group,
    order: row.order,
    ...(row.name ? { name: row.name } : {}),
    isDefault: row.is_default,
    isActive: row.is_active,
    deletedAt: row.deleted_at,
  };
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}

async function ensureDefaultCategories(): Promise<void> {
  const rows = await readAllCategoryRows();
  const rowIds = new Set(rows.map((row) => row.id));
  const now = getCurrentTimestamp();

  for (const category of DEFAULT_CATEGORIES) {
    if (rowIds.has(category.id)) {
      continue;
    }

    await insertCategory({
      id: category.id,
      group: category.group,
      order: category.order,
      name: undefined,
      is_default: category.isDefault,
      is_active: category.isActive,
      deleted_at: category.deletedAt,
      created_at: now,
      updated_at: now,
    });
  }
}

async function assertActiveCategoryForGroup(
  group: GroupType,
  categoryId: CategoryId,
): Promise<void> {
  await ensureDefaultCategories();

  const category = await findCategoryRowById(categoryId);
  if (!category || category.group !== group || !category.is_active) {
    throw new Error(`Category ${categoryId} does not belong to group ${group}`);
  }
}

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  return { year: year - 1, month: 12 };
}

function allocationForGroup(monthlyIncome: number, group: GroupType): number {
  const percentage = GROUP_PERCENTAGES[group];
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

async function readAllBudgetAllocations(): Promise<BudgetAllocationRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetAllocations, 'readonly');
  const rows = (await requestToPromise(
    tx.objectStore(indexedDbStores.budgetAllocations).getAll(),
  )) as BudgetAllocationRow[];
  await transactionDone(tx);
  return rows;
}

async function readAllBudgetExpenses(): Promise<ExpenseRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.budgetExpenses, 'readonly');
  const rows = (await requestToPromise(
    tx.objectStore(indexedDbStores.budgetExpenses).getAll(),
  )) as ExpenseRow[];
  await transactionDone(tx);
  return rows;
}

async function readAllRecurringExpenseRules(): Promise<RecurringExpenseRuleRow[]> {
  const db = await getIndexedDb();
  const tx = db.transaction(indexedDbStores.recurringExpenseRules, 'readonly');
  const rows = (await requestToPromise(
    tx.objectStore(indexedDbStores.recurringExpenseRules).getAll(),
  )) as RecurringExpenseRuleRow[];
  await transactionDone(tx);
  return rows;
}

async function replaceAllData(snapshotData: BudgetDatabaseSnapshotData): Promise<void> {
  const db = await getIndexedDb();
  const stores = [
    indexedDbStores.budgetYears,
    indexedDbStores.budgetMonths,
    indexedDbStores.budgetAllocations,
    indexedDbStores.budgetExpenses,
    indexedDbStores.recurringExpenseRules,
    indexedDbStores.expenseCategories,
  ];
  const tx = db.transaction(stores, 'readwrite');

  const budgetYearsStore = tx.objectStore(indexedDbStores.budgetYears);
  const budgetMonthsStore = tx.objectStore(indexedDbStores.budgetMonths);
  const budgetAllocationsStore = tx.objectStore(indexedDbStores.budgetAllocations);
  const budgetExpensesStore = tx.objectStore(indexedDbStores.budgetExpenses);
  const recurringRulesStore = tx.objectStore(indexedDbStores.recurringExpenseRules);
  const categoriesStore = tx.objectStore(indexedDbStores.expenseCategories);

  budgetYearsStore.clear();
  budgetMonthsStore.clear();
  budgetAllocationsStore.clear();
  budgetExpensesStore.clear();
  recurringRulesStore.clear();
  categoriesStore.clear();

  for (const row of snapshotData.budget_years) {
    budgetYearsStore.put(row);
  }

  for (const row of snapshotData.budget_months) {
    budgetMonthsStore.put(row);
  }

  for (const row of snapshotData.budget_allocations) {
    budgetAllocationsStore.put(row);
  }

  for (const row of snapshotData.budget_expenses) {
    budgetExpensesStore.put(row);
  }

  for (const row of snapshotData.recurring_expense_rules) {
    recurringRulesStore.put(row);
  }

  for (const row of snapshotData.expense_categories) {
    categoriesStore.put(row);
  }

  await transactionDone(tx);
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
      group: input.group,
      allocated: input.allocated,
      spent: 0,
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      budgetMonthId: input.budgetMonthId,
      group: input.group,
      allocated: input.allocated,
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  async addExpenseToAllocation(input: AddExpenseToAllocationInput): Promise<BudgetAllocation> {
    await initIndexedDb();

    const rows = await readAllocationRowsByMonth(input.budgetMonthId);
    const existing = rows.find((row) => row.group === input.group);

    if (!existing) {
      throw new Error(
        `Allocation not found for month ${input.budgetMonthId} and group ${input.group}`,
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
    const categoryId: CategoryId =
      input.categoryId ?? DEFAULT_CATEGORIES_BY_GROUP[input.group][0] ?? 'housing';

    if (input.categoryId) {
      if (isDefaultCategoryId(categoryId) && !isValidCategoryForGroup(input.group, categoryId)) {
        throw new Error(`Category ${categoryId} does not belong to group ${input.group}`);
      }

      await assertActiveCategoryForGroup(input.group, categoryId);
    }

    if (!input.isRecurring) {
      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: input.budgetMonthId,
        group: input.group,
        amount: input.amount,
      });

      const row: ExpenseRow = {
        id: generateUUID(),
        budget_month_id: input.budgetMonthId,
        group: input.group,
        category_id: categoryId,
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
      group: input.group,
      category_id: categoryId,
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
        group: input.group,
        amount: input.amount,
      });

      const row: ExpenseRow = {
        id: generateUUID(),
        budget_month_id: month.id,
        group: input.group,
        category_id: categoryId,
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
        group: input.group,
        category_id: categoryId,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: recurringRuleId,
        created_at: now,
        updated_at: now,
      })
    );
  },

  async getExpensesByMonthAndGroup(budgetMonthId: string, group: GroupType): Promise<Expense[]> {
    await initIndexedDb();

    const rows = await readExpenseRowsByMonthAndGroup(budgetMonthId, group);

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

    const nextGroup = input.group ?? existing.group;
    const nextCategoryId = input.categoryId ?? existing.category_id;

    if (input.group || input.categoryId) {
      if (
        isDefaultCategoryId(nextCategoryId) &&
        !isValidCategoryForGroup(nextGroup, nextCategoryId)
      ) {
        throw new Error(`Category ${nextCategoryId} does not belong to group ${nextGroup}`);
      }

      await assertActiveCategoryForGroup(nextGroup, nextCategoryId);
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
        group: existing.group,
        category_id: existing.category_id,
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
        group: nextGroup,
        category_id: nextCategoryId,
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
        if (expense.group === nextGroup) {
          const delta = input.amount - expense.amount;
          await indexedDbBudgetRepository.addExpenseToAllocation({
            budgetMonthId: expense.budget_month_id,
            group: expense.group,
            amount: delta,
          });
        } else {
          await indexedDbBudgetRepository.addExpenseToAllocation({
            budgetMonthId: expense.budget_month_id,
            group: expense.group,
            amount: -expense.amount,
          });
          await indexedDbBudgetRepository.addExpenseToAllocation({
            budgetMonthId: expense.budget_month_id,
            group: nextGroup,
            amount: input.amount,
          });
        }

        await insertExpense({
          ...expense,
          group: nextGroup,
          category_id: nextCategoryId,
          amount: input.amount,
          description: input.description,
          recurring_rule_id: newRuleId,
          updated_at: now,
        });
      }

      const updatedTarget = (await findExpenseRowById(input.expenseId)) ?? {
        ...existing,
        group: nextGroup,
        category_id: nextCategoryId,
        amount: input.amount,
        description: input.description,
        recurring_rule_id: newRuleId,
        updated_at: now,
      };

      return mapExpenseRow(updatedTarget);
    }

    if (existing.group === nextGroup) {
      const delta = input.amount - existing.amount;

      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: existing.budget_month_id,
        group: existing.group,
        amount: delta,
      });
    } else {
      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: existing.budget_month_id,
        group: existing.group,
        amount: -existing.amount,
      });
      await indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: existing.budget_month_id,
        group: nextGroup,
        amount: input.amount,
      });
    }

    const now = getCurrentTimestamp();
    const updatedRow: ExpenseRow = {
      ...existing,
      group: nextGroup,
      category_id: nextCategoryId,
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
        group: existing.group,
        category_id: existing.category_id,
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
          group: expense.group,
          amount: -expense.amount,
        });

        await deleteExpenseRow(expense.id);
      }

      return;
    }

    await indexedDbBudgetRepository.addExpenseToAllocation({
      budgetMonthId: existing.budget_month_id,
      group: existing.group,
      amount: -existing.amount,
    });

    await deleteExpenseRow(input.expenseId);
  },

  async getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
    await initIndexedDb();

    const rows = await readAllocationRowsByMonth(budgetMonthId);

    return rows.map(mapAllocationRow).sort((left, right) => compareGroups(left.group, right.group));
  },

  async getCategoriesByGroup(
    group: GroupType,
    options?: { includeInactive?: boolean },
  ): Promise<Category[]> {
    await initIndexedDb();
    await ensureDefaultCategories();

    const rows = await readAllCategoryRows();
    return rows
      .filter((row) => row.group === group && (options?.includeInactive === true || row.is_active))
      .sort((left, right) => left.order - right.order)
      .map(mapCategoryRow);
  },

  async createCategory(input: { group: GroupType; name: string }): Promise<Category> {
    await initIndexedDb();
    await ensureDefaultCategories();

    const name = normalizeCategoryName(input.name);
    if (name.length === 0) {
      throw new Error('Category name cannot be empty');
    }

    const rows = await readAllCategoryRows();
    const duplicated = rows.some(
      (row) =>
        row.group === input.group &&
        row.is_active &&
        row.name &&
        row.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

    if (duplicated) {
      throw new Error(`Category name ${name} already exists in group ${input.group}`);
    }

    const order =
      rows
        .filter((row) => row.group === input.group)
        .reduce((maxOrder, row) => Math.max(maxOrder, row.order), -1) + 1;

    const now = getCurrentTimestamp();
    const category: CategoryRow = {
      id: `custom-${generateUUID()}`,
      group: input.group,
      order,
      name,
      is_default: false,
      is_active: true,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };

    await insertCategory(category);
    return mapCategoryRow(category);
  },

  async updateCategoryName(input: {
    group: GroupType;
    categoryId: CategoryId;
    name: string;
  }): Promise<void> {
    await initIndexedDb();
    await ensureDefaultCategories();

    const name = normalizeCategoryName(input.name);
    if (name.length === 0) {
      throw new Error('Category name cannot be empty');
    }

    const rows = await readAllCategoryRows();
    const target = rows.find((row) => row.id === input.categoryId);

    if (!target || target.group !== input.group || !target.is_active) {
      throw new Error(`Category ${input.categoryId} does not belong to group ${input.group}`);
    }

    if (target.is_default) {
      throw new Error(`Default category ${input.categoryId} cannot be renamed`);
    }

    const duplicated = rows.some(
      (row) =>
        row.id !== input.categoryId &&
        row.group === input.group &&
        row.is_active &&
        row.name &&
        row.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

    if (duplicated) {
      throw new Error(`Category name ${name} already exists in group ${input.group}`);
    }

    await insertCategory({
      ...target,
      name,
      updated_at: getCurrentTimestamp(),
    });
  },

  async softDeleteCategoryAndReassign(input: {
    group: GroupType;
    categoryId: CategoryId;
    replacementCategoryId: CategoryId;
  }): Promise<void> {
    await initIndexedDb();
    await ensureDefaultCategories();

    if (input.categoryId === input.replacementCategoryId) {
      throw new Error('Replacement category must be different from category to delete');
    }

    const categories = await indexedDbBudgetRepository.getCategoriesByGroup(input.group, {
      includeInactive: true,
    });
    const target = categories.find((category) => category.id === input.categoryId);
    const replacement = categories.find((category) => category.id === input.replacementCategoryId);

    if (!target || !target.isActive) {
      throw new Error(`Category ${input.categoryId} does not belong to group ${input.group}`);
    }

    if (!replacement || !replacement.isActive) {
      throw new Error(
        `Replacement category ${input.replacementCategoryId} does not belong to group ${input.group}`,
      );
    }

    const now = getCurrentTimestamp();
    const db = await getIndexedDb();
    const tx = db.transaction(
      [
        indexedDbStores.expenseCategories,
        indexedDbStores.budgetExpenses,
        indexedDbStores.recurringExpenseRules,
      ],
      'readwrite',
    );

    const categoriesStore = tx.objectStore(indexedDbStores.expenseCategories);
    const expensesStore = tx.objectStore(indexedDbStores.budgetExpenses);
    const rulesStore = tx.objectStore(indexedDbStores.recurringExpenseRules);

    const allExpenses = (await requestToPromise(expensesStore.getAll())) as ExpenseRow[];
    const allRules = (await requestToPromise(rulesStore.getAll())) as RecurringExpenseRuleRow[];

    for (const expense of allExpenses) {
      if (expense.group === input.group && expense.category_id === input.categoryId) {
        expensesStore.put({
          ...expense,
          category_id: input.replacementCategoryId,
          updated_at: now,
        });
      }
    }

    for (const rule of allRules) {
      if (rule.group === input.group && rule.category_id === input.categoryId) {
        rulesStore.put({ ...rule, category_id: input.replacementCategoryId, updated_at: now });
      }
    }

    const targetRow = (await requestToPromise(categoriesStore.get(input.categoryId))) as
      | CategoryRow
      | undefined;

    if (targetRow) {
      categoriesStore.put({
        ...targetRow,
        is_active: false,
        deleted_at: now,
        updated_at: now,
      });
    }

    await transactionDone(tx);
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
          allocated: allocationForGroup(input.monthlyIncome, allocation.group),
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

      for (const group of GROUP_ORDER) {
        const percentage = GROUP_PERCENTAGES[group];
        const allocated = Math.floor((monthlyIncome * percentage) / 100);
        const allocation = await indexedDbBudgetRepository.createBudgetAllocation({
          budgetMonthId: budgetMonth.id,
          group,
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

  async exportDatabase(): Promise<BudgetDatabaseSnapshot> {
    await initIndexedDb();

    const [budgetYears, budgetMonths, budgetAllocations, budgetExpenses, recurringExpenseRules] =
      await Promise.all([
        readAllBudgetYears(),
        readAllBudgetMonths(),
        readAllBudgetAllocations(),
        readAllBudgetExpenses(),
        readAllRecurringExpenseRules(),
      ]);
    const expenseCategories = await readAllCategoryRows();

    return createBudgetDatabaseSnapshot(
      {
        budget_years: budgetYears,
        budget_months: budgetMonths,
        budget_allocations: budgetAllocations,
        budget_expenses: budgetExpenses,
        recurring_expense_rules: recurringExpenseRules,
        expense_categories: expenseCategories,
      },
      APP_VERSION,
    );
  },

  async importDatabase(snapshot: unknown): Promise<void> {
    await initIndexedDb();
    assertValidBudgetDatabaseSnapshot(snapshot);
    await replaceAllData(snapshot.data);
  },
};
