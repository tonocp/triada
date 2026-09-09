import { indexedDbBudgetRepository } from './BudgetRepository.indexeddb';

// Triada is a web-only PWA — IndexedDB is the only backend. `BudgetRepository`
// (the interface annotating `indexedDbBudgetRepository`) is the contract; UI code
// reaches these operations through the barrel, never the impl module directly.
export const {
  createBudgetYear,
  getLatestBudgetYear,
  getBudgetYearByYear,
  createBudgetMonth,
  getBudgetMonth,
  createBudgetAllocation,
  addExpenseToAllocation,
  addExpense,
  updateExpense,
  deleteExpense,
  updateMonthlyIncomeFromMonth,
  updateBudgetSplitForYear,
  getExpensesByMonthAndGroup,
  getExpensesByYear,
  getCategoriesByGroup,
  createCategory,
  updateCategoryName,
  softDeleteCategoryAndReassign,
  getAllocationsByMonth,
  createYearWithAllocations,
  exportDatabase,
  importDatabase,
} = indexedDbBudgetRepository;

/**
 * Whether a usable budget already exists. `getLatestBudgetYear()` only resolves
 * a year that has at least one month, so its presence is the full answer. Used
 * by the router first-run guard and to skip the setup screen.
 */
export async function budgetExists(): Promise<boolean> {
  return (await getLatestBudgetYear()) !== null;
}
