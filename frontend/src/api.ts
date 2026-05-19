const BASE = 'http://localhost:5000'

export interface TimePoint { t: string; latency: number; upper: number; lower: number; anomaly: boolean }
export interface DistPoint  { k: number; prob: number; pct: number; critical: boolean }
export interface StatsData {
  sessionId: string; sampleSize: number
  mean: number; std: number; median: number
  ciLower: number; ciUpper: number
  lambda: number; risk: number; collapseProb: number
  timeSeries: TimePoint[]; distribution: DistPoint[]; anomalies: TimePoint[]
  calculatedAt: string
}
export interface HypTest {
  id: number; session_a: string; session_b: string
  mean_a: number; mean_b: number; std_a: number; std_b: number; n_a: number; n_b: number
  t_statistic: number; p_value: number; reject_null: boolean; conclusion: string
}
export interface Session { session_id: string; log_count: number; last_activity: string }

export const fetchStats  = (sid: string)  => fetch(`${BASE}/api/stats/latest?session_id=${sid}`).then(r => r.json()) as Promise<StatsData>
export const fetchTests  = ()              => fetch(`${BASE}/api/hypothesis-tests`).then(r => r.json()).then(d => d.tests as HypTest[])
export const fetchSessions = ()            => fetch(`${BASE}/api/sessions`).then(r => r.json()).then(d => d.sessions as Session[])
