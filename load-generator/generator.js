// ============================================================
// generator.js — Generador de Carga Estocástico
// ============================================================
// Simula tráfico realista hacia el backend enviando latencias
// con perfiles configurables por sesión.
//
// Uso:
//   node generator.js                              → defaults
//   node generator.js --session exp_B --duration 60
//   node generator.js --base-latency 150 --spike-rate 0.1
//   node generator.js --jitter 30 --error-rate 0.02
//   node generator.js --spike-multiplier 15 --rate 20
//
// Cada petición envía POST /api/logs al backend con:
//   { session_id, timestamp, latency_ms, status_code, endpoint }
// ============================================================

import axios from 'axios';

// ─── CONFIGURACIÓN ────────────────────────────────────────────
const API_URL = 'http://localhost:5000/api/logs';

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const SESSION_ID      = getArg('session', 'exp_A_baseline');
const DURATION        = parseInt(getArg('duration', '120'));          // segundos
const RATE            = parseInt(getArg('rate', '10'));               // requests/segundo
const BASE_LATENCY    = parseInt(getArg('base-latency', '200'));     // ms
const SPIKE_RATE      = parseFloat(getArg('spike-rate', '0.05'));    // 0-1
const SPIKE_MULT      = parseFloat(getArg('spike-multiplier', '10'));
const ERROR_RATE      = parseFloat(getArg('error-rate', '0'));       // 0-1
const JITTER          = parseInt(getArg('jitter', '50'));             // ±ms

// Endpoints simulados (para variedad en los logs)
const ENDPOINTS = ['/api/users', '/api/products', '/api/orders', '/api/auth', '/api/search'];

// ─── GENERAR UNA LATENCIA CONFIGURABLE ────────────────────────
// Error simulado: latencia extrema (base * multiplier * 1-2x)
// Spike: latencia alta (base * multiplier * 0.5-1.5x)
// Normal: base ± jitter gaussiano aproximado
// Clamp: mínimo 10ms (latencias negativas no existen)
function generateLatency() {
  // Error simulado
  if (Math.random() < ERROR_RATE) {
    return Math.round(BASE_LATENCY * SPIKE_MULT * (1 + Math.random()));
  }
  // Spike de latencia
  if (Math.random() < SPIKE_RATE) {
    return Math.round(BASE_LATENCY * SPIKE_MULT * (0.5 + Math.random()));
  }
  // Latencia normal con jitter gaussiano aproximado
  const gaussJitter = (Math.random() + Math.random() + Math.random() - 1.5) * JITTER;
  return Math.max(10, Math.round(BASE_LATENCY + gaussJitter));
}

// ─── GENERAR STATUS CODE ──────────────────────────────────────
// 95% → 200 (OK), 5% → 500 (Error)
function generateStatusCode() {
  return Math.random() < 0.95 ? 200 : 500;
}

// ─── ENVIAR UNA PETICIÓN ──────────────────────────────────────
async function sendRequest() {
  const payload = {
    session_id:  SESSION_ID,
    timestamp:   new Date().toISOString().slice(0, 19).replace('T', ' '),
    latency_ms:  generateLatency(),
    status_code: generateStatusCode(),
    endpoint:    ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)],
  };

  try {
    await axios.post(API_URL, payload);
    return { success: true, latency: payload.latency_ms };
  } catch (error) {
    // No crashear: loguear y seguir
    return { success: false, error: error.message };
  }
}

// ─── SLEEP ────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── BUCLE PRINCIPAL ──────────────────────────────────────────
async function run() {
  const totalRequests = DURATION * RATE;
  const intervalMs    = 1000 / RATE;  // ms entre cada request

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ⚡ LOAD GENERATOR — Análisis Estocástico');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Sesión:        ${SESSION_ID}`);
  console.log(`  Duración:      ${DURATION}s`);
  console.log(`  Rate:          ${RATE} req/s`);
  console.log(`  Total:         ${totalRequests} requests`);
  console.log(`  Target:        ${API_URL}`);
  console.log('───────────────────────────────────────────────');
  console.log(`  Base Latency:  ${BASE_LATENCY}ms`);
  console.log(`  Spike Rate:    ${(SPIKE_RATE * 100).toFixed(0)}%`);
  console.log(`  Spike Mult:    ${SPIKE_MULT}x`);
  console.log(`  Jitter:        ±${JITTER}ms`);
  console.log(`  Error Rate:    ${(ERROR_RATE * 100).toFixed(0)}%`);
  console.log('═══════════════════════════════════════════════');
  console.log('');

  let sent      = 0;
  let errors    = 0;
  let totalLat  = 0;
  let maxLat    = 0;
  const startTime = Date.now();

  for (let i = 0; i < totalRequests; i++) {
    const result = await sendRequest();

    sent++;
    if (!result.success) {
      errors++;
    } else {
      totalLat += result.latency;
      if (result.latency > maxLat) maxLat = result.latency;
    }

    // Progreso cada 50 requests
    if (sent % 50 === 0) {
      const elapsed  = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgLat   = sent - errors > 0 ? (totalLat / (sent - errors)).toFixed(1) : 0;
      const progress = ((sent / totalRequests) * 100).toFixed(1);
      console.log(
        `  📊 [${progress}%] ${sent}/${totalRequests} enviados | ` +
        `${errors} errores | Lat prom: ${avgLat}ms | Max: ${maxLat}ms | ` +
        `Tiempo: ${elapsed}s`
      );
    }

    // Esperar el intervalo entre requests
    await sleep(intervalMs);
  }

  // ── Resumen final ───────────────────────────────────────────
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgLat    = sent - errors > 0 ? (totalLat / (sent - errors)).toFixed(2) : 0;

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ GENERACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total enviados:  ${sent}`);
  console.log(`  Exitosos:        ${sent - errors}`);
  console.log(`  Errores:         ${errors}`);
  console.log(`  Latencia prom:   ${avgLat} ms`);
  console.log(`  Latencia max:    ${maxLat} ms`);
  console.log(`  Tiempo total:    ${totalTime}s`);
  console.log(`  Rate real:       ${(sent / totalTime).toFixed(1)} req/s`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('  Ahora puedes consultar:');
  console.log(`  → GET http://localhost:5000/api/stats/latest?session_id=${SESSION_ID}`);
  console.log(`  → GET http://localhost:5000/api/stats/history?session_id=${SESSION_ID}`);
  console.log('');
}

run().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
