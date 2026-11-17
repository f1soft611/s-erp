import { useCallback, useEffect, useState } from 'react';
import {
  fetchSalesOrderCommonCodes,
  type SalesOrderCommonCodes,
} from '../services/salesOrderCommonCode.service';

const EMPTY_CODES: SalesOrderCommonCodes = {
  orderStatusOptions: [],
  progressStatusOptions: [],
  deliveryMethodOptions: [],
};

export function useSalesOrderCommonCodes() {
  const [codes, setCodes] = useState(EMPTY_CODES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchSalesOrderCommonCodes()
      .then((result) => {
        if (active) setCodes(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : '수주 공통코드를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryToken]);

  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    setRetryToken((current) => current + 1);
  }, []);

  return { codes, loading, error, retry };
}
