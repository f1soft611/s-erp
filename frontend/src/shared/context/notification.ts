import { createContext, useContext } from 'react';

export type NotificationContextValue = {
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (message: string) => void;
};

export const NotificationContext = createContext<NotificationContextValue>({
  showSuccess: () => undefined,
  showWarning: () => undefined,
  showError: () => undefined,
});

export function useNotification(): NotificationContextValue {
  return useContext(NotificationContext);
}
