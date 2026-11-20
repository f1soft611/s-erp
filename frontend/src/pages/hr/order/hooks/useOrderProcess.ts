import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import { useNotification } from '../../../../shared/context/notification';
import {
  buildProcessPayload,
  createTargetRow,
  todayString,
  validateOrderInput,
  type OrderPost,
} from '../data/orderGridData';
import { fetchOrderCodeOptions, fetchOrderEmployee, fetchOrderTypes, processOrder } from '../services/order.service';
import type {
  OrderCodeOptions,
  OrderEmployee,
  OrderProcessResult,
  OrderTargetRow,
  OrderTypeDef,
} from '../types/order.types';

const EMPTY_POST: OrderPost = { value: '', label: '' };

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** 선택한 도움창 결과(사원 선택 도움창의 사원 값). */
export type PickedEmployee = { userId: number };

/**
 * 인사명령 처리 탭의 상태: 명령 유형·명령일·명령 후 값·비고, 대상 사원과 그 표, 처리.
 * 표의 값 수정(명령 후)은 그리드가 들고 있으므로 상태를 바꾸기 전에 그리드에서 읽어 와 합친다.
 */
export function useOrderProcess(gridRef: RefObject<F1GridRef<OrderTargetRow> | null>, onProcessed: () => void) {
  const { showSuccess } = useNotification();
  const [types, setTypes] = useState<OrderTypeDef[]>([]);
  const [codeOptions, setCodeOptions] = useState<OrderCodeOptions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [orderDt, setOrderDtState] = useState(todayString());
  const [remark, setRemark] = useState('');
  const [bar, setBar] = useState<OrderPost>(EMPTY_POST);
  const [employees, setEmployees] = useState<OrderEmployee[]>([]);
  const [posts, setPosts] = useState<Record<number, OrderPost>>({});
  const [gridKey, setGridKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);

  const type = useMemo(() => types.find((candidate) => candidate.code === typeCode), [types, typeCode]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loadedTypes = await fetchOrderTypes();
        const groups = Array.from(new Set(loadedTypes.map((item) => item.codeGroup).filter(Boolean)));
        const options = await fetchOrderCodeOptions(groups);
        if (cancelled) return;
        setTypes(loadedTypes);
        setCodeOptions(options);
        setError('');
      } catch (cause) {
        if (!cancelled) setError(messageOf(cause, '인사명령 유형을 불러오지 못했습니다.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  /** 그리드에서 수정한 명령 후 값을 읽어 합친다. */
  const postsFromGrid = useCallback((): Record<number, OrderPost> => {
    const rows = gridRef.current?.getRows();
    if (!rows) return posts;
    const next: Record<number, OrderPost> = { ...posts };
    rows.forEach((row) => { next[row.userId] = { value: String(row.postValue ?? ''), label: String(row.postLabel ?? '') }; });
    return next;
  }, [gridRef, posts]);

  const targets = useMemo<OrderTargetRow[]>(
    () => (type ? employees.map((employee) => createTargetRow(type, employee, posts[employee.userId] ?? EMPTY_POST)) : []),
    [type, employees, posts],
  );

  const reloadGrid = useCallback(() => setGridKey((current) => current + 1), []);

  const defaultPostFor = useCallback((nextType: OrderTypeDef | undefined, date: string): OrderPost => (
    nextType?.inputKind === 'date' ? { value: date, label: '' } : EMPTY_POST
  ), []);

  const changeType = useCallback((code: string) => {
    const nextType = types.find((candidate) => candidate.code === code);
    const defaultPost = defaultPostFor(nextType, orderDt);
    setTypeCode(code);
    setBar(defaultPost);
    // 유형이 바뀌면 명령 후 값은 모두 새 기본값으로 되돌린다.
    setPosts(Object.fromEntries(employees.map((employee) => [employee.userId, defaultPost])));
    reloadGrid();
    setError('');
  }, [types, employees, orderDt, defaultPostFor, reloadGrid]);

  const setOrderDt = useCallback((next: string) => {
    if (type?.inputKind === 'date') {
      // 날짜 명령은 명령 후 값이 명령일을 따라간다(명령일과 같던 값만).
      const previous = orderDt;
      const synced = postsFromGrid();
      const updated: Record<number, OrderPost> = {};
      Object.keys(synced).forEach((key) => {
        const id = Number(key);
        updated[id] = synced[id].value === previous ? { value: next, label: '' } : synced[id];
      });
      setPosts(updated);
      if (bar.value === previous) setBar({ value: next, label: '' });
      reloadGrid();
    }
    setOrderDtState(next);
  }, [type, orderDt, bar.value, postsFromGrid, reloadGrid]);

  /** 상단 명령 후 값을 바꾸면 모든 대상 사원에 적용한다(행에서 따로 수정할 수 있다). */
  const applyBar = useCallback((next: OrderPost) => {
    setBar(next);
    setPosts(Object.fromEntries(employees.map((employee) => [employee.userId, next])));
    reloadGrid();
  }, [employees, reloadGrid]);

  const addEmployees = useCallback(async (picked: PickedEmployee[]) => {
    const known = new Set(employees.map((employee) => employee.userId));
    const fresh = picked.filter((item) => !known.has(item.userId));
    if (fresh.length === 0) return;
    try {
      const loaded = await Promise.all(fresh.map((item) => fetchOrderEmployee(item.userId)));
      const synced = postsFromGrid();
      const next = { ...synced };
      loaded.forEach((employee) => { next[employee.userId] = bar; });
      setPosts(next);
      setEmployees([...employees, ...loaded]);
      reloadGrid();
      setError('');
    } catch (cause) {
      setError(messageOf(cause, '사원 정보를 불러오지 못했습니다.'));
    }
  }, [employees, bar, postsFromGrid, reloadGrid]);

  /** 표에서 선택한 행(없으면 아무것도 하지 않음)을 대상에서 뺀다. */
  const removeSelected = useCallback(() => {
    const ids = new Set((gridRef.current?.getSelectedRowIds() ?? []).map((id) => Number(id)));
    if (ids.size === 0) return;
    setPosts(postsFromGrid());
    setEmployees(employees.filter((employee) => !ids.has(employee.userId)));
    reloadGrid();
  }, [gridRef, employees, postsFromGrid, reloadGrid]);

  const clearTargets = useCallback(() => {
    setEmployees([]);
    setPosts({});
    reloadGrid();
  }, [reloadGrid]);

  /** 입력을 확인하고 확인창에 보여 줄 요약을 돌려준다(문제가 있으면 오류를 표시하고 null). */
  const prepare = useCallback((): { rows: OrderTargetRow[]; summary: string } | null => {
    const synced = postsFromGrid();
    const rows = type ? employees.map((employee) => createTargetRow(type, employee, synced[employee.userId] ?? EMPTY_POST)) : [];
    const invalid = validateOrderInput(type, orderDt, rows);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setError('');
    return { rows, summary: `${type?.name} · 명령일 ${orderDt} · ${rows.length}명` };
  }, [type, employees, orderDt, postsFromGrid]);

  const submit = useCallback(async (rows: OrderTargetRow[]): Promise<OrderProcessResult | null> => {
    if (!type || processingRef.current) return null;
    processingRef.current = true;
    setProcessing(true);
    setError('');
    try {
      const result = await processOrder(buildProcessPayload(type, orderDt, remark, rows));
      showSuccess(`${type.name} ${result.count}명을 처리했습니다.`);
      clearTargets();
      setRemark('');
      onProcessed();
      return result;
    } catch (cause) {
      setError(messageOf(cause, '인사명령을 처리하지 못했습니다.'));
      return null;
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, [type, orderDt, remark, showSuccess, clearTargets, onProcessed]);

  return {
    types, type, typeCode, codeOptions, loading, error, setError,
    orderDt, setOrderDt, remark, setRemark, bar, applyBar,
    employees, targets, gridKey, processing,
    changeType, addEmployees, removeSelected, prepare, submit,
  };
}
