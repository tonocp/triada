import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexedDbRepositoryMock = {
  createBudgetYear: vi.fn(),
  getLatestBudgetYear: vi.fn(),
  getBudgetYearByYear: vi.fn(),
  createBudgetMonth: vi.fn(),
  getBudgetMonth: vi.fn(),
  createBudgetAllocation: vi.fn(),
  getAllocationsByMonth: vi.fn(),
  createYearWithAllocations: vi.fn(),
};

const sqliteRepositoryMock = {
  createBudgetYear: vi.fn(),
  getLatestBudgetYear: vi.fn(),
  getBudgetYearByYear: vi.fn(),
  createBudgetMonth: vi.fn(),
  getBudgetMonth: vi.fn(),
  createBudgetAllocation: vi.fn(),
  getAllocationsByMonth: vi.fn(),
  createYearWithAllocations: vi.fn(),
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
});
