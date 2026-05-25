import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData } from './api';
import { getSessionMeta } from './sessionMeta';

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

const RiskGauge = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const r = 42, circ = 2 * Math.PI * r, dash = circ * Math.min(value, 100) / 100 * 0.75;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-135deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
          <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${dash} ${circ}` }}
            transition={{ duration: 1.5, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 8px ${color}88)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{value.toFixed(1)}%</span>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textAlign: 'center' }}>{label}</span>
        </div>
      </div>
    </div>
  );
};

export const PoissonTab = ({ stats, sessionId }: { stats: StatsData | null; sessionId: string }) => {
  const meta = getSessionMeta(sessionId);

  // Notas basadas en \u03BB real, no en suposiciones del rol
  const lambda = stats?.lambda ?? 0;
  const highLambda = lambda >= 10;
  const contextNote: Record<string, string> = {
    baseline: highLambda
      ? `\u03BB = ${lambda.toFixed(2)} \u2014 el sistema base registra ${lambda.toFixed(0)} eventos cr\u00EDticos/min. Es el punto de referencia: compara contra otras versiones en A/B Tests.`
      : `\u03BB = ${lambda.toFixed(2)} \u2014 sistema base en zona estable. Punto de referencia para comparar optimizaciones.`,
    optimized: highLambda
      ? `\u03BB = ${lambda.toFixed(2)} \u2014 la latencia media mejor\u00F3 (verificable en A/B Tests), pero los spikes siguen siendo frecuentes. El cach\u00E9 mejora el percentil 50, no el 99.`
      : `\u03BB = ${lambda.toFixed(2)} \u2014 el cach\u00E9 redujo efectivamente los eventos cr\u00EDticos. Sistema validado en zona segura.`,
    hotfix: highLambda
      ? `\u03BB = ${lambda.toFixed(2)} \u2014 el hotfix mejor\u00F3 la latencia media pero los spikes persisten. Compara contra v3 en A/B Tests para ver el impacto real.`
      : `\u03BB = ${lambda.toFixed(2)} \u2014 el hotfix fue efectivo: se redujo la frecuencia de eventos cr\u00EDticos respecto al estado degradado.`,
    degraded:  `\u03BB = ${lambda.toFixed(2)} \u2014 servidor bajo stress: genera r\u00E1fagas de anomal\u00EDas frecuentes. Este es el escenario que Poisson predice antes de que ocurra.`,
    spike:     `\u03BB = ${lambda.toFixed(2)} \u2014 tr\u00E1fico extremo simulado. El predictor calcula P(X\u22655) en tiempo real: probabilidad de colapso en el pr\u00F3ximo minuto.`,
    unknown:   '',
  };

  return (
  <div>
    <div style={S.formula}>
      {'Pilar 1 \u00B7 Predictor de Colapsos  |  P(X = k) = (\u03BB^k \u00B7 e^(-\u03BB)) / k!  |  \u03BB = ' + (stats ? stats.lambda.toFixed(4) : '...')}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={S.card}>
        <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>
          {`Poisson Distribution (\u03BB=${stats ? stats.lambda.toFixed(2) : '...'})`}
        </h3>
        {stats ? (
          stats.lambda > 20 ? (
            // Saturación: lambda tan alto que la PMF para k=0..10 es ≈0
            // Mostrar vista de emergencia en lugar de un gráfico de barras vacío
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14, padding: '0 16px' }}>
              <span style={{ fontSize: 52 }}>⚠️</span>
              <p style={{ color: '#ef4444', fontWeight: 900, fontSize: 20, textAlign: 'center' }}>
                Sistema Saturado
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 1.65, maxWidth: 340 }}>
                λ = <span style={{ color: '#ef4444', fontWeight: 700 }}>{stats.lambda.toFixed(2)}</span> eventos críticos/minuto.
                La distribución de Poisson está centrada en k ≈ {Math.round(stats.lambda)}, muy por encima
                del rango k = 0..10. <strong style={{ color: '#fca5a5' }}>P(X ≥ 5) ≈ 100%</strong> — colapso en cascada prácticamente garantizado
                en el próximo intervalo.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={S.badge('#ef4444') as any}>λ = {stats.lambda.toFixed(2)}</span>
                <span style={S.badge('#ef4444') as any}>P(X≥5) ≈ 100%</span>
                <span style={S.badge('#ef4444') as any}>COLAPSO INMINENTE</span>
              </div>
            </div>
          ) : (
          <>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distribution}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="k" {...chartAxis} label={{ value: 'k (anomalías/min)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
                  <YAxis {...chartAxis} tickFormatter={(v: number) => (v * 100).toFixed(0) + '%'} />
                  <Tooltip contentStyle={S.ttip} formatter={(v: number) => [(v * 100).toFixed(2) + '%', 'P(X=k)']} />
                  <Bar dataKey="prob" radius={[6, 6, 0, 0]}>
                    {stats.distribution.map((d, i) => (
                      <Cell key={i} fill={d.k >= 5 ? '#ef4444' : d.k === 4 ? '#f59e0b' : '#6366f1'} fillOpacity={d.k >= 5 ? 0.9 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
              <span style={S.badge('#6366f1') as any}>Normal (k&lt;4)</span>
              <span style={S.badge('#f59e0b') as any}>Advertencia (k=4)</span>
              <span style={S.badge('#ef4444') as any}>Crítico (k≥5)</span>
            </div>
          </>
          )
        ) : <Skel h={300} />}
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={S.card}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>Cascade Risk Gauge</h3>
          {stats ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RiskGauge value={stats.risk} label="P(X\u22655) Risk" color={stats.risk >= 20 ? '#ef4444' : stats.risk >= 10 ? '#f59e0b' : '#10b981'} />
              </div>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
                Probabilidad de fallo en cascada en el próximo intervalo
              </p>
              {contextNote[meta.role] && (
                <div style={{
                  marginTop: 12,
                  background: `${meta.color}0D`,
                  border: `1px solid ${meta.color}33`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                  <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                    <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}: </span>
                    {contextNote[meta.role]}
                  </p>
                </div>
              )}
            </>
          ) : <Skel h={180} />}
        </div>

        <div style={S.card}>
          <h3 style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Key Metrics</h3>
          {stats ? (
            ([
              ['\u03BB (lambda)', stats.lambda.toFixed(4) + ' inc/win', '#6366f1'],
              ['E[X]', stats.lambda.toFixed(4), '#3b82f6'],
              ['Var(X)', stats.lambda.toFixed(4), '#06b6d4'],
              ['P(X=0)', (stats.distribution[0]?.pct ?? 0).toFixed(2) + '%', '#10b981'],
              ['P(X\u22655) Risk', stats.risk.toFixed(1) + '%', stats.risk >= 20 ? '#ef4444' : '#f59e0b'],
              ['collapseProb', stats.collapseProb.toFixed(6), '#8b5cf6'],
            ] as const).map(([l, v, c], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 5 ? '1px solid #1e293b' : 'none' }}>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{l}</span>
                <span style={{ color: c, fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{v}</span>
              </div>
            ))
          ) : <Skel h={160} />}
        </div>
      </motion.div>
    </div>
  </div>
  );
};
