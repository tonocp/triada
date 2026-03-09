import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
const runMock = vi.fn();
const generateUUIDMock = vi.fn();
const getCurrentTimestampMock = vi.fn();

describe('data/repositories BudgetRepository.sqlite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    queryMock.mockReset();
    runMock.mockReset();

    generateUUIDMock
      .mockReturnValueOnce('year-id')
      .mockReturnValueOnce('month-id')
      .mockReturnValueOnce('allocation-id');
    getCurrentTimestampMock.mockReturnValue('2026-01-01T00:00:00.000Z');

    vi.doMock('@/data/database/database', () => ({
      query: queryMock,
      run: runMock,
    }));

    vi.doMock('@/data/database/utils', () => ({
      generateUUID: generateUUIDMock,
      getCurrentTimestamp: getCurrentTimestampMock,
    }));
  });

  it('should create budget year with persisted values', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.createBudgetYear({
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'year-id',
      monthlyIncome: 100_000,
      year: 2026,
      currency: 'USD',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('should return null when latest budget year is missing', async () => {
    queryMock.mockResolvedValueOnce([]);
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getLatestBudgetYear();

    expect(result).toBeNull();
  });

  it('should map latest budget year from database row', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'year-id',
        monthly_income: 100_000,
        year: 2026,
        currency: 'EUR',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const result = await sqliteBudgetRepository.getLatestBudgetYear();

    expect(result?.currency).toBe('EUR');
    expect(result?.monthlyIncome).toBe(100_000);
  });

  it('should return null when budget year by year is missing', async () => {
    queryMock.mockResolvedValueOnce([]);
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getBudgetYearByYear(2026);

    expect(result).toBeNull();
  });

  it('should map budget year by year when row exists', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'year-id',
        monthly_income: 110_000,
        year: 2026,
        currency: 'USD',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getBudgetYearByYear(2026);

    expect(result).toEqual({
      id: 'year-id',
      monthlyIncome: 110_000,
      year: 2026,
      currency: 'USD',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('should return null when budget year query returns undefined row', async () => {
    queryMock.mockResolvedValueOnce([undefined]);
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getBudgetYearByYear(2026);

    expect(result).toBeNull();
  });

  it('should create budget month with empty allocations', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.createBudgetMonth({
      budgetYearId: 'year-id',
      month: 1,
      year: 2026,
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'month-id',
      budgetYearId: 'year-id',
      month: 1,
      year: 2026,
      allocations: [],
    });
  });

  it('should return null when budget month is missing', async () => {
    queryMock.mockResolvedValueOnce([]);
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getBudgetMonth('year-id', 3);

    expect(result).toBeNull();
  });

  it('should load budget month with allocations', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'month-id',
          budget_year_id: 'year-id',
          month: 3,
          year: 2026,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'alloc-1',
          budget_month_id: 'month-id',
          bucket: 'savings',
          allocated: 20_000,
          spent: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'alloc-2',
          budget_month_id: 'month-id',
          bucket: 'needs',
          allocated: 50_000,
          spent: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const result = await sqliteBudgetRepository.getBudgetMonth('year-id', 3);

    expect(result?.allocations.map((item) => item.bucket)).toEqual(['needs', 'savings']);
  });

  it('should create budget allocation with spent set to zero', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.createBudgetAllocation({
      budgetMonthId: 'month-id',
      bucket: 'wants',
      allocated: 30_000,
    });

    expect(result.spent).toBe(0);
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it('should add expense amount to allocation spent', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'alloc-2',
        budget_month_id: 'month-id',
        bucket: 'needs',
        allocated: 50_000,
        spent: 12_345,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.addExpenseToAllocation({
      budgetMonthId: 'month-id',
      bucket: 'needs',
      amount: 12_345,
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result.spent).toBe(12_345);
    expect(result.bucket).toBe('needs');
  });

  it('should throw when adding expense to missing allocation', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.addExpenseToAllocation({
        budgetMonthId: 'month-id',
        bucket: 'needs',
        amount: 500,
      }),
    ).rejects.toThrow('Allocation not found for month month-id and bucket needs');
  });

  it('should return allocations sorted by bucket order', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'alloc-1',
        budget_month_id: 'month-id',
        bucket: 'savings',
        allocated: 20_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'alloc-2',
        budget_month_id: 'month-id',
        bucket: 'needs',
        allocated: 50_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'alloc-3',
        budget_month_id: 'month-id',
        bucket: 'wants',
        allocated: 30_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const result = await sqliteBudgetRepository.getAllocationsByMonth('month-id');

    expect(result.map((item) => item.bucket)).toEqual(['needs', 'wants', 'savings']);
  });

  it('should create full year with 12 months and allocations', async () => {
    const ids = Array.from({ length: 49 }, (_, index) => `id-${index + 1}`);
    generateUUIDMock.mockReset();
    generateUUIDMock.mockImplementation(() => ids.shift());

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.createYearWithAllocations(100_000, 2026, 'USD');

    expect(result.budgetYear.year).toBe(2026);
    expect(result.months).toHaveLength(12);
    expect(result.months[0]?.allocations[0]?.allocated).toBe(50_000);
    expect(result.months[0]?.allocations[1]?.allocated).toBe(30_000);
    expect(result.months[0]?.allocations[2]?.allocated).toBe(20_000);
  });
});
