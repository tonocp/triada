<template>
  <div class="not-found">
    <p class="code">404</p>
    <h1 class="title">{{ t('common.notFoundTitle') }}</h1>
    <p class="body">{{ t('common.notFoundBody') }}</p>
    <Button :label="t('common.goHome')" icon="pi pi-home" @click="goHome" />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

function goHome(): void {
  void router.push('/');
}
</script>

<style scoped>
.not-found {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--t-s-3);
  padding: var(--t-s-7) var(--t-s-5);
  text-align: center;
}

.code {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.body {
  color: var(--t-ink-muted);
  margin-bottom: var(--t-s-2);
}
</style>
