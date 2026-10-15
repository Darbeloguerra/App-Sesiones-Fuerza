// Adherencia ponderada por tareas (ENT-07). Extraído de App.jsx sin cambiar
// su comportamiento.
//
// Antes una sesión contaba como cumplida si el jugador registraba CUALQUIER
// cosa ese día (con hacer la activación ya salía 100 %). Ahora cada sesión-día
// vale la fracción de su trabajo que se hizo, ponderando por bloque: lo que
// más pesa para el rendimiento (Fuerza) cuenta más que lo accesorio. CMJ no
// pesa (es una medición, no trabajo). Si la sesión no tiene tareas con peso
// (o no se cargaron), se cae a la regla antigua: algo registrado = cumplida.
// Peso de una tarea = su duración estimada en segundos (mismo cálculo que el
// tiempo de sesión del diseñador, ver duracionTarea.js). Así 40 min de
// carrera pesan mucho más que dos tareas de core, en vez de contar cada
// tarea como "una".
import { normalizarFecha } from "./fechas.js";
import { estimarResistenciaSeg, estimarTareaSeg } from "./duracionTarea.js";

// Todo lo propio de una tarea de Resistencia (tipo continuo/HIIT/RSA y sus
// campos) se guarda como JSON en la columna `resistencia_data`. Este helper
// lo interpreta de forma segura — un solo sitio tanto para el entrenador
// (Programación) como para el jugador, así no se desincronizan.
export function parseResistenciaData(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const SEG_ADHERENCIA_POR_DEFECTO = { Fuerza: 600, Resistencia: 1200, Core: 300, Preventivo: 180, Movilidad: 300, "Activación": 300 };

export function pesoTareaAdherencia(t) {
  const bloque = t.bloque_sesion;
  if (bloque === "CMJ") return 0;
  let seg = 0;
  try {
    if (bloque === "Resistencia") {
      const r = parseResistenciaData(t.resistencia_data) || {};
      seg = estimarResistenciaSeg({ ...r, tipoResistenciaCardio: r.tipo || "" });
    } else {
      seg = estimarTareaSeg(
        { modo: t.modo || "reps", series: t.series, cantidad: t.cantidad, lateralidad: t.lateralidad, descanso: t.descanso_seg, modoCarga: t.modo_carga, pct1rm: t.pct1rm, rir: t.rir },
        bloque === "Fuerza" ? "Fuerza" : "Core"
      );
    }
  } catch {
    seg = 0;
  }
  return seg > 0 ? seg : SEG_ADHERENCIA_POR_DEFECTO[bloque] ?? 180;
}

// Una tarea con `para_jugadores` (JSON de ids) solo es para esos jugadores;
// vacía = para todos los destinatarios de la sesión.
export function tareaEsParaJugador(t, jugadorId) {
  if (!t || !t.para_jugadores) return true;
  try {
    const ids = JSON.parse(t.para_jugadores);
    return !Array.isArray(ids) || !ids.length || ids.includes(jugadorId);
  } catch {
    return true;
  }
}

export function crearFraccionCumplida(tareas) {
  const porSesion = new Map();
  (tareas || []).forEach((t) => {
    if (!porSesion.has(t.sesion_id)) porSesion.set(t.sesion_id, []);
    porSesion.get(t.sesion_id).push(t);
  });
  // idsHechos: Set con los ids de las tareas que el jugador tiene hechas ese día.
  return (sesionId, fecha, idsHechos, jugadorId) => {
    const hechos = idsHechos || new Set();
    const relevantes = (porSesion.get(sesionId) || []).filter((t) => (!t.fecha || normalizarFecha(t.fecha) === fecha) && (jugadorId == null || tareaEsParaJugador(t, jugadorId)));
    const pesoDe = (t) => pesoTareaAdherencia(t);
    const total = relevantes.reduce((sum, t) => sum + pesoDe(t), 0);
    if (total <= 0) return hechos.size > 0 ? 1 : 0;
    const hecho = relevantes.reduce((sum, t) => sum + (hechos.has(t.id) ? pesoDe(t) : 0), 0);
    return Math.min(1, hecho / total);
  };
}

// jugador::fecha -> Set de ids de tarea hechas, a partir de los items del historial.
export function tareasHechasPorJugadorFecha(items) {
  const mapa = new Map();
  items.forEach((it) => {
    if (!it.done || !it.tareaId) return;
    const clave = `${it.jugadorId ?? ""}::${it.date}`;
    if (!mapa.has(clave)) mapa.set(clave, new Set());
    mapa.get(clave).add(it.tareaId);
  });
  return mapa;
}

// Cumplimiento de lo pautado frente a lo registrado: compara lo que el
// jugador registró con lo que la tarea pedía, sin necesitar más datos que los
// que ya se recogen. Tres lecturas independientes, cada una solo con las
// tareas donde tiene sentido (nunca se rellena con supuestos):
// - series: series hechas / series pautadas (solo registros con series_hechas).
// - reps: en cuántas tareas la serie top llegó al objetivo de repeticiones.
// - RIR: diferencia media entre el RIR real y el objetivo (negativa = fue
//   más cerca del fallo de lo pautado; positiva = se guardó más de lo pautado).
// Excluye Resistencia y CMJ. Devuelve null en cada lectura sin datos.
export function calcularCumplimientoPauta(items, desde, hasta) {
  const regs = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.date >= desde && it.date <= hasta);
  let seriesHechas = 0;
  let seriesPautadas = 0;
  let repsOk = 0;
  let repsTotal = 0;
  let rirDifSuma = 0;
  let rirN = 0;
  regs.forEach((it) => {
    const pautadas = Number(it.sets);
    if (it.seriesHechas !== "" && it.seriesHechas != null && Number.isFinite(pautadas) && pautadas > 0) {
      seriesHechas += Number(it.seriesHechas) || 0;
      seriesPautadas += pautadas;
    }
    const repsObj = Number(it.reps);
    const repsReal = Number(it.repsReal);
    if (it.unidad === "reps" && it.repsReal !== "" && Number.isFinite(repsObj) && repsObj > 0 && Number.isFinite(repsReal)) {
      repsTotal++;
      if (repsReal >= repsObj) repsOk++;
    }
    const rirObj = it.rir !== "" && it.rir != null ? Number(it.rir) : NaN;
    const rirReal = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : NaN;
    if (Number.isFinite(rirObj) && Number.isFinite(rirReal)) {
      rirDifSuma += rirReal - rirObj;
      rirN++;
    }
  });
  return {
    tareas: regs.length,
    series: seriesPautadas ? { hechas: seriesHechas, pautadas: seriesPautadas, pct: Math.round((seriesHechas / seriesPautadas) * 100) } : null,
    reps: repsTotal ? { ok: repsOk, total: repsTotal, pct: Math.round((repsOk / repsTotal) * 100) } : null,
    rirDif: rirN ? { media: rirDifSuma / rirN, n: rirN } : null,
  };
}
