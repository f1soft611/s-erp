import { Alert, Box } from '@mui/material';

type PageMessageAreaProps = {
  message: string;
  onClose: () => void;
};

export function PageMessageArea({ message, onClose }: PageMessageAreaProps) {
  if (!message) return null;

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 2 }}>
      <Alert
        severity="error"
        onClose={onClose}
        sx={{ overflowWrap: 'anywhere' }}
      >
        {message}
      </Alert>
    </Box>
  );
}
