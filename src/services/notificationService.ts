import type { NotificationPayload } from '@context/NotificationProvider';

type NotificationHandler = (payload: NotificationPayload) => void;

let handler: NotificationHandler | null = null;

export const setNotificationHandler = (next: NotificationHandler | null) => {
  handler = next;
};

export const notify = (payload: NotificationPayload) => {
  if (!handler) return false;
  setTimeout(() => {
    handler?.(payload);
  }, 0);
  return true;
};
