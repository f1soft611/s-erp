import { useState } from 'react';
import {
  Box, Button, ButtonBase, Chip, Container, Stack, Typography, alpha,
} from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import EditNoteRounded from '@mui/icons-material/EditNoteRounded';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../shared/components/PageHeader';
import type { ModuleItem, PageContent } from '../dashboard/types/dashboard';
import { useOverviewData } from '../dashboard/overview/hooks/useOverviewData';
import { MetricCard, OverviewEmpty, OverviewError, OverviewPanel, OverviewSkeleton } from '../dashboard/overview/components/OverviewWidgets';
import { SalesOverview } from '../dashboard/overview/components/SalesOverview';
import { DocumentStatusDetail } from './documents/status/components/DocumentStatusDetail';
import type { DocumentApprovalDetail } from './documents/write/types/documentWrite.types';

type OverviewPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

const rowStyle = {
  display: 'flex', width: '100%', textAlign: 'left', minWidth: 0,
  gap: 1.25, px: 1, py: 1.5, borderRadius: 2,
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
} as const;

export function OverviewPage({ selectedModule, currentMenuName }: OverviewPageProps) {
  const navigate = useNavigate();
  const data = useOverviewData();
  const overview = data.overview;
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentApprovalDetail | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const approvalPath = overview?.approvalPath ?? '/groupware/doc/read';
  const approval = overview?.approval;
  const afterDocumentAction = () => {
    setDetailVersion((v) => v + 1);
    data.refresh();
  };
  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <PageHeader breadcrumbItems={[selectedModule.name, currentMenuName]}
        description="내 업무와 주요 경영 지표를 한눈에 확인합니다." />
      <Container maxWidth="xl" data-testid="overview-scroll" sx={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 },
      }}>
        <Stack spacing={{ xs: 3, sm: 3.5 }}>
          <Box sx={(theme) => ({
            p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, overflow: 'hidden',
            border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.17),
            background: `radial-gradient(ellipse at 100% 0%, ${alpha(theme.palette.success.main, 0.1)}, transparent 65%),
              linear-gradient(120deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.13 : 0.07)}, ${theme.palette.background.paper})`,
          })}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2.5, alignItems: { md: 'center' } }}>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em', color: 'primary.main', mb: 1.25 }}>
                  WORKSPACE / OVERVIEW
                </Typography>
                <Typography component="h1" sx={{ fontSize: { xs: '1.4rem', sm: '1.85rem' }, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                  오늘의 업무를 한눈에 확인하세요
                </Typography>
                <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: '0.81rem', lineHeight: 1.7 }}>
                  처리할 일부터 주요 수주 현황까지, 필요한 정보에 집중하세요.
                </Typography>
              </Box>
              <Stack sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 1.25, flexShrink: 0 }}>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {overview && <Chip icon={<CalendarTodayOutlined />} variant="outlined" label={`기준일 ${overview.asOfDate}`}
                    sx={{
                      bgcolor: 'background.paper', borderColor: 'divider', borderRadius: 2,
                      height: 34, px: 1.5, py: 0.75, fontSize: '0.8125rem', lineHeight: 1.4,
                      '& .MuiChip-label': { p: 0 },
                      '& .MuiChip-icon': { m: 0, mr: 1, fontSize: 20 },
                    }} />}
                  <Button variant="outlined" startIcon={<RefreshRounded />} onClick={data.refresh}
                    disabled={data.overviewLoading} aria-label="종합현황 새로고침"
                    sx={{
                      bgcolor: 'background.paper', borderColor: 'divider', borderRadius: 2,
                      height: 34, px: 1.5, py: 0.75,
                      '& .MuiButton-startIcon': { ml: 0 },
                    }}>
                    새로고침
                  </Button>
                </Stack>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }} aria-live="polite">
                  {data.overviewLoading ? '최신 업무 현황을 확인하고 있습니다.'
                    : overview ? `업무 조회 ${new Date(overview.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
                    : '조회 상태를 확인해 주세요.'}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {data.overviewLoading ? <OverviewSkeleton /> : data.overviewError ? (
            <OverviewError label="종합현황" onRetry={data.refresh} />
          ) : overview && (
            <>
              {overview.canReadApprovals && (
                <Box component="section" aria-label="내 업무">
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography component="h2" sx={{ fontWeight: 750, fontSize: '1.05rem' }}>내 업무</Typography>
                    <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary' }}>현재 처리 상태 · 기간 제한 없음</Typography>
                  </Stack>
                  {overview.approvalStatus === 'error' ? <OverviewError label="결재 업무" onRetry={data.refresh} /> : approval && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
                      <MetricCard label="내가 처리할 결재" value={approval.actionRequiredCount} unit="건" hint="내 결재 순서에 도착한 문서"
                        icon={<TaskAltRounded fontSize="small" />} onClick={() => navigate(approvalPath)} />
                      <MetricCard label="내 임시저장" value={approval.draftCount} unit="건" hint="이어서 작성할 기안 문서"
                        tone="success" icon={<EditNoteRounded fontSize="small" />} onClick={() => navigate(approvalPath)} />
                      <MetricCard label="내 보완 필요" value={approval.revisionRequestedCount} unit="건" hint="내가 기안한 보완요청 문서"
                        tone="warning" icon={<RateReviewOutlined fontSize="small" />} onClick={() => navigate(approvalPath)} />
                    </Box>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: {
                xs: '1fr', md: overview.canReadApprovals && overview.canReadNotices ? '1fr 1fr' : '1fr',
              }, gap: 2.5 }}>
                {overview.canReadApprovals && overview.approvalStatus === 'ready' && approval && (
                  <OverviewPanel title="지금 확인할 업무" caption="결재 대기 및 보완요청 · 최근 변경 순"
                    icon={<AssignmentOutlined fontSize="small" />}
                    action={<Button size="small" onClick={() => navigate(approvalPath)}>문서 업무 <ArrowOutwardRounded sx={{ ml: 0.5, fontSize: 14 }} /></Button>}>
                    {approval.notices.length === 0 ? <OverviewEmpty>처리할 업무가 없습니다.</OverviewEmpty> : (
                      <Stack spacing={0.5}>
                        {approval.notices.map((item) => (
                          <ButtonBase key={item.electronicApprovalId} onClick={() => setDocumentId(item.electronicApprovalId)} sx={rowStyle}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Chip size="small" variant="outlined" color={item.noticeType === 'REVISION_REQUESTED' ? 'warning' : 'primary'}
                                label={item.noticeType === 'REVISION_REQUESTED' ? '보완요청' : '결재대기'} sx={{ mb: 0.9, fontSize: '0.65rem', height: 22 }} />
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 650, overflowWrap: 'anywhere' }}>{item.title}</Typography>
                            </Box>
                            <ArrowOutwardRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                          </ButtonBase>
                        ))}
                      </Stack>
                    )}
                  </OverviewPanel>
                )}
                {overview.canReadNotices && (
                  <OverviewPanel title="최근 공지" caption="상단 고정 공지 우선 · 최근 등록 순"
                    icon={<NotificationsNoneRounded fontSize="small" />}
                    action={<Button size="small" onClick={() => navigate('/groupware/community/notice')}>전체 보기 <ArrowOutwardRounded sx={{ ml: 0.5, fontSize: 14 }} /></Button>}>
                    {overview.noticeStatus === 'error' ? <OverviewError label="최근 공지" onRetry={data.refresh} />
                      : overview.notices.length === 0 ? <OverviewEmpty>등록된 공지가 없습니다.</OverviewEmpty> : (
                        <Stack spacing={0.5}>
                          {overview.notices.map((item) => (
                            <ButtonBase key={item.postId}
                              onClick={() => navigate(`/groupware/community/notice?dashboardPostId=${item.postId}`)} sx={rowStyle}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 0.75 }}>
                                  {item.isPinned === 'Y' && <PushPinOutlined sx={{ fontSize: 15, mt: 0.25, color: 'primary.main', flexShrink: 0 }} />}
                                  <Typography sx={{ fontSize: '0.83rem', fontWeight: 650, overflowWrap: 'anywhere' }}>{item.title}</Typography>
                                </Stack>
                                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.65 }}>{item.createdAt.slice(0, 10)}</Typography>
                              </Box>
                              <ArrowOutwardRounded sx={{ color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
                            </ButtonBase>
                          ))}
                        </Stack>
                      )}
                  </OverviewPanel>
                )}
              </Box>
              {!overview.canReadApprovals && !overview.canReadNotices && !overview.canReadSales && (
                <OverviewEmpty>조회 가능한 업무가 없습니다. 메뉴 권한을 확인해 주세요.</OverviewEmpty>
              )}
              {overview.canReadSales && <SalesOverview month={data.month} onMonthChange={data.setMonth}
                data={data.sales} loading={data.salesLoading} error={data.salesError} onRetry={data.retrySales} />}
              <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', textAlign: 'center' }}>
                로그인한 사용자의 업무와 조회 권한이 있는 현황만 표시합니다.
              </Typography>
            </>
          )}
        </Stack>
      </Container>
      {documentId !== null && <DocumentStatusDetail selectedDocumentId={documentId}
        editingDocument={editingDocument} isComposerOpen={editingDocument !== null} detailRefreshToken={detailVersion}
        onClose={() => { setDocumentId(null); setEditingDocument(null); }}
        onEditDocument={setEditingDocument} onActionComplete={afterDocumentAction}
        onComposerClose={() => { setEditingDocument(null); afterDocumentAction(); }} />}
    </Box>
  );
}
