import type { DomainState, SessionPlan, Phase } from '~/types/domain';
import { urgencyScore } from './urgency';

export interface ComposeInput {
  phase: Phase;
  states: DomainState[];
  targetMinutes: number;
}

export function composeSession(input: ComposeInput): SessionPlan {
  const now = Date.now();
  const ranked = input.states
    .map(s => ({
      state: s,
      score: urgencyScore({
        daysSinceLast: s.lastSessionTs ? (now - s.lastSessionTs) / 86400000 : Infinity,
        plateauFlag: s.plateauFlag,
        decayFlag: false
      })
    }))
    .sort((a, b) => b.score - a.score);

  const pickCount =
    input.phase === 'ramp' ? 1 :
    input.phase === 'maintenance' ? 1 : 2;

  const picked = ranked.slice(0, pickCount);
  const cap = Math.min(input.targetMinutes, 30);
  const perModule = cap / picked.length;

  return {
    id: crypto.randomUUID(),
    createdTs: now,
    phase: input.phase,
    modules: picked.map(p => ({ moduleId: p.state.moduleId, targetMinutes: perModule })),
    interleave: pickCount > 1,
    metacogOverlay: true
  };
}
