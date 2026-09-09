import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { loadEnvironmentFile } from './config.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('loadEnvironmentFile', () => {
  test('loads missing values from a local env file without overwriting existing values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mcp-postgresql-'));
    temporaryDirectories.push(directory);
    const environment: Record<string, string | undefined> = {
      S_ERP_DB_HOST: 'existing-host',
    };
    const envFilePath = join(directory, '.env');

    await writeFile(
      envFilePath,
      'S_ERP_DB_HOST=file-host\nS_ERP_DB_PORT=5433\nS_ERP_DB_PASSWORD=local-password\n',
    );

    loadEnvironmentFile(environment, envFilePath);

    expect(environment).toMatchObject({
      S_ERP_DB_HOST: 'existing-host',
      S_ERP_DB_PORT: '5433',
      S_ERP_DB_PASSWORD: 'local-password',
    });
  });
});
