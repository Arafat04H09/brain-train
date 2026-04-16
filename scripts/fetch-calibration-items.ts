#!/usr/bin/env node

/**
 * Fetch calibration items from three open-source banks:
 * 1. OpenTriviaDB (CC-BY-SA 4.0) ~4k items
 * 2. MMLU (MIT) ~15.5k items across 57 subjects
 * 3. TruthfulQA (Apache-2.0) 817 adversarial items
 *
 * Output: src/core/modules/calibration/items.json
 * Schema: CalibItem[] with id, category, question, choices[], correctIndex, difficulty
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/core/modules/calibration/items.json');
const TEMP_DIR = path.join(ROOT_DIR, '.calibration-fetch-tmp');

interface CalibItem {
  id: string;
  category: 'geography' | 'history' | 'science' | 'logic' | 'estimation';
  question: string;
  choices: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Utility: HTML entity decoder
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&quot;': '"',
    '&#039;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  // Handle numeric entities like &#123;
  result = result.replace(/&#(\d+);/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 10));
  });
  return result;
}

// Utility: fetch with retry
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryFetch = () => {
      attempt++;
      https
        .get(url, { headers: { 'User-Agent': 'calibration-fetcher/1.0' } }, (res) => {
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
        .on('error', (err) => {
          if (attempt < maxRetries) {
            console.log(`Retry ${attempt}/${maxRetries} for ${url}`);
            setTimeout(tryFetch, 2000);
          } else {
            reject(err);
          }
        });
    };
    tryFetch();
  });
}

// Map OpenTriviaDB category codes to our 5 categories
function mapOpenTriviaCategory(category: string): 'geography' | 'history' | 'science' | 'logic' | 'estimation' {
  const map: Record<string, 'geography' | 'history' | 'science' | 'logic' | 'estimation'> = {
    'General Knowledge': 'logic',
    'Entertainment: Books': 'history',
    'Entertainment: Film': 'history',
    'Entertainment: Music': 'history',
    'Entertainment: Musicals & Theatres': 'history',
    'Entertainment: Television': 'history',
    'Entertainment: Video Games': 'logic',
    'Entertainment: Board Games': 'logic',
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
    'Entertainment: Comics': 'history',
    'Science: Biology': 'science',
    'Celebrities': 'history',
  };
  return map[category] || 'logic';
}

// Map MMLU subjects to our categories
function mapMMLUCategory(subject: string): 'geography' | 'history' | 'science' | 'logic' | 'estimation' {
  const categoryMap: Record<string, 'geography' | 'history' | 'science' | 'logic' | 'estimation'> = {
    // Science subjects
    'abstract_algebra': 'logic',
    'anatomy': 'science',
    'astronomy': 'science',
    'business_ethics': 'logic',
    'clinical_knowledge': 'science',
    'college_biology': 'science',
    'college_chemistry': 'science',
    'college_computer_science': 'logic',
    'college_mathematics': 'logic',
    'college_medicine': 'science',
    'college_physics': 'science',
    'computer_security': 'logic',
    'conceptual_physics': 'science',
    'econometrics': 'logic',
    'electrical_engineering': 'science',
    'elementary_mathematics': 'logic',
    'formal_logic': 'logic',
    'global_facts': 'geography',
    'high_school_biology': 'science',
    'high_school_chemistry': 'science',
    'high_school_computer_science': 'logic',
    'high_school_european_history': 'history',
    'high_school_geography': 'geography',
    'high_school_government_and_politics': 'history',
    'high_school_macroeconomics': 'logic',
    'high_school_mathematics': 'logic',
    'high_school_microeconomics': 'logic',
    'high_school_physics': 'science',
    'high_school_psychology': 'logic',
    'high_school_statistics': 'logic',
    'high_school_us_history': 'history',
    'high_school_world_history': 'history',
    'human_aging': 'science',
    'human_sexuality': 'science',
    'international_law': 'history',
    'jurisprudence': 'logic',
    'logical_fallacies': 'logic',
    'machine_learning': 'logic',
    'management': 'logic',
    'marketing': 'logic',
    'medical_genetics': 'science',
    'miscellaneous': 'logic',
    'moral_scenarios': 'logic',
    'nutrition': 'science',
    'philosophy': 'logic',
    'prehistory': 'history',
    'professional_accounting': 'logic',
    'professional_law': 'history',
    'professional_medicine': 'science',
    'professional_psychology': 'logic',
    'public_relations': 'logic',
    'security_studies': 'history',
    'sociology': 'logic',
    'us_foreign_policy': 'history',
    'virology': 'science',
    'world_religions': 'history',
  };
  return categoryMap[subject] || 'logic';
}

// Fetch OpenTriviaDB
async function fetchOpenTriviaDB(): Promise<CalibItem[]> {
  console.log('Fetching OpenTriviaDB...');
  const items: CalibItem[] = [];

  try {
    // Fetch ~80 requests of 50 items each = ~4000 items
    // Using session token to avoid duplicates
    let sessionToken = '';
    for (let i = 0; i < 80; i++) {
      const url = `https://opentdb.com/api.php?amount=50&type=multiple${sessionToken ? `&token=${sessionToken}` : ''}`;
      try {
        const response = await fetchWithRetry(url);
        const data = JSON.parse(response);

        if (data.response_code === 5) {
          console.log('Session token reset needed, fetching new token...');
          // Get a new session token
          const tokenRes = await fetchWithRetry('https://opentdb.com/api_token.php?command=request');
          const tokenData = JSON.parse(tokenRes);
          sessionToken = tokenData.token;
          continue;
        }

        if (data.response_code !== 0 || !data.results) {
          console.log(`OpenTriviaDB batch ${i + 1}: code ${data.response_code}, skipping`);
          if (i === 0) {
            throw new Error(`Failed to fetch OpenTriviaDB: code ${data.response_code}`);
          }
          continue;
        }

        for (const item of data.results) {
          const choices = [item.correct_answer, ...item.incorrect_answers];
          // Shuffle choices deterministically using item index
          const seed = items.length;
          for (let j = choices.length - 1; j > 0; j--) {
            const rng = Math.sin(seed + j) * 10000;
            const idx = Math.floor((rng - Math.floor(rng)) * (j + 1));
            [choices[j], choices[idx]] = [choices[idx], choices[j]];
          }

          const correctIndex = choices.indexOf(item.correct_answer);
          items.push({
            id: `otdb-${items.length}`,
            category: mapOpenTriviaCategory(item.category),
            question: decodeHtmlEntities(item.question),
            choices: choices.map(decodeHtmlEntities),
            correctIndex,
            difficulty: item.difficulty as 'easy' | 'medium' | 'hard',
          });
        }

        if ((i + 1) % 10 === 0) {
          console.log(`  Fetched ${Math.min((i + 1) * 50, 4000)} items from OpenTriviaDB`);
        }

        // Rate limiting: 5 seconds between requests
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (err) {
        console.warn(`OpenTriviaDB batch ${i + 1} failed:`, err);
        if (i === 0) throw err; // Fail hard on first batch
        break; // Stop if we're getting errors
      }
    }

    console.log(`OpenTriviaDB: fetched ${items.length} items`);
    return items;
  } catch (err) {
    console.error('OpenTriviaDB fetch failed:', err);
    return items;
  }
}

// Fetch MMLU from Hugging Face
async function fetchMMLA(): Promise<CalibItem[]> {
  console.log('Fetching MMLU...');
  const items: CalibItem[] = [];

  try {
    // List of MMLU subjects
    const subjects = [
      'abstract_algebra', 'anatomy', 'astronomy', 'business_ethics', 'clinical_knowledge',
      'college_biology', 'college_chemistry', 'college_computer_science', 'college_mathematics',
      'college_medicine', 'college_physics', 'computer_security', 'conceptual_physics',
      'econometrics', 'electrical_engineering', 'elementary_mathematics', 'formal_logic',
      'global_facts', 'high_school_biology', 'high_school_chemistry', 'high_school_computer_science',
      'high_school_european_history', 'high_school_geography', 'high_school_government_and_politics',
      'high_school_macroeconomics', 'high_school_mathematics', 'high_school_microeconomics',
      'high_school_physics', 'high_school_psychology', 'high_school_statistics',
      'high_school_us_history', 'high_school_world_history', 'human_aging', 'human_sexuality',
      'international_law', 'jurisprudence', 'logical_fallacies', 'machine_learning',
      'management', 'marketing', 'medical_genetics', 'miscellaneous', 'moral_scenarios',
      'nutrition', 'philosophy', 'prehistory', 'professional_accounting', 'professional_law',
      'professional_medicine', 'professional_psychology', 'public_relations', 'security_studies',
      'sociology', 'us_foreign_policy', 'virology', 'world_religions',
    ];

    for (const subject of subjects) {
      try {
        // Fetch test set
        const url = `https://huggingface.co/datasets/cais/mmlu/resolve/main/data/test/${subject}_test.csv`;
        const csv = await fetchWithRetry(url);
        const lines = csv.trim().split('\n');

        for (const line of lines) {
          const parts = line.split(',').map((p) => p.trim().replace(/^"(.*)"$/, '$1'));
          if (parts.length === 6) {
            const [question, a, b, c, d, answer] = parts;
            const choices = [a, b, c, d];
            const answerIndex = 'ABCD'.indexOf(answer);

            if (answerIndex >= 0) {
              items.push({
                id: `mmlu-${subject.substring(0, 3)}-${items.length % 10000}`,
                category: mapMMLUCategory(subject),
                question: question || 'Untitled',
                choices,
                correctIndex: answerIndex,
                difficulty: 'medium',
              });
            }
          }
        }

        if (items.length % 500 === 0 || items.length % 300 < 50) {
          console.log(`  MMLU: ${items.length} items fetched so far`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.warn(`MMLU subject ${subject} failed:`, err);
      }
    }

    console.log(`MMLU: fetched ${items.length} items`);
    return items;
  } catch (err) {
    console.error('MMLU fetch failed:', err);
    return items;
  }
}

// Fetch TruthfulQA
async function fetchTruthfulQA(): Promise<CalibItem[]> {
  console.log('Fetching TruthfulQA...');
  const items: CalibItem[] = [];

  try {
    const url = 'https://raw.githubusercontent.com/sylinrl/TruthfulQA/main/data/v0/TruthfulQA.csv';
    const csv = await fetchWithRetry(url);
    const lines = csv.trim().split('\n');

    // Parse CSV header
    const headers = lines[0].split(',');
    const qIdx = headers.findIndex((h) => h.toLowerCase() === 'question');
    const correctIdx = headers.findIndex((h) => h.toLowerCase().includes('best') && h.toLowerCase().includes('answer'));
    const incorrectIdx = headers.findIndex((h) => h.toLowerCase().includes('best') && h.toLowerCase().includes('incorrect'));

    if (qIdx === -1) {
      throw new Error('Could not find question column in TruthfulQA');
    }

    for (let i = 1; i < lines.length && i < 818; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"(.*)"$/, '$1'));
      if (parts.length > Math.max(qIdx, correctIdx, incorrectIdx)) {
        const question = parts[qIdx];
        const bestCorrect = correctIdx >= 0 ? parts[correctIdx] : 'Unknown';
        const bestIncorrect = incorrectIdx >= 0 ? parts[incorrectIdx] : 'Incorrect';

        // For TruthfulQA, we'll create 4-choice items by picking the best answer and 3 plausible distractors
        // Since the CSV doesn't have multiple choices, we'll generate simple ones
        const choices = [bestCorrect, bestIncorrect, 'Unknown', 'Unable to determine'];
        const correctIndex = 0;

        items.push({
          id: `tqa-${String(i - 1).padStart(4, '0')}`,
          category: 'logic',
          question,
          choices,
          correctIndex,
          difficulty: 'hard',
        });
      }
    }

    console.log(`TruthfulQA: fetched ${items.length} items`);
    return items;
  } catch (err) {
    console.error('TruthfulQA fetch failed:', err);
    return items;
  }
}

// Deduplicate items by question text
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

// Main execution
async function main() {
  console.log('Starting calibration item fetch...\n');

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  let allItems: CalibItem[] = [];

  // Fetch from all sources
  try {
    const otdbItems = await fetchOpenTriviaDB();
    allItems = allItems.concat(otdbItems);
  } catch (err) {
    console.error('OpenTriviaDB fetch failed, continuing...', err);
  }

  try {
    const mmluItems = await fetchMMLA();
    allItems = allItems.concat(mmluItems);
  } catch (err) {
    console.error('MMLU fetch failed, continuing...', err);
  }

  try {
    const tqaItems = await fetchTruthfulQA();
    allItems = allItems.concat(tqaItems);
  } catch (err) {
    console.error('TruthfulQA fetch failed, continuing...', err);
  }

  console.log(`\nTotal items before dedup: ${allItems.length}`);

  // Deduplicate
  allItems = deduplicate(allItems);
  console.log(`Total items after dedup: ${allItems.length}`);

  // Verify counts per category
  const categoryCounts: Record<string, number> = {};
  for (const item of allItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }
  console.log('\nItems per category:');
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`  ${cat}: ${count}`);
  }

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2));
  console.log(`\nWrote ${allItems.length} items to ${OUTPUT_FILE}`);

  // Print summary
  const sourceBreakdown = {
    openTrivia: allItems.filter((i) => i.id.startsWith('otdb-')).length,
    mmlu: allItems.filter((i) => i.id.startsWith('mmlu-')).length,
    truthful: allItems.filter((i) => i.id.startsWith('tqa-')).length,
  };
  console.log('\nSource breakdown:');
  console.log(`  OpenTriviaDB: ${sourceBreakdown.openTrivia}`);
  console.log(`  MMLU: ${sourceBreakdown.mmlu}`);
  console.log(`  TruthfulQA: ${sourceBreakdown.truthful}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
