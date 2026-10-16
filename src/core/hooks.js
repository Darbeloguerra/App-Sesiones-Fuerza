import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ds } from "./designSystem.jsx";
import { api, supabase, genId } from "./backend.js";
import { normalizarFecha, todayStr } from "../calc/fechas.js";
import { parseResistenciaData } from "../calc/adherencia.js";
import { CMJ_UMBRAL_DEFECTO, cmjBuildPlayers } from "../calc/cmj.js";

export const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

export function genUniquePin(existingPins) {
  const existentesTexto = existingPins.map((p) => String(p).trim());
  let pin;
  let guard = 0;
  do {
    pin = genPin();
    guard++;
  } while (existentesTexto.includes(pin) && guard < 200);
  return pin;
}

// Caché en memoria compartida entre TODAS las pantallas de la app (vive
// mientras la pestaña del navegador esté abierta). Sin esto, cada vez que
// cambias de pantalla se vuelve a pedir todo desde cero a Apps Script, que
// es lento por naturaleza — con la caché, la segunda vez que hace falta un
// dato ya está en memoria y no hay que esperar a la red.
//
// Caducidad (DEV-05): las entradas caducan a los 45 s. Antes no caducaban
// nunca, y como los registros los crea el JUGADOR desde su móvil, el
// Dashboard del entrenador podía enseñar "Pendientes de hoy" obsoleto hasta
// recargar la app. Una entrada caducada se comporta como si no estuviera
// (has/get devuelven "no hay"), así que la siguiente pantalla que la
// necesite la pide fresca. Las listas realmente fijas quedan exentas.
export const CACHE_TTL_MS = 45000;
export const CLAVES_CACHE_PERMANENTES = new Set(["categoriasPreventivas", "materiales"]);
export class CacheConCaducidad extends Map {
  constructor() {
    super();
    this._t = new Map();
  }
  set(k, v) {
    this._t.set(k, Date.now());
    return super.set(k, v);
  }
  _vigente(k) {
    if (!super.has(k)) return false;
    if (CLAVES_CACHE_PERMANENTES.has(k)) return true;
    const t = this._t.get(k);
    if (t != null && Date.now() - t > CACHE_TTL_MS) {
      super.delete(k);
      this._t.delete(k);
      return false;
    }
    return true;
  }
  has(k) {
    return this._vigente(k);
  }
  get(k) {
    return this._vigente(k) ? super.get(k) : undefined;
  }
  delete(k) {
    this._t.delete(k);
    return super.delete(k);
  }
  clear() {
    this._t.clear();
    return super.clear();
  }
}
export const sharedDataCache = new CacheConCaducidad();

// ---------- Estado CMJ del equipo (para decidir al programar) ----------
// El CSV del CMJ llega DESPUÉS de que los jugadores ya hayan hecho la fuerza
// del día, así que no se puede intervenir antes de esa sesión. Lo útil es
// saber, con el último test disponible, quién está en rojo/ámbar y de cuándo
// es el dato, para ajustar la sesión de campo, la del día siguiente o lo que
// se está programando. Devuelve Map jugadorId -> { status, fechaTest, altura }.
export function useEstadoCmjEquipo(players) {
  const [estado, setEstado] = useState(() => sharedDataCache.get("estado_cmj_equipo") || null);
  useEffect(() => {
    if (!players.length) return undefined; // aún no hay jugadores: no se calcula ni se cachea vacío
    if (sharedDataCache.has("estado_cmj_equipo")) {
      setEstado(sharedDataCache.get("estado_cmj_equipo"));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const [saltosRes, microRes, umbralGuardado] = await Promise.all([
          supabase.from("cmj_saltos").select("*").not("jugador_id", "is", null),
          supabase.from("cmj_microciclos").select("*"),
          api.config("cmj_umbral"),
        ]);
        if (saltosRes.error || microRes.error) throw new Error("cmj");
        const umbral = umbralGuardado || CMJ_UMBRAL_DEFECTO;
        const porId = new Map(players.map((p) => [p.id, p]));
        const filas = (saltosRes.data || [])
          .filter((r) => !r.excluido && porId.has(r.jugador_id))
          .map((r) => ({
            jugadorId: r.jugador_id,
            nombre: porId.get(r.jugador_id).name,
            dateKey: r.fecha,
            date: r.fecha_hora,
            peso: r.peso,
            hp0: r.hp0,
            altura: r.altura,
            fuerza: r.fuerza,
            potencia: r.potencia,
            velocidad: r.velocidad,
            kineticsValid: r.kinetics_valid,
            pesoValid: r.peso_valid,
            hp0Valid: r.hp0_valid,
          }));
        const { players: construidos } = cmjBuildPlayers(filas, microRes.data || [], umbral.ambarPct, umbral.rojoPct, umbral.individualizar, umbral.protocoloDesde);
        const mapa = new Map();
        construidos.forEach((c) => {
          const ultimo = c.sorted[c.sorted.length - 1];
          mapa.set(c.jugadorId, { status: c.combinedStatus, fechaTest: String(ultimo?.dateKey || "").slice(0, 10), nombre: c.nombre });
        });
        sharedDataCache.set("estado_cmj_equipo", mapa);
        if (!cancelled) setEstado(mapa);
      } catch {
        if (!cancelled) setEstado(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [players.length]);
  return estado; // null mientras carga
}

// ---------- Referencias de fuerza (calibración del e1RM) ----------
// El entrenador puede introducir la "top serie" (carga × reps @ RIR) que un
// jugador hizo en el pasado, o el resultado de un test, para que el e1RM y las
// cargas sugeridas se calibren sin esperar semanas de datos. Se convierten en
// items sintéticos con la misma forma que los del historial (esReferencia) y
// SOLO se pasan a los cálculos de e1RM / carga; nunca cuentan como sesión
// hecha, volumen ni adherencia. Si la tabla aún no existe, no pasa nada: la
// lista queda vacía y el resto de la app funciona igual.
export function referenciasComoItems(rows) {
  return (rows || [])
    .filter((r) => r.ejercicio && r.carga_kg != null && r.reps != null && r.rir != null)
    .map((r) => ({
      id: `ref:${r.id}`,
      tareaId: null,
      jugadorId: r.jugador_id,
      date: normalizarFecha(r.fecha),
      name: r.ejercicio,
      done: true,
      cargaReal: r.carga_kg,
      repsReal: r.reps,
      rirReal: r.rir,
      seriesHechas: 0,
      sets: 0,
      bloque: "Fuerza",
      esResistencia: false,
      materiales: r.material && r.material !== "std" ? [r.material] : [],
      subtipoCorporal: "",
      esReferencia: true,
      tipoReferencia: r.tipo || "historico",
    }));
}
// jugadorId: las de un jugador. Con `todos: true` (vista de entrenador), las de
// todo el equipo. Sin jugador y sin `todos` no carga nada (p. ej. mientras la
// pantalla del jugador aún no sabe quién es).
export function useReferenciasFuerza(jugadorId, { todos = false } = {}) {
  const inactivo = !jugadorId && !todos;
  const cacheKey = `referencias_fuerza:${jugadorId || "todos"}`;
  const [rows, setRows] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (inactivo) {
      setLoaded(true);
      return undefined;
    }
    if (version === 0 && sharedDataCache.has(cacheKey)) {
      setRows(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const filas = await api.list("referenciasFuerza", jugadorId ? { jugador_id: jugadorId } : undefined);
        const propias = jugadorId ? filas.filter((r) => r.jugador_id === jugadorId) : filas;
        if (cancelled) return;
        sharedDataCache.set(cacheKey, propias);
        setRows(propias);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, version, jugadorId, inactivo]);
  const recargar = () => {
    [...sharedDataCache.keys()].filter((k) => String(k).startsWith("referencias_fuerza:")).forEach((k) => sharedDataCache.delete(k));
    setVersion((v) => v + 1);
  };
  return { loaded, rows: inactivo ? [] : rows, items: inactivo ? [] : referenciasComoItems(rows), recargar };
}

// Pide un refresco silencioso cuando la pestaña vuelve a estar visible (o
// la ventana recupera el foco) tras más de `minMs` — p. ej. el entrenador
// deja el Dashboard abierto, el jugador envía su sesión desde el móvil y al
// volver el entrenador ve el dato nuevo sin recargar. `refrescar` NO debe
// mostrar el estado de carga (ver refrescarSilencioso en los hooks).
export function useRefrescarAlVolver(refrescar, minMs = CACHE_TTL_MS) {
  const ref = useRef(refrescar);
  ref.current = refrescar;
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let ultimo = Date.now();
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimo < minMs) return;
      ultimo = Date.now();
      ref.current?.();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [minMs]);
}

// Para los sitios que guardan directamente con api.save/api.delete sin pasar
// por useEntityList (p. ej. el guardado de Diseñar sesión, que escribe
// Sesiones/Tareas/Circuitos en varias llamadas sueltas) — limpia la caché de
// esa entidad para que la próxima pantalla que la necesite pida datos frescos
// en vez de mostrar lo de antes de guardar.
export function invalidateEntityCache(entity) {
  for (const k of sharedDataCache.keys()) {
    if (k.startsWith(`list:${entity}:`)) sharedDataCache.delete(k);
  }
}

// invalidateEntityCache() solo limpia las listas genéricas (list:entity:...).
// Las pantallas de "bootstrap" (Programación, pantalla del jugador) usan sus
// propias claves de caché ("bootstrap:programacion", "bootstrap:<jugadorId>:<fecha>")
// que NO empiezan por "list:", así que sobrevivían a esa limpieza — por eso
// una sesión guardada desde el botón directo "Diseñar sesión" del dashboard
// no aparecía en Programación hasta cerrar y reabrir la app (lo que vacía
// toda la memoria y fuerza a pedirlo todo de nuevo). Se llama a esto junto a
// invalidateEntityCache cada vez que se guarda o borra una sesión.
export function invalidateBootstrapCache() {
  for (const k of sharedDataCache.keys()) {
    if (k.startsWith("bootstrap:")) sharedDataCache.delete(k);
  }
}

// Sustituye a usePersistentList: sincroniza el array COMPLETO de una entidad
// (jugadores, ejercicios, sesiones, tareas, registros...) contra su pestaña.
// save(next) recibe la lista completa deseada (igual que antes) y por debajo
// solo guarda los registros que cambiaron (comparando por referencia) y borra
// los que ya no están — así el resto del código que hace `players.map(...)`,
// `[...items, nuevo]`, `.filter(...)` no necesita cambiar de forma.
export function useEntityList(entity, filters) {
  const filtersKey = JSON.stringify(filters || null);
  const cacheKey = `list:${entity}:${filtersKey}`;
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  // true = el próximo refetch (tick > 0) es silencioso: no pone loaded a
  // false (sin parpadeo) y, si falla, conserva los datos que ya había.
  const silencioRef = useRef(false);
  // Se mantiene siempre al día, de forma síncrona, independientemente de
  // cuándo React decida re-renderizar. save() compara contra esta referencia
  // en vez de contra el "items" cerrado en el momento en que se creó la
  // función — así, si guardas dos veces seguidas muy rápido, el segundo
  // guardado ve de verdad el resultado del primero y no lo deshace ni
  // duplica nada por comparar contra una foto vieja.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let cancelled = false;
    const silencioso = silencioRef.current;
    silencioRef.current = false;
    // filters === false es la señal explícita de "todavía no hay nada que pedir"
    // (p. ej. ningún jugador seleccionado aún) — evita traer la pestaña entera sin filtrar.
    if (filters === false) {
      setItems([]);
      setLoaded(true);
      return;
    }
    // Si ya está en caché y no es un refresco explícito (tick), se usa tal
    // cual, sin ir a la red — esto es lo que hace que volver a una pantalla
    // ya visitada sea instantáneo.
    if (tick === 0 && sharedDataCache.has(cacheKey)) {
      setItems(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    if (!silencioso) setLoaded(false);
    (async () => {
      try {
        const res = await api.list(entity, filters);
        if (cancelled) return;
        sharedDataCache.set(cacheKey, res || []);
        setItems(res || []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (silencioso) return; // refresco en segundo plano fallido: se dejan los datos que ya había
        setItems([]);
        setError(e?.message || "No se pudo cargar. Comprueba tu conexión.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, filtersKey, tick]);

  const save = useCallback(
    async (next) => {
      const previous = itemsRef.current;
      itemsRef.current = next; // optimista e inmediato: la siguiente llamada a save(), aunque sea milisegundos después, ya lo ve
      setItems(next);
      try {
        const previousById = new Map(previous.filter((i) => i.id).map((i) => [i.id, i]));
        const nextIds = new Set(next.map((i) => i.id).filter(Boolean));
        const toDelete = previous.filter((i) => i.id && !nextIds.has(i.id));
        const toSaveIdx = [];
        next.forEach((item, idx) => {
          if (previousById.get(item.id) !== item) toSaveIdx.push(idx);
        });
        const savedResults = await Promise.all(toSaveIdx.map((idx) => api.save(entity, next[idx])));
        await Promise.all(toDelete.map((item) => api.delete(entity, item.id)));
        const reconciled = next.slice();
        toSaveIdx.forEach((idx, i) => {
          reconciled[idx] = savedResults[i];
        });
        // Si mientras esta llamada estaba en marcha llegó OTRA más reciente
        // (itemsRef.current ya no es "next"), no pisamos su resultado — nos
        // limitamos a fusionar los ids reales que acabamos de crear.
        if (itemsRef.current === next) {
          itemsRef.current = reconciled;
          setItems(reconciled);
        } else {
          const finalItems = itemsRef.current.map((item) => {
            const idx = next.indexOf(item);
            return idx !== -1 && toSaveIdx.includes(idx) ? reconciled[idx] : item;
          });
          itemsRef.current = finalItems;
          setItems(finalItems);
        }
        sharedDataCache.set(cacheKey, itemsRef.current);
        // Cualquier otra pantalla que tenga esta misma entidad cacheada con
        // OTRO filtro (p. ej. "registros de este jugador" vs "todos los
        // registros") puede haberse quedado desactualizada — se invalida
        // para que la próxima vez que se visite, se vuelva a pedir.
        for (const k of sharedDataCache.keys()) {
          if (k.startsWith(`list:${entity}:`) && k !== cacheKey) sharedDataCache.delete(k);
        }
        setError(null);
        return true;
      } catch (e) {
        setItems(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [entity, cacheKey]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);
  // Igual que retry pero sin parpadeo de carga — para refrescos automáticos.
  const refrescarSilencioso = useCallback(() => {
    silencioRef.current = true;
    setTick((t) => t + 1);
  }, []);

  // Añade un registro ya guardado (con id real) directamente al estado local
  // y a la caché compartida, sin pasar por la red ni tocar `loaded` — a
  // diferencia de retry(), no provoca ningún parpadeo de carga. Se usa
  // cuando algo ya se guardó por su cuenta (p. ej. resolveEjercicio) y solo
  // hace falta que esta lista en memoria se entere.
  const addLocal = useCallback(
    (item) => {
      itemsRef.current = [...itemsRef.current, item];
      setItems(itemsRef.current);
      sharedDataCache.set(cacheKey, itemsRef.current);
    },
    [cacheKey]
  );

  return [items, save, loaded, error, retry, addLocal, refrescarSilencioso];
}

// Sustituye a usePersistentValue, para la pestaña Config (clave/valor).
export function useConfigValue(clave) {
  const [value, setValue] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const res = await api.config(clave);
        if (cancelled) return;
        setValue(res);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setValue(null);
        setError(e?.message || "No se pudo cargar. Comprueba tu conexión.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clave, tick]);

  const save = useCallback(
    async (next) => {
      const previous = value;
      setValue(next);
      try {
        await api.setConfig(clave, next);
        setError(null);
        return true;
      } catch (e) {
        setValue(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [clave, value]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return [value, save, loaded, error, retry];
}

// Adaptador sobre la pestaña Jugadores: el resto de la app sigue usando
// player.name/player.groupIds tal cual (evita renombrar decenas de sitios),
// y aquí se traduce a las columnas reales (nombre, estado, categorias_preventivas).
// groupIds es un array (un jugador puede tener varias categorías preventivas).
// gruposIds es un concepto distinto y nuevo: los "grupos" que tú creas
// (equipos, agrupaciones libres) — un usuario puede estar en varios a la
// vez, igual mecánica que groupIds pero sin relación con lo preventivo.
export function usePlayers() {
  const [rows, saveRows, loaded, error, retry] = useEntityList("jugadores");

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const players = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.nombre,
        pin: r.pin,
        estado: r.estado || "activo",
        groupIds: Array.isArray(r.categorias_preventivas) ? r.categorias_preventivas : [],
        gruposIds: Array.isArray(r.grupos_ids) ? r.grupos_ids : [],
        // Posición de juego (portero/central/...) — añadida para el módulo
        // Control de fatiga (Parte 5), pero es un dato del jugador en
        // general, no exclusivo del CMJ.
        posicion: r.posicion || null,
        // VAM (velocidad aeróbica máxima) y FCmáx (frecuencia cardíaca
        // máxima) de un test de campo real del jugador (VAM-Eval, 30-15
        // IFT, Course Navette/Léger...) — añadidos para traducir la
        // intensidad de las tareas de Resistencia (% FCmáx / % VAM) a algo
        // ejecutable (un pulso o un ritmo). Igual que posicion arriba: son
        // datos opcionales del jugador, no exclusivos de un módulo — nulos
        // hasta que se registre un test (ver sql/add_vam_fcmax_jugador.sql
        // y objetivoJugadorResistencia). Sin ellos, CampoResistenciaTareaReal
        // y TareaCardReal usan la estimación poblacional en su lugar.
        vamKmh: r.vam_kmh != null && r.vam_kmh !== "" ? Number(r.vam_kmh) : null,
        vamProtocolo: r.vam_protocolo || null,
        vamFecha: r.vam_fecha || null,
        fcMaxPpm: r.fc_max_ppm != null && r.fc_max_ppm !== "" ? Number(r.fc_max_ppm) : null,
        fcMaxProtocolo: r.fc_max_protocolo || null,
        fcMaxFecha: r.fc_max_fecha || null,
        // Objetivo actual del jugador (texto libre corto) — mostrado y
        // editable desde la pestaña Resumen de la ficha (Fase 6 → Equipos y
        // usuarios, mini-card "Objetivo actual"). Ver sql/add_objetivo_actual_jugador.sql.
        objetivoActual: r.objetivo_actual || "",
      })),
    [rows]
  );

  const savePlayers = useCallback(
    (nextPlayers) => {
      const nextRows = nextPlayers.map((p) => {
        const original = p.id ? rowsById.get(p.id) : null;
        const groupIds = p.groupIds || [];
        const gruposIds = p.gruposIds || [];
        const estado = p.estado || "activo";
        const objetivoActual = p.objetivoActual || "";
        if (
          original &&
          original.nombre === p.name &&
          original.pin === p.pin &&
          original.estado === estado &&
          JSON.stringify(original.categorias_preventivas || []) === JSON.stringify(groupIds) &&
          JSON.stringify(original.grupos_ids || []) === JSON.stringify(gruposIds) &&
          (original.objetivo_actual || "") === objetivoActual
        ) {
          return original; // sin cambios reales: misma referencia -> no se reguarda
        }
        return { id: p.id, nombre: p.name, pin: p.pin, estado, categorias_preventivas: groupIds, grupos_ids: gruposIds, objetivo_actual: objetivoActual };
      });
      return saveRows(nextRows);
    },
    [saveRows, rowsById]
  );

  return [players, savePlayers, loaded, error, retry];
}

export const MD_TAGS = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "Sin MD"];

export const UNIDAD_POR_MODO = { reps: "reps", tiempo: "seg", minutos: "min", metros: "m" };

// Extrae el ID de un enlace de YouTube en cualquiera de sus formatos habituales
// (watch?v=, youtu.be/, shorts/, embed/). Devuelve null si no es de YouTube —
// así el resto de la app puede seguir aceptando enlaces antiguos (GIFs de
// Drive de antes de este cambio) sin romperse.
export function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Un enlace "de vídeo directo" es cualquier URL que termine en una extensión
// de vídeo reproducible por <video> nativo — es lo que da Cloudflare R2 (o
// cualquier bucket de objetos): la URL pública del archivo tal cual, sin
// intermediario de por medio.
export function esVideoDirecto(url) {
  return !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.trim());
}

// Miniatura para las tarjetas de tarea/biblioteca: si es un vídeo de YouTube,
// usa la miniatura oficial de YouTube. Un vídeo directo (R2 y similares) no
// trae miniatura propia — se resuelve con un icono de play sobre fondo liso
// en el sitio donde se pinta (ver TareaCardReal/TarjetaEjercicioReal). Si no
// es ninguna de las dos cosas (GIF antiguo de Drive), se usa el enlace tal
// cual como imagen.
export function miniaturaTarea(url) {
  const videoId = extractYouTubeId(url);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  if (esVideoDirecto(url)) return null;
  return url;
}

// El material seleccionado se guarda como texto JSON en la columna `material`
// de Tareas. Este helper lo interpreta de forma segura en cualquier sitio
// donde haga falta mostrarlo (nunca deja caer una excepción si el campo está
// vacío o corrupto).
export function parseMateriales(material) {
  if (!material) return [];
  try {
    const v = JSON.parse(material);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function formatearObjetivoResistencia(r) {
  if (!r || !r.tipo) return "Sin configurar";
  const conUnidad = (v, u) => (v !== "" && v != null ? `${v} ${u === "min" ? "min" : "seg"}` : null);
  if (r.tipo === "continuo") {
    return [
      r.series && `${r.series} series`,
      conUnidad(r.tiempo, r.tiempoUnidad),
      r.intensidad && `${r.intensidad}% FCmáx`,
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const sinImpacto = (r.modalidad || "carrera") !== "carrera";
  if (r.tipo === "hiit") {
    return [
      r.bloques && `${r.bloques} bloques`,
      r.intervalos && `${r.intervalos} intervalos`,
      conUnidad(r.tiempo, r.tiempoUnidad),
      sinImpacto && r.rpe && `RPE ${r.rpe}`,
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (r.tipo === "rsa") {
    return [
      r.bloques && `${r.bloques} bloques`,
      r.series && `${r.series} series`,
      sinImpacto ? r.duracion && `${r.duracion} s` : r.distancia && `${r.distancia} m`,
      sinImpacto && r.rpe && `RPE ${r.rpe}`,
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

// Línea de detalle de una tarea en el resumen del entrenador (Programación).
// Antes daba por hecho que toda tarea era "series × cantidad" tipo Fuerza —
// una tarea por tiempo (Activación, modo "minutos"/"tiempo", sin series) se
// quedaba en "× 8" sin unidad, porque el molde no sabía que ese modo existe.
// Aquí sí se usa el modo real de la tarea para elegir el formato y la
// unidad — igual que ya hace la pantalla del jugador con UNIDAD_POR_MODO.
export function formatearDetalleTareaCoach(t) {
  if (t.bloque_sesion === "Resistencia") return formatearObjetivoResistencia(parseResistenciaData(t.resistencia_data));
  const porTiempo = t.modo === "minutos" || t.modo === "tiempo";
  // Antes, si la tarea era "por tiempo" (isométricos: plancha, puente...),
  // se descartaba el dato de series aunque estuviera guardado — aquí, igual
  // que en la pantalla del jugador, las series se muestran siempre que
  // existan, sea cual sea el modo (reps/tiempo/minutos/metros).
  const unidad = porTiempo ? ` ${UNIDAD_POR_MODO[t.modo] || ""}`.trimEnd() : "";
  const cantidad = `${t.series ? `${t.series} × ` : ""}${t.cantidad}${unidad}`;
  // Igual que en la pantalla del jugador: la lateralidad depende solo de si
  // el ejercicio la tiene desactivada, no de si la tarea es por tiempo.
  const lateralidad = t.sin_lateralidad !== "si" ? ` · ${t.lateralidad === "unilateral" ? "Unilateral" : "Bilateral"}` : "";
  const cargaObjetivo =
    t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null
      ? ` · ${t.pct1rm}% 1RM`
      : t.rir !== "" && t.rir != null
      ? ` · RIR ${t.rir}`
      : "";
  return `${cantidad}${lateralidad}${cargaObjetivo}`;
}

// ---------- Resistencia: capacidad objetivo, pauta recomendada, semáforo y
// traducción del % a algo ejecutable para el jugador (ritmo o pulso) ----------
// Traslado fiel de la lógica ya diseñada y aprobada en
// mockup_diseno_sesion.html (CAPACIDADES_RESISTENCIA, MODALIDADES,
// ESTIMACION_POBLACIONAL, renderCamposHtml, fichaAplica,
// avisoTransferencia, objetivoJugadorSimple) a hooks/props de React reales.
//
// Guía de referencia por capacidad — síntesis de Pallarés & Morán-Navarro
// (2012, zonas R0-R6) actualizada con literatura posterior: distribución
// polarizada del volumen (Seiler, 2010; Rosenblat et al., 2018), aviso de
// "zona gris" en el umbral anaeróbico (Van Schuylenbergh et al., 2020), y
// diseño de HIIT por tiempo efectivo >90% VO2máx en vez de solo el %
// (Buchheit & Laursen, 2013). No sustituye el test individual del
// jugador — es el punto de partida que luego el entrenador ajusta.
// rangoNum: rango numérico REAL publicado por la tabla para la métrica que
// el campo de intensidad de cada estructura captura (FCmáx en Continuo,
// VAM en HIIT/RSA) — es lo único contra lo que el semáforo compara. R0 se
// queda sin rangoNum a propósito: su rango está publicado en %FCreserva,
// una escala distinta a la que pide el campo (%FCmáx), y no se convierte
// una por otra sin una fórmula validada por jugador (Karvonen), así que no
// se le fuerza un semáforo.
// rpe (solo R3-R6): equivalente en esfuerzo percibido (Borg CR10) para
// cuando la tarea es en bici/elíptica/piscina — ahí ni FCmáx (reacciona
// demasiado lento para esfuerzos cortos) ni VAM (es una métrica de
// carrera) tienen sentido sin potenciómetro. Anclas verbales de Borg CR10
// vía Foster et al. (2001, sesión-RPE).
export const CAPACIDADES_RESISTENCIA = {
  r0: { nombre: "Recuperación activa / Regenerativo", tipo: "continuo", rango: "< 65% FCreserva · < 65% VAM", lactato: "—", metodo: "Continuo Uniforme Extensivo", nota: "Para disipar fatiga entre estímulos o sesiones de descarga — no busca adaptación.", sugerido: { tiempo: 20, intensidad: 60, recuperacionUnidad: "min" } },
  r1: { nombre: "Umbral aeróbico", tipo: "continuo", rango: "65-75% VO2máx · 70-80% FCmáx · 65-75% VAM", lactato: "1-2 mmol/L", metodo: "Continuo Uniforme o Continuo Variable 1", nota: "Debería concentrar la mayoría del volumen semanal de resistencia (~75-80% del tiempo total, modelo polarizado).", rangoNum: { min: 70, max: 80 }, sugerido: { tiempo: 35, intensidad: 70, recuperacionUnidad: "min" } },
  r2: { nombre: 'Umbral anaeróbico ("zona gris")', tipo: "continuo", rango: "75-85% VO2máx · 80-90% FCmáx · 75-85% VAM", lactato: "2-4 mmol/L", metodo: "Continuo Variable 1/2 · Interválico Extensivo Largo", nota: "Ni construye base aeróbica ni estimula VO2máx con eficacia — úsala con un objetivo concreto (ritmo de competición), no como relleno.", alerta: true, rangoNum: { min: 80, max: 90 }, sugerido: { tiempo: 20, intensidad: 80, recuperacionUnidad: "min" } },
  r3: { nombre: "Consumo Máximo de Oxígeno (VO2máx)", tipo: "hiit", rango: "90-100% VO2máx · 95-100% FCmáx · 90-100% VAM", lactato: "4-8 mmol/L", metodo: "Interválico Extensivo/Medio · Interválico Intensivo Corto", nota: "El objetivo real es acumular tiempo sostenido por encima del 90% del VO2máx, no solo tocar el porcentaje.", rangoNum: { min: 90, max: 100 }, rpe: { min: 8, max: 9 }, sugerido: { bloques: 1, intervalos: 6, tiempo: 180, intensidad: 95, recuperacion: 120 } },
  r4: { nombre: "Capacidad anaeróbica láctica", tipo: "rsa", rango: "105-120% VAM", lactato: "8-14 mmol/L", metodo: "Interválico Intensivo Corto · Repeticiones Largas", nota: "Recuperaciones amplias entre series (8-12 min) para tamponar el lactato sin perder calidad en el siguiente esfuerzo.", rangoNum: { min: 105, max: 120 }, rpe: { min: 8, max: 9 }, sugerido: { bloques: 1, series: 4, distancia: 300, intensidad: 112, recuperacion: 600 } },
  r5: { nombre: "Potencia anaeróbica láctica", tipo: "rsa", rango: "120-140% VAM", lactato: "Máximo", metodo: "Repeticiones Medias/Cortas", nota: "Depleciones importantes de fosfocreatina y glucógeno — dosifica el número de repeticiones, no solo la intensidad.", rangoNum: { min: 120, max: 140 }, rpe: { min: 9, max: 10 }, sugerido: { bloques: 1, series: 6, distancia: 150, intensidad: 130, recuperacion: 600 } },
  r6: { nombre: "Potencia anaeróbica aláctica", tipo: "rsa", rango: "> 160% velocidad máxima", lactato: "—", metodo: "Interválico Intensivo Muy Corto · Repeticiones Cortas", nota: "Esfuerzos máximos de 2-8 s — la vía láctica apenas participa; prioriza recuperación casi completa entre repeticiones (> 8 min).", rangoNum: { min: 160, max: null }, rpe: { min: 9, max: 10 }, sugerido: { bloques: 4, series: 6, distancia: 30, intensidad: 170, recuperacion: 480 } },
};
export const NOMBRES_TIPO_TRABAJO_RESISTENCIA = { continuo: "Continuo", hiit: "HIIT", rsa: "RSA / Repeticiones" };
export const ETQ_INTENSIDAD_RESISTENCIA = { continuo: "INTENSIDAD % FCMÁX", hiit: "INTENSIDAD % VAM", rsa: "INTENSIDAD % VAM" };
export const MODALIDADES_RESISTENCIA = { carrera: "Carrera", bici: "Bici", eliptica: "Elíptica", piscina: "Piscina", otro: "Otro sin impacto" };
// Igual que en Resistencia: elegir la modalidad ES elegir "qué ejercicio"
// para Activación — ya no hace falta abrir el buscador de la Biblioteca.
export const MODALIDADES_ACTIVACION = { bici: "Bici estática", remo: "Remo", eliptica: "Elíptica", cinta: "Cinta de correr", otro: "Otro" };

// El % que pide el campo de intensidad no significa nada por sí solo: VAM y
// FCmáx no se estiman, se miden con un test de campo real (VAM-Eval,
// 30-15 IFT, Course Navette/Léger...). Sin test individual, el jugador no
// se queda sin número: se usa una estimación POBLACIONAL real y publicada,
// no una fórmula genérica inventada ni una frase cualitativa (el Talk
// Test/RPE se descartó por decisión expresa — un jugador sin formación en
// entrenamiento no sabe traducir "frases cortas" a lo que tiene que hacer
// en la pista).
// Fuente: Bruzzese et al., "Assessment of professional Argentine football
// players using the UNCa test", Arch Med Deporte 2021;38(5):327-331 —
// futbolistas profesionales, n=9, edad 26.8±5.1 años. VAM media 14.8±1.3
// km/h; FC ~95% de la máxima esperada al final del test, 193.6±7.9 ppm.
// Muestra pequeña (n=9): es la mejor aproximación disponible sin test
// individual, no un sustituto de uno.
export const ESTIMACION_POBLACIONAL_RESISTENCIA = {
  fcMax: { valor: 194, fuente: "media en futbolistas profesionales (Bruzzese et al., 2021, n=9)" },
  vam: { valor: 14.8, fuente: "media en futbolistas profesionales (Bruzzese et al., 2021, n=9)" },
};

// Aviso de transferencia entre modalidades: FCmáx medida corriendo y en
// bici son parecidas EN PROMEDIO (~2 ppm de diferencia en un estudio con
// 5.311 atletas), pero el error de transferencia INDIVIDUAL es de hasta
// ~12 ppm (triatletas testados en ambos deportes, r=0,32) — así que se
// avisa, no se oculta, cuando el test es de carrera y la tarea no lo es.
export function avisoTransferenciaResistencia(modalidad) {
  return modalidad === "carrera"
    ? ""
    : " FCmáx medida corriendo: en esta modalidad el error de transferencia individual puede llegar a ~12 ppm — un test específico en esta modalidad sería más preciso.";
}

// Ficha de jugador solo tiene sentido cuando el campo de intensidad es
// VAM/FCmáx (algo que traducir a km/h o ppm). Con RPE (bici/elíptica en
// R3-R6) el propio campo ya es la instrucción para el jugador — no hay
// nada que traducir, así que la ficha se oculta ahí.
export function fichaResistenciaAplica(tipo, modalidad) {
  return !(tipo !== "continuo" && modalidad !== "carrera");
}

// Referencia real del jugador (jugador.fcMaxPpm / jugador.vamKmh, ver
// usePlayers) si existe, o estimación poblacional si no. jugador puede ser
// null (sesión para todo el equipo o para varios jugadores a la vez): en
// ese caso se usa siempre la estimación poblacional, porque no hay un
// único jugador al que anclar el número.
export function referenciaResistenciaJugador(metric, jugador) {
  const campo = metric === "fcMax" ? jugador?.fcMaxPpm : jugador?.vamKmh;
  if (jugador && campo != null && campo !== "") {
    const protocolo = metric === "fcMax" ? jugador.fcMaxProtocolo : jugador.vamProtocolo;
    const fecha = metric === "fcMax" ? jugador.fcMaxFecha : jugador.vamFecha;
    return { valor: Number(campo), real: true, protocolo: protocolo || "", fecha: fecha || "" };
  }
  return { valor: ESTIMACION_POBLACIONAL_RESISTENCIA[metric].valor, real: false, fuente: ESTIMACION_POBLACIONAL_RESISTENCIA[metric].fuente };
}

// Lo que el jugador necesita no es el % ni el nombre de la capacidad — es
// algo que pueda ejecutar sin pensar: un ritmo (tiempo sobre la distancia)
// o un pulso objetivo, calculado con el dato real del jugador si lo
// tiene, o con la estimación poblacional (ver arriba) si no — nunca una
// frase para leer entre líneas. Réplica de objetivoJugadorSimple.
export function objetivoJugadorResistencia(tipo, intensidadVal, distancia, jugador) {
  const metric = tipo === "continuo" ? "fcMax" : "vam";
  const ref = referenciaResistenciaJugador(metric, jugador);
  const v = Number(intensidadVal);
  if (intensidadVal === "" || intensidadVal == null || isNaN(v)) return "";
  const prefijo = ref.real ? "" : "≈";
  if (metric === "fcMax") return prefijo + Math.round((ref.valor * v) / 100) + " ppm";
  const speedKmh = (ref.valor * v) / 100;
  if (distancia) {
    const speedMs = (speedKmh * 1000) / 3600;
    const segundos = Number(distancia) / speedMs;
    const mm = Math.floor(segundos / 60);
    const ss = Math.round(segundos % 60);
    return "ritmo: " + prefijo + mm + ":" + String(ss).padStart(2, "0");
  }
  return "ritmo: " + prefijo + speedKmh.toFixed(1) + " km/h";
}

// Semáforo (solo intensidad/RPE, contra el rango real publicado) o
// diferencia neutra (el resto de campos numéricos, contra el valor
// sugerido) para un campo de una tarea de Resistencia. Sin rango/sugerido
// publicado (p. ej. R0, o un campo sin referencia) no se evalúa — el
// campo se queda sin indicador, nunca con uno inventado.
// Las pautas de cada capacidad (R0-R6) se expresan en % de VAM / velocidad
// máxima, que solo existen corriendo. Fuera de la carrera (bici, elíptica,
// piscina, otro) se muestran solo las referencias que sí valen allí (%VO2máx,
// %FCmáx) y el RPE, y la pauta sugerida se traduce a duración + RPE.
export function rangoResistenciaModalidad(capacidadObj, sinImpacto) {
  if (!capacidadObj) return "";
  if (!sinImpacto) return capacidadObj.rango;
  const partes = (capacidadObj.rango || "").split(" · ").filter((p) => !/VAM|velocidad/i.test(p));
  if (capacidadObj.rpe) partes.push(`RPE ${capacidadObj.rpe.min}-${capacidadObj.rpe.max}`);
  return partes.join(" · ");
}

export function pautaSugeridaModalidad(capacidadObj, sinImpacto) {
  const s = { ...(capacidadObj?.sugerido || {}) };
  if (!sinImpacto || (capacidadObj?.tipo === "continuo")) return s;
  // Sin velocidad de referencia: la duración equivale al tiempo que tardaría
  // un futbolista medio en cubrir la distancia sugerida a esa intensidad.
  if (capacidadObj.tipo === "rsa" && s.distancia && s.intensidad) {
    const ms = (ESTIMACION_POBLACIONAL_RESISTENCIA.vam.valor * s.intensidad) / 100 / 3.6;
    s.duracion = Math.max(5, Math.round(s.distancia / ms));
  }
  s.distancia = "";
  s.intensidad = "";
  if (capacidadObj.rpe) s.rpe = Math.round((capacidadObj.rpe.min + capacidadObj.rpe.max) / 2);
  return s;
}

export function evaluarIndicadorResistencia(key, valor, capacidadObj) {
  if (valor === "" || valor == null || isNaN(Number(valor))) return null;
  const v = Number(valor);
  if (key === "intensidad") {
    if (!capacidadObj?.rangoNum) return null;
    const { min, max } = capacidadObj.rangoNum;
    const margen = 5;
    const rangoTxt = min + (max != null ? "-" + max : "+") + "%";
    if (v >= min && (max == null || v <= max)) return { texto: "En rango", color: ds.success, titulo: `Dentro del rango recomendado (${rangoTxt})` };
    if (v >= min - margen && (max == null || v <= max + margen)) return { texto: "Cerca", color: ds.warning, titulo: `Justo fuera del rango recomendado (${rangoTxt})` };
    return { texto: "Fuera", color: ds.danger, titulo: `Claramente fuera del rango recomendado (${rangoTxt})` };
  }
  if (key === "rpe") {
    if (!capacidadObj?.rpe) return null;
    const { min, max } = capacidadObj.rpe;
    const margen = 1;
    const rangoTxt = `${min}-${max}`;
    if (v >= min && v <= max) return { texto: "En rango", color: ds.success, titulo: `Dentro del RPE recomendado (${rangoTxt})` };
    if (v >= min - margen && v <= max + margen) return { texto: "Cerca", color: ds.warning, titulo: `Justo fuera del RPE recomendado (${rangoTxt})` };
    return { texto: "Fuera", color: ds.danger, titulo: `Claramente fuera del RPE recomendado (${rangoTxt})` };
  }
  const sugerido = capacidadObj?.sugerido?.[key];
  if (sugerido == null) return null;
  const diff = v - Number(sugerido);
  const texto = diff === 0 ? "= ref." : diff > 0 ? `+${diff}` : String(diff);
  const titulo = diff === 0 ? `Igual que la referencia sugerida (${sugerido})` : diff > 0 ? `${diff} por encima de la referencia sugerida (${sugerido})` : `${Math.abs(diff)} por debajo de la referencia sugerida (${sugerido})`;
  return { texto, color: ds.inkMuted, titulo };
}

// Busca (por nombre, sin distinguir mayúsculas) o crea la fila de Ejercicios
// correspondiente y devuelve el registro guardado (con su id real). Es lo que
// da a cada tarea embebida un ejercicio_id estable y reutilizable.
export async function resolveEjercicio(ejercicios, def) {
  const nombre = (def.nombre || "").trim();
  const match = ejercicios.find((e) => (e.nombre || "").toLowerCase() === nombre.toLowerCase());
  const record = {
    id: match?.id,
    nombre,
    bloque: match?.bloque || def.bloque || "",
    categoria_preventiva_id: match?.categoria_preventiva_id || "",
    tags_descriptivos: def.tags_descriptivos || [],
    gif_url: def.gif_url !== undefined ? def.gif_url : match?.gif_url || "",
    videos_variantes: def.videos_variantes !== undefined ? def.videos_variantes : match?.videos_variantes || {},
    sin_lateralidad: def.sin_lateralidad !== undefined ? def.sin_lateralidad : match?.sin_lateralidad || "",
    orden_rotacion: match?.orden_rotacion || "",
  };
  const saved = await api.save("ejercicios", record);
  invalidateEntityCache("ejercicios"); // escribe directo, sin pasar por useEntityList
  return saved;
}

// Actualiza solo la zona corporal de un ejercicio ya existente en tu
// biblioteca — se usa cuando eliges un ejercicio antiguo (creado antes de
// que la zona fuera obligatoria) desde el buscador de "Diseñar sesión": en
// vez de dejarlo sin clasificar, se le asigna ahí mismo y queda guardado
// para siempre en ese ejercicio.
export async function actualizarZonaEjercicio(ejercicio, zona) {
  const record = { ...ejercicio, tags_descriptivos: [zona] };
  const saved = await api.save("ejercicios", record);
  invalidateEntityCache("ejercicios");
  return saved;
}

export function useCategoriasPreventivas() {
  const cacheKey = "categoriasPreventivas";
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  useEffect(() => {
    if (sharedDataCache.has(cacheKey)) return; // fija (lista de 12 categorías) — no cambia entre pantallas
    let cancelled = false;
    api
      .categoriasPreventivas()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res || []);
          setItems(res || []);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return [items, loaded];
}

// Igual que useCategoriasPreventivas: caché compartida entre pantallas, para
// no volver a pedir el listado de materiales cada vez que se entra a Diseñar
// sesión (antes cada una lo pedía por su cuenta,
// sin caché, en cada visita).
export function useMaterialesDisponibles() {
  const cacheKey = "materiales";
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  useEffect(() => {
    if (sharedDataCache.has(cacheKey)) return;
    let cancelled = false;
    api
      .materiales()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res || []);
          setItems(res || []);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const agregar = useCallback(async (m) => {
    if (sharedDataCache.get(cacheKey)?.includes(m)) return;
    const next = [...(sharedDataCache.get(cacheKey) || items), m];
    sharedDataCache.set(cacheKey, next);
    setItems(next);
    await api.guardarMaterial(m);
  }, [items]);
  return [items, loaded, agregar];
}

// Trae varias filas de una entidad por id en una sola llamada (usa el filtro "IN" del backend).
export function useEntityByIds(entity, ids) {
  const key = [...new Set(ids)].sort().join(",");
  // Comparte el mismo prefijo de caché que useEntityList("entity") para que,
  // si se guarda algo en esa entidad desde otra pantalla, esta caché también
  // se invalide junto con la otra (ver invalidación cruzada en save() de arriba).
  const cacheKey = `list:${entity}:byIds:${key}`;
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => !key || sharedDataCache.has(cacheKey));
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setItems([]);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setItems(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list(entity, { id: key })
      .then((res) => {
        if (!cancelled) {
          // Igual que en el resto de hooks: no fiarse de que el filtro "IN"
          // del backend haga de verdad solo lo que pide — se re-filtra aquí
          // por si acaso devuelve más filas de las pedidas.
          const idsSet = new Set(ids);
          const filtrado = (res || []).filter((r) => idsSet.has(r.id));
          sharedDataCache.set(cacheKey, filtrado);
          setItems(filtrado);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, key, cacheKey]);
  return [items, loaded];
}

// Historial completo de un jugador: sus Registros, unidos con la Tarea (series/reps/RIR
// prescritos) y el Ejercicio (nombre, tipos, GIF) correspondientes. Todo en vivo, sin caché.
export function usePlayerHistory(playerId) {
  const [registrosTraidos, , registrosLoaded, , retryRegistros] = useEntityList("registros", playerId ? { jugador_id: playerId } : false);
  // Mismo blindaje que en la pantalla del jugador: el backend no filtra de
  // verdad por jugador_id, así que se filtra siempre aquí también. Se
  // excluyen además los registros "enviado: false" — son un progreso
  // guardado sin confirmar (ver "Guardar sin enviar" en la sesión del
  // jugador), y no deben contar todavía como sesión hecha en ninguna
  // estadística (adherencia, rachas, Historial, ficha de jugador...).
  const registros = playerId ? registrosTraidos.filter((r) => r.jugador_id === playerId && r.enviado !== false) : [];
  const tareaIds = registros.map((r) => r.tarea_id);
  const [tareas, tareasLoaded] = useEntityByIds("tareas", tareaIds);
  const ejercicioIds = tareas.map((t) => t.ejercicio_id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", ejercicioIds);
  // Solo para poder comparar el CMJ de hoy con el de la última vez que hubo
  // el mismo MD — el resto de tareas no necesita saber de qué sesión vino.
  const sesionIds = [...new Set(tareas.map((t) => t.sesion_id).filter(Boolean))];
  const [sesiones, sesionesLoaded] = useEntityByIds("sesiones", sesionIds);

  const loaded = registrosLoaded && tareasLoaded && ejerciciosLoaded && sesionesLoaded;
  // retryRegistros: los registros los crea el JUGADOR desde su propio
  // dispositivo/sesión de navegador — la caché en memoria del entrenador
  // (sharedDataCache) no se entera de eso sola, así que sin esto la pantalla
  // de Historial podía quedarse enseñando para siempre la foto de la
  // primera vez que se abrió (p. ej. "nadie ha hecho la sesión" aunque el
  // jugador ya la hubiera enviado hace rato). Quien use este hook debe
  // llamar a retry al entrar en la pantalla para forzar un dato fresco.
  if (!loaded) return { loaded: false, items: [], retry: retryRegistros };

  const tareasById = new Map(tareas.map((t) => [t.id, t]));
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const sesionesById = new Map(sesiones.map((s) => [s.id, s]));

  const items = registros.map((r) => {
    const t = tareasById.get(r.tarea_id) || {};
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const s = sesionesById.get(t.sesion_id) || {};
    return {
      id: r.id,
      tareaId: r.tarea_id,
      jugadorId: r.jugador_id,
      date: normalizarFecha(r.fecha),
      sesionId: t.sesion_id || "",
      md: s.md || "",
      name: e.nombre || "(tarea eliminada)",
      sets: t.series,
      reps: t.cantidad,
      rir: t.rir,
      tipos: e.tags_descriptivos || [],
      done: !!r.hecho,
      cargaReal: r.ignorar ? "" : r.carga_kg ?? "",
      cargaOriginal: r.carga_kg ?? "",
      repsOriginal: r.reps_hechas ?? "",
      rirOriginal: r.rir ?? "",
      ignorar: !!r.ignorar,
      revisado: !!r.revisado,
      rirReal: r.ignorar ? "" : r.rir ?? "",
      repsReal: r.ignorar ? "" : r.reps_hechas ?? "",
      seriesHechas: r.series_hechas ?? "",
      unidad: UNIDAD_POR_MODO[t.modo] || "reps",
      bloque: t.bloque_sesion || "General",
      nota: t.nota || "",
      materiales: parseMateriales(t.material),
      subtipoCorporal: r.subtipo_corporal || "",
      unilateral: t.lateralidad === "unilateral",
      esResistencia: t.bloque_sesion === "Resistencia",
      esElastica: (t.tipo_resistencia || "") === "Elástica",
      objetivoResistencia: t.bloque_sesion === "Resistencia" ? formatearObjetivoResistencia(parseResistenciaData(t.resistencia_data)) : null,
    };
  });

  return { loaded: true, items, retry: retryRegistros };
}

// Igual que usePlayerHistory, pero sin filtrar por jugador — trae los
// registros de TODO el equipo de una vez. Se usa solo en el Dashboard del
// entrenador, para "Quién necesita atención" (variación de carga media por
// jugador esta semana vs. la anterior). Trae menos campos que
// usePlayerHistory a propósito: aquí solo hace falta saber de quién es cada
// registro, cuándo fue y cuánta carga llevaba, no todo el detalle que
// necesita la ficha completa de un jugador.
export function useEquipoHistory() {
  const [registrosTraidos, , registrosLoaded, , , , refrescarRegistros] = useEntityList("registros");
  // Los registros los crean los jugadores desde su dispositivo: al volver a
  // la pestaña se refrescan solos (DEV-05).
  useRefrescarAlVolver(refrescarRegistros);
  // Igual que en usePlayerHistory: un registro "enviado: false" es solo un
  // progreso guardado sin confirmar todavía, no cuenta como hecho aquí.
  const registros = registrosTraidos.filter((r) => r.enviado !== false);
  const tareaIds = registros.map((r) => r.tarea_id);
  const [tareas, tareasLoaded] = useEntityByIds("tareas", tareaIds);
  const ejercicioIds = tareas.map((t) => t.ejercicio_id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", ejercicioIds);

  const loaded = registrosLoaded && tareasLoaded && ejerciciosLoaded;
  if (!loaded) return { loaded: false, items: [] };

  const tareasById = new Map(tareas.map((t) => [t.id, t]));
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));

  const items = registros.map((r) => {
    const t = tareasById.get(r.tarea_id) || {};
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    return {
      id: r.id,
      tareaId: r.tarea_id,
      jugadorId: r.jugador_id,
      date: normalizarFecha(r.fecha),
      name: e.nombre || "",
      done: !!r.hecho,
      cargaReal: r.ignorar ? "" : r.carga_kg ?? "",
      cargaOriginal: r.carga_kg ?? "",
      repsOriginal: r.reps_hechas ?? "",
      rirOriginal: r.rir ?? "",
      ignorar: !!r.ignorar,
      revisado: !!r.revisado,
      esResistencia: t.bloque_sesion === "Resistencia",
      esElastica: (t.tipo_resistencia || "") === "Elástica",
      bloque: t.bloque_sesion || "General",
      // Necesarios para calcular el e1RM por ejercicio+equipo (ENT-01, ver
      // calcularCambiosE1rm): reps y RIR realmente hechos, y el material.
      repsReal: r.ignorar ? "" : r.reps_hechas ?? "",
      rirReal: r.ignorar ? "" : r.rir ?? "",
      materiales: parseMateriales(t.material),
      subtipoCorporal: r.subtipo_corporal || "",
      sets: t.series,
      seriesHechas: r.series_hechas ?? "",
    };
  });
  return { loaded: true, items };
}

// Mismo tratamiento para Programación (entrenador): antes eran 2 peticiones
// en cadena (sesiones -> tareas, ejercicios en paralelo) — aquí de nuevo se
// junta todo en una sola llamada. A diferencia de la del jugador, esta no
// filtra por fecha ni destinatario: el entrenador ve todas las sesiones
// (hoy, futuras, historial), así que se traen todas de una vez.
export function useBootstrapProgramacion() {
  const cacheKey = "bootstrap:programacion";
  const [data, setData] = useState(() => sharedDataCache.get(cacheKey) || null);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  const [tick, setTick] = useState(0);
  const silencioRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const silencioso = silencioRef.current;
    silencioRef.current = false;
    if (tick === 0 && sharedDataCache.has(cacheKey)) {
      setData(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    if (!silencioso) setLoaded(false);
    api
      .bootstrapProgramacion()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res);
          setData(res);
        }
      })
      .catch(() => {
        if (cancelled || silencioso) return; // refresco en segundo plano fallido: se conservan los datos
        setData({ sesiones: [], tareas: [], ejercicios: [] });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  const refrescarSilencioso = useCallback(() => {
    silencioRef.current = true;
    setTick((t) => t + 1);
  }, []);
  useRefrescarAlVolver(refrescarSilencioso);
  return {
    loaded,
    sesiones: data?.sesiones || [],
    tareas: data?.tareas || [],
    ejercicios: data?.ejercicios || [],
    retry,
  };
}

// ---------- MICROCICLO TIPO (MD-x) ----------
// Se guarda en Supabase (tabla microciclos_tipo, una fila por ámbito: equipo,
// grupo o jugador), así es el mismo en cualquier dispositivo o navegador.
// No toca la carga de las sesiones. Compartido por Control de fatiga (CMJ),
// Calendario y Dashboard.
// Lectura única de lo que una versión anterior guardó en este navegador, solo
// para subirlo a la base de datos la primera vez (no se vuelve a usar después).
function leerMicrociclosLegacy() {
  try {
    return JSON.parse(window.localStorage.getItem("microciclos_v1") || "{}") || {};
  } catch (e) {
    return {};
  }
}
function mensajeErrorMicro(error) {
  const msg = (error && (error.message || String(error))) || "error desconocido";
  if (/microciclos_tipo/.test(msg) && /(relation|does not exist|schema cache|find the table)/i.test(msg)) {
    return "Falta crear la tabla «microciclos_tipo» en Supabase: ejecuta add_microciclos_tipo.sql y recarga.";
  }
  return `No se pudo guardar el microciclo: ${msg}`;
}
export function useMicrociclosTipo() {
  const [todos, setTodos] = useState(() => sharedDataCache.get("microciclos_tipo") || null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (todos !== null) return undefined;
    let off = false;
    (async () => {
      let mapa = {};
      try {
        const { data, error: e } = await supabase.from("microciclos_tipo").select("*");
        if (e) throw e;
        (data || []).forEach((r) => {
          mapa[r.id] = r.config || {};
        });
        // Migración única: lo que había en el navegador pasa a la base de datos.
        const legacy = leerMicrociclosLegacy();
        const pendientes = Object.entries(legacy).filter(([k, v]) => v && typeof v === "object" && !mapa[k]);
        if (pendientes.length) {
          const { error: e2 } = await supabase.from("microciclos_tipo").upsert(pendientes.map(([id, config]) => ({ id, config, updated_at: new Date().toISOString() })), { onConflict: "id" });
          if (!e2) pendientes.forEach(([k, v]) => (mapa[k] = v));
        }
      } catch (e) {
        if (!off) setError(mensajeErrorMicro(e));
      }
      sharedDataCache.set("microciclos_tipo", mapa);
      if (!off) setTodos(mapa);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const actual = todos || {};
  const guardar = async (clave, config) => {
    const previo = actual;
    const nuevo = { ...actual, [clave]: config };
    sharedDataCache.set("microciclos_tipo", nuevo);
    setTodos(nuevo);
    setError("");
    try {
      const { error: e } = await supabase.from("microciclos_tipo").upsert({ id: clave, config, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (e) throw e;
      return true;
    } catch (e) {
      sharedDataCache.set("microciclos_tipo", previo);
      setTodos(previo);
      setError(mensajeErrorMicro(e));
      return false;
    }
  };
  const borrar = async (clave) => {
    const previo = actual;
    const nuevo = { ...actual };
    delete nuevo[clave];
    sharedDataCache.set("microciclos_tipo", nuevo);
    setTodos(nuevo);
    setError("");
    try {
      const { error: e } = await supabase.from("microciclos_tipo").delete().eq("id", clave);
      if (e) throw e;
      return true;
    } catch (e) {
      sharedDataCache.set("microciclos_tipo", previo);
      setTodos(previo);
      setError(mensajeErrorMicro(e));
      return false;
    }
  };
  return { todos: actual, loaded: todos !== null, error, guardar, borrar };
}
function mensajeErrorPartidos(error) {
  const msg = (error && (error.message || String(error))) || "error desconocido";
  if (/partidos/.test(msg) && /(relation|does not exist|schema cache|find the table)/i.test(msg)) {
    return "Falta crear la tabla «partidos» en Supabase: ejecuta paso4_partidos.sql y recarga.";
  }
  return `No se pudo guardar el partido: ${msg}`;
}
// Calendario de partidos reales por ámbito (mismas claves que el microciclo tipo:
// "g:<equipo>", "j:<jugador independiente>" o "equipo"). Un independiente puede
// tener los suyos o ninguno: sin partidos simplemente no hay etiquetas MD.
export function usePartidos() {
  const [lista, setLista] = useState(() => sharedDataCache.get("partidos") || null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (lista !== null) return undefined;
    let off = false;
    (async () => {
      let rows = [];
      let ok = true;
      try {
        const { data, error: e } = await supabase.from("partidos").select("*").order("fecha");
        if (e) throw e;
        rows = (data || []).map((r) => ({ ...r, fecha: normalizarFecha(r.fecha) }));
      } catch (e) {
        ok = false;
        if (!off) setError(mensajeErrorPartidos(e));
      }
      if (ok) sharedDataCache.set("partidos", rows);
      if (!off) setLista(rows);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const actual = lista || [];
  const aplicar = (nueva) => {
    sharedDataCache.set("partidos", nueva);
    setLista(nueva);
  };
  const guardar = async (partido) => {
    const previo = actual;
    const nuevo = { id: partido.id || genId("par"), local: true, competicion: "", rival: "", ...partido };
    aplicar([...actual.filter((x) => x.id !== nuevo.id), nuevo].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)));
    setError("");
    try {
      const { error: e } = await supabase.from("partidos").upsert(nuevo, { onConflict: "id" });
      if (e) throw e;
      return true;
    } catch (e) {
      aplicar(previo);
      setError(mensajeErrorPartidos(e));
      return false;
    }
  };
  const borrar = async (id) => {
    const previo = actual;
    aplicar(actual.filter((x) => x.id !== id));
    setError("");
    try {
      const { error: e } = await supabase.from("partidos").delete().eq("id", id);
      if (e) throw e;
      return true;
    } catch (e) {
      aplicar(previo);
      setError(mensajeErrorPartidos(e));
      return false;
    }
  };
  return { todos: actual, loaded: lista !== null, error, guardar, borrar };
}

// Destinatarios efectivos de una sesión — mismo criterio que
// useDatosDashboardEntrenador / bootstrapJugador: si no hay
// jugadores_destino explícito, la sesión llega a todos los activos.
export function destinatariosEfectivosSesion(sesion, activos) {
  return sesion.jugadores_destino && sesion.jugadores_destino.length ? sesion.jugadores_destino : activos.map((p) => p.id);
}

// Etiqueta "para quién es" una sesión en el Calendario. Si su destino
// explícito coincide EXACTAMENTE con el roster activo de un grupo, se
// etiqueta con el nombre de ese grupo; si no, se describe tal cual — nunca
// se inventa una relación con un grupo que el dato no tiene.
export function etiquetaDestinoSesion(sesion, players, grupos) {
  const destino = sesion.jugadores_destino;
  if (!destino || !destino.length) return "Todo el equipo";
  if (destino.length === 1) {
    const j = players.find((p) => p.id === destino[0]);
    return j ? `${j.name} — individual` : "1 jugador — individual";
  }
  const destinoSet = new Set(destino);
  const grupoExacto = grupos.find((g) => {
    const rosterActivo = players.filter((p) => p.estado === "activo" && (p.gruposIds || []).includes(g.id)).map((p) => p.id);
    return rosterActivo.length === destino.length && rosterActivo.every((id) => destinoSet.has(id));
  });
  return grupoExacto ? `${grupoExacto.nombre} (${destino.length} jug.)` : `${destino.length} jugadores`;
}

// Clave para el vídeo de demostración de una variante concreta. Más simple
// que claveDisenoTarea a propósito: el gesto no cambia con el RIR ni con las
// reps objetivo, solo con el material usado y si es uni o bilateral.
export function claveVideoVariante(material, unilateral) {
  return `${material || "std"}::${unilateral ? "uni" : "bi"}`;
}

// Una "plantilla" es una sesión con nombre. Al publicar una plantilla en el
// calendario se crea una copia con el mismo nombre, así que la biblioteca
// agrupa por nombre: una sola ficha por plantilla (la versión más reciente) y
// todos sus usos (fecha + a quién) juntos, sin duplicados. Usada por
// Biblioteca y por Calendario.
export function agruparPlantillas(sesionesConTareas) {
  const clave = (n) => (n || "").trim().toLowerCase();
  const grupos = new Map();
  sesionesConTareas
    .filter((s) => clave(s.nombre))
    .forEach((s, idx) => {
      const k = clave(s.nombre);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push({ s, idx });
    });
  const hoy = todayStr();
  return [...grupos.values()].map((items) => {
    const maxFecha = (x) => (x.s.fechas || []).slice().sort().reverse()[0] || "";
    // versión de referencia: la que tiene tareas y fecha más reciente (o la última creada)
    const ordenadas = items.slice().sort((a, b) => ((a.s.tareas || []).length ? 1 : 0) - ((b.s.tareas || []).length ? 1 : 0) || maxFecha(a).localeCompare(maxFecha(b)) || a.idx - b.idx);
    const rep = ordenadas[ordenadas.length - 1].s;
    const usos = [];
    items.forEach(({ s }) => (s.fechas || []).forEach((f) => usos.push({ fecha: f, sesion: s })));
    usos.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const pasadosEnviados = usos.filter((u) => u.fecha <= hoy && u.sesion.enviada);
    return { id: rep.id, rep, nombre: rep.nombre, usos, nUsos: pasadosEnviados.length, ultima: pasadosEnviados[0]?.fecha || null, proxima: [...usos].reverse().find((u) => u.fecha > hoy)?.fecha || null };
  });
}

// Resuelve qué vídeo debe verse para una tarea ya construida (ver
// construirTareaVisual) según el registro en curso del jugador. Si la tarea
// deja elegir material y el jugador todavía no ha elegido, no hay vídeo que
// mostrar todavía — se revela justo al elegir.
export function videoEfectivoTarea(tarea, registro) {
  if (tarea.eligeEquipo) {
    const elegido = registro?.subtipo;
    if (!elegido || !tarea.equiposElegibles?.includes(elegido)) return null;
    return tarea.videosPorEquipo?.[elegido] || tarea.gif || null;
  }
  return tarea.gif || null;
}
