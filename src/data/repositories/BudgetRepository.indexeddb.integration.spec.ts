import { BUCKET_ORDER } from '@/domain/entities';
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
    createBudgetMonth: (input: { budgetYearId: string; month: number; year: number }) => Promise<{
      id: string;
      budgetYearId: string;
      month: number;
      year: number;
      allocations: Array<{
        bucket: 'needs' | 'wants' | 'savings';
        allocated: number;
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
      allocations: Array<{
        bucket: 'needs' | 'wants' | 'savings';
        allocated: number;
      }>;
    } | null>;
    createBudgetAllocation: (input: {
      budgetMonthId: string;
      bucket: 'needs' | 'wants' | 'savings';
      allocated: number;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      bucket: 'needs' | 'wants' | 'savings';
      allocated: number;
    }>;
    getAllocationsByMonth: (budgetMonthId: string) => Promise<
      Array<{
        bucket: 'needs' | 'wants' | 'savings';
        allocated: number;
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
        month: number;
        allocations: Array<{
          bucket: 'needs' | 'wants' | 'savings';
          allocated: number;
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
    expect(firstMonth?.allocations.map((allocation) => allocation.bucket)).toEqual(BUCKET_ORDER);

    expect(firstMonth?.allocations[0]?.allocated).toBe(50_000);
    expect(firstMonth?.allocations[1]?.allocated).toBe(30_000);
    expect(firstMonth?.allocations[2]?.allocated).toBe(20_000);
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

  it('should return allocations sorted by bucket order even when inserted unordered', async () => {
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
      bucket: 'savings',
      allocated: 20_000,
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      bucket: 'needs',
      allocated: 50_000,
    });
    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      bucket: 'wants',
      allocated: 30_000,
    });

    const allocations = await repositoryModule.indexedDbBudgetRepository.getAllocationsByMonth(
      budgetMonth.id,
    );

    expect(allocations.map((allocation) => allocation.bucket)).toEqual(BUCKET_ORDER);

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 3);
    expect(month).not.toBeNull();
    expect(month?.allocations.map((allocation) => allocation.bucket)).toEqual(BUCKET_ORDER);
  });
});
