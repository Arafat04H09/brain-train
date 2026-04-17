import { createSignal, onMount, onCleanup } from 'solid-js';

const INSTRUCTIONS: Record<string, { title: string; lines: string[]; keys: string }> = {
  'dual-nback': {
    title: 'Dual N-Back',
    lines: [
      'A square lights up in a grid while a letter is spoken.',
      'Press A (or \u2190) if the POSITION matches N trials ago.',
      'Press L (or \u2192) if the AUDIO matches N trials ago.',
      'Press both if both match. Press nothing if neither matches.',
    ],
    keys: 'A / L (or \u2190 / \u2192)',
  },
  'complex-span': {
    title: 'Complex Span',
    lines: [
      'Solve a quick math problem (True / False).',
      'Then remember the letter shown.',
      'After the set, recall all letters in order.',
    ],
    keys: 'T / F for math \u00b7 Click letters to recall',
  },
  'ufov': {
    title: 'Perceptual Speed (UFOV)',
    lines: [
      'A vehicle flashes briefly in the center \u2014 identify if it\u2019s a car or truck.',
      'On some trials, locate a peripheral target among distractors.',
      'Display time adapts to your ability.',
    ],
    keys: 'Car / Truck buttons',
  },
  'ef-flanker': {
    title: 'Flanker',
    lines: [
      'Five arrows flash briefly. Focus on the CENTER arrow.',
      'Press \u2190 if center points left, \u2192 if center points right.',
      'Ignore the surrounding arrows \u2014 they may point the opposite way.',
    ],
    keys: '\u2190 / \u2192',
  },
  'ef-stop-signal': {
    title: 'Stop-Signal',
    lines: [
      'An arrow appears \u2014 press \u2190 or \u2192 to match its direction.',
      'On some trials, a red STOP signal will appear after a delay.',
      'If you see STOP, withhold your response entirely.',
    ],
    keys: '\u2190 / \u2192 (or nothing on STOP)',
  },
  'ef-task-switch': {
    title: 'Task Switching',
    lines: [
      'A cue word (COLOR or SHAPE) appears, then a colored shape.',
      'If cue is COLOR: press \u2190 for red, \u2192 for blue.',
      'If cue is SHAPE: press \u2190 for square, \u2192 for circle.',
    ],
    keys: '\u2190 / \u2192',
  },
  'relational': {
    title: 'Matrix Reasoning',
    lines: [
      'A 3\u00d73 grid has a missing piece in the bottom-right.',
      'Find the pattern across rows and columns.',
      'Press 1\u20138 (or click) to select the correct answer.',
    ],
    keys: '1\u20138 or click',
  },
  'calibration': {
    title: 'Calibration',
    lines: [
      'Answer a multiple-choice knowledge question.',
      'Then rate your confidence (how sure you are).',
      'Your calibration score improves when confidence matches accuracy.',
    ],
    keys: 'Click answer \u00b7 Adjust confidence slider',
  },
  'assessment-matrix': {
    title: 'Matrix Reasoning (Assessment)',
    lines: [
      'Untimed pattern-matching puzzles.',
      'Find the missing piece in the 3\u00d73 grid.',
      'Take as long as you need \u2014 accuracy matters, not speed.',
    ],
    keys: '1\u20138 or click',
  },
  'simple-rt': {
    title: 'Simple Reaction Time',
    lines: [
      'A white dot will appear in the center.',
      'Press SPACE as fast as possible when you see it.',
    ],
    keys: 'Space',
  },
};

function matchInstructions(blockKind: string): { title: string; lines: string[]; keys: string } | null {
  if (INSTRUCTIONS[blockKind]) return INSTRUCTIONS[blockKind]!;
  if (blockKind.startsWith('dual-nback')) return INSTRUCTIONS['dual-nback']!;
  if (blockKind.startsWith('ufov')) return INSTRUCTIONS['ufov']!;
  if (blockKind.startsWith('relational')) return INSTRUCTIONS['relational']!;
  if (blockKind.startsWith('calibration')) return INSTRUCTIONS['calibration']!;
  if (blockKind.startsWith('ef-')) return INSTRUCTIONS[blockKind] ?? null;
  return null;
}

export function BlockInstructions(props: { blockKind: string; onReady: () => void }) {
  const [visible, setVisible] = createSignal(true);
  const info = matchInstructions(props.blockKind);

  if (!info) {
    props.onReady();
    return null;
  }

  const dismiss = () => {
    setVisible(false);
    props.onReady();
  };

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', handler);
    onCleanup(() => window.removeEventListener('keydown', handler));
  });

  return (
    <div style={visible() ? undefined : 'display:none'}>
      <div class="panel" style="max-width:520px;margin:2rem auto;text-align:center">
        <h2 style="margin-bottom:0.5rem">{info.title}</h2>
        <div style="text-align:left;margin:1.5rem 0">
          {info.lines.map(line => <p style="margin:0.4rem 0;color:var(--fg)">{line}</p>)}
        </div>
        <p class="muted" style="margin-bottom:1.5rem">Keys: <span class="mono">{info.keys}</span></p>
        <button class="primary" onClick={dismiss} style="width:100%">
          Ready — Press Space
        </button>
      </div>
    </div>
  );
}
