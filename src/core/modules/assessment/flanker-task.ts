export interface FlankerTrial {
  direction: 'left' | 'right';
  congruent: boolean;
}

export interface FlankerScore {
  congruentMeanRT: number;
  incongruentMeanRT: number;
  conflictCost: number;
  accuracy: number;
}

export function generateFlankerTrials(): FlankerTrial[] {
  const trials: FlankerTrial[] = [];
  for (let i = 0; i < 6; i++) {
    trials.push({ direction: 'left', congruent: true });
    trials.push({ direction: 'right', congruent: true });
    trials.push({ direction: 'left', congruent: false });
    trials.push({ direction: 'right', congruent: false });
  }
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trials[i], trials[j]] = [trials[j]!, trials[i]!];
  }
  return trials;
}

export function scoreFlanker(rts: Array<{ congruent: boolean; rt: number }>): FlankerScore {
  const cong = rts.filter(r => r.congruent);
  const incong = rts.filter(r => !r.congruent);
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const congruentMeanRT = mean(cong.map(r => r.rt));
  const incongruentMeanRT = mean(incong.map(r => r.rt));
  return {
    congruentMeanRT,
    incongruentMeanRT,
    conflictCost: incongruentMeanRT - congruentMeanRT,
    accuracy: rts.length > 0 ? rts.length / 24 : 0
  };
}
