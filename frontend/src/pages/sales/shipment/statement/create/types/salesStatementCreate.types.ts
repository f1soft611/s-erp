import type { StatementPageProps } from '../../types/salesStatement.types';

export type StatementEmbeddedActions = {
  canSave: boolean; canDelete: boolean; saving: boolean; saveDisabled: boolean;
  save: () => void; remove: () => void; print: () => void; canPrint: boolean;
};

export type SalesStatementCreateProps = StatementPageProps & {
  statementId?: number; embedded?: boolean; mode?: 'view' | 'edit';
  onSaved?: () => void; onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void; onPendingChange?: (pending: boolean) => void;
  onEmbeddedActionsChange?: (actions: StatementEmbeddedActions | null) => void;
};
