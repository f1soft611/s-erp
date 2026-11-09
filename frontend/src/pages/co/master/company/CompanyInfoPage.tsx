import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import SaveIcon from '@mui/icons-material/Save';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import ContactPhoneRoundedIcon from '@mui/icons-material/ContactPhoneRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  fetchCompanyInfo,
  updateCompanyInfo,
} from './services/companyInfo.service';
import type { CompanyInfo } from './types/companyInfo.types';

type CompanyInfoPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const EMPTY_COMPANY_INFO: CompanyInfo = {
  companyName: '',
  businessNo: '',
  businessType: '',
  businessCategory: '',
  presidentName: '',
  postCode: '',
  address: '',
  telephoneNo: '',
  facsimileNo: '',
  stampImage: '',
};

const COMPANY_FIELDS: Array<{
  key: Exclude<keyof CompanyInfo, 'stampImage'>;
  label: string;
  maxLength: number;
}> = [
  { key: 'companyName', label: '회사명', maxLength: 200 },
  { key: 'businessNo', label: '사업자등록번호', maxLength: 12 },
  { key: 'businessType', label: '업종', maxLength: 200 },
  { key: 'businessCategory', label: '업태', maxLength: 200 },
  { key: 'presidentName', label: '대표자명', maxLength: 100 },
  { key: 'postCode', label: '우편번호', maxLength: 20 },
  { key: 'address', label: '주소', maxLength: 500 },
  { key: 'telephoneNo', label: '전화번호', maxLength: 50 },
  { key: 'facsimileNo', label: '팩스번호', maxLength: 50 },
];

export function CompanyInfoPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: CompanyInfoPageProps) {
  const canRead = Boolean(selectedMenuPermissions?.read);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const { showSuccess } = useNotification();
  const { error: loadError, loading, start, succeed, fail } = useInitialLoadState();
  const [company, setCompany] = useState<CompanyInfo>(EMPTY_COMPANY_INFO);
  const [savedCompany, setSavedCompany] = useState<CompanyInfo>(EMPTY_COMPANY_INFO);
  const [saving, setSaving] = useState(false);
  const [readingStamp, setReadingStamp] = useState(false);
  const stampReader = useRef<FileReader | null>(null);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState(false);
  const visibleError = canRead ? error : '회사정보 조회 권한이 없습니다.';
  const hasChanges = useMemo(
    () => JSON.stringify(company) !== JSON.stringify(savedCompany),
    [company, savedCompany],
  );

  const loadCompanyInfo = useCallback(async () => {
    start();
    setError('');
    try {
      const loaded = await fetchCompanyInfo();
      setCompany(loaded);
      setSavedCompany(loaded);
      succeed();
    } catch (cause) {
      fail(cause);
    }
  }, [fail, start, succeed]);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    void Promise.resolve().then(loadCompanyInfo);
  }, [canRead, loadCompanyInfo]);

  useEffect(() => () => {
    const reader = stampReader.current;
    if (reader?.readyState === FileReader.LOADING) reader.abort();
  }, []);

  const saveCompanyInfo = async () => {
    if (!canRead || !canUpdate || saving || loading || readingStamp) return;
    const companyName = company.companyName.trim();
    if (!companyName) {
      setNameError(true);
      setError('회사명은 필수입니다.');
      return;
    }
    setNameError(false);
    setError('');
    setSaving(true);
    try {
      const { stampImage, ...fields } = company;
      const saved = await updateCompanyInfo({
        ...fields,
        companyName,
        ...(stampImage !== savedCompany.stampImage ? { stampImage } : {}),
      });
      setCompany(saved);
      setSavedCompany(saved);
      showSuccess('회사정보를 저장했습니다.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '회사정보를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const actionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          saving,
          savingAriaLabel: '회사정보 저장 중',
          visible: canRead && canUpdate,
          disabled: !hasChanges || saving || loading || readingStamp,
          onClick: () => void saveCompanyInfo(),
        },
      ],
    },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveCompanyInfo();
  };

  const selectStamp = (file?: File) => {
    if (!file || !canRead || !canUpdate || loading || saving || readingStamp) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 512 * 1024 || file.size === 0) {
      setError('직인은 512KB 이하의 PNG 또는 JPEG 파일을 선택해 주세요.');
      return;
    }
    const reader = new FileReader();
    stampReader.current = reader;
    setReadingStamp(true);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompany((current) => ({ ...current, stampImage: reader.result as string }));
        setError('');
      }
      stampReader.current = null;
      setReadingStamp(false);
    };
    reader.onerror = () => {
      stampReader.current = null;
      setReadingStamp(false);
      setError('직인 파일을 읽지 못했습니다.');
    };
    reader.readAsDataURL(file);
  };

  const renderFields = (keys: Array<Exclude<keyof CompanyInfo, 'stampImage'>>) =>
    COMPANY_FIELDS.filter(({ key }) => keys.includes(key)).map(({ key, label, maxLength }) => (
      <TextField
        key={key} label={label} value={company[key]} required={key === 'companyName'}
        disabled={!canRead || !canUpdate || loading || saving}
        error={key === 'companyName' && nameError}
        helperText={key === 'companyName' && nameError ? '회사명은 필수입니다.' : undefined}
        multiline={key === 'address'} minRows={key === 'address' ? 2 : undefined}
        fullWidth size="small"
        slotProps={{ htmlInput: { maxLength, 'aria-label': label } }}
        sx={{ m: 0, ...(key === 'address' ? { gridColumn: '1 / -1' } : {}) }}
        onChange={(event) => {
          setCompany((current) => ({ ...current, [key]: event.target.value }));
          if (key === 'companyName' && event.target.value.trim()) setNameError(false);
        }}
      />
    ));

  const fieldGrid = {
    display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
    columnGap: 2, rowGap: 1.5, mt: 2.5,
  };
  const sectionStyle = { p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 };
  const sectionTitle = (icon: React.ReactNode, title: string, description: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ display: 'flex', p: 1, borderRadius: 1.5, color: 'primary.main', bgcolor: 'action.hover' }}>{icon}</Box>
      <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography></Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        height: '100%',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems?.length
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={actionGroups}
      />
      <PageLoadBoundary
        error={loadError}
        loading={loading}
        label="회사정보"
        onRetry={() => void loadCompanyInfo()}
      >
        <PageMessageArea message={visibleError} onClose={() => setError('')} />
        <Box role="region" aria-label="회사정보 입력 영역"
          sx={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflowY: 'auto' }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'grid', gap: 2, alignContent: 'start',
            p: { xs: 1.5, sm: 3 },
            minWidth: 0, width: '100%', maxWidth: 1120, mx: 'auto',
          }}
        >
          <Paper elevation={0} sx={sectionStyle}>
            {sectionTitle(<BusinessRoundedIcon />, '기본정보', '거래명세서에 표시되는 회사의 사업자 정보입니다.')}
            <Box sx={fieldGrid}>{renderFields(['companyName', 'businessNo', 'presidentName', 'businessCategory', 'businessType'])}</Box>
          </Paper>
          <Paper elevation={0} sx={sectionStyle}>
            {sectionTitle(<ContactPhoneRoundedIcon />, '주소 및 연락처', '회사 주소와 연락 가능한 정보를 입력해 주세요.')}
            <Box sx={fieldGrid}>{renderFields(['postCode', 'telephoneNo', 'facsimileNo', 'address'])}</Box>
          </Paper>
          <Paper elevation={0} sx={sectionStyle}>
            {sectionTitle(<VerifiedRoundedIcon />, '회사 직인', '저장 후 새로 발행하는 거래명세서에 표시됩니다.')}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ width: 100, height: 100, border: '1px dashed', borderColor: 'divider', borderRadius: 2,
                display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'background.default' }}>
                {company.stampImage ? <Box component="img" src={company.stampImage} alt="회사 직인 미리보기"
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> :
                  <Typography variant="caption" color="text.secondary">직인 없음</Typography>}
              </Box>
              <Box>
                <Button component="label" variant="outlined" disabled={!canRead || !canUpdate || loading || saving || readingStamp}>
                  직인 선택<input aria-label="회사 직인 파일" type="file" accept="image/png,image/jpeg" hidden
                    disabled={!canRead || !canUpdate || loading || saving || readingStamp}
                    onChange={(event) => { selectStamp(event.target.files?.[0]); event.target.value = ''; }} />
                </Button>
                {company.stampImage && <Button color="error" disabled={!canUpdate || saving || readingStamp}
                  onClick={() => setCompany((current) => ({ ...current, stampImage: '' }))}>삭제</Button>}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>PNG, JPEG · 최대 512KB</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
        </Box>
      </PageLoadBoundary>
    </Box>
  );
}
