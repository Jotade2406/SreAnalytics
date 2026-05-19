import React from 'react';
import { motion } from 'motion/react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData } from './api';

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

export const IntervalosTab = ({ stats }: { stats: StatsData | null }) => (
  <div>
    <div style={S.formula}>
      {`IC 99%: x\u0304 \u00B1 t_(\u03B1/2,n-1) \u00B7 (s/\u221An)  |  n=${stats?.sampleSize ?? '...'}, \u03B1=0.01`}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
      {stats ? ([
        ['Mean (x\u0304)', stats.mean.toFixed(2) + ' ms', '#3b82f6'],
        ['Std Dev (s)', stats.std.toFixed(2) + ' ms', '#8b5cf6'],
        ['CI Lower', stats.ciLower.toFixed(2) + ' ms', '#10b981'],
        ['CI Upper', stats.ciUpper.toFixed(2) + ' ms', '#f59e0b'],
      ] as const).map(([l, v, c], i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
          style={{ ...S.stat, borderLeft: '3px solid ' + c }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>{l}</p>
          <p style={{ color: c, fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace' }}>{v}</p>
        </motion.div>
      )) : Array.from({ length: 4 }).map((_, i) => <div key={i} style={S.stat}><Skel h={60} /></div>)}
    </div>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={S.card}>
      <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 4 }}>IC 99% con Anomalías</h3>
      <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
        Puntos rojos = observaciones fuera del intervalo · {stats ? `${stats.anomalies.length} anomalías detectadas` : '...'}
      </p>
      {stats ? (
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.timeSeries}>
              <defs>
                <linearGradient id="gCI2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="t" {...chartAxis} />
              <YAxis {...chartAxis} tickFormatter={(v: number) => v + 'ms'} domain={['auto', 'auto']} />
              <Tooltip contentStyle={S.ttip} />
              <Area type="monotone" dataKey="upper" stroke="#6366f1" fill="url(#gCI2)" strokeWidth={1.5} strokeDasharray="4 4" name="Upper CI" />
              <Area type="monotone" dataKey="lower" stroke="#6366f1" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Lower CI" />
              <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2.5} name="Latency"
                dot={(props: any) => {
                  const d = stats.timeSeries[props.index];
                  if (!d) return <React.Fragment key={props.index} />;
                  return d.anomaly
                    ? <circle key={props.index} cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#ef444488" strokeWidth={3} />
                    : <circle key={props.index} cx={props.cx} cy={props.cy} r={2} fill="#3b82f6" />;
                }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : <Skel h={320} />}
    </motion.div>

    {stats && stats.anomalies.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ ...S.card, marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(239,68,68,0.06)' }}>
          <h4 style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.9rem' }}>
            Anomalías detectadas ({stats.anomalies.length})
          </h4>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                {['Tiempo', 'Latency', 'CI Lower', 'CI Upper', '\u0394 Desvío'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.anomalies.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>{a.t}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>{a.latency}ms</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#64748b' }}>{a.lower.toFixed(1)}ms</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#64748b' }}>{a.upper.toFixed(1)}ms</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>
                    {a.latency > a.upper ? '+' : ''}{(a.latency - (a.latency > a.upper ? a.upper : a.lower)).toFixed(1)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    )}
  </div>
);
