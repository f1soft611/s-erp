import type { PageSearchField } from '../../../../../../shared/components/page-search/searchFields';
import { localDate } from '../../../delivery/create/services/salesDelivery.service';

export const statementStatusSearchFields: PageSearchField[] = [
  { field: 'statementDt', label: '명세일', type: 'date', required: true, searchSpan: 2 },
];

export function validStatementDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}
