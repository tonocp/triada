//noinspection SqlNoDataSourceInspection

import { query, run } from '@/data/database/database';
import { generateUUID, getCurrentTimestamp } from '@/data/database/utils';
import type {
  AddExpenseToAllocationInput,
  BudgetAllocation,
  BudgetMonth,
  BudgetSplit,
  BudgetYear,
  Category,
  CategoryId,
  CreateBudgetAllocationInput,
  CreateBudgetMonthInput,
  CreateBudgetYearInput,
  CreateExpenseInput,
  DeleteExpenseInput,
  Expense,
  UpdateBudgetSplitInput,
  UpdateExpenseInput,
  UpdateMonthlyIncomeFromMonthInput,
} from '@/domain/entities';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BY_GROUP,
  DEFAULT_GROUP_SPLIT,
  GROUP_ORDER,
  allocateBudget,
  compareGroups,
  isDefaultCategoryId,
  isValidCategoryForGroup,
  parseBudgetSplit,
  type GroupType,
} from '@/domain/entities';
import type { SupportedCurrency } from '@/shared/composables/useCurrency';
import {
  assertValidBudgetDatabaseSnapshot,
  createBudgetDatabaseSnapshot,
  type BudgetDatabaseSnapshot,
} from './BudgetRepository.snapshot';
import type { BudgetRepository } from './BudgetRepository.types';

const APP_VERSION = '0.0.1';

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return false;
}

function normalizeCategorySnapshotRow(row: Record<string, unknown>): {
  id: string;
  group_name: string;
  order_index: number;
  name: string | null;
  is_default: number;
  is_active: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
} {
  const id = String(row.id ?? '');
  const groupName = String(row.group_name ?? row.group ?? '');
  const orderIndexRaw = row.order_index ?? row.order;
  const orderIndex =
    typeof orderIndexRaw === 'number' && Number.isFinite(orderIndexRaw) ? orderIndexRaw : 0;
  const createdAt = String(row.created_at ?? getCurrentTimestamp());
  const updatedAt = String(row.updated_at ?? createdAt);

  return {
    id,
    group_name: groupName,
    order_index: orderIndex,
    name: typeof row.name === 'string' ? row.name : null,
    is_default: toBoolean(row.is_default) ? 1 : 0,
    is_active: toBoolean(row.is_active) ? 1 : 0,
    deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  return { year: year - 1, month: 12 };
}

interface BudgetYearRow {
  id: string;
  monthly_income: number;
  year: number;
  currency: string;
  split?: unknown;
  created_at: string;
  updated_at: string;
}

function toBudgetYear(row: BudgetYearRow): BudgetYear {
  return {
    id: row.id,
    monthlyIncome: Number(row.monthly_income),
    year: Number(row.year),
    currency: row.currency as SupportedCurrency,
    split: parseBudgetSplit(row.split),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ExpenseRow {
  id: string;
  budget_month_id: string;
  group: string;
  category_id: string;
  amount: number;
  description: string;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    budgetMonthId: row.budget_month_id,
    group: row.group as GroupType,
    categoryId: row.category_id as CategoryId,
    amount: Number(row.amount),
    description: row.description,
    recurringRuleId: row.recurring_rule_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Recompute and persist `allocated` for the given months from their own income. */
async function writeAllocations(
  months: { id: string; monthly_income: number }[],
  split: BudgetSplit,
  now: string,
): Promise<void> {
  for (const month of months) {
    const allocated = allocateBudget(Number(month.monthly_income), split);
    for (const group of GROUP_ORDER) {
      await run(
        `UPDATE budget_allocations
         SET allocated = ?, updated_at = ?
         WHERE budget_month_id = ? AND "group" = ?`,
        [allocated[group], now, month.id, group],
      );
    }
  }
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
    const split = input.split ?? DEFAULT_GROUP_SPLIT;

    // noinspection SqlNoDataSourceInspection
    await run(
      `INSERT INTO budget_years
        (id, monthly_income, year, currency, split, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.monthlyIncome, input.year, input.currency, JSON.stringify(split), now, now],
    );

    return {
      id,
      monthlyIncome: input.monthlyIncome,
      year: input.year,
      currency: input.currency,
      split,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getLatestBudgetYear(): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<BudgetYearRow>(
      `SELECT * FROM budget_years
       WHERE EXISTS (
         SELECT 1 FROM budget_months
         WHERE budget_months.budget_year_id = budget_years.id
       )
       ORDER BY year DESC, created_at DESC
       LIMIT 1`,
      [],
    );

    const [row] = result;
    return row ? toBudgetYear(row) : null;
  },

  async getBudgetYearByYear(year: number): Promise<BudgetYear | null> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<BudgetYearRow>(
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

    const [row] = result;
    return row ? toBudgetYear(row) : null;
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
      `INSERT INTO budget_allocations (id, budget_month_id, "group", allocated, spent, created_at, updated_at)
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
       WHERE budget_month_id = ? AND "group" = ?`,
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
    }>(`SELECT * FROM budget_allocations WHERE budget_month_id = ? AND "group" = ? LIMIT 1`, [
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
        (id, budget_month_id, "group", category_id, amount, description, recurring_rule_id, created_at, updated_at)
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
      (id, budget_year_id, "group", category_id, amount, description, start_year, start_month, end_year, end_month, created_at, updated_at)
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
        (id, budget_month_id, "group", category_id, amount, description, recurring_rule_id, created_at, updated_at)
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
    const result = await query<ExpenseRow>(
      `SELECT * FROM budget_expenses
       WHERE budget_month_id = ? AND "group" = ?
       ORDER BY created_at DESC`,
      [budgetMonthId, group],
    );

    return result.map(toExpense);
  },

  async getExpensesByYear(budgetYearId: string): Promise<Expense[]> {
    // noinspection SqlNoDataSourceInspection
    const result = await query<ExpenseRow>(
      `SELECT e.* FROM budget_expenses e
       JOIN budget_months m ON m.id = e.budget_month_id
       WHERE m.budget_year_id = ?`,
      [budgetYearId],
    );

    return result.map(toExpense);
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

    const existingGroup = existing.group as GroupType;
    const existingCategoryId = existing.category_id as CategoryId;
    const nextGroup = input.group ?? existingGroup;
    const nextCategoryId = input.categoryId ?? existingCategoryId;

    if (input.group || input.categoryId) {
      if (
        isDefaultCategoryId(nextCategoryId) &&
        !isValidCategoryForGroup(nextGroup, nextCategoryId)
      ) {
        throw new Error(`Category ${nextCategoryId} does not belong to group ${nextGroup}`);
      }

      await assertActiveCategoryForGroup(nextGroup, nextCategoryId);
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
        (id, budget_year_id, "group", category_id, amount, description, start_year, start_month, end_year, end_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        [
          newRecurringRuleId,
          existing.budget_year_id,
          nextGroup,
          nextCategoryId,
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
        `SELECT e.id, e.budget_month_id, e."group" as "group", e.category_id, e.amount
         FROM budget_expenses e
         JOIN budget_months m ON m.id = e.budget_month_id
         WHERE e.recurring_rule_id = ?
           AND m.budget_year_id = ?
           AND m.month >= ?`,
        [existing.recurring_rule_id, existing.budget_year_id, Number(existing.month)],
      );

      for (const expense of futureExpenses) {
        const currentGroup = expense.group as GroupType;

        if (currentGroup === nextGroup) {
          const delta = input.amount - Number(expense.amount);
          await run(
            `UPDATE budget_allocations
             SET spent = spent + ?, updated_at = ?
             WHERE budget_month_id = ? AND "group" = ?`,
            [delta, now, expense.budget_month_id, currentGroup],
          );
        } else {
          await run(
            `UPDATE budget_allocations
             SET spent = spent - ?, updated_at = ?
             WHERE budget_month_id = ? AND "group" = ?`,
            [expense.amount, now, expense.budget_month_id, currentGroup],
          );
          await run(
            `UPDATE budget_allocations
             SET spent = spent + ?, updated_at = ?
             WHERE budget_month_id = ? AND "group" = ?`,
            [input.amount, now, expense.budget_month_id, nextGroup],
          );
        }

        await run(
          `UPDATE budget_expenses
            SET "group" = ?, category_id = ?, amount = ?, description = ?, recurring_rule_id = ?, updated_at = ?
              WHERE id = ?`,
          [
            nextGroup,
            nextCategoryId,
            input.amount,
            input.description,
            newRecurringRuleId,
            now,
            expense.id,
          ],
        );
      }

      return {
        id: existing.id,
        budgetMonthId: existing.budget_month_id,
        group: nextGroup,
        categoryId: nextCategoryId,
        amount: input.amount,
        description: input.description,
        recurringRuleId: newRecurringRuleId,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    }

    const now = getCurrentTimestamp();
    if (existingGroup === nextGroup) {
      const delta = input.amount - Number(existing.amount);
      // noinspection SqlNoDataSourceInspection
      await run(
        `UPDATE budget_allocations
         SET spent = spent + ?, updated_at = ?
         WHERE budget_month_id = ? AND "group" = ?`,
        [delta, now, existing.budget_month_id, existingGroup],
      );
    } else {
      await run(
        `UPDATE budget_allocations
         SET spent = spent - ?, updated_at = ?
         WHERE budget_month_id = ? AND "group" = ?`,
        [existing.amount, now, existing.budget_month_id, existingGroup],
      );
      await run(
        `UPDATE budget_allocations
         SET spent = spent + ?, updated_at = ?
         WHERE budget_month_id = ? AND "group" = ?`,
        [input.amount, now, existing.budget_month_id, nextGroup],
      );
    }

    // noinspection SqlNoDataSourceInspection
    await run(
      `UPDATE budget_expenses
       SET "group" = ?, category_id = ?, amount = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [nextGroup, nextCategoryId, input.amount, input.description, now, input.expenseId],
    );

    if (existing.recurring_rule_id && input.applyToFuture === false) {
      await run(`UPDATE budget_expenses SET recurring_rule_id = NULL WHERE id = ?`, [
        input.expenseId,
      ]);
    }

    return {
      id: existing.id,
      budgetMonthId: existing.budget_month_id,
      group: nextGroup,
      categoryId: nextCategoryId,
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
      `SELECT e.id, e.budget_month_id, e."group" as "group", e.category_id, e.amount, e.recurring_rule_id, m.budget_year_id, m.month, m.year
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
        `SELECT e.id, e.budget_month_id, e."group" as "group", e.category_id, e.amount
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
           WHERE budget_month_id = ? AND "group" = ?`,
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
       WHERE budget_month_id = ? AND "group" = ?`,
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
       WHERE "group" = ? AND category_id = ?`,
      [input.replacementCategoryId, now, input.group, input.categoryId],
    );

    await run(
      `UPDATE recurring_expense_rules
       SET category_id = ?, updated_at = ?
       WHERE "group" = ? AND category_id = ?`,
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

    const months = await query<{ id: string; monthly_income: number }>(
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
    }

    await writeAllocations(
      months.map((month) => ({ id: month.id, monthly_income: input.monthlyIncome })),
      input.split,
      now,
    );
  },

  async updateBudgetSplitForYear(input: UpdateBudgetSplitInput): Promise<void> {
    const now = getCurrentTimestamp();

    await run(`UPDATE budget_years SET split = ?, updated_at = ? WHERE id = ?`, [
      JSON.stringify(input.split),
      now,
      input.budgetYearId,
    ]);

    const months = await query<{ id: string; monthly_income: number }>(
      `SELECT id, monthly_income FROM budget_months WHERE budget_year_id = ?`,
      [input.budgetYearId],
    );

    await writeAllocations(months, input.split, now);
  },

  async createYearWithAllocations(
    monthlyIncome: number,
    year: number,
    currency: SupportedCurrency,
    split?: BudgetSplit,
  ): Promise<{ budgetYear: BudgetYear; months: BudgetMonth[] }> {
    const budgetYear = await sqliteBudgetRepository.createBudgetYear({
      monthlyIncome,
      year,
      currency,
      split,
    });
    const allocatedByGroup = allocateBudget(monthlyIncome, budgetYear.split);
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
        const allocation = await sqliteBudgetRepository.createBudgetAllocation({
          budgetMonthId: budgetMonth.id,
          group,
          allocated: allocatedByGroup[group],
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

  async exportDatabase(): Promise<BudgetDatabaseSnapshot> {
    const [budgetYears, budgetMonths, budgetAllocations, budgetExpenses, recurringExpenseRules] =
      await Promise.all([
        query(`SELECT * FROM budget_years`),
        query(`SELECT * FROM budget_months`),
        query(`SELECT * FROM budget_allocations`),
        query(`SELECT * FROM budget_expenses`),
        query(`SELECT * FROM recurring_expense_rules`),
      ]);
    const expenseCategoriesRows = await query(`SELECT * FROM expense_categories`);
    const expenseCategories = expenseCategoriesRows.map((row) => {
      const categoryRow = row as {
        id: string;
        group_name: string;
        order_index: number;
        name: string | null;
        is_default: number;
        is_active: number;
        deleted_at: string | null;
        created_at: string;
        updated_at: string;
      };

      return {
        id: categoryRow.id,
        group: categoryRow.group_name,
        order: categoryRow.order_index,
        name: categoryRow.name,
        is_default: categoryRow.is_default === 1,
        is_active: categoryRow.is_active === 1,
        deleted_at: categoryRow.deleted_at,
        created_at: categoryRow.created_at,
        updated_at: categoryRow.updated_at,
      };
    });

    return createBudgetDatabaseSnapshot(
      {
        budget_years: budgetYears,
        budget_months: budgetMonths,
        budget_allocations: budgetAllocations,
        budget_expenses: budgetExpenses,
        recurring_expense_rules: recurringExpenseRules,
        expense_categories: expenseCategories,
      },
      APP_VERSION,
    );
  },

  async importDatabase(snapshot: unknown): Promise<void> {
    assertValidBudgetDatabaseSnapshot(snapshot);

    await run('BEGIN TRANSACTION');

    try {
      await run('DELETE FROM budget_expenses');
      await run('DELETE FROM recurring_expense_rules');
      await run('DELETE FROM budget_allocations');
      await run('DELETE FROM budget_months');
      await run('DELETE FROM budget_years');
      await run('DELETE FROM expense_categories');

      for (const row of snapshot.data.budget_years) {
        const budgetYear = row as BudgetYearRow;
        await run(
          `INSERT INTO budget_years
            (id, monthly_income, year, currency, split, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            budgetYear.id,
            budgetYear.monthly_income,
            budgetYear.year,
            budgetYear.currency,
            JSON.stringify(parseBudgetSplit(budgetYear.split)),
            budgetYear.created_at,
            budgetYear.updated_at,
          ],
        );
      }

      for (const row of snapshot.data.budget_months) {
        const budgetMonth = row as {
          id: string;
          budget_year_id: string;
          month: number;
          year: number;
          monthly_income: number;
          created_at: string;
          updated_at: string;
        };
        await run(
          `INSERT INTO budget_months (id, budget_year_id, month, year, monthly_income, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            budgetMonth.id,
            budgetMonth.budget_year_id,
            budgetMonth.month,
            budgetMonth.year,
            budgetMonth.monthly_income,
            budgetMonth.created_at,
            budgetMonth.updated_at,
          ],
        );
      }

      for (const row of snapshot.data.budget_allocations) {
        const budgetAllocation = row as {
          id: string;
          budget_month_id: string;
          group: string;
          allocated: number;
          spent: number;
          created_at: string;
          updated_at: string;
        };
        await run(
          `INSERT INTO budget_allocations (id, budget_month_id, "group", allocated, spent, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            budgetAllocation.id,
            budgetAllocation.budget_month_id,
            budgetAllocation.group,
            budgetAllocation.allocated,
            budgetAllocation.spent,
            budgetAllocation.created_at,
            budgetAllocation.updated_at,
          ],
        );
      }

      for (const row of snapshot.data.recurring_expense_rules) {
        const recurringRule = row as {
          id: string;
          budget_year_id: string;
          group: string;
          category_id: string;
          amount: number;
          description: string;
          start_year: number;
          start_month: number;
          end_year: number | null;
          end_month: number | null;
          created_at: string;
          updated_at: string;
        };
        await run(
          `INSERT INTO recurring_expense_rules
           (id, budget_year_id, "group", category_id, amount, description, start_year, start_month, end_year, end_month, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recurringRule.id,
            recurringRule.budget_year_id,
            recurringRule.group,
            recurringRule.category_id,
            recurringRule.amount,
            recurringRule.description,
            recurringRule.start_year,
            recurringRule.start_month,
            recurringRule.end_year,
            recurringRule.end_month,
            recurringRule.created_at,
            recurringRule.updated_at,
          ],
        );
      }

      for (const row of snapshot.data.budget_expenses) {
        const expense = row as {
          id: string;
          budget_month_id: string;
          group: string;
          category_id: string;
          amount: number;
          description: string;
          recurring_rule_id: string | null;
          created_at: string;
          updated_at: string;
        };
        await run(
          `INSERT INTO budget_expenses
           (id, budget_month_id, "group", category_id, amount, description, recurring_rule_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            expense.id,
            expense.budget_month_id,
            expense.group,
            expense.category_id,
            expense.amount,
            expense.description,
            expense.recurring_rule_id,
            expense.created_at,
            expense.updated_at,
          ],
        );
      }

      for (const row of snapshot.data.expense_categories) {
        const category = normalizeCategorySnapshotRow(row as Record<string, unknown>);
        await run(
          `INSERT INTO expense_categories
           (id, group_name, order_index, name, is_default, is_active, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.group_name,
            category.order_index,
            category.name,
            category.is_default,
            category.is_active,
            category.deleted_at,
            category.created_at,
            category.updated_at,
          ],
        );
      }

      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  },
};
