import {
  CircularProgress,
  type CircularProgressProps,
} from '@mui/material';

type AppLoadingSpinnerProps = Omit<CircularProgressProps, 'size' | 'thickness'> & {
  size?: CircularProgressProps['size'];
  thickness?: number;
};

export function AppLoadingSpinner({
  size = 34,
  thickness = 2.4,
  ...props
}: AppLoadingSpinnerProps) {
  return <CircularProgress {...props} size={size} thickness={thickness} />;
}
