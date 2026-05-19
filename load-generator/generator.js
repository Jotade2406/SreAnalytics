// ============================================================
// generator.js — Generador de Carga Estocástico
// ============================================================
// Simula tráfico realista hacia el backend enviando latencias
// con distribución normal N(250ms, 45ms) y picos aleatorios.
//
// Uso:
//   node generator.js                  → 120 segundos, sesión exp_A_baseline
//   node generator.js --duration 30    → 30 segundos
//   node generator.js --session exp_B  → sesión personalizada
//   node generator.js --rate 20        → 20 req/seg
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

const SESSION_ID = getArg('session', 'exp_A_baseline');
const DURATION   = parseInt(getArg('duration', '120'));   // segundos
const RATE       = parseInt(getArg('rate', '10'));         // requests/segundo
const SPIKE_PROB = 0.05;                                   // 5% probabilidad de spike

// Endpoints simulados (para variedad en los logs)
const ENDPOINTS = ['/api/users', '/api/products', '/api/orders', '/api/auth', '/api/search'];

// ─── GENERADOR NORMAL (Box-Muller) ───────────────────────────
// Genera números aleatorios con distribución normal N(mean, std).
// Usa la transformación de Box-Muller: convierte 2 uniformes en 2 normales.
function randomNormal(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ─── GENERAR UNA LATENCIA REALISTA ────────────────────────────
// Base: N(250, 45) → media 250ms, std 45ms
// Spike: 5% probabilidad de latencia entre 1500-5000ms
// Clamp: mínimo 10ms (latencias negativas no existen)
function generateLatency() {
  const isSpike = Math.random() < SPIKE_PROB;

  if (isSpike) {
    // Spike: latencia alta entre 1500-5000ms
    return Math.round(1500 + Math.random() * 3500);
  }

  // Normal: N(250, 45), mínimo 10ms
  const latency = randomNormal(250, 45);
  return Math.round(Math.max(10, latency));
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
  console.log(`  Sesión:    ${SESSION_ID}`);
  console.log(`  Duración:  ${DURATION}s`);
  console.log(`  Rate:      ${RATE} req/s`);
  console.log(`  Total:     ${totalRequests} requests`);
  console.log(`  Target:    ${API_URL}`);
  console.log(`  Spikes:    ${SPIKE_PROB * 100}% probabilidad`);
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
