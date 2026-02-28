<script setup lang="ts">
import NotificationSidebar from '@/modules/shared/components/organisms/NotificationSidebar.vue';
import { SidebarTrigger } from '@/modules/shared/components/ui/sidebar';
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-40 flex flex-col bg-white/80 backdrop-blur-md border-b transition-all"
  >
    <div class="pt-[env(safe-area-inset-top)] w-full bg-transparent"></div>

    <div class="flex h-16 items-center justify-between px-4 w-full">
      <SidebarTrigger class="-ml-2" />
      <h1>NEXT DIGITAL</h1>
      <NotificationSidebar></NotificationSidebar>
    </div>
  </nav>
</template>

<style scoped></style>
