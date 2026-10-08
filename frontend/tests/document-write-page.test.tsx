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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../src/theme/theme';

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

const fifthComposerUser = {
  userId: 'emp-5',
  loginId: 5,
  userNm: '최민호',
  departmentNm: '영업팀',
  profileImage: '/users/emp-5.png',
  levelNm: '차장',
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
    users: [
      composerUser,
      anotherComposerUser,
      thirdComposerUser,
      fourthComposerUser,
      fifthComposerUser,
    ],
  });
  composerApi.fetchDraftForms.mockResolvedValue([draftForm]);
  composerApi.fetchDraftFormTemplate.mockResolvedValue(draftFormTemplate);
  composerApi.fetchMyProfile.mockResolvedValue({
    userId: composerUser.userId,
    employeeId: composerUser.userId,
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

function getPickerListbox(picker: HTMLElement): HTMLElement {
  const listboxId = picker.getAttribute('aria-controls');
  const listbox = listboxId ? document.getElementById(listboxId) : null;
  if (!listbox) throw new Error('User picker listbox is not open.');
  return listbox;
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
  it('does not emit an SSR-unsafe first-child selector warning', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    try {
      render(<DashboardContent {...pageProps} />);

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const consoleCalls = [...errorSpy.mock.calls, ...warnSpy.mock.calls];
      expect(
        consoleCalls.some((call) =>
          call.some((argument) =>
            String(argument).includes(
              'pseudo class ":first-child" is potentially unsafe',
            ),
          ),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 15000);

  it('adds the signed-in user as a non-removable first approver', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 홍길동');
    const approverName = within(firstApprover).getByText('홍길동');
    expect(approverName).not.toHaveStyle({ maxWidth: '3em' });
    expect(approverName.parentElement).toHaveStyle({
      gridTemplateColumns: '20px minmax(0, 1fr)',
    });
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
  });

  it('uses profile details as the fixed first approver when absent from selectable users', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [anotherComposerUser, thirdComposerUser],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'emp-profile-only',
      employeeId: 'emp-profile-only',
      name: '기안자',
      departmentName: '기획팀',
      levelName: '팀장',
      profileImage: '/users/profile-only.png',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    const firstApprover = await screen.findByRole('group', {
      name: '결재 1 기안자',
    });
    expect(firstApprover).toHaveTextContent('팀장');
    expect(firstApprover).toHaveTextContent('기안자');
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('로그인 사용자를 결재선 사용자 목록에서 찾을 수 없습니다.'),
    ).not.toBeInTheDocument();
  }, 15000);

  it('uses employee identity to exclude the drafter while retaining same-name users', async () => {
    const sameNameUser = {
      ...composerUser,
      userId: 'emp-same-name',
      departmentNm: '회계팀',
      userNm: '기안자',
    };
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        {
          ...composerUser,
          userId: ` ${composerUser.userId} `,
          userNm: '기안자',
        },
        sameNameUser,
        anotherComposerUser,
        thirdComposerUser,
      ],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: composerUser.userId,
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 기안자');

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(approvalPicker);
    const approvalListbox = getPickerListbox(approvalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(agreementPicker);
    const agreementListbox = getPickerListbox(agreementPicker);
    expect(
      within(agreementListbox).queryByRole('option', {
        name: /기안자.*기획팀/,
      }),
    ).toBeNull();
    expect(
      within(agreementListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
  }, 15000);

  it('prevents the same user from being assigned to approval and reference', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    const approvalListbox = getPickerListbox(nextApprovalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
  }, 15000);

  it('keeps an actively selected approval user out of reference candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));

    fireEvent.click(screen.getByRole('combobox', { name: '참조자 선택' }));
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    expect(
      within(getPickerListbox(referencePicker)).queryByRole('option', {
        name: /김민수/,
      }),
    ).toBeNull();
  });

  it('shows a complete dashed empty approval and hides the pending agreement seal', async () => {
    installApprovalResizeObserverMock();
    const rendered = render(<DashboardContent {...pageProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const emptySlot = screen.getAllByTestId('document-empty-approval-slot')[0];
      expect(within(emptySlot).getByLabelText('직위/직함 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('직위/직함')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재 도장 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('도장')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재자 이름 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('이름')).not.toBeInTheDocument();
      expect(emptySlot).toHaveStyle({
        borderStyle: 'dashed',
        borderColor: muiTheme.palette.divider,
      });
      expect(emptySlot.querySelector('[aria-label*="순번"]')).toBeNull();
      expect(emptySlot.querySelector('button')).toBeNull();

      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: '김민수' } });
      fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
      fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

      const agreement = screen.getByTestId('document-agreement-chip');
      expect(within(agreement).queryByLabelText('합의 도장 자리')).toBeNull();
      const fields = screen.getByTestId('document-approval-fields');
      const children = Array.from(fields.children);
      const approvalRowIndex = children.indexOf(
        screen.getByTestId('document-approval-display-row'),
      );
      const agreementRowIndex = children.indexOf(
        screen.getByTestId('document-agreement-display-row'),
      );
      expect(
        children
          .slice(approvalRowIndex + 1, agreementRowIndex)
          .some((child) => child.classList.contains('MuiDivider-root')),
      ).toBe(false);
    } finally {
      rendered.unmount();
      vi.unstubAllGlobals();
    }
  });

  it('shares one sequence across an agreement stage without numbering participants individually', async () => {
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
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    };

    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(3, ['이수진'], '결재 추가');
    await addUsers(4, ['최민호'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople.map((person) => person.getAttribute('aria-label'))).toEqual([
      '결재 1 홍길동',
      '결재 3 이수진',
      '결재 4 최민호',
    ]);
    expect(agreementChips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      '합의 2 김민수',
      '합의 2 박서준',
    ]);
  }, 15000);

  it('uses X removal actions for non-fixed approvals and agreement participants', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const removableApproval = screen.getByRole('group', {
      name: '결재 2 김민수',
    });
    const approvalRemoveButton = within(removableApproval).getByRole('button', {
      name: '결재 참여자 2 김민수 삭제',
    });
    const positionRow = within(removableApproval).getByTestId(
      'document-approval-position-row',
    );
    expect(positionRow).toContainElement(approvalRemoveButton);
    expect(
      within(approvalRemoveButton).getByTestId('approval-remove-icon'),
    ).toBeInTheDocument();

    const agreement = screen.getByRole('group', {
      name: '합의 3 박서준',
    });
    const agreementRemoveButton = within(agreement).getByRole('button', {
      name: '합의 참여자 3 박서준 삭제',
    });
    expect(
      within(agreementRemoveButton).getByTestId('agreement-remove-icon'),
    ).toBeInTheDocument();

    const fixedDrafter = screen.getByRole('group', {
      name: '결재 1 홍길동',
    });
    expect(
      within(fixedDrafter).queryByRole('button', { name: /삭제/ }),
    ).toBeNull();
  }, 15000);

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

  it('uses the shared dark surface and theme-aware editor surface', async () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const content = dialog.querySelector('.MuiDialogContent-root');
    const footer = dialog.querySelector('.MuiDialogActions-root');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');

    [dialog, header, content, footer].forEach((region) => {
      expect(getComputedStyle(region as Element).backgroundColor).toBe(
        'rgb(30, 41, 59)',
      );
    });
    const editor = screen.getByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });
    const placeholder = editor.querySelector('p.is-editor-empty');

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(editor).color).toBe('rgb(226, 232, 240)');
    expect(getComputedStyle(title).fontWeight).toBe('700');
    expect(getComputedStyle(editor).fontWeight).toBe('400');
    expect(placeholder).toBeInTheDocument();
  });

  it('keeps the editor surface white in the light theme', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const editor = screen.getByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).color).toBe('rgb(15, 23, 42)');
    expect(getComputedStyle(title).fontWeight).toBe('700');
    expect(getComputedStyle(editor).fontWeight).toBe('400');
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
      minHeight: '200px',
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
    expect(
      screen.getByRole('button', { name: '결재선 설정' }),
    ).toBeDisabled();
  });

  it('shows an error when the profile has no drafter name and explicit empty states', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'writer',
      employeeId: 'writer',
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

  it('shows an error when the profile has no employee identity', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: ' ',
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 사원 ID를 확인할 수 없습니다.',
    );
    expect(screen.queryByTestId('document-approval-person')).toBeNull();
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
    expect(calculateApprovalSlotCapacity(262)).toBe(2);
    expect(calculateApprovalSlotCapacity(654)).toBe(7);
    expect(calculateApprovalSlotCapacity(940)).toBe(10);
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
      const emptySlots = () =>
        within(grid).getAllByTestId('document-empty-approval-slot');
      expect(grid).toHaveAttribute('data-slot-capacity', '2');
      expect(slots()).toHaveLength(2);
      expect(within(grid).getAllByTestId('document-approval-person')).toHaveLength(
        1,
      );
      expect(emptySlots()).toHaveLength(1);
      emptySlots().forEach((slot) => {
        const seal = within(slot).getByLabelText('결재 도장 자리');
        expect(slot).toHaveStyle({
          borderStyle: 'dashed',
          borderColor: muiTheme.palette.divider,
        });
        expect(seal).toHaveStyle({
          color: muiTheme.palette.text.disabled,
        });
        expect(within(slot).getByLabelText('직위/직함 자리')).toBeInTheDocument();
        expect(within(slot).getByLabelText('결재자 이름 자리')).toBeInTheDocument();
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
        expect(emptySlots()).toHaveLength(6);
      });
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('recalculates approval slot capacity after a viewport resize', async () => {
    installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const grid = screen.getByTestId('document-approval-grid');
      expect(grid).toHaveAttribute('data-slot-capacity', '2');
      Object.defineProperty(grid, 'clientWidth', {
        configurable: true,
        value: 654,
      });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '7');
        expect(grid.children).toHaveLength(7);
        expect(within(grid).getAllByTestId('document-empty-approval-slot')).toHaveLength(
          6,
        );
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
        fifthComposerUser,
      ],
    });
    const approvalObservers = installApprovalResizeObserverMock();
    let unmount = () => {};

    try {
      const rendered = render(<DashboardContent {...pageProps} />);
      unmount = rendered.unmount;

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const picker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      const names = ['김민수', '박서준', '이수진', '최민호'];
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

      const grid = screen.getByTestId('document-approval-grid');
      const gridObserver = approvalObservers.find((observer) =>
        observer.isObserving(grid),
      );
      expect(gridObserver).toBeDefined();
      act(() => gridObserver!.resize(272));
      await waitFor(() => {
        expect(grid).toHaveAttribute('data-slot-capacity', '3');
      });

      const approvalPeople = within(grid).getAllByTestId(
        'document-approval-person',
      );
      expect(grid).toHaveAttribute('data-slot-capacity', '3');
      expect(grid).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))',
      });
      expect(grid.children).toHaveLength(5);
      expect(
        approvalPeople.map((person) => person.getAttribute('aria-label')),
      ).toEqual([
        '결재 1 홍길동',
        ...names.map((name, index) => `결재 ${index + 2} ${name}`),
      ]);
      expect(grid.lastElementChild).toBe(approvalPeople[4]);
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
        name: '결재선 2 사용자 선택',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalInputRow).getByRole('button', { name: '결재 추가' }),
    ).toBeDisabled();
    expect(
      within(approvalInputRow).getByRole('button', { name: '합의 추가' }),
    ).toBeDisabled(    );
    expect(approvalDisplayRow).toHaveTextContent('홍길동');
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
      within(participant).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }))
      .toBeInTheDocument();
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
    const approvalName = '홍길동김';
    const agreementName = '김민수';
    const longName = '홍길동김철수';
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        { ...composerUser, userId: 'emp-long-1', userNm: approvalName },
        { ...anotherComposerUser, userId: 'emp-long-2', userNm: agreementName },
        { ...thirdComposerUser, userId: 'emp-long-3', userNm: longName },
      ],
    }, 15000);
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'emp-long-1',
      employeeId: 'emp-long-1',
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: longName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(longName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: agreementName } });
    fireEvent.click(
      await screen.findByRole('option', { name: new RegExp(agreementName) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const approvals = screen.getAllByTestId('document-approval-person');
    const approval = approvals[0];
    const longApproval = approvals[1];
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

      if (kind === '결재') {
        expect(
          within(participant).getByLabelText('결재 도장 자리'),
        ).toBeInTheDocument();
      } else {
        expect(
          within(participant).queryByLabelText('합의 도장 자리'),
        ).toBeNull();
      }
      const removeButton = within(participant).queryByRole('button', {
        name: `${kind} 참여자 ${sequence} ${fullName} 삭제`,
      });
      if (kind === '결재') {
        expect(removeButton).toBeNull();
      } else {
        expect(removeButton).toBeInTheDocument();
      }
      const name = within(participant).getByTitle(fullName);
      expect(name).toHaveStyle({
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      if (kind === '결재') {
        expect(participant).toHaveStyle({ minWidth: '88px' });
        expect(name).not.toHaveStyle({ maxWidth: '3em' });
      } else {
        expect(name).toHaveStyle({ maxWidth: '4em' });
      }
      expect(participant.getAttribute('aria-label')).toContain(fullName);
    };

    assertParticipantPresentation(approval, 1, approvalName, '결재');
    assertParticipantPresentation(agreement, 3, agreementName, '합의');
    const truncatedApprovalName = within(longApproval).getByTitle(longName);
    expect(truncatedApprovalName).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect(longApproval.getAttribute('aria-label')).toBe(
      `결재 2 ${longName}`,
    );
  });

  it('adds selected approval users as ordered individual stages and removes them from candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    expect(
      screen.queryByRole('option', { name: /김민수/ }),
    ).not.toBeInTheDocument();
    expect(
      approvalPicker.closest('.MuiAutocomplete-root'),
    ).toHaveTextContent('김민수');

    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const participants = screen.getAllByTestId('document-approval-person');
    expect(participants).toHaveLength(2);
    expect(participants[0]).toHaveTextContent('대리');
    expect(participants[0]).toHaveTextContent('1');
    expect(participants[0]).toHaveTextContent('홍길동');
    expect(participants[1]).toHaveTextContent('과장');
    expect(participants[1]).toHaveTextContent('2');
    expect(participants[1]).toHaveTextContent('김민수');
    expect(participants[0]).not.toHaveTextContent('기획팀');
    expect(participants[1]).not.toHaveTextContent('개발팀');
    expect(
      screen.queryByRole('combobox', { name: '결재선 2' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '결재선 3' }),
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

  it('applies edited stages and references only after confirming the settings dialog', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.keyDown(agreementPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '최민호' } });
    fireEvent.click(await screen.findByRole('option', { name: /최민호/ }));
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const settingsDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    fireEvent.click(
      within(settingsDialog).getByRole('button', {
        name: '결재 2 아래로 이동',
      }),
    );

    const settingsReferencePicker = within(settingsDialog).getByRole(
      'combobox',
      { name: '참조자 선택' },
    );
    const currentReferenceChip = within(
      settingsReferencePicker.closest('.MuiAutocomplete-root')!,
    ).getByText('최민호');
    const currentReferenceDelete = currentReferenceChip
      .closest('.MuiChip-root')
      ?.querySelector('.MuiChip-deleteIcon');
    if (!currentReferenceDelete) {
      throw new Error('Current reference chip delete action is missing.');
    }
    fireEvent.click(currentReferenceDelete);
    fireEvent.change(settingsReferencePicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /이수진/ }));
    fireEvent.keyDown(settingsReferencePicker, { key: 'Escape' });

    fireEvent.click(
      within(settingsDialog).getByRole('button', { name: '취소' }),
    );
    await waitForElementToBeRemoved(settingsDialog);

    expect(
      screen.getByRole('group', { name: '결재 2 김민수' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen
          .getByRole('combobox', { name: '참조자 선택' })
          .closest('.MuiAutocomplete-root')!,
      ).getByText('최민호'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '결재 3 김민수' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const reopenedDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    fireEvent.click(
      within(reopenedDialog).getByRole('button', {
        name: '결재 2 아래로 이동',
      }),
    );

    const reopenedReferencePicker = within(reopenedDialog).getByRole(
      'combobox',
      { name: '참조자 선택' },
    );
    const reopenedReferenceChip = within(
      reopenedReferencePicker.closest('.MuiAutocomplete-root')!,
    ).getByText('최민호');
    const reopenedReferenceDelete = reopenedReferenceChip
      .closest('.MuiChip-root')
      ?.querySelector('.MuiChip-deleteIcon');
    if (!reopenedReferenceDelete) {
      throw new Error('Reopened reference chip delete action is missing.');
    }
    fireEvent.click(reopenedReferenceDelete);
    fireEvent.change(reopenedReferencePicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /이수진/ }));
    fireEvent.keyDown(reopenedReferencePicker, { key: 'Escape' });
    fireEvent.click(
      within(reopenedDialog).getByRole('button', { name: '적용' }),
    );
    await waitForElementToBeRemoved(reopenedDialog);

    expect(
      screen.getByRole('group', { name: '결재 3 김민수' }),
    ).toBeInTheDocument();
    const appliedReferenceRoot = screen
      .getByRole('combobox', { name: '참조자 선택' })
      .closest('.MuiAutocomplete-root')!;
    expect(within(appliedReferenceRoot).getByText('이수진')).toBeInTheDocument();
    expect(
      within(appliedReferenceRoot).queryByText('최민호'),
    ).not.toBeInTheDocument();

    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 4 사용자 선택',
    });
    fireEvent.change(nextApprovalPicker, { target: { value: '최민호' } });
    fireEvent.click(await screen.findByRole('option', { name: /최민호/ }));
    fireEvent.keyDown(nextApprovalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));
    expect(
      screen.getByRole('group', { name: '결재 4 최민호' }),
    ).toBeInTheDocument();
  }, 15000);

  it('renders each selected agreement user as a wrapped chip and appends the next selector', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '합의 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(agreementChips).toHaveLength(2);
    expect(agreementChips[0]).toHaveTextContent('2');
    expect(agreementChips[0]).toHaveTextContent('김민수');
    expect(agreementChips[1]).toHaveTextContent('2');
    expect(agreementChips[1]).toHaveTextContent('박서준');
    agreementChips.forEach((chip) => {
      expect(chip.querySelector('img')).toBeNull();
      expect(chip).not.toHaveTextContent('합의');
      expect(within(chip).queryByLabelText('합의 도장 자리')).toBeNull();
    });
    expect(
      within(agreementChips[0]).getByRole('button', {
        name: '합의 참여자 2 김민수 삭제',
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
      name: '결재선 2 사용자 선택',
    }, 15000);
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));
    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 2 김민수 삭제' }),
    );

    expect(screen.getAllByTestId('document-agreement-chip')).toHaveLength(1);
    expect(screen.getByTestId('document-agreement-chip')).toHaveTextContent(
      '박서준',
    );
    expect(
      screen.getByRole('button', { name: '합의 참여자 2 박서준 삭제' }),
    ).toBeInTheDocument();
    const activeApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(activeApprovalPicker);
    expect(screen.queryByRole('option', { name: /홍길동/ })).toBeNull();
    expect(
      await screen.findByRole('option', { name: /김민수/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /박서준/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '합의 참여자 2 박서준 삭제' }),
    );
    expect(screen.queryAllByTestId('document-agreement-chip')).toHaveLength(0);
    expect(
      screen.queryByTestId('document-agreement-display-row'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }));
    expect(
      await screen.findByRole('option', { name: /김민수/ }),
    ).toBeInTheDocument();
  }, 15000);

  it('numbers participants by stage and renumbers after a removable stage is deleted', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        composerUser,
        anotherComposerUser,
        thirdComposerUser,
        fourthComposerUser,
        fifthComposerUser,
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

    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(3, ['이수진'], '결재 추가');
    await addUsers(4, ['최민호'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople).toHaveLength(3);
    expect(approvalPeople[0]).toHaveAttribute('aria-label', '결재 1 홍길동');
    expect(approvalPeople[1]).toHaveAttribute('aria-label', '결재 3 이수진');
    expect(approvalPeople[2]).toHaveAttribute('aria-label', '결재 4 최민호');
    expect(agreementChips).toHaveLength(2);
    expect(agreementChips[0]).toHaveAttribute('aria-label', '합의 2 김민수');
    expect(agreementChips[1]).toHaveAttribute('aria-label', '합의 2 박서준');

    fireEvent.click(
      within(approvalPeople[1]).getByRole('button', {
        name: '결재 참여자 3 이수진 삭제',
      }),
    );

    const renumberedApprovals = screen.getAllByTestId('document-approval-person');
    expect(renumberedApprovals).toHaveLength(2);
    expect(renumberedApprovals[0]).toHaveAttribute('aria-label', '결재 1 홍길동');
    expect(renumberedApprovals[1]).toHaveAttribute('aria-label', '결재 3 최민호');
    const renumberedChips = screen.getAllByTestId('document-agreement-chip');
    expect(renumberedChips[0]).toHaveAttribute('aria-label', '합의 2 김민수');
    expect(renumberedChips[1]).toHaveAttribute('aria-label', '합의 2 박서준');
    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 4 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    expect(
      await screen.findByRole('option', { name: /이수진/ }),
    ).toBeInTheDocument();
    for (const remainingApprover of ['홍길동', '김민수', '박서준', '최민호']) {
      expect(
        screen.queryByRole('option', {
          name: new RegExp(remainingApprover),
        }),
      ).not.toBeInTheDocument();
    }
  }, 15000);

  it('keeps the empty approval selector without an unavailable-user message', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    for (const userName of ['김민수', '박서준', '이수진', '최민호']) {
      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: userName } });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(userName) }),
      );
    }
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    expect(
      screen.getByRole('combobox', { name: '결재선 6 사용자 선택' }),
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
    fireEvent.change(referencePicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.change(referencePicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));

    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '김민수',
    );
    expect(referencePicker.closest('.MuiAutocomplete-root')).toHaveTextContent(
      '박서준',
    );
    expect(
      screen.queryByRole('option', { name: /홍길동/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('document-approval-person')).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    fireEvent.click(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    );
    expect(screen.queryByRole('option', { name: /김민수/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /박서준/ })).toBeNull();
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
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: '결재선 3 사용자 선택' }),
      { key: 'Escape' },
    );
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
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
    expect(screen.getByTestId('document-approval-person')).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(
      screen
        .getByRole('combobox', { name: '참조자 선택' })
        .closest('.MuiAutocomplete-root'),
    ).not.toHaveTextContent(/박서준/);
  }, 10000);
});
