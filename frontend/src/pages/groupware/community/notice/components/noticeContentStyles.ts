export const noticeContentStyles = {
  fontSize: '0.95rem',
  lineHeight: 1.7,
  '& p': {
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  '& p:empty': {
    minHeight: '1.7em',
  },
  '& ul, & ol': {
    margin: '8px 0 8px 18px',
    paddingLeft: '18px',
  },
  '& blockquote': {
    margin: '8px 0',
    paddingLeft: '12px',
    borderLeft: '3px solid rgba(59,130,246,0.42)',
  },
  '& strong': {
    fontWeight: 700,
  },
  '& em': {
    fontStyle: 'italic',
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
  },
  '& table': {
    width: 'max-content',
    minWidth: 'max-content',
    borderCollapse: 'collapse',
    tableLayout: 'auto',
    margin: '8px 0',
  },
  '& th, & td': {
    minWidth: 0,
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  '& th': {
    fontWeight: 700,
  },
};
