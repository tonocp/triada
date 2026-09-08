import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexedDbRepositoryMock = {
  createBudgetYear: vi.fn(),
  getLatestBudgetYear: vi.fn(),
  getBudgetYearByYear: vi.fn(),
  createBudgetMonth: vi.fn(),
  getBudgetMonth: vi.fn(),
  createBudgetAllocation: vi.fn(),
  addExpenseToAllocation: vi.fn(),
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateMonthlyIncomeFromMonth: vi.fn(),
  getExpensesByMonthAndGroup: vi.fn(),
  getCategoriesByGroup: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
  softDeleteCategoryAndReassign: vi.fn(),
  getAllocationsByMonth: vi.fn(),
  createYearWithAllocations: vi.fn(),
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
};

const sqliteRepositoryMock = {
  createBudgetYear: vi.fn(),
  getLatestBudgetYear: vi.fn(),
  getBudgetYearByYear: vi.fn(),
  createBudgetMonth: vi.fn(),
  getBudgetMonth: vi.fn(),
  createBudgetAllocation: vi.fn(),
  addExpenseToAllocation: vi.fn(),
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateMonthlyIncomeFromMonth: vi.fn(),
  getExpensesByMonthAndGroup: vi.fn(),
  getCategoriesByGroup: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
  softDeleteCategoryAndReassign: vi.fn(),
  getAllocationsByMonth: vi.fn(),
  createYearWithAllocations: vi.fn(),
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
};

const getPlatformMock = vi.fn<() => string>();

describe('data/repositories BudgetRepository facade', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        getPlatform: getPlatformMock,
      },
    }));

    vi.doMock('./BudgetRepository.indexeddb', () => ({
      indexedDbBudgetRepository: indexedDbRepositoryMock,
    }));

    vi.doMock('./BudgetRepository.sqlite', () => ({
      sqliteBudgetRepository: sqliteRepositoryMock,
    }));
  });

  it('should use IndexedDB repository on web platform', async () => {
    getPlatformMock.mockReturnValue('web');
    indexedDbRepositoryMock.getLatestBudgetYear.mockResolvedValue(null);

    const repository = await import('./BudgetRepository');
    await repository.getLatestBudgetYear();

    expect(indexedDbRepositoryMock.getLatestBudgetYear).toHaveBeenCalledTimes(1);
    expect(sqliteRepositoryMock.getLatestBudgetYear).not.toHaveBeenCalled();
  });

  it('should fallback to IndexedDB on unknown platform', async () => {
    getPlatformMock.mockReturnValue('electron');
    indexedDbRepositoryMock.getLatestBudgetYear.mockResolvedValue(null);

    const repository = await import('./BudgetRepository');
    await repository.getLatestBudgetYear();

    expect(indexedDbRepositoryMock.getLatestBudgetYear).toHaveBeenCalledTimes(1);
    expect(sqliteRepositoryMock.getLatestBudgetYear).not.toHaveBeenCalled();
  });

  it('should use SQLite repository on native platforms', async () => {
    getPlatformMock.mockReturnValue('android');
    sqliteRepositoryMock.getLatestBudgetYear.mockResolvedValue(null);

    const repository = await import('./BudgetRepository');
    await repository.getLatestBudgetYear();

    expect(sqliteRepositoryMock.getLatestBudgetYear).toHaveBeenCalledTimes(1);
    expect(indexedDbRepositoryMock.getLatestBudgetYear).not.toHaveBeenCalled();
  });

  it('should resolve repository once and reuse it across calls', async () => {
    getPlatformMock.mockReturnValue('ios');
    sqliteRepositoryMock.getLatestBudgetYear.mockResolvedValue(null);
    sqliteRepositoryMock.getBudgetYearByYear.mockResolvedValue(null);

    const repository = await import('./BudgetRepository');

    await repository.getLatestBudgetYear();
    await repository.getBudgetYearByYear(2026);

    expect(getPlatformMock).toHaveBeenCalledTimes(1);
    expect(sqliteRepositoryMock.getLatestBudgetYear).toHaveBeenCalledTimes(1);
    expect(sqliteRepositoryMock.getBudgetYearByYear).toHaveBeenCalledWith(2026);
  });

  describe('budgetExists', () => {
    beforeEach(() => {
      getPlatformMock.mockReturnValue('web');
    });

    it('should be false when getLatestBudgetYear resolves null', async () => {
      indexedDbRepositoryMock.getLatestBudgetYear.mockResolvedValue(null);

      const repository = await import('./BudgetRepository');

      expect(await repository.budgetExists()).toBe(false);
    });

    it('should be true when getLatestBudgetYear resolves a year', async () => {
      indexedDbRepositoryMock.getLatestBudgetYear.mockResolvedValue({ id: 'year-1', year: 2026 });

      const repository = await import('./BudgetRepository');

      expect(await repository.budgetExists()).toBe(true);
    });
  });

  it('should delegate all facade operations with same arguments', async () => {
    getPlatformMock.mockReturnValue('web');

    const repository = await import('./BudgetRepository');

    const yearInput = { monthlyIncome: 100_000, year: 2026, currency: 'USD' as const };
    const monthInput = { budgetYearId: 'year-1', month: 4, year: 2026 };
    const allocationInput = {
      budgetMonthId: 'month-1',
      group: 'needs' as const,
      allocated: 50_000,
    };
    const expenseInput = {
      budgetMonthId: 'month-1',
      group: 'needs' as const,
      amount: 12_345,
    };
    const newExpenseInput = {
      budgetMonthId: 'month-1',
      group: 'needs' as const,
      categoryId: 'food' as const,
      amount: 12_345,
      description: 'Supermercado',
    };
    const updateExpenseInput = {
      expenseId: 'expense-1',
      amount: 10_000,
      description: 'Compra semanal',
    };

    await repository.createBudgetYear(yearInput);
    await repository.getBudgetYearByYear(2026);
    await repository.createBudgetMonth(monthInput);
    await repository.getBudgetMonth('year-1', 4);
    await repository.createBudgetAllocation(allocationInput);
    await repository.addExpenseToAllocation(expenseInput);
    await repository.addExpense(newExpenseInput);
    await repository.updateExpense(updateExpenseInput);
    await repository.deleteExpense({ expenseId: 'expense-1', applyToFuture: true });
    await repository.updateMonthlyIncomeFromMonth({
      budgetYearId: 'year-1',
      fromMonth: 4,
      monthlyIncome: 120_000,
    });
    await repository.getExpensesByMonthAndGroup('month-1', 'needs');
    await repository.getCategoriesByGroup('needs');
    await repository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });
    await repository.updateCategoryName({
      group: 'needs',
      categoryId: 'pets',
      name: 'Mascotas y veterinaria',
    });
    await repository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });
    await repository.getAllocationsByMonth('month-1');
    await repository.createYearWithAllocations(100_000, 2026, 'USD');
    await repository.exportDatabase();
    await repository.importDatabase({});

    expect(indexedDbRepositoryMock.createBudgetYear).toHaveBeenCalledWith(yearInput);
    expect(indexedDbRepositoryMock.getBudgetYearByYear).toHaveBeenCalledWith(2026);
    expect(indexedDbRepositoryMock.createBudgetMonth).toHaveBeenCalledWith(monthInput);
    expect(indexedDbRepositoryMock.getBudgetMonth).toHaveBeenCalledWith('year-1', 4);
    expect(indexedDbRepositoryMock.createBudgetAllocation).toHaveBeenCalledWith(allocationInput);
    expect(indexedDbRepositoryMock.addExpenseToAllocation).toHaveBeenCalledWith(expenseInput);
    expect(indexedDbRepositoryMock.addExpense).toHaveBeenCalledWith(newExpenseInput);
    expect(indexedDbRepositoryMock.updateExpense).toHaveBeenCalledWith(updateExpenseInput);
    expect(indexedDbRepositoryMock.deleteExpense).toHaveBeenCalledWith({
      expenseId: 'expense-1',
      applyToFuture: true,
    });
    expect(indexedDbRepositoryMock.updateMonthlyIncomeFromMonth).toHaveBeenCalledWith({
      budgetYearId: 'year-1',
      fromMonth: 4,
      monthlyIncome: 120_000,
    });
    expect(indexedDbRepositoryMock.getExpensesByMonthAndGroup).toHaveBeenCalledWith(
      'month-1',
      'needs',
    );
    expect(indexedDbRepositoryMock.getCategoriesByGroup).toHaveBeenCalledWith('needs', undefined);
    expect(indexedDbRepositoryMock.createCategory).toHaveBeenCalledWith({
      group: 'needs',
      name: 'Mascotas',
    });
    expect(indexedDbRepositoryMock.updateCategoryName).toHaveBeenCalledWith({
      group: 'needs',
      categoryId: 'pets',
      name: 'Mascotas y veterinaria',
    });
    expect(indexedDbRepositoryMock.softDeleteCategoryAndReassign).toHaveBeenCalledWith({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });
    expect(indexedDbRepositoryMock.getAllocationsByMonth).toHaveBeenCalledWith('month-1');
    expect(indexedDbRepositoryMock.createYearWithAllocations).toHaveBeenCalledWith(
      100_000,
      2026,
      'USD',
    );
    expect(indexedDbRepositoryMock.exportDatabase).toHaveBeenCalledWith();
    expect(indexedDbRepositoryMock.importDatabase).toHaveBeenCalledWith({});
  });
});
