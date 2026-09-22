import type { CommonViewItem } from '../../../../../shared/components/view-mode/commonViewTypes';
import type { NoticeFeedItem } from './noticeData';

function formatNoticeDate(value: NoticeFeedItem['createdAt']): string {
  if (!value) {
    return '날짜 미상';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '날짜 미상';
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveAuthorLabel(item: NoticeFeedItem): string {
  return item.meta.split('·')[0]?.trim() || '관리자';
}

export function toNoticeViewItem(item: NoticeFeedItem): CommonViewItem {
  return {
    id: item.id,
    title: item.title,
    authorLabel: resolveAuthorLabel(item),
    dateLabel: formatNoticeDate(item.createdAt),
    isPinned: item.isPinned === 'Y',
    categoryLabel: item.noticeGubunName ?? item.noticeGubunCode ?? '공지',
    metaLabel: item.meta,
    summary: item.summary,
  };
}

export function toNoticeViewItems(items: NoticeFeedItem[]): CommonViewItem[] {
  return items.map(toNoticeViewItem);
}
