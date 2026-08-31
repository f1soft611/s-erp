import type { ReactNode } from 'react';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import type { ModuleItem, PageContent } from '../types/dashboard';
import { moduleDescriptors, type ModuleDescriptor } from './menuService';

function ModuleIcon({ name }: { name: string }): ReactNode {
  const map: Record<string, ReactNode> = {
    Groups: <GroupsOutlined fontSize="medium" />,
    Settings: <SettingsOutlined fontSize="medium" />,
  };

  return map[name] ?? map.Settings;
}

export const buildModuleItems = (
  descriptors: ModuleDescriptor[],
): ModuleItem[] =>
  descriptors.map(({ id, name, iconName, tree, menus }) => ({
    id,
    name,
    icon: <ModuleIcon name={iconName} />,
    tree,
    menus,
  }));

export const moduleItems: ModuleItem[] = buildModuleItems(moduleDescriptors);

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
  overview: {
    title: '종합현황',
    description:
      '결재, 공지, 일정 등 그룹웨어 업무 지표를 한 화면에서 확인합니다.',
    cards: [
      { label: '미결 결재', value: '18' },
      { label: '오늘 일정', value: '06' },
      { label: '신규 공지', value: '04' },
      { label: '읽지 않은 문서', value: '12' },
    ],
    items: [
      { title: '인사평가 계획안', meta: '인사팀 · 5분 전', status: '검토중' },
      {
        title: '재무 예산 승인서',
        meta: '회계팀 · 1시간 전',
        status: '결재대기',
      },
      { title: '월간 운영 회의 일정', meta: '총무팀 · 어제', status: '알림' },
    ],
  },
  documents: {
    title: '문서관리',
    description: '기안 문서와 사내 자료를 등록하고 이력을 관리합니다.',
    cards: [
      { label: '전체 문서', value: '218' },
      { label: '기안 대기', value: '09' },
      { label: '보관 문서', value: '146' },
      { label: '이번 주 등록', value: '17' },
    ],
    items: [
      {
        title: '업무 협업 가이드 v2',
        meta: '운영팀 · 2시간 전',
        status: '신규',
      },
      { title: '고객 대응 매뉴얼', meta: '고객지원 · 어제', status: '필독' },
      { title: '보안 점검 결과 보고서', meta: 'IT팀 · 3일 전', status: '보관' },
    ],
  },
  roles: {
    title: '권한관리',
    description: '역할별 메뉴 접근 권한과 기능 권한을 설정합니다.',
    kind: 'roles',
    cards: [
      { label: '등록 역할', value: '06' },
      { label: '권한 매핑', value: '48' },
      { label: '관리자 계정', value: '03' },
      { label: '검토 대기', value: '01' },
    ],
    items: [
      {
        title: 'ADMIN 역할 권한 점검',
        meta: '운영팀 · 오늘',
        status: '진행중',
      },
      {
        title: '일반사용자 권한 조정',
        meta: '인사팀 · 어제',
        status: '검토중',
      },
      {
        title: '외부협력사 접근 제한',
        meta: '보안팀 · 2일 전',
        status: '완료',
      },
    ],
  },
  menus: {
    title: '메뉴관리',
    description: '모듈별 메뉴 구성과 상위/하위 메뉴 관계를 관리합니다.',
    kind: 'menus',
    cards: [
      { label: '등록 모듈', value: '02' },
      { label: '등록 메뉴', value: '04' },
      { label: '사용 중', value: '04' },
      { label: '미사용', value: '00' },
    ],
    items: [
      { title: '그룹웨어 메뉴 구성', meta: '운영팀 · 오늘', status: '사용' },
      { title: '환경설정 메뉴 구성', meta: '운영팀 · 오늘', status: '사용' },
      { title: '메뉴 정렬 순서 정비', meta: 'IT팀 · 어제', status: '완료' },
    ],
  },
  'f1-grid-test': {
    title: 'F1 Grid 테스트',
    description: '클립보드, 검증, 확장 에디터와 키보드 입력을 확인합니다.',
    cards: [],
    items: [],
  },
} as const;
