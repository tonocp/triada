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
      .mockReturnValueOnce('allocation-id')
      .mockReturnValueOnce('expense-id');
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
    queryMock.mockResolvedValueOnce([{ monthly_income: 100_000 }]);
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
      monthlyIncome: 100_000,
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
          monthly_income: 100_000,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'alloc-1',
          budget_month_id: 'month-id',
          group: 'savings',
          allocated: 20_000,
          spent: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'alloc-2',
          budget_month_id: 'month-id',
          group: 'needs',
          allocated: 50_000,
          spent: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const result = await sqliteBudgetRepository.getBudgetMonth('year-id', 3);

    expect(result?.monthlyIncome).toBe(100_000);
    expect(result?.allocations.map((item) => item.group)).toEqual(['needs', 'savings']);
  });

  it('should update monthly income from month and recalculate allocations without changing spent', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'month-6' }, { id: 'month-7' }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.updateMonthlyIncomeFromMonth({
      budgetYearId: 'year-id',
      fromMonth: 6,
      monthlyIncome: 120_000,
    });

    expect(runMock).toHaveBeenCalledTimes(8);
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE budget_months SET monthly_income = ?'),
      [120_000, '2026-01-01T00:00:00.000Z', 'month-6'],
    );
    expect(runMock).toHaveBeenCalledWith(expect.stringContaining('SET allocated = ?'), [
      60_000,
      '2026-01-01T00:00:00.000Z',
      'month-6',
      'needs',
    ]);
  });

  it('should create budget allocation with spent set to zero', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.createBudgetAllocation({
      budgetMonthId: 'month-id',
      group: 'wants',
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
        group: 'needs',
        allocated: 50_000,
        spent: 12_345,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.addExpenseToAllocation({
      budgetMonthId: 'month-id',
      group: 'needs',
      amount: 12_345,
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result.spent).toBe(12_345);
    expect(result.group).toBe('needs');
  });

  it('should throw when adding expense to missing allocation', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.addExpenseToAllocation({
        budgetMonthId: 'month-id',
        group: 'needs',
        amount: 500,
      }),
    ).rejects.toThrow('Allocation not found for month month-id and group needs');
  });

  it('should add expense with description and update allocation spent', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'alloc-2',
        budget_month_id: 'month-id',
        group: 'needs',
        allocated: 50_000,
        spent: 12_345,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.addExpense({
      budgetMonthId: 'month-id',
      group: 'needs',
      amount: 12_345,
      description: 'Supermercado semanal',
    });

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'expense-id',
      budgetMonthId: 'month-id',
      group: 'needs',
      categoryId: 'housing',
      amount: 12_345,
      description: 'Supermercado semanal',
      recurringRuleId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('should return month expenses by group with mapped fields', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'expense-2',
        budget_month_id: 'month-id',
        group: 'needs',
        amount: 4_000,
        description: 'Transporte',
        created_at: '2026-01-03T10:00:00.000Z',
        updated_at: '2026-01-03T10:00:00.000Z',
      },
      {
        id: 'expense-1',
        budget_month_id: 'month-id',
        group: 'needs',
        amount: 8_500,
        description: 'Supermercado',
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.getExpensesByMonthAndGroup('month-id', 'needs');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'expense-2',
      amount: 4_000,
      description: 'Transporte',
    });
    expect(result[1]).toMatchObject({
      id: 'expense-1',
      amount: 8_500,
      description: 'Supermercado',
    });
  });

  it('should update expense amount and description adjusting allocation spent delta', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-id',
          group: 'needs',
          amount: 6_000,
          description: 'Vieja descripcion',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-id',
          group: 'needs',
          amount: 8_500,
          description: 'Nueva descripcion',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const updated = await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 8_500,
      description: 'Nueva descripcion',
    });

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(updated.amount).toBe(8_500);
    expect(updated.description).toBe('Nueva descripcion');
  });

  it('should update expense group and category when editing expense', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-id',
          group: 'needs',
          category_id: 'housing',
          amount: 6_000,
          description: 'Vieja descripcion',
          recurring_rule_id: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          budget_year_id: 'year-id',
          month: 6,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([{ id: 'shopping' }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const updated = await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 6_000,
      description: 'Cambio de grupo',
      group: 'wants',
      categoryId: 'shopping',
    });

    expect(updated.group).toBe('wants');
    expect(updated.categoryId).toBe('shopping');
  });

  it('should reject update when default category does not belong to selected group', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'expense-1',
        budget_month_id: 'month-id',
        group: 'needs',
        category_id: 'housing',
        amount: 6_000,
        description: 'Vieja descripcion',
        recurring_rule_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        budget_year_id: 'year-id',
        month: 6,
        year: 2026,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateExpense({
        expenseId: 'expense-1',
        amount: 6_000,
        description: 'Cambio de grupo',
        group: 'wants',
        categoryId: 'housing',
      }),
    ).rejects.toThrow('Category housing does not belong to group wants');
  });

  it('should delete expense and decrement allocation spent', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'expense-1',
        budget_month_id: 'month-id',
        group: 'needs',
        amount: 6_000,
        description: 'Supermercado',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.deleteExpense({ expenseId: 'expense-1' });

    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it('should throw when updating a missing expense', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateExpense({
        expenseId: 'missing-expense',
        amount: 1_000,
        description: 'Nada',
      }),
    ).rejects.toThrow('Expense not found with id missing-expense');
  });

  it('should throw when deleting a missing expense', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.deleteExpense({ expenseId: 'missing-expense' }),
    ).rejects.toThrow('Expense not found with id missing-expense');
  });

  it('should add recurring expense from current month to future months', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'month-5',
          budget_year_id: 'year-id',
          month: 5,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([{ id: 'month-5' }, { id: 'month-6' }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const allocationSpy = vi
      .spyOn(sqliteBudgetRepository, 'addExpenseToAllocation')
      .mockResolvedValue({
        id: 'alloc-id',
        budgetMonthId: 'month-5',
        group: 'needs',
        allocated: 50_000,
        spent: 10_000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

    const result = await sqliteBudgetRepository.addExpense({
      budgetMonthId: 'month-5',
      group: 'needs',
      amount: 10_000,
      description: 'Renta fija',
      isRecurring: true,
    });

    expect(allocationSpy).toHaveBeenCalledTimes(2);
    expect(runMock).toHaveBeenCalledTimes(3);
    expect(result.recurringRuleId).not.toBeNull();
  });

  it('should throw when adding recurring expense to missing month', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.addExpense({
        budgetMonthId: 'missing-month',
        group: 'needs',
        amount: 1_000,
        description: 'Renta',
        isRecurring: true,
      }),
    ).rejects.toThrow('Budget month not found with id missing-month');
  });

  it('should update recurring expense for current and future months', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          amount: 10_000,
          description: 'Renta',
          recurring_rule_id: 'rule-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          budget_year_id: 'year-id',
          month: 5,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          amount: 10_000,
        },
        {
          id: 'expense-2',
          budget_month_id: 'month-6',
          group: 'needs',
          amount: 10_000,
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const updated = await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 12_000,
      description: 'Renta actualizada',
    });

    expect(runMock).toHaveBeenCalledTimes(6);
    expect(updated.recurringRuleId).not.toBeNull();
    expect(updated.amount).toBe(12_000);
  });

  it('should update recurring expense group and category for current and future months', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          category_id: 'housing',
          amount: 10_000,
          description: 'Renta',
          recurring_rule_id: 'rule-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          budget_year_id: 'year-id',
          month: 5,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([{ id: 'shopping' }])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          category_id: 'housing',
          amount: 10_000,
        },
        {
          id: 'expense-2',
          budget_month_id: 'month-6',
          group: 'needs',
          category_id: 'housing',
          amount: 10_000,
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const updated = await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 12_000,
      description: 'Renta actualizada',
      group: 'wants',
      categoryId: 'shopping',
    });

    expect(updated.group).toBe('wants');
    expect(updated.categoryId).toBe('shopping');
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('SET spent = spent - ?'),
      expect.arrayContaining([10_000]),
    );
  });

  it('should delete recurring expense for current and future months', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          amount: 10_000,
          recurring_rule_id: 'rule-1',
          budget_year_id: 'year-id',
          month: 5,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-5',
          group: 'needs',
          amount: 10_000,
        },
        {
          id: 'expense-2',
          budget_month_id: 'month-6',
          group: 'needs',
          amount: 10_000,
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.deleteExpense({ expenseId: 'expense-1' });

    expect(runMock).toHaveBeenCalledTimes(5);
  });

  it('should update recurring expense in January and close previous rule in December', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-1',
          group: 'needs',
          amount: 10_000,
          description: 'Renta',
          recurring_rule_id: 'rule-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          budget_year_id: 'year-id',
          month: 1,
          year: 2026,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          budget_month_id: 'month-1',
          group: 'needs',
          amount: 10_000,
        },
      ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 12_000,
      description: 'Renta enero',
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE recurring_expense_rules'),
      expect.arrayContaining([2025, 12]),
    );
  });

  it('should update only current month when recurring expense uses applyToFuture false', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'expense-1',
        budget_month_id: 'month-5',
        group: 'needs',
        amount: 10_000,
        description: 'Renta',
        recurring_rule_id: 'rule-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        budget_year_id: 'year-id',
        month: 5,
        year: 2026,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const updated = await sqliteBudgetRepository.updateExpense({
      expenseId: 'expense-1',
      amount: 11_000,
      description: 'Renta puntual',
      applyToFuture: false,
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE budget_expenses SET recurring_rule_id = NULL'),
      ['expense-1'],
    );
    expect(updated.recurringRuleId).toBeNull();
  });

  it('should delete only current month when recurring expense uses applyToFuture false', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'expense-1',
        budget_month_id: 'month-5',
        group: 'needs',
        amount: 10_000,
        recurring_rule_id: 'rule-1',
        budget_year_id: 'year-id',
        month: 5,
        year: 2026,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.deleteExpense({ expenseId: 'expense-1', applyToFuture: false });

    expect(runMock).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM budget_expenses'), [
      'expense-1',
    ]);
  });

  it('should return allocations sorted by group order', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'alloc-1',
        budget_month_id: 'month-id',
        group: 'savings',
        allocated: 20_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'alloc-2',
        budget_month_id: 'month-id',
        group: 'needs',
        allocated: 50_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'alloc-3',
        budget_month_id: 'month-id',
        group: 'wants',
        allocated: 30_000,
        spent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const result = await sqliteBudgetRepository.getAllocationsByMonth('month-id');

    expect(result.map((item) => item.group)).toEqual(['needs', 'wants', 'savings']);
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

  it('should return default categories by group', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'housing',
        group_name: 'needs',
        order_index: 0,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
      {
        id: 'food',
        group_name: 'needs',
        order_index: 1,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const categories = await sqliteBudgetRepository.getCategoriesByGroup('needs');

    expect(categories).toEqual([
      {
        id: 'housing',
        group: 'needs',
        order: 0,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'food',
        group: 'needs',
        order: 1,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
    ]);
  });

  it('should create custom category in selected group', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ next_order: 1 }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');
    const created = await sqliteBudgetRepository.createCategory({
      group: 'needs',
      name: 'Mascotas',
    });

    expect(created.group).toBe('needs');
    expect(created.isDefault).toBe(false);
    expect(created.isActive).toBe(true);
    expect(created.name).toBe('Mascotas');
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO expense_categories'),
      expect.any(Array),
    );
  });

  it('should reject creating duplicated custom category name in same group', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'custom-pets' }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.createCategory({
        group: 'needs',
        name: 'Mascotas',
      }),
    ).rejects.toThrow('Category name Mascotas already exists in group needs');
  });

  it('should reject creating custom category with empty name', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.createCategory({
        group: 'needs',
        name: '   ',
      }),
    ).rejects.toThrow('Category name cannot be empty');
  });

  it('should update custom category name when category is active', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'housing',
          group_name: 'needs',
          order_index: 0,
          is_default: 1,
          is_active: 1,
          deleted_at: null,
        },
        {
          id: 'custom-pets',
          group_name: 'needs',
          order_index: 3,
          is_default: 0,
          is_active: 1,
          deleted_at: null,
          name: 'Mascotas',
        },
      ])
      .mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.updateCategoryName({
      group: 'needs',
      categoryId: 'custom-pets',
      name: 'Mascotas y veterinaria',
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE expense_categories'),
      expect.any(Array),
    );
  });

  it('should reject updating inactive custom category', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'custom-pets',
        group_name: 'needs',
        order_index: 3,
        is_default: 0,
        is_active: 0,
        deleted_at: '2026-01-10T00:00:00.000Z',
        name: 'Mascotas',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: 'custom-pets',
        name: 'Mascotas y veterinaria',
      }),
    ).rejects.toThrow('Category custom-pets does not belong to group needs');
  });

  it('should reject updating category name when new name is empty', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: 'custom-pets',
        name: '   ',
      }),
    ).rejects.toThrow('Category name cannot be empty');
  });

  it('should reject renaming default category', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'housing',
        group_name: 'needs',
        order_index: 0,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: 'housing',
        name: 'Casa principal',
      }),
    ).rejects.toThrow('Default category housing cannot be renamed');
  });

  it('should reject renaming custom category to duplicated name', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'custom-pets',
          group_name: 'needs',
          order_index: 3,
          is_default: 0,
          is_active: 1,
          deleted_at: null,
          name: 'Mascotas',
        },
      ])
      .mockResolvedValueOnce([{ id: 'custom-other' }]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.updateCategoryName({
        group: 'needs',
        categoryId: 'custom-pets',
        name: 'Duplicada',
      }),
    ).rejects.toThrow('Category name Duplicada already exists in group needs');
  });

  it('should soft delete category and reassign expenses', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'housing',
        group_name: 'needs',
        order_index: 0,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
      {
        id: 'food',
        group_name: 'needs',
        order_index: 1,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await sqliteBudgetRepository.softDeleteCategoryAndReassign({
      group: 'needs',
      categoryId: 'food',
      replacementCategoryId: 'housing',
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE budget_expenses'),
      expect.any(Array),
    );
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE recurring_expense_rules'),
      expect.any(Array),
    );
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE expense_categories'),
      expect.any(Array),
    );
  });

  it('should reject soft delete when replacement equals target', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'food',
      }),
    ).rejects.toThrow('Replacement category must be different from category to delete');
  });

  it('should reject soft delete when target category is not active', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'housing',
        group_name: 'needs',
        order_index: 0,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
      {
        id: 'food',
        group_name: 'needs',
        order_index: 1,
        is_default: 1,
        is_active: 0,
        deleted_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'housing',
      }),
    ).rejects.toThrow('Category food does not belong to group needs');
  });

  it('should reject soft delete when replacement category is not active', async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: 'housing',
        group_name: 'needs',
        order_index: 0,
        is_default: 1,
        is_active: 0,
        deleted_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'food',
        group_name: 'needs',
        order_index: 1,
        is_default: 1,
        is_active: 1,
        deleted_at: null,
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.softDeleteCategoryAndReassign({
        group: 'needs',
        categoryId: 'food',
        replacementCategoryId: 'housing',
      }),
    ).rejects.toThrow('Replacement category housing does not belong to group needs');
  });

  it('should reject expense when category does not belong to group', async () => {
    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.addExpense({
        budgetMonthId: 'month-id',
        group: 'needs',
        categoryId: 'shopping',
        amount: 10_000,
        description: 'Compra invalida',
      }),
    ).rejects.toThrow('Category shopping does not belong to group needs');
  });

  it('should add expense with explicit active category', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'food' }]).mockResolvedValueOnce([
      {
        id: 'alloc-2',
        budget_month_id: 'month-id',
        group: 'needs',
        allocated: 50_000,
        spent: 12_345,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    const result = await sqliteBudgetRepository.addExpense({
      budgetMonthId: 'month-id',
      group: 'needs',
      categoryId: 'food',
      amount: 1_000,
      description: 'Gasto con categoria',
    });

    expect(result.categoryId).toBe('food');
  });

  it('should reject expense when category is inactive', async () => {
    queryMock.mockResolvedValueOnce([]);

    const { sqliteBudgetRepository } = await import('./BudgetRepository.sqlite');

    await expect(
      sqliteBudgetRepository.addExpense({
        budgetMonthId: 'month-id',
        group: 'needs',
        categoryId: 'food',
        amount: 1_000,
        description: 'Gasto con categoria inactiva',
      }),
    ).rejects.toThrow('Category food does not belong to group needs');
  });
});
