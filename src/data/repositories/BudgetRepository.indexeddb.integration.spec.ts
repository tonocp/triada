import { GROUP_ORDER } from '@/domain/entities';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface IndexedDbRepositoryModule {
  indexedDbBudgetRepository: {
    createBudgetYear: (input: {
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
    }) => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      createdAt: string;
      updatedAt: string;
    }>;
    getLatestBudgetYear: () => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      createdAt: string;
      updatedAt: string;
    } | null>;
    getBudgetYearByYear: (year: number) => Promise<{
      id: string;
      monthlyIncome: number;
      year: number;
      currency: 'USD' | 'EUR';
      createdAt: string;
      updatedAt: string;
    } | null>;
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
      applyToFuture?: boolean;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      group: 'needs' | 'wants' | 'savings';
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
    getCategoriesByGroup: (
      group: 'needs' | 'wants' | 'savings',
    ) => Promise<
      Array<{ id: string; group: 'needs' | 'wants' | 'savings'; order: number; isDefault: boolean }>
    >;
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
    ) => Promise<{
      budgetYear: {
        id: string;
        monthlyIncome: number;
        year: number;
        currency: 'USD' | 'EUR';
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
});
