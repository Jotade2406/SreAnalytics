# SRE Analytics Dashboard

Plataforma de análisis estocástico para **Site Reliability Engineering (SRE)**.
Ingesta logs de latencia de servidores, calcula métricas estadísticas avanzadas
(Poisson, Intervalos de Confianza, Welch's T-Test) y las visualiza en un
dashboard interactivo en tiempo real.

---

## Stack Tecnológico

| Capa               | Tecnología                                                       |
|---------------------|------------------------------------------------------------------|
| **Backend**         | Node.js + Express · ES Modules · mysql2/promise · jstat          |
| **Frontend**        | React 19 + TypeScript · Vite · TailwindCSS v4 · Recharts · motion/react |
| **Base de Datos**   | MySQL 8                                                          |
| **Generador de Carga** | Node.js + axios · Distribución Normal (Box-Muller)           |

---

## Arquitectura

```
┌─────────────────────┐     POST /api/logs     ┌──────────────────────┐
│   Load Generator    │ ─────────────────────▶  │   Backend (Express)  │
│   (generator.js)    │   latency_ms, session   │   :5000              │
└─────────────────────┘                         │                      │
                                                │  ┌────────────────┐  │
                                                │  │ Poisson Service│  │
                                                │  │ CI Service     │  │
                                                │  │ Welch T-Test   │  │
                                                │  └───────┬────────┘  │
                                                │          │           │
                                                │    ┌─────▼─────┐    │
                                                │    │  MySQL 8   │    │
                                                │    └─────┬─────┘    │
                                                └──────────┼──────────┘
                                                           │
                                                   GET /api/stats/*
                                                           │
                                                ┌──────────▼──────────┐
                                                │   Frontend (React)  │
                                                │   :3000 (Vite)      │
                                                │  ┌───────────────┐  │
                                                │  │ Overview Tab  │  │
                                                │  │ Poisson Tab   │  │
                                                │  │ Intervalos Tab│  │
                                                │  │ A/B Tests Tab │  │
                                                │  └───────────────┘  │
                                                └─────────────────────┘
```

---

## Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Jotade2406/SreAnalytics.git
cd SreAnalytics
```

### 2. Configurar la Base de Datos (MySQL)

Crea la base de datos y las tablas necesarias:

```sql
CREATE DATABASE IF NOT EXISTS stochastic_analysis;
USE stochastic_analysis;

CREATE TABLE IF NOT EXISTS request_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  latency_ms DECIMAL(10,2) NOT NULL,
  status_code INT DEFAULT 200,
  endpoint VARCHAR(255) DEFAULT '/api/test',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_timestamp (timestamp)
);

CREATE TABLE IF NOT EXISTS statistical_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  sample_size INT,
  mean_latency DECIMAL(10,4),
  std_deviation DECIMAL(10,4),
  median_latency DECIMAL(10,4),
  ci_lower DECIMAL(10,4),
  ci_upper DECIMAL(10,4),
  lambda_value DECIMAL(10,4),
  collapse_prob DECIMAL(10,6),
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_snap (session_id)
);

CREATE TABLE IF NOT EXISTS hypothesis_tests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_a VARCHAR(100) NOT NULL,
  session_b VARCHAR(100) NOT NULL,
  mean_a DECIMAL(10,4),
  mean_b DECIMAL(10,4),
  std_a DECIMAL(10,4),
  std_b DECIMAL(10,4),
  n_a INT,
  n_b INT,
  t_statistic DECIMAL(12,6),
  degrees_of_freedom DECIMAL(10,4),
  p_value DECIMAL(12,8),
  reject_null BOOLEAN,
  conclusion TEXT,
  tested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en `/backend`:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=tu_contraseña
MYSQL_DATABASE=stochastic_analysis
PORT=5000
```

### 4. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Generador de carga
cd ../load-generator
npm install
```

### 5. Iniciar en modo desarrollo

Abre **dos terminales** desde la raíz del proyecto:

```bash
# Terminal 1 — Backend (nodemon, hot-reload)
cd backend
npm run dev

# Terminal 2 — Frontend (Vite, HMR)
cd frontend
npm run dev
```

El backend correrá en `http://localhost:5000` y el frontend en `http://localhost:3000`.

---

## Endpoints de la API

| Método | Ruta                            | Descripción                                           | Parámetros                                |
|--------|---------------------------------|-------------------------------------------------------|-------------------------------------------|
| `POST` | `/api/logs`                     | Insertar un log de latencia                           | Body: `session_id`, `latency_ms`, `status_code?`, `endpoint?`, `timestamp?` |
| `GET`  | `/api/stats/latest`             | Obtener estadísticas calculadas en tiempo real         | Query: `session_id` (requerido)           |
| `GET`  | `/api/stats/history`            | Historial de snapshots estadísticos                   | Query: `session_id` (requerido), `limit?` |
| `GET`  | `/api/sessions`                 | Listar todas las sesiones con conteo de logs          | —                                         |
| `POST` | `/api/hypothesis-test`          | Ejecutar un Welch's T-Test entre dos sesiones         | Body: `session_a`, `session_b`            |
| `GET`  | `/api/hypothesis-test/history`  | Historial de pruebas de hipótesis (último por par)    | —                                         |

### Ejemplos con PowerShell

```powershell
# Obtener estadísticas de una sesión
Invoke-RestMethod http://localhost:5000/api/stats/latest?session_id=exp_A_baseline

# Listar sesiones disponibles
Invoke-RestMethod http://localhost:5000/api/sessions

# Ejecutar un test de hipótesis
Invoke-RestMethod http://localhost:5000/api/hypothesis-test -Method POST `
  -ContentType 'application/json' `
  -Body '{"session_a":"exp_A_baseline","session_b":"exp_B_optimized"}'

# Ver historial de tests
Invoke-RestMethod http://localhost:5000/api/hypothesis-test/history
```

---

## Generador de Carga

El script `load-generator/generator.js` simula tráfico realista enviando
peticiones al backend con latencias generadas estocásticamente.

### Uso

```bash
cd load-generator

# Valores por defecto: 120s, 10 req/s, sesión exp_A_baseline
node generator.js

# Personalizar sesión y duración
node generator.js --session exp_B_optimized --duration 60

# Personalizar rate de requests
node generator.js --session exp_C_test --duration 30 --rate 20
```

### Flags disponibles

| Flag          | Default           | Descripción                              |
|---------------|-------------------|------------------------------------------|
| `--session`   | `exp_A_baseline`  | Nombre de la sesión del experimento      |
| `--duration`  | `120`             | Duración de la generación en segundos    |
| `--rate`      | `10`              | Requests por segundo                     |

### Distribución de las latencias

- **Base:** Distribución Normal N(250ms, 45ms) usando transformación de Box-Muller
- **Spikes:** 5% de probabilidad de latencia entre 1500-5000ms
- **Status codes:** 95% → 200 (OK), 5% → 500 (Error)

---

## Conceptos Estadísticos Implementados

### Distribución de Poisson (λ)

Modela la probabilidad de que ocurra un número determinado de eventos
(en este caso, picos de latencia) en un intervalo de tiempo fijo.
El parámetro **λ** (lambda) es la tasa promedio de ocurrencia de anomalías.

- **λ bajo** (< 10): Sistema estable, pocos picos anómalos.
- **λ alto** (≥ 15): Riesgo crítico, muchos eventos de latencia extrema.

### Intervalos de Confianza al 99% (T-Student)

Se calcula el intervalo `[CI Lower, CI Upper]` alrededor de la media muestral
usando la distribución T-Student, que es más precisa que la Normal cuando
el tamaño de muestra es pequeño o se desconoce la varianza poblacional.

**Interpretación:** Con un 99% de confianza, la verdadera latencia media
del servidor se encuentra dentro de este intervalo.

### Prueba de Hipótesis de Welch (T-Test)

Compara las medias de dos sesiones independientes (ej. antes vs después
de un despliegue) para determinar si la diferencia es estadísticamente
significativa o solo ruido aleatorio.

- **H₀ (Hipótesis nula):** μ₁ = μ₂ — No hay diferencia real entre las sesiones.
- **H₁ (Hipótesis alternativa):** μ₁ ≠ μ₂ — Sí hay diferencia real.

### ¿Qué significa rejectNull y p-value?

- **p-value:** Probabilidad de observar los datos si H₀ fuera cierta.
  Un p-value < 0.05 indica evidencia fuerte contra H₀.
- **reject_null = true:** Se rechaza H₀ → la diferencia entre las sesiones
  es REAL y estadísticamente significativa (p < 0.05).
- **reject_null = false:** No se rechaza H₀ → la diferencia observada
  probablemente es solo ruido estadístico (p ≥ 0.05).

---

## Cómo Interpretar el Dashboard

### 📊 Overview

Muestra las métricas principales: latencia media, percentil 99 (CI Upper),
riesgo Poisson (%) y tamaño de muestra. Incluye un **banner de alerta automático**
que cambia según el nivel de riesgo:

- 🟢 **Estable:** λ < 10 y riesgo < 15% — Sistema operando normalmente.
- 🟡 **Advertencia:** λ ≥ 10 o riesgo ≥ 15% — Monitorear de cerca.
- 🔴 **Crítico:** λ ≥ 15 o riesgo ≥ 30% — Acción inmediata requerida.

### 📈 Poisson

Visualiza la distribución de probabilidad de Poisson completa.
Muestra la probabilidad P(X = k) para cada k (número de anomalías),
destacando los valores críticos que superan umbrales de riesgo.

### 📉 Intervalos

Grafica la serie temporal de latencias con las bandas del intervalo
de confianza al 99% superpuestas. Los puntos fuera de las bandas
son anomalías estadísticas.

### 🧪 A/B Tests

Permite ejecutar pruebas de hipótesis de Welch entre dos sesiones cualquiera
directamente desde la interfaz. Incluye:

- **Panel "Run New Test":** Selector de sesiones + botón para ejecutar.
- **Historial:** Tabla con todos los tests realizados (deduplica por par de sesiones).
- **Gráfico comparativo:** Barras horizontales de latencia media por sesión.
- **Interpretación:** Card con explicación en lenguaje natural del último resultado.
- **Exportar CSV:** Botón para descargar el historial completo en formato CSV.

---

## Licencia

MIT
