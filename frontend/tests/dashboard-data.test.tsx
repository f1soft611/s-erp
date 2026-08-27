import { describe, expect, it } from 'vitest';
import { moduleItems } from '../src/pages/dashboard/services/dashboardData';

describe('Dashboard data', () => {
  it('keeps dashboard module icons lightweight for fast login route startup', () => {
    expect(moduleItems[0].icon).toBeTruthy();
    expect(typeof (moduleItems[0].icon as { type?: unknown }).type).toBe(
      'function',
    );
  });
});
