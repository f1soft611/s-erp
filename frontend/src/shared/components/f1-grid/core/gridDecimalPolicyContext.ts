import { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchGridDecimalPolicy,
  type GridDecimalRule,
} from '../../../services/gridDecimalPolicy.service';

export const GridDecimalModuleContext = createContext<string | null>(null);

/** 현재 모듈의 정책 소수점 규칙. 모듈 컨텍스트나 정책이 없으면 undefined. */
export function usePolicyDecimalRule(): GridDecimalRule | undefined {
  const moduleCode = useContext(GridDecimalModuleContext);
  const [rule, setRule] = useState<GridDecimalRule | undefined>();

  if (!moduleCode && rule !== undefined) setRule(undefined);

  useEffect(() => {
    if (!moduleCode) {
      return undefined;
    }
    let active = true;
    void fetchGridDecimalPolicy().then((policy) => {
      if (active) setRule(policy[moduleCode]);
    });
    return () => {
      active = false;
    };
  }, [moduleCode]);

  return rule;
}
