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
  updateBudgetSplitForYear: vi.fn(),
  getExpensesByMonthAndGroup: vi.fn(),
  getExpensesByYear: vi.fn(),
  getCategoriesByGroup: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
  softDeleteCategoryAndReassign: vi.fn(),
  getAllocationsByMonth: vi.fn(),
  createYearWithAllocations: vi.fn(),
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
};

describe('data/repositories BudgetRepository facade', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock('./BudgetRepository.indexeddb', () => ({
      indexedDbBudgetRepository: indexedDbRepositoryMock,
    }));
  });

  it('re-exports every IndexedDB repository operation unchanged', async () => {
    const repository = await import('./BudgetRepository');

    for (const name of Object.keys(indexedDbRepositoryMock) as Array<
      keyof typeof indexedDbRepositoryMock
    >) {
      expect(repository[name]).toBe(indexedDbRepositoryMock[name]);
    }
  });

  describe('budgetExists', () => {
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
});
