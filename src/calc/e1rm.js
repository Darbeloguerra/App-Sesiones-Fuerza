// e1RM estimado (1RM a partir de una serie con carga/reps/RIR). Antes esta
// misma fórmula estaba reimplementada por separado en 5 sitios de App.jsx
// (e1rmDeValores, dos copias de e1rmDeRegistro, e1rmDeItem, y una quinta
// variante — e1rmDe en la ficha de jugador — a la que le faltaban las 3
// comprobaciones de seguridad de abajo). Ahora todas llaman a esta única
// función. Ver BUGS_ENCONTRADOS.md punto 1.
//
// Tabla RTF (repeticiones hasta el fallo) -> %1RM. RTF = reps realizadas +
// RIR: el puente que conecta una marca con un diseño (reps/RIR) distinto al
// de hoy. Valores medios de las fórmulas de Epley y Brzycki, coherentes con
// la literatura de RIR/RPE en entrenamiento de fuerza (Zourdos et al. 2016)
// y el mismo principio que usan los sistemas de autorregulación tipo RP o
// RTS/Tuchscherer. Es una tabla GENERALISTA (mismo valor para cualquier
// ejercicio) — el margen de error real es de varios puntos porcentuales,
// mayor cuanto más se aleje el RTF de 1-10 o más difieran las reps.
export const TABLA_PCT_1RM_POR_RTF = { 1: 1.0, 2: 0.96, 3: 0.92, 4: 0.9, 5: 0.87, 6: 0.85, 7: 0.83, 8: 0.8, 9: 0.77, 10: 0.75 };

// Por encima de ~12 repeticiones, el RIR reportado por el jugador deja de
// ser fiable (la relación reps-%1RM ya no es lineal y la autopercepción del
// RIR se degrada mucho en series largas — ver conversación) y la tabla de
// arriba ni siquiera cubre ese RTF. Cualquier cálculo de e1RM basado en RIR
// descarta las series por encima de este umbral en vez de forzarlas dentro
// de la tabla (lo que antes producía un e1RM muy por debajo del real).
export const REPS_MAX_RIR_FIABLE = 12;

export function pct1RMporRTF(rtf) {
  const rtfClamp = Math.max(1, Math.min(10, rtf));
  const base = Math.floor(rtfClamp);
  const resto = rtfClamp - base;
  if (resto === 0 || base >= 10) return TABLA_PCT_1RM_POR_RTF[base];
  return TABLA_PCT_1RM_POR_RTF[base] + (TABLA_PCT_1RM_POR_RTF[base + 1] - TABLA_PCT_1RM_POR_RTF[base]) * resto;
}

// e1RM = carga / %1RM(RTF), con RTF = reps + RIR. Solo series de hasta
// REPS_MAX_RIR_FIABLE repeticiones con RIR informado (RIR vacío/null no
// cuenta como 0 — significa "sin dato", y sin dato no hay e1RM fiable).
export function e1rmDeValores(carga, reps, rir) {
  const c = Number(carga);
  const r = Number(reps);
  const ri = rir !== "" && rir != null ? Number(rir) : null;
  if (!c || Number.isNaN(c) || Number.isNaN(r) || ri == null || Number.isNaN(ri) || r > REPS_MAX_RIR_FIABLE) return null;
  const pct = pct1RMporRTF(r + ri);
  return pct ? c / pct : null;
}

// e1RM de un registro — delega en la función compartida de arriba.
export function e1rmDeItem(it) {
  return e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
}

export function medianaNum(arr) {
  if (!arr.length) return null;
  const o = [...arr].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

// Equipos cuya carga no es comparable entre sí aunque el número de kg
// coincida (una Barra, un Multipower, una Mancuerna, una Kettlebell, una
// Máquina y un Trineo cargan de forma distinta) — cuando una tarea tiene dos
// o más de estos seleccionados a la vez, se le pregunta al jugador cuál usó
// de verdad, en vez de asumir uno.
// Un material cuenta como "equipo" (distinto del resto a efectos de comparar
// cargas y de preguntar al jugador cuál usa) salvo que sea un accesorio sin
// carga. Antes era una lista cerrada (Barra, Mancuerna...) y materiales como
// Polea nunca disparaban la pregunta de "¿con qué material?".
export const ACCESORIOS_SIN_CARGA = ["ninguno", "std", "banco", "step", "cajón", "caja", "colchoneta", "suelo", "pared", "banda", "goma", "bosu", "fitball", "foam roller", "rodillo", "valla", "cono", "aro", "escalera"].map((x) => x.toLowerCase());
export const EQUIPOS_AMBIGUOS = {
  includes: (m) => !!m && !ACCESORIOS_SIN_CARGA.includes(String(m).trim().toLowerCase()),
};

// Define qué hace que dos tareas sean "la misma" a efectos de comparar
// carga entre sesiones: mismo ejercicio, mismo equipo efectivamente usado,
// mismo modo (uni/bilateral) y mismo objetivo de reps + RIR. Las series NO
// entran en la clave — cambiar el número de series es solo volumen, no un
// diseño de tarea distinto.
export function materialEfectivo(it) {
  const mats = it.materiales || [];
  const ambiguos = mats.filter((m) => EQUIPOS_AMBIGUOS.includes(m));
  if (ambiguos.length >= 2) return it.subtipoCorporal || ambiguos[0];
  if (ambiguos.length === 1) return ambiguos[0];
  return mats[0] || "std";
}

export function claveDisenoTarea(nombre, equipo, unilateral, repsObjetivo, rirObjetivo) {
  return [(nombre || "").toLowerCase(), equipo || "std", unilateral ? "uni" : "bi", repsObjetivo ?? "", rirObjetivo ?? ""].join("::");
}

// Motor de "récord de carga" (e1RM) del jugador, extraído a una función
// reutilizable — es EXACTAMENTE el mismo cálculo que ya vive dentro de la
// pantalla del jugador (agrupar por ejercicio+equipo con materialEfectivo,
// e1RM por marca con e1rmDeRegistro/pct1RMporRTF, mejor marca vs. segunda
// mejor para el "% sobre tu récord anterior"), aquí compartido por la ficha
// del entrenador: el record-callout de Resumen y "Récords personales" de
// Progreso (Fase 6 → Equipos y usuarios) NO reinventan el cálculo, lo leen
// de aquí. Devuelve un registro por ejercicio+equipo con al menos un e1RM
// válido, con su mejor marca actual, la fecha en que se logró, el % sobre
// la siguiente mejor marca, y la serie cronológica completa de e1RM (para
// la mini-gráfica "línea discontinua en la mejor marca + anillo verde").
export function calcularRecordsCargaJugador(items) {
  const registrosConCarga = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null);
  const equiposPorNombre = new Map();
  items
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ")
    .forEach((it) => {
      const eq = materialEfectivo(it);
      if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
      equiposPorNombre.get(it.name).add(eq);
    });
  const etiqueta = (nombre, equipo) => ((equiposPorNombre.get(nombre)?.size || 0) > 1 && equipo && equipo !== "std" ? `${nombre} (${equipo})` : nombre);
  const e1rmDeRegistro = (it) => e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
  const registrosPorEjercicio = new Map();
  registrosConCarga.forEach((it) => {
    const equipo = materialEfectivo(it);
    const clave = `${it.name}::${equipo}`;
    if (!registrosPorEjercicio.has(clave)) registrosPorEjercicio.set(clave, { nombre: it.name, equipo, regs: [] });
    registrosPorEjercicio.get(clave).regs.push(it);
  });
  const records = [];
  registrosPorEjercicio.forEach(({ nombre, equipo, regs }, clave) => {
    const conE1rm = regs.map((it) => ({ it, e1rm: e1rmDeRegistro(it) })).filter((x) => x.e1rm != null);
    if (!conE1rm.length) return;
    const ordenados = [...conE1rm].sort((a, b) => b.e1rm - a.e1rm);
    const maxActual = ordenados[0];
    const maxAnterior = ordenados.find((x) => x.it.id !== maxActual.it.id && x.e1rm < maxActual.e1rm);
    const pctSobreAnterior = maxAnterior ? ((maxActual.e1rm - maxAnterior.e1rm) / maxAnterior.e1rm) * 100 : null;
    const puntosCron = [...conE1rm].sort((a, b) => new Date(a.it.date) - new Date(b.it.date));
    records.push({
      clave,
      nombre: etiqueta(nombre, equipo),
      valor: Math.round(maxActual.e1rm),
      fecha: maxActual.it.date,
      pctSobreAnterior,
      puntos: puntosCron.map(({ it, e1rm }) => ({ date: it.date, valor: Math.round(e1rm), reps: it.repsReal, rir: it.rirReal })),
    });
  });
  return records;
}

// Variación de fuerza por ejercicio+equipo (ENT-01), compartida por el
// Dashboard del entrenador ("Quién necesita atención") y la ficha del
// jugador. Es la MISMA lógica que "Cambios esta semana" de la pantalla del
// jugador: por cada ejercicio+equipo compara el valor estimado de lo último
// hecho dentro de la ventana [inicio, fin] con la media de todo lo hecho
// ANTES de la ventana. El valor es el e1RM (carga / %1RM del RTF = reps +
// RIR) si ese ejercicio maneja carga, o las reps al fallo (reps + RIR) si
// nunca la lleva (p. ej. dominadas). Sustituye a la media de kg de todos los
// ejercicios mezclados, que no significaba nada (una semana con más
// ejercicios ligeros parecía un "descenso" sin serlo). Solo entran
// ejercicios con dato dentro de la ventana Y antes de ella; sin eso no hay
// nada que comparar. `serie` son los últimos valores del ejercicio (para el
// sparkline).
export function calcularCambiosE1rm(items, inicio, fin) {
  const validos = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ");
  const equiposPorNombre = new Map();
  const porClave = new Map();
  const claveConCarga = new Set();
  validos.forEach((it) => {
    const equipo = materialEfectivo(it);
    if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
    equiposPorNombre.get(it.name).add(equipo);
    const clave = `${it.name}::${equipo}`;
    if (!porClave.has(clave)) porClave.set(clave, { nombre: it.name, equipo, regs: [] });
    porClave.get(clave).regs.push(it);
    if (it.cargaReal !== "" && it.cargaReal != null) claveConCarga.add(clave);
  });
  const etiqueta = (nombre, equipo) => ((equiposPorNombre.get(nombre)?.size || 0) > 1 && equipo && equipo !== "std" ? `${nombre} (${equipo})` : nombre);
  const cambios = [];
  porClave.forEach(({ nombre, equipo, regs }, clave) => {
    const conCarga = claveConCarga.has(clave);
    const valorEstimado = (it) => {
      if (conCarga) return e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
      const reps = Number(it.repsReal);
      const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
      if (Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return null;
      return reps + rir;
    };
    const conValor = regs
      .map((it) => ({ it, v: valorEstimado(it) }))
      .filter((x) => x.v != null)
      .sort((a, b) => (a.it.date < b.it.date ? -1 : a.it.date > b.it.date ? 1 : 0));
    const dentro = conValor.filter((x) => x.it.date >= inicio && x.it.date <= fin);
    const antes = conValor.filter((x) => x.it.date < inicio);
    if (!dentro.length || !antes.length) return;
    const mediaAntes = antes.reduce((sum, x) => sum + x.v, 0) / antes.length;
    if (mediaAntes <= 0) return;
    const ultimo = dentro[dentro.length - 1];
    cambios.push({
      clave,
      nombre: etiqueta(nombre, equipo),
      pct: ((ultimo.v - mediaAntes) / mediaAntes) * 100,
      conCarga,
      nRegistros: dentro.length,
      serie: conValor.slice(-5).map((x) => x.v),
      // Para poder explicar cada ejercicio: valor de ahora, su nivel habitual
      // (media de lo anterior), cuándo fue y si es kg (e1RM) o repeticiones.
      actual: ultimo.v,
      habitual: mediaAntes,
      fecha: ultimo.it.date,
    });
  });
  return cambios;
}

// ---------- Rendimiento (e1RM) calibrado con datos reales ----------
// Calibrado con 7 semanas de histórico (3.357 registros de Fuerza, 877 series
// jugador-ejercicio con carga). La regla anterior marcaba entre 7 y 21
// jugadores por semana (de 13-23 con datos): casi toda la plantilla, por ruido
// y por cambios de ejercicio (p. ej. un ejercicio con -59 % en 17 jugadores a
// la vez, que no es rendimiento sino otro material/unidad). La regla calibrada
// da 0-2 avisos por semana y separa los cambios que afectan a muchos
// jugadores a la vez como "revisar datos".
//   - Solo ejercicios con carga y e1RM calculable (reps <= 12, con RIR).
//   - Base = mediana de las últimas 5 marcas anteriores (mín. 2).
//   - Cae si baja más de max(10 %, 2 x su ruido propio (MAD)).
//   - Aviso al jugador: >= 2 ejercicios caen y son >= 50 % de los comparables.
//   - Cambio sistémico: un ejercicio con >= 5 jugadores y mediana de cambio
//     >= 30 % (en valor absoluto) se excluye y se avisa para revisar datos.
export const RENDIMIENTO_CFG = { minPrevios: 2, ventana: 5, umbralMin: 0.1, kRuido: 2, minEjerciciosBajan: 2, fraccionBajan: 0.5, cambioSistemico: 0.3, minJugadoresSistemico: 5 };
export function cambiosRobustosE1rm(items, inicio, fin) {
  const cfg = RENDIMIENTO_CFG;
  const porClave = new Map();
  items.forEach((it) => {
    if (!it.done || it.esResistencia || it.esElastica || it.bloque === "CMJ") return;
    const clave = `${it.name}::${materialEfectivo(it)}`;
    if (!porClave.has(clave)) porClave.set(clave, { nombre: it.name, regs: [], conCarga: false });
    const g = porClave.get(clave);
    g.regs.push(it);
    if (it.cargaReal !== "" && it.cargaReal != null) g.conCarga = true;
  });
  const res = [];
  porClave.forEach(({ nombre, regs, conCarga }, clave) => {
    if (!conCarga) return;
    const serie = regs
      .map((it) => {
        const e1 = e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
        return e1 ? { fecha: it.date, v: e1 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    const dentro = serie.filter((x) => x.fecha >= inicio && x.fecha <= fin);
    const antes = serie.filter((x) => x.fecha < inicio).slice(-cfg.ventana);
    if (!dentro.length || antes.length < cfg.minPrevios) return;
    const base = medianaNum(antes.map((x) => x.v));
    if (!base) return;
    const ruido = antes.length >= 3 ? (medianaNum(antes.map((x) => Math.abs(x.v - base))) * 1.4826) / base : 0;
    const ultimo = dentro[dentro.length - 1].v;
    res.push({ clave, nombre, base, ultimo, cambio: (ultimo - base) / base, ruido, serie: serie.slice(-5).map((x) => x.v) });
  });
  return res;
}
export function evaluarRendimientoEquipo(itemsPorJugador, jugadores, inicio, fin) {
  const cfg = RENDIMIENTO_CFG;
  const porJugador = new Map();
  const porEjercicio = new Map();
  jugadores.forEach((p) => {
    const cambios = cambiosRobustosE1rm(itemsPorJugador.get(p.id) || [], inicio, fin);
    if (!cambios.length) return;
    porJugador.set(p.id, cambios);
    cambios.forEach((c) => {
      if (!porEjercicio.has(c.clave)) porEjercicio.set(c.clave, { nombre: c.nombre, cambios: [] });
      porEjercicio.get(c.clave).cambios.push(c.cambio);
    });
  });
  const sistemicos = [];
  const excluidos = new Set();
  porEjercicio.forEach((g, clave) => {
    if (g.cambios.length < cfg.minJugadoresSistemico) return;
    const med = medianaNum(g.cambios);
    if (Math.abs(med) >= cfg.cambioSistemico) {
      excluidos.add(clave);
      sistemicos.push({ clave, nombre: g.nombre, jugadores: g.cambios.length, pct: Math.round(med * 100) });
    }
  });
  const resultados = new Map();
  porJugador.forEach((cambios, id) => {
    const validos = cambios.filter((c) => !excluidos.has(c.clave));
    if (!validos.length) return;
    const bajan = validos.filter((c) => c.cambio <= -Math.max(cfg.umbralMin, cfg.kRuido * c.ruido));
    const alerta = bajan.length >= cfg.minEjerciciosBajan && bajan.length / validos.length >= cfg.fraccionBajan;
    const media = validos.reduce((sum, c) => sum + c.cambio, 0) / validos.length;
    const peor = [...validos].sort((a, b) => a.cambio - b.cambio)[0];
    resultados.set(id, { alerta, pct: media * 100, bajan, comparables: validos.length, peor: { nombre: peor.nombre, pct: peor.cambio * 100 } });
  });
  return { resultados, sistemicos };
}

// Carga de fuerza de un jugador en cada microciclo, con los datos que ya se
// recogen (solo el bloque Fuerza): series hechas (o pautadas si el registro es
// anterior a series_hechas), intensidad media (kg de la serie top / mejor e1RM
// que llevaba hasta ese día en el mismo ejercicio+equipo), nº de sesiones y
// fechas de sesiones pesadas (>= 85 % del 1RM). "Relativa" compara las series
// con la media de sus hasta 4 microciclos anteriores con datos (necesita al
// menos 2): baja < 75 %, alta > 125 %.
export function calcularCargaFuerzaPorMicro(items, ventanas) {
  const fuerza = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque === "Fuerza");
  const porClave = new Map();
  fuerza.forEach((it) => {
    const clave = `${it.name}::${materialEfectivo(it)}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(it);
  });
  const pctPorItem = new Map();
  porClave.forEach((regs) => {
    let mejor = 0;
    [...regs]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .forEach((it) => {
        const e = e1rmDeItem(it);
        if (e == null) return;
        mejor = Math.max(mejor, e);
        pctPorItem.set(it.id, Number(it.cargaReal) / mejor);
      });
  });
  const cargas = ventanas.map((v) => {
    const enMicro = fuerza.filter((it) => !it.esReferencia && it.date >= v.desde && it.date <= v.hasta);
    const series = enMicro.reduce((sum, it) => sum + (it.seriesHechas !== "" && it.seriesHechas != null ? Number(it.seriesHechas) || 0 : Number(it.sets) || 0), 0);
    const pcts = enMicro.map((it) => pctPorItem.get(it.id)).filter((x) => x != null && Number.isFinite(x));
    const fechasPesadas = [...new Set(enMicro.filter((it) => (pctPorItem.get(it.id) ?? 0) >= 0.85).map((it) => it.date))].sort();
    return {
      microId: v.id,
      numero: v.numero,
      desde: v.desde,
      hasta: v.hasta,
      hayDatos: enMicro.length > 0,
      series,
      sesiones: new Set(enMicro.map((it) => it.date)).size,
      intensidad: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
      fechasPesadas,
      relativa: null,
      nivel: null,
    };
  });
  cargas.forEach((c, i) => {
    if (c.series <= 0) return;
    const previos = cargas.slice(Math.max(0, i - 4), i).filter((x) => x.series > 0);
    if (previos.length < 2) return;
    const media = previos.reduce((sum, x) => sum + x.series, 0) / previos.length;
    c.relativa = c.series / media;
    c.nivel = c.relativa > 1.25 ? "alta" : c.relativa < 0.75 ? "baja" : "normal";
  });
  return cargas;
}

// A partir de una marca previa con OTRO diseño (reps/RIR distinto al de
// hoy), estima una carga de partida para el diseño de hoy: calcula el e1RM
// implícito en la marca previa (carga / %1RM de su RTF) y lo vuelve a bajar
// al %1RM del RTF de hoy. Es una estimación de PARTIDA para que el jugador
// ajuste en el primer set según cómo se sienta el RIR real — no una
// prescripción cerrada. Por eso, si el salto de reps es mayor de 4, se
// prefiere no sugerir nada (el margen de error ya no es útil) antes que dar
// un número con falsa precisión.
export function calcularCargaSugerida(registroRef, repsHoy, rirHoy, redondeo = 2.5) {
  if (!registroRef) return null;
  const repsRef = Number(registroRef.repsReal);
  const rirRef = registroRef.rirReal !== "" && registroRef.rirReal != null ? Number(registroRef.rirReal) : null;
  const cargaRef = Number(registroRef.cargaReal);
  const repsObjetivo = Number(repsHoy);
  const rirObjetivo = rirHoy !== "" && rirHoy != null ? Number(rirHoy) : null;
  if (!cargaRef || Number.isNaN(cargaRef) || Number.isNaN(repsRef) || rirRef == null || Number.isNaN(repsObjetivo) || rirObjetivo == null) return null;
  if (repsRef > REPS_MAX_RIR_FIABLE || repsObjetivo > REPS_MAX_RIR_FIABLE) return null;
  if (Math.abs(repsObjetivo - repsRef) > 4) return null;
  const pctRef = pct1RMporRTF(repsRef + rirRef);
  const pctHoy = pct1RMporRTF(repsObjetivo + rirObjetivo);
  if (!pctRef) return null;
  const e1RM = cargaRef / pctRef;
  return Math.round((e1RM * pctHoy) / redondeo) * redondeo;
}
