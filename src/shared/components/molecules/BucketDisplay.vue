<template>
  <div class="bucket-display">
    <div class="bucket-header">
      <i :class="bucketIcon" class="bucket-icon"></i>
      <span class="bucket-label">{{ bucketLabel }}</span>
      <span class="bucket-percentage">{{ bucketPercentage }}%</span>
    </div>
    <div class="bucket-amounts">
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
    <div class="bucket-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-text">{{ progressPercent }}{{ t('dashboard.spentOf') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BucketType } from '@/domain/entities';
import { BUCKET_ICONS, BUCKET_LABELS, BUCKET_PERCENTAGES } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { formatCurrency: formatCurrencyValue } = useCurrency();

const props = defineProps<{
  bucket: BucketType;
  allocated: number;
  spent: number;
}>();

const bucketLabel = computed(() => BUCKET_LABELS[props.bucket]);
const bucketIcon = computed(() => BUCKET_ICONS[props.bucket]);
const bucketPercentage = computed(() => BUCKET_PERCENTAGES[props.bucket]);

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
.bucket-display {
  padding: 1rem;
  border-radius: 8px;
  background: var(--p-content-background);
  margin-bottom: 0.75rem;
}

.bucket-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.bucket-icon {
  font-size: 1.25rem;
}

.bucket-label {
  font-weight: 600;
  flex: 1;
}

.bucket-percentage {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.bucket-amounts {
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

.amount-value.remaining-positive {
  color: var(--p-green-500);
}

.amount-value.remaining-negative {
  color: var(--p-red-500);
}

.bucket-progress {
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
