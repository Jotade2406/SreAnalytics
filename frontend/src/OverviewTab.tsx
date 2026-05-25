import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Zap, TrendingUp, Shield, Server, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData } from './api';
import { getSessionMeta, SESSION_META, ROLE_LABELS } from './sessionMeta';

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

const getAlert = (lambda: number, riskPct: number) => {
  const risk = riskPct / 100;
  if (lambda >= 15 || risk >= 0.30) return {
    bg: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', iconColor: '#ef4444', Icon: ShieldX,
    text: `🚨 Riesgo Crítico — λ=${lambda.toFixed(2)} supera el umbral máximo. Probabilidad de fallo en cascada: ${(risk * 100).toFixed(1)}%. Acción inmediata requerida.`
  };
  if (lambda >= 10 || risk >= 0.15) return {
    bg: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d', iconColor: '#f59e0b', Icon: ShieldAlert,
    text: `⚠️ Advertencia — λ=${lambda.toFixed(2)} en zona de alerta. Monitorear de cerca. P(fallo) = ${(risk * 100).toFixed(1)}%.`
  };
  return {
    bg: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', color: '#86efac', iconColor: '#10b981', Icon: ShieldCheck,
    text: `✅ Sistema Estable — λ=${lambda.toFixed(2)} dentro de parámetros normales. Riesgo de fallo: ${(risk * 100).toFixed(1)}%.`
  };
};

export const OverviewTab = ({ stats, sessionId }: { stats: StatsData | null; sessionId: string }) => {
  const meta = getSessionMeta(sessionId);
  const compareWith = meta.compareWith ? SESSION_META[meta.compareWith] : null;
  const kpis = stats ? [
    { label: 'Mean Latency', value: `${stats.mean.toFixed(1)}ms`, delta: stats.mean < 300 ? '✓ Normal' : '↑ High', good: stats.mean < 300, color: '#3b82f6', icon: Zap },
    { label: 'P99 / CI Upper', value: `${stats.ciUpper.toFixed(1)}ms`, delta: `±${((stats.ciUpper - stats.mean)).toFixed(1)}ms`, good: true, color: '#f59e0b', icon: TrendingUp },
    { label: 'Poisson Risk', value: `${stats.risk}%`, delta: stats.risk < 10 ? 'Low' : stats.risk < 20 ? 'Med' : 'High', good: stats.risk < 20, color: stats.risk >= 20 ? '#ef4444' : '#10b981', icon: Shield },
    { label: 'Sample Size', value: stats.sampleSize.toLocaleString(), delta: `n=${stats.sampleSize}`, good: true, color: '#8b5cf6', icon: Server },
  ] : null;

  const alert = stats ? getAlert(stats.lambda, stats.risk) : null;

  return (
    <div>
      {/* Scenario Context Card */}
      {sessionId && (
        <motion.div
          key={sessionId}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `${meta.color}0D`,
            border: `1px solid ${meta.color}33`,
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1.2 }}>{meta.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ color: meta.color, fontWeight: 800, fontSize: 14 }}>{meta.label}</span>
              <span style={S.badge(meta.color) as any}>{ROLE_LABELS[meta.role]}</span>
              <span style={{ color: '#475569', fontSize: 12 }}>{meta.scenario}</span>
            </div>
            {meta.narrative && (
              <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{meta.narrative}</p>
            )}
          </div>
          {compareWith && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <p style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Comparar con
              </p>
              <p style={{ color: '#6366f1', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {compareWith.emoji} {compareWith.label}
              </p>
              <p style={{ color: '#475569', fontSize: 10 }}>pestaña A/B Tests</p>
            </div>
          )}
        </motion.div>
      )}

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

      {stats && alert && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ background: alert.bg, border: alert.border, borderRadius: 12, padding: '14px 20px', marginBottom: 24, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, color: alert.color }}>
          <alert.Icon size={22} style={{ color: alert.iconColor, flexShrink: 0 }} />
          <span>{alert.text}</span>
        </motion.div>
      )}

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
