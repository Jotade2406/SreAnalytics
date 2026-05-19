import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Zap, TrendingUp, Shield, Server } from 'lucide-react';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData } from './api';

const RiskGauge = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const r = 42, circ = 2 * Math.PI * r, dash = circ * value / 100 * 0.75;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 100 100" style={{ transform: 'rotate(-135deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
          <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${dash} ${circ}` }}
            transition={{ duration: 1.5, ease: 'easeOut' }} style={{ filter: `drop-shadow(0 0 8px ${color}88)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 900, color }}>{value}%</span>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
        </div>
      </div>
    </div>
  );
};

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

export const OverviewTab = ({ stats }: { stats: StatsData | null }) => {
  const kpis = stats ? [
    { label: 'Mean Latency', value: `${stats.mean.toFixed(1)}ms`, delta: stats.mean < 300 ? '✓ Normal' : '↑ High', good: stats.mean < 300, color: '#3b82f6', icon: Zap },
    { label: 'P99 / CI Upper', value: `${stats.ciUpper.toFixed(1)}ms`, delta: `±${((stats.ciUpper - stats.mean)).toFixed(1)}ms`, good: true, color: '#f59e0b', icon: TrendingUp },
    { label: 'Poisson Risk', value: `${stats.risk}%`, delta: stats.risk < 10 ? 'Low' : stats.risk < 20 ? 'Med' : 'High', good: stats.risk < 20, color: stats.risk >= 20 ? '#ef4444' : '#10b981', icon: Shield },
    { label: 'Sample Size', value: stats.sampleSize.toLocaleString(), delta: `n=${stats.sampleSize}`, good: true, color: '#8b5cf6', icon: Server },
  ] : null;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 }}>
        {kpis ? kpis.map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{k.label}</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>{k.value}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: k.color + '15', border: '1px solid ' + k.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={22} color={k.color} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: k.good ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 700 }}>{k.delta}</span>
            </div>
          </motion.div>
        )) : Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ ...S.card }}><Skel h={80} /></div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={S.card}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>Latency vs IC 99%</h3>
          {stats ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeSeries}>
                  <defs>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chartGrid} /><XAxis dataKey="t" {...chartAxis} /><YAxis {...chartAxis} tickFormatter={(v: number) => v + 'ms'} />
                  <Tooltip contentStyle={S.ttip} />
                  <Area type="monotone" dataKey="upper" stroke="#6366f155" fill="none" strokeDasharray="4 4" name="Upper CI" />
                  <Area type="monotone" dataKey="lower" stroke="#6366f155" fill="none" strokeDasharray="4 4" name="Lower CI" />
                  <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="url(#gL)" strokeWidth={2.5} name="Latency" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <Skel h={280} />}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={S.card}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 16 }}>Risk Assessment</h3>
          {stats ? (
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 280 }}>
              <RiskGauge value={Math.round(stats.risk)} label="Poisson Risk" color={stats.risk >= 20 ? '#ef4444' : '#f59e0b'} />
              <RiskGauge value={Math.min(100, Math.round(stats.sampleSize / 5))} label="Data Health" color="#10b981" />
            </div>
          ) : <Skel h={280} />}
        </motion.div>
      </div>

      {stats && stats.anomalies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ ...S.card, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AlertTriangle size={28} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, color: '#fca5a5', fontSize: '1rem' }}>
                {stats.anomalies.length} anomalías detectadas fuera del IC 99% — λ={stats.lambda.toFixed(2)}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                Session: {stats.sessionId} · Última actualización: {new Date(stats.calculatedAt).toLocaleTimeString()}
              </p>
            </div>
            <span style={S.badge('#ef4444') as any}>LIVE</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
