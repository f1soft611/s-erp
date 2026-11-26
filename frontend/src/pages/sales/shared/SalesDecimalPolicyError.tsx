import { Alert, Button } from '@mui/material';
import { resetGridDecimalPolicyCache } from '../../../shared/services/gridDecimalPolicy.service';

export function SalesDecimalPolicyError({ status, network = false }: {
  status: 'unmanaged' | 'loading' | 'ready' | 'error'; network?: boolean;
}) {
  if (status !== 'error' || network) return null;
  return <Alert severity="error"
    action={<Button color="inherit" size="small" onClick={resetGridDecimalPolicyCache}>다시 시도</Button>}>
    소수점 정책을 불러오지 못했습니다. 다시 조회해 주세요.
  </Alert>;
}
