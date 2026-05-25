export type SessionRole = 'baseline' | 'optimized' | 'degraded' | 'hotfix' | 'spike' | 'unknown'

export interface SessionMeta {
  label: string
  scenario: string
  role: SessionRole
  narrative: string
  color: string
  emoji: string
  compareWith?: string
}

export const SESSION_META: Record<string, SessionMeta> = {
  exp_A_baseline: {
    label: 'v1 · Línea Base',
    scenario: 'Sistema original sin ninguna optimización',
    role: 'baseline',
    narrative:
      'Punto de referencia del análisis. Latencia media ~200ms con distribución normal. ' +
      'Es el "antes" de cualquier mejora — cada otra sesión se compara estadísticamente contra esta.',
    color: '#3b82f6',
    emoji: '📊',
    compareWith: 'exp_B_optimized',
  },
  exp_B_optimized: {
    label: 'v2 · Con Caché',
    scenario: 'Optimización aplicada: caché + queries SQL mejoradas',
    role: 'optimized',
    narrative:
      'El mismo sistema con caché habilitado y consultas SQL optimizadas. ' +
      'El Welch T-Test contra v1 rechaza H₀ (p < 0.05): la mejora es real, no azar estadístico.',
    color: '#10b981',
    emoji: '🚀',
    compareWith: 'exp_A_baseline',
  },
  exp_C_degraded: {
    label: 'v3 · Servidor Degradado',
    scenario: 'Sistema bajo stress extremo / recursos insuficientes',
    role: 'degraded',
    narrative:
      'Simula el servidor "pesado": λ alta, anomalías frecuentes fuera del IC 99%, latencias extremas. ' +
      'Exactamente el escenario que la distribución de Poisson predice antes de que ocurra.',
    color: '#ef4444',
    emoji: '🔴',
    compareWith: 'exp_D_hotfix',
  },
  exp_D_hotfix: {
    label: 'v4 · Post-Hotfix',
    scenario: 'Sistema tras corrección de emergencia aplicada',
    role: 'hotfix',
    narrative:
      'Después de detectar la degradación crítica (v3) y aplicar un fix de emergencia. ' +
      'Compara contra v3 con Welch T-Test para medir el impacto real del hotfix con evidencia estadística.',
    color: '#f59e0b',
    emoji: '🔧',
    compareWith: 'exp_C_degraded',
  },
  exp_E_spike: {
    label: 'v5 · Pico de Tráfico',
    scenario: 'Ráfaga extrema de usuarios / evento viral simulado',
    role: 'spike',
    narrative:
      'Simula una ráfaga de tráfico extrema — el escenario de "el servidor se va a caer". ' +
      'El predictor de Poisson calcula P(X≥5) en tiempo real: la probabilidad de colapso en el próximo minuto.',
    color: '#8b5cf6',
    emoji: '⚡',
    compareWith: 'exp_A_baseline',
  },
}

export const getSessionMeta = (sessionId: string): SessionMeta =>
  SESSION_META[sessionId] ?? {
    label: sessionId,
    scenario: 'Sesión de datos',
    role: 'unknown',
    narrative: '',
    color: '#64748b',
    emoji: '📁',
  }

export const ROLE_LABELS: Record<SessionRole, string> = {
  baseline:  'REFERENCIA',
  optimized: 'OPTIMIZADO',
  degraded:  'DEGRADADO',
  hotfix:    'POST-HOTFIX',
  spike:     'PICO',
  unknown:   'DESCONOCIDO',
}

export const SUGGESTED_COMPARISONS = [
  {
    a: 'exp_A_baseline',
    b: 'exp_B_optimized',
    title: 'Efecto del Caché',
    description: '¿El caché y las queries optimizadas reducen significativamente la latencia?',
    expectation: 'Esperamos rechazar H₀ — v2 debería ser más rápida que v1.',
    color: '#10b981',
  },
  {
    a: 'exp_C_degraded',
    b: 'exp_D_hotfix',
    title: 'Impacto del Hotfix',
    description: '¿El hotfix de emergencia resolvió la degradación del servidor?',
    expectation: 'Si el fix funcionó, v4 debería tener menor latencia que v3.',
    color: '#f59e0b',
  },
  {
    a: 'exp_A_baseline',
    b: 'exp_E_spike',
    title: 'Normal vs Pico de Tráfico',
    description: '¿Cuánto se deteriora el sistema ante una ráfaga extrema de usuarios?',
    expectation: 'v5 debería mostrar latencia mucho mayor — diferencia altamente significativa.',
    color: '#8b5cf6',
  },
]
