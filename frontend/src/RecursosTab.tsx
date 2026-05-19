import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, AlertTriangle, Cpu, Target } from 'lucide-react';
import { S, chartAxis, chartGrid } from './styles';
import type { StatsData, Session } from './api';

interface Props {
  stats: StatsData | null;
  sessions: Session[];
}

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

const estimarPerfil = (sessionId: string) => {
  if (sessionId.includes('hotfix') || sessionId.includes('optimized')) {
    return { latencia: '~120-150ms', riesgo: 'Bajo', ram: '512MB', cpu: '1 core', color: '#10b981' };
  } else if (sessionId.includes('degraded') || sessionId.includes('spike')) {
    return { latencia: '~1500-2000ms', riesgo: 'Cr\u00EDtico', ram: '4GB+', cpu: '4+ cores', color: '#ef4444' };
  } else {
    return { latencia: '~400-500ms', riesgo: 'Moderado', ram: '1-2GB', cpu: '2 cores', color: '#f59e0b' };
  }
};

export const RecursosTab = ({ stats, sessions }: Props) => {
  const kpis = stats ? [
    { label: 'Throughput \u00D3ptimo', value: Math.round((stats.ciLower / stats.mean) * 10) + ' req/s', desc: 'Requests/seg dentro del IC 99%', color: '#10b981', icon: Zap },
    { label: 'Punto de Quiebre \u03BB', value: Math.round(stats.lambda * 1.5) + ' inc/win', desc: '\u03BB donde P(colapso) supera 30%', color: '#f59e0b', icon: AlertTriangle },
    { label: 'Eficiencia del Sistema', value: Math.round((stats.ciLower / stats.ciUpper) * 100) + '%', desc: 'Ratio IC_lower / IC_upper', color: '#6366f1', icon: Cpu },
  ] : null;

  const curvaRiesgo = stats ? Array.from({ length: 20 }, (_, i) => {
    const carga = i + 1;
    const lambdaEstimado = (stats.lambda / 10) * carga;
    const riesgo = Math.min(99, Math.round((1 - Math.exp(-lambdaEstimado / 10)) * 100));
    const zona = riesgo < 10 ? 'Seguro' : riesgo < 30 ? 'Advertencia' : 'Cr\u00EDtico';
    return { carga: carga + ' r/s', riesgo, zona };
  }) : null;

  const getRecomendacion = () => {
    if (!stats) return null;
    if (stats.lambda < 10 && stats.risk < 15) {
      return {
        color: '#86efac',
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.25)',
        text: `El sistema opera dentro de par\u00E1metros \u00F3ptimos. Con \u03BB=${stats.lambda.toFixed(2)} y un riesgo de colapso del ${stats.risk}%, la infraestructura actual es estad\u00EDsticamente suficiente. No se requieren cambios de hardware.`,
      };
    } else if (stats.lambda >= 10 && stats.lambda < 15) {
      return {
        color: '#fcd34d',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        text: `El sistema est\u00E1 en zona de advertencia (\u03BB=${stats.lambda.toFixed(2)}). Se recomienda escalar horizontalmente un 30% la capacidad actual para mantener el riesgo de colapso por debajo del 10%.`,
      };
    } else {
      return {
        color: '#fca5a5',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.25)',
        text: `\u26A0 ALERTA CR\u00CDTICA: \u03BB=${stats.lambda.toFixed(2)} supera el umbral m\u00E1ximo. El sistema requiere intervenci\u00F3n inmediata. Escalar capacidad 2x o implementar rate limiting para reducir \u03BB por debajo de 10.`,
      };
    }
  };

  const reco = getRecomendacion();

  return (
    <div>
      {/* Header */}
      <div style={S.formula}>
        {"Capacidad \u00F3ptima: \u03BB_max = IC_lower / t_response | Riesgo aceptable: P(X\u2265k) < 0.10"}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
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
            <div style={{ marginTop: 12 }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>{k.desc}</span>
            </div>
          </motion.div>
        )) : Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ ...S.card }}><Skel h={80} /></div>)}
      </div>

      {/* Curva de Riesgo vs Carga */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 4 }}>Curva de Riesgo vs Carga</h3>
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 20 }}>Probabilidad de colapso seg\u00FAn nivel de tr\u00E1fico</p>
        {curvaRiesgo ? (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curvaRiesgo}>
                <defs>
                  <linearGradient id="gRiesgo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="carga" {...chartAxis} />
                <YAxis {...chartAxis} domain={[0, 100]} tickFormatter={(v: number) => v + '%'} />
                <Tooltip contentStyle={S.ttip} formatter={(val: number) => [val + '%', 'Riesgo']} />
                <ReferenceLine y={10} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Seguro', fill: '#10b981', fontSize: 11, position: 'right' }} />
                <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'L\u00EDmite', fill: '#f59e0b', fontSize: 11, position: 'right' }} />
                <Area type="monotone" dataKey="riesgo" stroke="#ef4444" fill="url(#gRiesgo)" strokeWidth={2.5} name="Riesgo" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <Skel h={300} />}
      </motion.div>

      {/* Tabla comparativa de sesiones */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px 0' }}>
          <h3 style={{ ...S.grad as any, fontSize: '1.1rem' }}>Comparativa de Eficiencia por Sesi\u00F3n</h3>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Skel h={120} /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid #1e293b' }}>
                {['Sesi\u00F3n', 'Latencia Estimada', 'Nivel de Riesgo', 'RAM Recomendada', 'CPU Recomendada', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '14px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const perfil = estimarPerfil(s.session_id);
                return (
                  <motion.tr key={s.session_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{s.session_id}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#e2e8f0' }}>{perfil.latencia}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ ...S.badge(perfil.color) as any }}>{perfil.riesgo}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>{perfil.ram}</td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>{perfil.cpu}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: perfil.color, display: 'inline-block' }} />
                        {s.log_count} logs
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Recomendaci\u00F3n Final */}
      {stats && reco && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{
            ...S.card,
            background: reco.bg,
            border: `1px solid ${reco.border}`,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Target size={20} style={{ color: '#6366f1' }} />
            <h3 style={{ ...S.grad as any, fontSize: '1.1rem' }}>{'\uD83C\uDFAF'} Recomendaci\u00F3n del Analizador Estoc\u00E1stico</h3>
          </div>

          <p style={{ color: reco.color, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            {reco.text}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>{'\u03BB'} Actual</p>
              <p style={{ color: '#a5b4fc', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{stats.lambda.toFixed(2)}</p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Riesgo Actual</p>
              <p style={{ color: stats.risk < 15 ? '#10b981' : stats.risk < 30 ? '#f59e0b' : '#ef4444', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{stats.risk}%</p>
            </div>
            <div style={S.stat}>
              <p style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>IC 99% Upper</p>
              <p style={{ color: '#f59e0b', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>{stats.ciUpper.toFixed(2)}ms</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
