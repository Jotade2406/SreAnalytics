/**
 * Poisson distribution service.
 * Groups latencies by minute, counts critical events (> threshold),
 * computes lambda and full PMF.
 *
 * Fix: collapseProb = 1 - P(X<5).  The old approach summed P(5..10)
 * which collapses to ~0 when lambda is large (e.g. degraded/spike
 * sessions where lambda >> 10), giving a false 0% risk reading.
 */
export function calculatePoisson(latencies, threshold = 1500) {
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

  // Extend range so the chart is meaningful for high-lambda sessions.
  // k=0..10 is fine for normal load; for degraded/spike we show up to
  // ceil(lambda)+5 capped at 40 to keep the API response small.
  const maxK = lambda <= 10 ? 10 : Math.min(40, Math.ceil(lambda) + 5)

  // PMF using log-space arithmetic to avoid numeric overflow at large k/lambda
  const pmf = (k) => {
    if (lambda === 0) return k === 0 ? 1 : 0
    let logP = -lambda + k * Math.log(lambda)
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    return Math.exp(logP)
  }

  const distribution = Array.from({ length: maxK + 1 }, (_, k) => {
    const prob = parseFloat(pmf(k).toFixed(6))
    return {
      k,
      prob,
      pct: parseFloat((prob * 100).toFixed(2)),
      critical: k >= 5,
    }
  })

  // P(X >= 5) = 1 - P(X <= 4)  — correct even when lambda >> 10
  const probBelow5 = distribution.slice(0, 5).reduce((s, d) => s + d.prob, 0)
  const collapseProb = parseFloat(Math.max(0, Math.min(1, 1 - probBelow5)).toFixed(8))
  const risk = parseFloat((collapseProb * 100).toFixed(1))

  return {
    lambda: parseFloat(lambda.toFixed(4)),
    risk,
    collapseProb,
    distribution,
  }
}
