import { query } from './connection.js'

export async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL,
      timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      latency_ms DECIMAL(10,3) NOT NULL,
      status_code SMALLINT NOT NULL DEFAULT 200,
      endpoint VARCHAR(100) NOT NULL DEFAULT '/api/test',
      is_critical BOOLEAN GENERATED ALWAYS AS (latency_ms > 1500) STORED,
      INDEX idx_session (session_id),
      INDEX idx_timestamp (timestamp)
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS statistical_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      calculated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      session_id VARCHAR(50) NOT NULL,
      sample_size INT NOT NULL,
      mean_latency DECIMAL(10,4) NOT NULL,
      std_deviation DECIMAL(10,4) NOT NULL,
      median_latency DECIMAL(10,4) NOT NULL,
      ci_lower DECIMAL(10,4) NOT NULL,
      ci_upper DECIMAL(10,4) NOT NULL,
      lambda_value DECIMAL(10,6) NOT NULL,
      collapse_prob DECIMAL(10,8) NOT NULL,
      INDEX idx_session_time (session_id, calculated_at)
    )
  `)

  // Fix columns if table was created with wrong names (older schema)
  await fixSnapshotColumns()

  await query(`
    CREATE TABLE IF NOT EXISTS hypothesis_tests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      session_a VARCHAR(50) NOT NULL,
      session_b VARCHAR(50) NOT NULL,
      mean_a DECIMAL(10,4) NOT NULL,
      mean_b DECIMAL(10,4) NOT NULL,
      std_a DECIMAL(10,4) NOT NULL,
      std_b DECIMAL(10,4) NOT NULL,
      n_a INT NOT NULL,
      n_b INT NOT NULL,
      t_statistic DECIMAL(12,6) NOT NULL,
      degrees_of_freedom DECIMAL(10,4) NOT NULL,
      p_value DECIMAL(12,10) NOT NULL,
      reject_null BOOLEAN NOT NULL,
      conclusion TEXT NOT NULL
    )
  `)

  console.log('✓ Tablas creadas')
}

async function fixSnapshotColumns() {
  // Get current columns in statistical_snapshots
  const cols = await query(`SHOW COLUMNS FROM statistical_snapshots`)
  const colNames = cols.map(c => c.Field)

  // Rename ci_lower_bound -> ci_lower if needed
  if (colNames.includes('ci_lower_bound') && !colNames.includes('ci_lower')) {
    await query(`ALTER TABLE statistical_snapshots CHANGE ci_lower_bound ci_lower DECIMAL(10,4) NOT NULL`)
    console.log('✓ Renamed ci_lower_bound -> ci_lower')
  }
  // Rename ci_upper_bound -> ci_upper if needed
  if (colNames.includes('ci_upper_bound') && !colNames.includes('ci_upper')) {
    await query(`ALTER TABLE statistical_snapshots CHANGE ci_upper_bound ci_upper DECIMAL(10,4) NOT NULL`)
    console.log('✓ Renamed ci_upper_bound -> ci_upper')
  }
  // Rename collapse_prob_1min -> collapse_prob if needed
  if (colNames.includes('collapse_prob_1min') && !colNames.includes('collapse_prob')) {
    await query(`ALTER TABLE statistical_snapshots CHANGE collapse_prob_1min collapse_prob DECIMAL(10,8) NOT NULL`)
    console.log('✓ Renamed collapse_prob_1min -> collapse_prob')
  }
  // Add lambda_value if missing
  if (!colNames.includes('lambda_value')) {
    await query(`ALTER TABLE statistical_snapshots ADD COLUMN lambda_value DECIMAL(10,6) NOT NULL DEFAULT 0`)
    console.log('✓ Added lambda_value column')
  }
}
