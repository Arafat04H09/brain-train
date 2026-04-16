export const CURRENT_VERSION = 1;

export const SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    start_ts INTEGER NOT NULL,
    end_ts INTEGER,
    plan_json TEXT NOT NULL,
    phase TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    kind TEXT NOT NULL,
    start_ts INTEGER,
    end_ts INTEGER,
    metacog_prediction REAL,
    actual_accuracy REAL,
    adaptive_params_json TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS trials (
    id TEXT PRIMARY KEY,
    block_id TEXT NOT NULL,
    trial_index INTEGER NOT NULL,
    stimulus_json TEXT NOT NULL,
    response_json TEXT,
    correct INTEGER,
    rt_ms INTEGER,
    requested_duration_ms INTEGER,
    achieved_duration_ms INTEGER,
    frames_rendered INTEGER,
    timing_flag TEXT,
    FOREIGN KEY(block_id) REFERENCES blocks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS domain_state (
    module_id TEXT PRIMARY KEY,
    level_json TEXT NOT NULL,
    ewma_performance REAL,
    last_session_ts INTEGER,
    sessions_total INTEGER DEFAULT 0,
    plateau_flag INTEGER DEFAULT 0,
    updated_ts INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS calibration_items (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    category TEXT,
    question TEXT NOT NULL,
    answer_type TEXT NOT NULL,
    choices_json TEXT,
    correct_answer TEXT NOT NULL,
    difficulty TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS calibration_reviews (
    item_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    confidence REAL NOT NULL,
    correct INTEGER NOT NULL,
    fsrs_state_json TEXT,
    PRIMARY KEY(item_id, ts),
    FOREIGN KEY(item_id) REFERENCES calibration_items(id)
  )`,
  `CREATE TABLE IF NOT EXISTS matrix_items (
    id TEXT PRIMARY KEY,
    matrix_type TEXT NOT NULL,
    rules_json TEXT NOT NULL,
    svg_seed TEXT NOT NULL,
    difficulty_est REAL,
    fsrs_state_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS metacog_predictions (
    block_id TEXT PRIMARY KEY,
    predicted_accuracy REAL NOT NULL,
    actual_accuracy REAL,
    brier_contribution REAL,
    FOREIGN KEY(block_id) REFERENCES blocks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transfer_assessments (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    score REAL NOT NULL,
    raw_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    migrated_ts INTEGER NOT NULL
  )`
];
