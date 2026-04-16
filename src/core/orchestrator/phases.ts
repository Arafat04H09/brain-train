import type { Phase } from '~/types/domain';

export function computePhase(ctx: { sessionsTotal: number; weeksActive: number }): Phase {
  if (ctx.weeksActive <= 3) return 'ramp';
  if (ctx.weeksActive <= 8) return 'intensive';
  if (ctx.weeksActive <= 12) return 'consolidation';
  return 'maintenance';
}
