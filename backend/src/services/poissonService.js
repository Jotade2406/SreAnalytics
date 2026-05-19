/**
 * Poisson distribution service.
 * Groups latencies by minute, counts critical events (> threshold),
 * computes lambda and full PMF k=0..10.
 */
export function calculatePoisson(latencies, threshold = 1500) {
  // Group by minute buckets
  const buckets = {}
  for (const entry of latencies) {
    const ts = new Date(entry.timestamp || entry.t)
    const minuteKey = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}-${ts.getHours()}-${ts.getMinutes()}`
    if (!buckets[minuteKey]) buckets[minuteKey] = 0
    if (entry.latency_ms > threshold || entry.latency > threshold) {
      buckets[minuteKey]++
    }
  }

  const counts = Object.values(buckets)
  const lambda = counts.length > 0
    ? counts.reduce((s, c) => s + c, 0) / counts.length
    : 0

  // PMF using log to avoid overflow
  const distribution = Array.from({ length: 11 }, (_, k) => {
    let logP = -lambda + k * Math.log(lambda || 1e-10)
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    const prob = lambda > 0 ? Math.exp(logP) : (k === 0 ? 1 : 0)
    return {
      k,
      prob: parseFloat(prob.toFixed(6)),
      pct: parseFloat((prob * 100).toFixed(2)),
      critical: k >= 5,
    }
  })

  const collapseProb = distribution.filter(d => d.k >= 5).reduce((s, d) => s + d.prob, 0)
  const risk = parseFloat((collapseProb * 100).toFixed(1))

  return {
    lambda: parseFloat(lambda.toFixed(4)),
    risk,
    collapseProb: parseFloat(collapseProb.toFixed(8)),
    distribution,
  }
}
