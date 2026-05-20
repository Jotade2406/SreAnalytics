import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { S, chartAxis, chartGrid } from './styles';
import { fetchStats } from './api';
import type { StatsData, Session } from './api';

const Skel = ({ h = 40 }: { h?: number }) => (
  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
    style={{ width: '100%', height: h, background: 'rgba(99,102,241,0.12)', borderRadius: 8 }} />
);

// --- Cálculo del t crítico aproximado usando interpolación ---
const calcTCritico = (nivel: number): number => {
  const alpha = 1 - nivel / 100;
  const alphaHalf = alpha / 2;
  const tabla: [number, number][] = [
    [0.10, 1.282], [0.05, 1.645], [0.025, 1.960],
    [0.01, 2.326], [0.005, 2.576], [0.001, 3.090], [0.0005, 3.291]
  ];
  for (let i = 0; i < tabla.length - 1; i++) {
    if (alphaHalf >= tabla[i + 1][0] && alphaHalf <= tabla[i][0]) {
      const t = tabla[i][1] + (tabla[i + 1][1] - tabla[i][1]) *
        (tabla[i][0] - alphaHalf) / (tabla[i][0] - tabla[i + 1][0]);
      return t;
    }
  }
  return 2.576;
};

interface SessionStats {
  sessionId: string;
  mean: number;
  std: number;
  sampleSize: number;
  ciLower: number;
  ciUpper: number;
  amplitud: number;
  riesgo: 'BAJO' | 'MODERADO' | 'ALTO';
  riesgoColor: string;
}

const QUICK_LEVELS = [80, 85, 90, 95, 99];

interface Props {
  stats: StatsData | null;
  sessions: Session[];
}

export const IntervalosTab = ({ stats, sessions }: Props) => {
  const [nivel, setNivel] = useState(99);
  const [sessionStats, setSessionStats] = useState<SessionStats[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Cálculos dinámicos basados en el nivel seleccionado ---
  const tCritico = calcTCritico(nivel);
  const margen = stats ? tCritico * (stats.std / Math.sqrt(stats.sampleSize)) : 0;
  const ciLowerDinamico = stats ? stats.mean - margen : 0;
  const ciUpperDinamico = stats ? stats.mean + margen : 0;

  // --- Cálculos de múltiples niveles de confianza para la tabla comparativa ---
  const margen90 = stats ? 1.645 * (stats.std / Math.sqrt(stats.sampleSize)) : 0;
  const margen95 = stats ? 1.960 * (stats.std / Math.sqrt(stats.sampleSize)) : 0;
  const margenNivel = margen;

  const intervalos = stats ? [
    {
      nivel: '90%',
      nivelNum: 90,
      alpha: '0.10',
      lower: (stats.mean - margen90).toFixed(2),
      upper: (stats.mean + margen90).toFixed(2),
      margen: margen90.toFixed(2),
      color: '#10b981',
      interpretacion: 'El 90% de las latencias futuras caerán dentro de este rango'
    },
    {
      nivel: '95%',
      nivelNum: 95,
      alpha: '0.05',
      lower: (stats.mean - margen95).toFixed(2),
      upper: (stats.mean + margen95).toFixed(2),
      margen: margen95.toFixed(2),
      color: '#6366f1',
      interpretacion: 'El 95% de las latencias futuras caerán dentro de este rango'
    },
    {
      nivel: '99%',
      nivelNum: 99,
      alpha: '0.01',
      lower: stats.ciLower.toFixed(2),
      upper: stats.ciUpper.toFixed(2),
      margen: ((stats.ciUpper - stats.ciLower) / 2).toFixed(2),
      color: '#f59e0b',
      interpretacion: 'El 99% de las latencias futuras caerán dentro de este rango (más conservador)'
    },
  ] : [];

  const anomalias = stats ? stats.anomalies : [];

  // --- Fetch stats de todas las sesiones y recalcular con el nivel seleccionado ---
  const loadAllSessions = useCallback(async (currentNivel: number) => {
    if (sessions.length === 0) return;
    setLoadingSessions(true);
    try {
      const t = calcTCritico(currentNivel);
      const results: SessionStats[] = [];
      const promises = sessions.map(async (s) => {
        try {
          const data = await fetchStats(s.session_id);
          if (data && !('error' in data)) {
            const m = t * (data.std / Math.sqrt(data.sampleSize));
            const lower = data.mean - m;
            const upper = data.mean + m;
            const amplitud = upper - lower;
            let riesgo: 'BAJO' | 'MODERADO' | 'ALTO' = 'BAJO';
            let riesgoColor = '#10b981';
            if (amplitud > 1000) { riesgo = 'ALTO'; riesgoColor = '#ef4444'; }
            else if (amplitud >= 200) { riesgo = 'MODERADO'; riesgoColor = '#f59e0b'; }
            results.push({
              sessionId: s.session_id,
              mean: data.mean,
              std: data.std,
              sampleSize: data.sampleSize,
              ciLower: lower,
              ciUpper: upper,
              amplitud,
              riesgo,
              riesgoColor,
            });
          }
        } catch { /* skip failed session */ }
      });
      await Promise.all(promises);
      setSessionStats(results);
    } finally {
      setLoadingSessions(false);
    }
  }, [sessions]);

  // --- Debounced auto-recalculate when nivel changes ---
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAllSessions(nivel);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nivel, loadAllSessions]);

  const handleNivelChange = (v: number) => {
    const clamped = Math.max(80, Math.min(99, v));
    setNivel(clamped);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#a5b4fc',
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'monospace',
    width: 70,
    textAlign: 'center',
    outline: 'none',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    appearance: 'none' as const,
    background: `linear-gradient(to right, #6366f1 ${((nivel - 80) / 19) * 100}%, #1e293b ${((nivel - 80) / 19) * 100}%)`,
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div>
      <div style={S.formula}>
        {`IC ${nivel}%: x\u0304 \u00B1 t_(\u03B1/2,n-1) \u00B7 (s/\u221An)  |  n=${stats?.sampleSize ?? '...'}, \u03B1=${(1 - nivel / 100).toFixed(2)}`}
      </div>

      {/* --- KPI Cards --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {stats ? ([
          ['Mean (x\u0304)', stats.mean.toFixed(2) + ' ms', '#3b82f6'],
          ['Std Dev (s)', stats.std.toFixed(2) + ' ms', '#8b5cf6'],
          [`CI Lower (${nivel}%)`, ciLowerDinamico.toFixed(2) + ' ms', '#10b981'],
          [`CI Upper (${nivel}%)`, ciUpperDinamico.toFixed(2) + ' ms', '#f59e0b'],
        ] as const).map(([l, v, c], i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ ...S.stat, borderLeft: '3px solid ' + c }}>
            <p style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>{l}</p>
            <p style={{ color: c, fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace' }}>{v}</p>
          </motion.div>
        )) : Array.from({ length: 4 }).map((_, i) => <div key={i} style={S.stat}><Skel h={60} /></div>)}
      </div>

      {/* --- PARTE 1: Selector de Nivel de Confianza --- */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={{ ...S.grad as any, fontSize: '1.05rem', marginBottom: 16 }}>Configurar Nivel de Confianza</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Nivel (%):</label>
            <input
              id="nivel-input"
              type="number"
              min={80}
              max={99}
              value={nivel}
              onChange={e => handleNivelChange(parseInt(e.target.value) || 80)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              id="nivel-slider"
              type="range"
              min={80}
              max={99}
              step={1}
              value={nivel}
              onChange={e => handleNivelChange(parseInt(e.target.value))}
              style={sliderStyle}
            />
          </div>
        </div>

        {/* Texto dinámico */}
        <motion.div
          key={nivel}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#a5b4fc',
            textAlign: 'center',
          }}
        >
          IC {nivel}% | α = {(1 - nivel / 100).toFixed(2)} | t crítico = {tCritico.toFixed(3)}
          {stats && ` | Margen = ±${margen.toFixed(2)}ms`}
        </motion.div>

        {/* Botones rápidos */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUICK_LEVELS.map(lv => (
            <motion.button
              key={lv}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNivelChange(lv)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: nivel === lv ? 'none' : '1px solid #6366f1',
                background: nivel === lv ? '#6366f1' : 'transparent',
                color: nivel === lv ? '#fff' : '#a5b4fc',
                transition: 'all 0.2s',
              }}
            >
              {lv}%
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* --- Gráfico IC con Anomalías --- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={S.card}>
        <h3 style={{ ...S.grad as any, fontSize: '1.1rem', marginBottom: 4 }}>IC {nivel}% con Anomalías</h3>

        {/* Leyenda visual del gráfico */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            Anomalía fuera del IC
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
            <span style={{ width: 16, height: 2, background: '#f59e0b', display: 'inline-block', borderRadius: 1 }} />
            Límite Superior IC {nivel}%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
            <span style={{ width: 16, height: 2, background: '#10b981', display: 'inline-block', borderRadius: 1 }} />
            Límite Inferior IC {nivel}%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
            <span style={{ width: 16, height: 2, background: '#6366f1', display: 'inline-block', borderRadius: 1 }} />
            Media
          </span>
        </div>

        {/* Subtítulo actualizado con valores dinámicos */}
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
          {stats
            ? `Límite Superior: ${ciUpperDinamico.toFixed(1)}ms | Media: ${stats.mean.toFixed(1)}ms | Límite Inferior: ${ciLowerDinamico.toFixed(1)}ms · ${anomalias.length} anomalías detectadas`
            : '...'}
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

                {/* ReferenceLine etiquetadas con nivel dinámico */}
                <ReferenceLine
                  y={ciUpperDinamico}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{ value: `IC ${nivel}% Superior: ${ciUpperDinamico.toFixed(1)}ms`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }}
                />
                <ReferenceLine
                  y={ciLowerDinamico}
                  stroke="#10b981"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{ value: `IC ${nivel}% Inferior: ${ciLowerDinamico.toFixed(1)}ms`, position: 'insideBottomRight', fill: '#10b981', fontSize: 11 }}
                />
                <ReferenceLine
                  y={stats.mean}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{ value: `Media: ${stats.mean.toFixed(1)}ms`, position: 'insideTopLeft', fill: '#6366f1', fontSize: 11 }}
                />

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

      {/* --- Tabla comparativa de intervalos de confianza --- */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ ...S.card, marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(99,102,241,0.06)' }}>
            <h4 style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.9rem' }}>
              Comparativa de Intervalos de Confianza
            </h4>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                  {['Nivel de Confianza', 'Alpha (α)', 'Límite Inferior', 'Media', 'Límite Superior', '± Margen', 'Interpretación'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {intervalos.map((row, i) => {
                  const isActive = row.nivelNum === nivel;
                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid #1e293b',
                      borderLeft: `3px solid ${row.color}`,
                      background: isActive ? `${row.color}18` : (i % 2 === 0 ? 'rgba(99,102,241,0.03)' : 'transparent'),
                      transition: 'background 0.3s',
                    }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: row.color }}>
                        {row.nivel} {isActive && '◀'}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>{row.alpha}</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#e2e8f0' }}>{row.lower} ms</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{stats.mean.toFixed(2)} ms</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#e2e8f0' }}>{row.upper} ms</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: row.color, fontWeight: 600 }}>± {row.margen} ms</td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 11, maxWidth: 300 }}>{row.interpretacion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* --- PARTE 3: Análisis comparativo entre sesiones --- */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ ...S.card, marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(99,102,241,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.9rem' }}>
            Análisis Comparativo entre Sesiones al {nivel}% de Confianza
          </h4>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadAllSessions(nivel)}
            disabled={loadingSessions}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: loadingSessions ? 'wait' : 'pointer',
              border: '1px solid #6366f1',
              background: loadingSessions ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: '#a5b4fc',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {loadingSessions && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%' }}
              />
            )}
            {loadingSessions ? 'Cargando...' : 'Recalcular todas las sesiones'}
          </motion.button>
        </div>

        {loadingSessions && sessionStats.length === 0 ? (
          <div style={{ padding: 24 }}><Skel h={100} /></div>
        ) : sessionStats.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                  {['Sesión', 'Media', 'Std Dev', `IC Inferior (${nivel}%)`, `IC Superior (${nivel}%)`, 'Amplitud IC', 'Riesgo'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionStats.map((row, i) => (
                  <tr key={row.sessionId} style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'rgba(99,102,241,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{row.sessionId}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#e2e8f0' }}>{row.mean.toFixed(2)} ms</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>{row.std.toFixed(2)} ms</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#10b981' }}>{row.ciLower.toFixed(2)} ms</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#f59e0b' }}>{row.ciUpper.toFixed(2)} ms</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#e2e8f0' }}>{row.amplitud.toFixed(2)} ms</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        background: `${row.riesgoColor}22`,
                        border: `1px solid ${row.riesgoColor}55`,
                        color: row.riesgoColor,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.riesgoColor, display: 'inline-block' }} />
                        {row.riesgo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Las estadísticas de las sesiones se cargarán automáticamente al cambiar el nivel de confianza.
          </div>
        )}
      </motion.div>

      {/* --- Tabla de anomalías existente --- */}
      {stats && stats.anomalies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
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
};
