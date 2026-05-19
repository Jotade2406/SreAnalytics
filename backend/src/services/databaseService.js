// ============================================================
// src/services/databaseService.js — Operaciones CRUD con MySQL
// ============================================================
// Centraliza TODAS las operaciones de base de datos.
//
// Tablas que gestiona:
//   1. request_logs          — Logs crudos de latencia por sesión
//   2. statistical_snapshots — Snapshots calculados (Poisson + IC)
//   3. hypothesis_tests      — Resultados de Welch T-Test
//
// Funciones exportadas:
//   - initializeTables()     → CREATE TABLE IF NOT EXISTS
//   - insertRequestLog(...)  → Inserta un log crudo
//   - getLatestLogs(...)     → Obtiene los últimos N logs de una sesión
//   - countLogsBySession(id) → Cuenta logs de una sesión (para auto-snapshot)
//   - insertStatisticalSnapshot(...)  → Guarda un snapshot calculado
//   - getStatisticalHistory(...)      → Histórico de snapshots
//   - insertHypothesisTest(...)       → Guarda resultado de t-test
// ============================================================

import { query } from '../db/connection.js';

const databaseService = {

  // ─── INICIALIZACIÓN ─────────────────────────────────────────
  /**
   * Crea las 3 tablas si no existen.
   * Se invoca al arrancar el servidor en index.js.
   */
  async initializeTables() {
    // Tabla 1: Logs crudos de peticiones
    await query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        session_id    VARCHAR(100) NOT NULL,
        timestamp     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        latency_ms    DOUBLE       NOT NULL,
        status_code   INT          DEFAULT NULL,
        endpoint      VARCHAR(255) DEFAULT NULL,
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session   (session_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tabla 2: Snapshots estadísticos calculados
    await query(`
      CREATE TABLE IF NOT EXISTS statistical_snapshots (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        session_id      VARCHAR(100) NOT NULL,
        sample_size     INT          NOT NULL,
        mean_latency    DOUBLE       NOT NULL,
        std_deviation   DOUBLE       NOT NULL,
        median_latency  DOUBLE       NOT NULL,
        ci_lower        DOUBLE       NOT NULL,
        ci_upper        DOUBLE       NOT NULL,
        lambda_value    DOUBLE       NOT NULL,
        collapse_prob   DOUBLE       NOT NULL,
        calculated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tabla 3: Resultados de pruebas de hipótesis
    await query(`
      CREATE TABLE IF NOT EXISTS hypothesis_tests (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        session_a           VARCHAR(100) NOT NULL,
        session_b           VARCHAR(100) NOT NULL,
        mean_a              DOUBLE NOT NULL,
        mean_b              DOUBLE NOT NULL,
        std_a               DOUBLE NOT NULL,
        std_b               DOUBLE NOT NULL,
        n_a                 INT    NOT NULL,
        n_b                 INT    NOT NULL,
        t_statistic         DOUBLE NOT NULL,
        degrees_of_freedom  DOUBLE NOT NULL,
        p_value             DOUBLE NOT NULL,
        reject_null         BOOLEAN NOT NULL,
        conclusion          TEXT    NOT NULL,
        tested_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sessions (session_a, session_b)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },

  // ─── REQUEST LOGS ───────────────────────────────────────────

  /**
   * Inserta un log crudo de latencia.
   * @returns {Object} Resultado con insertId
   */
  async insertRequestLog(sessionId, timestamp, latencyMs, statusCode, endpoint) {
    const result = await query(
      `INSERT INTO request_logs (session_id, timestamp, latency_ms, status_code, endpoint)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, timestamp, latencyMs, statusCode || null, endpoint || null]
    );
    return result;
  },

  /**
   * Obtiene los últimos N logs de una sesión.
   * Ordenados por timestamp DESC (más recientes primero).
   * @param {string} sessionId — ID de la sesión
   * @param {number} limit     — Máximo de registros (default 500)
   * @returns {Array} Filas de request_logs
   */
  async getLatestLogs(sessionId, limit = 500) {
    return query(
      `SELECT * FROM request_logs
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [sessionId, String(limit)]
    );
  },

  /**
   * Cuenta cuántos logs hay para una sesión.
   * Se usa para disparar auto-snapshot cada 100 inserciones.
   */
  async countLogsBySession(sessionId) {
    const rows = await query(
      'SELECT COUNT(*) AS total FROM request_logs WHERE session_id = ?',
      [sessionId]
    );
    return parseInt(rows[0].total);
  },

  // ─── STATISTICAL SNAPSHOTS ─────────────────────────────────

  /**
   * Guarda un snapshot de estadísticos calculados.
   */
  async insertStatisticalSnapshot(
    sessionId, sampleSize, meanLatency, stdDeviation,
    medianLatency, ciLower, ciUpper, lambdaValue, collapseProb
  ) {
    return query(
      `INSERT INTO statistical_snapshots
       (session_id, sample_size, mean_latency, std_deviation,
        median_latency, ci_lower, ci_upper, lambda_value, collapse_prob)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, sampleSize, meanLatency, stdDeviation,
       medianLatency, ciLower, ciUpper, lambdaValue, collapseProb]
    );
  },

  /**
   * Obtiene el histórico de snapshots de una sesión.
   * @param {string} sessionId — ID de la sesión
   * @param {number} limit     — Máximo de registros (default 100)
   */
  async getStatisticalHistory(sessionId, limit = 100) {
    return query(
      `SELECT * FROM statistical_snapshots
       WHERE session_id = ?
       ORDER BY calculated_at DESC
       LIMIT ?`,
      [sessionId, String(limit)]
    );
  },

  // ─── HYPOTHESIS TESTS ──────────────────────────────────────

  /**
   * Guarda el resultado de un Welch T-Test.
   */
  async insertHypothesisTest(
    sessionA, sessionB, meanA, meanB, stdA, stdB,
    nA, nB, tStatistic, df, pValue, rejectNull, conclusion
  ) {
    return query(
      `INSERT INTO hypothesis_tests
       (session_a, session_b, mean_a, mean_b, std_a, std_b,
        n_a, n_b, t_statistic, degrees_of_freedom, p_value,
        reject_null, conclusion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionA, sessionB, meanA, meanB, stdA, stdB,
       nA, nB, tStatistic, df, pValue, rejectNull ? 1 : 0, conclusion]
    );
  },
};

export default databaseService;
