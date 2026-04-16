# 09 — jsPsych Deep Dive (plugin source-level analysis)

Follow-up to `06-platforms-and-stack.md`. All findings below come from reading the
actual source of `jsPsych` v8, `jspsych-contrib`, `jspsych-psychophysics`, and
STOP-IT, cloned locally at `research/tmp-jspsych/` (gitignored; safe to delete
after review).

Repos and tags surveyed
- `jspsych/jsPsych` main, packages v8.x (`packages/jspsych`, `packages/plugin-*`)
- `jspsych/jspsych-contrib` main (53 plugin packages)
- `kurokida/jspsych-psychophysics` main (single 2,531-line TS file)
- `fredvbrug/STOP-IT` main (legacy jsPsych 6.0.5 under `jsPsych_version/`)

---

## 1. Plugin architecture in jsPsych v8

A plugin is a TypeScript class that implements `JsPsychPlugin<Info>` and exposes
two static things: a metadata object called `info` and a `trial(display_element,
trial, on_load?)` method. Everything else is the core library's problem.

### 1.1 The contract (distilled from `html-keyboard-response`)

```ts
// packages/plugin-html-keyboard-response/src/index.ts
const info = <const>{
  name: "html-keyboard-response",
  version: version,
  parameters: {
    stimulus:           { type: ParameterType.HTML_STRING, default: undefined },
    choices:            { type: ParameterType.KEYS,        default: "ALL_KEYS" },
    prompt:             { type: ParameterType.HTML_STRING, default: null },
    stimulus_duration:  { type: ParameterType.INT,         default: null },
    trial_duration:     { type: ParameterType.INT,         default: null },
    response_ends_trial:{ type: ParameterType.BOOL,        default: true  },
  },
  data: {
    response: { type: ParameterType.STRING },
    rt:       { type: ParameterType.INT },
    stimulus: { type: ParameterType.STRING },
  },
  citations: '__CITATIONS__',
};

class HtmlKeyboardResponsePlugin implements JsPsychPlugin<typeof info> {
  static info = info;
  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<typeof info>) {
    display_element.innerHTML =
      `<div id="jspsych-html-keyboard-response-stimulus">${trial.stimulus}</div>` +
      (trial.prompt ?? "");

    const response = { rt: null, key: null };

    const keyboardListener = this.jsPsych.pluginAPI.getKeyboardResponse({
      callback_function: (info) => {
        if (response.key == null) response = info;
        if (trial.response_ends_trial) end_trial();
      },
      valid_responses: trial.choices,
      rt_method: "performance",        // uses performance.now()
      persist: false,
      allow_held_key: false,
    });

    if (trial.stimulus_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        display_element.querySelector<HTMLElement>(
          "#jspsych-html-keyboard-response-stimulus").style.visibility = "hidden";
      }, trial.stimulus_duration);
    }
    if (trial.trial_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(end_trial, trial.trial_duration);
    }

    const end_trial = () => {
      this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      this.jsPsych.finishTrial({ rt: response.rt, stimulus: trial.stimulus,
                                  response: response.key });
    };
  }
}
```

Observable rules:
- **Plugin = render + measure + hand-off.** `trial()` writes into
  `display_element.innerHTML`, registers keyboard/mouse/timer listeners via
  `this.jsPsych.pluginAPI`, then calls `this.jsPsych.finishTrial(data)` to
  surrender control.
- **No lifecycle hooks inside a plugin.** There is no `onMount`, no `onUnmount`.
  A trial is a single async-ish function. Trials do not see each other.
- **`trial()` can be void, return a Promise, or call `finishTrial(data)`.** The
  core runs `Promise.race([trialReturnValue, finishTrialPromise])` in
  `Trial.executeTrial()` (see `packages/jspsych/src/timeline/Trial.ts` lines
  89–124).
- **After `finishTrial`, the core wipes the DOM**:
  ```ts
  // Trial.cleanupTrial()
  this.dependencies.clearAllTimeouts();
  this.dependencies.getDisplayElement().innerHTML = "";
  ```
  Everything you drew is gone. All pending `pluginAPI.setTimeout` handles are
  cleared automatically (because the plugin called them through the tracked
  `TimeoutAPI`, not `window.setTimeout` directly).
- **Global state in `this.jsPsych`.** Data, RNG, keyboard listeners, timeouts,
  simulation mode — all singletons on the `JsPsych` instance.

### 1.2 Complex plugin example — `visual-search-circle`

The visual-search plugin (374 lines) adds only positioning math and a two-phase
timeline (fixation -> search array). It still uses the same `setTimeout +
getKeyboardResponse` primitives:

```ts
// packages/plugin-visual-search-circle/src/index.ts (condensed)
show_fixation();               // inserts <img> at computed centre
this.jsPsych.pluginAPI.setTimeout(show_search_array, trial.fixation_duration);

// show_search_array draws N <img> tags around a circle:
for (var i = 0; i < display_locs.length; i++) {
  paper.innerHTML += `<img src='${to_present[i]}' style='position:absolute;
    top:${display_locs[i][0]}px; left:${display_locs[i][1]}px; ...'>`;
}
// then getKeyboardResponse + optional trial_duration timeout
```

There is **no framework**; complexity is just more DOM string concatenation and
more timers. There is also **no mask plugin**. Masking is the caller's job
(feed two sequential trials or a concatenated stimulus HTML string).

### 1.3 Timing core — where milliseconds come from

`packages/jspsych/src/modules/plugin-api/KeyboardListenerAPI.ts`:
```ts
const startTime = usePerformanceRt ? performance.now() : audio_context_start_time * 1000;
// ...
const listener = (e) => {
  const rt = Math.round(
    (rt_method == "performance" ? performance.now() : audio_context.currentTime * 1000)
    - startTime);
  if (rt < minimum_valid_rt) return;
  callback_function({ key: e.key, rt });
};
```

And `TimeoutAPI.ts`:
```ts
setTimeout(callback: () => void, delay: number): number {
  const handle = window.setTimeout(callback, delay);
  this.timeout_handlers.push(handle);
  return handle;
}
```

**Key observations:**
1. RT uses `performance.now()` — monotonic sub-millisecond clock. Good.
2. Stimulus onset is measured from when the listener was registered, **not from
   the actual frame paint**. Most plugins call `display_element.innerHTML = ...`
   and immediately register the listener. There is no `requestAnimationFrame`
   sync between "I wrote the DOM" and "the pixel hit the monitor" for the
   default plugins.
3. Stimulus offset uses `window.setTimeout`, which fires on the macrotask queue,
   **not aligned to the next vsync**. So an advertised 200 ms flash can be
   ~200–216 ms depending on when the next repaint lands.
4. The contrib plugin `html-keyboard-response-raf` addresses (3) by counting
   `requestAnimationFrame` ticks instead of `setTimeout`:
   ```ts
   this.hideStimulusFrameCount = Math.round(trial.stimulus_duration / (1000 / trial.fps));
   const checkForEnd = () => {
     frame_counter++;
     if (frame_counter >= this.hideStimulusFrameCount) { /* hide */ }
     if (frame_counter >= this.endTrialFrameCount) end_trial();
     else requestAnimationFrame(checkForEnd);
   };
   requestAnimationFrame(() => { display_element.innerHTML = new_html; ... });
   ```
   That is exactly the pattern Anwyl-Irvine et al. (2020) and Bridges et al.
   (2020) recommend for ≤ 1-frame accuracy in browsers.
5. `jspsych-psychophysics` uses its own RAF loop plus optionally PixiJS:
   ```ts
   function step(timestamp) {
     if (!startStep) { startStep = timestamp; sumOfStep = 0; }
     else sumOfStep += 1;
     elapsedTime = timestamp - startStep;
     if (trial.clear_canvas && !trial.pixi) ctx.clearRect(...);
     for (const stim of trial.stimuli) {
       const elapsed = stim.is_frame ? sumOfStep : elapsedTime;
       if (elapsed < stim.show_start_time) continue;
       if (stim.show_end_time && elapsed >= stim.show_end_time) continue;
       stim.update_position(elapsed); stim.show();
     }
     frameRequestID = window.requestAnimationFrame(step);
   }
   ```
   This is the right template for any stimulus we build ourselves.
6. RDK (`jspsych-contrib/plugin-rdk`, 1,629 lines) tracks actual inter-frame
   deltas and writes `frame_rate_array` into trial data — a good pattern for
   logging display jitter.

Accuracy verdict: default jsPsych plugins are fine for RT collection (measured
via `performance.now()`), but **stimulus-duration timing is `setTimeout`-based
by default and drifts by up to one vsync interval**. For UFOV-style brief
flashes (≤ 100 ms) we must use the RAF variant or roll our own.

---

## 2. Per-module plugin-to-module mapping

Verdicts: "Vendor" = import the npm package as-is; "Fork" = copy source and
modify; "Port" = rewrite in our own engine using the pattern; "Compose" = build
from existing primitives.

| Module | Best upstream plugin(s) | Verdict | Why |
|---|---|---|---|
| **UFOV / perceptual speed** | `@jspsych-contrib/plugin-rdk`, `@kurokida/jspsych-psychophysics` | **Port** | Needs 16.6 ms-precise masks, simultaneous central+peripheral canvases with frame-locked onsets, and our own adaptive staircase. Both upstream plugins are good references; neither is a drop-in because UFOV wants a specific triad of (central ID target, peripheral localisation, distractors) with masks at defined ISIs. |
| **Visual search (speed band)** | `plugin-visual-search-circle` (core) | **Fork** | DOM-based img positioning is fine; we want SVG symbols + mask, plus set-size staircase. Source is 374 lines, forking costs less than vendoring + custom wrapper. |
| **Working memory — spatial n-back** | `@jspsych-contrib/plugin-spatial-nback` | **Vendor as reference, Port for prod** | The contrib plugin is **single-trial only** (one stimulus + one MATCH/NO-MATCH response). An n-back block is a *stream*, so our orchestrator would have to feed it trials while tracking the n-back lag itself. Easier to port the grid-rendering code into a streaming component that maintains its own history buffer. 585 lines. |
| **Working memory — auditory n-back** | No contrib plugin. Compose from `plugin-audio-keyboard-response` | **Compose / Port** | Same streaming issue. Also needs preloaded audio assets; `pluginAPI.preloadAudio` exists but binds to WebAudio globally, which leaks if we tear down jsPsych between modules. |
| **Complex span (reading/operation span)** | None. Closest: `plugin-serial-reaction-time`, `@jspsych-contrib/plugin-free-recall-response` | **Port** | Complex span is processing-task alternating with memory-probe encoding; no existing plugin represents that pattern. We'd compose HTML+keyboard primitives but the session-level state (encoding queue, ACC-gated recall) is ours. |
| **Compound EF — Stroop** | None in core or contrib | **Compose** | Trivially `plugin-html-keyboard-response` with colored HTML strings. Bias: we will want SVG-rendered words to control font metrics. |
| **Compound EF — Flanker** | `@jspsych-contrib/plugin-flanker` | **Vendor** | Clean plugin with SVG arrows, SOA support, keyboard or button mode. No reason to reimplement. |
| **Compound EF — Go/no-go** | Compose | **Compose** | Trivial. |
| **Compound EF — Stop-signal** | `@jspsych-contrib/plugin-stop-signal` **+ STOP-IT SSD logic** | **Fork** | The contrib plugin is a generic two-image sequencer; **it does not implement the SSD staircase**. The SSD logic lives outside the plugin, in the caller (STOP-IT puts it in `on_finish`). Port the custom-stop-signal-plugin + the staircase block from `STOP-IT/jsPsych_version/experiment.html` lines 269–317 (reproduced in §4 below). |
| **Relational reasoning (Raven-like)** | No matrix-specific plugin exists | **Build** | Use `plugin-html-button-response` or `plugin-image-button-response` with pre-rendered SVG matrices; item generator (pattern rules) is custom content. |
| **Corsi / spatial span** | `@jspsych-contrib/plugin-corsi-blocks` | **Vendor** | Nice clean plugin, has both display and input modes. |
| **Trail making** | `@jspsych-contrib/plugin-trail-making` | **Vendor** | |
| **Calibration / self-report** | `plugin-html-slider-response`, `plugin-survey-likert`, `plugin-survey` | **Vendor** | Well-tested, no reason to rebuild sliders. |

Other useful contrib plugins noticed: `plugin-bart` (Balloon Analogue Risk
Task), `plugin-tower-of-london`, `plugin-pursuit-rotor`, `plugin-rok` (random
object kinematogram — a shape-based RDK). Not in our scope but worth knowing.

---

## 3. Data collection model

`packages/jspsych/src/modules/data/index.ts`:

```ts
export class JsPsychData {
  private results: DataCollection;
  write(trial: Trial) {
    const result = trial.getResult();
    Object.assign(result, this.dataProperties);
    this.results.push(result);
  }
  // ...displayData(), urlVariables(), addProperties(), getInteractionData()
}
```

Observations:
- **All results live in a single in-memory `DataCollection`.** `.get()` returns
  it; `.json()` / `.csv()` serialise it.
- **No persistence layer.** To save, the user wires `on_finish` on the top-level
  `initJsPsych({ on_finish: data => fetch(...) })`. Default behaviour is to do
  nothing (except print to the display element if `displayData()` is called).
- **No concept of "session" or "user".** `addProperties({userId: ...})` bolts
  metadata onto every row, but that is it.
- **Interaction records** (blur, focus, fullscreen enter/exit) are tracked
  separately in a parallel DataCollection — useful for us to detect
  tab-switching cheating.

Verdict for longitudinal cog training: **use it as a transient per-session
buffer**, then on `on_finish` / per-trial `on_data_update` push to our own
SQLite (Tauri `@tauri-apps/plugin-sql` or local-first sync) or Supabase layer.
Do **not** rely on `jsPsych.data` for long-term storage. The API has no
cross-session, cross-user, or schema-migration concepts.

---

## 4. STOP-IT SSD staircase (the part missing from jsPsych contrib)

`STOP-IT/jsPsych_version/configuration/experiment_variables.js`:
```js
var SSD = 200;      // starting stop-signal delay (ms)
var SSDstep = 50;   // step size and lower bound
var MAXRT = 1250;   // max response time; upper bound for SSD
```

`STOP-IT/jsPsych_version/experiment.html` (lines 269–317):
```js
var stimulus = {
  type: 'custom-stop-signal-plugin',
  fixation: jsPsych.timelineVariable('fixation'),
  fixation_duration: FIX,
  stimulus1: jsPsych.timelineVariable('first_stimulus'),   // arrow
  stimulus2: jsPsych.timelineVariable('second_stimulus'),  // arrow or stop signal
  trial_duration: MAXRT,
  ISI: function() { return SSD; },   // dynamic SSD = stop-signal delay
  response_ends_trial: true,
  choices: [cresp_stim1, cresp_stim2],
  data: jsPsych.timelineVariable('data'),
  on_finish: function(data) {
    data.response = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
    data.correct  = data.response == data.correct_response;
    if (data.rt == -250) data.rt = null;
    if (data.signal == 'no' && data.rt < 0) data.correct = false;
    data.SSD = SSD;
    if (data.signal == 'yes') {
      if (data.correct) {                       // successful stop -> make it harder
        SSD = SSD + SSDstep;
        if (SSD >= MAXRT) SSD = MAXRT - SSDstep;
      } else {                                  // failed stop -> make it easier
        SSD = SSD - SSDstep;
        if (SSD <= SSDstep) SSD = SSDstep;
      }
    }
  }
};
```

This is the entire staircase: one-up/one-down, fixed 50 ms step, clamped to
`[SSDstep, MAXRT - SSDstep]`. It converges on the SSD that yields ~50% stop
success, from which SSRT is estimated via the integration method
(Verbruggen et al. 2019). **We can lift this exactly into our own plugin.**

Note the custom plugin itself (`js/custom-stop-signal-plugin.js`) is only 190
lines; it is essentially `image-keyboard-response` with a delayed second
stimulus swap. Easy to port.

---

## 5. Production-app suitability — what breaks inside a consumer app

jsPsych assumes it owns the page. Things that break (or get awkward) when
embedding it in a Tauri/SolidJS shell:

1. **DOM wipe between trials.** `Trial.cleanupTrial()` sets
   `display_element.innerHTML = ""`. Anything rendered by Solid inside that
   element will be clobbered. We must give jsPsych its **own** div that Solid
   never reconciles into. (Pattern: `createEffect` mounts jsPsych into a ref
   and never touches the subtree again.)
2. **Global keyboard listeners.** `KeyboardListenerAPI` attaches keydown/keyup
   to the root element at construction. If we re-use the same `JsPsych`
   instance across modules, old listeners can remain; if we tear it down and
   spin up a new one, we need to unsub old listeners or they double-fire.
   Easiest: **one `initJsPsych()` per module run**, disposed on completion.
3. **Singleton data store.** `jsPsych.data.get()` accumulates across the whole
   experiment. We need to call `.reset()` or instantiate fresh per session.
4. **WebAudio disabled under `file://`.** `JsPsych.ts` lines 96–109 will
   silently disable audio + preload when it sees `window.location.protocol ==
   "file:"`. In Tauri, the protocol is `tauri://` (or `asset.localhost`), so
   usually OK, but worth verifying on each platform.
5. **No reload resilience.** If the user force-quits the app mid-trial, the
   in-memory `DataCollection` is lost unless we pushed it out. We would have
   to hook `on_data_update` to stream each row immediately to SQLite.
6. **Styling assumes `jspsych.css`.** The default CSS (`packages/jspsych/src/index.scss`)
   sets `body { font-family: Open Sans, Arial; font-size: 18px; ... }` and styles
   `.jspsych-btn`, `.jspsych-content`. If we import it, it bleeds into the rest
   of the Solid app. If we don't, plugins look unstyled. Fix: **scope jsPsych
   styles to a single host element** using PostCSS or a `@scope` rule.
7. **No i18n.** Every button label, instruction string is in-plugin. We'd have
   to pass all strings as trial parameters.
8. **Fullscreen plugin is "real" fullscreen.** `plugin-fullscreen` calls
   `document.documentElement.requestFullscreen()`. In Tauri we usually already
   run fullscreen (or kiosk), so skip it.
9. **Timeline mutability is limited.** jsPsych v8 supports adaptive timelines
   via `conditional_function` and `loop_function`, but the timeline is
   effectively frozen at `jsPsych.run()` time. True session-level adaptation
   (between modules, based on yesterday's data) must happen in our
   orchestrator, not in a jsPsych timeline.
10. **Preload timing.** The `preload` plugin fetches all images/audio up
    front. For a 30-day training schedule, we don't want to preload the whole
    universe; we preload per day, which means a fresh jsPsych init per day.

---

## 6. Licenses

- `jsPsych/license.txt`: **MIT**, Copyright 2014–2022 Joshua R. de Leeuw.
- `jspsych-contrib`: each package has `"license": "MIT"` in its package.json
  (confirmed for plugin-spatial-nback, plugin-flanker, plugin-corsi-blocks,
  plugin-rdk, plugin-stop-signal).
- `jspsych-psychophysics/LICENSE`: **MIT**, Copyright 2019 kurokida. Depends
  on PixiJS (MIT), ml-matrix (MIT), numeric (MIT).
- `STOP-IT`: repo has no LICENSE file at root. README says "open-source". Safest
  to treat the SSD algorithm (lines 269–317 above) as research code and
  reimplement rather than redistribute; the algorithm itself is published in
  Verbruggen et al. 2019 and not subject to copyright.

All clear for commercial use, including distribution inside a Tauri binary, as
long as we ship the MIT notices.

---

## 7. Vendor vs port — recommendation

**Hybrid: port the core, vendor a hand-picked set of plugins into a local
monorepo.**

### Option A — vendor jsPsych core as an npm dep
Pros:
- Get timeline, RNG, keyboard listener, data collection, simulation mode for
  free.
- Plugin ecosystem becomes a copy-paste away.
- Upgrades tracked via npm.

Cons:
- Timeline object is not designed for session-level adaptation across days.
  We'd end up running many short timelines and re-implementing coordination.
- Global keyboard listeners and DOM wipe require careful isolation.
- Default timing (setTimeout-based stimulus durations) is not adequate for
  UFOV-grade flashes. We'd override with RAF-based plugins anyway.
- We own the timing story once we ship a medical-adjacent product; if jsPsych
  changes, our RT semantics change with it.

### Option B — port the patterns into our own stimulus engine
Pros:
- Full control over timing (RAF loop, explicit vsync-aligned onset, logged
  inter-frame deltas like RDK does).
- One coherent data model. No bolt-on of `jspsych.data` to our SQLite.
- Styling and accessibility stay inside our Solid component tree.
- No DOM wipe surprise. Module-level mount/unmount via Solid is trivial.
- Plugins become ordinary Solid components, not DOM string blobs.

Cons:
- We rewrite ~30 paradigm files (estimate: 6 modules × 2–4 paradigms each;
  most are 100–400 LoC once the primitives exist).
- We own the RNG, keyboard abstraction, audio preload, tiny but real.
- No simulation mode out of the box (but we don't need one for a consumer
  product).

### Recommended: Option B, using jsPsych **plugin source as the reference
implementation** for each paradigm.

Concrete plan:
1. Build a minimal `stimulus-engine/` package inside the app:
   - `engine/clock.ts` — `performance.now()` + per-frame dt log + monotonic
     block clock.
   - `engine/scheduler.ts` — RAF-driven frame scheduler, explicit `onFrame`,
     `onShowAt(ms)`, `onHideAt(ms)`.
   - `engine/keyboard.ts` — single root-level listener with minimum-valid-RT
     filter, matching the `KeyboardListenerAPI` design above.
   - `engine/results.ts` — TypeScript-typed trial rows streamed to SQLite
     via Tauri `plugin-sql` on every `finishTrial`.
   - `engine/preload.ts` — per-day asset preloader.
2. For each paradigm, build a Solid component that uses the engine. Port
   **the drawing and timing logic** from the corresponding jsPsych plugin.
   Keep the file layout (parameter spec, data spec) as a JSDoc header so the
   upstream source stays traceable.
3. Vendor the one piece we don't want to rewrite: **the flanker SVG glyphs,
   the Corsi block coordinates, the psychophysics stimulus classes.** These
   are data, not code, and copying them with attribution is fine under MIT.
4. Mirror the STOP-IT SSD staircase exactly (§4 above).
5. Keep `jsPsych` itself out of the shipping binary. Use it only as a research
   sandbox (offline, for pilot testing) in `research/tmp-jspsych/`.

Cost estimate: 2–3 engineer-weeks for the engine, 1–2 days per paradigm for
the six modules, total ~3–5 weeks. Running jsPsych in production would save
~1 of those weeks but spend all the saved time and more on integration debt.

---

## 8. Gotchas summary (quick-reference)

- `display_element.innerHTML = ""` between every trial. Don't render into that
  subtree from Solid/React.
- Default stimulus duration is `setTimeout`-based, drifts ~1 frame. Use RAF
  (see `plugin-html-keyboard-response-raf` or psychophysics plugin).
- `jsPsych.data` is a single in-memory bucket, not persistent. Stream on
  `on_data_update`.
- Keyboard listeners are registered on the display element at API
  construction. Re-initing jsPsych without tearing down cleanly duplicates
  listeners.
- `plugin-stop-signal` in contrib is **not** the stop-signal task; it's a
  2-frame image sequencer. The real SSRT logic is in STOP-IT, in the caller's
  `on_finish`.
- `plugin-spatial-nback` is **single-trial only**. It does not maintain an
  n-back history buffer. The caller must feed it pre-computed `is_target`
  flags per trial.
- Audio preload disabled under `file://`. Verify Tauri protocol unlocks it.
- WebGazer and other extensions use MediaDevices APIs; they need HTTPS (or
  Tauri's localhost) and will fail silently in insecure contexts.
- All timings in plugin data are in ms, but **keycodes in older STOP-IT** are
  numeric (jsPsych ≤ 6). jsPsych 7+ switched to `e.key` strings. Legacy forks
  need translation.
