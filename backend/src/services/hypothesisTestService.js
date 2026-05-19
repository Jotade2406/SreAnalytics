import jstat from 'jstat'
const { jStat } = jstat

/**
 * Welch's t-test for two independent samples.
 */
export function welchTTest(latenciesA, latenciesB, alpha = 0.05) {
  const valsA = latenciesA.map(l => parseFloat(l.latency_ms || l.latency || l))
  const valsB = latenciesB.map(l => parseFloat(l.latency_ms || l.latency || l))

  const nA = valsA.length, nB = valsB.length
  if (nA < 2 || nB < 2) return null

  const meanA = valsA.reduce((s, v) => s + v, 0) / nA
  const meanB = valsB.reduce((s, v) => s + v, 0) / nB
  const varA = valsA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (nA - 1)
  const varB = valsB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (nB - 1)
  const stdA = Math.sqrt(varA), stdB = Math.sqrt(varB)

  const seA = varA / nA, seB = varB / nB
  const t = (meanA - meanB) / Math.sqrt(seA + seB)

  // Welch-Satterthwaite degrees of freedom
  const num = (seA + seB) ** 2
  const den = (seA ** 2) / (nA - 1) + (seB ** 2) / (nB - 1)
  const df = num / den

  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df))
  const rejectNull = pValue < alpha

  const improvement = meanA !== 0
    ? parseFloat((((meanA - meanB) / meanA) * 100).toFixed(2))
    : 0

  const conclusion = rejectNull
    ? `Se rechaza H₀ (p=${pValue.toFixed(6)} < α=${alpha}). Hay diferencia estadísticamente significativa entre las sesiones. La sesión B es ${improvement > 0 ? 'más rápida' : 'más lenta'} en un ${Math.abs(improvement)}%.`
    : `No se rechaza H₀ (p=${pValue.toFixed(6)} ≥ α=${alpha}). No hay evidencia suficiente de diferencia significativa entre las sesiones.`

  return {
    meanA: parseFloat(meanA.toFixed(4)),
    meanB: parseFloat(meanB.toFixed(4)),
    stdA: parseFloat(stdA.toFixed(4)),
    stdB: parseFloat(stdB.toFixed(4)),
    nA, nB,
    tStatistic: parseFloat(t.toFixed(6)),
    degreesOfFreedom: parseFloat(df.toFixed(4)),
    pValue: parseFloat(pValue.toFixed(10)),
    rejectNull,
    conclusion,
    improvement,
  }
}
