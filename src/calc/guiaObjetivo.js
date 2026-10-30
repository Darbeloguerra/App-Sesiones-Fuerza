// Guía de %1RM y RIR según el objetivo de la sesión (diseñador).
//
// BASE: la cercanía al fallo (RIR) recomendada por objetivo, según el metaanálisis
// de 55 estudios de Robinson, Pelland, Remmert, Refalo, Jukic, Steele y Zourdos
// (Sports Medicine, 2024, DOI 10.1007/s40279-024-02069-2): fuerza ~3-5
// repeticiones antes del fallo (la cercanía al fallo no mostró efecto claro
// sobre la fuerza); hipertrofia 0-5 (más cerca del fallo tiende a más hipertrofia).
// Respaldo para fuerza: Davies et al. 2016 (Sports Med 46:487-502) y Grgic et al.
// 2022 (J Sport Health Sci): llegar al fallo no es necesario para ganar fuerza.
// Son rangos medios de estudios, amplios, y el RIR lo estima el jugador.
// POTENCIA: no hay un rango de RIR publicado que yo haya podido verificar. Se usa
// un criterio conservador y explícito de la app: RIR >= 3 (lejos del fallo). Lo
// que sí está medido es que la pérdida de velocidad crece con el % de
// repeticiones realizadas respecto al máximo (Rodríguez-Rosell et al., 2020,
// J Strength Cond Res 34:2537-2547), y que parar con poca pérdida de velocidad
// mejoró más el salto (Pareja-Blanco et al., 2017). El %1RM de máxima potencia
// depende del ejercicio (Soriano et al., 2015, Sports Med 45:1191-1205, 27
// estudios): sentadilla en torno a 30-70 %, salto con carga <= ~30 %, cargada
// y cargada colgante >= ~70 %. Son zonas amplias y los cortes son aproximados.
//
// La conversión %1RM <-> repeticiones máximas usa la tabla RTF de e1rm.js
// (válida hasta RTF 10 = 75 %; más allá no se dan cifras).
import { TABLA_PCT_1RM_POR_RTF, pct1RMporRTF } from "./e1rm.js";

export const RTF_TABLA_MAX = 10;
export const OBJETIVOS_SESION = [
  { id: "fuerza", etiqueta: "Fuerza", rir: { min: 3, max: 5 }, fuente: "Robinson et al., 2024" },
  { id: "hipertrofia", etiqueta: "Hipertrofia", rir: { min: 0, max: 5 }, fuente: "Robinson et al., 2024" },
  {
    id: "potencia",
    etiqueta: "Potencia",
    rir: { min: 3, max: null },
    fuente: "criterio de la app: lejos del fallo",
    nota: "Lejos del fallo y a máxima velocidad intencionada. Los cortes de carga son aproximados.",
    zonas: [
      { id: "pliometrico", tipo: "Pliométrico", ejemplos: "saltos con carga, lanzamientos", rango: "≤30 %" },
      { id: "nopliometrico", tipo: "No pliométrico", ejemplos: "sentadilla, press, peso muerto…", rango: "30–70 %" },
    ],
    fuenteZonas: "Soriano et al., 2015 y 2017",
  },
];

const textoRir = (o) => (o.rir.max == null ? `RIR ≥ ${o.rir.min}` : `RIR ${o.rir.min}–${o.rir.max}`);
export const etiquetaRir = textoRir;

// RIR por defecto al elegir el objetivo (punto de partida editable): fuerza 4
// (centro de 3-5), hipertrofia 2 (zona cercana al fallo sin llegar), potencia 3
// (el mínimo del criterio conservador de la app).
export const RIR_DEFECTO = { fuerza: 4, hipertrofia: 2, potencia: 3 };

// Sugerencia de RIR y %1RM para N repeticiones. El % sale de la misma tabla
// RTF (reps + RIR); null si cae fuera de la tabla fiable o si el objetivo
// no se rige por RIR->% (potencia: la carga depende del tipo de movimiento).
// Potencia: %1RM por defecto dentro de la zona del tipo de movimiento
// (pliométrico: techo 30 %; no pliométrico: centro de 30-70 %). Punto de partida editable.
export const PCT_POTENCIA_DEFECTO = { pliometrico: 30, nopliometrico: 50 };

export function sugerirCarga(objetivo, reps, tipo) {
  const n = Math.round(Number(reps));
  if (!objetivo || !Number.isFinite(n) || n < 1) return null;
  const rir = RIR_DEFECTO[objetivo.id];
  if (rir == null) return null;
  const rtf = n + rir;
  const pct1rm = objetivo.zonas
    ? PCT_POTENCIA_DEFECTO[tipo === "pliometrico" ? "pliometrico" : "nopliometrico"]
    : rtf > RTF_TABLA_MAX ? null : Math.round(pct1RMporRTF(rtf) * 100);
  return { rir, pct1rm };
}

// Rellena RIR y %1RM de una tarea solo si están vacíos o los puso antes esta
// misma función (cargaAuto). Lo que escribe el entrenador nunca se pisa.
export function aplicarSugerencia(objetivo, t, forzar = false) {
  if (!objetivo || (t.modo || "reps") !== "reps") return t;
  const vacio = (v) => v === "" || v == null;
  if (!forzar && !(t.cargaAuto || (vacio(t.rir) && vacio(t.pct1rm)))) return t;
  const s = sugerirCarga(objetivo, t.cantidad, t.tipoMov);
  if (!s) return t;
  return { ...t, rir: String(s.rir), pct1rm: s.pct1rm == null ? "" : String(s.pct1rm), cargaAuto: true };
}

// Solo coincidencia exacta con la etiqueta: un objetivo escrito a mano ("fuerza
// tren inferior") no activa la guía, para no dar un veredicto por adivinación.
export function objetivoDeTexto(texto) {
  const t = String(texto || "").trim().toLowerCase();
  return OBJETIVOS_SESION.find((o) => o.etiqueta.toLowerCase() === t) || null;
}

// Inverso de la tabla: %1RM (0-100) -> repeticiones máximas (RTF). null si
// queda fuera de la tabla fiable (< 75 % o > 100 %).
export function rtfDePct(pct) {
  const p = Number(pct) / 100;
  if (!Number.isFinite(p) || p > 1 + 1e-9 || p < TABLA_PCT_1RM_POR_RTF[RTF_TABLA_MAX] - 1e-9) return null;
  for (let r = 1; r < RTF_TABLA_MAX; r++) {
    const a = TABLA_PCT_1RM_POR_RTF[r];
    const b = TABLA_PCT_1RM_POR_RTF[r + 1];
    if (p <= a + 1e-9 && p >= b - 1e-9) return r + (a - p) / (a - b);
  }
  return null;
}

// Para N repeticiones: rango de %1RM que deja el RIR del objetivo.
// Devuelve null si ni siquiera el RIR mínimo cabe en la tabla (RTF > 10).
export function guiaPorReps(objetivo, reps) {
  const n = Math.round(Number(reps));
  if (!objetivo || !Number.isFinite(n) || n < 1) return null;
  const rtfMin = n + objetivo.rir.min;
  if (rtfMin > RTF_TABLA_MAX) return null;
  const pctMax = Math.round(pct1RMporRTF(rtfMin) * 100);
  if (objetivo.rir.max == null) return { reps: n, pctMin: null, pctMax, parcial: false, soloTecho: true };
  const rtfMax = n + objetivo.rir.max;
  const parcial = rtfMax > RTF_TABLA_MAX;
  const pctMin = Math.round(pct1RMporRTF(Math.min(rtfMax, RTF_TABLA_MAX)) * 100);
  return { reps: n, pctMin, pctMax, parcial, soloTecho: false };
}

const fmtRango = (g) => (g.soloTecho ? `hasta ${g.pctMax} %` : g.pctMin === g.pctMax ? `${g.pctMax} %` : `${g.pctMin}–${g.pctMax} %`);

// Evalúa una tarea de fuerza (reps + carga por RIR o por %1RM) contra el objetivo.
// estado: "dentro" | "bajo" (RIR por debajo del rango: demasiado cerca del fallo)
//         | "alto" (RIR por encima: demasiado lejos) | null (sin datos suficientes).
export function evaluarTarea(objetivo, { reps, rir, pct1rm, modoCarga }) {
  if (!objetivo) return null;
  const n = Number(reps);
  if (!Number.isFinite(n) || n < 1) return null;
  const g = guiaPorReps(objetivo, n);
  const rango = textoRir(objetivo);
  const sug = g && !g.soloTecho ? ` Para ${g.reps} rep${g.reps === 1 ? "" : "s"} con ${rango}: ${fmtRango(g)}${g.parcial ? " o menos" : ""} del 1RM.` : "";
  let rirImp = null;
  let origen = "";
  let lejosDeTabla = false;
  if (modoCarga === "pct1rm") {
    const p = Number(pct1rm);
    if (!Number.isFinite(p) || p <= 0) return null;
    const rtf = rtfDePct(p);
    if (rtf == null) {
      if (p < 75 && objetivo.rir.max != null && RTF_TABLA_MAX - n >= objetivo.rir.max) lejosDeTabla = true;
      else return null;
    } else {
      rirImp = rtf - n;
      origen = `Al ${Math.round(p)} % el máximo ronda ${Math.round(rtf)} reps: con ${n} quedas en RIR ${Math.max(0, Math.round(rirImp))}.`;
    }
  } else {
    if (rir === "" || rir == null) return null;
    rirImp = Number(rir);
    if (!Number.isFinite(rirImp)) return null;
  }
  if (lejosDeTabla) {
    return { estado: "alto", rirImplicito: null, mensaje: `Al ${Math.round(Number(pct1rm))} % harías bastantes más reps de las pautadas (RIR por encima de ${objetivo.rir.max}): demasiado lejos del fallo para ${objetivo.etiqueta.toLowerCase()}.${sug}` };
  }
  const tol = 0.5;
  let estado = "dentro";
  if (rirImp < objetivo.rir.min - tol) estado = "bajo";
  else if (objetivo.rir.max != null && rirImp > objetivo.rir.max + tol) estado = "alto";
  const rirTxt = Math.max(0, Math.round(rirImp));
  let mensaje;
  if (estado === "dentro") mensaje = `Dentro del rango para ${objetivo.etiqueta.toLowerCase()} (${rango}).`;
  else if (estado === "bajo") mensaje = `${origen ? origen + " " : `RIR ${rirTxt}: `}Por debajo del rango para ${objetivo.etiqueta.toLowerCase()} (${rango}).${sug}`;
  else mensaje = `${origen ? origen + " " : `RIR ${rirTxt}: `}Por encima del rango para ${objetivo.etiqueta.toLowerCase()} (${rango}).${sug}`;
  return { estado, rirImplicito: rirImp, mensaje };
}

// Tira de referencia para el diseñador: reps -> rango de %1RM.
export function tiraReferencia(objetivo, maxReps = 6) {
  if (!objetivo) return [];
  const out = [];
  for (let r = 1; r <= maxReps; r++) {
    const g = guiaPorReps(objetivo, r);
    if (g) out.push({ reps: r, texto: g.soloTecho || g.parcial ? `≤${g.pctMax} %` : g.pctMin === g.pctMax ? `${g.pctMax} %` : `${g.pctMin}–${g.pctMax} %` });
  }
  return out;
}

// Zona de %1RM que el desplegable marca en ámbar. Fuerza/Hipertrofia: el rango
// que deja el RIR del objetivo para esas repeticiones. Potencia: la zona del
// tipo de movimiento (pliométrico <=30 %, no pliométrico 30-70 %).
export function zonaPct(objetivo, { reps, tipoMov } = {}) {
  if (!objetivo) return null;
  if (objetivo.zonas) return tipoMov === "pliometrico" ? { min: 0, max: 30 } : { min: 30, max: 70 };
  const g = guiaPorReps(objetivo, reps);
  if (!g || g.soloTecho) return null;
  return { min: g.pctMin, max: g.pctMax };
}

// Zona de RIR (min..max, max null = sin techo) del objetivo.
export function zonaRir(objetivo) {
  return objetivo ? { min: objetivo.rir.min, max: objetivo.rir.max } : null;
}

// Qué implica subir o bajar cada valor, con su fuente. Solo afirmaciones
// respaldadas por los estudios citados (tendencias, no garantías).
export function implicaciones(campo, objetivo) {
  const id = objetivo?.id;
  if (campo === "reps") {
    return {
      lineas: [
        { etq: "Más reps", txt: "con la misma carga: te acercas al fallo (baja el RIR) y sube la fatiga." },
        { etq: "Menos reps", txt: "más margen; admite más carga con el mismo RIR." },
      ],
      fuente: "Tabla de repeticiones máximas de la app",
    };
  }
  if (campo === "rir") {
    if (id === "fuerza") return { lineas: [{ etq: "Más RIR", txt: "(más lejos del fallo): menos fatiga; entre RIR 3 y 5 la fuerza se gana igual." }, { etq: "Menos RIR", txt: "(más cerca): más fatiga y sin ganancia clara de fuerza; sí tiende a más hipertrofia." }], fuente: "Robinson et al., 2024" };
    if (id === "hipertrofia") return { lineas: [{ etq: "Menos RIR", txt: "(más cerca del fallo, 0–5): tiende a más hipertrofia, con más fatiga." }, { etq: "Más RIR", txt: "(más lejos): menos fatiga, pero la hipertrofia tiende a ser menor." }], fuente: "Robinson et al., 2024" };
    if (id === "potencia") return { lineas: [{ etq: "Más RIR", txt: "(lejos del fallo): la pérdida de velocidad crece con las repeticiones hechas, así que parar antes la mantiene." }, { etq: "Menos RIR", txt: "(cerca del fallo): baja la velocidad; parar con poca pérdida de velocidad mejoró más el salto." }], fuente: "Rodríguez-Rosell et al., 2020; Pareja-Blanco et al., 2017" };
    return null;
  }
  if (campo === "pct") {
    if (id === "fuerza") return { lineas: [{ etq: "Cargas altas y moderadas", txt: "dan más fuerza que las ligeras; entre ellas la diferencia no fue significativa." }, { etq: "Cargas ligeras", txt: "dan menos ganancia de fuerza." }], fuente: "López et al., 2021 (series al fallo; alta = hasta 8 repeticiones máximas)" };
    if (id === "hipertrofia") return { lineas: [{ etq: "Cualquier carga", txt: "(ligera, moderada o alta) da una hipertrofia similar si las series se llevan al fallo." }], fuente: "López et al., 2021" };
    if (id === "potencia") return { lineas: [{ etq: "Dentro de la zona", txt: "es la carga de máxima potencia del movimiento." }, { etq: "Por encima o por debajo", txt: "la potencia máxima baja." }], fuente: "Soriano et al., 2015 y 2017" };
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Aviso de carga: compara el RIR y el %1RM elegidos con la zona del objetivo y
// entre sí. Nunca bloquea; devuelve el motivo y la carga sugerida.
//   estado: "dentro" | "fuera" (fuera de la zona del objetivo)
//           | "inconsistente" (el RIR y el % se contradicen según la tabla)
//   campo:  "rir" | "pct" | "ambos" (qué celda se señala)
// ---------------------------------------------------------------------------
export function textoSugerido(s) {
  return s ? `RIR ${s.rir}${s.pct1rm != null ? ` · ${s.pct1rm} %` : ""}` : "";
}

export function evaluarCarga(objetivo, { reps, rir, pct1rm, tipoMov } = {}) {
  if (!objetivo) return null;
  const n = Math.round(Number(reps));
  if (!Number.isFinite(n) || n < 1) return null;
  const tieneRir = rir !== "" && rir != null && Number.isFinite(Number(rir));
  const p = Number(pct1rm);
  const tienePct = pct1rm !== "" && pct1rm != null && Number.isFinite(p) && p > 0;
  if (!tieneRir && !tienePct) return null;
  const r = tieneRir ? Number(rir) : null;
  const rtf = tienePct ? rtfDePct(p) : null;
  const rirDePct = rtf != null ? rtf - n : null;
  const sug = sugerirCarga(objetivo, n, tipoMov);
  const sugerido = sug ? { rir: sug.rir, pct1rm: sug.pct1rm } : null;
  const fraseSug = sug ? ` Sugerido para ${n} rep${n === 1 ? "" : "s"}: ${textoSugerido(sug)}.` : "";
  const fuente = objetivo.fuente || "Robinson et al., 2024";
  const res = (estado, campo, corto, mensaje, fuenteAviso) => ({ estado, campo, corto, mensaje, sugerido, fuente: fuenteAviso || fuente });

  // 1) RIR y % que se contradicen (la tabla solo es fiable hasta RTF 10).
  if (tieneRir && rirDePct != null && Math.abs(rirDePct - r) > 1) {
    const cola = rirDePct < 0
      ? `el ${Math.round(p)} % del 1RM solo permite unas ${Math.round(rtf)} reps como máximo y pautas ${n}.`
      : `con ${n} reps el ${Math.round(p)} % del 1RM te deja en RIR ${Math.round(rirDePct)}, no en RIR ${r}.`;
    return res("inconsistente", "ambos", "RIR y % no coinciden", `RIR ${r} y ${Math.round(p)} % no coinciden: ${cola}${fraseSug}`, "Tabla de repeticiones máximas de la app");
  }

  // 2) Zona de RIR (el declarado o el que implica el %).
  const rirEf = tieneRir ? r : rirDePct;
  if (rirEf != null && Number.isFinite(rirEf)) {
    const rango = textoRir(objetivo);
    const campo = tieneRir ? "rir" : "pct";
    const quien = tieneRir ? `RIR ${r}` : `${Math.round(p)} %`;
    const como = tieneRir ? "" : `Al ${Math.round(p)} % quedas en RIR ${Math.max(0, Math.round(rirEf))}. `;
    if (rirEf < objetivo.rir.min - 0.5) return res("fuera", campo, `${quien}: demasiado cerca del fallo`, `${como}${tieneRir ? `RIR ${r}` : "Eso"} queda por debajo de la zona de ${objetivo.etiqueta.toLowerCase()} (${rango}): demasiado cerca del fallo.${fraseSug}`);
    if (objetivo.rir.max != null && rirEf > objetivo.rir.max + 0.5) return res("fuera", campo, `${quien}: demasiado lejos del fallo`, `${como}${tieneRir ? `RIR ${r}` : "Eso"} queda por encima de la zona de ${objetivo.etiqueta.toLowerCase()} (${rango}): demasiado lejos del fallo.${fraseSug}`);
  }

  // 3) Zona de %1RM para esas repeticiones (o para el tipo de movimiento en potencia).
  const zp = tienePct ? zonaPct(objetivo, { reps: n, tipoMov }) : null;
  if (zp) {
    const txt = zp.min === 0 ? `hasta ${zp.max} %` : `${zp.min}–${zp.max} %`;
    const donde = objetivo.zonas ? (tipoMov === "pliometrico" ? "para movimientos pliométricos" : "para movimientos no pliométricos") : `para ${n} rep${n === 1 ? "" : "s"}`;
    if (p > zp.max + 1) return res("fuera", "pct", `${Math.round(p)} %: por encima de la zona`, `${Math.round(p)} % queda por encima de la zona de ${objetivo.etiqueta.toLowerCase()} ${donde} (${txt}).${fraseSug}`, objetivo.fuenteZonas);
    if (p < zp.min - 1) return res("fuera", "pct", `${Math.round(p)} %: por debajo de la zona`, `${Math.round(p)} % queda por debajo de la zona de ${objetivo.etiqueta.toLowerCase()} ${donde} (${txt}).${fraseSug}`, objetivo.fuenteZonas);
  }
  return { estado: "dentro", campo: null, corto: "", mensaje: "", sugerido, fuente };
}

// Marca de carga: si coincide con tarea.avisoOk, el aviso se silencia ("dejarlo así").
export function firmaCarga(t) {
  return [t.cantidad, t.rir, t.pct1rm, t.tipoMov || ""].join("|");
}

// Aviso vigente de una tarea (null si no hay objetivo, no son repeticiones, está dentro o se silenció).
export function avisoDeTarea(objetivo, t) {
  if (!objetivo || !t || (t.modo || "reps") !== "reps") return null;
  if (t.avisoOk && t.avisoOk === firmaCarga(t)) return null;
  const e = evaluarCarga(objetivo, { reps: t.cantidad, rir: t.rir, pct1rm: t.pct1rm, tipoMov: t.tipoMov });
  return e && e.estado !== "dentro" ? e : null;
}
