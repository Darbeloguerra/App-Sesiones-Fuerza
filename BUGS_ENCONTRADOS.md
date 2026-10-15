# Bugs y deuda técnica encontrados (sin corregir salvo que se indique)

Este archivo registra problemas detectados mientras se reorganiza App.jsx en
módulos más pequeños. No se corrigen aquí salvo que se diga explícitamente
"corregido" — son anotaciones para decidir más adelante.

## 1. `e1rmDe` (línea ~19049, dentro de `ReferenciasFuerzaFichaReal`) — e1RM sin validaciones

Las otras 4 copias del cálculo de e1RM (`e1rmDeValores` L910, `e1rmDeRegistro`
L10854 y L12204, `e1rmDeItem` L12464) comprueban:
- que las reps sean ≤ `REPS_MAX_RIR_FIABLE` (12),
- que la carga sea un número válido,
- que el RIR no esté vacío (`""`) antes de tratarlo como 0.

`e1rmDe` (pantalla "Ficha de jugador → Referencias de fuerza") no hace
ninguna de las 3 comprobaciones. Puede mostrar "NaN" o un e1RM calculado
con un RIR vacío tratado como "al fallo".

**Estado:** pendiente de corregir en el Paso 4 (unificación del e1RM). El
usuario ha aprobado que, al unificar, esta pantalla pase a usar la versión
correcta (con las 3 validaciones). Se marcará como "corregido" aquí cuando
se complete ese paso.

## 2. Adherencia "cumplidas/asignadas × 100" reimplementada 3 veces

Mismo cálculo, 3 copias independientes:
- `useDatosDashboardEntrenador` (L5230-5233)
- `calcularAdherenciaJugador` dentro de `PantallaJugadorReal` (L10755-10759)
- `calcularAdherencia` dentro de `ResumenFichaJugadorReal` (L17715-17719)

**Estado:** fuera de alcance del plan actual (el usuario solo pidió unificar
e1RM). Se deja igual. Candidato a unificar en un futuro si se decide.

## 3. Dos paletas de color casi idénticas (`ds` y `TEMA`)

`ds` (L14-38) y `TEMA` (L717-734) son el mismo sistema de diseño mantenido
en paralelo con dos nombres. `TEMA.borde` incluso reasigna `ds.border`
(L723). El propio código (comentario L706-710) admite que es una migración
a medias.

**Estado:** no afecta al plan actual, se deja igual.

## 4. `fechaISO(d)` (L4424-4426) duplica `todayStr()`/`normalizarFecha()`

Tercera forma distinta de construir una fecha `YYYY-MM-DD` a partir de un
`Date`. Se revisará al extraer las funciones de fecha (Paso 1) pero no se
fusionará sin preguntar, para no cambiar comportamiento.

## 5. `uploadGif` (L634-646) — función muerta

El propio comentario del código dice que el bucket "gifs" de Supabase
Storage no está creado y que ningún botón de la app la llama. No se toca.

## 6. `leerMicrociclosLegacy()` (L8287) — nombre sugiere ruta obsoleta

No se ha confirmado si sigue en uso. No se toca sin preguntar.

## 7. Adherencia estaba acoplada al motor de duración de tareas (resuelto en el Paso 2)

`pesoTareaAdherencia` dependía de `estimarTareaSeg`/`estimarResistenciaSeg`,
que vivían ~12.700 líneas más abajo (zona del Diseñador de sesiones). Se
decidió (con el usuario) extraer también ese motor de duración a
`src/calc/duracionTarea.js`, y `src/calc/adherencia.js` lo importa de ahí.
Sin cambios de comportamiento, con 16 tests propios del motor de duración.

## 8. El motor CMJ tenía 3 constantes de color mezcladas con el cálculo (resuelto en el Paso 3)

`CMJ_STATUS_META`, `CMJ_TAG_META` y `CMJ_METRIC_CHART_COLOR` vivían dentro
del bloque que el propio código describía como "funciones puras — no
dependen de React" (comentario original), pero las 3 referencian `ds`
(paleta de colores) para pintar etiquetas y gráficas. Se dejaron en App.jsx
(donde vive `ds`) y el resto del motor se movió a `src/calc/cmj.js`. Donde
`cmjHoyDe` necesitaba solo el TEXTO de `CMJ_TAG_META` (no el color), se
duplicó como `CMJ_TAG_LABELS` dentro de cmj.js — 3 strings, comentado,
sin riesgo de desincronización salvo que alguien cambie esas 3 etiquetas
de texto sin acordarse de este duplicado.

## 9. `npm audit` reporta 2 vulnerabilidades (1 moderada, 1 alta)

Detectado al hacer `npm install` en el Paso 0. No se ha tocado ninguna
dependencia (instrucción explícita del usuario). Anotado para que se decida
aparte si se quiere actualizar algo.
