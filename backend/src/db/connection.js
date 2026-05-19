import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '123456',
  database: process.env.MYSQL_DATABASE || 'stochastic_analysis',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values)
  return rows
}

export async function testConnection() {
  try {
    const conn = await pool.getConnection()
    conn.release()
    console.log('✓ MySQL conectado')
    return true
  } catch (err) {
    console.error('✗ Error MySQL:', err.message)
    return false
  }
}

export default pool
