import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import type { CommonViewMode } from './commonViewTypes';

type ViewModeToggleProps = {
  mode: CommonViewMode;
  onChange: (mode: CommonViewMode) => void;
  ariaLabel?: string;
  enableFileView?: boolean;
  /** 칸반형 보기를 선택 옵션으로 추가한다. 기본은 꺼져 있어 기존 화면은 그대로다. */
  enableKanbanView?: boolean;
};

export function ViewModeToggle({
  mode,
  onChange,
  ariaLabel = '보기 방식',
  enableFileView = false,
  enableKanbanView = false,
}: ViewModeToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      aria-label={ariaLabel}
      onChange={(_, nextMode: CommonViewMode | null) => {
        if (nextMode) {
          onChange(nextMode);
        }
      }}
    >
      {enableKanbanView && (
        <ToggleButton value="kanban" aria-label="칸반형 보기">
          <ViewKanbanOutlinedIcon fontSize="small" />
        </ToggleButton>
      )}
      <ToggleButton value="feed" aria-label="피드형 보기">
        <ViewStreamOutlinedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="list" aria-label="리스트형 보기">
        <ViewListOutlinedIcon fontSize="small" />
      </ToggleButton>
      {enableFileView && (
        <ToggleButton value="file" aria-label="파일형 보기">
          <FolderOutlinedIcon fontSize="small" />
        </ToggleButton>
      )}
    </ToggleButtonGroup>
  );
}
