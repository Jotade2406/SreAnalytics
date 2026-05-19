import { Router } from 'express'
import { query } from '../db/connection.js'
import { calculateCI } from '../services/confidenceIntervalService.js'
import { calculatePoisson } from '../services/poissonService.js'

const router = Router()

// POST /api/logs — Insert a request log
router.post('/', async (req, res) => {
  try {
    const { session_id, latency_ms, status_code = 200, endpoint = '/api/test', timestamp } = req.body
    if (!session_id || !latency_ms || latency_ms <= 0) {
      return res.status(400).json({ error: 'session_id y latency_ms (>0) son requeridos' })
    }

    const ts = timestamp || new Date().toISOString().slice(0, 23).replace('T', ' ')
    const result = await query(
      'INSERT INTO request_logs (session_id, latency_ms, status_code, endpoint, timestamp) VALUES (?, ?, ?, ?, ?)',
      [session_id, latency_ms, status_code, endpoint, ts]
    )

    // Auto-snapshot every 50 logs
    const countRows = await query('SELECT COUNT(*) as cnt FROM request_logs WHERE session_id = ?', [session_id])
    const total = countRows[0]?.cnt || 0
    let snapshot = null

    if (total > 10 && total % 50 === 0) {
      const logs = await query(
        'SELECT latency_ms, timestamp FROM request_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 500',
        [session_id]
      )
      const ci = calculateCI(logs)
      const poisson = calculatePoisson(logs)
      if (ci) {
        await query(
          `INSERT INTO statistical_snapshots (session_id, sample_size, mean_latency, std_deviation, median_latency, ci_lower, ci_upper, lambda_value, collapse_prob)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [session_id, ci.sampleSize, ci.mean, ci.std, ci.median, ci.ciLower, ci.ciUpper, poisson.lambda, poisson.collapseProb]
        )
        snapshot = { ...ci, ...poisson }
      }
    }

    res.json({ success: true, id: result?.insertId, total, snapshot })
  } catch (err) {
    console.error('POST /api/logs error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
