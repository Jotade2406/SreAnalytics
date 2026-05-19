import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, FlaskConical, Gauge, RefreshCw } from 'lucide-react';
import { S } from './styles';
import { fetchStats, fetchTests, fetchSessions } from './api';
import type { StatsData, HypTest, Session } from './api';
import { OverviewTab } from './OverviewTab';
import { PoissonTab } from './PoissonTab';
import { IntervalosTab } from './IntervalosTab';
import { ABTestsTab } from './ABTestsTab';

type Tab = 'overview' | 'poisson' | 'intervalos' | 'abtests';

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
];

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [sessionId] = useState('exp_A_baseline');
  const [stats, setStats]     = useState<StatsData | null>(null);
  const [tests, setTests]     = useState<HypTest[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
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

  // Poll stats every 10 s
  useEffect(() => {
    loadStats();
    const iv = setInterval(loadStats, 10_000);
    return () => clearInterval(iv);
  }, [loadStats]);

  // One-time fetches
  useEffect(() => {
    fetchTests().then(setTests).catch(() => {});
    fetchSessions().then(setSessions).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020817', color: '#e2e8f0', fontFamily: "'Inter',system-ui,sans-serif", position: 'relative' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-30px)}}*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#020817}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}`}</style>
      <Orbs />

      {/* Top Nav */}
      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ ...S.grad as any, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>SRE Analytics</h1>
          {sessions.length > 0 && (
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
          )}
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
            {tab === 'abtests'    && <ABTestsTab    tests={tests} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
