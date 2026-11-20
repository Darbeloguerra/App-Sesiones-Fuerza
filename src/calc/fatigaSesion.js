// Valoración de una sesión de Fuerza a partir de lo que registra el jugador:
// mejor serie y última serie de cada ejercicio (carga, repeticiones, RIR).
//
// Cada ejercicio se valora contra lo que el entrenador pautó EN ÉL:
//  - Clasificación automática: «sin fallo» si el objetivo de la tarea es
//    Potencia o el RIR pautado es 4 o más; «exigente» en el resto.
//  - Zona de referencia: la del objetivo de la tarea (guiaObjetivo.js); si el
//    RIR pautado queda fuera de esa zona, o no hay objetivo, el RIR pautado ±1.
//  - RIR real: el más bajo entre la mejor y la última serie.
// El índice de fatiga de sesión usa SOLO los ejercicios exigentes (mezclar
// ejercicios de potencia diluiría el valor), ponderados por volumen-carga.
// La caída de rendimiento sale de fatigaTarea (e1rm.js): misma función y misma
// tabla RTF que ya usa la pantalla del jugador. Los umbrales son orientativos.
import { fatigaTarea, FATIGA_CFG, REPS_MAX_RIR_FIABLE } from "./e1rm.js";
import { OBJETIVOS_SESION, zonaRir } from "./guiaObjetivo.js";

// Caída máxima (%) para considerar que un ejercicio «sin fallo» mantuvo el
// rendimiento. Umbral provisional de la app.
export const CAIDA_MAX_SIN_FALLO = 5;
export const MIN_SERIES_FATIGA = 3;

const vacio = (v) => v === "" || v == null || Number.isNaN(Number(v));
const num = (v) => (vacio(v) ? null : Number(v));

export function objetivoDeId(id) {
  return OBJETIVOS_SESION.find((o) => o.id === id) || null;
}

// { zona: {min,max}|null, tipo: "ex"|"sf"|null, fuente }
export function clasificarTarea({ objetivo, rirPautado }) {
  const o = objetivoDeId(objetivo);
  const ri = num(rirPautado);
  let zona = null;
  let fuente = "";
  if (o) {
    const z = zonaRir(o);
    zona = { min: z.min, max: z.max };
    fuente = o.etiqueta;
  }
  if (ri != null && (!o || ri < zona.min || (zona.max != null && ri > zona.max))) {
    zona = { min: Math.max(0, ri - 1), max: ri + 1 };
    fuente = "RIR pautado ±1";
  }
  let tipo = null;
  if (o && o.id === "potencia") tipo = "sf";
  else if (ri != null) tipo = ri >= 4 ? "sf" : "ex";
  else if (o) tipo = "ex";
  return { zona, tipo, fuente, objetivo: o };
}

export function textoZona(z) {
  if (!z) return "—";
  if (z.max == null) return `RIR ≥ ${z.min}`;
  return z.min === z.max ? `RIR ${z.min}` : `RIR ${z.min}–${z.max}`;
}

export const ESTADOS = {
  ok: { etiqueta: "Cumplida", nivel: "bien" },
  exc: { etiqueta: "Intensidad excedida", nivel: "aviso" },
  baj: { etiqueta: "Por debajo de lo pautado", nivel: "medio" },
  cal: { etiqueta: "Rendimiento no mantenido", nivel: "medio" },
  ref: { etiqueta: "Sin referencia", nivel: "" },
};

// item: { cargaReal, repsReal, rirReal, ultimaCargaReal, ultimaRepsReal,
//         ultimaRirReal, seriesHechas, seriesPautadas, rirPautado, objetivo,
//         modo, ...cualquier otro campo (se devuelve en `item`) }
// Devuelve null si el ejercicio no es de repeticiones o no tiene carga/reps.
export function valorarTareaFuerza(item) {
  if (!item || (item.modo && item.modo !== "reps")) return null;
  const carga = num(item.cargaReal);
  const reps = num(item.repsReal);
  if (carga == null || reps == null) return null;
  const series = num(item.seriesHechas) ?? num(item.seriesPautadas) ?? 1;
  const rir1 = num(item.rirReal);
  const tieneUltima = !vacio(item.ultimaRepsReal) && !vacio(item.ultimaRirReal);
  const reps2 = tieneUltima ? Number(item.ultimaRepsReal) : 0;
  const carga2 = tieneUltima ? (vacio(item.ultimaCargaReal) ? carga : Number(item.ultimaCargaReal)) : 0;
  const rir2 = tieneUltima ? Number(item.ultimaRirReal) : null;
  const clase = clasificarTarea({ objetivo: item.objetivo, rirPautado: item.rirPautado });
  const o = { item, series, carga, reps, rir1, tieneUltima, clase, caida: null, e1rmMejor: null, e1rmUltima: null, motivo: "", desv: null };
  o.volumen = series * (tieneUltima ? (reps * carga + reps2 * carga2) / 2 : reps * carga);
  const rirs = [rir1, rir2].filter((x) => x != null);
  o.rirReal = rirs.length ? Math.min(...rirs) : null;
  o.efectivas = rirs.length ? (rirs.every((x) => x <= 3) ? series : rirs.some((x) => x <= 3) ? 1 : 0) : null;
  const rp = num(item.rirPautado);
  if (rirs.length && rp != null) o.desv = rirs.reduce((a, b) => a + b, 0) / rirs.length - rp;

  if (!tieneUltima) o.motivo = "Sin última serie";
  else if (series < MIN_SERIES_FATIGA) o.motivo = `Menos de ${MIN_SERIES_FATIGA} series`;
  else if (rir1 == null) o.motivo = "Sin RIR";
  else if (reps > REPS_MAX_RIR_FIABLE || reps2 > REPS_MAX_RIR_FIABLE) o.motivo = `Más de ${REPS_MAX_RIR_FIABLE} repeticiones`;
  else {
    const f = fatigaTarea({ cargaReal: carga, repsReal: reps, rirReal: rir1, ultimaCargaReal: carga2, ultimaRepsReal: reps2, ultimaRirReal: rir2 });
    if (f) {
      o.caida = Math.max(0, f.caidaPct);
      o.e1rmMejor = f.e1rmMejor;
      o.e1rmUltima = f.e1rmUltima;
    } else o.motivo = "Sin datos suficientes";
  }

  const z = clase.zona;
  if (!z || clase.tipo == null || o.rirReal == null) o.estado = "ref";
  else if (o.rirReal < z.min) o.estado = "exc";
  else if (z.max != null && o.rirReal > z.max) o.estado = "baj";
  else if (clase.tipo === "sf" && o.caida != null && o.caida > CAIDA_MAX_SIN_FALLO) o.estado = "cal";
  else o.estado = "ok";
  return o;
}

// Nivel del índice (misma escala que FATIGA_CFG de la pantalla del jugador).
export function nivelCaida(pct) {
  if (pct == null) return null;
  return pct >= FATIGA_CFG.alta ? "alta" : pct >= FATIGA_CFG.moderada ? "moderada" : "baja";
}

export function valorarSesionFuerza(items) {
  const filas = (items || []).map(valorarTareaFuerza).filter(Boolean);
  if (!filas.length) return null;
  const exigentes = filas.filter((o) => o.clase.tipo === "ex");
  const validas = exigentes.filter((o) => o.caida != null);
  let volumen = 0;
  let volExigente = 0;
  let volValido = 0;
  let efectivas = 0;
  let seriesExigentes = 0;
  const desv = [];
  filas.forEach((o) => {
    volumen += o.volumen;
    if (o.desv != null) desv.push(o.desv);
  });
  exigentes.forEach((o) => {
    volExigente += o.volumen;
    if (o.efectivas != null) {
      efectivas += o.efectivas;
      seriesExigentes += o.series;
    }
  });
  validas.forEach((o) => { volValido += o.volumen; });
  const indice = validas.length && volValido > 0 ? validas.reduce((a, o) => a + o.caida * o.volumen, 0) / volValido : null;
  let mayor = null;
  validas.forEach((o) => { if (!mayor || o.caida > mayor.caida) mayor = o; });
  const evaluables = filas.filter((o) => o.estado !== "ref");
  return {
    filas,
    exigentes,
    validas,
    volumen,
    indice,
    nivel: nivelCaida(indice),
    cobertura: volExigente > 0 ? (volValido / volExigente) * 100 : 0,
    efectivas,
    seriesExigentes,
    desviacion: desv.length ? desv.reduce((a, b) => a + b, 0) / desv.length : null,
    mayor,
    evaluables: evaluables.length,
    cumplidas: evaluables.filter((o) => o.estado === "ok").length,
    avisos: filas.filter((o) => o.estado === "exc" || o.estado === "baj" || o.estado === "cal"),
  };
}
