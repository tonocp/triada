<template>
  <div class="app-shell" :class="{ 'app-shell--nav': showNav }">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
  <BottomNav v-if="showNav" />
  <Toast />
</template>

<script setup lang="ts">
import { BottomNav } from '@/shared/components/molecules';
import Toast from 'primevue/toast';
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
const showNav = computed(() => route.meta.app === true);
</script>

<style>
/* Route transition (declared by <Transition name="page"> above). Not scoped:
   the classes land on the routed child component's root, out of scope reach. */
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
/* Clearance for the fixed BottomNav (it carries its own safe-area inset). */
.app-shell--nav {
  padding-bottom: 4.5rem;
}
</style>
