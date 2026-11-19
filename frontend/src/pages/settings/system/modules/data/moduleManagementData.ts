import type { ModuleManagementRow } from '../types/moduleManagement.types';

export const MODULE_ICON_OPTIONS = [
  { value: 'Settings', label: 'Settings' },
  { value: 'Folder', label: 'Folder' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'People', label: 'People' },
  { value: 'Business', label: 'Business' },
  { value: 'AdminPanelSettings', label: 'AdminPanelSettings' },
  { value: 'ListAlt', label: 'ListAlt' },
  { value: 'FileText', label: 'FileText' },
  { value: 'ClipboardCheck', label: 'ClipboardCheck' },
  { value: 'CheckCircle', label: 'CheckCircle' },
  { value: 'Notifications', label: 'Notifications' },
  { value: 'Assignment', label: 'Assignment' },
  { value: 'Security', label: 'Security' },
  { value: 'CalendarMonth', label: 'CalendarMonth' },
  { value: 'ShoppingCart', label: 'ShoppingCart' },
];

export const canEditModuleCode = (row: ModuleManagementRow): boolean =>
  !row.id || String(row.id).startsWith('new-module-');
