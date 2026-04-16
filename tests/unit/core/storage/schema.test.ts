import { describe, it, expect } from 'vitest';
import { SCHEMA_DDL, CURRENT_VERSION } from '~/core/storage/schema';

describe('SQL schema', () => {
  it('includes all required tables', () => {
    const ddl = SCHEMA_DDL.join('\n');
    for (const t of [
      'sessions', 'blocks', 'trials', 'domain_state',
      'calibration_items', 'calibration_reviews',
      'matrix_items', 'metacog_predictions', 'transfer_assessments'
    ]) {
      expect(ddl).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
    }
  });

  it('declares schema version', () => {
    expect(CURRENT_VERSION).toBeGreaterThanOrEqual(1);
  });
});
