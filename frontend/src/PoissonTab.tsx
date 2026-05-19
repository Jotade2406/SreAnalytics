import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData } from './api';

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

export const PoissonTab = ({ stats }: { stats: StatsData | null }) => (
  <div>
    <div style={S.formula}>
      {'P(X = k) = (\u03BB^k \u00B7 e^(-\u03BB)) / k!  |  \u03BB = ' + (stats ? stats.lambda.toFixed(4) : '...')}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={S.card}>
        <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>
          {`Poisson Distribution (\u03BB=${stats ? stats.lambda.toFixed(2) : '...'})`}
        </h3>
        {stats ? (
          <>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distribution}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="k" {...chartAxis} label={{ value: 'k (incidents)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
                  <YAxis {...chartAxis} tickFormatter={(v: number) => (v * 100).toFixed(0) + '%'} />
                  <Tooltip contentStyle={S.ttip} formatter={(v: number) => [(v * 100).toFixed(2) + '%', 'P(X=k)']} />
                  <Bar dataKey="prob" radius={[6, 6, 0, 0]}>
                    {stats.distribution.map((_, i) => (
                      <Cell key={i} fill={i >= 5 ? '#ef4444' : i >= 4 ? '#f59e0b' : '#6366f1'} fillOpacity={i >= 5 ? 0.9 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
              <span style={S.badge('#6366f1') as any}>Normal</span>
              <span style={S.badge('#f59e0b') as any}>Warning (k=4)</span>
              <span style={S.badge('#ef4444') as any}>Critical (k≥5)</span>
            </div>
          </>
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
                Probability of cascade failure in next window
              </p>
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
