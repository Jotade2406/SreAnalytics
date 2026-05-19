import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle } from 'lucide-react';
import { S, chartAxis, chartGrid } from './styles';
import type { HypTest } from './api';

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

export const ABTestsTab = ({ tests }: { tests: HypTest[] }) => {
  const sigCount = tests.filter(t => t.reject_null).length;
  const chartData = tests.map(t => ({ name: `${t.session_a} vs ${t.session_b}`, meanA: t.mean_a, meanB: t.mean_b }));

  return (
    <div>
      <div style={S.formula}>
        {"Welch\u2019s t-test: t = (x\u0304\u2081 - x\u0304\u2082) / \u221A(s\u2081\u00B2/n\u2081 + s\u2082\u00B2/n\u2082)  |  \u03B1 = 0.05"}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...S.stat, borderLeft: '3px solid #10b981' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Significant Tests</p>
          <p style={{ color: '#10b981', fontSize: '2rem', fontWeight: 900 }}>{sigCount}/{tests.length || '—'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...S.stat, borderLeft: '3px solid #6366f1' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Total Tests Run</p>
          <p style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 900 }}>{tests.length || '0'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...S.stat, borderLeft: '3px solid #f59e0b' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Significance Rate</p>
          <p style={{ color: '#f59e0b', fontSize: '2rem', fontWeight: 900 }}>
            {tests.length ? Math.round(sigCount / tests.length * 100) + '%' : '—'}
          </p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {tests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Skel h={200} />
            <p style={{ color: '#64748b', marginTop: 16, fontSize: 13 }}>
              No hay tests aún. Usa POST /api/hypothesis-test para crear uno.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid #1e293b' }}>
                {['Session A', 'Session B', 'n_a', 'n_b', 'Mean A', 'Mean B', 't-stat', 'p-value', 'Result'].map(h => (
                  <th key={h} style={{ padding: '14px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <motion.tr key={t.id ?? i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  style={{ borderBottom: '1px solid #1e293b', background: t.reject_null ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{t.session_a}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{t.session_b}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'monospace' }}>{t.n_a}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'monospace' }}>{t.n_b}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#e2e8f0' }}>{Number(t.mean_a).toFixed(2)}ms</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: t.reject_null ? '#10b981' : '#e2e8f0', fontWeight: t.reject_null ? 700 : 400 }}>{Number(t.mean_b).toFixed(2)}ms</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{Number(t.t_statistic).toFixed(3)}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: t.p_value < 0.05 ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                    {t.p_value < 0.001 ? '<0.001' : Number(t.p_value).toFixed(4)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {t.reject_null
                      ? <span style={{ ...S.badge('#10b981') as any, gap: 4, display: 'inline-flex' }}><CheckCircle size={11} />Significant</span>
                      : <span style={{ ...S.badge('#64748b') as any, gap: 4, display: 'inline-flex' }}><XCircle size={11} />Not Sig.</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {tests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={S.card}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>Mean Latency Comparison</h3>
          <div style={{ height: Math.max(180, tests.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid {...chartGrid} />
                <XAxis type="number" {...chartAxis} tickFormatter={(v: number) => v + 'ms'} />
                <YAxis type="category" dataKey="name" {...chartAxis} width={140} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={S.ttip} />
                <Bar dataKey="meanA" fill="#6366f1" fillOpacity={0.7} radius={[0, 4, 4, 0]} name="Group A" />
                <Bar dataKey="meanB" fill="#10b981" fillOpacity={0.8} radius={[0, 4, 4, 0]} name="Group B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
};
