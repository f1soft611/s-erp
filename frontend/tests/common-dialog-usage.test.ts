import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(process.cwd(), 'src');

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe('common dialog usage', () => {
  const sourceFiles = listSourceFiles(sourceRoot);

  it('uses the MUI Dialog shell only inside CommonDialog', () => {
    const violations = sourceFiles
      .filter(
        (filePath) =>
          filePath !== path.join(
            sourceRoot,
            'shared',
            'components',
            'CommonDialog.tsx',
          ),
      )
      .flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return source
          .split(/\r?\n/)
          .flatMap((line, index) =>
            /<Dialog\b/.test(line) ? [`${filePath}:${index + 1}`] : [],
          );
      });

    expect(violations).toEqual([]);
  });

  it('does not use browser-native alert, confirm, or prompt dialogs', () => {
    const violations = sourceFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return source
        .split(/\r?\n/)
        .flatMap((line, index) =>
          /\b(?:window|globalThis)\.(?:alert|confirm|prompt)\s*\(/.test(line)
            ? [`${filePath}:${index + 1}`]
            : [],
        );
    });

    expect(violations).toEqual([]);
  });
});
