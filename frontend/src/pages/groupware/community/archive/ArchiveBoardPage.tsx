import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, Chip, Stack, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { ArchiveFileGrid } from './components/ArchiveFileGrid';
import { useArchiveCategories } from './hooks/useArchiveCategories';
import { useArchiveList } from './hooks/useArchiveList';
import { useArchiveMutations } from './hooks/useArchiveMutations';
import { downloadArchiveAttachment } from './services/archiveBoardService';
import type { ArchiveFileRow } from './types/archive.types';

type ArchiveBoardPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function ArchiveBoardPage({
  selectedModule,
  currentMenuName,
  content,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: ArchiveBoardPageProps) {
  const { showError, showSuccess } = useNotification();
  const [searchDraft, setSearchDraft] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [currentFolderCode, setCurrentFolderCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = isTenantAdmin && Boolean(selectedMenuPermissions?.create);
  const canDelete = isTenantAdmin && Boolean(selectedMenuPermissions?.delete);

  const { categories, isLoading: categoriesLoading, error: categoriesError } =
    useArchiveCategories();
  const { dataSource, setKeyword, setCategoryCode } = useArchiveList({
    retryToken,
  });

  const reloadList = async () => {
    setRetryToken((current) => current + 1);
  };

  const mutations = useArchiveMutations({
    reloadList,
    showError,
    showSuccess,
  });

  const actionLabel = useMemo(() => {
    if (!currentFolderCode) return '루트';
    const folder = categories.find((item) => item.code === currentFolderCode);
    return folder?.name ?? currentFolderCode;
  }, [categories, currentFolderCode]);

  const handleSearch = () => {
    setKeyword(searchDraft.trim());
  };

  const handleFolderChange = (folderCode: string) => {
    setCurrentFolderCode(folderCode);
    setCategoryCode(folderCode);
  };

  const handleCreate = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await mutations.uploadFiles(files, currentFolderCode || null);
    event.target.value = '';
  };

  const handleDownload = async (row: ArchiveFileRow) => {
    try {
      await downloadArchiveAttachment(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`파일 다운로드에 실패했습니다: ${message}`);
    }
  };

  const handleDelete = async (row: ArchiveFileRow) => {
    await mutations.deleteFile(row);
  };

  const showReadDenied =
    selectedMenuPermissions != null && !selectedMenuPermissions.read;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={
          canCreate
            ? [
                {
                  key: 'archive-create',
                  actions: [
                    {
                      key: 'create-archive',
                      label: '새 자료 등록',
                      icon: AddOutlined,
                      onClick: handleCreate,
                    },
                  ],
                },
              ]
            : []
        }
      />

      <Box sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {showReadDenied && (
          <Alert severity="warning">조회 권한이 없어 자료실을 볼 수 없습니다.</Alert>
        )}
        {categoriesError && (
          <Alert severity="error">{categoriesError.message}</Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField
            fullWidth
            label="자료 검색"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button startIcon={<SearchIcon />} onClick={handleSearch}>
            조회
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label="루트"
            color={currentFolderCode ? 'default' : 'primary'}
            onClick={() => handleFolderChange('')}
          />
          {categories.map((category) => (
            <Chip
              key={category.code}
              label={category.name}
              color={currentFolderCode === category.code ? 'primary' : 'default'}
              onClick={() => handleFolderChange(category.code)}
            />
          ))}
        </Stack>
        <Alert severity="info">현재 위치: {actionLabel}</Alert>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, px: 3, pb: 3 }}>
        <ArchiveFileGrid
          dataSource={dataSource}
          onDataSourceError={(error) => showError(error.message)}
          onDownload={handleDownload}
          onDelete={handleDelete}
          canDelete={canDelete}
        />
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileInputChange}
        aria-label="자료 파일 선택"
      />

      {categoriesLoading && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Alert severity="info">분류 정보를 불러오는 중입니다.</Alert>
        </Box>
      )}
      {(mutations.isUploading || mutations.isDeleting || mutations.isUpdating) && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Alert severity="info">요청 처리 중입니다.</Alert>
        </Box>
      )}
    </Box>
  );
}
