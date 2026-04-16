export interface CalibItem {
  id: string;
  category: 'geography' | 'history' | 'science' | 'logic' | 'estimation';
  question: string;
  choices: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Import items from aggregated JSON built via scripts/build-calibration-hybrid.ts
// Sources:
//   - TruthfulQA (817 items, Apache-2.0 license, github.com/sylinrl/TruthfulQA)
//   - Curated seed (45 items, verified public-domain knowledge)
//   - Synthetic variants (9,138 items, generated from seed for category balance)
// Total: 10,000 deduped items across 5 categories
// License: TruthfulQA items are Apache-2.0; synthetic items are our own work
import itemsData from './items.json' assert { type: 'json' };

export const CALIBRATION_ITEMS: CalibItem[] = itemsData as CalibItem[];
