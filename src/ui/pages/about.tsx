import { A } from '@solidjs/router';

export function About() {
  return (
    <div class="container" style="max-width:700px">
      <h1 class="hero">About</h1>

      <p>Intellect Forge is a personal-use cognitive training app built from
        research-validated paradigms. It does not claim to raise IQ, reduce
        brain age, or produce general cognitive improvement. Those claims are
        not supported by the evidence for the training types in this app.</p>

      <h3>What each module actually trains</h3>
      <ul>
        <li><b>Working Memory</b> — dual n-back + complex span (Jaeggi 2008 /
          Engle lab). Trains working-memory updating + maintenance. Near-
          transfer to related WM tasks is robust; far-transfer to fluid
          intelligence is contested (Melby-Lervåg et al. 2016 vs Soveri 2017).</li>
        <li><b>Perceptual Speed (UFOV)</b> — adaptive display-duration
          thresholding (Ball & Edwards / ACTIVE trial paradigm). Our stimuli
          are simplified vehicle silhouettes, not photographs — paradigm
          structure is faithful, ecological transfer claims don't directly
          apply.</li>
        <li><b>Compound Executive Function</b> — three canonical EF tasks
          rotated across sessions (Flanker, Stop-Signal, Task-Switching) per
          Karbach &amp; Kray 2009 variable-training design.</li>
        <li><b>Relational Reasoning</b> — Raven-style matrices using Carpenter
          1990 rules and I-RAVEN distractors (Hu 2021). Trains rule
          abstraction; transfer claims as for WM.</li>
        <li><b>Calibration</b> — Brier scoring on MCQ items from three OSS
          banks (MMLU, OpenTriviaDB, TruthfulQA). Trains probabilistic
          judgment.</li>
      </ul>

      <h3>What we can and can't measure</h3>
      <p>You will see improvement on these specific tasks over time. That's
        near-transfer — practice effects + skill acquisition. Whether those
        gains generalize to everyday cognition is genuinely unknown for these
        tasks in general and uncertain for our implementations specifically,
        since our Compound EF and Matrix paradigms haven't been validated as
        assembled.</p>

      <p>The Transfer Assessment Battery is the only honest within-app
        measurement of possible transfer. Its Simple RT sub-task is a clean
        canonical paradigm. Its Matrix sub-task currently uses our own
        procedural generator (same as training), so improvement there reflects
        near-transfer only. Real far-transfer measurement requires
        independent validated items — ICAR Sample Test ingestion is pending.</p>

      <h3>What to do with the results</h3>
      <p>Track your metrics; don't over-interpret. Sleep, exercise, and
        varied challenging work probably do more for cognition than any
        training app. This one exists to train specific capacities you can
        identify as valuable to you — not as a general-purpose brain enhancer.</p>

      <h3>Citations</h3>
      <p class="muted" style="font-size:.85rem">
        Jaeggi et al. 2008 PNAS · Engle &amp; Kane OSpan · Ball &amp; Edwards UFOV
        · Eriksen &amp; Eriksen 1974 Flanker · Verbruggen 2019 Stop-Signal ·
        Rogers &amp; Monsell 1995 Task Switching · Carpenter, Just &amp; Shell
        1990 Raven · Hu et al. 2021 I-RAVEN · Hendrycks et al. 2021 MMLU ·
        Lin et al. 2022 TruthfulQA · Karbach &amp; Kray 2009 Variable Training
        · Soveri 2017 / Melby-Lervåg 2016 WM-training meta-analyses.
      </p>

      <p style="margin-top:2rem">
        <A href="/">← Home</A>
      </p>
    </div>
  );
}
