# Intellect Forge — Evidence-Based Cognitive Training Suite

## What This Project Is

A suite of cognitive training applications grounded in peer-reviewed neuroscience and cognitive psychology research. Not a toy, not a gamified brain-training app that overpromises. A serious training system targeting the specific cognitive subsystems that underlie effective thinking, with adaptive difficulty, enforced dosing protocols, and honest framing of what the evidence supports.

The goal: build the most scientifically rigorous cognitive training system available as a consumer product.

---

## Before You Build: Research Context

This project was designed after extensive review of the cognitive training literature. The following is a condensed knowledge base. **Read all of it before writing any code.** Every design decision below traces back to specific findings. If you're tempted to simplify something, check whether the complexity is load-bearing (it usually is).

### What IQ Tests Actually Measure

IQ tests measure "g" — a statistical construct (general cognitive ability) emerging from correlations across diverse mental tasks. g is NOT a single brain mechanism. A 2012 study of 100,000+ participants (published in Neuron) found intelligence involves at least three independent factors — short-term memory, reasoning, and verbal ability — with distinct brain activation patterns.

The most useful decomposition is Cattell's (1963) framework:

- **Fluid intelligence (Gf):** Novel problem-solving, pattern recognition, abstract reasoning. Peaks ~age 27, then declines. Depends on the dorsolateral prefrontal cortex, anterior cingulate cortex, and frontoparietal networks.
- **Crystallized intelligence (Gc):** Accumulated knowledge, vocabulary, expertise. Increases throughout life, modest decline after 65. Relies on hippocampal memory systems and default mode network.

**Process Overlap Theory (Kovacs & Conway, 2016):** g isn't a "thing" — it's a pattern emerging from overlapping cognitive processes. Training one process doesn't necessarily raise the aggregate. This is why most brain training apps fail at "far transfer." The implication: train MULTIPLE overlapping processes simultaneously.

### What The Evidence Says About Training

**What clearly works:**
- Working memory training (dual n-back) improves working memory capacity. Transfer to fluid intelligence is small but significant (~3-4 IQ points equivalent, dose-dependent). 2017 meta-analysis of 2,105 participants confirmed.
- Processing speed training (UFOV paradigm) has the STRONGEST real-world transfer evidence of any training type. The ACTIVE trial (N=2,832, 20-year follow-up) showed speed training produced 2.5 SD improvement, 29% lower dementia incidence at 10 years, effects lasting 10-20 years.
- Metacognitive calibration training transfers more broadly than pure cognitive training. Predicts real-world decision quality better than IQ.

**What's genuinely debated:**
- Whether working memory training transfers to fluid intelligence broadly (meta-analyses conflict).
- Whether any single-domain training raises general intelligence (Process Overlap Theory says no — the hierarchical structure of intelligence prohibits transfer from subfactors back up to g).

**What clearly doesn't work:**
- Memory strategy training (mnemonic techniques) — the ACTIVE trial showed no long-term benefits.
- Simple single-paradigm inhibition training (Go/NoGo alone, Stroop alone) — fails to transfer.
- Fixed-difficulty training — dramatically worse than adaptive training across all domains.

### The Six Critical Design Principles From Research

#### 1. Adaptive Difficulty Is Non-Negotiable
Adaptive training resulted in transfer to untrained tasks; fixed-difficulty training did not. In an RCT, only the adaptive group showed significant improvement in verbal memory, verbal fluency, sustained attention, concentration, and processing speed. The constant-difficulty group showed NO significant gains. The mechanism: adaptive difficulty keeps the brain in the zone of productive struggle (~70-80% accuracy), which is where neural plasticity occurs.

#### 2. Complexity Beats Simplicity for Executive Function
Simple Go/NoGo or Stroop training produces no transfer. Complex compound tasks that layer inhibition + task-switching + interference management DO transfer. The active ingredient is complexity — multiple executive demands simultaneously.

#### 3. Spacing and Interleaving Beat Massed Practice
Spacing (gaps between sessions) restores depleted working memory resources. Interleaving (mixing different task types within a session) forces discrimination and memory retrieval. These are separate mechanisms — both are needed. Sessions should interleave different cognitive demands.

#### 4. Display Duration, Not Reaction Time, Is Key for Speed Training
The UFOV paradigm trains perceptual thresholds — how briefly a stimulus can appear (16-500ms) while still being processed. This is fundamentally different from "react as fast as you can" training. The brain becomes more efficient (reduced neural effort for same work), and this transfers to real-world tasks like driving.

#### 5. Dose-Response Has A Ceiling
For adults under 60: optimal dose is 25-30 minutes per day, 6 days per week. Plateau after 12-14 sessions — more sessions don't mean better results. The ACTIVE trial used only 10 hours total initial training with periodic boosters, and effects lasted 10-20 years. Apps MUST enforce session time limits and transition to booster scheduling after the initial ramp.

#### 6. Metacognition Is The Multiplier
Metacognitive training (specifically calibration — knowing what you know and don't know) transfers more broadly than any other training type. The protocol is: answer → rate confidence → receive calibration feedback. This three-step loop should be embedded as an overlay in ALL training domains, not just as its own module.

---

## Architecture

### The Six Training Domains

Each domain targets a specific cognitive subsystem with the strongest available evidence. They are listed in order of evidence strength for real-world transfer.

#### 1. Perceptual Speed Engine (UFOV-Based) — FLAGSHIP
**What it trains:** Visual processing speed, divided attention, selective attention
**Neural targets:** Visual attention networks, frontoparietal efficiency
**Evidence strength:** Strongest of any cognitive training paradigm (ACTIVE trial, 20-year follow-up, 29% reduced dementia risk)

**Task design:**
- Central target identification (e.g., distinguish object A from object B)
- Simultaneous peripheral target localization (where did the peripheral stimulus appear?)
- Progressive distractor addition (visual clutter increases)
- **Adaptive variable: display duration in milliseconds** (NOT reaction time). Stimuli appear for 16-500ms. Difficulty increases by SHORTENING display time, not by adding time pressure.
- Three subtests of increasing complexity:
  1. Focused attention (central target only)
  2. Divided attention (central + peripheral target)
  3. Selective attention (central + peripheral + distractors)
- Threshold tracking: find the minimum display duration at which user achieves 75% accuracy

**Implementation notes:**
- Requires precise timing control (frame-level accuracy matters — 16.67ms per frame at 60Hz)
- Adaptive staircase procedure: 3-up/1-down or QUEST-like algorithm for threshold estimation
- Session structure: blocks of 20-30 trials per subtest, ~8-10 minutes per session

#### 2. Working Memory Forge (Dual N-Back + Complex Span)
**What it trains:** Working memory updating, capacity for simultaneous information manipulation
**Neural targets:** Dorsolateral prefrontal cortex, frontoparietal network
**Evidence strength:** Strong for near transfer (working memory improvement). Small but significant for fluid intelligence transfer (~3-4 IQ points equivalent). Dose-dependent — more training = stronger effects.

**Task design — Dual N-Back:**
- Simultaneous visual (grid position) and auditory/visual (letter) streams
- User identifies when current stimulus matches the one N trials back
- Adaptive N-level: increase N when accuracy > 80%, decrease when < 50%
- 20+ trials per block, multiple blocks per session

**Task design — Complex Span (supplement to n-back):**
- Alternating memoranda and processing tasks (e.g., remember a letter, then solve a math problem, then remember another letter, then recall all letters in order)
- The processing component is what distinguishes working memory from short-term memory
- Adaptive: increase set size and processing difficulty

**Implementation notes:**
- N-back: track position matches and letter matches independently. Show separate hit/miss/false-alarm rates.
- Interleave n-back blocks with complex span blocks within sessions
- Audio feedback for matches (if building native app) or visual letter presentation (if web)

#### 3. Compound Executive Controller
**What it trains:** Inhibition, task-switching, interference management — simultaneously
**Neural targets:** Anterior cingulate cortex, dorsolateral prefrontal cortex, inferior frontal gyrus
**Evidence strength:** Strong, BUT only when tasks are compound/complex. Simple single-paradigm training (Go/NoGo alone, Stroop alone) does NOT transfer.

**Task design — NOT simple Stroop or Go/NoGo. A layered compound task:**
- Base layer: categorize stimuli by one rule (e.g., color)
- Rule switching: cue indicates which rule to apply (color vs. shape vs. size). Rules alternate unpredictably.
- Inhibition layer: on some trials, a stop signal appears — withhold response
- Interference layer: distractors appear that conflict with the correct response (flanker-like)
- All layers active simultaneously at higher difficulty levels

**Difficulty dimensions (adaptive on all simultaneously):**
1. Number of active rules (2 → 3 → 4)
2. Switch frequency (how often the rule changes)
3. Stop-signal delay (shorter = harder to inhibit)
4. Distractor congruency ratio (more incongruent = harder)
5. Time pressure (response window shortens)

**Implementation notes:**
- Track "switch cost" (RT difference between switch and non-switch trials) as a key metric
- Track commission errors (failures to inhibit) separately from accuracy errors
- The compound nature is the active ingredient — do NOT simplify into separate simple tasks

#### 4. Relational Reasoning Lab
**What it trains:** Abstract relational encoding, analogical reasoning, pattern extraction
**Neural targets:** Rostrolateral prefrontal cortex, frontoparietal network
**Evidence strength:** Moderate-strong. Matrix reasoning directly loads on Gf. Relational reasoning component processes (encode, infer, map, apply) transfer across reasoning types.

**Task design — Four relational operations:**
1. **Analogical:** What's similar? (A:B :: C:?) — Classic matrix completion, verbal analogies, cross-domain structural mapping
2. **Anomalous:** What doesn't belong? — Odd-one-out tasks where the outlier is defined by relational, not surface, features
3. **Antithetical:** What's opposite? — Identify inverse relationships, negation patterns
4. **Antinomous:** What's paradoxically both? — Resolve contradictions, identify when two opposing things are simultaneously true

**Matrix puzzle design:**
- 3x3 grids with rules governing rows AND columns
- Rules: rotation, progression, distribution of elements, logical operators (AND, OR, XOR)
- Difficulty scales by: number of rules active simultaneously, rule complexity, number of elements per cell
- Distractors in answer options should be systematically designed (e.g., correct shape but wrong transformation, correct on one rule but not another)

**Critical design point:** Force relational encoding over surface matching. Vary surface features (colors, shapes, sizes) extensively while keeping relational structure constant. This prevents users from learning pattern-matching shortcuts rather than actual relational reasoning.

#### 5. Calibration Engine
**What it trains:** Metacognitive monitoring accuracy, confidence calibration, decision quality
**Neural targets:** Medial prefrontal cortex, anterior insula (metacognitive monitoring networks)
**Evidence strength:** Strong for transfer. Metacognition predicts academic and real-world outcomes beyond what IQ explains. Calibration training generalizes broadly.

**Task design — Three-step protocol:**
1. **Answer:** Knowledge/reasoning question across varied domains (science, history, geography, logic, estimation, current events)
2. **Rate confidence:** 0-100% — "How likely is it that your answer is correct?"
3. **Wager (optional advanced mechanic):** "Would you bet points on this?" — Engages loss-aversion circuits, produces sharper calibration than confidence ratings alone

**Calibration feedback:**
- Show running calibration curve: X-axis = stated confidence bins (0-20%, 20-40%, etc.), Y-axis = actual accuracy in that bin
- Perfect calibration = diagonal line. Above the line = overconfident. Below = underconfident.
- Show Brier score (mean squared difference between confidence and outcome) as a single calibration metric
- Track calibration improvement over sessions

**Question design:**
- Questions must span many domains to prevent it from becoming a trivia game
- Include estimation questions ("How many X are there in Y?") — these train calibration for quantitative reasoning
- Include questions with varying knowability — some answerable from knowledge, some requiring inference, some genuinely uncertain
- Periodically include questions with no right answer to train the "I don't know" response

#### 6. Orchestrator (Scheduling & Analytics Layer)
**What it does:** Manages interleaving across domains, enforces dose limits, schedules boosters, tracks transfer metrics

**Scheduling logic:**
- **Initial ramp (weeks 1-3):** Rotate through all 5 training domains, one per day, 25-30 min each. 6 days/week, 1 rest day.
- **Intensive phase (weeks 4-8):** Continue daily rotation but increase within-session interleaving (e.g., alternate between 2 domains within one session)
- **Maintenance phase (week 9+):** Reduce to 3-4 sessions/week. Auto-schedule booster sessions for domains showing plateau or decline.
- **Hard cap:** 30 minutes per day maximum. Enforce this. Research shows no additional benefit past this dose.

**Analytics:**
- Per-domain performance curves (improvement rate, not just score)
- Cross-domain transfer tracking: periodic brief assessments using UNTRAINED tasks to measure whether gains are generalizing
- Correlation dashboard: if user logs sleep hours and exercise, show correlation with next-day cognitive performance
- Calibration overlay: embed metacognitive predictions ("predict your score on this next block") within all domains, not just the Calibration Engine

**Metacognitive overlay for all domains:**
Before each training block in ANY domain, ask the user: "Predict your accuracy on this block (%)". After the block, show predicted vs. actual. This trains metacognition within every training context — the research suggests this cross-context metacognitive practice is what enables broad transfer.

---

## Technical Considerations

### Platform
- Decide: native mobile (iOS/Android), web app (React/Next.js), or desktop (Electron/Tauri)
- UFOV-based speed training requires precise frame-level timing. Web may have issues with display duration accuracy below ~33ms (30fps). Consider:
  - requestAnimationFrame for timing
  - Performance.now() for measurement
  - Test actual display duration accuracy on target devices
  - Native may be required for the speed training module specifically

### Adaptive Algorithm Design
- Use a **dual-loop adaptive system:**
  1. **Performance loop:** Continuous difficulty adjustment using a modified staircase procedure (3-up/1-down targets ~79% accuracy threshold). Track performance over a rolling window, not just last trial.
  2. **Metacognitive loop:** Periodic prediction prompts (every 3-5 blocks). Compare predicted vs. actual performance. Feed this into calibration analytics.
- Consider Bayesian adaptive procedures (QUEST/ZEST) for threshold estimation in the speed training module — more efficient than fixed staircases.

### Data Model
- All sessions stored locally with optional sync
- Key metrics per session: domain, date, duration, trials completed, accuracy, adaptive difficulty level reached, metacognitive prediction accuracy
- Aggregate metrics: improvement rate (slope of performance over sessions), calibration error (Brier score), switch cost trends, working memory capacity (max N sustained at >70% accuracy)

### What NOT To Build
- Do NOT add social features, leaderboards, or competitive elements. Research shows these shift motivation from intrinsic (required for plasticity) to extrinsic (undermines training effects).
- Do NOT add streak-breaking penalties or loss-aversion gamification. Enforce rest days without punishment.
- Do NOT use "brain age" or IQ-equivalent scores. These are scientifically unsupported and misleading. Show raw performance metrics and improvement trajectories.
- Do NOT allow unlimited training. Cap sessions. The research is clear that more is not better past 25-30 minutes.

---

## Honest Framing

The product should never claim to "increase IQ" or "make you smarter." The evidence-supported framing is:

> "These tools train specific cognitive capacities — processing speed, working memory, executive control, relational reasoning, and metacognitive calibration — that are ingredients of effective thinking. The strongest evidence shows that processing speed training produces lasting real-world improvements and may reduce dementia risk. Other domains show reliable improvement on trained capacities, with debated but possible transfer to broader cognitive function. Combined with adequate sleep (7-9 hours) and regular exercise (150+ min/week moderate), this training optimizes the biological substrate on which all cognition runs."

---

## Key Research References

These are the studies backing every design decision above. Consult them if you need to resolve ambiguity:

1. **ACTIVE Trial:** Ball et al. (2002), Willis et al. (2006), Rebok et al. (2014). N=2,832, 10-20 year follow-up. Speed of processing training = strongest results. Published in JAMA. 2026 update from Johns Hopkins extends to 20-year outcomes.
2. **Dual N-Back Meta-Analysis:** Soveri et al. (2017). N=2,105. Small but significant effect on fluid intelligence, dose-dependent.
3. **Adaptive vs. Fixed Training:** Brehmer et al. (2012) in NeuroImage. Adaptive training produced transfer and neural plasticity; fixed did not.
4. **COGNI-TRAcK RCT:** Pedullà et al. (2016). Adaptive training improved verbal memory, fluency, attention, processing speed. Non-adaptive showed no gains.
5. **Complex vs. Simple Executive Training:** Bollen et al. (2019) in NeuroImage. Simple Go/NoGo = no transfer. Complex compound tasks = transfer to reasoning.
6. **Metacognition > IQ for outcomes:** Butler et al. (2017) in Thinking Skills and Creativity. Critical thinking predicted life events more strongly than intelligence.
7. **Dose-Response:** Belleville et al. (2018) in Alzheimer's & Dementia. Plateau after 12-14 sessions. Under-60 optimal dose: 25-30 min/day, 6 days/week.
8. **Process Overlap Theory:** Kovacs & Conway (2016) in Psychological Inquiry. g is not a causal entity — it's an emergent pattern from overlapping processes.
9. **UFOV Mechanism:** O'Brien et al. (2020). Training reduces neural effort, strengthens resting-state connectivity in visual attention and executive function networks.
10. **Relational Reasoning Training:** Alexander et al. (2016) in npj Science of Learning. Four component processes (encode, infer, map, apply) transfer across reasoning types.
11. **Calibration Training:** Hacker et al. (2008). Two weeks of monitoring accuracy training improved calibration in students.
12. **Speed Training & Dementia:** Edwards et al. (2017) in Alzheimer's & Dementia. Speed training = 29% lower dementia incidence at 10 years. 2026 Johns Hopkins update extends to 20-year outcomes.

---

## Development Priority Order

1. **Perceptual Speed Engine** — Strongest evidence, most novel implementation challenge (frame-level timing), flagship feature
2. **Orchestrator** — Needed to enforce dosing and scheduling from day one
3. **Working Memory Forge** — Well-understood paradigm, relatively straightforward to implement
4. **Compound Executive Controller** — Complex design, high value
5. **Calibration Engine** — Can be partially implemented as overlay in other modules first
6. **Relational Reasoning Lab** — Requires the most content generation (puzzle/question databases), build last

---

## Summary For The AI

You are building a cognitive training system that takes the science seriously. The existing commercial products (Lumosity, Peak, Elevate) are gamified toys with weak evidence. BrainHQ is the closest to rigorous but is designed for older adults and clinical populations. Nothing exists that combines UFOV-based speed training, compound executive function training, relational reasoning across four operation types, metacognitive calibration, and adaptive n-back — all within an evidence-based dosing and scheduling system — for a general adult audience.

That's what this is. Build it right.