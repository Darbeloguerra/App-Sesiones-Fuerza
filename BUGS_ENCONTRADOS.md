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

## 12. Funciones de "récord de carga"/"cambios de e1RM" no se movieron a src/calc/e1rm.js — RESUELTO en el Paso 5.5b

En el Paso 4 se decidió dejar `calcularRecordsCargaJugador`,
`calcularCambiosE1rm`, `cambiosRobustosE1rm`, `evaluarRendimientoEquipo`,
`calcularCargaFuerzaPorMicro` y `calcularCargaSugerida` en App.jsx porque
dependían de `materialEfectivo`/`EQUIPOS_AMBIGUOS`/`claveDisenoTarea`/
`medianaNum`, infraestructura más amplia fuera de alcance de aquel paso.
Al llegar al Paso 5 (separar Roster), `useCarteraEntrenador` —compartida
por Roster, Dashboard y Ficha— resultó depender de este mismo motor, así
que se promovió entero a `src/calc/e1rm.js`, junto con
`materialEfectivo`/`EQUIPOS_AMBIGUOS`/`claveDisenoTarea`/`medianaNum`,
con 14 tests nuevos.

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

## 17. BUGS REALES: 3 funciones más sin importar en pantallas ya separadas — CORREGIDOS

El script del punto 16 solo comparaba etiquetas JSX en MAYÚSCULA
(componentes). Al preparar Roster se construyó un segundo script que
también revisa llamadas a función en minúscula, y encontró 3 fallos más
que ya estaban comprometidos en commits anteriores:

- `src/screens/BibliotecaEjercicios.jsx`: usaba `destinatariosEfectivosSesion`,
  `etiquetaDestinoSesion` y `fmtHaceDias` sin importarlas (Paso 5.4).
- `src/screens/ControlFatiga.jsx`: usaba `sumarDiasFecha` e
  `inicioSemanaCalendario` sin importarlas (Paso 5.3).

Ninguno de los 4 se había disparado en las comprobaciones visuales
anteriores porque esas rutas de código (vincular un partido en CMJ,
mostrar "última vez usada" de una plantilla en Biblioteca) no se llegaron
a ejercitar sin credenciales de entrenador reales.

**Corregido** en el Paso 5.6 (promoviendo `destinatariosEfectivosSesion` y
`etiquetaDestinoSesion` a `src/core/hooks.js`, ya que también las
necesita Calendario). El segundo script de verificación (llamadas a
función en minúscula, no solo componentes JSX) se suma a la rutina de
cada sub-paso siguiente, junto con el del punto 16.

## 18. BUG REAL MÁS SERIO: el propio App.jsx usaba 11 piezas sin importarlas — CORREGIDO

Hasta el Paso 5.6, los dos scripts de verificación (puntos 16 y 17) solo
se habían ejecutado contra las pantallas ya separadas (`ControlFatiga.jsx`,
`BibliotecaEjercicios.jsx`, etc.), nunca contra `App.jsx` mismo — que
sigue siendo, por ahora, el archivo que renderiza Roster, el Dashboard
del entrenador, la Ficha de jugador, la Pantalla de jugador y el
Calendario, todos todavía sin extraer.

Al ejecutarlos por primera vez contra `App.jsx` completo, aparecieron 11
fallos reales, todos "usa esto pero no lo importa", introducidos al ir
sacando piezas a `src/core/components.jsx` y `src/core/hooks.js` en
pasos anteriores sin añadir el import de vuelta en `App.jsx`:

- De `src/core/components.jsx`: `ChipReal`, `TagChipReal`,
  `campoSelectReal`, `TAGS_DESCRIPTIVOS_BIBLIOTECA`, `inicialesNombre`,
  `colorAvatarJugador`, `MiniStat`.
- De `src/core/hooks.js`: `agruparPlantillas`, `claveVideoVariante`,
  `videoEfectivoTarea`, `formatearDetalleTareaCoach`.

El más grave de los 11 es `ChipReal`: se usa en el listado de Roster para
la etiqueta "SUSPENDIDO" junto al nombre de un jugador dado de baja. Ese
import faltaba desde el Paso 5.4 (cuando `ChipReal` se movió a
`components.jsx`) — es decir, cualquier entrenador que hubiera entrado a
Roster desde entonces se habría encontrado esa pantalla rota (error de
JavaScript en blanco), sin que ningún build ni comprobación visual
anterior lo detectara, porque Vite solo valida que los imports declarados
resuelvan a un archivo real, no que todo lo usado esté importado, y la
comprobación visual de cada sub-paso solo llegaba hasta el Portal de
acceso (no hay credenciales de entrenador reales para entrar más allá).

**Corregido** en el Paso 5.6, añadiendo las 11 piezas a los imports ya
existentes en la cabecera de `App.jsx`. Verificado con: build de Vite
limpio, 86 tests en verde, auditoría de declaraciones (0 perdidas frente
al original) y ambos scripts de verificación relanzados tanto contra
`App.jsx` como contra las 4 pantallas ya separadas — sin fallos
pendientes salvo falsos positivos ya conocidos (variables locales como
`EditorComponent`, `Icono`, o claves `on-`/`save-`/`guardar-` que vienen
de desestructurar hooks, no de imports).

A partir de este punto, la rutina de verificación de cada sub-paso
incluye explícitamente lanzar ambos scripts contra `App.jsx` completo,
no solo contra la pantalla recién separada — este bug solo salió a la
luz por una comprobación manual puntual (buscar si `ChipReal` ya estaba
importado antes de añadirlo), no porque el proceso ya lo cubriera.

## 19. BUG REAL: `AVATAR_STACK_COLORES` sin exportar ni importar — rompía la vista "Equipos" — CORREGIDO

Al preparar la extracción de Roster (`TarjetaEquipoReal`, la tarjeta de
cada equipo en la vista "Equipos y usuarios") se encontró que esa tarjeta
usa `AVATAR_STACK_COLORES[i % AVATAR_STACK_COLORES.length]` para colorear
el avatar-stack de sus jugadores, pero esa constante:

- vive como `const` privada (sin `export`) dentro de
  `src/core/components.jsx` (se creó ahí solo para que la usara
  `colorAvatarJugador`, en el Paso 5.5 prep),
- y **nunca se importó en `App.jsx`**, que es donde seguía viviendo
  `TarjetaEquipoReal` hasta este mismo paso.

Ninguno de los dos scripts de verificación (puntos 16-18) lo detectó
porque ambos buscan etiquetas JSX en mayúscula o llamadas a función
(`identificador(`); `AVATAR_STACK_COLORES[...]` es un acceso a array, un
patrón que todavía no cubrían. Cualquier entrenador que hubiera abierto
la pestaña "Equipos" habría visto esa pantalla romperse (`ReferenceError:
AVATAR_STACK_COLORES is not defined`) desde el Paso 5.5.

**Corregido** en el Paso 5.6/5.7 (extracción de Roster): se añade
`export` a `AVATAR_STACK_COLORES` en `components.jsx` y se importa donde
corresponde (ahora en `src/screens/Roster.jsx`, junto al resto de piezas
de `TarjetaEquipoReal`). Verificado con build limpio, 86 tests en verde
y auditoría de declaraciones sin pérdidas.

## 20. Dos piezas de código muerto, ya desde el original (no introducidas por esta reorganización) — anotadas, no tocadas

Al extraer el Dashboard se encontraron dos constantes/funciones que no
las usa nada en todo el archivo: `LISTA_MOVIL_MAX_ALTO` (línea ~578 del
`App.jsx` de antes de este paso) y `SEM_COLOR_DASHBOARD` +
`sparklinePuntos` (justo después del Dashboard, antes de
`MiProgresoJugadorReal`). Se comprobó contra el primer commit (antes de
tocar nada) y ya estaban igual de huérfanas entonces — no es un bug de
esta reorganización, parece ser un resto de una versión anterior de
la pantalla (probablemente un sparkline de "quién necesita atención"
que se sustituyó por otra cosa, sin borrar el código viejo).

**No se toca** (la instrucción es no borrar código, solo mover/relocar).
Se deja tal cual está en `App.jsx`, fuera de los bloques que se van
extrayendo — ya no estorba para seguir avanzando, pero queda anotado
aquí para que algún día, si se quiere, se pueda limpiar a propósito.

## 21. BUG (detectado antes de comprometerlo): `FilaAlertaReal` también la usa la Ficha de jugador, no solo el Dashboard

Al mover `FilaAlertaReal` (parte de la "bandeja de atención") a
`src/screens/Dashboard.jsx`, los scripts de verificación encontraron que
`FichaAtencionReal` (dentro de la Ficha de jugador, todavía en `App.jsx`)
también la usa — el propio comentario de `FichaAtencionReal` ya decía
"mismas reglas que la bandeja de Inicio", así que tiene sentido que
compartan la fila.

**Corregido antes de comprometer el paso:** se exporta `FilaAlertaReal`
desde `Dashboard.jsx` y se importa en `App.jsx`. A diferencia de los
puntos 16-19, este no llegó a estar roto en ningún commit — lo cogió la
rutina de verificación (ambos scripts relanzados contra `App.jsx` tras
cada extracción) antes de guardar el paso.

## 22. Tres funciones más de código muerto, ya desde el original — anotadas, no tocadas

Al extraer la Ficha de jugador se encontraron otras tres piezas sin
ningún uso real en todo el archivo: `claveSesionVisible` y
`GraficoProgresionCarga` (junto a `HistorialPorJugador`) y
`etiquetaCargaFuerza` (junto a `resumenFuerzaSalto`). Comprobado contra
el primer commit: las tres ya estaban igual de huérfanas entonces — se
suman a la lista del punto 20 (`LISTA_MOVIL_MAX_ALTO`,
`SEM_COLOR_DASHBOARD`, `sparklinePuntos`). Parecen más restos de
versiones anteriores de la pantalla.

**No se tocan** (no se borra código). Se mueven junto con el resto del
bloque al que pertenecían físicamente, a `src/screens/FichaJugador.jsx`,
sin usarlas — quedan anotadas aquí para una limpieza futura a propósito.

## 23. BUGS (detectados antes de comprometerlos): 3 funciones usadas por la Ficha de jugador que quedaron atrás en App.jsx

Al extraer `CabeceraFichaJugadorReal`, `ResumenFichaJugadorReal`,
`CmjFichaJugadorReal`, `DatosPorRevisarFuerzaReal`,
`DatosPorRevisarCmjReal`, `CalendarioFichaJugadorReal`,
`FichaJugadorModuloReal` y el resto de la Ficha de jugador a
`src/screens/FichaJugador.jsx`, el script de llamadas a función
encontró 3 funciones que la Ficha de jugador usa pero que habían
quedado atrás en `App.jsx`, sin exportar ni importar en ningún sitio:

- `detectarRegistrosAtipicos` y `detectarCmjAtipicos` (con su constante
  `MIN_REGISTROS_PARA_REVISAR`) — la detección de registros de carga y
  saltos CMJ atípicos, usada por las pestañas "Datos por revisar" de la
  Ficha.
- `resumenFuerzaSalto` (con `NIVEL_CARGA_FUERZA_META`) — el cruce entre
  carga de fuerza y caída de salto en `CmjFichaJugadorReal`.

Las tres estaban físicamente muy lejos de donde se usan (la primera
cerca de la cabecera del archivo, en la zona de "Datos por revisar";
`resumenFuerzaSalto` cerca del final, junto a piezas de Biblioteca) —
otro caso del mismo patrón de funciones "mal archivadas" por el uso
intensivo de hoisting del código original (ver puntos 13 y 15).

También se encontró que `estadoDiaCalendario` — definida junto al resto
de helpers de Calendario (todavía sin extraer) — en realidad no la usa
Calendario en absoluto: solo la usa el mini-calendario de la propia
Ficha de jugador. Se mueve con ella, dejando el resto de Calendario
intacto para su propio sub-paso.

**Corregido antes de comprometer el paso:** las 4 piezas (y
`NIVEL_CARGA_FUERZA_META`/`MIN_REGISTROS_PARA_REVISAR`) se mueven a
`src/screens/FichaJugador.jsx`. Ninguna llegó a estar rota en un
commit — las encontró la rutina de verificación (script de llamadas a
función relanzado contra `FichaJugador.jsx`) antes de guardar el paso.

## 24. Otra pieza de código muerto ya desde el original: `useTareasForSesiones`

Al extraer la Pantalla del jugador se encontró que `useTareasForSesiones`
no la usa nada en todo el archivo (ni siquiera un comentario real, más
allá de mencionarla como "el mecanismo antiguo" ya sustituido por
`useHistorialData`). Comprobado contra el primer commit: ya estaba así
de huérfana entonces. Se suma a la lista de los puntos 20 y 22.

**No se toca.** Se mueve con el resto de su bloque a
`src/screens/PantallaJugador.jsx`, sin usarla.
