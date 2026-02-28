export type NotificationItem = {
  id: string | number;
  title: string;
  message?: string;
  time?: string;
  read?: boolean;
  icon?: string;
  to?: string;
};

export type NewNotification = Omit<NotificationItem, 'id' | 'read'> & {
  id?: string | number;
  read?: boolean;
};

export type NotificationSize = 'sm' | 'md' | 'lg';
