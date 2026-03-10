<template>
  <div
    class="group-display"
    :class="{ 'group-display--interactive': interactive }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
  >
    <div class="group-header">
      <i :class="groupIcon" class="group-icon"></i>
      <span class="group-label">{{ groupLabel }}</span>
      <span class="group-percentage">{{ groupPercentage }}%</span>
    </div>
    <div class="group-amounts">
      <div class="amount-row">
        <span class="amount-label">{{ t('dashboard.allocated') }}</span>
        <span class="amount-value">{{ formatCurrencyValue(allocated) }}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">{{ t('dashboard.spent') }}</span>
        <span class="amount-value spent">{{ formatCurrencyValue(spent) }}</span>
      </div>
      <div class="amount-row remaining">
        <span class="amount-label">{{ t('dashboard.remaining') }}</span>
        <span class="amount-value" :class="remainingClass">{{
          formatCurrencyValue(remaining)
        }}</span>
      </div>
    </div>
    <div class="group-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-text">{{ progressPercent }}{{ t('dashboard.spentOf') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroupType } from '@/domain/entities';
import { GROUP_ICONS, GROUP_PERCENTAGES } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const props = defineProps<{
  group: GroupType;
  allocated: number;
  spent: number;
  interactive?: boolean;
}>();

const emit = defineEmits<{
  select: [group: GroupType];
}>();

function onSelect(): void {
  if (!props.interactive) {
    return;
  }

  emit('select', props.group);
}

const groupLabel = computed(() => t(`groups.${props.group}`));
const groupIcon = computed(() => GROUP_ICONS[props.group]);
const groupPercentage = computed(() => GROUP_PERCENTAGES[props.group]);

const remaining = computed(() => props.allocated - props.spent);

const remainingClass = computed(() => ({
  'remaining-positive': remaining.value >= 0,
  'remaining-negative': remaining.value < 0,
}));

const progressPercent = computed(() => {
  if (props.allocated === 0) return 0;
  return Math.min(100, Math.round((props.spent / props.allocated) * 100));
});
</script>

<style scoped>
.group-display {
  padding: 1rem;
  border-radius: 8px;
  background: var(--p-content-background);
  margin-bottom: 0.75rem;
}

.group-display--interactive {
  cursor: pointer;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.group-icon {
  font-size: 1.25rem;
}

.group-label {
  font-weight: 600;
  flex: 1;
}

.group-percentage {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.group-amounts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.amount-label {
  color: var(--p-text-muted-color);
}

.amount-value {
  font-weight: 500;
}

.amount-value.spent {
  color: var(--p-red-500);
}

.group-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-bar {
  height: 6px;
  background: var(--p-surface-200);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--p-primary-color);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}
</style>
