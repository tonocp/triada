import { indexedDbBudgetRepository } from './BudgetRepository.indexeddb';

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

export async function budgetExists(): Promise<boolean> {
  return (await getLatestBudgetYear()) !== null;
}
