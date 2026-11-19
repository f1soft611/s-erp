import type { ReactNode } from 'react';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import VpnKeyOutlined from '@mui/icons-material/VpnKeyOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';

export function DashboardModuleIcon({ name }: { name: string }): ReactNode {
  const map: Record<string, ReactNode> = {
    Groups: <GroupsOutlined fontSize="medium" />,
    Settings: <SettingsOutlined fontSize="medium" />,
    Dashboard: <DashboardOutlined fontSize="medium" />,
    Folder: <FolderOutlined fontSize="medium" />,
    Assignment: <AssignmentOutlined fontSize="medium" />,
    Business: <BusinessOutlined fontSize="medium" />,
    Security: <SecurityOutlined fontSize="medium" />,
    People: <PeopleOutlined fontSize="medium" />,
    Build: <BuildOutlined fontSize="medium" />,
    VpnKey: <VpnKeyOutlined fontSize="medium" />,
    Inventory: <Inventory2Outlined fontSize="medium" />,
    Notifications: <NotificationsOutlined fontSize="medium" />,
    CalendarMonth: <CalendarMonthOutlined fontSize="medium" />,
    ShoppingCart: <ShoppingCartOutlined fontSize="medium" />,
    AdminPanelSettings: <AdminPanelSettingsOutlined fontSize="medium" />,
    ListAlt: <ListAltOutlined fontSize="medium" />,
    CheckCircle: <CheckCircleOutlined fontSize="medium" />,
    FileText: <DescriptionOutlined fontSize="medium" />,
    ClipboardCheck: <FactCheckOutlined fontSize="medium" />,
  };

  return map[name] ?? map.Settings;
}
