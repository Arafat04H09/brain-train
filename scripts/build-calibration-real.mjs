#!/usr/bin/env node
/**
 * Build a calibration item bank from REAL, verified open-source datasets only:
 *   - MMLU (Hendrycks) — MIT, pre-downloaded to /tmp/mmlu/data
 *   - TruthfulQA — Apache-2.0, fetched from GitHub
 *   - OpenTriviaDB — CC-BY-SA, fetched from public API with session token
 *
 * No synthetic/AI-generated fallback. If a source fails, skip it and log.
 * Writes src/core/modules/calibration/items.json.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MMLU_DIR = process.env.MMLU_DIR || './data/mmlu/test';
const OUTPUT_PATH = resolve(import.meta.dirname, '../src/core/modules/calibration/items.json');

// Map MMLU's 57 subjects to our 5 buckets.
// Skip medical/legal subjects that demand specialized expertise.
const MMLU_CATEGORY_MAP = {
  // geography
  'global_facts': 'geography', 'high_school_geography': 'geography',
  // history
  'high_school_european_history': 'history', 'high_school_us_history': 'history',
  'high_school_world_history': 'history', 'prehistory': 'history',
  'world_religions': 'history',
  // science
  'astronomy': 'science', 'college_biology': 'science',
  'college_chemistry': 'science', 'college_physics': 'science',
  'computer_security': 'science', 'conceptual_physics': 'science',
  'elementary_mathematics': 'science',  // math = science bucket
  'high_school_biology': 'science', 'high_school_chemistry': 'science',
  'high_school_computer_science': 'science', 'high_school_mathematics': 'science',
  'high_school_physics': 'science', 'high_school_statistics': 'science',
  'college_computer_science': 'science', 'college_mathematics': 'science',
  'abstract_algebra': 'science', 'machine_learning': 'science',
  'electrical_engineering': 'science', 'anatomy': 'science',
  'human_aging': 'science', 'nutrition': 'science', 'virology': 'science',
  // logic
  'formal_logic': 'logic', 'logical_fallacies': 'logic',
  'philosophy': 'logic', 'moral_disputes': 'logic',
  'moral_scenarios': 'logic',
  // estimation
  'econometrics': 'estimation', 'high_school_macroeconomics': 'estimation',
  'high_school_microeconomics': 'estimation', 'public_relations': 'estimation',
  // SKIP (too specialized / outdated / US-legal):
  // business_ethics, clinical_knowledge, college_medicine, human_sexuality,
  // international_law, jurisprudence, management, marketing, medical_genetics,
  // miscellaneous, high_school_government_and_politics, high_school_psychology,
  // security_studies, sociology, us_foreign_policy, professional_accounting,
  // professional_law, professional_medicine, professional_psychology
};

const LETTER_TO_IDX = { A: 0, B: 1, C: 2, D: 3 };

// ---------- MMLU (CSV) ----------
function parseCsvRow(line) {
  const cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { cells.push(cur); cur = ''; }
      else { cur += c; }
    }
  }
  cells.push(cur);
  return cells;
}

function ingestMmlu() {
  if (!existsSync(MMLU_DIR)) {
    console.warn(`MMLU: ${MMLU_DIR} not found, skipping`);
    return [];
  }
  const items = [];
  const files = readdirSync(MMLU_DIR).filter(f => f.endsWith('_test.csv'));
  let skipped = 0;
  for (const file of files) {
    const subject = file.replace('_test.csv', '');
    const category = MMLU_CATEGORY_MAP[subject];
    if (!category) { skipped++; continue; }
    const text = readFileSync(`${MMLU_DIR}/${file}`, 'utf8');
    const lines = text.split('\n').filter(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
      const row = parseCsvRow(lines[i]);
      if (row.length < 6) continue;
      const [q, a, b, c, d, correct] = row;
      const correctIdx = LETTER_TO_IDX[correct.trim().toUpperCase()];
      if (correctIdx === undefined) continue;
      items.push({
        id: `mmlu-${subject}-${i.toString().padStart(4, '0')}`,
        category,
        question: q.trim(),
        choices: [a.trim(), b.trim(), c.trim(), d.trim()],
        correctIndex: correctIdx,
        difficulty: 'medium',
      });
    }
  }
  console.log(`MMLU: ingested ${items.length} items from ${files.length - skipped} subjects (skipped ${skipped})`);
  return items;
}

// ---------- TruthfulQA ----------
async function ingestTruthfulQA() {
  const url = 'https://raw.githubusercontent.com/sylinrl/TruthfulQA/main/data/mc_task.json';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const items = [];
    for (let i = 0; i < data.length; i++) {
      const q = data[i];
      // mc1_targets is an object: { answerText: 0|1 } with exactly one 1 (the correct).
      const mc1 = q.mc1_targets;
      if (!mc1 || typeof mc1 !== 'object') continue;
      const entries = Object.entries(mc1);
      if (entries.length < 4) continue;
      // Find the correct answer + pick 3 distractors. Keep the first 4 entries
      // deterministically; if correct isn't in first 4, swap it in.
      const correctEntry = entries.find(([, v]) => v === 1);
      if (!correctEntry) continue;
      const distractors = entries.filter(([, v]) => v === 0).slice(0, 3);
      if (distractors.length < 3) continue;
      const pool = [correctEntry, ...distractors];
      // Seeded shuffle by item index so correctIndex varies instead of always 0
      const seed = i;
      for (let j = pool.length - 1; j > 0; j--) {
        const r = (seed * (j + 1)) % (j + 1);
        [pool[j], pool[r]] = [pool[r], pool[j]];
      }
      const correctIdx = pool.findIndex(([, v]) => v === 1);
      items.push({
        id: `tqa-${i.toString().padStart(4, '0')}`,
        category: 'logic', // TQA items test misconceptions; closest fit is logic
        question: q.question.trim(),
        choices: pool.map(([text]) => text.trim()),
        correctIndex: correctIdx,
        difficulty: 'hard',
      });
    }
    console.log(`TruthfulQA: ingested ${items.length} items`);
    return items;
  } catch (e) {
    console.warn(`TruthfulQA failed: ${e.message}`);
    return [];
  }
}

function categorizeTqa(cat, q) {
  if (!cat) return 'logic';
  const c = cat.toLowerCase();
  if (/geograph|country|capital|location/.test(c)) return 'geography';
  if (/history|year|date|era|war/.test(c)) return 'history';
  if (/scien|bio|chem|phys|health|medic|astronomy|nutri/.test(c)) return 'science';
  if (/statistic|probab|percent|number|estima|quantit/.test(c)) return 'estimation';
  return 'logic';
}

// ---------- OpenTriviaDB ----------
async function ingestOpenTriviaDB({ maxBatches = 60 } = {}) {
  const items = [];
  let token = null;
  try {
    const tr = await fetch('https://opentdb.com/api_token.php?command=request');
    const tj = await tr.json();
    token = tj.token;
  } catch (e) {
    console.warn('OTDB token fetch failed, continuing without token');
  }

  const htmlDecode = s => String(s)
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&eacute;/g, 'é')
    .replace(/&ntilde;/g, 'ñ').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
    .replace(/&hellip;/g, '…').replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"');

  const catMap = cat => {
    if (!cat) return 'logic';
    const c = cat.toLowerCase();
    if (/geograph/.test(c)) return 'geography';
    if (/history/.test(c)) return 'history';
    if (/scien|nature|computer|math|animal|vehicle/.test(c)) return 'science';
    if (/estima|quantit/.test(c)) return 'estimation';
    return 'logic';
  };

  let consecErrors = 0;
  for (let i = 0; i < maxBatches; i++) {
    const url = `https://opentdb.com/api.php?amount=50&type=multiple${token ? '&token=' + token : ''}`;
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 6000));
        consecErrors++;
        if (consecErrors > 5) break;
        continue;
      }
      if (!r.ok) { consecErrors++; if (consecErrors > 5) break; continue; }
      const j = await r.json();
      if (j.response_code === 4) break;  // token exhausted
      if (j.response_code !== 0) { consecErrors++; if (consecErrors > 5) break; continue; }
      consecErrors = 0;
      for (let k = 0; k < j.results.length; k++) {
        const it = j.results[k];
        const correct = htmlDecode(it.correct_answer);
        const incorrect = it.incorrect_answers.map(htmlDecode);
        // Deterministic shuffle by item index so correctIndex varies
        const seed = (i * 1000 + k);
        const pool = [...incorrect, correct];
        for (let j = pool.length - 1; j > 0; j--) {
          const r = (seed * (j + 1)) % (j + 1);
          [pool[j], pool[r]] = [pool[r], pool[j]];
        }
        const correctIdx = pool.indexOf(correct);
        items.push({
          id: `otdb-${i}-${k}`,
          category: catMap(it.category),
          question: htmlDecode(it.question),
          choices: pool,
          correctIndex: correctIdx,
          difficulty: it.difficulty || 'medium',
        });
      }
    } catch (e) {
      consecErrors++;
      if (consecErrors > 5) break;
    }
    // Polite spacing per OTDB rate limit guidance
    await new Promise(res => setTimeout(res, 5500));
    if (i % 10 === 9) console.log(`OTDB: ${items.length} items so far (batch ${i + 1}/${maxBatches})`);
  }
  console.log(`OpenTriviaDB: ingested ${items.length} items`);
  return items;
}

// ---------- Deduplicate + write ----------
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function main() {
  const mmlu = ingestMmlu();
  const tqa = await ingestTruthfulQA();
  const otdb = await ingestOpenTriviaDB({ maxBatches: 60 });

  const all = dedupe([...mmlu, ...tqa, ...otdb]);

  const byCat = {};
  for (const it of all) byCat[it.category] = (byCat[it.category] || 0) + 1;
  console.log(`Final: ${all.length} unique items`);
  console.log('By category:', byCat);
  console.log('By source:',
    'mmlu=' + all.filter(i => i.id.startsWith('mmlu-')).length,
    'tqa=' + all.filter(i => i.id.startsWith('tqa-')).length,
    'otdb=' + all.filter(i => i.id.startsWith('otdb-')).length
  );
  writeFileSync(OUTPUT_PATH, JSON.stringify(all, null, 0), 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
