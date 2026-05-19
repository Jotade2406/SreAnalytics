import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { testConnection } from './db/connection.js'
import { createTables } from './db/createTables.js'
import logsRouter from './routes/logs.js'
import statsRouter from './routes/stats.js'
import hypothesisRouter from './routes/hypothesis.js'
import sessionsRouter from './routes/sessions.js'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SRE Analytics Backend' })
})

app.use('/api/logs', logsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/hypothesis-test', hypothesisRouter)
app.use('/api/sessions', sessionsRouter)

async function start() {
  const connected = await testConnection()
  if (!connected) {
    console.error('No se pudo conectar a MySQL')
    process.exit(1)
  }
  await createTables()
  app.listen(PORT, '0.0.0.0', () => {
    console.log('SRE Backend corriendo en puerto ' + PORT)
  })
}

start().catch(err => {
  console.error('Error al iniciar:', err)
  process.exit(1)
})