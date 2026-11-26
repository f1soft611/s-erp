import { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ProfileAvatar } from '../../../../../shared/components/ProfileAvatar';
import {
  NO_DEPARTMENT_LABEL,
  groupByDepartment,
  splitVisible,
} from '../data/documentReferenceGroups';
import type { DocumentApprovalLine } from '../types/documentWrite.types';

const COLLAPSED_LIMIT = 5;

type DocumentReferenceParticipantsProps = {
  lines: DocumentApprovalLine[];
};

function ReferenceCard({ line }: { line: DocumentApprovalLine }) {
  const departmentLabel =
    line.participantDepartmentName?.trim() || NO_DEPARTMENT_LABEL;
  return (
    <Box
      data-testid={`approval-line-reference-participant-${line.electronicApprovalLineId}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flex: '1 1 240px',
        minWidth: 'min(100%, 190px)',
        maxWidth: '100%',
        height: 56,
        boxSizing: 'border-box',
        px: 1,
        py: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px',
        bgcolor: 'background.paper',
      }}
    >
      <ProfileAvatar
        data-testid={`approval-line-reference-avatar-${line.electronicApprovalLineId}`}
        name={line.participantName}
        imageUrl={line.participantProfileImage}
        fallback={line.participantName.slice(0, 1)}
        sx={{ width: 32, height: 32, flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body1"
          title={line.participantName}
          noWrap
          sx={{ display: 'block', fontSize: 14, lineHeight: '18px' }}
        >
          {line.participantName}
        </Typography>
        <Typography
          data-testid={`approval-line-reference-department-${line.electronicApprovalLineId}`}
          variant="body1"
          title={departmentLabel}
          noWrap
          color="text.secondary"
          sx={{ fontSize: 14, lineHeight: '18px' }}
        >
          {departmentLabel}
        </Typography>
      </Box>
    </Box>
  );
}

export function DocumentReferenceParticipants({
  lines,
}: DocumentReferenceParticipantsProps) {
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(
    () => groupByDepartment(lines, (line) => line.participantDepartmentName),
    [lines],
  );
  const { visible, hiddenCount } = splitVisible(lines, COLLAPSED_LIMIT);
  const collapsible = hiddenCount > 0;

  return (
    <Box data-testid="approval-line-reference-participants" sx={{ minWidth: 0 }}>
      {expanded && collapsible ? (
        <Box
          data-testid="approval-line-reference-expanded"
          sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}
        >
          {groups.map((group) => (
            <Box key={group.department} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                {group.department} ({group.items.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {group.items.map((line) => (
                  <ReferenceCard key={line.electronicApprovalLineId} line={line} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minWidth: 0 }}>
          {visible.map((line) => (
            <ReferenceCard key={line.electronicApprovalLineId} line={line} />
          ))}
        </Box>
      )}
      {collapsible && (
        <Button
          size="small"
          data-testid="approval-line-reference-toggle"
          onClick={() => setExpanded((value) => !value)}
          sx={{ mt: 0.5 }}
        >
          {expanded ? '접기' : `전체 ${lines.length}명 보기`}
        </Button>
      )}
    </Box>
  );
}
