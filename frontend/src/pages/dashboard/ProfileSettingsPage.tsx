import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyProfile,
  updateMyProfile,
} from './services/profileSettings.service';
import type { MyProfile } from './types/profileSettings';
import { PageLoadBoundary } from '../../shared/components/PageLoadBoundary';
import { AppSaveButton } from '../../shared/components/AppSaveButton';
import { useInitialLoadState } from '../../shared/hooks/useInitialLoadState';
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  getPushSubscriptionStatus,
  type PushDeviceStatus,
} from '../../shared/services/pushSubscriptionService';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_IMAGE_SIZE = 512;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

async function normalizeImageFile(file: File): Promise<string> {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('PNG 또는 JPEG 이미지만 등록할 수 있습니다.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('이미지는 1MB 이하만 등록할 수 있습니다.');
  }

  const source = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_SIZE / source.width,
    MAX_IMAGE_SIZE / source.height,
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('이미지를 처리하지 못했습니다.');
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(
    file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    0.9,
  );
}

type ImageFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onError: (message: string) => void;
};

function ImageField({ label, value, onChange, onError }: ImageFieldProps) {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      onChange(await normalizeImageFile(file));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : '이미지를 처리하지 못했습니다.',
      );
    }
  };

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
      >
        {value ? (
          <Box
            component="img"
            src={value}
            alt={`${label} 미리보기`}
            sx={{
              width: 88,
              height: 88,
              objectFit: 'contain',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          />
        ) : (
          <Avatar variant="rounded" sx={{ width: 88, height: 88 }}>
            <ImageOutlined />
          </Avatar>
        )}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Button component="label" variant="outlined" size="small">
            등록/교체
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
            />
          </Button>
          <IconButton
            aria-label={`${label} 삭제`}
            onClick={() => onChange(null)}
            disabled={!value}
          >
            <DeleteOutlineOutlined />
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );
}

function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [stampImage, setStampImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushDeviceStatus>({ state: 'loading' });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    let active = true;
    getPushSubscriptionStatus()
      .then((status) => {
        if (active) setPushStatus(status);
      })
      .catch(() => {
        if (active) {
          setPushStatus({ state: 'error' });
          setPushError('웹 푸시 상태를 불러오지 못했습니다. 다시 시도해 주세요.');
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    start();
    setError('');
    fetchMyProfile()
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setEmail(nextProfile.email ?? '');
        setProfileImage(nextProfile.profileImage ?? null);
        setStampImage(nextProfile.stampImage ?? null);
        succeed();
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        fail(requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : '프로필을 조회하지 못했습니다.',
        );
      });
    return () => { active = false; };
  }, [retryToken, start, succeed, fail]);

  const handleSave = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const nextProfile = await updateMyProfile({
        email: email.trim(),
        profileImage,
        stampImage,
      });
      setProfile(nextProfile);
      setEmail(nextProfile.email ?? email.trim());
      setProfileImage(nextProfile.profileImage ?? profileImage);
      setStampImage(nextProfile.stampImage ?? stampImage);
      setNotice('내 정보가 저장되었습니다.');
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '저장하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      setPushStatus(await enablePushOnCurrentDevice());
    } catch {
      setPushStatus({ state: 'error' });
      setPushError('웹 푸시 설정을 변경하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      setPushStatus(await disablePushOnCurrentDevice());
    } catch {
      setPushError('웹 푸시 설정을 변경하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setPushBusy(false);
    }
  };

  const pushStatusMessage = pushStatus.state === 'loading'
    ? '웹 푸시 상태를 확인하고 있습니다.'
    : pushStatus.state === 'enabled'
      ? `이 기기에서 웹 푸시가 켜져 있습니다. (활성 기기 ${pushStatus.activeDeviceCount ?? 0}대)`
      : pushStatus.state === 'denied'
        ? '브라우저 설정에서 알림 권한을 허용해야 웹 푸시를 켤 수 있습니다.'
        : pushStatus.state === 'unsupported'
          ? '현재 브라우저 또는 보안 연결에서는 웹 푸시를 사용할 수 없습니다.'
          : pushStatus.state === 'error'
            ? '웹 푸시 상태를 불러오지 못했습니다.'
            : `이 기기에서 웹 푸시가 꺼져 있습니다. (활성 기기 ${pushStatus.activeDeviceCount ?? 0}대)`;

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 2, sm: 4 }, overflowY: 'auto', height: '100%' }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton aria-label="뒤로가기" onClick={() => navigate(-1)}>
            <ArrowBackOutlined />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              내 정보 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              내 계정의 연락처와 이미지를 관리합니다.
            </Typography>
          </Box>
        </Stack>
        <PageLoadBoundary {...initialLoad} label="내 정보"
          onRetry={() => setRetryToken((current) => current + 1)}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              기본 정보
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                label="이름"
                value={profile?.name ?? ''}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="아이디"
                value={profile?.userId ?? ''}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="부서"
                value={profile?.departmentName ?? ''}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="직급"
                value={profile?.levelName ?? ''}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="이메일"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              이미지
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              <ImageField
                label="프로필 이미지"
                value={profileImage}
                onChange={setProfileImage}
                onError={setError}
              />
              <ImageField
                label="도장 이미지"
                value={stampImage}
                onChange={setStampImage}
                onError={setError}
              />
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                웹 푸시 알림
              </Typography>
              <Typography variant="body2" color="text.secondary">
                이 브라우저에서 업무 알림을 받도록 설정합니다. 알림 종류별 설정은 제공하지 않습니다.
              </Typography>
            </Box>
            <Typography role="status" aria-live="polite">
              {pushStatusMessage}
            </Typography>
            {pushError ? <Alert severity="error">{pushError}</Alert> : null}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {pushStatus.state === 'enabled'
                || (pushStatus.state === 'denied' && pushStatus.currentDevice?.subscribed) ? (
                <Button
                  variant="outlined"
                  disabled={pushBusy}
                  onClick={() => void handleDisablePush()}
                  sx={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}
                >
                  {pushBusy ? '웹 푸시 끄는 중...' : '이 기기에서 웹 푸시 끄기'}
                </Button>
              ) : pushStatus.state === 'loading' ? (
                <Button disabled>상태 확인 중...</Button>
              ) : pushStatus.state === 'denied' || pushStatus.state === 'unsupported' ? null : (
                <Button
                  variant="contained"
                  disabled={pushBusy}
                  onClick={() => void handleEnablePush()}
                  sx={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}
                >
                  {pushBusy ? '웹 푸시 켜는 중...' : '이 기기에서 웹 푸시 켜기'}
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <AppSaveButton
            variant="contained"
            startIcon={<SaveOutlined />}
            saving={saving}
            savingLabel="저장 중..."
            onClick={handleSave}
            disabled={saving || !profile}
          >
            저장
          </AppSaveButton>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            취소
          </Button>
        </Stack>
        </PageLoadBoundary>
      </Stack>
    </Container>
  );
}

export default ProfileSettingsPage;
