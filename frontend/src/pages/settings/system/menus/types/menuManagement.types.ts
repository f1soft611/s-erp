export type MenuManagementRow = {
  id: string;
  code: string;
  name: string;
  parent: string;
  order: number;
  enabled: boolean;
  status: 'draft' | 'confirmed';
  description: string;
  permissionGroup: string;
};
