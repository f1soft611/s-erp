export type CommonViewMode = 'feed' | 'list';

export type CommonViewItem = {
  id: string | number;
  title: string;
  authorLabel: string;
  dateLabel: string;
  isPinned?: boolean;
  categoryLabel?: string;
  statusLabel?: string;
  statusColor?: 'default' | 'error' | 'info' | 'success' | 'warning';
  metaLabel?: string;
  summary?: string;
};

export type CommonViewItemRenderer<T> = (
  item: T,
  index: number,
) => React.ReactNode;
