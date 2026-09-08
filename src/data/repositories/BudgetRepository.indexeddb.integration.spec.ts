import { GROUP_ORDER } from '@/domain/entities';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface IndexedDbRepositoryModule {
  indexedDbBudgetRepository: {
    createBudgetYear: (input: {
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      split?: { needs: number; wants: number; savings: number };
    }) => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      split: { needs: number; wants: number; savings: number };
      createdAt: string;
      updatedAt: string;
    }>;
    getLatestBudgetYear: () => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      split: { needs: number; wants: number; savings: number };
      createdAt: string;
      updatedAt: string;
    } | null>;
    getBudgetYearByYear: (year: number) => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      split: { needs: number; wants: number; savings: number };
      createdAt: string;
      updatedAt: string;
    } | null>;
    updateBudgetSplitForYear: (input: {
      budgetYearId: string;
      split: { needs: number; wants: number; savings: number };
    }) => Promise<void>;
    createBudgetMonth: (input: {
      budgetYearId: string;
      month: number;
      year: number;
      monthlyIncome?: number;
    }) => Promise<{
      id: string;
      budgetYearId: string;
      month: number;
      year: number;
      monthlyIncome: number;
      allocations: Array<{
        group: 'needs' | 'wants' | 'savings';
        allocated: number;
        spent: number;
      }>;
    }>;
    getBudgetMonth: (
      budgetYearId: string,
      month: number,
    ) => Promise<{
      id: string;
      budgetYearId: string;
      month: number;
      year: number;
      monthlyIncome: number;
      allocations: Array<{
        group: 'needs' | 'wants' | 'savings';
        allocated: number;
        spent: number;
      }>;
    } | null>;
    updateMonthlyIncomeFromMonth: (input: {
      budgetYearId: string;
      fromMonth: number;
      monthlyIncome: number;
      split: { needs: number; wants: number; savings: number };
    }) => Promise<void>;
    createBudgetAllocation: (input: {
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      allocated: number;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      allocated: number;
      spent: number;
    }>;
    addExpenseToAllocation: (input: {
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      amount: number;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      allocated: number;
      spent: number;
    }>;
    addExpense: (input: {
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      categoryId?: string;
      amount: number;
      description: string;
      isRecurring?: boolean;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      categoryId: string;
      amount: number;
      description: string;
      recurringRuleId: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    updateExpense: (input: {
      expenseId: string;
      amount: number;
      description: string;
      group?: 'needs' | 'wants' | 'savings';
      categoryId?: string;
      applyToFuture?: boolean;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
      categoryId: string;
      amount: number;
      description: string;
      recurringRuleId: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    deleteExpense: (input: { expenseId: string; applyToFuture?: boolean }) => Promise<void>;
    getExpensesByMonthAndGroup: (
      budgetMonthId: string,
      group: 'needs' | 'wants' | 'savings',
    ) => Promise<
      Array<{
        id: string;
        budgetMonthId: string;
        group: 'needs' | 'wants' | 'savings';
        categoryId: string;
        amount: number;
        description: string;
        recurringRuleId: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >;
    getExpensesByYear: (budgetYearId: string) => Promise<
      Array<{
        id: string;
        budgetMonthId: string;
        group: 'needs' | 'wants' | 'savings';
        categoryId: string;
        amount: number;
        description: string;
        recurringRuleId: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >;
    getCategoriesByGroup: (
      group: 'needs' | 'wants' | 'savings',
      options?: { includeInactive?: boolean },
    ) => Promise<
      Array<{
        id: string;
        group: 'needs' | 'wants' | 'savings';
        order: number;
        name?: string;
        isDefault: boolean;
        isActive: boolean;
        deletedAt: string | null;
      }>
    >;
    createCategory: (input: { group: 'needs' | 'wants' | 'savings'; name: string }) => Promise<{
      id: string;
      group: 'needs' | 'wants' | 'savings';
      order: number;
      name?: string;
      isDefault: boolean;
      isActive: boolean;
      deletedAt: string | null;
    }>;
    updateCategoryName: (input: {
      group: 'needs' | 'wants' | 'savings';
      categoryId: string;
      name: string;
    }) => Promise<void>;
    softDeleteCategoryAndReassign: (input: {
      group: 'needs' | 'wants' | 'savings';
      categoryId: string;
      replacementCategoryId: string;
    }) => Promise<void>;
    getAllocationsByMonth: (budgetMonthId: string) => Promise<
      Array<{
        group: 'needs' | 'wants' | 'savings';
        allocated: number;
        spent: number;
      }>
    >;
    createYearWithAllocations: (
      monthlyIncome: number,
      year: number,
      currency: 'USD' | 'EUR',
      split?: { needs: number; wants: number; savings: number },
    ) => Promise<{
      budgetYear: {
        id: string;
        monthlyIncome: number;
        year: number;
        currency: 'USD' | 'EUR';
        split: { needs: number; wants: number; savings: number };
      };
      months: Array<{
        id: string;
        month: number;
        allocations: Array<{
          group: 'needs' | 'wants' | 'savings';
          allocated: number;
          spent: number;
        }>;
      }>;
    }>;
    exportDatabase: () => Promise<{
      meta: {
        format: string;
        schemaVersion: number;
        exportedAt: string;
        appVersion: string;
      };
      data: {
        budget_years: Array<Record<string, unknown>>;
        budget_months: Array<Record<string, unknown>>;
        budget_allocations: Array<Record<string, unknown>>;
        budget_expenses: Array<Record<string, unknown>>;
        recurring_expense_rules: Array<Record<string, unknown>>;
        expense_categories: Array<Record<string, unknown>>;
      };
    }>;
    importDatabase: (snapshot: unknown) => Promise<void>;
  };
}

interface IndexedDbModule {
  closeDatabase: () => Promise<void>;
}

async function loadModules(): Promise<{
  repositoryModule: IndexedDbRepositoryModule;
  indexedDbModule: IndexedDbModule;
}> {
  const repositoryModule =
    (await import('./BudgetRepository.indexeddb')) as IndexedDbRepositoryModule;
  const indexedDbModule = (await import('@/data/database/indexeddb')) as IndexedDbModule;

  return { repositoryModule, indexedDbModule };
}

describe('data/repositories IndexedDB integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('indexedDB', indexedDB);
    vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  });

  afterEach(async () => {
    const { indexedDbModule } = await loadModules();
    await indexedDbModule.closeDatabase();
    indexedDB.deleteDatabase('triada-web');
    vi.unstubAllGlobals();
  });

  it('should create year with 12 months and 50/30/20 allocations', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    expect(result.budgetYear.year).toBe(2026);
    expect(result.budgetYear.currency).toBe('USD');
    expect(result.months).toHaveLength(12);

    const firstMonth = result.months[0];
    expect(firstMonth?.month).toBe(1);
    expect(firstMonth?.allocations).toHaveLength(3);
    expect(firstMonth?.allocations.map((allocation) => allocation.group)).toEqual(GROUP_ORDER);

    expect(firstMonth?.allocations[0]?.allocated).toBe(50_000);
    expect(firstMonth?.allocations[1]?.allocated).toBe(30_000);
    expect(firstMonth?.allocations[2]?.allocated).toBe(20_000);

    expect(result.months[11]?.month).toBe(12);
  });

  it('should return null when latest year does not exist', async () => {
    const { repositoryModule } = await loadModules();

    const latest = await repositoryModule.indexedDbBudgetRepository.getLatestBudgetYear();

    expect(latest).toBeNull();
  });

  it('should return latest year only when it has months', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 90_000,
      year: 2027,
      currency: 'EUR',
    });

    const yearWithMonths =
      await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
        120_000,
        2026,
        'USD',
      );

    const latest = await repositoryModule.indexedDbBudgetRepository.getLatestBudgetYear();

    expect(latest).not.toBeNull();
    expect(latest?.id).toBe(yearWithMonths.budgetYear.id);
    expect(latest?.year).toBe(2026);
  });

  it('should return null as latest when all years are missing months', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 80_000,
      year: 2025,
      currency: 'USD',
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 90_000,
      year: 2026,
      currency: 'EUR',
    });

    const latest = await repositoryModule.indexedDbBudgetRepository.getLatestBudgetYear();
    expect(latest).toBeNull();
  });

  it('should prioritize latest created_at for same year in latest selection', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      120_000,
      2026,
      'EUR',
    );

    const latest = await repositoryModule.indexedDbBudgetRepository.getLatestBudgetYear();

    expect(latest?.id).toBe(newer.budgetYear.id);
    expect(latest?.currency).toBe('EUR');
  });

  it('should return the latest candidate with months for the same year', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(80_000, 2026, 'USD');

    const newerWithoutMonths = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 150_000,
      year: 2026,
      currency: 'EUR',
    });

    const found = await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2026);

    expect(found).not.toBeNull();
    expect(found?.id).not.toBe(newerWithoutMonths.id);
    expect(found?.year).toBe(2026);
  });

  it('should return null when searching for year without valid months', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2030,
      currency: 'USD',
    });

    const result = await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2030);

    expect(result).toBeNull();
  });

  it('should return null when budget month does not exist', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 8);

    expect(month).toBeNull();
  });

  it('should return allocations sorted by group order even when inserted unordered', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 3,
      year: 2026,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'savings',
      allocated: 20_000,
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      allocated: 50_000,
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'wants',
      allocated: 30_000,
    });

    const allocations = await repositoryModule.indexedDbBudgetRepository.getAllocationsByMonth(
      budgetMonth.id,
    );

    expect(allocations.map((allocation) => allocation.group)).toEqual(GROUP_ORDER);

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 3);
    expect(month).not.toBeNull();
    expect(month?.allocations.map((allocation) => allocation.group)).toEqual(GROUP_ORDER);
  });

  it('should keep spent as zero when allocation is created', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 4,
      year: 2026,
    });

    const allocation = await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'wants',
      allocated: 30_000,
    });

    expect(allocation.spent).toBe(0);
  });

  it('should add expense to group spent and keep persistence', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 4,
      year: 2026,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      allocated: 50_000,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'wants',
      allocated: 30_000,
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.addExpenseToAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      amount: 12_345,
    });

    expect(updated.spent).toBe(12_345);

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 4);
    expect(month).not.toBeNull();
    expect(month?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      12_345,
    );
    expect(month?.allocations.find((allocation) => allocation.group === 'wants')?.spent).toBe(0);
  });

  it('should throw when adding expense to missing allocation', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 4,
      year: 2026,
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.addExpenseToAllocation({
        budgetMonthId: budgetMonth.id,
        group: 'needs',
        amount: 500,
      }),
    ).rejects.toThrow(`Allocation not found for month ${budgetMonth.id} and group needs`);
  });

  it('should create expense with description and list month expenses by group', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 5,
      year: 2026,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      allocated: 50_000,
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'wants',
      allocated: 30_000,
    });

    const created = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      amount: 12_345,
      description: 'Supermercado semanal',
    });

    expect(created.description).toBe('Supermercado semanal');
    expect(created.amount).toBe(12_345);

    await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      amount: 4_000,
      description: 'Transporte',
    });

    await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: budgetMonth.id,
      group: 'wants',
      amount: 5_000,
      description: 'Cine',
    });

    const needsExpenses =
      await repositoryModule.indexedDbBudgetRepository.getExpensesByMonthAndGroup(
        budgetMonth.id,
        'needs',
      );
    const wantsExpenses =
      await repositoryModule.indexedDbBudgetRepository.getExpensesByMonthAndGroup(
        budgetMonth.id,
        'wants',
      );

    expect(needsExpenses).toHaveLength(2);
    expect(needsExpenses.map((expense) => expense.description)).toEqual(
      expect.arrayContaining(['Supermercado semanal', 'Transporte']),
    );
    expect(wantsExpenses).toHaveLength(1);
    expect(wantsExpenses[0]?.description).toBe('Cine');

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 5);
    expect(month?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      16_345,
    );
    expect(month?.allocations.find((allocation) => allocation.group === 'wants')?.spent).toBe(
      5_000,
    );

    const yearExpenses = await repositoryModule.indexedDbBudgetRepository.getExpensesByYear(
      budgetYear.id,
    );
    expect(yearExpenses.map((expense) => expense.description).sort()).toEqual([
      'Cine',
      'Supermercado semanal',
      'Transporte',
    ]);

    const otherYear = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2027,
      'USD',
    );
    expect(
      await repositoryModule.indexedDbBudgetRepository.getExpensesByYear(otherYear.budgetYear.id),
    ).toEqual([]);
  });

  it('should update and delete expense while keeping allocation spent in sync', async () => {
    const { repositoryModule } = await loadModules();

    const budgetYear = await repositoryModule.indexedDbBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    const budgetMonth = await repositoryModule.indexedDbBudgetRepository.createBudgetMonth({
      budgetYearId: budgetYear.id,
      month: 6,
      year: 2026,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      allocated: 50_000,
    });

    const created = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: budgetMonth.id,
      group: 'needs',
      amount: 10_000,
      description: 'Compra 1',
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: created.id,
      amount: 15_000,
      description: 'Compra editada',
    });

    expect(updated.amount).toBe(15_000);
    expect(updated.description).toBe('Compra editada');

    let month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 6);
    expect(month?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      15_000,
    );

    await repositoryModule.indexedDbBudgetRepository.deleteExpense({ expenseId: created.id });

    month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 6);
    expect(month?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(0);

    const expenses = await repositoryModule.indexedDbBudgetRepository.getExpensesByMonthAndGroup(
      budgetMonth.id,
      'needs',
    );
    expect(expenses).toHaveLength(0);
  });

  it('should update non-recurring expense group and category and rebalance allocations', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month6 = result.months[5];

    const created = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month6!.id,
      group: 'needs',
      categoryId: 'housing',
      amount: 10_000,
      description: 'Compra 1',
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: created.id,
      amount: 10_000,
      description: 'Compra editada',
      group: 'wants',
      categoryId: 'shopping',
    });

    expect(updated.group).toBe('wants');
    expect(updated.categoryId).toBe('shopping');

    const monthAfter = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(monthAfter?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      0,
    );
    expect(monthAfter?.allocations.find((allocation) => allocation.group === 'wants')?.spent).toBe(
      10_000,
    );
  });

  it('should throw when updating a missing expense', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateExpense({
        expenseId: 'missing-expense',
        amount: 1_000,
        description: 'Nada',
      }),
    ).rejects.toThrow('Expense not found with id missing-expense');
  });

  it('should reject updating expense when default category does not belong to selected group', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month6 = result.months[5];

    const created = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month6!.id,
      group: 'needs',
      categoryId: 'housing',
      amount: 10_000,
      description: 'Compra 1',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateExpense({
        expenseId: created.id,
        amount: 10_000,
        description: 'Compra editada',
        group: 'wants',
        categoryId: 'housing',
      }),
    ).rejects.toThrow('Category housing does not belong to group wants');
  });

  it('should throw when deleting a missing expense', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.deleteExpense({ expenseId: 'missing-expense' }),
    ).rejects.toThrow('Expense not found with id missing-expense');
  });

  it('should create recurring expense from selected month and apply updates/deletes only to future months', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month5 = result.months[4];

    const recurring = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month5!.id,
      group: 'needs',
      amount: 10_000,
      description: 'Renta',
      isRecurring: true,
    });

    expect(recurring.recurringRuleId).not.toBeNull();

    const month4Before = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      4,
    );
    const month5AfterCreate = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6AfterCreate = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(
      month4Before?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(0);
    expect(
      month5AfterCreate?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(10_000);
    expect(
      month6AfterCreate?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(10_000);

    await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: recurring.id,
      amount: 12_000,
      description: 'Renta actualizada',
    });

    const month5AfterUpdate = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6AfterUpdate = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(
      month5AfterUpdate?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(12_000);
    expect(
      month6AfterUpdate?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(12_000);

    await repositoryModule.indexedDbBudgetRepository.deleteExpense({ expenseId: recurring.id });

    const month4AfterDelete = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      4,
    );
    const month5AfterDelete = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );

    expect(
      month4AfterDelete?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(0);
    expect(
      month5AfterDelete?.allocations.find((allocation) => allocation.group === 'needs')?.spent,
    ).toBe(0);

    const month5Expenses =
      await repositoryModule.indexedDbBudgetRepository.getExpensesByMonthAndGroup(
        month5!.id,
        'needs',
      );
    expect(month5Expenses).toHaveLength(0);
  });

  it('should update recurring expense in January and keep operation valid', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const january = result.months[0];

    const recurring = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: january!.id,
      group: 'needs',
      amount: 9_000,
      description: 'Suscripcion',
      isRecurring: true,
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: recurring.id,
      amount: 10_000,
      description: 'Suscripcion actualizada',
    });

    expect(updated.amount).toBe(10_000);
  });

  it('should update recurring expense group and category for current and future months', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month5 = result.months[4];

    const recurring = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month5!.id,
      group: 'needs',
      categoryId: 'housing',
      amount: 10_000,
      description: 'Renta',
      isRecurring: true,
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: recurring.id,
      amount: 12_000,
      description: 'Renta actualizada',
      group: 'wants',
      categoryId: 'shopping',
    });

    expect(updated.group).toBe('wants');
    expect(updated.categoryId).toBe('shopping');

    const month5After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(month5After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      0,
    );
    expect(month5After?.allocations.find((allocation) => allocation.group === 'wants')?.spent).toBe(
      12_000,
    );
    expect(month6After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      0,
    );
    expect(month6After?.allocations.find((allocation) => allocation.group === 'wants')?.spent).toBe(
      12_000,
    );
  });

  it('should update only current month when recurring expense uses applyToFuture false', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month5 = result.months[4];

    const recurring = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month5!.id,
      group: 'needs',
      amount: 10_000,
      description: 'Renta',
      isRecurring: true,
    });

    await repositoryModule.indexedDbBudgetRepository.updateExpense({
      expenseId: recurring.id,
      amount: 11_000,
      description: 'Renta puntual',
      applyToFuture: false,
    });

    const month5After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(month5After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      11_000,
    );
    expect(month6After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      10_000,
    );
  });

  it('should delete only current month when recurring expense uses applyToFuture false', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    const month5 = result.months[4];

    const recurring = await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month5!.id,
      group: 'needs',
      amount: 10_000,
      description: 'Renta',
      isRecurring: true,
    });

    await repositoryModule.indexedDbBudgetRepository.deleteExpense({
      expenseId: recurring.id,
      applyToFuture: false,
    });

    const month5After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6After = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(month5After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      0,
    );
    expect(month6After?.allocations.find((allocation) => allocation.group === 'needs')?.spent).toBe(
      10_000,
    );
  });

  it('should throw when creating recurring expense with missing month', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.addExpense({
        budgetMonthId: 'missing-month',
        group: 'needs',
        amount: 1_000,
        description: 'Invalido',
        isRecurring: true,
      }),
    ).rejects.toThrow('Budget month not found with id missing-month');
  });

  it('should floor allocation values for non-divisible incomes', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      101,
      2026,
      'USD',
    );
    const month = result.months[0];

    expect(month?.allocations[0]?.allocated).toBe(50);
    expect(month?.allocations[1]?.allocated).toBe(30);
    expect(month?.allocations[2]?.allocated).toBe(20);
  });

  it('should update monthly income from selected month for current year only', async () => {
    const { repositoryModule } = await loadModules();

    const result = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );

    await repositoryModule.indexedDbBudgetRepository.updateMonthlyIncomeFromMonth({
      budgetYearId: result.budgetYear.id,
      fromMonth: 6,
      monthlyIncome: 120_000,
      split: result.budgetYear.split,
    });

    const month5 = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      5,
    );
    const month6 = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      result.budgetYear.id,
      6,
    );

    expect(month5?.monthlyIncome).toBe(100_000);
    expect(month6?.monthlyIncome).toBe(120_000);
    expect(month6?.allocations.find((allocation) => allocation.group === 'needs')?.allocated).toBe(
      60_000,
    );
    expect(month6?.allocations.find((allocation) => allocation.group === 'wants')?.allocated).toBe(
      36_000,
    );
    expect(
      month6?.allocations.find((allocation) => allocation.group === 'savings')?.allocated,
    ).toBe(24_000);
  });

  it('should default the split when creating a year without one, then persist a custom split', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    expect(created.budgetYear.split).toEqual({ needs: 50, wants: 30, savings: 20 });

    await repositoryModule.indexedDbBudgetRepository.updateBudgetSplitForYear({
      budgetYearId: created.budgetYear.id,
      split: { needs: 60, wants: 25, savings: 15 },
    });

    const reloaded = await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2026);
    expect(reloaded?.split).toEqual({ needs: 60, wants: 25, savings: 15 });

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(
      created.budgetYear.id,
      1,
    );
    expect(month?.allocations.find((a) => a.group === 'needs')?.allocated).toBe(60_000);
    expect(month?.allocations.find((a) => a.group === 'wants')?.allocated).toBe(25_000);
    expect(month?.allocations.find((a) => a.group === 'savings')?.allocated).toBe(15_000);
  });

  it('should build a year with a custom split from creation', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2027,
      'EUR',
      { needs: 40, wants: 40, savings: 20 },
    );

    expect(created.months[0]?.allocations.find((a) => a.group === 'wants')?.allocated).toBe(40_000);
  });

  it('should expose default categories by group', async () => {
    const { repositoryModule } = await loadModules();

    const categories =
      await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup('needs');
    const categoriesSecondRead =
      await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup('needs');

    expect(categories).toHaveLength(3);
    expect(categories.map((category) => category.id)).toEqual(['housing', 'food', 'transport']);
    expect(categoriesSecondRead.map((category) => category.id)).toEqual([
      'housing',
      'food',
      'transport',
    ]);
  });

  it('should create custom category and keep it active in selected group', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });
    const categories =
      await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup('needs');

    expect(created.group).toBe('needs');
    expect(created.isDefault).toBe(false);
    expect(created.isActive).toBe(true);
    expect(created.name).toBe('Mascotas');
    expect(categories.some((category) => category.name === 'Mascotas')).toBe(true);
  });

  it('should reject creating duplicate custom category name in same group', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.createCategory({
        group: 'needs',
        name: 'Mascotas',
      }),
    ).rejects.toThrow('Category name Mascotas already exists in group needs');
  });

  it('should reject creating custom category with empty name', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.createCategory({
        group: 'needs',
        name: '   ',
      }),
    ).rejects.toThrow('Category name cannot be empty');
  });

  it('should update custom category name', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });

    await repositoryModule.indexedDbBudgetRepository.updateCategoryName({
      group: 'needs',
      categoryId: created.id,
      name: 'Mascotas y veterinaria',
    });

    const categories =
      await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup('needs');
    expect(categories.find((category) => category.id === created.id)?.name).toBe(
      'Mascotas y veterinaria',
    );
  });

  it('should reject updating inactive category name', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });

    await repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: created.id,
      replacementCategoryId: 'housing',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: created.id,
        name: 'Mascotas y veterinaria',
      }),
    ).rejects.toThrow(`Category ${created.id} does not belong to group needs`);
  });

  it('should reject updating category name when new name is empty', async () => {
    const { repositoryModule } = await loadModules();

    const created = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: created.id,
        name: '   ',
      }),
    ).rejects.toThrow('Category name cannot be empty');
  });

  it('should reject renaming default category', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: 'housing',
        name: 'Casa principal',
      }),
    ).rejects.toThrow('Default category housing cannot be renamed');
  });

  it('should reject renaming custom category to duplicate name', async () => {
    const { repositoryModule } = await loadModules();

    const first = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });
    const second = await repositoryModule.indexedDbBudgetRepository.createCategory({
      group: 'needs',
      name: 'Deportes',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: second.id,
        name: first.name ?? 'Mascotas',
      }),
    ).rejects.toThrow('Category name Mascotas already exists in group needs');
  });

  it('should reject expense when category does not belong to group', async () => {
    const { repositoryModule } = await loadModules();
    const budget = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    const month = budget.months[0];

    await expect(
      repositoryModule.indexedDbBudgetRepository.addExpense({
        budgetMonthId: month!.id,
        group: 'needs',
        categoryId: 'shopping',
        amount: 5_000,
        description: 'Invalido',
      }),
    ).rejects.toThrow('Category shopping does not belong to group needs');
  });

  it('should soft delete category and hide it from active list', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });

    const activeCategories =
      await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup('needs');
    const allCategories = await repositoryModule.indexedDbBudgetRepository.getCategoriesByGroup(
      'needs',
      { includeInactive: true },
    );

    expect(activeCategories.map((category) => category.id)).toEqual(['housing', 'transport']);
    expect(allCategories.find((category) => category.id === 'food')?.isActive).toBe(false);
  });

  it('should reject soft delete when replacement equals target', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'food',
      }),
    ).rejects.toThrow('Replacement category must be different from category to delete');
  });

  it('should reject soft delete when replacement is invalid for group', async () => {
    const { repositoryModule } = await loadModules();

    await expect(
      repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'shopping',
      }),
    ).rejects.toThrow('Replacement category shopping does not belong to group needs');
  });

  it('should reject soft delete when category is already inactive', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'housing',
      }),
    ).rejects.toThrow('Category food does not belong to group needs');
  });

  it('should reject addExpense when selected category is inactive', async () => {
    const { repositoryModule } = await loadModules();
    const budget = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    const month = budget.months[0];

    await repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });

    await expect(
      repositoryModule.indexedDbBudgetRepository.addExpense({
        budgetMonthId: month!.id,
        group: 'needs',
        categoryId: 'food',
        amount: 1_000,
        description: 'Categoria inactiva',
      }),
    ).rejects.toThrow('Category food does not belong to group needs');
  });

  it('should reassign recurring rules and expenses on soft delete', async () => {
    const { repositoryModule } = await loadModules();
    const budget = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    const month = budget.months[0];

    await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month!.id,
      group: 'needs',
      categoryId: 'food',
      amount: 4_000,
      description: 'Supermercado',
      isRecurring: true,
    });

    await repositoryModule.indexedDbBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });

    const expenses = await repositoryModule.indexedDbBudgetRepository.getExpensesByMonthAndGroup(
      month!.id,
      'needs',
    );
    expect(expenses[0]?.categoryId).toBe('housing');
  });

  it('should export and import full snapshot with replace-all behavior', async () => {
    const { repositoryModule } = await loadModules();

    const base = await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    const month = base.months[0];
    await repositoryModule.indexedDbBudgetRepository.addExpense({
      budgetMonthId: month!.id,
      group: 'needs',
      amount: 5_000,
      description: 'Base expense',
    });

    const snapshot = await repositoryModule.indexedDbBudgetRepository.exportDatabase();
    expect(snapshot.meta.format).toBe('triada-db-export');
    expect(snapshot.meta.schemaVersion).toBe(1);
    expect(snapshot.data.budget_years.length).toBeGreaterThan(0);

    await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      200_000,
      2027,
      'EUR',
    );
    expect(
      await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2027),
    ).not.toBeNull();

    await repositoryModule.indexedDbBudgetRepository.importDatabase(snapshot);

    expect(await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2027)).toBeNull();
    expect(
      await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2026),
    ).not.toBeNull();
  });

  it('should reject invalid snapshot and keep data intact', async () => {
    const { repositoryModule } = await loadModules();

    await repositoryModule.indexedDbBudgetRepository.createYearWithAllocations(
      100_000,
      2026,
      'USD',
    );
    const before = await repositoryModule.indexedDbBudgetRepository.exportDatabase();

    const invalidSnapshot = {
      ...before,
      meta: {
        ...before.meta,
        schemaVersion: 999,
      },
    };

    await expect(
      repositoryModule.indexedDbBudgetRepository.importDatabase(invalidSnapshot),
    ).rejects.toThrow('Invalid snapshot: unsupported schema version 999');

    expect(
      await repositoryModule.indexedDbBudgetRepository.getBudgetYearByYear(2026),
    ).not.toBeNull();
  });

  it('should import manual snapshot including recurring rules and categories', async () => {
    const { repositoryModule } = await loadModules();

    const snapshot = {
      meta: {
        format: 'triada-db-export',
        schemaVersion: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
      },
      data: {
        budget_years: [
          {
            id: 'year-1',
            monthly_income: 100000,
            year: 2026,
            currency: 'USD',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        budget_months: [
          {
            id: 'month-1',
            budget_year_id: 'year-1',
            month: 1,
            year: 2026,
            monthly_income: 100000,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        budget_allocations: [
          {
            id: 'allocation-1',
            budget_month_id: 'month-1',
            group: 'needs',
            allocated: 50000,
            spent: 1000,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        budget_expenses: [
          {
            id: 'expense-1',
            budget_month_id: 'month-1',
            group: 'needs',
            category_id: 'housing',
            amount: 1000,
            description: 'Sample expense',
            recurring_rule_id: 'rule-1',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        recurring_expense_rules: [
          {
            id: 'rule-1',
            budget_year_id: 'year-1',
            group: 'needs',
            category_id: 'housing',
            amount: 1000,
            description: 'Sample recurring rule',
            start_year: 2026,
            start_month: 1,
            end_year: null,
            end_month: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        expense_categories: [
          {
            id: 'housing',
            group: 'needs',
            order: 0,
            name: 'Housing',
            is_default: true,
            is_active: true,
            deleted_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    await repositoryModule.indexedDbBudgetRepository.importDatabase(snapshot);
    const exported = await repositoryModule.indexedDbBudgetRepository.exportDatabase();

    expect(exported.data.recurring_expense_rules).toHaveLength(1);
    expect(exported.data.expense_categories).toHaveLength(1);
  });

  it('should import sqlite category snapshot shape and normalize fields', async () => {
    const { repositoryModule } = await loadModules();

    const snapshot = {
      meta: {
        format: 'triada-db-export',
        schemaVersion: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
      },
      data: {
        budget_years: [],
        budget_months: [],
        budget_allocations: [],
        budget_expenses: [],
        recurring_expense_rules: [],
        expense_categories: [
          {
            id: 'housing',
            group_name: 'needs',
            order_index: 0,
            name: null,
            is_default: 1,
            is_active: 1,
            deleted_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    await repositoryModule.indexedDbBudgetRepository.importDatabase(snapshot);
    const exported = await repositoryModule.indexedDbBudgetRepository.exportDatabase();

    expect(exported.data.expense_categories).toEqual([
      expect.objectContaining({
        id: 'housing',
        group: 'needs',
        order: 0,
        is_default: true,
        is_active: true,
      }),
    ]);
  });

  it('should fallback category flags to false for unsupported values', async () => {
    const { repositoryModule } = await loadModules();

    const snapshot = {
      meta: {
        format: 'triada-db-export',
        schemaVersion: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
      },
      data: {
        budget_years: [],
        budget_months: [],
        budget_allocations: [],
        budget_expenses: [],
        recurring_expense_rules: [],
        expense_categories: [
          {
            id: 'housing',
            group: 'needs',
            order: 0,
            name: null,
            is_default: 'x',
            is_active: undefined,
            deleted_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    await repositoryModule.indexedDbBudgetRepository.importDatabase(snapshot);
    const exported = await repositoryModule.indexedDbBudgetRepository.exportDatabase();

    expect(exported.data.expense_categories).toEqual([
      expect.objectContaining({
        is_default: false,
        is_active: false,
      }),
    ]);
  });
});
