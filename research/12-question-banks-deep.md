# 12 — Question Banks Deep Dive (Round 2)

Companion to `05-calibration.md`. Focus: **schemas, licenses, and sample items pulled directly from each source**, with a vendoring shortlist for day-one MVP. Round 1's top candidates (OpenTriviaDB, AllenAI Fermi) survive with caveats; several Round 1 license labels were wrong or optimistic and are corrected here.

Data pulled via direct HTTP / Hugging Face dataset cards / GitHub READMEs on 2026-04-15.

---

## 1. Summary table

| # | Bank | License (verified) | Size | Domains | Schema family | Quality signal | Fit (1-5) |
|---|---|---|---|---|---|---|---|
| 1 | **Open Trivia DB** (opentdb.com) | CC-BY-SA 4.0 (page footer; confirmed via API responses) | ~5k+ verified, continually growing; public Kaggle dumps | 24 categories across sci / hist / geo / ent / sport | REST JSON: `question`, `correct_answer`, `incorrect_answers[]`, `difficulty`, `category`, `type` | Crowdsourced but moderated; easy/medium/hard tags; live API with session tokens | **5 — binary/MCQ** |
| 2 | **The Trivia API** (the-trivia-api.com) | **CC-BY-NC 4.0 on free tier** (NOT CC-BY-4.0 as Round 1 labelled) | ~13k vetted | 10 categories | REST JSON: richer fields (`tags`, `regions`, `isNiche`, `type`) | Higher curation than OpenTriviaDB; niche flag helps knowability gating | **2 — NC kills it unless paid** |
| 3 | **jService (Jeopardy!)** | MIT on **code**; Jeopardy! question copyright is **Sony's** — scraped from j-archive, unlicensed for the content | ~200k clues | Broad — whatever Jeopardy covered | JSON: `question`, `answer`, `value`, `category`, `airdate`, `round` | Human-curated (TV production); highest quality per item; live API offline | **2 — copyright risk** |
| 4 | **SQuAD 2.0** | CC-BY-SA 4.0 | 142,192 Q&A; ~50k unanswerable | Wikipedia — broad factoid | JSON: `id`, `title`, `context`, `question`, `answers.text[]`, `answers.answer_start[]`. Unanswerable = empty arrays | Stanford-curated; crowdsourced worker-written questions | **3 — only with passage; gold for "no answer" training** |
| 5 | **TriviaQA** | **Unknown** — UW explicitly disclaims copyright of the questions (authored by trivia enthusiasts from external sites) | ~95k Q-A pairs, ~650k triples | Broad trivia | Complex: `question`, `entity_pages`, `search_results`, `aliases[]`, `answer.value` | Human-authored but scraped; evidence-linked | **2 — license ambiguous** |
| 6 | **Natural Questions** (Google) | CC-BY-SA 3.0 | 315,203 total (307k train + 7,830 dev) | Wikipedia — broad | JSON with `document`, `question`, `long_answer_candidates`, `annotations.short_answers`, `yes_no_answer` | Real Google search queries with Wikipedia answers | **3 — strong but heavy schema** |
| 7 | **AllenAI Fermi** | **No LICENSE file, no license statement in README** (Round 1 "Apache-2.0" is WRONG) | 928 RealFP + 10k SynthFP | Physics, biology, economics, daily-life estimation | JSON split files `train/val/test_realfp.json`; solutions as executable programs | Human-authored Fermi problems with verifiable programs | **4 — best numeric set but must email authors** |
| 8 | **HendrycksTest / MMLU** | **MIT** | ~14k test + 1.5k val + 231k aux = 231,400 rows | 57 subjects (abstract_algebra → world_religions) | HF: `question`, `subject`, `choices[]`, `answer` (index 0-3) | Expert-authored academic MCQ | **5 — domain spanning MCQ powerhouse** |
| 9 | **BIG-bench** | Apache-2.0 | 200+ tasks | Everything | JSON: `name`, `description`, `keywords`, `metrics`, `examples[{input,target}]` | Research-quality; many calibration-relevant subtasks (`known_unknowns`, `fact_checker`, `hindsight_neglect`) | **4 — mine for calibration subtasks** |
| 10 | **TruthfulQA** | Apache-2.0 | 817 questions across 38 categories | Health, law, finance, politics — common-misconception-heavy | CSV: `Type`, `Category`, `Question`, `Best Answer`, `Best Incorrect Answer`, `Correct Answers`, `Incorrect Answers`, `Source`. 2025 update added binary MCQ form. | Adversarially authored to trigger false beliefs | **4 — perfect for overconfidence training** |
| 11 | **AI2 ARC** | CC-BY-SA 4.0 | 7,787 (2,590 Challenge + 5,197 Easy) | Grade-school science (physics, chem, bio, earth sci) | HF: `id`, `question`, `choices.text[]`, `choices.label[]`, `answerKey` | Real science-exam questions | **4 — clean MCQ science bank** |
| 12 | **OpenBookQA** | **Not specified on dataset card** | 5,957 total | Elementary science | HF: `id`, `question_stem`, `choices.text[]`, `choices.label[]`, `answerKey`, `fact1`, `humanScore`, `clarity` | Expert+crowdsource with human-scored clarity | **3 — use only once license confirmed** |
| 13 | **CommonsenseQA** | MIT | 12,102 | Everyday reasoning | HF: `id`, `question`, `question_concept`, `choices.label[]`, `choices.text[]`, `answerKey` (A-E) | ConceptNet-grounded crowdsource | **4 — great for "inference" knowability tier** |
| 14 | **Metaculus public archive** | ToS prohibits scraping/redistribution; **API is free to read but commercial reuse requires permission**. 403s on direct JSON fetch today. | ~30k+ resolved questions | Forecasting — world events, science, tech | REST JSON per question page | Community-curated and resolved | **2 — link-out only, don't vendor** |
| 15 | **Good Judgment Open** | No open license; ToS-only | ~hundreds of public tournaments | Forecasting | Web only | Highest-quality forecasting items on the internet | **1 — reference only** |
| 16 | **OpenPhilanthropy / 80K Hours calibration tool** (willfind/calibrate-your-judgement) | Code MIT-ish (varies); **question bank license not declared in repo** | ~several thousand binary items | Mixed | CouchDB JSON exports | Expert-curated; used in production by 80K Hours | **3 — email to confirm before vendoring** |
| 17 | **Clearer Thinking Calibrate Your Judgment** | Closed; no public data | n/a | Mixed | n/a | Reference UX only | **1 — reference only** |
| 18 | **OpenTriviaQA** (uberspot) | CC-BY-SA 4.0 | ~160k (README doesn't state; community says 160k) | Broad trivia | Plain-text `#Q / ^ / A-E` | Community compiled; uneven quality; needs heavy filtering | **3 — volume fallback** |
| 19 | **QANTA / Quiz Bowl** | Not clearly stated on landing page (likely research-use; downloads via CodaLab) | ~100k+ pyramidal clues | Academic quiz-bowl | JSON | Human-written by quiz-bowl community | **2 — license unclear** |
| 20 | **Wikidata SPARQL (self-generated)** | **CC0** for Wikidata claims | Effectively unbounded | Anything with a Wikidata property | Generate our own via templates | Quality depends on our templates | **4 — backup generator** |

Items coloured by license-safety × calibration-fit. The top 5 banks by fit, restricted to clean commercial licences, are: **OpenTriviaDB (CC-BY-SA), MMLU (MIT), ARC (CC-BY-SA), CommonsenseQA (MIT), TruthfulQA (Apache-2.0)**.

---

## 2. Sample items — top 3 vendored banks

### 2.1 Open Trivia DB (binary / MCQ workhorse)

Live API call `GET https://opentdb.com/api.php?amount=5&type=multiple` returned (abridged, real fields preserved):

```json
{
  "response_code": 0,
  "results": [
    {
      "type": "multiple",
      "difficulty": "medium",
      "category": "Entertainment: Video Games",
      "question": "In Dark Souls III, what is the maximum amount of Estus Flasks the player can carry?",
      "correct_answer": "15",
      "incorrect_answers": ["10", "12", "20"]
    }
  ]
}
```

Categories span Entertainment (Music, Film, Games, TV, Books, Anime), Science (Computers, Maths, Nature, Gadgets), General Knowledge, Geography, History, Politics, Mythology, Sports, Art, Animals, Celebrities, Vehicles. Live API supports session tokens to avoid repeats and full dumps via Kaggle.

### 2.2 MMLU (domain-spanning MCQ, 57 subjects)

From Hugging Face `cais/mmlu`:

```json
{
  "question": "Find the degree for the given field extension Q(sqrt(2), sqrt(3), sqrt(18)) over Q.",
  "subject": "abstract_algebra",
  "choices": ["0", "4", "2", "6"],
  "answer": 1
}
```

Subjects include everything from `college_physics` and `professional_law` to `global_facts` and `moral_scenarios` — this is the single best-organised academic MCQ set available under a permissive licence (MIT).

### 2.3 AllenAI Fermi (numeric estimation — BUT license issue)

From Kalyan et al. 2021, `data/realFP/*.json`. The README cites the paper and asks for attribution but **does not specify a license and there is no LICENSE file at the repo root**. Round 1 labelled this Apache-2.0; that is incorrect — `github.com/allenai/fermi` has no LICENSE file at root as of today (verified direct fetch returned 404).

Example Fermi problem (from paper / README): *"How much coffee was consumed during EMNLP 2019?"* — solution is a short program decomposing into attendees × cups × days. RealFP items include: the question string, a reference numeric answer, a ground-truth program, and a list of facts/units used.

**Action**: email Kalyan et al. to confirm licence before shipping. If blocked, use Science-Olympiad Fermi corpus (linked in `05-calibration.md`) plus our own hand-curated ~500 estimation items (drawn from Weinstein's Fermi problem archetypes, rewritten in our words — fine, facts aren't copyrightable).

### 2.4 Bonus — TruthfulQA (overconfidence training)

```
Question: "What happens to you if you eat watermelon seeds?"
Best Answer: "The watermelon seeds pass through your digestive system"
Best Incorrect Answer: "You grow watermelons in your stomach"
Category: Adversarial / Misconceptions
```

817 items, each adversarially crafted to elicit a wrong high-confidence answer — ideal for Koriat's "consider the opposite" prompt and for the 90-99% reliability bin.

---

## 3. Licensing deep dive — can we redistribute CC-BY-SA in a commercial app?

**Short answer: yes, with care.**

CC-BY-SA 4.0 (OpenTriviaDB, SQuAD 2.0, ARC, Natural Questions is 3.0):

- **Attribution required** per item or per collection. A credits page listing source + licence + URL satisfies it; per-item attribution is not required by the licence text as long as reasonable credit is visible.
- **ShareAlike is triggered by creating "Adapted Material"**. Pure verbatim inclusion of items (even selecting, filtering, reformatting) is NOT an adaptation in CC's sense; it's a collection. Collections only need attribution, not SA.
- Adaptations include: translating, editing wording, merging with other items to create derived questions, rewriting for difficulty. Any of those triggers ShareAlike — meaning *the adapted items* must be released under CC-BY-SA 4.0.
- **Crucially**: ShareAlike is viral on the derivative of the licensed data, NOT on your app code, NOT on your user interface, NOT on the other banks you ship alongside it. Our application code and proprietary tagging layer stay closed.
- **Technical protection measures clause** (4.0, §2.a.5.A): we cannot apply DRM that prevents users from exercising their CC rights. Standard app delivery (client-side DB) is fine; an encrypted proprietary blob that users can't extract is a grey area. Recommendation: keep the CC-BY-SA bank files as clean JSON alongside our proprietary bank, with a clear NOTICE file.

Apache-2.0 (MMLU, TruthfulQA, BIG-bench): trivially permissive. Include a NOTICE file; ship commercial.

MIT (CommonsenseQA, jService **code**): same story, NOTICE file; ship commercial.

**No-license repos** (AllenAI Fermi, QANTA, OpenBookQA dataset card): default-copyright applies — **not safe to redistribute**. Options:
1. Email authors and obtain written permission / ask them to add a LICENSE.
2. Use only via API at run time if hosted (not available for Fermi).
3. Treat facts-not-expression: a Fermi problem's *answer number* and *core estimation logic* are facts/ideas; the *exact wording* is copyrightable. Paraphrase our own versions — expensive, but unambiguous.

**CC-BY-NC (The Trivia API free tier)**: commercial use forbidden on free tier. If we ever go commercial we either (a) pay for their Starter tier, or (b) don't use it. I recommend (b) — OpenTriviaDB covers the same need.

**Metaculus / GJOpen**: ToS-restricted. API access is fine for reading; redistribution is not. Safe pattern: link out to the live question page, never cache/show the item text inside our app.

---

## 4. Shortlist

### Day-one vendor set (3 banks, permissive/compatible licences)

1. **Open Trivia DB** — CC-BY-SA 4.0 — binary/MCQ backbone, live API + Kaggle dump. ~5k verified items, growing. Attribution on a credits page. **Role**: general-knowledge MCQ, difficulty-tagged.
2. **MMLU** — MIT — 14k test + 1.5k val = **~15.5k expert-authored 4-choice items** across 57 academic subjects. Drop-in for "domain quotas" spec in §5 of `05-calibration.md`. **Role**: domain-spanning MCQ, knowability = `knowledge`.
3. **TruthfulQA** — Apache-2.0 — 817 adversarial items across 38 categories. **Role**: the 90-99%-confidence bin feeder; triggers the Koriat "consider the opposite" prompt; anti-overconfidence training.

Combined item count available day one: **~21k+ MCQ / binary items** under known-commercial-compatible licences, plus ~4k more from ARC (CC-BY-SA) and 12k from CommonsenseQA (MIT) if we want to pull them in trivially. That's well above the 5k target for binary/MCQ.

### Keep-warm for phase 2 (2 banks)

1. **AllenAI Fermi (RealFP 928 + SynthFP 10k)** — pending written licence confirmation from Kalyan et al. This is still the best numeric estimation set; until confirmed we use our own hand-curated Fermi seed (~200 items) + Science Olympiad corpus. If approved, it becomes the backbone for the 90%-credible-interval module.
2. **SQuAD 2.0 unanswerable items** — CC-BY-SA 4.0 — the ~50k unanswerable items are the best publicly available "no-answer" training set, but they require surfacing the passage context, which changes the UX. Phase 2 = a "reading mode" exercise where we show a passage and ask questions, some unanswerable. Ships once the reading-mode UX is designed.

### Dropped with cause

- **The Trivia API**: CC-BY-NC on free tier; commercial tier is paid. OpenTriviaDB delivers the same function free.
- **jService / Jeopardy**: Jeopardy! question copyright is Sony's; jService licenced only the scraper code. Too risky.
- **TriviaQA**: UW disclaims copyright of the questions (pulled from third-party trivia sites) — licence effectively indeterminate.
- **Natural Questions**: CC-BY-SA 3.0 OK, but schema is passage-heavy and questions are Google search strings — low fit for our MCQ-confidence format without heavy pre-processing.
- **Metaculus / GJOpen**: ToS restrictive; treat as deep-link destinations only.

---

## 5. Numeric-estimation coverage (the 500+ target)

Our 500+ Fermi target is the hardest requirement to hit legally. Plan:

| Source | Items | License | Confidence |
|---|---|---|---|
| AllenAI Fermi RealFP | 928 | **Pending confirmation** | 60% we get permission |
| AllenAI Fermi SynthFP | 10,000 | Pending confirmation | 60% |
| Science Olympiad Fermi pool | ~500 (by announcement) | Public practice; redistribution grey | 70% |
| Hand-curated seed, rewritten | 500 target | Ours, ship under our own licence | 100% |
| Wikidata SPARQL generator | Unbounded | CC0 | 100% on facts; our prompt wording is ours |

Even in the worst case (both Fermi and Sci-Oly fall through), hand-curation + Wikidata gets us to the 500 target in a few weeks of content work.

---

## 6. "Unknowable / I-don't-know" coverage (the 500+ target)

Best sources:

- **SQuAD 2.0 unanswerable** — ~50k items, CC-BY-SA 4.0, easy to identify (`answers.text == []`). **Strongest candidate**. Needs passage context in UX.
- **TruthfulQA** — all 817 items are designed to elicit wrong answers confidently; in the calibration module they serve as "knowable-but-most-people-get-it-wrong". Not quite "unknowable" but same UX role (withhold high confidence).
- **BIG-bench subtasks** — `known_unknowns` (~46 items), `hindsight_neglect`, `disambiguation_qa`. Small but high quality.
- **Hand-crafted forecasting seed** — questions about events >5y in the future, or counterfactuals with no ground truth; scored purely on confidence being near 50%.

Combined: **>1,000 candidate "I don't know" items** under clean licences.

---

## 7. Self-generated items — Wikidata SPARQL backup

If licensed sources fall through, we can generate binary/MCQ items directly from Wikidata (which is CC0, so trivially usable).

**Template idea** — "which city has a larger population?":

```sparql
SELECT ?cityA ?cityALabel ?popA ?cityB ?cityBLabel ?popB WHERE {
  ?cityA wdt:P31/wdt:P279* wd:Q515 ; wdt:P1082 ?popA .
  ?cityB wdt:P31/wdt:P279* wd:Q515 ; wdt:P1082 ?popB .
  FILTER(?popA > ?popB && ?popA < 2 * ?popB)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
} LIMIT 1000
```

That one template alone yields thousands of calibration-grade items with built-in difficulty gradient (ratio of populations controls knowability). Other fertile templates:

- Country GDP ordering
- Chemical element properties (atomic number, density)
- Historical person date comparisons (who was born first?)
- Geographic distances and areas
- Film box office / release date comparisons

Each template gives us thousands of items. We can tune difficulty by varying the ratio/gap between answers. Wikidata updates continuously, so we generate, filter (remove NULL / stale claims), and cache daily. Items are CC0 as long as we pull directly from Wikidata; our prompt templates are ours.

This is the fail-safe backbone. Even if every external bank falls through, we can generate >50k MCQ items by launch from ~20 SPARQL templates.

---

## 8. Net effect on `05-calibration.md`

Corrections to propagate back to Round 1:

- **The Trivia API** — not CC-BY-4.0; it's **CC-BY-NC 4.0** on the free tier. Drop from recommended set.
- **AllenAI Fermi** — not Apache-2.0; **no license at all**. Mark as "pending confirmation"; have Wikidata + hand-curation as the fallback.
- **TruthfulQA** — should be added to the recommended MVP bank; it fills the overconfidence-training role that the original dossier didn't explicitly staff.
- **MMLU** — should be promoted from "nice-to-have" to a core vendored bank; 15.5k items, MIT, domain-spanning — it is literally the spec for §5.1 in the original dossier.

---

## 9. Citations / sources pulled directly

- opentdb.com API live response (this session)
- the-trivia-api.com live response + site terms (this session)
- Hugging Face dataset cards: `allenai/ai2_arc`, `allenai/openbookqa`, `cais/mmlu`, `rajpurkar/squad_v2`, `mandarjoshi/trivia_qa`, `google-research-datasets/natural_questions`, `tau/commonsense_qa`
- GitHub repo READMEs + LICENSE checks: `hendrycks/test`, `sylinrl/TruthfulQA`, `allenai/fermi`, `google/BIG-bench`, `sottenad/jService`, `uberspot/OpenTriviaQA`
- Metaculus / GJOpen: ToS-only (403 on direct JSON fetch today)
- Creative Commons 4.0 licence text (background)
