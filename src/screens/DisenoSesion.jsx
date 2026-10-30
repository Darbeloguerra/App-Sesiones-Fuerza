import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, BookOpen, Lock, Play } from "lucide-react";
import { ds, dsF, dsR, DsBadge } from "../core/designSystem.jsx";
import { useAnchoVentana, PantallaBase } from "../core/layout.jsx";
import { LoadingBlock, VideoEmbed, CerrablePorFuera, TagChipReal, campoSelectReal, ChipReal, TAGS_DESCRIPTIVOS_BIBLIOTECA } from "../core/components.jsx";
import { genId, ID_PREFIX, api, supabase } from "../core/backend.js";
import {
  sharedDataCache,
  MD_TAGS,
  useCategoriasPreventivas,
  useEntityList,
  useEstadoCmjEquipo,
  useMaterialesDisponibles,
  usePlayers,
  invalidateEntityCache,
  invalidateBootstrapCache,
  resolveEjercicio,
  actualizarZonaEjercicio,
  formatearDetalleTareaCoach,
  parseMateriales,
  miniaturaTarea,
  extractYouTubeId,
  esVideoDirecto,
  CAPACIDADES_RESISTENCIA,
  NOMBRES_TIPO_TRABAJO_RESISTENCIA,
  ETQ_INTENSIDAD_RESISTENCIA,
  MODALIDADES_RESISTENCIA,
  MODALIDADES_ACTIVACION,
  ESTIMACION_POBLACIONAL_RESISTENCIA,
  avisoTransferenciaResistencia,
  fichaResistenciaAplica,
  referenciaResistenciaJugador,
  objetivoJugadorResistencia,
  rangoResistenciaModalidad,
  pautaSugeridaModalidad,
  evaluarIndicadorResistencia,
} from "../core/hooks.js";
import { todayStr, fmtDateShort, diasEntreFechas } from "../calc/fechas.js";
import { cmjMicroDeFecha, cmjVentanasMicrociclo } from "../calc/cmj.js";
import { objetivoDeTexto, evaluarTarea, tiraReferencia, etiquetaRir, aplicarSugerencia, sugerirCarga, zonaPct, zonaRir, implicaciones, OBJETIVOS_SESION } from "../calc/guiaObjetivo.js";
import { ANCHO_MIN_TABLA, EtiquetaAccion, ANCHO_COL, ANCHO_FLECHAS, CeldaDesplegable, CampoSelect, Implicaciones, EtiquetaFija, EtiquetaMaterial, EtiquetaTipo, EtiquetaNota, EtiquetaAviso, FlechasTarea } from "./ControlesTarea.jsx";
import {
  aSegundosDiseno,
  descansoEfectivoSeg,
  descansoRecomendadoSeg,
  trabajoSerieSeg,
  estimarTareaSeg,
  estimarParSeg,
  estimarResistenciaSeg,
  estimarCircuitoSeg,
  emparejarTareasAlternadas,
  estimarBloqueTareasSeg,
  sugerirAlternancias,
  formatearDuracionDiseno,
} from "../calc/duracionTarea.js";

// Microciclos del CMJ con caché compartida (para etiquetar sesiones por fecha
// sin pedirlos en cada pantalla). Se invalida al guardar/borrar un microciclo.
function useCmjMicrociclos() {
  const cacheKey = "cmj_microciclos";
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  useEffect(() => {
    if (sharedDataCache.has(cacheKey)) {
      setItems(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("cmj_microciclos").select("*");
        if (cancelled) return;
        if (!error) {
          sharedDataCache.set(cacheKey, data || []);
          setItems(data || []);
        }
      } catch {
        /* sin microciclos: las etiquetas simplemente no aparecen */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return [items, loaded];
}

// Aviso para el entrenador: jugadores destinatarios en rojo/ámbar según el
// último CMJ. Solo informa, no cambia nada.
function AvisoCmjDestinatariosReal({ estado, players, targetPlayerIds, fechas, desplegable = false }) {
  const [abierto, setAbierto] = useState(false);
  if (!estado || !estado.size) return null;
  const hoy = todayStr();
  const destino = targetPlayerIds === null ? players.filter((p) => p.estado === "activo") : players.filter((p) => targetPlayerIds.includes(p.id));
  const afectados = destino
    .map((p) => ({ p, e: estado.get(p.id) }))
    .filter(({ e }) => e && (e.status === "red" || e.status === "amber"))
    .sort((a, b) => (a.e.status === b.e.status ? 0 : a.e.status === "red" ? -1 : 1));
  if (!afectados.length) return null;
  const haceMax = Math.max(...afectados.map(({ e }) => (e.fechaTest ? diasEntreFechas(e.fechaTest, hoy) : 0)));
  const incluyeHoy = (fechas || []).includes(hoy);
  const nRojos = afectados.filter(({ e }) => e.status === "red").length;
  const nAmbar = afectados.length - nRojos;
  if (desplegable && !abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: ds.ink, cursor: "pointer", textAlign: "left" }}
      >
        <ChevronDown size={14} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 700 }}>Estado CMJ de los destinatarios</span>
        <span style={{ color: ds.inkSecondary }}>
          {nRojos > 0 ? `${nRojos} en rojo` : ""}{nRojos > 0 && nAmbar > 0 ? " · " : ""}{nAmbar > 0 ? `${nAmbar} en ámbar` : ""}
        </span>
      </button>
    );
  }
  return (
    <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "10px 12px", marginBottom: desplegable ? 0 : 18, fontSize: 12.5, color: ds.ink }}>
      <div onClick={desplegable ? () => setAbierto(false) : undefined} style={{ fontWeight: 700, marginBottom: 4, cursor: desplegable ? "pointer" : undefined, display: "flex", alignItems: "center", gap: 6 }}>
        {desplegable && <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />}
        Estado según el último CMJ
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {afectados.map(({ p, e }) => (
          <DsBadge key={p.id} tone={e.status === "red" ? "danger" : "accent"}>
            {p.name} · {e.status === "red" ? "rojo" : "ámbar"}{e.fechaTest ? ` (${fmtDateShort(e.fechaTest)})` : ""}
          </DsBadge>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: ds.inkSecondary }}>
        Dato del último test disponible{haceMax > 0 ? ` (hasta ${haceMax} día${haceMax === 1 ? "" : "s"} de antigüedad)` : ""}. {incluyeHoy ? "El CMJ de hoy suele llegar después de la fuerza: revísalo antes de programar mañana." : "Valora si conviene ajustar la carga de estos jugadores en esta sesión."}
      </div>
    </div>
  );
}

// ---------- Guardado de sesión tolerante a fallos ----------
// Guardar una sesión son muchas escrituras seguidas (sesión, tareas,
// circuitos, borrados). Si la conexión se corta a mitad, antes quedaba una
// sesión ya publicada con tareas a medias, y al reintentar se duplicaban las
// que se habían creado. Ahora: (1) la sesión nueva se crea como borrador y solo
// se publica cuando todo lo demás se ha guardado; (2) las filas nuevas llevan un
// id generado ANTES de escribir y anotado en `parcial`, así un reintento
// reutiliza la sesión y borra las filas huérfanas del intento fallido.
// No es una transacción de base de datos real, pero deja el estado recuperable.
function nuevoEstadoParcial() {
  return { sesionId: null, tareas: [], circuitos: [] };
}
async function guardarFilaConParcial(parcial, tabla, rec) {
  const id = rec.id || genId(ID_PREFIX[tabla] || "id");
  if (!rec.id) {
    if (tabla === "tareas") parcial.tareas.push(id);
    else if (tabla === "circuitos") parcial.circuitos.push(id);
  }
  return api.save(tabla, { ...rec, id });
}

// Convierte un registro de "tareas" del backend en el objeto de trabajo
// (draft) que usan los editores de sesión — un solo mapeo compartido para
// tres casos: editar una sesión existente, reutilizar una pasada como
// plantilla, y (más adelante) cualquier otro sitio que necesite lo mismo.
// Con opts.nuevo=true se genera una key local nueva y se borra tareaId/
// circuito_id/orden — así, al guardar, se crea una fila nueva en vez de
// sobreescribir la tarea original (que sigue intacta en su sesión de origen).
function tareaADraft(t, ejerciciosById, opts = {}) {
  const nuevo = !!opts.nuevo;
  let materiales = [];
  try {
    materiales = t.material ? JSON.parse(t.material) : [];
  } catch {
    materiales = [];
  }
  let resistencia = { tipo: "", capacidad: "", modalidad: "carrera", estructuraManual: false, bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "", recuperacionUnidad: "seg" };
  if (t.resistencia_data) {
    try {
      resistencia = { ...resistencia, ...JSON.parse(t.resistencia_data) };
    } catch {
      /* se queda el valor por defecto */
    }
  } else if (t.bloque_sesion === "Resistencia" && (t.series || t.cantidad || t.rir)) {
    resistencia = { ...resistencia, tipo: "hiit", intervalos: t.series ?? "", tiempo: t.cantidad ?? "", recuperacion: t.rir ?? "" };
  }
  const e = ejerciciosById.get(t.ejercicio_id) || {};
  // Progresión al duplicar: solo tareas de Fuerza pautadas por %1RM. Se guarda
  // el % de origen para poder anular la subida (por tarea o de golpe).
  const pctOrigen = Number(t.pct1rm);
  const progresa = nuevo && Number(opts.pasoProgresion) > 0 && t.bloque_sesion === "Fuerza" && t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null && Number.isFinite(pctOrigen);
  return {
    key: nuevo ? Date.now() + Math.random() : t.id,
    pct1rmOrigen: progresa ? String(pctOrigen) : undefined,
    tareaId: nuevo ? undefined : t.id,
    nombre: e.nombre || "(ejercicio eliminado)",
    ejercicioId: t.ejercicio_id,
    gif: e.gif_url || "",
    modo: t.modo || "reps",
    series: t.series ?? "",
    cantidad: t.cantidad ?? "",
    rir: t.rir ?? "",
    modoCarga: t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
    pct1rm: progresa ? String(Math.min(100, pctOrigen + Number(opts.pasoProgresion))) : t.pct1rm ?? "",
    tipoResistencia: t.tipo_resistencia || "Peso libre",
    materiales,
    lateralidad: t.lateralidad || "bilateral",
    nota: t.nota || "",
    tipoResistenciaCardio: resistencia.tipo,
    capacidad: resistencia.capacidad,
    modalidad: resistencia.modalidad,
    estructuraManual: resistencia.estructuraManual,
    bloques: resistencia.bloques,
    intervalos: resistencia.intervalos,
    tiempo: resistencia.tiempo,
    tiempoUnidad: resistencia.tiempoUnidad,
    intensidad: resistencia.intensidad,
    distancia: resistencia.distancia,
    duracion: resistencia.duracion,
    rpe: resistencia.rpe,
    recuperacion: resistencia.recuperacion,
    recuperacionUnidad: resistencia.recuperacionUnidad,
    circuito_id: nuevo ? "" : t.circuito_id || "",
    orden_en_circuito: nuevo ? "" : t.orden_en_circuito || "",
    // Descanso entre series (segundos; "" = usar el recomendado) y ejercicio
    // con el que se alterna en ese descanso (ver estimarSesionDiseno).
    descanso: t.descanso_seg ?? "",
    alternaCon: t.alterna_con || "",
    alternaConNombre: t.alterna_con ? ejerciciosById.get(t.alterna_con)?.nombre || "" : "",
  };
}

// Agrupa las tareas de un bloque que comparten circuito_id, a partir
// únicamente de la lista de tareas (no hace falta la entidad "circuitos"
// aparte: cada tarea ya sabe a qué circuito y bloque pertenece). Se usa para
// reconstruir el borrador de "reutilizar sesión" sin tener que pedir los
// circuitos al backend sesión por sesión.
function agruparCircuitosDeTareas(tareas, ejerciciosById, nombreBloque, opts = {}) {
  const nuevo = !!opts.nuevo;
  const porCircuito = new Map();
  tareas
    .filter((t) => t.circuito_id && t.bloque_sesion === nombreBloque)
    .forEach((t) => {
      if (!porCircuito.has(t.circuito_id)) porCircuito.set(t.circuito_id, []);
      porCircuito.get(t.circuito_id).push(t);
    });
  return [...porCircuito.entries()].map(([circuitoId, tareasDelCircuito]) => ({
    key: nuevo ? Date.now() + Math.random() : circuitoId,
    circuitoId: nuevo ? undefined : circuitoId,
    tareas: tareasDelCircuito
      .slice()
      .sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0))
      .map((t) => tareaADraft(t, ejerciciosById, opts)),
  }));
}

// "REF. ANTERIOR" en la fila de tarea del entrenador (diseñar sesión): antes
// nunca se rellenaba — tarea.referencia no lo pone nadie — así que siempre
// aparecía "Sin registro previo" aunque el ejercicio ya se hubiera pautado
// antes. Es un recordatorio para el entrenador, no un dato del jugador (una
// sesión puede ir dirigida a varios), así que se calcula a partir de la
// última vez (por fecha ya pasada) que ESTE ejercicio apareció en cualquier
// sesión — sin contar la que se está editando ahora mismo — usando el mismo
// formato que ya se usa en el resumen de Programación.
function useReferenciasPorEjercicio(sesionActualId) {
  const [tareasHistoricas, , tareasHistoricasLoaded] = useEntityList("tareas");
  const [sesionesHistoricas, , sesionesHistoricasLoaded] = useEntityList("sesiones");
  return useMemo(() => {
    if (!tareasHistoricasLoaded || !sesionesHistoricasLoaded) return {};
    const hoy = todayStr();
    const fechaMasRecientePorSesion = new Map();
    sesionesHistoricas.forEach((s) => {
      const fechas = (s.fechas || []).filter((f) => f && f <= hoy);
      if (fechas.length) fechaMasRecientePorSesion.set(s.id, fechas.slice().sort().slice(-1)[0]);
    });
    const porEjercicio = new Map();
    tareasHistoricas.forEach((t) => {
      if (!t.ejercicio_id || t.sesion_id === sesionActualId) return;
      const fecha = fechaMasRecientePorSesion.get(t.sesion_id);
      if (!fecha) return;
      const actual = porEjercicio.get(t.ejercicio_id);
      if (!actual || fecha > actual.fecha) porEjercicio.set(t.ejercicio_id, { fecha, tarea: t });
    });
    const resultado = {};
    porEjercicio.forEach((v, ejercicioId) => {
      resultado[ejercicioId] = formatearDetalleTareaCoach(v.tarea);
    });
    return resultado;
  }, [tareasHistoricas, sesionesHistoricas, tareasHistoricasLoaded, sesionesHistoricasLoaded, sesionActualId]);
}

// ---------- DISEÑAR SESIÓN (calcado de diseno-sesion.jsx) ----------
// Los 6 bloques fijos: Activación y Movilidad no llevan tareas manuales
// (Activación genera su propia tarea de bici; Movilidad es 100% automática
// y todavía no tiene algoritmo de selección — igual que en el propio mockup,
// que tampoco deja editar nada ahí). Preventivo es un interruptor + info,
// sin tareas manuales (selección automática por categoría, sin algoritmo
// todavía). Core, Resistencia y Fuerza sí llevan tareas y circuitos reales.

// "descripcion" es el subtítulo de la CABECERA DEL CONSTRUCTOR (panel
// principal) para cada bloque — calcado literalmente del mockup
// (mockup_diseno_sesion.html, campo "desc" de cada builder-head). No es lo
// mismo que el resumen corto de la navegación lateral, que sale de
// resumenBloque() y sí es dinámico (nº de tareas, automático/manual, etc).
const BLOQUES_DISENO = [
  { id: "activacion", numero: 1, nombre: "Activación", modo: "manual", descripcion: "Bici estática, opcional — se omite si no hay acceso." },
  { id: "movilidad", numero: 2, nombre: "Movilidad", modo: "rotativo", descripcion: "Elige cómo se resuelve este bloque cada sesión." },
  { id: "preventivo", numero: 3, nombre: "Preventivo", modo: "rotativo-categoria", descripcion: "Elige cómo se resuelve este bloque cada sesión." },
  { id: "core", numero: 4, nombre: "Core", modo: "manual", descripcion: "Tareas y circuitos de core, sin carga externa." },
  { id: "resistencia", numero: 5, nombre: "Resistencia", modo: "manual", descripcion: "Elige la capacidad a trabajar y la app sugiere método y rango — tú confirmas los números." },
  { id: "cmj", numero: 6, nombre: "CMJ", modo: "manual", descripcion: "Día de medición de salto — el jugador lo ve señalado en su sesión. No es una tarea configurable: siempre el mismo test." },
  { id: "fuerza", numero: 7, nombre: "Fuerza", modo: "manual", descripcion: "Series, carga (RIR o %1RM) y circuitos. Incluye Específicas." },
];

function IconoBloqueDiseno({ id }) {
  const common = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 1.6 };
  switch (id) {
    case "activacion":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l4-8h4l3 8M10 9l2-3h3" />
        </svg>
      );
    case "movilidad":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 12a8 8 0 0 1 14-5" />
          <path d="M20 12a8 8 0 0 1-14 5" />
          <path d="M18 4v3h-3M6 20v-3h3" />
        </svg>
      );
    case "preventivo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case "core":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="4" y="9" width="16" height="6" rx="1.5" />
          <path d="M4 12h16" />
        </svg>
      );
    case "resistencia":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h3l2-6 4 12 2-6h7" />
        </svg>
      );
    case "cmj":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3v6" />
          <path d="M8 6l4 3 4-3" />
          <path d="M6 21c1-5 3-8 6-8s5 3 6 8" />
          <path d="M4 21h16" />
        </svg>
      );
    case "fuerza":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h2M19 12h2M6 9v6M18 9v6" />
          <rect x="8" y="10.5" width="8" height="3" rx="0.6" />
        </svg>
      );
    default:
      return null;
  }
}

// El motor de "tiempo estimado de sesión y descanso recomendado"
// (aSegundosDiseno, descansoRecomendadoSeg, descansoEfectivoSeg,
// trabajoSerieSeg, estimarTareaSeg, estimarParSeg, estimarResistenciaSeg,
// estimarCircuitoSeg, emparejarTareasAlternadas, estimarBloqueTareasSeg,
// sugerirAlternancias, formatearDuracionDiseno) ahora en
// src/calc/duracionTarea.js — importado arriba.

function CampoEtiquetadoDiseno({ etiqueta, children, w }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, width: w }}>
      <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, whiteSpace: "nowrap" }}>{etiqueta}</span>
      {children}
    </label>
  );
}

function campoStyleDiseno(w) {
  return { width: w, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 5, color: ds.ink, fontFamily: dsF.mono, fontSize: 12, padding: "5px 6px", textAlign: "center", boxSizing: "border-box" };
}

const botonMiniStyleDiseno = { background: "none", border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.inkMuted, cursor: "pointer", fontSize: 12, lineHeight: 1, width: 24, height: 24, flexShrink: 0 };

function SelectorMaterialReal({ seleccionados, disponibles, onCambiar, onAgregarMaterial, compacto = false }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState("");
  const [pos, setPos] = useState(null);
  const botonRef = useRef(null);
  const toggle = (m) => onCambiar(seleccionados.includes(m) ? seleccionados.filter((x) => x !== m) : [...seleccionados, m]);

  // Versión compacta (fila de la tabla, una sola línea): un botón con el resumen y
  // la lista flotando por encima de todo, para que ninguna tarjeta la recorte.
  if (compacto) {
    const resumenMat = seleccionados.length ? `${seleccionados[0]}${seleccionados.length > 1 ? ` +${seleccionados.length - 1}` : ""}` : "Material";
    const abrirLista = () => {
      const r = botonRef.current ? botonRef.current.getBoundingClientRect() : null;
      if (r) setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 290), left: Math.max(8, Math.min(r.left, window.innerWidth - 236)) });
      setAbierto((v) => !v);
    };
    return (
      <div style={{ width: 92, flexShrink: 0 }}>
        <button ref={botonRef} type="button" aria-label="Material" onClick={abrirLista} style={{ width: "100%", height: 38, padding: "0 6px", boxSizing: "border-box", textAlign: "left", fontSize: 12, fontFamily: dsF.sans, fontWeight: seleccionados.length ? 600 : 500, color: seleccionados.length ? ds.ink : ds.inkMuted, background: ds.surface, border: `1px solid ${seleccionados.length ? ds.borderMuted || ds.border : ds.border}`, borderRadius: 10, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {resumenMat} <span style={{ color: ds.inkMuted }}>▾</span>
        </button>
        {abierto && pos && createPortal(
          <div className="ds-reset" style={{ position: "fixed", inset: 0, zIndex: 1300 }} onClick={() => setAbierto(false)}>
            <div onClick={(ev) => ev.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, width: 228, maxHeight: 280, overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 12, boxShadow: "0 12px 28px rgba(0,0,0,0.5)", padding: 6 }}>
              {disponibles.map((m) => {
                const activo = seleccionados.includes(m);
                return (
                  <div key={m} onClick={() => toggle(m)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 8px", borderRadius: 8, cursor: "pointer", fontSize: 14, color: activo ? ds.accent : ds.ink }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accent : "transparent", color: ds.accentInk, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{activo ? "✓" : ""}</span>
                    {m}
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 6, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${ds.border}` }}>
                <input value={nuevoMaterial} onChange={(e) => setNuevoMaterial(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && nuevoMaterial.trim()) { onAgregarMaterial(nuevoMaterial.trim()); setNuevoMaterial(""); } }} placeholder="Añadir material..." style={{ flex: 1, minWidth: 0, minHeight: 44, background: ds.bgElevated, border: `1px dashed ${ds.border}`, borderRadius: 8, color: ds.ink, padding: "0 8px" }} />
                <button type="button" onClick={() => { if (nuevoMaterial.trim()) { onAgregarMaterial(nuevoMaterial.trim()); setNuevoMaterial(""); } }} style={{ width: 44, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 8, cursor: "pointer", fontSize: 18 }}>+</button>
              </div>
              <button type="button" onClick={() => setAbierto(false)} style={{ width: "100%", minHeight: 44, marginTop: 6, borderRadius: 8, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, cursor: "pointer" }}>Listo</button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, marginBottom: 3 }}>MATERIAL</div>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", textAlign: "left", fontSize: 11.5, color: seleccionados.length ? ds.ink : ds.inkMuted, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 5, padding: "5px 8px", cursor: "pointer" }}
      >
        {seleccionados.length ? seleccionados.join(", ") : "Ninguno"}
      </button>
      {abierto && (
        <CerrablePorFuera onCerrar={() => setAbierto(false)}>
        <div style={{ position: "absolute", zIndex: 15, top: "100%", left: 0, marginTop: 4, width: 220, maxHeight: 260, overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 8, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", padding: 6 }}>
          {disponibles.map((m) => {
            const activo = seleccionados.includes(m);
            return (
              <div
                key={m}
                onClick={() => toggle(m)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: activo ? ds.accent : ds.inkSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accent : "transparent", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {activo ? "✓" : ""}
                </span>
                {m}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 5, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${ds.border}` }}>
            <input
              value={nuevoMaterial}
              onChange={(e) => setNuevoMaterial(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              placeholder="Añadir material..."
              style={{ flex: 1, background: ds.bgElevated, border: `1px dashed ${ds.border}`, borderRadius: 5, color: ds.ink, fontSize: 11, padding: "5px 6px" }}
            />
            <button
              onClick={() => {
                if (nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              style={{ background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 5, padding: "0 10px", cursor: "pointer", fontSize: 12 }}
            >
              +
            </button>
          </div>
        </div>
        </CerrablePorFuera>
      )}
    </div>
  );
}

function NotaTareaReal({ nota, onCambiar }) {
  const [abierta, setAbierta] = useState(!!nota);
  if (!abierta) {
    return (
      <button onClick={() => setAbierta(true)} style={{ alignSelf: "flex-start", fontSize: 11, color: ds.inkMuted, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
        + Nota
      </button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>NOTA PARA ESTA TAREA</span>
        {!nota && (
          <button onClick={() => setAbierta(false)} style={{ background: "none", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 11 }}>
            cancelar
          </button>
        )}
      </div>
      <textarea
        value={nota || ""}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Ej. Baja el ritmo si nota molestia..."
        rows={2}
        style={{ width: "100%", boxSizing: "border-box", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.ink, fontSize: 12, padding: "6px 8px", fontFamily: dsF.sans, resize: "vertical" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de ejercicio en modo "resumen" + hoja de edición.
//
// Antes cada ejercicio mostraba ~10 campos pequeños a la vez (muy tedioso en
// móvil). Ahora la fila muestra una línea-resumen ("4 × 5 · 80 % 1RM · 2 min")
// y al tocarla se abre una hoja con botones grandes −/+. En pantalla estrecha
// sube desde abajo; desde 700 px es un panel lateral. Los campos de texto
// miden 16 px en pantallas táctiles (regla global de GlobalStyles) para que
// Safari no haga zoom al enfocarlos.
// ---------------------------------------------------------------------------
function resumenTareaDiseno(tarea, mostrarCarga) {
  const vacio = (v) => v === "" || v == null;
  const unidad = { reps: "", tiempo: " s", minutos: " min", metros: " m" }[tarea.modo] ?? "";
  if (vacio(tarea.series) && vacio(tarea.cantidad)) return { texto: "Sin completar · toca para editar", incompleto: true };
  const partes = [`${vacio(tarea.series) ? "—" : tarea.series} × ${vacio(tarea.cantidad) ? "—" : tarea.cantidad}${unidad}${tarea.lateralidad === "unilateral" ? " /lado" : ""}`];
  let incompleto = vacio(tarea.series) || vacio(tarea.cantidad);
  if (mostrarCarga) {
    if (tarea.modoCarga === "pct1rm") {
      if (vacio(tarea.pct1rm)) {
        incompleto = true;
        partes.push("falta % 1RM");
      } else partes.push(`${tarea.pct1rm} % 1RM`);
    } else if (vacio(tarea.rir)) {
      incompleto = true;
      partes.push("falta RIR");
    } else partes.push(`RIR ${tarea.rir}`);
  }
  if (Number(tarea.series) > 1) {
    const seg = Number(tarea.descanso) || Number(descansoRecomendadoSeg(tarea, mostrarCarga ? "Fuerza" : "Core"));
    if (seg > 0) partes.push(seg % 60 === 0 ? `${seg / 60} min` : `${seg} s`);
  }
  if (tarea.alternaCon) partes.push("↔ alterna");
  if (tarea.nota) partes.push("nota");
  return { texto: partes.join(" · "), incompleto };
}

function StepperDiseno({ etiqueta, valor, onCambiar, min = 0, max = 999, paso = 1, inicio, decimal = false, alerta = false, ayuda }) {
  const n = Number(valor);
  const num = valor === "" || valor == null || Number.isNaN(n) ? null : n;
  const ajustar = (delta) => {
    const base = num == null ? null : num;
    const sig = base == null ? (inicio ?? min) : Math.min(max, Math.max(min, base + delta));
    onCambiar(String(sig));
  };
  const botonStyle = { width: 48, height: 48, borderRadius: 12, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink, fontSize: 22, lineHeight: 1, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 84, flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: ds.inkSecondary }}>{etiqueta}</div>
        {ayuda && <div style={{ fontSize: 10.5, color: ds.inkMuted }}>{ayuda}</div>}
      </div>
      <button type="button" aria-label={`Menos ${etiqueta}`} onClick={() => ajustar(-paso)} style={botonStyle}>−</button>
      <input
        value={valor ?? ""}
        inputMode={decimal ? "decimal" : "numeric"}
        onChange={(e) => onCambiar(e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, ""))}
        placeholder="—"
        style={{ flex: 1, minWidth: 0, height: 48, textAlign: "center", fontWeight: 800, fontFamily: dsF.sans, background: ds.bgElevated, color: alerta ? ds.danger : ds.ink, border: `1px solid ${alerta ? ds.danger : ds.border}`, borderRadius: 12, boxSizing: "border-box" }}
      />
      <button type="button" aria-label={`Más ${etiqueta}`} onClick={() => ajustar(paso)} style={botonStyle}>+</button>
    </div>
  );
}

function SegmentadoDiseno({ etiqueta, opciones, valor, onCambiar }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 84, flexShrink: 0, fontSize: 13, color: ds.inkSecondary }}>{etiqueta}</div>
      <div style={{ flex: 1, display: "flex", gap: 4, padding: 4, borderRadius: 12, background: ds.bgElevated, border: `1px solid ${ds.border}` }}>
        {opciones.map((o) => {
          const activo = o.v === valor;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onCambiar(o.v)}
              style={{ flex: 1, minHeight: 40, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: dsF.sans, fontSize: 13, fontWeight: activo ? 700 : 600, background: activo ? ds.accentSubtle : "transparent", color: activo ? ds.accent : ds.inkSecondary, touchAction: "manipulation" }}
            >
              {o.t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function datosSuperserie(tareas) {
  let grupo = 0;
  let dentro = 0;
  return tareas.map((t, i) => {
    const ant = tareas[i - 1];
    const sig = tareas[i + 1];
    const conAnt = !!ant && !!ant.alternaCon && ant.alternaCon === t.ejercicioId;
    const conSig = !!sig && !!t.alternaCon && t.alternaCon === sig.ejercicioId;
    if (conAnt) dentro += 1;
    else {
      grupo += 1;
      dentro = 1;
    }
    const letra = String.fromCharCode(65 + ((grupo - 1) % 26));
    return { etiqueta: conAnt || conSig ? `${letra}${dentro}` : letra, conAnt, conSig, puedeEnlazar: !!sig && !!t.ejercicioId && !!sig.ejercicioId };
  });
}

// Guía por objetivo de la sesión: rango de RIR y, para cada nº de repeticiones,
// el %1RM que lo deja (ver calc/guiaObjetivo.js para la base científica).
function BannerGuiaObjetivo({ objetivo }) {
  const tira = tiraReferencia(objetivo, 6);
  const chip = { fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkSecondary, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" };
  return (
    <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 11.5, color: ds.ink }}>
      <span style={{ whiteSpace: "nowrap" }}>
        <b>{objetivo.etiqueta}</b> · <b style={{ color: ds.accent }}>{etiquetaRir(objetivo)}</b>
      </span>
      {!objetivo.zonas && tira.map((x) => (
        <span key={x.reps} style={chip}>{x.reps} rep{x.reps === 1 ? "" : "s"} <b style={{ color: ds.ink }}>{x.texto}</b></span>
      ))}
      {objetivo.zonas && objetivo.zonas.map((z) => (
        <span key={z.tipo} title={z.ejemplos} style={chip}>{z.tipo} <b style={{ color: ds.ink }}>{z.rango}</b></span>
      ))}
      <span style={{ fontSize: 10, color: ds.inkMuted, flex: "1 1 160px", minWidth: 0 }} title={objetivo.nota || ""}>
        {objetivo.zonas ? "% del 1RM. " : "% del 1RM que deja ese RIR. "}{objetivo.fuenteZonas || objetivo.fuente}
      </span>
    </div>
  );
}

// Encabezado de columnas de la tabla (iPad horizontal): las columnas tienen los
// mismos anchos que las celdas de FilaTareaReal para que queden alineadas.
function EncabezadoTablaTareas({ mostrarCarga }) {
  const col = (t) => <span key={t} style={{ width: ANCHO_COL, flexShrink: 0, textAlign: "center", fontFamily: dsF.sans, fontSize: 9.5, fontWeight: 600, color: ds.inkMuted, whiteSpace: "nowrap" }}>{t}</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 9px 0 13px" }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: dsF.sans, fontSize: 10, fontWeight: 600, color: ds.inkMuted }}>Ejercicio</span>
      {col("Series")}
      {col("Repeticiones")}
      {mostrarCarga && col("RIR")}
      {mostrarCarga && col("%1RM")}
      {col("Recuperación")}
      <span style={{ width: ANCHO_FLECHAS, flexShrink: 0 }} />
    </div>
  );
}

function estiloCeldaTabla(alerta) {
  return { width: "100%", height: 34, textAlign: "center", fontWeight: 700, fontSize: 13, fontFamily: dsF.sans, background: ds.surface, border: `1px solid ${alerta ? ds.danger : ds.border}`, borderRadius: 10, color: alerta ? ds.danger : ds.ink, boxSizing: "border-box" };
}
function celdaTabla(etiqueta, valor, onCambiar, placeholder, ancho, unidad = "", apagada = false, resaltarSiTiene = false) {
  const tiene = valor !== "" && valor != null;
  return (
    <div key={etiqueta} style={{ position: "relative", width: ancho, flexShrink: 0, opacity: apagada ? 0.5 : 1 }}>
      <input aria-label={etiqueta} value={valor ?? ""} inputMode="numeric" onChange={(e) => onCambiar(e.target.value.replace(/[^0-9]/g, ""))} placeholder={placeholder} style={{ ...estiloCeldaTabla(false), ...(resaltarSiTiene && tiene ? { borderColor: ds.accent, color: ds.accent } : null) }} />
      {unidad && tiene && <span style={{ position: "absolute", right: 6, bottom: 3, fontSize: 9, color: ds.inkMuted, pointerEvents: "none" }}>{unidad}</span>}
    </div>
  );
}

// Contenido de la fila en modo tabla (iPad horizontal): nombre con etiquetas
// (tipo, material, nota, aviso), cinco cajones iguales con desplegable y flechas.
function ControlesFilaTabla({ tarea, onCambiar, mostrarCarga, objetivoGuia, evalGuia, fueraRango, orden, superserie, onSubir, onBajar, onEliminar, materialesDisponibles, onAgregarMaterial, movil = false, onVerVideo = null }) {
  const modo = tarea.modo || "reps";
  const enSuper = !!superserie && (superserie.conAnt || superserie.conSig);
  const modos = mostrarCarga ? ["reps", "tiempo", "minutos", "metros"] : ["reps", "tiempo", "minutos"];
  const etqModo = { reps: "Repeticiones", tiempo: "Segundos", minutos: "Minutos", metros: "Metros" };
  const unidad = ({ reps: "", tiempo: "s", minutos: "min", metros: "m" })[modo] || "";
  const nums = (arr) => arr.map((v) => ({ v: String(v), t: String(v) }));
  const valoresCant = { reps: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15], tiempo: [10, 15, 20, 30, 40, 45, 60, 90, 120], minutos: [1, 2, 3, 5, 8, 10, 15, 20, 30], metros: [10, 20, 30, 40, 50, 100, 200, 400] }[modo] || [];
  const conGuia = !!objetivoGuia && mostrarCarga && modo === "reps";
  const sug = conGuia ? sugerirCarga(objetivoGuia, tarea.cantidad, tarea.tipoMov) : null;
  const textoSug = sug ? `Sugerido para ${Math.round(Number(tarea.cantidad))} reps: RIR ${sug.rir}${sug.pct1rm != null ? ` · ${sug.pct1rm} %` : ""}` : null;
  const zr = conGuia ? zonaRir(objetivoGuia) : null;
  const zp = conGuia ? zonaPct(objetivoGuia, { reps: tarea.cantidad, tipoMov: tarea.tipoMov }) : null;
  const rirOpc = [0, 1, 2, 3, 4, 5, 6].map((v) => ({ v: String(v), t: v === 6 ? "6 o más" : String(v), zona: !!zr && v >= zr.min && (zr.max == null || v <= zr.max), nota: !!zr && v >= zr.min && (zr.max == null || v <= zr.max) ? "zona" : "" }));
  const pctOpc = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((v) => { const z = !!zp && v >= zp.min && v <= zp.max; return { v: String(v), t: `${v} %`, zona: z, nota: z ? "zona" : "" }; });
  const textoZonaPct = zp ? (zp.min === 0 ? `≤${zp.max}` : `${zp.min}–${zp.max}`) : "";
  const tipoTxt = objetivoGuia?.zonas ? (tarea.tipoMov === "pliometrico" ? "Pliométrico" : "No pliométrico") : "";
  const rirAlto = tarea.rir !== "" && tarea.rir != null && Number(tarea.rir) > 10;
  const autoRec = Number(tarea.series) > 1 ? String(Number(descansoRecomendadoSeg(tarea, mostrarCarga ? "Fuerza" : "Core")) || "—") : "—";
  const claseLetra = enSuper ? { background: ds.accent, color: ds.accentInk } : { background: ds.border, color: ds.accent };
  const letra = orden != null && (
    <span style={{ minWidth: 26, height: 26, padding: "0 5px", boxSizing: "border-box", borderRadius: 8, ...claseLetra, fontFamily: dsF.mono, fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{orden}</span>
  );
  const nombre = <span style={{ color: ds.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.25, overflowWrap: "break-word" }}>{tarea.nombre}</span>;
  const etiquetas = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {tarea.lateralidad === "unilateral" && <EtiquetaFija texto="Unilateral" />}
      {mostrarCarga && objetivoGuia?.zonas && <EtiquetaTipo tarea={tarea} onCambiar={onCambiar} />}
      <EtiquetaMaterial tarea={tarea} onCambiar={onCambiar} disponibles={materialesDisponibles} onAgregarMaterial={onAgregarMaterial} mostrarCarga={mostrarCarga} />
      <EtiquetaNota tarea={tarea} onCambiar={onCambiar} />
      {onVerVideo && <EtiquetaAccion texto="▶ Vídeo" ariaLabel="Ver vídeo" onClick={onVerVideo} />}
      {fueraRango && <EtiquetaAviso mensaje={evalGuia.mensaje} />}
    </div>
  );
  const flechas = <FlechasTarea onSubir={onSubir} onBajar={onBajar} onEliminar={onEliminar} />;
  const celdas = (
    <>
      <CeldaDesplegable movil={movil} etiqueta="Series" titulo="Series" valor={tarea.series} onCambiar={(v) => onCambiar({ ...tarea, series: v })} opciones={nums([1, 2, 3, 4, 5, 6, 8])} />
      <CeldaDesplegable movil={movil} etiqueta="Repeticiones" titulo={etqModo[modo] || "Cantidad"} subtitulo="por serie" valor={tarea.cantidad} sufijo={unidad} onCambiar={(v) => onCambiar({ ...tarea, cantidad: v })} opciones={nums(valoresCant)}
        extra={(
          <div style={{ display: "flex", gap: 8 }}>
            <CampoSelect etiqueta="Medido en" valor={modo} onCambiar={(v) => onCambiar({ ...tarea, modo: v })} opciones={modos.map((m) => ({ v: m, t: etqModo[m] }))} />
            <CampoSelect etiqueta="Lado" valor={tarea.lateralidad === "unilateral" ? "unilateral" : "bilateral"} onCambiar={(v) => onCambiar({ ...tarea, lateralidad: v })} opciones={[{ v: "bilateral", t: "Bilateral" }, { v: "unilateral", t: "Unilateral" }]} />
          </div>
        )}
        pie={mostrarCarga && modo === "reps" ? <Implicaciones datos={implicaciones("reps", objetivoGuia)} sugerencia={sug ? `Rellena RIR ${sug.rir}${sug.pct1rm != null ? ` · ${sug.pct1rm} %` : ""}` : null} /> : null} />
      {mostrarCarga && (
        <>
          <CeldaDesplegable movil={movil} etiqueta="RIR" titulo="RIR" subtitulo={conGuia ? `${objetivoGuia.etiqueta} · zona ${etiquetaRir(objetivoGuia).replace("RIR ", "")}` : "repeticiones en reserva"} valor={tarea.rir} alerta={rirAlto} onCambiar={(v) => onCambiar({ ...tarea, rir: v })} opciones={rirOpc}
            pie={<Implicaciones datos={implicaciones("rir", objetivoGuia)} sugerencia={textoSug} />} />
          <CeldaDesplegable movil={movil} etiqueta="%1RM" titulo="% del 1RM" subtitulo={conGuia && textoZonaPct ? `${objetivoGuia.etiqueta}${tipoTxt ? ` · ${tipoTxt}` : ""} · zona ${textoZonaPct}` : ""} valor={tarea.pct1rm} onCambiar={(v) => onCambiar({ ...tarea, pct1rm: v, pct1rmOrigen: undefined })} opciones={pctOpc}
            pie={<Implicaciones datos={implicaciones("pct", objetivoGuia)} sugerencia={textoSug} />} />
        </>
      )}
      <CeldaDesplegable movil={movil} etiqueta="Recuperación" titulo="Recuperación" subtitulo="segundos entre series" valor={tarea.descanso} placeholder={autoRec} apagada={Number(tarea.series) <= 1} resaltar onCambiar={(v) => onCambiar({ ...tarea, descanso: v })} autoOpcion={`Automático (${autoRec} s)`} opciones={nums([30, 45, 60, 90, 120, 150, 180, 240, 300])} />
    </>
  );
  if (movil) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {letra}
          <div style={{ flex: 1, minWidth: 0 }}>{nombre}</div>
          {flechas}
        </div>
        {etiquetas}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${mostrarCarga ? 5 : 3}, minmax(0, 1fr))`, gap: 4 }}>{celdas}</div>
      </div>
    );
  }
  return (
    <>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
        {letra}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          {nombre}
          {etiquetas}
        </div>
      </div>
      {celdas}
      {flechas}
    </>
  );
}

function FilaTareaReal({ tarea, onCambiar, onEliminar, mostrarCarga, materialesDisponibles, onAgregarMaterial, orden, onSubir, onBajar, referenciasPorEjercicio, onAmpliarVideo, superserie = null, onAlternarEnlace = null, objetivoGuia = null }) {
  // Una sola fila para todos los tamaños: en pantalla ancha todo en una línea;
  // en móvil, en dos niveles. Siempre con los mismos desplegables.
  const movil = useAnchoVentana() < ANCHO_MIN_TABLA;
  // Veredicto frente al objetivo de la sesión (solo fuerza con repeticiones).
  const evalGuia = objetivoGuia && mostrarCarga && (tarea.modo || "reps") === "reps" ? evaluarTarea(objetivoGuia, { reps: tarea.cantidad, rir: tarea.rir, pct1rm: tarea.pct1rm, modoCarga: tarea.modoCarga }) : null;
  const fueraRango = evalGuia && evalGuia.estado !== "dentro";
  // Con objetivo de sesión, RIR y %1RM se rellenan solos al poner las repeticiones.
  // Si el entrenador escribe RIR o % a mano, deja de actualizarse (cargaAuto=false).
  const cambiarOriginal = onCambiar;
  onCambiar = (nuevo) => {
    let t = nuevo;
    const editoCarga = String(nuevo.rir ?? "") !== String(tarea.rir ?? "") || String(nuevo.pct1rm ?? "") !== String(tarea.pct1rm ?? "");
    if (editoCarga) t = { ...t, cargaAuto: false };
    else if (objetivoGuia && mostrarCarga && (String(nuevo.cantidad ?? "") !== String(tarea.cantidad ?? "") || String(nuevo.tipoMov ?? "") !== String(tarea.tipoMov ?? ""))) t = aplicarSugerencia(objetivoGuia, t);
    // Sin selector "Carga por": si hay %1RM manda el % (el jugador ve además el RIR); si no, el RIR.
    if (mostrarCarga && (editoCarga || t !== nuevo)) t = { ...t, modoCarga: Number(t.pct1rm) > 0 ? "pct1rm" : "rir" };
    cambiarOriginal(t);
  };
  const tieneVideoJugable = tarea.gif && (extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif));
  const resumen = resumenTareaDiseno(tarea, mostrarCarga);

  // Una tarea recién añadida llega con la marca abrirEditor: se borra enseguida
  // para que no se guarde.
  useEffect(() => {
    if (tarea.abrirEditor) onCambiar({ ...tarea, abrirEditor: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarea.abrirEditor]);

  const enSuperserie = !!superserie && (superserie.conAnt || superserie.conSig);
  return (
    <>
    <div style={{ padding: movil ? (enSuperserie ? "10px 8px 10px 7px" : "10px") : (enSuperserie ? "7px 8px 7px 9px" : "7px 8px 7px 12px"), minHeight: movil ? undefined : 56, boxSizing: "border-box", background: ds.bgElevated, borderRadius: 10, border: `1px solid ${resumen.incompleto ? ds.accentBorderSubtle : ds.border}`, borderLeft: enSuperserie ? `4px solid ${ds.accent}` : undefined, display: "flex", alignItems: "center", gap: 4 }}>
      <ControlesFilaTabla tarea={tarea} onCambiar={onCambiar} mostrarCarga={mostrarCarga} objetivoGuia={objetivoGuia} evalGuia={evalGuia} fueraRango={fueraRango} orden={orden} superserie={superserie} onSubir={onSubir} onBajar={onBajar} onEliminar={onEliminar} materialesDisponibles={materialesDisponibles} onAgregarMaterial={onAgregarMaterial} movil={movil} onVerVideo={tieneVideoJugable && onAmpliarVideo ? () => onAmpliarVideo(tarea.gif) : null} />
    </div>
    {onAlternarEnlace && superserie && superserie.puedeEnlazar && (
      <button
        type="button"
        onClick={onAlternarEnlace}
        title={superserie.conSig ? "Separar estos dos ejercicios" : "Unir este ejercicio con el siguiente en una superserie (alternan en el descanso)"}
        style={{ alignSelf: "center", minHeight: 36, padding: "0 14px", borderRadius: 999, border: `1px ${superserie.conSig ? "solid" : "dashed"} ${superserie.conSig ? ds.accent : ds.border}`, background: superserie.conSig ? ds.accentSubtle : "transparent", color: superserie.conSig ? ds.accent : ds.inkMuted, fontFamily: dsF.sans, fontSize: 12.5, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        {superserie.conSig ? "⛓ Superserie · separar" : "⛓ Unir con el siguiente"}
      </button>
    )}
    </>
  );
}

// Línea de indicador bajo un campo numérico de Resistencia — SIEMPRE
// reserva su alto (minHeight), esté vacía o no, para que un campo con
// semáforo/diferencia y otro sin ninguno de los dos midan lo mismo fila
// tras fila (réplica del criterio de `.ind{min-height:11px}` del mockup,
// con los tokens de color ya existentes en ds, no un sistema nuevo).
function IndicadorResistencia({ resultado }) {
  return (
    <span
      style={{ fontFamily: dsF.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.02em", minHeight: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: resultado ? resultado.color : "transparent" }}
      title={resultado?.titulo || undefined}
    >
      {resultado ? resultado.texto : " "}
    </span>
  );
}

// Un número + su indicador reservado debajo — la unidad de campo básica de
// Resistencia (equivalente a campoNum() en el mockup).
function CampoNumResistencia({ etiqueta, valor, onCambiar, resultado, w }) {
  return (
    <CampoEtiquetadoDiseno etiqueta={etiqueta} w={w}>
      <input value={valor ?? ""} onChange={(e) => onCambiar(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
      <IndicadorResistencia resultado={resultado} />
    </CampoEtiquetadoDiseno>
  );
}

// Un número + un selector de MIN/SEG al lado + indicador reservado debajo —
// se repite para tiempo y para recuperación en los tres tipos de trabajo de
// Resistencia.
function CampoTiempoConUnidadDiseno({ etiqueta, valor, unidad, onCambiarValor, onCambiarUnidad, resultado, w }) {
  return (
    <CampoEtiquetadoDiseno etiqueta={etiqueta} w={w}>
      <div style={{ display: "flex", gap: 4 }}>
        <input value={valor ?? ""} onChange={(e) => onCambiarValor(e.target.value)} placeholder="—" style={{ ...campoStyleDiseno("100%"), flex: 1, minWidth: 0 }} />
        <select value={unidad || "seg"} onChange={(e) => onCambiarUnidad(e.target.value)} style={{ background: ds.border, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.inkSecondary, fontSize: 10.5, padding: "0 3px" }}>
          <option value="min">min</option>
          <option value="seg">seg</option>
        </select>
      </div>
      <IndicadorResistencia resultado={resultado} />
    </CampoEtiquetadoDiseno>
  );
}

// Ficha de jugador: traduce el % del campo de intensidad a algo ejecutable
// (un pulso o un ritmo), con el test real del jugador si existe o la
// estimación poblacional si no. Oculta cuando !fichaResistenciaAplica
// (RPE en HIIT/RSA sin impacto: el propio campo ya es la instrucción, no
// hay nada que traducir). jugadorReferencia es null cuando la sesión no
// tiene un único jugador destinatario claro (todo el equipo o varios
// jugadores a la vez) — en ese caso se usa siempre la estimación
// poblacional, porque no hay un jugador único al que anclar el número.
function FichaJugadorResistencia({ tipo, modalidad, intensidad, distancia, jugadorReferencia }) {
  if (!fichaResistenciaAplica(tipo, modalidad)) return null;
  const metric = tipo === "continuo" ? "fcMax" : "vam";
  const ref = referenciaResistenciaJugador(metric, jugadorReferencia);
  const etiqueta = metric === "fcMax" ? "FCmáx" : "VAM";
  const unidad = metric === "fcMax" ? "ppm" : "km/h";
  const v = Number(intensidad);
  const sinValor = intensidad === "" || intensidad == null || isNaN(v);
  const aviso = metric === "fcMax" ? avisoTransferenciaResistencia(modalidad) : "";
  const objetivo = !sinValor ? objetivoJugadorResistencia(tipo, intensidad, distancia, jugadorReferencia) : "";
  const sinTest = !ref.real;
  return (
    <div
      style={{
        marginTop: 2,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        fontSize: 11,
        padding: "8px 10px",
        borderRadius: 8,
        background: sinTest ? `${ds.warning}22` : ds.surface,
        border: sinTest ? `1px solid ${ds.warning}` : `1px dashed ${ds.borderSoft}`,
      }}
    >
      <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.03em", color: sinTest ? ds.warning : ds.inkMuted, textTransform: "uppercase", flexShrink: 0 }}>
        {sinTest ? "Sin test de campo" : jugadorReferencia.name}
      </span>
      <span style={{ color: ds.inkSecondary, flex: "1 1 200px" }}>
        {sinTest ? (
          <>
            {jugadorReferencia ? `${jugadorReferencia.name} no tiene ${etiqueta} registrada` : "Sesión sin un único jugador destinatario"} — se usa la {ESTIMACION_POBLACIONAL_RESISTENCIA[metric].fuente}: ≈{ref.valor} {unidad}
            {objetivo && (
              <>
                {" "}
                → hoy a {v}%: <b style={{ color: ds.ink }}>{objetivo}</b>
              </>
            )}
            . Pide un VAM-Eval, 30-15 IFT o Course Navette para un objetivo real, no aproximado.{aviso}
          </>
        ) : (
          <>
            {etiqueta} {ref.valor} {unidad}
            {ref.protocolo ? ` (${ref.protocolo}${ref.fecha ? `, ${ref.fecha}` : ""})` : ""}
            {objetivo && (
              <>
                {" "}
                → hoy a {v}%: <b style={{ color: ds.ink }}>{objetivo}</b>
              </>
            )}
            {aviso}
          </>
        )}
      </span>
    </div>
  );
}

// Tarea de Resistencia. Antes: un select libre de "tipo de trabajo"
// (Continuo/HIIT/RSA) sin ninguna guía. Ahora: se elige una CAPACIDAD
// OBJETIVO (R0-R6) con su pauta recomendada editable/aplicable — la
// estructura (Continuo/HIIT/RSA) la deriva la capacidad elegida, salvo que
// el entrenador la fuerce manualmente a propósito (caso excepcional). La
// MODALIDAD decide qué métrica sirve de referencia: FCmáx/VAM en Carrera,
// esfuerzo percibido (RPE) en Bici/Elíptica/Piscina/Otro para HIIT y RSA
// (Continuo sigue siendo FCmáx en cualquier modalidad — el pulso es válido
// pedalear o nadando, la VAM no). Traslado fiel de
// mockup_diseno_sesion.html (campoResistencia, renderCamposHtml,
// cambiarCapacidadResistencia, cambiarEstructuraManual, cambiarModalidad,
// actualizarIndicadores) a props/estado de React reales.
function CampoResistenciaTareaReal({ tarea, onCambiar, orden, onSubir, onBajar, onEliminar, jugadorReferencia, ejercicios, onEjercicioCreado, onAmpliarVideo }) {
  const [forzandoEstructura, setForzandoEstructura] = useState(false);
  const tipo = tarea.tipoResistenciaCardio || "";
  const modalidad = tarea.modalidad || "carrera";
  const sinImpacto = modalidad !== "carrera";
  const capacidad = tarea.capacidad || "";
  const capacidadObj = capacidad ? CAPACIDADES_RESISTENCIA[capacidad] : null;
  const set = (campo) => (valor) => onCambiar({ ...tarea, [campo]: valor });
  const camposVacios = { bloques: "", series: "", intervalos: "", tiempo: "", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "" };

  const cambiarCapacidad = (capId) => {
    const c = CAPACIDADES_RESISTENCIA[capId];
    setForzandoEstructura(false);
    onCambiar({ ...tarea, ...camposVacios, capacidad: capId, tipoResistenciaCardio: c.tipo, estructuraManual: false });
  };
  // La modalidad (Carrera/Bici/Elíptica/Piscina/Otro) ES la elección de
  // "qué ejercicio" para una tarea de Resistencia — ya no hace falta pasar
  // primero por el buscador de la Biblioteca. Al cambiarla, se resuelve (o
  // se crea si no existe todavía) el ejercicio con ese mismo nombre, para
  // que la tarea siga teniendo un ejercicio_id válido al guardar.
  const cambiarModalidadTarea = async (nuevaModalidad) => {
    const nombreModalidad = MODALIDADES_RESISTENCIA[nuevaModalidad];
    try {
      const creado = await resolveEjercicio(ejercicios || [], { nombre: nombreModalidad, bloque: "", tags_descriptivos: [] });
      onEjercicioCreado?.(creado);
      onCambiar({ ...tarea, ...camposVacios, modalidad: nuevaModalidad, nombre: creado.nombre, ejercicioId: creado.id, gif: creado.gif_url || "" });
    } catch (e) {
      // Si falla el guardado (sin conexión), al menos se cambia la
      // modalidad en local — el nombre/ejercicio se reintentará la próxima
      // vez que se toque este campo.
      onCambiar({ ...tarea, ...camposVacios, modalidad: nuevaModalidad });
    }
  };
  const cambiarEstructuraManual = (nuevoTipo) => {
    setForzandoEstructura(false);
    onCambiar({ ...tarea, ...camposVacios, tipoResistenciaCardio: nuevoTipo, estructuraManual: nuevoTipo !== capacidadObj?.tipo });
  };
  const aplicarPautaSugerida = () => {
    if (!capacidadObj) return;
    const s = pautaSugeridaModalidad(capacidadObj, sinImpacto);
    onCambiar({
      ...tarea,
      ...camposVacios,
      tipoResistenciaCardio: capacidadObj.tipo,
      estructuraManual: false,
      bloques: s.bloques ?? "",
      series: s.series ?? "",
      intervalos: s.intervalos ?? "",
      tiempo: s.tiempo ?? "",
      tiempoUnidad: s.tiempoUnidad || tarea.tiempoUnidad || "seg",
      intensidad: s.intensidad ?? "",
      distancia: s.distancia ?? "",
      duracion: s.duracion ?? "",
      rpe: s.rpe ?? "",
      recuperacion: s.recuperacion ?? "",
      recuperacionUnidad: s.recuperacionUnidad || tarea.recuperacionUnidad || "seg",
    });
  };

  const ind = (key) => evaluarIndicadorResistencia(key, tarea[key], capacidadObj);

  const tieneVideoJugable = tarea.gif && (extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif));

  return (
    <div style={{ padding: "10px 12px", background: ds.bgElevated, borderRadius: 8, border: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {tarea.gif && (miniaturaTarea(tarea.gif) || extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif)) && (
          <button
            type="button"
            onClick={() => tieneVideoJugable && onAmpliarVideo?.(tarea.gif)}
            title={tieneVideoJugable ? "Ver vídeo" : undefined}
            style={{ position: "relative", width: 32, height: 32, borderRadius: dsR.md, flexShrink: 0, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", border: "none", padding: 0, cursor: tieneVideoJugable ? "pointer" : "default" }}
          >
            {miniaturaTarea(tarea.gif) && (
              <img src={miniaturaTarea(tarea.gif)} alt="" style={{ width: 32, height: 32, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
            )}
            {tieneVideoJugable && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(tarea.gif) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
                <Play size={11} color={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} fill={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} />
              </div>
            )}
          </button>
        )}
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: ds.border, color: ds.accent, fontFamily: dsF.mono, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        <div style={{ color: ds.ink, fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{tarea.nombre}</div>
        {onSubir && (
          <button onClick={onSubir} style={botonMiniStyleDiseno} title="Mover antes">
            ↑
          </button>
        )}
        {onBajar && (
          <button onClick={onBajar} style={botonMiniStyleDiseno} title="Mover después">
            ↓
          </button>
        )}
        <button onClick={onEliminar} style={botonMiniStyleDiseno} title="Quitar tarea">
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>MODALIDAD</span>
        <select
          value={modalidad}
          onChange={(e) => cambiarModalidadTarea(e.target.value)}
          style={{ width: 180, fontFamily: dsF.sans, fontSize: 11.5, fontWeight: 600, padding: "6px 9px", borderRadius: 6, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink }}
        >
          {Object.entries(MODALIDADES_RESISTENCIA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>CAPACIDAD OBJETIVO</span>
        <select
          value={capacidad}
          onChange={(e) => cambiarCapacidad(e.target.value)}
          style={{ width: 280, fontFamily: dsF.sans, fontSize: 11.5, fontWeight: 600, padding: "6px 9px", borderRadius: 6, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink }}
        >
          <option value="" disabled>
            Elige la capacidad a trabajar…
          </option>
          {Object.entries(CAPACIDADES_RESISTENCIA).map(([k, v]) => (
            <option key={k} value={k}>
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      {!capacidadObj && <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Elige la capacidad objetivo para ver la pauta recomendada y configurar los campos.</div>}

      {capacidadObj && (
        <>
          <div style={{ background: ds.surface, border: `1px solid ${ds.borderSoft}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: dsF.mono,
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  color: capacidadObj.alerta ? ds.warning : ds.accent,
                  background: capacidadObj.alerta ? `${ds.warning}22` : ds.accentSubtle,
                  border: `1px solid ${capacidadObj.alerta ? ds.warning : ds.accentBorderSubtle}`,
                  borderRadius: 5,
                  padding: "3px 7px",
                }}
              >
                {capacidadObj.alerta ? "⚠ Zona gris — usar con criterio" : "Pauta recomendada"}
              </span>
              <button
                type="button"
                onClick={aplicarPautaSugerida}
                style={{ fontFamily: dsF.sans, fontSize: 10.5, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}
              >
                Aplicar pauta sugerida
              </button>
            </div>
            <div style={{ fontFamily: dsF.sans, fontSize: 12, fontWeight: 600, color: ds.ink }}>{capacidadObj.metodo}</div>
            <div style={{ fontFamily: dsF.sans, fontSize: 12, fontWeight: 600, color: ds.ink }}>
              {rangoResistenciaModalidad(capacidadObj, sinImpacto)}
              {capacidadObj.lactato !== "—" ? ` · Lactato ${capacidadObj.lactato}` : ""}
            </div>
            <div style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: 1.5 }}>{capacidadObj.nota}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>ESTRUCTURA</span>
            {forzandoEstructura ? (
              <select
                value={tipo}
                onChange={(e) => cambiarEstructuraManual(e.target.value)}
                style={{ width: 150, fontFamily: dsF.sans, fontSize: 11, fontWeight: 600, padding: "5px 8px", borderRadius: 6, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink }}
              >
                {["continuo", "hiit", "rsa"].map((t) => (
                  <option key={t} value={t}>
                    {NOMBRES_TIPO_TRABAJO_RESISTENCIA[t]}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontFamily: dsF.sans, fontSize: 11.5, fontWeight: 600, color: ds.ink, background: ds.surface, border: `1px solid ${ds.borderSoft}`, borderRadius: 6, padding: "3px 9px" }}>
                {NOMBRES_TIPO_TRABAJO_RESISTENCIA[tipo]}
                {tarea.estructuraManual ? " · forzado manualmente" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => setForzandoEstructura((v) => !v)}
              style={{ marginLeft: "auto", fontFamily: dsF.sans, fontSize: 10, color: ds.inkMuted, background: "transparent", border: "none", textDecoration: "underline dotted", textUnderlineOffset: 2, cursor: "pointer", padding: 0 }}
            >
              {forzandoEstructura ? "cancelar" : "Forzar estructura manual"}
            </button>
          </div>

          {tipo === "continuo" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CampoNumResistencia etiqueta="SERIES" valor={tarea.series} onCambiar={set("series")} resultado={ind("series")} w={60} />
              <CampoTiempoConUnidadDiseno etiqueta="TIEMPO" valor={tarea.tiempo} unidad={tarea.tiempoUnidad} onCambiarValor={set("tiempo")} onCambiarUnidad={set("tiempoUnidad")} resultado={ind("tiempo")} w={100} />
              <CampoNumResistencia etiqueta={ETQ_INTENSIDAD_RESISTENCIA.continuo} valor={tarea.intensidad} onCambiar={set("intensidad")} resultado={ind("intensidad")} w={148} />
              <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} resultado={ind("recuperacion")} w={100} />
            </div>
          )}

          {tipo === "hiit" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CampoNumResistencia etiqueta="BLOQUES" valor={tarea.bloques} onCambiar={set("bloques")} resultado={ind("bloques")} w={60} />
              <CampoNumResistencia etiqueta="INTERVALOS" valor={tarea.intervalos} onCambiar={set("intervalos")} resultado={ind("intervalos")} w={72} />
              <CampoTiempoConUnidadDiseno etiqueta="TIEMPO" valor={tarea.tiempo} unidad={tarea.tiempoUnidad} onCambiarValor={set("tiempo")} onCambiarUnidad={set("tiempoUnidad")} resultado={ind("tiempo")} w={100} />
              {sinImpacto ? (
                <CampoNumResistencia etiqueta="ESFUERZO (RPE 0-10)" valor={tarea.rpe} onCambiar={set("rpe")} resultado={ind("rpe")} w={148} />
              ) : (
                <CampoNumResistencia etiqueta={ETQ_INTENSIDAD_RESISTENCIA.hiit} valor={tarea.intensidad} onCambiar={set("intensidad")} resultado={ind("intensidad")} w={148} />
              )}
              <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} resultado={ind("recuperacion")} w={100} />
            </div>
          )}

          {tipo === "rsa" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CampoNumResistencia etiqueta="BLOQUES" valor={tarea.bloques} onCambiar={set("bloques")} resultado={ind("bloques")} w={60} />
              <CampoNumResistencia etiqueta="SERIES" valor={tarea.series} onCambiar={set("series")} resultado={ind("series")} w={60} />
              {sinImpacto ? (
                <CampoNumResistencia etiqueta="DURACIÓN (SEG)" valor={tarea.duracion} onCambiar={set("duracion")} resultado={ind("duracion")} w={104} />
              ) : (
                <CampoNumResistencia etiqueta="DISTANCIA (M)" valor={tarea.distancia} onCambiar={set("distancia")} resultado={ind("distancia")} w={104} />
              )}
              {sinImpacto ? (
                <CampoNumResistencia etiqueta="ESFUERZO (RPE 0-10)" valor={tarea.rpe} onCambiar={set("rpe")} resultado={ind("rpe")} w={148} />
              ) : (
                <CampoNumResistencia etiqueta={ETQ_INTENSIDAD_RESISTENCIA.rsa} valor={tarea.intensidad} onCambiar={set("intensidad")} resultado={ind("intensidad")} w={148} />
              )}
              <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} resultado={ind("recuperacion")} w={100} />
            </div>
          )}

          <FichaJugadorResistencia tipo={tipo} modalidad={modalidad} intensidad={tarea.intensidad} distancia={tarea.distancia} jugadorReferencia={jugadorReferencia} />
        </>
      )}

      <NotaTareaReal nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

// Cuántas veces está ya un ejercicio en la sesión que se está diseñando —
// lo aporta DisenoSesionReal; fuera de él, 0.
const EnSesionContext = React.createContext(() => 0);
// Hueco (columna derecha) donde la biblioteca se acopla en iPad horizontal / ordenador.
const BibliotecaSlotContext = React.createContext(null);

function SelectorEjercicioReal({ ejercicios, bloque, onAdd, onAsignarZona, acoplable = false, panelFijo = false, destinos = null, destinoId = "", onCambiarDestino = null }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [soloVideo, setSoloVideo] = useState(false);
  const [soloFav, setSoloFav] = useState(false);
  const [previsId, setPrevisId] = useState(null);
  // Selección múltiple: se marcan varios ejercicios y se añaden de una vez.
  const [seleccion, setSeleccion] = useState({});
  const [colaZona, setColaZona] = useState([]);
  const [aviso, setAviso] = useState("");
  // Ejercicio (ya existente sin zona, o { nombre, nuevo: true } recién
  // escrito) que está esperando a que se le asigne zona corporal antes de
  // poder añadirse a la sesión — la zona es obligatoria, así que ningún
  // ejercicio pasa de aquí sin ella.
  const [pendienteZona, setPendienteZona] = useState(null);
  const [guardandoZona, setGuardandoZona] = useState(false);
  const enSesion = React.useContext(EnSesionContext);
  const ancho = useAnchoVentana();
  const slotBiblio = React.useContext(BibliotecaSlotContext);
  // panelFijo: la biblioteca vive siempre en la columna izquierda (iPad horizontal / ordenador).
  const acoplado = !!panelFijo && !!slotBiblio;
  const lateralPanel = !acoplado && ancho >= 700;
  const urlDe = (e) => e.gif_url || Object.values(e.videos_variantes || {}).find(Boolean) || "";

  const coincideBloque = (e) => !bloque || !e.bloque || e.bloque === bloque || (bloque === "Fuerza" && e.bloque === "Específicas");
  const coincideTexto = (e) => (e.nombre || "").toLowerCase().includes(filtro.toLowerCase());
  const coincideFiltros = (e) =>
    (!zonaFiltro || (e.tags_descriptivos || []).includes(zonaFiltro)) &&
    (!soloVideo || !!e.gif_url || Object.values(e.videos_variantes || {}).some(Boolean)) &&
    (!soloFav || !!e.favorito);

  // La matriz aparece primero y justo debajo, indentadas, sus variantes.
  const idsExistentes = new Set(ejercicios.map((e) => e.id));
  const variantesPorMatriz = {};
  ejercicios.forEach((e) => {
    if (e.ejercicio_base_id && idsExistentes.has(e.ejercicio_base_id)) {
      (variantesPorMatriz[e.ejercicio_base_id] = variantesPorMatriz[e.ejercicio_base_id] || []).push(e);
    }
  });
  const matrices = ejercicios.filter((e) => !e.ejercicio_base_id || !idsExistentes.has(e.ejercicio_base_id));
  const opciones = [];
  matrices.forEach((m) => {
    const ok = (x) => coincideBloque(x) && coincideTexto(x) && coincideFiltros(x);
    const variantesCoinciden = (variantesPorMatriz[m.id] || []).filter(ok);
    if (ok(m) || variantesCoinciden.length) {
      opciones.push(m);
      variantesCoinciden.forEach((v) => opciones.push({ ...v, esVariante: true }));
    }
  });

  const cerrarTodo = () => {
    setAbierto(false);
    setFiltro("");
    setPendienteZona(null);
    setPrevisId(null);
    setSeleccion({});
    setColaZona([]);
    setAviso("");
  };

  const alternarSeleccion = (e) => {
    setSeleccion((sel) => {
      const nuevo = { ...sel };
      if (nuevo[e.id]) delete nuevo[e.id];
      else nuevo[e.id] = e;
      return nuevo;
    });
  };
  const seleccionados = Object.values(seleccion);
  const anadirSeleccion = () => {
    if (!seleccionados.length) return;
    const conZona = seleccionados.filter((e) => e.tags_descriptivos && e.tags_descriptivos.length);
    const sinZona = seleccionados.filter((e) => !(e.tags_descriptivos && e.tags_descriptivos.length));
    conZona.forEach((e) => onAdd(e));
    setSeleccion({});
    if (sinZona.length) {
      setPendienteZona(sinZona[0]);
      setColaZona(sinZona.slice(1));
      setAviso(`${conZona.length} añadidos. Faltan zonas corporales.`);
      return;
    }
    setAviso(`${conZona.length} ${conZona.length === 1 ? "ejercicio añadido" : "ejercicios añadidos"} a ${bloque || "la sesión"}`);
    if (!acoplado) cerrarTodo();
  };

  const elegirZona = async (zona) => {
    setGuardandoZona(true);
    try {
      if (pendienteZona.nuevo) {
        onAdd({ nombre: pendienteZona.nombre, nuevo: true, tags_descriptivos: [zona], bloque: bloque || "" });
      } else {
        const actualizado = await onAsignarZona(pendienteZona, zona);
        onAdd(actualizado);
      }
      if (colaZona.length) {
        setPendienteZona(colaZona[0]);
        setColaZona(colaZona.slice(1));
      } else {
        setPendienteZona(null);
        if (!acoplado) cerrarTodo();
      }
    } catch (e) {
      // Se deja el aviso abierto para reintentar sin perder la búsqueda.
    }
    setGuardandoZona(false);
  };

  const chip = (activo, onClick, txt) => (
    <button key={txt} type="button" onClick={onClick} style={{ flexShrink: 0, fontSize: 12.5, minHeight: 36, padding: "0 12px", borderRadius: 999, cursor: "pointer", border: `1px solid ${activo ? ds.accent : ds.border}`, background: "transparent", color: activo ? ds.accent : ds.inkSecondary, whiteSpace: "nowrap", fontWeight: activo ? 600 : 400 }}>
      {txt}
    </button>
  );

  const lista = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {opciones.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 12, padding: "8px 4px" }}>Sin resultados{filtro.trim() ? " — puedes crear uno nuevo con este nombre" : " con estos filtros"}</div>}
      {opciones.map((e) => {
        const n = enSesion(e.id);
        const marcado = !!seleccion[e.id];
        const sel = e.id === previsId;
        const miniatura = miniaturaTarea(e.gif_url);
        const hayVideo = !!urlDe(e);
        return (
          <React.Fragment key={e.id}>
          <div
            onClick={() => alternarSeleccion(e)}
            style={{ minHeight: 56, padding: "6px 10px", paddingLeft: e.esVariante ? 24 : 10, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 4, border: `1px solid ${marcado ? ds.accent : ds.border}`, background: marcado ? ds.accentSubtle : sel ? ds.border : "transparent", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
            <div title={hayVideo ? "Ver vídeo" : undefined} onClick={(ev) => { if (!hayVideo) return; ev.stopPropagation(); setPrevisId((cur) => (cur === e.id ? null : e.id)); }} style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(127,127,127,0.15)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: hayVideo ? ds.accent : ds.inkMuted, fontSize: 13, cursor: hayVideo ? "pointer" : "default" }}>
              {miniatura ? <img src={miniatura} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : hayVideo ? "▶" : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
              <span style={{ color: e.esVariante ? ds.inkSecondary : ds.ink, fontSize: e.esVariante ? 12.5 : 13.5, lineHeight: 1.25, overflowWrap: "break-word" }}>
                {e.favorito ? "♥ " : ""}{e.esVariante && "↳ "}{e.nombre}
              </span>
              <span style={{ color: ds.inkMuted, fontSize: 10.5, fontFamily: dsF.mono }}>{(e.tags_descriptivos || []).join(" · ")}{n > 0 && <span style={{ marginLeft: 6, color: ds.accent }}>· en sesión ×{n}</span>}</span>
            </div>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: `2px solid ${marcado ? ds.accent : ds.borderMuted || ds.border}`, background: marcado ? ds.accent : "transparent", color: ds.accentInk, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{marcado ? "✓" : ""}</span>
          </div>
          {sel && hayVideo && <div style={{ padding: "0 4px 8px" }}><VideoEmbed url={urlDe(e)} /></div>}
          </React.Fragment>
        );
      })}
      {filtro.trim() && (
        <div onClick={() => setPendienteZona({ nombre: filtro.trim(), nuevo: true })} style={{ padding: "7px 8px", borderRadius: 6, cursor: "pointer", color: ds.accent, fontSize: 12.5, borderTop: `1px solid ${ds.border}`, marginTop: 4 }}>
          + Crear "{filtro.trim()}" como nuevo ejercicio
        </div>
      )}
    </div>
  );


  const campoBusqueda = (
    <input autoFocus={!acoplado} value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar ejercicio..." style={{ width: "100%", minHeight: 46, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 10, color: ds.ink, padding: "6px 12px", marginBottom: 8, boxSizing: "border-box" }} />
  );

  const cuerpo = !pendienteZona ? (
    <>
      {campoBusqueda}
      <div style={{ display: "flex", gap: 6, flexWrap: acoplado ? "nowrap" : "wrap", overflowX: acoplado ? "auto" : undefined, flexShrink: 0, marginBottom: 8, paddingBottom: acoplado ? 2 : 0 }}>
        {chip(soloVideo, () => setSoloVideo((v) => !v), "▶ Con vídeo")}
        {chip(soloFav, () => setSoloFav((v) => !v), "♥ Favoritos")}
        {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => chip(zonaFiltro === t, () => setZonaFiltro(zonaFiltro === t ? "" : t), t))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12, maxHeight: acoplado ? undefined : "min(60dvh, 520px)" }}>
        {lista}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 100%", fontSize: 11.5, color: ds.accent, minHeight: 14 }}>{aviso}</span>
        {destinos && destinos.length > 0 && (
          <label style={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: ds.inkSecondary }}>
            <span>Añadir a</span>
            <select value={destinoId} onChange={(e) => onCambiarDestino && onCambiarDestino(e.target.value)} style={{ minHeight: 40, borderRadius: 10, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.ink, fontFamily: dsF.sans, fontWeight: 700, padding: "0 10px" }}>
              {destinos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </label>
        )}
        {!acoplado && <button type="button" onClick={cerrarTodo} style={{ minHeight: 48, fontSize: 13.5, fontWeight: 600, color: ds.ink, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 12, padding: "0 16px", cursor: "pointer" }}>Cerrar</button>}
        <button type="button" disabled={!seleccionados.length} onClick={anadirSeleccion} style={{ flex: 1, minHeight: 48, fontSize: 14, fontWeight: 700, color: ds.accentInk, background: ds.accent, border: "none", borderRadius: 12, padding: "0 16px", cursor: seleccionados.length ? "pointer" : "default", opacity: seleccionados.length ? 1 : 0.45 }}>
          {seleccionados.length ? `Añadir ${seleccionados.length} ${seleccionados.length === 1 ? "ejercicio" : "ejercicios"}` : "Marca los ejercicios a añadir"}
        </button>
      </div>
    </>
  ) : (
    <div style={{ padding: 4 }}>
      <div style={{ fontSize: 12.5, color: ds.accent, marginBottom: 10, lineHeight: 1.4 }}>
        "{pendienteZona.nombre}" no tiene zona corporal — asígnasela para {pendienteZona.nuevo ? "crearlo" : "añadirla"}{colaZona.length ? ` (quedan ${colaZona.length} más)` : ""}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => <TagChipReal key={t} tag={t} activo={false} onClick={() => elegirZona(t)} />)}
      </div>
      <button onClick={() => { setPendienteZona(null); setColaZona([]); }} disabled={guardandoZona} style={{ marginTop: 10, minHeight: 40, fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
        {guardandoZona ? "Guardando..." : "Cancelar"}
      </button>
    </div>
  );

  // Dentro de un bloque, con la biblioteca fija a la izquierda, solo queda una indicación.
  if (acoplable && !panelFijo && slotBiblio) {
    return <div style={{ fontSize: 12.5, color: ds.inkSecondary, padding: "6px 2px" }}>← Elige los ejercicios en la biblioteca de la izquierda</div>;
  }
  // Biblioteca fija: se pinta en la columna izquierda, siempre visible.
  if (panelFijo) {
    if (!slotBiblio) return null;
    return createPortal(
      <div className="ds-reset" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 12, padding: 12, boxSizing: "border-box" }}>
        <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Biblioteca</div>
        {cuerpo}
      </div>,
      slotBiblio
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setAbierto((v) => !v)} style={{ minHeight: 44, fontSize: 13.5, color: ds.accent, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 10, padding: "0 14px", cursor: "pointer", fontWeight: 600 }}>
        + Añadir ejercicios desde biblioteca
      </button>
      {abierto && (
        <div onClick={cerrarTodo} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: lateralPanel ? "stretch" : "flex-end", justifyContent: lateralPanel ? "flex-end" : "center", padding: 0 }}>
          <div onClick={(ev) => ev.stopPropagation()} className="ds-reset" style={{ width: "100%", maxWidth: lateralPanel ? 470 : 560, height: lateralPanel ? "100%" : "92dvh", display: "flex", flexDirection: "column", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: lateralPanel ? 0 : "20px 20px 0 0", boxShadow: "0 18px 40px rgba(0,0,0,0.55)", padding: 12, paddingBottom: "calc(12px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700 }}>Añadir a {bloque || "la sesión"}</span>
              <button type="button" aria-label="Cerrar" onClick={cerrarTodo} style={{ width: 44, height: 44, background: "none", border: "none", color: ds.inkMuted, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {cuerpo}
          </div>
        </div>
      )}
    </div>
  );
}

function CajaCircuitoReal({ circuito, bloque, mostrarCarga, ejercicios, onEjercicioCreado, onAsignarZona, onError, materialesDisponibles, onAgregarMaterial, onCambiarTareas, onCambiarRondas, onCambiarCircuito, onEliminarCircuito, referenciasPorEjercicio, jugadorReferencia, onAmpliarVideo }) {
  const tareas = circuito.tareas;
  const rondas = circuito.rondas || 1;
  // 'circuito' (con rondas, se repite en orden — el comportamiento de
  // siempre) o 'grupo' (solo para organizar tareas bajo un título común, sin
  // rondas ni repetición — p. ej. "Miembro superior" dentro de Fuerza, para
  // ordenar sin que sea realmente un circuito).
  const esGrupo = circuito.tipo === "grupo";
  const actualizarTarea = (key, nueva) => onCambiarTareas(tareas.map((t) => (t.key === key ? nueva : t)));
  const eliminarTarea = (key) => onCambiarTareas(tareas.filter((t) => t.key !== key));
  const mover = (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= tareas.length) return;
    const nueva = [...tareas];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
    onCambiarTareas(nueva);
  };

  // Si el ejercicio es nuevo (escrito a mano, todavía no existe en la
  // Biblioteca — viene sin `id`), hay que crearlo de verdad antes de usar su
  // id. Antes esto solo se hacía para tareas sueltas; dentro de un circuito
  // se guardaba con ejercicioId vacío y el nombre se perdía para siempre
  // (aparecía luego como "(ejercicio eliminado)" sin haberse eliminado nada).
  const agregarEjercicioAlCircuito = async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    let gifUrl = ejercicioOClic.gif_url || "";
    if (!ejercicioId) {
      // Si crear el ejercicio falla (sin conexión, backend atascado...) hay
      // que avisar y parar aquí — si no, se seguía intentando añadir la
      // tarea con un ejercicioId vacío, sin decir nada, y quedaba con el
      // nombre perdido para siempre.
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: ejercicioOClic.bloque || "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        gifUrl = creado.gif_url || "";
        onEjercicioCreado?.(creado);
      } catch (e) {
        onError?.("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    const base =
      bloque === "Resistencia"
        ? { key: Date.now() + Math.random(), nombre, ejercicioId, gif: gifUrl, tipoResistenciaCardio: "", capacidad: "", modalidad: "carrera", estructuraManual: false, bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "", recuperacionUnidad: "seg", nota: "" }
        : { key: Date.now() + Math.random(), nombre, ejercicioId, gif: gifUrl, modo: "reps", series: "", cantidad: "", rir: "", modoCarga: "rir", pct1rm: "", tipoResistencia: "Peso libre", materiales: [], lateralidad: "bilateral", nota: "" };
    onCambiarTareas([...tareas, base]);
  };

  // Para Resistencia, igual que fuera de circuitos: se añade directamente
  // con la modalidad por defecto (Carrera) en vez de abrir el buscador de
  // la Biblioteca — la modalidad se elige dentro de la propia tarea.
  const agregarResistenciaDirectaAlCircuito = async () => {
    try {
      const creado = await resolveEjercicio(ejercicios, { nombre: MODALIDADES_RESISTENCIA.carrera, bloque: "", tags_descriptivos: [] });
      onEjercicioCreado?.(creado);
      onCambiarTareas([
        ...tareas,
        { key: Date.now() + Math.random(), nombre: creado.nombre, ejercicioId: creado.id, gif: creado.gif_url || "", tipoResistenciaCardio: "", capacidad: "", modalidad: "carrera", estructuraManual: false, bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "", recuperacionUnidad: "seg", nota: "" },
      ]);
    } catch (e) {
      onError?.("No se pudo crear la tarea de resistencia. Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  return (
    <div style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: `${ds.surface}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => onCambiarCircuito?.({ tipo: esGrupo ? "circuito" : "grupo" })}
          title="Alternar entre circuito (con rondas, se repite en orden) o grupo (solo para agrupar bajo un título, sin rondas)"
          style={{
            fontFamily: dsF.mono,
            fontSize: 10,
            letterSpacing: "0.06em",
            color: ds.accent,
            background: ds.accentSubtle,
            border: `1px solid ${ds.accentBorderSubtle}`,
            borderRadius: 4,
            padding: "2px 7px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {esGrupo ? "GRUPO" : "CIRCUITO"} ⇄
        </button>
        <input
          value={circuito.nombre || ""}
          onChange={(e) => onCambiarCircuito?.({ nombre: e.target.value })}
          placeholder={esGrupo ? "Nombre del grupo, p. ej. Miembro superior" : "Nombre (opcional)"}
          style={{ ...campoStyleDiseno("100%"), textAlign: "left", flex: 1, minWidth: 0 }}
        />
        <span style={{ fontSize: 11, color: ds.inkMuted, flexShrink: 0 }}>
          {tareas.length} {tareas.length === 1 ? "ejercicio" : "ejercicios"}
        </span>
        <button onClick={onEliminarCircuito} style={botonMiniStyleDiseno} title={esGrupo ? "Eliminar grupo" : "Eliminar circuito completo"}>
          ×
        </button>
      </div>
      {!esGrupo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: ds.bgElevated, border: `1px solid ${ds.accentSubtle}`, borderRadius: 8, padding: "8px 10px" }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.06em", color: ds.accent, fontWeight: 600 }}>RONDAS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => onCambiarRondas(Math.max(1, rondas - 1))}
              style={{ width: 26, height: 26, borderRadius: 6, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
            >
              −
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: ds.ink, minWidth: 22, textAlign: "center" }}>{rondas}</span>
            <button
              type="button"
              onClick={() => onCambiarRondas(rondas + 1)}
              style={{ width: 26, height: 26, borderRadius: 6, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>{rondas === 1 ? "vuelta al circuito" : "vueltas al circuito"}</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tareas.map((t, i) =>
          bloque === "Resistencia" ? (
            <CampoResistenciaTareaReal key={t.key} tarea={t} orden={i + 1} onCambiar={(nueva) => actualizarTarea(t.key, nueva)} onEliminar={() => eliminarTarea(t.key)} onSubir={i > 0 ? () => mover(i, -1) : null} onBajar={i < tareas.length - 1 ? () => mover(i, 1) : null} jugadorReferencia={jugadorReferencia} ejercicios={ejercicios} onEjercicioCreado={onEjercicioCreado} onAmpliarVideo={onAmpliarVideo} />
          ) : (
            <FilaTareaReal
              key={t.key}
              tarea={t}
              orden={i + 1}
              mostrarCarga={mostrarCarga}
              materialesDisponibles={materialesDisponibles}
              onAgregarMaterial={onAgregarMaterial}
              onCambiar={(nueva) => actualizarTarea(t.key, nueva)}
              onEliminar={() => eliminarTarea(t.key)}
              onSubir={i > 0 ? () => mover(i, -1) : null}
              onBajar={i < tareas.length - 1 ? () => mover(i, 1) : null}
              referenciasPorEjercicio={referenciasPorEjercicio}
              onAmpliarVideo={onAmpliarVideo}
            />
          )
        )}
      </div>
      {bloque === "Resistencia" ? (
        <button
          type="button"
          onClick={agregarResistenciaDirectaAlCircuito}
          style={{ fontSize: 12.5, color: ds.accent, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontWeight: 500, alignSelf: "flex-start" }}
        >
          + Ejercicio
        </button>
      ) : (
        <SelectorEjercicioReal ejercicios={ejercicios} bloque={bloque} onAdd={agregarEjercicioAlCircuito} onAsignarZona={onAsignarZona} />
      )}
    </div>
  );
}

function nuevaTareaBase(ejercicio, mostrarCarga) {
  return {
    key: Date.now() + Math.random(),
    nombre: ejercicio.nombre,
    ejercicioId: ejercicio.id,
    // El vídeo del ejercicio viaja con la tarea desde que se crea, para que
    // la miniatura con el ▶ salga también mientras se está diseñando la
    // sesión, no solo en la vista previa del móvil (que sí lo resolvía por
    // su cuenta buscando el ejercicio — de ahí la diferencia que se veía).
    gif: ejercicio.gif_url || "",
    modo: "reps",
    abrirEditor: true,
    series: "",
    cantidad: "",
    rir: "",
    modoCarga: "rir",
    pct1rm: "",
    tipoResistencia: "Peso libre",
    materiales: [],
    lateralidad: "bilateral",
    nota: "",
  };
}

// Avanza el puntero de rotación de una categoría (o del pool global de
// Movilidad, con la clave reservada "movilidad") y devuelve el ejercicio
// que toca esta vez. El pool debe venir ya ordenado por orden_rotacion.
async function elegirSiguienteRotacion(claveCategoria, poolOrdenado) {
  if (!poolOrdenado.length) return null;
  const actual = await api.rotacion(claveCategoria);
  const punteroActual = actual ? Number(actual.puntero_actual) || 0 : 0;
  const elegido = poolOrdenado[punteroActual % poolOrdenado.length];
  await api.setRotacion(claveCategoria, punteroActual + 1);
  return elegido;
}

// Igual que elegirSiguienteRotacion pero para cuando ese día se quieren N
// ejercicios seguidos de la misma categoría en vez de solo 1 (p. ej. una
// sesión dedicada por completo al trabajo preventivo). Una sola lectura y
// una sola escritura del puntero, no N — importa porque cada llamada a Apps
// Script tiene latencia propia.
async function elegirVariosRotacion(claveCategoria, poolOrdenado, cantidad) {
  if (!poolOrdenado.length || cantidad <= 0) return [];
  const actual = await api.rotacion(claveCategoria);
  const punteroInicial = actual ? Number(actual.puntero_actual) || 0 : 0;
  const elegidos = [];
  for (let i = 0; i < cantidad; i++) {
    elegidos.push(poolOrdenado[(punteroInicial + i) % poolOrdenado.length]);
  }
  await api.setRotacion(claveCategoria, punteroInicial + cantidad);
  return elegidos;
}

// Categoría preventiva común a TODOS los jugadores destinatarios (versión
// "simple" elegida: un único ejercicio por sesión, no uno por jugador).
// Devuelve null si no hay una única categoría compartida por todos.
function categoriaComunEntreJugadores(targetPlayerIds, allPlayers) {
  const objetivo = targetPlayerIds === null ? allPlayers : allPlayers.filter((p) => targetPlayerIds.includes(p.id));
  if (!objetivo.length) return null;
  const listas = objetivo.map((p) => new Set(p.groupIds || []));
  let interseccion = [...listas[0]];
  for (let i = 1; i < listas.length; i++) interseccion = interseccion.filter((id) => listas[i].has(id));
  return interseccion.length === 1 ? interseccion[0] : null;
}

// Preventivo por jugador: cuando los destinatarios no comparten una única
// categoría, en vez de omitir el bloque se reparte por categoría — cada
// jugador con UNA categoría recibe los ejercicios de la suya. Los jugadores
// con 0 o varias categorías no reciben Preventivo automático (no hay forma de
// saber cuál toca) y se avisan en el diseño.
function repartoPreventivoPorCategoria(targetPlayerIds, allPlayers) {
  const objetivo = targetPlayerIds === null ? allPlayers.filter((p) => p.estado === "activo") : allPlayers.filter((p) => targetPlayerIds.includes(p.id));
  const porCategoria = new Map();
  const sinCategoriaUnica = [];
  objetivo.forEach((p) => {
    const cats = p.groupIds || [];
    if (cats.length !== 1) {
      sinCategoriaUnica.push(p);
      return;
    }
    if (!porCategoria.has(cats[0])) porCategoria.set(cats[0], []);
    porCategoria.get(cats[0]).push(p.id);
  });
  return { porCategoria, sinCategoriaUnica };
}
// tareaEsParaJugador ahora en src/calc/adherencia.js — importada arriba.

function ListaJugadoresCheckReal({ players, seleccionados, onCambiar, grupos = [] }) {
  const alternar = (id) => {
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);
  };
  // Atajo por equipo: marca o desmarca de golpe a los jugadores activos del grupo.
  const equipos = grupos
    .map((g) => ({ g, ids: players.filter((p) => p.estado === "activo" && (p.gruposIds || []).includes(g.id)).map((p) => p.id) }))
    .filter((e) => e.ids.length);
  const alternarEquipo = (ids) => {
    const todos = ids.every((id) => seleccionados.includes(id));
    onCambiar(todos ? seleccionados.filter((id) => !ids.includes(id)) : [...new Set([...seleccionados, ...ids])]);
  };
  return (
    <div>
      {equipos.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Elegir por equipo</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {equipos.map(({ g, ids }) => {
              const todos = ids.every((id) => seleccionados.includes(id));
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => alternarEquipo(ids)}
                  style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${todos ? ds.accent : ds.border}`, background: todos ? ds.accentSubtle : "transparent", color: todos ? ds.accent : ds.inkSecondary, fontWeight: todos ? 700 : 500 }}
                >
                  {todos ? "✓ " : ""}{g.nombre || g.name || "Equipo"} ({ids.length})
                </button>
              );
            })}
          </div>
        </div>
      )}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto", background: ds.canvas, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 8 }}>
      {players.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted, padding: "8px 4px" }}>No hay jugadores para elegir.</div>}
      {players.map((p) => {
        const activo = seleccionados.includes(p.id);
        const suspendido = p.estado === "suspendido";
        return (
          <div
            key={p.id}
            onClick={() => alternar(p.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 10px",
              borderRadius: dsR.sm,
              cursor: "pointer",
              background: activo ? ds.accentSubtle : "transparent",
              transition: "background-color 120ms ease-out",
              opacity: suspendido ? 0.65 : 1,
            }}
            onMouseEnter={(e) => {
              if (!activo) e.currentTarget.style.background = ds.surfaceRaised;
            }}
            onMouseLeave={(e) => {
              if (!activo) e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: `1.5px solid ${activo ? ds.accent : ds.border}`,
                background: activo ? ds.accent : "transparent",
                color: ds.accentInk,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {activo ? "✓" : ""}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
          </div>
        );
      })}
    </div>
    </div>
  );
}

// fechasSugeridas / destinatariosSugeridos: solo los usa el Calendario al
// abrir este editor para una fecha y un ámbito (equipo/grupo/jugador) ya
// elegidos allí — ningún otro punto de entrada (Diseñar sesión, Reutilizar)
// los pasa nunca, así que su comportamiento de siempre no cambia en nada.
// Resumen compacto en una sola franja bajo las pestañas: tiempo total, tiempo
// por bloque y avisos. El detalle completo (tareas de cada bloque, datos de
// fuerza) se abre solo si lo pides, en un panel lateral que no empuja nada.
function BarraResumenDisenoReal({ resumen, bloqueActivo, onIrBloque, compacta = false }) {
  const [abierto, setAbierto] = useState(false);
  const { bloques, totalSeg, fuerza, avisos } = resumen;
  const activos = bloques.filter((b) => b.seg > 0 || b.sinDato);
  const stats = [fuerza.series ? `${fuerza.series} series` : null, fuerza.pct != null ? `${Math.round(fuerza.pct)} % 1RM` : null, fuerza.rir != null ? `RIR ${fuerza.rir.toFixed(1)}` : null].filter(Boolean);
  return (
    <>
      {compacta ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: "right", lineHeight: 1.2 }} title="Tiempo orientativo: 4 s por repetición, descansos entre series y 30 s por cambio de ejercicio. Movilidad 5 min, preventivo 3 min por ejercicio y CMJ 5 min son valores fijos.">
            <div style={{ fontFamily: dsF.mono, fontWeight: 800, fontSize: 16, color: ds.accent }}>~{formatearDuracionDiseno(totalSeg)}</div>
            {fuerza.series ? <div style={{ fontSize: 11.5, color: ds.inkSecondary }}>{fuerza.series} series de fuerza</div> : null}
          </div>
          {avisos.length > 0 && (
            <button type="button" title={avisos.join("\n")} onClick={() => setAbierto(true)} style={{ minHeight: 36, fontSize: 12.5, fontWeight: 600, color: ds.danger, background: "transparent", border: `1px solid ${ds.danger}`, borderRadius: 999, padding: "0 10px", cursor: "pointer" }}>
              ⚠ {avisos.length}
            </button>
          )}
          <button type="button" onClick={() => setAbierto(true)} style={{ minHeight: 36, fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 10, padding: "0 12px", cursor: "pointer" }}>
            Resumen
          </button>
        </div>
      ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 10, padding: "6px 10px" }}>
        <span title="Tiempo orientativo: 4 s por repetición, descansos entre series y 30 s por cambio de ejercicio. Movilidad 5 min, preventivo 3 min por ejercicio y CMJ 5 min son valores fijos." style={{ fontFamily: dsF.mono, fontSize: 15, fontWeight: 700, color: ds.accent, flexShrink: 0 }}>
          ~{formatearDuracionDiseno(totalSeg)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, overflowX: "auto" }}>
          {activos.map((b) => (
            <span
              key={b.id}
              onClick={() => onIrBloque(b.id)}
              style={{ flexShrink: 0, cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 999, border: `1px solid ${bloqueActivo === b.id ? ds.accentBorderSubtle : ds.border}`, background: bloqueActivo === b.id ? ds.accentSubtle : "transparent", color: ds.inkSecondary, whiteSpace: "nowrap" }}
            >
              {b.nombre} <span style={{ fontFamily: dsF.mono, color: b.sinDato ? ds.danger : ds.ink }}>{b.sinDato ? "!" : formatearDuracionDiseno(b.seg)}</span>
            </span>
          ))}
          {stats.length > 0 && <span style={{ flexShrink: 0, fontSize: 10.5, color: ds.inkMuted, whiteSpace: "nowrap" }}>· Fuerza {stats.join(" · ")}</span>}
        </div>
        {avisos.length > 0 && (
          <span title={avisos.join("\n")} style={{ flexShrink: 0, fontSize: 11, color: ds.danger, border: `1px solid ${ds.danger}`, borderRadius: 999, padding: "1px 8px", cursor: "pointer" }} onClick={() => setAbierto(true)}>
            ⚠ {avisos.length}
          </span>
        )}
        <button type="button" onClick={() => setAbierto(true)} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 7, padding: "3px 10px", cursor: "pointer" }}>
          Detalle
        </button>
      </div>
      )}
      {abierto && (
        <div onClick={() => setAbierto(false)} style={{ position: "fixed", inset: 0, zIndex: 58, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: "min(360px, 100%)", height: "100%", overflowY: "auto", background: ds.bgElevated, borderLeft: `1px solid ${ds.border}`, padding: 12, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button type="button" onClick={() => setAbierto(false)} style={{ background: "none", border: "none", color: ds.inkMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <ResumenSesionDisenoReal resumen={resumen} anchoDesktop={false} bloqueActivo={bloqueActivo} onIrBloque={(id) => { onIrBloque(id); setAbierto(false); }} />
          </div>
        </div>
      )}
    </>
  );
}

// Panel de resumen del diseñador (columna derecha), deliberadamente compacto:
// tiempo total estimado, una fila por bloque, una línea de carga de fuerza y
// los avisos pendientes. El tiempo es orientativo (ver estimarTareaSeg).
function ResumenSesionDisenoReal({ resumen, anchoDesktop, bloqueActivo, onIrBloque }) {
  const { bloques, totalSeg, fuerza, avisos } = resumen;
  const [abiertos, setAbiertos] = useState({});
  const [masDatos, setMasDatos] = useState(false);
  const alternar = (id) => setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  const hayAbiertos = bloques.some((b) => abiertos[b.id]);
  const todosAbiertos = (valor) => setAbiertos(Object.fromEntries(bloques.map((b) => [b.id, valor])));
  const stats = [
    fuerza.n ? `${fuerza.n} ej.` : null,
    fuerza.series ? `${fuerza.series} series` : null,
    fuerza.pct != null ? `${Math.round(fuerza.pct)} % 1RM` : null,
    fuerza.rir != null ? `RIR ${fuerza.rir.toFixed(1)}` : null,
  ].filter(Boolean);
  const zonas = Object.entries(fuerza.porZona || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const linkBtn = { background: "none", border: "none", color: ds.inkMuted, fontSize: 10.5, cursor: "pointer", padding: 0, textDecoration: "underline" };
  return (
    <aside
      style={{
        width: anchoDesktop ? 280 : "100%",
        flexShrink: 0,
        boxSizing: "border-box",
        background: ds.surface,
        border: `1px solid ${ds.border}`,
        borderRadius: 12,
        padding: "10px 12px",
        position: anchoDesktop ? "sticky" : "static",
        top: 0,
        maxHeight: anchoDesktop ? "100%" : undefined,
        overflowY: anchoDesktop ? "auto" : "visible",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: dsF.display, fontSize: 13, fontWeight: 700 }}>Resumen</span>
        <span title="Tiempo orientativo: 4 s por repetición, descansos entre series y 30 s por cambio de ejercicio. Movilidad 5 min, preventivo 3 min por ejercicio y CMJ 5 min son valores fijos." style={{ fontFamily: dsF.mono, fontSize: 16, fontWeight: 700, color: ds.accent }}>
          ~{formatearDuracionDiseno(totalSeg)}
        </span>
      </div>
      <div style={{ textAlign: "right", marginBottom: 4 }}>
        <button type="button" onClick={() => todosAbiertos(!hayAbiertos)} style={linkBtn}>{hayAbiertos ? "Contraer todo" : "Ver detalle de todos"}</button>
      </div>
      {bloques.map((b) => {
        const abierto = !!abiertos[b.id];
        const puede = (b.items || []).length > 0;
        return (
          <div key={b.id} style={{ opacity: b.vacio ? 0.55 : 1 }}>
            <div
              onClick={() => (puede ? alternar(b.id) : onIrBloque(b.id))}
              title={b.sinDato ? "Faltan series o repeticiones para estimar el tiempo" : b.detalle}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 5, cursor: "pointer", background: bloqueActivo === b.id ? ds.accentSubtle : "transparent" }}
            >
              <ChevronDown size={12} style={{ flexShrink: 0, color: ds.inkMuted, transition: "transform .15s", transform: abierto ? "rotate(180deg)" : "none", visibility: puede ? "visible" : "hidden" }} />
              <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600 }}>{b.nombre}</span>
              {b.sinDato && <span style={{ color: ds.danger, fontSize: 11 }}>!</span>}
              <span style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>{b.seg ? formatearDuracionDiseno(b.seg) : "—"}</span>
            </div>
            {abierto && puede && (
              <div style={{ margin: "2px 0 6px 18px", paddingLeft: 8, borderLeft: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", gap: 5 }}>
                {b.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, color: ds.ink }}>{it.titulo}</span>
                      {it.seg ? <span style={{ fontFamily: dsF.mono, color: ds.inkMuted }}>{formatearDuracionDiseno(it.seg)}</span> : null}
                    </div>
                    {it.sub && <div style={{ color: ds.inkSecondary }}>{it.sub}</div>}
                  </div>
                ))}
                <button type="button" onClick={() => onIrBloque(b.id)} style={{ ...linkBtn, alignSelf: "flex-start" }}>Ir al bloque</button>
              </div>
            )}
          </div>
        );
      })}
      {stats.length > 0 && (
        <div style={{ borderTop: `1px solid ${ds.border}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ fontSize: 10.5, color: ds.inkSecondary, lineHeight: 1.5 }}>
            <span style={{ color: ds.inkMuted }}>Fuerza: </span>
            {stats.join(" · ")}
          </div>
          <button type="button" onClick={() => setMasDatos((v) => !v)} style={{ ...linkBtn, marginTop: 3 }}>{masDatos ? "Menos datos" : "Más datos de fuerza"}</button>
          {masDatos && (
            <div style={{ marginTop: 5, fontSize: 10.5, color: ds.inkSecondary, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 3 }}>
              {fuerza.repsTotales > 0 && <div>Repeticiones totales: <strong>{fuerza.repsTotales}</strong></div>}
              {fuerza.descansoMedio != null && <div>Descanso medio entre series: <strong>{Math.round(fuerza.descansoMedio)} s</strong></div>}
              {fuerza.segTrabajo > 0 && <div>Duración del bloque de fuerza: <strong>{formatearDuracionDiseno(fuerza.segTrabajo)}</strong></div>}
              {zonas.length > 0 && (
                <div>
                  Series por zona:
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                    {zonas.map(([z, n]) => (
                      <span key={z} style={{ border: `1px solid ${ds.border}`, borderRadius: 5, padding: "1px 6px" }}>{z} · {n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {avisos.length > 0 && (
        <div style={{ borderTop: `1px solid ${ds.border}`, marginTop: 6, paddingTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {avisos.map((a) => (
            <div key={a} style={{ fontSize: 10.5, color: ds.inkSecondary, lineHeight: 1.4, paddingLeft: 7, borderLeft: `2px solid ${ds.danger}` }}>
              {a}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

// Sugerencias de alternancia dentro del constructor de un bloque: dos
// ejercicios de zonas distintas se alternan durante el descanso del otro.
function SugerenciasAlternanciaReal({ sugerencias, bloque, onAplicar }) {
  const lista = sugerencias.filter((x) => x.bloque === bloque);
  if (!lista.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.inkMuted, textTransform: "uppercase" }}>Ahorra tiempo alternando</div>
      {lista.map(({ a, b, ahorro }) => (
        <div key={`${a.key}-${b.key}`} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${ds.accentBorderSubtle}`, background: ds.accentSubtle, borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.4 }}>
            <strong>{a.nombre}</strong> ↔ <strong>{b.nombre}</strong> <span style={{ color: ds.inkSecondary }}>· ahorra ~{Math.round(ahorro / 60)} min</span>
          </span>
          <button type="button" onClick={() => onAplicar(a, b, bloque)} style={{ fontSize: 11.5, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>
            Alternar
          </button>
        </div>
      ))}
    </div>
  );
}

// Paso 2 del diseñador: antes de publicar, el entrenador ve la sesión como la
// verá el jugador, los avisos pendientes (clicables, llevan al sitio a
// corregir) y a quién y cuándo llega. Enviar solo ocurre desde aquí.
const COLOR_BLOQUE_DISENO = { activacion: "#7C6FB0", movilidad: "#5FA87A", preventivo: "#A9B53A", core: "#E08A3C", resistencia: "#B8872B", cmj: "#C25B6B", fuerza: "#5B8DB8" };

// Tarjeta desplegable de un bloque del diseñador (estilo del prototipo):
// barra de color a la izquierda, icono, nombre · resumen, y el contenido
// del bloque solo cuando está abierta.
function TarjetaBloqueDiseno({ id, abierto, onToggle, resumen, vacio, color, children }) {
  const info = BLOQUES_DISENO.find((x) => x.id === id) || { nombre: id };
  return (
    <div style={{ background: abierto ? ds.surfaceRaised : ds.surface, border: `1px solid ${abierto ? color : ds.border}`, borderLeft: `4px solid ${color}`, borderRadius: 12, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconoBloqueDiseno id={id} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: ds.ink }}>
          {info.nombre}
          <span style={{ fontWeight: 600, fontSize: 12, color: vacio ? ds.inkMuted : ds.inkSecondary }}> · {resumen || (vacio ? "Vacío" : "")}</span>
        </span>
        <ChevronDown size={16} style={{ color: ds.inkMuted, transition: "transform .15s", transform: abierto ? "rotate(180deg)" : "none", flexShrink: 0 }} />
      </div>
      {abierto && <div style={{ padding: "4px 14px 14px" }}>{children}</div>}
    </div>
  );
}

function PasoRevisarEnviarReal({ resumen, destinatarios, fechas, md, nombre, onEditarConfig, onIrBloque, onEnviar, onCerrar, guardando }) {
  const bloquesConContenido = resumen.bloques.filter((b) => !b.vacio && (b.items || []).length);
  const irAviso = (txt) => {
    if (/^Sin (fechas|jugadores)/.test(txt)) onEditarConfig();
    else onIrBloque("fuerza");
    onCerrar();
  };
  const hayBloqueante = resumen.avisos.some((a) => /^Sin (fechas|jugadores)/.test(a));
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88dvh", display: "flex", flexDirection: "column", color: ds.ink, fontFamily: dsF.sans, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 12, boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 6px" }}>
          <span style={{ fontFamily: dsF.display, fontSize: 14.5, fontWeight: 700 }}>Revisar y enviar</span>
          <button type="button" onClick={onCerrar} style={{ background: "none", border: "none", color: ds.inkMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 14px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ border: `1px solid ${ds.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.6 }}>
              <div style={{ color: ds.ink, fontWeight: 700, fontSize: 13.5 }}>{nombre || "Sesión sin nombre"}</div>
              <div>Para: <b style={{ color: ds.ink }}>{destinatarios}</b></div>
              <div>Fechas: <b style={{ color: ds.ink }}>{fechas.length ? fechas.join(", ") : "ninguna"}</b>{md ? ` · ${md}` : ""}</div>
              <div>Duración estimada: <b style={{ color: ds.ink }}>~{formatearDuracionDiseno(resumen.totalSeg)}</b></div>
            </div>
            <button type="button" onClick={() => { onEditarConfig(); onCerrar(); }} style={{ fontSize: 12, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>Editar</button>
          </div>
          {resumen.avisos.length > 0 && (
            <div style={{ border: `1px solid ${ds.danger}`, borderRadius: 10, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, fontFamily: dsF.mono, color: ds.danger, textTransform: "uppercase", letterSpacing: 0.4 }}>Pendiente de revisar</div>
              {resumen.avisos.map((a, i) => (
                <div key={i} onClick={() => irAviso(a)} style={{ fontSize: 12.5, color: ds.ink, cursor: "pointer", textDecoration: "underline dotted" }}>⚠ {a}</div>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontFamily: dsF.mono, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Así la verá el jugador</div>
            <div style={{ border: `1px solid ${ds.border}`, borderRadius: 10, overflow: "hidden" }}>
              {bloquesConContenido.length === 0 && <div style={{ padding: 12, fontSize: 12.5, color: ds.inkMuted }}>La sesión está vacía.</div>}
              {bloquesConContenido.map((b, i) => (
                <div key={b.id} style={{ padding: "8px 12px", borderTop: i ? `1px solid ${ds.border}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: ds.ink }}>
                    <span>{b.nombre}</span>
                    <span style={{ fontFamily: dsF.mono, fontWeight: 400, color: ds.inkMuted, fontSize: 11 }}>{formatearDuracionDiseno(b.seg)}</span>
                  </div>
                  {b.items.map((it, j) => (
                    <div key={j} style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 3 }}>
                      <span style={{ color: ds.ink }}>{it.titulo}</span>
                      {it.sub ? <span style={{ color: ds.inkMuted }}> — {it.sub}</span> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: `1px solid ${ds.border}` }}>
          <button type="button" onClick={onCerrar} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>Volver al diseño</button>
          <button type="button" onClick={onEnviar} disabled={guardando || hayBloqueante} style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: guardando || hayBloqueante ? 0.5 : 1 }}>
            {guardando ? "Enviando..." : "Enviar a los jugadores"}
          </button>
        </div>
      </div>
    </div>
  );
}

// autoEnviar / sinProgresion / forzarDestino / onFallo los usa el planificador
// semanal: monta este mismo diseñador (oculto) con una sesión de partida, la
// fecha del día y el destino elegido, y la guarda y publica sola — así se
// reutiliza TODA la lógica de guardado (movilidad y preventivo por fecha,
// circuitos, materiales…) sin duplicarla. Nunca aplica progresión de carga.
export function DisenoSesionReal({ sesionExistente, plantilla, fechasSugeridas, destinatariosSugeridos, onBack, onGuardado, autoEnviar, sinProgresion, forzarDestino, onFallo, mdForzado }) {
  const [gruposDestino] = useEntityList("grupos");
  const parcialRef = useRef(nuevoEstadoParcial());
  const isEditing = !!sesionExistente;
  // Reutilizar: misma configuración base que editar (destinatarios, objetivo,
  // activación, preventivo...), pero SIN heredar id ni fechas — es una sesión
  // nueva de arriba a abajo, solo "inspirada" en la anterior.
  const esReutilizacion = !!plantilla;
  const base = sesionExistente || plantilla;
  const [players, , playersLoaded] = usePlayers();
  const [categoriasPreventivas, categoriasLoaded] = useCategoriasPreventivas();
  const [ejercicios, , ejerciciosLoaded, , , addEjercicioLocal] = useEntityList("ejercicios");
  const [materialesDisponibles, materialesLoaded, agregarMaterial] = useMaterialesDisponibles();
  // Layout de 3 columnas (nav de pasos / constructor / vista previa en vivo,
  // ver mockup_diseno_sesion.html) en escritorio/iPad ancho; por debajo del
  // umbral se apilan verticalmente — mismo patrón que ya usa
  // PantallaEntrenadorAncha para el resto de pantallas "anchas" de la app.
  const ancho = useAnchoVentana();
  const anchoDesktop = ancho >= 900;
  const lateralBloques = ancho >= 1100;
  const [slotBiblio, setSlotBiblio] = useState(null);
  const [destinoBiblio, setDestinoBiblio] = useState("fuerza");
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  // Le dice a SelectorEjercicioReal cómo guardar la zona corporal de un
  // ejercicio antiguo que todavía no la tenía, y refresca la lista local
  // para que el cambio se vea sin recargar la pantalla.
  const asignarZonaYActualizar = async (ejercicio, zona) => {
    const actualizado = await actualizarZonaEjercicio(ejercicio, zona);
    addEjercicioLocal(actualizado);
    return actualizado;
  };
  // Para "REF. ANTERIOR" en cada fila de tarea de Fuerza — ver
  // useReferenciasPorEjercicio.
  const referenciasPorEjercicio = useReferenciasPorEjercicio(sesionExistente?.id || null);
  // Lightbox de vídeo para las miniaturas de tarea clicables (mismo patrón
  // que PantallaJugadorReal / gifAmpliado).
  const [videoAmpliado, setVideoAmpliado] = useState(null);
  const [revisandoEnvio, setRevisandoEnvio] = useState(false);

  const [md, setMd] = useState(mdForzado || (isEditing ? base?.md || "" : ""));
  const [objetivo, setObjetivo] = useState(base?.objetivo || "");
  // Nombre de plantilla, opcional — es lo que permite luego encontrarla en
  // la Biblioteca de sesiones y reutilizarla sin tener que reconocerla por
  // la fecha en la que se programó. Se hereda tanto al editar como al
  // reutilizar (con "Reutilizar como nueva" seguramente quieras el mismo
  // nombre — puedes cambiarlo aquí mismo si no).
  const [nombre, setNombre] = useState(base?.nombre || "");
  // Cabecera de configuración plegable (mockup Fase 6): en una sesión nueva
  // arranca abierta porque el entrenador todavía tiene que rellenarla; al
  // editar una ya guardada arranca plegada — casi siempre solo se quiere
  // tocar el contenido de los bloques, no volver a repasar fechas/PARA/MD.
  const [detallesAbiertos, setDetallesAbiertos] = useState(false);
  const [microciclosDiseno, microsCargados] = useCmjMicrociclos();
  const estadoCmjDiseno = useEstadoCmjEquipo(players);
  const ventanasDiseno = useMemo(() => cmjVentanasMicrociclo(microciclosDiseno), [microciclosDiseno]);
  const [fechas, setFechas] = useState(
    sesionExistente?.fechas?.length ? sesionExistente.fechas : fechasSugeridas?.length ? fechasSugeridas : [todayStr()]
  );
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [targetPlayerIds, setTargetPlayerIds] = useState(forzarDestino ? destinatariosSugeridos ?? null : base?.jugadores_destino ?? destinatariosSugeridos ?? null);
  // Ficha de jugador de la tarea de Resistencia (VAM/FCmáx → ritmo/pulso,
  // ver FichaJugadorResistencia): solo tiene sentido anclarla a un jugador
  // concreto cuando la sesión tiene exactamente un destinatario. Con "todo
  // el equipo" o varios jugadores a la vez no hay un único test al que
  // referirse, así que se deja en null y el componente usa la estimación
  // poblacional en su lugar (nunca el test de uno aplicado a todos).
  const jugadorReferenciaResistencia = targetPlayerIds && targetPlayerIds.length === 1 ? players.find((p) => p.id === targetPlayerIds[0]) || null : null;
  const [activacionActiva, setActivacionActiva] = useState(base ? !!base.activacion_activa : true);
  const [activacionEjercicioId, setActivacionEjercicioId] = useState("");
  const [activacionEjercicioNombre, setActivacionEjercicioNombre] = useState("");
  const [activacionMateriales, setActivacionMateriales] = useState([]);
  const [duracionActivacion, setDuracionActivacion] = useState("8");
  const [unidadActivacion, setUnidadActivacion] = useState("minutos");
  // A diferencia de Activación, CMJ no es rutina de cada sesión — es un día
  // de medición puntual, así que por defecto va desactivado en una sesión
  // nueva (nunca se enciende solo). Tampoco hace falta elegir ejercicio: es
  // siempre el mismo test, así que se resuelve solo al guardar (más abajo).
  const [cmjActiva, setCmjActiva] = useState(base ? !!base.cmj_activo : false);
  // preventivo_activo pasa de booleano a número (cuántos ejercicios de la
  // categoría se aplican ese día, 0 = no se aplica) sin cambiar el nombre de
  // la columna en la Sheet — las sesiones antiguas guardaron ahí un booleano
  // (true/false), así que se convierten a 1/0 la primera vez que se leen;
  // las nuevas guardan directamente el número elegido.
  const [preventivoCantidad, setPreventivoCantidad] = useState(() => {
    if (!base) return 1;
    const v = base.preventivo_activo;
    if (typeof v === "boolean") return v ? 1 : 0;
    return Number(v) || 0;
  });
  // Movilidad y Preventivo admiten 3 modos (ver mockup, cambiarModo):
  // automático (pool rotativo), manual (el entrenador elige el/los
  // ejercicio(s) concretos ese día) o no incluir (bloque desactivado).
  // El modo en sí es solo estado de UI del formulario — no se persiste
  // como columna nueva, así que al abrir una sesión ya guardada no hay
  // forma de distinguir si un ejercicio de Movilidad vino de rotación o
  // (antes de este cambio, imposible) de una elección manual: se asume
  // siempre "automatico", que es la verdad para todo lo guardado hasta
  // ahora. Preventivo sí tenía ya un modo de facto vía preventivoCantidad
  // (N>0 = automático, N=0 = no incluir), así que el valor inicial se
  // deriva de ese mismo número en vez de asumir siempre automático.
  const [modoMovilidad, setModoMovilidad] = useState("automatico");
  const [tareaMovilidadManual, setTareaMovilidadManual] = useState(null);
  const [modoPreventivo, setModoPreventivo] = useState(() => {
    const cantidadInicial = (() => {
      if (!base) return 1;
      const v = base.preventivo_activo;
      if (typeof v === "boolean") return v ? 1 : 0;
      return Number(v) || 0;
    })();
    return cantidadInicial > 0 ? "automatico" : "no_incluir";
  });
  const [tareasPreventivoManual, setTareasPreventivoManual] = useState([]);
  // Al editar una sesión ya guardada, los ejercicios de Movilidad y
  // Preventivo que ya tiene asignados se CONSERVAN tal cual: no se vuelve a
  // sortear ni se avanza el puntero de rotación (antes cada guardado
  // cambiaba los ejercicios que veían los jugadores sin avisar). Solo se
  // vuelven a sortear si el entrenador toca a propósito ese bloque (cambia
  // el modo o la cantidad), o para fechas nuevas que aún no tienen tarea.
  const [conservarMovilidad, setConservarMovilidad] = useState(isEditing);
  const [conservarPreventivo, setConservarPreventivo] = useState(isEditing);

  // Paso activo en el nav de la izquierda — el constructor (columna central)
  // solo renderiza el contenido de este bloque, en vez de los 7 apilados.
  const [bloqueActivo, setBloqueActivo] = useState(BLOQUES_DISENO[0].id);
  // La biblioteca fija añade al bloque con el que se está trabajando.
  useEffect(() => {
    if (["fuerza", "core", "preventivo"].includes(bloqueActivo)) setDestinoBiblio(bloqueActivo);
  }, [bloqueActivo]);

  const [tareasCore, setTareasCore] = useState([]);
  const [circuitosCore, setCircuitosCore] = useState([]);
  const [tareasResistencia, setTareasResistencia] = useState([]);
  const [circuitosResistencia, setCircuitosResistencia] = useState([]);
  const [tareasFuerza, setTareasFuerza] = useState([]);
  // Al elegir o cambiar el objetivo se rellenan RIR y %1RM de las tareas de fuerza
  // que estén vacías o rellenadas automáticamente (nunca las escritas a mano).
  const objetivoActivo = objetivoDeTexto(objetivo);
  const objetivoPrevioRef = useRef(objetivoActivo?.id);
  useEffect(() => {
    if (objetivoPrevioRef.current === objetivoActivo?.id) return;
    objetivoPrevioRef.current = objetivoActivo?.id;
    if (objetivoActivo) setTareasFuerza((prev) => prev.map((t) => aplicarSugerencia(objetivoActivo, t)));
  }, [objetivoActivo?.id]);
  // Progresión de carga al reutilizar una sesión: puntos de %1RM que se suben
  // a las tareas de Fuerza pautadas por %1RM. "0" = mantener todas.
  const [pasoProgresion, setPasoProgresion] = useState(sinProgresion ? "0" : "2");
  const cambiarPasoProgresion = (nuevo) => {
    setPasoProgresion(nuevo);
    const paso = Number(nuevo) || 0;
    const aplicar = (t) => (t.pct1rmOrigen == null || t.mantenerCarga ? t : { ...t, pct1rm: String(Math.min(100, Number(t.pct1rmOrigen) + paso)) });
    setTareasFuerza((prev) => prev.map(aplicar));
    setCircuitosFuerza((prev) => prev.map((c) => ({ ...c, tareas: (c.tareas || []).map(aplicar) })));
  };
  const [circuitosFuerza, setCircuitosFuerza] = useState([]);

  const [previousTareaIds, setPreviousTareaIds] = useState([]);
  const [activacionTareaId, setActivacionTareaId] = useState(null);
  const [cmjTareaId, setCmjTareaId] = useState(null);
  const [movilidadTareaIdsPorFecha, setMovilidadTareaIdsPorFecha] = useState({});
  const [preventivoTareaIdsPorFecha, setPreventivoTareaIdsPorFecha] = useState({}); // fecha -> [id, id, ...]
  const [previousCircuitoIds, setPreviousCircuitoIds] = useState([]);
  const [cargandoExistente, setCargandoExistente] = useState(isEditing || esReutilizacion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  // Solo se bloquea si algún jugador ya registró datos reales sobre esta
  // sesión (no basta con que esté "enviada" — ese campo solo indica que tú
  // la publicaste, se pone a true en cuanto guardas). Se determina de forma
  // asíncrona en el efecto de carga de abajo, mirando la tabla de registros.
  const [readOnly, setReadOnly] = useState(false);
  // Los dos efectos de abajo (reutilizar / cargar sesión existente) reparten
  // el borrador SOLO la primera vez que hay ejercicios cargados. Sin este
  // guard, cualquier cosa que refresque la lista de ejercicios más tarde
  // (p. ej. crear un ejercicio nuevo desde el propio editor) hace que
  // `ejerciciosLoaded` pase a false y vuelva a true, y el efecto se repetía
  // — reconstruyendo el borrador desde cero y borrando lo que ya se hubiera
  // añadido en esta sesión de edición, incluida la tarea recién creada.
  const borradorCargadoRef = useRef(false);

  // Reutilizar una sesión pasada: reparte sus tareas/circuitos en los mismos
  // bloques, pero generados como registros NUEVOS (sin tareaId/circuitoId
  // heredado) — al guardar se crean filas nuevas, la sesión original de la
  // que se partió no se toca. No hay llamada al backend: todo sale de las
  // tareas que Programación ya tenía cargadas para esa sesión.
  useEffect(() => {
    if (!esReutilizacion || !ejerciciosLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
    const tareas = plantilla.tareas || [];
    const porBloque = (nombreBloque, extra = {}) => tareas.filter((t) => t.bloque_sesion === nombreBloque && !t.circuito_id).map((t) => tareaADraft(t, ejerciciosById, { nuevo: true, ...extra }));
    const progresion = { pasoProgresion: Number(pasoProgresion) || 0 };
    setTareasCore(porBloque("Core"));
    setCircuitosCore(agruparCircuitosDeTareas(tareas, ejerciciosById, "Core", { nuevo: true }));
    setTareasResistencia(porBloque("Resistencia"));
    setCircuitosResistencia(agruparCircuitosDeTareas(tareas, ejerciciosById, "Resistencia", { nuevo: true }));
    setTareasFuerza(porBloque("Fuerza", progresion));
    setCircuitosFuerza(agruparCircuitosDeTareas(tareas, ejerciciosById, "Fuerza", { nuevo: true, ...progresion }));
    const activacionTarea = tareas.find((t) => t.bloque_sesion === "Activación");
    if (activacionTarea) {
      setDuracionActivacion(String(activacionTarea.cantidad || "8"));
      setUnidadActivacion(activacionTarea.modo === "tiempo" ? "segundos" : "minutos");
      setActivacionMateriales(parseMateriales(activacionTarea.material));
      const eAct = ejerciciosById.get(activacionTarea.ejercicio_id);
      if (eAct) {
        setActivacionEjercicioId(eAct.id);
        setActivacionEjercicioNombre(eAct.nombre || "(ejercicio eliminado)");
      }
    }
    const cmjTarea = tareas.find((t) => t.bloque_sesion === "CMJ");
    if (cmjTarea) setCmjActiva(true);
    setCargandoExistente(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esReutilizacion, ejerciciosLoaded]);

  // Carga de sesión existente (edición): reparte tareas/circuitos en su bloque real.
  useEffect(() => {
    if (!isEditing || !ejerciciosLoaded || !playersLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    let cancelled = false;
    (async () => {
      // Nunca fiarse del filtro del backend — se ha confirmado que no
      // filtra de verdad. Se filtra siempre aquí también, o al editar
      // cualquier sesión aparecerían mezcladas tareas y circuitos de todas
      // las demás sesiones que existan.
      const todasLasTareas = await api.list("tareas", { sesion_id: sesionExistente.id });
      const tareas = todasLasTareas.filter((t) => t.sesion_id === sesionExistente.id);
      const todosLosCircuitos = await api.list("circuitos", { sesion_id: sesionExistente.id });
      const circuitos = todosLosCircuitos.filter((c) => c.sesion_id === sesionExistente.id);
      // Se bloquea la sesión entera solo si ALGÚN jugador ya ENVIÓ datos
      // reales para alguna de sus tareas — un progreso "guardado sin
      // enviar" (enviado: false) no cuenta: mientras nadie haya confirmado
      // el envío, se edita con normalidad, esté "enviada" o no.
      const tareaIds = new Set(tareas.map((t) => t.id));
      const todosLosRegistros = tareaIds.size ? await api.list("registros", {}) : [];
      const hayRegistro = todosLosRegistros.some((r) => tareaIds.has(r.tarea_id) && r.enviado !== false);
      if (cancelled) return;
      setReadOnly(hayRegistro);
      const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
      const toDraft = (t) => {
        let materiales = [];
        try {
          materiales = t.material ? JSON.parse(t.material) : [];
        } catch {
          materiales = [];
        }
        // Sesiones diseñadas antes de este cambio guardaban Resistencia como
        // "intervalos/trabajo/descanso" en las columnas genéricas de series/
        // cantidad/rir — se leen igual si no hay resistencia_data, para no
        // perder lo ya diseñado.
        let resistencia = { tipo: "", capacidad: "", modalidad: "carrera", estructuraManual: false, bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "", recuperacionUnidad: "seg" };
        if (t.resistencia_data) {
          try {
            resistencia = { ...resistencia, ...JSON.parse(t.resistencia_data) };
          } catch {
            /* se queda el valor por defecto */
          }
        } else if (t.bloque_sesion === "Resistencia" && (t.series || t.cantidad || t.rir)) {
          resistencia = { ...resistencia, tipo: "hiit", intervalos: t.series ?? "", tiempo: t.cantidad ?? "", recuperacion: t.rir ?? "" };
        }
        const e = ejerciciosById.get(t.ejercicio_id) || {};
        return {
          key: t.id,
          tareaId: t.id,
          nombre: e.nombre || "(ejercicio eliminado)",
          ejercicioId: t.ejercicio_id,
          gif: e.gif_url || "",
          modo: t.modo || "reps",
          series: t.series ?? "",
          cantidad: t.cantidad ?? "",
          rir: t.rir ?? "",
          modoCarga: t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
          pct1rm: t.pct1rm ?? "",
          tipoResistencia: t.tipo_resistencia || "Peso libre",
          materiales,
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          tipoResistenciaCardio: resistencia.tipo,
          capacidad: resistencia.capacidad,
          modalidad: resistencia.modalidad,
          estructuraManual: resistencia.estructuraManual,
          bloques: resistencia.bloques,
          intervalos: resistencia.intervalos,
          tiempo: resistencia.tiempo,
          tiempoUnidad: resistencia.tiempoUnidad,
          intensidad: resistencia.intensidad,
          distancia: resistencia.distancia,
          duracion: resistencia.duracion,
          rpe: resistencia.rpe,
          recuperacion: resistencia.recuperacion,
          recuperacionUnidad: resistencia.recuperacionUnidad,
          circuito_id: t.circuito_id || "",
          orden_en_circuito: t.orden_en_circuito || "",
        };
      };

      const porBloque = (nombreBloque) => tareas.filter((t) => t.bloque_sesion === nombreBloque && !t.circuito_id).map(toDraft);
      const circuitosDelBloque = (nombreBloque) =>
        circuitos
          .filter((c) => c.bloque_sesion === nombreBloque)
          .map((c) => ({
            key: c.id,
            circuitoId: c.id,
            rondas: c.rondas || 1,
            nombre: c.nombre || "",
            tipo: c.tipo === "grupo" ? "grupo" : "circuito",
            tareas: tareas
              .filter((t) => t.circuito_id === c.id)
              .sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0))
              .map(toDraft),
          }));

      setTareasCore(porBloque("Core"));
      setCircuitosCore(circuitosDelBloque("Core"));
      setTareasResistencia(porBloque("Resistencia"));
      setCircuitosResistencia(circuitosDelBloque("Resistencia"));
      setTareasFuerza(porBloque("Fuerza"));
      setCircuitosFuerza(circuitosDelBloque("Fuerza"));
      const activacionTarea = tareas.find((t) => t.bloque_sesion === "Activación");
      if (activacionTarea) {
        setDuracionActivacion(String(activacionTarea.cantidad || "8"));
        setUnidadActivacion(activacionTarea.modo === "tiempo" ? "segundos" : "minutos");
        setActivacionMateriales(parseMateriales(activacionTarea.material));
        setActivacionTareaId(activacionTarea.id);
        const eAct = ejerciciosById.get(activacionTarea.ejercicio_id);
        if (eAct) {
          setActivacionEjercicioId(eAct.id);
          setActivacionEjercicioNombre(eAct.nombre || "(ejercicio eliminado)");
        }
      }
      const cmjTarea = tareas.find((t) => t.bloque_sesion === "CMJ");
      if (cmjTarea) {
        setCmjActiva(true);
        setCmjTareaId(cmjTarea.id);
      }
      const mapaPorFecha = (nombreBloque) => {
        const mapa = {};
        tareas.filter((t) => t.bloque_sesion === nombreBloque).forEach((t) => {
          mapa[t.fecha || ""] = t.id;
        });
        return mapa;
      };
      const mapaPorFechaArray = (nombreBloque) => {
        const mapa = {};
        tareas.filter((t) => t.bloque_sesion === nombreBloque).forEach((t) => {
          const clave = t.fecha || "";
          if (!mapa[clave]) mapa[clave] = [];
          mapa[clave].push(t.id);
        });
        return mapa;
      };
      const movilidadPorFecha = mapaPorFecha("Movilidad");
      const preventivoPorFecha = mapaPorFechaArray("Preventivo");
      setMovilidadTareaIdsPorFecha(movilidadPorFecha);
      setPreventivoTareaIdsPorFecha(preventivoPorFecha);

      // ---- Inferir el modo real de Movilidad y Preventivo a partir de lo
      // que ya está guardado (el modo no se persiste como columna).
      const tareasMovilidad = tareas.filter((t) => t.bloque_sesion === "Movilidad").sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));
      if (tareasMovilidad.length === 0) {
        // Nada guardado: la sesión se diseñó sin Movilidad. Antes se abría
        // como "automático" y el siguiente guardado le añadía una.
        setModoMovilidad("no_incluir");
        setConservarMovilidad(false);
      } else {
        const poolMovIds = new Set(ejercicios.filter((e) => e.bloque === "Movilidad").map((e) => e.id));
        const todasEnPool = tareasMovilidad.every((t) => poolMovIds.has(t.ejercicio_id));
        const mismoEjercicio = tareasMovilidad.every((t) => t.ejercicio_id === tareasMovilidad[0].ejercicio_id);
        if (!todasEnPool && mismoEjercicio) {
          // Un ejercicio que no sale del pool rotativo solo puede venir de
          // una elección manual — se recupera como tal.
          setModoMovilidad("manual");
          setTareaMovilidadManual(toDraft(tareasMovilidad[0]));
          setConservarMovilidad(false);
        } else {
          setModoMovilidad("automatico"); // se conservan los ya asignados (conservarMovilidad)
        }
      }

      const fechasPrev = Object.keys(preventivoPorFecha);
      if (fechasPrev.length === 0) {
        // Sin tareas de Preventivo guardadas: el bloque no se aplicó al
        // guardar (desactivado, o sin categoría común). Se abre como "no
        // incluir" para que editar no le añada un Preventivo por sorpresa;
        // basta cambiar el modo si se quiere activar.
        setModoPreventivo("no_incluir");
        setConservarPreventivo(false);
      } else {
        const tareasPorFechaPrev = fechasPrev.sort().map((f) => tareas.filter((t) => t.bloque_sesion === "Preventivo" && (t.fecha || "") === f));
        const firmas = tareasPorFechaPrev.map((ts) => ts.map((t) => t.ejercicio_id).join("|"));
        const todasIguales = firmas.every((f) => f === firmas[0]);
        const catComun = categoriaComunEntreJugadores(sesionExistente.jugadores_destino ?? null, players);
        const poolPrevIds = new Set(ejercicios.filter((e) => e.bloque === "Preventivo" && catComun && e.categoria_preventiva_id === catComun).map((e) => e.id));
        const todasEnPoolPrev = tareasPorFechaPrev.every((ts) => ts.every((t) => poolPrevIds.has(t.ejercicio_id)));
        const hayPreventivoPorJugador = tareas.some((t) => t.bloque_sesion === "Preventivo" && t.para_jugadores);
        if (!todasEnPoolPrev && todasIguales && !hayPreventivoPorJugador) {
          // El automático solo genera tareas con una categoría común y del
          // pool de esa categoría; si no cumplen, fueron elegidas a mano.
          setModoPreventivo("manual");
          setTareasPreventivoManual(tareasPorFechaPrev[0].map(toDraft));
          setConservarPreventivo(false);
        } else {
          setModoPreventivo("automatico");
        }
      }
      setPreviousTareaIds(tareas.map((t) => t.id));
      setPreviousCircuitoIds(circuitos.map((c) => c.id));
      setCargandoExistente(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, ejerciciosLoaded, playersLoaded]);

  const addFecha = () => {
    if (!nuevaFecha) return;
    if (!fechas.includes(nuevaFecha)) setFechas((prev) => [...prev, nuevaFecha].sort());
    setNuevaFecha("");
  };
  const removeFecha = (f) => setFechas((prev) => prev.filter((d) => d !== f));

  const agregarTarea = (bloqueSetter) => async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    let gifUrl = ejercicioOClic.gif_url || "";
    if (!ejercicioId) {
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: ejercicioOClic.bloque || "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        gifUrl = creado.gif_url || "";
        addEjercicioLocal(creado);
      } catch (e) {
        setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    bloqueSetter((prev) => [...prev, nuevaTareaBase({ id: ejercicioId, nombre, gif_url: gifUrl })]);
  };

  // Igual que en Resistencia: la modalidad ES la elección de "qué
  // ejercicio" para Activación — ya no se abre el buscador de la
  // Biblioteca, se resuelve (o se crea la primera vez) el ejercicio con el
  // nombre de la modalidad elegida.
  const cambiarModalidadActivacion = async (modalidadKey) => {
    const nombreModalidad = MODALIDADES_ACTIVACION[modalidadKey];
    try {
      const creado = await resolveEjercicio(ejercicios, { nombre: nombreModalidad, bloque: "", tags_descriptivos: [] });
      addEjercicioLocal(creado);
      setActivacionEjercicioId(creado.id);
      setActivacionEjercicioNombre(creado.nombre);
      setActivacionMateriales([]); // ejercicio nuevo -> el material anterior no tiene por qué aplicar
    } catch (e) {
      setError("No se pudo guardar la modalidad de activación. Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  // Movilidad en modo manual: una única tarea (a diferencia de Core/
  // Preventivo manual, que son listas) — elegir un ejercicio nuevo
  // reemplaza al anterior en vez de añadirse.
  const elegirEjercicioMovilidadManual = async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    let gifUrl = ejercicioOClic.gif_url || "";
    if (!ejercicioId) {
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: ejercicioOClic.bloque || "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        gifUrl = creado.gif_url || "";
        addEjercicioLocal(creado);
      } catch (e) {
        setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    setTareaMovilidadManual(nuevaTareaBase({ id: ejercicioId, nombre, gif_url: gifUrl }));
  };

  const guardar = async (comoBorrador = false) => {
    setError("");
    setOk(false);
    // Un borrador puede guardarse a medias (sin fecha todavía) para
    // retomarlo luego — la fecha solo es obligatoria al publicar de verdad,
    // porque ahí sí determina cuándo lo verá el jugador.
    if (!comoBorrador && !fechas.length) {
      setError("Añade al menos una fecha.");
      return;
    }
    // Salvaguarda: "Todos los jugadores" llega a los activos de TODOS los
    // equipos. Si hay varios equipos, se pide confirmar antes de publicar.
    if (!comoBorrador && !autoEnviar && targetPlayerIds === null && gruposDestino.length > 1) {
      const n = players.filter((p) => p.estado === "activo").length;
      if (!window.confirm(`Esta sesión se enviará a los ${n} jugadores activos de todos los equipos. ¿Continuar?\n\nSi solo es para un equipo, cancela y elígelo arriba en "¿Para quién es?" → Elegir jugadores → "Elegir por equipo".`)) return;
    }
    setGuardando(true);
    try {
      const sesionRecord = {
        id: sesionExistente?.id,
        fechas,
        md,
        objetivo,
        nombre: nombre.trim(),
        jugadores_destino: targetPlayerIds,
        preventivo_activo: preventivoCantidad,
        activacion_activa: activacionActiva,
        cmj_activo: cmjActiva,
        lote_origen_id: "",
        // "enviada" aquí significa "publicada, visible para el jugador" —
        // no que el jugador ya haya mandado datos. Un borrador se guarda con
        // esto en false, así que bootstrapJugador_ (que filtra por
        // s.enviada) sigue sin mostrárselo, y en Programación se distingue
        // con la etiqueta "BORRADOR" mezclada entre las próximas.
        //
        // Una sesión que YA estaba publicada nunca se despublica al guardar
        // (antes, "Guardar borrador" sobre una sesión publicada la quitaba
        // del móvil de los jugadores). Solo un borrador de verdad —sesión
        // nueva o que ya era borrador— se guarda sin publicar.
        enviada: comoBorrador ? isEditing && !!sesionExistente?.enviada : true,
      };
      // Sesión nueva: se crea como borrador y se publica al final, cuando todas
      // las tareas ya están guardadas (ver guardarFilaConParcial).
      const enviadaFinal = sesionRecord.enviada;
      const enviadaInicial = isEditing ? !!sesionExistente?.enviada : false;
      if (!sesionRecord.id) {
        if (!parcialRef.current.sesionId) parcialRef.current.sesionId = genId(ID_PREFIX.sesiones);
        sesionRecord.id = parcialRef.current.sesionId;
      }
      sesionRecord.enviada = enviadaInicial;
      const savedSesion = await api.save("sesiones", sesionRecord);

      const keepTareaIds = new Set();
      const keepCircuitoIds = new Set();

      // Todo lo propio de Resistencia (tipo continuo/HIIT/RSA y sus campos)
      // va en una sola columna JSON — los campos genéricos de series/cantidad/
      // rir se dejan vacíos para estas tareas, ya no se reaprovechan como antes.
      const serializarResistencia = (t) =>
        JSON.stringify({
          tipo: t.tipoResistenciaCardio || "",
          capacidad: t.capacidad || "",
          modalidad: t.modalidad || "carrera",
          estructuraManual: !!t.estructuraManual,
          bloques: t.bloques || "",
          series: t.series || "",
          intervalos: t.intervalos || "",
          tiempo: t.tiempo || "",
          tiempoUnidad: t.tiempoUnidad || "",
          intensidad: t.intensidad || "",
          distancia: t.distancia || "",
          duracion: t.duracion || "",
          rpe: t.rpe || "",
          recuperacion: t.recuperacion || "",
          recuperacionUnidad: t.recuperacionUnidad || "",
        });

      const guardarTareaSuelta = async (t, bloqueNombre, mostrarCarga) => {
        const ejercicioId = t.ejercicioId;
        const esResistencia = bloqueNombre === "Resistencia";
        const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
          id: t.tareaId,
          sesion_id: savedSesion.id,
          bloque_sesion: bloqueNombre,
          ejercicio_id: ejercicioId,
          modo: esResistencia ? "" : t.modo,
          series: esResistencia ? "" : t.series,
          cantidad: esResistencia ? "" : t.cantidad,
          rir: esResistencia ? "" : t.rir,
          // modo_carga tiene un CHECK en la base de datos (null o 'rir'/'pct1rm')
          // y pct1rm es numeric — un "" (string vacío) no es válido para
          // ninguno de los dos y el guardado fallaba con 400. Tienen que ir
          // como null, nunca como cadena vacía.
          modo_carga: esResistencia ? null : t.modoCarga || "rir",
          pct1rm: esResistencia || t.pct1rm === "" || t.pct1rm == null ? null : t.pct1rm,
          resistencia_data: esResistencia ? serializarResistencia(t) : "",
          tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
          material: JSON.stringify(t.materiales || []), // el material se guarda siempre, aunque el bloque no muestre carga (antes se perdía en Core)
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          descanso_seg: t.descanso ?? "",
          alterna_con: t.alternaCon || "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      };

      const guardarCircuito = async (c, bloqueNombre, mostrarCarga) => {
        const esResistencia = bloqueNombre === "Resistencia";
        const savedCircuito = await guardarFilaConParcial(parcialRef.current, "circuitos", { id: c.circuitoId, sesion_id: savedSesion.id, bloque_sesion: bloqueNombre, rondas: c.rondas || 1, nombre: c.nombre || "", tipo: c.tipo || "circuito" });
        keepCircuitoIds.add(savedCircuito.id);
        await Promise.all(
          c.tareas.map(async (t, i) => {
            const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
              id: t.tareaId,
              sesion_id: savedSesion.id,
              bloque_sesion: bloqueNombre,
              ejercicio_id: t.ejercicioId,
              modo: esResistencia ? "" : t.modo,
              series: esResistencia ? "" : t.series,
              cantidad: esResistencia ? "" : t.cantidad,
              rir: esResistencia ? "" : t.rir,
              modo_carga: esResistencia ? null : t.modoCarga || "rir",
              pct1rm: esResistencia || t.pct1rm === "" || t.pct1rm == null ? null : t.pct1rm,
              resistencia_data: esResistencia ? serializarResistencia(t) : "",
              tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
              material: JSON.stringify(t.materiales || []), // idem: antes se perdía en Core al ir dentro de un circuito
              lateralidad: t.lateralidad || "bilateral",
              nota: t.nota || "",
              descanso_seg: t.descanso ?? "",
              alterna_con: "",
              circuito_id: savedCircuito.id,
              orden_en_circuito: i + 1,
            });
            keepTareaIds.add(saved.id);
          })
        );
      };

      // Activación: una única tarea con el ejercicio que el entrenador elija
      // de la biblioteca (ya no fijo a "Bici estática"). Si se deja el
      // interruptor activado pero no se elige ejercicio, ANTES no se
      // guardaba ninguna tarea y la Activación desaparecía sin más del plan
      // del jugador (nada avisaba de que faltaba elegirlo) — ahora, en ese
      // caso, se resuelve "Bici estática" como ejercicio por defecto (el
      // comportamiento fijo que tenía Activación antes de poder elegir
      // ejercicio), así que activarla ya basta para que aparezca.
      let activacionEjercicioIdFinal = activacionEjercicioId;
      if (activacionActiva && !activacionEjercicioIdFinal) {
        try {
          const porDefecto = await resolveEjercicio(ejercicios, { nombre: "Bici estática", bloque: "", tags_descriptivos: [] });
          activacionEjercicioIdFinal = porDefecto.id;
          addEjercicioLocal(porDefecto);
        } catch (e) {
          // Si ni siquiera se puede resolver el ejercicio por defecto (sin
          // conexión, etc.), se sigue sin tarea de Activación esta vez, pero
          // el resto de la sesión se guarda igual.
        }
      }
      if (activacionActiva && activacionEjercicioIdFinal) {
        const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
          id: activacionTareaId || undefined,
          sesion_id: savedSesion.id,
          bloque_sesion: "Activación",
          ejercicio_id: activacionEjercicioIdFinal,
          modo: unidadActivacion === "segundos" ? "tiempo" : "minutos",
          series: "",
          cantidad: duracionActivacion,
          rir: "",
          tipo_resistencia: "",
          material: JSON.stringify(activacionMateriales || []),
          nota: "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      }

      // CMJ: día de medición puntual — no es una tarea configurable, es
      // siempre el mismo test. No hace falta que el entrenador elija nada:
      // se resuelve aquí solo (se crea la primera vez, luego se reutiliza).
      // Sin series/reps/RIR — no es una prescripción de carga, es un aviso
      // de que hoy toca test de salto.
      if (cmjActiva) {
        const ejercicioCmj = await resolveEjercicio(ejercicios, { nombre: "CMJ", bloque: "", sin_lateralidad: "si" });
        const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
          id: cmjTareaId || undefined,
          sesion_id: savedSesion.id,
          bloque_sesion: "CMJ",
          ejercicio_id: ejercicioCmj.id,
          modo: "reps",
          series: "",
          cantidad: "",
          rir: "",
          tipo_resistencia: "",
          material: "",
          nota: "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      }

      // Movilidad: 3 modos posibles (ver cambiarModo en el mockup).
      // "no_incluir" no guarda nada. "manual" guarda la única tarea que
      // eligió el entrenador, igual en todas las fechas de la sesión.
      // "automatico" es el comportamiento original: pool global, rotación
      // automática — una fecha, un turno. Cada fecha de la sesión avanza el
      // puntero por separado, así que fechas distintas de la misma sesión
      // pueden tocar ejercicios distintos.
      if (modoMovilidad === "manual" && tareaMovilidadManual) {
        for (const fecha of fechas) {
          const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
            id: movilidadTareaIdsPorFecha[fecha] || undefined,
            sesion_id: savedSesion.id,
            bloque_sesion: "Movilidad",
            ejercicio_id: tareaMovilidadManual.ejercicioId,
            fecha,
            modo: tareaMovilidadManual.modo,
            series: tareaMovilidadManual.series,
            cantidad: tareaMovilidadManual.cantidad,
            rir: "",
            tipo_resistencia: "",
            material: JSON.stringify(tareaMovilidadManual.materiales || []),
            lateralidad: tareaMovilidadManual.lateralidad || "bilateral",
            nota: tareaMovilidadManual.nota || "",
            circuito_id: "",
            orden_en_circuito: "",
          });
          keepTareaIds.add(saved.id);
        }
      } else if (modoMovilidad === "automatico") {
        const poolMovilidad = ejercicios
          .filter((e) => e.bloque === "Movilidad")
          .slice()
          .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));
        // Conservar lo ya asignado: la tarea de esa fecha se deja intacta
        // (ni se sortea ni se avanza el puntero) y se marca para que el
        // borrado final no la elimine. Solo se sortea para fechas nuevas.
        const fechasASortear = [];
        for (const fecha of fechas) {
          const idExistente = movilidadTareaIdsPorFecha[fecha];
          if (conservarMovilidad && idExistente) keepTareaIds.add(idExistente);
          else fechasASortear.push(fecha);
        }
        if (poolMovilidad.length) {
          for (const fecha of fechasASortear) {
            const elegido = await elegirSiguienteRotacion("movilidad", poolMovilidad);
            if (!elegido) continue;
            const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
              id: movilidadTareaIdsPorFecha[fecha] || undefined,
              sesion_id: savedSesion.id,
              bloque_sesion: "Movilidad",
              ejercicio_id: elegido.id,
              fecha,
              modo: "",
              series: "",
              cantidad: "",
              rir: "",
              tipo_resistencia: "",
              material: "",
              nota: "",
              circuito_id: "",
              orden_en_circuito: "",
            });
            keepTareaIds.add(saved.id);
          }
        }
      }
      // modoMovilidad === "no_incluir": no se guarda ninguna tarea de
      // Movilidad — las que hubiera antes se borran más abajo, al no estar
      // en keepTareaIds.

      // Preventivo: mismos 3 modos. "no_incluir" no guarda nada. "manual"
      // guarda las tareas concretas elegidas por el entrenador (una por
      // elemento de tareasPreventivoManual, por fecha). "automatico" es el
      // comportamiento original: de 0 a N ejercicios por fecha, según la
      // categoría común a todos los jugadores destinatarios — cada fecha
      // avanza el puntero de rotación por separado. Si no hay una única
      // categoría común, se omite sin avisar con error — es una omisión
      // esperada.
      if (modoPreventivo === "manual" && tareasPreventivoManual.length) {
        for (const fecha of fechas) {
          const idsExistentes = preventivoTareaIdsPorFecha[fecha] || [];
          for (let i = 0; i < tareasPreventivoManual.length; i++) {
            const t = tareasPreventivoManual[i];
            const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
              id: idsExistentes[i] || undefined,
              sesion_id: savedSesion.id,
              bloque_sesion: "Preventivo",
              ejercicio_id: t.ejercicioId,
              fecha,
              modo: t.modo,
              series: t.series,
              cantidad: t.cantidad,
              rir: "",
              tipo_resistencia: "",
              material: JSON.stringify(t.materiales || []),
              lateralidad: t.lateralidad || "bilateral",
              nota: t.nota || "",
              circuito_id: "",
              orden_en_circuito: "",
            });
            keepTareaIds.add(saved.id);
          }
        }
      } else if (modoPreventivo === "automatico" && preventivoCantidad > 0) {
        // Conservar lo ya asignado en las fechas que ya tienen Preventivo.
        const fechasPreventivoASortear = [];
        for (const fecha of fechas) {
          const idsExistentes = preventivoTareaIdsPorFecha[fecha] || [];
          if (conservarPreventivo && idsExistentes.length) idsExistentes.forEach((id) => keepTareaIds.add(id));
          else fechasPreventivoASortear.push(fecha);
        }
        // Categoría común a todos → como siempre (tarea para todos). Si no la
        // hay, se reparte por categoría: cada grupo de jugadores recibe los
        // ejercicios de la suya (tarea con para_jugadores).
        const catComun = fechasPreventivoASortear.length ? categoriaComunEntreJugadores(targetPlayerIds, players) : null;
        let gruposPreventivo = [];
        if (catComun) gruposPreventivo = [{ catId: catComun, jugadores: null }];
        else if (fechasPreventivoASortear.length) {
          const { porCategoria } = repartoPreventivoPorCategoria(targetPlayerIds, players);
          gruposPreventivo = [...porCategoria.entries()].map(([catId, jugadores]) => ({ catId, jugadores }));
        }
        for (const fecha of fechasPreventivoASortear) {
          const idsExistentes = preventivoTareaIdsPorFecha[fecha] || [];
          let indice = 0;
          for (const grupo of gruposPreventivo) {
            const poolPreventivo = ejercicios
              .filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === grupo.catId)
              .slice()
              .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));
            if (!poolPreventivo.length) continue;
            const elegidos = await elegirVariosRotacion(grupo.catId, poolPreventivo, preventivoCantidad);
            for (let k = 0; k < elegidos.length; k++) {
              const saved = await guardarFilaConParcial(parcialRef.current, "tareas", {
                id: idsExistentes[indice] || undefined,
                sesion_id: savedSesion.id,
                bloque_sesion: "Preventivo",
                ejercicio_id: elegidos[k].id,
                fecha,
                modo: "",
                series: "",
                cantidad: "",
                rir: "",
                tipo_resistencia: "",
                material: "",
                nota: "",
                para_jugadores: grupo.jugadores ? JSON.stringify(grupo.jugadores) : "",
                circuito_id: "",
                orden_en_circuito: "",
              });
              keepTareaIds.add(saved.id);
              indice++;
            }
          }
        }
      }

      await Promise.all(tareasCore.map((t) => guardarTareaSuelta(t, "Core", false)));
      await Promise.all(circuitosCore.map((c) => guardarCircuito(c, "Core", false)));
      await Promise.all(tareasResistencia.map((t) => guardarTareaSuelta(t, "Resistencia", false)));
      await Promise.all(circuitosResistencia.map((c) => guardarCircuito(c, "Resistencia", false)));
      await Promise.all(tareasFuerza.map((t) => guardarTareaSuelta(t, "Fuerza", true)));
      await Promise.all(circuitosFuerza.map((c) => guardarCircuito(c, "Fuerza", true)));

      const tareasABorrar = [...new Set([...previousTareaIds, ...parcialRef.current.tareas])].filter((id) => !keepTareaIds.has(id));
      const circuitosABorrar = [...new Set([...previousCircuitoIds, ...parcialRef.current.circuitos])].filter((id) => !keepCircuitoIds.has(id));
      await Promise.all(tareasABorrar.map((id) => api.delete("tareas", id)));
      await Promise.all(circuitosABorrar.map((id) => api.delete("circuitos", id)));

      // Todo guardado: ahora sí se publica la sesión si tocaba.
      if (enviadaFinal !== enviadaInicial) await api.save("sesiones", { ...sesionRecord, id: savedSesion.id, enviada: enviadaFinal });
      parcialRef.current = nuevoEstadoParcial();

      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();

      setOk(comoBorrador ? "borrador" : true);
      onGuardado?.();
    } catch (e) {
      setError(
        e?.message === "FALTA_SQL_PARA_JUGADORES"
          ? "Para dar Preventivo distinto a cada categoría hay que ejecutar antes sql/add_para_jugadores.sql en Supabase. No se ha publicado la sesión."
          : "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  };

  // Resumen de una línea por paso del nav (columna izquierda) — siempre
  // derivado de las variables de estado reales de cada bloque, nunca
  // inventado. Ver mockup_diseno_sesion.html L296-333 para el patrón
  // ("Bici · 8 min", "Automática", "2 tareas"...).
  const resumenBloque = (id) => {
    if (id === "activacion") {
      if (!activacionActiva) return "Sin activación";
      const unidad = unidadActivacion === "minutos" ? "min" : "seg";
      return `${activacionEjercicioNombre || "Bici estática"} · ${duracionActivacion || "—"} ${unidad}`;
    }
    if (id === "movilidad") {
      if (modoMovilidad === "no_incluir") return "No incluido";
      if (modoMovilidad === "manual") return tareaMovilidadManual ? tareaMovilidadManual.nombre : "Manual · sin elegir";
      return "Automática";
    }
    if (id === "preventivo") {
      if (modoPreventivo === "no_incluir") return "No incluido";
      if (modoPreventivo === "manual") return `${tareasPreventivoManual.length} tarea(s)`;
      return preventivoCantidad > 0 ? `Automático · ${preventivoCantidad}` : "Automático · 0";
    }
    if (id === "core") {
      const nTareas = tareasCore.length + circuitosCore.reduce((a, c) => a + (c.tareas?.length || 0), 0);
      if (!nTareas) return "Sin tareas";
      return `${nTareas} tarea(s)${circuitosCore.length ? ` · ${circuitosCore.length} circuito(s)` : ""}`;
    }
    if (id === "resistencia") {
      const nTareas = tareasResistencia.length + circuitosResistencia.reduce((a, c) => a + (c.tareas?.length || 0), 0);
      if (!nTareas) return "Sin tareas";
      return `${nTareas} tarea(s)${circuitosResistencia.length ? ` · ${circuitosResistencia.length} circuito(s)` : ""}`;
    }
    if (id === "cmj") return cmjActiva ? "Con medición" : "Sin medición hoy";
    if (id === "fuerza") {
      const nTareas = tareasFuerza.length + circuitosFuerza.reduce((a, c) => a + (c.tareas?.length || 0), 0);
      if (!nTareas) return "Sin tareas";
      return `${nTareas} tarea(s)${circuitosFuerza.length ? ` · ${circuitosFuerza.length} circuito(s)` : ""}`;
    }
    return "";
  };


  const autoLanzadoRef = useRef(false);
  useEffect(() => {
    if (!autoEnviar || autoLanzadoRef.current || cargandoExistente || !ejerciciosLoaded) return;
    autoLanzadoRef.current = true;
    guardar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnviar, cargandoExistente, ejerciciosLoaded]);
  useEffect(() => {
    if (autoEnviar && error && onFallo) onFallo(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const loaded = playersLoaded && categoriasLoaded && ejerciciosLoaded && materialesLoaded && !cargandoExistente;
  if (!loaded) return <LoadingBlock />;

  const bloqueInfo = BLOQUES_DISENO.find((x) => x.id === bloqueActivo) || BLOQUES_DISENO[0];

  // ---- Resumen de la sesión (panel derecho): todo derivado del borrador.
  const zonaDe = (t) => ((ejercicios.find((e) => e.id === t.ejercicioId)?.tags_descriptivos || [])[0] || "");
  const alternarEnlace = (setLista, i, lista) => () =>
    setLista((prev) => prev.map((x, k) => {
      if (k !== i) return x;
      const sig = prev[i + 1];
      if (!sig) return x;
      return x.alternaCon && x.alternaCon === sig.ejercicioId ? { ...x, alternaCon: "", alternaConNombre: "" } : { ...x, alternaCon: sig.ejercicioId, alternaConNombre: sig.nombre };
    }));
  const aplicarAlternancia = (a, b, bloque) => {
    const marcar = (arr) => arr.map((t) => (t.key === a.key ? { ...t, alternaCon: b.ejercicioId, alternaConNombre: b.nombre } : t));
    if (bloque === "Fuerza") setTareasFuerza(marcar);
    else setTareasCore(marcar);
  };
  const resumenDiseno = (() => {
    const segActivacion = activacionActiva ? aSegundosDiseno(duracionActivacion, unidadActivacion === "minutos" ? "min" : "seg") : 0;
    const segMovilidad = modoMovilidad === "no_incluir" ? 0 : modoMovilidad === "automatico" ? 300 : tareaMovilidadManual ? 300 : 0;
    const nPrev = modoPreventivo === "no_incluir" ? 0 : modoPreventivo === "automatico" ? Number(preventivoCantidad) || 0 : tareasPreventivoManual.length;
    const segPreventivo = nPrev * 180;
    const segCore = estimarBloqueTareasSeg(tareasCore, circuitosCore.map((c) => ({ ...c })), "Core");
    const segResistencia = [...tareasResistencia, ...circuitosResistencia.flatMap((c) => c.tareas || [])].reduce((sum, t) => sum + estimarResistenciaSeg(t), 0);
    const segFuerza = estimarBloqueTareasSeg(tareasFuerza, circuitosFuerza, "Fuerza");
    const segCmj = cmjActiva ? 300 : 0;
    const nTareasDe = (tareas, circuitos) => tareas.length + circuitos.reduce((a, c) => a + (c.tareas?.length || 0), 0);
    const lineaTarea = (t, bloque) => {
      const unidad = t.modo === "tiempo" ? "s" : t.modo === "minutos" ? "min" : t.modo === "metros" ? "m" : "";
      const volumen = t.series || t.cantidad ? `${t.series || "?"}×${t.cantidad || "?"}${unidad}${t.lateralidad === "unilateral" ? " (unilat.)" : ""}` : "sin series/reps";
      const carga = bloque !== "Fuerza" ? "" : t.modoCarga === "pct1rm" ? (Number(t.pct1rm) > 0 ? `${t.pct1rm} %1RM` : "sin %1RM") : t.rir !== "" && t.rir != null ? `RIR ${t.rir}` : "sin RIR";
      const desc = (Number(t.series) || 0) > 1 ? `desc. ${descansoEfectivoSeg(t, bloque)} s` : "";
      return { titulo: t.nombre, sub: [volumen, carga, desc, t.alternaCon ? `↔ ${t.alternaConNombre || "otro"}` : ""].filter(Boolean).join(" · "), seg: estimarTareaSeg(t, bloque) };
    };
    const itemsDe = (tareas, circuitos, bloque) => [
      ...tareas.map((t) => lineaTarea(t, bloque)),
      ...circuitos.map((c, i) => ({ titulo: `Circuito ${i + 1} · ${Number(c.rondas) || 1} ronda(s)`, sub: (c.tareas || []).map((t) => t.nombre).join(", ") || "vacío", seg: estimarCircuitoSeg(c, bloque) })),
    ];
    const bloques = [
      { id: "activacion", nombre: "Activación", seg: segActivacion, detalle: activacionActiva ? "" : "no incluida", vacio: !activacionActiva, items: activacionActiva ? [{ titulo: activacionEjercicioNombre || "Bici estática", sub: `${duracionActivacion || "—"} ${unidadActivacion === "minutos" ? "min" : "seg"}`, seg: segActivacion }] : [] },
      { id: "movilidad", nombre: "Movilidad", seg: segMovilidad, detalle: segMovilidad ? "estimado" : "no incluida", vacio: !segMovilidad, items: segMovilidad ? [{ titulo: modoMovilidad === "automatico" ? "Ejercicio del pool rotativo" : tareaMovilidadManual?.nombre || "—", sub: modoMovilidad === "automatico" ? "se elige al guardar" : "elegido a mano", seg: segMovilidad }] : [] },
      { id: "preventivo", nombre: "Preventivo", seg: segPreventivo, detalle: nPrev ? `${nPrev} ejercicio(s) · estimado` : "no incluido", vacio: !nPrev, items: nPrev ? (modoPreventivo === "automatico" ? [{ titulo: `${nPrev} ejercicio(s) de la categoría preventiva`, sub: "se eligen al guardar", seg: segPreventivo }] : tareasPreventivoManual.map((t) => ({ titulo: t.nombre, sub: "elegido a mano", seg: 180 }))) : [] },
      { id: "core", nombre: "Core", seg: segCore, detalle: nTareasDe(tareasCore, circuitosCore) ? `${nTareasDe(tareasCore, circuitosCore)} tarea(s)` : "sin tareas", vacio: !nTareasDe(tareasCore, circuitosCore), items: itemsDe(tareasCore, circuitosCore, "Core"), sinDato: nTareasDe(tareasCore, circuitosCore) > 0 && !segCore },
      { id: "resistencia", nombre: "Resistencia", seg: segResistencia, detalle: nTareasDe(tareasResistencia, circuitosResistencia) ? `${nTareasDe(tareasResistencia, circuitosResistencia)} tarea(s)` : "sin tareas", vacio: !nTareasDe(tareasResistencia, circuitosResistencia), items: [...tareasResistencia, ...circuitosResistencia.flatMap((c) => c.tareas || [])].map((t) => ({ titulo: t.nombre, sub: [t.tipoResistenciaCardio ? t.tipoResistenciaCardio.toUpperCase() : "sin tipo", t.capacidad].filter(Boolean).join(" · "), seg: estimarResistenciaSeg(t) })), sinDato: nTareasDe(tareasResistencia, circuitosResistencia) > 0 && !segResistencia },
      { id: "cmj", nombre: "CMJ", seg: segCmj, detalle: cmjActiva ? "estimado" : "no incluido", vacio: !cmjActiva, items: cmjActiva ? [{ titulo: "Medición CMJ", sub: "el jugador verá un aviso en su sesión", seg: segCmj }] : [] },
      { id: "fuerza", nombre: "Fuerza", seg: segFuerza, detalle: nTareasDe(tareasFuerza, circuitosFuerza) ? `${nTareasDe(tareasFuerza, circuitosFuerza)} tarea(s)` : "sin tareas", vacio: !nTareasDe(tareasFuerza, circuitosFuerza), items: itemsDe(tareasFuerza, circuitosFuerza, "Fuerza"), sinDato: nTareasDe(tareasFuerza, circuitosFuerza) > 0 && !segFuerza },
    ];
    const totalSeg = bloques.reduce((sum, b) => sum + b.seg, 0);

    const fuerzaTareas = [...tareasFuerza, ...circuitosFuerza.flatMap((c) => c.tareas || [])];
    const seriesFuerza = tareasFuerza.reduce((sum, t) => sum + (Number(t.series) || 0), 0) + circuitosFuerza.reduce((sum, c) => sum + (Number(c.rondas) || 1) * (c.tareas?.length || 0), 0);
    const pcts = fuerzaTareas.filter((t) => t.modoCarga === "pct1rm" && Number(t.pct1rm) > 0).map((t) => Number(t.pct1rm));
    const rirs = fuerzaTareas.filter((t) => t.modoCarga !== "pct1rm" && t.rir !== "" && t.rir != null && !Number.isNaN(Number(t.rir))).map((t) => Number(t.rir));
    const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const sinCarga = fuerzaTareas.filter((t) => (t.modoCarga === "pct1rm" ? !(Number(t.pct1rm) > 0) : t.rir === "" || t.rir == null));
    const sinSeries = fuerzaTareas.filter((t) => !(Number(t.series) > 0) || !(Number(t.cantidad) > 0));

    const porZona = {};
    tareasFuerza.forEach((t) => {
      const z = zonaDe(t) || "Sin zona";
      porZona[z] = (porZona[z] || 0) + (Number(t.series) || 0);
    });
    circuitosFuerza.forEach((c) => (c.tareas || []).forEach((t) => {
      const z = zonaDe(t) || "Sin zona";
      porZona[z] = (porZona[z] || 0) + (Number(c.rondas) || 1);
    }));
    const descansos = tareasFuerza.filter((t) => (Number(t.series) || 0) > 1).map((t) => descansoEfectivoSeg(t, "Fuerza"));
    const repsTotales = tareasFuerza.reduce((sum, t) => sum + (t.modo === "reps" ? (Number(t.series) || 0) * (Number(t.cantidad) || 0) : 0), 0);
    const filasDescanso = tareasFuerza
      .filter((t) => (Number(t.series) || 0) > 1)
      .map((t) => ({ t, seg: descansoEfectivoSeg(t, "Fuerza"), propio: Number(t.descanso) > 0 }));
    const sugerencias = [
      ...sugerirAlternancias(tareasFuerza, "Fuerza", zonaDe).map((o) => ({ ...o, bloque: "Fuerza" })),
      ...sugerirAlternancias(tareasCore, "Core", zonaDe).map((o) => ({ ...o, bloque: "Core" })),
    ];
    const avisos = [];
    if (!fechas.length) avisos.push("Sin fechas: no se podrá enviar.");
    if (targetPlayerIds !== null && !(targetPlayerIds || []).length) avisos.push("Sin jugadores destinatarios: no se podrá enviar.");
    if (sinCarga.length) avisos.push(`${sinCarga.length} ejercicio(s) de Fuerza sin %1RM ni RIR (${sinCarga.slice(0, 2).map((t) => t.nombre).join(", ")}${sinCarga.length > 2 ? "…" : ""}).`);
    if (sinSeries.length) avisos.push(`${sinSeries.length} ejercicio(s) de Fuerza sin series o repeticiones: no cuentan en el tiempo estimado.`);
    return { bloques, totalSeg, fuerza: { n: fuerzaTareas.length, series: seriesFuerza, pct: media(pcts), rir: media(rirs), porZona, descansoMedio: media(descansos), repsTotales, segTrabajo: segFuerza }, filasDescanso, sugerencias, avisos };
  })();

  // Cuántas veces está cada ejercicio ya en la sesión — lo consume el selector
  // para marcar «en sesión ×N» sin que el entrenador repita por error.
  const conteoEnSesion = (() => {
    const m = {};
    const cuenta = (t) => { const id = t && (t.ejercicioId || t.ejercicio_id); if (id) m[id] = (m[id] || 0) + 1; };
    [tareasCore, tareasResistencia, tareasFuerza, tareasPreventivoManual].forEach((l) => (l || []).forEach(cuenta));
    [circuitosCore, circuitosResistencia, circuitosFuerza].forEach((l) => (l || []).forEach((c) => (c.tareas || []).forEach(cuenta)));
    return (id) => m[id] || 0;
  })();

  const etiquetaGuardar = isEditing && sesionExistente?.enviada ? "Guardar cambios" : "Guardar en biblioteca";
  const botonGuardar = (corto) => (
    <button
      type="button"
      onClick={() => guardar(true)}
      disabled={guardando}
      title={isEditing && sesionExistente?.enviada ? "Guarda los cambios sin cambiar el estado: la sesión sigue publicada para los jugadores" : "Se guarda tal cual está, sin fecha obligatoria. No se envía a los jugadores: la asignación (para quién y cuándo) se hace en el paso siguiente."}
      style={{ flexShrink: 0, minHeight: 44, padding: "0 16px", borderRadius: 10, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink, fontFamily: dsF.sans, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", opacity: guardando ? 0.6 : 1 }}
    >
      {guardando ? "Guardando..." : (corto || lateralBloques) ? "Guardar" : etiquetaGuardar}
    </button>
  );
  const botonSiguiente = (corto) => (
    <button
      type="button"
      onClick={() => setRevisandoEnvio(true)}
      disabled={guardando}
      style={{ flexShrink: 0, minHeight: 44, padding: "0 18px", borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontFamily: dsF.sans, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", opacity: guardando ? 0.6 : 1 }}
    >
      {corto ? "Siguiente →" : "Siguiente: asignar →"}
    </button>
  );
  const sinJugadores = targetPlayerIds !== null && !targetPlayerIds.length;
  const chipsSesion = (
    <>
      <button type="button" onClick={() => setAjustesAbiertos(true)} disabled={readOnly} style={{ flexShrink: 0, minHeight: 40, padding: "0 12px", borderRadius: 999, border: `1px solid ${sinJugadores ? ds.danger : ds.accent}`, background: ds.accentSubtle, color: sinJugadores ? ds.danger : ds.accent, fontFamily: dsF.sans, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
        {targetPlayerIds === null ? "✓ Todos los jugadores" : targetPlayerIds.length ? `${targetPlayerIds.length} jugador${targetPlayerIds.length === 1 ? "" : "es"}` : "Elige jugadores"} ▾
      </button>
      <button type="button" onClick={() => setAjustesAbiertos(true)} disabled={readOnly} style={{ flexShrink: 0, minHeight: 40, maxWidth: 200, padding: "0 12px", borderRadius: 999, border: `1px ${objetivo ? "solid" : "dashed"} ${ds.border}`, background: "transparent", color: objetivo ? ds.ink : ds.inkMuted, fontFamily: dsF.sans, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {objetivo ? objetivo : "+ Objetivo"}
      </button>
      <button type="button" onClick={() => setDetallesAbiertos(true)} title="Fechas de la sesión y clasificación MD" style={{ flexShrink: 0, minHeight: 40, padding: "0 12px", borderRadius: 999, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, fontFamily: dsF.sans, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
        {fechas.length ? `${fechas.length} fecha${fechas.length === 1 ? "" : "s"}` : "Fechas"}{md ? ` · ${md}` : ""}
      </button>
    </>
  );
  const filaNombre = (
    <>
      <button type="button" aria-label={readOnly ? "Volver" : "Salir sin guardar"} title={readOnly ? "Volver" : "Salir sin guardar"} onClick={onBack} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, border: "none", background: "transparent", color: ds.inkSecondary, fontSize: 22, cursor: "pointer" }}>←</button>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={readOnly}
        placeholder="Nombre de la sesión"
        aria-label="Nombre de la sesión"
        style={{ flex: lateralBloques ? "1 1 200px" : "1 1 140px", minWidth: lateralBloques ? 150 : 0, maxWidth: lateralBloques ? 320 : undefined, minHeight: 44, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 10, color: ds.ink, fontWeight: 700, padding: "0 12px", boxSizing: "border-box" }}
      />
    </>
  );
  const botonesCabecera = !readOnly && ancho >= 700 ? <>{botonGuardar(!lateralBloques)}{botonSiguiente(!lateralBloques || ancho < 1250)}</> : null;
  const resumenCabecera = <BarraResumenDisenoReal compacta resumen={resumenDiseno} bloqueActivo={bloqueActivo} onIrBloque={setBloqueActivo} />;
  const filaFlex = { display: "flex", alignItems: "center", gap: 8 };

  const destinosBiblio = [
    { id: "fuerza", nombre: "Fuerza", onAdd: (...a) => { setBloqueActivo("fuerza"); return agregarTarea(setTareasFuerza)(...a); } },
    { id: "core", nombre: "Core", onAdd: (...a) => { setBloqueActivo("core"); return agregarTarea(setTareasCore)(...a); } },
    ...(modoPreventivo === "manual" ? [{ id: "preventivo", nombre: "Preventivo", onAdd: (...a) => { setBloqueActivo("preventivo"); return agregarTarea(setTareasPreventivoManual)(...a); } }] : []),
  ];
  const guiaObjetivo = objetivoDeTexto(objetivo);
  const destinoActual = destinosBiblio.find((d) => d.id === destinoBiblio) || destinosBiblio[0];

  return (
    <EnSesionContext.Provider value={conteoEnSesion}>
    <BibliotecaSlotContext.Provider value={lateralBloques ? slotBiblio : null}>
    <>
    <PantallaBase rol="entrenador" maxWidth={lateralBloques ? 1320 : ancho >= 700 ? 900 : 640} layoutFijo>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 12, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {lateralBloques ? (
              <div style={filaFlex}>{filaNombre}{chipsSesion}<span style={{ flex: 1 }} />{resumenCabecera}{botonesCabecera}</div>
            ) : (
              <>
                <div style={filaFlex}>{filaNombre}{ancho >= 700 && botonesCabecera}</div>
                <div style={{ ...filaFlex, overflowX: "auto" }}>{chipsSesion}<span style={{ flex: 1 }} />{resumenCabecera}</div>
              </>
            )}
          </div>
        {readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "10px 12px", marginBottom: 18, fontSize: 12.5, color: ds.accent }}>
            <Lock size={13} style={{ flexShrink: 0 }} />
            Un jugador ya envió esta sesión — solo lectura. Para cambiar algo, vuelve al listado y usa "Reutilizar como nueva".
          </div>
        )}
        {esReutilizacion && !isEditing && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 18, fontSize: 12.5, color: ds.inkSecondary }}>
            <span style={{ fontWeight: 700, color: ds.ink }}>Progresión de carga</span>
            <span>Subir tareas de Fuerza pautadas por %1RM:</span>
            <select
              value={pasoProgresion}
              onChange={(e) => cambiarPasoProgresion(e.target.value)}
              style={{ fontFamily: dsF.mono, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink }}
            >
              <option value="0">No subir (mantener)</option>
              {["1", "2", "3", "5"].map((n) => (
                <option key={n} value={n}>+{n} % 1RM</option>
              ))}
            </select>
            <span style={{ fontSize: 11.5, color: ds.inkMuted }}>
              Las tareas pautadas por RIR no cambian. Puedes mantener la carga de una tarea concreta con el botón que aparece junto a su %1RM.
            </span>
          </div>
        )}
          {!readOnly && error && <div style={{ color: ds.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          {!readOnly && ok && <div style={{ color: ds.success, fontSize: 13, marginBottom: 8 }}>{ok === "borrador" ? (isEditing && sesionExistente?.enviada ? "Cambios guardados. La sesión sigue publicada." : "Guardado como borrador.") : "Guardado y enviado."}</div>}
          {ajustesAbiertos && (
            <div onClick={() => setAjustesAbiertos(false)} style={{ position: "fixed", inset: 0, zIndex: 56, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 16px 16px" }}>
              <div onClick={(ev) => ev.stopPropagation()} className="ds-reset" style={{ width: "100%", maxWidth: 560, maxHeight: "calc(100dvh - 96px)", overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <strong style={{ flex: 1, fontFamily: dsF.display, fontSize: 15 }}>Para quién y objetivo</strong>
                  <button type="button" onClick={() => setAjustesAbiertos(false)} style={{ minHeight: 44, padding: "0 18px", borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, cursor: "pointer" }}>Hecho</button>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Objetivo (opcional)</span>
                  <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} style={{ minHeight: 46, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 10, color: ds.ink, padding: "0 12px" }} />
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {OBJETIVOS_SESION.map((o) => {
                      const activo = guiaObjetivo?.id === o.id;
                      return (
                        <button key={o.id} type="button" onClick={() => setObjetivo(activo ? "" : o.etiqueta)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, cursor: "pointer", border: `1px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accentSubtle : "transparent", color: activo ? ds.accent : ds.ink, fontWeight: 600 }}>
                          {o.etiqueta}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 11.5, color: ds.inkMuted, lineHeight: 1.4 }}>Con «Fuerza» o «Hipertrofia» el diseñador te muestra el rango de RIR y el %1RM adecuados y avisa si una tarea se sale. Un objetivo escrito a mano no activa la guía.</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>¿Para quién es?</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[{ v: "equipo", t: "Todos los jugadores" }, { v: "concretos", t: "Elegir jugadores" }].map(({ v, t }) => {
                      const activo = (targetPlayerIds === null) === (v === "equipo");
                      return (
                        <button key={v} type="button" onClick={() => setTargetPlayerIds(v === "equipo" ? null : targetPlayerIds || [])} style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, cursor: "pointer", border: `1px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accentSubtle : "transparent", color: activo ? ds.accent : ds.inkSecondary, fontFamily: dsF.sans, fontWeight: activo ? 700 : 500, fontSize: 14 }}>
                          {activo ? "✓ " : ""}{t}
                        </button>
                      );
                    })}
                  </div>
                  {targetPlayerIds !== null && (
                    <>
                      <ListaJugadoresCheckReal players={players} seleccionados={targetPlayerIds} onCambiar={setTargetPlayerIds} grupos={gruposDestino} />
                      <span style={{ fontSize: 12.5, color: targetPlayerIds.length ? ds.inkMuted : ds.danger }}>
                        {targetPlayerIds.length ? `${targetPlayerIds.length} jugador(es) seleccionados` : "Elige al menos un jugador para poder enviar la sesión."}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {detallesAbiertos && (
            <div onClick={() => setDetallesAbiertos(false)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 16px 16px" }}>
            <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 900, maxHeight: "calc(100dvh - 72px)", overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 12, boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 4px" }}>
              <span style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700 }}>Configuración de la sesión</span>
              <button type="button" onClick={() => setDetallesAbiertos(false)} style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 7, padding: "5px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Listo</button>
            </div>
            <div style={{ padding: "4px 14px 15px", display: "grid", gridTemplateColumns: anchoDesktop ? "repeat(4, 1fr)" : "1fr 1fr", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre de plantilla</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder='Ej. "Fuerza tren inferior — pretemporada"'
                  style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Objetivo</span>
                <input
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Opcional"
                  style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Para</span>
                <select
                  value={targetPlayerIds === null ? "equipo" : "concretos"}
                  onChange={(e) => setTargetPlayerIds(e.target.value === "equipo" ? null : targetPlayerIds || [])}
                  style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, fontWeight: 600, padding: "7px 9px" }}
                >
                  <option value="equipo">Todos los jugadores</option>
                  <option value="concretos">Jugadores concretos</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>MD</span>
                <select value={md} onChange={(e) => setMd(e.target.value)} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }}>
                  <option value="">Sin clasificar</option>
                  {MD_TAGS.filter((t) => t !== "Sin MD").map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {targetPlayerIds !== null && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <ListaJugadoresCheckReal players={players} seleccionados={targetPlayerIds} onCambiar={setTargetPlayerIds} grupos={gruposDestino} />
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", marginBottom: 6, fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fechas en las que se aplica</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {fechas.map((f) => (
                    <span key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: dsF.mono, fontSize: 11.5, color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "4px 8px" }}>
                      {f}
                      {microsCargados && ventanasDiseno.length > 0 && (() => {
                        const m = cmjMicroDeFecha(f, ventanasDiseno);
                        return m ? <span style={{ color: ds.inkMuted, fontSize: 10 }}>· Micro {m.numero}</span> : <span title="Esta fecha no cae en ningún microciclo del CMJ" style={{ color: ds.inkMuted, fontSize: 10 }}>· sin microciclo</span>;
                      })()}
                      <span onClick={() => removeFecha(f)} style={{ cursor: "pointer", color: ds.inkMuted }}>
                        ×
                      </span>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }} />
                  <button onClick={addFecha} style={{ background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
                    + Añadir fecha
                  </button>
                </div>
              </div>
            </div>
            </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>

          <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0, alignItems: "stretch", overflow: "hidden" }}>
          {lateralBloques && <div ref={setSlotBiblio} style={{ width: 330, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }} />}
          {lateralBloques && !readOnly && <SelectorEjercicioReal panelFijo ejercicios={ejercicios} bloque={destinoActual.nombre} onAdd={destinoActual.onAdd} onAsignarZona={asignarZonaYActualizar} destinos={destinosBiblio} destinoId={destinoActual.id} onCambiarDestino={setDestinoBiblio} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "stretch", flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", paddingBottom: 6 }}>
          {/* Constructor: una tarjeta desplegable por bloque. */}
          <div style={{ flex: "0 0 auto", width: "100%", pointerEvents: readOnly ? "none" : undefined, boxSizing: "border-box" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <TarjetaBloqueDiseno id="activacion" abierto={bloqueActivo === "activacion"} onToggle={() => setBloqueActivo((p) => (p === "activacion" ? null : "activacion"))} resumen={resumenBloque("activacion")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "activacion")?.vacio} color={COLOR_BLOQUE_DISENO["activacion"]}>
                {bloqueActivo === "activacion" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div onClick={() => setActivacionActiva((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <span style={{ width: 34, height: 20, borderRadius: 10, background: activacionActiva ? ds.accent : ds.border, position: "relative", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: activacionActiva ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: ds.canvas }} />
                      </span>
                      <span style={{ fontSize: 13, color: activacionActiva ? ds.ink : ds.inkMuted }}>{activacionActiva ? "Activada para esta sesión" : "Sin acceso a activación — sesión empieza en Movilidad"}</span>
                    </div>
                    {activacionActiva && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>MODALIDAD</span>
                          <select
                            value={Object.entries(MODALIDADES_ACTIVACION).find(([, v]) => v === activacionEjercicioNombre)?.[0] || "bici"}
                            onChange={(e) => cambiarModalidadActivacion(e.target.value)}
                            style={{ width: 200, fontFamily: dsF.sans, fontSize: 11.5, fontWeight: 600, padding: "6px 9px", borderRadius: 6, border: `1px solid ${ds.border}`, background: ds.surfaceRaised, color: ds.ink }}
                          >
                            {Object.entries(MODALIDADES_ACTIVACION).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        {activacionEjercicioId && (
                          <div style={{ maxWidth: 220 }}>
                            <SelectorMaterialReal
                              seleccionados={activacionMateriales}
                              disponibles={materialesDisponibles}
                              onCambiar={setActivacionMateriales}
                              onAgregarMaterial={agregarMaterial}
                            />
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>TIEMPO</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input value={duracionActivacion} onChange={(e) => setDuracionActivacion(e.target.value)} style={campoStyleDiseno(50)} />
                          <button
                            onClick={() => setUnidadActivacion((u) => (u === "minutos" ? "segundos" : "minutos"))}
                            style={{
                              fontSize: 11,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: `1px solid ${ds.border}`,
                              background: ds.border,
                              color: ds.accent,
                              cursor: "pointer",
                            }}
                          >
                            {unidadActivacion === "minutos" ? "min" : "seg"}
                          </button>
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="movilidad" abierto={bloqueActivo === "movilidad"} onToggle={() => setBloqueActivo((p) => (p === "movilidad" ? null : "movilidad"))} resumen={resumenBloque("movilidad")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "movilidad")?.vacio} color={COLOR_BLOQUE_DISENO["movilidad"]}>
                {bloqueActivo === "movilidad" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <select value={modoMovilidad} onChange={(e) => { setModoMovilidad(e.target.value); setConservarMovilidad(false); }} style={campoSelectReal({ maxWidth: 220 })}>
                      <option value="automatico">Automático (pool rotativo)</option>
                      <option value="manual">Manual (elegir ejercicio)</option>
                      <option value="no_incluir">No incluir</option>
                    </select>
                    {modoMovilidad === "automatico" &&
                      (() => {
                        const poolMov = ejercicios.filter((e) => e.bloque === "Movilidad");
                        const nAsignadas = Object.keys(movilidadTareaIdsPorFecha).length;
                        return (
                          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                            {conservarMovilidad && nAsignadas
                              ? "Se conservan los ejercicios de Movilidad ya asignados a esta sesión. Cambia el modo si quieres volver a sortearlos."
                              : poolMov.length
                              ? `La app elegirá automáticamente el siguiente ejercicio del pool de Movilidad (${poolMov.length} en el pool) al guardar. No requiere acción aquí.`
                              : "No hay ejercicios en el pool de Movilidad todavía — añade alguno en Biblioteca para que este bloque se aplique."}
                          </div>
                        );
                      })()}
                    {modoMovilidad === "manual" &&
                      (tareaMovilidadManual ? (
                        <FilaTareaReal
                          tarea={tareaMovilidadManual}
                          mostrarCarga={false}
                          materialesDisponibles={materialesDisponibles}
                          onAgregarMaterial={agregarMaterial}
                          onCambiar={(nuevo) => setTareaMovilidadManual(nuevo)}
                          onEliminar={() => setTareaMovilidadManual(null)}
                          onAmpliarVideo={setVideoAmpliado}
                        />
                      ) : (
                        <SelectorEjercicioReal ejercicios={ejercicios} bloque="Movilidad" onAdd={elegirEjercicioMovilidadManual} onAsignarZona={asignarZonaYActualizar} />
                      ))}
                    {modoMovilidad === "no_incluir" && (
                      <div style={{ fontSize: 12.5, color: ds.inkMuted, textAlign: "center" }}>Bloque desactivado — no se incluirá en esta sesión.</div>
                    )}
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="preventivo" abierto={bloqueActivo === "preventivo"} onToggle={() => setBloqueActivo((p) => (p === "preventivo" ? null : "preventivo"))} resumen={resumenBloque("preventivo")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "preventivo")?.vacio} color={COLOR_BLOQUE_DISENO["preventivo"]}>
                {bloqueActivo === "preventivo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <select value={modoPreventivo} onChange={(e) => { setModoPreventivo(e.target.value); setConservarPreventivo(false); }} style={campoSelectReal({ maxWidth: 220 })}>
                      <option value="automatico">Automático (pool por categoría)</option>
                      <option value="manual">Manual (elegir ejercicios)</option>
                      <option value="no_incluir">No incluir</option>
                    </select>
                    {modoPreventivo === "automatico" && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 13, color: ds.inkSecondary }}>Ejercicios ese día</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => { setPreventivoCantidad((v) => Math.max(0, v - 1)); setConservarPreventivo(false); }}
                              style={{ width: 26, height: 26, borderRadius: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
                            >
                              −
                            </button>
                            <span style={{ width: 24, textAlign: "center", fontFamily: dsF.mono, fontSize: 14, color: preventivoCantidad > 0 ? ds.accent : ds.inkMuted }}>
                              {preventivoCantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => { setPreventivoCantidad((v) => v + 1); setConservarPreventivo(false); }}
                              style={{ width: 26, height: 26, borderRadius: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
                            >
                              +
                            </button>
                          </div>
                          <span style={{ fontSize: 12, color: ds.inkMuted }}>{preventivoCantidad === 0 ? "no se aplicará hoy" : "de la categoría de cada jugador"}</span>
                        </div>
                        {conservarPreventivo && Object.keys(preventivoTareaIdsPorFecha).length > 0 && (
                          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                            Se conservan los ejercicios de Preventivo ya asignados a esta sesión. Cambia la cantidad o el modo si quieres volver a sortearlos.
                          </div>
                        )}
                        {preventivoCantidad > 0 &&
                          (() => {
                            const catId = categoriaComunEntreJugadores(targetPlayerIds, players);
                            const cat = catId ? categoriasPreventivas.find((c) => c.id === catId) : null;
                            if (!cat) {
                              const { porCategoria, sinCategoriaUnica } = repartoPreventivoPorCategoria(targetPlayerIds, players);
                              if (!porCategoria.size) {
                                return (
                                  <div style={{ fontSize: 11.5, color: ds.warning }}>
                                    Ningún destinatario tiene una única categoría preventiva — este bloque se omitirá al guardar. Asigna una categoría a los jugadores para que se aplique.
                                  </div>
                                );
                              }
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: ds.inkSecondary }}>
                                  <div>Los destinatarios no comparten categoría: cada uno recibirá los ejercicios de la suya.</div>
                                  {[...porCategoria.entries()].map(([catId, ids]) => {
                                    const c = categoriasPreventivas.find((x) => x.id === catId);
                                    const pool = ejercicios.filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId).length;
                                    return (
                                      <div key={catId} style={{ color: pool ? ds.inkMuted : ds.warning }}>
                                        · {c?.nombre || "Categoría"}: {ids.length} jugador(es){pool ? ` · ${pool} ejercicio(s) en el pool` : " · sin ejercicios en el pool, se omitirá"}
                                      </div>
                                    );
                                  })}
                                  {sinCategoriaUnica.length > 0 && (
                                    <div style={{ color: ds.warning }}>
                                      Sin Preventivo (0 o varias categorías): {sinCategoriaUnica.map((p) => p.name).join(", ")}.
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            const poolPrev = ejercicios.filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId);
                            return (
                              <>
                                <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                                  Categoría detectada para este roster: <span style={{ color: ds.accent, fontWeight: 500 }}>{cat.nombre}</span>
                                </div>
                                <div style={{ fontSize: 11.5, color: poolPrev.length ? ds.inkMuted : ds.warning }}>
                                  {poolPrev.length
                                    ? `${poolPrev.length} ejercicio(s) en el pool de esta categoría${preventivoCantidad > poolPrev.length ? " — al pedir más de los que hay, el ciclo se repetirá ese día." : "."}`
                                    : "Esta categoría no tiene ejercicios en su pool todavía — el bloque se omitirá."}
                                </div>
                              </>
                            );
                          })()}
                      </>
                    )}
                    {modoPreventivo === "manual" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {tareasPreventivoManual.map((t) => (
                          <FilaTareaReal
                            key={t.key}
                            tarea={t}
                            mostrarCarga={false}
                            materialesDisponibles={materialesDisponibles}
                            onAgregarMaterial={agregarMaterial}
                            onCambiar={(nuevo) => setTareasPreventivoManual((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                            onEliminar={() => setTareasPreventivoManual((prev) => prev.filter((x) => x.key !== t.key))}
                            onAmpliarVideo={setVideoAmpliado}
                          />
                        ))}
                        <SelectorEjercicioReal acoplable ejercicios={ejercicios} bloque="Preventivo" onAdd={agregarTarea(setTareasPreventivoManual)} onAsignarZona={asignarZonaYActualizar} />
                      </div>
                    )}
                    {modoPreventivo === "no_incluir" && (
                      <div style={{ fontSize: 12.5, color: ds.inkMuted, textAlign: "center" }}>Bloque desactivado — no se incluirá en esta sesión.</div>
                    )}
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="core" abierto={bloqueActivo === "core"} onToggle={() => setBloqueActivo((p) => (p === "core" ? null : "core"))} resumen={resumenBloque("core")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "core")?.vacio} color={COLOR_BLOQUE_DISENO["core"]}>
                {bloqueActivo === "core" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ancho >= ANCHO_MIN_TABLA && tareasCore.length > 0 && <EncabezadoTablaTareas mostrarCarga={false} />}
                    {tareasCore.map((t, i) => (
                      <FilaTareaReal
                        key={t.key}
                        tarea={t}
                        orden={datosSuperserie(tareasCore)[i].etiqueta}
                        superserie={datosSuperserie(tareasCore)[i]}
                        onAlternarEnlace={readOnly ? null : alternarEnlace(setTareasCore, i, tareasCore)}
                        mostrarCarga={false}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) => setTareasCore((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasCore((prev) => prev.filter((x) => x.key !== t.key))}
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    {circuitosCore.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Core"
                        mostrarCarga={false}
                        ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onCambiarCircuito={(patch) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, ...patch } : x)))}
                        onEliminarCircuito={() => setCircuitosCore((prev) => prev.filter((x) => x.key !== c.key))}
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    {!readOnly && <SugerenciasAlternanciaReal sugerencias={resumenDiseno.sugerencias} bloque="Core" onAplicar={aplicarAlternancia} />}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal acoplable ejercicios={ejercicios} bloque="Core" onAdd={agregarTarea(setTareasCore)} onAsignarZona={asignarZonaYActualizar} />
                      <button
                        onClick={() => setCircuitosCore((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="resistencia" abierto={bloqueActivo === "resistencia"} onToggle={() => setBloqueActivo((p) => (p === "resistencia" ? null : "resistencia"))} resumen={resumenBloque("resistencia")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "resistencia")?.vacio} color={COLOR_BLOQUE_DISENO["resistencia"]}>
                {bloqueActivo === "resistencia" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasResistencia.map((t) => (
                      <CampoResistenciaTareaReal
                        key={t.key}
                        tarea={t}
                        onCambiar={(nuevo) => setTareasResistencia((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasResistencia((prev) => prev.filter((x) => x.key !== t.key))}
                        jugadorReferencia={jugadorReferenciaResistencia}
                        ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    {circuitosResistencia.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Resistencia"
                        ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onCambiarCircuito={(patch) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, ...patch } : x)))}
                        onEliminarCircuito={() => setCircuitosResistencia((prev) => prev.filter((x) => x.key !== c.key))}
                        jugadorReferencia={jugadorReferenciaResistencia}
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const creado = await resolveEjercicio(ejercicios, { nombre: MODALIDADES_RESISTENCIA.carrera, bloque: "", tags_descriptivos: [] });
                            addEjercicioLocal(creado);
                            setTareasResistencia((prev) => [...prev, { key: Date.now() + Math.random(), nombre: creado.nombre, ejercicioId: creado.id, gif: creado.gif_url || "", tipoResistenciaCardio: "", capacidad: "", modalidad: "carrera", estructuraManual: false, bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", duracion: "", rpe: "", recuperacion: "", recuperacionUnidad: "seg", nota: "" }]);
                          } catch (e) {
                            setError("No se pudo crear la tarea de resistencia. Comprueba tu conexión e inténtalo de nuevo.");
                          }
                        }}
                        style={{ fontSize: 12.5, color: ds.accent, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontWeight: 500 }}
                      >
                        + Ejercicio
                      </button>
                      <button
                        onClick={() => setCircuitosResistencia((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                    {/* Nota de referencia (mockup: bloque "Sobre estos rangos"
                        al pie del builder de Resistencia) — se muestra una
                        sola vez para todo el bloque, no repetida por tarea. */}
                    <div style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: 1.5, background: ds.surface, border: `1px solid ${ds.borderSoft}`, borderRadius: 8, padding: "10px 12px" }}>
                      <b style={{ color: ds.ink }}>Sobre estos rangos:</b> son de referencia poblacional (Pallarés &amp; Morán-Navarro, 2012, actualizado con literatura posterior). Ancla siempre que puedas la intensidad al umbral o VAM real del jugador — la variabilidad individual frente al %FCmáx teórico es alta (Mann, Lamberts &amp; Lambert, 2013). <b style={{ color: ds.ink }}>Sin test de campo,</b> el jugador recibe un objetivo calculado con la VAM/FCmáx media de futbolistas profesionales (14.8 km/h / 194 ppm; Bruzzese et al., 2021, n=9) en vez de su dato real — es una aproximación de población, no una referencia perceptiva ni un sustituto de su propio test.
                    </div>
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="cmj" abierto={bloqueActivo === "cmj"} onToggle={() => setBloqueActivo((p) => (p === "cmj" ? null : "cmj"))} resumen={resumenBloque("cmj")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "cmj")?.vacio} color={COLOR_BLOQUE_DISENO["cmj"]}>
                {bloqueActivo === "cmj" && (
                  <div onClick={() => setCmjActiva((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, background: cmjActiva ? ds.accent : ds.border, position: "relative", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: cmjActiva ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: ds.canvas }} />
                    </span>
                    <span style={{ fontSize: 13, color: cmjActiva ? ds.ink : ds.inkMuted }}>{cmjActiva ? "Hoy toca medición CMJ" : "Sin medición CMJ esta sesión"}</span>
                  </div>
                )}
                </TarjetaBloqueDiseno>
                <TarjetaBloqueDiseno id="fuerza" abierto={bloqueActivo === "fuerza"} onToggle={() => setBloqueActivo((p) => (p === "fuerza" ? null : "fuerza"))} resumen={resumenBloque("fuerza")} vacio={!!resumenDiseno.bloques.find((x) => x.id === "fuerza")?.vacio} color={COLOR_BLOQUE_DISENO["fuerza"]}>
                {bloqueActivo === "fuerza" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {!readOnly && <AvisoCmjDestinatariosReal estado={estadoCmjDiseno} players={players} targetPlayerIds={targetPlayerIds} fechas={fechas} desplegable />}
                    {guiaObjetivo && <BannerGuiaObjetivo objetivo={guiaObjetivo} />}
                    {ancho >= ANCHO_MIN_TABLA && tareasFuerza.length > 0 && <EncabezadoTablaTareas mostrarCarga />}
                    {tareasFuerza.map((t, i) => (
                      <FilaTareaReal
                        key={t.key}
                        tarea={t}
                        orden={datosSuperserie(tareasFuerza)[i].etiqueta}
                        superserie={datosSuperserie(tareasFuerza)[i]}
                        onAlternarEnlace={readOnly ? null : alternarEnlace(setTareasFuerza, i, tareasFuerza)}
                        mostrarCarga={true}
                        objetivoGuia={guiaObjetivo}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        referenciasPorEjercicio={referenciasPorEjercicio}
                        onCambiar={(nuevo) => setTareasFuerza((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasFuerza((prev) => prev.filter((x) => x.key !== t.key))}
                        onSubir={
                          i > 0
                            ? () =>
                                setTareasFuerza((prev) => {
                                  const nueva = [...prev];
                                  [nueva[i - 1], nueva[i]] = [nueva[i], nueva[i - 1]];
                                  return nueva;
                                })
                            : null
                        }
                        onBajar={
                          i < tareasFuerza.length - 1
                            ? () =>
                                setTareasFuerza((prev) => {
                                  const nueva = [...prev];
                                  [nueva[i], nueva[i + 1]] = [nueva[i + 1], nueva[i]];
                                  return nueva;
                                })
                            : null
                        }
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    {circuitosFuerza.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Fuerza"
                        mostrarCarga={true}
                        ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        referenciasPorEjercicio={referenciasPorEjercicio}
                        onCambiarTareas={(nuevas) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onCambiarCircuito={(patch) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, ...patch } : x)))}
                        onEliminarCircuito={() => setCircuitosFuerza((prev) => prev.filter((x) => x.key !== c.key))}
                        onAmpliarVideo={setVideoAmpliado}
                      />
                    ))}
                    {!readOnly && <SugerenciasAlternanciaReal sugerencias={resumenDiseno.sugerencias} bloque="Fuerza" onAplicar={aplicarAlternancia} />}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal acoplable ejercicios={ejercicios} bloque="Fuerza" onAdd={agregarTarea(setTareasFuerza)} onAsignarZona={asignarZonaYActualizar} />
                      <button
                        onClick={() => setCircuitosFuerza((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
                </TarjetaBloqueDiseno>
              </div>
          </div>

          </div>
          </div>
        </div>

        {!readOnly && ancho < 700 && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${ds.border}`, paddingTop: 10, marginTop: 8, display: "flex", gap: 8 }}>
            {botonGuardar(true)}
            <span style={{ flex: 1, display: "flex" }}>{botonSiguiente(false)}</span>
          </div>
        )}
      </div>
    </PantallaBase>
    {revisandoEnvio && (
      <PasoRevisarEnviarReal
        resumen={resumenDiseno}
        destinatarios={targetPlayerIds === null ? "Todos los jugadores" : (() => {
          const nombres = players.filter((p) => (targetPlayerIds || []).includes(p.id)).map((p) => p.name);
          if (!nombres.length) return "Ningún jugador seleccionado";
          return nombres.length > 3 ? `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más` : nombres.join(", ");
        })()}
        fechas={fechas}
        md={md}
        nombre={nombre}
        guardando={guardando}
        onEditarConfig={() => setDetallesAbiertos(true)}
        onIrBloque={setBloqueActivo}
        onEnviar={async () => { await guardar(false); setRevisandoEnvio(false); }}
        onCerrar={() => setRevisandoEnvio(false)}
      />
    )}
    {videoAmpliado && (
      <div
        onClick={() => setVideoAmpliado(null)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 24 }}
      >
        <div style={{ width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <VideoEmbed url={videoAmpliado} />
        </div>
        <button
          onClick={() => setVideoAmpliado(null)}
          style={{ position: "absolute", top: 20, right: 20, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, width: 34, height: 34, borderRadius: dsR.full, fontSize: 16, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
    )}
    </>
    </BibliotecaSlotContext.Provider>
    </EnSesionContext.Provider>
  );
}
