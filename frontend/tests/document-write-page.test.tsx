import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitForElementToBeRemoved,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const composerApi = vi.hoisted(() => ({
  fetchDraftFormOptions: vi.fn(),
  fetchDraftForms: vi.fn(),
  fetchDraftFormTemplate: vi.fn(),
  fetchMyProfile: vi.fn(),
}));

vi.mock(
  '../src/pages/co/workflow/form/services/draftFormManagement.service',
  () => ({
    fetchDraftFormOptions: composerApi.fetchDraftFormOptions,
    fetchDraftForms: composerApi.fetchDraftForms,
  }),
);

vi.mock(
  '../src/pages/co/workflow/form/services/draftFormTemplate.service',
  () => ({
    fetchDraftFormTemplate: composerApi.fetchDraftFormTemplate,
  }),
);

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: composerApi.fetchMyProfile,
}));

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { calculateApprovalSlotCapacity } from '../src/pages/groupware/documents/write/components/DocumentApprovalFields';

const muiTheme = createTheme();

const category = {
  id: '101',
  groupId: '10',
  itemCode: 'WORK',
  itemNm: '업무',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 10,
  useAt: 'Y' as const,
  itemDc: '',
};

const anotherCategory = {
  ...category,
  id: '102',
  itemCode: 'PROJECT',
  itemNm: '프로젝트',
  sortOrder: 20,
};

const composerUser = {
  userId: 'emp-1',
  loginId: 1,
  userNm: '홍길동',
  departmentNm: '기획팀',
  profileImage: '/users/emp-1.png',
  levelNm: '대리',
};

const anotherComposerUser = {
  userId: 'emp-2',
  loginId: 2,
  userNm: '김민수',
  departmentNm: '개발팀',
  profileImage: '/users/emp-2.png',
  levelNm: '과장',
};

const thirdComposerUser = {
  userId: 'emp-3',
  loginId: 3,
  userNm: '박서준',
  departmentNm: '재무팀',
  profileImage: '/users/emp-3.png',
  levelNm: '사원',
};

const fourthComposerUser = {
  userId: 'emp-4',
  loginId: 4,
  userNm: '이수진',
  departmentNm: '인사팀',
  profileImage: '/users/emp-4.png',
  levelNm: '부장',
};

const draftForm = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  categoryItemId: 101,
  categoryName: '업무',
  regTermId: 201,
  regTerm: '월',
  reviewerId: null,
  reviewerName: '',
  approverId: null,
  approverName: '',
  assigneeIds: [],
  assigneeSummary: '',
  createdByName: '관리자',
  createdAt: '2026-10-02 09:00',
  hasDocument: true,
  useAt: 'Y' as const,
};

const draftFormTemplate = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  hasDocument: true,
  templateJson: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '양식 본문' }] },
    ],
  },
  templateHtml: '<p>양식 본문</p>',
};

beforeEach(() => {
  vi.clearAllMocks();
  composerApi.fetchDraftFormOptions.mockResolvedValue({
    categoryGroup: null,
    categoryItems: [category],
    cycleItems: [],
    users: [composerUser, anotherComposerUser, thirdComposerUser],
  });
  composerApi.fetchDraftForms.mockResolvedValue([draftForm]);
  composerApi.fetchDraftFormTemplate.mockResolvedValue(draftFormTemplate);
  composerApi.fetchMyProfile.mockResolvedValue({
    userId: 'writer',
    name: '기안자',
  });
});

const pageProps = {
  selectedModule: {
    id: 'groupware',
    name: '그룹웨어',
    icon: <span aria-hidden="true">G</span>,
    tree: [],
    menus: [],
    path: '/groupware',
  },
  currentMenuName: '문서작성',
  currentPageKey: 'write',
  breadcrumbItems: ['그룹웨어', '문서관리', '문서작성'],
  content: {
    title: '문서작성',
    description: '결재 문서를 작성하고 진행 상태를 확인합니다.',
    cards: [],
    items: [],
  },
};

async function waitForComposerReady() {
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: '기안자' })).toHaveValue(
      '기안자',
    ),
  );
}

function installApprovalResizeObserverMock() {
  const observers: (
    ResizeObserver & {
      resize: (width: number) => void;
      isObserving: (element: Element) => boolean;
    }
  )[] = [];

  class MockApprovalResizeObserver implements ResizeObserver {
    private target: Element | null = null;

    constructor(private callback: ResizeObserverCallback) {
      observers.push(
        this as ResizeObserver & {
          resize: (width: number) => void;
          isObserving: (element: Element) => boolean;
        },
      );
    }

    observe(target: Element): void {
      this.target = target;
      this.resize(262);
    }

    unobserve(_target: Element): void {}

    disconnect(): void {
      this.target = null;
    }

    isObserving(element: Element): boolean {
      return this.target === element;
    }

    resize(width: number): void {
      if (!this.target) return;
      const entry = {
        target: this.target,
        contentRect: {
          x: 0,
          y: 0,
          top: 0,
          right: width,
          bottom: 0,
          left: 0,
          width,
          height: 0,
          toJSON: () => ({}),
        },
      } as ResizeObserverEntry;
      this.callback([entry], this);
    }
  }

  vi.stubGlobal('ResizeObserver', MockApprovalResizeObserver);
  return observers;
}

describe('Document write page', () => {
  it('renders at the groupware write route instead of the coming-soon page', () => {
    render(<DashboardContent {...pageProps} />);

    expect(screen.getByTestId('document-write-page')).toBeInTheDocument();
    expect(
      screen.queryByText('요청하신 페이지는 현재 준비 중입니다'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /문서 작성/ }),
    ).toBeInTheDocument();
  });

  it('defaults to list mode and displays approval status and all document kinds', () => {
    render(<DashboardContent {...pageProps} />);

    expect(
      screen.getByRole('button', { name: '리스트형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: '문서 제목 검색' }),
    ).not.toBeInTheDocument();
    const listRegion = screen.getByRole('region', {
      name: '리스트형 문서 목록',
    });
    expect(listRegion.querySelectorAll('button')).toHaveLength(5);
    expect(listRegion).not.toHaveTextContent('월간 업무 계획 승인 요청');
    ['기안서', '업무연락', '지출결의서', '근태신청'].forEach((kind) => {
      expect(screen.getAllByText(kind).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('결재대기')).toBeInTheDocument();
    expect(screen.getByText('보완요청')).toBeInTheDocument();
  });

  it('switches to feed mode and opens the document composer with available tabs', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByRole('button', { name: '피드형 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('document-feed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    expect(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).toBeInTheDocument();
    await waitForComposerReady();
    expect(
      screen.getByTestId('document-composer-dialog-root'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '업무연락' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '지출결의서' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '근태신청' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '제목' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: '본문' }).closest('.rich-text-editor-content'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '툴바 열기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '첨부 링크' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    expect(screen.getByRole('button', { name: '굵게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '표 삽입' })).toBeInTheDocument();
  });

  it('lets the dialog content scroll while the editor surface grows naturally', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editor = screen.getByRole('textbox', { name: '본문' });
    const composerLayout = screen.getByTestId('document-composer-layout');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const dialogContent = editor.closest('.MuiDialogContent-root');

    expect(composerLayout).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '0',
    });
    expect(editorPanel).toHaveStyle({
      flexGrow: '1',
      flexShrink: '0',
      minHeight: '180px',
    });
    expect(editor).toHaveStyle({
      minHeight: '180px',
      maxHeight: 'none',
      flexShrink: '0',
    });
    expect(dialogContent).toHaveStyle({ overflowY: 'auto' });
  });

  it('keeps the editor whitespace even when a template starts with a margined block', async () => {
    composerApi.fetchDraftFormTemplate.mockResolvedValue({
      ...draftFormTemplate,
      templateJson: null,
      templateHtml:
        '<blockquote><p>첫 블록</p></blockquote><p>마지막 블록</p>',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('마지막 블록'));

    const firstBlock = editor.firstElementChild;
    const lastBlock = editor.lastElementChild;
    if (!firstBlock || !lastBlock) {
      throw new Error('Template blocks were not rendered in the editor.');
    }

    expect(getComputedStyle(editor).paddingTop).toBe(
      getComputedStyle(editor).paddingBottom,
    );
    expect(getComputedStyle(firstBlock).marginTop).toBe('0px');
    expect(getComputedStyle(lastBlock).marginBottom).toBe('0px');
  });

  it('shows read-only draft metadata and the default category and form fields', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const draftDate = await screen.findByRole('textbox', { name: '기안일' });
    const drafter = screen.getByRole('textbox', { name: '기안자' });
    expect(draftDate).toHaveValue();
    expect(draftDate.getAttribute('value')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(draftDate).toHaveAttribute('readonly');
    expect(draftDate.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(drafter).toHaveValue('기안자');
    expect(drafter).toHaveAttribute('readonly');
    const categorySelector = screen.getByRole('combobox', { name: '구분' });
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    expect(categorySelector).toHaveTextContent('전체');
    expect(categorySelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(formSelector).toBeInTheDocument();
    expect(formSelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(composerApi.fetchDraftFormOptions).toHaveBeenCalledOnce();
    expect(composerApi.fetchDraftForms).toHaveBeenCalledOnce();
    expect(composerApi.fetchMyProfile).toHaveBeenCalledOnce();
  });

  it('shows a visible error when initial draft lookup fails', async () => {
    composerApi.fetchDraftFormOptions.mockRejectedValue(
      new Error('기안 분류를 불러오지 못했습니다.'),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    expect(
      await screen.findByText('기안 분류를 불러오지 못했습니다.'),
    ).toBeInTheDocument();
  });

  it('shows a loading status while initial draft lookups are pending', async () => {
    composerApi.fetchDraftFormOptions.mockReturnValue(
      new Promise(() => undefined),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    expect(
      await screen.findByText('기안서 정보를 불러오는 중입니다.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '구분' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('shows an error when the profile has no drafter name and explicit empty states', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'writer',
      name: ' ',
    });
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [],
      cycleItems: [],
      users: [],
    });
    composerApi.fetchDraftForms.mockResolvedValue([]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: '기안자' }),
      ).toBeInTheDocument(),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 이름을 확인할 수 없습니다.',
    );
    expect(screen.getByText('등록된 분류가 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('선택 가능한 기안양식이 없습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('선택 가능한 사용자가 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('filters the selectable forms by active category and available body', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category, anotherCategory],
      cycleItems: [],
      users: [composerUser],
    });
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 분류 양식',
        categoryItemId: 102,
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 79,
        codeName: '사용 중지 양식',
        useAt: 'N',
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 80,
        codeName: '본문 미등록 양식',
        hasDocument: false,
      },
    ]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '구분' }));
    fireEvent.click(await screen.findByRole('option', { name: '업무' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));

    expect(
      await screen.findByRole('option', { name: '정기점검' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '다른 분류 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '사용 중지 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '본문 미등록 양식' }),
    ).not.toBeInTheDocument();
  });

  it('calculates approval slot capacity from the measured content width', () => {
    expect(calculateApprovalSlotCapacity(262)).toBe(3);
    expect(calculateApprovalSlotCapacity(654)).toBe(7);
    expect(calculateApprovalSlotCapacity(940)).toBe(11);
    expect(calculateApprovalSlotCapacity(0)).toBe(1);
  });

  it('fills subdued empty approval slots and updates them when the observed width changes', async () => {
    const approvalObservers = installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const grid = screen.getByTestId('document-approval-grid');
      const slots = () => Array.from(grid.children) as HTMLElement[];
      expect(grid).toHaveAttribute('data-slot-capacity', '3');
      expect(slots()).toHaveLength(3);
      slots().forEach((slot) => {
        const seal = within(slot).getByLabelText('결재 도장 자리');
        expect(seal).toHaveStyle({
          borderStyle: 'dashed',
          borderColor: muiTheme.palette.divider,
          color: muiTheme.palette.text.disabled,
        });
        expect(slot.textContent).toBe('도장');
        expect(slot.querySelector('[aria-label*="순번"]')).toBeNull();
        expect(slot.querySelector('button')).toBeNull();
      });

      expect(approvalObservers.length).toBeGreaterThan(0);
      const gridObserver = approvalObservers.find((observer) =>
        observer.isObserving(grid),
      );
      expect(gridObserver).toBeDefined();
      act(() => gridObserver!.resize(654));
      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '7');
        expect(slots()).toHaveLength(7);
      });
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('retains and wraps the fourth approval in a three-column grid', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        composerUser,
        anotherComposerUser,
        thirdComposerUser,
        fourthComposerUser,
      ],
    });
    installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const picker = screen.getByRole('combobox', {
        name: '결재선 1 사용자 선택',
      });
      const names = ['홍길동', '김민수', '박서준', '이수진'];
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

      const grid = screen.getByTestId('document-approval-grid');
      const approvalPeople = within(grid).getAllByTestId(
        'document-approval-person',
      );
      expect(grid).toHaveAttribute('data-slot-capacity', '3');
      expect(grid).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))',
      });
      expect(grid.children).toHaveLength(4);
      expect(
        approvalPeople.map((person) => person.getAttribute('aria-label')),
      ).toEqual(names.map((name, index) => `결재 ${index + 1} ${name}`));
      expect(grid.lastElementChild).toBe(approvalPeople[3]);
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('hides the empty agreement row while preserving the remaining row order', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalInputRow = screen.getByTestId('document-approval-input-row');
    const approvalDisplayRow = screen.getByTestId(
      'document-approval-display-row',
    );
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    const referenceRow = screen.getByTestId('document-reference-row');
    expect(within(approvalInputRow).getByText('결재선')).toBeInTheDocument();
    expect(within(approvalDisplayRow).getByText('결재')).toBeInTheDocument();
    expect(within(referenceRow).getByText('참조')).toBeInTheDocument();
    expect(
      approvalInputRow.compareDocumentPosition(approvalDisplayRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      approvalDisplayRow.compareDocumentPosition(referenceRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      within(approvalInputRow).getByRole('combobox', {
        name: '결재선 1 사용자 선택',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalInputRow).getByRole('button', { name: '결재 추가' }),
    ).toBeDisabled();
    expect(
      within(approvalInputRow).getByRole('button', { name: '합의 추가' }),
    ).toBeDisabled();
    expect(approvalDisplayRow).not.toHaveTextContent('홍길동');
    expect(
      within(referenceRow).getByRole('combobox', { name: '참조자 선택' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const titleSurface = dialog.querySelector('.MuiDialogTitle-root')
      ?.parentElement?.parentElement;
    const contentSurface = dialog.querySelector('.MuiDialogContent-root');
    const footerSurface = dialog.querySelector('.MuiDialogActions-root');
    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(titleSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(contentSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(footerSurface!).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
  });

  it('renders an approval participant in a table column with position, seal, sequence, and name', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const participant = screen.getByTestId('document-approval-person');
    expect(participant).toHaveTextContent('대리');
    expect(participant).toHaveTextContent('1');
    expect(participant).toHaveTextContent('홍길동');
    expect(participant).not.toHaveTextContent('기획팀');
    expect(participant.querySelector('img')).toBeNull();
    expect(
      within(participant).getByLabelText('결재 도장 자리'),
    ).toBeInTheDocument();
    expect(
      within(participant).getByRole('button', {
        name: '결재 참여자 1 홍길동 삭제',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '결재선 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
    const selectorControl = screen
      .getByRole('combobox', { name: '결재선 2 사용자 선택' })
      .closest('.MuiInputBase-root');
    expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
      display: 'grid',
    });
    expect(selectorControl).toHaveStyle({ height: '40px' });
    expect(screen.getByRole('button', { name: '결재 추가' })).toHaveStyle({
      height: '40px',
    });
    expect(screen.getByRole('button', { name: '합의 추가' })).toHaveStyle({
      height: '40px',
    });
  });

  it('renders compact accessible badges, seals, removal actions, and ellipsized names', async () => {
    const approvalName = '홍길동김철수';
    const agreementName = '김민수박서준';
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        { ...composerUser, userId: 'emp-long-1', userNm: approvalName },
        { ...anotherComposerUser, userId: 'emp-long-2', userNm: agreementName },
      ],
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: approvalName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(approvalName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: agreementName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(agreementName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const approval = screen.getByTestId('document-approval-person');
    const agreement = screen.getByTestId('document-agreement-chip');
    const assertParticipantPresentation = (
      participant: HTMLElement,
      sequence: number,
      fullName: string,
      kind: '결재' | '합의',
    ) => {
      const badge = within(participant).getByText(String(sequence), {
        exact: true,
      });
      expect(badge).toHaveStyle({
        backgroundColor: muiTheme.palette.primary.light,
        borderRadius: '50%',
      });
      expect(badge).toHaveAttribute('aria-label', `참여 순번 ${sequence}`);

      expect(
        within(participant).getByLabelText(`${kind} 도장 자리`),
      ).toBeInTheDocument();
      expect(
        within(participant).getByRole('button', {
          name: `${kind} 참여자 ${sequence} ${fullName} 삭제`,
        }),
      ).toBeInTheDocument();
      const name = within(participant).getByTitle(fullName);
      expect(name).toHaveStyle({
        maxWidth: '3em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      expect(participant.getAttribute('aria-label')).toContain(fullName);
    };

    assertParticipantPresentation(approval, 1, approvalName, '결재');
    assertParticipantPresentation(agreement, 2, agreementName, '합의');
  });

  it('adds selected approval users as ordered individual stages and removes them from candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    expect(
      screen.queryByRole('option', { name: /김민수/ }),
    ).not.toBeInTheDocument();
    expect(
      approvalPicker.closest('.MuiAutocomplete-root'),
    ).toHaveTextContent('김민수');

    fireEvent.change(approvalPicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const participants = screen.getAllByTestId('document-approval-person');
    expect(participants).toHaveLength(2);
    expect(participants[0]).toHaveTextContent('과장');
    expect(participants[0]).toHaveTextContent('1');
    expect(participants[0]).toHaveTextContent('김민수');
    expect(participants[1]).toHaveTextContent('대리');
    expect(participants[1]).toHaveTextContent('2');
    expect(participants[1]).toHaveTextContent('홍길동');
    expect(participants[0]).not.toHaveTextContent('개발팀');
    expect(participants[1]).not.toHaveTextContent('기획팀');
    expect(
      screen.queryByRole('combobox', { name: '결재선 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '결재선 2' }),
    ).not.toBeInTheDocument();
    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    expect(screen.queryByRole('option', { name: /김민수/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /홍길동/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
      display: 'grid',
    });
  });

  it('renders each selected agreement user as a wrapped chip and appends the next selector', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    fireEvent.change(approvalPicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeEnabled();
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(agreementChips).toHaveLength(2);
    expect(agreementChips[0]).toHaveTextContent('1');
    expect(agreementChips[0]).toHaveTextContent('홍길동');
    expect(agreementChips[1]).toHaveTextContent('2');
    expect(agreementChips[1]).toHaveTextContent('김민수');
    agreementChips.forEach((chip) => {
      expect(chip.querySelector('img')).toBeNull();
      expect(chip).not.toHaveTextContent('합의');
      expect(within(chip).getByLabelText('합의 도장 자리')).toBeInTheDocument();
    });
    expect(
      within(agreementChips[0]).getByRole('button', {
        name: '합의 참여자 1 홍길동 삭제',
      }),
    ).toBeInTheDocument();
    const approvalRow = screen.getByTestId('document-approval-display-row');
    const agreementRow = screen.getByTestId('document-agreement-display-row');
    const referenceRow = screen.getByTestId('document-reference-row');
    expect(
      approvalRow.compareDocumentPosition(agreementRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      agreementRow.compareDocumentPosition(referenceRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(screen.getByTestId('document-agreement-list')).toHaveStyle({
      display: 'flex',
      flexWrap: 'wrap',
    });
    expect(
      screen.getByRole('combobox', { name: '결재선 3 사용자 선택' }),
    ).toBeInTheDocument();
  });

  it('removes only the selected agreement user and returns that user to candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));
    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 1 홍길동 삭제' }),
    );

    expect(screen.getAllByTestId('document-agreement-chip')).toHaveLength(1);
    expect(screen.getByTestId('document-agreement-chip')).toHaveTextContent(
      '김민수',
    );
    expect(
      screen.getByRole('button', { name: '합의 참여자 1 김민수 삭제' }),
    ).toBeInTheDocument();
    const activeApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(activeApprovalPicker);
    expect(
      await screen.findByRole('option', { name: /홍길동/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /김민수/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 1 김민수 삭제' }),
    );
    expect(screen.queryAllByTestId('document-agreement-chip')).toHaveLength(0);
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 1 사용자 선택' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: '결재선 1 사용자 선택' }));
    expect(
      await screen.findByRole('option', { name: /김민수/ }),
    ).toBeInTheDocument();
  });

  it('keeps global participant sequence across approval and agreement and renumbers after removal', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        composerUser,
        anotherComposerUser,
        thirdComposerUser,
        fourthComposerUser,
      ],
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const addUsers = async (
      selectorNumber: number,
      names: string[],
      actionLabel: '결재 추가' | '합의 추가',
    ) => {
      const picker = screen.getByRole('combobox', {
        name: `결재선 ${selectorNumber} 사용자 선택`,
      });
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }));
      }
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    };

    await addUsers(1, ['홍길동'], '결재 추가');
    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(4, ['이수진'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople).toHaveLength(2);
    expect(approvalPeople[0]).toHaveTextContent('1');
    expect(approvalPeople[0]).toHaveTextContent('홍길동');
    expect(approvalPeople[1]).toHaveTextContent('4');
    expect(approvalPeople[1]).toHaveTextContent('이수진');
    expect(agreementChips).toHaveLength(2);
    expect(agreementChips[0]).toHaveTextContent('2');
    expect(agreementChips[0]).toHaveTextContent('김민수');
    expect(agreementChips[1]).toHaveTextContent('3');
    expect(agreementChips[1]).toHaveTextContent('박서준');

    fireEvent.click(
      within(approvalPeople[0]).getByRole('button', {
        name: '결재 참여자 1 홍길동 삭제',
      }),
    );

    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    expect(screen.getByTestId('document-approval-person')).toHaveTextContent(
      '3',
    );
    const renumberedChips = screen.getAllByTestId('document-agreement-chip');
    expect(renumberedChips[0]).toHaveTextContent('1');
    expect(renumberedChips[1]).toHaveTextContent('2');
    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 4 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    expect(
      await screen.findByRole('option', { name: /홍길동/ }),
    ).toBeInTheDocument();
    for (const remainingApprover of ['김민수', '박서준', '이수진']) {
      expect(
        screen.queryByRole('option', {
          name: new RegExp(remainingApprover),
        }),
      ).not.toBeInTheDocument();
    }
  });

  it('keeps the empty approval selector without an unavailable-user message', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    for (const userName of ['홍길동', '김민수', '박서준']) {
      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 1 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: userName } });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(userName) }),
      );
    }
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    expect(
      screen.getByRole('combobox', { name: '결재선 4 사용자 선택' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('선택 가능한 사용자가 없습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
  });

  it('keeps reference users separate from approval stages', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    fireEvent.change(referencePicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));

    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '홍길동',
    );
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '김민수',
    );
    expect(
      screen.queryByRole('option', { name: /홍길동/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('document-approval-person'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('참조 도장 자리')).toBeNull();
  });

  it('shows a visible error when selected template content cannot be loaded', async () => {
    composerApi.fetchDraftFormTemplate.mockRejectedValue(
      new Error('양식 본문 조회 실패'),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    expect(await screen.findByText('양식 본문 조회 실패')).toBeInTheDocument();
  });

  it('keeps the editor read-only while a selected template is loading', async () => {
    let resolveTemplate:
      | ((template: typeof draftFormTemplate) => void)
      | undefined;
    composerApi.fetchDraftFormTemplate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTemplate = resolve;
        }),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() =>
      expect(editor).toHaveAttribute('contenteditable', 'false'),
    );
    expect(
      screen.getByText('기안양식 본문을 불러오는 중입니다.'),
    ).toBeInTheDocument();

    await act(async () => {
      resolveTemplate?.(draftFormTemplate);
    });

    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));
    expect(editor).toHaveAttribute('contenteditable', 'true');
  });

  it('preserves the prior category and body when a dirty category change is cancelled', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category, anotherCategory],
      cycleItems: [],
      users: [composerUser, anotherComposerUser],
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));
    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '구분' }));
    fireEvent.click(await screen.findByRole('option', { name: '프로젝트' }));
    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '작성 중인 본문 교체' }),
    );

    expect(screen.getByRole('combobox', { name: '구분' })).toHaveTextContent(
      '전체',
    );
    expect(screen.getByRole('combobox', { name: '기안양식' })).toHaveTextContent(
      '정기점검',
    );
    expect(editor).toHaveTextContent('작성자 수정 본문');
  });

  it('confirms replacing an edited template and preserves content when cancelled', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));

    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));
    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '취소' }));

    expect(formSelector).toHaveTextContent('정기점검');
    expect(editor).toHaveTextContent('작성자 수정 본문');
    expect(composerApi.fetchDraftFormTemplate).toHaveBeenCalledTimes(1);
  });

  it('replaces the edited body after confirming a different template', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));

    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '교체' }));

    await waitFor(() => expect(editor).toHaveTextContent('새 양식 본문'));
    expect(formSelector).toHaveTextContent('다른 양식');
  });

  it('clears the compose title when the dialog closes and reopens', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 1 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '홍길동' } });
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
      { key: 'Escape' },
    );
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '작성 중 제목' },
    });
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '작성 중 제목',
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('');
    expect(
      screen.queryByTestId('document-approval-person'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(
      screen
        .getByRole('combobox', { name: '참조자 선택' })
        .closest('.MuiAutocomplete-root'),
    ).not.toHaveTextContent(/홍길동|김민수/);
  }, 10000);
});
