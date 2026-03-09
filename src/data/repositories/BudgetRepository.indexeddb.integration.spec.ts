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
      allocations: Array<{
        bucket: 'needs' | 'wants' | 'savings';
        allocated: number;
        spent: number;
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
      spent: number;
    }>;
    addExpenseToAllocation: (input: {
      budgetMonthId: string;
      bucket: 'needs' | 'wants' | 'savings';
      amount: number;
    }) => Promise<{
      id: string;
      budgetMonthId: string;
      bucket: 'needs' | 'wants' | 'savings';
      allocated: number;
      spent: number;
    }>;
    getAllocationsByMonth: (budgetMonthId: string) => Promise<
      Array<{
        bucket: 'needs' | 'wants' | 'savings';
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
        month: number;
        allocations: Array<{
          bucket: 'needs' | 'wants' | 'savings';
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
    expect(firstMonth?.allocations.map((allocation) => allocation.bucket)).toEqual(BUCKET_ORDER);

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
      bucket: 'wants',
      allocated: 30_000,
    });

    expect(allocation.spent).toBe(0);
  });

  it('should add expense to bucket spent and keep persistence', async () => {
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
      bucket: 'needs',
      allocated: 50_000,
    });

    await repositoryModule.indexedDbBudgetRepository.createBudgetAllocation({
      budgetMonthId: budgetMonth.id,
      bucket: 'wants',
      allocated: 30_000,
    });

    const updated = await repositoryModule.indexedDbBudgetRepository.addExpenseToAllocation({
      budgetMonthId: budgetMonth.id,
      bucket: 'needs',
      amount: 12_345,
    });

    expect(updated.spent).toBe(12_345);

    const month = await repositoryModule.indexedDbBudgetRepository.getBudgetMonth(budgetYear.id, 4);
    expect(month).not.toBeNull();
    expect(month?.allocations.find((allocation) => allocation.bucket === 'needs')?.spent).toBe(
      12_345,
    );
    expect(month?.allocations.find((allocation) => allocation.bucket === 'wants')?.spent).toBe(0);
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
        bucket: 'needs',
        amount: 500,
      }),
    ).rejects.toThrow(`Allocation not found for month ${budgetMonth.id} and bucket needs`);
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
});
