import { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchGridDecimalPolicy,
  fetchGridDecimalPolicyStrict,
  subscribeGridDecimalPolicy,
  type GridDecimalModuleRule,
} from '../../../services/gridDecimalPolicy.service';
import { isApiNetworkError } from '../../../services/apiErrors';

export const GridDecimalModuleContext = createContext<string | null>(null);

const SALES_DEFAULT: GridDecimalModuleRule = {
  number: { places: 0, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
  decimal: { places: 3, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
  currency: { places: 3, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
};

/** 현재 모듈의 정책 소수점 규칙. 모듈 컨텍스트나 정책이 없으면 undefined. */
export function usePolicyDecimalRule(): GridDecimalModuleRule | undefined {
  const moduleCode = useContext(GridDecimalModuleContext);
  const [snapshot, setSnapshot] = useState<{
    moduleCode: string; rule?: GridDecimalModuleRule;
  }>();

  if (snapshot && snapshot.moduleCode !== moduleCode) setSnapshot(undefined);

  useEffect(() => {
    if (!moduleCode) {
      return undefined;
    }

    let active = true;
    let requestId = 0;
    const refresh = () => {
      const current = ++requestId;
      void fetchGridDecimalPolicy().then((policy) => {
        if (active && current === requestId) {
          setSnapshot({ moduleCode, rule: policy[moduleCode] ?? (moduleCode === 'SALES' ? SALES_DEFAULT : undefined) });
        }
      });
    };
    const unsubscribe = subscribeGridDecimalPolicy(refresh);
    refresh();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [moduleCode]);

  return snapshot?.moduleCode === moduleCode ? snapshot.rule : undefined;
}

export function usePolicyDecimalStatus(): {
  status: 'unmanaged' | 'loading' | 'ready' | 'error';
  rule?: GridDecimalModuleRule;
  /** 정책 조회 실패 원인이 서버 연결 불가일 때 true (페이지 오류 화면 표시용) */
  network?: boolean;
} {
  const moduleCode = useContext(GridDecimalModuleContext);
  const [snapshot, setSnapshot] = useState<{
    moduleCode: string; status: 'loading' | 'ready' | 'error'; rule?: GridDecimalModuleRule; network?: boolean;
  }>();
  useEffect(() => {
    if (!moduleCode) return undefined;
    let active = true;
    let requestId = 0;
    const refresh = () => {
      const current = ++requestId;
      setSnapshot({ moduleCode, status: 'loading' });
      void fetchGridDecimalPolicyStrict().then((policy) => {
        if (active && current === requestId) {
          setSnapshot({ moduleCode, status: 'ready',
            rule: policy[moduleCode] ?? (moduleCode === 'SALES' ? SALES_DEFAULT : undefined) });
        }
      }, (cause: unknown) => {
        if (active && current === requestId) {
          setSnapshot({ moduleCode, status: 'error', network: isApiNetworkError(cause) });
        }
      });
    };
    const unsubscribe = subscribeGridDecimalPolicy(refresh);
    refresh();
    return () => { active = false; unsubscribe(); };
  }, [moduleCode]);
  if (!moduleCode) return { status: 'unmanaged' };
  if (snapshot?.moduleCode !== moduleCode) return { status: 'loading' };
  return snapshot;
}
