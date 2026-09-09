<template>
  <div
    class="group-display"
    :class="{
      'group-display--interactive': interactive,
      'is-warn': progressState === 'warn',
      'is-over': progressState === 'over',
    }"
    :data-group="group"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
  >
    <div class="group-header">
      <span class="group-icon-tile">
        <i :class="groupIcon" aria-hidden="true"></i>
      </span>
      <span class="group-label">{{ groupLabel }}</span>
      <span class="group-percentage">{{ progressPercent }}%</span>
    </div>

    <div class="group-bar">
      <div class="group-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
    </div>

    <div class="group-amounts">
      <div class="amount-cell">
        <span class="amount-label">{{ t('dashboard.allocated') }}</span>
        <span class="amount-value">{{ formatCurrencyValue(allocated) }}</span>
      </div>
      <div class="amount-cell">
        <span class="amount-label">{{ t('dashboard.spent') }}</span>
        <span class="amount-value">{{ formatCurrencyValue(spent) }}</span>
      </div>
      <div class="amount-cell">
        <span class="amount-label">{{ t('dashboard.remaining') }}</span>
        <span class="amount-value amount-value--flag">{{ formatCurrencyValue(remaining) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type GroupType } from '@/domain/entities';
import { useCurrency } from '@/shared/composables/useCurrency';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const GROUP_ICONS: Record<GroupType, string> = {
  needs: 'pi pi-home',
  wants: 'pi pi-shopping-bag',
  savings: 'pi pi-wallet',
};

const WARN_RATIO = 0.8;
const OVER_RATIO = 1;

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

const groupIcon = GROUP_ICONS[props.group];
const groupLabel = computed(() => t(`groups.${props.group}`));
const remaining = computed(() => props.allocated - props.spent);

const progressPercent = computed(() => {
  if (props.allocated <= 0) return 0;
  return Math.min(100, Math.round((props.spent / props.allocated) * 100));
});

const progressState = computed<'ok' | 'warn' | 'over'>(() => {
  if (props.group === 'savings' || props.allocated <= 0) return 'ok';
  const ratio = props.spent / props.allocated;
  if (ratio > OVER_RATIO) return 'over';
  if (ratio >= WARN_RATIO) return 'warn';
  return 'ok';
});
</script>

<style scoped>
.group-display {
  padding: 0.9rem;
  border-radius: var(--t-r-md);
  background: var(--t-surface);
  border: 1.5px solid var(--t-border);
  box-shadow: var(--t-shadow-hard-sm);
  margin-bottom: 0.75rem;
  --status: var(--group-color);
  --status-soft: var(--group-tint);
  --remaining-color: var(--t-ok);
}
.group-display.is-warn {
  --status: var(--t-warn);
  --status-soft: var(--t-warn);
  --remaining-color: var(--t-warn);
}
.group-display.is-over {
  --status: var(--t-over);
  --status-soft: var(--t-over);
  --remaining-color: var(--t-over);
}

.group-display--interactive {
  cursor: pointer;
}

.group-display--interactive:focus-visible {
  outline: 2px solid var(--t-accent);
  outline-offset: 2px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.group-icon-tile {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: var(--t-r-sm);
  border: 1.5px solid var(--t-border);
  background: var(--group-tint);
  color: var(--group-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1rem;
}

.group-label {
  flex: 1;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.group-percentage {
  font-size: 0.7rem;
  font-weight: 700;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-pill);
  padding: 0.1rem 0.45rem;
  font-variant-numeric: tabular-nums;
  background: var(--status-soft);
  color: var(--t-ink);
}
.is-over .group-percentage {
  color: #fff;
}

.group-bar {
  height: 0.55rem;
  border: 1.5px solid var(--t-border);
  border-radius: var(--t-r-pill);
  background: var(--t-bg);
  overflow: hidden;
  margin-bottom: 0.7rem;
}

.group-bar-fill {
  height: 100%;
  background: var(--status);
  transition: width 0.3s ease;
}

.group-amounts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.amount-label {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
}

.amount-value {
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.amount-value--flag {
  color: var(--remaining-color);
}
</style>
