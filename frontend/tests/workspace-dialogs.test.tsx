import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 서식 에디터는 jsdom에서 불안정하므로 대체 구현을 쓴다. 실제 에디터는 브라우저 검증에서 확인한다.
vi.mock('../src/shared/components/rich-text-editor/RichTextEditor', async () => {
  const React = await import('react');
  return {
    RichTextEditor: ({ onEditorReady, onContentChange, ariaLabel }: Record<string, any>) => {
      const [value, setValue] = React.useState('');
      const holder = React.useMemo(() => ({ value: '' }), []);
      const api = {
        getHTML: () => (holder.value ? `<p>${holder.value}</p>` : '<p></p>'),
        get isEmpty() {
          return holder.value === '';
        },
        commands: {},
      };
      React.useEffect(() => {
        onEditorReady?.(api);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <textarea
          aria-label={ariaLabel ?? '본문'}
          value={value}
          onChange={(event) => {
            holder.value = event.target.value;
            setValue(event.target.value);
            onContentChange?.(api);
          }}
        />
      );
    },
    RichTextEditorToolbar: () => null,
  };
});
import { PermissionGroupTable } from '../src/pages/groupware/community/workspace/components/PermissionGroupTable';
import { PostComposerDialog } from '../src/pages/groupware/community/workspace/components/PostComposerDialog';
import { RoomList } from '../src/pages/groupware/community/workspace/components/RoomList';
import { RoomSettingsDialog } from '../src/pages/groupware/community/workspace/components/RoomSettingsDialog';
import {
  SAMPLE_USERS,
  createSampleStore,
} from '../src/pages/groupware/community/workspace/data/workspaceSamples';

const store = createSampleStore();
const salesRoom = store.rooms[0];
const designRoom = store.rooms[1];

describe('PostComposerDialog', () => {
  const renderComposer = (room = salesRoom) => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PostComposerDialog open room={room} onClose={onClose} onSubmit={onSubmit} />);
    return { onClose, onSubmit };
  };

  it('keeps the submit button disabled until a title is entered', () => {
    renderComposer();
    expect((screen.getByRole('button', { name: '등록' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 요청' } });
    expect((screen.getByRole('button', { name: '등록' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('submits the rich text body as html with the first column selected by default', async () => {
    const { onSubmit } = renderComposer();
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 요청' } });
    fireEvent.change(screen.getByLabelText('글 내용'), { target: { value: '본문입니다' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: '새 요청',
        body: '<p>본문입니다</p>',
        columnId: 'col-request',
        attachments: [],
      }),
    );
  });

  it('submits an empty body as an empty string', async () => {
    const { onSubmit } = renderComposer();
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '제목만' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].body).toBe('');
  });

  it('lists picked files with the shared attachment list, lets the user remove one and stores small files', async () => {
    const { onSubmit } = renderComposer();
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '파일 첨부' } });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const keep = new File(['hello'], 'keep.txt', { type: 'text/plain' });
    const drop = new File(['bye'], 'drop.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [keep, drop] } });
    const list = await screen.findByTestId('workspace-composer-attachments');
    expect(within(list).getByText('keep.txt')).toBeTruthy();
    fireEvent.click(within(list).getAllByRole('button', { name: '첨부 파일 삭제' })[1]);
    expect(within(list).queryByText('drop.txt')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [{ attachments }] = onSubmit.mock.calls[0];
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({ name: 'keep.txt', size: 5, type: 'text/plain' });
    expect(attachments[0].dataUrl.startsWith('data:')).toBe(true);
  });

  it('asks for confirmation before discarding typed content', async () => {
    const { onClose } = renderComposer();
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '작성 중' } });
    fireEvent.click(screen.getAllByRole('button', { name: '닫기' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: '계속 작성' }));
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: '계속 작성' })).toBeNull());
    // jsdom은 전환 종료 이벤트가 없어 작성창이 aria-hidden으로 남으므로 hidden 포함해 작성창의 닫기 버튼을 잡는다.
    fireEvent.click(screen.getAllByRole('button', { name: '닫기', hidden: true })[0]);
    fireEvent.click(await screen.findByRole('button', { name: '버리고 닫기' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows the server message when submitting fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('저장 권한이 없습니다.'));
    render(<PostComposerDialog open room={salesRoom} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 요청' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    expect((await screen.findByRole('alert')).textContent).toContain('저장 권한이 없습니다.');
  });
});

describe('RoomList', () => {
  it('selects a room and offers creation only when allowed', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const { rerender } = render(
      <RoomList rooms={store.rooms} selectedRoomId="room-sales" onSelect={onSelect} onCreate={onCreate} canCreate />,
    );
    fireEvent.click(screen.getByRole('button', { name: '설계도면 공유' }));
    expect(onSelect).toHaveBeenCalledWith('room-design');
    fireEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    expect(onCreate).toHaveBeenCalled();
    rerender(
      <RoomList rooms={store.rooms} selectedRoomId="room-sales" onSelect={onSelect} onCreate={onCreate} canCreate={false} />,
    );
    expect(screen.queryByRole('button', { name: '방 만들기' })).toBeNull();
  });
});

describe('PermissionGroupTable', () => {
  it('adds a group with read level and removes a group', () => {
    const onChange = vi.fn();
    render(<PermissionGroupTable groups={salesRoom.groups} users={SAMPLE_USERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '그룹 추가' }));
    const added = onChange.mock.calls[0][0] as typeof salesRoom.groups;
    expect(added).toHaveLength(salesRoom.groups.length + 1);
    expect(added[added.length - 1]).toMatchObject({ level: 'read', members: [] });
    fireEvent.click(screen.getAllByRole('button', { name: '그룹 삭제' })[2]);
    expect((onChange.mock.calls[1][0] as typeof salesRoom.groups).map((group) => group.id)).toEqual([
      'g-sales-admin',
      'g-sales-team',
    ]);
  });

  it('changes the level of a group', () => {
    const onChange = vi.fn();
    render(<PermissionGroupTable groups={salesRoom.groups} users={SAMPLE_USERS} onChange={onChange} />);
    fireEvent.change(screen.getAllByLabelText('권한 수준')[2], { target: { value: 'write' } });
    expect((onChange.mock.calls[0][0] as typeof salesRoom.groups)[2].level).toBe('write');
  });
});

describe('RoomSettingsDialog', () => {
  const renderSettings = (onSave = vi.fn().mockResolvedValue(undefined), room = salesRoom) => {
    const onClose = vi.fn();
    render(
      <RoomSettingsDialog open room={room} users={SAMPLE_USERS} currentUserId="u1" onClose={onClose} onSave={onSave} />,
    );
    return { onSave, onClose };
  };

  it('saves the edited room name', async () => {
    const { onSave } = renderSettings();
    fireEvent.change(screen.getByLabelText('방 이름'), { target: { value: '영업 2팀' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: 'room-sales', name: '영업 2팀' });
  });

  it('shows the service message in an alert when saving is rejected', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('방 설정 권한 그룹은 최소 1개 필요합니다.'));
    renderSettings(onSave);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain('방 설정 권한 그룹은 최소 1개 필요합니다.');
  });

  it('lets the admin pick list or attachment view as the default view', async () => {
    const { onSave } = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: '리스트' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].defaultView).toBe('list');
    expect(screen.getByRole('button', { name: '첨부' })).toBeTruthy();
  });

  it('lets the admin pick a color per column with the palette and clear it again', async () => {
    const colored = { ...salesRoom, columns: salesRoom.columns.map((column, index) => (index === 1 ? { ...column, color: '#22c55e' } : column)) };
    const { onSave } = renderSettings(undefined, colored);
    fireEvent.click(screen.getByRole('button', { name: '컬럼 1 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #ef4444' }));
    fireEvent.click(screen.getByRole('button', { name: '컬럼 2 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '기본 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const columns = onSave.mock.calls[0][0].columns;
    expect(columns[0].color).toBe('#ef4444');
    expect(columns[1].color).toBeUndefined();
  });

  it('blocks saving without a room name', () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText('방 이름'), { target: { value: '  ' } });
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('adds a column and forces the feed view when all columns are removed', async () => {
    const { onSave } = renderSettings(undefined, designRoom);
    expect((screen.getByRole('button', { name: '칸반' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '컬럼 추가' }));
    expect((screen.getByRole('button', { name: '칸반' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '컬럼 1 삭제' }));
    expect((screen.getByRole('button', { name: '칸반' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].defaultView).toBe('feed');
  });

  it('creates a new room whose first admin group contains the current user', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RoomSettingsDialog open room={null} users={SAMPLE_USERS} currentUserId="u3" onClose={vi.fn()} onSave={onSave} />,
    );
    fireEvent.change(screen.getByLabelText('방 이름'), { target: { value: '새 협업방' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('새 협업방');
    expect(saved.groups[0]).toMatchObject({ level: 'admin', members: [{ kind: 'user', userId: 'u3' }] });
  });
});
