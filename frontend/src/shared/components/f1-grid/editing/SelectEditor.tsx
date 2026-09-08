import { Box, Input, MenuItem, Select } from '@mui/material';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
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
import type { F1GridOption } from '../types/grid.types';

type SelectEditorProps = {
  value: string | number | boolean;
  options: F1GridOption[];
  onChange: (value: string | number | boolean) => void;
};

const renderOptionIcon = (name: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    Dashboard: <DashboardOutlined fontSize="small" />,
    Settings: <SettingsOutlined fontSize="small" />,
    Folder: <FolderOutlined fontSize="small" />,
    Groups: <GroupsOutlined fontSize="small" />,
    Assignment: <AssignmentOutlined fontSize="small" />,
    Business: <BusinessOutlined fontSize="small" />,
    Security: <SecurityOutlined fontSize="small" />,
    People: <PeopleOutlined fontSize="small" />,
    Build: <BuildOutlined fontSize="small" />,
    VpnKey: <VpnKeyOutlined fontSize="small" />,
    Inventory: <Inventory2Outlined fontSize="small" />,
    Notifications: <NotificationsOutlined fontSize="small" />,
    CalendarMonth: <CalendarMonthOutlined fontSize="small" />,
    ShoppingCart: <ShoppingCartOutlined fontSize="small" />,
    AdminPanelSettings: <AdminPanelSettingsOutlined fontSize="small" />,
    ListAlt: <ListAltOutlined fontSize="small" />,
    CheckCircle: <CheckCircleOutlined fontSize="small" />,
    FileText: <DescriptionOutlined fontSize="small" />,
    ClipboardCheck: <FactCheckOutlined fontSize="small" />,
  };

  return iconMap[name] ?? <SettingsOutlined fontSize="small" />;
};

export function SelectEditor({ value, options, onChange }: SelectEditorProps) {
  const selectedOption =
    options.find((option) => String(option.value) === String(value)) ?? options[0];

  return (
    <Select
      autoFocus
      fullWidth
      size="small"
      input={<Input disableUnderline />}
      value={String(value ?? selectedOption?.value ?? '')}
      renderValue={(selected) => {
        const option = options.find(
          (candidate) => String(candidate.value) === String(selected),
        );
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {renderOptionIcon(String(option?.value ?? selected))}
            </Box>
            <Box>{option?.label ?? String(selected)}</Box>
          </Box>
        );
      }}
      onChange={(event) =>
        onChange(
          options.find((option) => String(option.value) === event.target.value)
            ?.value ?? event.target.value,
        )
      }
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontSize: 'inherit',
        '& .MuiSelect-select': {
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          py: 0,
          pl: 0,
          pr: 3,
          minHeight: 'unset',
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={String(option.value)} value={String(option.value)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {renderOptionIcon(String(option.value))}
            </Box>
            <Box>{option.label}</Box>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
