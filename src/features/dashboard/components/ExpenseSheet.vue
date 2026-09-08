<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :dismissable-mask="true"
    position="bottom"
    class="expense-sheet"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #container>
      <div class="expense-sheet-body">
        <div class="expense-sheet-grip"></div>

        <div class="expense-sheet-head">
          <span class="expense-sheet-title">{{ labels.title }}</span>
          <span v-if="monthLabel" class="expense-sheet-month">{{ monthLabel }}</span>
        </div>

        <!-- Amount first -->
        <label class="expense-sheet-field-label" for="expense-amount">
          {{ t('dashboard.amount') }}
        </label>
        <div class="expense-amount-box">
          <input
            id="expense-amount"
            ref="amountInput"
            v-model="amount"
            class="expense-amount-input"
            inputmode="decimal"
            :placeholder="t('setup.incomePlaceholder')"
          />
          <span class="expense-amount-symbol">{{ currencyInfo.symbol }}</span>
        </div>

        <!-- Group + category chips -->
        <span class="expense-sheet-field-label">{{ t('dashboard.category') }}</span>
        <div class="expense-chip-row" data-testid="expense-group-selector">
          <button
            v-for="g in groups"
            :key="`group-${g}`"
            type="button"
            class="expense-chip"
            :class="{ 'expense-chip--on': group === g }"
            :data-group="g"
            @click="group = g"
          >
            {{ t(`groups.${g}`) }}
          </button>
        </div>
        <div class="expense-chip-row" data-testid="expense-category-list">
          <button
            v-for="category in categoriesForGroup"
            :key="`cat-${category.id}`"
            type="button"
            class="expense-chip"
            :class="{ 'expense-chip--on': categoryId === category.id }"
            :data-group="group || undefined"
            @click="categoryId = category.id"
          >
            {{ categoryLabel(category) }}
          </button>
          <button
            type="button"
            data-testid="open-manage-categories"
            class="expense-chip expense-chip--ghost"
            @click="$emit('manage-categories', group)"
          >
            <i class="pi pi-cog" aria-hidden="true"></i> {{ t('dashboard.manageCategories') }}
          </button>
        </div>

        <!-- Description -->
        <span class="expense-sheet-field-label">
          {{ t('dashboard.description') }}
          <span class="expense-sheet-optional">· {{ t('common.optional') }}</span>
        </span>
        <input
          v-model="description"
          class="expense-sheet-text-input"
          :placeholder="t('dashboard.descriptionPlaceholder')"
        />

        <!-- Recurring -->
        <label v-if="showRecurringToggle" class="expense-sheet-toggle">
          <Checkbox v-model="recurringFlag" binary input-id="expense-recurring" />
          <span>{{ labels.recurring }}</span>
        </label>

        <div class="expense-sheet-footer">
          <Button :label="t('common.cancel')" severity="secondary" @click="close" />
          <Button
            id="expense-submit"
            :label="labels.submit"
            icon="pi pi-check"
            :disabled="!isValid"
            :pt="{ root: { 'data-testid': 'expense-submit' } }"
            @click="submit"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { Category, CategoryId, Expense, GroupType } from '@/domain/entities';
import { GROUP_ORDER } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { fromMinorUnits, toMinorUnits } from '@/shared/utils/money';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ExpenseSheetSubmit {
  group: GroupType;
  categoryId: CategoryId;
  amount: number;
  description: string;
  isRecurring: boolean;
  applyToFuture: boolean;
}

const props = defineProps<{
  visible: boolean;
  mode: 'add' | 'edit';
  categoriesByGroup: Record<GroupType, Category[]>;
  categoryLabel: (category: Category) => string;
  expense?: Expense | null;
  monthLabel?: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'manage-categories': [group: GroupType | ''];
  submit: [payload: ExpenseSheetSubmit];
}>();

const { t } = useI18n();
const { currencyInfo } = useCurrency();

const groups = GROUP_ORDER;

const amount = ref('');
const description = ref('');
const group = ref<GroupType | ''>('');
const categoryId = ref<CategoryId | ''>('');
const recurringFlag = ref(false);
const amountInput = ref<HTMLInputElement | null>(null);

const labels = computed(() =>
  props.mode === 'edit'
    ? {
        title: t('dashboard.editExpense'),
        submit: t('common.save'),
        recurring: t('dashboard.applyToFutureMonths'),
      }
    : {
        title: t('dashboard.newExpense'),
        submit: t('common.add'),
        recurring: t('dashboard.recurringExpense'),
      },
);

const categoriesForGroup = computed<Category[]>(() =>
  group.value === '' ? [] : props.categoriesByGroup[group.value],
);

// Add: toggle is always available (means "recurring"). Edit: only when the
// expense is already recurring (means "apply to future months").
const showRecurringToggle = computed(
  () => props.mode === 'add' || props.expense?.recurringRuleId != null,
);

const isValid = computed(() => Number.parseFloat(amount.value) > 0 && categoryId.value !== '');

function firstCategoryId(forGroup: GroupType): CategoryId | '' {
  return props.categoriesByGroup[forGroup][0]?.id ?? '';
}

function reset(): void {
  if (props.mode === 'edit' && props.expense) {
    amount.value = fromMinorUnits(props.expense.amount);
    description.value = props.expense.description;
    group.value = props.expense.group;
    categoryId.value = props.expense.categoryId;
    recurringFlag.value = props.expense.recurringRuleId != null;
    return;
  }

  group.value = 'needs';
  categoryId.value = firstCategoryId('needs');
  amount.value = '';
  description.value = '';
  recurringFlag.value = false;
}

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      return;
    }
    reset();
    if (props.mode === 'add') {
      void nextTick(() => amountInput.value?.focus());
    }
  },
);

// Switching group drops a category the new group doesn't own. The chip list only
// renders the current group's categories, so no reverse (category → group) sync
// is needed.
watch(group, (nextGroup) => {
  if (nextGroup === '') {
    return;
  }
  const owns = props.categoriesByGroup[nextGroup].some((c) => c.id === categoryId.value);
  if (!owns) {
    categoryId.value = firstCategoryId(nextGroup);
  }
});

function close(): void {
  emit('update:visible', false);
}

function submit(): void {
  if (group.value === '' || categoryId.value === '') {
    return;
  }
  emit('submit', {
    group: group.value,
    categoryId: categoryId.value,
    amount: toMinorUnits(amount.value),
    description: description.value.trim(),
    isRecurring: props.mode === 'add' && recurringFlag.value,
    applyToFuture: props.mode === 'edit' && recurringFlag.value,
  });
}
</script>

<style scoped>
:global(.expense-sheet.p-dialog) {
  margin: 0;
  width: 100%;
  max-width: 32rem;
  border: 1.5px solid var(--t-border);
  border-bottom: none;
  border-radius: var(--t-r-lg) var(--t-r-lg) 0 0;
  box-shadow: var(--t-shadow-hard);
}

.expense-sheet-body {
  background: var(--t-surface);
  border-radius: var(--t-r-lg) var(--t-r-lg) 0 0;
  padding: 0.5rem 1rem calc(1.25rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-family: var(--t-font);
  color: var(--t-ink);
  max-height: 85vh;
  overflow-y: auto;
}

.expense-sheet-grip {
  width: 2.5rem;
  height: 0.25rem;
  border-radius: var(--t-r-pill);
  background: var(--t-hairline);
  align-self: center;
  margin-bottom: 0.35rem;
}

.expense-sheet-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.expense-sheet-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.expense-sheet-month {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
}

.expense-sheet-field-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
  margin-top: 0.35rem;
}

.expense-sheet-optional {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.expense-amount-box {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-md);
  box-shadow: var(--t-shadow-hard-sm);
  padding: 0.5rem 0.9rem;
}

.expense-amount-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font: inherit;
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--t-ink);
  min-width: 0;
}

.expense-amount-symbol {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--t-ink-faint);
}

.expense-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.expense-chip {
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.7rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-pill);
  background: var(--t-surface);
  color: var(--t-ink-muted);
  cursor: pointer;
}

.expense-chip--on {
  background: var(--group-tint, var(--t-needs-tint));
  color: var(--t-ink);
  font-weight: 700;
  box-shadow: var(--t-shadow-hard-sm);
}

.expense-chip--ghost {
  border-style: dashed;
  color: var(--t-ink-faint);
}

.expense-sheet-text-input {
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-sm);
  padding: 0.6rem 0.8rem;
  font: inherit;
  font-size: 0.9rem;
  color: var(--t-ink);
  background: var(--t-surface);
  outline: none;
}

.expense-sheet-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 0;
}

.expense-sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
</style>
