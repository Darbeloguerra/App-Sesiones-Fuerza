// Lógica pura de la Biblioteca de sesiones (plantillas): clasificación por
// tipo, favoritas, filtros, orden y asignación directa a días y
// destinatarios. Sin React ni Supabase: se prueba con node --test.
//
// Una plantilla es una sesión con nombre (ver agruparPlantillas en hooks.js).
// La clasificación (tipo, favorita) se guarda aparte, en un mapa
// { "<nombre en minúsculas>": { tipo, fav } }. El MD sale de la propia sesión (campo md)., para que sobreviva a las
// copias que se crean al asignar la plantilla a una fecha.
import { sumarDiasFecha } from "./fechas.js";

export const TIPOS_PLANTILLA = ["Fuerza", "Específicas", "Core", "Resistencia", "Movilidad", "Preventivo"];
// MD que se puede filtrar (los de la sesión; "Sin MD" = sesión sin MD).
export const MD_FILTRO = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2"];
export const SIN_TIPO = "Sin clasificar";

export const claveNombre = (n) => (n || "").trim().toLowerCase();

// El valor guardado puede llegar como texto JSON, como objeto o vacío.
export function parseMeta(valor) {
  let v = valor;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out = {};
  Object.entries(v).forEach(([k, m]) => {
    if (!m || typeof m !== "object") return;
    const tipo = TIPOS_PLANTILLA.includes(m.tipo) ? m.tipo : null;
    const fav = m.fav === true;
    if (tipo || fav) out[k] = { tipo, fav };
  });
  return out;
}

export const serializarMeta = (mapa) => JSON.stringify(mapa || {});

export function metaDe(mapa, nombre) {
  const m = (mapa || {})[claveNombre(nombre)];
  return { tipo: m?.tipo || null, fav: !!m?.fav };
}

// Devuelve un mapa nuevo con los cambios aplicados; si la plantilla se queda
// sin ningún dato, desaparece del mapa.
export function actualizarMeta(mapa, nombre, cambios) {
  const k = claveNombre(nombre);
  if (!k) return { ...(mapa || {}) };
  const nuevo = { ...(mapa || {}) };
  const m = { ...metaDe(mapa, nombre), ...cambios };
  if (!m.tipo && !m.fav) delete nuevo[k];
  else nuevo[k] = m;
  return nuevo;
}

// Renombrar una plantilla no debe perder su clasificación.
export function renombrarMeta(mapa, nombreAntiguo, nombreNuevo) {
  const a = claveNombre(nombreAntiguo);
  const b = claveNombre(nombreNuevo);
  if (!a || !b || a === b || !(mapa || {})[a]) return { ...(mapa || {}) };
  const nuevo = { ...mapa };
  if (!nuevo[b]) nuevo[b] = nuevo[a];
  delete nuevo[a];
  return nuevo;
}

// Tipo más repetido entre los bloques de las tareas, si coincide con uno de
// los tipos conocidos. Sirve para clasificar solas las plantillas antiguas.
export function tipoDominante(tareas) {
  const cuenta = {};
  (tareas || []).forEach((t) => {
    const b = t && t.bloque_sesion;
    if (TIPOS_PLANTILLA.includes(b)) cuenta[b] = (cuenta[b] || 0) + 1;
  });
  let mejor = null;
  TIPOS_PLANTILLA.forEach((t) => {
    if (cuenta[t] && (!mejor || cuenta[t] > cuenta[mejor])) mejor = t;
  });
  return mejor;
}

// Ficha de clasificación de una plantilla (grupo de agruparPlantillas).
// tipoAuto = true cuando el tipo no lo puso el entrenador sino que se deduce.
export function describirPlantilla(grupo, mapa) {
  const m = metaDe(mapa, grupo.nombre);
  const auto = !m.tipo ? tipoDominante(grupo.rep?.tareas) : null;
  return { tipo: m.tipo || auto || SIN_TIPO, tipoAuto: !m.tipo && !!auto, fav: m.fav };
}

// MD de la plantilla: el de la propia sesión ("" si no tiene).
export const mdDe = (grupo) => (grupo?.rep?.md || "").trim();

export function filtrarPlantillas(grupos, filtros, mapa) {
  const q = (filtros.q || "").trim().toLowerCase();
  return grupos.filter((g) => {
    const d = describirPlantilla(g, mapa);
    if (filtros.tipo && filtros.tipo !== "Todas" && d.tipo !== filtros.tipo) return false;
    if (filtros.md && filtros.md !== "Todos") {
      const md = mdDe(g);
      if (filtros.md === "Sin MD" ? !!md && md !== "Sin MD" : md !== filtros.md) return false;
    }
    if (filtros.fav && !d.fav) return false;
    if (q && !(g.nombre || "").toLowerCase().includes(q)) return false;
    return true;
  });
}

const porNombre = (a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es");

// orden: "az" | "reciente". Con "reciente" van primero las usadas hace menos
// tiempo, después las planificadas sin usar y al final las nunca usadas.
export function ordenarPlantillas(grupos, orden) {
  const l = grupos.slice();
  if (orden === "reciente") {
    l.sort((a, b) => {
      const ua = a.ultima || "";
      const ub = b.ultima || "";
      if (ua !== ub) return ua < ub ? 1 : -1;
      return porNombre(a, b);
    });
  } else l.sort(porNombre);
  return l;
}

// [{ tipo, items }] en el orden de TIPOS_PLANTILLA y "Sin clasificar" al final.
export function agruparPorTipo(grupos, mapa) {
  const orden = [...TIPOS_PLANTILLA, SIN_TIPO];
  const por = new Map(orden.map((t) => [t, []]));
  grupos.forEach((g) => por.get(describirPlantilla(g, mapa).tipo).push(g));
  return orden.map((tipo) => ({ tipo, items: por.get(tipo).sort(porNombre) })).filter((x) => x.items.length);
}

export function contarPorTipo(grupos, mapa) {
  const c = {};
  grupos.forEach((g) => {
    const t = describirPlantilla(g, mapa).tipo;
    c[t] = (c[t] || 0) + 1;
  });
  return c;
}

// ----- Asignación directa -----

// Los próximos n días desde hoy: [{ fecha, dow }] con dow 0=domingo.
export function diasDisponibles(hoy, n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const fecha = sumarDiasFecha(hoy, i);
    return { fecha, dow: new Date(fecha + "T00:00:00").getDay() };
  });
}

// Ids de jugadores activos a partir de equipos y jugadores sueltos, sin repetir.
export function resolverDestinatarios(grupoIds, jugadorIds, activos) {
  const ids = [];
  const visto = new Set();
  const anade = (id) => {
    if (!visto.has(id)) {
      visto.add(id);
      ids.push(id);
    }
  };
  const activosSet = new Set(activos.map((p) => p.id));
  const gs = new Set(grupoIds || []);
  activos.forEach((p) => {
    if ((p.gruposIds || []).some((g) => gs.has(g))) anade(p.id);
  });
  (jugadorIds || []).forEach((id) => {
    if (activosSet.has(id)) anade(id);
  });
  return ids;
}

// Elementos de la cola de publicación: una sesión por fecha, con todos los
// destinatarios dentro. Nunca se crea una por jugador.
export function itemsAsignacion(sesion, fechas, destinos, hoy) {
  if (!sesion || !destinos || !destinos.length) return [];
  return [...new Set(fechas || [])]
    .filter((f) => !hoy || f >= hoy)
    .sort()
    .map((fecha) => ({ fecha, sesion, destinos: destinos.slice() }));
}

export function resumenAsignacion(fechas, destinos) {
  return { sesiones: new Set(fechas || []).size, jugadores: (destinos || []).length };
}

// Fechas rápidas: días laborables restantes de la semana en curso y
// lunes/miércoles/viernes de la semana siguiente (a partir de hoy).
export function atajoFechas(tipo, hoy, dias) {
  const futuros = dias.filter((d) => d.fecha >= hoy);
  if (tipo === "resto-semana") {
    const dowHoy = new Date(hoy + "T00:00:00").getDay();
    const diasHastaDomingo = dowHoy === 0 ? 0 : 7 - dowHoy;
    const fin = sumarDiasFecha(hoy, diasHastaDomingo);
    return futuros.filter((d) => d.fecha <= fin && d.dow >= 1 && d.dow <= 5).map((d) => d.fecha);
  }
  if (tipo === "lmv-proxima") {
    const dowHoy = new Date(hoy + "T00:00:00").getDay();
    const hastaLunes = dowHoy === 0 ? 1 : 8 - dowHoy;
    const lunes = sumarDiasFecha(hoy, hastaLunes);
    const fin = sumarDiasFecha(lunes, 6);
    return futuros.filter((d) => d.fecha >= lunes && d.fecha <= fin && (d.dow === 1 || d.dow === 3 || d.dow === 5)).map((d) => d.fecha);
  }
  return [];
}

// ----- Copias: modificar una sesión crea una nueva y la original no cambia -----

// Nombre de la copia: el que haya puesto el entrenador, o "(copia)" / "(copia N)"
// si ya existe una plantilla con ese nombre.
export function nombreCopia(nombreEditado, nombreOriginal, existentes) {
  const usados = new Set((existentes || []).map(claveNombre));
  const base = (nombreEditado || "").trim() || (nombreOriginal || "").trim() || "Sesión";
  if (!usados.has(claveNombre(base))) return base;
  let n = 1;
  let cand = `${base} (copia)`;
  while (usados.has(claveNombre(cand))) {
    n += 1;
    cand = `${base} (copia ${n})`;
  }
  return cand;
}

// Tarea del diseñador (borrador) -> registro de "tareas" tal como lo lee el
// diseñador al reutilizar una sesión. Mismos campos que el guardado de tarea
// suelta del diseñador (null en vez de "" en modo_carga y pct1rm).
export function tareaDraftADb(t, bloque) {
  return {
    id: String(t.key),
    bloque_sesion: bloque,
    ejercicio_id: t.ejercicioId,
    modo: t.modo || "reps",
    series: t.series ?? "",
    cantidad: t.cantidad ?? "",
    rir: t.rir ?? "",
    modo_carga: t.modoCarga === "pct1rm" ? "pct1rm" : "rir",
    pct1rm: t.pct1rm === "" || t.pct1rm == null ? null : t.pct1rm,
    tipo_resistencia: bloque === "Fuerza" ? t.tipoResistencia || "" : "",
    material: JSON.stringify(t.materiales || []),
    lateralidad: t.lateralidad || "bilateral",
    nota: t.nota || "",
    descanso_seg: t.descanso ?? "",
    alterna_con: t.alternaCon || "",
    circuito_id: "",
    orden_en_circuito: "",
  };
}

// Tareas de la copia: las de Fuerza y Core sueltas salen del editor; el resto
// (movilidad, preventivo, resistencia, circuitos…) se conserva tal cual.
export function tareasDeCopia(originales, fuerza, core) {
  const editable = (t) => (t.bloque_sesion === "Fuerza" || t.bloque_sesion === "Core") && !t.circuito_id;
  return [...(originales || []).filter((t) => !editable(t)), ...(fuerza || []).map((t) => tareaDraftADb(t, "Fuerza")), ...(core || []).map((t) => tareaDraftADb(t, "Core"))];
}
