# Ley Clara

> **Preguntás en tus palabras qué derechos tenés en el trabajo, cuando comprás algo o en la calle, y te responde con el artículo exacto de la ley.**

La gente no piensa en leyes, piensa en problemas: *"me echaron"*, *"me vendieron algo fallado"*, *"me pararon en un control"*. Por eso el sitio se organiza por situaciones. El usuario no necesita saber qué ley aplica: el sistema busca en todas las leyes cargadas, encuentra los artículos relevantes, responde en 2 o 3 oraciones y muestra el texto oficial de cada artículo citado.

| Área | Ley | Texto |
|---|---|---|
| Trabajo | Ley de Contrato de Trabajo 20.744 | Actualizado: incluye la Ley 27.802 (B.O. 6/3/2026) |
| Compras | Ley de Defensa del Consumidor 24.240 | Actualizado: incluye la Ley 27.701 (B.O. 1/12/2022) |
| Tránsito | Ley Nacional de Tránsito 24.449 | Actualizado: incluye el Decreto 627/2025 (B.O. 3/9/2025) |

Textos actualizados de [InfoLEG](https://servicios.infoleg.gob.ar/), descargados el 26/11/2026.

---

## Lo técnico en 30 segundos

- **RAG sobre textos legales oficiales**: el parser convierte el HTML de InfoLEG en una estructura (título › capítulo › artículo) con el epígrafe, las notas de modificación y la fecha de vigencia de cada ley.
- **Citas verificables**: el modelo recibe solo los artículos recuperados y tiene que devolver sus ids. Las citas se validan contra esa lista y el texto que ve el usuario es siempre el oficial, nunca uno generado.
- **Detección de fuera de alcance antes de gastar tokens**: temas legales no cubiertos (alquileres, familia, ART…), preguntas que no son del tema y preguntas sin fuente suficiente se resuelven **sin llamar al modelo**.
- **Proveedor de IA intercambiable**: Gemini (plan gratis), cualquier API compatible con OpenAI (Groq, OpenRouter, Ollama) o un modo sin IA. Se elige con variables de entorno.
- **Búsqueda híbrida**: BM25 con un glosario de lenguaje coloquial, más embeddings opcionales combinados por Reciprocal Rank Fusion. Sin embeddings, la app sigue funcionando.
- **Evaluación**: 30 preguntas de prueba más 17 de un set separado (*holdout*), con métricas de búsqueda, de router y de citas. Corre en CI.
- **Protección contra abuso**: límite por IP y global por día, captcha invisible, caché, topes de largo y un mensaje de "demo agotada".

Stack: Next.js 16 (App Router) · TypeScript · Vitest · sin base de datos (el índice es un JSON) · Upstash Redis y Cloudflare Turnstile opcionales.

---

## Cómo responde una pregunta

```
pregunta
   │
   ├─► ¿tema legal que no cubrimos?  (alquileres, divorcio, ART, casas particulares…)
   │        └─ sí ─► "Ese tema no está cubierto" + dónde se regula + a quién consultar     (sin IA)
   │
   ├─► búsqueda en las 3 leyes a la vez
   │      "me echaron" → +despido +indemnización   (glosario coloquial → términos de la ley)
   │      BM25 por artículo (+ embeddings si hay índice, fusión RRF)
   │
   ├─► ¿algún artículo supera el umbral de relevancia?
   │        └─ no ─► "fuera de tema" o "no encontré un artículo que lo responda"           (sin IA)
   │
   ├─► modelo con SOLO esos artículos  →  JSON {status, answer, citations[], follow_ups[]}
   │
   └─► validación: citas ⊂ artículos dados; si no hay citas válidas → "no encontré"
```

Cada respuesta muestra:
1. La respuesta corta, en lenguaje simple.
2. Los artículos citados, desplegables, con el texto oficial, su ubicación en la ley y las notas de modificación.
3. La vigencia: *"Texto vigente según InfoLEG al 26/11/2026 · última modificación incorporada: Ley Nº 27.802 (B.O. 6/3/2026)"*.
4. Dos o tres preguntas de seguimiento. Al tocarlas, la pregunta anterior se usa como contexto.
5. Una línea chica que deriva al organismo o profesional que corresponde según el área.

---

## Decisiones de diseño

**Por qué solo tres áreas.** Son las situaciones legales más frecuentes en la vida cotidiana y cada una tiene una ley nacional central. Un alcance chico permite cuidar la calidad (parser, glosario, evaluación) y decir con precisión qué *no* se cubre. Alquileres quedó afuera a propósito: la Ley 27.551 fue derogada a fines de 2023 y el tema pasó al Código Civil y Comercial, que no está cargado. Para esos casos el sistema orienta, no responde.

**Por qué no responde si no hay fuente.** En temas legales, una respuesta inventada pero convincente hace más daño que un "no sé". La regla se aplica en tres capas:
1. Si la búsqueda no encuentra artículos relevantes, no se llama al modelo.
2. El prompt le permite al modelo responder `not_found` y le pide que no use conocimiento propio.
3. Se descarta toda respuesta que no cite al menos un artículo de los que se le pasaron.

**Por qué el glosario coloquial.** Los usuarios dicen "me echaron", "en negro", "aguinaldo", "carnet", "VTV". La ley dice "despido", "relación no registrada", "sueldo anual complementario", "licencia de conducir", "revisión técnica obligatoria". El glosario ([`src/lib/scope/lexicon.ts`](src/lib/scope/lexicon.ts)) agrega esos términos a la búsqueda y además señala de qué área es la pregunta, lo que el router usa para distinguir "fuera de tema" de "tema cubierto sin respuesta clara".

**Temas excluidos aunque "suenen" cubiertos.** *"Soy empleada doméstica, ¿cuántas vacaciones tengo?"* parece una pregunta laboral, pero el artículo 2 de la LCT excluye ese trabajo, que tiene su propio régimen (Ley 26.844). Responder con el artículo 150 sería un error. Estos temas están marcados como `exclusive` y se rechazan siempre, con la orientación correcta.

**Costos.**
- Modelo: plan gratuito de Gemini, detrás de una interfaz ([`src/lib/ai/types.ts`](src/lib/ai/types.ts)). Si el plan cambia, se pasa a Groq u OpenRouter (también gratis) o a un modelo local con Ollama, sin tocar código.
- Embeddings: se calculan **una sola vez** al cargar los textos (`npm run index:build`). En cada consulta solo se embebe la pregunta. El índice guarda un hash del corpus: si se vuelve a parsear una ley, la app ignora el índice viejo en vez de mezclar versiones.
- Sin base de datos: unos 450 artículos entran en memoria. La búsqueda vectorial es un producto punto sobre algunos cientos de vectores.
- Las preguntas rechazadas por el router y las respuestas en caché no consumen cupo del modelo.

**Abuso.**

| Medida | Dónde |
|---|---|
| Límite por IP por día (IP hasheada con sal, nunca se guarda en claro) | [`src/lib/guard/limits.ts`](src/lib/guard/limits.ts) |
| Cupo global diario de llamadas al modelo | ídem |
| Si el proveedor responde 429 → "demo agotada por hoy", sin volver a llamarlo hasta el día siguiente | [`src/lib/assistant/service.ts`](src/lib/assistant/service.ts) |
| Captcha invisible (Cloudflare Turnstile, gratis) | [`src/lib/guard/turnstile.ts`](src/lib/guard/turnstile.ts) |
| Largo máximo de pregunta (300) y de respuesta (tokens + recorte por oración) | `.env.example` |
| Caché de preguntas repetidas (7 días): las de ejemplo nunca se agotan | `service.ts` |
| Prompt injection: la pregunta va delimitada, el modelo solo puede devolver el JSON del schema y las citas se validan | [`src/lib/assistant/prompt.ts`](src/lib/assistant/prompt.ts) |

En serverless, los contadores y la caché usan Upstash Redis (plan gratis). Sin Upstash, se usa memoria.

**Aviso legal discreto.** Hay una línea fija en el pie del sitio y una línea chica debajo de cada respuesta que deriva según el área (abogado laboralista o sindicato, oficina de Defensa del Consumidor, autoridad que labró el acta). No hay carteles ni pantallas de aceptación.

---

## Evaluación

```bash
npm run eval                                # proveedor configurado (Gemini si hay key)
LLM_PROVIDER=mock npm run eval              # sin IA: búsqueda + router, gratis y determinístico
npm run eval -- --set holdout --verbose     # set separado
```

- [`eval/questions.json`](eval/questions.json): 30 preguntas. Hay 20 con su artículo esperado (8 de trabajo, 6 de consumo y 6 de tránsito), 3 fuera de tema, 4 de temas legales no cubiertos y 3 "cubiertas pero sin respuesta en la ley". Están redactadas distinto de las preguntas de ejemplo de la home.
- [`eval/holdout.json`](eval/holdout.json): 17 preguntas escritas **después** de ajustar el glosario y que no se usaron para ajustar nada. Miden cuánto generaliza.

### Resultados actuales: búsqueda léxica, sin modelo (`mock`)

| | Set principal | Holdout |
|---|---|---|
| Artículo esperado en el top-1 | 50% (10/20) | 62% (8/13) |
| Artículo esperado en el top-5 (lo que recibe el modelo) | **95% (19/20)** | **92% (12/13)** |
| MRR | 0.725 | 0.760 |
| Router: tipo de respuesta correcto* | **100% (27/27)** | 81% (13/16) |
| Respuestas indebidas (respondió algo que debía rechazar) | 0 | 2 |

\* Sin modelo se omiten las preguntas que solo el modelo puede rechazar ("cubierto pero sin respuesta clara").

Lo que muestra el holdout, sin maquillar:
- *"Mi abuela falleció, ¿cómo se reparte la herencia?"* y *"¿A qué edad me puedo jubilar?"* se detectan como temas no cubiertos. Pero palabras como "falleció" o "edad" también activan señales de trabajo y tránsito, así que la pregunta sigue de largo hasta el modelo. Sin modelo (mock) se responden mal. Con modelo se espera que respondan `not_found`, y en ese caso el sistema muestra la orientación del tema no cubierto.
- *"¿en cuánto tiempo me tienen que dar los certificados?"* se rechaza como fuera de tema porque no tiene ninguna palabra que el glosario asocie a trabajo, aunque el artículo correcto (LCT 80) queda primero en la búsqueda.

Los reportes completos están en [`eval/results/`](eval/results/). Para comparar modelos, se corre la evaluación con cada configuración y queda un reporte por combinación de proveedor, modelo y búsqueda (léxica o híbrida).

> **Pendiente:** correr la evaluación con Gemini y con embeddings (`gemini-embedding-001`) y agregar la comparación. Hace falta una API key, que no estuvo disponible en el entorno donde se desarrolló. Con embeddings también hay que calibrar `minCosine` en [`src/lib/assistant/answer.ts`](src/lib/assistant/answer.ts).

---

## Correrlo localmente

```bash
npm install
cp .env.example .env.local   # completar GEMINI_API_KEY (gratis en https://aistudio.google.com/apikey)
npm run index:build          # opcional: embeddings (una sola vez)
npm run dev
```

Sin API key, la app arranca en modo sin IA: responde con la cita textual del artículo más relevante y lo aclara en pantalla.

Actualizar los textos legales:

```bash
npm run laws:fetch    # descarga el texto actualizado de InfoLEG → data/raw/
npm run laws:parse    # → data/laws/*.json (estructura, artículos, vigencia)
npm run index:build   # recalcula embeddings
npm run eval          # verifica que nada se haya roto
```

Agregar una ley (por ejemplo la Constitución Nacional) es sumar una entrada en [`src/config/laws.ts`](src/config/laws.ts) y repetir esos pasos.

**Deploy:** pensado para Vercel (plan gratis). Variables mínimas: `GEMINI_API_KEY`. Recomendadas para producción: `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` y `IP_HASH_SALT`.

## Tests

```bash
npm test          # 37 tests: parser, búsqueda, router, validación de citas, límites, caché
npm run typecheck
```

## Estructura

```
src/
  config/        laws.ts (leyes, áreas, ejemplos, derivaciones) · site.ts (nombre, límites)
  lib/ingest/    HTML de InfoLEG → artículos (parser + notas de modificación + vigencia)
  lib/retrieval/ normalización y stemming en español, BM25, embeddings, búsqueda híbrida
  lib/scope/     glosario coloquial, señales de área, temas no cubiertos
  lib/ai/        interfaz + Gemini, compatible con OpenAI y mock
  lib/assistant/ prompt, pipeline/router, servicio (validación, captcha, caché, límites)
  lib/guard/     límites de uso, KV (memoria / Upstash), Turnstile
  app/           inicio (chat), /explorar (leer y buscar en las leyes), /como-funciona, /api/ask
scripts/         fetch-laws, parse-laws, build-index
data/            raw/ (HTML original de InfoLEG) · laws/ (JSON parseado) · index/ (embeddings)
eval/            preguntas, holdout, runner y resultados
```

## Límites conocidos

- Es información general y no reemplaza a un abogado. El sistema lo dice y deriva.
- Los convenios colectivos pueden dar más derechos que la LCT, y en tránsito cada provincia o municipio puede tener normas propias. Ninguno de los dos está cargado.
- El texto de InfoLEG puede tardar en reflejar una modificación reciente. Por eso se muestra la fecha de descarga y la última modificación incorporada.
- La búsqueda léxica no entiende sinónimos que no estén en el glosario. Para eso están los embeddings.
