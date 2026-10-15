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
