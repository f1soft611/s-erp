import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { DocumentApprovalSettingsDialog } from '../src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog';
import type { DocumentApprovalStage } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import type { F1GridUserOption } from '../src/shared/components/f1-grid/types/grid.types';

const users: F1GridUserOption[] = [
  { value: 'drafter', label: '기안자' },
  { value: 'approver', label: '결재자' },
  { value: 'agreement-1', label: '합의자 1' },
  { value: 'agreement-2', label: '합의자 2' },
  { value: 'reference-1', label: '참조자 1' },
  { value: 'approver-2', label: '새 결재자' },
  { value: 'reference-2', label: '새 참조자' },
];

const approvalStages: DocumentApprovalStage[] = [
  {
    id: 1,
    kind: 'approval',
    users: [users[0]],
    isFixed: true,
  },
  {
    id: 2,
    kind: 'approval',
    users: [users[1]],
  },
  {
    id: 3,
    kind: 'agreement',
    users: [users[2], users[3]],
  },
];

function renderSettings(
  overrides: Partial<{
    approvalStages: DocumentApprovalStage[];
    referenceUserIds: string[];
    onClose: () => void;
    onApply: (
      stages: DocumentApprovalStage[],
      referenceIds: string[],
    ) => void;
  }> = {},
) {
  const onClose = overrides.onClose ?? vi.fn();
  const onApply = overrides.onApply ?? vi.fn();
  render(
    <DocumentApprovalSettingsDialog
      open
      userOptions={users}
      approvalStages={overrides.approvalStages ?? approvalStages}
      referenceUserIds={overrides.referenceUserIds ?? ['reference-1']}
      onClose={onClose}
      onApply={onApply}
    />,
  );
  return { onClose, onApply };
}

function createDataTransfer() {
  const payload = new Map<string, string>();
  return {
    effectAllowed: 'none' as DataTransfer['effectAllowed'],
    setData: (type: string, value: string) => payload.set(type, value),
    getData: (type: string) => payload.get(type) ?? '',
  } as DataTransfer;
}

function dragOverAt(target: HTMLElement, clientY: number) {
  const event = createEvent.dragOver(target, {
    dataTransfer: createDataTransfer(),
  });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(target, event);
}

describe('DocumentApprovalSettingsDialog', () => {
  it('loads the current approval line and references while keeping the drafter fixed', () => {
    renderSettings();

    expect(
      screen.getByRole('dialog', { name: '결재선 설정' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '결재 1 기안자' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '결재 2 결재자' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '결재 1 위로 이동' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: '결재 1 아래로 이동' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: '자주 쓰는 결재선 저장' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '자주 쓰는 결재선 불러오기' }),
    ).toBeDisabled();
    expect(screen.getByText('저장 테이블/API 준비 후 제공')).toBeVisible();
  });

  it('applies a reordered agreement stage as one unit without mutating source state', () => {
    const { onApply } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '결재 2 아래로 이동' }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [stages, references] = vi.mocked(onApply).mock.calls[0];
    expect(stages.map((stage) => stage.id)).toEqual([1, 3, 2]);
    expect(stages[1].users).toEqual([users[2], users[3]]);
    expect(references).toEqual(['reference-1']);
    expect(stages).not.toBe(approvalStages);
    expect(stages[0]).not.toBe(approvalStages[0]);
    expect(stages[0].users).not.toBe(approvalStages[0].users);
  });

  it('reorders a stage when it is dropped onto another stage', () => {
    const { onApply } = renderSettings();
    const dataTransfer = createDataTransfer();
    const target = screen.getByRole('group', {
      name: '합의 3 합의자 1, 합의자 2',
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 160,
      height: 60,
    } as DOMRect);
    fireEvent.dragStart(
      screen.getByRole('button', { name: '드래그하여 결재 2 이동' }),
      { dataTransfer },
    );
    dragOverAt(target, 150);
    fireEvent.drop(target, { clientY: 150, dataTransfer });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    const [stages] = vi.mocked(onApply).mock.calls[0];
    expect(stages.map((stage) => stage.id)).toEqual([1, 3, 2]);
  });

  it('starts dragging only from the stage handle and marks the dragged stage', () => {
    renderSettings();
    const stage = screen.getByRole('group', { name: '결재 2 결재자' });
    const handle = screen.getByRole('button', {
      name: '드래그하여 결재 2 이동',
    });

    expect(stage).not.toHaveAttribute('draggable');
    expect(handle).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(stage, { dataTransfer: createDataTransfer() });
    expect(stage).not.toHaveAttribute('data-dragging');

    fireEvent.dragStart(handle, { dataTransfer: createDataTransfer() });

    expect(stage).toHaveAttribute('data-dragging', 'true');
  });

  it.each([
    ['before', 110, [1, 3, 2, 4]],
    ['after', 150, [1, 3, 4, 2]],
  ] as const)(
    'shows the %s insertion marker and inserts the stage at that position',
    (position, clientY, expectedIds) => {
      const { onApply } = renderSettings({
        approvalStages: [
          ...approvalStages,
          {
            id: 4,
            kind: 'approval',
            users: [users[5]],
          },
        ],
      });
      const dataTransfer = createDataTransfer();
      const target = screen.getByRole('group', {
        name: '결재 4 새 결재자',
      });
      const bounds = {
        top: 100,
        bottom: 160,
        height: 60,
      } as DOMRect;
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(bounds);
      expect(target.getBoundingClientRect()).toBe(bounds);
      fireEvent.dragStart(
        screen.getByRole('button', { name: '드래그하여 결재 2 이동' }),
        { dataTransfer },
      );
      dragOverAt(target, clientY);

      expect(target).toHaveAttribute('data-drop-position', position);

      fireEvent.drop(target, { clientY, dataTransfer });
      fireEvent.click(screen.getByRole('button', { name: '적용' }));

      const [stages] = vi.mocked(onApply).mock.calls[0];
      expect(stages.map((stage) => stage.id)).toEqual(expectedIds);
    },
  );

  it('clears dragged and insertion feedback after drag end and drop', () => {
    renderSettings({
      approvalStages: [
        ...approvalStages,
        {
          id: 4,
          kind: 'approval',
          users: [users[5]],
        },
      ],
    });
    const source = screen.getByRole('group', { name: '결재 2 결재자' });
    const target = screen.getByRole('group', {
      name: '결재 4 새 결재자',
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 160,
      height: 60,
    } as DOMRect);
    const handle = screen.getByRole('button', {
      name: '드래그하여 결재 2 이동',
    });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(handle, { dataTransfer });
    dragOverAt(target, 110);
    fireEvent.dragEnd(handle);

    expect(source).not.toHaveAttribute('data-dragging');
    expect(target).not.toHaveAttribute('data-drop-position');

    fireEvent.dragStart(handle, { dataTransfer });
    dragOverAt(target, 150);
    fireEvent.drop(target, { clientY: 150, dataTransfer });

    expect(
      screen.getByTestId('document-approval-settings-stage-2'),
    ).not.toHaveAttribute('data-dragging');
    expect(
      screen.getByTestId('document-approval-settings-stage-4'),
    ).not.toHaveAttribute('data-drop-position');
  });

  it('adds individual approval stages and updates references before applying', async () => {
    const { onApply } = renderSettings();
    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 사용자 선택',
    });

    fireEvent.change(approvalPicker, { target: { value: '새 결재자' } });
    fireEvent.click(await screen.findByRole('option', { name: /새 결재자/ }));
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '새 참조자' } });
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자/ }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onApply).toHaveBeenCalledWith(
      [
        ...approvalStages,
        {
          id: 4,
          kind: 'approval',
          users: [users[5]],
        },
      ],
      ['reference-1', 'reference-2'],
    );
  });

  it('discards the temporary edit when cancelled', () => {
    const { onClose, onApply } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
