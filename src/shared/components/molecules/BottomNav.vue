<template>
  <nav class="bottom-nav" :aria-label="t('nav.label')">
    <RouterLink :to="{ name: 'year' }" class="bottom-nav-item">
      <i class="pi pi-calendar" aria-hidden="true"></i>
      <span>{{ t('nav.year') }}</span>
    </RouterLink>

    <RouterLink :to="{ name: 'month' }" class="bottom-nav-item">
      <i class="pi pi-wallet" aria-hidden="true"></i>
      <span>{{ t('nav.month') }}</span>
    </RouterLink>

    <div class="bottom-nav-fab-cell">
      <button
        id="bottom-nav-add"
        type="button"
        class="bottom-nav-fab"
        :aria-label="t('dashboard.addExpense')"
        @click="goAddExpense"
      >
        <i class="pi pi-plus" aria-hidden="true"></i>
      </button>
    </div>

    <RouterLink :to="{ name: 'settings' }" class="bottom-nav-item">
      <i class="pi pi-cog" aria-hidden="true"></i>
      <span>{{ t('nav.settings') }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { currentPeriod } from '@/shared/utils/period';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

function goAddExpense(): void {
  const { year, month } = currentPeriod();
  void router.push({
    name: 'month',
    query: { year: String(year), month: String(month), action: 'add' },
  });
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom));
  background: var(--t-surface);
  border-top: 1.5px solid var(--t-border);
}

.bottom-nav > * {
  flex: 1;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.4rem 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--t-ink-faint);
  text-decoration: none;
}

.bottom-nav-item .pi {
  font-size: 1.15rem;
}

.bottom-nav-item.router-link-active {
  color: var(--t-accent);
}

.bottom-nav-fab-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-nav-fab {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: var(--t-r-lg);
  border: 1.5px solid var(--t-border);
  background: var(--t-accent);
  color: var(--t-accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--t-shadow-hard);
  cursor: pointer;
  transform: translateY(-0.5rem);
}

.bottom-nav-fab .pi {
  font-size: 1.4rem;
}
</style>
