<template>
  <div class="split-editor">
    <div class="split-editor-bar">
      <span
        v-for="group in groups"
        :key="`bar-${group}`"
        class="split-editor-bar-segment"
        :data-group="group"
        :style="{ flexGrow: Math.max(modelValue[group], 0) || 0.0001 }"
      ></span>
    </div>

    <div v-for="group in groups" :key="`row-${group}`" class="split-editor-row" :data-group="group">
      <span class="split-editor-dot"></span>
      <label :for="`split-${group}`" class="split-editor-label">{{ t(`groups.${group}`) }}</label>
      <div class="split-editor-input-box">
        <input
          :id="`split-${group}`"
          v-model="drafts[group]"
          class="split-editor-input"
          type="text"
          inputmode="numeric"
          @input="commit"
        />
        <span class="split-editor-input-suffix">%</span>
      </div>
    </div>

    <p class="split-editor-total" :class="{ 'split-editor-total--bad': !isValid }">
      {{
        isValid
          ? t('settings.budgetSplitTotal', { total })
          : t('settings.budgetSplitInvalid', { total })
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { GROUP_ORDER, type BudgetSplit, type GroupType } from '@/domain/entities';
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ modelValue: BudgetSplit }>();
const emit = defineEmits<{ 'update:modelValue': [split: BudgetSplit] }>();

const { t } = useI18n();

const groups = GROUP_ORDER;

const drafts = reactive<Record<GroupType, string>>({
  needs: String(props.modelValue.needs),
  wants: String(props.modelValue.wants),
  savings: String(props.modelValue.savings),
});

function parseShare(text: string): number {
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

// Keep the text fields in step with programmatic changes to the split (e.g. a
// parent resetting it), but leave what the user is typing untouched.
watch(
  () => props.modelValue,
  (next) => {
    for (const group of groups) {
      if (parseShare(drafts[group]) !== next[group]) {
        drafts[group] = String(next[group]);
      }
    }
  },
);

// `commit` guarantees each share is already an integer in [0, 100], so a total
// of exactly 100 is the only remaining validity condition.
const total = computed(() => groups.reduce((sum, group) => sum + props.modelValue[group], 0));

const isValid = computed(() => total.value === 100);

// Build the whole split from the three drafts so editing several fields in one
// tick stays consistent (a per-field merge would read a stale prop each time).
function commit(): void {
  emit('update:modelValue', {
    needs: parseShare(drafts.needs),
    wants: parseShare(drafts.wants),
    savings: parseShare(drafts.savings),
  });
}
</script>

<style scoped>
.split-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.split-editor-bar {
  display: flex;
  height: 0.9rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-pill);
  overflow: hidden;
}

.split-editor-bar-segment {
  flex-basis: 0;
  background: var(--group-color);
}

.split-editor-bar-segment + .split-editor-bar-segment {
  border-left: 1.5px solid var(--t-border);
}

.split-editor-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.split-editor-dot {
  width: 0.6rem;
  height: 0.6rem;
  flex-shrink: 0;
  border: 1.5px solid var(--t-border);
  background: var(--group-color);
}

.split-editor-label {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
}

.split-editor-input-box {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-sm);
  box-shadow: var(--t-shadow-hard-sm);
  padding: 0.35rem 0.6rem;
}

.split-editor-input {
  width: 2.6rem;
  border: none;
  outline: none;
  background: none;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--t-ink);
}

.split-editor-input-suffix {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--t-ink-faint);
}

.split-editor-total {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
  font-variant-numeric: tabular-nums;
}

.split-editor-total--bad {
  color: var(--t-over);
}
</style>
