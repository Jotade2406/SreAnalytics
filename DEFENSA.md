# Guión de Defensa — SRE Analytics Dashboard

> **Formato**: pantalla por pantalla · palabras sencillas · valores reales del sistema  
> **Tiempo estimado**: 12–18 minutos de presentación activa

---

## Apertura (30 segundos, antes de tocar nada)

> *"Voy a mostrarles un sistema de monitoreo estadístico en tiempo real para servidores web.  
> El problema que resuelve es simple: ¿cómo saber si tu servidor está a punto de colapsar  
> antes de que colapse? Para eso usamos cuatro herramientas matemáticas clásicas —  
> Poisson, Intervalos de Confianza, prueba t de Welch, y optimización de recursos —  
> aplicadas sobre datos reales de cinco escenarios distintos de un servidor."*

Abre el navegador. El dashboard ya debe estar en `http://localhost:5173`.

---

## El Selector de Sesiones (parte superior izquierda)

**Lo que ven**: un dropdown que dice cosas como *"📊 v1 · Línea Base (1799 logs)"*

**Qué decir:**

> *"Este selector representa cinco experimentos que corrí sobre el mismo servidor,  
> cada uno simulando una condición distinta. No son datos inventados — son registros  
> reales de latencia que el servidor midió request por request."*

| Sesión | Qué simula |
|--------|-----------|
| 📊 v1 · Línea Base | El servidor funcionando normal, sin optimizaciones |
| 🚀 v2 · Con Caché | El mismo servidor con caché activado |
| 🔴 v3 · Servidor Degradado | CPU al límite, memoria casi llena |
| 🔧 v4 · Post-Hotfix | Después de aplicar el parche de corrección |
| ⚡ v5 · Pico de Tráfico | 10x el tráfico normal simultáneo |

> *"El sistema actualiza los datos automáticamente cada 10 segundos. Lo que voy a mostrar  
> es completamente en vivo."*

---

## Tab 1 — Overview (selecciona 📊 v1 · Línea Base)

**Clic en**: pestaña **Overview** · sesión **v1 Línea Base**

### Qué señalar y decir:

**Tarjeta de escenario (barra de contexto azul arriba):**
> *"Esta tarjeta me dice el rol de la sesión y me sugiere con qué otra comparar.  
> Me dice que la Línea Base es mi punto de referencia — si mejoro algo,  
> tengo que poder compararlo contra esto."*

**Los 4 KPIs:**
> *"Estos cuatro números son el resumen ejecutivo del servidor en este momento:  
> latencia media de 280ms, límite superior del intervalo de confianza,  
> el riesgo de Poisson al 18.5%, y el tamaño de muestra con el que trabajamos."*

**El gráfico Latency vs IC 99%:**
> *"Esta gráfica muestra las últimas 60 mediciones de latencia.  
> Las líneas punteadas son los límites del intervalo de confianza al 99%.  
> Cuando un punto los cruza, es una anomalía."*

**El gauge de riesgo:**
> *"Este medidor circular es el resultado del Pilar 1, Poisson.  
> 18.5% significa que hay un 18.5% de probabilidad de que ocurran  
> 5 o más eventos críticos en el próximo minuto. Es la Línea Base — manejable."*

**Cámbialo a 🔴 v3 · Degradado y di:**
> *"Ahora miren la misma pantalla con el servidor degradado.  
> El riesgo sube al 100%. El sistema te está diciendo: esto va a colapsar.  
> No es una opinión, es matemática — la distribución de Poisson con λ=42.5  
> hace que P(X≥5) sea virtualmente 1."*

---

## Tab 2 — Poisson (Pilar 1)

**Clic en**: pestaña **Poisson** · deja en **v1 Línea Base**

### Qué señalar y decir:

**La barra de fórmula arriba:**
> *"Esta fórmula, P(X=k) = (λ^k · e^(-λ)) / k!, es la distribución de Poisson.  
> Le damos λ — que es el promedio de eventos críticos por minuto — y nos dice  
> la probabilidad de que ocurran exactamente k eventos en el próximo minuto."*

**El gráfico de barras:**
> *"Cada barra es P(X=k). En v1 con λ=3, la probabilidad está concentrada  
> en valores bajos. Las barras rojas (k≥5) son el umbral de colapso.  
> Con λ=3, esa zona es pequeña — 18.5%."*

**El gauge Cascade Risk:**
> *"Este gauge resume todo: 18.5% de riesgo de cascada."*

**Cámbialo a 🚀 v2 · Con Caché:**
> *"Con el caché, λ baja a 1.5. El riesgo cae al 1.9%.  
> El caché no solo mejoró la latencia promedio — redujo los eventos críticos a la mitad.  
> Eso es lo que Poisson cuantifica."*

**Cámbialo a 🔴 v3 · Degradado:**
> *"Aquí el sistema detecta automáticamente que λ=42.5 está tan lejos  
> del rango k=0..10 que no tiene sentido mostrar una gráfica de barras vacía.  
> En su lugar muestra esto: 'Sistema Saturado'. La distribución está centrada  
> en k≈42, muy lejos de 5. P(X≥5) es prácticamente 100%."*

**Cámbialo a 🔧 v4 · Hotfix:**
> *"Y después del hotfix, λ cae a 0. Cero eventos críticos por minuto.  
> El sistema se recuperó. Eso es lo que un buen parche debe lograr."*

### Pregunta frecuente del jurado:

**"¿Por qué 1500ms como umbral?"**
> *"Es el SLA estándar para aplicaciones web de respuesta rápida.  
> Una respuesta que tarda más de 1.5 segundos generalmente resulta en  
> abandono del usuario según estudios de UX. Es el umbral que definimos  
> como 'evento crítico' para este sistema específico."*

---

## Tab 3 — Intervalos (Pilar 2)

**Clic en**: pestaña **Intervalos** · deja en **v1 Línea Base**

### Qué señalar y decir:

**La barra de fórmula:**
> *"El Pilar 2 es el Intervalo de Confianza. La fórmula dice:  
> tomamos la media muestral, le sumamos y restamos un margen calculado  
> con la distribución t de Student. El resultado es una banda donde esperamos  
> que caigan el X% de las latencias futuras."*

**El selector de nivel de confianza:**
> *"Aquí pueden ver algo interactivo. Este slider controla el nivel de confianza.  
> Al 95%, la banda es más estrecha y más puntos quedan afuera como anomalías.  
> Al 99%, la banda es más amplia y soy más conservador al declarar anomalías."*

**Demuéstralo en vivo:**
> Mueve el slider de 99% a 90% despacio.
> *"¿Ven cómo los puntos rojos en la gráfica aumentan cuando bajo el nivel de confianza?  
> La tabla de abajo también se actualiza en tiempo real.  
> Al 90% exijo más del servidor — cualquier latencia fuera del rango normal es anomalía."*

**La tabla comparativa entre sesiones:**
> *"Esta tabla compara los cinco escenarios al mismo nivel de confianza.  
> La amplitud del intervalo es clave: v4 Hotfix tiene una amplitud de ~40ms.  
> v3 Degradado tiene una amplitud de miles de ms.  
> Una amplitud pequeña = sistema predecible. Grande = sistema caótico."*

### Pregunta frecuente:

**"¿Por qué Student y no distribución normal?"**
> *"Porque la distribución normal asume que conoces la desviación estándar real  
> de la población, que nunca conocemos. Student corrige esa incertidumbre  
> con los grados de libertad basados en el tamaño de muestra.  
> Con n=500 la diferencia es mínima, pero es estadísticamente correcto."*

---

## Tab 4 — A/B Tests (Pilar 3)

**Clic en**: pestaña **A/B Tests**

### Qué señalar y decir:

**Las comparaciones sugeridas:**
> *"El sistema ya sabe qué comparaciones son relevantes y me las sugiere.  
> Son tres: el efecto del caché, el impacto del hotfix, y qué pasa  
> cuando el tráfico se dispara respecto al normal."*

**Ejecuta el test sugerido 'Efecto del Caché' (clic en Ejecutar Test):**
> *"Estoy corriendo la prueba t de Welch entre v1 Línea Base y v2 Con Caché."*
>
> Espera el resultado y di:
> *"El resultado dice si la diferencia de latencia entre estas dos versiones  
> es estadísticamente significativa o simplemente ruido aleatorio.  
> Si p < 0.05, rechazo la hipótesis nula — la diferencia es real.  
> Si p ≥ 0.05, no puedo afirmar que el caché hizo una diferencia real en media."*

**Señala el panel 'Last Test Interpretation':**
> *"Aquí el sistema traduce el resultado a lenguaje humano.  
> No me da solo un número — me dice qué significa para el servidor."*

**Ejecuta 'Impacto del Hotfix' (v3 Degradado vs v4 Hotfix):**
> *"Este debería ser muy significativo. El servidor degradado tenía 2006ms de media.  
> Post-hotfix cayó a 134ms. Con esa diferencia y 600 muestras en cada grupo,  
> la prueba t va a dar p prácticamente 0."*

### Pregunta frecuente:

**"¿Por qué Welch y no la t-test clásica?"**
> *"La t-test clásica asume que los dos grupos tienen la misma varianza.  
> Welch no hace esa suposición. Como mis sesiones tienen varianzas muy distintas  
> — el servidor degradado tiene varianza enorme, el hotfix tiene varianza mínima —  
> Welch es la opción correcta. Es más conservadora y más robusta."*

**"¿Qué significa exactamente H₀?"**
> *"H₀: la media de latencia del grupo A es igual a la del grupo B.  
> Rechazar H₀ significa que la diferencia que observo no se explica por azar  
> con un 95% de confianza."*

---

## Tab 5 — Recursos (Pilar 4)

**Clic en**: pestaña **Recursos** · selecciona **v2 Con Caché**

### Qué señalar y decir:

**Los 3 KPIs:**
> *"El Pilar 4 convierte los resultados estadísticos en recomendaciones operativas.  
> Me dice: cuántas requests por segundo puede manejar el sistema,  
> cuál es el punto de quiebre donde el colapso se vuelve probable,  
> y qué tan eficiente es el servidor en términos de su intervalo de confianza."*

**La curva de riesgo vs carga:**
> *"Esta curva es la respuesta a la pregunta que todo SRE se hace:  
> ¿a partir de qué nivel de tráfico el sistema empieza a fallar?  
> La zona verde es segura, la amarilla es advertencia, la roja es crítica.  
> Con v2 Caché, la curva sube más lentamente — el caché nos da más margen."*

**Cambia a 🔴 v3 Degradado:**
> *"Con el servidor degradado la curva es agresiva desde el inicio.  
> Ya a carga media el sistema está en zona crítica."*

**La tabla comparativa:**
> *"Esta tabla traduce los cinco escenarios a recomendaciones de hardware concretas.  
> El sistema degradado necesita 4GB+ de RAM y 4+ cores para estabilizarse.  
> El hotfix necesita mucho menos — 512MB y 1 core son suficientes.  
> Estas no son estimaciones aleatorias, están derivadas del λ de Poisson  
> y el ancho del intervalo de confianza de cada sesión."*

**La recomendación del analizador:**
> *"Por último, el sistema emite una recomendación automática basada en los datos.  
> En v2 con λ=1.5 y riesgo del 1.9%, dice que la infraestructura actual es suficiente.  
> En v3 con λ=42.5, dispara alerta crítica y pide escalar al doble."*

### Pregunta frecuente:

**"¿Cómo se calcula el 'Throughput Óptimo'?"**
> *"Es el ratio entre el límite inferior del IC y la latencia media.  
> Representa cuántas requests por segundo puede manejar el servidor  
> manteniéndose dentro de su zona estadísticamente segura."*

---

## Cierre (30 segundos)

> *"En resumen: tomé cinco escenarios reales de un servidor,  
> y usando distribución de Poisson, intervalos de confianza de Student,  
> prueba t de Welch y análisis de recursos, construí un sistema que:*
>
> 1. *Predice probabilidad de colapso antes de que ocurra*
> 2. *Detecta anomalías ajustables en tiempo real*
> 3. *Demuestra científicamente si un cambio de código tuvo impacto real*
> 4. *Recomienda cuánto hardware necesitas según el comportamiento estadístico del sistema*
>
> *Esto es estocástica aplicada a ingeniería de software."*

---

## Preguntas difíciles — respuestas cortas

| Pregunta | Respuesta |
|----------|-----------|
| ¿Por qué Poisson y no otra distribución? | Poisson modela eventos raros e independientes en el tiempo — exactamente lo que es una anomalía de servidor. Aplica cuando la tasa de eventos es constante y los eventos no se afectan entre sí. |
| ¿Los datos son reales? | Son logs reales generados por un servidor Express.js con un generador de carga que simula patrones de tráfico real con distribución de Pareto para las latencias. |
| ¿Qué pasa si el backend se cae? | El frontend muestra el último estado conocido y una barra roja "OFFLINE". Los datos persisten en MySQL — no se pierden. |
| ¿Cómo sabes que la fórmula de Poisson está bien implementada? | Uso logaritmos para el cálculo (evitar overflow numérico en k y λ grandes), y valido que ΣP(X=k) ≈ 1 para todos los λ. |
| ¿Por qué el nivel de confianza va de 80% a 99%? | Por debajo del 80% el intervalo es tan estrecho que prácticamente todo es "anomalía" — pierde sentido. Por encima del 99% el intervalo es tan ancho que nada es anomalía. El rango 80-99% es el práctico en la industria. |
| ¿Qué es λ exactamente aquí? | Es el promedio de eventos con latencia >1500ms por minuto, calculado agrupando los últimos 500 logs por minuto de reloj. |

---

## Flujo recomendado de la demo en vivo (10 min)

```
1. Abre Overview con v1 Línea Base          → 1.5 min
2. Cambia a v3 Degradado en Overview        → 30 seg (impacto visual inmediato)
3. Tab Poisson con v1 → v2 → v3 → v4       → 2.5 min
4. Tab Intervalos — mueve el slider en vivo → 2 min
5. Tab A/B Tests — ejecuta Efecto del Caché → 2 min
6. Tab Recursos con v3 → v2 comparar        → 1.5 min
```

**Tip**: Empieza siempre en Overview con v1 Línea Base — es el estado "normal" que el jurado puede intuir. El contraste con v3 Degradado en la misma pantalla es el gancho visual más fuerte.
