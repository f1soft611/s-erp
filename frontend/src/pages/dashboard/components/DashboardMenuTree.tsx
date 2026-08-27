import {
  Avatar,
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { useEffect, useState } from 'react';
import type { MenuTreeNode, ModuleItem } from '../types/dashboard';

type DashboardMenuTreeProps = {
  selectedModule: ModuleItem;
  expandedItemIds: string[];
  selectedMenuId: string;
  onMenuSelect: (menuId: string) => void;
};

export function DashboardMenuTree({
  selectedModule,
  expandedItemIds,
  selectedMenuId,
  onMenuSelect,
}: DashboardMenuTreeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const panelBg = isDark ? '#111827' : '#f7f9fc';
  const softBg = isDark ? '#0f172a' : '#f1f5f9';
  const [expandedItems, setExpandedItems] = useState(expandedItemIds);
  const expandedItemKey = expandedItemIds.join(',');

  useEffect(() => {
    setExpandedItems(expandedItemIds);
  }, [expandedItemKey]);

  const renderMenuNode = (node: MenuTreeNode) => {
    const hasChildren = Boolean(node.children?.length);
    const isSelected = selectedMenuId === node.id;

    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={node.name}
        onClick={
          hasChildren
            ? undefined
            : () => {
                onMenuSelect(node.id);
              }
        }
        sx={{
          '& > .MuiTreeItem-content': {
            minHeight: 36,
            mb: 0.25,
            borderRadius: 1,
            color: hasChildren
              ? isDark
                ? '#cbd5e1'
                : '#475569'
              : isDark
                ? '#dbeafe'
                : '#475569',
            fontWeight: hasChildren ? 800 : isSelected ? 800 : 600,
            fontSize: hasChildren ? '0.72rem' : '0.875rem',
            letterSpacing: hasChildren ? '0.06em' : 0,
            textTransform: hasChildren ? 'uppercase' : 'none',
            borderLeft: isSelected
              ? '3px solid #60a5fa'
              : '3px solid transparent',
            bgcolor: isSelected
              ? isDark
                ? 'rgba(96,165,250,0.18)'
                : '#dfeeff'
              : 'transparent',
            '&:hover': {
              bgcolor: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
            },
          },
          '& > .MuiTreeItem-groupTransition': {
            ml: 1.25,
            pl: 0.75,
            borderLeft: `1px solid ${isDark ? 'rgba(148,163,184,0.2)' : '#dbe3ef'}`,
          },
        }}
      >
        {node.children?.map(renderMenuNode)}
      </TreeItem>
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: panelBg,
        color: isDark ? '#e2e8f0' : '#0f172a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: softBg,
        }}
      >
        <Typography
          component="h2"
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: isDark ? '#cbd5e1' : '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          모듈 선택
        </Typography>
        <Typography
          component="h3"
          variant="caption"
          sx={{
            color: isDark ? '#94a3b8' : '#64748b',
            fontWeight: 700,
          }}
        >
          {selectedModule.name}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          overflowY: 'auto',
        }}
      >
        <SimpleTreeView
          expandedItems={expandedItems}
          selectedItems={selectedMenuId}
          expansionTrigger="content"
          onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
          sx={{ flex: 1, overflow: 'auto' }}
        >
          {selectedModule.tree.map(renderMenuNode)}
        </SimpleTreeView>
      </Box>
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Card
          sx={{
            bgcolor: isDark ? '#111827' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#0f172a',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2.1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: '#2563eb',
                  width: 30,
                  height: 30,
                  fontSize: '0.8rem',
                }}
              >
                A
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  관리자
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  admin@f1soft.com
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
