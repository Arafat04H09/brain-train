#!/usr/bin/env node

/**
 * Optimized fetcher for calibration items from three sources with parallel operations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/core/modules/calibration/items.json');

interface CalibItem {
  id: string;
  category: 'geography' | 'history' | 'science' | 'logic' | 'estimation';
  question: string;
  choices: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  result = result.replace(/&#(\d+);/g, (match, code) => {
    try {
      return String.fromCharCode(parseInt(code, 10));
    } catch {
      return match;
    }
  });
  return result;
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);

    proto
      .get(url, { headers: { 'User-Agent': 'calibration-fetcher/1.0' } }, (res) => {
        clearTimeout(timer);
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

function mapOpenTriviaCategory(cat: string): 'geography' | 'history' | 'science' | 'logic' | 'estimation' {
  const map: Record<string, 'geography' | 'history' | 'science' | 'logic' | 'estimation'> = {
    'General Knowledge': 'logic',
    'Entertainment: Books': 'history',
    'Entertainment: Film': 'history',
    'Entertainment: Music': 'history',
    'Entertainment: Television': 'history',
    'Entertainment: Video Games': 'logic',
    'Science & Nature': 'science',
    'Science: Computers': 'science',
    'Science: Mathematics': 'logic',
    'Science: Gadgets': 'science',
    'Mythology': 'history',
    'Sports': 'history',
    'Geography': 'geography',
    'History': 'history',
    'Politics': 'history',
    'Art': 'history',
    'Animals': 'science',
    'Vehicles': 'science',
    'Celebrities': 'history',
  };
  return map[cat] || 'logic';
}

function mapMMLUCategory(subj: string): 'geography' | 'history' | 'science' | 'logic' | 'estimation' {
  const map: Record<string, 'geography' | 'history' | 'science' | 'logic' | 'estimation'> = {
    'abstract_algebra': 'logic',
    'anatomy': 'science',
    'astronomy': 'science',
    'college_biology': 'science',
    'college_chemistry': 'science',
    'college_computer_science': 'logic',
    'college_mathematics': 'logic',
    'college_physics': 'science',
    'conceptual_physics': 'science',
    'elementary_mathematics': 'logic',
    'formal_logic': 'logic',
    'global_facts': 'geography',
    'high_school_biology': 'science',
    'high_school_chemistry': 'science',
    'high_school_computer_science': 'logic',
    'high_school_european_history': 'history',
    'high_school_geography': 'geography',
    'high_school_government_and_politics': 'history',
    'high_school_mathematics': 'logic',
    'high_school_physics': 'science',
    'high_school_statistics': 'logic',
    'high_school_us_history': 'history',
    'high_school_world_history': 'history',
    'human_aging': 'science',
    'machine_learning': 'logic',
    'moral_scenarios': 'logic',
    'nutrition': 'science',
    'philosophy': 'logic',
    'prehistory': 'history',
    'us_foreign_policy': 'history',
    'virology': 'science',
    'world_religions': 'history',
  };
  return map[subj] || 'logic';
}

async function fetchOpenTriviaDB(): Promise<CalibItem[]> {
  console.log('Fetching OpenTriviaDB (20 batches x 50)...');
  const items: CalibItem[] = [];
  let sessionToken = '';

  try {
    // Get session token first
    try {
      const tokenRes = await fetchWithTimeout('https://opentdb.com/api_token.php?command=request');
      const tokenData = JSON.parse(tokenRes);
      if (tokenData.token) {
        sessionToken = tokenData.token;
        console.log('  Got session token');
      }
    } catch (err) {
      console.warn('  Failed to get session token, continuing without');
    }

    for (let i = 0; i < 20; i++) {
      try {
        const url = `https://opentdb.com/api.php?amount=50&type=multiple${sessionToken ? `&token=${sessionToken}` : ''}`;
        const response = await fetchWithTimeout(url);
        const data = JSON.parse(response);

        if (data.response_code === 5) {
          // Session token exhausted
          console.log('  Session token exhausted, stopping');
          break;
        }

        if (data.response_code !== 0 || !data.results) {
          console.warn(`  Batch ${i + 1}: HTTP ${data.response_code}, stopping`);
          break;
        }

        for (const item of data.results) {
          const choices = [item.correct_answer, ...item.incorrect_answers];
          // Seeded shuffle
          const seed = items.length;
          for (let j = choices.length - 1; j > 0; j--) {
            const rng = Math.sin(seed + j) * 10000;
            const idx = Math.floor((rng - Math.floor(rng)) * (j + 1));
            [choices[j], choices[idx]] = [choices[idx], choices[j]];
          }

          items.push({
            id: `otdb-${items.length}`,
            category: mapOpenTriviaCategory(item.category),
            question: decodeHtmlEntities(item.question),
            choices: choices.map(decodeHtmlEntities),
            correctIndex: choices.indexOf(item.correct_answer),
            difficulty: item.difficulty,
          });
        }

        console.log(`  Batch ${i + 1}: fetched ${(i + 1) * 50} items total`);

        // Rate limiting
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.warn(`  Batch ${i + 1} failed:`, err instanceof Error ? err.message : err);
        if (i === 0) throw err;
        break;
      }
    }
  } catch (err) {
    console.error('OpenTriviaDB fatal:', err);
  }

  console.log(`OpenTriviaDB: ${items.length} items`);
  return items;
}

async function fetchMMLA(): Promise<CalibItem[]> {
  console.log('Fetching MMLU (sampling 10 subjects)...');
  const items: CalibItem[] = [];

  // Sample of important subjects to keep request count manageable
  const subjects = [
    'high_school_biology',
    'high_school_chemistry',
    'high_school_us_history',
    'high_school_world_history',
    'high_school_geography',
    'college_biology',
    'college_chemistry',
    'college_physics',
    'formal_logic',
    'abstract_algebra',
  ];

  for (const subject of subjects) {
    try {
      const url = `https://huggingface.co/datasets/cais/mmlu/resolve/main/data/test/${subject}_test.csv`;
      const csv = await fetchWithTimeout(url, 20000);
      const lines = csv.trim().split('\n');

      let count = 0;
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim().replace(/^"(.*)"$/, '$1'));
        if (parts.length >= 6) {
          const [question, a, b, c, d, answer] = parts;
          const answerIdx = 'ABCD'.indexOf(answer);
          if (answerIdx >= 0 && question) {
            items.push({
              id: `mmlu-${subject.substring(0, 4)}-${count}`,
              category: mapMMLUCategory(subject),
              question,
              choices: [a, b, c, d],
              correctIndex: answerIdx,
              difficulty: 'medium',
            });
            count++;
          }
        }
      }

      console.log(`  ${subject}: ${count} items`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`  ${subject}: failed`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`MMLU: ${items.length} items`);
  return items;
}

async function fetchTruthfulQA(): Promise<CalibItem[]> {
  console.log('Fetching TruthfulQA...');
  const items: CalibItem[] = [];

  try {
    const url = 'https://raw.githubusercontent.com/sylinrl/TruthfulQA/main/data/v0/TruthfulQA.csv';
    const csv = await fetchWithTimeout(url, 20000);
    const lines = csv.trim().split('\n');

    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const qIdx = headers.findIndex((h) => h === 'question');

    if (qIdx === -1) {
      throw new Error('No question column');
    }

    for (let i = 1; i < Math.min(lines.length, 819); i++) {
      try {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"(.*)"$/, '$1'));
        if (parts[qIdx]) {
          const question = parts[qIdx];
          items.push({
            id: `tqa-${String(i - 1).padStart(4, '0')}`,
            category: 'logic',
            question,
            choices: ['Most likely true', 'Uncertain', 'Possibly false', 'Likely false'],
            correctIndex: 0,
            difficulty: 'hard',
          });
        }
      } catch {
        // Skip malformed lines
      }
    }

    console.log(`TruthfulQA: ${items.length} items`);
  } catch (err) {
    console.error('TruthfulQA:', err instanceof Error ? err.message : err);
  }

  return items;
}

function deduplicate(items: CalibItem[]): CalibItem[] {
  const seen = new Set<string>();
  const result: CalibItem[] = [];
  for (const item of items) {
    const key = item.question.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

async function main() {
  console.log('=== Calibration Item Fetcher ===\n');

  const [otdbItems, mmluItems, tqaItems] = await Promise.all([
    fetchOpenTriviaDB(),
    fetchMMLA(),
    fetchTruthfulQA(),
  ]);

  const allItems = [...otdbItems, ...mmluItems, ...tqaItems];
  console.log(`\nTotal before dedup: ${allItems.length}`);

  const deduped = deduplicate(allItems);
  console.log(`Total after dedup: ${deduped.length}\n`);

  // Category breakdown
  const cats: Record<string, number> = {};
  for (const item of deduped) {
    cats[item.category] = (cats[item.category] || 0) + 1;
  }

  console.log('Items per category:');
  for (const [cat, count] of Object.entries(cats)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log('\nSource breakdown:');
  console.log(`  OpenTriviaDB: ${deduped.filter((i) => i.id.startsWith('otdb-')).length}`);
  console.log(`  MMLU: ${deduped.filter((i) => i.id.startsWith('mmlu-')).length}`);
  console.log(`  TruthfulQA: ${deduped.filter((i) => i.id.startsWith('tqa-')).length}`);

  // Write
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2));
  console.log(`\nWrote to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
