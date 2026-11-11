import { Button, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CommonDialog } from '../components/CommonDialog';

export type CommonConfirmDialogOptions = {
  title?: string;
  subtitle?: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function useCommonConfirmDialog() {
  const [request, setRequest] = useState<CommonConfirmDialogOptions | null>(
    null,
  );
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: CommonConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  const dialog: ReactNode = (
    <CommonDialog
      open={request !== null}
      onClose={() => settle(false)}
      title={request?.title ?? '확인'}
      description={request?.subtitle}
      size="xs"
      actions={
        <>
          <Button variant="contained" onClick={() => settle(true)}>
            {request?.confirmLabel ?? '확인'}
          </Button>
          <Button onClick={() => settle(false)}>
            {request?.cancelLabel ?? '취소'}
          </Button>
        </>
      }
    >
      <Typography>{request?.description}</Typography>
    </CommonDialog>
  );

  return { confirm, dialog };
}
