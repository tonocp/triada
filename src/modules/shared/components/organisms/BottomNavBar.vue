<script setup lang="ts">
import BottomNavButton from '@/modules/shared/components/molecules/BottomNavButton.vue';
import { useNotificationStore } from '@/modules/shared/views/stores/notifications';
import { storeToRefs } from 'pinia';

type BottomItem = {
  to: string;
  icon: string;
  label: string;
  badgeFromStore?: 'notifications';
};

const props = withDefaults(
  defineProps<{
    items?: BottomItem[];
  }>(),
  {
    items: () => [
      { to: '/bottom-layout/home', icon: 'material-symbols-light:home', label: 'Inicio' },
      { to: '/bottom-layout/search', icon: 'material-symbols-light:search', label: 'Buscar' },
      { to: '/bottom-layout/add', icon: 'material-symbols-light:add-circle', label: 'Añadir' },
      {
        to: '/bottom-layout/notifications',
        icon: 'material-symbols-light:notifications',
        label: 'Avisos',
        badgeFromStore: 'notifications',
      },
      { to: '/bottom-layout/profile', icon: 'material-symbols-light:person', label: 'Perfil' },
    ],
  },
);

const notificationStore = useNotificationStore();
const { unreadCount } = storeToRefs(notificationStore);

function getBadgeCount(item: BottomItem) {
  if (item.badgeFromStore === 'notifications') return unreadCount.value;
  return undefined;
}
</script>

<template>
  <nav class="w-full">
    <div class="mx-auto max-w-screen-sm">
      <div class="flex h-16 items-center justify-between gap-2 px-4">
        <BottomNavButton
          v-for="item in props.items"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          :badge-count="getBadgeCount(item)"
        />
      </div>
    </div>
  </nav>
</template>
<style scoped></style>
