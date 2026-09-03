import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { getF1GridDoc, f1GridDocs } from './data/f1GridDocs';
import { DocContent } from './components/DocContent';
import { F1GridPlayground } from './components/F1GridPlayground';
import './F1GridDocsPage.css';

type F1GridDocsPageProps = { initialDocumentId?: string };

export function F1GridDocsPage({
  initialDocumentId = 'overview',
}: F1GridDocsPageProps) {
  const [selectedId, setSelectedId] = useState(
    getF1GridDoc(initialDocumentId).id,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const doc = getF1GridDoc(selectedId);

  function selectDocument(id: string) {
    setSelectedId(id);
    setMenuOpen(false);
  }

  return (
    <Box className="f1-docs-shell">
      <Box component="header" className="f1-docs-header">
        <Box>
          <Typography variant="overline" style={{ letterSpacing: '0.04em' }}>
            Developer docs
          </Typography>
          <Typography
            component="h1"
            variant="h5"
            style={{ letterSpacing: '0.04em' }}
          >
            F1-Grid
          </Typography>
        </Box>
        <IconButton
          aria-label="Open documentation menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuRoundedIcon />
        </IconButton>
      </Box>
      <Box className={`f1-docs-layout${menuOpen ? ' menu-open' : ''}`}>
        <Box
          component="nav"
          aria-label="F1-Grid documentation"
          className="f1-docs-sidebar"
        >
          <Typography
            className="f1-docs-nav-label"
            style={{ letterSpacing: '0.04em' }}
          >
            DOCUMENTATION
          </Typography>
          <Stack spacing={0.5}>
            {f1GridDocs.map((item) => (
              <Button
                key={item.id}
                className={item.id === doc.id ? 'active' : ''}
                onClick={() => selectDocument(item.id)}
              >
                {item.title}
              </Button>
            ))}
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
