<template>
  <div class="page-container">
    <div class="dashboard-header">
      <div class="dashboard-toolbar">
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
        <Button
          id="more-actions-menu-trigger"
          icon="pi pi-ellipsis-h"
          rounded
          text
          severity="secondary"
          class="dashboard-menu-trigger"
          :aria-label="t('dashboard.moreActionsMenu')"
          aria-haspopup="true"
          aria-controls="more-actions-menu"
          @click="toggleMoreActionsMenu"
        />
      </div>
      <Menu
        id="more-actions-menu"
        ref="moreActionsMenuRef"
        :model="moreActionsMenuItems"
        popup
        class="more-actions-menu-popup"
      />
    </div>

    <div class="budget-summary" v-if="budgetMonth && budgetYear">
      <div class="summary-card">
        <span class="summary-label">{{ t('dashboard.monthlyIncome') }}</span>
        <span class="summary-value">{{ formatCurrencyValue(budgetMonth.monthlyIncome) }}</span>
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
        @click="openAddExpenseDialog"
      />
      <input
        ref="importFileInput"
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        @change="onImportFileSelected"
      />
    </div>

    <Dialog
      v-model:visible="showMoreActionsSheet"
      modal
      :header="t('dashboard.moreActionsMenu')"
      :draggable="false"
      :dismissable-mask="true"
      position="bottom"
      class="more-actions-sheet"
    >
      <div class="more-actions-sheet-list">
        <Button
          data-testid="more-actions-edit-monthly-income"
          :label="t('dashboard.editMonthlyIncome')"
          icon="pi pi-pencil"
          text
          class="more-actions-sheet-item"
          @click="runMoreAction('editMonthlyIncome')"
        />
        <Button
          data-testid="more-actions-export-database"
          :label="t('dashboard.exportDatabase')"
          icon="pi pi-download"
          text
          class="more-actions-sheet-item"
          @click="runMoreAction('exportDatabase')"
        />
        <Button
          data-testid="more-actions-import-database"
          :label="t('dashboard.importDatabase')"
          icon="pi pi-upload"
          text
          class="more-actions-sheet-item"
          @click="runMoreAction('importDatabase')"
        />
      </div>
    </Dialog>

    <Dialog
      v-model:visible="showAddExpense"
      modal
      :header="t('dashboard.addExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.group') }}</label>
          <SelectButton
            v-model="expenseGroup"
            id="expense-group-select"
            data-testid="add-expense-group-selector"
            :options="groupOptions"
            option-label="label"
            option-value="value"
            class="group-selector"
          />
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
          <div class="category-selector-list" data-testid="add-expense-category-list">
            <Button
              v-for="category in expenseCategories"
              :key="`add-category-${category.id}`"
              :label="categoryLabel(category)"
              class="category-selector-item"
              :severity="expenseCategoryId === category.id ? 'primary' : 'secondary'"
              :outlined="expenseCategoryId !== category.id"
              :disabled="expenseGroup === ''"
              @click="expenseCategoryId = category.id"
            />
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
          id="add-expense-submit"
          :label="t('common.add')"
          icon="pi pi-check"
          :disabled="!isExpenseValid"
          :pt="{ root: { 'data-testid': 'add-expense-submit' } }"
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
      v-model:visible="showEditExpense"
      modal
      :header="t('dashboard.editExpense')"
      :style="{ width: '90vw' }"
    >
      <div class="expense-form">
        <div class="form-group">
          <label>{{ t('dashboard.group') }}</label>
          <SelectButton
            v-model="editExpenseGroup"
            id="edit-expense-group"
            data-testid="edit-expense-group-selector"
            :options="groupOptions"
            option-label="label"
            option-value="value"
            class="group-selector"
          />
        </div>
        <div class="form-group">
          <label>{{ t('dashboard.category') }}</label>
          <div class="category-selector-list" data-testid="edit-expense-category-list">
            <Button
              v-for="category in editExpenseCategories"
              :key="`edit-category-${category.id}`"
              :label="categoryLabel(category)"
              class="category-selector-item"
              :severity="editExpenseCategoryId === category.id ? 'primary' : 'secondary'"
              :outlined="editExpenseCategoryId !== category.id"
              :disabled="editExpenseGroup === ''"
              @click="editExpenseCategoryId = category.id"
            />
          </div>
        </div>
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
  exportDatabase as exportDatabaseSnapshot,
  getBudgetMonth,
  getBudgetYearByYear,
  getCategoriesByGroup,
  getExpensesByMonthAndGroup,
  getLatestBudgetYear,
  importDatabase as importDatabaseSnapshot,
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
import { Capacitor } from '@capacitor/core';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';
import RadioButton from 'primevue/radiobutton';
import SelectButton from 'primevue/selectbutton';
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
const showMoreActionsSheet = ref(false);
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
const editExpenseGroup = ref<GroupType | ''>('');
const editExpenseCategoryId = ref<CategoryId | ''>('');
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
const importFileInput = ref<HTMLInputElement | null>(null);
const moreActionsMenuRef = ref<{ toggle: (event: Event) => void } | null>(null);
const useNativeActionsSheet = ref(false);
const categoriesByGroup = ref<Record<GroupType, Category[]>>({
  needs: [],
  wants: [],
  savings: [],
});

const groups = GROUP_ORDER;

const groupOptions = computed(() => {
  return groups.map((group) => ({
    label: t(`groups.${group}`),
    value: group,
  }));
});

const expenseCategories = computed<Category[]>(() => {
  if (expenseGroup.value === '') {
    return [];
  }

  return categoriesByGroup.value[expenseGroup.value];
});

const editExpenseCategories = computed<Category[]>(() => {
  if (editExpenseGroup.value === '') {
    return [];
  }

  return categoriesByGroup.value[editExpenseGroup.value];
});

const allocations = computed<BudgetAllocation[]>(() => {
  return [...(budgetMonth.value?.allocations ?? [])].sort((left, right) =>
    compareGroups(left.group, right.group),
  );
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
  return (
    !Number.isNaN(amount) &&
    amount > 0 &&
    description.length >= 3 &&
    editExpenseGroup.value !== '' &&
    editExpenseCategoryId.value !== ''
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

const moreActionsMenuItems = computed(() => [
  {
    label: t('dashboard.editMonthlyIncome'),
    icon: 'pi pi-pencil',
    command: (): void => {
      openEditMonthlyIncome();
    },
  },
  {
    separator: true,
  },
  {
    label: t('dashboard.exportDatabase'),
    icon: 'pi pi-download',
    command: (): void => {
      void exportDatabaseToJson();
    },
  },
  {
    label: t('dashboard.importDatabase'),
    icon: 'pi pi-upload',
    command: (): void => {
      openImportDatabasePicker();
    },
  },
]);

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

function buildBackupFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `triada-backup-${year}-${month}-${day}.json`;
}

function toggleMoreActionsMenu(event: Event): void {
  if (useNativeActionsSheet.value) {
    showMoreActionsSheet.value = true;
    return;
  }

  moreActionsMenuRef.value?.toggle(event);
}

type MoreActionId = 'editMonthlyIncome' | 'exportDatabase' | 'importDatabase';

function runMoreAction(actionId: MoreActionId): void {
  showMoreActionsSheet.value = false;

  if (actionId === 'editMonthlyIncome') {
    openEditMonthlyIncome();
    return;
  }

  if (actionId === 'exportDatabase') {
    void exportDatabaseToJson();
    return;
  }

  openImportDatabasePicker();
}

async function exportDatabaseToJson(): Promise<void> {
  try {
    const snapshot = await exportDatabaseSnapshot();
    const payload = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildBackupFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: t('dashboard.databaseExported'),
      detail: t('dashboard.databaseExported'),
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to export database snapshot', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.databaseExportError'),
      life: 3000,
    });
  }
}

function openImportDatabasePicker(): void {
  importFileInput.value?.click();
}

function resetImportInput(): void {
  if (importFileInput.value) {
    importFileInput.value.value = '';
  }
}

async function onImportFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    resetImportInput();
    return;
  }

  if (!window.confirm(t('dashboard.databaseImportConfirm'))) {
    resetImportInput();
    return;
  }

  try {
    const fileContents = await file.text();
    const parsedSnapshot = JSON.parse(fileContents) as unknown;
    await importDatabaseSnapshot(parsedSnapshot);
    await loadData();

    toast.add({
      severity: 'success',
      summary: t('dashboard.databaseImported'),
      detail: t('dashboard.databaseImported'),
      life: 3000,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : t('dashboard.databaseImportError');
    console.error('Failed to import database snapshot', { error });
    toast.add({
      severity: 'error',
      summary: t('setup.error'),
      detail: t('dashboard.databaseImportErrorWithReason', { reason }),
      life: 5000,
    });
  } finally {
    resetImportInput();
  }
}

function openAddExpenseDialog(): void {
  const selectedGroup: GroupType = expenseGroup.value === '' ? 'needs' : expenseGroup.value;
  expenseGroup.value = selectedGroup;

  if (expenseCategoryId.value === '') {
    const firstCategory = categoriesByGroup.value[selectedGroup][0];
    expenseCategoryId.value = firstCategory ? firstCategory.id : '';
  }

  showAddExpense.value = true;
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
  editExpenseGroup.value = expense.group;
  editExpenseCategoryId.value = expense.categoryId;
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

  if (
    amount <= 0 ||
    description.length < 3 ||
    editExpenseGroup.value === '' ||
    editExpenseCategoryId.value === ''
  ) {
    return;
  }

  try {
    await updateExpenseRecord({
      expenseId: editingExpenseId.value,
      amount,
      description,
      group: editExpenseGroup.value,
      categoryId: editExpenseCategoryId.value,
      applyToFuture: editingExpenseIsRecurring.value ? editApplyToFuture.value : false,
    });

    await refreshMonthData();
    await refreshExpenseHistory();

    showEditExpense.value = false;
    editingExpenseIsRecurring.value = false;
    editExpenseGroup.value = '';
    editExpenseCategoryId.value = '';
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

function expenseCategoryLabel(expense: Expense): string {
  const category = categoriesByGroup.value[expense.group].find(
    (item) => item.id === expense.categoryId,
  );
  if (category) {
    return categoryLabel(category);
  }

  const key = `categories.${expense.categoryId}`;
  if (te(key)) {
    return t(key);
  }

  return expense.categoryId;
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

  const categories = categoriesByGroup.value[nextGroup];
  const hasCurrentCategory = categories.some((category) => category.id === expenseCategoryId.value);
  if (hasCurrentCategory) {
    return;
  }

  const firstCategory = categories[0];
  expenseCategoryId.value = firstCategory ? firstCategory.id : '';
});

watch(expenseCategoryId, (nextCategoryId) => {
  if (!nextCategoryId) {
    return;
  }

  const matchedGroup = groups.find((group) =>
    categoriesByGroup.value[group].some((category) => category.id === nextCategoryId),
  );

  if (matchedGroup) {
    expenseGroup.value = matchedGroup;
  }
});

watch(editExpenseGroup, (nextGroup) => {
  if (!nextGroup) {
    editExpenseCategoryId.value = '';
    return;
  }

  const categories = categoriesByGroup.value[nextGroup];
  const hasCurrentCategory = categories.some(
    (category) => category.id === editExpenseCategoryId.value,
  );
  if (hasCurrentCategory) {
    return;
  }

  const firstCategory = categories[0];
  editExpenseCategoryId.value = firstCategory ? firstCategory.id : '';
});

watch(editExpenseCategoryId, (nextCategoryId) => {
  if (!nextCategoryId) {
    return;
  }

  const matchedGroup = groups.find((group) =>
    categoriesByGroup.value[group].some((category) => category.id === nextCategoryId),
  );

  if (matchedGroup) {
    editExpenseGroup.value = matchedGroup;
  }
});

watch(showAddExpense, (isVisible) => {
  if (isVisible) {
    return;
  }

  expenseAmount.value = '';
  expenseGroup.value = '';
  expenseCategoryId.value = '';
  expenseDescription.value = '';
  isRecurringExpense.value = false;
});

watch(showEditExpense, (isVisible) => {
  if (isVisible) {
    return;
  }

  editingExpenseId.value = null;
  editExpenseAmount.value = '';
  editExpenseDescription.value = '';
  editExpenseGroup.value = '';
  editExpenseCategoryId.value = '';
  editingExpenseIsRecurring.value = false;
  editApplyToFuture.value = true;
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
  useNativeActionsSheet.value = Capacitor.isNativePlatform();
  loadData();
});
</script>

<style scoped>
.page-container {
  padding-bottom: calc(7.5rem + env(safe-area-inset-bottom));
}

.dashboard-header {
  margin-bottom: 1.5rem;
}

.dashboard-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex: 1;
}

.month-picker {
  min-width: 160px;
}

.dashboard-menu-trigger {
  width: 2.5rem;
  height: 2.5rem;
}

.more-actions-sheet-list {
  display: grid;
  gap: 0.25rem;
}

.more-actions-sheet-item {
  justify-content: flex-start;
}

/*noinspection CssUnusedSymbol */
:global(.more-actions-sheet.p-dialog) {
  margin: 0;
  border-radius: 16px 16px 0 0;
}

/*noinspection CssUnusedSymbol */
:global(.more-actions-sheet .p-dialog-content) {
  padding-top: 0.5rem;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
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
  padding: 1.1rem 1rem;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-radius: 12px;
}

.summary-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.groups-section {
  margin-bottom: 2.5rem;
}

.actions-section {
  margin-top: 0;
  padding-top: 0.75rem;
  display: grid;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .actions-section {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    background: linear-gradient(to top, rgba(255, 255, 255, 0.9) 68%, rgba(255, 255, 255, 0));
    backdrop-filter: blur(1px);
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

.group-selector {
  width: 100%;
}

.category-selector-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.category-selector-item {
  justify-content: flex-start;
  min-height: 44px;
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
