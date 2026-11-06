import { useCallback, useEffect, useRef, useState } from 'react';
import { GridSaveReconciliationError, type F1GridChanges, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../common-code/services/commonCodeManagement.service';
import type { CommonCodeItemRow } from '../../common-code/types/commonCodeManagement.types';
import {
  fetchWarehouses,
  fetchWarehouseUserOptions,
  saveWarehouseRows,
} from '../services/warehouseManagement.service';
import type {
  WarehouseFilters,
  WarehousePayload,
  WarehouseRow,
  WarehouseUserOption,
} from '../types/warehouseManagement.types';

const WAREHOUSE_TYPE_GROUP_CODE = 'WAREHOUSE_TYPE';

function toPayload(row: WarehouseRow, isNew: boolean): WarehousePayload {
  const warehouseName = row.warehouseName.trim();
  const warehouseCode = row.warehouseCode.trim();
  if (!isNew && !warehouseCode) {
    throw new Error('수정 시 창고코드를 입력해 주세요.');
  }
  if (!warehouseName) {
    throw new Error('창고명을 입력해 주세요.');
  }
  const ynFields: Array<[string, string]> = [
    ['삭제불가여부', row.deleteLockAt],
    ['불용창고여부', row.disuseAt],
    ['현재고표시여부', row.stockQtyDispAt],
    ['수불처리여부', row.stockIoAt],
    ['안전재고미달알림여부', row.safetyStockAlertAt],
    ['재고현황기본조회여부', row.stockDefaultAt],
  ];
  ynFields.forEach(([label, value]) => {
    if (value !== 'Y' && value !== 'N') {
      throw new Error(`${label}는 사용 또는 미사용으로 선택해 주세요.`);
    }
  });

  return {
    warehouseCode,
    warehouseName,
    warehouseType: row.warehouseType.trim(),
    deleteLockAt: row.deleteLockAt,
    disuseAt: row.disuseAt,
    stockQtyDispAt: row.stockQtyDispAt,
    stockIoAt: row.stockIoAt,
    safetyStockAlertAt: row.safetyStockAlertAt,
    stockDefaultAt: row.stockDefaultAt,
    plantId: row.plantId,
    customerId: row.customerId,
    managerUserId: row.managerUserId,
    departmentId: row.departmentId,
    telNo: row.telNo.trim(),
    faxNo: row.faxNo.trim(),
    address: row.address.trim(),
    remark: row.remark.trim(),
  };
}

export function useWarehouseManagement(initialFilters: WarehouseFilters = {}) {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef(initialFilters);
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [userOptions, setUserOptions] = useState<WarehouseUserOption[]>([]);
  const [warehouseTypeItems, setWarehouseTypeItems] = useState<CommonCodeItemRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const reconciliationRequired = useRef(false);
  const loadVersion = useRef(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<WarehouseFilters>(initialFilters);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const loadRows = useCallback(
    async (filters: WarehouseFilters = {}) => {
      const version = ++loadVersion.current;
      setLoading(true);
      start();
      setError('');
      try {
        const [nextRows, groups, nextUserOptions] = await Promise.all([
          fetchWarehouses(filters),
          fetchCommonCodeGroups(),
          fetchWarehouseUserOptions(),
        ]);
        if (version !== loadVersion.current) return false;
        const warehouseTypeGroup = groups.find(
          (group) => group.groupCode === WAREHOUSE_TYPE_GROUP_CODE,
        );
        const items = warehouseTypeGroup
          ? await fetchCommonCodeItems(warehouseTypeGroup.id)
          : [];
        if (version !== loadVersion.current) return false;
        setRows(nextRows);
        setUserOptions(nextUserOptions);
        setWarehouseTypeItems(items.filter((item) => item.useAt === 'Y'));
        succeed();
        reconciliationRequired.current = false;
        return true;
      } catch (loadError) {
        if (version !== loadVersion.current) return false;
        fail(loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : '창고 목록을 불러오지 못했습니다.',
        );
        return false;
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    },
    [start, succeed, fail],
  );

  useEffect(() => {
    void loadRows(initialFiltersRef.current);
    return () => { ++loadVersion.current; };
  }, [loadRows]);

  const applyFilters = useCallback(
    (filters: WarehouseFilters) => {
      setAppliedFilters(filters);
      void loadRows(filters);
    },
    [loadRows],
  );

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((current) => current + 1);
  }, []);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<WarehouseRow>) => {
      setHasChanges(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
    },
    [],
  );

  const saveChanges = useCallback(
    async (
      changes: F1GridChanges<WarehouseRow>,
      acceptSavedRows: F1GridRef<WarehouseRow>['acceptSavedRows'],
    ) => {
      if (reconciliationRequired.current) {
        setError(new GridSaveReconciliationError(undefined).message);
        return;
      }
      if (savingRef.current) return;
      if (
        !changes.insertedRows.length &&
        !changes.updatedRows.length &&
        !changes.deletedRows.length
      ) {
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        if (changes.deletedRows.length) {
          throw new Error('창고는 삭제할 수 없습니다. 불용창고로 변경해 주세요.');
        }
        const insertedRows = changes.insertedRows.map((row) => ({
          ...toPayload(row, true),
          warehouseId: String(row.warehouseId),
        }));
        const updatedRows = changes.updatedRows.map((row) => {
          const warehouseId = Number(row.warehouseId);
          if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
            throw new Error('수정할 창고를 확인할 수 없습니다.');
          }
          return { ...toPayload(row, false), warehouseId: String(warehouseId) };
        });
        const savedRows = await saveWarehouseRows({
          warehouses: { insertedRows, updatedRows, deletedRows: [] },
        }, [...changes.insertedRows, ...changes.updatedRows]);
        try {
          setRows(acceptSavedRows(savedRows));
        } catch (cause) {
          throw new GridSaveReconciliationError(cause);
        }
        setHasChanges(false);
        showSuccess('창고를 저장했습니다.');
      } catch (saveError) {
        if (saveError instanceof GridSaveReconciliationError) reconciliationRequired.current = true;
        setError(
          saveError instanceof Error
            ? saveError.message
            : '창고를 저장하지 못했습니다.',
        );
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [showSuccess],
  );

  return {
    initialLoad,
    rows,
    userOptions,
    warehouseTypeItems,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    discardChanges,
    appliedFilters,
    applyFilters,
    handleChangesChange,
    saveChanges,
  };
}
