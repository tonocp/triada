<template>
  <div ref="swipeEl" class="page-container">
    <div class="dashboard-header">
      <div class="month-selector">
        <Button icon="pi pi-chevron-left" severity="secondary" outlined @click="previousMonth" />
        <DatePicker
          :model-value="selectedPeriod"
          view="month"
          date-format="MM yy"
          :manual-input="false"
          update-model-type="date"
          class="month-picker"
          @update:model-value="onPeriodChange"
        />
        <Button icon="pi pi-chevron-right" severity="secondary" outlined @click="nextMonth" />
      </div>
    </div>

    <div class="budget-summary" v-if="budgetMonth && budgetYear">
      <BudgetHero
        :label="t('dashboard.monthlyIncome')"
        :income="budgetMonth.monthlyIncome"
        :buckets="allocations"
        :ring-caption="t('dashboard.spent')"
        :ring-value="formatCurrencyValue(totalSpent)"
        :ring-sub="ringSub"
        show-allocated
      >
        <template #action>
          <Button
            id="edit-monthly-income"
            :label="t('dashboard.editMonthlyIncome')"
            icon="pi pi-pencil"
            text
            size="small"
            class="edit-income-button"
            @click="openEditMonthlyIncome"
          />
        </template>
      </BudgetHero>
    </div>

    <div v-if="budgetMonth" class="groups-section">
      <GroupDisplay
        v-for="allocation in allocations"
        :key="allocation.group"
        :group="allocation.group"
        :allocated="allocation.allocated"
        :spent="allocation.spent"
        :interactive="true"
        @select="openExpenseHistory"
      />
    </div>

    <div v-else class="empty-state">
      <p>{{ t('dashboard.noBudgetForPeriod') }}</p>
    </div>

    <ExpenseSheet
      v-model:visible="showExpenseSheet"
      :mode="sheetMode"
      :expense="editingExpense"
      :categories-by-group="categoriesByGroup"
      :category-label="categoryLabel"
      :month-label="sheetMonthLabel"
      @submit="handleExpenseSubmit"
      @manage-categories="openManageCategories"
    />

    <Dialog
      v-model:visible="showManageCategories"
      modal
      :header="t('dashboard.manageCategories')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.group') }}</label>
          <div class="category-options" role="radiogroup" :aria-label="t('dashboard.group')">
            <label
              v-for="cat in groups"
              :key="`manage-${cat}`"
              class="category-option"
              :class="{ 'category-option--selected': managingGroup === cat }"
            >
              <RadioButton
                v-model="managingGroup"
                name="manage-group"
                :input-id="`manage-group-${cat}`"
                :value="cat"
              />
              <span>{{ t(`groups.${cat}`) }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.newCategory') }}</label>
          <div class="category-form-row">
            <Input
              v-model="newCategoryName"
              id="new-category-name"
              data-testid="new-category-name-input"
              :placeholder="t('dashboard.newCategoryPlaceholder')"
              input-class="w-full"
            />
            <Button
              id="add-category"
              data-testid="add-category-submit"
              :label="t('common.add')"
              icon="pi pi-plus"
              :disabled="!canCreateCategory"
              @click="addCategory"
            />
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.activeCategories') }}</label>
          <div class="category-options">
            <div
              v-for="category in activeCategoriesByManagingGroup"
              :key="`active-${category.id}`"
              class="category-row"
              :data-testid="`category-row-${category.id}`"
            >
              <span>{{ categoryLabel(category) }}</span>
              <div class="category-row-actions">
                <Button
                  v-if="!category.isDefault"
                  :data-testid="`edit-category-${category.id}`"
                  :label="t('dashboard.editCategory')"
                  severity="secondary"
                  text
                  size="small"
                  @click="openCategoryEdit(category)"
                />
                <Button
                  :data-testid="`delete-category-${category.id}`"
                  :label="t('dashboard.deleteCategory')"
                  severity="danger"
                  text
                  size="small"
                  :disabled="activeCategoriesByManagingGroup.length <= 1"
                  @click="askCategoryDelete(category)"
                />
              </div>
            </div>
          </div>
          <small class="help-text">{{ t('dashboard.deleteCategoryHelp') }}</small>
        </div>
      </div>
      <template #footer>
        <Button
          :label="t('common.close')"
          severity="secondary"
          @click="showManageCategories = false"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showEditCategoryDialog"
      modal
      :header="t('dashboard.editCategory')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.categoryName') }}</label>
          <Input
            v-model="editCategoryName"
            id="edit-category-name"
            :placeholder="t('dashboard.newCategoryPlaceholder')"
            input-class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="closeCategoryEditDialog" />
        <Button
          id="save-category-name"
          :label="t('common.save')"
          :disabled="!canSaveCategoryName"
          @click="saveCategoryName"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showDeleteCategoryConfirm"
      modal
      :header="t('dashboard.deleteCategory')"
      :style="{ width: '90vw' }"
    >
      <p>{{ t('dashboard.reassignCategoryPrompt') }}</p>
      <div class="form-group">
        <label>{{ t('dashboard.replacementCategory') }}</label>
        <div
          class="category-options"
          role="radiogroup"
          :aria-label="t('dashboard.replacementCategory')"
        >
          <label
            v-for="category in replacementCategories"
            :key="`replacement-${category.id}`"
            class="category-option"
            :class="{ 'category-option--selected': replacementCategoryId === category.id }"
          >
            <RadioButton
              v-model="replacementCategoryId"
              name="replacement-category"
              :input-id="`replacement-category-${category.id}`"
              :value="category.id"
            />
            <span>{{ categoryLabel(category) }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="showDeleteCategoryConfirm = false"
        />
        <Button
          id="confirm-category-delete"
          :label="t('dashboard.deleteCategory')"
          severity="danger"
          :disabled="!canConfirmCategoryDelete"
          @click="confirmCategoryDelete"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showExpenseHistory"
      modal
      :header="expenseHistoryTitle"
      :style="{ width: '90vw' }"
    >
      <div v-if="selectedGroupExpenses.length === 0" class="empty-state">
        <p>{{ t('dashboard.noExpensesForGroup') }}</p>
      </div>
      <ul v-else class="expense-history-list">
        <li v-for="expense in selectedGroupExpenses" :key="expense.id" class="expense-history-item">
          <div class="expense-history-content">
            <div class="expense-history-top-row">
              <span class="expense-history-amount">{{ formatCurrencyValue(expense.amount) }}</span>
              <div class="expense-history-actions">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  severity="secondary"
                  class="expense-history-action-button"
                  :aria-label="t('dashboard.editExpense')"
                  @click="startExpenseEdit(expense)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  class="expense-history-action-button"
                  :aria-label="t('dashboard.deleteExpense')"
                  @click="askExpenseDelete(expense)"
                />
              </div>
            </div>
            <div class="expense-history-tags">
              <span class="expense-history-category">{{ expenseCategoryLabel(expense) }}</span>
            </div>
            <span class="expense-history-description">{{ expense.description }}</span>
            <div class="expense-history-meta-row">
              <span class="expense-history-date">{{ formatExpenseDate(expense.createdAt) }}</span>
              <span v-if="expense.recurringRuleId" class="expense-history-recurring">
                {{ t('dashboard.recurring') }}
              </span>
            </div>
          </div>
        </li>
      </ul>
      <template #footer>
        <Button
          :label="t('common.close')"
          severity="secondary"
          @click="showExpenseHistory = false"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showDeleteExpenseConfirm"
      modal
      :header="t('dashboard.deleteExpense')"
      :style="{ width: '90vw' }"
    >
      <p>{{ t('dashboard.confirmDeleteExpense') }}</p>
      <div v-if="deletingExpenseIsRecurring" class="form-group recurring-toggle">
        <Checkbox v-model="deleteApplyToFuture" binary input-id="delete-apply-future" />
        <label for="delete-apply-future">{{ t('dashboard.applyToFutureMonths') }}</label>
      </div>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="showDeleteExpenseConfirm = false"
        />
        <Button
          id="confirm-expense-delete"
          :label="t('dashboard.deleteExpense')"
          severity="danger"
          @click="confirmExpenseDelete"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showEditMonthlyIncome"
      modal
      :header="t('dashboard.editMonthlyIncome')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('setup.monthlyIncome') }}</label>
          <Input
            v-model="editMonthlyIncome"
            id="monthly-income-edit-input"
            type="number"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
            input-class="w-full"
          />
        </div>
        <p class="help-text">{{ t('dashboard.editMonthlyIncomeScope') }}</p>
      </div>
      <template #footer>
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="showEditMonthlyIncome = false"
        />
        <Button
          :label="t('common.save')"
          :disabled="!isMonthlyIncomeValid"
          @click="saveMonthlyIncome"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { initDatabase } from '@/data/database';
import {
  createBudgetAllocation,
  createBudgetMonth,
  createCategory as createCategoryRecord,
  addExpense as createExpenseRecord,
  createYearWithAllocations,
  deleteExpense as deleteExpenseRecord,
  getBudgetMonth,
  getBudgetYearByYear,
  getCategoriesByGroup,
  getExpensesByMonthAndGroup,
  getLatestBudgetYear,
  softDeleteCategoryAndReassign,
  updateCategoryName as updateCategoryNameRecord,
  updateExpense as updateExpenseRecord,
  updateMonthlyIncomeFromMonth,
} from '@/data/repositories';
import {
  GROUP_ORDER,
  allocateBudget,
  compareGroups,
  type BudgetAllocation,
  type BudgetMonth,
  type BudgetYear,
  type Category,
  type CategoryId,
  type Expense,
  type GroupType,
} from '@/domain/entities';
import { Input } from '@/shared/components/atoms';
import { BudgetHero, GroupDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import { getIntlLocale, getLocale } from '@/shared/i18n';
import { fromMinorUnits, toMinorUnits } from '@/shared/utils/money';
import { useSwipe } from '@vueuse/core';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ExpenseSheet, { type ExpenseSheetSubmit } from '../components/ExpenseSheet.vue';
import { categoryLabeller } from '../utils/categoryLabel';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t, te } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();
const resolveCategoryLabel = categoryLabeller(t, te);

const budgetYear = ref<BudgetYear | null>(null);
const budgetMonth = ref<BudgetMonth | null>(null);
const activeYear = ref(new Date().getFullYear());
const activeMonth = ref(new Date().getMonth() + 1);
const selectedPeriod = ref<Date>(new Date(activeYear.value, activeMonth.value - 1, 1));
let isRepairingYear = false;
let isRebuildingYear = false;

const swipeEl = ref<HTMLElement | null>(null);
const showExpenseSheet = ref(false);
const sheetMode = ref<'add' | 'edit'>('add');
const editingExpense = ref<Expense | null>(null);
const showExpenseHistory = ref(false);
const showDeleteExpenseConfirm = ref(false);
const showEditMonthlyIncome = ref(false);
const showManageCategories = ref(false);
const showDeleteCategoryConfirm = ref(false);
const showEditCategoryDialog = ref(false);
const selectedHistoryGroup = ref<GroupType | null>(null);
const selectedGroupExpenses = ref<Expense[]>([]);
const expensePendingDelete = ref<Expense | null>(null);
const deletingExpenseIsRecurring = ref(false);
const deleteApplyToFuture = ref(true);
const editMonthlyIncome = ref('');
const managingGroup = ref<GroupType>('needs');
const categoryPendingDelete = ref<Category | null>(null);
const categoryPendingEdit = ref<Category | null>(null);
const replacementCategoryId = ref<CategoryId | ''>('');
const newCategoryName = ref('');
const editCategoryName = ref('');
const categoriesByGroup = ref<Record<GroupType, Category[]>>({
  needs: [],
  wants: [],
  savings: [],
});

const groups = GROUP_ORDER;

function formatDate(value: Date | string, options: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat(getIntlLocale(getLocale()), options).format(date);
}

const sheetMonthLabel = computed(() =>
  formatDate(selectedPeriod.value, { month: 'long', year: 'numeric' }),
);

const allocations = computed<BudgetAllocation[]>(() => {
  return [...(budgetMonth.value?.allocations ?? [])].sort((left, right) =>
    compareGroups(left.group, right.group),
  );
});

const totalSpent = computed(() =>
  allocations.value.reduce((total, allocation) => total + allocation.spent, 0),
);

const ringSub = computed(() =>
  budgetMonth.value
    ? t('dashboard.ringSpentOf', {
        total: formatCurrencyValue(budgetMonth.value.monthlyIncome),
      })
    : '',
);

const activeCategoriesByManagingGroup = computed<Category[]>(() => {
  return categoriesByGroup.value[managingGroup.value].filter((category) => category.isActive);
});

const replacementCategories = computed<Category[]>(() => {
  if (!categoryPendingDelete.value) {
    return [];
  }

  return activeCategoriesByManagingGroup.value.filter(
    (category) => category.id !== categoryPendingDelete.value?.id,
  );
});

const isMonthlyIncomeValid = computed(() => {
  const amount = parseFloat(editMonthlyIncome.value);
  return !Number.isNaN(amount) && amount > 0;
});

const canConfirmCategoryDelete = computed(() => {
  return categoryPendingDelete.value !== null && replacementCategoryId.value !== '';
});

const canCreateCategory = computed(() => {
  return newCategoryName.value.trim().length >= 2;
});

const canSaveCategoryName = computed(() => {
  const trimmed = editCategoryName.value.trim();
  const currentName = categoryPendingEdit.value?.name?.trim() ?? '';
  return trimmed.length >= 2 && trimmed !== currentName;
});

const expenseHistoryTitle = computed(() => {
  if (!selectedHistoryGroup.value) {
    return `${t('dashboard.expenseHistoryTitle', { group: '' })} (0)`;
  }

  const title = t('dashboard.expenseHistoryTitle', {
    group: t(`groups.${selectedHistoryGroup.value}`),
  });

  return `${title} (${selectedGroupExpenses.value.length})`;
});

function setActivePeriod(year: number, month: number): void {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (!Number.isFinite(normalizedYear) || !Number.isFinite(normalizedMonth)) {
    return;
  }

  const clampedMonth = Math.min(12, Math.max(1, Math.trunc(normalizedMonth)));
  const normalizedDate = new Date(Math.trunc(normalizedYear), clampedMonth - 1, 1);

  activeYear.value = normalizedDate.getFullYear();
  activeMonth.value = normalizedDate.getMonth() + 1;
  selectedPeriod.value = new Date(activeYear.value, activeMonth.value - 1, 1);
}

function toInteger(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveInitialPeriod(defaultYear: number): { year: number; month: number } {
  const queryYear = toInteger(route.query.year);
  const queryMonth = toInteger(route.query.month);
  const year = queryYear ?? defaultYear;
  const month = queryMonth && queryMonth >= 1 && queryMonth <= 12 ? queryMonth : activeMonth.value;

  return { year, month };
}

function previousMonth(): void {
  shiftMonth(-1);
}

function nextMonth(): void {
  shiftMonth(1);
}

async function loadMonthData(): Promise<void> {
  const normalizedYear = Number(activeYear.value);
  const normalizedMonth = Number(activeMonth.value);

  if (!Number.isFinite(normalizedYear) || !Number.isFinite(normalizedMonth)) {
    budgetYear.value = null;
    budgetMonth.value = null;
    return;
  }

  const resolvedBudgetYear = await getBudgetYearByYear(normalizedYear);
  if (!resolvedBudgetYear) {
    budgetYear.value = null;
    budgetMonth.value = null;
    return;
  }

  budgetYear.value = resolvedBudgetYear;
  const selectedMonthData = await getBudgetMonth(resolvedBudgetYear.id, normalizedMonth);
  if (selectedMonthData) {
    budgetMonth.value = selectedMonthData;
    return;
  }

  for (let month = 1; month <= 12; month++) {
    const monthData = await getBudgetMonth(resolvedBudgetYear.id, month);
    if (monthData) {
      setActivePeriod(resolvedBudgetYear.year, month);
      budgetMonth.value = monthData;
      return;
    }
  }

  if (!isRepairingYear) {
    isRepairingYear = true;

    try {
      await repairMissingMonths(resolvedBudgetYear);
      const repairedMonth = await getBudgetMonth(resolvedBudgetYear.id, activeMonth.value);
      if (repairedMonth) {
        budgetMonth.value = repairedMonth;
        return;
      }

      for (let month = 1; month <= 12; month++) {
        const monthData = await getBudgetMonth(resolvedBudgetYear.id, month);
        if (monthData) {
          setActivePeriod(resolvedBudgetYear.year, month);
          budgetMonth.value = monthData;
          return;
        }
      }
    } finally {
      isRepairingYear = false;
    }
  }

  if (!isRebuildingYear) {
    isRebuildingYear = true;

    try {
      const rebuilt = await createYearWithAllocations(
        resolvedBudgetYear.monthlyIncome,
        resolvedBudgetYear.year,
        resolvedBudgetYear.currency,
        resolvedBudgetYear.split,
      );

      budgetYear.value = rebuilt.budgetYear;

      const rebuiltMonth = await getBudgetMonth(rebuilt.budgetYear.id, activeMonth.value);
      if (rebuiltMonth) {
        budgetMonth.value = rebuiltMonth;
        return;
      }

      for (let month = 1; month <= 12; month++) {
        const monthData = await getBudgetMonth(rebuilt.budgetYear.id, month);
        if (monthData) {
          setActivePeriod(rebuilt.budgetYear.year, month);
          budgetMonth.value = monthData;
          return;
        }
      }
    } catch (error) {
      console.error('Failed to rebuild budget year data', error);
    } finally {
      isRebuildingYear = false;
    }
  }

  budgetMonth.value = null;
}

async function repairMissingMonths(year: BudgetYear): Promise<void> {
  if (!Number.isFinite(year.monthlyIncome) || year.monthlyIncome <= 0) {
    console.error('Cannot repair budget year with invalid monthly income', year);
    return;
  }

  const allocatedByGroup = allocateBudget(year.monthlyIncome, year.split);

  for (let month = 1; month <= 12; month++) {
    let existingMonth = await getBudgetMonth(year.id, month);

    if (!existingMonth) {
      try {
        const createdMonth = await createBudgetMonth({
          budgetYearId: year.id,
          month,
          year: year.year,
          monthlyIncome: year.monthlyIncome,
        });

        existingMonth = {
          ...createdMonth,
          allocations: [],
        };
      } catch (error) {
        console.warn('Failed to create missing month, retrying fetch', {
          year: year.year,
          month,
          error,
        });

        existingMonth = await getBudgetMonth(year.id, month);
      }
    }

    if (!existingMonth) {
      continue;
    }

    for (const group of GROUP_ORDER) {
      const hasAllocation = existingMonth.allocations.some((item) => item.group === group);
      if (hasAllocation) {
        continue;
      }

      try {
        await createBudgetAllocation({
          budgetMonthId: existingMonth.id,
          group,
          allocated: allocatedByGroup[group],
        });
      } catch (error) {
        console.warn('Failed to create missing allocation, continuing', {
          year: year.year,
          month,
          group,
          error,
        });
      }
    }
  }
}

function openEditMonthlyIncome(): void {
  if (!budgetMonth.value) {
    return;
  }

  editMonthlyIncome.value = fromMinorUnits(budgetMonth.value.monthlyIncome);
  showEditMonthlyIncome.value = true;
}

async function saveMonthlyIncome(): Promise<void> {
  if (!budgetYear.value || !budgetMonth.value || !isMonthlyIncomeValid.value) {
    return;
  }

  const amount = toMinorUnits(editMonthlyIncome.value);
  if (amount <= 0) {
    return;
  }

  try {
    await updateMonthlyIncomeFromMonth({
      budgetYearId: budgetYear.value.id,
      fromMonth: budgetMonth.value.month,
      monthlyIncome: amount,
      split: budgetYear.value.split,
    });

    await refreshMonthData();
    showEditMonthlyIncome.value = false;

    toast.add({
      severity: 'success',
      summary: t('dashboard.monthlyIncomeUpdated'),
      detail: t('dashboard.monthlyIncomeUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update monthly income from month', {
      error,
      budgetYearId: budgetYear.value.id,
      fromMonth: budgetMonth.value.month,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.monthlyIncomeUpdateError'),
      life: 3000,
    });
  }
}

async function refreshMonthData(): Promise<void> {
  try {
    await loadMonthData();
  } catch (error) {
    console.error('Failed to load month data:', error);
  }
}

function shiftMonth(delta: number): void {
  const nextDate = new Date(activeYear.value, activeMonth.value - 1, 1);
  nextDate.setMonth(nextDate.getMonth() + delta);

  setActivePeriod(nextDate.getFullYear(), nextDate.getMonth() + 1);
  void refreshMonthData();
}

function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'value' in value) {
    return toDate((value as { value: unknown }).value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValid = value.find(
      (entry) => entry instanceof Date && !Number.isNaN(entry.getTime()),
    );
    return firstValid ?? null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function onPeriodChange(value: unknown): void {
  const parsedDate = toDate(value);
  if (!parsedDate) {
    console.error('Invalid period received from DatePicker', value);
    selectedPeriod.value = new Date(activeYear.value, activeMonth.value - 1, 1);
    return;
  }

  setActivePeriod(parsedDate.getFullYear(), parsedDate.getMonth() + 1);
  void refreshMonthData();
}

async function handleExpenseSubmit(payload: ExpenseSheetSubmit): Promise<void> {
  if (sheetMode.value === 'edit') {
    await saveExpenseEdit(payload);
    return;
  }
  await addExpense(payload);
}

async function addExpense(payload: ExpenseSheetSubmit): Promise<void> {
  if (!budgetMonth.value) {
    return;
  }

  try {
    await createExpenseRecord({
      budgetMonthId: budgetMonth.value.id,
      group: payload.group,
      categoryId: payload.categoryId,
      amount: payload.amount,
      description: payload.description,
      isRecurring: payload.isRecurring,
    });

    await refreshMonthData();
    if (showExpenseHistory.value && selectedHistoryGroup.value === payload.group) {
      await refreshExpenseHistory();
    }

    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseAdded'),
      detail: t('dashboard.expenseAdded'),
      life: 3000,
    });

    showExpenseSheet.value = false;
  } catch (error) {
    console.error('Failed to add expense to allocation', {
      error,
      budgetMonthId: budgetMonth.value.id,
      group: payload.group,
      categoryId: payload.categoryId,
    });

    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseAddError'),
      life: 3000,
    });
  }
}

function openAddExpense(): void {
  sheetMode.value = 'add';
  editingExpense.value = null;
  showExpenseSheet.value = true;
}

function formatExpenseDate(value: string): string {
  return formatDate(value, { dateStyle: 'medium' });
}

async function openExpenseHistory(group: GroupType): Promise<void> {
  if (!budgetMonth.value) {
    return;
  }

  selectedHistoryGroup.value = group;

  try {
    await refreshExpenseHistory();
    showExpenseHistory.value = true;
  } catch (error) {
    console.error('Failed to load expenses for group', {
      error,
      budgetMonthId: budgetMonth.value.id,
      group,
    });

    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseHistoryError'),
      life: 3000,
    });
  }
}

async function refreshExpenseHistory(): Promise<void> {
  if (!budgetMonth.value || !selectedHistoryGroup.value) {
    selectedGroupExpenses.value = [];
    return;
  }

  selectedGroupExpenses.value = await getExpensesByMonthAndGroup(
    budgetMonth.value.id,
    selectedHistoryGroup.value,
  );
}

function startExpenseEdit(expense: Expense): void {
  sheetMode.value = 'edit';
  editingExpense.value = expense;
  showExpenseSheet.value = true;
}

async function saveExpenseEdit(payload: ExpenseSheetSubmit): Promise<void> {
  const target = editingExpense.value;
  if (!target) {
    return;
  }

  try {
    await updateExpenseRecord({
      expenseId: target.id,
      amount: payload.amount,
      description: payload.description,
      group: payload.group,
      categoryId: payload.categoryId,
      applyToFuture: target.recurringRuleId !== null ? payload.applyToFuture : false,
    });

    await refreshMonthData();
    await refreshExpenseHistory();

    showExpenseSheet.value = false;
    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseUpdated'),
      detail: t('dashboard.expenseUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update expense', { error, expenseId: target.id });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseUpdateError'),
      life: 3000,
    });
  }
}

function askExpenseDelete(expense: Expense): void {
  expensePendingDelete.value = expense;
  deletingExpenseIsRecurring.value = expense.recurringRuleId !== null;
  deleteApplyToFuture.value = true;
  showDeleteExpenseConfirm.value = true;
}

async function confirmExpenseDelete(): Promise<void> {
  if (!expensePendingDelete.value) {
    return;
  }

  const targetExpense = expensePendingDelete.value;

  try {
    await deleteExpenseRecord({
      expenseId: targetExpense.id,
      applyToFuture: deletingExpenseIsRecurring.value ? deleteApplyToFuture.value : false,
    });

    await refreshMonthData();
    await refreshExpenseHistory();

    showDeleteExpenseConfirm.value = false;
    expensePendingDelete.value = null;
    deletingExpenseIsRecurring.value = false;

    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseDeleted'),
      detail: t('dashboard.expenseDeleted'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete expense', {
      error,
      expenseId: targetExpense.id,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseDeleteError'),
      life: 3000,
    });
  }
}

async function loadData(): Promise<void> {
  try {
    await initDatabase();

    const year = await getLatestBudgetYear();
    if (!year) {
      void router.replace({ name: 'setup' });
      return;
    }

    const initialPeriod = resolveInitialPeriod(year.year);
    setActivePeriod(initialPeriod.year, initialPeriod.month);
    await loadCategories();
    await refreshMonthData();
  } catch (error) {
    console.error('Failed to load data:', error);
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('setup.errorCreating'),
      life: 3000,
    });
  }
}

async function loadCategories(): Promise<void> {
  const [needs, wants, savings] = await Promise.all([
    getCategoriesByGroup('needs'),
    getCategoriesByGroup('wants'),
    getCategoriesByGroup('savings'),
  ]);

  categoriesByGroup.value = {
    needs,
    wants,
    savings,
  };
}

function openManageCategories(group: GroupType | '' = ''): void {
  managingGroup.value = group === '' ? 'needs' : group;
  newCategoryName.value = '';
  showManageCategories.value = true;
}

function categoryLabel(category: Category): string {
  return resolveCategoryLabel(category, category.id);
}

function expenseCategoryLabel(expense: Expense): string {
  const category = categoriesByGroup.value[expense.group].find(
    (item) => item.id === expense.categoryId,
  );
  return resolveCategoryLabel(category, expense.categoryId);
}

async function addCategory(): Promise<void> {
  const name = newCategoryName.value.trim();
  if (name.length < 2) {
    return;
  }

  try {
    await createCategoryRecord({
      group: managingGroup.value,
      name,
    });

    await loadCategories();
    newCategoryName.value = '';

    toast.add({
      severity: 'success',
      summary: t('dashboard.categoryCreated'),
      detail: t('dashboard.categoryCreated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to create category', {
      error,
      group: managingGroup.value,
      name,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.categoryCreateError'),
      life: 3000,
    });
  }
}

function openCategoryEdit(category: Category): void {
  if (category.isDefault) {
    return;
  }

  categoryPendingEdit.value = category;
  editCategoryName.value = category.name ?? '';
  showEditCategoryDialog.value = true;
}

function closeCategoryEditDialog(): void {
  showEditCategoryDialog.value = false;
  categoryPendingEdit.value = null;
  editCategoryName.value = '';
}

async function saveCategoryName(): Promise<void> {
  if (!categoryPendingEdit.value || !canSaveCategoryName.value) {
    return;
  }

  const pendingCategory = categoryPendingEdit.value;
  const name = editCategoryName.value.trim();

  try {
    await updateCategoryNameRecord({
      group: pendingCategory.group,
      categoryId: pendingCategory.id,
      name,
    });

    await loadCategories();

    closeCategoryEditDialog();

    toast.add({
      severity: 'success',
      summary: t('dashboard.categoryUpdated'),
      detail: t('dashboard.categoryUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update category name', {
      error,
      categoryId: pendingCategory.id,
      group: pendingCategory.group,
      name,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.categoryUpdateError'),
      life: 3000,
    });
  }
}

function askCategoryDelete(category: Category): void {
  categoryPendingDelete.value = category;
  const firstReplacement = activeCategoriesByManagingGroup.value.find(
    (item) => item.id !== category.id,
  );
  replacementCategoryId.value = firstReplacement?.id ?? '';
  showDeleteCategoryConfirm.value = true;
}

async function confirmCategoryDelete(): Promise<void> {
  if (!categoryPendingDelete.value || replacementCategoryId.value === '') {
    return;
  }

  const pendingCategory = categoryPendingDelete.value;

  try {
    await softDeleteCategoryAndReassign({
      group: managingGroup.value,
      categoryId: pendingCategory.id,
      replacementCategoryId: replacementCategoryId.value,
    });

    await loadCategories();

    showDeleteCategoryConfirm.value = false;
    categoryPendingDelete.value = null;
    replacementCategoryId.value = '';

    toast.add({
      severity: 'success',
      summary: t('dashboard.categoryDeleted'),
      detail: t('dashboard.categoryDeleted'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to soft delete category', {
      error,
      group: managingGroup.value,
      categoryId: pendingCategory.id,
    });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.categoryDeleteError'),
      life: 3000,
    });
  }
}

watch(showManageCategories, (isVisible) => {
  if (!isVisible) {
    newCategoryName.value = '';
  }
});

watch(showEditCategoryDialog, (isVisible) => {
  if (!isVisible) {
    categoryPendingEdit.value = null;
    editCategoryName.value = '';
  }
});

useSwipe(swipeEl, {
  threshold: 60,
  onSwipeEnd(_event, direction) {
    if (direction === 'left') {
      shiftMonth(1);
    } else if (direction === 'right') {
      shiftMonth(-1);
    }
  },
});

function consumeAddExpenseIntent(): void {
  if (route.query.action !== 'add' || !budgetMonth.value) {
    return;
  }

  openAddExpense();

  const { action: _action, ...rest } = route.query;
  void router.replace({ query: rest });
}

watch(
  () => route.query,
  () => {
    const { year, month } = resolveInitialPeriod(activeYear.value);
    if (year !== activeYear.value || month !== activeMonth.value) {
      setActivePeriod(year, month);
      void refreshMonthData().then(consumeAddExpenseIntent);
    } else {
      consumeAddExpenseIntent();
    }
  },
);

onMounted(async () => {
  await loadData();
  consumeAddExpenseIntent();
});
</script>

<style scoped>
.dashboard-header {
  margin-bottom: 1.5rem;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.month-picker {
  min-width: 160px;
}

.empty-state {
  margin: 2rem 0;
  text-align: center;
  color: var(--t-ink-muted);
}

.budget-summary {
  margin-bottom: 1.5rem;
}

.edit-income-button {
  color: var(--t-accent);
}

.groups-section {
  margin-bottom: 2.5rem;
}

.expense-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recurring-toggle {
  flex-direction: row;
  align-items: center;
}

.form-group label {
  font-weight: 600;
}

.category-form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--p-input-border-color);
  background: var(--p-content-background);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.category-option--selected {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-input-border-color);
  border-radius: 8px;
}

.category-row-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.help-text {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.expense-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expense-history-item {
  padding: 0.875rem;
  border: 1px solid var(--p-input-border-color);
  border-radius: 10px;
  background: var(--p-content-background);
}

.expense-history-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-history-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.expense-history-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.expense-history-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.expense-history-category {
  width: fit-content;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--p-primary-200);
  background: var(--p-primary-50);
  color: var(--p-primary-700);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
}

.expense-history-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.expense-history-action-button {
  width: 2.25rem;
  height: 2.25rem;
}

.expense-history-amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.expense-history-description {
  font-size: 1.05rem;
  font-weight: 600;
}

.expense-history-date {
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.expense-history-recurring {
  width: fit-content;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--p-input-border-color);
  background: var(--p-surface-100);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}
</style>
