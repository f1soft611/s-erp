import { Suspense, useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const docsPage = vi.hoisted(() => ({ mounts: 0 }));

vi.mock('../src/pages/f1-grid-docs/F1GridDocsPage', () => ({
  F1GridDocsPage: ({ initialDocumentId }: { initialDocumentId?: string }) => {
    useEffect(() => {
      docsPage.mounts += 1;
    }, []);
    return <p>docs:{initialDocumentId ?? 'overview'}</p>;
  },
}));

// 순서 의존: 첫 테스트가 화면 모듈을 처음 불러오고, 이후 테스트는 로드된 상태를 사용한다.
describe('dashboard lazy page registry', () => {
  it('suspends on first use, then renders the page with the same props', async () => {
    const { F1GridDocsPage } = await import('../src/pages/dashboard/components/dashboardPages');

    render(
      <Suspense fallback={<p>loading</p>}>
        <F1GridDocsPage initialDocumentId="api-reference" />
      </Suspense>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('docs:api-reference')).toBeInTheDocument();
    expect(docsPage.mounts).toBe(1);
  });

  it('keeps a page mounted across re-renders after its module has loaded', async () => {
    const { F1GridDocsPage } = await import('../src/pages/dashboard/components/dashboardPages');
    const mountsBefore = docsPage.mounts;

    const { rerender } = render(
      <Suspense fallback={<p>loading</p>}>
        <F1GridDocsPage initialDocumentId="a" />
      </Suspense>,
    );
    rerender(
      <Suspense fallback={<p>loading</p>}>
        <F1GridDocsPage initialDocumentId="b" />
      </Suspense>,
    );

    expect(screen.getByText('docs:b')).toBeInTheDocument();
    expect(docsPage.mounts).toBe(mountsBefore + 1);
  });

  it('renders synchronously without a fallback once pages are preloaded', async () => {
    const { F1GridDocsPage, preloadDashboardPages } = await import(
      '../src/pages/dashboard/components/dashboardPages'
    );
    await preloadDashboardPages();

    render(
      <Suspense fallback={<p>loading</p>}>
        <F1GridDocsPage />
      </Suspense>,
    );

    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(screen.getByText('docs:overview')).toBeInTheDocument();
  }, 60_000);
});
