<template>
  <main class="min-h-screen bg-gray-50 pb-32">
    <RouterView />
  </main>

  <div
    class="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur"
    style="padding-bottom: max(env(safe-area-inset-bottom), 16px)"
  >
    <BottomNavBar />
  </div>
</template>

<script setup lang="ts">
import BottomNavBar from '@/modules/shared/components/organisms/BottomNavBar.vue';
</script>

<style scoped></style>
