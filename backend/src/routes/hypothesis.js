import { Router } from 'express'
import { query } from '../db/connection.js'
import { welchTTest } from '../services/hypothesisTestService.js'

const router = Router()

// POST /api/hypothesis-test
router.post('/', async (req, res) => {
  try {
    const { session_a, session_b } = req.body
    if (!session_a || !session_b) {
      return res.status(400).json({ error: 'session_a y session_b son requeridos' })
    }

    const logsA = await query(
      'SELECT latency_ms FROM request_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 500',
      [session_a]
    )
    const logsB = await query(
      'SELECT latency_ms FROM request_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 500',
      [session_b]
    )

    if (logsA.length < 2 || logsB.length < 2) {
      return res.status(400).json({ error: 'Datos insuficientes para ambas sesiones', countA: logsA.length, countB: logsB.length })
    }

    const result = welchTTest(logsA, logsB)

    // Save to DB
    await query(
      `INSERT INTO hypothesis_tests (session_a, session_b, mean_a, mean_b, std_a, std_b, n_a, n_b, t_statistic, degrees_of_freedom, p_value, reject_null, conclusion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session_a, session_b, result.meanA, result.meanB, result.stdA, result.stdB, result.nA, result.nB, result.tStatistic, result.degreesOfFreedom, result.pValue, result.rejectNull, result.conclusion]
    )

    res.json(result)
  } catch (err) {
    console.error('POST /api/hypothesis-test error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/hypothesis-tests
router.get('s', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM hypothesis_tests ORDER BY tested_at DESC LIMIT 20')
    res.json({ tests: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
