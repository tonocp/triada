import type { NewNotification, NotificationItem } from '@/modules/shared/types/notification';
import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notifications', {
  // Estado inicial con ejemplos para mostrar en la UI por defecto.
  // Puedes limpiar o reemplazar estos elementos en tiempo de ejecución.
  state: () => ({
    notifications: [
      {
        id: 1,
        title: '¡Bienvenido! 🥳',
        message: 'Gracias por unirte a la app.',
        time: 'Hace 1 h',
        read: false,
        icon: 'material-symbols-light:celebration',
      },
      {
        id: 2,
        title: 'Actualización de la app',
        message: 'Hemos mejorado el rendimiento y corregido errores.',
        time: 'Hace 3 días',
        read: true,
        icon: 'material-symbols-light:info',
      },
    ] as NotificationItem[],
  }),
  getters: {
    unreadCount(state) {
      return state.notifications.filter((n) => !n.read).length;
    },
  },
  actions: {
    add(notification: NewNotification) {
      const id = notification.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.notifications.unshift({
        id,
        title: notification.title,
        message: notification.message,
        time: notification.time,
        read: notification.read ?? false,
        icon: notification.icon,
        to: notification.to,
      });
    },
    markAsRead(id: string | number) {
      const n = this.notifications.find((notification) => {
        return notification.id === id;
      });
      if (n) n.read = true;
    },
    markAllAsRead() {
      this.notifications.forEach((n) => (n.read = true));
    },
    remove(id: string | number) {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    },
    clear() {
      this.notifications = [];
    },
  },
});
