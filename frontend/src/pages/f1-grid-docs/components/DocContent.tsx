import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { F1GridDoc } from '../types';
import { DocCodeBlock } from './DocCodeBlock';

export function DocContent({
  doc,
  onRelatedSelect,
}: {
  doc: F1GridDoc;
  onRelatedSelect: (id: string) => void;
}) {
  return (
    <Box className="f1-doc-content">
      <Typography
        variant="overline"
        color="primary"
        className="f1-doc-category"
      >
        {doc.category}
      </Typography>
      <Typography component="h1" variant="h3" className="f1-doc-title">
        {doc.title}
      </Typography>
      <Typography className="f1-doc-lede">{doc.description}</Typography>
      {doc.sections.map((section) => (
        <Box className="f1-doc-section" key={section.heading}>
          <Typography
            component="h2"
            variant="h5"
            className="f1-doc-section-title"
          >
            {section.heading}
          </Typography>
          {section.type === 'prose' && (
            <Typography color="text.secondary">{section.body}</Typography>
          )}
          {section.type === 'code' && <DocCodeBlock code={section.code} />}
          {section.type === 'api' && (
            <Table size="small" aria-label={section.heading}>
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.rows.map(([name, type, description]) => (
                  <TableRow key={name}>
                    <TableCell>
                      <code>{name}</code>
                    </TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell>{description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {section.type === 'related' &&
            section.links.map((link) => (
              <Chip
                key={link.id}
                label={link.label}
                onClick={() => onRelatedSelect(link.id)}
              />
            ))}
        </Box>
      ))}
    </Box>
  );
}
