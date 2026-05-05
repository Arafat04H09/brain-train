# Intellect Forge

**Evidence-based cognitive training suite grounded in peer-reviewed neuroscience.**

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38b2ac)](https://tailwindcss.com)

## Features

- **Perceptual Speed Engine** — UFOV-based visual processing training with frame-level timing control
- **Working Memory Forge** — Dual n-back + complex span with adaptive difficulty (QUEST Bayesian staircase)
- **Compound Executive Controller** — Multi-layered inhibition, task-switching, and interference management
- **Relational Reasoning Lab** — Analogical, anomalous, antithetical, and antinomous reasoning tasks
- **Calibration Engine** — Metacognitive monitoring with confidence calibration feedback
- **Adaptive Orchestrator** — Urgency-based scheduling, dose limits (30 min/day max), booster protocols
- **Transfer Assessment Battery** — Periodic untrained-task assessments to measure generalization
- **Zero Shortcuts** — Complex compound tasks (not simple Stroop/Go-NoGo), evidence-based design, honest framing

## Architecture

```
Training Modules (5)
├── Perceptual Speed (UFOV paradigm)
├── Working Memory (Dual n-back + complex span)
├── Executive Control (Compound multi-layer tasks)
├── Relational Reasoning (4 reasoning operations)
└── Calibration (Confidence monitoring)

Orchestrator
├── Scheduling (Initial ramp → Intensive → Maintenance)
├── Dose Enforcement (25-30 min/session cap)
├── Booster Management
└── Transfer Tracking
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/brain-train.git
cd brain-train
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing

```bash
npm test
```

### Build

```bash
npm run build
```

## Key Algorithms

- **QUEST Bayesian Staircase** — Efficient threshold estimation for speed training
- **CUSUM (Cumulative Sum)** — Online performance tracking across domains
- **d-prime (Signal Detection Theory)** — Distinguishes sensitivity from bias in speed/attention tasks
- **3-up/1-down Staircase** — Targets ~79% accuracy for working memory and executive control
- **Brier Score** — Calibration error quantification

See [docs/RESEARCH.md](docs/RESEARCH.md) for full research context and methodology.

## Design Principles

1. **Adaptive difficulty is non-negotiable** — Fixed-difficulty training shows zero transfer
2. **Complexity beats simplicity** — Compound tasks transfer; single-paradigm tasks don't
3. **Spacing and interleaving required** — Gaps between sessions and mixed task types within sessions
4. **Display duration, not reaction time** — Speed training uses stimulus presentation thresholds (16-500ms)
5. **Dose plateau at 12-14 sessions** — Optimal dose is 25-30 min/day, 6 days/week
6. **Metacognition is the multiplier** — Calibration training transfers more broadly than domain training

## Honest Framing

> "These tools train specific cognitive capacities — processing speed, working memory, executive control, relational reasoning, and metacognitive calibration. The strongest evidence shows that processing speed training produces lasting real-world improvements and may reduce dementia risk. Combined with adequate sleep and regular exercise, this training optimizes the biological substrate on which all cognition runs."

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Research Foundation

This project was designed after extensive review of the cognitive training literature. Key studies:

- **ACTIVE Trial** (Ball et al. 2002, Willis et al. 2006, Rebok et al. 2014): 2,832 participants, 10-20 year follow-up showing speed training produces 29% lower dementia incidence
- **Dual N-Back Meta-Analysis** (Soveri et al. 2017): 2,105 participants, small but significant fluid intelligence transfer
- **Adaptive vs. Fixed Training** (Brehmer et al. 2012): Adaptive produced transfer and neural plasticity; fixed did not
- **Complex vs. Simple Executive Training** (Bollen et al. 2019): Simple tasks showed no transfer; compound tasks transferred to reasoning

See [docs/RESEARCH.md](docs/RESEARCH.md) for the full knowledge base and 12 foundational research references.

## License

MIT
