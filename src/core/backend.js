import { createClient } from "@supabase/supabase-js";
import { tareaEsParaJugador } from "../calc/adherencia.js";

// ====== Backend remoto (Supabase) ======
// Sustituye a Google Sheets/Apps Script. Las tablas viven ahora en Postgres
// (ver schema_supabase.sql + fix_columnas_faltantes.sql + fix_ejercicios.sql,
// que añaden columnas que faltaban del esquema original: sesiones.objetivo,
// sesiones.tipo, sesiones.nombre, tareas.fecha, ejercicios.sin_lateralidad).
// La clave "publishable" es pública a propósito — va dentro del código de la
// app, igual que antes el token compartido de Apps Script — el candado real
// de acceso son las políticas RLS creadas en Supabase (politicas_acceso.sql).
export const SUPABASE_URL = "https://ozarscohvitkopamnbtt.supabase.co";
export const SUPABASE_KEY = "sb_publishable_iUxpTZzSNfACaGacbUawFA_uZi3qpN-";
// Pase de acceso (se obtiene al entrar con el código, ver PortalAccesoSeguro y
// paso2_seguridad.sql). Va en la cabecera x-client-info —que el navegador ya
// tiene permitida para Supabase— y las políticas RLS lo leen para saber quién
// es (entrenador / jugador). Solo vive en memoria: al cerrar la pestaña hay que
// volver a entrar, igual que antes.
export const accesoSesion = { token: null, rol: null, jugadorId: null };
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (accesoSesion.token) headers.set("x-client-info", `${headers.get("x-client-info") || "app"} acceso/${accesoSesion.token}`);
      return fetch(url, { ...options, headers });
    },
  },
});

export const ENTITY_TABLE = {
  jugadores: "jugadores",
  ejercicios: "ejercicios",
  categoriasPreventivas: "categorias_preventivas",
  sesiones: "sesiones",
  tareas: "tareas",
  circuitos: "circuitos",
  registros: "registros",
  grupos: "grupos",
  // Notas del entrenador sobre un jugador (pestaña "Notas" de la ficha,
  // Fase 6 → Equipos y usuarios) — tabla nueva, mínima, mismo patrón que el
  // resto (ver sql/add_notas_jugador.sql). Se apoya en la infraestructura
  // genérica de api.list/save/delete, sin nada especial.
  notasJugador: "notas_jugador",
  // Peticiones del jugador de sesión para un día concreto (Calendario →
  // "pídesela tú"), ver sql/add_solicitudes_sesion.sql. Mismo patrón
  // genérico que notasJugador: tabla mínima, sin lógica especial aquí.
  solicitudesSesion: "solicitudes_sesion",
  // Marcas de referencia de fuerza que introduce el entrenador (tops de serie
  // históricos o tests), ver sql/add_referencias_fuerza.sql.
  referenciasFuerza: "referencias_fuerza",
};

export const ID_PREFIX = { jugadores: "jug", ejercicios: "ejc", categoriasPreventivas: "cat", sesiones: "ses", tareas: "tar", circuitos: "cir", registros: "reg", grupos: "grp", notasJugador: "nota", solicitudesSesion: "sol", referenciasFuerza: "ref" };
export function idRegistroFijo(jugadorId, tareaId, fecha) {
  return `reg_${jugadorId}_${tareaId}_${fecha}`;
}
export function genId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// Con Google Sheets, la columna "material" y "resistencia_data" de Tareas
// NUNCA se interpretaban en el propio backend — el resto de la app las
// trata como texto y las interpreta ella misma (parseMateriales /
// parseResistenciaData). En Postgres esos dos campos son un array/jsonb de
// verdad, así que aquí se hace la conversión de ida y vuelta.
export function transformFromDb(entity, row) {
  if (!row || entity !== "tareas") return row;
  return {
    ...row,
    material: JSON.stringify(row.material || []),
    resistencia_data: row.resistencia_data ? JSON.stringify(row.resistencia_data) : "",
  };
}

// Con Sheets, un número o una referencia "vacíos" y "sin escribir" eran la
// misma cosa: una celda en blanco. En Postgres, una columna numérica o una
// referencia a otra tabla exigen un valor real o NULL — un texto vacío ""
// las rompe. Esto lo traduce automáticamente para cada columna así de cada
// tabla, en vez de tener que acordarse de arreglarlo cada vez que aparece
// una nueva (fue precisamente lo que falló varias veces seguidas).
export const NUMERIC_DEFAULTS = {
  ejercicios: { orden_rotacion: null },
  sesiones: { preventivo_activo: 0 },
  circuitos: { rondas: null },
  tareas: { series: null, cantidad: null, rir: null, pct1rm: null, orden_en_circuito: null, descanso_seg: null },
  registros: { reps_hechas: null, carga_kg: null, rir: null, series_hechas: null, ultima_reps: null, ultima_carga_kg: null, ultima_rir: null },
  referenciasFuerza: { carga_kg: null, reps: null, rir: null },
};
export function sanitizeNumericos(entity, out) {
  const cols = NUMERIC_DEFAULTS[entity];
  if (!cols) return;
  Object.keys(cols).forEach((col) => {
    if (!(col in out)) return;
    const val = out[col];
    if (val === "" || val === undefined || val === null) {
      out[col] = cols[col];
    } else if (typeof val !== "number") {
      const n = Number(val);
      out[col] = Number.isFinite(n) ? n : cols[col];
    }
  });
}

// Cuando eliges "Todo el equipo" al diseñar una sesión, la app guarda
// internamente `null` como forma de decir "sin restricción" (en vez de una
// lista vacía). Con Google Sheets esto nunca daba problema porque Code.gs
// convertía automáticamente CUALQUIER campo de lista que llegara como
// null/vacío en una lista vacía real antes de escribirlo (`value || []`,
// igual para fechas, categorías, destinatarios...). Aquí se hace lo mismo,
// en genérico, para no tener que acordarse columna por columna.
export const ARRAY_COLUMNS = {
  jugadores: ["categorias_preventivas", "grupos_ids"],
  ejercicios: ["tags_descriptivos"],
  sesiones: ["fechas", "jugadores_destino"],
  tareas: ["material"],
};
export function sanitizeArrays(entity, out) {
  const cols = ARRAY_COLUMNS[entity];
  if (!cols) return;
  cols.forEach((col) => {
    if (!(col in out)) return;
    if (out[col] === null || out[col] === undefined) out[col] = [];
  });
}

export function transformToDb(entity, record) {
  const out = { ...record };
  if (entity === "tareas") {
    if (typeof out.material === "string") {
      try {
        out.material = JSON.parse(out.material || "[]");
      } catch {
        out.material = [];
      }
    }
    if (!out.material) out.material = [];
    if (typeof out.resistencia_data === "string") {
      out.resistencia_data = out.resistencia_data ? JSON.parse(out.resistencia_data) : null;
    }
    if (out.resistencia_data === "") out.resistencia_data = null;
    // "modo" tiene una lista cerrada de valores válidos en la base de datos
    // (reps/tiempo/metros/minutos) — a diferencia de "bloque" en ejercicios,
    // aquí "" NO está en la lista permitida. Las tareas de Movilidad y
    // Preventivo (todavía sin usar) mandan "" para "no aplica"; en NULL sí
    // es válido, así que se traduce aquí.
    if (out.modo === "") out.modo = null;
  }
  if (entity === "ejercicios") {
    // categoria_preventiva_id es una referencia a otra tabla: no admite
    // texto vacío, solo NULL. ejercicio_base_id (variante de) es lo mismo.
    if (out.categoria_preventiva_id === "") out.categoria_preventiva_id = null;
    if (out.ejercicio_base_id === "") out.ejercicio_base_id = null;
  }
  if (entity === "sesiones") {
    // lote_origen_id es una referencia a otra sesión (para cuando una
    // sesión viene de duplicar un lote) — mismo caso que categoria_
    // preventiva_id: "" no es una fila válida, solo NULL lo es.
    if (out.lote_origen_id === "") out.lote_origen_id = null;
  }
  sanitizeNumericos(entity, out);
  sanitizeArrays(entity, out);
  return out;
}

export function throwIfError(error) {
  if (error) throw new Error(error.message);
}

export const MAX_IDS_POR_PETICION = 100;

export function applyFilters(query, filters) {
  Object.keys(filters || {}).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "") return;
    const values = String(value).split(",").map((s) => s.trim()).filter(Boolean);
    query = values.length > 1 ? query.in(key, values) : query.eq(key, values[0]);
  });
  return query;
}

let registrosUnicoDisponible; // undefined = sin comprobar aún
export const api = {
  // CRÍTICO: Supabase/PostgREST devuelve como máximo 1000 filas por
  // consulta si no se le pide explícitamente un rango — no da ningún error,
  // simplemente corta ahí. Con tablas pequeñas nunca se nota, pero
  // "registros" ya ha superado las 3000 filas y esa página de 1000 no
  // tiene por qué ser la más reciente (puede devolver las primeras según
  // el id, es decir las más ANTIGUAS) — así es como el entrenador dejó de
  // ver sesiones enviadas hace poco: no faltaba el dato, es que nunca
  // llegaba a pedirse. Aquí se pagina en bucle hasta traer la tabla
  // entera, sea del tamaño que sea, para cualquier entidad.
  list: async (entity, filters) => {
    const PAGE = 1000;
    // Un filtro con muchísimos ids (p. ej. las tareas de miles de registros)
    // acabaría en una URL demasiado larga y la petición fallaría sin avisar.
    // Se trocea en lotes de MAX_IDS_POR_PETICION y se juntan los resultados.
    const clavesLargas = Object.keys(filters || {}).filter((k) => String(filters[k] ?? "").split(",").filter(Boolean).length > MAX_IDS_POR_PETICION);
    if (clavesLargas.length) {
      const clave = clavesLargas[0];
      const ids = [...new Set(String(filters[clave]).split(",").map((x) => x.trim()).filter(Boolean))];
      const lotes = [];
      for (let i = 0; i < ids.length; i += MAX_IDS_POR_PETICION) lotes.push(ids.slice(i, i + MAX_IDS_POR_PETICION));
      const resultados = [];
      for (let i = 0; i < lotes.length; i += 4) {
        const tandas = await Promise.all(lotes.slice(i, i + 4).map((lote) => api.list(entity, { ...filters, [clave]: lote.join(",") })));
        tandas.forEach((t) => resultados.push(...t));
      }
      return resultados;
    }
    let from = 0;
    let all = [];
    while (true) {
      let query = supabase.from(ENTITY_TABLE[entity]).select("*").range(from, from + PAGE - 1);
      query = applyFilters(query, filters);
      const { data, error } = await query;
      throwIfError(error);
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return all.map((row) => transformFromDb(entity, row));
  },
  get: async (entity, id) => {
    const { data, error } = await supabase.from(ENTITY_TABLE[entity]).select("*").eq("id", id).maybeSingle();
    throwIfError(error);
    return transformFromDb(entity, data);
  },
  save: async (entity, record) => {
    const toSave = transformToDb(entity, record);
    if (!toSave.id) toSave.id = genId(ID_PREFIX[entity] || "id");
    // Registros: si en la base ya existe la restricción única (jugador, tarea, día)
    // (paso3_integridad.sql), se actualiza por esa clave natural: nunca puede haber dos
    // filas del mismo jugador, tarea y día. Si aún no existe, se usa el id (que ya es fijo).
    let conflictKey = "id";
    if (entity === "registros" && registrosUnicoDisponible !== false && toSave.jugador_id && toSave.tarea_id && toSave.fecha) conflictKey = "jugador_id,tarea_id,fecha";
    let { data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(toSave, { onConflict: conflictKey }).select().maybeSingle();
    if (error && conflictKey !== "id" && (error.code === "42P10" || /no unique or exclusion constraint/i.test(`${error.message || ""}`))) {
      registrosUnicoDisponible = false;
      conflictKey = "id";
      ({ data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(toSave, { onConflict: "id" }).select().maybeSingle());
    }
    // Red de seguridad: si la columna nueva registros.series_hechas todavía
    // no existe en la base de datos (falta ejecutar sql/add_series_hechas.sql),
    // PostgREST rechaza el guardado entero. En vez de que el jugador pierda
    // su registro, se reintenta sin ese campo.
    if (error && entity === "registros" && "series_hechas" in toSave && /series_hechas/.test(`${error.message || ""} ${error.details || ""}`)) {
      const { series_hechas: _omitido, ...sinSeries } = toSave;
      ({ data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(sinSeries, { onConflict: conflictKey }).select().maybeSingle());
    }
    // Igual para las columnas de la última serie (sql_add_ultima_serie.sql):
    // si aún no existen, se guarda el registro sin ellas en vez de perderlo.
    if (error && entity === "registros" && ("ultima_reps" in toSave || "ultima_carga_kg" in toSave || "ultima_rir" in toSave) && /ultima_(reps|carga_kg|rir)/.test(`${error.message || ""} ${error.details || ""}`)) {
      const { ultima_reps: _a, ultima_carga_kg: _b, ultima_rir: _c, ...sinUltima } = toSave;
      ({ data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(sinUltima, { onConflict: conflictKey }).select().maybeSingle());
    }
    // Preventivo por jugador: tareas.para_jugadores. Si la columna aún no existe
    // y el valor está vacío, se guarda sin ella; si tiene valor NO se puede
    // ignorar (todos los jugadores verían la tarea) y se avisa del SQL.
    if (error && entity === "tareas" && "para_jugadores" in toSave && /para_jugadores/.test(`${error.message || ""} ${error.details || ""}`)) {
      if (toSave.para_jugadores) throw new Error("FALTA_SQL_PARA_JUGADORES");
      const { para_jugadores: _omitido, ...sinPara } = toSave;
      ({ data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(sinPara, { onConflict: "id" }).select().maybeSingle());
    }
    throwIfError(error);
    return transformFromDb(entity, data);
  },
  delete: async (entity, id) => {
    const { error } = await supabase.from(ENTITY_TABLE[entity]).delete().eq("id", id);
    throwIfError(error);
    return { deleted: true };
  },
  materiales: async () => {
    const { data, error } = await supabase.from("materiales").select("nombre").order("nombre");
    throwIfError(error);
    return (data || []).map((r) => r.nombre);
  },
  guardarMaterial: async (nombre) => {
    const { error } = await supabase.from("materiales").upsert({ nombre }, { onConflict: "nombre" });
    throwIfError(error);
    return api.materiales();
  },
  eliminarMaterial: async (nombre) => {
    const { error } = await supabase.from("materiales").delete().eq("nombre", nombre);
    throwIfError(error);
    return api.materiales();
  },
  categoriasPreventivas: async () => {
    const { data, error } = await supabase.from("categorias_preventivas").select("*");
    throwIfError(error);
    return data || [];
  },
  config: async (clave) => {
    const { data, error } = await supabase.from("config").select("valor").eq("clave", clave).maybeSingle();
    throwIfError(error);
    return data ? data.valor : null;
  },
  setConfig: async (clave, valor) => {
    const { error } = await supabase.from("config").upsert({ clave, valor }, { onConflict: "clave" });
    throwIfError(error);
    return { clave, valor };
  },
  rotacion: async (categoriaId) => {
    if (categoriaId) {
      const { data, error } = await supabase.from("rotacion").select("*").eq("categoria_id", categoriaId).maybeSingle();
      throwIfError(error);
      return data || null;
    }
    const { data, error } = await supabase.from("rotacion").select("*");
    throwIfError(error);
    return data || [];
  },
  setRotacion: async (categoriaId, punteroActual) => {
    const { error } = await supabase.from("rotacion").upsert({ categoria_id: categoriaId, puntero_actual: punteroActual }, { onConflict: "categoria_id" });
    throwIfError(error);
    return { categoria_id: categoriaId, puntero_actual: punteroActual };
  },
  // OJO: hace falta un bucket de Storage llamado "gifs" (público) en
  // Supabase para que esto funcione — no está creado todavía. Ningún botón
  // de la app llama a esto hoy, así que no bloquea nada.
  uploadGif: async (dataUri) => {
    const match = /^data:(.+?);base64,(.+)$/.exec(dataUri || "");
    if (!match) throw new Error("dataUri inválida");
    const [, mimeType, base64] = match;
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const fileName = `ejercicio_${Date.now()}.gif`;
    const { error } = await supabase.storage.from("gifs").upload(fileName, new Blob([bytes], { type: mimeType }), { contentType: mimeType, upsert: true });
    throwIfError(error);
    const { data } = supabase.storage.from("gifs").getPublicUrl(fileName);
    return { fileId: fileName, url: data.publicUrl };
  },
  bootstrapJugador: async (jugadorId, fecha) => {
    const { data: todasSesiones, error: e1 } = await supabase.from("sesiones").select("*").eq("enviada", true);
    throwIfError(e1);
    const sesionesHoy = (todasSesiones || []).filter((s) => {
      const fechas = s.fechas || [];
      const destino = s.jugadores_destino || [];
      return fechas.includes(fecha) && (!destino.length || destino.includes(jugadorId));
    });
    // Próxima sesión futura de este jugador (para el Dashboard): mismo
    // conjunto de sesiones que ya se ha traído arriba para calcular las de
    // hoy, así que no hace falta ninguna llamada extra — solo mirar, de
    // las suyas, cuál es la fecha futura más próxima.
    let proximaSesion = null;
    (todasSesiones || []).forEach((s) => {
      const destino = s.jugadores_destino || [];
      if (destino.length && !destino.includes(jugadorId)) return;
      (s.fechas || []).forEach((f) => {
        if (f <= fecha) return;
        if (!proximaSesion || f < proximaSesion.fecha) proximaSesion = { sesion: s, fecha: f };
      });
    });
    const sesionIds = sesionesHoy.map((s) => s.id);
    let tareas = [];
    if (sesionIds.length) {
      const filas = await api.list("tareas", { sesion_id: sesionIds.join(",") });
      tareas = filas.filter((t) => tareaEsParaJugador(t, jugadorId));
    }
    const ejercicioIds = [...new Set(tareas.map((t) => t.ejercicio_id).filter(Boolean))];
    const circuitoIds = [...new Set(tareas.map((t) => t.circuito_id).filter(Boolean))];
    let ejercicios = [];
    if (ejercicioIds.length) {
      const { data, error } = await supabase.from("ejercicios").select("*").in("id", ejercicioIds);
      throwIfError(error);
      ejercicios = data || [];
    }
    let circuitos = [];
    if (circuitoIds.length) {
      const { data, error } = await supabase.from("circuitos").select("*").in("id", circuitoIds);
      throwIfError(error);
      circuitos = data || [];
    }
    return { sesiones: sesionesHoy, tareas, ejercicios, circuitos, proximaSesion };
  },
  bootstrapProgramacion: async () => {
    const { data: sesiones, error: e1 } = await supabase.from("sesiones").select("*");
    throwIfError(e1);
    const sesionIds = (sesiones || []).map((s) => s.id);
    let tareas = [];
    if (sesionIds.length) {
      // En lotes: con cientos de sesiones, un solo .in() desbordaría la URL.
      tareas = await api.list("tareas", { sesion_id: sesionIds.join(",") });
    }
    const { data: ejercicios, error: e3 } = await supabase.from("ejercicios").select("*");
    throwIfError(e3);
    return { sesiones: sesiones || [], tareas, ejercicios: ejercicios || [] };
  },
};
// ====== Fin backend remoto ======
