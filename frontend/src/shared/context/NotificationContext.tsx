import { Alert, Snackbar } from '@mui/material';
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

type NotificationContextValue = {
  showSuccess: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  showSuccess: () => undefined,
});

export function NotificationProvider({ children }: PropsWithChildren) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <NotificationContext.Provider value={{ showSuccess: setSuccessMessage }}>
      {children}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  return useContext(NotificationContext);
}
