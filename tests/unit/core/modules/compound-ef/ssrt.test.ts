import { describe, it, expect } from 'vitest';
import { ssrtIntegration } from '~/core/modules/compound-ef/ssrt';

describe('SSRT (integration method)', () => {
  it('computes finite SSRT given go RTs and inhibit data', () => {
    const r = ssrtIntegration({
      goRts: [300,320,340,360,380,400,420,440,460,480],
      pFailedInhibit: 0.5, meanSsdMs: 200
    });
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(300);
  });
});
