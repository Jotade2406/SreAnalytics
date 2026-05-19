import { Router } from 'express'
import { query } from '../db/connection.js'
import { calculateCI } from '../services/confidenceIntervalService.js'
import { calculatePoisson } from '../services/poissonService.js'

const router = Router()

// GET /api/stats/latest?session_id=exp_A
router.get('/latest', async (req, res) => {
  try {
    const { session_id } = req.query
    if (!session_id) return res.status(400).json({ error: 'session_id requerido' })

    const logs = await query(
      'SELECT latency_ms, timestamp FROM request_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 500',
      [session_id]
    )
    if (logs.length < 10) {
      return res.json({ error: 'Datos insuficientes', count: logs.length })
    }

    const ci = calculateCI(logs)
    const poisson = calculatePoisson(logs)

    // Save snapshot
    await query(
      `INSERT INTO statistical_snapshots (session_id, sample_size, mean_latency, std_deviation, median_latency, ci_lower, ci_upper, lambda_value, collapse_prob)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session_id, ci.sampleSize, ci.mean, ci.std, ci.median, ci.ciLower, ci.ciUpper, poisson.lambda, poisson.collapseProb]
    )

    // Build time series (last 60 points)
    const recent = logs.slice(0, 60).reverse()
    const timeSeries = recent.map(l => {
      const lat = parseFloat(l.latency_ms)
      const ts = new Date(l.timestamp)
      return {
        t: `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`,
        latency: lat,
        upper: ci.ciUpper,
        lower: ci.ciLower,
        anomaly: lat > ci.ciUpper || lat < ci.ciLower,
      }
    })
    const anomalies = timeSeries.filter(d => d.anomaly)

    res.json({
      sessionId: session_id,
      sampleSize: ci.sampleSize,
      mean: ci.mean,
      std: ci.std,
      median: ci.median,
      ciLower: ci.ciLower,
      ciUpper: ci.ciUpper,
      lambda: poisson.lambda,
      risk: poisson.risk,
      collapseProb: poisson.collapseProb,
      timeSeries,
      distribution: poisson.distribution,
      anomalies,
      calculatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('GET /api/stats/latest error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/stats/history?session_id=exp_A&limit=100
router.get('/history', async (req, res) => {
  try {
    const { session_id, limit = 100 } = req.query
    if (!session_id) return res.status(400).json({ error: 'session_id requerido' })

    const rows = await query(
      'SELECT * FROM statistical_snapshots WHERE session_id = ? ORDER BY calculated_at DESC LIMIT ?',
      [session_id, parseInt(limit)]
    )
    res.json({ snapshots: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
