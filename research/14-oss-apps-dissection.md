# 14 — Open-Source Cognitive Training Apps: Dissection

Round 2 research. Focus: OSS apps that actually ship to real users (not research toolkits).
Extracting architecture, UX, storage, pitfalls, and gaps we can fill.

---

## 1. Shipping OSS Apps — Comparison Table

| App | URL | License | Stack | Activity | Stars/Forks | What it does | Adaptive? |
|-----|-----|---------|-------|----------|-------------|--------------|-----------|
| **Brain Workshop** (brain-workshop fork) | github.com/brain-workshop/brainworkshop | GPL-2.0 | Python + Pyglet | v5.0.3, Feb 2024 (active issues Jan 2026) | 335 / 52 | Canonical dual n-back suite (Dual, Triple, Position, Audio, Arithmetic, Combo) | Yes — 80% advance / 50% fallback (Jaeggi: 90/75) |
| **Brain Workshop Web port** (mentasuave01) | github.com/mentasuave01/brainworkshop | MIT | TS + Solid.js + Vite + Web Audio/Speech API | 19 commits, recent | 5 / — | Browser port of Brain Workshop. Local storage, multiple profiles. | Yes, inherits thresholds |
| **hindol/dual-n-back** | github.com/hindol/dual-n-back | Unspecified | React + TS (CRA) | ~31 commits, stale | 0 / 0 | Plain DNB, demo at hindol.github.io | Basic |
| **jperryhouts/Dual-N-Back** | github.com/jperryhouts/Dual-N-Back (dual-n-back.io) | GPL-3.0 | Vanilla JS + HTML, Vitest/Playwright | Active | — | DNB, 3s SOA, 20+N trials, N ↑/↓ per round | Yes, not threshold-exposed |
| **4skinSkywalker/3D-N-back** | github.com/4skinSkywalker/3D-N-back | Unspecified | HTML/JS | Inactive, split into Cubeception / Cube-in-Middle / Hyper | 18 / — | 3D DNB variants (up to quad/hyper n-back) | Yes |
| **tmlbl/nback** | github.com/tmlbl/nback | — | JS | Old | — | PNAS-spec DNB | — |
| **alexjago/dual-n-back** | github.com/alexjago/dual-n-back | — | HTML + audio files | Old | — | Academic-style DNB experiment page | — |
| **Anki (desktop)** | github.com/ankitects/anki | Custom (AGPL-like) | **Rust 46% core**, Python 29%, Svelte 11%, TS 11%, SQLite | 25.09.2 (Sep 2025) | 27.5k / 2.9k | SR flashcards — gold standard | SM-2 + FSRS |
| **AnkiDroid** | github.com/ankidroid/Anki-Android | GPL-3.0 / AGPL-3.0 / LGPL-3.0 | Kotlin 96%, SQLite | v2.23.3 Jan 2026 | 11k / 2.8k | Android port, AnkiWeb sync | FSRS (now default) |
| **Mnemosyne** | github.com/mnemosyne-proj/mnemosyne | OSS | Python 49%, C 46%, PyQt6 | v2.11 Nov 2023 | 576 / 84 | SR flashcards + optional research data upload (off by default) | Custom SM-2 variant |
| **FSRS / open-spaced-repetition** | github.com/open-spaced-repetition | MIT-style | Rust/TS/Py/Ruby/Go ports | Very active | 10k+ across repos | Algorithm library, not an app — but the algo used by Anki | DSR (Difficulty-Stability-Retrievability) model |
| **Habitica** | github.com/HabitRPG/habitica | GPL-3.0 / CC-BY-SA | Node/Express/MongoDB/Vue | v5.47.5, ~daily commits | 13.8k / 4.4k | RPG-ified habit tracker. Reference for gamification architecture, not cognition. | N/A |
| **vamuigua/reaction-time** | github.com/vamuigua/reaction-time | — | Vue 3 PWA | Shipping | — | Reaction-time test, PWA (desktop+mobile) | — |
| **SampleU** (ESM) | github.com/forzaz/Mobile-Experience-Sampling-Master | OSS | Cordova / HTML+JS+CSS | Research shipping | — | ESM/EMI data collection app, iOS+Android | Scheduled prompts |
| **ESMira** | (ESMira GitHub) | OSS, decentralized | Android/iOS + self-host server | Published 2023 | — | Decentralized ESM platform | Scheduled |
| **mobileQ** | mobileq.org | OSS | Web dashboard + Android | Active | — | ESM / EMA | Scheduled |
| **jsPsych** (toolkit, not app) | github.com/jspsych/jsPsych | MIT | JS/TS | Very active | — | Build-your-own cognitive experiment in browser. Powers many deployed studies. | Plugin-based |

### What DOESN'T exist OSS (the gaps we'd fill)

1. **No shipping OSS suite covering UFOV / perceptual speed** — every OSS cognitive app is either (a) DNB-only, (b) SR flashcards, or (c) a research toolkit. Useful field of view trainers are locked inside Posit Science / BrainHQ.
2. **No OSS Stroop/Flanker/Go-NoGo daily-use app for mobile.** Implementations exist only inside PsychoPy / OpenSesame / jsPsych research scripts — not consumer apps.
3. **No OSS relational reasoning / matrix-reasoning trainer.** pyRavenMatrices is a problem-generator library. No user-facing trainer.
4. **No OSS suite combining multiple paradigms with a unified adaptive engine and longitudinal stats.** Brain Workshop is DNB-only; Anki is SR-only; nobody has done the Lumosity/BrainHQ shape honestly.
5. **No OSS mobile-first cognitive trainer with ms-grade timing.** Brain Workshop has no Android port (issue #67, still open Jan 2026). AnkiDroid is mobile but is SR only.
6. **No OSS trainer with integrated EMA/state-capture** (mood, sleep, caffeine) alongside cognitive sessions — this could be a differentiator.
7. **No OSS trainer that honestly exposes calibrated floor/ceiling to the user instead of gamified "brain age" scores.**

---

## 2. Brain Workshop — Deep Dissection

Source: `brainworkshop.py` in github.com/brain-workshop/brainworkshop. GPL-2.0 (we cannot copy code verbatim; algorithms and UX are fair game).

### 2.1 Config system

Single `config.ini` with a ConfigParser-based loader. Defaults are embedded in the Python source as a `CONFIGFILE_DEFAULT_CONTENTS` string (lines ~220–520); on first run or stale version the file is regenerated. Hundreds of knobs (timing, colors, sounds, modalities, thresholds) are editable without a UI. If older than v4.8 it is auto-upgraded.

```python
# Approximate — from parse_config()
config = ConfigParser.ConfigParser()
config.read(os.path.join(get_data_dir(), configpath))
```

Key constants:
- `TICK_DURATION = 0.1` (100 ms tick)
- `TICKS_4 = 35` → ~3.5 s per trial for mode 4 (classic DNB SOA)
- `THRESHOLD_ADVANCE = 80`
- `THRESHOLD_FALLBACK = 50`
- `THRESHOLD_FALLBACK_SESSIONS = 3` (3 sub-threshold sessions before decreasing)
- `JAEGGI_ADVANCE = 90`, `JAEGGI_FALLBACK = 75` (the original study values)
- `ROLLOVER_HOUR = 4` (sessions before 4 AM count as previous day — massive UX win)

### 2.2 Adaptive N logic (paraphrased)

Two modes coexist:

- **Default BW scoring:** combined score across modalities must exceed 80% to bump N. Fall below 50% for `THRESHOLD_FALLBACK_SESSIONS` (3) consecutive sessions to drop N. Sticky to prevent oscillation.
- **Jaeggi scoring (strict):** score each modality independently; must meet 90% on each to advance; below 75% on any drops N. Selected via `JAEGGI_SCORING = True`.

```python
def get_threshold_advance():
    if cfg.JAEGGI_SCORING:
        return cfg.JAEGGI_ADVANCE
    return cfg.THRESHOLD_ADVANCE
```

The scoring matters: Jaeggi counts each modality separately (so a 95% visual + 80% audio = no advance), while BW's default combines them. Our own implementation should expose both and document the difference loudly — users think they're "on the Jaeggi protocol" when they're on softer BW defaults.

### 2.3 Simultaneous audio + visual stimuli

Modalities are orchestrated as a dictionary in the `Mode` class. Each "trial" is a fixed tick budget (`ticks_per_trial`, e.g. 35 × 100 ms = 3.5 s). All modality stimuli for a trial are scheduled at the same tick-0 boundary, then the remaining ticks are silent response window. Pyglet's `pyglet.clock.schedule_interval` runs the tick loop; audio is dispatched via Pyglet media sources.

**Lesson:** a single monotonic tick clock per trial is easier to reason about than independent timers per modality. This matters for us: in JS use a single `requestAnimationFrame` loop driven by `performance.now()` deltas; don't `setTimeout` each stimulus independently.

### 2.4 Stats & export format

- Primary: `stats.txt` (CSV, comma-separated). One row per session. `Graph.parse_stats()` at line ~2245 reads it.
- Columns include: date, modename, percent, mode, n, ticks, trials, manual, session, per-modality accuracy (position1, audio, color, …).
- Secondary: `logfile.dat` — binary, more granular.
- Sessions rollover at 4 AM so a late-night session stays on the same "day."

Export format is append-only CSV with a schema-versioned header — an accidentally great design because nothing is lost on schema change.

### 2.5 What users complain about (issues, Jan 2026)

Scanning open issues:

1. #67 **Android** — there is no Android version. Has been open for years.
2. #64 Fullscreen broken on Arch Linux.
3. #58 Windows 11: extra terminal window pops up.
4. #57 `stats.txt` missing / not being created.
5. #54 `GAME_MODE` config key ignored.
6. #51 `--configfile` / `--statsfile` path support missing.
7. #43 No graph of manual history.
8. #38 No XDG Base Dir compliance.
9. #68 Multi-target n-back request.
10. #69 Hints during trial (controversial).

**Themes:**
- Platform-packaging pain (Pyglet on modern desktops is fragile).
- No mobile at all.
- Config parser has latent bugs because there's no validation layer.
- No dark mode, no manual-session graphing.
- No user-friendly onboarding; newcomers must read the wiki.

**Not complained about:** timing accuracy, audio latency, adaptive correctness. Pyglet + native audio works well enough.

### 2.6 UX quirks worth noting

- **Config is the UX.** There's no settings screen beyond a keyboard-driven menu; most customization is a text-editor job.
- **Keyboard-first:** A = position match, L = sound match, etc. Fast and twitchy. Touch is an afterthought (= nonexistent).
- **Graphs use Pyglet native rendering**, not a charting lib. Fast but ugly.
- **Profiles** work via separate `stats.txt` per user, selected at launch.
- **No account system, no cloud.** Files live in a user-data dir. Back-up = copy the folder.

---

## 3. Patterns to Steal

### Architecture

1. **Single-tick clock per trial.** Don't chain `setTimeout`s per stimulus. Drive everything off `performance.now()` + `requestAnimationFrame`. Stimulus onsets are tick offsets, not independent timers.
2. **Append-only CSV/JSONL session log** with a schema version column. Never mutate past rows. Export = copy the file. (Brain Workshop got this right by accident; we should do it on purpose.)
3. **Config as data, not code.** Everything (thresholds, SOAs, modality weights) in a declarative config with safe defaults. Ship a "strict Jaeggi" preset and a "comfortable" preset.
4. **Tick-based trials with fixed total duration** per difficulty. Prevents accuracy/fluency confound (a faster player doesn't get easier trials).
5. **Rollover at 4 AM, not midnight.** Late-night sessions on the same "day." Adopt this.
6. **Profile isolation = directory isolation.** Multiple users sharing a device should never leak stats.
7. **FSRS over SM-2** for any SR we ship (cf. open-spaced-repetition). Anki has migrated — don't start from SM-2 in 2026.
8. **Rust / WASM for the hot loop** (Anki model). Not required for MVP, but the trial-scoring + adaptive-update engine is perfect WASM territory — deterministic, tiny, cross-platform.
9. **SQLite for structured history** (Anki, AnkiDroid) with a sync-log layer on top if/when we add cloud. Don't start with Postgres unless multi-device is Day-One.

### UX

10. **Expose two scoring modes with a plain-English explanation:** "Jaeggi strict (each modality ≥90%)" vs. "Combined (overall ≥80%)." Tell the user which they're on at all times.
11. **Sticky fallback:** require N consecutive bad sessions before dropping level. Single bad days don't punish streaks.
12. **Keyboard-first desktop / thumb-first mobile.** Two binding schemes, same mental model.
13. **Progress visualization shows raw percent + level, never "brain age."** Lumosity's FTC $50M settlement is the cautionary tale.
14. **Manual mode and Adaptive mode both shown in graphs.** Issue #43 shows Brain Workshop users want manual history too.
15. **Session rollover banner** ("This session counts toward yesterday because it's before 4 AM") — prevents confusion in stats.
16. **Honest explanation of transfer.** A small always-visible "What this helps with" card: "Near transfer to working-memory tasks; far-transfer evidence is weak." Builds trust, unlike Lumosity marketing.
17. **Hands-on tutorial that runs the real task at N=1** with very slow SOA, not a separate video. Brain Workshop has nothing; every single port reinvents onboarding badly.
18. **Optional research data upload (off by default).** Mnemosyne pattern — opt-in telemetry earns community trust.

### Scientific integrity

19. **Log lure trials separately** (Jaeggi lures: a stimulus that matches on n-1 or n+1, not n). Reporting combined accuracy hides attention-control failures.
20. **Calibrate floor/ceiling per user** (see file 05-calibration.md) rather than starting everyone at N=2. Brain Workshop starts everyone at N=2 and users churn before they calibrate.
21. **Use FSRS-style DSR (Difficulty/Stability/Retrievability) framing** for any SR-like task, even non-flashcard cognitive tasks — Retrievability is a better scheduling signal than hit/miss.

---

## 4. Patterns to Avoid

1. **"Brain age" numbers.** Lumosity paid $50M to the FTC for implying brain-training prevents Alzheimer's. Do not imply far-transfer you haven't proven. Do not invent composite IQ-like scores.
2. **XP / HP / gold currency for cognitive tasks.** Habitica is fine for habits; it's poison for cognition because it rewards playing long, not playing well. Minimal gamification: streak visibility, optional badge for hitting-a-personal-best, no leaderboards by default.
3. **Dark patterns on streaks.** Never punish a missed day with a visible loss ("Your streak reset!"). Soft, restart-friendly framing.
4. **Coins/unlocks that gate paradigms.** Every cognitive modality should be available immediately; you're not building Candy Crush.
5. **Text-only config with no UI.** Brain Workshop's biggest accessibility failure. Every knob users care about (N-start, SOA, which modalities) must be in a settings screen.
6. **Per-stimulus `setTimeout` in the web.** Accumulates drift; SOA jitter kills measurement validity. Tick loop or bust.
7. **Starting everyone at the same level.** Floor/ceiling calibration first.
8. **Hiding which scoring protocol is in use.** Users will screenshot a 95% run at N=4 and not realize it was BW-default not Jaeggi; they'll overclaim progress.
9. **Inline ads or freemium modality gates.** Destroys scientific credibility and recruit pipeline.
10. **"You're a genius!" / "You're a cognitive athlete!" copy.** BrainHQ-style sycophancy. Users mistrust it over time.
11. **No export.** Anki and Brain Workshop both win on this. Never lock user data.
12. **Daily-login notifications that manipulate.** A gentle opt-in reminder at a user-chosen hour is fine. Push-loop manipulation is not.

---

## 5. Key Lessons for a Consumer-Grade Serious Cognitive Training App

1. **The combination is the moat.** Individual paradigms (DNB, Stroop, Flanker, UFOV, matrices) all exist as research scripts. Nobody has shipped an honest, adaptive, multi-paradigm, export-friendly consumer suite on OSS. That's our niche.
2. **Cross-platform from day one.** Brain Workshop's Python/Pyglet lock-in killed mobile reach for 15 years. Use web (PWA) + a thin native wrapper (Capacitor/Tauri) so stimulus rendering stays WebGL/Canvas and we get one codebase.
3. **Timing is a first-class non-functional requirement.** `requestAnimationFrame`-driven tick loop, `performance.now()` deltas, log measured SOA in session records, warn the user if their browser/device is producing jittery frames (jsPsych-psychophysics does this well).
4. **Storage is boring and should stay boring.** Local-first (IndexedDB or SQLite via wa-sqlite), append-only session log, opt-in sync to a minimal server. Don't architect for scale you don't have.
5. **Trust beats flash.** Plain-English scoring, visible protocol, honest transfer claims, optional anonymous telemetry. Small up-front cost, compounding credibility.
6. **Config presets over config knobs for 95% of users.** "Jaeggi strict," "Beginner," "Comfortable," "Research-grade." Power users can edit JSON.
7. **Calibrate, don't gatekeep.** Adaptive N + a short floor/ceiling probe on first run yields a personalized starting point instead of a demoralizing wall.
8. **Data export is a feature, not an afterthought.** CSV / JSON / OSF-style bundle. Users comparing their progress to published studies is a virtuous loop.
9. **Lean into what shipping OSS apps have proven:** SR + adaptive difficulty + local-first + profiles + export = the tested formula. Deviate only with evidence.
10. **Ship small, ship honest.** A polished DNB + Stroop + UFOV with calibrated floors and exportable data beats a 20-paradigm grab-bag.

---

## 6. Sources (for follow-up)

- Brain Workshop: https://github.com/brain-workshop/brainworkshop
- Anki: https://github.com/ankitects/anki
- AnkiDroid: https://github.com/ankidroid/Anki-Android
- Mnemosyne: https://github.com/mnemosyne-proj/mnemosyne
- FSRS: https://github.com/open-spaced-repetition
- Brain Workshop web port: https://github.com/mentasuave01/brainworkshop
- hindol/dual-n-back: https://github.com/hindol/dual-n-back
- jperryhouts/Dual-N-Back: https://github.com/jperryhouts/Dual-N-Back
- 4skinSkywalker/3D-N-back: https://github.com/4skinSkywalker/3D-N-back
- Habitica: https://github.com/HabitRPG/habitica
- jsPsych: https://github.com/jspsych/jsPsych (+ jspsych-psychophysics plugin)
- Reaction-time PWA: https://github.com/vamuigua/reaction-time
- SampleU (ESM): https://github.com/forzaz/Mobile-Experience-Sampling-Master
- ESMira, mobileQ — ESM platforms worth studying for scheduling/prompt UX
- Gwern DNB FAQ & meta-analysis: https://gwern.net/dnb-faq , https://gwern.net/dnb-meta-analysis
- FTC Lumosity settlement ($50M, 2016) — cautionary precedent for marketing claims.
