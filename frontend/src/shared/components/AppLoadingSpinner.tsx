import { CircularProgress } from '@mui/material';

type AppLoadingSpinnerProps = {
  thickness?: number;
};

export function AppLoadingSpinner({
  thickness = 3.6,
}: AppLoadingSpinnerProps) {
  return <CircularProgress size={34} thickness={thickness} />;
}
