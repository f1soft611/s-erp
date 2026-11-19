import { useCallback, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ItemPartnerPriceListPage } from './ItemPartnerPriceListPage';
import { ItemPriceByCustomerPage } from './ItemPriceByCustomerPage';
import { ItemPriceOverviewPage } from './ItemPriceOverviewPage';

type TabKey = 'overview' | 'customer' | 'list';

const TAB_LABELS: Record<TabKey, string> = { overview: '품목 기준', customer: '거래처 기준', list: '단가 이력 조회' };

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

/** 단가등록 탭 호스트: 품목 기준(트리) · 거래처 기준(마스터-디테일) · 단가 이력 조회(조회 전용). */
export function ItemPartnerPriceManagementPage(props: Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [dirty, setDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  const requestTab = (next: TabKey) => {
    if (next === tab) return;
    if (dirty) {
      setPendingTab(next);
      return;
    }
    setTab(next);
  };
  const handleDirty = useCallback((value: boolean) => setDirty(value), []);

  const tabs = (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
      <Tabs
        value={tab}
        onChange={(_event, value: TabKey) => requestTab(value)}
        aria-label="단가등록 구분"
        sx={{ minHeight: 40 }}
      >
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <Tab key={key} value={key} label={TAB_LABELS[key]} sx={{ minHeight: 40 }} />
        ))}
      </Tabs>
    </Box>
  );

  return (
    <>
      {tab === 'overview' && <ItemPriceOverviewPage {...props} tabs={tabs} onDirtyChange={handleDirty} />}
      {tab === 'customer' && <ItemPriceByCustomerPage {...props} tabs={tabs} onDirtyChange={handleDirty} />}
      {tab === 'list' && <ItemPartnerPriceListPage {...props} tabs={tabs} />}
      <UnsavedChangesConfirmDialog
        open={pendingTab !== null}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 다른 탭으로 이동하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setPendingTab(null)}
        onContinue={() => {
          if (pendingTab) {
            setDirty(false);
            setTab(pendingTab);
          }
          setPendingTab(null);
        }}
      />
    </>
  );
}
