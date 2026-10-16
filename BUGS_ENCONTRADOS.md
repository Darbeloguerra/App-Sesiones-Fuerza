# Bugs y deuda técnica encontrados (sin corregir salvo que se indique)

Este archivo registra problemas detectados mientras se reorganiza App.jsx en
módulos más pequeños. No se corrigen aquí salvo que se diga explícitamente
"corregido" — son anotaciones para decidir más adelante.

## 1. `e1rmDe` (dentro de `ReferenciasFuerzaFichaReal`) — e1RM sin validaciones — CORREGIDO en el Paso 4

Las otras 4 copias del cálculo de e1RM (`e1rmDeValores`, dos `e1rmDeRegistro`,
`e1rmDeItem`) comprobaban:
- que las reps sean ≤ `REPS_MAX_RIR_FIABLE` (12),
- que la carga sea un número válido,
- que el RIR no esté vacío (`""`) antes de tratarlo como 0.

`e1rmDe` (pantalla "Ficha de jugador → Referencias de fuerza") no hacía
ninguna de las 3 comprobaciones. Podía mostrar "NaN" o un e1RM calculado
con un RIR vacío tratado como "al fallo".

**Estado:** corregido. Las 5 copias ahora delegan en la única función
`e1rmDeValores` de `src/calc/e1rm.js` (con el usuario aprobado
explícitamente este cambio de comportamiento para esta pantalla en
concreto). Además se simplificaron 2 copias parciales más del mismo
cálculo (dentro de `calcularCambiosE1rm` y de la lógica de "Cambios esta
semana" de `PantallaJugadorReal`), que reimplementaban la rama "con carga"
en vez de llamar a la función compartida — mismo resultado, menos código
duplicado.

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

## 9. Dos funciones muertas encontradas al separar el núcleo compartido (Paso 5.1c)

- `useTareasForSesiones` (App.jsx): declarada pero no la llama nadie en todo
  el archivo — solo aparece mencionada dentro de un comentario de otra
  función. No se toca ni se mueve: se queda donde está hasta que se decida
  si se borra.
- `inputStyle` (App.jsx, justo donde antes vivía `MD_TAGS`): un objeto de
  estilo declarado y nunca usado en ningún sitio. Igual que arriba, no se
  toca.

## 10. `npm audit` reporta 2 vulnerabilidades (1 moderada, 1 alta)

Detectado al hacer `npm install` en el Paso 0. No se ha tocado ninguna
dependencia (instrucción explícita del usuario). Anotado para que se decida
aparte si se quiere actualizar algo.

## 11. `e1rmDeValores`: reps vacías (`""`) no se tratan como "sin dato", a diferencia de carga y RIR

Descubierto al escribir los tests del Paso 4. La función comprueba que la
CARGA y el RIR no estén vacíos antes de convertirlos a número, pero a las
REPS solo les hace `Number(reps)` directo: `Number("")` da `0`, no `NaN`,
así que una fila con `reps: ""` pero carga y RIR válidos **no** se descarta
— calcula un e1RM con 0 reps (RTF = 0 + RIR), en vez de devolver `null`
como cabría esperar. No se ha tocado porque es el comportamiento que ya
tenía la app en sus 5 copias (no es algo que haya introducido esta
reorganización) y en la práctica `repsReal` casi nunca llega vacío desde
los formularios. Queda anotado por si se quiere endurecer el guard.

## 12. Funciones de "récord de carga"/"cambios de e1RM" no se movieron a src/calc/e1rm.js

`calcularRecordsCargaJugador`, `calcularCambiosE1rm`, `cambiosRobustosE1rm`,
`evaluarRendimientoEquipo`, `calcularCargaFuerzaPorMicro` y
`calcularCargaSugerida` siguen en App.jsx (no en `src/calc/e1rm.js`) porque
dependen de `materialEfectivo`/`EQUIPOS_AMBIGUOS`/`claveDisenoTarea`/
`medianaNum` — utilidades de propósito general usadas por muchas pantallas
(Diseñador de sesiones, Historial, Ficha de jugador...), no solo por el
e1RM. Moverlas habría arrastrado esa infraestructura más amplia fuera de
alcance de "unificar el e1RM". Estas funciones ya delegan en la función
compartida `e1rmDeValores` (importada de `src/calc/e1rm.js`) para el
cálculo en sí, así que la duplicación de la FÓRMULA queda resuelta igual;
solo el "dónde vive el archivo" se queda en App.jsx por ahora. Candidatas a
mover en una fase posterior, junto con `materialEfectivo` y compañía.

## 13. `useMicrociclosTipo`/`usePartidos` vivían "dentro" de Calendario aunque las usa también CMJ y Dashboard (resuelto en el Paso 5, pantalla CMJ)

Estaban físicamente declaradas en la zona que será la pantalla Calendario,
pero `CmjMicrociclosReal` (Control de fatiga) y el Dashboard también las
llamaban — otro caso de "función archivada donde no vive su único usuario"
como el ya documentado para `useReferenciasPorEjercicio`. Se movieron a
`src/core/hooks.js` junto con sus helpers de mensaje de error
(`mensajeErrorMicro`, `mensajeErrorPartidos`, `leerMicrociclosLegacy`). Sin
cambios de comportamiento.

## 14. Nota de proceso: un `awk` de reemplazo borró por error una línea ajena (detectado y corregido)

Al separar el núcleo compartido, uno de los recortes automáticos con `awk`
calculó mal el límite final y se llevó por delante `const MICRO_VACIO = ...`
(una línea que no debía tocarse, justo después del bloque que sí se movía).
Se detectó con una comprobación de auditoría (comparar todas las
declaraciones de nivel superior del archivo original contra el estado
actual) y se restauró en el mismo paso, antes de hacer commit. Se anota
aquí para que quede constancia del control de calidad usado, no porque
quede ningún cambio sin corregir — en ese commit la línea ya estaba
restaurada. A partir de este punto, esa misma auditoría se repite tras
cada sub-paso siguiente.

## 15. Varias piezas "archivadas" lejos de su pantalla, encontradas al separar el Diseñador de sesiones (resuelto en el Paso 5)

Mismo patrón que el punto 13, varias veces más en un único sub-paso:

- `ChipReal`, `TagChipReal`, `campoSelectReal`, `TAGS_DESCRIPTIVOS_BIBLIOTECA`:
  usadas por Roster, Biblioteca, Ficha de jugador **y** el Diseñador de
  sesiones — movidas a `src/core/components.jsx`.
- `formatearDetalleTareaCoach`: usada por Diseñador, Calendario y
  Biblioteca — movida a `src/core/hooks.js`.
- `useReferenciasPorEjercicio`, `AvisoCmjDestinatariosReal`,
  `nuevoEstadoParcial`/`guardarFilaConParcial`, `useCmjMicrociclos`,
  `tareaADraft`/`agruparCircuitosDeTareas`: estas sí eran de uso exclusivo
  del Diseñador, pero estaban declaradas físicamente muy lejos (algunas
  cerca del principio del archivo, antes incluso del backend) — se
  trasladaron íntegras a `src/screens/DisenoSesion.jsx`, junto a su único
  consumidor.

Sin cambios de comportamiento en ningún caso — solo cambia dónde vive cada
pieza. Verificado con build limpio, 72 tests, auditoría de declaraciones
(0 perdidas de las 378 originales) y carga sin errores en el navegador.

## 16. BUG REAL: a `ControlFatigaModuloReal` (Paso 5.3) le faltaba un import — CORREGIDO

Al separar la pantalla de Control de fatiga en el Paso 5.3,
`PantallaEntrenadorAncha` (el envoltorio con la barra lateral que usan
casi todas las pantallas del entrenador) se quedó sin importar en el
archivo nuevo. El build de Vite no lo detectó (comprueba que los imports
resuelvan, no que cada etiqueta JSX usada exista) y la comprobación
visual de aquel paso solo llegó hasta el Portal de acceso — nunca se
entró al módulo de Control de fatiga en sí, porque no hay credenciales
de entrenador para probarlo de verdad.

**Cómo se detectó:** al preparar el siguiente sub-paso (Biblioteca), un
barrido más completo de dependencias encontró que `PantallaEntrenadorAncha`
también le hacía falta a Biblioteca, y al ir a comprobar dónde vivía
ahora mismo esa pieza, saltó que `ControlFatiga.jsx` la usaba sin
haberla importado nunca.

**Corregido** en el Paso 5.4b, junto con un script de verificación nuevo
(comparar las etiquetas JSX en mayúscula de cada pantalla contra sus
imports) que se añade a partir de ahora a la rutina de cada sub-paso,
precisamente para detectar este tipo de fallo antes de comprometerlo.
