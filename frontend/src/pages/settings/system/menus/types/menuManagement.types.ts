export type MenuManagementRow = {
  id: string;
  code: string;
  name: string;
  parent: string;
  order: number;
  enabled: boolean;
  description: string;
  permissionGroup: string;
};
