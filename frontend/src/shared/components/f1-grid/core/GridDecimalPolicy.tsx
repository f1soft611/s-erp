import type { ReactNode } from 'react';
import { GridDecimalModuleContext } from './gridDecimalPolicyContext';

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
