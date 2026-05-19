import { Router } from 'express'
import { query } from '../db/connection.js'

const router = Router()

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT session_id, COUNT(*) as log_count, MAX(timestamp) as last_activity
      FROM request_logs
      GROUP BY session_id
      ORDER BY last_activity DESC
    `)
    res.json({ sessions: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
