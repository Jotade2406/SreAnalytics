import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, FlaskConical, Gauge, RefreshCw, ChevronDown, Server } from 'lucide-react';
import { S } from './styles';
import { fetchStats, fetchTests, fetchSessions, runHypothesisTest } from './api';
import type { StatsData, HypTest, Session } from './api';
import { OverviewTab } from './OverviewTab';
import { PoissonTab } from './PoissonTab';
import { IntervalosTab } from './IntervalosTab';
import { ABTestsTab } from './ABTestsTab';
import { RecursosTab } from './RecursosTab';

type Tab = 'overview' | 'poisson' | 'intervalos' | 'abtests' | 'recursos';

const Orbs = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    {[
      { w: 400, bg: 'radial-gradient(circle,#6366f1,transparent)', t: '10%', l: '80%', d: 0 },
      { w: 350, bg: 'radial-gradient(circle,#3b82f6,transparent)', t: '60%', l: '5%', d: 2 },
      { w: 300, bg: 'radial-gradient(circle,#06b6d4,transparent)', t: '80%', l: '65%', d: 4 },
    ].map((o, i) => (
      <motion.div key={i} animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 8, delay: o.d, ease: 'easeInOut' }}
        style={S.orb(o.w, o.bg, o.t, o.l, 0) as any} />
    ))}
  </div>
);

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Overview',   icon: Gauge },
  { id: 'poisson',    label: 'Poisson',    icon: BarChart3 },
  { id: 'intervalos', label: 'Intervalos', icon: Activity },
  { id: 'abtests',    label: 'A/B Tests',  icon: FlaskConical },
  { id: 'recursos',   label: 'Recursos',   icon: Server },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [sessionId, setSessionId] = useState('');
  const [stats, setStats]     = useState<StatsData | null>(null);
  const [tests, setTests]     = useState<HypTest[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await fetchStats(sessionId);
      if (data && !('error' in data)) {
        setStats(data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError((data as any).error ?? 'Sin datos suficientes');
      }
    } catch {
      setError('Backend no disponible en localhost:5000');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load sessions on mount, set first session as default
  useEffect(() => {
    fetchSessions()
      .then(s => {
        setSessions(s);
        if (s.length > 0 && !sessionId) {
          setSessionId(s[0].session_id);
        }
      })
      .catch(() => {});
  }, []);

  // Poll stats every 10 s
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    loadStats();
    const iv = setInterval(loadStats, 10_000);
    return () => clearInterval(iv);
  }, [loadStats]);

  // Fetch tests on mount
  useEffect(() => {
    fetchTests().then(setTests).catch(() => {});
  }, []);

  // Re-fetch sessions periodically (in case load-generator creates new ones)
  useEffect(() => {
    const iv = setInterval(() => {
      fetchSessions().then(setSessions).catch(() => {});
    }, 15_000);
    return () => clearInterval(iv);
  }, []);

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 8,
    padding: '6px 32px 6px 12px',
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'monospace',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 180,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', fontFamily: "'Inter',system-ui,sans-serif", position: 'relative' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-30px)}}*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#020817}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}`}</style>
      <Orbs />

      {/* Top Nav */}
      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ ...S.grad as any, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>SRE Analytics</h1>

          {/* Session Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              id="session-selector"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              style={selectStyle}
            >
              {sessions.length === 0 && (
                <option value="">Loading sessions…</option>
              )}
              {sessions.map(s => (
                <option key={s.session_id} value={s.session_id}>
                  {s.session_id} ({s.log_count} logs)
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#6366f1' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => (
            <motion.button key={t.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setTab(t.id)} style={S.pill(tab === t.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><t.icon size={14} />{t.label}</span>
            </motion.button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading && !stats
            ? <span style={S.badge('#f59e0b') as any}>LOADING...</span>
            : error
              ? <span style={S.badge('#ef4444') as any}>OFFLINE</span>
              : <span style={S.badge('#10b981') as any}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />LIVE
                </span>
          }
          <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
            onClick={loadStats} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <RefreshCw size={16} />
          </motion.button>
          {lastUpdate && (
            <span style={{ color: '#475569', fontSize: 11 }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '10px 32px', fontSize: 13, color: '#fca5a5' }}>
          ⚠ {error} — mostrando estado anterior o esperando datos suficientes (n≥10).
        </div>
      )}

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
            {tab === 'overview'   && <OverviewTab   stats={stats} />}
            {tab === 'poisson'    && <PoissonTab    stats={stats} />}
            {tab === 'intervalos' && <IntervalosTab stats={stats} />}
            {tab === 'abtests'    && (
              <ABTestsTab
                tests={tests}
                sessions={sessions}
                onRunTest={async (a, b) => {
                  const result = await runHypothesisTest(a, b);
                  const updated = await fetchTests();
                  setTests(updated);
                  return result;
                }}
              />
            )}
            {tab === 'recursos'   && <RecursosTab stats={stats} sessions={sessions} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
