<template>
  <div class="app-shell" :class="{ 'app-shell--nav': showNav }">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
  <BottomNav v-if="showNav" />

  <div v-if="needRefresh" class="app-update" :class="{ 'app-update--nav': showNav }">
    <AppBanner
      :message="t('pwa.updateAvailable')"
      :action-label="t('pwa.reload')"
      @action="updateServiceWorker()"
    />
  </div>

  <Toast />
</template>

<script setup lang="ts">
import { AppBanner, BottomNav } from '@/shared/components/molecules';
import Toast from 'primevue/toast';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
const { t } = useI18n();
const showNav = computed(() => route.meta.app === true);

const { needRefresh, updateServiceWorker } = useRegisterSW();
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.12s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>

<style scoped>
.app-shell--nav {
  padding-bottom: 4.5rem;
}

.app-update {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  bottom: calc(0.75rem + env(safe-area-inset-bottom));
  z-index: 20;
}

.app-update--nav {
  bottom: calc(4.75rem + env(safe-area-inset-bottom));
}
</style>
