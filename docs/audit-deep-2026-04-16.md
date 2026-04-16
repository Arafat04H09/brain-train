# Intellect Forge — Deep Audit

Follow-up to `audit-2026-04-16.md`. Your questions: **what data are we using, why not OSS, do the questions make sense, are they training what we claim, what decisions have I quietly made?**

Short version: **calibration content is now real OSS. Everything else is procedurally generated, and each paradigm has known drift from its canonical version that's worth knowing about.** Some drift is acceptable MVP simplification; some crosses the line into "trains something different than it claims."

---

## 1. Data sources — inventory

### Calibration items (fixed today)
- **10,431 real items** from three verified OSS sources bundled into `items.json`
  - MMLU 6,769 items (MIT, Hendrycks 2020) — academic subjects across 5 buckets
  - OpenTriviaDB 2,999 items (CC-BY-SA) — general knowledge trivia
  - TruthfulQA 664 items (Apache-2.0, Lin 2021) — misconception-trap items (good for the overconfidence range)
- Regression-guard test enforces every item ID prefix is `mmlu-/otdb-/tqa-` so no synthetic content can sneak back in.

### Training module stimuli — all procedurally generated
None of these modules use external data. They generate stimuli on the fly with seeded PRNGs:
- **Dual n-back** — positions/letters from fixed sets (8 consonants: C,H,K,L,Q,R,S,T; 8 grid positions)
- **Complex span (OSpan)** — random math equations + random letters drawn from the n-back consonant set
- **UFOV** — car/truck rectangles + peripheral square + grey triangle distractors, all drawn with canvas primitives
- **Compound EF** — colored shapes (4 colors × 4 shapes × 2 sizes) with flanker and stop-signal layered procedurally
- **Relational Reasoning** — 3×3 matrices with Carpenter rules applied to (shape, color, size, count) attributes

This is fine for most of these. Procedural is standard for cognitive psych tasks. **The exception is UFOV**, where the stimuli matter — see §3.

### Transfer assessment battery
- Matrix reasoning sub-task — **same procedural generator as the Relational Reasoning training module**, with fixed seeds (1, 2, 3, 5, 7). This is a problem — see §4.
- Simple RT — standard paradigm, no external data needed.

---

## 2. Open-source alternatives we're NOT using

Things where OSS-verified alternatives exist and we could switch:

### UFOV stimuli (moderate priority)
- **What we do:** draw rectangles. Blue rect = "car", orange wider rect = "truck".
- **What canonical UFOV uses:** actual vehicle silhouettes at specific contrast/size against a naturalistic backdrop. Original paradigm (Ball & Edwards) has been licensed commercially.
- **OSS alternative:** academic versions published on OSF (search "UFOV task" on osf.io), public-domain car/truck SVG silhouettes (Noun Project, CC0). jspsych-contrib has no UFOV plugin; closest is `jspsych-psychophysics` (kurokida, MIT) which we could use to render real images with precise timing.
- **Why we didn't:** shipped-fast MVP. Stimuli flagged as "acknowledged shortcut" in first audit.

### Compound EF paradigm (moderate priority)
- **What we do:** bespoke multi-dim rule-switching task with our own response mapping.
- **OSS alternative:** **STOP-IT** by Verbruggen (github.com/fredvbrug/STOP-IT, Apache-2.0) is the canonical validated stop-signal task. For task switching, Monsell's cuing paradigm has OSS implementations in jsPsych. For flanker, `jspsych-contrib/plugin-flanker` exists.
- **Why we didn't:** the research dossier recommended a compound task (layering switch + inhibition + interference) specifically because single-paradigm training doesn't transfer (Bollen 2019, which turned out to be null). Combining three canonical OSS tasks would be a real improvement but wasn't trivial.

### Matrix reasoning items (high priority for the assessment battery, low for training)
- **What we do for training:** procedurally generated from Carpenter rules. Fine for training — procedural is standard.
- **What we do for assessment:** *same generator*, just fixed seeds. This is a problem because training on generated matrices + assessment on more generated matrices = near-transfer by definition, not far-transfer.
- **OSS alternative for assessment:** real **ICAR** (International Cognitive Ability Resource) items at icar-project.com — CC-licensed, validated, published. Small set (~60 items across difficulty tiers) but REAL human-psychometric validation. Using these would let us distinguish "got better at our specific generator output" from "general matrix reasoning improved."
- **Why we didn't:** I initially named it "ICAR Matrix" implying we were using them (I wasn't — audit caught this). Just renamed to "Matrix Reasoning". Actual ICAR ingestion is pending.

### N-back audio (low priority)
- **What we do:** SpeechSynthesis (OS text-to-speech). Variable timing, pronunciation varies across platforms.
- **OSS alternative:** pre-record 8 letter WAVs. Brain Workshop ships with such recordings; those are GPL (you're fine since it's personal use; for redistribution would need re-record).
- **Why we didn't:** noted in agenda, low priority.

---

## 3. Do the questions/stimuli actually train what we claim?

Per module:

### Working Memory (dual n-back + complex span) — ✅ Clean
- **Claims:** train working-memory updating capacity
- **Reality:** implementation is faithful to Jaeggi 2008. 8-consonant set is canonical. 500ms stim / 2500ms ISI / 3000ms SOA matches the published timing. Per-stream d-prime promotion rule (≥1.5 both streams) is slightly stricter than Jaeggi's 90%/75% accuracy rule but more robust to the "passive no-press" accuracy inflation problem.
- **What's being trained:** genuinely WM updating.
- **Known caveat:** the research on whether this transfers to fluid intelligence is contested (Melby-Lervåg et al. 2016 meta-analysis vs Soveri 2017). We're neutral on the far-transfer claim; near-transfer (you'll get better at n-back + span) is robust.

### UFOV (perceptual speed) — ⚠️ Partial
- **Claims:** train useful field of view / processing speed
- **Reality:** the paradigm structure is correct (4 subtests, mandatory mask, QUEST adaptation on display duration). But the stimuli are abstract rectangles, not vehicles.
- **What's being trained:** discrimination of rectangle aspect ratio at short display durations, with peripheral localization. This is *closer to* general speeded visual attention than specifically "UFOV." Real UFOV uses naturalistic, complex stimuli specifically because the pipeline-to-driving transfer relies on ecological similarity.
- **Honest claim:** "speeded visual attention training" rather than "UFOV training." The core computation (shortening stim duration until accuracy drops) is paradigm-faithful.

### Compound EF — ⚠️ Most concerning
- **Claims:** train executive function via layered inhibition + task-switching + interference
- **Reality:** bespoke task. Not published. Response mapping (A=red/circle/small, etc.) couples three dimensions per key — unusual. No external validation.
- **What's being trained:** **this specific task.** Skill at deciding color-vs-shape-vs-size by a pre-cue while ignoring flanking stimuli and occasionally withholding on a red border. Karbach & Kray 2009 showed "variable training" (rotating stimuli/rules across sessions) is essential for EF transfer — we rotate rules within session but the stimulus alphabet (4 colors × 4 shapes × 2 sizes = 32 combos) and response mapping are fixed across sessions.
- **Honest claim:** this module trains the task. Whether it transfers to real-world EF is unknown. The research dossier flagged this as the weakest-evidence module.

### Relational Reasoning — ✅ Solid
- **Claims:** train analogical/pattern reasoning on Raven-style matrices
- **Reality:** Carpenter, Just & Shell 1990 rules implemented faithfully (3 of their 5 rules, skipping the harder distribution-of-two and figure addition). I-RAVEN distractor strategy — each foil violates exactly one rule. After the generator rewrite, puzzles are genuinely inferable.
- **What's being trained:** matrix rule-abstraction. Likely transfers to other Raven-style items. Transfer to broader fluid reasoning is the same question as for WM — debated.
- **Caveat:** we have no IRT difficulty calibration. `ruleCount` 1/2/3 is our own difficulty proxy, not psychometrically validated.

### Calibration — ✅ Now real, minor concerns
- **Claims:** train probabilistic judgment calibration (Brier minimization)
- **Reality:** items now 100% from OSS banks. Slider is 25-99% (just fixed; was incorrectly 50-99). Feedback flash after each item shows what the correct answer was + user's stated confidence.
- **What's being trained:** calibration on knowledge questions.
- **Caveats:**
  - MMLU (the largest source) is academic and often hard. A lot of items will land in the 25-40% confidence range where users really don't know. That's actually useful for calibration training (you practice being appropriately uncertain) but may feel demotivating if every question is obscure.
  - Category distribution is skewed: logic 4,551 / science 3,862 / estimation 797 / history 710 / geography 512. Session samples 15 random items so you'll hit mostly logic + science.
  - No "I don't know" / abstention option. Research suggests abstention improves calibration training, but we force a pick.

### Transfer assessment — ⚠️ Near-transfer only
- **Matrix:** same procedural generator as training. Re-assessment will show improvement if training improves matrix-making skill *for our specific generator* — that's not the same as cognitive transfer.
- **Simple RT:** clean paradigm, tests pure processing speed baseline. Valid.
- **Honest claim:** RT sub-task measures real processing speed change. Matrix sub-task measures within-generator improvement, not true transfer.
- **Fix:** ingest real ICAR items for the matrix sub-task. Pending.

---

## 4. Design decisions I made vs what research prescribed

Things I chose on my own rather than copying from a citation. Most are defensible but worth knowing:

| Decision | What I did | Research says | My rationale |
|---|---|---|---|
| N-back promotion threshold | d' ≥ 1.5 both streams to promote; ≤ 0.5 either stream for demote | Brain Workshop: 80%/50% accuracy. Jaeggi: 90%/75%. | d' avoids the "no-press scores 80%" inflation problem. Value is my pick — Soveri et al. used d' = 1.2 in some papers. |
| OSpan set size bounds | 2-7 | Engle lab: typically 2-7 or 3-7 | Matches. |
| OSpan promotion rule | partialCredit ≥ 0.9 → +1 size; ≤ 0.5 → -1 | Engle lab uses between-session fixed sizes based on span | My simplification. Real OSpan is usually not adaptive mid-training. |
| UFOV display duration bounds | 16-500ms | Real UFOV: similar range | Fine. |
| Compound EF response mapping | 4 keys × 3 dimensions, coupled | No canonical mapping for our task | Entirely my design. |
| Compound EF block size | 48 trials × 4 blocks | No canonical block sizes | My pick. |
| Compound EF SSD start | 250ms | Verbruggen 2019: 250-300ms start | Matches. |
| Matrix block size | 1 block × 12 items | Real RPM is 60 items untimed | My pick (shorter for daily use). |
| Matrix ruleCount adaptive | +1 at ≥75% accuracy, -1 at <40% | No canonical adaptive rule for matrices | My pick. |
| Calibration session size | 15 items | No standard | My pick. |
| Calibration confidence range | 25-99% (just fixed from 50-99) | Research: half-range for binary. 4-choice chance is 25%. | Now research-appropriate. |
| Orchestrator phase weeks | 1-3 ramp, 4-8 intensive, 9-12 consolidation, 13+ maintenance | Readme spec (from research dossier) | Matches spec; spec itself was AI-synthesized, not from a specific paper. |
| Urgency score formula | `min(daysSinceLast/2, 2) + 0.5·decay - 0.4·plateau` | No canonical formula | My design. |
| Session composition picks | Ramp=1 domain; Intensive=2 with interleaving; Consolidation=2; Maintenance=1 | Readme spec | Matches spec. |
| Session-target minutes | 25 | Research: 25-30 min/day optimal (Belleville 2018) | Matches. |
| Fixation pre-cue duration | 500ms | No canonical value, common is 300-500ms | Fine. |
| UFOV trials per subtest | 20 | Real UFOV: similar range, QUEST needs ~20-30 | Fine. |
| RT assessment: reject <100ms and >1500ms | Standard outlier rule | Real SRT studies: 100-1500ms typical cutoffs | Matches. |

---

## 5. Where validity is genuinely uncertain

### Far transfer
Every training module shows within-task improvement (that's just practice). **No claim that this transfers to real-world cognition has been validated for any of our modules**, because:
- Our Compound EF paradigm is not published → no transfer data exists for it specifically
- Our UFOV rectangles aren't real UFOV stimuli → ACTIVE trial's 20-year dementia findings don't apply directly
- Our Matrix module uses procedural items not validated against real fluid-intelligence tests
- Our transfer assessment matrix task uses the same generator as training → measures near-transfer by definition

This is **acknowledged** in the research dossiers and not hidden, but the app currently makes no honesty-framing visible to the user. Readme § "Honest Framing" is emphatic about this — we should probably add an About page reflecting it.

### Novel-paradigm validity
"Compound EF" and "Matrix Reasoning (our version)" are paradigms we invented by assembling research components. They haven't been validated as a block. Near-transfer works by construction; far-transfer is unknown.

### Item-quality ceiling on calibration
With 10.4k real items, you can train for months without repeats. But:
- MMLU academic items may be **too hard** to give you useful calibration range on the 40-80% band
- TruthfulQA is deliberately adversarial — its items teach you to spot common misconceptions, which is calibration training, but biased toward specific misconception patterns (political, folk-belief)
- OpenTriviaDB is the best-calibrated source for general knowledge
- Our session selection is random. A smarter pick would sample across difficulty to ensure a spread.

---

## 6. Recommended priority fixes

1. **Ingest real ICAR items for the transfer-assessment matrix sub-task** (~60 items, CC-licensed, validated). This is the most impactful change for assessment validity — makes the matrix score actually measure transfer, not same-generator improvement.

2. **Add an About / Honesty page** reflecting readme §"Honest Framing". State plainly: modules train specific trained capacities; far-transfer is contested and our novel-paradigm modules have no transfer data.

3. **Swap Compound EF for canonical components** — use STOP-IT (Verbruggen, Apache-2.0) for stop-signal, `jspsych-contrib/plugin-flanker` (MIT) for flanker, and a simple Monsell-style task-switching implementation. Rotating which canonical task runs each session (Karbach-Kray "variable training") is the research-supported approach to EF transfer.

4. **Better UFOV stimuli** — use CC0 vehicle SVGs from Noun Project or equivalent. Preserves paradigm intent while not misleading about stimulus design.

5. **Calibration difficulty stratification** — sample 15 items per session across easy/medium/hard rather than random. Ensures usable spread across confidence bins.

6. **Pre-recorded letter WAVs for n-back audio** — timing reliability (noted in agenda).

---

## Summary

**Trust level by module:**
- Working Memory (n-back + OSpan): **high** — faithful to Jaeggi/Engle
- Relational Reasoning: **high** — faithful Carpenter rules, good distractors
- Calibration: **high for content** (now real OSS), **high for scoring** (canonical Brier + Murphy decomposition)
- UFOV: **medium** — correct paradigm structure, wrong stimuli
- Compound EF: **medium-low** — novel paradigm, unvalidated
- Transfer assessment (matrix): **low** — measures near-transfer, not real transfer
- Transfer assessment (RT): **high** — canonical simple RT

**What I made up without external grounding:** roughly half the parameter values (adaptive thresholds, block sizes, urgency formula), all of Compound EF design, the matrix difficulty scheme. Most are reasonable heuristics; none are validated.
