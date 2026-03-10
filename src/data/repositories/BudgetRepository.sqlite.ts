import { query, run } from '@/data/database/database';
import { generateUUID, getCurrentTimestamp } from '@/data/database/utils';
import type {
  AddExpenseToAllocationInput,
  BudgetAllocation,
  BudgetMonth,
  BudgetYear,
  Category,
  CategoryId,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
  CreateExpenseInput,
  DeleteExpenseInput,
  Expense,
  UpdateExpenseInput,
  UpdateMonthlyIncomeFromMonthInput,
} from '@/domain/entities';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BY_GROUP,
  GROUP_ORDER,
  GROUP_PERCENTAGES,
  compareGroups,
  isDefaultCategoryId,
  isValidCategoryForGroup,
  type GroupType,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import type { BudgetRepository } from './BudgetRepository.types';

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  return { year: year - 1, month: 12 };
}

function allocationForGroup(monthlyIncome: number, group: GroupType): number {
  const percentage = GROUP_PERCENTAGES[group];
  return Math.floor((monthlyIncome * percentage) / 100);
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}

async function ensureDefaultCategories(): Promise<void> {
  const now = getCurrentTimestamp();

  for (const category of DEFAULT_CATEGORIES) {
    await run(
      `INSERT OR IGNORE INTO expense_categories
      (id, group_name, order_index, name, is_default, is_active, deleted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.group,
        category.order,
        null,
        category.isDefault ? 1 : 0,
        category.isActive ? 1 : 0,
        category.deletedAt,
        now,
        now,
      ],
    );
  }
}

async function assertActiveCategoryForGroup(
  group: GroupType,
  categoryId: CategoryId,
): Promise<void> {
  await ensureDefaultCategories();

  const rows = await query<{ id: string }>(
    `SELECT id FROM expense_categories
     WHERE id = ? AND group_name = ? AND is_active = 1
     LIMIT 1`,
    [categoryId, group],
  );

  if (rows.length === 0) {
    throw new Error(`Category ${categoryId} does not belong to group ${group}`);
  }
}

export const sqliteBudgetRepository: BudgetRepository = {
  async createBudgetYear(input: CreateBudgetYearInput): Promise<BudgetYear> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_years (id, monthly_income, year, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.monthlyIncome, input.year, input.currency, now, now],
    );

    return {
      id,
      monthlyIncome: input.monthlyIncome,
      year: input.year,
      currency: input.currency,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getLatestBudgetYear(): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      monthly_income: number;
      year: number;
      currency: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM budget_years
       WHERE EXISTS (
         SELECT 1 FROM budget_months
         WHERE budget_months.budget_year_id = budget_years.id
       )
       ORDER BY year DESC, created_at DESC
       LIMIT 1`,
      [],
    );

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    return {
      id: row.id,
      monthlyIncome: Number(row.monthly_income),
      year: Number(row.year),
      currency: row.currency as SupportedCurrency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async getBudgetYearByYear(year: number): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      monthly_income: number;
      year: number;
      currency: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM budget_years
       WHERE year = ?
         AND EXISTS (
           SELECT 1 FROM budget_months
           WHERE budget_months.budget_year_id = budget_years.id
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [year],
    );

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    return {
      id: row.id,
      monthlyIncome: Number(row.monthly_income),
      year: Number(row.year),
      currency: row.currency as SupportedCurrency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
    const id = generateUUID();
    const now = getCurrentTimestamp();
    const resolvedMonthlyIncome =
      input.monthlyIncome ??
      (
        await query<{ monthly_income: number }>(
          `SELECT monthly_income FROM budget_years WHERE id = ? LIMIT 1`,
          [input.budgetYearId],
        )
      )[0]?.monthly_income ??
      0;

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_months (id, budget_year_id, month, year, monthly_income, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.budgetYearId, input.month, input.year, resolvedMonthlyIncome, now, now],
    );

    return {
      id,
      budgetYearId: input.budgetYearId,
      month: input.month,
      year: input.year,
      monthlyIncome: Number(resolvedMonthlyIncome),
      allocations: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  async getBudgetMonth(budgetYearId: string, month: number): Promise<BudgetMonth | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_year_id: string;
      month: number;
      year: number;
      monthly_income: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM budget_months WHERE budget_year_id = ? AND month = ?`, [budgetYearId, month]);

    if (result.length === 0) return null;

    const [row] = result;
    if (!row) return null;

    const allocations = await sqliteBudgetRepository.getAllocationsByMonth(row.id);

    return {
      id: row.id,
      budgetYearId: row.budget_year_id,
      month: Number(row.month),
      year: Number(row.year),
      monthlyIncome: Number(row.monthly_income ?? 0),
      allocations,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async createBudgetAllocation(input: CreateBudgetAllocationInput): Promise<BudgetAllocation> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_allocations (id, budget_month_id, group, allocated, spent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.budgetMonthId, input.group, input.allocated, 0, now, now],
    );

    return {
      id,
      budgetMonthId: input.budgetMonthId,
      group: input.group,
      allocated: input.allocated,
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  async addExpenseToAllocation(input: AddExpenseToAllocationInput): Promise<BudgetAllocation> {
    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `UPDATE budget_allocations
       SET spent = spent + ?, updated_at = ?
       WHERE budget_month_id = ? AND group = ?`,
      [input.amount, now, input.budgetMonthId, input.group],
    );

    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_month_id: string;
      group: string;
      allocated: number;
      spent: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM budget_allocations WHERE budget_month_id = ? AND group = ? LIMIT 1`, [
      input.budgetMonthId,
      input.group,
    ]);

    const [row] = result;

    if (!row) {
      throw new Error(
        `Allocation not found for month ${input.budgetMonthId} and group ${input.group}`,
      );
    }

    return {
      id: row.id,
      budgetMonthId: row.budget_month_id,
      group: row.group as GroupType,
      allocated: Number(row.allocated),
      spent: Number(row.spent),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async addExpense(input: CreateExpenseInput): Promise<Expense> {
    const now = getCurrentTimestamp();
    const categoryId: CategoryId =
      input.categoryId ?? DEFAULT_CATEGORIES_BY_GROUP[input.group][0] ?? 'housing';

    if (input.categoryId) {
      if (isDefaultCategoryId(categoryId) && !isValidCategoryForGroup(input.group, categoryId)) {
        throw new Error(`Category ${categoryId} does not belong to group ${input.group}`);
      }

      await assertActiveCategoryForGroup(input.group, categoryId);
    }

    if (!input.isRecurring) {
      const id = generateUUID();

      await sqliteBudgetRepository.addExpenseToAllocation({
        budgetMonthId: input.budgetMonthId,
        group: input.group,
        amount: input.amount,
      });

      // noinspection SqlNoDataSourceInspection
      await run(
        `INSERT INTO budget_expenses
        (id, budget_month_id, group, category_id, amount, description, recurring_rule_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          input.budgetMonthId,
          input.group,
          categoryId,
          input.amount,
          input.description,
          now,
          now,
        ],
      );

      return {
        id,
        budgetMonthId: input.budgetMonthId,
        group: input.group,
        categoryId,
        amount: input.amount,
        description: input.description,
        recurringRuleId: null,
        createdAt: now,
        updatedAt: now,
      };
    }

    // noinspection SqlNoDataSourceInspection
    const monthRows = await query<{
      id: string;
      budget_year_id: string;
      month: number;
      year: number;
    }>(`SELECT id, budget_year_id, month, year FROM budget_months WHERE id = ? LIMIT 1`, [
      input.budgetMonthId,
    ]);

    const [targetMonth] = monthRows;
    if (!targetMonth) {
      throw new Error(`Budget month not found with id ${input.budgetMonthId}`);
    }

    const recurringRuleId = generateUUID();

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO recurring_expense_rules
      (id, budget_year_id, group, category_id, amount, description, start_year, start_month, end_year, end_month, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        recurringRuleId,
        targetMonth.budget_year_id,
        input.group,
        categoryId,
        input.amount,
        input.description,
        Number(targetMonth.year),
        Number(targetMonth.month),
        now,
        now,
      ],
    );

    // noinspection SqlNoDataSourceInspection
    const futureMonths = await query<{ id: string }>(
      `SELECT id FROM budget_months
       WHERE budget_year_id = ? AND month >= ?
       ORDER BY month ASC`,
      [targetMonth.budget_year_id, Number(targetMonth.month)],
    );

    let createdExpenseId = '';
    for (const month of futureMonths) {
      const id = generateUUID();
      if (month.id === input.budgetMonthId) {
        createdExpenseId = id;
      }

      await sqliteBudgetRepository.addExpenseToAllocation({
        budgetMonthId: month.id,
        group: input.group,
        amount: input.amount,
      });

      // noinspection SqlNoDataSourceInspection
      await run(
        `INSERT INTO budget_expenses
        (id, budget_month_id, group, category_id, amount, description, recurring_rule_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          month.id,
          input.group,
          categoryId,
          input.amount,
          input.description,
          recurringRuleId,
          now,
          now,
        ],
      );
    }

    return {
      id: createdExpenseId,
      budgetMonthId: input.budgetMonthId,
      group: input.group,
      categoryId,
      amount: input.amount,
      description: input.description,
      recurringRuleId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getExpensesByMonthAndGroup(budgetMonthId: string, group: GroupType): Promise<Expense[]> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_month_id: string;
      group: string;
      category_id: string;
      amount: number;
      description: string;
      recurring_rule_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM budget_expenses
       WHERE budget_month_id = ? AND group = ?
       ORDER BY created_at DESC`,
      [budgetMonthId, group],
    );

    return result.map((row) => ({
      id: row.id,
      budgetMonthId: row.budget_month_id,
      group: row.group as GroupType,
      categoryId: row.category_id as CategoryId,
      amount: Number(row.amount),
      description: row.description,
      recurringRuleId: row.recurring_rule_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async updateExpense(input: UpdateExpenseInput): Promise<Expense> {
    // noinspection SqlNoDataSourceInspection
    const existingRows = await query<{
      id: string;
      budget_month_id: string;
      group: string;
      category_id: string;
      amount: number;
      description: string;
      recurring_rule_id: string | null;
      created_at: string;
      updated_at: string;
      budget_year_id: string;
      month: number;
      year: number;
    }>(
      `SELECT e.*, m.budget_year_id, m.month, m.year
       FROM budget_expenses e
       JOIN budget_months m ON m.id = e.budget_month_id
       WHERE e.id = ?
       LIMIT 1`,
      [input.expenseId],
    );

    const [existing] = existingRows;

    if (!existing) {
      throw new Error(`Expense not found with id ${input.expenseId}`);
    }

    if (existing.recurring_rule_id && input.applyToFuture !== false) {
      const now = getCurrentTimestamp();
      const previousMonth = getPreviousMonth(Number(existing.year), Number(existing.month));

      // noinspection SqlNoDataSourceInspection
      await run(
        `UPDATE recurring_expense_rules
         SET end_year = ?, end_month = ?, updated_at = ?
         WHERE id = ?`,
        [previousMonth.year, previousMonth.month, now, existing.recurring_rule_id],
      );

      const newRecurringRuleId = generateUUID();
      // noinspection SqlNoDataSourceInspection
      await run(
        `INSERT INTO recurring_expense_rules
        (id, budget_year_id, group, category_id, amount, description, start_year, start_month, end_year, end_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [
          newRecurringRuleId,
          existing.budget_year_id,
          existing.group,
          existing.category_id,
          input.amount,
          input.description,
          Number(existing.year),
          Number(existing.month),
          now,
          now,
        ],
      );

      // noinspection SqlNoDataSourceInspection
      const futureExpenses = await query<{
        id: string;
        budget_month_id: string;
        group: string;
        category_id: string;
        amount: number;
      }>(
        `SELECT e.id, e.budget_month_id, e.group, e.category_id, e.amount
         FROM budget_expenses e
         JOIN budget_months m ON m.id = e.budget_month_id
         WHERE e.recurring_rule_id = ?
           AND m.budget_year_id = ?
           AND m.month >= ?`,
        [existing.recurring_rule_id, existing.budget_year_id, Number(existing.month)],
      );

      for (const expense of futureExpenses) {
        const delta = input.amount - Number(expense.amount);
        await run(
          `UPDATE budget_allocations
           SET spent = spent + ?, updated_at = ?
           WHERE budget_month_id = ? AND group = ?`,
          [delta, now, expense.budget_month_id, expense.group],
        );

        await run(
          `UPDATE budget_expenses
           SET amount = ?, description = ?, recurring_rule_id = ?, updated_at = ?
            WHERE id = ?`,
          [input.amount, input.description, newRecurringRuleId, now, expense.id],
        );
      }

      return {
        id: existing.id,
        budgetMonthId: existing.budget_month_id,
        group: existing.group as GroupType,
        categoryId: existing.category_id as CategoryId,
        amount: input.amount,
        description: input.description,
        recurringRuleId: newRecurringRuleId,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    }

    const now = getCurrentTimestamp();
    const delta = input.amount - Number(existing.amount);

    // noinspection SqlNoDataSourceInspection
    await run(
      `UPDATE budget_allocations
       SET spent = spent + ?, updated_at = ?
       WHERE budget_month_id = ? AND group = ?`,
      [delta, now, existing.budget_month_id, existing.group],
    );

    // noinspection SqlNoDataSourceInspection
    await run(
      `UPDATE budget_expenses SET amount = ?, description = ?, updated_at = ? WHERE id = ?`,
      [input.amount, input.description, now, input.expenseId],
    );

    if (existing.recurring_rule_id && input.applyToFuture === false) {
      await run(`UPDATE budget_expenses SET recurring_rule_id = NULL WHERE id = ?`, [
        input.expenseId,
      ]);
    }

    return {
      id: existing.id,
      budgetMonthId: existing.budget_month_id,
      group: existing.group as GroupType,
      categoryId: existing.category_id as CategoryId,
      amount: input.amount,
      description: input.description,
      recurringRuleId: null,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  },

  async deleteExpense(input: DeleteExpenseInput): Promise<void> {
    // noinspection SqlNoDataSourceInspection
    const existingRows = await query<{
      id: string;
      budget_month_id: string;
      group: string;
      category_id: string;
      amount: number;
      recurring_rule_id: string | null;
      budget_year_id: string;
      month: number;
      year: number;
    }>(
      `SELECT e.id, e.budget_month_id, e.group, e.category_id, e.amount, e.recurring_rule_id, m.budget_year_id, m.month, m.year
       FROM budget_expenses e
       JOIN budget_months m ON m.id = e.budget_month_id
       WHERE e.id = ?
       LIMIT 1`,
      [input.expenseId],
    );

    const [existing] = existingRows;

    if (!existing) {
      throw new Error(`Expense not found with id ${input.expenseId}`);
    }

    if (existing.recurring_rule_id && input.applyToFuture !== false) {
      const now = getCurrentTimestamp();
      const previousMonth = getPreviousMonth(Number(existing.year), Number(existing.month));

      await run(
        `UPDATE recurring_expense_rules
         SET end_year = ?, end_month = ?, updated_at = ?
         WHERE id = ?`,
        [previousMonth.year, previousMonth.month, now, existing.recurring_rule_id],
      );

      const futureExpenses = await query<{
        id: string;
        budget_month_id: string;
        group: string;
        category_id: string;
        amount: number;
      }>(
        `SELECT e.id, e.budget_month_id, e.group, e.category_id, e.amount
         FROM budget_expenses e
         JOIN budget_months m ON m.id = e.budget_month_id
         WHERE e.recurring_rule_id = ?
           AND m.budget_year_id = ?
           AND m.month >= ?`,
        [existing.recurring_rule_id, existing.budget_year_id, Number(existing.month)],
      );

      for (const expense of futureExpenses) {
        await run(
          `UPDATE budget_allocations
           SET spent = spent - ?, updated_at = ?
           WHERE budget_month_id = ? AND group = ?`,
          [Number(expense.amount), now, expense.budget_month_id, expense.group],
        );

        await run(`DELETE FROM budget_expenses WHERE id = ?`, [expense.id]);
      }

      return;
    }

    const now = getCurrentTimestamp();

    // noinspection SqlNoDataSourceInspection
    await run(
      `UPDATE budget_allocations
       SET spent = spent - ?, updated_at = ?
       WHERE budget_month_id = ? AND group = ?`,
      [Number(existing.amount), now, existing.budget_month_id, existing.group],
    );

    // noinspection SqlNoDataSourceInspection
    await run(`DELETE FROM budget_expenses WHERE id = ?`, [input.expenseId]);
  },

  async getAllocationsByMonth(budgetMonthId: string): Promise<BudgetAllocation[]> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<{
      id: string;
      budget_month_id: string;
      group: string;
      allocated: number;
      spent: number;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM budget_allocations WHERE budget_month_id = ?`, [budgetMonthId]);

    return result
      .map((row) => ({
        id: row.id,
        budgetMonthId: row.budget_month_id,
        group: row.group as GroupType,
        allocated: Number(row.allocated),
        spent: Number(row.spent),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
      .sort((left, right) => compareGroups(left.group, right.group));
  },

  async getCategoriesByGroup(
    group: GroupType,
    options?: { includeInactive?: boolean },
  ): Promise<Category[]> {
    await ensureDefaultCategories();

    const rows = await query<{
      id: string;
      group_name: string;
      order_index: number;
      name: string | null;
      is_default: number;
      is_active: number;
      deleted_at: string | null;
    }>(
      `SELECT id, group_name, order_index, name, is_default, is_active, deleted_at
       FROM expense_categories
       WHERE group_name = ? ${options?.includeInactive ? '' : 'AND is_active = 1'}
       ORDER BY order_index ASC`,
      [group],
    );

    return rows.map((row) => ({
      id: row.id as CategoryId,
      group: row.group_name as GroupType,
      order: Number(row.order_index),
      ...(row.name ? { name: row.name } : {}),
      isDefault: Number(row.is_default) === 1,
      isActive: Number(row.is_active) === 1,
      deletedAt: row.deleted_at,
    }));
  },

  async createCategory(input: { group: GroupType; name: string }): Promise<Category> {
    await ensureDefaultCategories();

    const name = normalizeCategoryName(input.name);
    if (name.length === 0) {
      throw new Error('Category name cannot be empty');
    }

    const duplicatedRows = await query<{ id: string }>(
      `SELECT id FROM expense_categories
       WHERE group_name = ? AND is_active = 1 AND lower(name) = lower(?)
       LIMIT 1`,
      [input.group, name],
    );

    if (duplicatedRows.length > 0) {
      throw new Error(`Category name ${name} already exists in group ${input.group}`);
    }

    const orderRows = await query<{ next_order: number }>(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
       FROM expense_categories
       WHERE group_name = ?`,
      [input.group],
    );

    const id = `custom-${generateUUID()}`;
    const now = getCurrentTimestamp();
    const order = Number(orderRows[0]?.next_order ?? 0);

    await run(
      `INSERT INTO expense_categories
       (id, group_name, order_index, name, is_default, is_active, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.group, order, name, 0, 1, null, now, now],
    );

    return {
      id,
      group: input.group,
      order,
      name,
      isDefault: false,
      isActive: true,
      deletedAt: null,
    };
  },

  async updateCategoryName(input: {
    group: GroupType;
    categoryId: CategoryId;
    name: string;
  }): Promise<void> {
    await ensureDefaultCategories();

    const name = normalizeCategoryName(input.name);
    if (name.length === 0) {
      throw new Error('Category name cannot be empty');
    }

    const categories = await sqliteBudgetRepository.getCategoriesByGroup(input.group, {
      includeInactive: true,
    });
    const target = categories.find((category) => category.id === input.categoryId);

    if (!target || !target.isActive) {
      throw new Error(`Category ${input.categoryId} does not belong to group ${input.group}`);
    }

    if (target.isDefault) {
      throw new Error(`Default category ${input.categoryId} cannot be renamed`);
    }

    const duplicateRows = await query<{ id: string }>(
      `SELECT id FROM expense_categories
       WHERE group_name = ? AND is_active = 1 AND id <> ? AND lower(name) = lower(?)
       LIMIT 1`,
      [input.group, input.categoryId, name],
    );

    if (duplicateRows.length > 0) {
      throw new Error(`Category name ${name} already exists in group ${input.group}`);
    }

    const now = getCurrentTimestamp();
    await run(
      `UPDATE expense_categories
       SET name = ?, updated_at = ?
       WHERE id = ? AND group_name = ?`,
      [name, now, input.categoryId, input.group],
    );
  },

  async softDeleteCategoryAndReassign(input: {
    group: GroupType;
    categoryId: CategoryId;
    replacementCategoryId: CategoryId;
  }): Promise<void> {
    await ensureDefaultCategories();

    if (input.categoryId === input.replacementCategoryId) {
      throw new Error('Replacement category must be different from category to delete');
    }

    const categories = await sqliteBudgetRepository.getCategoriesByGroup(input.group, {
      includeInactive: true,
    });
    const target = categories.find((category) => category.id === input.categoryId);
    const replacement = categories.find((category) => category.id === input.replacementCategoryId);

    if (!target || !target.isActive) {
      throw new Error(`Category ${input.categoryId} does not belong to group ${input.group}`);
    }

    if (!replacement || !replacement.isActive) {
      throw new Error(
        `Replacement category ${input.replacementCategoryId} does not belong to group ${input.group}`,
      );
    }

    const now = getCurrentTimestamp();

    await run(
      `UPDATE budget_expenses
       SET category_id = ?, updated_at = ?
       WHERE group = ? AND category_id = ?`,
      [input.replacementCategoryId, now, input.group, input.categoryId],
    );

    await run(
      `UPDATE recurring_expense_rules
       SET category_id = ?, updated_at = ?
       WHERE group = ? AND category_id = ?`,
      [input.replacementCategoryId, now, input.group, input.categoryId],
    );

    await run(
      `UPDATE expense_categories
       SET is_active = 0, deleted_at = ?, updated_at = ?
       WHERE id = ? AND group_name = ?`,
      [now, now, input.categoryId, input.group],
    );
  },

  async updateMonthlyIncomeFromMonth(input: UpdateMonthlyIncomeFromMonthInput): Promise<void> {
    const now = getCurrentTimestamp();

    const months = await query<{ id: string }>(
      `SELECT id FROM budget_months
       WHERE budget_year_id = ? AND month >= ?
       ORDER BY month ASC`,
      [input.budgetYearId, input.fromMonth],
    );

    for (const month of months) {
      await run(`UPDATE budget_months SET monthly_income = ?, updated_at = ? WHERE id = ?`, [
        input.monthlyIncome,
        now,
        month.id,
      ]);

      for (const group of GROUP_ORDER) {
        await run(
          `UPDATE budget_allocations
           SET allocated = ?, updated_at = ?
           WHERE budget_month_id = ? AND group = ?`,
          [allocationForGroup(input.monthlyIncome, group), now, month.id, group],
        );
      }
    }
  },

  async createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
    const budgetYear = await sqliteBudgetRepository.createBudgetYear({
      monthlyIncome,
      year,
      currency,
    });
    const months: BudgetMonth[] = [];

    for (let month = 1; month <= 12; month++) {
      const budgetMonth = await sqliteBudgetRepository.createBudgetMonth({
        budgetYearId: budgetYear.id,
        month,
        year,
        monthlyIncome,
      });

      const allocations: BudgetAllocation[] = [];

      for (const group of GROUP_ORDER) {
        const percentage = GROUP_PERCENTAGES[group];
        const allocated = Math.floor((monthlyIncome * percentage) / 100);
        const allocation = await sqliteBudgetRepository.createBudgetAllocation({
          budgetMonthId: budgetMonth.id,
          group,
          allocated,
        });
        allocations.push(allocation);
      }

      months.push({
        ...budgetMonth,
        allocations,
      });
    }

    return { budgetYear, months };
  },
};
