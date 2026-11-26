import {
  composerApi,
  muiTheme,
  category,
  anotherCategory,
  composerUser,
  anotherComposerUser,
  thirdComposerUser,
  fourthComposerUser,
  fifthComposerUser,
  draftFormTemplate,
  pageProps,
  waitForComposerReady,
  installApprovalResizeObserverMock,
} from './documentWritePage.harness';
import { act, fireEvent, render, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { DocumentComposerDialog } from '../../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import { calculateApprovalSlotCapacity } from '../../src/pages/groupware/documents/write/components/DocumentApprovalFields';

describe('Document write page', () => {
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
      const rendered = render(<DocumentComposerDialog open onClose={vi.fn()} />);
      unmount = rendered.unmount;

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
    const referenceControl = screen
      .getByRole('combobox', { name: '참조자 선택' })
      .closest('.MuiInputBase-root');
    expect(screen.getByTestId('document-approval-grid')).toHaveStyle({
      display: 'grid',
    });
    expect(selectorControl).toHaveStyle({ height: '40px' });
    expect(referenceControl).toHaveStyle({ height: '40px' });
    expect(screen.getByRole('button', { name: '결재 추가' })).toHaveStyle({
      height: '40px',
    });
    expect(screen.getByRole('button', { name: '합의 추가' })).toHaveStyle({
      height: '40px',
    });
  });

  it('wraps approval actions when the composer has a narrow viewport', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalActions = screen
      .getByRole('button', { name: '결재 추가' })
      .parentElement;
    expect(approvalActions).toHaveStyle({ flexWrap: 'wrap' });
  });

  it('adds selected approval users as ordered individual stages and removes them from candidates', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
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
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
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
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
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
    const agreementSequenceBadge = within(agreementChips[0]).getByLabelText(
      '참여 순번 2',
    );
    expect(agreementSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
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
  }, 15000);

  it('keeps reference users separate from approval stages', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
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

    const error = await screen.findByText('양식 본문 조회 실패');
    expect(error).toBeInTheDocument();
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(screen.getByTestId('document-composer-layout').firstElementChild)
      .toHaveClass('MuiAlert-colorError');
    expect(
      screen.queryByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).not.toBeInTheDocument();
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
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '로딩 중 보존할 제목' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    expect(
      screen.getByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '본문' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: '제목' })).toBeNull();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '툴바 열기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    await act(async () => {
      resolveTemplate?.(draftFormTemplate);
    });

    const editor = await screen.findByRole('textbox', { name: '본문' });
    expect(
      screen.queryByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '로딩 중 보존할 제목',
    );
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
    const editor = await screen.findByRole('textbox', { name: '본문' });
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
});
