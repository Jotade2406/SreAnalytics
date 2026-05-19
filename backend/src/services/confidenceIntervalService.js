import jstat from 'jstat'
const { jStat } = jstat

/**
 * Confidence Interval calculation using Student's t-distribution.
 */
export function calculateCI(latencies, confidence = 0.99) {
  const values = latencies.map(l => parseFloat(l.latency_ms || l.latency || l))
  const n = values.length
  if (n < 2) return null

  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  const std = Math.sqrt(variance)

  // Median
  const sorted = [...values].sort((a, b) => a - b)
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  const alpha = 1 - confidence
  const tCritical = jStat.studentt.inv(1 - alpha / 2, n - 1)
  const margin = tCritical * std / Math.sqrt(n)

  return {
    mean: parseFloat(mean.toFixed(4)),
    std: parseFloat(std.toFixed(4)),
    median: parseFloat(median.toFixed(4)),
    ciLower: parseFloat((mean - margin).toFixed(4)),
    ciUpper: parseFloat((mean + margin).toFixed(4)),
    tCritical: parseFloat(tCritical.toFixed(4)),
    sampleSize: n,
    confidence,
  }
}
