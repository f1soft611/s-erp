import type { ReactNode } from 'react';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import CurrencyExchangeOutlined from '@mui/icons-material/CurrencyExchangeOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import PrecisionManufacturingOutlined from '@mui/icons-material/PrecisionManufacturingOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import type {
  ModuleItem,
  MenuItem,
  MenuTreeNode,
  PageContent,
} from '../types/dashboard';

type ModuleIconKind =
  | 'groupware'
  | 'purchase'
  | 'production'
  | 'finance'
  | 'hr'
  | 'settings';

function ModuleIcon({ kind }: { kind: ModuleIconKind }): ReactNode {
  const map: Record<ModuleIconKind, ReactNode> = {
    groupware: <GroupsOutlined fontSize="medium" />,
    purchase: <ShoppingCartOutlined fontSize="medium" />,
    production: <PrecisionManufacturingOutlined fontSize="medium" />,
    finance: <CurrencyExchangeOutlined fontSize="medium" />,
    hr: <AccountCircleOutlined fontSize="medium" />,
    settings: <SettingsOutlined fontSize="medium" />,
  };

  return map[kind];
}

const flattenMenuTree = (nodes: MenuTreeNode[]): MenuItem[] =>
  nodes.flatMap((node) => {
    if (node.children && node.children.length > 0) {
      return flattenMenuTree(node.children);
    }

    return node.pageKey
      ? [{ id: node.id, name: node.name, pageKey: node.pageKey }]
      : [];
  });

export const moduleItems: ModuleItem[] = [
  {
    id: 'groupware',
    name: '그룹웨어',
    icon: <ModuleIcon kind="groupware" />,
    tree: [
      {
        id: 'groupware-main',
        name: '업무관리',
        children: [
          { id: 'approval', name: '전자결재', pageKey: 'approval' },
          { id: 'notice', name: '공지사항', pageKey: 'notice' },
          { id: 'board', name: '게시판', pageKey: 'board' },
        ],
      },
      {
        id: 'groupware-support',
        name: '지원관리',
        children: [
          { id: 'schedule', name: '일정관리', pageKey: 'schedule' },
          { id: 'files', name: '자료실', pageKey: 'files' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'groupware-main',
        name: '업무관리',
        children: [
          { id: 'approval', name: '전자결재', pageKey: 'approval' },
          { id: 'notice', name: '공지사항', pageKey: 'notice' },
          { id: 'board', name: '게시판', pageKey: 'board' },
        ],
      },
      {
        id: 'groupware-support',
        name: '지원관리',
        children: [
          { id: 'schedule', name: '일정관리', pageKey: 'schedule' },
          { id: 'files', name: '자료실', pageKey: 'files' },
        ],
      },
    ]),
  },
  {
    id: 'purchase',
    name: '구매관리',
    icon: <ModuleIcon kind="purchase" />,
    tree: [
      {
        id: 'purchase-base',
        name: '구매기준',
        children: [
          { id: 'partner', name: '거래처관리', pageKey: 'partner' },
          { id: 'purchaseOrder', name: '발주관리', pageKey: 'purchaseOrder' },
        ],
      },
      {
        id: 'purchase-track',
        name: '추적관리',
        children: [
          { id: 'delivery', name: '납품관리', pageKey: 'delivery' },
          { id: 'purchaseStatus', name: '구매현황', pageKey: 'purchaseStatus' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'purchase-base',
        name: '구매기준',
        children: [
          { id: 'partner', name: '거래처관리', pageKey: 'partner' },
          { id: 'purchaseOrder', name: '발주관리', pageKey: 'purchaseOrder' },
        ],
      },
      {
        id: 'purchase-track',
        name: '추적관리',
        children: [
          { id: 'delivery', name: '납품관리', pageKey: 'delivery' },
          { id: 'purchaseStatus', name: '구매현황', pageKey: 'purchaseStatus' },
        ],
      },
    ]),
  },
  {
    id: 'production',
    name: '생산관리',
    icon: <ModuleIcon kind="production" />,
    tree: [
      {
        id: 'production-plan',
        name: '생산계획',
        children: [
          { id: 'plan', name: '생산계획', pageKey: 'plan' },
          { id: 'process', name: '공정관리', pageKey: 'process' },
        ],
      },
      {
        id: 'production-control',
        name: '품질관리',
        children: [
          { id: 'quality', name: '품질관리', pageKey: 'quality' },
          { id: 'inventory', name: '재고관리', pageKey: 'inventory' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'production-plan',
        name: '생산계획',
        children: [
          { id: 'plan', name: '생산계획', pageKey: 'plan' },
          { id: 'process', name: '공정관리', pageKey: 'process' },
        ],
      },
      {
        id: 'production-control',
        name: '품질관리',
        children: [
          { id: 'quality', name: '품질관리', pageKey: 'quality' },
          { id: 'inventory', name: '재고관리', pageKey: 'inventory' },
        ],
      },
    ]),
  },
  {
    id: 'finance',
    name: '재무관리',
    icon: <ModuleIcon kind="finance" />,
    tree: [
      {
        id: 'finance-plan',
        name: '예산관리',
        children: [
          { id: 'budget', name: '예산관리', pageKey: 'budget' },
          { id: 'payment', name: '결제관리', pageKey: 'payment' },
        ],
      },
      {
        id: 'finance-report',
        name: '보고관리',
        children: [
          { id: 'tax', name: '세금관리', pageKey: 'tax' },
          { id: 'reporting', name: '재무보고', pageKey: 'reporting' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'finance-plan',
        name: '예산관리',
        children: [
          { id: 'budget', name: '예산관리', pageKey: 'budget' },
          { id: 'payment', name: '결제관리', pageKey: 'payment' },
        ],
      },
      {
        id: 'finance-report',
        name: '보고관리',
        children: [
          { id: 'tax', name: '세금관리', pageKey: 'tax' },
          { id: 'reporting', name: '재무보고', pageKey: 'reporting' },
        ],
      },
    ]),
  },
  {
    id: 'hr',
    name: '인사관리',
    icon: <ModuleIcon kind="hr" />,
    tree: [
      {
        id: 'hr-core',
        name: '인사기본',
        children: [
          { id: 'employee', name: '사원관리', pageKey: 'employee' },
          { id: 'attendance', name: '근태관리', pageKey: 'attendance' },
        ],
      },
      {
        id: 'hr-payroll',
        name: '급여관리',
        children: [
          { id: 'payroll', name: '급여관리', pageKey: 'payroll' },
          { id: 'appointment', name: '인사발령', pageKey: 'appointment' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'hr-core',
        name: '인사기본',
        children: [
          { id: 'employee', name: '사원관리', pageKey: 'employee' },
          { id: 'attendance', name: '근태관리', pageKey: 'attendance' },
        ],
      },
      {
        id: 'hr-payroll',
        name: '급여관리',
        children: [
          { id: 'payroll', name: '급여관리', pageKey: 'payroll' },
          { id: 'appointment', name: '인사발령', pageKey: 'appointment' },
        ],
      },
    ]),
  },
  {
    id: 'settings',
    name: '환경설정',
    icon: <ModuleIcon kind="settings" />,
    tree: [
      {
        id: 'settings-base',
        name: '기본설정',
        children: [
          { id: 'company', name: '회사정보', pageKey: 'company' },
          { id: 'role', name: '권한관리', pageKey: 'role' },
        ],
      },
      {
        id: 'settings-system',
        name: '시스템설정',
        children: [
          { id: 'system', name: '시스템설정', pageKey: 'system' },
          { id: 'user', name: '사용자관리', pageKey: 'user' },
        ],
      },
    ],
    menus: flattenMenuTree([
      {
        id: 'settings-base',
        name: '기본설정',
        children: [
          { id: 'company', name: '회사정보', pageKey: 'company' },
          { id: 'role', name: '권한관리', pageKey: 'role' },
        ],
      },
      {
        id: 'settings-system',
        name: '시스템설정',
        children: [
          { id: 'system', name: '시스템설정', pageKey: 'system' },
          { id: 'user', name: '사용자관리', pageKey: 'user' },
        ],
      },
    ]),
  },
];

export const defaultPage: PageContent = {
  title: '업무 현황',
  description:
    '모듈별 업무를 한눈에 확인하고 필요한 프로세스를 빠르게 진행할 수 있습니다.',
  cards: [
    { label: '진행 중', value: '24' },
    { label: '검토 요청', value: '07' },
    { label: '완료 건수', value: '86' },
    { label: '정기 보고', value: '04' },
  ],
  items: [
    {
      title: '업무 보고서 승인 요청',
      meta: '재무팀 · 10분 전',
      status: '검토중',
    },
    {
      title: '신규 고객 계약서 검토',
      meta: '영업팀 · 25분 전',
      status: '대기',
    },
    {
      title: '월간 생산 계획 공유',
      meta: '생산팀 · 1시간 전',
      status: '진행중',
    },
  ],
};

export const pageContentMap: Record<string, PageContent> = {
  approval: {
    title: '전자결재',
    description:
      '결재 요청과 승인 상태를 체계적으로 관리하는 전자결재 업무 화면입니다.',
    cards: [
      { label: '대기 결재', value: '18' },
      { label: '진행 중', value: '09' },
      { label: '반려', value: '02' },
      { label: '승인 완료', value: '54' },
    ],
    items: [
      { title: '인사평가 계획안', meta: '인사팀 · 5분 전', status: '검토중' },
      {
        title: '재무 예산 승인서',
        meta: '회계팀 · 1시간 전',
        status: '결재대기',
      },
      { title: '운영 보고서 초안', meta: '기획팀 · 오늘', status: '진행중' },
    ],
  },
  notice: {
    title: '공지사항',
    description: '중요 공지와 내부 운영 사항을 공유하고 확인하는 화면입니다.',
    cards: [
      { label: '전체 공지', value: '15' },
      { label: '필수 확인', value: '05' },
      { label: '임시 저장', value: '02' },
      { label: '배포 예정', value: '03' },
    ],
    items: [
      {
        title: '신규 보안 정책 안내',
        meta: '운영팀 · 1시간 전',
        status: '필수',
      },
      { title: '개발 일정 점검 안내', meta: 'IT팀 · 오늘', status: '공지' },
      { title: '월간 운영 회의 일정', meta: '총무팀 · 어제', status: '알림' },
    ],
  },
  board: {
    title: '게시판',
    description: '업무 커뮤니케이션과 정보를 공유하는 협업 게시판입니다.',
    cards: [
      { label: '게시글', value: '218' },
      { label: '답글', value: '34' },
      { label: '좋아요', value: '1.2K' },
      { label: '활성 사용자', value: '97' },
    ],
    items: [
      { title: '사내 교육 일정 공유', meta: '전사 · 2시간 전', status: '신규' },
      {
        title: '업무 협업 가이드 업데이트',
        meta: '운영팀 · 5시간 전',
        status: '공지',
      },
      {
        title: '고객 대응 매뉴얼 배포 안내',
        meta: '고객지원 · 어제',
        status: '필독',
      },
    ],
  },
  schedule: {
    title: '일정관리',
    description: '팀 회의, 검토 일정, 업무 일정을 체계적으로 정리합니다.',
    cards: [
      { label: '오늘 일정', value: '06' },
      { label: '내일 일정', value: '08' },
      { label: '회의', value: '11' },
      { label: '휴가', value: '03' },
    ],
    items: [
      { title: '팀 회의', meta: '오늘 15:00 · 회의실 A', status: '회의' },
      { title: '예산 검토', meta: '내일 10:00 · 재무팀', status: '검토' },
      { title: '업무 리뷰', meta: '금요일 14:00 · 기획팀', status: '리뷰' },
    ],
  },
} as const;
