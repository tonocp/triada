import type {
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import { Capacitor } from '@capacitor/core';
import { indexedDbBudgetRepository } from './BudgetRepository.indexeddb';
import { sqliteBudgetRepository } from './BudgetRepository.sqlite';
import type { BudgetRepository } from './BudgetRepository.types';

let repository: BudgetRepository | null = null;

function getRepository(): BudgetRepository {
  if (repository) {
    return repository;
  }

  repository = Capacitor.isNativePlatform() ? sqliteBudgetRepository : indexedDbBudgetRepository;
  return repository;
}

export async function createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear> {
  return getRepository().createBudgetYear(input);
}

export async function getLatestBudgetYear(): Promise<BudgetYear | null> {
  return getRepository().getLatestBudgetYear();
}

export async function createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
  return getRepository().createBudgetMonth(input);
}

export async function getBudgetMonth(
  budgetYearId: string,
  month: number,
): Promise<BudgetMonth | null> {
  return getRepository().getBudgetMonth(budgetYearId, month);
}

export async function createBudgetAllocation(
  input: CreateBudgetAllocationInput,
): Promise<BudgetAllocation> {
  return getRepository().createBudgetAllocation(input);
}

export async function getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
  return getRepository().getAllocationsByMonth(budgetMonthId);
}

export async function createYearWithAllocations(
  monthlyIncome: number,
  year: number,
  currency: SupportedCurrency,
): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
  return getRepository().createYearWithAllocations(monthlyIncome, year, currency);
}
