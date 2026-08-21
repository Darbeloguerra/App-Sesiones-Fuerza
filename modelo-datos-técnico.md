# Modelo de datos — App Entrenamiento de Fuerza y Prevención (sub-19)

Especificación técnica derivada de las decisiones tomadas para la reconstrucción de la app. Pensada para pasarse directamente a quien la programe.

---

## 1. Jugador

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string/uuid | |
| `nombre` | string | |
| `pin` | string (4 dígitos) | Login del jugador |
| `estado` | enum: `activo` \| `suspendido` | Cambio siempre manual en ambos sentidos. No hay reactivación automática |
| `categorias_preventivas` | array de `categoria_id` | 0 a N. Puede estar vacío |

**Reglas:**
- Jugador `suspendido` no recibe sesiones.
- Asignar una categoría con pool vacío está permitido (no se bloquea), pero esa categoría no generará contenido en el bloque Preventivo hasta que tenga ejercicios.

---

## 2. Categoría preventiva (taxonomía fija)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `nombre` | string | Ver lista cerrada abajo |
| `tipo_tejido` | enum: `Muscular` \| `Tendinosa` \| `Articular` | Agrupa la UI (selector, filtros) |

**Lista cerrada de categorías:**

- **Muscular:** Isquiotibiales (muscular), Cuádriceps, Aductores, Sóleo/Gemelo
- **Tendinosa:** Rotuliana, Aquílea, Isquiotibial (tendinoso)
- **Articular:** Pubalgia, Cadera, Rodilla, Lumbar, Hombro

> Nota: "Isquiotibiales (muscular)" e "Isquiotibial (tendinoso)" son categorías distintas y deliberadamente renombradas para evitar confusión — representan lesiones de tejido distinto con enfoques preventivos distintos.

---

## 3. Ejercicio (Biblioteca)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string/uuid | |
| `nombre` | string | |
| `bloque` | enum: `Fuerza` \| `Específicas` \| `Core` \| `Movilidad` \| `Preventivo` \| `Resistencia` | **Único y obligatorio.** No es un tag — define a qué pool pertenece |
| `categoria_preventiva_id` | string \| null | **Obligatorio si y solo si `bloque = Preventivo`.** Null en cualquier otro bloque |
| `tags_descriptivos` | array de string | Lista cerrada y opcional: "Miembro superior", "Miembro inferior". Solo para búsqueda — **nunca** afectan qué pool rotativo usa el ejercicio. Deliberadamente reducida a 2 valores para no añadir tiempo al registrar tareas |
| `gif_url` | string \| null | En el mockup se guarda como imagen embebida (base64) por simplicidad. **En producción, debería subirse a un storage real (ej. el mismo Google Drive que ya usa la app actual) y guardar solo la URL** — embeber el archivo en cada registro no escala bien con muchos ejercicios/GIFs |
| `orden_rotacion` | integer \| null | Solo aplica si `bloque` es `Preventivo` o `Movilidad`. Define la posición en el pool rotativo de su categoría (o del pool general de Movilidad) |

**Reglas críticas:**
- `bloque` y `categoria_preventiva_id` son campos separados. La separación es intencional: impide que un ejercicio de Fuerza con un tag descriptivo casual (ej. "isquios" como grupo muscular) se cuele en el pool rotativo de la categoría preventiva Isquiotibiales.
- El pool rotativo de una categoría preventiva se calcula siempre como: `ejercicios WHERE bloque = 'Preventivo' AND categoria_preventiva_id = X`, ordenado por `orden_rotacion`. Nunca se filtra por tags descriptivos.
- Los ejercicios `Específicas` son seleccionables junto a los de `Fuerza` cuando se diseña el bloque Fuerza de una sesión (comparten posición en la sesión aunque son valores distintos de `bloque`).

---

## 4. Sesión

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string/uuid | |
| `fechas` | array de date | Una o más fechas en las que se aplica esta misma sesión. Cada fecha genera su propia instancia de ejecución (ver más abajo) |
| `md` | string \| null | Opcional. Clasificación de matchday: MD-4, MD-3, MD-2, MD-1, MD, MD+1, MD+2. Solo etiqueta, sin lógica automática asociada |
| `jugadores_destino` | array de `jugador_id` | Sesión única — no hay periodos ni planificación multi-semana |
| `preventivo_activo` | boolean | Interruptor manual del entrenador al diseñar la sesión. Si está desactivado, el bloque Preventivo no se aplica a nadie ese día aunque los jugadores tengan categoría asignada |
| `activacion_activa` | boolean | Interruptor manual del entrenador (por defecto `true`). Si está desactivado (ej. sin acceso a bici estática ese día), el bloque Activación **no aparece en absoluto** en la pantalla del jugador — la sesión empieza directamente en Movilidad. Mismo tratamiento que Resistencia (oculto, sin aviso), no como Preventivo |

**Regla de fechas múltiples:**
- Los bloques manuales (Core, Resistencia, Fuerza) se replican **idénticos** en cada fecha seleccionada — es la misma sesión diseñada una vez.
- Los bloques rotativos (Movilidad, Preventivo) generan un **turno de rotación independiente por cada fecha**: si seleccionas 3 fechas, el puntero de rotación avanza 3 veces (una vez por fecha), no una sola vez para las 3. El jugador no verá el mismo ejercicio rotativo repetido en las 3 fechas salvo que el pool sea tan pequeño que el ciclo se complete y vuelva a empezar.

**Regla de visibilidad diaria en el portal del jugador:**
- El portal del jugador consulta siempre la sesión cuya fecha coincide con **el día de hoy**. Una sesión programada para una fecha pasada o futura nunca aparece.
- **A las 00:00 del día siguiente a la fecha programada, el portal queda vacío** para ese jugador, se haya enviado la sesión o no — no hay "sesiones pendientes de ayer" ni arrastre entre días.
- Al confirmar el envío (doble confirmación, ver Tarea/UI), el jugador deja de ver el contenido de la sesión inmediatamente — se sustituye por una pantalla de confirmación ("Sesión enviada"), no por la sesión ya marcada. El efecto es el mismo que si se vaciara al día siguiente, solo que ocurre al instante tras confirmar.

Una sesión contiene 6 bloques en **orden fijo**:

1. **Activación** — opcional (interruptor `activacion_activa`), bici estática con duración en minutos definida por el entrenador cuando está activa. Si se desactiva, no aparece en la pantalla del jugador y la sesión empieza en Movilidad
2. **Movilidad** — rotativo automático (pool único, sin categorías)
3. **Preventivo** — requiere `preventivo_activo = true` para aplicarse; dentro de eso, rotativo automático por categoría del jugador; se omite si el jugador no tiene categoría asignada, o si la categoría asignada tiene el pool vacío
4. **Core** — diseño manual del entrenador, sin registro de carga
5. **Resistencia** — diseño manual del entrenador. Si no se rellena, **no aparece en absoluto en la pantalla del jugador** (a diferencia de Preventivo, que sí muestra un aviso "no aplica hoy" cuando corresponde). Normalmente no convive con Fuerza en la misma sesión
6. **Fuerza** — diseño manual del entrenador (modo/series/RIR, tipo de resistencia, material). **El entrenador nunca prescribe la carga** — la introduce siempre el jugador al ejecutar. Incluye tareas de `bloque = Fuerza` y `bloque = Específicas`

---

## 5. Tarea (dentro de una sesión, por jugador)

Cada tarea nace de un `ejercicio_id` de la biblioteca. Los campos de prescripción varían según el bloque:

| Campo | Tipo | Aplica a |
|---|---|---|
| `id` | string/uuid | Todos |
| `ejercicio_id` | string | Todos |
| `bloque_sesion` | enum (los 6 de arriba) | Todos |
| `modo` | enum: `reps` \| `tiempo` \| `metros` | Core, Movilidad, Preventivo, Fuerza — **se decide al diseñar la sesión, no es propiedad fija del ejercicio** (un mismo ejercicio, ej. plancha, puede ser dinámico=reps o estático=tiempo según el día). `metros` solo disponible en Fuerza (ej. sprint lastrado) |
| `series` | integer \| null | Core, Movilidad, Preventivo, Fuerza |
| `cantidad` | integer | Reps, segundos o metros, según `modo` |
| `rir` | integer \| null | Solo Fuerza. Prescrito por el entrenador |
| `tipo_resistencia` | enum: `Peso libre` \| `Elástica` \| `Peso corporal` \| null | Solo Fuerza. Decidido por el entrenador al diseñar. **No implica ningún valor de carga** — solo determina qué le preguntará la app al jugador al registrar (ver Registro) |
| `material` | array de string | Core, Fuerza. Opcional, multi-selección. Lista ampliable por el entrenador desde la app (ver Material más abajo) |
| `intervalos` | integer \| null | Solo Resistencia |
| `tiempo_trabajo_seg` | integer \| null | Solo Resistencia |
| `tiempo_descanso_seg` | integer \| null | Solo Resistencia |
| `nota` | string \| null | Core, Resistencia, Fuerza. Opcional, texto libre, **por tarea individual** — no es una propiedad del ejercicio en la biblioteca, se añade al incluir la tarea en esa sesión concreta (permite anotar algo puntual sobre una tarea ya existente, ej. "baja el ritmo si nota molestia"). **Si está vacía, el jugador no ve ningún apartado de nota en esa tarea** — no se renderiza espacio en blanco |

**Importante — la carga nunca es un campo de prescripción:** el entrenador jamás introduce un valor de carga (kg) al diseñar una tarea de Fuerza, ni siquiera como objetivo. Solo prescribe modo/cantidad/series/RIR/tipo de resistencia. El valor de carga es siempre un dato que **aporta el jugador** al ejecutar la sesión (ver sección 7, Registro).

### Material (lista cerrada pero ampliable)

Lista inicial: Barra, Mancuerna, Kettlebell, Bosu, Kine dynamic, Banda elástica, Balón medicinal, Conos, Picas, Trineo, Vallas, TRX, Foam Roller, Fitball, Rueda abdominal.

El entrenador puede añadir nuevos materiales a esta lista desde dentro de la propia app (mismo patrón que las tags descriptivas), sin tocar código.

### Circuito (agrupación ordenada de tareas)

Disponible en los bloques Core, Resistencia y Fuerza (los tres de diseño manual). Un circuito es una agrupación visual y lógica de varias tareas que deben ejecutarse **en un orden concreto**, como conjunto — distinto de una tarea individual suelta.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string/uuid | |
| `bloque_sesion` | enum: `Core` \| `Resistencia` \| `Fuerza` | Un circuito pertenece a un único bloque, no se mezcla entre bloques |
| `tareas` | array ordenado de `tarea_id` | El **orden del array es el orden de ejecución** — se muestra numerado (1, 2, 3...) tanto al entrenador como al jugador |

**Reglas:**
- Las tareas dentro de un circuito usan la misma estructura de campos que las tareas individuales del bloque correspondiente (Core/Fuerza usan modo/series/cantidad/RIR/tipo de resistencia/material; Resistencia usa intervalos/tiempo/recuperación).
- El entrenador puede reordenar las tareas dentro de un circuito (mover arriba/abajo) — el orden se conserva y es el que ve el jugador.
- Un bloque puede combinar tareas individuales sueltas y uno o varios circuitos a la vez; en los mockups, las tareas individuales se listan primero y los circuitos debajo, cada uno en su propio contenedor visualmente diferenciado.
- El jugador ve el circuito con una etiqueta "CIRCUITO" y cada tarea numerada según su posición, para que quede claro que es un conjunto con orden, no tareas sueltas.

**Reglas de asignación de contenido no manual:**
- Movilidad y Preventivo: la tarea del día se determina por el **puntero de rotación** de la categoría (o del pool único de Movilidad) — ver sección 6. Se genera y se envía directo al jugador sin revisión previa del entrenador.

---

## 6. Rotación (puntero por categoría)

| Campo | Tipo | Notas |
|---|---|---|
| `categoria_id` (o `movilidad` como pool único) | string | |
| `puntero_actual` | integer | Índice sobre la lista de ejercicios de esa categoría, ordenada por `orden_rotacion` |

**Lógica:**
- El puntero avanza en +1 (con wraparound) **cada vez que se genera una sesión** que usa esa categoría — no por día natural.
- Es un único puntero **por categoría** (no por jugador): si dos jugadores comparten categoría, ambos reciben el mismo ejercicio del pool ese "turno" de generación.
- Rotación estrictamente secuencial, nunca aleatoria.
- Si el pool tiene 0 ejercicios, no hay nada que rotar — el bloque se omite para esa categoría.

---

## 7. Registro (historial — por jugador, por tarea, por día)

| Campo | Tipo | Aplica a |
|---|---|---|
| `id` | string/uuid | Todos |
| `jugador_id` | string | Todos |
| `tarea_id` | string | Todos |
| `fecha` | date | Todos |
| `hecho` | boolean | Todos los bloques |
| `reps_hechas` | integer \| null | Solo Fuerza |
| `carga_kg` | decimal \| null | Solo Fuerza. **Introducida siempre por el jugador**, nunca prescrita por el entrenador |
| `rir` | integer \| null | Solo Fuerza |
| `subtipo_corporal` | enum: `Lastre` \| `Asistencia` \| null | Solo si la tarea tiene `tipo_resistencia = Peso corporal`. **Elegido por el jugador al registrar**, no por el entrenador al diseñar |

**Reglas:**
- Core, Movilidad, Preventivo, Activación, Resistencia: solo se registra `hecho` (booleano). Resistencia no registra carga (solo hecho/no hecho sobre lo prescrito en intervalos/tiempo).
- Fuerza: se registran reps realmente hechas + carga + RIR, no solo lo prescrito. Esto permite comparar de verdad con el registro anterior.
- **Qué campo de carga ve el jugador depende del `tipo_resistencia` de la tarea:**
  - `Peso libre` (o sin especificar): campo de carga siempre visible.
  - `Elástica`: campo de carga oculto — no tiene sentido cuantificarla en kg.
  - `Peso corporal`: el jugador elige primero `Lastre` o `Asistencia`. Si elige `Lastre`, aparece el campo de carga (kg añadidos). Si elige `Asistencia`, el campo de carga permanece oculto.
- Al reasignar un ejercicio de Fuerza a un jugador, se muestra el **último registro completo tal cual** (reps, carga, RIR) — sin normalizar a 1RM estimado ni ningún otro cálculo. Es responsabilidad del jugador/entrenador interpretar la comparación si el esquema de series/reps/RIR cambió respecto a la vez anterior.
- No existe vista agregada de adherencia ni sistema de alertas (descartado deliberadamente por complejidad). El historial es solo diario y filtrable.

---

## 8. Fuera de alcance (descartado explícitamente)

- Periodos de planificación multi-sesión — solo sesiones únicas.
- Capa de "equipos" para agrupar jugadores.
- Vista agregada de adherencia y alertas automáticas (no-marcado repetido, inconsistencia de cargas).
- Normalización de cargas a 1RM estimado.
- Reactivación automática de jugadores suspendidos.

---

## 9. Referencia cruzada con los mockups ya validados

- `portal-acceso.jsx` — pantalla única de entrada; según el código introducido, dirige a modo entrenador o a la pantalla del jugador correspondiente
- `dashboard-entrenador.jsx` — pantalla de inicio en modo entrenador, con navegación a los 5 módulos
- `diseno-sesion.jsx` — pantalla de diseño, entrenador (crear sesión nueva)
- `programacion.jsx` — ver y editar sesiones ya guardadas: la de hoy y las futuras programadas, en el mismo módulo
- `pantalla-jugador.jsx` — pantalla de ejecución, jugador
- `gestion-roster.jsx` — gestión de jugadores y asignación de categorías
- `biblioteca-ejercicios.jsx` — CRUD de ejercicios, categorías y orden de rotación
- `historial.jsx` — dos vistas: registro diario por jugador (filtrable por fecha), y por sesión (qué jugadores enviaron una fecha concreta y cuáles no)

> **Código de entrenador — decidido:** se genera una única vez de forma aleatoria y segura (evitando caracteres ambiguos como O/0, I/1) y se entrega al entrenador para el primer acceso. No hay flujo de "recuperar contraseña" — al ser una sola persona, la recuperación es directamente entrar al backend (Sheet/Apps Script) con su propia cuenta de Google y leer o cambiar el valor ahí. Desde `portal-acceso.jsx`, tras entrar como entrenador, hay una opción "Cambiar mi código de acceso" para sustituirlo por uno propio en cualquier momento — ese cambio debe persistirse en el mismo lugar del backend donde vive el código actual (celda de Sheet o propiedad de Apps Script), no solo en el estado de la pantalla.

---

## 10. Módulo de Programación (ver/editar sesiones guardadas)

Cubre el hueco que quedaba entre "crear" (`diseno-sesion.jsx`) y "ya se ejecutó" (`historial.jsx`): un lugar para ver qué hay programado y modificarlo antes de que llegue al jugador.

- Lista las sesiones ya guardadas cuya fecha es **hoy o futura** (las pasadas quedan fuera de este módulo; para eso está el Historial).
- La sesión de "hoy" se muestra en su propia sección, destacada, junto con las próximas — mismo módulo, distinto filtro de fecha, tal como se pidió.
- **Editar una sesión con varias fechas modifica el lote completo** (todas sus fechas a la vez) — decisión explícita: no hay edición aislada por fecha individual dentro de un mismo lote. Si se necesita que una fecha del lote sea distinta a las demás, la solución es diseñar esa fecha como una sesión aparte desde el principio, no editarla después desde aquí.
- Los bloques rotativos (Movilidad, Preventivo) se muestran de solo lectura — no son editables desde este módulo porque su contenido depende del pool automático, no de una asignación manual.
- Los bloques manuales (Activación, Core, Resistencia, Fuerza) sí son editables: añadir/quitar tareas reutilizando el mismo buscador de biblioteca que `diseno-sesion.jsx`.
- **Cada tarea se muestra con el mismo formato visual que ve el jugador en `pantalla-jugador.jsx`** (miniatura de GIF, nombre, prescripción, nota si la tiene) — no un resumen de texto reducido. Esto aplica también a los bloques automáticos: al haberse ya resuelto la rotación en el momento de diseñar (Opción A, sección 6), el ejercicio concreto que le tocó a esa fecha ya se conoce y se muestra igual que se le mostrará al jugador.

**Regla de separación automática tras envío del jugador:** en el momento en que el jugador confirma/envía la sesión de una fecha, si esa fecha pertenece a un lote con más fechas, el sistema **separa automáticamente** esa fecha en su propio registro de sesión — de solo lectura, con el contenido exacto que se envió — y el lote original se queda con esa fecha menos (las demás fechas futuras siguen siendo un lote editable conjunto). Esto evita que una edición posterior deje "huérfano" un registro ya guardado (reps/carga/RIR) sobre una tarea que, tras la edición, ya no sería la misma, sin sacrificar la posibilidad de seguir ajustando las fechas futuras del lote.

- La sesión separada guarda una referencia al lote original (`lote_origen_id`) por trazabilidad, aunque a efectos prácticos ya es independiente.
- Una sesión ya enviada es **siempre de solo lectura** — nunca se puede modificar, se haya separado de un lote o fuera ya de fecha única desde el principio.
- La separación ocurre en el momento del envío, no al intentar editar después — así el módulo de Programación siempre refleja el estado correcto sin lógica adicional al abrir la pantalla.

## 11. Infraestructura y decisiones de implementación

**Backend:** se mantiene Google Sheets + Google Apps Script + Google Drive (mismo stack que la app actual), con las siguientes optimizaciones respecto al diseño actual para evitar la lentitud que arrastraba:

- Una pestaña por entidad (Jugadores, Ejercicios, Sesiones, Registros) en vez de un único almacén clave-valor genérico ("kv") que obliga a parsear JSON en cada lectura.
- `CacheService` de Apps Script para datos de baja frecuencia de cambio (biblioteca de ejercicios, categorías preventivas): cache de varias horas, invalidado solo al editar.
- Lecturas/escrituras siempre en bloque (`getValues()`/`setValues()` sobre rangos), nunca celda a celda.
- El puntero de rotación se calcula y guarda en el momento de diseñar la sesión (ver más abajo), no se recalcula desde el historial completo en cada lectura.

**GIFs (Drive):**
1. Se reutiliza la carpeta "GIFs - App Sesiones de Fuerza" ya existente.
2. Un endpoint de Apps Script recibe el archivo subido desde el navegador y lo guarda con `DriveApp.getFolderById(ID).createFile(blob)`.
3. Se le da permiso `ANYONE_WITH_LINK` / `VIEW`.
4. Se construye la URL directa de visualización (`https://drive.google.com/uc?export=view&id=...`).
5. Esa URL —no el archivo— es lo que se guarda en `gif_url` del ejercicio.

**PIN de jugador:**
- Por defecto, la app lo **genera automáticamente** al crear el jugador, comprobando que no colisione con ningún PIN ya existente.
- El entrenador puede **introducirlo manualmente** en su lugar (para conservar los PINs que ya usan los jugadores de la app actual durante la migración).
- El reseteo posterior sigue el mismo criterio: autogenerado por defecto, con opción de fijarlo a mano.

**Rotación — momento de cálculo (Opción A, confirmada):** el ejercicio de Movilidad/Preventivo que le toca a cada fecha seleccionada se calcula y **congela en el momento de diseñar y guardar la sesión** — no se recalcula cuando el jugador abre esa fecha más adelante. Si se añaden ejercicios al pool de una categoría entre el diseño y la fecha de ejecución, no afecta a sesiones ya diseñadas; solo aplica a sesiones diseñadas después de esa modificación. Esto simplifica la implementación (no hay que evaluar el pool en tiempo de lectura) y hace que lo que el entrenador ve al diseñar sea exactamente lo que se envía.
