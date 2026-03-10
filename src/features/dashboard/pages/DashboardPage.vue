<template>
  <div class="page-container">
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
      <div class="summary-card">
        <span class="summary-label">{{ t('dashboard.monthlyIncome') }}</span>
        <span class="summary-value">{{ formatCurrencyValue(budgetMonth.monthlyIncome) }}</span>
        <Button
          id="edit-monthly-income"
          :label="t('dashboard.editMonthlyIncome')"
          icon="pi pi-pencil"
          text
          severity="contrast"
          class="summary-action"
          @click="openEditMonthlyIncome"
        />
      </div>
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

    <div v-if="budgetMonth && budgetYear" class="actions-section">
      <Button
        :label="t('dashboard.addExpense')"
        icon="pi pi-plus"
        class="w-full"
        @click="showAddExpense = true"
      />
    </div>

    <Dialog
      v-model:visible="showAddExpense"
      modal
      :header="t('dashboard.addExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.group') }}</label>
          <div class="category-options" role="radiogroup" :aria-label="t('dashboard.group')">
            <label
              v-for="cat in groups"
              :key="cat"
              class="category-option"
              :class="{ 'category-option--selected': expenseGroup === cat }"
            >
              <RadioButton
                v-model="expenseGroup"
                name="expense-group"
                :input-id="`expense-group-${cat}`"
                :value="cat"
              />
              <span>{{ t(`groups.${cat}`) }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.category') }}</label>
          <Button
            id="manage-categories"
            data-testid="open-manage-categories"
            :label="t('dashboard.manageCategories')"
            text
            size="small"
            class="manage-categories-action"
            @click="openManageCategories"
          />
          <div class="category-options" role="radiogroup" :aria-label="t('dashboard.category')">
            <label
              v-for="category in expenseCategories"
              :key="category.id"
              class="category-option"
              :class="{ 'category-option--selected': expenseCategoryId === category.id }"
            >
              <RadioButton
                v-model="expenseCategoryId"
                name="expense-category"
                :input-id="`expense-category-${category.id}`"
                :value="category.id"
                :disabled="expenseGroup === ''"
              />
              <span>{{ categoryLabel(category) }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.amount') }}</label>
          <Input
            v-model="expenseAmount"
            id="expense-amount"
            type="number"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
            :disabled="expenseCategoryId === ''"
            input-class="w-full"
          />
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.description') }}</label>
          <Input
            v-model="expenseDescription"
            :placeholder="t('dashboard.descriptionPlaceholder')"
            :disabled="expenseCategoryId === ''"
            input-class="w-full"
          />
        </div>
        <div class="form-group recurring-toggle">
          <Checkbox v-model="isRecurringExpense" binary input-id="expense-recurring" />
          <label for="expense-recurring">{{ t('dashboard.recurringExpense') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showAddExpense = false" />
        <Button
          :label="t('common.add')"
          icon="pi pi-check"
          :disabled="!isExpenseValid"
          @click="addExpense"
        />
      </template>
    </Dialog>

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
            <span class="expense-history-amount">{{ formatCurrencyValue(expense.amount) }}</span>
            <span class="expense-history-description">{{ expense.description }}</span>
            <span v-if="expense.recurringRuleId" class="expense-history-recurring">
              {{ t('dashboard.recurring') }}
            </span>
            <span class="expense-history-date">{{ formatExpenseDate(expense.createdAt) }}</span>
          </div>
          <div class="expense-history-actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              :aria-label="t('dashboard.editExpense')"
              @click="startExpenseEdit(expense)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              :aria-label="t('dashboard.deleteExpense')"
              @click="askExpenseDelete(expense)"
            />
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
      v-model:visible="showEditExpense"
      modal
      :header="t('dashboard.editExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.amount') }}</label>
          <Input
            v-model="editExpenseAmount"
            id="edit-expense-amount"
            type="number"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
            input-class="w-full"
          />
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.description') }}</label>
          <Input
            v-model="editExpenseDescription"
            id="edit-expense-description"
            :placeholder="t('dashboard.descriptionPlaceholder')"
            input-class="w-full"
          />
        </div>
        <div v-if="editingExpenseIsRecurring" class="form-group recurring-toggle">
          <Checkbox v-model="editApplyToFuture" binary input-id="edit-apply-future" />
          <label for="edit-apply-future">{{ t('dashboard.applyToFutureMonths') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showEditExpense = false" />
        <Button
          id="save-expense-edit"
          :label="t('common.save')"
          icon="pi pi-check"
          :disabled="!isEditExpenseValid"
          @click="saveExpenseEdit"
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
  GROUP_PERCENTAGES,
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
import { GroupDisplay } from '@/shared/components/molecules';
import { useCurrency } from '@/shared/composables/useCurrency';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { t, te, locale } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const budgetYear = ref<BudgetYear | null>(null);
const budgetMonth = ref<BudgetMonth | null>(null);
const activeYear = ref(new Date().getFullYear());
const activeMonth = ref(new Date().getMonth() + 1);
const selectedPeriod = ref<Date>(new Date(activeYear.value, activeMonth.value - 1, 1));
let isRepairingYear = false;
let isRebuildingYear = false;

const showAddExpense = ref(false);
const showExpenseHistory = ref(false);
const showEditExpense = ref(false);
const showDeleteExpenseConfirm = ref(false);
const showEditMonthlyIncome = ref(false);
const showManageCategories = ref(false);
const showDeleteCategoryConfirm = ref(false);
const showEditCategoryDialog = ref(false);
const expenseAmount = ref('');
const expenseGroup = ref<GroupType | ''>('');
const expenseCategoryId = ref<CategoryId | ''>('');
const expenseDescription = ref('');
const isRecurringExpense = ref(false);
const selectedHistoryGroup = ref<GroupType | null>(null);
const selectedGroupExpenses = ref<Expense[]>([]);
const editingExpenseId = ref<string | null>(null);
const editExpenseAmount = ref('');
const editExpenseDescription = ref('');
const editingExpenseIsRecurring = ref(false);
const editApplyToFuture = ref(true);
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

const allocations = computed<BudgetAllocation[]>(() => {
  return [...(budgetMonth.value?.allocations ?? [])].sort((left, right) =>
    compareGroups(left.group, right.group),
  );
});

const expenseCategories = computed<Category[]>(() => {
  if (expenseGroup.value === '') {
    return [];
  }

  return categoriesByGroup.value[expenseGroup.value];
});

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

const isExpenseValid = computed(() => {
  const amount = parseFloat(expenseAmount.value);
  const description = expenseDescription.value.trim();
  return (
    !Number.isNaN(amount) &&
    amount > 0 &&
    expenseGroup.value !== '' &&
    description.length >= 3 &&
    expenseCategoryId.value !== ''
  );
});

const isEditExpenseValid = computed(() => {
  const amount = parseFloat(editExpenseAmount.value);
  const description = editExpenseDescription.value.trim();
  return !Number.isNaN(amount) && amount > 0 && description.length >= 3;
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
    return t('dashboard.expenseHistoryTitle', { group: '' });
  }

  return t('dashboard.expenseHistoryTitle', {
    group: t(`groups.${selectedHistoryGroup.value}`),
  });
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
      const percentage = GROUP_PERCENTAGES[group];
      const hasAllocation = existingMonth.allocations.some((item) => item.group === group);
      if (hasAllocation) {
        continue;
      }

      const allocated = Math.floor((year.monthlyIncome * percentage) / 100);

      try {
        await createBudgetAllocation({
          budgetMonthId: existingMonth.id,
          group,
          allocated,
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

  const amount = toMinorUnits(parseFloat(editMonthlyIncome.value));
  if (amount <= 0) {
    return;
  }

  try {
    await updateMonthlyIncomeFromMonth({
      budgetYearId: budgetYear.value.id,
      fromMonth: budgetMonth.value.month,
      monthlyIncome: amount,
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

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function fromMinorUnits(amount: number): string {
  return (amount / 100).toFixed(2);
}

async function addExpense(): Promise<void> {
  if (!isExpenseValid.value || !budgetMonth.value) {
    return;
  }

  const normalizedAmount = parseFloat(expenseAmount.value);
  const amount = toMinorUnits(normalizedAmount);
  const selectedGroup = expenseGroup.value;
  const selectedCategoryId = expenseCategoryId.value;
  const description = expenseDescription.value.trim();

  if (amount <= 0 || selectedGroup === '' || selectedCategoryId === '' || description.length < 3) {
    return;
  }

  try {
    await createExpenseRecord({
      budgetMonthId: budgetMonth.value.id,
      group: selectedGroup,
      categoryId: selectedCategoryId,
      amount,
      description,
      isRecurring: isRecurringExpense.value,
    });

    await refreshMonthData();
    if (showExpenseHistory.value && selectedHistoryGroup.value === selectedGroup) {
      await refreshExpenseHistory();
    }

    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseAdded'),
      detail: t('dashboard.expenseAdded'),
      life: 3000,
    });

    showAddExpense.value = false;
    expenseAmount.value = '';
    expenseGroup.value = '';
    expenseCategoryId.value = '';
    expenseDescription.value = '';
    isRecurringExpense.value = false;
  } catch (error) {
    console.error('Failed to add expense to allocation', {
      error,
      budgetMonthId: budgetMonth.value.id,
      group: expenseGroup.value,
      categoryId: expenseCategoryId.value,
      amount,
      description,
    });

    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.expenseAddError'),
      life: 3000,
    });
  }
}

function formatExpenseDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-ES' : 'en-US', {
    dateStyle: 'medium',
  }).format(parsed);
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
  editingExpenseId.value = expense.id;
  editExpenseAmount.value = fromMinorUnits(expense.amount);
  editExpenseDescription.value = expense.description;
  editingExpenseIsRecurring.value = expense.recurringRuleId !== null;
  editApplyToFuture.value = true;
  showEditExpense.value = true;
}

async function saveExpenseEdit(): Promise<void> {
  if (!isEditExpenseValid.value || !editingExpenseId.value) {
    return;
  }

  const amount = toMinorUnits(parseFloat(editExpenseAmount.value));
  const description = editExpenseDescription.value.trim();

  if (amount <= 0 || description.length < 3) {
    return;
  }

  try {
    await updateExpenseRecord({
      expenseId: editingExpenseId.value,
      amount,
      description,
      applyToFuture: editingExpenseIsRecurring.value ? editApplyToFuture.value : false,
    });

    await refreshMonthData();
    await refreshExpenseHistory();

    showEditExpense.value = false;
    editingExpenseIsRecurring.value = false;
    toast.add({
      severity: 'success',
      summary: t('dashboard.expenseUpdated'),
      detail: t('dashboard.expenseUpdated'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to update expense', { error, expenseId: editingExpenseId.value });
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
      router.replace('/setup');
      return;
    }

    setActivePeriod(year.year, new Date().getMonth() + 1);
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

function openManageCategories(): void {
  managingGroup.value = expenseGroup.value || 'needs';
  newCategoryName.value = '';
  showManageCategories.value = true;
}

function categoryLabel(category: Category): string {
  if (category.name && category.name.trim().length > 0) {
    return category.name;
  }

  const key = `categories.${category.id}`;
  if (te(key)) {
    return t(key);
  }

  return category.id;
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

    if (
      expenseGroup.value === managingGroup.value &&
      expenseCategoryId.value === pendingCategory.id
    ) {
      expenseCategoryId.value = replacementCategoryId.value;
    }

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

watch(expenseGroup, (nextGroup) => {
  if (!nextGroup) {
    expenseCategoryId.value = '';
    return;
  }

  const firstCategory = categoriesByGroup.value[nextGroup][0];
  expenseCategoryId.value = firstCategory ? firstCategory.id : '';
});

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

onMounted(() => {
  loadData();
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
  gap: 1rem;
}

.month-picker {
  min-width: 170px;
}

.empty-state {
  margin: 2rem 0;
  text-align: center;
  color: var(--p-text-muted-color);
}

.budget-summary {
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-radius: 8px;
}

.summary-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-action {
  margin-top: 0.5rem;
}

.groups-section {
  margin-bottom: 1.5rem;
}

.actions-section {
  margin-top: 1rem;
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

.manage-categories-action {
  width: fit-content;
  margin: 0 0 0.5rem;
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-input-border-color);
  border-radius: 8px;
}

.expense-history-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.expense-history-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.expense-history-amount {
  font-weight: 700;
}

.expense-history-description {
  font-weight: 500;
}

.expense-history-date {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.expense-history-recurring {
  width: fit-content;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-primary-color);
}
</style>
