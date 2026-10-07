import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { UserSelectEditor } from '../src/shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../src/shared/components/f1-grid/types/grid.types';

const options: F1GridUserOption[] = [
  { value: 'user-1', label: 'User 1', departmentName: 'Planning' },
  { value: 'user-2', label: 'User 2', departmentName: 'Engineering' },
  { value: 'user-3', label: 'User 3', departmentName: 'Finance' },
];

describe('UserSelectEditor', () => {
  it('hides selected options while keeping selected chips visible when opted in', () => {
    const { container } = render(
      <UserSelectEditor
        value={['user-1']}
        options={options}
        multiple
        label="Users"
        hideSelectedOptions
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Users' }));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByRole('option', { name: /User 1/ })).toBeNull();
    expect(
      within(listbox).getByRole('option', { name: /User 2/ }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.MuiChip-label'),
    ).toHaveTextContent('User 1');
  });

  it('preserves selected value order in chips when opted in', () => {
    const { container } = render(
      <UserSelectEditor
        value={['user-2', 'user-1']}
        options={options}
        multiple
        label="Users"
        preserveSelectionOrder
        onChange={vi.fn()}
      />,
    );

    const chipLabels = Array.from(
      container.querySelectorAll('.MuiChip-label'),
      (chip) => chip.textContent,
    );

    expect(chipLabels).toEqual(['User 2', 'User 1']);
  });

  it('does not expose chip removal in read-only mode', () => {
    const { container } = render(
      <UserSelectEditor
        value={['user-1']}
        options={options}
        multiple
        label="Users"
        readOnly
        onChange={vi.fn()}
      />,
    );

    const chip = container.querySelector('.MuiChip-root');
    expect(chip?.querySelector('.MuiChip-deleteIcon')).toBeNull();
    expect(
      screen.getByRole('combobox', { name: 'Users' }),
    ).toHaveProperty('readOnly', true);
  });

  it('keeps selected candidates visible by default', () => {
    const onChange = vi.fn();
    const { container } = render(
      <UserSelectEditor
        value={['user-1']}
        options={options}
        multiple
        label="Users"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Users' }));

    expect(
      within(screen.getByRole('listbox')).getByRole('option', {
        name: /User 1/,
      }),
    ).toBeInTheDocument();

    const deleteIcon = container.querySelector<HTMLElement>(
      '.MuiChip-deleteIcon',
    );
    expect(deleteIcon).not.toBeNull();
    fireEvent.click(deleteIcon!);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
