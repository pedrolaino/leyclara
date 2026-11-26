# Eval, holdout set (2026-11-26)

- Model: `mock/extractive`
- Search: lexical
- Questions: 17 (13 with an expected article); 1 need a model and are left out of routing

## Search: is the expected article found?

| Metric | Value |
|---|---|
| Top-1 | 62% (8/13) |
| Top-3 | 85% (11/13) |
| Top-5 | 92% (12/13) |
| MRR | 0.760 |

## Routing: right kind of response?

| Expected | Correct |
|---|---|
| answer | 92% (12/13) |
| off_topic | 100% (1/1) |
| not_covered | 0% (0/2) |
| not_found | - |
| **Total** | **81% (13/16)** |

Answered when it should have declined: **2**

## Citations

Answers citing an expected article: 58% (7/12)

Average latency: 3 ms

## Details

| id | question | expected | got | rank | citations |
|---|---|---|---|---|---|
| h01 | Mi empleador me debe dos meses de sueldo, ¿puedo considerarme despedido? | answer: lct-242 / lct-246 | ✓ answer | 8 | lct-245 |
| h02 | ¿Cuántos días de licencia me dan por el nacimiento de mi hijo? | answer: lct-158 | ✓ answer | 1 | lct-158 |
| h03 | ¿Tengo derecho a que me den un recibo cada vez que me pagan? | answer: lct-138 / lct-140 | ✓ answer | 1 | lct-138 |
| h04 | Si me enfermo y tengo hijos, ¿cuántos meses me siguen pagando? | answer: lct-208 | ✓ answer | 1 | lct-208 |
| h05 | Me fui de la empresa, ¿en cuánto tiempo me tienen que dar los certificados? | answer: lct-80 | ✗ off_topic | 1 |  |
| h06 | El negocio donde compré el celular no me quiere cumplir la garantía y me manda al fabricante | answer: ldc-13 / ldc-11 | ✓ answer | 2 | ldc-14 |
| h07 | Me llegó una factura de gas con un consumo altísimo comparado con otros años | answer: ldc-31 | ✓ answer | 1 | ldc-31 |
| h08 | ¿Me pueden cobrar un mes extra por darme de baja del gimnasio? | answer: ldc-10quater | ✓ answer | 2 | ldc-10ter |
| h09 | ¿Qué es el daño punitivo? | answer: ldc-52bis | ✓ answer | 1 | ldc-52bis |
| h10 | ¿Es obligatorio usar casco en la moto? | answer: lnt-40 | ✓ answer | 4 | lnt-29 |
| h11 | ¿Puedo usar el celular mientras manejo? | answer: lnt-48 | ✓ answer | 1 | lnt-48 |
| h12 | ¿Qué pasa si no pago una multa de tránsito? ¿Vence? | answer: lnt-85 / lnt-89 | ✓ answer | 2 | lnt-82 |
| h13 | ¿Hasta qué velocidad puedo ir con el auto en la ruta? | answer: lnt-51 | ✓ answer | 1 | lnt-51 |
| h14 | ¿Me recomendás una serie para ver esta noche? | off_topic | ✓ off_topic | - |  |
| h15 | Mi abuela falleció, ¿cómo se reparte la herencia? | not_covered | ✗ answer | - | lct-158 |
| h16 | ¿A qué edad me puedo jubilar? | not_covered | ✗ answer | - | lnt-11 |
| h17 | ¿Cuánto es hoy el salario mínimo vital y móvil? | not_found | ✗ answer (skipped, needs a model) | - | lct-117 |
