// Objetivo por tarea: encaje de los valores con cada objetivo, valores típicos
// editables y ligadura entre %1RM, RIR y repeticiones.
//
// Qué tiene respaldo y qué es criterio de la app:
//  - RIR de hipertrofia 0–5 y fuerza 3–5: Robinson et al., 2024 (ver
//    guiaObjetivo.js). La hipertrofia mejora al acercarse al fallo; la fuerza
//    se gana igual en un rango amplio de RIR.
//  - Hipertrofia con cualquier carga si las series se acercan al fallo:
//    López et al., 2021.
//  - Zona de %1RM de fuerza (75 % hasta el % que deja el RIR mínimo), zona de
//    potencia y tope de 6 repeticiones en potencia: criterio de la app.
//  - Los VALORES TÍPICOS que se rellenan al elegir un objetivo son un punto
//    de partida de la app, no un dato científico; el entrenador los edita.
//  - La conversión %1RM <-> repeticiones máximas usa la tabla de e1rm.js
//    (fiable desde el 75 %); por debajo de 75 % no se calculan repeticiones.
import { OBJETIVOS_SESION, RIR_DEFECTO, REPS_MAX_POTENCIA, rtfDePct } from "./guiaObjetivo.js";
import { pct1RMporRTF } from "./e1rm.js";

export const VALORES_TIPICOS_INICIALES = {
  fuerza: { pct: 80, rir: RIR_DEFECTO.fuerza },
  hipertrofia: { pct: 75, rir: RIR_DEFECTO.hipertrofia },
  potencia: { pct: 60, rir: RIR_DEFECTO.potencia, reps: 4 },
};

const CLAVE_TIPICOS = "asf.valoresTipicos.v1";

const num = (v) => (v === "" || v == null ? NaN : Number(v));
const esNum = (v) => Number.isFinite(num(v));
const tienePct = (t) => esNum(t.pct1rm) && num(t.pct1rm) > 0;
const copia = (o) => JSON.parse(JSON.stringify(o));

export const objetivoPorId = (id) => OBJETIVOS_SESION.find((o) => o.id === id) || null;

// ---- valores típicos (se guardan en el dispositivo; sin base de datos) ----
export function normalizarTipicos(crudo) {
  const base = copia(VALORES_TIPICOS_INICIALES);
  if (!crudo || typeof crudo !== "object") return base;
  for (const id of Object.keys(base)) {
    const c = crudo[id];
    if (!c || typeof c !== "object") continue;
    const pct = Number(c.pct), rir = Number(c.rir), reps = Number(c.reps);
    if (Number.isFinite(pct) && pct >= 30 && pct <= 100) base[id].pct = pct;
    if (Number.isFinite(rir) && rir >= 0 && rir <= 10) base[id].rir = rir;
    if (id === "potencia" && Number.isFinite(reps) && reps >= 1 && reps <= REPS_MAX_POTENCIA) base[id].reps = reps;
  }
  return base;
}

export function leerTipicos(almacen) {
  try {
    const a = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
    const crudo = a ? a.getItem(CLAVE_TIPICOS) : null;
    return normalizarTipicos(crudo ? JSON.parse(crudo) : null);
  } catch {
    return copia(VALORES_TIPICOS_INICIALES);
  }
}

export function guardarTipicos(tipicos, almacen) {
  try {
    const a = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
    if (a) a.setItem(CLAVE_TIPICOS, JSON.stringify(normalizarTipicos(tipicos)));
  } catch {
    /* sin almacenamiento: los valores valen solo en esta sesión de pantalla */
  }
}

// ---- zonas por objetivo ----
export function zonaPctObjetivo(o, tipoMov) {
  if (!o) return null;
  if (o.zonas) return tipoMov === "pliometrico" ? { min: 0, max: 30 } : { min: 30, max: 70 };
  if (o.id === "fuerza") return { min: Math.round(pct1RMporRTF(10) * 100), max: Math.round(pct1RMporRTF(1 + o.rir.min) * 100) };
  return { min: 30, max: 100 }; // hipertrofia: cualquier carga (López et al., 2021)
}

export const enZonaPct = (o, p, tipoMov) => {
  const z = zonaPctObjetivo(o, tipoMov);
  const v = num(p);
  return !!z && Number.isFinite(v) && v >= z.min - 1e-9 && v <= z.max + 1e-9;
};

export const enZonaRir = (o, r) => {
  const v = num(r);
  return !!o && Number.isFinite(v) && v >= o.rir.min && (o.rir.max == null || v <= o.rir.max);
};

// Rango de repeticiones [lo, hi] que deja el RIR del objetivo al % de la tarea.
// null si no hay % o cae por debajo de 75 % (sin tabla), o si en potencia el %
// queda fuera de su zona.
export function rangoReps(o, t) {
  if (!o || !tienePct(t)) return null;
  const p = num(t.pct1rm);
  const R = rtfDePct(p);
  if (R == null) return null;
  if (o.zonas && !enZonaPct(o, p, t.tipoMov)) return null;
  const hi0 = Math.max(1, Math.round(R - o.rir.min));
  const lo = o.rir.max == null ? 1 : Math.max(1, Math.round(R - o.rir.max));
  const hi = o.zonas ? Math.min(hi0, REPS_MAX_POTENCIA) : hi0;
  return [Math.min(lo, hi), hi];
}

export function enZonaReps(o, t, n) {
  const r = rangoReps(o, t);
  const v = num(n);
  return !!r && Number.isFinite(v) && v >= r[0] && v <= r[1];
}

// Objetivos con los que encajan los valores actuales de la tarea (ids).
// Cada valor conocido tiene que estar en la zona del objetivo. Si no hay
// ningún valor, devuelve [].
export function objetivosQueEncajan(t) {
  const p = num(t.pct1rm), r = num(t.rir), n = num(t.cantidad);
  const R = tienePct(t) ? rtfDePct(p) : null;
  const rir = Number.isFinite(r) ? r : (R != null && Number.isFinite(n) ? R - n : NaN);
  if (!tienePct(t) && !Number.isFinite(rir) && !Number.isFinite(n)) return [];
  return OBJETIVOS_SESION.filter((o) => {
    if (tienePct(t) && !enZonaPct(o, p, t.tipoMov)) return false;
    if (Number.isFinite(rir) && !enZonaRir(o, Math.round(rir))) return false;
    if (o.zonas && Number.isFinite(n) && n > REPS_MAX_POTENCIA) return false;
    return true;
  }).map((o) => o.id);
}

// ¿Se aleja la tarea del objetivo que tiene elegido?
export function derivaDeObjetivo(t) {
  if (!t.objetivo) return null;
  const hayValores = tienePct(t) || esNum(t.rir) || esNum(t.cantidad);
  if (!hayValores) return null;
  const encajan = objetivosQueEncajan(t);
  return encajan.includes(t.objetivo) ? null : encajan;
}

// En qué objetivos cae un valor concreto (para la nota a la derecha de cada
// opción del desplegable). campo: "pct" | "rir" | "reps".
export function objetivosEnZona(campo, valor, t) {
  return OBJETIVOS_SESION.filter((o) => {
    if (campo === "pct") return enZonaPct(o, valor, t.tipoMov);
    if (campo === "rir") return enZonaRir(o, valor);
    return enZonaReps(o, t, valor);
  }).map((o) => o.id);
}

const nombre = (id) => (objetivoPorId(id) || { etiqueta: id }).etiqueta;

// ---- elegir objetivo ----
// Con % ya puesto, el % no se toca: solo se rellenan RIR y repeticiones.
// Sin %, se usa el % típico del objetivo.
export function aplicarObjetivo(t, id, tipicos = VALORES_TIPICOS_INICIALES) {
  if (!id) return { tarea: { ...t, objetivo: "" }, mensaje: null };
  const o = objetivoPorId(id);
  if (!o) return { tarea: t, mensaje: null };
  const d = tipicos[id] || VALORES_TIPICOS_INICIALES[id];
  const tenia = tienePct(t);
  const pctTipico = o.zonas && t.tipoMov === "pliometrico" ? Math.min(d.pct, 30) : d.pct;
  const pct = tenia ? String(t.pct1rm) : String(pctTipico);
  const R = rtfDePct(pct);
  let cantidad;
  if (R != null) cantidad = String(Math.max(1, Math.round(R - d.rir)));
  else cantidad = String(d.reps ?? (esNum(t.cantidad) ? t.cantidad : (o.zonas ? 4 : 8)));
  const tarea = { ...t, objetivo: id, pct1rm: pct, pct1rmOrigen: undefined, rir: String(d.rir), cantidad, cargaAuto: false };
  const mensaje = tenia
    ? `${o.etiqueta} con tu ${pct} %: RIR ${d.rir} y ${cantidad} reps rellenados. El % no se toca.`
    : `${o.etiqueta}: ${pct} % · RIR ${d.rir} · ${cantidad} reps (valores típicos). Ajusta lo que necesites.`;
  return { tarea, mensaje };
}

// ---- cambiar % / RIR / repeticiones ----
// Con objetivo: al elegir un % se rellenan RIR y repeticiones para ese objetivo
// (se respeta el RIR actual si ya está en su zona). Sin objetivo, o al cambiar
// RIR o repeticiones, el tercer valor se recalcula con la tabla (RTF = reps +
// RIR) cuando el % está en tabla (>= 75 %).
// campo: "pct1rm" | "rir" | "cantidad". Devuelve { tarea, mensaje }.
export function ligarCampo(t, campo, valor, tipicos = VALORES_TIPICOS_INICIALES) {
  const antes = { cantidad: t.cantidad, rir: t.rir };
  const nueva = { ...t, [campo]: valor };
  if (campo === "pct1rm") nueva.pct1rmOrigen = undefined;
  if ((t.modo || "reps") !== "reps") return { tarea: nueva, mensaje: null };
  const o = objetivoPorId(t.objetivo);
  const R = tienePct(nueva) ? rtfDePct(num(nueva.pct1rm)) : null;

  if (campo === "pct1rm" && o) {
    const d = tipicos[o.id] || VALORES_TIPICOS_INICIALES[o.id];
    if (!enZonaRir(o, nueva.rir)) nueva.rir = String(d.rir);
    if (R != null) nueva.cantidad = String(Math.max(1, Math.round(R - num(nueva.rir))));
    else if (!esNum(nueva.cantidad)) nueva.cantidad = String(d.reps ?? (o.zonas ? 4 : 8));
    const resto = R != null ? ` (máximo del %: ${Math.round(R)} reps)` : "";
    return { tarea: nueva, mensaje: tienePct(nueva) ? `${o.etiqueta} a ${nueva.pct1rm} %: RIR ${nueva.rir} y ${nueva.cantidad} reps${resto}.` : null };
  }

  if (R == null) return { tarea: nueva, mensaje: null };
  if (campo === "pct1rm" || campo === "rir") {
    if (!esNum(nueva.rir)) return { tarea: nueva, mensaje: null };
    const n = String(Math.max(1, Math.round(R - num(nueva.rir))));
    if (n === String(antes.cantidad)) return { tarea: nueva, mensaje: null };
    nueva.cantidad = n;
    return { tarea: nueva, mensaje: `Repeticiones ${esNum(antes.cantidad) ? antes.cantidad : "—"} → ${n} (máximo a ${nueva.pct1rm} %: ${Math.round(R)} reps, RIR ${nueva.rir}).` };
  }
  if (campo === "cantidad" && esNum(nueva.cantidad)) {
    const rir = String(Math.max(0, Math.round(R - num(nueva.cantidad))));
    if (rir === String(antes.rir)) return { tarea: nueva, mensaje: null };
    nueva.rir = rir;
    return { tarea: nueva, mensaje: `RIR ${esNum(antes.rir) ? antes.rir : "—"} → ${rir} (máximo a ${nueva.pct1rm} %: ${Math.round(R)} reps).` };
  }
  return { tarea: nueva, mensaje: null };
}

// Texto de la zona para la cabecera de cada desplegable.
export function textoZonaObjetivo(o, campo, t) {
  if (!o) return "";
  if (campo === "pct") {
    const z = zonaPctObjetivo(o, t.tipoMov);
    if (o.id === "hipertrofia") return "cualquier carga, si te acercas al fallo (López et al., 2021). La tabla de repeticiones solo calcula desde 75 %.";
    return `carga habitual ${z.min === 0 ? `hasta ${z.max}` : `${z.min}–${z.max}`} % (criterio de la app).`;
  }
  if (campo === "rir") {
    const rango = o.rir.max == null ? `RIR ${o.rir.min} o más` : `RIR ${o.rir.min}–${o.rir.max}`;
    if (o.id === "hipertrofia") return `${rango}. Más cerca del fallo, más hipertrofia dentro de ese rango (Robinson et al., 2024).`;
    if (o.id === "fuerza") return `${rango}. La fuerza se gana igual en ese rango (Robinson et al., 2024).`;
    return `${rango}, lejos del fallo (criterio de la app).`;
  }
  const r = rangoReps(o, t);
  if (r) return `a ${Math.round(num(t.pct1rm))} % salen ${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`} reps.`;
  const lim = o.id === "fuerza" ? "hasta 8 reps (referencia)." : o.id === "hipertrofia" ? "sin límite de reps." : "hasta 6 reps (criterio de la app).";
  return `${lim} Elige un % desde 75 para calcularlas.`;
}
