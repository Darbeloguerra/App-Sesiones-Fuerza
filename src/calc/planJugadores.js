// Lógica pura de la vista «Jugadores» del Calendario (planificación por
// jugador y día). Sin React ni Supabase: se prueba con node --test.
//
// Idea: lo que el entrenador asigna en la tabla queda como CAMBIOS PENDIENTES
// ({ "<jugadorId>::<fecha>": sesionId }). Al publicar, se agrupan por
// (sesión, fecha) para crear UNA sesión con varios destinatarios, no una por
// jugador. El guardado real lo hace el diseñador (cola de publicación).

export const claveCelda = (jugadorId, fecha) => `${jugadorId}::${fecha}`;

// Agrupa los pendientes en elementos de cola:
// [{ fecha, sesionId, jugadores: [ids] }] ordenados por fecha y sesión.
export function agruparPendientes(pend) {
  const grupos = new Map();
  Object.entries(pend || {}).forEach(([clave, sesionId]) => {
    if (!sesionId) return;
    const i = clave.indexOf("::");
    if (i < 0) return;
    const jugadorId = clave.slice(0, i);
    const fecha = clave.slice(i + 2);
    const k = `${fecha}|${sesionId}`;
    if (!grupos.has(k)) grupos.set(k, { fecha, sesionId, jugadores: [] });
    const g = grupos.get(k);
    if (!g.jugadores.includes(jugadorId)) g.jugadores.push(jugadorId);
  });
  return [...grupos.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.sesionId < b.sesionId ? -1 : a.sesionId > b.sesionId ? 1 : 0));
}

// Asigna una sesión a varias celdas. Solo toca las celdas permitidas
// (`puede(jugadorId, fecha)`); devuelve un objeto nuevo.
export function asignarCeldas(pend, jugadores, fechas, sesionId, puede = () => true) {
  const nuevo = { ...(pend || {}) };
  jugadores.forEach((j) => fechas.forEach((f) => {
    if (!puede(j, f)) return;
    if (sesionId) nuevo[claveCelda(j, f)] = sesionId;
    else delete nuevo[claveCelda(j, f)];
  }));
  return nuevo;
}

// Filas visibles: la selección manual solo vale mientras no cambie el ámbito.
// manual = { scopeId, ids } | null; porAmbito = ids del ámbito actual.
export function filasEfectivas(manual, scopeId, porAmbito) {
  if (manual && manual.scopeId === scopeId) return manual.ids;
  return porAmbito;
}

export function anadirFilas(actuales, nuevos) {
  const set = new Set(actuales);
  const out = actuales.slice();
  nuevos.forEach((id) => { if (!set.has(id)) { set.add(id); out.push(id); } });
  return out;
}

// Texto del aviso de la barra de publicación.
export function resumenPublicacion(pend) {
  const celdas = Object.keys(pend || {}).filter((k) => pend[k]).length;
  const sesiones = agruparPendientes(pend).length;
  return { celdas, sesiones };
}

// % de cumplimiento a partir de los estados de las sesiones ya pasadas.
// estados: "hecho" | "parcial" | "falta" | "hoy" | "futuro" | "borrador"
export function cumplimientoDeEstados(estados) {
  const pasadas = estados.filter((e) => e === "hecho" || e === "parcial" || e === "falta");
  if (!pasadas.length) return null;
  const hechas = pasadas.filter((e) => e === "hecho").length;
  return Math.round((hechas / pasadas.length) * 100);
}
