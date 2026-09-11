import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useOptionalAppSettings } from '../../shared/context/AppSettingsContext';
import { getF1GridDoc, f1GridDocs } from './data/f1GridDocs';
import { DocContent } from './components/DocContent';
import { F1GridPlayground } from './components/F1GridPlayground';
import './F1GridDocsPage.css';

const docSearchAliases: Record<string, string[]> = {
  'F1-Grid': ['f1-grid', 'f1 grid', '그리드'],
  'Getting Started': ['getting started', '시작하기', '초기 설정'],
  'Core Grid': ['core grid', '핵심 그리드', '기본 그리드'],
  'Cell Editing': ['cell editing', '셀 편집', '편집'],
  'Row Form Modal': ['row form modal', '행 폼', '폼 모달'],
  'Selection & Clipboard': ['selection clipboard', '선택', '클립보드'],
  'Filtering & Sorting': ['filtering sorting', '필터', '정렬'],
  'Column Layout': ['column layout', '컬럼 레이아웃', '레이아웃'],
  'Row Height': ['row height', '행 높이', '높이'],
  'Large Dataset': ['large dataset', '대용량', '대량 데이터'],
  'Row Merge': ['row merge', '행 병합', '병합'],
  'Context Menu': ['context menu', '컨텍스트 메뉴', '메뉴'],
  'Tree Grid': ['tree grid', '트리 그리드', '트리'],
  'API Reference': ['api reference', 'api', '참조'],
};

function getSearchDisplayTitle(title: string, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized || !/[가-힣]/.test(normalized)) {
    return title;
  }

  const aliases = docSearchAliases[title] ?? [];
  const koreanMatch = aliases
    .filter((alias) => /[가-힣]/.test(alias))
    .find((alias) => alias.toLowerCase().includes(normalized));

  return koreanMatch ?? title;
}

type F1GridDocsPageProps = { initialDocumentId?: string };

export function F1GridDocsPage({
  initialDocumentId = 'overview',
}: F1GridDocsPageProps) {
  const [selectedId, setSelectedId] = useState(
    getF1GridDoc(initialDocumentId).id,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const settings = useOptionalAppSettings();
  const themeMode = settings?.themeMode ?? 'light';
  const setThemeMode = settings?.setThemeMode ?? (() => undefined);
  const isDark = themeMode === 'dark';

  const filteredDocs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return f1GridDocs;
    }

    return f1GridDocs.filter((item) => {
      const aliases = docSearchAliases[item.title] ?? [];
      const matchSource = [
        item.title,
        item.description,
        ...aliases,
        ...item.sections.map((section) => section.heading),
      ]
        .join(' ')
        .toLowerCase();

      return matchSource.includes(normalized);
    });
  }, [searchTerm]);

  useEffect(() => {
    if (filteredDocs.length === 0) {
      return;
    }

    if (!filteredDocs.some((item) => item.id === selectedId)) {
      setSelectedId(filteredDocs[0].id);
    }
  }, [filteredDocs, selectedId]);

  const doc = getF1GridDoc(selectedId);

  function selectDocument(id: string) {
    setSelectedId(id);
    setMenuOpen(false);
  }

  return (
    <Box
      className={`f1-docs-shell ${isDark ? 'f1-docs-shell-dark' : 'f1-docs-shell-light'}`}
    >
      <Box component="header" className="f1-docs-header">
        <Box className="f1-docs-brand">
          <Typography
            variant="overline"
            className="f1-docs-kicker"
            style={{ letterSpacing: '0.14em' }}
          >
            Developer docs
          </Typography>
          <Typography
            component="h1"
            variant="h5"
            className="f1-docs-title"
            style={{ letterSpacing: '-0.04em' }}
          >
            F1-Grid
          </Typography>
        </Box>

        <Box className="f1-docs-header-actions">
          <TextField
            className="f1-docs-search"
            size="small"
            label="문서 검색"
            placeholder="문서 검색"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '문서 검색' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <IconButton
            aria-label={isDark ? '라이트 테마로 전환' : '다크 테마로 전환'}
            onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
          >
            {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
          <IconButton
            aria-label="문서 메뉴 열기"
            className="f1-docs-mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>
      </Box>

      <Box className={`f1-docs-layout${menuOpen ? ' menu-open' : ''}`}>
        <Box
          component="nav"
          aria-label="F1-Grid 문서 네비게이션"
          className="f1-docs-sidebar"
        >
          <Typography
            className="f1-docs-nav-label"
            style={{ letterSpacing: '0.04em' }}
          >
            DOCUMENTATION
          </Typography>
          {searchTerm.trim() && (
            <Box className="f1-docs-search-status">
              <Typography variant="caption">검색 결과</Typography>
            </Box>
          )}

          <Stack spacing={0.5}>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((item) => (
                <Button
                  key={item.id}
                  className={item.id === doc.id ? 'active' : ''}
                  onClick={() => selectDocument(item.id)}
                >
                  {getSearchDisplayTitle(item.title, searchTerm) || item.title}
                </Button>
              ))
            ) : (
              <Typography className="f1-docs-empty-state">
                검색 결과가 없습니다.
              </Typography>
            )}
          </Stack>
        </Box>

        <Box component="main" className="f1-docs-main">
          <Typography className="f1-docs-breadcrumb">
            F1-Grid / {doc.title}
          </Typography>
          <DocContent doc={doc} onRelatedSelect={selectDocument} />
          {doc.playground && <F1GridPlayground kind={doc.playground} />}
        </Box>
      </Box>
    </Box>
  );
}
