export function generateDigitSequence(length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    let d: number;
    do { d = 1 + Math.floor(Math.random() * 9); }
    while (seq.length > 0 && d === seq[seq.length - 1]);
    seq.push(d);
  }
  return seq;
}

export function generateFoil(original: number[]): number[] {
  const foil = [...original];
  const i = Math.floor(Math.random() * (foil.length - 1));
  const j = i + 1;
  [foil[i], foil[j]] = [foil[j]!, foil[i]!];
  return foil;
}
