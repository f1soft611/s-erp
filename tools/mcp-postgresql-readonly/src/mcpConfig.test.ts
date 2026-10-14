import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';
import { z } from 'zod';

const configPath = fileURLToPath(
  new URL('../../../.mcp.json', import.meta.url),
);
const serverArgs = z.tuple([
  z.literal(
    'D:/f1soft/dev/react/S-ERP/tools/mcp-postgresql-readonly/dist/index.js',
  ),
]);
const primaryServerSchema = z
  .object({
    type: z.literal('stdio'),
    command: z.literal('node'),
    args: serverArgs,
  })
  .strict();
const tenantServerSchema = z
  .object({
    type: z.literal('stdio'),
    command: z.literal('node'),
    args: serverArgs,
    env: z
      .object({
        S_ERP_DB_NAME: z.literal('tenant_1212123312'),
      })
      .strict(),
  })
  .strict();
const workspaceConfigSchema = z
  .object({
    mcpServers: z
      .object({
        's-erp-postgresql-readonly': primaryServerSchema,
        's-erp-postgresql-readonly-tenant-1212123312': tenantServerSchema,
      })
      .strict(),
  })
  .strict();

describe('workspace MCP configuration', () => {
  test('registers both read-only servers with supported stdio fields', async () => {
    const source = await readFile(configPath, 'utf8');
    const config = workspaceConfigSchema.parse(JSON.parse(source));

    expect(Object.keys(config.mcpServers)).toHaveLength(2);
    expect(
      config.mcpServers['s-erp-postgresql-readonly-tenant-1212123312'].env,
    ).toEqual({ S_ERP_DB_NAME: 'tenant_1212123312' });
  });
});
