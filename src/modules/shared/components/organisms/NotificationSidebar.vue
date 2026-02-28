<script setup lang="ts">
import NotificationListItem from '@/modules/shared/components/molecules/NotificationListItem.vue';
import NotificationTrigger from '@/modules/shared/components/molecules/NotificationTrigger.vue';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/modules/shared/components/ui/sheet';
import { useNotificationStore } from '@/modules/shared/views/stores/notifications';
import { Icon } from '@iconify/vue';
import { X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { DialogClose } from 'reka-ui';

const props = withDefaults(
  defineProps<{
    title?: string;
  }>(),
  {
    title: 'Notificaciones',
  },
);

const notificationStore = useNotificationStore();
const { notifications, unreadCount } = storeToRefs(notificationStore);
</script>

<template>
  <Sheet>
    <SheetTrigger aria-label="Abrir notificaciones" as-child>
      <button class="outline-none">
        <NotificationTrigger :count="unreadCount" size="sm" />
      </button>
    </SheetTrigger>

    <SheetContent
      side="right"
      class="w-full sm:max-w-md p-0 gap-0 border-l [&>button]:hidden flex flex-col h-full"
    >
      <SheetTitle class="sr-only">{{ props.title }}</SheetTitle>
      <SheetDescription class="sr-only">Listado de notificaciones recientes</SheetDescription>

      <div class="flex-none border-b bg-background/95 backdrop-blur z-10">
        <div
          class="pt-[calc(env(safe-area-inset-top)+12px)] px-4 pb-3 flex items-center justify-between"
        >
          <span
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-muted/60 rounded-full ring-1 ring-border"
          >
            <Icon icon="material-symbols-light:notifications" class="text-lg" />
            {{ props.title }}
            <span
              v-if="unreadCount > 0"
              class="ml-1 text-xs bg-primary text-primary-foreground px-1.5 rounded-full"
            >
              {{ unreadCount }}
            </span>
          </span>

          <DialogClose
            class="rounded-full p-2 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X class="size-5 text-muted-foreground" />
            <span class="sr-only">Cerrar</span>
          </DialogClose>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-background/50">
        <div class="p-4 pb-[calc(env(safe-area-inset-bottom)+20px)] flex flex-col gap-3">
          <div
            v-if="notifications.length === 0"
            class="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-300"
          >
            <div class="bg-muted/30 p-4 rounded-full mb-3">
              <Icon
                icon="material-symbols-light:notifications-off-outline"
                class="text-4xl text-muted-foreground/50"
              />
            </div>
            <p class="text-sm font-medium text-foreground">Sin novedades</p>
            <p class="text-xs text-muted-foreground mt-1">Te avisaremos cuando llegue algo.</p>
          </div>

          <ul v-else class="flex flex-col gap-3">
            <li v-for="n in notifications" :key="n.id">
              <NotificationListItem :item="n" />
            </li>
          </ul>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
/* Opcional: Ocultar barra de scroll en móviles para limpieza visual */
.overflow-y-auto::-webkit-scrollbar {
  display: none;
}
.overflow-y-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
