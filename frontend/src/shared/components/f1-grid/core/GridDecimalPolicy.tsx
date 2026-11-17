import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchGridDecimalPolicy, type GridDecimalRule } from '../../../services/gridDecimalPolicy.service';

const GridDecimalModuleContext = createContext<string | null>(null);

/** 하위 F1Grid 들이 정책 관리의 모듈별 소수점(GRID_DECIMAL_{모듈코드})을 기본값으로 쓰게 한다. */
export function GridDecimalModuleProvider({
  moduleCode,
  children,
}: {
  moduleCode: string;
  children: ReactNode;
}) {
  return (
    <GridDecimalModuleContext.Provider value={moduleCode.trim().toUpperCase() || null}>
      {children}
    </GridDecimalModuleContext.Provider>
  );
}

/** 현재 모듈의 정책 소수점 규칙. 모듈 컨텍스트나 정책이 없으면 undefined. */
export function usePolicyDecimalRule(): GridDecimalRule | undefined {
  const moduleCode = useContext(GridDecimalModuleContext);
  const [rule, setRule] = useState<GridDecimalRule | undefined>();

  useEffect(() => {
    if (!moduleCode) {
      setRule(undefined);
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
