import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Loader2, FlaskConical, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { S, chartAxis, chartGrid } from './styles';
import type { HypTest, Session } from './api';
import * as XLSX from 'xlsx';

interface Props {
  tests: HypTest[];
  sessions: Session[];
  onRunTest: (a: string, b: string) => Promise<HypTest>;
}

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

const exportarExcel = (tests: HypTest[]) => {
  const datos = tests.map(t => ({
    'Sesi\u00F3n A': t.session_a,
    'Sesi\u00F3n B': t.session_b,
    'N (A)': t.n_a,
    'N (B)': t.n_b,
    'Media A (ms)': Number(t.mean_a).toFixed(2),
    'Media B (ms)': Number(t.mean_b).toFixed(2),
    'T-Estad\u00EDstico': Number(t.t_statistic).toFixed(4),
    'P-Valor': Number(t.p_value).toFixed(6),
    'Rechaza H\u2080': t.reject_null ? 'S\u00ED' : 'No',
    'Resultado': t.reject_null ? 'SIGNIFICATIVO' : 'NO SIGNIFICATIVO',
    'Conclusi\u00F3n': t.conclusion,
  }));

  const hoja = XLSX.utils.json_to_sheet(datos);

  const anchos = Object.keys(datos[0]).map(key => ({
    wch: Math.min(
      Math.max(key.length, ...datos.map(d => String((d as any)[key]).length)) + 2,
      key === 'Conclusi\u00F3n' ? 80 : 40
    )
  }));
  hoja['!cols'] = anchos;

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'A-B Tests');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `ab_tests_${fecha}.xlsx`);
};

export const ABTestsTab = ({ tests, sessions, onRunTest }: Props) => {
  const [sessionA, setSessionA] = useState('');
  const [sessionB, setSessionB] = useState('');
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<HypTest | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const sigCount = tests.filter(t => t.reject_null).length;
  const chartData = tests.map(t => ({ name: `${t.session_a} vs ${t.session_b}`, meanA: t.mean_a, meanB: t.mean_b }));
  const latestTest = tests.length > 0 ? tests[tests.length - 1] : null;

  const handleRunTest = async () => {
    if (!sessionA || !sessionB) return;
    if (sessionA === sessionB) { setRunError('Sessions must be different'); return; }
    setRunning(true); setRunError(null); setLastResult(null);
    try {
      const result = await onRunTest(sessionA, sessionB);
      const normalized: HypTest = {
        ...result,
        t_statistic: result.t_statistic ?? (result as any).tStatistic,
        p_value: result.p_value ?? (result as any).pValue,
        mean_a: result.mean_a ?? (result as any).meanA,
        mean_b: result.mean_b ?? (result as any).meanB,
        reject_null: result.reject_null ?? (result as any).rejectNull,
      };
      setLastResult(normalized);
    } catch { setRunError('Error running hypothesis test'); }
    finally { setRunning(false); }
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 8, padding: '10px 16px', color: '#a5b4fc', fontSize: 13, fontWeight: 600,
    fontFamily: 'monospace', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 0,
  };

  const improvement = latestTest ? ((latestTest.mean_a - latestTest.mean_b) / latestTest.mean_a * 100) : 0;

  return (
    <div>
      <div style={S.formula}>
        {"Welch\u2019s t-test: t = (x\u0304\u2081 - x\u0304\u2082) / \u221A(s\u2081\u00B2/n\u2081 + s\u2082\u00B2/n\u2082)  |  \u03B1 = 0.05"}
      </div>

      {/* Run New Test Panel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <FlaskConical size={18} style={{ color: '#6366f1' }} />
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem' }}>Run New Test</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Session A (Control)</label>
            <select id="select-session-a" value={sessionA} onChange={e => { setSessionA(e.target.value); setRunError(null); }} style={selectStyle}>
              <option value="">Select session\u2026</option>
              {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.session_id} ({s.log_count} logs)</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Session B (Variant)</label>
            <select id="select-session-b" value={sessionB} onChange={e => { setSessionB(e.target.value); setRunError(null); }} style={selectStyle}>
              <option value="">Select session\u2026</option>
              {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.session_id} ({s.log_count} logs)</option>)}
            </select>
          </div>
          <motion.button id="btn-run-test" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleRunTest}
            disabled={running || !sessionA || !sessionB}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none',
              background: (running || !sessionA || !sessionB) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#3b82f6)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: (running || !sessionA || !sessionB) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: (running || !sessionA || !sessionB) ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
            {running ? (<><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={14} /></motion.div>Running\u2026</>) : (<><FlaskConical size={14} />Run Welch's T-Test</>)}
          </motion.button>
        </div>
        {runError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{'\u26A0'} {runError}</motion.p>}
        <AnimatePresence>
          {lastResult && (
            <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }}
              style={{ marginTop: 20, padding: 16, borderRadius: 12, background: lastResult.reject_null ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${lastResult.reject_null ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {lastResult.reject_null ? <CheckCircle size={18} style={{ color: '#10b981' }} /> : <XCircle size={18} style={{ color: '#f59e0b' }} />}
                <span style={{ ...S.badge(lastResult.reject_null ? '#10b981' : '#f59e0b') as any, fontSize: '0.75rem' }}>{lastResult.reject_null ? 'SIGNIFICANT' : 'NOT SIGNIFICANT'}</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{lastResult.conclusion}</p>
              <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>t = <span style={{ color: '#a5b4fc', fontFamily: 'monospace', fontWeight: 700 }}>{Number(lastResult.t_statistic).toFixed(3)}</span></span>
                <span style={{ color: '#64748b', fontSize: 12 }}>p = <span style={{ color: lastResult.p_value < 0.05 ? '#10b981' : '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>{lastResult.p_value < 0.001 ? '<0.001' : Number(lastResult.p_value).toFixed(4)}</span></span>
                <span style={{ color: '#64748b', fontSize: 12 }}>Mean A: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{Number(lastResult.mean_a).toFixed(2)}ms</span></span>
                <span style={{ color: '#64748b', fontSize: 12 }}>Mean B: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{Number(lastResult.mean_b).toFixed(2)}ms</span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...S.stat, borderLeft: '3px solid #10b981' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Significant Tests</p>
          <p style={{ color: '#10b981', fontSize: '2rem', fontWeight: 900 }}>{sigCount}/{tests.length || '\u2014'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...S.stat, borderLeft: '3px solid #6366f1' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Total Tests Run</p>
          <p style={{ color: '#6366f1', fontSize: '2rem', fontWeight: 900 }}>{tests.length || '0'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...S.stat, borderLeft: '3px solid #f59e0b' }}>
          <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Significance Rate</p>
          <p style={{ color: '#f59e0b', fontSize: '2rem', fontWeight: 900 }}>{tests.length ? Math.round(sigCount / tests.length * 100) + '%' : '\u2014'}</p>
        </motion.div>
      </div>

      {/* Test History Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {tests.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px 0 14px' }}>
            <motion.button id="btn-export-excel" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => exportarExcel(tests)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
              <Download size={14} />Exportar Excel
            </motion.button>
          </div>
        )}
        {tests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Skel h={200} />
            <p style={{ color: '#64748b', marginTop: 16, fontSize: 13 }}>No hay tests a\u00FAn. Usa el panel "Run New Test" arriba para crear uno.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid #1e293b' }}>
                {['Session A', 'Session B', 'n_a', 'n_b', 'Mean A', 'Mean B', 't-stat', 'p-value', 'Result', 'Conclusion'].map(h => (
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
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: t.p_value < 0.05 ? '#10b981' : '#94a3b8', fontWeight: 700 }}>{t.p_value < 0.001 ? '<0.001' : Number(t.p_value).toFixed(4)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span title={t.conclusion} style={{ cursor: 'help' }}>
                      {t.reject_null
                        ? <span style={{ ...S.badge('#10b981') as any, gap: 4, display: 'inline-flex' }}><CheckCircle size={11} />Significant</span>
                        : <span style={{ ...S.badge('#64748b') as any, gap: 4, display: 'inline-flex' }}><XCircle size={11} />Not Sig.</span>}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.conclusion}>{t.conclusion}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Mean Latency Comparison Chart */}
      {tests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>Mean Latency Comparison</h3>
          <div style={{ height: 220 }}>
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

      {/* Last Test Interpretation */}
      {latestTest && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ ...S.card, background: latestTest.reject_null ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${latestTest.reject_null ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {latestTest.reject_null ? <CheckCircle size={20} style={{ color: '#10b981' }} /> : <XCircle size={20} style={{ color: '#f59e0b' }} />}
            <h3 style={{ ...S.grad as any, fontSize: '1.1rem' }}>Last Test Interpretation</h3>
            <span style={{ ...S.badge(latestTest.reject_null ? '#10b981' : '#f59e0b') as any, marginLeft: 'auto' }}>{latestTest.reject_null ? 'STATISTICALLY SIGNIFICANT' : 'NOT SIGNIFICANT'}</span>
          </div>
          <p style={{ color: latestTest.reject_null ? '#86efac' : '#fcd34d', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            {latestTest.reject_null
              ? `\u2705 The difference between sessions "${latestTest.session_a}" and "${latestTest.session_b}" is statistically significant (p < 0.05). This means the observed performance change is real and NOT due to random noise. The null hypothesis (H\u2080: \u03BC\u2081 = \u03BC\u2082) is rejected.`
              : `\u26A0\uFE0F The difference between sessions "${latestTest.session_a}" and "${latestTest.session_b}" is NOT statistically significant (p \u2265 0.05). The observed variation is likely just statistical noise. We fail to reject the null hypothesis (H\u2080: \u03BC\u2081 = \u03BC\u2082).`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Mean A</p>
              <p style={{ color: '#a5b4fc', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{Number(latestTest.mean_a).toFixed(2)}ms</p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Mean B</p>
              <p style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{Number(latestTest.mean_b).toFixed(2)}ms</p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Improvement</p>
              <p style={{ color: improvement > 0 ? '#10b981' : improvement < 0 ? '#ef4444' : '#94a3b8', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                {improvement > 0 ? <TrendingDown size={16} /> : improvement < 0 ? <TrendingUp size={16} /> : <Minus size={16} />}
                {Math.abs(improvement).toFixed(1)}%
              </p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>p-value</p>
              <p style={{ color: latestTest.p_value < 0.05 ? '#10b981' : '#f59e0b', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{latestTest.p_value < 0.001 ? '<0.001' : Number(latestTest.p_value).toFixed(4)}</p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>t-statistic</p>
              <p style={{ color: '#a5b4fc', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{Number(latestTest.t_statistic).toFixed(3)}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
