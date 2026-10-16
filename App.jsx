import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Trash2, Check, Dumbbell, ChevronLeft, ChevronRight, ChevronDown, User, ClipboardList, Loader2, Lock, Eye, EyeOff, RefreshCw, Play, Target, Send, CalendarClock, History, Pencil, BookOpen, Search, Zap, Bell, Calendar, AlertTriangle, Home, TrendingUp, Activity, Heart, LayoutGrid } from "lucide-react";
import {
  ds,
  dsSp,
  dsR,
  dsSh,
  dsF,
  GlobalStyles,
  dsCx,
  DsButton,
  DsCard,
  DsToggle,
  DsBadge,
  DsInput,
  DsSelect,
  DsTabSwitcher,
  DsProgressRing,
  DsAvatar,
  DsNavItem,
  DsStatTile,
} from "./src/core/designSystem.jsx";
import {
  accesoSesion,
  supabase,
  ENTITY_TABLE,
  ID_PREFIX,
  idRegistroFijo,
  genId,
  transformFromDb,
  NUMERIC_DEFAULTS,
  sanitizeNumericos,
  ARRAY_COLUMNS,
  sanitizeArrays,
  transformToDb,
  throwIfError,
  MAX_IDS_POR_PETICION,
  applyFilters,
  api,
} from "./src/core/backend.js";
import {
  todayStr,
  normalizarFecha,
  fmtDateLabel,
  fmtDateShort,
  fmtHaceDias,
  diasEntreFechas,
  fechaISO,
  inicioSemanaCalendario,
  sumarDiasFecha,
  generarCuadriculaMes,
  inicioMes,
  sumarMeses,
  labelMes,
} from "./src/calc/fechas.js";
import {
  SEG_POR_REP,
  SEG_TRANSICION,
  SEG_TRANSICION_CIRCUITO,
  SEG_ENTRE_RONDAS,
  UMBRAL_DESCANSO_ALTERNAR,
  aSegundosDiseno,
  descansoRecomendadoSeg,
  descansoEfectivoSeg,
  trabajoSerieSeg,
  estimarTareaSeg,
  estimarParSeg,
  estimarResistenciaSeg,
  estimarCircuitoSeg,
  emparejarTareasAlternadas,
  estimarBloqueTareasSeg,
  sugerirAlternancias,
  formatearDuracionDiseno,
} from "./src/calc/duracionTarea.js";
import {
  parseResistenciaData,
  SEG_ADHERENCIA_POR_DEFECTO,
  pesoTareaAdherencia,
  tareaEsParaJugador,
  crearFraccionCumplida,
  tareasHechasPorJugadorFecha,
  calcularCumplimientoPauta,
} from "./src/calc/adherencia.js";
import {
  cmjNum,
  cmjParseDateTime,
  cmjDateKeyFromDate,
  CMJ_CSV_COLS,
  cmjMean,
  cmjAggregateByDay,
  cmjParseCSV,
  cmjPct,
  cmjDeltaMismoDiaCicloAnterior,
  cmjFmt,
  cmjSigned,
  cmjSdMuestral,
  cmjClamp,
  CMJ_MIN_INICIOS_PARA_INDIVIDUALIZAR,
  CMJ_METRIC_PHYSIO,
  cmjSeveridad,
  cmjNivelPalabra,
  cmjNivelAccion,
  cmjExplicacionMetrica,
  CMJ_FIELDS,
  CMJ_METRICS,
  CMJ_METRIC_LIST,
  CMJ_STATUS_ORDER,
  cmjFilasDia,
  cmjFilasRecuperacion,
  cmjMotivoDia,
  cmjMotivoRecuperacion,
  CMJ_POSICIONES,
  cmjPosicionLabel,
  cmjPosicionOrder,
  cmjMicroRefDate,
  cmjBuildDateIndex,
  cmjOrderedMicroList,
  cmjStatusFromDelta,
  cmjBuildPlayers,
  cmjFindCurrentMicroId,
  cmjSuggestNextNumero,
  cmjNormalizarNombre,
  CMJ_UMBRAL_DEFECTO,
  cmjHoyDe,
  MICRO_DIAS_ULTIMO,
  cmjVentanasMicrociclo,
  cmjMicroDeFecha,
} from "./src/calc/cmj.js";
import { REPS_MAX_RIR_FIABLE, pct1RMporRTF, e1rmDeValores } from "./src/calc/e1rm.js";
import { TEMA, useAlturaVentana, useAnchoVentana, PantallaBase } from "./src/core/layout.jsx";
import { VideoEmbed, LoadingBlock, CerrablePorFuera } from "./src/core/components.jsx";
import {
  genPin,
  genUniquePin,
  CACHE_TTL_MS,
  CLAVES_CACHE_PERMANENTES,
  CacheConCaducidad,
  sharedDataCache,
  useEstadoCmjEquipo,
  referenciasComoItems,
  useReferenciasFuerza,
  useRefrescarAlVolver,
  invalidateEntityCache,
  invalidateBootstrapCache,
  useEntityList,
  useConfigValue,
  usePlayers,
  MD_TAGS,
  UNIDAD_POR_MODO,
  extractYouTubeId,
  esVideoDirecto,
  miniaturaTarea,
  parseMateriales,
  formatearObjetivoResistencia,
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
  resolveEjercicio,
  actualizarZonaEjercicio,
  useCategoriasPreventivas,
  useMaterialesDisponibles,
  useEntityByIds,
  usePlayerHistory,
  useEquipoHistory,
  useBootstrapProgramacion,
  useMicrociclosTipo,
  usePartidos,
} from "./src/core/hooks.js";
import { CMJ_STATUS_META, CMJ_TAG_META, CMJ_METRIC_CHART_COLOR } from "./src/core/cmjDisplay.jsx";
import { PortalAccesoRaiz } from "./src/screens/Portal.jsx";
import { ControlFatigaModuloReal, CmjProximamente } from "./src/screens/ControlFatiga.jsx";
import { DisenoSesionReal } from "./src/screens/DisenoSesion.jsx";
import {
  IconoModulo,
  MODULOS_DASHBOARD,
  IconoGridSidebar,
  useSolicitudesPendientesCount,
  SidebarEntrenadorReal,
  PantallaEntrenadorAncha,
} from "./src/core/layoutEntrenador.jsx";
import { BibliotecaEjerciciosReal } from "./src/screens/BibliotecaEjercicios.jsx";

// El sistema de diseño "Fuerza" (ds/dsSp/dsR/dsSh/dsF, GlobalStyles,
// Ds* componentes reutilizables) ahora vive en src/core/designSystem.jsx
// (importado arriba).

// El backend remoto (Supabase): supabase, accesoSesion, ENTITY_TABLE,
// ID_PREFIX, genId, api, etc. ahora vive en src/core/backend.js
// (importado arriba).

// TEMA ahora en src/core/layout.jsx. genPin/genUniquePin, la caché
// compartida (sharedDataCache) y el resto de hooks genéricos ahora en
// src/core/hooks.js — todo importado arriba.

// useCmjMicrociclos ahora en src/screens/DisenoSesion.jsx (uso exclusivo
// del Diseñador de sesiones).





// ---------- Datos por revisar (calidad de datos) ----------
// Todo el análisis se apoya en lo que teclea el jugador (fuerza) y en el CSV
// (CMJ). Un 1000 en vez de 100 kg distorsiona e1RM, semáforos y carga durante
// semanas. Estas funciones marcan lo que se sale de lo habitual DE ESE JUGADOR
// y ese ejercicio; nunca corrigen ni borran nada solas: decide el entrenador.
function medianaNum(arr) {
  if (!arr.length) return null;
  const o = [...arr].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}
// e1rmDeValores ahora en src/calc/e1rm.js — importada arriba.
const MIN_REGISTROS_PARA_REVISAR = 4;
function detectarRegistrosAtipicos(items) {
  const candidatos = items.filter((it) => it.done && !it.esReferencia && !it.esResistencia && it.bloque !== "CMJ" && it.cargaOriginal !== "" && it.cargaOriginal != null);
  const grupos = new Map();
  candidatos.forEach((it) => {
    const k = `${it.jugadorId ?? ""}::${it.name}::${materialEfectivo(it)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(it);
  });
  const res = [];
  grupos.forEach((regs) => {
    regs.forEach((it) => {
      if (it.revisado || it.ignorar) return;
      const motivos = [];
      const carga = Number(it.cargaOriginal);
      const reps = Number(it.repsOriginal);
      const rir = it.rirOriginal !== "" && it.rirOriginal != null ? Number(it.rirOriginal) : null;
      if (it.repsOriginal !== "" && Number.isFinite(reps) && reps > 50) motivos.push(`${reps} repeticiones es poco creíble`);
      if (rir != null && Number.isFinite(rir) && (rir < 0 || rir > 10)) motivos.push(`RIR ${rir} fuera de rango (0-10)`);
      const otros = regs.filter((o) => o !== it && !o.ignorar);
      if (otros.length >= MIN_REGISTROS_PARA_REVISAR) {
        const e1 = e1rmDeValores(it.cargaOriginal, it.repsOriginal, it.rirOriginal);
        const e1Otros = otros.map((o) => e1rmDeValores(o.cargaOriginal, o.repsOriginal, o.rirOriginal)).filter((x) => x != null);
        if (e1 != null && e1Otros.length >= MIN_REGISTROS_PARA_REVISAR) {
          const med = medianaNum(e1Otros);
          const ratio = e1 / med;
          if (ratio > 1.35) motivos.push(`e1RM ${Math.round(e1)} kg: un ${Math.round((ratio - 1) * 100)} % por encima de su habitual (${Math.round(med)} kg)`);
          else if (ratio < 0.6) motivos.push(`e1RM ${Math.round(e1)} kg: un ${Math.round((1 - ratio) * 100)} % por debajo de su habitual (${Math.round(med)} kg)`);
        } else {
          const cargas = otros.map((o) => Number(o.cargaOriginal)).filter((x) => x > 0);
          if (cargas.length >= MIN_REGISTROS_PARA_REVISAR) {
            const med = medianaNum(cargas);
            if (carga > med * 2.2) motivos.push(`${carga} kg es más del doble de su carga habitual (${Math.round(med)} kg)`);
            else if (carga < med * 0.35) motivos.push(`${carga} kg es mucho menos que su carga habitual (${Math.round(med)} kg)`);
          }
        }
      }
      if (motivos.length) res.push({ item: it, motivos });
    });
  });
  return res.sort((a, b) => (a.item.date < b.item.date ? 1 : -1));
}
// CMJ: saltos (uno por jugador y día) cuya altura se aleja de su habitual.
function detectarCmjAtipicos(saltos) {
  const validos = saltos.filter((s) => s.altura != null && Number.isFinite(Number(s.altura)));
  const res = [];
  validos.forEach((s) => {
    if (s.revisado) return;
    const motivos = [];
    const h = Number(s.altura);
    if (h <= 5 || h > 90) motivos.push(`altura de ${h.toFixed(1)} cm no es plausible`);
    const otros = validos.filter((o) => o !== s && !o.excluido).map((o) => Number(o.altura));
    if (otros.length >= 5 && !s.excluido) {
      const med = medianaNum(otros);
      const ratio = h / med;
      if (ratio > 1.25) motivos.push(`${h.toFixed(1)} cm: un ${Math.round((ratio - 1) * 100)} % por encima de su mediana (${med.toFixed(1)} cm)`);
      else if (ratio < 0.75) motivos.push(`${h.toFixed(1)} cm: un ${Math.round((1 - ratio) * 100)} % por debajo de su mediana (${med.toFixed(1)} cm)`);
    }
    if (motivos.length) res.push({ salto: s, motivos });
  });
  return res.sort((a, b) => (String(a.salto.fecha) < String(b.salto.fecha) ? 1 : -1));
}


// useEstadoCmjEquipo ahora en src/core/hooks.js — importada arriba.
// diasEntreFechas ahora en src/calc/fechas.js — importada arriba.
// AvisoCmjDestinatariosReal ahora en src/screens/DisenoSesion.jsx (uso
// exclusivo del Diseñador de sesiones).



// referenciasComoItems y useReferenciasFuerza ahora en src/core/hooks.js —
// importadas arriba.

// Adherencia (pesoTareaAdherencia, crearFraccionCumplida,
// tareasHechasPorJugadorFecha) ahora en src/calc/adherencia.js — importadas
// arriba.

// nuevoEstadoParcial y guardarFilaConParcial ahora en
// src/screens/DisenoSesion.jsx (uso exclusivo del Diseñador de sesiones).

// ---------- Borrador local del jugador (DEV-06) ----------
// Lo que el jugador va marcando/tecleando en su sesión vivía solo en estado
// de React hasta pulsar "Guardar sin enviar" o "Enviar": con mala cobertura
// en el gimnasio, o si el navegador se cerraba/recargaba, se perdía. Ahora
// se copia a localStorage en cada cambio (una clave por jugador + sesión +
// día) y se restaura al volver a abrir la sesión. Todo va envuelto en
// try/catch porque localStorage puede no estar disponible (modo privado,
// datos bloqueados...): en ese caso la app funciona igual que antes.
const PREFIJO_BORRADOR_LOCAL = "fuerza:borrador:";
function claveBorradorLocal(jugadorId, sesionId, fecha) {
  return `${PREFIJO_BORRADOR_LOCAL}${jugadorId}:${sesionId}:${fecha}`;
}
function leerBorradorLocal(clave) {
  try {
    const raw = window.localStorage.getItem(clave);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    return datos && typeof datos === "object" ? datos : null;
  } catch {
    return null;
  }
}
function guardarBorradorLocal(clave, datos) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(datos));
  } catch {
    /* sin almacenamiento local: se sigue sin copia de seguridad */
  }
}
function borrarBorradorLocal(clave) {
  try {
    window.localStorage.removeItem(clave);
  } catch {
    /* nada que hacer */
  }
}
// Borra los borradores locales de días anteriores (esa sesión ya no se
// puede abrir: la pantalla del jugador solo muestra las sesiones de hoy).
function limpiarBorradoresLocalesAntiguos(fechaHoy) {
  try {
    const ls = window.localStorage;
    const aBorrar = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(PREFIJO_BORRADOR_LOCAL) && !k.endsWith(`:${fechaHoy}`)) aBorrar.push(k);
    }
    aBorrar.forEach((k) => ls.removeItem(k));
  } catch {
    /* nada que hacer */
  }
}

// useRefrescarAlVolver, invalidateEntityCache, invalidateBootstrapCache,
// useEntityList, useConfigValue y usePlayers ahora en src/core/hooks.js —
// importadas arriba.
// MD_TAGS ahora en src/core/hooks.js — importada arriba.

const inputStyle = {
  width: "100%",
  background: ds.canvas,
  border: `1px solid ${ds.border}`,
  borderRadius: dsR.md,
  padding: "10px 12px",
  color: ds.ink,
  fontFamily: dsF.sans,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

// extractYouTubeId, esVideoDirecto, miniaturaTarea y parseMateriales ahora
// en src/core/hooks.js — importadas arriba.
// parseResistenciaData ahora en src/calc/adherencia.js — importada arriba.

// tareaADraft y agruparCircuitosDeTareas ahora en
// src/screens/DisenoSesion.jsx (uso exclusivo de esa pantalla).

// El dominio de "Resistencia" (formatearObjetivoResistencia,
// CAPACIDADES_RESISTENCIA, objetivoJugadorResistencia, etc.) y los
// componentes/hooks de UI genérica (VideoEmbed, LoadingBlock,
// useAlturaVentana, useAnchoVentana, PantallaBase) ahora en
// src/core/hooks.js, src/core/components.jsx y src/core/layout.jsx —
// importados arriba.

// PinInput ahora en src/screens/Portal.jsx (uso exclusivo de esa pantalla).

// resolveEjercicio, actualizarZonaEjercicio, useCategoriasPreventivas y
// useMaterialesDisponibles ahora en src/core/hooks.js — importadas arriba.
// Carga las tareas de una o varias sesiones en una sola llamada (usa el filtro "IN" del backend).
function useTareasForSesiones(sesionIds) {
  const key = sesionIds.slice().sort().join(",");
  const sesionIdsSet = new Set(sesionIds);
  const cacheKey = `list:tareas:bySesiones:${key}`;
  const [tareas, setTareas] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => !key || sharedDataCache.has(cacheKey));
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setTareas([]);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setTareas(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list("tareas", { sesion_id: key })
      .then((res) => {
        if (!cancelled) {
          // CRÍTICO: nunca fiarse de que el backend filtre de verdad por
          // sesion_id — se ha confirmado que no lo hace y devuelve TODAS las
          // tareas de TODAS las sesiones que hayan existido nunca. Sin este
          // filtro, un jugador vería mezcladas tareas de sesiones antiguas
          // que no le corresponden.
          const filtradas = (res || []).filter((t) => sesionIdsSet.has(t.sesion_id));
          sharedDataCache.set(cacheKey, filtradas);
          setTareas(filtradas);
        }
      })
      .catch(() => {
        if (!cancelled) setTareas([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key, cacheKey]);
  return [tareas, loaded];
}

// useEntityByIds, usePlayerHistory y useEquipoHistory ahora en
// src/core/hooks.js — importadas arriba.
// Junta en una sola petición lo que antes eran 3 en cadena para la pantalla
// del jugador (sesiones -> tareas -> ejercicios/circuitos, cada una
// esperando a que resolviera la anterior). Apps Script tiene un coste fijo
// de 1-3 segundos por petición solo de arranque, pase lo que pase con el
// tamaño de las tablas — con 3 peticiones en cadena eso son varios segundos
// de espera SIEMPRE, tenga el equipo 10 filas o 10.000. Ver
// bootstrapJugador_ en Code.gs.
function useBootstrapJugador(jugadorId, fecha) {
  const cacheKey = jugadorId ? `bootstrap:${jugadorId}:${fecha}` : null;
  const [data, setData] = useState(() => (cacheKey && sharedDataCache.get(cacheKey)) || null);
  const [loaded, setLoaded] = useState(() => !jugadorId || (cacheKey && sharedDataCache.has(cacheKey)));
  useEffect(() => {
    let cancelled = false;
    if (!jugadorId) {
      setData(null);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setData(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .bootstrapJugador(jugadorId, fecha)
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res);
          setData(res);
        }
      })
      .catch(() => {
        if (!cancelled) setData({ sesiones: [], tareas: [], ejercicios: [], circuitos: [] });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [jugadorId, fecha, cacheKey]);
  return {
    loaded,
    sesiones: data?.sesiones || [],
    tareas: data?.tareas || [],
    ejercicios: data?.ejercicios || [],
    circuitos: data?.circuitos || [],
    proximaSesion: data?.proximaSesion || null,
  };
}

// useBootstrapProgramacion ahora en src/core/hooks.js — importada arriba.
// La pantalla de Portal de acceso (PantallaPortal, PortalAccesoRaiz,
// PortalAccesoSeguro, PortalAcceso) ahora en src/screens/Portal.jsx —
// importada arriba.

// ==================================================================
// PANTALLAS REALES (calcadas de los mockups, sin componentes de la
// interfaz antigua) — la lógica de datos (api, hooks) es la misma
// capa de persistencia ya probada; el frontend visible es el diseñado.
// ==================================================================

// ChipReal, TagChipReal, campoSelectReal y TAGS_DESCRIPTIVOS_BIBLIOTECA
// ahora en src/core/components.jsx — importadas arriba.
// CerrablePorFuera también en src/core/components.jsx.

function SelectorCategoriasReal({ categorias, seleccionadas, onCambiar, onCerrar }) {
  const tipos = ["Muscular", "Tendinosa", "Articular"];
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "120%",
        zIndex: 20,
        width: 200,
        background: ds.bgElevated,
        border: `1px solid ${ds.border}`,
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 8,
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, padding: "2px 4px 6px" }}>
        CATEGORÍAS PREVENTIVAS
      </div>
      {tipos.map((tipo) => {
        const delTipo = categorias.filter((c) => c.tipo_tejido === tipo);
        if (!delTipo.length) return null;
        return (
          <div key={tipo}>
            <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.accent, padding: "6px 6px 3px" }}>
              {tipo.toUpperCase()}
            </div>
            {delTipo.map((cat) => {
              const activa = seleccionadas.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => onCambiar(activa ? seleccionadas.filter((c) => c !== cat.id) : [...seleccionadas, cat.id])}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 6px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: activa ? ds.accent : ds.inkSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: `1.5px solid ${activa ? ds.accent : ds.border}`,
                      background: activa ? ds.accent : "transparent",
                      color: ds.accentInk,
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {activa ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>{cat.nombre}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
    </CerrablePorFuera>
  );
}

// Mismo patrón que SelectorCategoriasReal, pero para "grupos" (equipos,
// agrupaciones libres) — una lista plana, sin sub-tipos, y sin relación
// alguna con las categorías preventivas.
function SelectorGruposReal({ grupos, seleccionados, onCambiar, onCerrar }) {
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "120%",
          zIndex: 20,
          width: 200,
          background: ds.bgElevated,
          border: `1px solid ${ds.border}`,
          borderRadius: 10,
          boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
          padding: 8,
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, padding: "2px 4px 6px" }}>GRUPOS</div>
        {grupos.length === 0 && <div style={{ fontSize: 11.5, color: ds.inkMuted, padding: "4px 6px" }}>Todavía no has creado ningún grupo.</div>}
        {grupos.map((g) => {
          const activo = seleccionados.includes(g.id);
          return (
            <div
              key={g.id}
              onClick={() => onCambiar(activo ? seleccionados.filter((id) => id !== g.id) : [...seleccionados, g.id])}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, color: ds.ink }}
              onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: `1.5px solid ${activo ? ds.chart2 : ds.border}`,
                  background: activo ? ds.chart2 : "transparent",
                  color: ds.accentInk,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {activo ? "✓" : ""}
              </span>
              <span style={{ flex: 1 }}>{g.nombre}</span>
            </div>
          );
        })}
      </div>
    </CerrablePorFuera>
  );
}

function MenuAccionesReal({ jugador, onAccion, onCerrar }) {
  const acciones = [
    { id: "reset", label: "Resetear PIN" },
    { id: "historial", label: "Ver ficha" },
    jugador.estado === "activo"
      ? { id: "suspender", label: "Suspender jugador", tono: "ambar" }
      : { id: "activar", label: "Activar jugador", tono: "verde" },
    { id: "eliminar", label: "Eliminar perfil", tono: "peligro" },
  ];
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "110%",
        zIndex: 20,
        width: 190,
        background: ds.bgElevated,
        border: `1px solid ${ds.border}`,
        borderRadius: dsR.lg,
        boxShadow: dsSh.elevation3,
        padding: 6,
      }}
    >
      {acciones.map((a) => {
        const color = a.tono === "peligro" ? ds.danger : a.tono === "ambar" ? ds.warning : a.tono === "verde" ? ds.success : ds.ink;
        return (
          <div
            key={a.id}
            onClick={() => {
              onAccion(a.id);
              onCerrar();
            }}
            style={{ padding: "8px 10px", borderRadius: dsR.sm, fontSize: 12.5, color, cursor: "pointer", transition: "background-color 120ms ease-out" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {a.label}
          </div>
        );
      })}
    </div>
    </CerrablePorFuera>
  );
}

function FilaJugadorReal({ jugador, categorias, grupos, adherencia = null, onAccion, onCambiarCategorias, onCambiarGrupos }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [selectorGruposAbierto, setSelectorGruposAbierto] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresCategorias = jugador.groupIds
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);
  const nombresGrupos = (jugador.gruposIds || [])
    .map((id) => grupos.find((g) => g.id === id)?.nombre)
    .filter(Boolean);
  const colorAvatar = colorAvatarJugador(jugador.id);
  const revelado = hover || menuAbierto || pinVisible || selectorAbierto || selectorGruposAbierto;

  return (
    <div
      onClick={() => onAccion(jugador.id, "historial")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onAccion(jugador.id, "historial"); }}
      title={`Ver ficha de ${jugador.name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        background: hover ? ds.surfaceRaised : `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)`,
        border: `1px solid ${suspendido ? `${ds.warning}40` : hover ? ds.borderMuted : ds.borderSoft}`,
        borderRadius: dsR.xl,
        boxShadow: `${dsSh.elevation1}, inset 0 1px 0 rgba(255,255,255,0.03)`,
        opacity: suspendido ? 0.75 : 1,
        cursor: "pointer",
        transition: "border-color 120ms ease-out, background 120ms ease-out",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <DsAvatar
          size={38}
          style={{
            background: `${colorAvatar}22`,
            color: colorAvatar,
            border: `1.5px solid ${colorAvatar}55`,
            fontWeight: 700,
            fontFamily: dsF.display,
          }}
        >
          {inicialesNombre(jugador.name)}
        </DsAvatar>
        <div
          title={suspendido ? "Suspendido" : "Activo"}
          style={{ position: "absolute", right: -1, bottom: -1, width: 10, height: 10, borderRadius: dsR.full, background: suspendido ? ds.warning : ds.success, border: `2px solid ${ds.surface}` }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>{jugador.name}</span>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap", alignItems: "center", position: "relative" }} onClick={(e) => e.stopPropagation()}>
          {nombresGrupos.map((g) => (
            <ChipReal key={`g-${g}`} tono="azul">{g}</ChipReal>
          ))}
          {nombresCategorias.map((c) => (
            <ChipReal key={`c-${c}`} tono="verde">{c}</ChipReal>
          ))}
          {nombresGrupos.length === 0 && nombresCategorias.length === 0 && (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Independiente · sin categoría preventiva</span>
          )}
          <span
            onClick={() => setSelectorGruposAbierto((v) => !v)}
            style={{ fontSize: 10, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px", opacity: revelado ? 1 : 0.45, transition: "opacity 120ms" }}
            title="Editar grupos"
          >
            + grupo
          </span>
          <span
            onClick={() => setSelectorAbierto((v) => !v)}
            style={{ fontSize: 10, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px", opacity: revelado ? 1 : 0.45, transition: "opacity 120ms" }}
            title="Editar categoría preventiva"
          >
            + categoría
          </span>
          {selectorGruposAbierto && (
            <SelectorGruposReal
              grupos={grupos}
              seleccionados={jugador.gruposIds || []}
              onCambiar={(nuevos) => onCambiarGrupos(jugador.id, nuevos)}
              onCerrar={() => setSelectorGruposAbierto(false)}
            />
          )}
          {selectorAbierto && (
            <SelectorCategoriasReal
              categorias={categorias}
              seleccionadas={jugador.groupIds}
              onCambiar={(nuevas) => onCambiarCategorias(jugador.id, nuevas)}
              onCerrar={() => setSelectorAbierto(false)}
            />
          )}
        </div>
      </div>

      <div title={adherencia != null ? `${adherencia}% de adherencia esta semana` : "Sin sesiones asignadas esta semana"} style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {adherencia != null ? (
          <DsProgressRing value={adherencia} size={34} strokeWidth={3.5} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: dsR.full, border: `1.5px dashed ${ds.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>—</div>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, opacity: revelado ? 1 : 0.4, transition: "opacity 120ms" }}>
        <button
          onClick={() => setPinVisible((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: dsF.mono,
            fontSize: 12,
            fontWeight: 600,
            color: ds.inkSecondary,
            cursor: "pointer",
            minWidth: 62,
            justifyContent: "center",
            background: ds.canvas,
            border: `1px solid ${ds.border}`,
            borderRadius: dsR.md,
            padding: "6px 8px",
          }}
          title="Mostrar/ocultar PIN"
          type="button"
        >
          {pinVisible ? jugador.pin : "••••"}
          {pinVisible ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: menuAbierto ? ds.surfaceRaised : "transparent",
              border: `1px solid ${menuAbierto ? ds.borderMuted : "transparent"}`,
              borderRadius: dsR.md,
              color: ds.inkMuted,
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
            type="button"
          >
            ⋮
          </button>
          {menuAbierto && <MenuAccionesReal jugador={jugador} onAccion={(id) => onAccion(jugador.id, id)} onCerrar={() => setMenuAbierto(false)} />}
        </div>
      </div>
    </div>
  );
}

function PanelAltaReal({ pinsExistentes, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [modoPin, setModoPin] = useState("auto");
  const [pinManual, setPinManual] = useState("");
  const [guardando, setGuardando] = useState(false);

  const pinManualDuplicado = modoPin === "manual" && pinManual.length === 4 && pinsExistentes.map((p) => String(p).trim()).includes(pinManual);
  const puedeGuardar = nombre.trim().length > 0 && (modoPin === "auto" || (pinManual.length === 4 && !pinManualDuplicado));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>Añadir usuario</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NOMBRE</span>
          <DsInput autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Pablo Fernández" />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>PIN DE ACCESO</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "auto", label: "Generar automáticamente" },
              { id: "manual", label: "Introducir el mío" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => setModoPin(op.id)}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: "8px 8px",
                  borderRadius: dsR.md,
                  border: `1px solid ${modoPin === op.id ? ds.accent : ds.border}`,
                  background: modoPin === op.id ? ds.accentSubtle : "transparent",
                  color: modoPin === op.id ? ds.accent : ds.inkSecondary,
                  cursor: "pointer",
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
          {modoPin === "manual" && (
            <div>
              <DsInput
                value={pinManual}
                onChange={(e) => setPinManual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 dígitos"
                inputMode="numeric"
                error={pinManualDuplicado}
                style={{
                  width: 100,
                  fontSize: 15,
                  fontFamily: dsF.mono,
                  textAlign: "center",
                  letterSpacing: "0.15em",
                }}
              />
              {pinManualDuplicado && <div style={{ fontSize: 11, color: ds.danger, marginTop: 5 }}>Ese código ya está en uso (por otro jugador o por el entrenador) — elige otro.</div>}
            </div>
          )}
          {modoPin === "auto" && <div style={{ fontSize: 11, color: ds.inkMuted }}>Se generará un PIN de 4 dígitos que no coincide con ningún otro del roster ni con el código de entrenador.</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <DsButton variant="secondary" onClick={onCerrar}>Cancelar</DsButton>
          <DsButton
            disabled={!puedeGuardar || guardando}
            onClick={async () => {
              setGuardando(true);
              const pin = modoPin === "auto" ? genUniquePin(pinsExistentes) : pinManual;
              await onGuardar({ nombre: nombre.trim(), pin });
              setGuardando(false);
            }}
          >
            {guardando ? "Guardando..." : "Añadir usuario"}
          </DsButton>
        </div>
      </div>
    </div>
  );
}

// Crear y borrar grupos — panel mínimo, mismo estilo que PanelAltaReal.
// Renombrar un grupo no hace falta todavía: se borra y se crea de nuevo si
// hace falta, dado lo poco que van a cambiar de nombre en la práctica.
function PanelGestionGruposReal({ grupos, onCrear, onEliminar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(null);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }} onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>Grupos</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {grupos.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Todavía no has creado ningún grupo.</div>}
          {grupos.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
              <span style={{ flex: 1, fontSize: 13, color: ds.ink }}>{g.nombre}</span>
              {confirmarBorrado === g.id ? (
                <>
                  <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>¿Seguro?</span>
                  <button onClick={() => onEliminar(g.id)} style={{ background: "transparent", border: `1px solid ${ds.dangerBorderSubtle}`, color: ds.danger, borderRadius: dsR.sm, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}>
                    Sí, borrar
                  </button>
                  <button onClick={() => setConfirmarBorrado(null)} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: dsR.sm, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmarBorrado(g.id)} style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 15, cursor: "pointer" }} title="Eliminar grupo">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NUEVO GRUPO</span>
          <div style={{ display: "flex", gap: 8 }}>
            <DsInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Delanteros" style={{ flex: 1 }} />
            <DsButton
              disabled={!nombre.trim() || guardando}
              onClick={async () => {
                setGuardando(true);
                const ok = await onCrear(nombre.trim());
                setGuardando(false);
                if (ok) setNombre("");
              }}
            >
              {guardando ? "..." : "Crear"}
            </DsButton>
          </div>
        </label>
        <DsButton variant="secondary" onClick={onCerrar} style={{ alignSelf: "flex-end" }}>
          Cerrar
        </DsButton>
      </div>
    </div>
  );
}

// Lista de usuarios como cartera: estado, adherencia, última actividad y CMJ de
// cada jugador de un vistazo; ordenada con quien necesita atención arriba.
function CarteraUsuariosReal({ players, grupos, cartera, onAbrir, onAccion, onAlta, onGrupo }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [menuId, setMenuId] = useState(null);
  const ancho = useAnchoVentana();
  const estaListo = cartera && cartera.loaded;
  const filaDe = (p) => (estaListo ? cartera.filas.get(p.id) : null);
  const activos = players.filter((p) => p.estado === "activo");
  const suspendidos = players.filter((p) => p.estado !== "activo");
  const cuenta = (e) => activos.filter((p) => filaDe(p)?.estado === e).length;
  const orden = { atencion: 0, aldia: 1, sinplan: 2 };
  const lista = (filtro === "suspendidos" ? suspendidos : activos)
    .filter((p) => {
      if (filtro === "todos" || filtro === "suspendidos") return true;
      if (filtro === "atencion" || filtro === "aldia" || filtro === "sinplan") return filaDe(p)?.estado === filtro;
      if (filtro === "independientes") return (p.gruposIds || []).length === 0;
      return (p.gruposIds || []).includes(filtro);
    })
    .filter((p) => p.name.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => (orden[filaDe(a)?.estado] ?? 3) - (orden[filaDe(b)?.estado] ?? 3) || a.name.localeCompare(b.name));
  const pills = [
    { id: "todos", label: `Todos (${activos.length})` },
    { id: "atencion", label: `Atención${estaListo ? ` (${cuenta("atencion")})` : ""}` },
    { id: "aldia", label: "Al día" },
    { id: "sinplan", label: "Sin plan" },
    ...grupos.map((g) => ({ id: g.id, label: g.nombre })),
    { id: "independientes", label: "Independientes" },
    ...(suspendidos.length ? [{ id: "suspendidos", label: `Suspendidos (${suspendidos.length})` }] : []),
  ];
  const compacto = ancho < 760;
  const cols = compacto ? "minmax(120px, 1.6fr) 90px 70px 32px" : "minmax(170px, 1.7fr) 96px minmax(120px, 1.2fr) 110px 70px 32px";
  const fmtUlt = (f) => (f.diasSin === null ? "Sin registros" : f.diasSin === 0 ? "Hoy" : f.diasSin === 1 ? "Ayer" : `Hace ${f.diasSin} d`);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>USUARIOS</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Tu cartera</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
            {estaListo ? `${cuenta("atencion")} requieren atención · ${cuenta("aldia")} al día · ${activos.length} activos` : `${activos.length} activos`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onGrupo} style={{ fontSize: 12.5, fontWeight: 600, padding: "9px 14px", borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>+ Grupo</button>
          <button type="button" onClick={onAlta} style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1px solid ${ds.accent}`, background: ds.accent, color: ds.accentInk, cursor: "pointer" }}>+ Añadir usuario</button>
        </div>
      </div>
      <DsInput value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar usuario..." style={{ width: "100%", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {pills.map((f) => (
          <button key={f.id} type="button" onClick={() => setFiltro(f.id)} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 999, border: `1px solid ${filtro === f.id ? ds.accent : ds.border}`, background: filtro === f.id ? ds.accentSubtle : "transparent", color: filtro === f.id ? ds.accent : ds.inkSecondary, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "9px 14px", fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.06em", color: ds.inkMuted, textTransform: "uppercase" }}>
          <span>Jugador</span>
          <span>Estado</span>
          {!compacto && <span>Adherencia 4 sem.</span>}
          {!compacto && <span>Última actividad</span>}
          <span>CMJ</span>
          <span />
        </div>
        {lista.map((p) => {
          const f = filaDe(p);
          const meta = f ? ESTADO_JUGADOR_META[f.estado] : null;
          const cmjMeta = f && f.cmj ? CMJ_STATUS_META[f.cmj] : null;
          const nGrupos = (p.gruposIds || []).map((g) => grupos.find((x) => x.id === g)?.nombre).filter(Boolean);
          const motivo = f && f.alertas.length ? [...f.alertas].sort((a, b) => b.sev - a.sev)[0] : null;
          return (
            <div key={p.id} style={{ position: "relative", borderTop: `1px solid ${ds.border}` }}>
              <div role="button" tabIndex={0} onClick={() => onAbrir(p)} onKeyDown={(e) => { if (e.key === "Enter") onAbrir(p); }} style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "11px 14px", alignItems: "center", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: `${colorAvatarJugador(p.id)}33`, color: colorAvatarJugador(p.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{inicialesNombre(p.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: motivo && f.estado === "atencion" ? ds.warning : ds.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {motivo && f.estado === "atencion" ? (() => { const t = motivo.titulo.replace(`${p.name} · `, ""); return t.charAt(0).toUpperCase() + t.slice(1); })() : nGrupos.length ? nGrupos.join(" · ") : "Independiente"}
                    </span>
                  </span>
                </span>
                <span>
                  {p.estado !== "activo" ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: ds.inkMuted, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "2px 9px" }}>Suspendido</span>
                  ) : meta ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}66`, background: `${meta.color}14`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{meta.label}</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: ds.inkMuted }}>…</span>
                  )}
                </span>
                {!compacto && (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, height: 6, borderRadius: 999, background: ds.border, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${f && f.adh28 !== null ? f.adh28 : 0}%`, background: f && f.adh28 !== null && f.adh28 >= 75 ? ds.success : ds.warning }} />
                    </span>
                    <b style={{ fontSize: 12, width: 38, textAlign: "right", color: f && f.adh28 !== null ? ds.ink : ds.inkMuted }}>{f && f.adh28 !== null ? `${f.adh28} %` : "—"}</b>
                  </span>
                )}
                {!compacto && <span style={{ fontSize: 12.5, color: f && f.diasSin !== null && f.diasSin >= 5 ? ds.warning : ds.inkSecondary }}>{f ? fmtUlt(f) : "…"}</span>}
                <span>
                  {cmjMeta ? (
                    <span title={cmjMeta.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: cmjMeta.color }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: cmjMeta.color }} />
                      {compacto ? "" : cmjMeta.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: ds.inkMuted }}>—</span>
                  )}
                </span>
                <span style={{ position: "relative" }}>
                  <button type="button" aria-label="Más acciones" onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: ds.inkSecondary, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>⋯</button>
                  {menuId === p.id && <MenuAccionesReal jugador={p} onAccion={(id) => onAccion(p.id, id)} onCerrar={() => setMenuId(null)} />}
                </span>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "22px 14px", textAlign: "center", borderTop: `1px solid ${ds.border}` }}>Nadie en este filtro.</div>}
      </div>
    </div>
  );
}

// Cambio del código de entrenador (se guarda cifrado en Supabase; nadie, tampoco la
// app, puede volver a leerlo). Un código largo protege mucho más que uno de 4 cifras.
function PanelCodigoEntrenadorReal({ onCerrar }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [estado, setEstado] = useState({ guardando: false, error: "", ok: false });
  const guardar = async () => {
    const v = a.trim();
    if (v.length < 4) return setEstado({ guardando: false, error: "Mínimo 4 caracteres (recomendado: 8 o más).", ok: false });
    if (v !== b.trim()) return setEstado({ guardando: false, error: "Los dos códigos no coinciden.", ok: false });
    setEstado({ guardando: true, error: "", ok: false });
    try {
      const { data, error } = await supabase.rpc("cambiar_codigo_entrenador", { p_nuevo: v });
      if (error) throw error;
      if (!data || !data.ok) {
        const msg = data?.error === "igual_que_un_jugador" ? "Ese código ya es el PIN de un jugador. Elige otro." : data?.error === "corto" ? "Demasiado corto." : "No tienes permiso para cambiarlo.";
        return setEstado({ guardando: false, error: msg, ok: false });
      }
      setA("");
      setB("");
      setEstado({ guardando: false, error: "", ok: true });
    } catch {
      setEstado({ guardando: false, error: "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.", ok: false });
    }
  };
  return (
    <div style={{ background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 14, marginBottom: 14, maxWidth: 420 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Código de entrenador</div>
      <div style={{ fontSize: 12, color: ds.inkSecondary, marginBottom: 10, lineHeight: 1.5 }}>
        Se guarda cifrado: ni tú ni la app podréis volver a verlo, solo cambiarlo. Recomendado: 8 cifras o más; con 4 es fácil de adivinar.
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <DsInput type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Código nuevo" />
        <DsInput type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Repite el código" />
      </div>
      {estado.error && <div style={{ color: ds.danger, fontSize: 12, marginBottom: 8 }}>{estado.error}</div>}
      {estado.ok && <div style={{ color: ds.success, fontSize: 12, marginBottom: 8 }}>Código cambiado. Úsalo la próxima vez que entres.</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <DsButton onClick={guardar} disabled={estado.guardando}>
          {estado.guardando ? "Guardando..." : "Guardar código"}
        </DsButton>
        <DsButton variant="secondary" onClick={onCerrar}>
          Cerrar
        </DsButton>
      </div>
    </div>
  );
}

function GestionRosterReal({ onBack, onOpenHistory, onAbrirModulo, onCerrarSesion }) {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [grupos, saveGrupos, gruposLoaded] = useEntityList("grupos");
  const [coachPin, , coachPinLoaded] = useConfigValue("coach_pin");
  const { sesiones, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const { items: equipoHistory, loaded: equipoLoaded } = useEquipoHistory();
  const cartera = useCarteraEntrenador();
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [panelAltaAbierto, setPanelAltaAbierto] = useState(false);
  const [panelGrupoAbierto, setPanelGrupoAbierto] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");
  // Las tres vistas del mockup de Fase 6 (Equipos y usuarios): Equipos
  // (tarjetas por grupo), Independientes (página propia) y Usuarios (el
  // directorio plano que ya existía, sin tocar su lógica de filtros). Un
  // grupo real ("grupos", entidad ya existente) hace aquí de "equipo" del
  // mockup — no se crea ninguna tabla/entidad nueva para esto.
  const [vista, setVista] = useState("cartera");
  const [codigoEntrenadorAbierto, setCodigoEntrenadorAbierto] = useState(false);
  const [equipoAbiertoId, setEquipoAbiertoId] = useState(null);
  // Preseleccionado al pulsar "+ Añadir jugador" desde dentro del detalle de
  // un equipo — así el alta queda ya asignada a ese grupo sin un segundo paso.
  const [grupoAltaPreset, setGrupoAltaPreset] = useState(null);

  if (!playersLoaded || !categoriasLoaded || !coachPinLoaded || !gruposLoaded || !progLoaded || !equipoLoaded) return <LoadingBlock />;

  // Adherencia de esta semana de calendario, por jugador — para el "adh"
  // de cada fila (mockup de Fase 6 → Equipos y usuarios). Mismo criterio
  // exacto que adherenciaActual en useDatosDashboardEntrenador y en
  // ResumenFichaJugadorReal (cumplidas / asignadas, límite superior hoy),
  // calculado UNA vez aquí para todo el roster en vez de una consulta por
  // fila — reutiliza useBootstrapProgramacion/useEquipoHistory, que ya
  // traen todo el equipo de una sola vez.
  const hoyRoster = todayStr();
  const lunesRoster = inicioSemanaCalendario(hoyRoster);
  const domingoRoster = sumarDiasFecha(lunesRoster, 6);
  const hechasRoster = tareasHechasPorJugadorFecha(equipoHistory);
  const fraccionCumplidaRoster = crearFraccionCumplida(tareasProg);
  const asignadasPorJugador = new Map();
  const cumplidasPorJugador = new Map();
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : players.filter((p) => p.estado === "activo").map((p) => p.id);
      (s.fechas || []).forEach((f) => {
        if (f < lunesRoster || f > domingoRoster || f > hoyRoster) return;
        destino.forEach((jugadorId) => {
          asignadasPorJugador.set(jugadorId, (asignadasPorJugador.get(jugadorId) || 0) + 1);
          const fraccion = fraccionCumplidaRoster(s.id, f, hechasRoster.get(`${jugadorId}::${f}`), jugadorId);
          if (fraccion > 0) cumplidasPorJugador.set(jugadorId, (cumplidasPorJugador.get(jugadorId) || 0) + fraccion);
        });
      });
    });
  const adherenciaPorJugador = new Map();
  asignadasPorJugador.forEach((total, jugadorId) => {
    adherenciaPorJugador.set(jugadorId, Math.round(((cumplidasPorJugador.get(jugadorId) || 0) / total) * 100));
  });

  // Las 3 stats agregadas que pide la vista Equipos (tarjeta de grupo,
  // detalle de equipo y la página de Independientes): jugadores, adherencia
  // MEDIA DEL GRUPO (cumplidas/asignadas del conjunto, mismo criterio que
  // adherenciaEquipo en ResumenFichaJugadorReal — no la media de los
  // porcentajes individuales, que pondera distinto a quien tiene pocas
  // sesiones asignadas) y activos hoy (mismo criterio que pendientesHoy en
  // useDatosDashboardEntrenador: ya registrado hoy). grupoId === null pide
  // los independientes.
  const statsGrupo = (grupoId) => {
    const jugadoresGrupo = players.filter((p) =>
      grupoId === null ? (p.gruposIds || []).length === 0 : (p.gruposIds || []).includes(grupoId)
    );
    let asignadas = 0;
    let cumplidas = 0;
    let activosHoy = 0;
    jugadoresGrupo.forEach((p) => {
      asignadas += asignadasPorJugador.get(p.id) || 0;
      cumplidas += cumplidasPorJugador.get(p.id) || 0;
      if (hechasRoster.has(`${p.id}::${hoyRoster}`)) activosHoy++;
    });
    return {
      jugadores: jugadoresGrupo,
      total: jugadoresGrupo.length,
      adherenciaMedia: asignadas ? Math.round((cumplidas / asignadas) * 100) : null,
      activosHoy,
    };
  };

  // El código de entrenador nunca puede coincidir con el PIN de un jugador
  // (si coinciden, quien entra con ese número accede como entrenador a todo
  // el sistema de gestión) — se incluye siempre en el conjunto de PINs
  // "ocupados" al generar o comprobar duplicados.
  const pinsOcupados = (excluirId) =>
    players.filter((p) => p.id !== excluirId).map((p) => p.pin).concat(coachPin != null ? [coachPin] : []);

  const manejarAccion = async (id, accion) => {
    setErrorAccion("");
    let ok = true;
    if (accion === "suspender") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "suspendido" } : p)));
    } else if (accion === "activar") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "activo" } : p)));
    } else if (accion === "eliminar") {
      ok = await savePlayers(players.filter((p) => p.id !== id));
    } else if (accion === "reset") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, pin: genUniquePin(pinsOcupados(id)) } : p)));
    } else if (accion === "historial") {
      const jugador = players.find((p) => p.id === id);
      onOpenHistory?.(jugador);
    }
    if (!ok) setErrorAccion("No se pudo completar la acción. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const agregarJugador = async ({ nombre, pin }) => {
    const ok = await savePlayers([...players, { name: nombre, pin, estado: "activo", groupIds: [], gruposIds: grupoAltaPreset ? [grupoAltaPreset] : [] }]);
    if (ok) {
      setPanelAltaAbierto(false);
      setGrupoAltaPreset(null);
    }
  };

  const cambiarCategorias = async (id, nuevas) => {
    setErrorAccion("");
    const ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, groupIds: nuevas } : p)));
    if (!ok) setErrorAccion("No se pudo guardar el cambio de categoría. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const cambiarGrupos = async (id, nuevos) => {
    setErrorAccion("");
    const ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, gruposIds: nuevos } : p)));
    if (!ok) setErrorAccion("No se pudo guardar el cambio de grupo. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const crearGrupo = async (nombre) => {
    setErrorAccion("");
    const ok = await saveGrupos([...grupos, { nombre }]);
    if (!ok) setErrorAccion("No se pudo crear el grupo. Comprueba tu conexión e inténtalo de nuevo.");
    return ok;
  };

  const eliminarGrupo = async (id) => {
    setErrorAccion("");
    // Al borrar un grupo, se desengancha automáticamente de cualquier
    // usuario que lo tuviera — no deja referencias sueltas.
    const ok1 = await saveGrupos(grupos.filter((g) => g.id !== id));
    const afectados = players.filter((p) => (p.gruposIds || []).includes(id));
    const ok2 = afectados.length
      ? await savePlayers(players.map((p) => (p.gruposIds || []).includes(id) ? { ...p, gruposIds: p.gruposIds.filter((g) => g !== id) } : p))
      : true;
    if (!ok1 || !ok2) setErrorAccion("No se pudo eliminar el grupo del todo. Comprueba tu conexión e inténtalo de nuevo.");
    if (filtro === id) setFiltro("todos");
  };

  const visibles = players
    .filter((j) => {
      if (filtro === "todos") return true;
      if (filtro === "activo" || filtro === "suspendido") return j.estado === filtro;
      if (filtro === "independientes") return (j.gruposIds || []).length === 0;
      return (j.gruposIds || []).includes(filtro); // filtro = id de un grupo concreto
    })
    .filter((j) => j.name.toLowerCase().includes(busqueda.toLowerCase()));
  const activos = players.filter((j) => j.estado === "activo").length;
  const suspendidos = players.filter((j) => j.estado === "suspendido").length;
  const independientes = players.filter((j) => (j.gruposIds || []).length === 0).length;

  const grupoAbierto = vista === "equipos" && equipoAbiertoId ? grupos.find((g) => g.id === equipoAbiertoId) || null : null;
  const jugadoresEnEquipo = players.filter((p) => (p.gruposIds || []).length > 0).length;

  return (
    <PantallaEntrenadorAncha activo="roster" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        {/* view-switch del mockup de Fase 6 (Equipos y usuarios): tres
            vistas, no un valor binario — sigue siendo un grupo de botones
            (como DsTabSwitcher en el resto de la app), no un <select>. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {accesoSesion.token && accesoSesion.rol === "entrenador" ? (
            <button
              onClick={() => setCodigoEntrenadorAbierto((v) => !v)}
              style={{ fontSize: 12, padding: "7px 11px", borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}
            >
              Código de entrenador
            </button>
          ) : (
            <span />
          )}
          <DsTabSwitcher
            tabs={[
              { id: "cartera", label: "Cartera" },
              { id: "equipos", label: "Equipos" },
              { id: "independientes", label: "Independientes" },
            ]}
            active={vista}
            onChange={(v) => {
              setVista(v);
              setEquipoAbiertoId(null);
            }}
          />
        </div>

        {codigoEntrenadorAbierto && <PanelCodigoEntrenadorReal onCerrar={() => setCodigoEntrenadorAbierto(false)} />}

        {errorAccion && (
          <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 14 }}>
            {errorAccion}
          </div>
        )}

        {vista === "equipos" && !grupoAbierto && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>EQUIPOS</div>
                <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Equipos</h1>
                <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                  {grupos.length} {grupos.length === 1 ? "equipo" : "equipos"} · {jugadoresEnEquipo} jugadores en equipo · {independientes} independientes
                </div>
              </div>
              <button
                onClick={() => setPanelGrupoAbierto(true)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1.5px dashed ${ds.accentBorderSubtle}`, background: "transparent", color: ds.accent, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + Nuevo equipo
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
              {grupos.map((g) => (
                <TarjetaEquipoReal key={g.id} grupo={g} stats={statsGrupo(g.id)} onAbrir={() => setEquipoAbiertoId(g.id)} />
              ))}
              <TarjetaIndependientesReal count={independientes} onAbrir={() => setVista("independientes")} />
              {grupos.length === 0 && (
                <div style={{ gridColumn: "1 / -1", color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                  Todavía no has creado ningún equipo — usa "+ Nuevo equipo" para empezar.
                </div>
              )}
            </div>
          </div>
        )}

        {vista === "equipos" && grupoAbierto && (
          <DetalleEquipoReal
            grupo={grupoAbierto}
            stats={statsGrupo(grupoAbierto.id)}
            categorias={categorias}
            grupos={grupos}
            adherenciaPorJugador={adherenciaPorJugador}
            onAccion={manejarAccion}
            onCambiarCategorias={cambiarCategorias}
            onCambiarGrupos={cambiarGrupos}
            onBack={() => setEquipoAbiertoId(null)}
            onAddPlayer={() => {
              setGrupoAltaPreset(grupoAbierto.id);
              setPanelAltaAbierto(true);
            }}
            onEditGroup={() => setPanelGrupoAbierto(true)}
          />
        )}

        {vista === "independientes" && (
          <VistaIndependientesReal
            stats={statsGrupo(null)}
            categorias={categorias}
            grupos={grupos}
            adherenciaPorJugador={adherenciaPorJugador}
            onAccion={manejarAccion}
            onCambiarCategorias={cambiarCategorias}
            onCambiarGrupos={cambiarGrupos}
            onAddIndependiente={() => {
              setGrupoAltaPreset(null);
              setPanelAltaAbierto(true);
            }}
          />
        )}

        {vista === "cartera" && (
          <CarteraUsuariosReal
            players={players}
            grupos={grupos}
            cartera={cartera}
            onAbrir={(p) => onOpenHistory?.(p)}
            onAccion={manejarAccion}
            onAlta={() => {
              setGrupoAltaPreset(null);
              setPanelAltaAbierto(true);
            }}
            onGrupo={() => setPanelGrupoAbierto(true)}
          />
        )}
      </div>
      {panelAltaAbierto && (
        <PanelAltaReal
          pinsExistentes={pinsOcupados()}
          onGuardar={agregarJugador}
          onCerrar={() => {
            setPanelAltaAbierto(false);
            setGrupoAltaPreset(null);
          }}
        />
      )}
      {panelGrupoAbierto && (
        <PanelGestionGruposReal grupos={grupos} onCrear={crearGrupo} onEliminar={eliminarGrupo} onCerrar={() => setPanelGrupoAbierto(false)} />
      )}
    </PantallaEntrenadorAncha>
  );
}

// Iniciales para el avatar-stack de una tarjeta de equipo — mismo criterio
// que ya usa CabeceraFichaJugadorReal para el avatar grande de la ficha.
function inicialesNombre(name) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}
// Paleta decorativa para el avatar-stack — solo variación visual (quién es
// cada iniciales ya se ve en el título al pasar el ratón), no un dato nuevo.
const AVATAR_STACK_COLORES = [ds.chart2, ds.chart3, ds.accent, ds.success, ds.chart1];

// Mismo color de avatar para el mismo jugador en toda la app (fila de
// Usuarios, cabecera de su ficha...) — determinista a partir de su id, no
// aleatorio, así "reconoces" a alguien por su color de un vistazo en vez de
// que cambie cada vez que se vuelve a renderizar.
function colorAvatarJugador(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) >>> 0;
  return AVATAR_STACK_COLORES[hash % AVATAR_STACK_COLORES.length];
}

// Tarjeta de un equipo (grupo real) en la vista Equipos — nombre, avatar-
// stack de sus jugadores y las 3 stats agregadas (jugadores / adherencia
// media / activos hoy), calculadas en GestionRosterReal.statsGrupo.
function TarjetaEquipoReal({ grupo, stats, onAbrir }) {
  const visibles = stats.jugadores.slice(0, 3);
  const resto = stats.total - visibles.length;
  return (
    <button
      onClick={onAbrir}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)`,
        border: `1px solid ${ds.borderSoft}`,
        borderRadius: dsR.xl,
        padding: "15px 16px",
        boxShadow: dsSh.elevation1,
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", margin: 0, color: ds.ink }}>{grupo.nombre}</h3>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 2 }}>{stats.total} {stats.total === 1 ? "jugador" : "jugadores"}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: dsR.md, background: ds.accentSubtle, color: ds.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconoModulo tipo="personas" />
        </div>
      </div>
      {stats.total > 0 && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {visibles.map((p, i) => (
            <div
              key={p.id}
              title={p.name}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: AVATAR_STACK_COLORES[i % AVATAR_STACK_COLORES.length],
                color: "#fff",
                font: `600 9px ${dsF.sans}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${ds.surface}`,
                marginLeft: i === 0 ? 0 : -7,
                flexShrink: 0,
              }}
            >
              {inicialesNombre(p.name)}
            </div>
          ))}
          {resto > 0 && (
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: ds.border, color: ds.inkSecondary, font: `600 8.5px ${dsF.mono}`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ds.surface}`, marginLeft: -7, flexShrink: 0 }}>
              +{resto}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.total}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Jugadores</div>
        </div>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.adherenciaMedia != null ? `${stats.adherenciaMedia}%` : "—"}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Adherencia</div>
        </div>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.activosHoy}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Hoy activos</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: ds.accent }}>Ver equipo →</div>
    </button>
  );
}

// Tarjeta especial "Independientes" de la vista Equipos — estilo punteado,
// lleva a su propia página (VistaIndependientesReal).
function TarjetaIndependientesReal({ count, onAbrir }) {
  return (
    <button
      onClick={onAbrir}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: "transparent",
        border: `1px dashed ${ds.border}`,
        borderRadius: dsR.xl,
        padding: "15px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", margin: 0, color: ds.ink }}>Independientes</h3>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 2 }}>Sin equipo asignado</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: dsR.md, background: ds.border, color: ds.inkSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={16} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{count}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Jugadores</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: ds.accent }}>Ver independientes →</div>
    </button>
  );
}

// Fila de las 3 stats agregadas (Jugadores / Adherencia media / Activos
// hoy) — misma pieza en el detalle de un equipo y en Independientes.
function TeamStatsRowReal({ stats }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
      <MiniStat icon={<User size={12} />} label="Jugadores" value={stats.total} />
      <MiniStat icon={<TrendingUp size={12} />} label="Adherencia media" value={stats.adherenciaMedia != null ? `${stats.adherenciaMedia}%` : "—"} accent />
      <MiniStat icon={<Zap size={12} />} label="Activos hoy" value={`${stats.activosHoy} / ${stats.total}`} />
    </div>
  );
}

// Detalle de un equipo: roster filtrado a ese grupo + sus 3 stats
// agregadas. Reutiliza FilaJugadorReal tal cual (misma edición de
// categorías/grupos/PIN/menú de acciones que en Usuarios), no una fila
// nueva — así asignar/quitar del grupo desde aquí sigue funcionando igual.
function DetalleEquipoReal({ grupo, stats, categorias, grupos, adherenciaPorJugador, onAccion, onCambiarCategorias, onCambiarGrupos, onBack, onAddPlayer, onEditGroup }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        ← Volver a Equipos
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>EQUIPO</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{grupo.nombre}</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{stats.total} {stats.total === 1 ? "jugador" : "jugadores"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onEditGroup}
            title="Gestionar equipos"
            style={{ width: 34, height: 34, borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: ds.canvas, color: ds.inkSecondary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Pencil size={14} />
          </button>
          <DsButton variant="secondary" onClick={onAddPlayer}>+ Añadir jugador</DsButton>
        </div>
      </div>
      <TeamStatsRowReal stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.jugadores.map((j) => (
          <FilaJugadorReal
            key={j.id}
            jugador={j}
            categorias={categorias}
            grupos={grupos}
            adherencia={adherenciaPorJugador.has(j.id) ? adherenciaPorJugador.get(j.id) : null}
            onAccion={onAccion}
            onCambiarCategorias={onCambiarCategorias}
            onCambiarGrupos={onCambiarGrupos}
          />
        ))}
        {stats.jugadores.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Todavía no hay jugadores en este equipo.</div>}
      </div>
    </div>
  );
}

// Página propia de Independientes (no solo un chip de filtro): mismas 3
// stats agregadas + roster, reutilizando FilaJugadorReal — su "+" junto a
// los chips de grupo ya asigna a un equipo (equivalente al botón "Asignar a
// equipo" del mockup), sin duplicar esa lógica en una fila nueva.
function VistaIndependientesReal({ stats, categorias, grupos, adherenciaPorJugador, onAccion, onCambiarCategorias, onCambiarGrupos, onAddIndependiente }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>INDEPENDIENTES</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Independientes</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{stats.total} {stats.total === 1 ? "jugador sin equipo asignado" : "jugadores sin equipo asignado"}</div>
        </div>
        <button
          onClick={onAddIndependiente}
          style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1.5px dashed ${ds.accentBorderSubtle}`, background: "transparent", color: ds.accent, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + Añadir independiente
        </button>
      </div>
      <TeamStatsRowReal stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.jugadores.map((j) => (
          <FilaJugadorReal
            key={j.id}
            jugador={j}
            categorias={categorias}
            grupos={grupos}
            adherencia={adherenciaPorJugador.has(j.id) ? adherenciaPorJugador.get(j.id) : null}
            onAccion={onAccion}
            onCambiarCategorias={onCambiarCategorias}
            onCambiarGrupos={onCambiarGrupos}
          />
        ))}
        {stats.jugadores.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>No hay jugadores independientes — todos están asignados a un equipo.</div>}
      </div>
    </div>
  );
}

// IconoModulo y MODULOS_DASHBOARD ahora en src/core/layoutEntrenador.jsx —
// importadas arriba.

// (La antigua TarjetaModuloCompactaReal, tarjeta grande de módulo, se
// retiró: el acceso directo a módulos del Dashboard móvil ahora es una
// cuadrícula de 4 columnas más pequeña, en línea dentro del propio
// DashboardEntrenadorCompactoReal.)

// (La antigua TarjetaEstadoHoyReal, tarjeta grande de estado del día, se
// retiró: el Dashboard móvil ahora usa la misma barra compacta de CTA que
// el de escritorio/iPad, calculada en useDatosDashboardEntrenador.)

// (La antigua TarjetaUsuariosGruposReal se retiró: el Dashboard móvil ahora
// muestra el mismo bloque de MiniStat que el de escritorio/iPad, con más
// datos — sesiones/semana y adherencia además de usuarios/grupos.)

// Versión móvil del Dashboard — mismo dato real que la de escritorio/iPad
// (useDatosDashboardEntrenador), pero apilada en una sola columna. Aquí SÍ
// puede hacer scroll de contenido: es la pantalla de móvil real, y
// PantallaBase ya implementa el patrón correcto (capa fija + una única
// región de scroll interno), el mismo que usa toda la vista del jugador —
// no una excepción nueva, sino el mismo patrón de siempre.
// Rediseño compacto: menos cajas, menos texto de relleno, acceso directo a
// los módulos arriba (no al fondo de un scroll largo), y las dos listas de
// jugadores con su propio alto máximo + scroll interno en vez de una fila
// gigante por jugador — así 20+ jugadores no convierten el Dashboard en una
// lista infinita.
const LISTA_MOVIL_MAX_ALTO = 216;


// fechaISO, inicioSemanaCalendario, sumarDiasFecha, generarCuadriculaMes,
// inicioMes, sumarMeses, labelMes ahora en src/calc/fechas.js — importadas
// arriba.

// ---------- CARTERA DE JUGADORES + INICIO (bandeja de atención) ----------
// Un único cálculo compartido por Inicio, la lista de Usuarios y la ficha:
// para cada jugador activo, cómo va (adherencia 4 semanas, última actividad,
// CMJ, rendimiento) y qué requiere atención. Todo sale de datos que ya
// existen; no se guarda nada nuevo.
const SEV_ALERTA = { 3: { color: ds.danger, label: "Urgente" }, 2: { color: ds.warning, label: "Atención" }, 1: { color: ds.inkMuted, label: "Aviso" } };
const ESTADO_JUGADOR_META = {
  atencion: { label: "Atención", color: ds.warning },
  aldia: { label: "Al día", color: ds.success },
  sinplan: { label: "Sin plan", color: ds.inkMuted },
};

// Molestias que han indicado los jugadores en las últimas dos semanas. Tolerante:
// si la tabla "molestias" no existe todavía, devuelve una lista vacía.
function useMolestiasRecientes() {
  const [rows, setRows] = useState(() => sharedDataCache.get("molestias_rec") || null);
  useEffect(() => {
    if (rows !== null) return undefined;
    let off = false;
    (async () => {
      let lista = [];
      try {
        const { data, error } = await supabase.from("molestias").select("*").gte("fecha", sumarDiasFecha(todayStr(), -13));
        lista = error ? [] : data || [];
      } catch (e) {
        lista = [];
      }
      sharedDataCache.set("molestias_rec", lista);
      if (!off) setRows(lista);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows || [];
}

function useCarteraEntrenador() {
  const datos = useDatosDashboardEntrenador();
  const [playersAll, , playersLoaded] = usePlayers();
  const { items: hist, loaded: histLoaded } = useEquipoHistory();
  const { sesiones, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const [solicitudes, , solLoaded] = useEntityList("solicitudesSesion", { estado: "pendiente" });
  const estadoCmj = useEstadoCmjEquipo(playersAll);
  const molestias = useMolestiasRecientes();
  if (!datos.loaded || !playersLoaded || !histLoaded || !progLoaded) return { loaded: false };

  const hoy = todayStr();
  const manana = sumarDiasFecha(hoy, 1);
  const lunes = inicioSemanaCalendario(hoy);
  const desde28 = sumarDiasFecha(hoy, -27);
  const desde14 = sumarDiasFecha(hoy, -13);
  const activos = datos.activos;
  const hechas = tareasHechasPorJugadorFecha(hist);
  const fraccion = crearFraccionCumplida(tareasProg);

  const met = new Map();
  activos.forEach((p) => met.set(p.id, { asig28: 0, cump28: 0, asigSem: 0, cumpSem: 0, asig14: 0, ultima: null }));
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = destinatariosEfectivosSesion(s, activos);
      (s.fechas || []).forEach((f) => {
        if (f < desde28 || f > hoy) return;
        destino.forEach((id) => {
          const r = met.get(id);
          if (!r) return;
          const fr = fraccion(s.id, f, hechas.get(`${id}::${f}`), id);
          if (f === hoy && fr <= 0) return; // hoy todavía puede hacerla
          r.asig28 += 1;
          r.cump28 += fr;
          if (f >= lunes) {
            r.asigSem += 1;
            r.cumpSem += fr;
          }
          if (f >= desde14) r.asig14 += 1;
        });
      });
    });
  hist.forEach((it) => {
    if (!it.done) return;
    const r = met.get(it.jugadorId);
    if (r && (!r.ultima || it.date > r.ultima)) r.ultima = it.date;
  });
  const variacionPorJugador = new Map((datos.variaciones || []).map((v) => [v.jugador.id, v]));

  // ---- Alertas ----
  const alertas = [];
  const porJugador = new Map();
  const nuevaAlerta = (a) => {
    alertas.push(a);
    if (a.jugadorId) {
      if (!porJugador.has(a.jugadorId)) porJugador.set(a.jugadorId, []);
      porJugador.get(a.jugadorId).push(a);
    }
  };
  const fmtF = (f) => new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  (datos.rendimiento?.sistemicos || []).forEach((sx) => {
    nuevaAlerta({
      id: `datos-${sx.clave}`,
      sev: 1,
      tipo: "datos",
      titulo: `${sx.nombre}: ${sx.pct > 0 ? "+" : ""}${sx.pct} % en ${sx.jugadores} jugadores a la vez`,
      detalle: "Cambio demasiado grande y simultáneo para ser rendimiento: ¿cambió el material, la unidad de carga o el ejercicio? Se ha excluido de las alertas de rendimiento.",
      acciones: [],
    });
  });
  activos.forEach((p) => {
    const r = met.get(p.id);
    const cmj = estadoCmj && estadoCmj.get ? estadoCmj.get(p.id) : null;
    if (cmj && (cmj.status === "red" || cmj.status === "amber")) {
      nuevaAlerta({
        id: `cmj-${p.id}`,
        sev: cmj.status === "red" ? 3 : 2,
        tipo: "cmj",
        jugadorId: p.id,
        chip: `${p.name}${cmj.fechaTest ? ` · test ${fmtF(cmj.fechaTest)}` : ""}`,
        titulo: `${p.name} · CMJ ${cmj.status === "red" ? "en rojo" : "a vigilar"}`,
        detalle: `Último test ${cmj.fechaTest ? fmtF(cmj.fechaTest) : "—"}. Revisa la carga de su próxima sesión.`,
        acciones: [{ label: "Ver CMJ", tipo: "ficha", pestana: "cmj" }, { label: "Planificar", tipo: "cal" }],
      });
    }
    const ultimaMol = molestias
      .filter((m) => m.jugador_id === p.id && m.fecha >= sumarDiasFecha(hoy, -3) && Number(m.valor) >= 5)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
    if (ultimaMol) {
      const val = Number(ultimaMol.valor);
      const cuando = ultimaMol.fecha === hoy ? "hoy" : ultimaMol.fecha === sumarDiasFecha(hoy, -1) ? "ayer" : `el ${fmtF(ultimaMol.fecha)}`;
      nuevaAlerta({
        id: `mol-${p.id}`,
        sev: val >= 7 ? 3 : 2,
        tipo: "molestia",
        chip: `${p.name} · ${val}/10${ultimaMol.zona ? ` ${String(ultimaMol.zona).toLowerCase()}` : ""}`,
        jugadorId: p.id,
        titulo: `${p.name} · molestia ${val}/10${ultimaMol.zona ? ` en ${String(ultimaMol.zona).toLowerCase()}` : ""}`,
        detalle: `Indicada ${cuando} al enviar su sesión. Valora ajustar su próxima sesión.`,
        acciones: [{ label: "Planificar", tipo: "cal" }, { label: "Ver ficha", tipo: "ficha", pestana: "resumen" }],
      });
    }
    const rend = datos.rendimiento?.resultados?.get(p.id);
    if (rend && rend.alerta) {
      const n = rend.bajan.length;
      nuevaAlerta({
        id: `e1rm-${p.id}`,
        // Regla calibrada (ver RENDIMIENTO_CFG): siempre "aviso", nunca urgencia:
        // el e1RM depende del RIR que apunta el jugador.
        sev: 1,
        chip: `${p.name} · ${Math.round(rend.pct)} %`,
        tipo: "rendimiento",
        jugadorId: p.id,
        titulo: `${p.name} · ${n} ejercicios con la carga estimada a la baja`,
        detalle: `Lo que más baja: ${rend.peor.nombre} (${Math.round(rend.peor.pct)} %) frente a su nivel habitual.`,
        acciones: [{ label: "Ver ficha", tipo: "ficha", pestana: "progreso" }],
      });
    }
    const diasSin = r.ultima ? diasEntreFechas(r.ultima, hoy) : null;
    if (r.asig14 >= 2 && (diasSin === null || diasSin >= 5)) {
      nuevaAlerta({
        id: `inactivo-${p.id}`,
        sev: 2,
        chip: `${p.name} · ${diasSin === null ? "nunca" : `${diasSin} d`}`,
        tipo: "inactivo",
        jugadorId: p.id,
        titulo: `${p.name} · sin registrar ${diasSin === null ? "ninguna sesión" : `desde hace ${diasSin} días`}`,
        detalle: `Tenía ${r.asig14} sesiones asignadas en las últimas dos semanas.`,
        acciones: [{ label: "Ver ficha", tipo: "ficha", pestana: "resumen" }],
      });
    } else if (r.asig28 >= 4 && r.cump28 / r.asig28 < 0.6) {
      nuevaAlerta({
        id: `adh-${p.id}`,
        sev: r.cump28 / r.asig28 < 0.4 ? 2 : 1,
        chip: `${p.name} · ${Math.round((r.cump28 / r.asig28) * 100)} %`,
        tipo: "adherencia",
        jugadorId: p.id,
        titulo: `${p.name} · adherencia ${Math.round((r.cump28 / r.asig28) * 100)} %`,
        detalle: "En las últimas 4 semanas cumple menos de lo planificado.",
        acciones: [{ label: "Ver ficha", tipo: "ficha", pestana: "resumen" }],
      });
    }
  });
  // Del entrenador (no de un jugador)
  sesiones
    .filter((s) => !s.enviada && (s.tareas === undefined || true))
    .forEach((s) => {
      (s.fechas || []).forEach((f) => {
        if (f !== hoy && f !== manana) return;
        nuevaAlerta({
          id: `borrador-${s.id}-${f}`,
          sev: f === hoy ? 3 : 2,
          tipo: "borrador",
          titulo: `Borrador sin publicar para ${f === hoy ? "hoy" : "mañana"}`,
          detalle: `${s.nombre || "Sesión sin nombre"} · nadie la verá hasta que la publiques.`,
          acciones: [{ label: "Abrir calendario", tipo: "cal" }],
        });
      });
    });
  if (solLoaded) {
    solicitudes.forEach((sol) => {
      const p = datos.playersById.get(sol.jugador_id);
      nuevaAlerta({
        id: `sol-${sol.id}`,
        sev: 2,
        tipo: "solicitud",
        jugadorId: sol.jugador_id,
        titulo: `${p ? p.name : "Un jugador"} pide sesión${sol.fecha ? ` para el ${fmtF(sol.fecha)}` : ""}`,
        detalle: sol.nota ? `“${sol.nota}”` : "Pendiente de respuesta en el calendario.",
        acciones: [{ label: "Responder", tipo: "cal", scopeJugador: true }],
      });
    });
  }
  const hayAlgoProximo = sesiones.some((s) => (s.fechas || []).some((f) => f >= hoy && f <= sumarDiasFecha(hoy, 2)));
  if (!hayAlgoProximo) {
    nuevaAlerta({ id: "vacio-2d", sev: 1, tipo: "vacio", titulo: "No hay nada planificado en los próximos 2 días", detalle: "Planifica la semana desde el calendario.", acciones: [{ label: "Planificar semana", tipo: "cal" }] });
  }
  alertas.sort((a, b) => b.sev - a.sev);

  // ---- Estado por jugador ----
  const filas = new Map();
  activos.forEach((p) => {
    const r = met.get(p.id);
    const al = porJugador.get(p.id) || [];
    const cmj = estadoCmj && estadoCmj.get ? estadoCmj.get(p.id) : null;
    const estado = al.some((a) => a.sev >= 2) ? "atencion" : r.asig28 === 0 && r.asig14 === 0 ? "sinplan" : "aldia";
    filas.set(p.id, {
      estado,
      adh28: r.asig28 ? Math.round((r.cump28 / r.asig28) * 100) : null,
      adhSem: r.asigSem ? Math.round((r.cumpSem / r.asigSem) * 100) : null,
      ultima: r.ultima,
      diasSin: r.ultima ? diasEntreFechas(r.ultima, hoy) : null,
      cmj: cmj ? cmj.status : null,
      molestia: (() => {
        const ms = molestias.filter((m) => m.jugador_id === p.id && m.fecha >= sumarDiasFecha(hoy, -3)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
        return ms.length ? Number(ms[0].valor) : null;
      })(),
      hoy: null, // "hecho" | "parcial" | "pendiente" | null (sin sesión hoy); se rellena abajo
      variacion: variacionPorJugador.has(p.id) ? variacionPorJugador.get(p.id).pct : null,
      alertas: al,
    });
  });

  // ---- Hoy ----
  const sesionesHoy = sesiones
    .filter((s) => s.enviada && (s.fechas || []).includes(hoy))
    .map((s) => {
      const ids = destinatariosEfectivosSesion(s, activos);
      const completos = [];
      const parciales = [];
      const ninguno = [];
      ids.forEach((id) => {
        const p = datos.playersById.get(id);
        if (!p || p.estado !== "activo") return;
        const fr = fraccion(s.id, hoy, hechas.get(`${id}::${hoy}`), id);
        if (fr >= 0.999) completos.push(p);
        else if (fr > 0) parciales.push(p);
        else ninguno.push(p);
      });
      return { sesion: s, completos, parciales, ninguno, total: completos.length + parciales.length + ninguno.length };
    });

  const rangoHoy = { hecho: 3, parcial: 2, pendiente: 1 };
  const marcarHoy = (lista, valor) =>
    lista.forEach((pl) => {
      const f = filas.get(pl.id);
      if (f && (f.hoy == null || rangoHoy[valor] > rangoHoy[f.hoy])) f.hoy = valor;
    });
  sesionesHoy.forEach(({ completos, parciales, ninguno }) => {
    marcarHoy(completos, "hecho");
    marcarHoy(parciales, "parcial");
    marcarHoy(ninguno, "pendiente");
  });

  // ---- Semana ----
  const semana = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDiasFecha(lunes, i);
    const env = sesiones.filter((s) => s.enviada && (s.fechas || []).includes(f));
    const bor = sesiones.filter((s) => !s.enviada && (s.fechas || []).includes(f));
    return { fecha: f, dow: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i], num: Number(f.slice(8)), env: env.length, bor: bor.length, esHoy: f === hoy, pasado: f < hoy };
  });

  const cumplSem = (() => {
    let a = 0;
    let c = 0;
    met.forEach((r) => {
      a += r.asigSem;
      c += r.cumpSem;
    });
    return a ? Math.round((c / a) * 100) : null;
  })();

  return { loaded: true, activos, playersById: datos.playersById, grupos: datos.grupos, gruposById: datos.gruposById, filas, alertas, sesionesHoy, semana, cumplSem, hoy };
}

// Agrupa las alertas repetitivas (una por jugador) en una sola fila con los
// nombres dentro, para que la bandeja sean unas pocas líneas y no una por jugador.
// CMJ en rojo y molestias fuertes siguen siendo una fila por jugador: son las
// que piden actuar ya.
const PLANTILLA_GRUPO_ALERTA = {
  cmj: (n) => ({ titulo: `${n} jugadores con el CMJ a vigilar`, detalle: "Revisa la carga de sus próximas sesiones." }),
  molestia: (n) => ({ titulo: `${n} jugadores con molestia`, detalle: "Indicada al enviar su última sesión." }),
  inactivo: (n) => ({ titulo: `${n} jugadores sin registrar desde hace 5 días o más`, detalle: "Tenían sesiones asignadas en las últimas dos semanas." }),
  adherencia: (n) => ({ titulo: `${n} jugadores por debajo del 60 % de adherencia`, detalle: "Cumplimiento de las últimas 4 semanas." }),
  rendimiento: (n) => ({ titulo: `${n} jugadores con la carga estimada a la baja esta semana`, detalle: "Dato orientativo: se calcula con el RIR que indican, compruébalo en su ficha antes de actuar." }),
};
function agruparAlertas(alertas) {
  const salida = [];
  const porTipo = new Map();
  alertas.forEach((a) => {
    const individual = !a.jugadorId || a.tipo === "solicitud" || !PLANTILLA_GRUPO_ALERTA[a.tipo] || (a.tipo === "cmj" && a.sev >= 3) || (a.tipo === "molestia" && a.sev >= 3);
    if (individual) {
      salida.push(a);
      return;
    }
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, []);
    porTipo.get(a.tipo).push(a);
  });
  porTipo.forEach((lista, tipo) => {
    if (lista.length === 1) {
      salida.push(lista[0]);
      return;
    }
    const plantilla = PLANTILLA_GRUPO_ALERTA[tipo](lista.length);
    salida.push({
      id: `grupo-${tipo}`,
      sev: Math.max(...lista.map((a) => a.sev)),
      tipo,
      titulo: plantilla.titulo,
      detalle: plantilla.detalle,
      chips: lista.map((a) => ({ label: a.chip || a.titulo, jugadorId: a.jugadorId, pestana: (a.acciones || []).find((x) => x.tipo === "ficha")?.pestana || "resumen" })),
      acciones: [],
    });
  });
  return salida.sort((a, b) => b.sev - a.sev);
}

function PuntoSev({ sev }) {
  return <span style={{ width: 9, height: 9, borderRadius: "50%", background: (SEV_ALERTA[sev] || SEV_ALERTA[1]).color, flexShrink: 0, marginTop: 5 }} />;
}

// Una fila de la bandeja: qué pasa + botones para resolverlo.
function FilaAlertaReal({ alerta, onAccion }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 0", borderTop: `1px solid ${ds.border}`, flexWrap: "wrap" }}>
      <PuntoSev sev={alerta.sev} />
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.ink }}>{alerta.titulo}</div>
        <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 2 }}>{alerta.detalle}</div>
        {alerta.chips && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {alerta.chips.map((c) => (
              <button key={c.jugadorId + c.label} type="button" onClick={() => onAccion(alerta, { tipo: "ficha", pestana: c.pestana, jugadorId: c.jugadorId })} style={{ fontSize: 11.5, color: ds.ink, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(alerta.acciones || []).map((a, i) => (
          <button key={a.label} type="button" onClick={() => onAccion(alerta, a)} style={{ fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "6px 11px", cursor: "pointer", border: `1px solid ${i === 0 ? ds.accent : ds.border}`, background: i === 0 ? ds.accentSubtle : "transparent", color: i === 0 ? ds.accent : ds.inkSecondary }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InicioEntrenadorReal({ onAbrirModulo, onCerrarSesion, onOpenHistory }) {
  const c = useCarteraEntrenador();
  const { todos: partidosInicio } = usePartidos();
  const ancho = useAnchoVentana();
  const pendientesCount = useSolicitudesPendientesCount();
  const [verTodas, setVerTodas] = useState(false);
  const [abiertas, setAbiertas] = useState({});
  const hoyLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const bandeja = c.loaded ? agruparAlertas(c.alertas) : [];

  const accion = (alerta, a) => {
    const jugador = a.jugadorId || alerta.jugadorId ? c.playersById.get(a.jugadorId || alerta.jugadorId) : null;
    if (a.tipo === "ficha" && jugador) onOpenHistory?.(jugador, a.pestana);
    else if (a.tipo === "cal") onAbrirModulo(a.scopeJugador && alerta.jugadorId ? `calendario:j:${alerta.jugadorId}` : jugador && alerta.tipo !== "borrador" ? `calendario:j:${jugador.id}` : "calendario");
    else if (a.tipo === "fatiga") onAbrirModulo("fatiga");
  };

  const cuerpo = !c.loaded ? (
    <LoadingBlock />
  ) : (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{hoyLabel}</div>
        <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0 }}>Inicio</h1>
        {(() => {
          const prox = partidosInicio.filter((x) => x.fecha >= c.hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
          if (!prox) return null;
          const dias = diasEntreFechas(c.hoy, prox.fecha);
          const cuando = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
          return (
            <div style={{ fontSize: 13, color: ds.inkSecondary, marginTop: 6 }}>
              Próximo partido: <b style={{ color: ds.ink }}>{new Date(`${prox.fecha}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</b>
              {prox.rival ? ` · ${prox.rival}` : ""} · {cuando}
            </div>
          );
        })()}
      </div>

      {/* HOY */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Hoy</b>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Calendario →</button>
        </div>
        {c.sesionesHoy.length === 0 && (
          <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "6px 0 2px" }}>
            No hay ninguna sesión publicada para hoy.
            <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Planificar →</button>
          </div>
        )}
        {c.sesionesHoy.map(({ sesion, completos, parciales, ninguno, total }) => {
          const pct = total ? Math.round(((completos.length + parciales.length * 0.5) / total) * 100) : 0;
          const falta = [...ninguno, ...parciales];
          const abierta = !!abiertas[sesion.id];
          return (
            <div key={sesion.id} style={{ padding: "10px 0", borderTop: `1px solid ${ds.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: ds.accent, fontSize: 14, flex: "1 1 200px", minWidth: 0 }}>{sesion.nombre || sesion.objetivo || "Sesión de hoy"}{sesion.md ? <span style={{ marginLeft: 8, fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>{sesion.md}</span> : null}</span>
                <div style={{ flex: "0 1 150px", minWidth: 80, height: 6, borderRadius: 999, background: ds.border, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${total ? (completos.length / total) * 100 : 0}%`, background: ds.success }} />
                  <div style={{ width: `${total ? (parciales.length / total) * 100 : 0}%`, background: `${ds.success}66` }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{completos.length}/{total} <span style={{ color: ds.inkMuted, fontWeight: 500 }}>· {pct} %</span></span>
                {falta.length > 0 && (
                  <button type="button" onClick={() => setAbiertas((a) => ({ ...a, [sesion.id]: !a[sesion.id] }))} style={{ fontSize: 12, color: ds.accent, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                    {abierta ? "Ocultar" : `Falta registrar (${falta.length})`}
                  </button>
                )}
              </div>
              {abierta && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {falta.map((p) => (
                    <button key={p.id} type="button" onClick={() => onOpenHistory?.(p)} style={{ fontSize: 11.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, background: "transparent", borderRadius: 999, padding: "2px 10px", cursor: "pointer" }}>
                      {p.name}{parciales.includes(p) ? " · parcial" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PLANTEL HOY */}
      {c.activos.length > 0 && (() => {
        const orden = { atencion: 0, aldia: 1, sinplan: 2 };
        const lista = [...c.activos].sort((a, b) => (orden[c.filas.get(a.id)?.estado] ?? 3) - (orden[c.filas.get(b.id)?.estado] ?? 3) || a.name.localeCompare(b.name));
        const resumen = { hecho: 0, parcial: 0, pendiente: 0 };
        lista.forEach((pl) => {
          const h = c.filas.get(pl.id)?.hoy;
          if (h) resumen[h] += 1;
        });
        return (
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Plantel</b>
              <span style={{ fontSize: 12, color: ds.inkSecondary }}>{c.activos.length} activos</span>
              <span style={{ flex: 1 }} />
              {(resumen.hecho + resumen.parcial + resumen.pendiente) > 0 && (
                <span style={{ fontSize: 12, color: ds.inkSecondary }}>
                  Hoy: <b style={{ color: ds.success }}>{resumen.hecho}</b> hecho · <b>{resumen.parcial}</b> a medias · <b style={{ color: ds.warning }}>{resumen.pendiente}</b> pendiente
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lista.map((pl) => {
                const f = c.filas.get(pl.id) || {};
                const meta = ESTADO_JUGADOR_META[f.estado];
                const etiquetas = [];
                if (f.molestia != null && f.molestia >= 3) etiquetas.push({ t: `M${f.molestia}`, color: f.molestia >= 7 ? ds.danger : ds.warning, titulo: `Molestia ${f.molestia}/10` });
                if (f.cmj === "red" || f.cmj === "amber") etiquetas.push({ t: "CMJ", color: f.cmj === "red" ? ds.danger : ds.warning, titulo: f.cmj === "red" ? "CMJ en rojo" : "CMJ a vigilar" });
                const hoyIcono = f.hoy === "hecho" ? "✓" : f.hoy === "parcial" ? "½" : f.hoy === "pendiente" ? "○" : "";
                const titulo = [meta ? meta.label : "", f.adh28 != null ? `adherencia 4 sem: ${f.adh28} %` : "", f.hoy ? `hoy: ${f.hoy}` : "sin sesión hoy"].filter(Boolean).join(" · ");
                return (
                  <button key={pl.id} type="button" title={titulo} onClick={() => onOpenHistory?.(pl)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, border: `1px solid ${ds.border}`, background: "transparent", color: ds.ink, fontSize: 12, cursor: "pointer" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta ? meta.color : ds.inkMuted, flexShrink: 0 }} />
                    {pl.name}
                    {etiquetas.map((e) => (
                      <span key={e.t} title={e.titulo} style={{ fontFamily: dsF.mono, fontSize: 10, fontWeight: 800, color: e.color }}>{e.t}</span>
                    ))}
                    {hoyIcono && <span style={{ fontFamily: dsF.mono, fontSize: 11, color: f.hoy === "hecho" ? ds.success : ds.inkMuted }}>{hoyIcono}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginTop: 10 }}>Punto = estado (naranja atención · verde al día · gris sin plan) · M = molestia ≥3 en 3 días · CMJ = a vigilar/rojo · ✓ hecho hoy · ½ a medias · ○ pendiente</div>
          </div>
        );
      })()}

      {/* REQUIERE TU ATENCIÓN */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Requiere tu atención</b>
          {bandeja.length > 0 && <span style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 800, background: ds.warning, color: "#1A0F00", borderRadius: 999, padding: "1px 8px" }}>{bandeja.length}</span>}
        </div>
        {bandeja.length === 0 && <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 0 2px" }}>Nada pendiente. Todo el equipo al día.</div>}
        {(verTodas ? bandeja : bandeja.slice(0, 6)).map((a) => (
          <FilaAlertaReal key={a.id} alerta={a} onAccion={accion} />
        ))}
        {bandeja.length > 6 && (
          <button type="button" onClick={() => setVerTodas((v) => !v)} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            {verTodas ? "Ver menos" : `Ver las ${bandeja.length - 6} restantes`}
          </button>
        )}
      </div>

      {/* ESTA SEMANA */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Esta semana</b>
          {c.cumplSem !== null && <span style={{ fontSize: 12.5, color: ds.inkSecondary }}>{c.cumplSem} % de cumplimiento hasta hoy</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Abrir →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
          {c.semana.map((d) => (
            <button key={d.fecha} type="button" onClick={() => onAbrirModulo("calendario")} style={{ background: d.esHoy ? ds.accentSubtle : ds.surfaceRaised, border: `1px solid ${d.esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: 12, padding: "8px 4px", cursor: "pointer", color: ds.ink, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: ds.inkMuted, textTransform: "uppercase" }}>{d.dow} {d.num}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: d.env ? ds.ink : ds.inkMuted }}>{d.env ? `${d.env} ses.` : "—"}</span>
              <span style={{ fontSize: 10.5, color: d.bor ? ds.warning : "transparent" }}>{d.bor ? `${d.bor} borrador` : "·"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (ancho >= 1000) {
    return (
      <PantallaEntrenadorAncha activo="dashboard" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
        {cuerpo}
      </PantallaEntrenadorAncha>
    );
  }
  return (
    <PantallaBase rol="entrenador" maxWidth={560}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 7, marginBottom: 16 }}>
          {MODULOS_DASHBOARD.map((m) => (
            <button key={m.id} onClick={() => onAbrirModulo(m.id)} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 10, padding: "9px 4px", cursor: "pointer", color: ds.ink }}>
              {m.id === "calendario" && pendientesCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: ds.warning, color: "#1A0F00", fontFamily: dsF.mono, fontSize: 8.5, fontWeight: 800, borderRadius: 999, padding: "0 5px" }}>{pendientesCount}</span>}
              <div style={{ color: ds.inkMuted }}><IconoModulo tipo={m.icono} /></div>
              <div style={{ fontSize: 9.5, fontWeight: 600, textAlign: "center", lineHeight: 1.15 }}>{m.nombre}</div>
            </button>
          ))}
        </div>
        {cuerpo}
        <button type="button" onClick={onCerrarSesion} style={{ marginTop: 6, fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Cerrar sesión</button>
      </div>
    </PantallaBase>
  );
}

// SidebarEntrenadorReal y PantallaEntrenadorAncha ahora en
// src/core/layoutEntrenador.jsx — importadas arriba.

// Datos del Dashboard del entrenador — extraído a un hook propio para que
// la versión de escritorio/iPad (barra lateral) y la de móvil compartan
// exactamente el mismo cálculo, en vez de duplicarlo entre las dos.
function useDatosDashboardEntrenador() {
  const [players, , playersLoaded] = usePlayers();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  const { sesiones, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const { items: equipoHistory, loaded: historyLoaded } = useEquipoHistory();
  const { items: refsEquipo, loaded: refsEquipoLoaded } = useReferenciasFuerza(null, { todos: true });
  const loaded = playersLoaded && gruposLoaded && progLoaded && historyLoaded;

  if (!loaded) return { loaded: false };

  const hoy = todayStr();
  const hoyLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const activos = players.filter((p) => p.estado === "activo");
  const playersById = new Map(players.map((p) => [p.id, p]));
  const independientes = activos.filter((p) => (p.gruposIds || []).length === 0).length;
  const gruposById = new Map(grupos.map((g) => [g.id, g.nombre || g.name || "Grupo"]));

  const sesionHoy = sesiones.find((s) => s.enviada && (s.fechas || []).includes(hoy));
  const borradorHoy = sesiones.find((s) => !s.enviada && (s.fechas || []).includes(hoy));
  const borradores = sesiones.filter((s) => !s.enviada).length;

  // CTA de la cabecera (escritorio/iPad y móvil): estado del día resuelto
  // aquí, compartido por ambas variantes del Dashboard.
  let heroTitulo, heroAccionLabel, heroAccionModulo;
  if (sesionHoy) {
    heroTitulo = "Trabajo de hoy publicado";
    heroAccionLabel = "Ver quién ha registrado";
    heroAccionModulo = "historial";
  } else if (borradorHoy) {
    heroTitulo = "Hay un borrador de hoy sin publicar";
    heroAccionLabel = "Retomar borrador";
    heroAccionModulo = "programacion";
  } else {
    heroTitulo = "Nada planificado para hoy";
    heroAccionLabel = "Diseñar sesión de hoy";
    heroAccionModulo = "diseno";
  }

  const lunes = inicioSemanaCalendario(hoy);
  const domingo = sumarDiasFecha(lunes, 6);

  // Ocurrencias de sesión (sesión × fecha) dentro de la semana de
  // calendario, y cuántas de esas fechas ya han llegado (<= hoy).
  let ocurrenciasSemana = 0;
  let ocurrenciasRealizadas = 0;
  const asignacionesSemana = []; // [{ jugadorId, date }] — solo fechas ya llegadas, para adherencia
  // Para "Tu semana" (panel L-D) y "jugadores sin trabajo": mismas fechas
  // enviadas/borrador dentro de la semana, pero acumuladas por fecha (para
  // el punto de estado de cada día) y por jugador (para saber quién tiene
  // algún destino asignado esta semana, publicado o no). Reutiliza el mismo
  // bucle de arriba en vez de recorrer `sesiones` una tercera vez.
  const fechasConEnviada = new Set(); // fechas de la semana con >=1 sesión ENVIADA ese día
  const fechasConCualquiera = new Set(); // fechas de la semana con >=1 sesión (enviada o borrador)
  const jugadoresConTrabajoSemana = new Set(); // jugadorId con algún destino (enviado o borrador) esta semana, cualquier fecha
  sesiones.forEach((s) => {
    const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : activos.map((p) => p.id);
    (s.fechas || []).forEach((f) => {
      if (f < lunes || f > domingo) return;
      if (s.enviada) {
        ocurrenciasSemana++;
        fechasConEnviada.add(f);
        if (f <= hoy) {
          ocurrenciasRealizadas++;
          destino.forEach((jugadorId) => asignacionesSemana.push({ jugadorId, date: f, sesionId: s.id }));
        }
      }
      fechasConCualquiera.add(f);
      destino.forEach((jugadorId) => jugadoresConTrabajoSemana.add(jugadorId));
    });
  });

  // "Tu semana": un punto de estado por día L-D. Regla honesta y simple
  // (documentada también en el mockup): "ok" = sesión ENVIADA ese día y ya
  // ha pasado (o es hoy); "pending" = alguna sesión (enviada o borrador)
  // ese día y todavía no ha pasado (es hoy o futuro); en cualquier otro
  // caso, "empty" — incluido el caso borde de un borrador en un día YA
  // pasado y nunca publicado, que no encaja honestamente en "ok" (no se
  // publicó) ni en "pending" (ya pasó). El mockup contempla un cuarto
  // estado invisible ("dot--none", día sin dato determinable) que aquí NO
  // se usa: con `sesiones` ya sabemos siempre si hubo o no trabajo ese
  // día, así que "empty" siempre es un dato real, nunca un placeholder.
  const semanaDias = [];
  for (let i = 0; i < 7; i++) {
    const f = sumarDiasFecha(lunes, i);
    let estado;
    if (f <= hoy && fechasConEnviada.has(f)) estado = "ok";
    else if (f >= hoy && fechasConCualquiera.has(f)) estado = "pending";
    else estado = "empty";
    semanaDias.push({ fecha: f, dow: ["L", "M", "X", "J", "V", "S", "D"][i], dayNum: new Date(f + "T00:00:00").getDate(), isToday: f === hoy, estado });
  }

  // "N jugadores sin trabajo": activos que no aparecen como destino de
  // ninguna sesión (enviada o borrador) en ningún día de la semana en
  // curso — sin la restricción `f <= hoy` de la adherencia, porque aquí
  // interesa si ya tienen algo planificado para el resto de la semana, no
  // solo lo ya ocurrido.
  const jugadoresSinTrabajo = activos.filter((p) => !jugadoresConTrabajoSemana.has(p.id));

  // Adherencia: SOLO la semana en curso, con el dato que la sostiene
  // (cumplidas / planificadas). Ya NO se compara contra la semana anterior
  // — esa comparación mezclaba cumplimiento real con disponibilidad de
  // calendario (una semana con menos sesiones planificadas no es "peor
  // adherencia"). Ver la corrección documentada en Fase 6 → Dashboard del
  // entrenador.
  const hechasSemana = tareasHechasPorJugadorFecha(equipoHistory);
  const fraccionCumplidaSemana = crearFraccionCumplida(tareasProg);
  const cumplidasSemana = asignacionesSemana.reduce((sum, { jugadorId, date, sesionId }) => sum + fraccionCumplidaSemana(sesionId, date, hechasSemana.get(`${jugadorId}::${date}`), jugadorId), 0);
  const adherenciaActual = asignacionesSemana.length ? Math.round((cumplidasSemana / asignacionesSemana.length) * 100) : null;

  // "Quién necesita atención" (ENT-01): cómo está cada jugador ESTA semana
  // frente a su nivel habitual, ejercicio a ejercicio. Antes era la media de
  // kg de todos los ejercicios mezclados (sentadilla con curl), que no
  // significaba nada. Ahora, por cada ejercicio+equipo con dato esta semana
  // y antes, se compara el e1RM estimado (o las reps al fallo si no lleva
  // carga) — ver calcularCambiosE1rm, la misma lógica que ve el jugador en
  // su pantalla — y el resultado del jugador es la media de esas variaciones
  // (cada ejercicio pesa igual). Una media puede esconder una caída fuerte
  // en un solo básico (sentadilla -10 % con dominadas +10 % da 0 %), así
  // que si el ejercicio que más ha bajado cae 12 % o más, ESE es el titular
  // de la fila y del semáforo, y el detalle explica la media.
  // Tareas de Resistencia y bloque CMJ quedan fuera por no ser carga
  // comparable de la misma forma.
  const itemsPorJugador = new Map();
  [...equipoHistory, ...refsEquipo].forEach((it) => {
    if (!itemsPorJugador.has(it.jugadorId)) itemsPorJugador.set(it.jugadorId, []);
    itemsPorJugador.get(it.jugadorId).push(it);
  });
  const rendimiento = evaluarRendimientoEquipo(itemsPorJugador, activos, lunes, hoy);
  const variaciones = activos
    .map((p) => {
      const cambios = calcularCambiosE1rm(itemsPorJugador.get(p.id) || [], lunes, hoy);
      if (!cambios.length) return null;
      const pctMedia = cambios.reduce((sum, c) => sum + c.pct, 0) / cambios.length;
      const ordenados = [...cambios].sort((a, b) => a.pct - b.pct);
      const peor = ordenados[0];
      const mejor = ordenados[ordenados.length - 1];
      const usaPeor = cambios.length > 1 && peor.pct <= -12 && peor.pct < pctMedia;
      const pct = usaPeor ? peor.pct : pctMedia;
      // El sparkline enseña el ejercicio que explica el semáforo: el que
      // más ha bajado si el jugador va a la baja, el que más ha subido si no.
      const guia = usaPeor || pct < 0 ? peor : mejor;
      return {
        jugador: p,
        pct,
        pctMedia,
        usaPeor,
        serieReciente: guia.serie,
        nombresEjercicios: ordenados.map((c) => c.nombre),
        tareasCount: cambios.reduce((sum, c) => sum + c.nRegistros, 0),
        nEjercicios: cambios.length,
        peor,
        cambios: ordenados,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.pct - b.pct);
  // Umbrales sobre la media de variaciones de e1RM: el e1RM sale de un RIR
  // reportado por el jugador, así que oscila unos puntos de una semana a
  // otra sin que haya pasado nada. Hasta -3 % se considera ruido (verde).
  const atencionSemaforo = (pct) => (pct <= -8 ? "red" : pct < -3 ? "amber" : "green");

  // "Pendientes de hoy" (antes "Usuarios"): solo jugadores activos que
  // todavía no han registrado la sesión de hoy — si hoy no hay sesión
  // publicada, no hay nadie "pendiente" que mostrar.
  const registroPorJugadorFecha = new Set(equipoHistory.map((it) => `${it.jugadorId}::${it.date}`));
  const pendientesHoy = sesionHoy ? activos.filter((p) => !registroPorJugadorFecha.has(`${p.id}::${hoy}`)) : [];

  return {
    loaded: true,
    activos,
    playersById,
    grupos,
    independientes,
    gruposById,
    hoyLabel,
    borradores,
    heroTitulo,
    heroAccionLabel,
    heroAccionModulo,
    ocurrenciasSemana,
    ocurrenciasRealizadas,
    adherenciaActual,
    cumplidasSemana,
    asignacionesSemana,
    semanaDias,
    jugadoresSinTrabajo,
    variaciones,
    rendimiento,
    atencionSemaforo,
    sesionHoy,
    pendientesHoy,
  };
}


// Tile compacto de estadística: icono + etiqueta arriba, valor + sub abajo,
// cada línea con su propio elipsis — así una etiqueta larga en un tile
// estrecho se recorta con "…" (con el texto completo en el title, al pasar
// el ratón) en vez de desbordarse por encima del tile vecino, y la altura
// del tile no depende de si "sub" cabe o no en una línea (antes, si
// envolvía, ese tile salía más alto que el resto de la fila). "accent" = el
// tile con más peso visual (p. ej. Adherencia).
function MiniStat({ icon, label, value, sub, accent, style }) {
  const elidido = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 0,
        background: accent ? `linear-gradient(160deg, ${ds.accent}1a, ${ds.surfaceRaised} 60%)` : ds.surfaceRaised,
        border: `1px solid ${accent ? ds.accentBorderSubtle : ds.borderSoft}`,
        borderRadius: dsR.lg,
        padding: "11px 13px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: dsR.sm, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div title={label} style={{ fontFamily: dsF.mono, fontSize: 9, fontWeight: 600, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.04em", ...elidido }}>
          {label}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div title={typeof value === "string" ? value : undefined} style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: ds.ink, lineHeight: 1.2, ...elidido }}>
          {value}
        </div>
        {sub && (
          <div title={sub} style={{ fontFamily: dsF.mono, fontSize: 9.5, fontWeight: 600, color: ds.inkMuted, marginTop: 2, ...elidido }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}



const SEM_COLOR_DASHBOARD = { red: ds.danger, amber: ds.warning, green: ds.success };

// Sparkline de "Quién necesita atención": convierte una serie REAL de
// valores de carga (2 a 5 puntos, ver `serieRecienteJugador` en el hook) en
// los puntos de un <polyline> sobre un viewBox 0 0 52 20, igual que el
// mockup. Normaliza al rango real de esos valores (min→y=17, max→y=3, con
// margen arriba/abajo); si todos los valores son iguales dibuja una línea
// plana en el centro. Con menos de 2 puntos no hay trayectoria real que
// mostrar — devuelve null y la fila simplemente no pinta sparkline, en vez
// de rellenar con datos inventados.
function sparklinePuntos(valores) {
  if (!valores || valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const n = valores.length;
  const stepX = 52 / (n - 1);
  return valores
    .map((v, i) => {
      const x = i * stepX;
      const y = max === min ? 10 : 17 - ((v - min) / (max - min)) * 14;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Fila de "Quién necesita atención": nadie va destacado por defecto — el
// semáforo da la severidad de un vistazo y el detalle solo se despliega al
// clicar esa fila en concreto (<details> nativo, sin JS aparte). "compact"
// (móvil): fila más baja y sin el párrafo de detalle, para poder listar
// muchos jugadores sin que cada uno ocupe tanto alto — el % ya dice lo
// esencial, el detalle no aporta tanto como para pagar ese espacio en móvil.

// Lista de TODOS los ejercicios que cambian esta semana frente a su nivel
// habitual (de peor a mejor), para que se vea qué ejercicios explican el
// semáforo y no solo el peor. `cambios` viene de calcularCambiosE1rm.
function ListaCambiosEjerciciosReal({ cambios, compact }) {
  if (!cambios || !cambios.length) return null;
  const fmtVal = (c, v) => (c.conCarga ? `${Math.round(v)} kg` : `${v.toFixed(1)} reps`);
  const color = (pct) => (pct <= -8 ? ds.danger : pct < -3 ? ds.warning : pct >= 3 ? ds.success : ds.inkMuted);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 2 : 3 }}>
      {cambios.map((c) => (
        <div key={c.clave} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: compact ? 10.5 : 11 }}>
          <span style={{ flex: 1, minWidth: 0, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</span>
          <span style={{ color: ds.inkMuted, flexShrink: 0 }}>
            {c.actual != null ? `${fmtVal(c, c.actual)} vs ${fmtVal(c, c.habitual)}` : ""}
          </span>
          <span style={{ fontFamily: dsF.mono, fontWeight: 700, color: color(c.pct), flexShrink: 0, minWidth: 40, textAlign: "right" }}>
            {c.pct > 0 ? "+" : ""}{c.pct.toFixed(0)}%
          </span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: ds.inkMuted, marginTop: 2 }}>
        Fuerza estimada (e1RM) de lo último hecho esta semana frente a la media de lo anterior. {cambios.some((c) => !c.conCarga) ? "Sin carga (p. ej. dominadas): repeticiones al fallo." : ""}
      </div>
    </div>
  );
}





// IconoGridSidebar ahora en src/core/layoutEntrenador.jsx — importada arriba.



// ---------- HISTORIAL (calcado de historial.jsx) ----------

function PuntoEstadoReal({ hecho }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: dsR.full,
        background: hecho ? ds.success : ds.border,
        border: hecho ? "none" : `1px solid ${ds.danger}`,
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

function FilaTareaHistorialReal({ tarea: t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PuntoEstadoReal hecho={t.done} />
        <span style={{ fontSize: 12, color: t.done ? ds.ink : ds.inkMuted, flex: 1 }}>{t.name}</span>
        {t.done && t.esResistencia && (
          <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: t.subtipoCorporal === "parcial" ? ds.accent : ds.success, textAlign: "right" }}>
            {t.subtipoCorporal === "parcial" ? `Hizo menos: ${t.cargaReal || "sin detalle"}` : "Cumplido completo"}
          </span>
        )}
        {t.done && !t.esResistencia && (
          <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, textAlign: "right" }}>
            {t.repsReal !== "" && t.repsReal != null ? t.repsReal : t.reps} {t.unidad || "reps"}
            {t.cargaReal !== "" && t.cargaReal != null ? (t.subtipoCorporal === "asistencia" ? ` · banda ${t.cargaReal}` : ` · ${t.cargaReal}kg`) : ""}
            {t.subtipoCorporal === "lastre"
              ? " (lastre)"
              : t.subtipoCorporal && EQUIPOS_AMBIGUOS.includes(t.subtipoCorporal)
              ? ` (${t.subtipoCorporal})`
              : !t.subtipoCorporal && (t.materiales || []).some((m) => EQUIPOS_AMBIGUOS.includes(m))
              ? ` (${(t.materiales || []).find((m) => EQUIPOS_AMBIGUOS.includes(m))})`
              : ""}
            {t.rirReal !== "" && t.rirReal != null ? ` · RIR${t.rirReal}` : ""}
            {t.seriesHechas !== "" && t.seriesHechas != null ? ` · ${t.seriesHechas}${t.sets ? `/${t.sets}` : ""} series` : ""}
            {t.cambioPct != null && (
              <span style={{ color: t.cambioPct > 0 ? ds.success : t.cambioPct < 0 ? ds.warning : ds.inkMuted, fontWeight: 700 }}>
                {" "}
                · {t.cambioPct > 0 ? "+" : ""}
                {t.cambioPct.toFixed(0)}%
              </span>
            )}
          </span>
        )}
      </div>
      {t.nota && (
        <div style={{ marginLeft: 20, display: "flex", gap: 5, fontSize: 10.5, color: ds.inkSecondary }}>
          <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={12} /></span>
          <span>{t.nota}</span>
        </div>
      )}
    </div>
  );
}

function TarjetaDiaReal({ fecha, tareasDelDia, etiqueta }) {
  const [abierto, setAbierto] = useState(false);
  const total = tareasDelDia.length;
  const hechas = tareasDelDia.filter((t) => t.done).length;
  const bloques = {};
  tareasDelDia.forEach((t) => {
    if (!bloques[t.bloque]) bloques[t.bloque] = [];
    bloques[t.bloque].push(t);
  });

  return (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, overflow: "hidden" }}>
      <div onClick={() => setAbierto((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink, textTransform: "capitalize" }}>
            {fmtDateLabel(fecha)}
            {etiqueta && <span style={{ textTransform: "none", color: ds.inkSecondary, fontWeight: 400 }}> · {etiqueta}</span>}
          </div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginTop: 2 }}>
            {hechas}/{total} tareas completadas
          </div>
        </div>
        <span style={{ color: ds.inkMuted, fontSize: 12, transform: abierto ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierto && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(bloques).map(([nombreBloque, tareas]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12, fontWeight: 600, color: ds.inkSecondary, marginBottom: 5 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tareas.map((t) => (
                  <FilaTareaHistorialReal key={t.id} tarea={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Gráfica simple de progreso de carga en el tiempo para una tarea concreta —
// SVG a mano, sin librería externa (esta app no tiene ninguna cargada).
// Cada punto es un registro con carga válida; se traza una línea recta entre
// ellos en el orden de las fechas.
// P4 (Fase 3): punto → detalle de esa sesión, en vez de una gráfica muda.
// El punto pulsado (táctil o click, no solo hover — en móvil no hay hover)
// queda seleccionado y su ficha se lee justo encima, con todo lo que el
// registro trae (reps, RIR) además de la fecha y el valor que ya se veían.
// Por defecto el último punto está seleccionado, para no cambiar lo que ya
// se veía si nadie toca nada.
function GraficaProgresoCargaReal({ puntos, unidad = "kg", mostrarListaCompleta = true }) {
  // Id único por instancia: puede haber varias de estas gráficas montadas a
  // la vez en la misma pantalla (una por tarea), y los <defs> de SVG son
  // globales al documento — sin esto, dos gráficas compartirían el mismo
  // degradado y una de las dos se vería mal.
  const [gradId] = useState(() => `gpc-${Math.random().toString(36).slice(2, 9)}`);
  const [seleccionado, setSeleccionado] = useState(puntos.length - 1);
  // Si cambian los puntos (p. ej. se elige otra tarea en el desplegable) y
  // el índice seleccionado ya no existe, vuelve a caer en el último.
  const indiceActivo = seleccionado != null && seleccionado < puntos.length ? seleccionado : puntos.length - 1;

  if (puntos.length < 2) {
    return (
      <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "24px 0", textAlign: "center" }}>
        {puntos.length === 0 ? "Sin registros de carga para esta tarea en este rango." : "Hace falta al menos 2 registros para trazar la evolución."}
      </div>
    );
  }
  const width = 640;
  const height = 210;
  const padX = 6;
  const padTop = 34;
  const padBottom = 30;
  const valores = puntos.map((p) => p.valor);
  const minV = Math.min(...valores);
  const maxV = Math.max(...valores);
  const rango = maxV - minV || 1;
  const stepX = puntos.length > 1 ? (width - padX * 2) / (puntos.length - 1) : 0;
  const coordX = (i) => padX + i * stepX;
  const coordY = (v) => height - padBottom - ((v - minV) / rango) * (height - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valor).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${coordX(puntos.length - 1).toFixed(1)} ${height - padBottom} L ${coordX(0).toFixed(1)} ${height - padBottom} Z`;
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const activo = puntos[indiceActivo];
  // Sin ejes ni cuadrícula — minimalista, al estilo de referencia: el valor
  // inicial y el final se leen pegados a su propio punto de la línea, no en
  // una columna de ejes aparte.
  const yUltimo = coordY(ultimo.valor);
  const yPrimero = coordY(primero.valor);
  const labelUltimoArriba = yUltimo < height / 2;

  return (
    <div>
      {/* Ficha de la sesión seleccionada — lo que antes solo estaba en la
          fila de la lista de abajo, ahora también arriba del todo, pegado
          al punto que se acaba de tocar. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", rowGap: 4 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted }}>{fmtDateLabel(activo.date)}</div>
        <div style={{ fontFamily: dsF.mono, fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>
          {activo.valor}{unidad}
          {activo.reps !== "" && activo.reps != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · {activo.reps} reps</span>}
          {activo.rir !== "" && activo.rir != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · RIR {activo.rir}</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 210, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={ds.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        {/* Línea de referencia a su propia mejor marca del periodo — no es un
            umbral clínico inventado, es simplemente su máximo real, para leer
            cada punto contra sí mismo (mismo principio que ya usamos en CMJ:
            comparar contra la referencia individual, no contra un valor fijo). */}
        <line x1={padX} y1={coordY(maxV)} x2={width - padX} y2={coordY(maxV)} stroke={ds.inkMuted} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 4" />
        <text x={width - padX} y={coordY(maxV) - 5} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">mejor marca · {maxV}{unidad}</text>
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
        {indiceActivo != null && (
          <line x1={coordX(indiceActivo)} y1={padTop - 10} x2={coordX(indiceActivo)} y2={height - padBottom} stroke={ds.accent} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
        )}
        {puntos.map((p, i) => {
          const esRecord = p.valor === maxV;
          return (
            <g key={i} onClick={() => setSeleccionado(i)} style={{ cursor: "pointer" }}>
              {/* Círculo invisible más grande solo para que el dedo tenga margen de sobra al tocar — el visible sigue fino */}
              <circle cx={coordX(i)} cy={coordY(p.valor)} r={14} fill="transparent" />
              {esRecord && (
                <circle cx={coordX(i)} cy={coordY(p.valor)} r={i === indiceActivo ? 9 : 7.5} fill="none" stroke={ds.success} strokeWidth={2} />
              )}
              <circle
                cx={coordX(i)}
                cy={coordY(p.valor)}
                r={i === indiceActivo ? 5.5 : i === 0 || i === puntos.length - 1 ? 4 : 3}
                fill={i === indiceActivo ? ds.accent : ds.canvas}
                stroke={ds.accent}
                strokeWidth={2.25}
              />
            </g>
          );
        })}
        <text x={coordX(0)} y={yPrimero + (labelUltimoArriba ? 18 : -12)} fontSize="10.5" fill={ds.inkMuted} textAnchor="start">{primero.valor}{unidad}</text>
        <text x={coordX(puntos.length - 1)} y={yUltimo + (labelUltimoArriba ? -12 : 18)} fontSize="11.5" fontWeight="700" fill={ds.ink} textAnchor="end">{ultimo.valor}{unidad}</text>
        <text x={coordX(0)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="start">{fmtDateShort(primero.date)}</text>
        <text x={coordX(puntos.length - 1)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{fmtDateShort(ultimo.date)}</text>
      </svg>
      {puntos.some((p) => p.valor === maxV) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: ds.inkMuted, marginTop: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `2px solid ${ds.success}`, flexShrink: 0 }} />
          récord personal en este periodo
        </div>
      )}
      {mostrarListaCompleta ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
          {[...puntos].reverse().map((p, iRev) => {
            const i = puntos.length - 1 - iRev;
            const esActivo = i === indiceActivo;
            return (
              <div
                key={i}
                onClick={() => setSeleccionado(i)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: ds.inkSecondary,
                  fontFamily: dsF.mono,
                  cursor: "pointer",
                  padding: "3px 6px",
                  margin: "0 -6px",
                  borderRadius: dsR.sm,
                  background: esActivo ? ds.accentSubtle : "transparent",
                }}
              >
                <span style={{ color: esActivo ? ds.accent : ds.inkSecondary, fontWeight: esActivo ? 700 : 400 }}>{fmtDateShort(p.date)}</span>
                <span style={{ color: ds.ink }}>
                  {p.valor}{unidad}{p.rir !== "" && p.rir != null ? ` · RIR${p.rir}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista jugador: no se enseña el histórico completo (eso lo reserva
        // el entrenador), solo el registro más reciente — la ficha de arriba
        // ya cubre el resto al tocar cualquier punto de la gráfica.
        (() => {
          const iUltimo = puntos.length - 1;
          const pUltimo = puntos[iUltimo];
          const esActivo = iUltimo === indiceActivo;
          return (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginBottom: 4 }}>MÁS RECIENTE</div>
              <div
                onClick={() => setSeleccionado(iUltimo)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: ds.inkSecondary,
                  fontFamily: dsF.mono,
                  cursor: "pointer",
                  padding: "3px 6px",
                  margin: "0 -6px",
                  borderRadius: dsR.sm,
                  background: esActivo ? ds.accentSubtle : "transparent",
                }}
              >
                <span style={{ color: esActivo ? ds.accent : ds.inkSecondary, fontWeight: esActivo ? 700 : 400 }}>{fmtDateShort(pUltimo.date)}</span>
                <span style={{ color: ds.ink }}>
                  {pUltimo.valor}{unidad}{pUltimo.rir !== "" && pUltimo.rir != null ? ` · RIR${pUltimo.rir}` : ""}
                </span>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

// El motor de cálculo del Control de Fatiga (CMJ) está en src/calc/cmj.js,
// y las 3 constantes de color/estilo en src/core/cmjDisplay.jsx —
// importados arriba.

// "Mi progreso" — para la propia vista del jugador: sin selector de jugador
// (siempre es el suyo), sin filtro de fechas, sin herramientas de entrenador.
// Tres secciones:
//  1. Progreso por ejercicio — 1RM estimado (o RTF en reps si el ejercicio
//     nunca lleva carga, p. ej. dominadas) agrupado solo por EJERCICIO, no
//     por esquema exacto de reps/RIR — así periodizar no "resetea" la curva.
//     El gráfico solo aparece tras elegir un ejercicio, y en el jugador se
//     recortan a los últimos 5 registros (el histórico completo lo ve el
//     entrenador en Historial, con el mismo componente sin recortar).
//  2. Constancia — racha de semanas cumpliendo el plan, más allá de la
//     semana actual que ya se ve en el Dashboard.
//  3. Volumen de entrenamiento — series completadas por semana.
function MiProgresoJugadorReal({ items, loaded, historialSemanas = [], rachaSemanas = 0 }) {
  const [ejercicioSel, setEjercicioSel] = useState("");

  if (!loaded) return <LoadingBlock />;

  const elegibles = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ");

  // ¿Este ejercicio+EQUIPO se ha trabajado alguna vez con carga registrada?
  // Si sí, se compara en 1RM estimado (kg); si nunca lleva carga (dominadas,
  // fondos...), se compara en RTF — reps estimadas hasta el fallo — mismo
  // motor que ya usamos para las recomendaciones de carga y "Tus récords"
  // del Dashboard, solo que aquí no se da el último paso a kg cuando no hay
  // con qué darlo. Se agrupa por ejercicio+equipo (no solo por ejercicio):
  // un multipower y una barra libre no pesan lo mismo, así que cuentan como
  // progresos distintos — el nombre solo lleva el equipo entre paréntesis
  // cuando de verdad se ha trabajado el mismo ejercicio con más de uno.
  const equiposPorNombre = new Map();
  elegibles.forEach((it) => {
    const eq = materialEfectivo(it);
    if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
    equiposPorNombre.get(it.name).add(eq);
  });
  const tieneCargaPorClave = new Set();
  elegibles.forEach((it) => {
    if (it.cargaReal !== "" && it.cargaReal != null && Number(it.cargaReal) > 0) tieneCargaPorClave.add(`${it.name}::${materialEfectivo(it)}`);
  });

  const datosPorNombre = new Map();
  elegibles.forEach((it) => {
    const reps = Number(it.repsReal);
    const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
    if (it.repsReal === "" || it.repsReal == null || Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return;
    if (reps > REPS_MAX_RIR_FIABLE) return;
    const equipo = materialEfectivo(it);
    const clave = `${it.name}::${equipo}`;
    const conCarga = tieneCargaPorClave.has(clave);
    let valor;
    let unidad;
    if (conCarga) {
      const carga = Number(it.cargaReal);
      if (!carga || Number.isNaN(carga)) return; // este registro concreto no tiene carga -> no comparable en esta rama
      const pct = pct1RMporRTF(reps + rir);
      if (!pct) return;
      valor = Math.round((carga / pct) * 10) / 10;
      unidad = "kg";
    } else {
      valor = reps + rir;
      unidad = " reps";
    }
    const etiqueta = (equiposPorNombre.get(it.name)?.size || 0) > 1 && equipo && equipo !== "std" ? `${it.name} (${equipo})` : it.name;
    if (!datosPorNombre.has(etiqueta)) datosPorNombre.set(etiqueta, { unidad, puntos: [] });
    datosPorNombre.get(etiqueta).puntos.push({ date: it.date, valor, rir: it.rirReal, reps: it.repsReal });
  });
  datosPorNombre.forEach((v) => v.puntos.sort((a, b) => (a.date < b.date ? -1 : 1)));

  const combinaciones = [...datosPorNombre.keys()].sort((a, b) => a.localeCompare(b));
  const datosActivos = ejercicioSel ? datosPorNombre.get(ejercicioSel) : null;
  const puntos = datosActivos ? datosActivos.puntos.slice(-5) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. PROGRESO POR EJERCICIO */}
      <div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 8, letterSpacing: "0.05em" }}>PROGRESO POR EJERCICIO</div>
        <DsSelect value={ejercicioSel} onChange={(e) => setEjercicioSel(e.target.value)} style={{ marginBottom: ejercicioSel ? 10 : 0 }}>
          <option value="">Elige un ejercicio…</option>
          {combinaciones.length === 0 && <option value="" disabled>Sin registros todavía</option>}
          {combinaciones.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </DsSelect>
        {ejercicioSel && (
          <DsCard style={{ padding: "16px 18px" }}>
            {puntos.length >= 2 ? (
              <>
                <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 10 }}>
                  {datosActivos.unidad === "kg" ? "1RM estimado" : "Reps estimadas al fallo"} · últimos {puntos.length} registros
                  {datosActivos.puntos.length > 5 ? " (el histórico completo lo ve tu entrenador)" : ""}
                </div>
                <GraficaProgresoCargaReal puntos={puntos} unidad={datosActivos.unidad} mostrarListaCompleta={false} />
              </>
            ) : (
              <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "12px 0", textAlign: "center" }}>
                Hace falta al menos 2 registros de este ejercicio para trazar la evolución.
              </div>
            )}
          </DsCard>
        )}
      </div>

      {/* 2. CONSTANCIA — desplegable, con mini-preview siempre visible */}
      {historialSemanas.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", listStyle: "none", display: "block" }}>
            <div style={{ background: `linear-gradient(135deg, ${ds.success}14, ${ds.bgElevated})`, border: `1px solid ${ds.success}55`, borderRadius: dsR.lg, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${ds.success}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.success }}>
                <Zap size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 2 }}>CONSTANCIA</div>
                <div style={{ fontSize: 14 }}>
                  <b style={{ color: ds.ink, fontWeight: 800 }}>{rachaSemanas} {rachaSemanas === 1 ? "semana" : "semanas"}</b> <span style={{ color: ds.inkSecondary }}>cumpliendo tu plan</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 26, flexShrink: 0 }}>
                {historialSemanas.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: `${s.pct != null ? Math.max(15, s.pct) : 15}%`,
                      background: i === historialSemanas.length - 1 ? ds.accent : s.pct != null && s.pct >= 80 ? ds.success : ds.border,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <span style={{ color: ds.inkMuted, fontSize: 15, flexShrink: 0 }}>▸</span>
            </div>
          </summary>
          <div style={{ marginTop: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: "16px 18px" }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginBottom: 6 }}>ÚLTIMAS {historialSemanas.length} SEMANAS</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
              {historialSemanas.map((s, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${s.pct != null ? Math.max(6, s.pct) : 6}%`,
                      background: s.pct != null && s.pct >= 80 ? ds.success : s.pct != null ? `${ds.success}55` : ds.border,
                      borderRadius: 3,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginTop: 6 }}>
              <span>hace {historialSemanas.length} sem.</span>
              <span>esta semana</span>
            </div>
            <div style={{ fontSize: 11, color: ds.inkSecondary, marginTop: 10 }}>Cumples ≥80% de lo pautado esa semana → cuenta como semana en racha.</div>
          </div>
        </details>
      )}

      {/* 3. VOLUMEN DE ENTRENAMIENTO — desplegable, con mini-sparkline */}
      {historialSemanas.length > 0 && (() => {
        const volActual = historialSemanas[historialSemanas.length - 1]?.volumen ?? 0;
        const maxVol = Math.max(1, ...historialSemanas.map((s) => s.volumen));
        const puntosSpark = historialSemanas.map((s, i) => `${(i / (historialSemanas.length - 1 || 1)) * 44 + 1},${25 - (s.volumen / maxVol) * 22}`).join(" ");
        return (
          <details>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "block" }}>
              <div style={{ background: `linear-gradient(135deg, ${ds.accent}14, ${ds.bgElevated})`, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.lg, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: ds.accentSubtle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.accent }}>
                  <Activity size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 2 }}>VOLUMEN</div>
                  <div style={{ fontSize: 14 }}>
                    <b style={{ color: ds.ink, fontWeight: 800 }}>{volActual} series</b> <span style={{ color: ds.inkSecondary }}>esta semana</span>
                  </div>
                </div>
                <svg width="46" height="26" viewBox="0 0 46 26" style={{ flexShrink: 0 }}>
                  <polyline points={puntosSpark} fill="none" stroke={ds.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ color: ds.inkMuted, fontSize: 15, flexShrink: 0 }}>▸</span>
              </div>
            </summary>
            <div style={{ marginTop: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: "16px 18px" }}>
              <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 10 }}>series completadas por semana · últimas {historialSemanas.length} semanas</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                {historialSemanas.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: `${Math.max(6, (s.volumen / maxVol) * 100)}%`, background: ds.accent, borderRadius: 3 }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: ds.inkSecondary, marginTop: 10 }}>Sube el número de series completadas, no solo el peso — para ver si el volumen total de trabajo también progresa.</div>
            </div>
          </details>
        );
      })()}
    </div>
  );
}

// ---------- Historial (entrenador) — carga de datos ----------
// Todo el Historial se lee de una única fuente fresca: una sola pasada de
// red a sesiones/tareas/registros/ejercicios cada vez que el entrenador
// entra en esta pantalla, sin ningún caché intermedio de por medio. Antes
// cada una de las 3 pestañas tenía su propio mecanismo (useTareasForSesiones,
// usePlayerHistory con useEntityByIds anidado dentro...), cada uno con su
// propia clave de caché — bastaba con que uno solo se quedara con una foto
// vieja para que el entrenador viera "nadie ha enviado nada" sin ningún
// aviso, aunque los datos estuvieran bien guardados. Ahora las 3 pestañas
// leen todas de la misma fotografía, cargada aquí una sola vez y sin caché
// (así que no hay nada que pueda quedarse "pegado").
function useHistorialData() {
  const [state, setState] = useState({ loaded: false, error: null, sesiones: [], tareas: [], registros: [], ejercicios: [] });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loaded: false, error: null }));
    Promise.all([api.list("sesiones"), api.list("tareas"), api.list("registros"), api.list("ejercicios")])
      .then(([sesiones, tareas, registros, ejercicios]) => {
        if (cancelled) return;
        setState({ loaded: true, error: null, sesiones: sesiones || [], tareas: tareas || [], registros: registros || [], ejercicios: ejercicios || [] });
      })
      .catch((e) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loaded: true, error: e?.message || "No se pudo cargar el historial. Comprueba tu conexión." }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, retry };
}

// Convierte Registros crudos en la misma "ficha" de tarea+ejercicio+sesión
// que ya usaba el resto de la app (usePlayerHistory) — pero como un cálculo
// síncrono sobre datos que ya están en memoria, no como otro hook con su
// propia carga y su propio caché que se pueda desincronizar.
function construirItemsHistorial(registros, tareasById, ejerciciosById, sesionesById) {
  return registros.map((r) => {
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
      cargaReal: r.carga_kg ?? "",
      rirReal: r.rir ?? "",
      repsReal: r.reps_hechas ?? "",
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
}

function HistorialPorJugador({ players, jugadorInicial, tareasById, ejerciciosById, sesionesById, registros }) {
  const [jugadorSel, setJugadorSel] = useState(jugadorInicial || players[0]?.id || "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [vista, setVista] = useState("dia");
  const [tareaSel, setTareaSel] = useState("");
  const items = useMemo(() => {
    const propios = jugadorSel ? registros.filter((r) => r.jugador_id === jugadorSel) : [];
    return construirItemsHistorial(propios, tareasById, ejerciciosById, sesionesById);
  }, [jugadorSel, registros, tareasById, ejerciciosById, sesionesById]);

  // % de cambio de carga respecto a la vez anterior que se hizo la MISMA
  // tarea en las mismas condiciones (mismo ejercicio, mismo equipo, misma
  // lateralidad, mismas reps y RIR objetivo — igual criterio que la
  // referencia que ve el jugador al diseñar sesión). Se calcula sobre TODO
  // el historial, no solo el rango de fechas filtrado, para que el primer
  // registro visible en un rango corto igualmente pueda compararse con lo
  // de antes del rango.
  const cambioPctPorId = {};
  [...items]
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.cargaReal !== "" && it.cargaReal != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .reduce((ultimoPorClave, it) => {
      const clave = claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir);
      const anterior = ultimoPorClave[clave];
      if (anterior && Number(anterior.cargaReal) > 0) {
        cambioPctPorId[it.id] = ((Number(it.cargaReal) - Number(anterior.cargaReal)) / Number(anterior.cargaReal)) * 100;
      }
      ultimoPorClave[clave] = it;
      return ultimoPorClave;
    }, {});

  if (!players.length) {
    return <div style={{ color: ds.inkSecondary, fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no hay usuarios dados de alta.</div>;
  }

  // Se agrupa por fecha + sesión de origen, no solo por fecha — dos sesiones
  // distintas mandadas el mismo día (una al equipo, otra puntual a este
  // jugador, por ejemplo) antes se mezclaban en una sola tarjeta con un
  // total conjunto que no correspondía a ninguna de las dos sesiones reales.
  const porGrupo = {};
  items
    .filter((it) => (!desde || it.date >= desde) && (!hasta || it.date <= hasta))
    .forEach((it) => {
      const f = normalizarFecha(it.date);
      const clave = `${f}::${it.sesionId || ""}`;
      if (!porGrupo[clave]) porGrupo[clave] = { fecha: f, tareas: [] };
      porGrupo[clave].tareas.push(cambioPctPorId[it.id] != null ? { ...it, cambioPct: cambioPctPorId[it.id] } : it);
    });
  const gruposPorFecha = {};
  Object.values(porGrupo).forEach((g) => {
    if (!gruposPorFecha[g.fecha]) gruposPorFecha[g.fecha] = [];
    gruposPorFecha[g.fecha].push(g);
  });
  const fechas = Object.keys(gruposPorFecha).sort().reverse();

  // Para el modo "Progreso por tarea": la comparación debe ser entre
  // registros con EXACTAMENTE las mismas condiciones planificadas ese día
  // (mismo ejercicio, mismo material, misma lateralidad, mismas reps y
  // mismo RIR objetivo) — el mismo criterio que ya usa el % de arriba.
  // Agrupar solo por nombre de ejercicio mezclaba esquemas distintos (ej.
  // 130kg a RIR2 con 100kg a RIR4) y hacía parecer una caída de rendimiento
  // que en realidad era un estímulo distinto y más ligero a propósito.
  const combinacionesPorClave = new Map();
  items
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.cargaReal !== "" && it.cargaReal != null)
    .forEach((it) => {
      const equipo = materialEfectivo(it);
      const clave = claveDisenoTarea(it.name, equipo, it.unilateral, it.reps, it.rir);
      if (combinacionesPorClave.has(clave)) return;
      const detalleEquipo = equipo && equipo !== "std" ? ` · ${equipo}` : "";
      const detalleRir = it.rir !== "" && it.rir != null ? ` · RIR${it.rir}` : "";
      const detalleLateral = it.unilateral ? " · unilateral" : "";
      combinacionesPorClave.set(clave, { clave, etiqueta: `${it.name}${detalleEquipo} · ${it.reps} ${it.unidad || "reps"}${detalleRir}${detalleLateral}` });
    });
  const combinaciones = [...combinacionesPorClave.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  const claveActiva = tareaSel || combinaciones[0]?.clave || "";
  const puntosTarea = claveActiva
    ? items
        .filter(
          (it) =>
            it.done &&
            !it.esResistencia &&
            it.cargaReal !== "" &&
            it.cargaReal != null &&
            claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir) === claveActiva &&
            (!desde || it.date >= desde) &&
            (!hasta || it.date <= hasta)
        )
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((it) => ({ date: it.date, valor: Number(it.cargaReal), rir: it.rirReal, reps: it.repsReal }))
    : [];

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>JUGADOR</span>
        <DsSelect value={jugadorSel} onChange={(e) => setJugadorSel(e.target.value)} style={{ maxWidth: 240 }}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </DsSelect>
      </label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { id: "dia", label: "Por día" },
          { id: "tarea", label: "Progreso por tarea" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            style={{
              fontSize: 12.5,
              padding: "7px 12px",
              borderRadius: dsR.md,
              border: `1px solid ${vista === v.id ? ds.accent : ds.border}`,
              background: vista === v.id ? ds.accentSubtle : "transparent",
              color: vista === v.id ? ds.accent : ds.inkSecondary,
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      {vista === "tarea" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>TAREA (MISMO EJERCICIO, MATERIAL, REPS Y RIR)</span>
          <DsSelect value={claveActiva} onChange={(e) => setTareaSel(e.target.value)} style={{ maxWidth: 280 }}>
            {combinaciones.length === 0 && <option value="">Sin tareas con carga registrada</option>}
            {combinaciones.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.etiqueta}
              </option>
            ))}
          </DsSelect>
        </label>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>DESDE</span>
          <DsInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ fontSize: 12.5, padding: "7px 8px" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>HASTA</span>
          <DsInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ fontSize: 12.5, padding: "7px 8px" }} />
        </label>
      </div>
      {vista === "tarea" ? (
        <GraficaProgresoCargaReal puntos={puntosTarea} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fechas.map((f) =>
            gruposPorFecha[f].map((g, i) => (
              <TarjetaDiaReal key={`${f}::${i}`} fecha={g.fecha} tareasDelDia={g.tareas} etiqueta={gruposPorFecha[f].length > 1 ? `sesión ${i + 1} de ${gruposPorFecha[f].length}` : null} />
            ))
          )}
          {fechas.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin sesiones registradas en este rango</div>}
        </div>
      )}
    </>
  );
}

// Identidad "visible" de una sesión enviada — misma fecha(s) + mismo MD +
// mismo objetivo. Si alguna vez dos filas de la tabla `sesiones` terminan
// siendo, sin querer, la misma sesión duplicada (p. ej. un doble clic en
// "Enviar"), el entrenador vería una de las dos copias en el desplegable —
// justo la que no tuviera tareas ni registros — sin ninguna pista de que
// existía la otra. Agrupando por esta clave, el desplegable muestra UNA
// sola entrada por sesión real, con las tareas y los registros de todas las
// filas que compartan esa identidad ya sumados.
function claveSesionVisible(s) {
  return `${(s.fechas || []).slice().sort().join(",")}__${s.md || ""}__${s.objetivo || ""}`;
}



// Gráfico de progresión de carga con SVG plano — sin añadir ninguna
// librería nueva al proyecto (ni recharts, ni chart.js). Mismo tratamiento
// minimalista que GraficaProgresoCargaReal (degradado bajo la línea,
// etiquetas pegadas a los puntos de inicio/fin, sin cuadrícula ni columna
// de ejes) para que las gráficas del modo entrenador se sientan del mismo
// sistema que las del jugador — antes era un componente aparte que nunca
// había recibido ese pase.
function GraficoProgresionCarga({ puntos }) {
  const [gradId] = useState(() => `gpc2-${Math.random().toString(36).slice(2, 9)}`);
  const ancho = 640, alto = 210;
  const padX = 6, padTop = 34, padBottom = 30;
  const cargas = puntos.map((p) => p.carga);
  const min = Math.min(...cargas);
  const max = Math.max(...cargas);
  const rango = max - min || 1;
  const x = (i) => padX + (puntos.length > 1 ? (i / (puntos.length - 1)) * (ancho - padX * 2) : (ancho - padX * 2) / 2);
  const y = (v) => alto - padBottom - ((v - min) / rango) * (alto - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.carga).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${x(puntos.length - 1).toFixed(1)} ${alto - padBottom} L ${x(0).toFixed(1)} ${alto - padBottom} Z`;
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const yUltimo = y(ultimo.carga);
  const yPrimero = y(primero.carga);
  const labelUltimoArriba = yUltimo < alto / 2;

  return (
    <DsCard style={{ padding: 14 }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", height: 210, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={ds.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        {/* Misma referencia que en la gráfica del jugador: su propia mejor
            marca del periodo, no un umbral inventado — para leer cada test
            contra el propio jugador. */}
        <line x1={padX} y1={y(max)} x2={ancho - padX} y2={y(max)} stroke={ds.inkMuted} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 4" />
        <text x={ancho - padX} y={y(max) - 5} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">mejor marca · {max}kg</text>
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p, i) => {
          const esRecord = p.carga === max;
          return (
            <g key={i}>
              {esRecord && <circle cx={x(i)} cy={y(p.carga)} r={i === 0 || i === puntos.length - 1 ? 7 : 6} fill="none" stroke={ds.success} strokeWidth={2} />}
              <circle cx={x(i)} cy={y(p.carga)} r={i === 0 || i === puntos.length - 1 ? 4 : 3} fill={ds.canvas} stroke={ds.accent} strokeWidth={2.25} />
            </g>
          );
        })}
        <text x={x(0)} y={yPrimero + (labelUltimoArriba ? 18 : -12)} fontSize="10.5" fill={ds.inkMuted} textAnchor="start">{primero.carga}kg</text>
        <text x={x(puntos.length - 1)} y={yUltimo + (labelUltimoArriba ? -12 : 18)} fontSize="11.5" fontWeight="700" fill={ds.ink} textAnchor="end">{ultimo.carga}kg</text>
        <text x={x(0)} y={alto - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="start">{primero.fecha}</text>
        <text x={x(puntos.length - 1)} y={alto - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{ultimo.fecha}</text>
      </svg>
      {puntos.some((p) => p.carga === max) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: ds.inkMuted, marginTop: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `2px solid ${ds.success}`, flexShrink: 0 }} />
          récord personal en este periodo
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {puntos
          .slice()
          .reverse()
          .map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: ds.inkSecondary }}>
              <span>{p.fecha}</span>
              <span>
                {p.carga}kg{p.reps !== "" && p.reps != null ? ` · ${p.reps} reps` : ""}
                {p.rir !== "" && p.rir != null ? ` · RIR ${p.rir}` : ""}
              </span>
            </div>
          ))}
      </div>
    </DsCard>
  );
}


// La pantalla de Control de fatiga (CMJ) — ControlFatigaModuloReal,
// CmjProximamente, CmjMicrociclosReal, CmjAjustesUmbralReal,
// CmjEstadoActualReal, CmjRankingReal, CmjSubirCsvReal — ahora en
// src/screens/ControlFatiga.jsx — importada arriba.
// ---------- PROGRAMACIÓN (calcado de programacion.jsx) ----------

function TareaVisualReal({ tarea }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
      {tarea.gif ? (
        <div style={{ position: "relative", width: 42, height: 42, borderRadius: dsR.md, flexShrink: 0, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {miniaturaTarea(tarea.gif) && (
            <img src={miniaturaTarea(tarea.gif)} alt="" style={{ width: 42, height: 42, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
          )}
          {(extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif)) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(tarea.gif) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
              <Play size={13} color={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} fill={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: dsR.md, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ds.inkMuted, fontSize: 9, fontFamily: dsF.mono }}>
          VÍDEO
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: ds.ink }}>{tarea.nombre}</div>
        <div style={{ fontSize: 10.5, color: ds.inkMuted, fontFamily: dsF.mono }}>{tarea.detalle}</div>
        {tarea.materiales && tarea.materiales.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
            {tarea.materiales.map((m) => (
              <span key={m} style={{ fontSize: 9.5, color: ds.accent, fontFamily: dsF.mono }}>
                {m}
              </span>
            ))}
          </div>
        )}
        {tarea.nota && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, fontSize: 10, color: ds.inkSecondary }}>
            <span style={{ color: ds.warning, display: "inline-flex" }}><AlertTriangle size={12} /></span>
            <span>{tarea.nota}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// formatearDetalleTareaCoach ahora en src/core/hooks.js — importada arriba.

// useReferenciasPorEjercicio ahora en src/screens/DisenoSesion.jsx (único
// consumidor: el Diseñador de sesiones).

function TarjetaSesionReal({ sesion, esHoy, onEditar, onEliminar, onReutilizar, soloLectura, compacta, abiertaInicial, jugadoresConRegistros = 0 }) {
  const [abierta, setAbierta] = useState(abiertaInicial ?? esHoy);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const bloques = {};
  const circuitoBuffer = {};
  (sesion.tareas || []).forEach((t) => {
    // Si la tarea tiene fecha propia (Movilidad/Preventivo con varias fechas
    // en la misma sesión), se agrupa aparte con su fecha en la etiqueta, para
    // no mezclar el ejercicio de un día con el de otro bajo el mismo nombre.
    const nombreBloque = t.fecha ? `${t.bloque_sesion || "General"} · ${fmtDateShort(t.fecha)}` : t.bloque_sesion || "General";
    if (t.circuito_id) {
      if (!circuitoBuffer[t.circuito_id]) circuitoBuffer[t.circuito_id] = { nombreBloque, tareas: [] };
      circuitoBuffer[t.circuito_id].tareas.push(t);
    } else {
      if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
      bloques[nombreBloque].push({ tipo: "suelta", tarea: t });
    }
  });
  Object.entries(circuitoBuffer).forEach(([circuitoId, datos]) => {
    if (!bloques[datos.nombreBloque]) bloques[datos.nombreBloque] = [];
    bloques[datos.nombreBloque].push({
      tipo: "circuito",
      circuitoId,
      tareas: datos.tareas.slice().sort((a, b) => (Number(a.orden_en_circuito) || 999) - (Number(b.orden_en_circuito) || 999)),
    });
  });

  return (
    <div style={{ background: ds.surface, border: `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: dsR.lg, overflow: "hidden" }}>
      <div onClick={() => setAbierta((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {sesion.nombre && <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.accent, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sesion.nombre}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esHoy && !compacta && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>
                HOY
              </span>
            )}
            {!compacta && (sesion.fechas || []).map((f) => (
              <span key={f} style={{ fontSize: 13, fontWeight: 600, color: ds.ink }}>
                {fmtDateShort(f)}
              </span>
            ))}
            {!compacta && !(sesion.fechas || []).length && <span style={{ fontSize: 13, fontWeight: 600, color: ds.inkMuted }}>Sin fecha todavía</span>}
            {sesion.md && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 4, padding: "1px 6px" }}>{sesion.md}</span>
            )}
            {sesion.enviada ? (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, border: `1px solid ${ds.successBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>✓ ENVIADA</span>
            ) : (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.warning, border: `1px solid ${ds.warning}55`, borderRadius: 4, padding: "1px 6px" }}>BORRADOR</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 3 }}>
            {!sesion.jugadores_destino || !sesion.jugadores_destino.length ? "Todo el equipo" : `${sesion.jugadores_destino.length} jugador(es)`}
            {(sesion.fechas || []).length > 1 && (compacta ? ` · también: ${sesion.fechas.slice().sort().map((f) => fmtDateShort(f)).join(", ")}` : ` · lote de ${sesion.fechas.length} fechas`)}
          </div>
        </div>
        <span style={{ color: ds.inkMuted, fontSize: 12, transform: abierta ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierta && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {sesion.objetivo && (
            <div style={{ fontSize: 12, color: ds.inkSecondary }}>
              <strong style={{ color: ds.ink }}>Objetivo:</strong> {sesion.objetivo}
            </div>
          )}
          {Object.entries(bloques).map(([nombreBloque, items]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 6 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) =>
                  item.tipo === "circuito" ? (
                    <div key={item.circuitoId} style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: 8, display: "flex", flexDirection: "column", gap: 6, background: `${ds.surface}40` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>CIRCUITO</span>
                      </div>
                      {item.tareas.map((t, i) => (
                        <TareaVisualReal
                          key={t.id}
                          tarea={{
                            nombre: `${i + 1}. ${t.nombreEjercicio}`,
                            detalle: formatearDetalleTareaCoach(t),
                            gif: t.gif_url,
                            nota: t.nota,
                            materiales: parseMateriales(t.material),
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <TareaVisualReal
                      key={item.tarea.id}
                      tarea={{
                        nombre: item.tarea.nombreEjercicio,
                        detalle: formatearDetalleTareaCoach(item.tarea),
                        gif: item.tarea.gif_url,
                        nota: item.tarea.nota,
                        materiales: parseMateriales(item.tarea.material),
                      }}
                    />
                  )
                )}
              </div>
            </div>
          ))}
          {!soloLectura && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4, borderTop: `1px solid ${ds.border}`, marginTop: 2 }}>
              <DsButton variant="secondary" size="sm" onClick={() => onEditar(sesion)} >
                Editar esta sesión
              </DsButton>
              {onReutilizar && (
                <DsButton variant="secondary" size="sm" onClick={() => onReutilizar(sesion)} style={{ borderColor: ds.accentBorderSubtle, color: ds.accent }}>
                  Reutilizar como nueva
                </DsButton>
              )}
              {confirmando ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: ds.danger }}>
                    {jugadoresConRegistros > 0
                      ? `${jugadoresConRegistros} jugador${jugadoresConRegistros === 1 ? "" : "es"} ya registr${jugadoresConRegistros === 1 ? "ó" : "aron"} esta sesión. Si la eliminas, su entrenamiento se conserva pero ya no podrá asociarse a ella. ¿Eliminarla igualmente?`
                      : sesion.enviada
                      ? "Esta sesión ya se envió — ¿eliminarla igualmente?"
                      : "¿Eliminar esta sesión? No se puede deshacer."}
                  </span>
                  <button
                    onClick={async () => {
                      setBorrando(true);
                      await onEliminar(sesion.id);
                    }}
                    disabled={borrando}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.danger}`, background: `${ds.danger}22`, color: ds.danger, cursor: "pointer", fontWeight: 600, opacity: borrando ? 0.6 : 1 }}
                  >
                    {borrando ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                  <button onClick={() => setConfirmando(false)} disabled={borrando} style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <DsButton variant="danger" size="sm" onClick={() => setConfirmando(true)} style={{ marginLeft: "auto" }}>
                  Eliminar sesión
                </DsButton>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




// ---------- CALENDARIO (Fase 6) ----------
// Módulo nuevo, independiente de Programación: mientras Programación sigue
// siendo "sesión de hoy y próximas" en una lista plana, Calendario es la
// vista de planificación — mes a mes, por equipo / grupo / jugador — pensada
// para adelantarte y dejar el trabajo de las próximas semanas ya preparado.
// No inventa ningún concepto de datos nuevo: usa exactamente el mismo
// `jugadores_destino` (null = todo el equipo activo, o un array explícito de
// ids) que ya usa el resto de la app — "grupo" y "jugador" aquí son solo
// FORMAS DE MIRAR ese mismo dato, no una columna nueva.

// Destinatarios efectivos de una sesión — mismo criterio que
// useDatosDashboardEntrenador / bootstrapJugador: si no hay
// jugadores_destino explícito, la sesión llega a todos los activos.
function destinatariosEfectivosSesion(sesion, activos) {
  return sesion.jugadores_destino && sesion.jugadores_destino.length ? sesion.jugadores_destino : activos.map((p) => p.id);
}

// Etiqueta "para quién es" una sesión en el Calendario. Si su destino
// explícito coincide EXACTAMENTE con el roster activo de un grupo, se
// etiqueta con el nombre de ese grupo; si no, se describe tal cual — nunca
// se inventa una relación con un grupo que el dato no tiene.
function etiquetaDestinoSesion(sesion, players, grupos) {
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

// ¿Se ve esta sesión dentro del ámbito elegido en el Calendario?
// scope = { tipo: "equipo" } | { tipo: "grupo", grupoId } | { tipo: "jugador", jugadorId }
function sesionVisibleEnScope(sesion, scope, players, activos) {
  if (scope.tipo === "equipo") return true;
  const destino = destinatariosEfectivosSesion(sesion, activos);
  if (scope.tipo === "jugador") return destino.includes(scope.jugadorId);
  const rosterActivo = players.filter((p) => p.estado === "activo" && (p.gruposIds || []).includes(scope.grupoId)).map((p) => p.id);
  if (!rosterActivo.length) return false;
  return rosterActivo.every((id) => destino.includes(id));
}

// Estado del punto de cada día — mismo criterio "ok / pending / empty" que
// ya usa "Tu semana" en el Dashboard del entrenador (useDatosDashboardEntrenador):
// "ok" = ya pasó (o es hoy) y había algo ENVIADO; "pending" = hoy o futuro con
// algo (enviado o borrador); si no, "empty".
function estadoDiaCalendario(sesionesDia, fecha, hoy) {
  const hasEnviada = sesionesDia.some((s) => s.enviada);
  const hasAny = sesionesDia.length > 0;
  if (fecha <= hoy && hasEnviada) return "ok";
  if (fecha >= hoy && hasAny) return "pending";
  return "empty";
}

// useSolicitudesPendientesCount ahora en src/core/layoutEntrenador.jsx —
// importada arriba.

function itemScopeCalendarioStyle(activo) {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: activo ? ds.accentSubtle : "transparent",
    border: "none",
    borderRadius: dsR.sm,
    padding: "7px 10px",
    color: activo ? ds.accent : ds.ink,
    fontSize: 12.5,
    fontWeight: activo ? 700 : 500,
    cursor: "pointer",
  };
}
const navMesBtnCalendarioStyle = {
  width: 30,
  height: 30,
  borderRadius: dsR.md,
  border: `1px solid ${ds.border}`,
  background: ds.surface,
  color: ds.inkSecondary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

// Envoltorio: igual patrón que ProgramacionModuloReal — Calendario necesita
// la lista de jugadores (para el editor de sesiones y para el selector de
// ámbito) y también los grupos (que Programación no necesitaba).
function CalendarioModuloReal({ onBack, onAbrirModulo, onCerrarSesion, scopeInicial }) {
  const [players, , playersLoaded] = usePlayers();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  if (!playersLoaded || !gruposLoaded) return <LoadingBlock />;
  return <CalendarioReal players={players} grupos={grupos} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} scopeInicial={scopeInicial} />;
}

// ---------- MICROCICLO TIPO (MD-x) ----------
// Se guarda en Supabase (tabla microciclos_tipo, una fila por ámbito: equipo,
// grupo o jugador), así es el mismo en cualquier dispositivo o navegador.
// No toca la carga de las sesiones.
const MICRO_TAGS_ORDEN = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2"];
// leerMicrociclosLegacy, useMicrociclosTipo y usePartidos ahora en
// src/core/hooks.js — importadas arriba.
const MICRO_VACIO = { diaPartido: null, sesiones: {}, manual: {} };
// MD de una fecha: primero el ajuste manual de ese día; si no, por distancia al
// partido más cercano (MD+1 el día siguiente; después MD-n hasta 6 días antes).
function mdDeFecha(micro, fecha, partidosReales = []) {
  const manual = (micro.manual || {})[fecha];
  if (manual === "-") return "";
  if (manual) return manual;
  const lunes = inicioSemanaCalendario(fecha);
  const partidos = new Set();
  [-7, 0, 7, 14].forEach((d) => {
    if (micro.diaPartido == null) return;
    const p = sumarDiasFecha(lunes, d + micro.diaPartido);
    const m = (micro.manual || {})[p];
    if (!m || m === "MD") partidos.add(p);
  });
  Object.entries(micro.manual || {}).forEach(([f, t]) => {
    if (t === "MD" && Math.abs(diasEntreFechas(fecha, f)) <= 14) partidos.add(f);
  });
  // Partidos reales del calendario: mandan sobre el día de partido semanal.
  partidosReales.forEach((f) => {
    if (Math.abs(diasEntreFechas(fecha, f)) <= 14) partidos.add(f);
  });
  if (partidos.has(fecha)) return "MD";
  let dPrev = Infinity;
  let dNext = Infinity;
  partidos.forEach((p) => {
    const d = diasEntreFechas(p, fecha);
    if (d > 0 && d < dPrev) dPrev = d;
    if (d < 0 && -d < dNext) dNext = -d;
  });
  if (dPrev === 1) return "MD+1";
  if (dNext <= 6) return `MD-${dNext}`;
  if (dPrev === 2) return "MD+2";
  return "";
}

function CalendarioReal({ players, grupos, onAbrirModulo, onCerrarSesion, scopeInicial }) {
  // Mismo bootstrap que Programación (sesiones + tareas + ejercicios en una
  // sola llamada, cacheada) — Calendario es otra forma de mirar exactamente
  // los mismos datos, no una fuente nueva.
  const { loaded: bootLoaded, sesiones, tareas, ejercicios, retry } = useBootstrapProgramacion();
  // Peticiones de jugadores ("Pedir sesión para este día", solo dentro de
  // la app) — se piden todas (sin filtrar por estado) porque aquí también
  // hace falta poder "Descartar" una ya vista, no solo listar las nuevas.
  const [solicitudes, saveSolicitudes, solicitudesLoaded] = useEntityList("solicitudesSesion");
  // Registros enviados por los jugadores: para ver en cada día quién cumplió.
  const [registrosCal] = useEntityList("registros");
  const [pendientesAbiertos, setPendientesAbiertos] = useState({});
  const anchoVentanaCal = useAnchoVentana();

  const [editingSesion, setEditingSesion] = useState(null);
  const [plantillaSesion, setPlantillaSesion] = useState(null);
  const [fechasParaEditor, setFechasParaEditor] = useState(null);
  const [destinatariosParaEditor, setDestinatariosParaEditor] = useState(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState("");

  const hoy = todayStr();
  const [mesRef, setMesRef] = useState(inicioMes(hoy));
  const [scopeId, setScopeId] = useState(scopeInicial || "equipo"); // "equipo" | "g:<id>" | "j:<id>"
  const [diaSel, setDiaSel] = useState(hoy);
  const [scopeDdAbierto, setScopeDdAbierto] = useState(false);
  const [buscarScope, setBuscarScope] = useState("");
  // Vista semanal (por defecto) o mensual + modo «Planificar semana»: cada día
  // admite una sesión de la biblioteca y «Publicar semana» las activa todas.
  const [vista, setVista] = useState("semana");
  const [lunesRef, setLunesRef] = useState(() => inicioSemanaCalendario(todayStr()));
  const [modoPlan, setModoPlan] = useState(false);
  const [asignadas, setAsignadas] = useState({}); // fecha -> id de sesión de partida
  const { todos: microTodos, loaded: microLoaded, error: microError, guardar: guardarMicro, borrar: borrarMicro } = useMicrociclosTipo();
  const { todos: partidosTodos, loaded: partidosLoaded, error: partidosError, guardar: guardarPartido, borrar: borrarPartido } = usePartidos();
  const [nuevoPartido, setNuevoPartido] = useState({ fecha: "", rival: "", local: true });
  const [microAbierto, setMicroAbierto] = useState(false);
  const [diasAbiertos, setDiasAbiertos] = useState({}); // fecha -> true/false (por defecto abierto solo hoy)
  const [microGrupoSel, setMicroGrupoSel] = useState(null);
  const [microSemanas, setMicroSemanas] = useState(1);
  const [avisoMicro, setAvisoMicro] = useState("");
  const [cola, setCola] = useState(null); // [{ fecha, sesion }] mientras se publica
  const [idxCola, setIdxCola] = useState(0);
  const [fallosCola, setFallosCola] = useState([]);
  const [resultadoCola, setResultadoCola] = useState("");

  if (showEditor) {
    const EditorComponent = DisenoSesionReal;
    const cerrar = () => {
      setShowEditor(false);
      setEditingSesion(null);
      setPlantillaSesion(null);
      setFechasParaEditor(null);
      setDestinatariosParaEditor(undefined);
    };
    return (
      <EditorComponent
        sesionExistente={editingSesion || undefined}
        plantilla={plantillaSesion || undefined}
        fechasSugeridas={fechasParaEditor || undefined}
        destinatariosSugeridos={destinatariosParaEditor}
        onBack={cerrar}
        onGuardado={() => {
          retry();
          cerrar();
        }}
      />
    );
  }

  if (!bootLoaded) return <LoadingBlock />;

  const activos = players.filter((p) => p.estado === "activo");
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const sesionIdsSet = new Set(sesiones.map((s) => s.id));
  const tareasBySesion = new Map();
  tareas
    .filter((t) => sesionIdsSet.has(t.sesion_id))
    .forEach((t) => {
      if (!tareasBySesion.has(t.sesion_id)) tareasBySesion.set(t.sesion_id, []);
      const e = ejerciciosById.get(t.ejercicio_id) || {};
      tareasBySesion.get(t.sesion_id).push({ ...t, nombreEjercicio: e.nombre || "(ejercicio eliminado)", gif_url: e.gif_url, sin_lateralidad: e.sin_lateralidad });
    });
  const conTareas = sesiones.map((s) => ({ ...s, tareas: tareasBySesion.get(s.id) || [] }));

  const gruposOrdenados = grupos.slice().sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  const jugadoresOrdenados = activos.slice().sort((a, b) => a.name.localeCompare(b.name));

  const scope =
    scopeId === "equipo"
      ? { tipo: "equipo", id: "equipo", label: "Equipo completo" }
      : scopeId.startsWith("g:")
      ? (() => {
          const g = grupos.find((x) => x.id === scopeId.slice(2));
          return g ? { tipo: "grupo", grupoId: g.id, id: scopeId, label: g.nombre } : { tipo: "equipo", id: "equipo", label: "Equipo completo" };
        })()
      : (() => {
          const p = players.find((x) => x.id === scopeId.slice(2));
          return p ? { tipo: "jugador", jugadorId: p.id, id: scopeId, label: p.name } : { tipo: "equipo", id: "equipo", label: "Equipo completo" };
        })();

  const sesionesEnFecha = (fecha) => conTareas.filter((s) => (s.fechas || []).includes(fecha) && sesionVisibleEnScope(s, scope, players, activos));

  const dias = generarCuadriculaMes(mesRef);

  // Solicitudes de verdad accionables: 'pendiente' en la tabla Y todavía sin
  // una sesión real que las resuelva (ese jugador, esa fecha) — en cuanto
  // diseñas la sesión, desaparecen solas de aquí, sin tener que marcarlas a
  // mano como "atendidas".
  const cubiertaPorSesion = new Set();
  conTareas.forEach((s) => {
    const destino = destinatariosEfectivosSesion(s, activos);
    (s.fechas || []).forEach((f) => destino.forEach((jid) => cubiertaPorSesion.add(`${jid}::${f}`)));
  });
  const solicitudesPendientes = solicitudes
    .filter((s) => s.estado === "pendiente" && !cubiertaPorSesion.has(`${s.jugador_id}::${s.fecha}`))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const solicitudesEnFecha = (fecha) => solicitudesPendientes.filter((s) => s.fecha === fecha && (scope.tipo !== "jugador" || s.jugador_id === scope.jugadorId));

  const editar = (s) => {
    setEditingSesion(s);
    setShowEditor(true);
  };
  const reutilizar = (s) => {
    setPlantillaSesion(s);
    setEditingSesion(null);
    setShowEditor(true);
  };
  // "Personalizar solo para X": misma mecánica que Reutilizar (sesión nueva,
  // sin heredar id ni tocar la original) pero forzando el destino a un solo
  // jugador y la fecha al día concreto que se estaba mirando — no a "hoy" ni
  // a las fechas originales (que podían ser un lote de varios días).
  const personalizarParaJugador = (s, jugadorId, fecha) => {
    setPlantillaSesion({ ...s, jugadores_destino: [jugadorId] });
    setEditingSesion(null);
    setFechasParaEditor([fecha]);
    setShowEditor(true);
  };
  const nuevaSesionEnFecha = (fecha) => {
    setPlantillaSesion(null);
    setEditingSesion(null);
    setFechasParaEditor([fecha]);
    setDestinatariosParaEditor(
      scope.tipo === "jugador"
        ? [scope.jugadorId]
        : scope.tipo === "grupo"
        ? activos.filter((p) => (p.gruposIds || []).includes(scope.grupoId)).map((p) => p.id)
        : null
    );
    setShowEditor(true);
  };
  // Atender una petición: abre el editor con la fecha y el jugador ya
  // puestos (igual que "+ Diseñar sesión" del panel del día, pero sin
  // necesidad de estar mirando ya el ámbito de ese jugador) y de paso te
  // deja en su calendario, para que veas cómo queda resuelta.
  const disenarParaSolicitud = (sol, tipo) => {
    setPlantillaSesion(null);
    setEditingSesion(null);
    setFechasParaEditor([sol.fecha]);
    setDestinatariosParaEditor([sol.jugador_id]);
    setScopeId(`j:${sol.jugador_id}`);
    setDiaSel(sol.fecha);
    setShowEditor(true);
  };
  const descartarSolicitud = async (sol) => {
    await saveSolicitudes(solicitudes.map((s) => (s.id === sol.id ? { ...s, estado: "descartada" } : s)));
  };
  const eliminarSesion = async (sesionId) => {
    setErrorBorrado("");
    try {
      const tareasDeSesion = tareas.filter((t) => t.sesion_id === sesionId);
      const circuitoIds = [...new Set(tareasDeSesion.filter((t) => t.circuito_id).map((t) => t.circuito_id))];
      await Promise.all(tareasDeSesion.map((t) => api.delete("tareas", t.id)));
      await Promise.all(circuitoIds.map((id) => api.delete("circuitos", id)));
      await api.delete("sesiones", sesionId);
      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();
      retry();
    } catch (e) {
      setErrorBorrado("No se pudo borrar la sesión. Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  // ----- Planificación semanal -----
  // Destino de lo que se publique desde aquí: el ámbito que se está mirando.
  const destinoScope =
    scope.tipo === "jugador"
      ? [scope.jugadorId]
      : scope.tipo === "grupo"
      ? activos.filter((p) => (p.gruposIds || []).includes(scope.grupoId)).map((p) => p.id)
      : null;
  const diasSemana = Array.from({ length: 7 }, (_, i) => sumarDiasFecha(lunesRef, i));
  const NOMBRES_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const sesionPorId = new Map(conTareas.map((s) => [s.id, s]));
  const opcionesBiblioteca = agruparPlantillas(conTareas).map((g) => g.rep).filter((s) => (s.tareas || []).length).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const idsOpcionesBib = new Set(opcionesBiblioteca.map((s) => s.id));
  const pendientesPlan = Object.keys(asignadas).filter((f) => asignadas[f] && sesionPorId.get(asignadas[f])).sort();
  // El microciclo pertenece al equipo: un jugador de un equipo usa el de su
  // equipo; uno independiente (sin grupo) tiene el suyo propio.
  const jugadorScope = scope.tipo === "jugador" ? players.find((p) => p.id === scope.jugadorId) : null;
  const gruposMicro = scope.tipo === "grupo" ? [scope.grupoId] : jugadorScope ? (jugadorScope.gruposIds || []).filter((g) => grupos.some((x) => x.id === g)) : [];
  const grupoMicroId = gruposMicro.includes(microGrupoSel) ? microGrupoSel : gruposMicro[0] || null;
  const microKey = grupoMicroId ? `g:${grupoMicroId}` : scope.tipo === "jugador" ? `j:${scope.jugadorId}` : grupos.length === 1 ? `g:${grupos[0].id}` : "equipo";
  const microNombre = grupoMicroId ? grupos.find((g) => g.id === grupoMicroId)?.nombre || "equipo" : scope.tipo === "jugador" ? `${scope.label} (independiente)` : grupos.length === 1 ? grupos[0].nombre : "Todos los equipos";
  const microHeredado = scope.tipo === "jugador" && !!grupoMicroId;
  const micro = { ...MICRO_VACIO, ...(microTodos[microKey] || {}) };
  const cambiarMicro = (parche) => {
    if (!microLoaded) return;
    guardarMicro(microKey, { ...micro, ...parche });
  };
  const partidosScope = partidosTodos.filter((x) => x.ambito === microKey);
  const fechasPartido = partidosScope.map((x) => x.fecha);
  const partidoPorFecha = new Map(partidosScope.map((x) => [x.fecha, x]));
  const anadirPartido = async () => {
    if (!nuevoPartido.fecha) return;
    const ok = await guardarPartido({ fecha: nuevoPartido.fecha, rival: nuevoPartido.rival.trim(), local: nuevoPartido.local, ambito: microKey });
    if (ok) setNuevoPartido({ fecha: "", rival: "", local: true });
  };
  const mdDe = (f) => mdDeFecha(micro, f, fechasPartido);
  const fijarMdManual = (f, valor) => {
    const manual = { ...(micro.manual || {}) };
    if (!valor) delete manual[f];
    else manual[f] = valor;
    cambiarMicro({ manual });
  };
  // El microciclo es opcional: solo se ven etiquetas MD si se ha elegido día de partido o se ha marcado algún día a mano.
  const microActivo = micro.diaPartido != null || Object.keys(micro.manual || {}).length > 0 || fechasPartido.length > 0;
  const quitarMicro = () => {
    if (!window.confirm(`¿Quitar el microciclo de ${microNombre}? Se borran el día de partido, las sesiones por MD y los ajustes manuales.`)) return;
    borrarMicro(microKey);
  };
  const microConfigurado = MICRO_TAGS_ORDEN.some((t) => micro.sesiones[t]);
  const aplicarMicrociclo = () => {
    const nuevas = {};
    let sinSesion = 0;
    for (let i = 0; i < 7 * microSemanas; i++) {
      const f = sumarDiasFecha(lunesRef, i);
      if (f < hoy) continue;
      const tag = mdDe(f);
      const id = tag ? micro.sesiones[tag] : "";
      if (id && sesionPorId.get(id)) nuevas[f] = id;
      else if (tag && !micro.sesiones[tag]) sinSesion += 1;
    }
    setAsignadas(nuevas);
    setModoPlan(true);
    const n = Object.keys(nuevas).length;
    setAvisoMicro(n ? `Microciclo aplicado: ${n} día${n === 1 ? "" : "s"} con sesión${sinSesion ? ` · ${sinSesion} día${sinSesion === 1 ? "" : "s"} sin sesión definida (descanso)` : ""}. Revisa y pulsa «Publicar».` : "Ningún día de este periodo tiene sesión en el microciclo tipo (o ya han pasado).");
  };
  const destinoVacio = destinoScope !== null && destinoScope.length === 0;
  const etiquetaDiaLarga = (f) => new Date(f + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  const etiquetaSemana = () => {
    const a = new Date(diasSemana[0] + "T00:00:00");
    const z = new Date(diasSemana[6] + "T00:00:00");
    const mes = (d) => d.toLocaleDateString("es-ES", { month: "long" });
    return a.getMonth() === z.getMonth() ? `${a.getDate()}–${z.getDate()} de ${mes(z)}` : `${a.getDate()} ${mes(a).slice(0, 3)} – ${z.getDate()} ${mes(z).slice(0, 3)}`;
  };
  // Resumen compacto de lo que lleva una sesión (por bloque) para las tarjetas.
  const resumenSesionTarjeta = (s) => {
    const por = {};
    (s.tareas || []).forEach((t) => {
      const b = t.bloque_sesion || "Otro";
      por[b] = por[b] || { n: 0, series: 0 };
      por[b].n += 1;
      por[b].series += Number(t.series) || 0;
    });
    const orden = ["Activación", "Movilidad", "Preventivo", "Core", "Resistencia", "CMJ", "Fuerza"];
    return orden.filter((b) => por[b]).map((b) => ({ bloque: b, ...por[b] }));
  };
  const resumenSemana = (() => {
    const sesSemana = diasSemana.flatMap((f) => sesionesEnFecha(f).map((x) => ({ f, x })));
    const fuerzaSeries = sesSemana.reduce((a, { x }) => a + resumenSesionTarjeta(x).filter((r) => r.bloque === "Fuerza").reduce((b, r) => b + r.series, 0), 0);
    const diasConSesion = new Set(sesSemana.map(({ f }) => f)).size;
    const mds = [...new Set(sesSemana.map(({ x }) => x.md).filter(Boolean))];
    return { n: sesSemana.length, dias: diasConSesion, fuerzaSeries, mds };
  })();
  // Cumplimiento de una sesión en una fecha: quién envió todo, quién algo y quién nada.
  // Jugadores distintos con registros por sesión (para avisar antes de borrarla).
  const sesionDeTarea = new Map(tareas.map((t) => [t.id, t.sesion_id]));
  const jugadoresPorSesion = new Map();
  registrosCal.forEach((r) => {
    const sid = sesionDeTarea.get(r.tarea_id);
    if (!sid) return;
    if (!jugadoresPorSesion.has(sid)) jugadoresPorSesion.set(sid, new Set());
    jugadoresPorSesion.get(sid).add(r.jugador_id);
  });
  const enviadosSet = new Set(registrosCal.filter((r) => r.enviado === true || r.enviado === "true").map((r) => `${r.jugador_id}::${r.tarea_id}::${r.fecha}`));
  const cumplimientoSesion = (s, f) => {
    if (f > hoy) return null;
    let destinos = destinatariosEfectivosSesion(s, activos);
    if (scope.tipo === "jugador") destinos = destinos.filter((id) => id === scope.jugadorId);
    const jugadoresDest = destinos.map((id) => players.find((p) => p.id === id)).filter((p) => p && p.estado === "activo");
    const tareasDia = (s.tareas || []).filter((t) => !t.fecha || t.fecha === f);
    if (!jugadoresDest.length || !tareasDia.length) return null;
    const completos = [];
    const parciales = [];
    const ninguno = [];
    let hechasTotal = 0;
    jugadoresDest.forEach((p) => {
      const n = tareasDia.filter((t) => enviadosSet.has(`${p.id}::${t.id}::${f}`)).length;
      hechasTotal += n;
      if (n === tareasDia.length) completos.push(p);
      else if (n > 0) parciales.push(p);
      else ninguno.push(p);
    });
    return { total: jugadoresDest.length, completos, parciales, ninguno, pct: Math.round((hechasTotal / (jugadoresDest.length * tareasDia.length)) * 100) };
  };
  // Estado de un jugador concreto en una sesión/fecha: hecho | parcial | falta | futuro
  const estadoJugadorSesion = (s, f, p) => {
    const tareasDia = (s.tareas || []).filter((t) => !t.fecha || t.fecha === f);
    if (f > hoy || !tareasDia.length) return "futuro";
    const n = tareasDia.filter((t) => enviadosSet.has(`${p.id}::${t.id}::${f}`)).length;
    if (n === tareasDia.length) return "hecho";
    if (n > 0) return "parcial";
    return f === hoy ? "hoy" : "falta";
  };
  const jugadoresMatriz = activos
    .filter((p) => scope.tipo === "equipo" || (scope.tipo === "grupo" && (p.gruposIds || []).includes(scope.grupoId)) || (scope.tipo === "jugador" && p.id === scope.jugadorId))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const sesionesDeJugadorEnFecha = (p, f) => conTareas.filter((x) => (x.fechas || []).includes(f) && x.enviada && destinatariosEfectivosSesion(x, activos).includes(p.id));
  const resumenJugadorSemana = (p) => {
    const items = diasSemana.flatMap((f) => sesionesDeJugadorEnFecha(p, f).map((x) => ({ f, x, e: estadoJugadorSesion(x, f, p) })));
    const pasadas = items.filter((i) => i.e !== "futuro" && i.e !== "hoy");
    const hechas = pasadas.filter((i) => i.e === "hecho").length;
    return { n: items.length, pasadas: pasadas.length, hechas, pct: pasadas.length ? Math.round((hechas / pasadas.length) * 100) : null };
  };
  const cumplimientoSemana = (() => {
    const lista = diasSemana.flatMap((f) => sesionesEnFecha(f).map((x) => cumplimientoSesion(x, f))).filter(Boolean);
    if (!lista.length) return null;
    return Math.round(lista.reduce((a, c) => a + c.pct, 0) / lista.length);
  })();
  const copiarSemanaAnterior = () => {
    const nuevas = {};
    diasSemana.forEach((f) => {
      const previa = conTareas.find((s) => s.enviada && (s.tareas || []).length && (s.fechas || []).includes(sumarDiasFecha(f, -7)) && sesionVisibleEnScope(s, scope, players, activos));
      if (previa && f >= hoy) nuevas[f] = previa.id;
    });
    setAsignadas(nuevas);
  };
  // Publica una lista de { fecha, sesion } reutilizando el guardado del
  // diseñador (montado oculto): sortea movilidad/preventivo por fecha, copia
  // tareas y circuitos... y nunca toca la carga (sin progresión).
  const lanzarCola = (items) => {
    if (destinoScope === null && grupos.length > 1) {
      if (!window.confirm(`Esto se enviará a los ${activos.length} jugadores activos de todos los equipos. ¿Continuar?\n\nSi es solo para un equipo, cámbialo arriba a ese grupo.`)) return;
    }
    setFallosCola([]);
    setResultadoCola("");
    setIdxCola(0);
    setCola(items);
  };
  const siguienteCola = (huboFallo) => {
    const nuevo = idxCola + 1;
    if (nuevo >= cola.length) {
      const nFallos = fallosCola.length + (huboFallo ? 1 : 0);
      const n = cola.length - nFallos;
      setCola(null);
      setAsignadas({});
      setResultadoCola(`${n} día${n === 1 ? "" : "s"} publicado${n === 1 ? "" : "s"}${nFallos ? ` · ${nFallos} con error` : ""}.`);
      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();
      retry();
    } else setIdxCola(nuevo);
  };
  const actualCola = cola ? cola[idxCola] : null;
  const irADia = (f) => {
    setDiaSel(f);
    setLunesRef(inicioSemanaCalendario(f));
  };

  const sesionesDiaSel = sesionesEnFecha(diaSel);
  const solicitudesDiaSel = solicitudesEnFecha(diaSel);
  const yaEsIndividualDeEsteJugador = (s) => scope.tipo === "jugador" && s.jugadores_destino && s.jugadores_destino.length === 1 && s.jugadores_destino[0] === scope.jugadorId;
  const nombreJugadorSolicitud = (sol) => players.find((p) => p.id === sol.jugador_id)?.name || "Un jugador";

  return (
    <PantallaEntrenadorAncha activo="calendario" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>CALENDARIO</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Calendario</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>Por equipo, por grupo o por jugador individual</div>
        </div>

        {errorBorrado && (
          <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 14 }}>
            {errorBorrado}
          </div>
        )}

        {/* Solicitudes de jugadores ("Pedir sesión para este día") — el
            aviso de verdad, no un decorado: en cuanto se diseña la sesión
            para esa fecha y ese jugador, la petición desaparece sola de
            aquí. */}
        {solicitudesLoaded && solicitudesPendientes.length > 0 && (
          <div style={{ marginBottom: 18, background: `${ds.warning}12`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.lg, padding: 14 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.warning, marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>
              {solicitudesPendientes.length} {solicitudesPendientes.length === 1 ? "petición" : "peticiones"} de jugadores
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {solicitudesPendientes.map((sol) => (
                <div key={sol.id} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>{nombreJugadorSolicitud(sol)}</div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>
                      {fmtDateLabel(sol.fecha)}
                      {sol.nota ? ` · "${sol.nota}"` : ""}
                    </div>
                  </div>
                  <DsButton size="sm" onClick={() => disenarParaSolicitud(sol, "sesion")}>
                    Diseñar sesión
                  </DsButton>
                  <button
                    onClick={() => descartarSolicitud(sol)}
                    style={{ background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, padding: "6px 10px", color: ds.inkMuted, fontSize: 11.5, cursor: "pointer" }}
                  >
                    Descartar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra: vista semana/mes, navegación y modo planificar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {/* Selector de ámbito: equipo / grupo / jugador */}
        <div style={{ position: "relative", width: "min(100%, 240px)" }}>
          <button
            onClick={() => setScopeDdAbierto((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 14px", cursor: "pointer", color: ds.ink, fontSize: 13.5, fontWeight: 600 }}
          >
            <User size={14} color={ds.accent} />
            {scope.label}
            <span style={{ marginLeft: "auto", color: ds.inkMuted, fontSize: 11 }}>{scopeDdAbierto ? "▲" : "▼"}</span>
          </button>
          {scopeDdAbierto && (
            <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: dsR.md, boxShadow: dsSh.elevation3, maxHeight: 340, overflowY: "auto", padding: 8 }}>
              <DsInput autoFocus value={buscarScope} onChange={(e) => setBuscarScope(e.target.value)} placeholder="Buscar equipo, grupo o jugador..." style={{ marginBottom: 8 }} />
              <button
                onClick={() => {
                  setScopeId("equipo");
                  setScopeDdAbierto(false);
                  setBuscarScope("");
                }}
                style={itemScopeCalendarioStyle(scopeId === "equipo")}
              >
                Equipo completo
              </button>
              {gruposOrdenados.filter((g) => !buscarScope.trim() || (g.nombre || "").toLowerCase().includes(buscarScope.trim().toLowerCase())).length > 0 && (
                <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, letterSpacing: "0.06em", padding: "8px 10px 2px" }}>GRUPOS</div>
              )}
              {gruposOrdenados
                .filter((g) => !buscarScope.trim() || (g.nombre || "").toLowerCase().includes(buscarScope.trim().toLowerCase()))
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setScopeId(`g:${g.id}`);
                      setScopeDdAbierto(false);
                      setBuscarScope("");
                    }}
                    style={itemScopeCalendarioStyle(scopeId === `g:${g.id}`)}
                  >
                    {g.nombre}
                  </button>
                ))}
              {jugadoresOrdenados.filter((p) => !buscarScope.trim() || p.name.toLowerCase().includes(buscarScope.trim().toLowerCase())).length > 0 && (
                <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, letterSpacing: "0.06em", padding: "8px 10px 2px" }}>JUGADORES</div>
              )}
              {jugadoresOrdenados
                .filter((p) => !buscarScope.trim() || p.name.toLowerCase().includes(buscarScope.trim().toLowerCase()))
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setScopeId(`j:${p.id}`);
                      setScopeDdAbierto(false);
                      setBuscarScope("");
                    }}
                    style={itemScopeCalendarioStyle(scopeId === `j:${p.id}`)}
                  >
                    {p.name}
                    {(p.gruposIds || []).length === 0 ? " · independiente" : ""}
                  </button>
                ))}
            </div>
          )}
        </div>

          <div style={{ display: "inline-flex", border: `1px solid ${ds.border}`, borderRadius: 999, overflow: "hidden" }}>
            {[["semana", "Semana"], ["mes", "Mes"], ["jugadores", "Jugadores"]].map(([id, lab]) => (
              <button key={id} type="button" onClick={() => setVista(id)} style={{ border: "none", padding: "7px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: vista === id ? ds.accent : "transparent", color: vista === id ? ds.accentInk : ds.inkSecondary }}>{lab}</button>
            ))}
          </div>
          {(vista === "semana" || vista === "jugadores") && (
            <>
              <button onClick={() => setLunesRef(sumarDiasFecha(lunesRef, -7))} style={navMesBtnCalendarioStyle} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
              <span style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700, minWidth: 150, textAlign: "center" }}>{etiquetaSemana()}</span>
              <button onClick={() => setLunesRef(sumarDiasFecha(lunesRef, 7))} style={navMesBtnCalendarioStyle} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
              <button onClick={() => { setLunesRef(inicioSemanaCalendario(hoy)); setDiaSel(hoy); }} style={{ background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: ds.ink, cursor: "pointer" }}>Hoy</button>
              <span style={{ flex: 1 }} />
              {vista === "semana" && <button type="button" onClick={() => { setModoPlan((v) => !v); setMicroAbierto(false); }} style={{ fontSize: 13, fontWeight: 700, borderRadius: 999, padding: "8px 16px", cursor: "pointer", border: `1px solid ${ds.accent}`, background: modoPlan ? ds.accent : "transparent", color: modoPlan ? ds.accentInk : ds.accent }}>
                {modoPlan ? "Cerrar planificación" : "Planificar semana"}
              </button>}
            </>
          )}
        </div>

        {vista === "semana" && (
          <>
            {scope.tipo === "jugador" && (() => {
              const idx = jugadoresOrdenados.findIndex((p) => p.id === scope.jugadorId);
              const jug = players.find((p) => p.id === scope.jugadorId);
              const nombresGrupos = (jug?.gruposIds || []).map((g) => grupos.find((x) => x.id === g)?.nombre).filter(Boolean);
              const irA = (d) => { const n = jugadoresOrdenados[(idx + d + jugadoresOrdenados.length) % jugadoresOrdenados.length]; if (n) setScopeId(`j:${n.id}`); };
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 12 }}>
                  <button type="button" onClick={() => irA(-1)} style={navMesBtnCalendarioStyle} aria-label="Jugador anterior"><ChevronLeft size={16} /></button>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", background: ds.accentSubtle, color: ds.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{(jug?.name || "?").split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontFamily: dsF.display, fontSize: 16, fontWeight: 700 }}>{scope.label}</div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted }}>{nombresGrupos.length ? nombresGrupos.join(" · ") : "Independiente"} · {idx + 1} de {jugadoresOrdenados.length}</div>
                  </div>
                  <button type="button" onClick={() => setScopeId("equipo")} style={{ fontSize: 12, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>Ver equipo</button>
                  <button type="button" onClick={() => irA(1)} style={navMesBtnCalendarioStyle} aria-label="Jugador siguiente"><ChevronRight size={16} /></button>
                </div>
              );
            })()}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginBottom: 12 }}>
              {diasSemana.map((f, i) => {
                const n = sesionesEnFecha(f).length;
                const md = mdDe(f);
                const esHoy = f === hoy;
                return (
                  <button key={f} type="button" onClick={() => { setDiasAbiertos((a) => ({ ...a, [f]: true })); const el = document.getElementById(`dia-${f}`); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={{ background: esHoy ? ds.accentSubtle : ds.surface, border: `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: 12, padding: "8px 4px", cursor: "pointer", color: ds.ink, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: ds.inkMuted, textTransform: "uppercase" }}>{NOMBRES_DIA[i]} {Number(f.slice(8))}</span>
                    <span style={{ fontSize: 11, fontFamily: dsF.mono, fontWeight: 700, color: md ? ds.accent : ds.inkMuted, minHeight: 14 }}>{md || ""}</span>
                    {partidoPorFecha.get(f) && <span title={`Partido${partidoPorFecha.get(f).rival ? ` vs ${partidoPorFecha.get(f).rival}` : ""}`} style={{ fontSize: 10, color: ds.inkSecondary, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚽ {(partidoPorFecha.get(f).rival || "partido").slice(0, 10)}</span>}
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: n ? ds.ink : ds.inkMuted }}>{n ? `${n} ses.` : "—"}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                [`${resumenSemana.n}`, resumenSemana.n === 1 ? "sesión" : "sesiones"],
                [`${resumenSemana.dias}/7`, "días con sesión"],
                [`${resumenSemana.fuerzaSeries}`, "series de fuerza"],
                ...(cumplimientoSemana !== null ? [[`${cumplimientoSemana} %`, "cumplimiento"]] : []),
              ].map(([v, l]) => (
                <span key={l} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "5px 12px" }}>
                  <b style={{ fontFamily: dsF.display, fontSize: 15 }}>{v}</b>
                  <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>{l}</span>
                </span>
              ))}
              {resumenSemana.mds.length > 0 && <span style={{ fontSize: 11.5, color: ds.inkSecondary, alignSelf: "center" }}>MD: {resumenSemana.mds.join(" · ")}</span>}
              {resumenSemana.dias === 0 && <span style={{ fontSize: 12, color: ds.inkMuted, alignSelf: "center" }}>Semana vacía — pulsa «Planificar semana» para montarla.</span>}
            </div>
            {modoPlan && (
              <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: ds.ink, flex: 1, minWidth: 220 }}>
                  Planificando para <b>{microNombre === scope.label ? scope.label : scope.label}</b>. Al publicar, cada jugador la verá activa el día que le toca. No se modifica la carga.
                </span>
                <span style={{ display: "inline-flex", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 999, overflow: "hidden" }}>
                  {[[false, "Día a día"], [true, "Con microciclo tipo"]].map(([v, l]) => (
                    <button key={l} type="button" onClick={() => setMicroAbierto(v)} style={{ fontSize: 12.5, fontWeight: 700, padding: "6px 12px", border: "none", cursor: "pointer", background: microAbierto === v ? ds.accent : "transparent", color: microAbierto === v ? ds.accentInk : ds.accent }}>{l}</button>
                  ))}
                </span>
                {!microAbierto && <button type="button" onClick={copiarSemanaAnterior} style={{ fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>Copiar la semana anterior</button>}
                {Object.keys(asignadas).length > 0 && <button type="button" onClick={() => setAsignadas({})} style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: "none", cursor: "pointer" }}>Vaciar</button>}
              </div>
            )}
            {modoPlan && microAbierto && (
              <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <b style={{ fontFamily: dsF.display, fontSize: 15 }}>Microciclo tipo · {microNombre}</b>
                  {microHeredado && <span style={{ fontSize: 12, color: ds.inkSecondary }}>heredado por {scope.label}{gruposMicro.length > 1 ? "" : ""}</span>}
                  {gruposMicro.length > 1 && scope.tipo === "jugador" && (
                    <select value={grupoMicroId || ""} onChange={(e) => setMicroGrupoSel(e.target.value)} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "5px 8px" }}>
                      {gruposMicro.map((g) => <option key={g} value={g}>{grupos.find((x) => x.id === g)?.nombre}</option>)}
                    </select>
                  )}
                  <span style={{ flex: 1 }} />
                  <label style={{ fontSize: 12.5, color: ds.inkSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    Día de partido
                    <select value={micro.diaPartido == null ? "" : micro.diaPartido} onChange={(e) => cambiarMicro({ diaPartido: e.target.value === "" ? null : Number(e.target.value) })} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "6px 8px" }}>
                      <option value="">Sin partido</option>
                      {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((n, i) => <option key={n} value={i}>{n}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ fontSize: 12, color: ds.inkMuted, marginBottom: 10 }}>
                  Elige qué sesión toca en cada día del microciclo. Cada fecha del calendario se identifica con su MD según el partido (puedes corregir cualquier día con la etiqueta MD de su fila). Las sesiones se aplican tal cual, sin tocar la carga.
                </div>
                {microError && <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 10 }}>{microError}</div>}
                <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Partidos · {microNombre}</div>
                  {partidosError && <div style={{ color: ds.danger, fontSize: 12.5, marginBottom: 8 }}>{partidosError}</div>}
                  {!partidosLoaded && <div style={{ fontSize: 12, color: ds.inkMuted }}>Cargando partidos…</div>}
                  {partidosLoaded && partidosScope.filter((x) => x.fecha >= sumarDiasFecha(hoy, -7)).length === 0 && (
                    <div style={{ fontSize: 12, color: ds.inkMuted, marginBottom: 6 }}>Sin partidos próximos. Añade los reales para que el MD de cada día salga solo; sin partidos puedes usar el día de partido semanal de arriba, o ninguno (jugadores sin competición).</div>
                  )}
                  {partidosScope.filter((x) => x.fecha >= sumarDiasFecha(hoy, -7)).map((x) => (
                    <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
                      <b style={{ fontFamily: dsF.mono, fontSize: 12 }}>{new Date(`${x.fecha}T00:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}</b>
                      <span style={{ color: ds.inkSecondary }}>{x.local === false ? "fuera" : "en casa"}{x.rival ? ` · ${x.rival}` : ""}</span>
                      <span style={{ flex: 1 }} />
                      <button type="button" onClick={() => borrarPartido(x.id)} aria-label="Quitar partido" style={{ background: "transparent", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                    <input type="date" value={nuevoPartido.fecha} onChange={(e) => setNuevoPartido({ ...nuevoPartido, fecha: e.target.value })} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "6px 8px" }} />
                    <input type="text" placeholder="Rival (opcional)" value={nuevoPartido.rival} onChange={(e) => setNuevoPartido({ ...nuevoPartido, rival: e.target.value })} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "6px 8px", width: 150 }} />
                    <select value={nuevoPartido.local ? "1" : "0"} onChange={(e) => setNuevoPartido({ ...nuevoPartido, local: e.target.value === "1" })} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "6px 8px" }}>
                      <option value="1">En casa</option>
                      <option value="0">Fuera</option>
                    </select>
                    <button type="button" disabled={!nuevoPartido.fecha} onClick={anadirPartido} style={{ background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: nuevoPartido.fecha ? "pointer" : "default", opacity: nuevoPartido.fecha ? 1 : 0.5 }}>+ Añadir partido</button>
                  </div>
                </div>
                {!microLoaded && <div style={{ fontSize: 12.5, color: ds.inkMuted, marginBottom: 10 }}>Cargando microciclo…</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
                  {MICRO_TAGS_ORDEN.map((t) => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, background: ds.surfaceRaised, border: `1px solid ${micro.sesiones[t] ? ds.accentBorderSubtle : ds.border}`, borderRadius: 10, padding: "6px 8px" }}>
                      <b style={{ fontFamily: dsF.mono, fontSize: 12, width: 44, color: t === "MD" ? ds.accent : ds.ink }}>{t}</b>
                      <select value={micro.sesiones[t] || ""} onChange={(e) => { const ses2 = { ...micro.sesiones }; if (e.target.value) ses2[t] = e.target.value; else delete ses2[t]; cambiarMicro({ sesiones: ses2 }); }} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: ds.ink, fontSize: 12.5 }}>
                        <option value="">Descanso / sin sesión</option>
                        {opcionesBiblioteca.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        {micro.sesiones[t] && !idsOpcionesBib.has(micro.sesiones[t]) && <option value={micro.sesiones[t]}>{sesionPorId.get(micro.sesiones[t])?.nombre || "Sesión eliminada"}</option>}
                      </select>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <label style={{ fontSize: 12.5, color: ds.inkSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    Aplicar a
                    <select value={microSemanas} onChange={(e) => setMicroSemanas(Number(e.target.value))} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, fontSize: 12.5, padding: "6px 8px" }}>
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "esta semana" : `${n} semanas desde esta`}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={!microConfigurado} onClick={aplicarMicrociclo} style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: microConfigurado ? 1 : 0.5 }}>Aplicar microciclo</button>
                  {microActivo && <button type="button" onClick={quitarMicro} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: 10, padding: "9px 14px", fontSize: 12.5, cursor: "pointer" }}>Quitar microciclo</button>}
                  {avisoMicro && <span style={{ fontSize: 12.5, color: ds.inkSecondary, flex: 1, minWidth: 200 }}>{avisoMicro}</span>}
                </div>
              </div>
            )}
            {/* Agenda semanal: una fila por día, con el contenido a todo el ancho. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {diasSemana.map((f, i) => {
                const ses = sesionesEnFecha(f);
                const esHoy = f === hoy;
                const pasado = f < hoy;
                const sols = solicitudesEnFecha(f);
                return (
                  <div key={f} id={`dia-${f}`} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: ds.surface, border: `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: 14, padding: 10, flexWrap: "wrap" }}>
                    <div style={{ width: 64, flexShrink: 0, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{NOMBRES_DIA[i]}</div>
                      <div style={{ width: 40, height: 40, margin: "4px auto 0", borderRadius: "50%", background: esHoy ? ds.accent : ds.surfaceRaised, color: esHoy ? ds.accentInk : ds.ink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>{Number(f.slice(8))}</div>
                      {esHoy && <div style={{ fontSize: 10, color: ds.accent, fontWeight: 700, marginTop: 3 }}>HOY</div>}
                      {microActivo && (
                        <select value={micro.manual[f] || ""} onChange={(e) => fijarMdManual(f, e.target.value)} title="Día del microciclo (MD). «Auto» lo calcula según el día de partido." style={{ display: "block", margin: "6px auto 0", width: 64, fontFamily: dsF.mono, fontSize: 11, fontWeight: 700, textAlign: "center", textAlignLast: "center", color: mdDe(f) ? (mdDe(f) === "MD" ? ds.accentInk : ds.accent) : ds.inkMuted, background: mdDe(f) === "MD" ? ds.accent : "transparent", border: `1px solid ${mdDe(f) ? ds.accentBorderSubtle : ds.border}`, borderRadius: 999, padding: "2px 0", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                          <option value="">{micro.manual[f] ? "Auto" : mdDe(f) || "MD ·"}</option>
                          {MD_TAGS.filter((t) => t !== "Sin MD").map((t) => <option key={t} value={t}>{t}</option>)}
                          <option value="-">Sin MD</option>
                        </select>
                      )}
                    </div>
                    <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {sols.map((sol) => (
                        <div key={sol.id} style={{ background: `${ds.warning}14`, border: `1px solid ${ds.warning}55`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ flex: 1, minWidth: 140, fontSize: 12.5, color: ds.ink }}><b>{nombreJugadorSolicitud(sol)}</b> pidió sesión{sol.nota ? ` · "${sol.nota}"` : ""}</span>
                          <DsButton size="sm" onClick={() => disenarParaSolicitud(sol, "sesion")}>Diseñar</DsButton>
                          <button onClick={() => descartarSolicitud(sol)} style={{ background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, padding: "5px 10px", color: ds.inkMuted, fontSize: 11.5, cursor: "pointer" }}>Descartar</button>
                        </div>
                      ))}
                      {ses.map((s) => !(diasAbiertos[f] ?? esHoy) ? (
                        (() => {
                          const c = cumplimientoSesion(s, f);
                          const color = c ? (c.pct >= 80 ? ds.success : c.pct >= 50 ? ds.warning : ds.danger) : ds.inkMuted;
                          return (
                            <button key={s.id} type="button" onClick={() => setDiasAbiertos((a) => ({ ...a, [f]: true }))} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", textAlign: "left", width: "100%", background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", color: ds.ink }}>
                              <span style={{ fontWeight: 700, color: ds.accent, fontSize: 14, flex: "1 1 200px", minWidth: 0 }}>{s.nombre || s.objetivo || "Sesión"}</span>
                              <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>{etiquetaDestinoSesion(s, players, grupos)}</span>
                              {!s.enviada && <span style={{ fontSize: 10.5, color: ds.warning, border: `1px solid ${ds.warning}66`, borderRadius: 999, padding: "1px 8px" }}>borrador</span>}
                              {c && <span style={{ fontSize: 12, fontWeight: 700, color }}>{c.completos.length}/{c.total} · {c.pct} %</span>}
                              <ChevronRight size={14} />
                            </button>
                          );
                        })()
                      ) : (
                        <div key={s.id}>
                          <TarjetaSesionReal sesion={s} esHoy={esHoy} compacta abiertaInicial={false} onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} jugadoresConRegistros={jugadoresPorSesion.get(s.id)?.size || 0} />
                          {(() => {
                            const c = cumplimientoSesion(s, f);
                            if (!c) return null;
                            const clave = `${s.id}|${f}`;
                            const abierto = !!pendientesAbiertos[clave];
                            const color = c.pct >= 80 ? ds.success : c.pct >= 50 ? ds.warning : ds.danger;
                            const faltan = [...c.ninguno.map((p) => ({ p, e: "sin enviar" })), ...c.parciales.map((p) => ({ p, e: "parcial" }))];
                            return (
                              <div style={{ marginTop: 8, paddingLeft: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ flex: "0 1 160px", minWidth: 90, height: 6, borderRadius: 999, background: ds.border, overflow: "hidden", display: "flex" }}>
                                    <div style={{ width: `${(c.completos.length / c.total) * 100}%`, background: color }} />
                                    <div style={{ width: `${(c.parciales.length / c.total) * 100}%`, background: `${color}66` }} />
                                  </div>
                                  <span style={{ fontSize: 12, color: ds.ink, fontWeight: 600 }}>{c.completos.length}/{c.total} completa{c.parciales.length ? ` · ${c.parciales.length} parcial` : ""}</span>
                                  <span style={{ fontSize: 11.5, color: ds.inkMuted }}>{c.pct} % de las tareas</span>
                                  {faltan.length > 0 && (
                                    <button type="button" onClick={() => setPendientesAbiertos((a) => ({ ...a, [clave]: !a[clave] }))} style={{ fontSize: 11.5, color: ds.accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                                      {abierto ? "Ocultar" : `Ver quién falta (${faltan.length})`}
                                    </button>
                                  )}
                                </div>
                                {abierto && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                    {faltan.map(({ p, e }) => (
                                      <span key={p.id} style={{ fontSize: 11.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "2px 9px" }}>{p.name} · {e}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 6, paddingLeft: 2 }}>
                            <span style={{ fontSize: 11.5, color: ds.inkMuted }}>Para: {etiquetaDestinoSesion(s, players, grupos)}</span>
                            {resumenSesionTarjeta(s).map((r) => (
                              <span key={r.bloque} style={{ fontSize: 10.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "1px 8px" }}>{r.bloque}{r.series ? ` · ${r.series} series` : ` · ${r.n}`}</span>
                            ))}
                            <span style={{ flex: 1 }} />
                            <button type="button" onClick={() => setDiasAbiertos((a) => ({ ...a, [f]: false }))} style={{ fontSize: 11.5, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Cerrar</button>
                            {!pasado && (
                              <select value="" onChange={(e) => { if (e.target.value) lanzarCola([{ fecha: e.target.value, sesion: s }]); }} title="Copiar esta sesión a otro día de la semana" style={{ fontSize: 11.5, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.inkSecondary, padding: "3px 6px", cursor: "pointer" }}>
                                <option value="">Copiar a…</option>
                                {diasSemana.filter((d) => d >= hoy && d !== f).map((d) => <option key={d} value={d}>{etiquetaDiaLarga(d)}</option>)}
                              </select>
                            )}
                            {scope.tipo === "jugador" && !yaEsIndividualDeEsteJugador(s) && (
                              <button onClick={() => personalizarParaJugador(s, scope.jugadorId, f)} style={{ background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "3px 8px", color: ds.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Personalizar solo para {scope.label} →</button>
                            )}
                          </div>
                        </div>
                      ))}
                      {ses.length === 0 && !pasado && !modoPlan && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Sin sesión{scope.tipo !== "equipo" ? ` para ${scope.label}` : ""}.</div>}
                      {ses.length === 0 && pasado && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Sin sesión.</div>}
                      {!pasado && (ses.length === 0 || (diasAbiertos[f] ?? esHoy) || modoPlan) && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {modoPlan ? (
                            <select
                              value={asignadas[f] || ""}
                              onChange={(e) => setAsignadas((a) => { const n = { ...a }; if (e.target.value) n[f] = e.target.value; else delete n[f]; return n; })}
                              style={{ flex: "1 1 260px", background: ds.surfaceRaised, border: `1px dashed ${asignadas[f] ? ds.accent : ds.accentBorderSubtle}`, borderRadius: 10, color: ds.ink, fontSize: 12.5, padding: "8px 10px" }}
                            >
                              <option value="">+ Añadir a la planificación…</option>
                              {opcionesBiblioteca.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                              {asignadas[f] && !idsOpcionesBib.has(asignadas[f]) && <option value={asignadas[f]}>{sesionPorId.get(asignadas[f])?.nombre || "Sesión de la semana anterior"}</option>}
                            </select>
                          ) : (
                            !destinoVacio && (
                              <select value="" onChange={(e) => { if (e.target.value === "__nueva") { nuevaSesionEnFecha(f); return; } const ses2 = sesionPorId.get(e.target.value); if (ses2) lanzarCola([{ fecha: f, sesion: ses2 }]); }} style={{ background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, color: ds.accent, fontSize: 12.5, fontWeight: 600, padding: "6px 10px", cursor: "pointer" }}>
                                <option value="">+ Añadir sesión…</option>
                                <option value="__nueva">✎ Diseñar una nueva</option>
                                {opcionesBiblioteca.length > 0 && <optgroup label="De mi biblioteca">{opcionesBiblioteca.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</optgroup>}
                              </select>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {resultadoCola && <div style={{ marginBottom: 10, fontSize: 13, color: ds.success }}>{resultadoCola}</div>}
            {fallosCola.length > 0 && !cola && <div style={{ marginBottom: 10, fontSize: 12.5, color: ds.danger }}>{fallosCola.join(" · ")}</div>}
            {modoPlan && (
              <div style={{ position: "sticky", bottom: 0, zIndex: 5, background: ds.canvas, padding: "10px 0", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: `1px solid ${ds.border}` }}>
                <button type="button" disabled={!pendientesPlan.length || destinoVacio || !!cola} onClick={() => lanzarCola(pendientesPlan.map((f) => ({ fecha: f, sesion: sesionPorId.get(asignadas[f]), md: mdDe(f) || undefined })))} style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 10, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", opacity: !pendientesPlan.length || destinoVacio || cola ? 0.5 : 1 }}>
                  Publicar semana{pendientesPlan.length ? ` (${pendientesPlan.length} día${pendientesPlan.length === 1 ? "" : "s"})` : ""}
                </button>
                <span style={{ fontSize: 12, color: ds.inkMuted }}>{destinoVacio ? "Este grupo no tiene jugadores activos." : `Para ${scope.label} · cada sesión se publica con la fecha de su día.`}</span>
              </div>
            )}
          </>
        )}

        {vista === "jugadores" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginBottom: 10 }}>
              Quién tiene qué esta semana — {scope.label}. Pulsa un nombre para abrir su semana.
            </div>
            <div style={{ overflowX: "auto", border: `1px solid ${ds.border}`, borderRadius: 14, background: ds.surface }}>
              <div style={{ minWidth: 760 }}>
                <div style={{ display: "grid", gridTemplateColumns: "170px repeat(7, minmax(0, 1fr)) 62px", borderBottom: `1px solid ${ds.border}`, background: ds.surfaceRaised }}>
                  <div style={{ padding: "8px 12px", fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>JUGADOR</div>
                  {diasSemana.map((f, i) => (
                    <div key={f} style={{ padding: "8px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: f === hoy ? ds.accent : ds.inkSecondary }}>
                      {NOMBRES_DIA[i]} {Number(f.slice(8))}
                    </div>
                  ))}
                  <div style={{ padding: "8px 6px", textAlign: "center", fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>CUMPL.</div>
                </div>
                {jugadoresMatriz.length === 0 && <div style={{ padding: 16, fontSize: 13, color: ds.inkMuted }}>No hay jugadores activos en este ámbito.</div>}
                {jugadoresMatriz.map((p) => {
                  const r = resumenJugadorSemana(p);
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "170px repeat(7, minmax(0, 1fr)) 62px", borderBottom: `1px solid ${ds.border}`, alignItems: "stretch" }}>
                      <button type="button" onClick={() => { setScopeId(`j:${p.id}`); setVista("semana"); }} style={{ textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", cursor: "pointer", color: ds.ink, fontSize: 13, fontWeight: 600 }}>
                        {p.name}
                        <span style={{ display: "block", fontSize: 10.5, color: ds.inkMuted, fontWeight: 400 }}>{r.n} sesión{r.n === 1 ? "" : "es"} esta semana</span>
                      </button>
                      {diasSemana.map((f) => {
                        const ses = sesionesDeJugadorEnFecha(p, f);
                        return (
                          <div key={f} style={{ padding: 4, display: "flex", flexDirection: "column", gap: 3, justifyContent: "center", background: f === hoy ? `${ds.accent}0d` : "transparent" }}>
                            {ses.map((x) => {
                              const e = estadoJugadorSesion(x, f, p);
                              const col = e === "hecho" ? ds.success : e === "parcial" ? ds.warning : e === "falta" ? ds.danger : e === "hoy" ? ds.accent : ds.inkMuted;
                              const marca = e === "hecho" ? "✓" : e === "parcial" ? "~" : e === "falta" ? "✕" : "·";
                              return (
                                <button key={x.id} type="button" title={`${x.nombre || "Sesión"} — ${e === "hecho" ? "completada" : e === "parcial" ? "parcial" : e === "falta" ? "sin enviar" : e === "hoy" ? "toca hoy" : "pendiente"}`} onClick={() => { setScopeId(`j:${p.id}`); setVista("semana"); setDiaSel(f); }} style={{ textAlign: "left", fontSize: 10.5, color: col, background: `${col}14`, border: `1px solid ${col}55`, borderRadius: 6, padding: "3px 5px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {marca} {x.nombre || "Sesión"}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: r.pct === null ? ds.inkMuted : r.pct >= 80 ? ds.success : r.pct >= 50 ? ds.warning : ds.danger }}>{r.pct === null ? "—" : `${r.pct} %`}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11.5, color: ds.inkSecondary }}>
              <span style={{ color: ds.success }}>✓ completada</span><span style={{ color: ds.warning }}>~ parcial</span><span style={{ color: ds.danger }}>✕ sin enviar</span><span style={{ color: ds.accent }}>· toca hoy</span><span>· pendiente</span>
            </div>
          </div>
        )}

        {vista === "mes" && (
          <>
        {/* Navegación de mes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => setMesRef((m) => sumarMeses(m, -1))} style={navMesBtnCalendarioStyle} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700 }}>{labelMes(mesRef)}</div>
          <button onClick={() => setMesRef((m) => sumarMeses(m, 1))} style={navMesBtnCalendarioStyle} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        {mesRef !== inicioMes(hoy) && (
          <button
            onClick={() => {
              setMesRef(inicioMes(hoy));
              setDiaSel(hoy);
            }}
            style={{ display: "block", margin: "0 auto 12px", background: "transparent", border: "none", color: ds.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
          >
            Volver a hoy
          </button>
        )}

        {/* Cuadrícula del mes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginBottom: 6 }}>
          {NOMBRES_DIA.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 0" }}>{anchoVentanaCal < 560 ? d[0] : d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginBottom: 18 }}>
          {dias.map((d) => {
            const sesionesDia = sesionesEnFecha(d.fecha);
            const esHoy = d.fecha === hoy;
            const esSel = d.fecha === diaSel;
            const tieneSolicitud = solicitudesEnFecha(d.fecha).length > 0;
            const estrecho = anchoVentanaCal < 560;
            const colorDe = (x) => {
              if (!x.enviada) return ds.inkMuted;
              const c = cumplimientoSesion(x, d.fecha);
              if (!c) return ds.accent;
              return c.pct >= 80 ? ds.success : c.pct >= 50 ? ds.warning : ds.danger;
            };
            return (
              <button
                key={d.fecha}
                onClick={() => { setDiaSel(d.fecha); setLunesRef(inicioSemanaCalendario(d.fecha)); }}
                style={{ position: "relative", minHeight: estrecho ? 54 : 98, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 4, textAlign: "left", borderRadius: 10, padding: estrecho ? 4 : 7, border: esSel ? `1.5px solid ${ds.accent}` : tieneSolicitud ? `1px solid ${ds.warning}` : `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, background: esSel ? ds.accentSubtle : ds.surface, opacity: d.fuera ? 0.35 : 1, color: ds.ink, cursor: "pointer", fontSize: 12 }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: esHoy ? ds.accent : "transparent", color: esHoy ? ds.accentInk : ds.ink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: esHoy ? 800 : 600, fontSize: 12 }}>{d.dayNum}</span>
                  {tieneSolicitud && <span title="Petición de jugador" style={{ width: 7, height: 7, borderRadius: "50%", background: ds.warning }} />}
                </span>
                {estrecho ? (
                  <span style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {sesionesDia.slice(0, 4).map((x) => <span key={x.id} style={{ width: 7, height: 7, borderRadius: "50%", background: colorDe(x) }} />)}
                  </span>
                ) : (
                  <>
                    {sesionesDia.slice(0, 2).map((x) => (
                      <span key={x.id} style={{ fontSize: 10.5, lineHeight: 1.25, color: colorDe(x), background: `${colorDe(x)}14`, border: `1px solid ${colorDe(x)}55`, borderRadius: 5, padding: "2px 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {x.md ? `${x.md} · ` : ""}{x.nombre || "Sesión"}
                      </span>
                    ))}
                    {sesionesDia.length > 2 && <span style={{ fontSize: 10.5, color: ds.inkMuted }}>+{sesionesDia.length - 2} más</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
          </>
        )}

        {/* Panel del día seleccionado (solo en la vista mensual; la semanal ya muestra todo en su fila) */}
        {vista === "mes" && (
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 8, textTransform: "uppercase" }}>
            {fmtDateLabel(diaSel)}
            {diaSel === hoy ? " · hoy" : ""}
            <button type="button" onClick={() => { setLunesRef(inicioSemanaCalendario(diaSel)); setVista("semana"); }} style={{ marginLeft: 12, fontSize: 11.5, color: ds.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>Abrir esta semana →</button>
          </div>
          {solicitudesDiaSel.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {solicitudesDiaSel.map((sol) => (
                <div key={sol.id} style={{ background: `${ds.warning}14`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink }}>{nombreJugadorSolicitud(sol)} pidió sesión</div>
                    {sol.nota && <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>"{sol.nota}"</div>}
                  </div>
                  <DsButton size="sm" onClick={() => disenarParaSolicitud(sol, "sesion")}>
                    Diseñar
                  </DsButton>
                  <button onClick={() => descartarSolicitud(sol)} style={{ background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, padding: "6px 10px", color: ds.inkMuted, fontSize: 11.5, cursor: "pointer" }}>
                    Descartar
                  </button>
                </div>
              ))}
            </div>
          )}
          {sesionesDiaSel.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {sesionesDiaSel.map((s) => (
                <div key={s.id}>
                  <TarjetaSesionReal sesion={s} esHoy={diaSel === hoy} onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} jugadoresConRegistros={jugadoresPorSesion.get(s.id)?.size || 0} />
                  <div style={{ fontSize: 11, color: ds.inkMuted, marginTop: 4, marginLeft: 4 }}>Para: {etiquetaDestinoSesion(s, players, grupos)}</div>
                  {scope.tipo === "jugador" && !yaEsIndividualDeEsteJugador(s) && (
                    <button
                      onClick={() => personalizarParaJugador(s, scope.jugadorId, diaSel)}
                      style={{ marginTop: 6, marginLeft: 4, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: dsR.sm, padding: "5px 10px", color: ds.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      Personalizar solo para {scope.label} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: ds.inkMuted, fontSize: 13, padding: "14px 0", textAlign: "center", border: `1px dashed ${ds.border}`, borderRadius: dsR.md, marginBottom: 14 }}>
              Sin sesión programada este día{scope.tipo !== "equipo" ? ` para ${scope.label}` : ""}.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <DsButton size="sm" onClick={() => nuevaSesionEnFecha(diaSel)}>
              + Diseñar sesión
            </DsButton>
            {diaSel >= hoy && !destinoVacio && (
              <select
                value=""
                onChange={(e) => { const ses = sesionPorId.get(e.target.value); if (ses) lanzarCola([{ fecha: diaSel, sesion: ses }]); }}
                style={{ background: ds.surfaceRaised, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, color: ds.accent, fontSize: 12.5, fontWeight: 600, padding: "6px 10px" }}
              >
                <option value="">+ Sesión de mi biblioteca…</option>
                {opcionesBiblioteca.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            )}
          </div>
        </div>
        )}
      </div>
      {cola && actualCola && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: ds.bgElevated, color: ds.ink, border: `1px solid ${ds.border}`, borderRadius: 12, padding: "18px 22px", minWidth: 260, textAlign: "center" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Publicando…</div>
              <div style={{ fontSize: 13, color: ds.inkSecondary }}>Día {idxCola + 1} de {cola.length} · {etiquetaDiaLarga(actualCola.fecha)}</div>
            </div>
          </div>
          <div style={{ display: "none" }}>
            <DisenoSesionReal
              key={actualCola.fecha}
              plantilla={actualCola.sesion}
              fechasSugeridas={[actualCola.fecha]}
              destinatariosSugeridos={destinoScope}
              forzarDestino
              sinProgresion
              autoEnviar
              mdForzado={actualCola.md}
              onBack={() => {}}
              onFallo={(msg) => { setFallosCola((f) => [...f, `${etiquetaDiaLarga(actualCola.fecha)}: ${msg}`]); siguienteCola(true); }}
              onGuardado={() => siguienteCola(false)}
            />
          </div>
        </>
      )}
    </PantallaEntrenadorAncha>
  );
}

// ---------- PANTALLA DEL JUGADOR (calcado de pantalla-jugador.jsx) ----------

// Chip pequeño de selección (banda elástica, corporal/asistencia/lastre,
// elegir material, completo/parcial en Resistencia) — no existe como
// componente en ui-components.jsx, así que se resuelve aquí mismo con los
// mismos tokens del sistema nuevo (ds.*) en vez de hex sueltos, para que
// visualmente sea parte de la misma familia que Button/Badge/Toggle.
function ChipSeleccionableReal({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 10.5,
        padding: "6px 9px",
        borderRadius: dsR.sm,
        border: `1px solid ${activo ? ds.accent : ds.border}`,
        background: activo ? ds.accentSubtle : "transparent",
        color: activo ? ds.accent : ds.inkSecondary,
        cursor: "pointer",
        fontFamily: dsF.sans,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function EtiquetaCampoReal({ children, color }) {
  return (
    <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: color || ds.inkMuted, letterSpacing: "0.02em" }}>{children}</span>
  );
}

// Texto de una línea con lo registrado, para cuando la tarea ya está
// marcada como hecha — sustituye a los campos editables, que no aportan
// nada una vez rellenados y solo dan sensación de formulario a medias.
function resumenRegistroReal(tarea, registro) {
  if (tarea.esResistencia) {
    return registro.subtipo === "parcial" ? `Hizo menos: ${registro.carga || "sin detalle"}` : "Cumplido completo";
  }
  if (tarea.esCmj) {
    return registro.carga !== "" && registro.carga != null ? `${registro.carga} cm` : "Registrado";
  }
  if (tarea.esCore || tarea.esElastica) return "Hecho";
  const partes = [];
  if (registro.reps !== "" && registro.reps != null) partes.push(`${registro.reps} ${tarea.unidad || "reps"}`);
  if (registro.carga !== "" && registro.carga != null) {
    partes.push(registro.subtipo === "asistencia" ? `banda ${registro.carga}` : `${registro.carga}kg`);
  }
  if (registro.rir !== "" && registro.rir != null) partes.push(`RIR ${registro.rir}`);
  return partes.length ? partes.join(" · ") : "Registrado";
}

function TareaCardReal({ tarea, hecho, onToggle, registro, onCambiarRegistro, onAmpliarGif, orden, mostrarRegistro = true, esRecordNuevo = false }) {
  const videoEfectivo = videoEfectivoTarea(tarea, registro);
  const [expandido, setExpandido] = useState(false);
  // Con la tarea ya hecha, los campos de registro se colapsan en una línea
  // de resumen — verlos vacíos otra vez, ya rellenados, es lo que hacía que
  // una sesión a medio hacer pareciera siempre un formulario sin terminar.
  // Mientras no está hecha, el formulario solo se ve si tocas la tarjeta
  // para desplegarla — colapsada, la tarjeta es solo nombre + meta + check.
  // El CMJ ya no se despliega para editar nada: la altura ya no la
  // introduce el jugador (viene del CSV que sube el entrenador), así que no
  // hay campo que rellenar — solo queda marcarla como hecha cuando la haga.
  const puedeDesplegar = mostrarRegistro && !hecho && !tarea.esCmj && !tarea.esCore && !tarea.esElastica;
  const mostrarFormulario = puedeDesplegar && expandido;
  return (
    <DsCard
      status={hecho ? "done" : "default"}
      style={{
        padding: 14,
        gap: 12,
        borderRadius: dsR.xl,
        // P6: la tarea donde se acaba de superar el récord se queda con un
        // halo dorado persistente, no solo el toast puntual del momento en
        // que se guarda — así el jugador ve el logro también si vuelve a
        // esta pantalla más tarde en la misma sesión.
        borderColor: esRecordNuevo ? ds.accent : hecho ? ds.successBorderSubtle : "transparent",
        background: esRecordNuevo ? `${ds.accent}1A` : undefined,
        boxShadow: dsSh.elevation2,
      }}
    >
      <div
        onClick={() => puedeDesplegar && setExpandido((v) => !v)}
        style={{ display: "flex", gap: 11, alignItems: "center", cursor: puedeDesplegar ? "pointer" : "default" }}
      >
        {orden != null && (
          <span style={{ width: 19, height: 19, borderRadius: dsR.full, background: ds.bgElevated, color: ds.accent, fontFamily: dsF.mono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        {videoEfectivo ? (
          <div onClick={(e) => { e.stopPropagation(); onAmpliarGif(); }} style={{ position: "relative", width: 44, height: 44, borderRadius: dsR.md, flexShrink: 0, cursor: "pointer", background: ds.bgElevated, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {miniaturaTarea(videoEfectivo) && (
              <img src={miniaturaTarea(videoEfectivo)} alt={`Demostración: ${tarea.nombre}`} style={{ width: 44, height: 44, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
            )}
            {(extractYouTubeId(videoEfectivo) || esVideoDirecto(videoEfectivo)) && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(videoEfectivo) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
                <Play size={14} color={miniaturaTarea(videoEfectivo) ? "#fff" : ds.accent} fill={miniaturaTarea(videoEfectivo) ? "#fff" : ds.accent} />
              </div>
            )}
          </div>
        ) : tarea.eligeEquipo ? (
          <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkMuted, fontSize: 7, fontFamily: dsF.mono, textAlign: "center", lineHeight: 1.2, padding: 3 }}>
            MATERIAL
          </div>
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkMuted, fontSize: 8.5, fontFamily: dsF.mono }}>
            VÍDEO
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tarea.esResistencia ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
              <div style={{ fontFamily: dsF.mono, fontSize: 11.5, color: hecho ? ds.success : ds.inkSecondary, marginTop: 3, fontWeight: hecho ? 700 : 400 }}>
                {hecho ? (
                  resumenRegistroReal(tarea, registro)
                ) : (
                  <>
                    {tarea.objetivoResistencia}
                    {/* Lo que el jugador ejecuta, "masticado" a partir del %:
                        un ritmo o un pulso (o nada, si el campo ya es RPE) —
                        mismo patrón visual "· <b>...</b>" que ya usa RIR en
                        el resto de tareas (ver más abajo). */}
                    {tarea.objetivoJugadorResistencia && (
                      <span style={{ color: ds.accent, fontWeight: 700 }}> · {tarea.objetivoJugadorResistencia}</span>
                    )}
                  </>
                )}
              </div>
            </>
          ) : tarea.esCmj ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
              <div style={{ fontFamily: hecho ? dsF.mono : dsF.sans, fontSize: hecho ? 11.5 : 11, fontWeight: hecho ? 700 : 400, color: hecho ? ds.success : ds.inkMuted, marginTop: 3 }}>
                {hecho
                  ? resumenRegistroReal(tarea, registro)
                  : tarea.referenciaCmj
                  ? `Último salto ${tarea.referenciaCmj.altura} cm${tarea.referenciaCmj.md ? ` (${tarea.referenciaCmj.md})` : ""}`
                  : "Sin registro previo"}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
                {esRecordNuevo && (
                  <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.accentInk, background: ds.accent, borderRadius: 4, padding: "1.5px 5px" }}>
                    RÉCORD
                  </span>
                )}
                {tarea.mostrarLateralidad !== false && (
                  <DsBadge tone={tarea.unilateral ? "accent" : "neutral"}>{tarea.unilateral ? "Unilateral" : "Bilateral"}</DsBadge>
                )}
              </div>
              {hecho && mostrarRegistro ? (
                <div style={{ fontFamily: dsF.mono, fontSize: 12, color: ds.success, marginTop: 3, fontWeight: 700 }}>{resumenRegistroReal(tarea, registro)}</div>
              ) : (
                <div style={{ fontFamily: dsF.mono, fontSize: 12, color: ds.inkSecondary, marginTop: 3 }}>
                  {tarea.series ? `${tarea.series} × ` : ""}
                  {tarea.cantidad} {tarea.unidad}
                  {tarea.unilateral ? " · cada lado" : ""}
                  {tarea.modoCarga === "pct1rm" && tarea.pct1rmObjetivo != null ? (
                    <span style={{ color: ds.accent, fontWeight: 700 }}> · {tarea.pct1rmObjetivo}% 1RM</span>
                  ) : (
                    tarea.rirObjetivo != null && <span style={{ color: ds.accent, fontWeight: 700 }}> · RIR {tarea.rirObjetivo}</span>
                  )}
                  {/* En modo %1RM la carga sugerida ES el objetivo a levantar, no
                      un dato secundario — se ve directamente sin desplegar la
                      tarjeta, a diferencia de la referencia por RIR. Con
                      material a elegir (p. ej. Barra o Multipower) la
                      sugerencia depende de cuál elijas — igual que en modo
                      RIR, hace falta desplegar para verla. */}
                  {tarea.modoCarga === "pct1rm" && !tarea.eligeEquipo && tarea.cargaSugeridaPct1rm != null && (
                    <div style={{ color: ds.ink, fontWeight: 700, marginTop: 2 }}>Carga recomendada: ~{tarea.cargaSugeridaPct1rm} kg</div>
                  )}
                  {tarea.modoCarga === "pct1rm" && !tarea.eligeEquipo && tarea.pct1rmObjetivo != null && tarea.cargaSugeridaPct1rm == null && (
                    <div style={{ color: ds.inkMuted, marginTop: 2 }}>Sin datos suficientes para estimar tu 1RM todavía</div>
                  )}
                  {/* Referencia/carga sugerida en modo RIR: antes solo se veía
                      al desplegar la tarjeta — se repite aquí colapsada (igual
                      que ya pasa con %1RM arriba) para los casos sin elección
                      de material, que son la mayoría. Con material a elegir
                      sigue haciendo falta desplegar, porque la referencia
                      depende de cuál elijas. */}
                  {tarea.modoCarga !== "pct1rm" && !tarea.eligeEquipo && tarea.cargaSugerida != null && (
                    <div style={{ color: ds.accent, fontWeight: 700, marginTop: 2 }}>Carga recomendada: ~{tarea.cargaSugerida} kg</div>
                  )}
                  {tarea.modoCarga !== "pct1rm" && !tarea.eligeEquipo && tarea.referencia && (
                    <div style={{ color: ds.inkMuted, marginTop: 2, fontWeight: 400 }}>
                      {tarea.referenciaMismoDiseno ? "Última vez" : "Tu referencia más reciente"}: {tarea.referencia}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {puedeDesplegar && (
          <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: expandido ? ds.accent : ds.inkMuted, transition: "color 140ms ease-out" }}>
            <Pencil size={13} />
          </span>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <DsToggle on={hecho} onClick={tarea.eligeEquipo && !hecho && !(registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo)) ? () => setExpandido(true) : onToggle} label={`Marcar "${tarea.nombre}" como hecha`} />
        </div>
      </div>
      {mostrarFormulario && !tarea.esResistencia && !tarea.esCmj && (() => {
        // Si no hay marca con este mismo diseño (reps/RIR), se muestra
        // igualmente la más reciente con otro diseño, dejándolo claro, en
        // vez de "sin registro" solo porque cambió el RIR — y, en ese caso,
        // una carga sugerida para el diseño de hoy (ver calcularCargaSugerida).
        const subtipoEquipoValido = tarea.eligeEquipo && registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo);
        const referenciaTexto = tarea.eligeEquipo ? (subtipoEquipoValido ? tarea.referenciasPorEquipo?.[registro.subtipo] : null) : tarea.referencia;
        const mismoDiseno = tarea.eligeEquipo ? tarea.referenciasPorEquipoMismoDiseno?.[registro.subtipo] : tarea.referenciaMismoDiseno;
        // En modo %1RM la "carga recomendada" sale del e1RM estimado
        // (ejercicio+equipo, ver mejorE1rmPorClave); en modo RIR, del RTF de
        // la última marca. Multipower y Barra no comparten sugerencia — cada
        // equipo lleva la suya.
        const cargaSugerida =
          tarea.modoCarga === "pct1rm"
            ? tarea.eligeEquipo
              ? tarea.cargasSugeridasPct1rmPorEquipo?.[registro.subtipo]
              : tarea.cargaSugeridaPct1rm
            : tarea.eligeEquipo
            ? tarea.cargasSugeridasPorEquipo?.[registro.subtipo]
            : tarea.cargaSugerida;
        const sufijoEquipo = tarea.eligeEquipo ? ` (${registro.subtipo})` : "";
        return (
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginLeft: 55, display: "flex", flexDirection: "column", gap: 2 }}>
            <div>
              {tarea.eligeEquipo && !subtipoEquipoValido
                ? "Elige qué material vas a utilizar"
                : referenciaTexto
                ? `${mismoDiseno ? "Última vez" : "Tu referencia más reciente"}${sufijoEquipo}: ${referenciaTexto}`
                : tarea.eligeEquipo
                ? `Sin registro previo con ${registro.subtipo}`
                : "Sin registro previo"}
            </div>
            {cargaSugerida != null ? (
              <div style={{ color: ds.accent, fontWeight: 600 }}>Carga recomendada: ~{cargaSugerida} kg</div>
            ) : (
              tarea.modoCarga === "pct1rm" &&
              tarea.pct1rmObjetivo != null &&
              (!tarea.eligeEquipo || subtipoEquipoValido) && (
                <div style={{ color: ds.accent }}>Aún no tengo datos para calcular tu carga{sufijoEquipo}: elige una con la que hagas las repeticiones pautadas y anota reps y RIR.</div>
              )
            )}
          </div>
        );
      })()}
      {tarea.eligeEquipo && !hecho && mostrarRegistro ? (
        <div style={{ marginLeft: 55, display: "flex", flexDirection: "column", gap: 5 }}>
          <EtiquetaCampoReal color={registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo) ? ds.inkMuted : ds.accent}>¿QUÉ MATERIAL VAS A UTILIZAR?</EtiquetaCampoReal>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(tarea.equiposElegibles || []).map((op) => (
              <ChipSeleccionableReal key={op} activo={registro.subtipo === op} onClick={() => onCambiarRegistro({ ...registro, subtipo: op })}>
                {op}
              </ChipSeleccionableReal>
            ))}
          </div>
        </div>
      ) : (
        tarea.materiales && tarea.materiales.length > 0 && (
          <div style={{ marginLeft: 55, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(tarea.eligeEquipo && registro.subtipo ? [registro.subtipo] : tarea.materiales).map((m) => (
              <DsBadge key={m} tone="accent">{m}</DsBadge>
            ))}
          </div>
        )
      )}
      {tarea.nota && (
        <div style={{ marginLeft: 55, display: "flex", gap: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
          <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={12} /></span>
          <span style={{ fontSize: 12, color: ds.inkSecondary, lineHeight: 1.4 }}>{tarea.nota}</span>
        </div>
      )}
      {mostrarFormulario && tarea.esResistencia && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 55 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "completo", label: "Cumplido completo" },
              { v: "parcial", label: "Hice menos" },
            ].map((op) => (
              <ChipSeleccionableReal key={op.v} activo={(registro.subtipo || "completo") === op.v} onClick={() => onCambiarRegistro({ ...registro, subtipo: op.v })}>
                {op.label}
              </ChipSeleccionableReal>
            ))}
          </div>
          {registro.subtipo === "parcial" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <EtiquetaCampoReal>¿CUÁNTO HAS HECHO?</EtiquetaCampoReal>
              <DsInput
                value={registro.carga}
                onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
                placeholder="ej. 2 de 3 series, 8 min..."
                style={{ padding: "9px 11px", fontSize: 13 }}
              />
            </label>
          )}
        </div>
      )}
      {mostrarFormulario && !tarea.esResistencia && !tarea.esCmj && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 55 }}>
          {tarea.esCorporal && (
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "", label: "Corporal" },
                { v: "asistencia", label: "Con asistencia" },
                { v: "lastre", label: "Con lastre" },
              ].map((op) => (
                <ChipSeleccionableReal key={op.v || "corporal"} activo={(registro.subtipo || "") === op.v} onClick={() => onCambiarRegistro({ ...registro, subtipo: op.v, carga: "" })}>
                  {op.label}
                </ChipSeleccionableReal>
              ))}
            </div>
          )}
          {(tarea.equipoUnico === "Multipower" || (tarea.eligeEquipo && registro.subtipo === "Multipower")) && (
            // Convención fija: en multipower se registran SOLO los discos que
            // se añaden (el peso de la barra guiada varía de máquina a
            // máquina y muchas veces ni se sabe, así que no cuenta); en barra
            // libre sí se cuenta el peso de la barra además de los discos. Al
            // no ser la misma magnitud, multipower y barra libre del mismo
            // ejercicio se tratan como dos tareas distintas a efectos de
            // progreso — ver equipo en registrosPorEjercicio/mejorE1rmPorClave.
            <div style={{ fontSize: 11, color: ds.inkMuted, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 12px", lineHeight: 1.4 }}>
              💡 En multipower registra <b style={{ color: ds.ink }}>solo el peso de los discos</b> que añades, sin contar la barra de la máquina (a diferencia de la barra libre, donde sí cuenta el peso de la barra). Tu progreso en multipower se sigue aparte del de barra libre.
            </div>
          )}
          <div style={{ background: ds.bgElevated, borderRadius: dsR.lg, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <EtiquetaCampoReal>Registra tu carga máxima del día</EtiquetaCampoReal>
            <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                <EtiquetaCampoReal>{(tarea.unidad || "reps").toUpperCase()}</EtiquetaCampoReal>
                <input
                  value={registro.reps}
                  onChange={(e) => onCambiarRegistro({ ...registro, reps: e.target.value })}
                  placeholder="—"
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.border}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                />
              </label>
              <div style={{ width: 1, background: ds.border, margin: "0 12px" }} />
            {registro.subtipo === "asistencia" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1.3 }}>
                <EtiquetaCampoReal>BANDA</EtiquetaCampoReal>
                <div style={{ display: "flex", gap: 5, paddingTop: 4 }}>
                  {["Ligera", "Media", "Dura"].map((r) => (
                    <ChipSeleccionableReal key={r} activo={registro.carga === r} onClick={() => onCambiarRegistro({ ...registro, carga: r })}>
                      {r}
                    </ChipSeleccionableReal>
                  ))}
                </div>
              </label>
            ) : tarea.esCorporal && registro.subtipo === "" ? (
              <div style={{ flex: 1.3 }} />
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1.3 }}>
                <EtiquetaCampoReal>
                  {registro.subtipo === "lastre"
                    ? "KG LASTRE"
                    : tarea.eligeEquipo
                    ? registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo)
                      ? `KG (${registro.subtipo.toUpperCase()})`
                      : "CARGA KG"
                    : tarea.equipoUnico
                    ? `KG (${tarea.equipoUnico.toUpperCase()})`
                    : "CARGA KG"}
                </EtiquetaCampoReal>
                <input
                  value={registro.carga}
                  onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
                  placeholder="—"
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.accent}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                />
              </label>
            )}
              {(tarea.pideRir !== false || necesitaCalibrarE1rm(tarea, registro)) && (
                <>
                  <div style={{ width: 1, background: ds.border, margin: "0 12px" }} />
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <EtiquetaCampoReal>{necesitaCalibrarE1rm(tarea, registro) ? "RIR *" : "RIR"}</EtiquetaCampoReal>
                    <input
                      value={registro.rir}
                      onChange={(e) => onCambiarRegistro({ ...registro, rir: e.target.value })}
                      placeholder="—"
                      style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.border}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                    />
                  </label>
                </>
              )}
            </div>
            {(() => {
              const pautadas = Number(tarea.series);
              if (!Number.isFinite(pautadas) || pautadas < 1 || pautadas > 8) return null;
              const elegidas = registro.series !== "" && registro.series != null ? Number(registro.series) : pautadas;
              const opciones = Array.from({ length: Math.min(pautadas + 2, 10) }, (_, i) => i + 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <EtiquetaCampoReal>SERIES HECHAS (PAUTADAS: {pautadas})</EtiquetaCampoReal>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {opciones.map((n) => (
                      <ChipSeleccionableReal key={n} activo={elegidas === n} onClick={() => onCambiarRegistro({ ...registro, series: n })}>
                        {n}
                      </ChipSeleccionableReal>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: ds.inkMuted }}>Solo toca un número si hiciste más o menos series de las pautadas.</div>
                </div>
              );
            })()}
            {necesitaCalibrarE1rm(tarea, registro) && (
              <div style={{ fontSize: 11, color: ds.accent, lineHeight: 1.4 }}>
                * Es la primera vez con este ejercicio: anota reps y RIR (cuántas repeticiones te quedaban antes del fallo). Con eso la app calcula tu 1RM estimado y, la próxima vez, te recomienda la carga.
              </div>
            )}
            {tarea.pideRir === false && !necesitaCalibrarE1rm(tarea, registro) && (
              // Carga ligera (<65% 1RM): a esa intensidad el RIR autopercibido
              // pierde fiabilidad, así que no se le pide al jugador. La carga
              // sugerida ya viene calculada a partir de su 1RM estimado.
              <div style={{ fontSize: 11, color: ds.inkMuted }}>Carga ligera: no hace falta indicar RIR</div>
            )}
          </div>
        </div>
      )}
    </DsCard>
  );
}

function CircuitoJugadorReal({ tareas, rondas = 1, nombreGrupo = "", esGrupo = false, hechoDraft, onToggle, getRegistro, onCambiarRegistro, onAmpliarGif, mostrarRegistro = true }) {
  return (
    <div style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.xl, padding: 14, display: "flex", flexDirection: "column", gap: 12, background: `${ds.surface}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 2 }}>
        {esGrupo ? (
          // Grupo: solo organiza las tareas bajo un título, no es un
          // circuito con rondas — sin badge de rondas ni "seguir orden".
          <span style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>{nombreGrupo || "Grupo"}</span>
        ) : (
          <>
            <DsBadge tone="accent">{nombreGrupo ? `CIRCUITO · ${nombreGrupo.toUpperCase()}` : "CIRCUITO"}</DsBadge>
            <span style={{ fontSize: 11, color: ds.inkMuted }}>seguir orden</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: dsF.mono,
                fontSize: 11,
                fontWeight: 700,
                color: ds.accent,
                background: ds.accentSubtle,
                border: `1px solid ${ds.accentBorderSubtle}`,
                borderRadius: dsR.sm,
                padding: "3px 8px",
              }}
            >
              {rondas} {rondas === 1 ? "RONDA" : "RONDAS"}
            </span>
          </>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tareas.map((t, i) => (
          <TareaCardReal
            key={t.id}
            tarea={t}
            orden={i + 1}
            hecho={!!hechoDraft[t.id]}
            onToggle={() => onToggle(t)}
            registro={getRegistro(t.id)}
            onCambiarRegistro={(val) => onCambiarRegistro(t.id, val)}
            onAmpliarGif={() => {
              const v = videoEfectivoTarea(t, getRegistro(t.id));
              if (v) onAmpliarGif(v);
            }}
            mostrarRegistro={mostrarRegistro}
          />
        ))}
      </div>
    </div>
  );
}

// Barra de navegación inferior del jugador — flotante, separada de los tres
// bordes (no incrustada a ras de pantalla), con esquinas redondeadas y
// sombra, y un resalte redondeado detrás del icono activo — igual que la
// referencia (My Jump Lab) que enseñó David, no la versión "a ras" de la
// primera pasada. Solo se usa dentro de PantallaJugadorReal — no toca
// PantallaBase ni ninguna pantalla de entrenador.
//
// Adaptación a iOS: el margen inferior sale de env(safe-area-inset-bottom)
// para no quedar tapada por (ni pegada a) la barra de gestos del home de
// iPhone. Esto SOLO funciona si el <meta name="viewport"> de index.html
// incluye viewport-fit=cover — si no lo tiene, env() siempre devuelve 0 y la
// barra se ve bien mientras no revisemos ese archivo aparte (no vive en
// App.jsx, lo edita David directamente). El wrapper exterior no bloquea
// toques fuera de la píldora (pointerEvents: "none", solo la píldora en sí
// los recibe) para no interferir con el contenido de detrás.
const PLAYER_TAB_ICONS = { dashboard: Home, calendario: Calendar, progreso: TrendingUp, cmj: Activity };

function BarraInferiorJugadorReal({ tabs, active, onChange }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px calc(16px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 420,
          display: "flex",
          background: ds.bgElevated,
          border: `1px solid ${ds.border}`,
          borderRadius: 26,
          boxShadow: dsSh.elevation3,
          padding: 6,
        }}
      >
        {tabs.map((t) => {
          const Icono = PLAYER_TAB_ICONS[t.id];
          const activo = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={activo ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: activo ? ds.accentSubtle : "transparent",
                border: "none",
                borderRadius: 20,
                padding: "8px 4px 7px",
                color: activo ? ds.accent : ds.inkMuted,
                cursor: "pointer",
              }}
            >
              {Icono && <Icono size={19} strokeWidth={activo ? 2.4 : 2} />}
              <span style={{ fontSize: 10, fontWeight: activo ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Calendario del jugador (Fase 6): SOLO marcador de estado por día, nunca
// contenido (ejercicios, series, cargas) — esa es la regla que pediste:
// aunque el entrenador programe con antelación, el jugador solo ve el
// contenido completo el día exacto en que está programado (eso ya lo hace
// el Dashboard/"Ver sesión"), y aquí, en su calendario, ni los días pasados
// ni los futuros revelan qué había o qué hay — solo si hubo/hay sesión y,
// para los pasados, si quedó completada.
function CalendarioJugadorReal({ player, hoy, fechasAsignadasJugador, fechasConRegistro, rachaSemanas, onVerSesionHoy, onExit, tabs, onChangeTab }) {
  const [mesRef, setMesRef] = useState(inicioMes(hoy));
  const [diaSel, setDiaSel] = useState(hoy);
  const dias = generarCuadriculaMes(mesRef);

  // Peticiones de este jugador ("Pedir sesión para este día") — solo dentro
  // de la app, sin push ni email (ver sql/add_solicitudes_sesion.sql). En
  // cuanto ese día pasa a tener sesión de verdad (fechasAsignadasJugador ya
  // no depende de esta tabla), la petición deja de estar "pendiente" a
  // efectos prácticos sin que haga falta tocarla — por eso aquí solo se
  // muestra como "pedida" un día que TODAVÍA no tiene sesión.
  const [solicitudes, saveSolicitudes, solicitudesLoaded] = useEntityList("solicitudesSesion", { jugador_id: player.id });
  const [notaPeticion, setNotaPeticion] = useState("");
  const [pidiendo, setPidiendo] = useState(false);
  const [errorPeticion, setErrorPeticion] = useState("");
  // Selección de varios días a la vez — "Seleccionar varios días" pone la
  // cuadrícula en modo selección (tocar un día lo marca/desmarca en vez de
  // abrir su detalle) y al pedir se crea una petición por cada día elegido.
  const [modoMultiple, setModoMultiple] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);

  const solicitudPendientePara = (fecha) => solicitudes.find((s) => s.fecha === fecha && s.estado === "pendiente");

  const estadoDia = (fecha) => {
    const pautado = fechasAsignadasJugador(fecha, fecha).length > 0;
    if (!pautado) return solicitudPendientePara(fecha) ? "pedida" : "sin-sesion";
    if (fecha === hoy) return "hoy";
    if (fecha > hoy) return "futuro";
    return fechasConRegistro.has(fecha) ? "cumplido" : "pendiente";
  };

  const pedirSesion = async () => {
    setErrorPeticion("");
    setPidiendo(true);
    const ok = await saveSolicitudes([...solicitudes, { jugador_id: player.id, fecha: diaSel, nota: notaPeticion.trim(), estado: "pendiente" }]);
    setPidiendo(false);
    if (ok) setNotaPeticion("");
    else setErrorPeticion("No se pudo enviar la petición. Comprueba tu conexión e inténtalo de nuevo.");
  };
  const cancelarPeticion = async (sol) => {
    setErrorPeticion("");
    const ok = await saveSolicitudes(solicitudes.filter((s) => s.id !== sol.id));
    if (!ok) setErrorPeticion("No se pudo cancelar la petición. Inténtalo de nuevo.");
  };
  const toggleDiaSeleccionado = (fecha) => {
    setDiasSeleccionados((prev) => (prev.includes(fecha) ? prev.filter((f) => f !== fecha) : [...prev, fecha]));
  };
  const pedirVariosDias = async () => {
    if (!diasSeleccionados.length) return;
    setErrorPeticion("");
    setPidiendo(true);
    const nuevas = diasSeleccionados.map((fecha) => ({ jugador_id: player.id, fecha, nota: notaPeticion.trim(), estado: "pendiente" }));
    const ok = await saveSolicitudes([...solicitudes, ...nuevas]);
    setPidiendo(false);
    if (ok) {
      setNotaPeticion("");
      setDiasSeleccionados([]);
      setModoMultiple(false);
    } else {
      setErrorPeticion("No se pudo enviar la petición. Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  // Estadísticas del mes visible: cuántos días de ESTE mes tenía sesión
  // pautada, y en qué quedaron — mismo criterio de "cumplido" que el resto
  // de la app (fechasConRegistro), no un cálculo nuevo.
  const diasDelMes = dias.filter((d) => !d.fuera);
  let completadas = 0,
    noCompletadas = 0,
    proximas = 0;
  diasDelMes.forEach((d) => {
    const e = estadoDia(d.fecha);
    if (e === "cumplido") completadas++;
    else if (e === "pendiente") noCompletadas++;
    else if (e === "futuro" || e === "hoy") proximas++;
  });

  const colorEstado = { hoy: ds.accent, cumplido: ds.success, pendiente: ds.danger, futuro: ds.inkSecondary, pedida: ds.warning, "sin-sesion": null };
  const estadoSel = estadoDia(diaSel);
  const solicitudSel = solicitudPendientePara(diaSel);

  return (
    <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{player.name}</div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Calendario</h1>
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: dsF.display, fontSize: 18, fontWeight: 700, color: ds.success }}>{completadas}</div>
              <div style={{ fontFamily: dsF.mono, fontSize: 8.5, color: ds.inkMuted, marginTop: 2, letterSpacing: "0.04em" }}>COMPLETADAS</div>
            </div>
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: dsF.display, fontSize: 18, fontWeight: 700, color: noCompletadas > 0 ? ds.danger : ds.inkSecondary }}>{noCompletadas}</div>
              <div style={{ fontFamily: dsF.mono, fontSize: 8.5, color: ds.inkMuted, marginTop: 2, letterSpacing: "0.04em" }}>NO COMPLETADAS</div>
            </div>
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: dsF.display, fontSize: 18, fontWeight: 700, color: ds.accent }}>{proximas}</div>
              <div style={{ fontFamily: dsF.mono, fontSize: 8.5, color: ds.inkMuted, marginTop: 2, letterSpacing: "0.04em" }}>PRÓXIMAS</div>
            </div>
          </div>

          {rachaSemanas > 0 && (
            <div style={{ marginTop: 10, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "8px 12px", fontSize: 11.5, color: ds.accent, fontWeight: 600, textAlign: "center" }}>
              🔥 Racha de {rachaSemanas} {rachaSemanas === 1 ? "semana" : "semanas"} cumpliendo tu plan
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 }}>
            <button onClick={() => setMesRef((m) => sumarMeses(m, -1))} style={navMesBtnCalendarioStyle} aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700 }}>{labelMes(mesRef)}</div>
            <button onClick={() => setMesRef((m) => sumarMeses(m, 1))} style={navMesBtnCalendarioStyle} aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              onClick={() => {
                setModoMultiple((v) => !v);
                setDiasSeleccionados([]);
              }}
              style={{
                background: modoMultiple ? ds.accentSubtle : "transparent",
                border: `1px solid ${modoMultiple ? ds.accentBorderSubtle : ds.border}`,
                borderRadius: dsR.sm,
                padding: "5px 10px",
                color: modoMultiple ? ds.accent : ds.inkSecondary,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {modoMultiple ? "Cancelar selección" : "Pedir varios días a la vez"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, padding: "2px 0" }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 16 }}>
            {dias.map((d) => {
              const e = estadoDia(d.fecha);
              const elegible = !d.fuera && d.fecha >= hoy && e === "sin-sesion";
              const marcado = modoMultiple && diasSeleccionados.includes(d.fecha);
              const esSel = !modoMultiple && d.fecha === diaSel;
              const color = colorEstado[e];
              return (
                <button
                  key={d.fecha}
                  onClick={() => (modoMultiple ? elegible && toggleDiaSeleccionado(d.fecha) : setDiaSel(d.fecha))}
                  disabled={modoMultiple && !elegible}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    borderRadius: dsR.md,
                    border: marcado ? `1.5px solid ${ds.accent}` : esSel ? `1.5px solid ${ds.accent}` : e === "hoy" ? `1px solid ${ds.accentBorderSubtle}` : "1px solid transparent",
                    background: marcado ? ds.accentSubtle : esSel ? ds.accentSubtle : ds.surface,
                    opacity: d.fuera ? 0.3 : modoMultiple && !elegible ? 0.35 : 1,
                    color: ds.ink,
                    cursor: modoMultiple && !elegible ? "default" : "pointer",
                    fontSize: 11,
                    fontWeight: e === "hoy" ? 800 : 500,
                  }}
                >
                  <span>{marcado ? "✓" : d.dayNum}</span>
                  {!marcado && <span style={{ width: 5, height: 5, borderRadius: dsR.full, background: color || "transparent" }} />}
                </button>
              );
            })}
          </div>

          {modoMultiple && (
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>
                {diasSeleccionados.length === 0 ? "Toca los días para los que quieres pedir sesión" : `${diasSeleccionados.length} día${diasSeleccionados.length === 1 ? "" : "s"} seleccionado${diasSeleccionados.length === 1 ? "" : "s"}`}
              </div>
              {diasSeleccionados.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {diasSeleccionados
                    .slice()
                    .sort()
                    .map((f) => (
                      <span key={f} style={{ display: "flex", alignItems: "center", gap: 5, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.sm, padding: "3px 4px 3px 8px", fontSize: 11, color: ds.accent, fontWeight: 600 }}>
                        {fmtDateShort(f)}
                        <button onClick={() => toggleDiaSeleccionado(f)} style={{ background: "transparent", border: "none", color: ds.accent, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 2 }} aria-label={`Quitar ${f}`}>
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}
              <textarea
                value={notaPeticion}
                onChange={(e) => setNotaPeticion(e.target.value)}
                placeholder="Opcional: cuéntale qué te gustaría trabajar esos días..."
                style={{ width: "100%", minHeight: 50, resize: "vertical", background: ds.canvas, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "9px 11px", color: ds.ink, fontFamily: dsF.sans, fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
              {errorPeticion && <div style={{ color: ds.danger, fontSize: 11.5, marginTop: 6 }}>{errorPeticion}</div>}
              <DsButton disabled={!diasSeleccionados.length || pidiendo} onClick={pedirVariosDias} style={{ width: "100%", marginTop: 8 }}>
                {pidiendo ? "Enviando..." : diasSeleccionados.length ? `Pedir sesión para ${diasSeleccionados.length} día${diasSeleccionados.length === 1 ? "" : "s"}` : "Pedir sesión"}
              </DsButton>
            </div>
          )}

          {/* Detalle del día seleccionado — SIEMPRE solo marcador, nunca el
              contenido (ejercicios/series/cargas). El único sitio donde se ve
              contenido de verdad es "Ver mi sesión de hoy", y solo el día en
              que toca. Se oculta en modo selección múltiple, que usa su
              propio panel (arriba). */}
          {!modoMultiple && (
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, textTransform: "capitalize" }}>{fmtDateLabel(diaSel)}</span>
                {estadoSel === "hoy" && <DsBadge tone="accent">HOY</DsBadge>}
                {estadoSel === "cumplido" && <DsBadge tone="success">Completada</DsBadge>}
                {estadoSel === "pendiente" && <DsBadge tone="danger">No completada</DsBadge>}
                {estadoSel === "futuro" && <DsBadge>Programada</DsBadge>}
                {estadoSel === "pedida" && <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.warning, border: `1px solid ${ds.warning}55`, borderRadius: 4, padding: "1px 6px" }}>PEDIDA</span>}
              </div>
              {estadoSel === "hoy" && (
                <>
                  <div style={{ fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.5 }}>Aquí es donde ves el detalle completo — ejercicios, series y vídeo — igual que en tu Dashboard.</div>
                  <DsButton onClick={onVerSesionHoy} style={{ width: "100%", marginTop: 10 }}>
                    Ver mi sesión de hoy →
                  </DsButton>
                </>
              )}
              {estadoSel === "cumplido" && (
                <div style={{ fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.5 }}>Tuviste una sesión programada ese día y quedó completada. El detalle (ejercicios, series, cargas) ya no se muestra aquí.</div>
              )}
              {estadoSel === "pendiente" && (
                <div style={{ fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.5 }}>Tenías sesión programada ese día y no quedó registrada como completada.</div>
              )}
              {estadoSel === "futuro" && (
                <div style={{ fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.5 }}>Tienes una sesión programada para ese día. Todavía no puedes ver en qué consiste — se abre el mismo día.</div>
              )}
              {estadoSel === "pedida" && solicitudSel && (
                <div>
                  <div style={{ fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.5 }}>
                    Le has pedido a tu entrenador sesión para este día{solicitudSel.nota ? `: "${solicitudSel.nota}"` : "."} En cuanto la prepare, la verás aquí.
                  </div>
                  <button
                    onClick={() => cancelarPeticion(solicitudSel)}
                    style={{ marginTop: 10, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, padding: "7px 12px", color: ds.inkSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancelar petición
                  </button>
                  {errorPeticion && <div style={{ color: ds.danger, fontSize: 11.5, marginTop: 6 }}>{errorPeticion}</div>}
                </div>
              )}
              {estadoSel === "sin-sesion" && diaSel < hoy && <div style={{ fontSize: 12.5, color: ds.inkMuted, lineHeight: 1.5 }}>No tuviste ninguna sesión programada ese día.</div>}
              {estadoSel === "sin-sesion" && diaSel >= hoy && solicitudesLoaded && (
                <div>
                  <div style={{ fontSize: 12.5, color: ds.inkMuted, lineHeight: 1.5, marginBottom: 10 }}>
                    {diaSel === hoy ? "Todavía no tienes ninguna sesión programada para hoy." : "Todavía no tienes ninguna sesión programada para ese día."} ¿Quieres pedirle a tu entrenador que te prepare algo?
                  </div>
                  <textarea
                    value={notaPeticion}
                    onChange={(e) => setNotaPeticion(e.target.value)}
                    placeholder="Opcional: cuéntale qué te gustaría trabajar..."
                    style={{ width: "100%", minHeight: 50, resize: "vertical", background: ds.canvas, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "9px 11px", color: ds.ink, fontFamily: dsF.sans, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                  {errorPeticion && <div style={{ color: ds.danger, fontSize: 11.5, marginTop: 6 }}>{errorPeticion}</div>}
                  <DsButton disabled={pidiendo} onClick={pedirSesion} style={{ width: "100%", marginTop: 8 }}>
                    {pidiendo ? "Enviando..." : `Pedir sesión para ${diaSel === hoy ? "hoy" : "este día"}`}
                  </DsButton>
                </div>
              )}
            </div>
          )}
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={tabs} active="calendario" onChange={onChangeTab} />
    </>
  );
}

// Series completadas de una tarea de fuerza/core (solo un número, no el
// detalle serie a serie — registrar cada serie es demasiado tedioso en el
// gimnasio). Devuelve {series_hechas} o {} si no aplica. Sin tocar nada, se
// asume "como pautado". Junto a la serie top (kg x reps x RIR) permite
// estimar el volumen: series x reps x kg.
function seriesHechasDeRegistro(tarea, draft) {
  if (tarea.esResistencia || tarea.esCmj) return {};
  const pautadas = Number(tarea.series);
  if (!Number.isFinite(pautadas) || pautadas < 1) return {};
  const elegidas = draft?.series !== "" && draft?.series != null ? Number(draft.series) : pautadas;
  return { series_hechas: Number.isFinite(elegidas) && elegidas >= 0 ? Math.round(elegidas) : pautadas };
}

// Calibración del 1RM: ¿la app todavía no tiene datos para calcular el 1RM
// estimado de este jugador en ESTE ejercicio+equipo? Sin reps Y RIR
// registrados no hay e1RM, y sin e1RM no se puede sugerir carga ni pautar
// por % del 1RM. Antes, además, las tareas por %1RM por debajo del 65 % no
// pedían el RIR, así que un jugador que solo hiciera trabajo ligero de un
// ejercicio no generaba nunca ese dato. Ahora, mientras falten datos, la app
// pide reps y RIR y lo explica. Solo aplica a tareas con carga en kg y
// repeticiones (no Resistencia, CMJ, core, ni peso corporal sin lastre).
function necesitaCalibrarE1rm(tarea, registro) {
  if (!tarea || tarea.esResistencia || tarea.esCmj || tarea.esCore || tarea.esElastica) return false;
  if (tarea.unidad && tarea.unidad !== "reps") return false;
  if (tarea.esCorporal && registro?.subtipo !== "lastre") return false;
  if (tarea.eligeEquipo) {
    const eq = registro?.subtipo;
    if (!eq || !tarea.equiposElegibles?.includes(eq)) return false; // aún no ha elegido material
    return tarea.tieneE1rmPorEquipo?.[eq] === false;
  }
  return tarea.tieneE1rm === false;
}

function PantallaJugadorReal({ presetPlayerId, onExit }) {
  const [players, , playersLoaded] = usePlayers();
  const player = players.find((p) => p.id === presetPlayerId) || null;
  const date = todayStr();

  // Antes: 3 peticiones en cadena (sesiones -> tareas -> ejercicios/
  // circuitos), cada una esperando a que resolviera la anterior. Ahora: 1
  // sola petición que ya trae las 4 cosas juntas, resueltas dentro de la
  // misma ejecución de Apps Script.
  const { loaded: bootstrapLoaded, sesiones: sesionesBootstrap, tareas: tareasBootstrap, ejercicios, circuitos, proximaSesion } = useBootstrapJugador(player?.id, date);
  // Defensa igual que en el resto de la app: no fiarse de que el filtrado
  // del backend sea correcto, se re-aplica aquí siempre.
  const todaySesiones = player
    ? sesionesBootstrap.filter((s) => s.enviada && (s.fechas || []).includes(date) && (!s.jugadores_destino || !s.jugadores_destino.length || s.jugadores_destino.includes(player.id)))
    : [];
  const sesionIds = todaySesiones.map((s) => s.id);
  const sesionIdsSet = new Set(sesionIds);
  const tareas = tareasBootstrap.filter((t) => sesionIdsSet.has(t.sesion_id));
  const tareaIds = tareas.map((t) => t.id);
  // Filtrado en el propio backend por jugador — mucho más rápido que traer
  // toda la tabla de Registros del equipo entero cada vez que se abre esta
  // pantalla.
  const [registrosJugador, saveRegistrosJugador, registrosLoaded] = useEntityList("registros", player ? { jugador_id: player.id } : false);
  // OJO: nunca fiarse de que el backend filtre de verdad por jugador_id — se
  // ha confirmado que no lo hace (devuelve la tabla entera). Filtramos aquí
  // siempre, sea cual sea el comportamiento real del backend en cada momento.
  const registros =
    player && tareaIds.length ? registrosJugador.filter((r) => r.jugador_id === player.id && tareaIds.includes(r.tarea_id) && normalizarFecha(r.fecha) === date) : [];
  // "Cualquiera" (incluye guardados sin enviar) — sirve para restaurar en
  // pantalla lo que el jugador ya había tecleado. "Enviados" (enviado !==
  // false) — el único que cuenta como sesión realmente confirmada, para
  // badges "ENVIADA" y para no dejar reabrir una sesión ya mandada.
  const registrosByTarea = new Map(registros.map((r) => [r.tarea_id, r]));
  const registrosEnviadosByTarea = new Map(registros.filter((r) => r.enviado !== false).map((r) => [r.tarea_id, r]));
  const { loaded: historyLoaded, items: historyItems } = usePlayerHistory(player?.id);
  // Marcas de referencia que el entrenador ha introducido: calibran el e1RM y
  // la carga sugerida desde el primer día (no cuentan como sesión hecha).
  const { items: refItems } = useReferenciasFuerza(player?.id);

  // Adherencia semanal para la cabecera del dashboard (P5 — Fase 3): mismo
  // cálculo que ya usa el entrenador en ResumenFichaJugadorReal
  // (calcularAdherencia sobre fechasAsignadas), no una métrica nueva. Hace
  // falta el programa completo (no solo el bootstrap de hoy) para saber qué
  // fechas de la semana tenían sesión asignada.
  const { sesiones: sesionesProgramacion, tareas: tareasProgramacion } = useBootstrapProgramacion();

  // Datos reales de salto (altura/potencia/fuerza/velocidad), vinculados por
  // jugador_id — el mismo pipeline que ya usa el entrenador en la ficha de
  // jugador (CmjFichaJugadorReal): no se recalcula nada nuevo, se reutiliza
  // cmjBuildPlayers para tener la comparación "mismo día de medida, ciclo
  // anterior" ya validada ahí, en vez de reinventar el cálculo aquí.
  const [cmjSaltos, setCmjSaltos] = useState([]);
  const [cmjMicrociclos, setCmjMicrociclos] = useState([]);
  useEffect(() => {
    let cancelled = false;
    if (!player?.id) return;
    Promise.all([
      supabase.from("cmj_saltos").select("*").eq("jugador_id", player.id),
      supabase.from("cmj_microciclos").select("*"),
    ]).then(([saltosRes, microRes]) => {
      if (cancelled) return;
      setCmjSaltos(saltosRes.error ? [] : (saltosRes.data || []).filter((s) => !s.excluido));
      setCmjMicrociclos(microRes.error ? [] : microRes.data || []);
    });
    return () => { cancelled = true; };
  }, [player?.id]);

  // Cuando hoy hay más de una sesión distinta enviada a este jugador, se
  // tratan como unidades independientes — cada una con su propio progreso y
  // su propio envío — en vez de mezclar sus tareas en una sola lista donde
  // enviar una bloqueaba también la otra sin haberse tocado.
  const [sesionSeleccionadaId, setSesionSeleccionadaId] = useState(null);
  // "dashboard" es ahora la pantalla de entrada — antes se entraba directo
  // en "hoy". "sesion" es la antigua pestaña "Hoy", a la que solo se llega
  // pulsando "Ver sesión" desde el dashboard. "cmj" es nueva.
  const [vistaJugador, setVistaJugador] = useState("dashboard");
  const sesionActual = todaySesiones.length === 1 ? todaySesiones[0] : todaySesiones.find((s) => s.id === sesionSeleccionadaId) || null;
  const necesitaElegirSesion = todaySesiones.length > 1 && !sesionActual;
  // Si ya hay un registro ENVIADO (enviado !== false) de hoy para las tareas
  // de ESTA sesión en concreto, es que esta sesión ya se confirmó y envió
  // antes — se trata como ya enviada, sin dejar reabrirla. Un progreso
  // "guardado sin enviar" no cuenta para esto. Se calcula aquí (antes de los
  // primeros `return` de carga) porque el efecto de más abajo que restaura
  // un borrador guardado lo necesita ya disponible.
  const tareaIdsSesionActual = sesionActual ? tareas.filter((t) => t.sesion_id === sesionActual.id).map((t) => t.id) : [];
  const yaEnviadaAntes = tareaIdsSesionActual.length > 0 && tareaIdsSesionActual.some((id) => registrosEnviadosByTarea.has(id));
  const estadoPorSesion = todaySesiones.map((s) => {
    const idsS = tareas.filter((t) => t.sesion_id === s.id).map((t) => t.id);
    const hechas = idsS.filter((id) => registrosByTarea.has(id)).length;
    const hechasEnviadas = idsS.filter((id) => registrosEnviadosByTarea.has(id)).length;
    return { sesion: s, total: idsS.length, hechas, completa: idsS.length > 0 && hechasEnviadas === idsS.length };
  });

  const [registrosDraft, setRegistrosDraft] = useState({});
  const [hechoDraft, setHechoDraft] = useState({}); // local hasta guardar (borrador) o confirmar envío
  const [gifAmpliado, setGifAmpliado] = useState(null);
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [molestia, setMolestia] = useState(null); // 0-10 o null si no contesta
  const [molestiaZona, setMolestiaZona] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorGuardadoOk, setBorradorGuardadoOk] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  // P6: ids de tareas cuyo aviso puntual de "nuevo récord" ya se ha
  // descartado a mano en esta sesión — el halo/badge de la tarea se queda
  // igualmente, solo se oculta el aviso.
  const [recordsDescartados, setRecordsDescartados] = useState([]);

  // Restaura, una sola vez por sesión, lo que el jugador ya hubiera guardado
  // con "Guardar sin enviar" — así un refresco de página (p. ej. porque el
  // entrenador avisó de que cambió algo) no le hace perder lo ya tecleado.
  const draftRestauradoRef = useRef(null);
  useEffect(() => {
    if (!sesionActual || yaEnviadaAntes) return;
    if (draftRestauradoRef.current === sesionActual.id) return;
    const hechoInicial = {};
    const registroInicial = {};
    tareaIdsSesionActual.forEach((id) => {
      const r = registrosByTarea.get(id);
      if (r && r.enviado === false) {
        hechoInicial[id] = true;
        registroInicial[id] = { reps: r.reps_hechas ?? "", carga: r.carga_kg ?? "", rir: r.rir ?? "", subtipo: r.subtipo_corporal || "", series: r.series_hechas ?? "" };
      }
    });
    if (Object.keys(hechoInicial).length) {
      draftRestauradoRef.current = sesionActual.id;
      setHechoDraft((prev) => ({ ...hechoInicial, ...prev }));
      setRegistrosDraft((prev) => ({ ...registroInicial, ...prev }));
    }
  }, [sesionActual, yaEnviadaAntes, tareaIdsSesionActual, registrosByTarea]);

  // DEV-06: copia local del borrador (ver claveBorradorLocal). Se restaura
  // una sola vez por sesión, una vez cargados los registros del servidor, y
  // GANA sobre el borrador del servidor: es siempre igual o más reciente
  // (se escribe en cada cambio; el del servidor, solo al guardar sin enviar).
  const claveBorradorActual = player && sesionActual ? claveBorradorLocal(player.id, sesionActual.id, date) : null;
  const localRestauradoRef = useRef(null);
  const omitirEscrituraLocalRef = useRef(false);
  useEffect(() => {
    if (!claveBorradorActual || !registrosLoaded || tareaIdsSesionActual.length === 0) return;
    if (yaEnviadaAntes) {
      borrarBorradorLocal(claveBorradorActual); // ya enviada (quizá desde otro dispositivo): la copia local sobra
      return;
    }
    if (localRestauradoRef.current === claveBorradorActual) return;
    localRestauradoRef.current = claveBorradorActual;
    limpiarBorradoresLocalesAntiguos(date);
    const local = leerBorradorLocal(claveBorradorActual);
    if (!local) return;
    const idsValidos = new Set(tareaIdsSesionActual.map(String)); // por si el entrenador cambió la sesión desde entonces
    const hecho = {};
    Object.entries(local.hecho || {}).forEach(([id, v]) => {
      if (v && idsValidos.has(id)) hecho[id] = true;
    });
    const registrosLocales = {};
    Object.entries(local.registros || {}).forEach(([id, v]) => {
      if (idsValidos.has(id) && v && typeof v === "object") registrosLocales[id] = v;
    });
    if (!Object.keys(hecho).length && !Object.keys(registrosLocales).length) return;
    omitirEscrituraLocalRef.current = true; // el siguiente render trae justo lo que acabamos de leer: no hace falta reescribirlo
    setHechoDraft((prev) => ({ ...prev, ...hecho }));
    setRegistrosDraft((prev) => ({ ...prev, ...registrosLocales }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveBorradorActual, registrosLoaded, yaEnviadaAntes, tareaIdsSesionActual.length]);
  useEffect(() => {
    if (!claveBorradorActual || localRestauradoRef.current !== claveBorradorActual) return; // aún sin restaurar: no pisar la copia guardada con un estado vacío
    if (omitirEscrituraLocalRef.current) {
      omitirEscrituraLocalRef.current = false;
      return;
    }
    if (yaEnviadaAntes || enviado) return;
    const idsValidos = new Set(tareaIdsSesionActual.map(String)); // el estado puede contener tareas de OTRA sesión de hoy
    const hecho = {};
    Object.entries(hechoDraft).forEach(([id, v]) => {
      if (v && idsValidos.has(id)) hecho[id] = true;
    });
    const registrosLocales = {};
    Object.entries(registrosDraft).forEach(([id, v]) => {
      if (idsValidos.has(id)) registrosLocales[id] = v;
    });
    if (!Object.keys(hecho).length && !Object.keys(registrosLocales).length) borrarBorradorLocal(claveBorradorActual);
    else guardarBorradorLocal(claveBorradorActual, { hecho, registros: registrosLocales, ts: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hechoDraft, registrosDraft, claveBorradorActual]);

  if (!playersLoaded) return <LoadingBlock />;
  if (!player) {
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>No se encontró tu perfil.</div>
          <DsButton onClick={onExit}>Volver al portal</DsButton>
        </div>
      </PantallaBase>
    );
  }
  // Comprobación de refuerzo: si te suspenden mientras ya tenías la app
  // abierta, esto te saca en cuanto los datos del roster se refresquen —
  // no hace falta esperar a un cierre y una nueva entrada por el portal.
  if (player.estado === "suspendido") {
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ textAlign: "center", maxWidth: 260 }}>
          <div style={{ marginBottom: 12 }}>Tu acceso está desactivado. Habla con tu entrenador.</div>
          <DsButton onClick={onExit}>Volver al portal</DsButton>
        </div>
      </PantallaBase>
    );
  }

  const loaded = bootstrapLoaded && registrosLoaded && historyLoaded;

  if (loaded && vistaJugador === "sesion" && necesitaElegirSesion) {
    return (
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <button onClick={() => setVistaJugador("dashboard")} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Volver al dashboard
          </button>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>SESIONES DE HOY</div>
            <h1 style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{player.name}</h1>
            <div style={{ fontSize: 12.5, color: ds.inkSecondary, textTransform: "capitalize" }}>{fmtDateLabel(date)} · elige cuál trabajar ahora</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {estadoPorSesion.map(({ sesion, total, hechas, completa }) => (
              <DsCard key={sesion.id} interactive onClick={() => setSesionSeleccionadaId(sesion.id)} style={{ textAlign: "left", padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>{sesion.objetivo || sesion.md || "Sesión"}</span>
                  {completa && <DsBadge tone="success">✓ ENVIADA</DsBadge>}
                </div>
                <span style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>
                  {total} tarea{total === 1 ? "" : "s"}
                  {hechas > 0 && !completa ? ` · ${hechas}/${total} en progreso` : ""}
                </span>
              </DsCard>
            ))}
          </div>
        </div>
      </PantallaBase>
    );
  }

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  // tareaIdsSesionActual / yaEnviadaAntes ya se calcularon más arriba, antes
  // de los primeros `return` (los necesita el efecto que restaura el
  // borrador guardado).

  // La referencia de "última vez" se guarda por ejercicio + equipo usado —
  // la carga con cada uno de estos no es directamente comparable entre sí
  // (una Barra, un Multipower, una Mancuerna, una Kettlebell, una Máquina o
  // un Trineo no cargan igual aunque el número de kg coincida), así que
  // mezclarlas en el mismo "última vez" confundiría más que ayudar. Cuando
  // una tarea tiene dos o más de estos seleccionados a la vez (el
  // entrenador dejó elegir), lo que de verdad se usó ese día es lo que el
  // jugador marcó (subtipo_corporal, reaprovechado aquí igual que para
  // asistencia/lastre) — no basta con mirar el material de la tarea, porque
  // ese campo dice qué estaba disponible, no cuál se usó.
  // ---- Datos reales para el Dashboard y la pestaña CMJ ----
  // Única fuente: cmj_saltos (el CSV del dispositivo que sube el
  // entrenador). El jugador ya no introduce el salto a mano dentro de una
  // sesión, así que ya no existe un histórico "por sesión" en paralelo —
  // habría dos números de altura distintos conviviendo, y solo uno es el
  // real. Todo (altura, potencia, fuerza, velocidad, récord y comparativas)
  // sale de aquí.
  const filasCmjMotor = cmjSaltos.map((s) => ({
    jugadorId: s.jugador_id,
    nombre: player?.name,
    dateKey: s.fecha,
    date: s.fecha_hora,
    peso: s.peso,
    hp0: s.hp0,
    altura: s.altura,
    fuerza: s.fuerza,
    potencia: s.potencia,
    velocidad: s.velocidad,
    kineticsValid: s.kinetics_valid,
    pesoValid: s.peso_valid,
    hp0Valid: s.hp0_valid,
  }));
  const { players: cmjBuiltPlayers, microList: cmjMicroList } = cmjBuildPlayers(
    filasCmjMotor,
    cmjMicrociclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );
  const cmjPlayer = cmjBuiltPlayers[0] || null;
  const mejorDeMetrica = (metric) => {
    if (!cmjPlayer) return null;
    const valores = cmjPlayer.sorted.map((r) => metric.get(r)).filter((v) => v != null);
    return valores.length ? Math.max(...valores) : null;
  };
  const cmjMejores = cmjPlayer
    ? { altura: mejorDeMetrica(CMJ_METRICS.altura), potenciaRel: mejorDeMetrica(CMJ_METRICS.potenciaRel), fuerzaRel: mejorDeMetrica(CMJ_METRICS.fuerzaRel), velocidad: mejorDeMetrica(CMJ_METRICS.velocidad) }
    : null;
  const ultimoTestCmj = cmjPlayer && cmjPlayer.sorted.length ? cmjPlayer.sorted[cmjPlayer.sorted.length - 1] : null;
  const ultimoTestCmjTag = ultimoTestCmj ? ultimoTestCmj.tag : null;
  // Para la referencia dentro de la tarea de sesión ("Último salto X cm"):
  // el último test ANTES de hoy, no el de hoy mismo si ya se hubiera subido
  // — es una referencia de lo anterior, no el dato que se está a punto de
  // registrar.
  const ultimoTestCmjAntesDeHoy = cmjPlayer
    ? [...cmjPlayer.sorted].filter((r) => r.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null
    : null;
  const cmjComparativaCicloAnterior = ultimoTestCmjTag ? cmjDeltaMismoDiaCicloAnterior(cmjPlayer, cmjMicroList, ultimoTestCmjTag, CMJ_METRICS.altura) : null;
  const cmjDashboardDelta = ultimoTestCmj
    ? {
        valor: CMJ_METRICS.altura.get(ultimoTestCmj),
        fechaLabel: fmtHaceDias(ultimoTestCmj.date),
        tagLabel: ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : null,
        pct: cmjComparativaCicloAnterior ? cmjComparativaCicloAnterior.pct : null,
        color:
          !cmjComparativaCicloAnterior || cmjComparativaCicloAnterior.pct == null
            ? ds.inkMuted
            : cmjComparativaCicloAnterior.pct > 0
            ? ds.success
            : cmjComparativaCicloAnterior.pct < 0
            ? ds.danger
            : ds.accent,
      }
    : null;

  // "Esta semana destaca" y "récord de carga": ventana corrediza de 7 días
  // naturales (hoy + 6 anteriores) contra los 7 días previos a esa — es
  // nuestra definición de "semana" para este cálculo, no tiene por qué
  // coincidir con tu semana de trabajo real (p. ej. lunes-domingo o tu
  // propio microciclo); si prefieres esa referencia en vez de esta ventana
  // corrediza, se cambia solo aquí.
  const haceDias = (dias) => {
    const d = new Date(date);
    d.setDate(d.getDate() - dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const inicioSemanaActual = haceDias(6);

  // Adherencia esta semana vs. la semana pasada — semana de calendario
  // (lunes-domingo), igual criterio que ResumenFichaJugadorReal, no la
  // ventana corrediza de 7 días que usan mejorasSemana/descensosSemana (son
  // preguntas distintas: "¿cumplo lo que me mandan?" vs. "¿progreso en cada
  // ejercicio?").
  const lunesSemana = inicioSemanaCalendario(date);
  const lunesSemanaAnterior = sumarDiasFecha(lunesSemana, -7);
  const domingoSemanaAnterior = sumarDiasFecha(lunesSemana, -1);
  const fechasConRegistro = new Set(historyItems.map((it) => it.date));
  const fechasAsignadasJugador = (desde, hasta) => {
    if (!player) return [];
    const fechas = [];
    sesionesProgramacion
      .filter((s) => s.enviada)
      .forEach((s) => {
        const incluyeAJugador = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino.includes(player.id) : player.estado === "activo";
        if (!incluyeAJugador) return;
        (s.fechas || []).forEach((f) => {
          if (f >= desde && f <= hasta) fechas.push({ fecha: f, sesionId: s.id });
        });
      });
    return fechas;
  };
  // Misma adherencia ponderada por tareas que ve el entrenador (ENT-07).
  const hechasPropias = tareasHechasPorJugadorFecha(historyItems.map((it) => ({ ...it, jugadorId: player?.id })));
  const fraccionCumplidaPropia = crearFraccionCumplida(tareasProgramacion);
  const calcularAdherenciaJugador = (asignaciones) => {
    if (!asignaciones.length) return null;
    const cumplidas = asignaciones.reduce((sum, a) => sum + fraccionCumplidaPropia(a.sesionId, a.fecha, hechasPropias.get(`${player?.id}::${a.fecha}`), player?.id), 0);
    return Math.round((cumplidas / asignaciones.length) * 100);
  };
  // OJO: el límite superior es HOY, no el domingo de la semana — igual
  // criterio que ResumenFichaJugadorReal (fechasAsignadas(lunes, hoy)). Si se
  // usara el domingo, a mitad de semana se contarían como "pendientes"
  // sesiones que todavía no han llegado, y el jugador vería una adherencia
  // baja aunque hubiera cumplido el 100% de lo que ya tocaba hasta hoy.
  const adherenciaSemanaActual = calcularAdherenciaJugador(fechasAsignadasJugador(lunesSemana, date));
  const adherenciaSemanaAnterior = calcularAdherenciaJugador(fechasAsignadasJugador(lunesSemanaAnterior, domingoSemanaAnterior));
  const deltaAdherenciaSemana = adherenciaSemanaActual != null && adherenciaSemanaAnterior != null ? adherenciaSemanaActual - adherenciaSemanaAnterior : null;

  // Para la pestaña "Progreso" — Constancia (racha de semanas cumpliendo el
  // plan) y Volumen (series completadas por semana). Últimas 8 semanas de
  // calendario (lunes-domingo), la actual con el mismo límite superior "hoy"
  // que adherenciaSemanaActual (si no, a mitad de semana se contaría como
  // "pendiente" lo que aún no ha llegado). rachaSemanas cuenta semanas
  // consecutivas (empezando por la más reciente hacia atrás) con ≥80% de
  // adherencia — la misma frontera "cumplida" que ya usa el badge del
  // Dashboard.
  const N_SEMANAS_HISTORIAL = 8;
  const historialSemanas = [];
  for (let i = N_SEMANAS_HISTORIAL - 1; i >= 0; i--) {
    const inicio = sumarDiasFecha(lunesSemana, -7 * i);
    const finCalendario = sumarDiasFecha(inicio, 6);
    const fin = i === 0 ? date : finCalendario;
    const pct = calcularAdherenciaJugador(fechasAsignadasJugador(inicio, fin));
    const volumen = historyItems.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.date >= inicio && it.date <= finCalendario).length;
    historialSemanas.push({ inicio, pct, volumen });
  }
  let rachaSemanas = 0;
  for (let i = historialSemanas.length - 1; i >= 0; i--) {
    if (historialSemanas[i].pct != null && historialSemanas[i].pct >= 80) rachaSemanas++;
    else break;
  }

  // Paso 2 (calendario semanal, versión mínima): qué días concretos de esta
  // semana tienen sesión pautada para este jugador, y su estado — no solo el
  // % agregado. "L M X J V S D", lunes-domingo, igual semana que la
  // adherencia de arriba.
  const DIAS_SEMANA_ETIQUETA = ["L", "M", "X", "J", "V", "S", "D"];
  const diasSemana = DIAS_SEMANA_ETIQUETA.map((etiqueta, i) => {
    const fecha = sumarDiasFecha(lunesSemana, i);
    const pautado = fechasAsignadasJugador(fecha, fecha).length > 0;
    const cumplido = fechasConRegistro.has(fecha);
    const esHoy = fecha === date;
    const esFuturo = fecha > date;
    let estado = "sin-sesion";
    if (pautado) {
      if (cumplido) estado = "cumplido";
      else if (esHoy) estado = "hoy";
      else if (esFuturo) estado = "futuro";
      else estado = "pendiente"; // pautado, ya pasó, no se hizo
    }
    return { fecha, etiqueta, pautado, estado, esHoy };
  });

  const registrosConCarga = [...historyItems, ...refItems].filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null);

  // A efectos de cuantificación y progreso, el mismo ejercicio hecho con
  // equipos distintos (p. ej. Sentadilla en Multipower vs. Sentadilla con
  // Barra libre) NO es comparable: el kg registrado en cada uno no
  // significa lo mismo (la guiada de un multipower puede pesar más o menos
  // que una barra olímpica de 20kg, y varía de máquina a máquina). Así que
  // récord, e1RM para %1RM, mejora/descenso semanal y Progreso agrupan por
  // EJERCICIO + EQUIPO (misma función materialEfectivo que ya usa la
  // referencia/carga sugerida por equipo, ver resolverReferencia) — cada
  // equipo cuenta como si fuera una tarea distinta para el progreso, no
  // solo el ejercicio. El nombre que se muestra solo añade el equipo entre
  // paréntesis cuando ESTE jugador ha trabajado de verdad el mismo
  // ejercicio con más de un equipo — si siempre lo hace igual, no hace
  // falta repetir "(Barra)" en todas partes.
  const equiposPorNombre = new Map();
  [...historyItems, ...refItems]
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ")
    .forEach((it) => {
      const eq = materialEfectivo(it);
      if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
      equiposPorNombre.get(it.name).add(eq);
    });
  const etiquetaProgreso = (nombre, equipo) => ((equiposPorNombre.get(nombre)?.size || 0) > 1 && equipo && equipo !== "std" ? `${nombre} (${equipo})` : nombre);

  // Récord de carga: ANTES comparaba el kg en bruto de la marca más pesada,
  // lo que se rompía si cambiabas reps/RIR entre una marca y otra (5 reps a
  // RIR2 con menos kg puede ser más fuerza real que 12 reps a RIR0 con más
  // kg). AHORA se compara el 1RM ESTIMADO (e1RM, mismo motor RTF que las
  // recomendaciones de carga) de cada marca, así que el PR es fiel a la
  // fuerza real conseguida sin importar con qué reps/RIR se logró. Solo
  // entran marcas con reps/RIR fiables (ver REPS_MAX_RIR_FIABLE) — el resto
  // no aporta un e1RM utilizable y se ignora para el récord.
  const registrosPorEjercicio = new Map(); // clave "nombre::equipo" -> { nombre, equipo, regs }
  registrosConCarga.forEach((it) => {
    const equipo = materialEfectivo(it);
    const clave = `${it.name}::${equipo}`;
    if (!registrosPorEjercicio.has(clave)) registrosPorEjercicio.set(clave, { nombre: it.name, equipo, regs: [] });
    registrosPorEjercicio.get(clave).regs.push(it);
  });
  const e1rmDeRegistro = (it) => e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
  // mejorE1rmPorClave: el mejor e1RM estimado de ESTE jugador para cada
  // combinación ejercicio+equipo — se reutiliza más abajo para sugerir
  // cargas de tareas en modo %1RM (ver construirTareaVisual).
  const mejorE1rmPorClave = new Map();
  let recordCarga = null;
  registrosPorEjercicio.forEach(({ nombre, equipo, regs }, clave) => {
    const conE1rm = regs.map((it) => ({ it, e1rm: e1rmDeRegistro(it) })).filter((x) => x.e1rm != null);
    if (!conE1rm.length) return;
    const ordenados = [...conE1rm].sort((a, b) => b.e1rm - a.e1rm);
    mejorE1rmPorClave.set(clave, ordenados[0].e1rm);
    const maxActual = ordenados[0];
    const maxAnterior = ordenados.find((x) => x.it.id !== maxActual.it.id && x.e1rm < maxActual.e1rm);
    const pctSobreAnterior = maxAnterior ? ((maxActual.e1rm - maxAnterior.e1rm) / maxAnterior.e1rm) * 100 : null;
    if (!recordCarga || maxActual.it.date > recordCarga.fecha) {
      recordCarga = { nombre: etiquetaProgreso(nombre, equipo), valor: Math.round(maxActual.e1rm), fecha: maxActual.it.date, pctSobreAnterior };
    }
  });

  // P6 — récord en vivo: el mejor valor de carga ya registrado (antes de
  // hoy) por ejercicio+equipo, para poder avisar al jugador EN EL MOMENTO en
  // que supera su marca dentro de la propia sesión, sin esperar a que se
  // envíe ni a que aparezca en el resumen del dashboard.
  const mejorHistoricoPorClave = new Map();
  registrosPorEjercicio.forEach(({ regs }, clave) => {
    mejorHistoricoPorClave.set(clave, Math.max(...regs.map((it) => Number(it.cargaReal))));
  });

  // Cambios esta semana frente a la propia media reciente de cada
  // EJERCICIO+EQUIPO. ANTES agrupaba por diseño exacto de tarea (mismo
  // ejercicio + material + lateralidad + reps + RIR objetivo), así que
  // cambiar la pauta entre semanas (habitual al periodizar) rompía la
  // comparación — igual fragmentación que ya arreglamos en Progreso y en
  // "Tus récords". AHORA se compara el 1RM estimado (e1RM) cuando el
  // ejercicio+equipo maneja carga, o las reps al fallo estimadas (RTF: reps
  // + RIR) cuando nunca se registra carga (p. ej. dominadas) — así ningún
  // ejercicio se queda fuera solo por no llevar peso, y la comparación
  // sigue siendo fiel aunque varíen reps/RIR/%1RM/equipo de una semana a
  // otra. No nos quedamos solo con el mayor: se guardan todos los deltas
  // (positivos, negativos y empatados) para poder mostrar el mayor de cada
  // signo + cuántos más se movieron en la misma dirección.
  const registrosPorClaveTodos = new Map();
  historyItems
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ")
    .forEach((it) => {
      const equipo = materialEfectivo(it);
      const clave = `${it.name}::${equipo}`;
      if (!registrosPorClaveTodos.has(clave)) registrosPorClaveTodos.set(clave, { nombre: it.name, equipo, regs: [] });
      registrosPorClaveTodos.get(clave).regs.push(it);
    });
  const cambiosSemana = [];
  registrosPorClaveTodos.forEach(({ nombre, equipo, regs }, clave) => {
    const conCarga = registrosPorEjercicio.has(clave);
    // valorEstimado: e1RM (kg) si este ejercicio+equipo maneja carga, RTF
    // (reps al fallo estimadas) si nunca la lleva — mismo criterio que
    // Progreso.
    const valorEstimado = (it) => {
      if (conCarga) return e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
      const reps = Number(it.repsReal);
      const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
      if (Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return null;
      return reps + rir;
    };
    const conValor = regs.map((it) => ({ it, v: valorEstimado(it) })).filter((x) => x.v != null);
    const deEstaSemana = conValor.filter((x) => x.it.date >= inicioSemanaActual);
    const deAntes = conValor.filter((x) => x.it.date < inicioSemanaActual);
    if (!deEstaSemana.length || !deAntes.length) return;
    const mediaAntes = deAntes.reduce((s, x) => s + x.v, 0) / deAntes.length;
    if (mediaAntes <= 0) return;
    const ultimoEstaSemana = [...deEstaSemana].sort((a, b) => (a.it.date < b.it.date ? 1 : -1))[0];
    const pct = ((ultimoEstaSemana.v - mediaAntes) / mediaAntes) * 100;
    cambiosSemana.push({ nombre: etiquetaProgreso(nombre, equipo), pct, conCarga });
  });
  const mejorasSemana = cambiosSemana.filter((c) => c.pct > 0).sort((a, b) => b.pct - a.pct);
  const descensosSemana = cambiosSemana.filter((c) => c.pct < 0).sort((a, b) => a.pct - b.pct);
  const sinCambioSemana = cambiosSemana.filter((c) => c.pct === 0);

  // Referencia de "última vez que hice esto": se busca primero por diseño
  // EXACTO (mismas reps/RIR objetivo) porque es la comparación más fiel,
  // pero si el entrenador cambia el RIR o las reps de una semana a otra
  // (algo habitual al periodizar) esa clave exacta no existe todavía y el
  // jugador se quedaba sin ninguna referencia aunque tenga historial de
  // sobra con ese ejercicio. lastValueByExercise es el resultado más
  // reciente para el mismo ejercicio + material + lateralidad, sea cual sea
  // el diseño — sirve de respaldo, y como el texto que se muestra incluye
  // siempre las reps/RIR de esa marca (ver formatearReferencia), el jugador
  // ve igualmente con qué reps/RIR se consiguió.
  const lastValueByName = {};
  const lastValueByExercise = {};
  [...historyItems]
    .filter((it) => it.date < date && (it.cargaReal !== "" || it.rirReal !== "" || it.repsReal !== ""))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      const eq = materialEfectivo(it);
      lastValueByName[claveDisenoTarea(it.name, eq, it.unilateral, it.reps, it.rir)] = it;
      lastValueByExercise[`${(it.name || "").toLowerCase()}::${eq}::${it.unilateral ? "uni" : "bi"}`] = it;
    });

  // Resuelve la referencia de un ejercicio+material+lateralidad para el
  // diseño (reps/RIR) de la tarea de hoy: exacta si existe, si no la más
  // reciente con otro diseño. Cuando cae al respaldo (mismoDiseno=false),
  // además calcula una carga sugerida para el diseño de hoy vía RIR/RTF
  // (ver calcularCargaSugerida) — no tiene sentido "sugerir" nada cuando ya
  // hay una marca con el mismo diseño exacto, ahí la referencia ya es
  // directamente aplicable.
  const resolverReferencia = (nombreEj, equipo, unilateral, repsHoy, rirHoy) => {
    const claveExacta = claveDisenoTarea(nombreEj, equipo, unilateral, repsHoy, rirHoy);
    const exacto = lastValueByName[claveExacta];
    if (exacto) return { registro: exacto, mismoDiseno: true, cargaSugerida: null };
    const fallback = lastValueByExercise[`${(nombreEj || "").toLowerCase()}::${equipo}::${unilateral ? "uni" : "bi"}`];
    return {
      registro: fallback || null,
      mismoDiseno: false,
      cargaSugerida: fallback ? calcularCargaSugerida(fallback, repsHoy, rirHoy) : null,
    };
  };

  // Última vez que esta misma tarea se hizo con peso corporal, qué eligió el
  // jugador (corporal puro / con asistencia / con lastre) — o, si la tarea
  // dejaba elegir entre varios equipos, cuál usó — para preseleccionarlo
  // solo y que no tenga que volver a elegirlo cada vez que se repita.
  const lastSubtipoByName = {};
  [...historyItems]
    .filter((it) => it.date < date && it.subtipoCorporal)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      lastSubtipoByName[(it.name || "").toLowerCase()] = it.subtipoCorporal;
    });

  // Cada elemento de un bloque es { tipo: "suelta", tarea } o
  // { tipo: "circuito", circuitoId, tareas: [...] } — así el jugador ve
  // los circuitos agrupados y numerados en vez de mezclados sueltos.
  const bloques = {};
  const circuitosById = new Map(circuitos.map((c) => [c.id, c]));
  const circuitoBuffer = {}; // circuito_id -> { nombreBloque, tareas: [...] }

  // "75kg" a secas no dice si esa marca fue a 3 reps o a 15, a RIR0 o RIR5 —
  // dos series muy distintas con el mismo kg. Cuando faltan reps y/o RIR en
  // el registro histórico (por ejemplo, tareas antiguas a %1RM por debajo
  // del 65% donde no se pedía RIR, o una carga registrada sin más detalle)
  // se dice explícitamente que faltan, en vez de omitirlos en silencio — así
  // se entiende también por qué esa marca no basta para estimar el 1RM. La
  // fecha (hace X días) da además el contexto de cuán reciente es.
  const formatearReferencia = (lv) => {
    if (!lv) return null;
    const tieneReps = lv.repsReal !== "" && lv.repsReal != null;
    const tieneRir = lv.rirReal !== "" && lv.rirReal != null;
    const partes = [];
    if (tieneReps) partes.push(`${lv.repsReal} ${lv.unidad || "reps"}`);
    partes.push(lv.subtipoCorporal === "asistencia" ? `banda ${lv.cargaReal || "—"}` : `${lv.cargaReal || "—"}kg${lv.subtipoCorporal && !EQUIPOS_AMBIGUOS.includes(lv.subtipoCorporal) ? ` (${lv.subtipoCorporal})` : ""}`);
    if (tieneRir) partes.push(`RIR${lv.rirReal}`);
    if (!tieneReps && !tieneRir) partes.push("sin reps/RIR registrados");
    else if (!tieneReps) partes.push("sin reps registradas");
    else if (!tieneRir) partes.push("sin RIR registrado");
    return `${partes.join(" · ")} · ${fmtHaceDias(lv.date)}`;
  };

  // Sugerencia de carga en modo %1RM para un ejercicio+equipo concreto — ver
  // mejorE1rmPorClave más arriba (no mezcla el e1RM de un multipower con el
  // de una barra libre).
  const calcularSugeridaPct1rm = (nombreEj, equipo, t, esResistencia) => {
    if (esResistencia || t.modo_carga !== "pct1rm" || t.pct1rm === "" || t.pct1rm == null) return null;
    const clave = `${nombreEj}::${equipo}`;
    if (!mejorE1rmPorClave.has(clave)) return null;
    return Math.round(((mejorE1rmPorClave.get(clave) * Number(t.pct1rm)) / 100 / 2.5)) * 2.5;
  };

  const construirTareaVisual = (t) => {
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const materiales = parseMateriales(t.material);
    const equiposEnTarea = materiales.filter((m) => EQUIPOS_AMBIGUOS.includes(m));
    const equipoUnico = equiposEnTarea.length === 1 ? equiposEnTarea[0] : null;
    const eligeEquipo = equiposEnTarea.length >= 2;
    const esCorporal = (t.tipo_resistencia || "") === "Peso corporal";
    const esResistencia = t.bloque_sesion === "Resistencia";
    const resistencia = esResistencia ? parseResistenciaData(t.resistencia_data) : null;
    const nombre = e.nombre || "";
    return {
      id: t.id,
      nombre: e.nombre || "(ejercicio eliminado)",
      series: t.series,
      cantidad: t.cantidad,
      rirObjetivo: t.rir !== "" && t.rir != null ? t.rir : null,
      unidad: UNIDAD_POR_MODO[t.modo] || "reps",
      nota: t.nota || "",
      // Alternativa al RIR para pautar la carga: un % directo del 1RM
      // estimado del jugador, para las cargas ligeras donde el RIR deja de
      // ser una herramienta fiable (por debajo de ~10 reps hasta el fallo /
      // ~75% 1RM la relación reps-%1RM ya no es lineal ni la autopercepción
      // del RIR es precisa — ver conversación). Se calcula sobre
      // mejorE1rmPorClave (ejercicio+equipo, ver arriba) — el e1RM de un
      // multipower no se mezcla con el de una barra libre, mismo criterio
      // que la referencia/carga sugerida en modo RIR.
      modoCarga: !esResistencia && t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
      pct1rmObjetivo: !esResistencia && t.pct1rm !== "" && t.pct1rm != null ? Number(t.pct1rm) : null,
      cargaSugeridaPct1rm: !eligeEquipo ? calcularSugeridaPct1rm(nombre, materialEfectivo({ materiales }), t, esResistencia) : null,
      // ¿Hay ya un e1RM de este jugador para este ejercicio+equipo? (misma
      // clave que usa mejorE1rmPorClave, ver necesitaCalibrarE1rm).
      tieneE1rm: !eligeEquipo && !esResistencia ? mejorE1rmPorClave.has(`${nombre}::${materialEfectivo({ materiales })}`) : null,
      tieneE1rmPorEquipo:
        eligeEquipo && !esResistencia ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, mejorE1rmPorClave.has(`${nombre}::${eq}`)])) : null,
      cargasSugeridasPct1rmPorEquipo: eligeEquipo
        ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, calcularSugeridaPct1rm(nombre, eq, t, esResistencia)]))
        : null,
      // A menos del 65% del 1RM el RIR autopercibido deja de ser fiable (a
      // esa intensidad el fallo está muy lejos y cuesta "sentir" cuántas
      // repeticiones quedan en la recámara), así que en cargas por %1RM por
      // debajo de ese umbral no se le pide RIR al jugador.
      pideRir: !(!esResistencia && t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null && Number(t.pct1rm) < 65),
      // Vídeo por variante (material + modo): si hay uno grabado para la
      // combinación exacta, se usa; si no, cae al vídeo genérico del
      // ejercicio. Cuando la tarea deja elegir material, no se fija un solo
      // "gif" — se calcula uno por cada equipo posible y se revela al elegir
      // (ver videoEfectivoTarea).
      gif: eligeEquipo ? e.gif_url || "" : e.videos_variantes?.[claveVideoVariante(equipoUnico || "std", t.lateralidad === "unilateral")] || e.gif_url || "",
      videosPorEquipo: eligeEquipo
        ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, e.videos_variantes?.[claveVideoVariante(eq, t.lateralidad === "unilateral")] || e.gif_url || ""]))
        : null,
      materiales,
      equipoUnico,
      esCorporal,
      esResistencia,
      objetivoResistencia: esResistencia ? formatearObjetivoResistencia(resistencia) : null,
      // Traduce el % de intensidad (FCmáx en Continuo, VAM en HIIT/RSA) a
      // algo que el jugador ejecuta sin pensar: un pulso o un ritmo, con su
      // propio test de campo (player.fcMaxPpm / player.vamKmh) si lo tiene,
      // o la estimación poblacional si no (ver objetivoJugadorResistencia).
      // null cuando no aplica: sin capacidad de Resistencia, o campo de
      // intensidad en RPE (bici/elíptica/piscina en HIIT/RSA) — ahí el
      // propio RPE ya es la instrucción, no hay nada que traducir.
      objetivoJugadorResistencia:
        esResistencia && resistencia && fichaResistenciaAplica(resistencia.tipo, resistencia.modalidad || "carrera")
          ? objetivoJugadorResistencia(resistencia.tipo, resistencia.intensidad, resistencia.distancia, player) || null
          : null,
      unilateral: t.lateralidad === "unilateral",
      esCmj: t.bloque_sesion === "CMJ",
      // Core: solo se marca como hecha, sin registrar carga ni reps — no
      // tiene sentido pedirle al jugador un formulario de carga/RIR para
      // trabajo de Core (planchas, antirrotación...), así que no se
      // despliega ninguna tarjeta de registro (ver TareaCardReal).
      esCore: t.bloque_sesion === "Core",
      // Resistencia elástica (gomas/bandas): no hay un peso que anotar ni se
      // pide nada al jugador, igual que en Core — solo marcarla como hecha.
      esElastica: (t.tipo_resistencia || "") === "Elástica",
      pesoAdherencia: pesoTareaAdherencia(t),
      // El MD de la sesión de hoy no importa aquí — se recuerda el último
      // test CMJ del CSV, sea de cuando sea, con su día de medida entre
      // paréntesis. Ya no es un dato que metiera el jugador: es solo
      // contexto de lo último que se le midió con el dispositivo.
      referenciaCmj:
        t.bloque_sesion === "CMJ" && ultimoTestCmjAntesDeHoy
          ? { md: ultimoTestCmjAntesDeHoy.tag && CMJ_TAG_META[ultimoTestCmjAntesDeHoy.tag] ? CMJ_TAG_META[ultimoTestCmjAntesDeHoy.tag].label : "", altura: CMJ_METRICS.altura.get(ultimoTestCmjAntesDeHoy) }
          : null,
      // Ahora que Activación admite cualquier ejercicio de la biblioteca (no
      // solo la bici estática), ya no se asume automáticamente por bloque —
      // depende solo de si el propio ejercicio se marcó como "sin lateralidad".
      mostrarLateralidad: e.sin_lateralidad !== "si",
      eligeEquipo,
      equiposElegibles: eligeEquipo ? equiposEnTarea : null,
      subtipoDefault: esCorporal ? lastSubtipoByName[nombre.toLowerCase()] || "" : "",
      // Si la tarea deja elegir entre varios equipos, se lleva una referencia
      // por cada uno por separado — la que se muestre depende de qué elija
      // el jugador en pantalla, no de una sola fija de antemano.
      // La clave incluye también modo, reps y RIR objetivo: cambiar el RIR o
      // pasar de bilateral a unilateral cuenta como una tarea distinta, con
      // su propia referencia — solo el número de series (volumen) no la
      // cambia. Si no hay marca con ese diseño exacto, se cae a la última
      // marca de ese mismo ejercicio+material sea cual sea el diseño
      // (mismoDiseno = false), para no dejar al jugador sin ninguna
      // referencia solo porque cambió el RIR o las reps — y en ese caso se
      // añade además una carga sugerida (ver resolverReferencia).
      ...(() => {
        const refPrincipal = eligeEquipo ? null : resolverReferencia(nombre, equipoUnico || "std", t.lateralidad === "unilateral", t.cantidad, t.rir);
        const refsPorEquipo = eligeEquipo
          ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, resolverReferencia(nombre, eq, t.lateralidad === "unilateral", t.cantidad, t.rir)]))
          : null;
        return {
          referencia: refPrincipal ? formatearReferencia(refPrincipal.registro) : null,
          referenciaMismoDiseno: refPrincipal ? refPrincipal.mismoDiseno : null,
          cargaSugerida: refPrincipal ? refPrincipal.cargaSugerida : null,
          referenciasPorEquipo: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, formatearReferencia(r.registro)])) : null,
          referenciasPorEquipoMismoDiseno: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, r.mismoDiseno])) : null,
          cargasSugeridasPorEquipo: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, r.cargaSugerida])) : null,
        };
      })(),
    };
  };

  tareas
    .filter((t) => (!t.fecha || t.fecha === date) && sesionActual && t.sesion_id === sesionActual.id)
    .forEach((t) => {
      const nombreBloque = t.bloque_sesion || "General";
      const tareaVisual = construirTareaVisual(t);
      if (t.circuito_id && circuitosById.has(t.circuito_id)) {
        if (!circuitoBuffer[t.circuito_id]) circuitoBuffer[t.circuito_id] = { nombreBloque, tareas: [] };
        circuitoBuffer[t.circuito_id].tareas.push({ ...tareaVisual, orden: Number(t.orden_en_circuito) || 999 });
      } else {
        if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
        bloques[nombreBloque].push({ tipo: "suelta", tarea: tareaVisual });
      }
    });

  Object.entries(circuitoBuffer).forEach(([circuitoId, datos]) => {
    if (!bloques[datos.nombreBloque]) bloques[datos.nombreBloque] = [];
    bloques[datos.nombreBloque].push({
      tipo: "circuito",
      circuitoId,
      rondas: circuitosById.get(circuitoId)?.rondas || 1,
      nombreGrupo: circuitosById.get(circuitoId)?.nombre || "",
      esGrupo: circuitosById.get(circuitoId)?.tipo === "grupo",
      tareas: datos.tareas.sort((a, b) => a.orden - b.orden),
    });
  });

  const todasLasTareas = Object.values(bloques)
    .flat()
    .flatMap((item) => (item.tipo === "circuito" ? item.tareas : [item.tarea]));
  const totalTareas = todasLasTareas.length;
  const totalHechas = todasLasTareas.filter((t) => !!hechoDraft[t.id]).length;
  // Progreso ponderado por duración estimada de cada tarea (ver pesoTareaAdherencia).
  const pesoTotal = todasLasTareas.reduce((sum, t) => sum + (t.pesoAdherencia || 0), 0);
  const pesoHecho = todasLasTareas.reduce((sum, t) => sum + (hechoDraft[t.id] ? t.pesoAdherencia || 0 : 0), 0);
  const progresoPonderado = pesoTotal > 0 ? (pesoHecho / pesoTotal) * 100 : totalTareas ? (totalHechas / totalTareas) * 100 : 0;

  const tareasVisualesById = new Map(todasLasTareas.map((t) => [t.id, t]));
  const getRegistro = (id) => {
    if (registrosDraft[id]) return registrosDraft[id];
    const t = tareasVisualesById.get(id);
    return { reps: "", carga: "", rir: "", subtipo: t?.subtipoDefault || "", series: "" };
  };
  const setRegistroDraft = (id, val) => setRegistrosDraft((prev) => ({ ...prev, [id]: val }));

  // Qué exige cada tipo de tarea, tal como me lo has descrito:
  // - Resistencia y CMJ tienen su propio registro (no reps/carga) -> fuera de esta comprobación.
  // - Corporal con banda de asistencia (resistencia elástica): exige reps, no carga (la banda no es un número de kg).
  // - Corporal con lastre: sí es peso añadido -> exige carga (el lastre) y reps.
  // - Corporal sin equipo (peso del propio cuerpo, sin lastre): no es peso libre -> exige reps, no carga.
  // - Cualquier otra (peso libre, con o sin elegir equipo): exige carga y reps.
  const registroIncompleto = (t) => {
    if (t.esResistencia || t.esCmj || t.esCore || t.esElastica) return false;
    const r = getRegistro(t.id);
    if (t.eligeEquipo && !(r.subtipo && t.equiposElegibles?.includes(r.subtipo))) return true; // aún no ha dicho con qué material
    if (t.esCorporal) {
      if (r.subtipo === "lastre") return !r.carga || !r.reps;
      return !r.reps;
    }
    return !r.carga || !r.reps;
  };
  const tareasSinRegistroCompleto = todasLasTareas.filter((t) => hechoDraft[t.id] && registroIncompleto(t));
  // Tareas hechas y con carga y reps pero sin RIR, en un ejercicio del que la
  // app aún no puede calcular el 1RM: sin RIR seguirá sin poder (ver
  // necesitaCalibrarE1rm). Aviso aparte y más suave: no bloquea el envío.
  const tareasSinRirParaCalibrar = todasLasTareas.filter((t) => {
    if (!hechoDraft[t.id] || registroIncompleto(t)) return false;
    const r = getRegistro(t.id);
    return necesitaCalibrarE1rm(t, r) && (r.rir === "" || r.rir == null);
  });

  // Aviso "el entrenador cambió la sesión desde tu último guardado": se
  // detectan dos cosas sobre los borradores (enviado: false) que el jugador
  // ya tuviera guardados para hoy — 1) el entrenador quitó/rehizo algún
  // ejercicio que el jugador ya había marcado (su tarea_id ya no existe en
  // la sesión actual), o 2) el ejercicio sigue ahí pero el entrenador le
  // cambió series/reps/RIR/%1RM/modo (guardado en snapshot_tarea al hacer
  // el borrador, se compara contra la tarea tal como está ahora).
  const borradoresDelJugador = tareaIdsSesionActual.map((id) => registrosByTarea.get(id)).filter((r) => r && r.enviado === false);
  const huboCambioComposicion = registros.some((r) => r.enviado === false && !tareaIdsSesionActual.includes(r.tarea_id));
  const huboCambioParametros = borradoresDelJugador.some((r) => {
    if (!r.snapshot_tarea) return false;
    const t = tareasVisualesById.get(r.tarea_id);
    if (!t) return false;
    try {
      const snap = JSON.parse(r.snapshot_tarea);
      return snap.series !== t.series || snap.cantidad !== t.cantidad || snap.rir !== t.rir || snap.pct1rm !== t.pct1rm || snap.modo !== t.modo;
    } catch {
      return false;
    }
  });
  const sesionModificadaDesdeBorrador = !yaEnviadaAntes && (huboCambioComposicion || huboCambioParametros);

  // Marcar/desmarcar hecho es SOLO local mientras no se guarde (borrador) o
  // confirme el envío — así una tarea tocada pero nunca guardada no genera
  // ningún registro real en el backend.
  const toggle = (t) => {
    setHechoDraft((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
  };

  // Construye las filas de "registros" a partir de lo marcado en pantalla.
  // Reutiliza el id de un registro que ya existiera para esa tarea (típico:
  // un "Guardar sin enviar" anterior) para que el guardado ACTUALICE esa
  // fila en vez de crear una duplicada — si no hay ninguno, se crea nueva.
  const construirRegistrosDesdeDraft = (enviadoFinal) =>
    todasLasTareas
      .filter((t) => hechoDraft[t.id])
      .map((t) => {
        const draft = getRegistro(t.id);
        const existente = registrosByTarea.get(t.id);
        return {
          // Id determinista (jugador + tarea + día): si un guardado falla a medias y el jugador
          // reintenta, se SOBREESCRIBE la misma fila en vez de crear un duplicado.
          id: existente ? existente.id : idRegistroFijo(player.id, t.id, date),
          jugador_id: player.id,
          tarea_id: t.id,
          fecha: date,
          hecho: true,
          reps_hechas: draft.reps,
          carga_kg: draft.carga,
          rir: draft.rir,
          subtipo_corporal: draft.subtipo || "",
          // Series completadas (un toque en la tarea): lo que marcó el
          // jugador, o las pautadas si no tocó nada. Solo si la tarea tiene
          // un nº de series numérico y no es Resistencia ni CMJ.
          ...seriesHechasDeRegistro(t, draft),
          enviado: enviadoFinal,
          // Solo hace falta guardar el "recordatorio" de con qué parámetros
          // se hizo mientras el registro sigue siendo un borrador — una vez
          // enviado de verdad ya no se usa para nada.
          snapshot_tarea: enviadoFinal ? "" : JSON.stringify({ series: t.series, cantidad: t.cantidad, rir: t.rir, pct1rm: t.pct1rm, modo: t.modo }),
        };
      });

  const confirmarEnvio = async () => {
    setEnviando(true);
    setErrorEnvio("");
    try {
      const nuevos = construirRegistrosDesdeDraft(true);
      const tareaIdsTocadas = new Set(nuevos.map((n) => n.tarea_id));
      const resto = registrosJugador.filter((r) => !(tareaIdsTocadas.has(r.tarea_id) && normalizarFecha(r.fecha) === date));
      // CRÍTICO: si esto falla o se queda a medias (sin conexión...) y no se
      // comprueba, el jugador ve "Sesión enviada" sin que se haya guardado
      // nada de verdad — y el entrenador se queda sin ningún registro sin
      // ninguna pista de qué pasó. Por eso, aquí SÍ se exige que el guardado
      // haya confirmado éxito antes de dar el envío por bueno.
      const ok = nuevos.length ? await saveRegistrosJugador([...resto, ...nuevos]) : true;
      if (ok) {
        borrarBorradorLocal(claveBorradorActual); // enviado de verdad: la copia local ya no hace falta
        // Molestia (opcional): si la tabla no existe o falla, no afecta al envío.
        if (molestia !== null) {
          try {
            await supabase.from("molestias").upsert({ id: `mol_${player.id}_${date}`, jugador_id: player.id, fecha: date, valor: molestia, zona: molestia > 0 ? molestiaZona || null : null }, { onConflict: "id" });
            sharedDataCache.delete("molestias_rec");
          } catch (e) {
            /* sin tabla de molestias: se ignora */
          }
        }
        setEnviado(true);
      } else {
        setErrorEnvio("No se pudo enviar. Sigues aquí con tu progreso guardado en pantalla — comprueba tu conexión y vuelve a intentarlo.");
      }
    } finally {
      setEnviando(false);
      setPidiendoConfirmacion(false);
    }
  };

  // "Guardar sin enviar": persiste el progreso marcado como borrador
  // (enviado: false) — no cuenta como sesión hecha en ninguna estadística ni
  // bloquea al entrenador para seguir editando la sesión, pero sí sobrevive
  // a un refresco de página o a que el jugador salga y vuelva a entrar.
  const guardarSinEnviar = async () => {
    setGuardandoBorrador(true);
    setErrorEnvio("");
    setBorradorGuardadoOk(false);
    try {
      const nuevos = construirRegistrosDesdeDraft(false);
      const tareaIdsTocadas = new Set(nuevos.map((n) => n.tarea_id));
      const resto = registrosJugador.filter((r) => !(tareaIdsTocadas.has(r.tarea_id) && normalizarFecha(r.fecha) === date));
      const ok = nuevos.length ? await saveRegistrosJugador([...resto, ...nuevos]) : true;
      if (ok) {
        setBorradorGuardadoOk(true);
      } else {
        setErrorEnvio("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setGuardandoBorrador(false);
    }
  };

  // Las tres pestañas compartidas entre Dashboard/Progreso/CMJ — "Sesión de
  // hoy" ya no es una pestaña, se abre aparte al pulsar "Ver sesión" desde
  // el Dashboard (ver JugadorHoy/JugadorDashboard del sistema de diseño).
  // Se muestran en BarraInferiorJugadorReal (barra fija abajo), ya no en el
  // DsTabSwitcher de arriba.
  const PLAYER_TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "calendario", label: "Calendario" },
    { id: "progreso", label: "Progreso" },
    { id: "cmj", label: "CMJ" },
  ];

  if (vistaJugador === "dashboard") {
    const sesionesEnviadasHoy = todaySesiones.length > 0 && estadoPorSesion.every((e) => e.completa);
    const session = sesionesEnviadasHoy
      ? { status: "completada" }
      : todaySesiones.length > 0
      ? { status: "hoy", tag: todaySesiones.length > 1 ? `${todaySesiones.length} sesiones hoy` : sesionActual?.objetivo || sesionActual?.md, taskCount: tareas.length }
      : proximaSesion
      ? { status: "proxima", dateLabel: fmtDateLabel(proximaSesion.fecha), detail: proximaSesion.sesion.objetivo, mdTag: proximaSesion.sesion.md }
      : { status: "ninguna" };
    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>
                HOY · {fmtDateLabel(date).toUpperCase()}
              </div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 23, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Hola, {player.name}</h1>
              {adherenciaSemanaActual != null && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <DsBadge tone={adherenciaSemanaActual >= 80 ? "success" : adherenciaSemanaActual >= 50 ? "accent" : "danger"}>
                    Adherencia esta semana: {adherenciaSemanaActual}%
                  </DsBadge>
                  {deltaAdherenciaSemana != null && deltaAdherenciaSemana !== 0 && (
                    <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: deltaAdherenciaSemana > 0 ? ds.success : ds.danger }}>
                      {deltaAdherenciaSemana > 0 ? "▲" : "▼"} {Math.abs(deltaAdherenciaSemana)} vs. semana pasada
                    </span>
                  )}
                </div>
              )}
              {diasSemana.some((d) => d.pautado) && (
                <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                  {diasSemana.map((d) => {
                    const colorFondo =
                      d.estado === "cumplido" ? ds.success : d.estado === "pendiente" ? ds.danger : d.estado === "hoy" ? ds.accent : d.estado === "futuro" ? ds.bgElevated : "transparent";
                    const colorTexto = d.estado === "cumplido" || d.estado === "pendiente" ? ds.accentInk : d.estado === "hoy" ? ds.accentInk : d.estado === "futuro" ? ds.inkSecondary : ds.inkMuted;
                    return (
                      <div
                        key={d.fecha}
                        title={`${fmtDateLabel(d.fecha)}${d.pautado ? (d.estado === "cumplido" ? " · sesión hecha" : d.estado === "hoy" ? " · sesión de hoy" : d.estado === "futuro" ? " · sesión pautada" : " · sesión no hecha") : " · sin sesión"}`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: dsR.full,
                          background: colorFondo,
                          border: d.pautado ? "none" : `1px solid ${ds.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: dsF.mono,
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: d.pautado ? colorTexto : ds.inkMuted,
                        }}
                      >
                        {d.etiqueta}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          <div style={{ marginTop: 20, marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Sesión</div>
          {session.status === "hoy" && (
            <DsCard style={{ borderColor: ds.accentBorderSubtle, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.accentSubtle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.accent }}><Zap size={19} fill={ds.accent} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Tienes una sesión disponible hoy</div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>
                    {session.tag}
                    {session.taskCount != null ? ` · ${session.taskCount} tareas` : ""}
                  </div>
                </div>
              </div>
              <DsButton onClick={() => setVistaJugador("sesion")} style={{ width: "100%", marginTop: 12 }}>
                Ver sesión →
              </DsButton>
            </DsCard>
          )}
          {session.status === "completada" && (
            <DsCard status="done" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: `${ds.success}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.success, fontSize: 18 }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Sesión de hoy enviada</div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>Tu próxima sesión aparecerá aquí cuando toque.</div>
                </div>
              </div>
            </DsCard>
          )}
          {session.status === "proxima" && (
            <DsCard style={{ padding: "14px 16px", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary }}><Calendar size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                  {session.dateLabel}
                  {session.detail ? ` · ${session.detail}` : ""}
                </div>
                <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>Hoy no tienes sesión — esta es la próxima</div>
              </div>
              {session.mdTag && <DsBadge>{session.mdTag}</DsBadge>}
            </DsCard>
          )}
          {session.status === "ninguna" && (
            <div style={{ background: ds.surface, border: `1px dashed ${ds.border}`, borderRadius: dsR.lg, padding: 16, textAlign: "center", color: ds.inkMuted, fontSize: 13 }}>
              Aún no tienes sesiones disponibles. Cuando tu entrenador publique una, aparecerá aquí.
            </div>
          )}

          {(recordCarga || (cmjMejores && cmjMejores.altura != null)) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Tus récords</div>
              <div style={{ display: "flex", gap: 8 }}>
                {recordCarga && (
                  <div style={{ flex: 1, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                    <Dumbbell size={16} color={ds.accent} strokeWidth={1.75} />
                    <div style={{ fontFamily: dsF.display, fontSize: 19, fontWeight: 700, marginTop: 6 }}>
                      {recordCarga.valor}<span style={{ fontSize: 12.5, fontWeight: 400, color: ds.inkSecondary }}> kg</span>
                    </div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginTop: 2 }}>{recordCarga.nombre} · 1RM est. · récord</div>
                    {recordCarga.pctSobreAnterior != null && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, marginTop: 4 }}>
                        +{recordCarga.pctSobreAnterior.toFixed(0)}% sobre tu récord anterior
                      </div>
                    )}
                  </div>
                )}
                {cmjMejores && cmjMejores.altura != null && (
                  <div style={{ flex: 1, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                    <Dumbbell size={16} color={ds.accent} strokeWidth={1.75} />
                    <div style={{ fontFamily: dsF.display, fontSize: 19, fontWeight: 700, marginTop: 6 }}>
                      {cmjMejores.altura.toFixed(1)}<span style={{ fontSize: 12.5, fontWeight: 400, color: ds.inkSecondary }}> cm</span>
                    </div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginTop: 2 }}>Salto CMJ · mejor</div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginTop: 4, letterSpacing: "0.02em" }}>
                      P {cmjMejores.potenciaRel != null ? cmjMejores.potenciaRel.toFixed(1) : "—"} · F {cmjMejores.fuerzaRel != null ? cmjMejores.fuerzaRel.toFixed(1) : "—"} · V {cmjMejores.velocidad != null ? cmjMejores.velocidad.toFixed(2) : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mejorasSemana.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <details style={{ background: `${ds.success}1A`, border: `1px solid ${ds.success}55`, borderRadius: dsR.md, padding: "12px 14px" }}>
                <summary style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ color: ds.success, flexShrink: 0 }}>↗</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Mejora destacada</div>
                    <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>
                      {mejorasSemana[0].nombre}: <b style={{ color: ds.success, fontWeight: 700 }}>+{mejorasSemana[0].pct.toFixed(0)}%</b> de {mejorasSemana[0].conCarga ? "1RM estimado" : "reps al fallo estimadas"} respecto a tu media reciente.
                    </div>
                    {mejorasSemana.length > 1 && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.success, marginTop: 6 }}>
                        y {mejorasSemana.length - 1} ejercicio{mejorasSemana.length - 1 === 1 ? "" : "s"} más {mejorasSemana.length - 1 === 1 ? "mejoró" : "mejoraron"} esta semana ▾
                      </div>
                    )}
                  </div>
                </summary>
                {mejorasSemana.length > 1 && (
                  <div style={{ margin: "10px 0 0 26px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {mejorasSemana.slice(1).map((c, i) => (
                      <div key={`${c.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: ds.ink }}>{c.nombre}</span>
                        <span style={{ color: ds.success, fontWeight: 600 }}>+{c.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          )}

          {descensosSemana.length > 0 && (
            <div style={{ marginTop: mejorasSemana.length > 0 ? 8 : 20 }}>
              <details style={{ background: `${ds.danger}1A`, border: `1px solid ${ds.danger}55`, borderRadius: dsR.md, padding: "12px 14px" }}>
                <summary style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ color: ds.danger, flexShrink: 0 }}>↘</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Descenso destacado</div>
                    <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>
                      {descensosSemana[0].nombre}: <b style={{ color: ds.danger, fontWeight: 700 }}>{descensosSemana[0].pct.toFixed(0)}%</b> de {descensosSemana[0].conCarga ? "1RM estimado" : "reps al fallo estimadas"} respecto a tu media reciente.
                    </div>
                    {descensosSemana.length > 1 && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.danger, marginTop: 6 }}>
                        y {descensosSemana.length - 1} ejercicio{descensosSemana.length - 1 === 1 ? "" : "s"} más {descensosSemana.length - 1 === 1 ? "bajó" : "bajaron"} ▾
                      </div>
                    )}
                  </div>
                </summary>
                {descensosSemana.length > 1 && (
                  <div style={{ margin: "10px 0 0 26px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {descensosSemana.slice(1).map((c, i) => (
                      <div key={`${c.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: ds.ink }}>{c.nombre}</span>
                        <span style={{ color: ds.danger, fontWeight: 600 }}>{c.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          )}

          {mejorasSemana.length === 0 && descensosSemana.length === 0 && sinCambioSemana.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", gap: 10 }}>
                <span style={{ color: ds.accent, flexShrink: 0 }}>–</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Sin cambios esta semana</div>
                  <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>{sinCambioSemana[0].nombre}: misma carga que tu media reciente.</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Salto (CMJ)</div>
            {cmjDashboardDelta ? (
              <div
                onClick={() => setVistaJugador("cmj")}
                style={{ background: `${cmjDashboardDelta.color}1A`, border: `1px solid ${cmjDashboardDelta.color}55`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {cmjDashboardDelta.valor} cm <span style={{ color: ds.inkSecondary, fontWeight: 400, fontSize: 12 }}>· {cmjDashboardDelta.fechaLabel}</span>
                  </div>
                  <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: cmjDashboardDelta.color, marginTop: 3 }}>
                    {cmjDashboardDelta.pct == null
                      ? "aún sin ciclo anterior con el que comparar"
                      : `${cmjDashboardDelta.pct >= 0 ? "▲" : "▼"} ${Math.abs(cmjDashboardDelta.pct).toFixed(1)}% vs tu último ${cmjDashboardDelta.tagLabel || "test"}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: ds.accent, flexShrink: 0 }}>Ver →</span>
              </div>
            ) : (
              <div style={{ background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px", color: ds.inkMuted, fontSize: 12.5, lineHeight: 1.4 }}>
                Aún no hay tests CMJ vinculados a ti. En cuanto tu entrenador suba un CSV con tus saltos, aparecerán aquí.
              </div>
            )}
          </div>
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="dashboard" onChange={setVistaJugador} />
      </>
    );
  }

  if (vistaJugador === "cmj") {
    // Comparativas de la pestaña, ambas sobre "altura" (la métrica que ya
    // "drivesStatus" como principal en toda la app):
    // 1) dentro del propio microciclo, MD-2/MD+1 contra el Inicio de esa
    //    semana — reutiliza el cálculo que ya hace cmjBuildPlayers para el
    //    entrenador (metrics.altura.md2Delta/md1Delta), no se recalcula.
    // 2) mismo día de medida (p. ej. MD-2 contra MD-2), microciclo anterior
    //    contra el actual — cmjDeltaMismoDiaCicloAnterior, arriba.
    const microActualCmj = cmjPlayer && ultimoTestCmj && ultimoTestCmj.microId != null ? cmjPlayer.microResults.get(ultimoTestCmj.microId) : null;
    const withinCicloDeltaCmj =
      microActualCmj && microActualCmj.metrics && microActualCmj.metrics.altura
        ? ultimoTestCmjTag === "md2"
          ? microActualCmj.metrics.altura.md2Delta
          : ultimoTestCmjTag === "md1"
          ? microActualCmj.metrics.altura.md1Delta
          : null
        : null;

    // Tendencia: solo los puntos con el MISMO día de medida que el último
    // test (p. ej. solo MD-2 de cada microciclo) — comparar entre sí
    // microciclos distintos con el mismo estímulo, no mezclar MD-2 con
    // Inicio en la misma línea.
    const tendenciaMismoDiaCmj = ultimoTestCmjTag
      ? cmjMicroList
          .map((m) => {
            const r = cmjPlayer.microResults.get(m.id);
            const fila = r ? r[ultimoTestCmjTag] : null;
            return fila ? { date: fila.date, valor: CMJ_METRICS.altura.get(fila), rir: "" } : null;
          })
          .filter((p) => p && p.valor != null)
      : [];

    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{player.name}</div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Salto (CMJ)</h1>
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          {cmjPlayer && ultimoTestCmj ? (
            <>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.05em", color: ds.accent, marginTop: 14, marginBottom: 10, textTransform: "uppercase" }}>
                Última medición{ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? ` · ${CMJ_TAG_META[ultimoTestCmjTag].label}` : ""} · {fmtHaceDias(ultimoTestCmj.date)}
              </div>

              {/* 4 tiles con la marca cruda de cada variable + su mejor marca — sin
                  necesitar una tarjeta de PR aparte, cada tile lleva la suya. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {CMJ_METRIC_LIST.map((m) => {
                  const valor = m.get(ultimoTestCmj);
                  const mejor = cmjMejores ? cmjMejores[m.key] : null;
                  const esMejorMarca = valor != null && mejor != null && Math.abs(valor - mejor) < 1e-9;
                  return (
                    <div key={m.key} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                      <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginTop: 6 }}>
                        {valor != null ? valor.toFixed(m.decimals) : "—"}
                        <span style={{ fontSize: 12, color: ds.inkSecondary, fontWeight: 400 }}> {m.unit}</span>
                      </div>
                      {esMejorMarca ? (
                        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, marginTop: 4 }}>★ Es tu mejor marca</div>
                      ) : (
                        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.accent, marginTop: 4 }}>{mejor != null ? `Mejor: ${mejor.toFixed(m.decimals)} ${m.unit}` : "Sin dato aún"}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dos comparativas, no una — cada una responde una pregunta distinta
                  y mezclarlas en un solo % induce a error (ver mockup/discusión). */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.inkMuted, textTransform: "uppercase" }}>Dentro de ese microciclo</div>
                    <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 3 }}>vs. el Inicio de ese microciclo</div>
                  </div>
                  <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700, color: ds.inkSecondary }}>
                    {withinCicloDeltaCmj == null ? "—" : `${withinCicloDeltaCmj >= 0 ? "▲" : "▼"} ${Math.abs(withinCicloDeltaCmj).toFixed(1)}%`}
                  </div>
                </div>
                <div style={{ background: `${ds.success}1A`, border: `1px solid ${ds.success}55`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.inkSecondary, textTransform: "uppercase" }}>
                      Frente a tu último {ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : "test"}
                    </div>
                    <div style={{ fontSize: 12, color: ds.ink, marginTop: 3 }}>Mismo punto del microciclo anterior</div>
                  </div>
                  <div style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 700, color: cmjComparativaCicloAnterior == null ? ds.inkMuted : cmjComparativaCicloAnterior.pct >= 0 ? ds.success : ds.danger }}>
                    {cmjComparativaCicloAnterior == null ? "—" : `${cmjComparativaCicloAnterior.pct >= 0 ? "▲" : "▼"} ${Math.abs(cmjComparativaCicloAnterior.pct).toFixed(1)}%`}
                  </div>
                </div>
              </div>

              {tendenciaMismoDiaCmj.length >= 2 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, textTransform: "uppercase", marginBottom: 2 }}>
                    Altura en {ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : "el mismo día"} · últimos microciclos
                  </div>
                  <div style={{ fontSize: 10.5, color: ds.inkMuted, marginBottom: 8 }}>Compara siempre el mismo día de medida — no se mezcla con otros días.</div>
                  <DsCard>
                    <GraficaProgresoCargaReal puntos={tendenciaMismoDiaCmj} unidad="cm" />
                  </DsCard>
                </div>
              )}
            </>
          ) : (
            <div style={{ border: `1px dashed ${ds.border}`, borderRadius: dsR.lg, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, color: ds.inkMuted, marginTop: 18 }}>
              <div style={{ fontSize: 13.5, color: ds.ink, fontWeight: 600 }}>Aún no hay tests CMJ vinculados</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 260 }}>En cuanto tu entrenador suba un CSV con tus saltos y queden vinculados a ti, aparecerán aquí.</div>
            </div>
          )}
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="cmj" onChange={setVistaJugador} />
      </>
    );
  }

  if (vistaJugador === "calendario") {
    return (
      <CalendarioJugadorReal
        player={player}
        hoy={date}
        fechasAsignadasJugador={fechasAsignadasJugador}
        fechasConRegistro={fechasConRegistro}
        rachaSemanas={rachaSemanas}
        onVerSesionHoy={() => setVistaJugador("sesion")}
        onExit={onExit}
        tabs={PLAYER_TABS}
        onChangeTab={setVistaJugador}
      />
    );
  }

  // "Mi progreso" es su propia pantalla, independiente de si la sesión de
  // hoy está enviada o no — así se ve igual entres por la pestaña o por el
  // botón de la pantalla de "Sesión enviada". Se comprueba ANTES que el
  // "enviado", que si no, esa pantalla no dejaba llegar aquí nunca: era el
  // fallo que has visto.
  if (vistaJugador === "progreso") {
    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{player.name}</div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Tu progreso</h1>
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>
          <div style={{ marginTop: 18 }} />
          <MiProgresoJugadorReal items={historyItems} loaded={historyLoaded} historialSemanas={historialSemanas} rachaSemanas={rachaSemanas} />
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="progreso" onChange={setVistaJugador} />
      </>
    );
  }

  if (vistaJugador === "sesion" && (enviado || yaEnviadaAntes)) {
    const otrasPendientes = todaySesiones.length > 1 && estadoPorSesion.some((e) => e.sesion.id !== sesionActual?.id && !e.completa);
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: dsR.full, background: ds.bgElevated, border: `2px solid ${ds.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: ds.success }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: ds.ink }}>Sesión enviada</div>
          <div style={{ fontSize: 13, color: ds.inkSecondary, maxWidth: 260, lineHeight: 1.5 }}>
            {otrasPendientes ? "Todavía te queda otra sesión de hoy por hacer." : "Tu próxima sesión estará disponible aquí cuando toque."}
          </div>
          {otrasPendientes && (
            <DsButton
              onClick={() => {
                setSesionSeleccionadaId(null);
                setEnviado(false);
                setHechoDraft({});
                setRegistrosDraft({});
              }}
              style={{ marginTop: 4 }}
            >
              Ver la otra sesión de hoy
            </DsButton>
          )}
          <DsButton variant="secondary" onClick={() => setVistaJugador("progreso")} style={{ marginTop: 8, borderColor: ds.accentBorderSubtle, color: ds.accent }}>
            Ver mi progreso
          </DsButton>
          <DsButton variant="secondary" onClick={() => setVistaJugador("dashboard")}>← Volver al dashboard</DsButton>
        </div>
      </PantallaBase>
    );
  }

  // P6 — récord en vivo: cualquier tarea de Fuerza marcada como hecha cuya
  // carga registrada ahora mismo supera su mejor marca histórica (antes de
  // hoy). El halo/badge de la tarea se calcula para todas ellas; el toast
  // puntual solo se muestra para la primera que no se haya descartado a
  // mano, para no apilar varios avisos a la vez.
  const recordsEnVivo = todasLasTareas
    .filter((t) => !t.esResistencia && !t.esCmj && hechoDraft[t.id])
    .map((t) => {
      const r = getRegistro(t.id);
      const cargaNum = r.carga !== "" && r.carga != null ? Number(r.carga) : null;
      if (cargaNum == null || Number.isNaN(cargaNum)) return null;
      // El equipo usado ahora mismo (elegido en el registro, o el único
      // posible de la tarea) decide contra qué histórico se compara — un PR
      // en multipower no se mide contra la marca en barra libre.
      const equipoRegistro = t.eligeEquipo ? r.subtipo : t.equipoUnico || "std";
      if (t.eligeEquipo && !equipoRegistro) return null; // sin material elegido todavía, no hay con qué comparar
      const mejorPrevio = mejorHistoricoPorClave.get(`${t.nombre}::${equipoRegistro}`);
      if (mejorPrevio != null && cargaNum <= mejorPrevio) return null;
      const pct = mejorPrevio ? ((cargaNum - mejorPrevio) / mejorPrevio) * 100 : null;
      return { id: t.id, nombre: t.nombre, valor: cargaNum, mejorPrevio: mejorPrevio ?? null, pct };
    })
    .filter(Boolean);
  const recordsEnVivoIds = new Set(recordsEnVivo.map((r) => r.id));
  const toastRecordActivo = recordsEnVivo.find((r) => !recordsDescartados.includes(r.id)) || null;

  return (
    <PantallaBase rol="jugador" maxWidth={480}>
      <div>
        <button
          onClick={() => setVistaJugador("dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver al dashboard
        </button>
        {todaySesiones.length > 1 && (
          <button
            onClick={() => setSesionSeleccionadaId(null)}
            style={{ display: "block", background: "transparent", border: "none", color: ds.accent, fontSize: 11.5, cursor: "pointer", padding: 0, marginBottom: 10 }}
          >
            Elegir otra sesión de hoy
          </button>
        )}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>
            HOY · {fmtDateLabel(date).toUpperCase()}
          </div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Sesión de hoy</h1>
          {sesionModificadaDesdeBorrador && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${ds.warning}18`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", marginTop: 10, fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, color: ds.warning }} />
              Tu entrenador ha modificado esta sesión desde tu último guardado. Revisa los ejercicios antes de continuar — lo que ya tenías marcado sigue aquí, pero algo ha cambiado.
            </div>
          )}
          {totalTareas > 0 && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 16 }}>
              <DsProgressRing value={progresoPonderado} size={72} strokeWidth={7} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {totalHechas} de {totalTareas} tarea{totalTareas === 1 ? "" : "s"} completada{totalTareas === 1 ? "" : "s"}
                </div>
                {pesoTotal > 0 && (
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>
                    {formatearDuracionDiseno(pesoHecho)} de {formatearDuracionDiseno(pesoTotal)} de trabajo
                  </div>
                )}
                {(sesionActual?.objetivo || sesionActual?.md) && (
                  <div style={{ marginTop: 6 }}>
                    <DsBadge tone="accent">
                      {[sesionActual?.objetivo, sesionActual?.md].filter(Boolean).join(" · ").toUpperCase()}
                    </DsBadge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* P6: toast momentáneo, en el flujo normal del layout (empuja el
            resto hacia abajo en vez de flotar encima) — así nunca puede
            solaparse ni con la cabecera ni con la lista de tareas. */}
        {toastRecordActivo && (
          <div
            style={{
              marginBottom: 18,
              background: ds.surface,
              border: `1px solid ${ds.accent}`,
              borderRadius: dsR.xl,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: dsSh.elevation2,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: dsR.full, background: ds.accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ds.accentInk} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 9 9l-7 1 5 5-1.5 7L12 18l6.5 4L17 15l5-5-7-1-3-7Z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: dsF.display, fontSize: 14.5, fontWeight: 700, color: ds.ink }}>¡Nuevo récord!</div>
              <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 2 }}>
                {toastRecordActivo.nombre} · {toastRecordActivo.valor} kg
              </div>
              {toastRecordActivo.pct != null && (
                <div style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.accent, marginTop: 3 }}>
                  ▲ {toastRecordActivo.pct >= 0 ? "+" : ""}
                  {toastRecordActivo.pct.toFixed(1)}% sobre tu marca anterior ({toastRecordActivo.mejorPrevio} kg)
                </div>
              )}
            </div>
            <button
              onClick={() => setRecordsDescartados((prev) => [...prev, toastRecordActivo.id])}
              aria-label="Descartar aviso de récord"
              style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {!loaded ? (
          <LoadingBlock />
        ) : totalTareas === 0 ? (
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: 20, textAlign: "center", color: ds.inkSecondary }}>
            <div style={{ marginBottom: 6 }}>No tienes sesión de fuerza asignada hoy.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              {Object.entries(bloques).map(([nombreBloque, tareasBloque]) => (
                <div key={nombreBloque}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingLeft: 2 }}>
                    <span style={{ width: 5, height: 5, borderRadius: dsR.full, background: ds.accent, flexShrink: 0 }} />
                    <span style={{ fontFamily: dsF.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: ds.inkSecondary, textTransform: "uppercase" }}>{nombreBloque}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tareasBloque.map((item, idx) =>
                      item.tipo === "circuito" ? (
                        <CircuitoJugadorReal
                          key={item.circuitoId}
                          tareas={item.tareas}
                          rondas={item.rondas}
                          nombreGrupo={item.nombreGrupo}
                          esGrupo={item.esGrupo}
                          hechoDraft={hechoDraft}
                          onToggle={toggle}
                          getRegistro={getRegistro}
                          onCambiarRegistro={setRegistroDraft}
                          onAmpliarGif={setGifAmpliado}
                          mostrarRegistro={nombreBloque === "Fuerza"}
                        />
                      ) : (
                        <TareaCardReal
                          key={item.tarea.id}
                          tarea={item.tarea}
                          hecho={!!hechoDraft[item.tarea.id]}
                          onToggle={() => toggle(item.tarea)}
                          registro={getRegistro(item.tarea.id)}
                          onCambiarRegistro={(val) => setRegistroDraft(item.tarea.id, val)}
                          onAmpliarGif={() => {
                            const v = videoEfectivoTarea(item.tarea, getRegistro(item.tarea.id));
                            if (v) setGifAmpliado(v);
                          }}
                          mostrarRegistro={nombreBloque === "Fuerza" || nombreBloque === "CMJ"}
                          esRecordNuevo={recordsEnVivoIds.has(item.tarea.id)}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errorEnvio && (
              <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "10px 12px", marginTop: 22 }}>{errorEnvio}</div>
            )}
            {borradorGuardadoOk && !pidiendoConfirmacion && (
              <div style={{ color: ds.success, fontSize: 12.5, background: `${ds.success}18`, border: `1px solid ${ds.successBorderSubtle}`, borderRadius: dsR.md, padding: "10px 12px", marginTop: 22 }}>
                Progreso guardado. Tu entrenador puede seguir tocando la sesión mientras no la envíes — vuelve cuando quieras para terminarla y enviarla.
              </div>
            )}
            {!pidiendoConfirmacion && (
              <button
                onClick={guardarSinEnviar}
                disabled={totalHechas === 0 || guardandoBorrador || enviando}
                style={{
                  width: "100%",
                  marginTop: 14,
                  background: "transparent",
                  border: `1px solid ${ds.border}`,
                  color: totalHechas === 0 ? ds.inkMuted : ds.inkSecondary,
                  borderRadius: dsR.lg,
                  padding: "11px 16px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: totalHechas === 0 ? "not-allowed" : "pointer",
                  opacity: totalHechas === 0 ? 0.6 : guardandoBorrador ? 0.6 : 1,
                }}
                title="Guarda lo marcado sin enviarlo todavía — tu entrenador podrá seguir editando la sesión, y tú lo recuperarás la próxima vez que entres."
              >
                {guardandoBorrador ? "Guardando..." : "Guardar sin enviar"}
              </button>
            )}
            {pidiendoConfirmacion ? (
              <div style={{ marginTop: 22 }}>
                <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 12px 10px", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>¿Alguna molestia hoy? <span style={{ fontWeight: 400, color: ds.inkMuted }}>(opcional)</span></div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 8 }}>0 = ninguna · 10 = muy fuerte. Así tu entrenador puede ajustarte la carga a tiempo.</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                      <button key={n} type="button" onClick={() => setMolestia(molestia === n ? null : n)} style={{ width: 34, height: 34, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", border: `1px solid ${molestia === n ? (n >= 5 ? ds.danger : ds.accent) : ds.border}`, background: molestia === n ? (n >= 5 ? `${ds.danger}22` : ds.accentSubtle) : "transparent", color: molestia === n ? (n >= 5 ? ds.danger : ds.accent) : ds.inkSecondary }}>{n}</button>
                    ))}
                  </div>
                  {molestia !== null && molestia > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {["Isquios", "Cuádriceps", "Gemelo", "Aductores", "Rodilla", "Tobillo", "Espalda", "Hombro", "Otra"].map((z) => (
                        <button key={z} type="button" onClick={() => setMolestiaZona(molestiaZona === z ? "" : z)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${molestiaZona === z ? ds.accent : ds.border}`, background: molestiaZona === z ? ds.accentSubtle : "transparent", color: molestiaZona === z ? ds.accent : ds.inkSecondary }}>{z}</button>
                      ))}
                    </div>
                  )}
                </div>
                {totalHechas < totalTareas && (
                  <div style={{ display: "flex", gap: 8, background: `${ds.warning}18`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10 }}>
                    <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={14} /></span>
                    <span style={{ fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
                      Vas a enviar la sesión con {totalTareas - totalHechas} tarea{totalTareas - totalHechas === 1 ? "" : "s"} sin hacer. Tu entrenador la verá como incompleta.
                    </span>
                  </div>
                )}
                {tareasSinRegistroCompleto.length > 0 && (
                  <div style={{ display: "flex", gap: 8, background: `${ds.warning}18`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10 }}>
                    <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={14} /></span>
                    <span style={{ fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
                      {tareasSinRegistroCompleto.length === 1 ? "Esta tarea está marcada como hecha pero le falta" : "Estas tareas están marcadas como hechas pero les falta"} registrar carga o repeticiones:{" "}
                      {tareasSinRegistroCompleto.map((t) => t.nombre).join(", ")}.
                    </span>
                  </div>
                )}
                {tareasSinRirParaCalibrar.length > 0 && (
                  <div style={{ display: "flex", gap: 8, background: `${ds.accent}14`, border: `1px solid ${ds.accent}55`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10 }}>
                    <span style={{ color: ds.accent, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={14} /></span>
                    <span style={{ fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
                      Falta el RIR en {tareasSinRirParaCalibrar.map((t) => t.nombre).join(", ")}. Es la primera vez y sin él la app no puede calcular tu 1RM ni recomendarte carga la próxima vez.
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <DsButton variant="secondary" onClick={() => setPidiendoConfirmacion(false)} disabled={enviando} style={{ flex: 1 }}>
                    Cancelar
                  </DsButton>
                  <button
                    onClick={confirmarEnvio}
                    disabled={enviando}
                    style={{ flex: 2, background: ds.success, border: `1px solid ${ds.success}`, color: ds.accentInk, borderRadius: dsR.lg, padding: "13px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: enviando ? 0.6 : 1 }}
                  >
                    {enviando ? "Enviando..." : totalHechas < totalTareas ? "Enviar de todos modos" : "Confirmar envío"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPidiendoConfirmacion(true)}
                disabled={totalHechas === 0}
                style={{
                  width: "100%",
                  marginTop: 22,
                  background: totalHechas === totalTareas ? ds.success : totalHechas > 0 ? ds.bgElevated : ds.bgElevated,
                  border: `1px solid ${totalHechas === totalTareas ? ds.success : ds.border}`,
                  color: totalHechas === totalTareas ? ds.accentInk : totalHechas > 0 ? ds.ink : ds.inkMuted,
                  borderRadius: dsR.lg,
                  padding: "13px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: totalHechas === 0 ? "not-allowed" : "pointer",
                  opacity: totalHechas === 0 ? 0.6 : 1,
                }}
              >
                {totalHechas === totalTareas ? "Enviar sesión completada" : totalHechas > 0 ? `Enviar progreso (${totalHechas}/${totalTareas})` : "Marca al menos una tarea para enviar"}
              </button>
            )}
          </>
        )}
      </div>

      {gifAmpliado && (
        <div onClick={() => setGifAmpliado(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <VideoEmbed url={gifAmpliado} />
          </div>
          <button
            onClick={() => setGifAmpliado(null)}
            style={{ position: "absolute", top: 20, right: 20, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, width: 34, height: 34, borderRadius: dsR.full, fontSize: 16, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}
    </PantallaBase>
  );
}


// ---------- BIBLIOTECA DE EJERCICIOS (calcado de biblioteca-ejercicios.jsx) ----------

// Unidad real de cada tarea según su "modo" (elegido al diseñarla) — antes
// se mostraba siempre "reps" tanto en la pantalla del jugador como en el
// historial del entrenador, sin mirar este campo, aunque la tarea fuera de
// tiempo o de distancia.
// Equipos cuya carga no es comparable entre sí aunque el número de kg
// coincida (una Barra, un Multipower, una Mancuerna, una Kettlebell, una
// Máquina y un Trineo cargan de forma distinta) — cuando una tarea tiene dos
// o más de estos seleccionados a la vez, se le pregunta al jugador cuál usó
// de verdad, en vez de asumir uno.
// Un material cuenta como "equipo" (distinto del resto a efectos de comparar
// cargas y de preguntar al jugador cuál usa) salvo que sea un accesorio sin
// carga. Antes era una lista cerrada (Barra, Mancuerna...) y materiales como
// Polea nunca disparaban la pregunta de "¿con qué material?".
const ACCESORIOS_SIN_CARGA = ["ninguno", "std", "banco", "step", "cajón", "caja", "colchoneta", "suelo", "pared", "banda", "goma", "bosu", "fitball", "foam roller", "rodillo", "valla", "cono", "aro", "escalera"].map((x) => x.toLowerCase());
const EQUIPOS_AMBIGUOS = {
  includes: (m) => !!m && !ACCESORIOS_SIN_CARGA.includes(String(m).trim().toLowerCase()),
};

// Define qué hace que dos tareas sean "la misma" a efectos de comparar
// carga entre sesiones: mismo ejercicio, mismo equipo efectivamente usado,
// mismo modo (uni/bilateral) y mismo objetivo de reps + RIR. Las series NO
// entran en la clave — cambiar el número de series es solo volumen, no un
// diseño de tarea distinto.
function materialEfectivo(it) {
  const mats = it.materiales || [];
  const ambiguos = mats.filter((m) => EQUIPOS_AMBIGUOS.includes(m));
  if (ambiguos.length >= 2) return it.subtipoCorporal || ambiguos[0];
  if (ambiguos.length === 1) return ambiguos[0];
  return mats[0] || "std";
}

function claveDisenoTarea(nombre, equipo, unilateral, repsObjetivo, rirObjetivo) {
  return [(nombre || "").toLowerCase(), equipo || "std", unilateral ? "uni" : "bi", repsObjetivo ?? "", rirObjetivo ?? ""].join("::");
}

// TABLA_PCT_1RM_POR_RTF, REPS_MAX_RIR_FIABLE y pct1RMporRTF ahora en
// src/calc/e1rm.js — importadas arriba.

// Motor de "récord de carga" (e1RM) del jugador, extraído a una función
// reutilizable — es EXACTAMENTE el mismo cálculo que ya vive dentro de la
// pantalla del jugador (agrupar por ejercicio+equipo con materialEfectivo,
// e1RM por marca con e1rmDeRegistro/pct1RMporRTF, mejor marca vs. segunda
// mejor para el "% sobre tu récord anterior"), aquí compartido por la ficha
// del entrenador: el record-callout de Resumen y "Récords personales" de
// Progreso (Fase 6 → Equipos y usuarios) NO reinventan el cálculo, lo leen
// de aquí. Devuelve un registro por ejercicio+equipo con al menos un e1RM
// válido, con su mejor marca actual, la fecha en que se logró, el % sobre
// la siguiente mejor marca, y la serie cronológica completa de e1RM (para
// la mini-gráfica "línea discontinua en la mejor marca + anillo verde").
function calcularRecordsCargaJugador(items) {
  const registrosConCarga = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null);
  const equiposPorNombre = new Map();
  items
    .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ")
    .forEach((it) => {
      const eq = materialEfectivo(it);
      if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
      equiposPorNombre.get(it.name).add(eq);
    });
  const etiqueta = (nombre, equipo) => ((equiposPorNombre.get(nombre)?.size || 0) > 1 && equipo && equipo !== "std" ? `${nombre} (${equipo})` : nombre);
  const e1rmDeRegistro = (it) => e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
  const registrosPorEjercicio = new Map();
  registrosConCarga.forEach((it) => {
    const equipo = materialEfectivo(it);
    const clave = `${it.name}::${equipo}`;
    if (!registrosPorEjercicio.has(clave)) registrosPorEjercicio.set(clave, { nombre: it.name, equipo, regs: [] });
    registrosPorEjercicio.get(clave).regs.push(it);
  });
  const records = [];
  registrosPorEjercicio.forEach(({ nombre, equipo, regs }, clave) => {
    const conE1rm = regs.map((it) => ({ it, e1rm: e1rmDeRegistro(it) })).filter((x) => x.e1rm != null);
    if (!conE1rm.length) return;
    const ordenados = [...conE1rm].sort((a, b) => b.e1rm - a.e1rm);
    const maxActual = ordenados[0];
    const maxAnterior = ordenados.find((x) => x.it.id !== maxActual.it.id && x.e1rm < maxActual.e1rm);
    const pctSobreAnterior = maxAnterior ? ((maxActual.e1rm - maxAnterior.e1rm) / maxAnterior.e1rm) * 100 : null;
    const puntosCron = [...conE1rm].sort((a, b) => new Date(a.it.date) - new Date(b.it.date));
    records.push({
      clave,
      nombre: etiqueta(nombre, equipo),
      valor: Math.round(maxActual.e1rm),
      fecha: maxActual.it.date,
      pctSobreAnterior,
      puntos: puntosCron.map(({ it, e1rm }) => ({ date: it.date, valor: Math.round(e1rm), reps: it.repsReal, rir: it.rirReal })),
    });
  });
  return records;
}

// Variación de fuerza por ejercicio+equipo (ENT-01), compartida por el
// Dashboard del entrenador ("Quién necesita atención") y la ficha del
// jugador. Es la MISMA lógica que "Cambios esta semana" de la pantalla del
// jugador: por cada ejercicio+equipo compara el valor estimado de lo último
// hecho dentro de la ventana [inicio, fin] con la media de todo lo hecho
// ANTES de la ventana. El valor es el e1RM (carga / %1RM del RTF = reps +
// RIR) si ese ejercicio maneja carga, o las reps al fallo (reps + RIR) si
// nunca la lleva (p. ej. dominadas). Sustituye a la media de kg de todos los
// ejercicios mezclados, que no significaba nada (una semana con más
// ejercicios ligeros parecía un "descenso" sin serlo). Solo entran
// ejercicios con dato dentro de la ventana Y antes de ella; sin eso no hay
// nada que comparar. `serie` son los últimos valores del ejercicio (para el
// sparkline).
function calcularCambiosE1rm(items, inicio, fin) {
  const validos = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ");
  const equiposPorNombre = new Map();
  const porClave = new Map();
  const claveConCarga = new Set();
  validos.forEach((it) => {
    const equipo = materialEfectivo(it);
    if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
    equiposPorNombre.get(it.name).add(equipo);
    const clave = `${it.name}::${equipo}`;
    if (!porClave.has(clave)) porClave.set(clave, { nombre: it.name, equipo, regs: [] });
    porClave.get(clave).regs.push(it);
    if (it.cargaReal !== "" && it.cargaReal != null) claveConCarga.add(clave);
  });
  const etiqueta = (nombre, equipo) => ((equiposPorNombre.get(nombre)?.size || 0) > 1 && equipo && equipo !== "std" ? `${nombre} (${equipo})` : nombre);
  const cambios = [];
  porClave.forEach(({ nombre, equipo, regs }, clave) => {
    const conCarga = claveConCarga.has(clave);
    const valorEstimado = (it) => {
      if (conCarga) return e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
      const reps = Number(it.repsReal);
      const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
      if (Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return null;
      return reps + rir;
    };
    const conValor = regs
      .map((it) => ({ it, v: valorEstimado(it) }))
      .filter((x) => x.v != null)
      .sort((a, b) => (a.it.date < b.it.date ? -1 : a.it.date > b.it.date ? 1 : 0));
    const dentro = conValor.filter((x) => x.it.date >= inicio && x.it.date <= fin);
    const antes = conValor.filter((x) => x.it.date < inicio);
    if (!dentro.length || !antes.length) return;
    const mediaAntes = antes.reduce((sum, x) => sum + x.v, 0) / antes.length;
    if (mediaAntes <= 0) return;
    const ultimo = dentro[dentro.length - 1];
    cambios.push({
      clave,
      nombre: etiqueta(nombre, equipo),
      pct: ((ultimo.v - mediaAntes) / mediaAntes) * 100,
      conCarga,
      nRegistros: dentro.length,
      serie: conValor.slice(-5).map((x) => x.v),
      // Para poder explicar cada ejercicio: valor de ahora, su nivel habitual
      // (media de lo anterior), cuándo fue y si es kg (e1RM) o repeticiones.
      actual: ultimo.v,
      habitual: mediaAntes,
      fecha: ultimo.it.date,
    });
  });
  return cambios;
}

// ---------- Rendimiento (e1RM) calibrado con datos reales ----------
// Calibrado con 7 semanas de histórico (3.357 registros de Fuerza, 877 series
// jugador-ejercicio con carga). La regla anterior marcaba entre 7 y 21
// jugadores por semana (de 13-23 con datos): casi toda la plantilla, por ruido
// y por cambios de ejercicio (p. ej. un ejercicio con -59 % en 17 jugadores a
// la vez, que no es rendimiento sino otro material/unidad). La regla calibrada
// da 0-2 avisos por semana y separa los cambios que afectan a muchos
// jugadores a la vez como "revisar datos".
//   - Solo ejercicios con carga y e1RM calculable (reps <= 12, con RIR).
//   - Base = mediana de las últimas 5 marcas anteriores (mín. 2).
//   - Cae si baja más de max(10 %, 2 x su ruido propio (MAD)).
//   - Aviso al jugador: >= 2 ejercicios caen y son >= 50 % de los comparables.
//   - Cambio sistémico: un ejercicio con >= 5 jugadores y mediana de cambio
//     >= 30 % (en valor absoluto) se excluye y se avisa para revisar datos.
const RENDIMIENTO_CFG = { minPrevios: 2, ventana: 5, umbralMin: 0.1, kRuido: 2, minEjerciciosBajan: 2, fraccionBajan: 0.5, cambioSistemico: 0.3, minJugadoresSistemico: 5 };
function cambiosRobustosE1rm(items, inicio, fin) {
  const cfg = RENDIMIENTO_CFG;
  const porClave = new Map();
  items.forEach((it) => {
    if (!it.done || it.esResistencia || it.esElastica || it.bloque === "CMJ") return;
    const clave = `${it.name}::${materialEfectivo(it)}`;
    if (!porClave.has(clave)) porClave.set(clave, { nombre: it.name, regs: [], conCarga: false });
    const g = porClave.get(clave);
    g.regs.push(it);
    if (it.cargaReal !== "" && it.cargaReal != null) g.conCarga = true;
  });
  const res = [];
  porClave.forEach(({ nombre, regs, conCarga }, clave) => {
    if (!conCarga) return;
    const serie = regs
      .map((it) => {
        const e1 = e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
        return e1 ? { fecha: it.date, v: e1 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    const dentro = serie.filter((x) => x.fecha >= inicio && x.fecha <= fin);
    const antes = serie.filter((x) => x.fecha < inicio).slice(-cfg.ventana);
    if (!dentro.length || antes.length < cfg.minPrevios) return;
    const base = medianaNum(antes.map((x) => x.v));
    if (!base) return;
    const ruido = antes.length >= 3 ? (medianaNum(antes.map((x) => Math.abs(x.v - base))) * 1.4826) / base : 0;
    const ultimo = dentro[dentro.length - 1].v;
    res.push({ clave, nombre, base, ultimo, cambio: (ultimo - base) / base, ruido, serie: serie.slice(-5).map((x) => x.v) });
  });
  return res;
}
function evaluarRendimientoEquipo(itemsPorJugador, jugadores, inicio, fin) {
  const cfg = RENDIMIENTO_CFG;
  const porJugador = new Map();
  const porEjercicio = new Map();
  jugadores.forEach((p) => {
    const cambios = cambiosRobustosE1rm(itemsPorJugador.get(p.id) || [], inicio, fin);
    if (!cambios.length) return;
    porJugador.set(p.id, cambios);
    cambios.forEach((c) => {
      if (!porEjercicio.has(c.clave)) porEjercicio.set(c.clave, { nombre: c.nombre, cambios: [] });
      porEjercicio.get(c.clave).cambios.push(c.cambio);
    });
  });
  const sistemicos = [];
  const excluidos = new Set();
  porEjercicio.forEach((g, clave) => {
    if (g.cambios.length < cfg.minJugadoresSistemico) return;
    const med = medianaNum(g.cambios);
    if (Math.abs(med) >= cfg.cambioSistemico) {
      excluidos.add(clave);
      sistemicos.push({ clave, nombre: g.nombre, jugadores: g.cambios.length, pct: Math.round(med * 100) });
    }
  });
  const resultados = new Map();
  porJugador.forEach((cambios, id) => {
    const validos = cambios.filter((c) => !excluidos.has(c.clave));
    if (!validos.length) return;
    const bajan = validos.filter((c) => c.cambio <= -Math.max(cfg.umbralMin, cfg.kRuido * c.ruido));
    const alerta = bajan.length >= cfg.minEjerciciosBajan && bajan.length / validos.length >= cfg.fraccionBajan;
    const media = validos.reduce((sum, c) => sum + c.cambio, 0) / validos.length;
    const peor = [...validos].sort((a, b) => a.cambio - b.cambio)[0];
    resultados.set(id, { alerta, pct: media * 100, bajan, comparables: validos.length, peor: { nombre: peor.nombre, pct: peor.cambio * 100 } });
  });
  return { resultados, sistemicos };
}

// calcularCumplimientoPauta ahora en src/calc/adherencia.js — importada
// arriba.

// cmjVentanasMicrociclo y cmjMicroDeFecha ahora en src/calc/cmj.js —
// importadas arriba.

// e1RM de un registro — delega en la función compartida (src/calc/e1rm.js).
function e1rmDeItem(it) {
  return e1rmDeValores(it.cargaReal, it.repsReal, it.rirReal);
}

// Carga de fuerza de un jugador en cada microciclo, con los datos que ya se
// recogen (solo el bloque Fuerza): series hechas (o pautadas si el registro es
// anterior a series_hechas), intensidad media (kg de la serie top / mejor e1RM
// que llevaba hasta ese día en el mismo ejercicio+equipo), nº de sesiones y
// fechas de sesiones pesadas (>= 85 % del 1RM). "Relativa" compara las series
// con la media de sus hasta 4 microciclos anteriores con datos (necesita al
// menos 2): baja < 75 %, alta > 125 %.
function calcularCargaFuerzaPorMicro(items, ventanas) {
  const fuerza = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque === "Fuerza");
  const porClave = new Map();
  fuerza.forEach((it) => {
    const clave = `${it.name}::${materialEfectivo(it)}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(it);
  });
  const pctPorItem = new Map();
  porClave.forEach((regs) => {
    let mejor = 0;
    [...regs]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .forEach((it) => {
        const e = e1rmDeItem(it);
        if (e == null) return;
        mejor = Math.max(mejor, e);
        pctPorItem.set(it.id, Number(it.cargaReal) / mejor);
      });
  });
  const cargas = ventanas.map((v) => {
    const enMicro = fuerza.filter((it) => !it.esReferencia && it.date >= v.desde && it.date <= v.hasta);
    const series = enMicro.reduce((sum, it) => sum + (it.seriesHechas !== "" && it.seriesHechas != null ? Number(it.seriesHechas) || 0 : Number(it.sets) || 0), 0);
    const pcts = enMicro.map((it) => pctPorItem.get(it.id)).filter((x) => x != null && Number.isFinite(x));
    const fechasPesadas = [...new Set(enMicro.filter((it) => (pctPorItem.get(it.id) ?? 0) >= 0.85).map((it) => it.date))].sort();
    return {
      microId: v.id,
      numero: v.numero,
      desde: v.desde,
      hasta: v.hasta,
      hayDatos: enMicro.length > 0,
      series,
      sesiones: new Set(enMicro.map((it) => it.date)).size,
      intensidad: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
      fechasPesadas,
      relativa: null,
      nivel: null,
    };
  });
  cargas.forEach((c, i) => {
    if (c.series <= 0) return;
    const previos = cargas.slice(Math.max(0, i - 4), i).filter((x) => x.series > 0);
    if (previos.length < 2) return;
    const media = previos.reduce((sum, x) => sum + x.series, 0) / previos.length;
    c.relativa = c.series / media;
    c.nivel = c.relativa > 1.25 ? "alta" : c.relativa < 0.75 ? "baja" : "normal";
  });
  return cargas;
}
const NIVEL_CARGA_FUERZA_META = {
  alta: { label: "Alta", color: () => ds.warning },
  normal: { label: "Normal", color: () => ds.inkSecondary },
  baja: { label: "Baja", color: () => ds.inkMuted },
};
// "fuerza alta +35 %" / "fuerza normal" / "N series" / "sin fuerza registrada"
function etiquetaCargaFuerza(c) {
  if (!c || !c.hayDatos) return "sin fuerza registrada esta semana";
  if (!c.nivel) return `${c.series} series de fuerza`;
  const pct = Math.round((c.relativa - 1) * 100);
  return `fuerza ${NIVEL_CARGA_FUERZA_META[c.nivel].label.toLowerCase()}${c.nivel === "normal" ? "" : ` ${pct > 0 ? "+" : ""}${pct} %`}`;
}
// ¿Coincide el salto peor de la semana con la carga de fuerza? Cada fila
// necesita nivel de carga y al menos una caída medible de altura. Con menos de
// 6 semanas comparables (o menos de 2 en cada grupo) no se dice nada: solo
// cuántas faltan. Es asociación, no causa (no entra la carga de partido).
function resumenFuerzaSalto(filas) {
  const validas = filas
    .map((f) => {
      const ds_ = [f.altura?.md2Delta, f.altura?.md1Delta].filter((x) => x != null);
      return f.carga?.nivel && ds_.length ? { alta: f.carga.nivel === "alta", peor: Math.min(...ds_) } : null;
    })
    .filter(Boolean);
  const altas = validas.filter((x) => x.alta);
  const resto = validas.filter((x) => !x.alta);
  if (validas.length < 6 || altas.length < 2 || resto.length < 2) return { suficiente: false, n: validas.length, altas: altas.length, resto: resto.length };
  const media = (arr) => arr.reduce((sum, x) => sum + x.peor, 0) / arr.length;
  return { suficiente: true, n: validas.length, alta: { n: altas.length, media: media(altas) }, resto: { n: resto.length, media: media(resto) } };
}

// A partir de una marca previa con OTRO diseño (reps/RIR distinto al de
// hoy), estima una carga de partida para el diseño de hoy: calcula el e1RM
// implícito en la marca previa (carga / %1RM de su RTF) y lo vuelve a bajar
// al %1RM del RTF de hoy. Es una estimación de PARTIDA para que el jugador
// ajuste en el primer set según cómo se sienta el RIR real — no una
// prescripción cerrada. Por eso, si el salto de reps es mayor de 4, se
// prefiere no sugerir nada (el margen de error ya no es útil) antes que dar
// un número con falsa precisión.
function calcularCargaSugerida(registroRef, repsHoy, rirHoy, redondeo = 2.5) {
  if (!registroRef) return null;
  const repsRef = Number(registroRef.repsReal);
  const rirRef = registroRef.rirReal !== "" && registroRef.rirReal != null ? Number(registroRef.rirReal) : null;
  const cargaRef = Number(registroRef.cargaReal);
  const repsObjetivo = Number(repsHoy);
  const rirObjetivo = rirHoy !== "" && rirHoy != null ? Number(rirHoy) : null;
  if (!cargaRef || Number.isNaN(cargaRef) || Number.isNaN(repsRef) || rirRef == null || Number.isNaN(repsObjetivo) || rirObjetivo == null) return null;
  if (repsRef > REPS_MAX_RIR_FIABLE || repsObjetivo > REPS_MAX_RIR_FIABLE) return null;
  if (Math.abs(repsObjetivo - repsRef) > 4) return null;
  const pctRef = pct1RMporRTF(repsRef + rirRef);
  const pctHoy = pct1RMporRTF(repsObjetivo + rirObjetivo);
  if (!pctRef) return null;
  const e1RM = cargaRef / pctRef;
  return Math.round((e1RM * pctHoy) / redondeo) * redondeo;
}

// claveVideoVariante y videoEfectivoTarea ahora en src/core/hooks.js —
// importadas arriba (usadas por la Pantalla del jugador y por Biblioteca).

// UNIDAD_POR_MODO ahora en src/core/hooks.js — importada arriba.

// La pantalla de Biblioteca de ejercicios completa (BibliotecaEjerciciosReal
// y todos sus auxiliares: TarjetaFamiliaEjercicioReal, PanelNuevoEjercicioReal,
// VistaSesionesBibliotecaReal, FilasEjerciciosReal...) ahora en
// src/screens/BibliotecaEjercicios.jsx — importada arriba.


// El Diseñador de sesiones completo (DisenoSesionReal y todos sus
// componentes auxiliares: FilaTareaReal, CampoResistenciaTareaReal,
// SelectorEjercicioReal, CajaCircuitoReal, ResumenSesionDisenoReal,
// PasoRevisarEnviarReal...) ahora en src/screens/DisenoSesion.jsx —
// importado arriba.

// Al entrar en modo entrenador, adelanta la carga de los datos que casi
// nunca cambian de un minuto a otro (jugadores, ejercicios, categorías
// preventivas, materiales) — una sola vez, en paralelo — dejándolos ya en
// sharedDataCache. Así, cuando cualquier pantalla (Roster, Diseño,
// Biblioteca...) monte su propio usePlayers()/useEntityList("ejercicios")/etc.,
// se los encuentra ya en caché y no repite la petición a Apps Script. Si ya
// estaban cacheados (se volvió a entrar en la misma sesión), no hace nada.
function precalentarDatosEntrenador() {
  if (!sharedDataCache.has("list:jugadores:null")) {
    api.list("jugadores").then((res) => sharedDataCache.set("list:jugadores:null", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("list:ejercicios:null")) {
    api.list("ejercicios").then((res) => sharedDataCache.set("list:ejercicios:null", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("categoriasPreventivas")) {
    api.categoriasPreventivas().then((res) => sharedDataCache.set("categoriasPreventivas", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("materiales")) {
    api.materiales().then((res) => sharedDataCache.set("materiales", res || [])).catch(() => {});
  }
}

// Cierra el pase en Supabase y limpia lo que haya en memoria del usuario anterior.
function cerrarAcceso() {
  const t = accesoSesion.token;
  sharedDataCache.clear();
  if (!t) return;
  Promise.resolve(supabase.rpc("salir"))
    .catch(() => {})
    .finally(() => {
      if (accesoSesion.token === t) {
        accesoSesion.token = null;
        accesoSesion.rol = null;
        accesoSesion.jugadorId = null;
      }
    });
}

export default function App() {
  const [screen, setScreenBase] = useState("portal"); // "portal" | "coach" | "player"
  const [avisoSesion, setAvisoSesion] = useState("");
  const setScreen = useCallback((s) => {
    if (s === "portal") cerrarAcceso();
    setScreenBase(s);
  }, []);

  // Con seguridad activa, comprueba que el pase sigue vigente (caduca a los 30 días o
  // si el entrenador suspende al jugador): si no, vuelve al portal con un aviso visible
  // en vez de enseñar pantallas vacías.
  useEffect(() => {
    if (screen === "portal") return undefined;
    const comprobar = async () => {
      if (!accesoSesion.token) return;
      try {
        const { data, error } = await supabase.rpc("quien_soy");
        if (!error && (data == null || data.rol == null)) {
          setAvisoSesion("Tu sesión ha caducado o tu acceso ya no está activo. Vuelve a entrar con tu código.");
          accesoSesion.token = null;
          sharedDataCache.clear();
          setScreenBase("portal");
        }
      } catch {
        /* sin conexión: no se expulsa a nadie por eso */
      }
    };
    comprobar();
    const alVolver = () => document.visibilityState === "visible" && comprobar();
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [screen]);
  const [playerId, setPlayerId] = useState(null);
  const [coachModulo, setCoachModulo] = useState(null); // null = dashboard
  const [historialJugador, setHistorialJugador] = useState(null); // jugador para "Ver ficha" desde Usuarios

  useEffect(() => {
    if (screen === "coach") precalentarDatosEntrenador();
  }, [screen]);

  return (
    <>
      {/* Sin esto, el "rebote" elástico de Safari en iPad al hacer scroll deja
          ver un instante el blanco por defecto de la página detrás de la app
          (líneas blancas en el borde) — con el fondo del propio documento ya
          oscuro y el rebote desactivado, no hay nada blanco que se pueda
          asomar. PantallaBase, además, usa position:fixed en vez de depender
          del alto del documento, así que ya no compite con este reset. */}
      <style>{`
        html, body { background: ${ds.canvas}; margin: 0; padding: 0; height: 100%; overscroll-behavior: none; }
        #root { height: 100%; }
      `}</style>
      {screen === "portal" && avisoSesion && (
        <div role="alert" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: ds.bgElevated, color: ds.warning, padding: "10px 16px", fontSize: 13, textAlign: "center", borderBottom: `1px solid ${ds.border}` }}>
          {avisoSesion}{" "}
          <button onClick={() => setAvisoSesion("")} style={{ marginLeft: 8, background: "transparent", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>
            Cerrar
          </button>
        </div>
      )}
      <AppRouter
        screen={screen}
        setScreen={setScreen}
        playerId={playerId}
        setPlayerId={setPlayerId}
        coachModulo={coachModulo}
        setCoachModulo={setCoachModulo}
        historialJugador={historialJugador}
        setHistorialJugador={setHistorialJugador}
      />
    </>
  );
}

function AppRouter({ screen, setScreen, playerId, setPlayerId, coachModulo: coachModuloProp, setCoachModulo: setCoachModuloProp, historialJugador, setHistorialJugador }) {
  // Los módulos "programacion" e "historial" ya no existen: Programación vive
  // en Calendario y el historial de cada jugador dentro de su ficha. Y se puede
  // abrir Calendario ya filtrado: "calendario:j:<id>" / "calendario:g:<id>".
  const [calScope, setCalScope] = useState(null);
  const [fichaPestana, setFichaPestana] = useState("resumen");
  const abrirFicha = (jugador, pestana) => {
    setFichaPestana(pestana || "resumen");
    setHistorialJugador(jugador);
  };
  const setCoachModulo = (m) => {
    if (typeof m === "string" && m.startsWith("calendario:")) {
      setCalScope(m.slice("calendario:".length));
      setCoachModuloProp("calendario");
    } else {
      if (m === "calendario" || m === "programacion") setCalScope(null);
      setCoachModuloProp(m === "programacion" ? "calendario" : m === "historial" ? "roster" : m);
    }
  };
  const coachModulo = coachModuloProp === "programacion" ? "calendario" : coachModuloProp === "historial" ? "roster" : coachModuloProp;

  if (screen === "portal") {
    return (
      <PortalAccesoRaiz
        onEnterCoach={() => {
          setCoachModulo(null);
          setScreen("coach");
        }}
        onEnterPlayer={(id) => {
          setPlayerId(id);
          setScreen("player");
        }}
      />
    );
  }

  if (screen === "player") {
    return <PantallaJugadorReal presetPlayerId={playerId} onExit={() => setScreen("portal")} />;
  }

  // screen === "coach"
  if (historialJugador) {
    return (
      <FichaJugadorModuloReal
        jugador={historialJugador}
        pestanaInicial={fichaPestana}
        onBack={() => setHistorialJugador(null)}
        onAbrirModulo={(m) => {
          // Navegar desde el rail lateral de la ficha (a otro módulo del
          // entrenador) tiene que cerrar la ficha primero — si no,
          // historialJugador se queda puesto y AppRouter la seguiría
          // mostrando por encima de cualquier coachModulo nuevo.
          setHistorialJugador(null);
          setCoachModulo(m);
        }}
        onCerrarSesion={() => {
          setHistorialJugador(null);
          setScreen("portal");
        }}
      />
    );
  }
  if (coachModulo === "roster") {
    return <GestionRosterReal onBack={() => setCoachModulo(null)} onOpenHistory={abrirFicha} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "biblioteca") {
    return <BibliotecaEjerciciosReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "diseno") {
    return <DisenoSesionReal onBack={() => setCoachModulo(null)} onGuardado={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "calendario") {
    return <CalendarioModuloReal key={calScope || "equipo"} scopeInicial={calScope || undefined} onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "fatiga") {
    return <ControlFatigaModuloReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }

  return <InicioEntrenadorReal onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} onOpenHistory={abrirFicha} />;
}


// Cabecera de identidad de la ficha de jugador. Reutiliza exactamente las
// mismas piezas visuales que ya existían en FilaJugadorReal (punto de
// estado, chips de grupo, chips de categoría preventiva, PIN con
// mostrar/ocultar) — aquí solo cambia el layout, de fila a cabecera. No
// permite editar grupos/categorías desde aquí a propósito: eso ya se hace
// desde la fila en Usuarios, y duplicar esa lógica de guardado en un
// segundo sitio no aporta nada en este primer paso.
// Cabecera de la ficha — funciona como la barra de un perfil personal: la
// identidad (avatar con SU color, nombre, grupo/categoría) a la izquierda,
// y a la derecha una fila compacta de utilidades (PIN, accesos directos a
// las otras pestañas) en vez de un bloque de PIN gigante que competía en
// protagonismo con el propio nombre del jugador.
function CabeceraFichaJugadorReal({ jugador, categorias, grupos, onNavigateTab }) {
  const [pinVisible, setPinVisible] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresGrupos = (jugador.gruposIds || [])
    .map((id) => grupos.find((g) => g.id === id)?.nombre)
    .filter(Boolean);
  const nombresCategorias = (jugador.groupIds || [])
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);
  const colorAvatar = colorAvatarJugador(jugador.id);

  const accionesRapidas = onNavigateTab
    ? [
        { id: "cmj", icon: <Activity size={14} />, label: "Control de fatiga" },
        { id: "notas", icon: <BookOpen size={14} />, label: "Añadir nota" },
        { id: "datos", icon: <Pencil size={14} />, label: "Editar datos" },
      ]
    : [];

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: `linear-gradient(135deg, ${colorAvatar}14, ${ds.surface} 55%)`, border: `1px solid ${ds.border}`, borderRadius: dsR.xl, padding: 18 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <DsAvatar size={58} style={{ background: `${colorAvatar}26`, color: colorAvatar, border: `2px solid ${colorAvatar}55`, fontWeight: 700, fontFamily: dsF.display }}>
          {inicialesNombre(jugador.name)}
        </DsAvatar>
        <div style={{ position: "absolute", right: -1, bottom: -1, width: 13, height: 13, borderRadius: dsR.full, background: suspendido ? ds.warning : ds.success, border: `2.5px solid ${ds.surface}` }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: dsF.display, fontSize: 21, fontWeight: 700, margin: 0, color: ds.ink }}>{jugador.name}</h1>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap", alignItems: "center" }}>
          {nombresGrupos.length > 0 ? (
            nombresGrupos.map((g) => (
              <ChipReal key={g} tono="azul">{g}</ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Independiente</span>
          )}
          {nombresCategorias.length > 0 && <span style={{ color: ds.inkMuted, fontSize: 10 }}>·</span>}
          {nombresCategorias.map((c) => (
            <ChipReal key={c} tono="verde">{c}</ChipReal>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {accionesRapidas.map((a) => (
          <button
            key={a.id}
            onClick={() => onNavigateTab(a.id)}
            title={a.label}
            style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.md, color: ds.inkSecondary, cursor: "pointer" }}
          >
            {a.icon}
          </button>
        ))}
        <button
          onClick={() => setPinVisible((v) => !v)}
          title="Mostrar/ocultar PIN"
          style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: dsF.mono, fontSize: 11.5, color: ds.inkMuted, cursor: "pointer", background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "7px 9px" }}
        >
          {pinVisible ? jugador.pin : "PIN ••••"}
        </button>
      </div>
    </div>
  );
}

// Pestaña "Resumen" de la ficha — reorganizada según el mockup de Fase 6
// (Equipos y usuarios): una tira de 4 indicadores arriba (mismo patrón
// MiniStat que ya usa el Dashboard del entrenador), la carga media como
// segunda fila de detalle, y una lista de "Últimos registros" real (mismas
// sesiones/fechas que ve Historial). Todo con datos que ya existían en la
// app — no se inventa "próxima sesión" ni "objetivo actual" porque, igual
// que en el propio mockup, ese dato todavía no tiene un campo real detrás
// (llegará con Calendario, Fase 6).
// Racha: reutiliza EXACTAMENTE el mismo criterio de "semana cumplida"
// (≥80% de adherencia) que Constancia en MiProgresoJugadorReal — no es una
// métrica nueva, solo se muestra aquí también, para el entrenador.
// Adherencia vs. equipo: mismo cálculo (misma ventana, mismo criterio de
// "cumplida") que adherenciaActual en useDatosDashboardEntrenador, aquí
// reescrito para comparar a ESTE jugador contra la media de todo el equipo
// activo — reutiliza useEquipoHistory, no trae registros nuevos.
function ResumenFichaJugadorReal({ jugador, onNavigateTab, onGuardarObjetivo }) {
  const [players, , playersLoaded] = usePlayers();
  const { sesiones, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const { loaded: historyLoaded, items } = usePlayerHistory(jugador.id);
  const { items: equipoHistory, loaded: equipoLoaded } = useEquipoHistory();
  const { items: refItems, loaded: refLoaded } = useReferenciasFuerza(jugador.id);

  if (!playersLoaded || !progLoaded || !historyLoaded || !equipoLoaded || !refLoaded) return <LoadingBlock />;

  const hoy = todayStr();
  const lunes = inicioSemanaCalendario(hoy);
  const domingo = sumarDiasFecha(lunes, 6);
  const lunesAnterior = sumarDiasFecha(lunes, -7);
  const domingoAnterior = sumarDiasFecha(lunes, -1);

  const fechasConRegistro = new Set(items.filter((it) => it.done).map((it) => it.date));
  // [{fecha, sesion}] — cada fecha ya llegada (<= hoy) en la que este
  // jugador tenía una sesión enviada asignada, con la sesión completa (para
  // poder mostrar su nombre en "Últimos registros"). Misma regla de
  // "incluye a este jugador" que fechasAsignadas de abajo.
  const asignacionesJugador = [];
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const incluyeAJugador = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino.includes(jugador.id) : jugador.estado === "activo";
      if (!incluyeAJugador) return;
      (s.fechas || []).forEach((f) => {
        if (f <= hoy) asignacionesJugador.push({ fecha: f, sesion: s });
      });
    });
  asignacionesJugador.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  const hechasJugador = tareasHechasPorJugadorFecha(items);
  const fraccionCumplidaFicha = crearFraccionCumplida(tareasProg);
  const fraccionDeAsignacion = (a) => fraccionCumplidaFicha(a.sesion.id, a.fecha, hechasJugador.get(`${jugador.id}::${a.fecha}`), jugador.id);
  const fechasAsignadas = (desde, hasta) => asignacionesJugador.filter((a) => a.fecha >= desde && a.fecha <= hasta);
  const calcularAdherencia = (asignaciones) => {
    if (!asignaciones.length) return null;
    const cumplidas = asignaciones.reduce((sum, a) => sum + fraccionDeAsignacion(a), 0);
    return Math.round((cumplidas / asignaciones.length) * 100);
  };
  const adherenciaActual = calcularAdherencia(fechasAsignadas(lunes, hoy));
  const adherenciaAnterior = calcularAdherencia(fechasAsignadas(lunesAnterior, domingoAnterior));
  const deltaAdherencia = adherenciaActual != null && adherenciaAnterior != null ? adherenciaActual - adherenciaAnterior : null;

  // ENT-01: misma lógica que "Quién necesita atención" del Dashboard (media
  // de las variaciones de e1RM por ejercicio+equipo, ver calcularCambiosE1rm).
  const cambiosE1rmSemana = calcularCambiosE1rm([...items, ...refItems], lunes, hoy);
  const variacionPct = (() => {
    if (!cambiosE1rmSemana.length) return null;
    const media = cambiosE1rmSemana.reduce((sum, c) => sum + c.pct, 0) / cambiosE1rmSemana.length;
    const peor = Math.min(...cambiosE1rmSemana.map((c) => c.pct));
    // Igual que en el Dashboard: si un solo ejercicio cae 12 % o más, no se esconde tras la media.
    return cambiosE1rmSemana.length > 1 && peor <= -12 && peor < media ? peor : media;
  })();

  // Racha (semanas cumpliendo el plan) — últimas 8 semanas de calendario,
  // igual límite superior "hoy" en la semana en curso que adherenciaActual.
  const N_SEMANAS_HISTORIAL = 8;
  const historialSemanas = [];
  for (let i = N_SEMANAS_HISTORIAL - 1; i >= 0; i--) {
    const inicio = sumarDiasFecha(lunes, -7 * i);
    const finCalendario = sumarDiasFecha(inicio, 6);
    const fin = i === 0 ? hoy : finCalendario;
    historialSemanas.push(calcularAdherencia(fechasAsignadas(inicio, fin)));
  }
  let rachaSemanas = 0;
  for (let i = historialSemanas.length - 1; i >= 0; i--) {
    if (historialSemanas[i] != null && historialSemanas[i] >= 80) rachaSemanas++;
    else break;
  }

  // Última sesión realmente registrada (no solo asignada).
  const ultimaAsignacionHecha = asignacionesJugador.find((a) => fechasConRegistro.has(a.fecha));

  // Adherencia del equipo activo esta semana — mismo criterio que
  // useDatosDashboardEntrenador.adherenciaActual, para poder comparar a
  // este jugador contra su equipo.
  const activos = players.filter((p) => p.estado === "activo");
  const hechasEquipo = tareasHechasPorJugadorFecha(equipoHistory);
  let ocurrenciasEquipo = 0;
  let cumplidasEquipo = 0;
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : activos.map((p) => p.id);
      (s.fechas || []).forEach((f) => {
        if (f < lunes || f > domingo || f > hoy) return;
        destino.forEach((jugadorId) => {
          ocurrenciasEquipo++;
          cumplidasEquipo += fraccionCumplidaFicha(s.id, f, hechasEquipo.get(`${jugadorId}::${f}`), jugadorId);
        });
      });
    });
  const adherenciaEquipo = ocurrenciasEquipo ? Math.round((cumplidasEquipo / ocurrenciasEquipo) * 100) : null;
  const deltaVsEquipo = adherenciaActual != null && adherenciaEquipo != null ? adherenciaActual - adherenciaEquipo : null;

  const ultimosRegistros = asignacionesJugador.slice(0, 4);

  // insight: una frase construida ÚNICAMENTE a partir de los mismos datos
  // que ya calcula este componente (asignadas/cumplidas de esta semana +
  // racha de semanas) — mismo patrón que el mockup, sin ninguna cifra nueva.
  const fechasSemanaActual = fechasAsignadas(lunes, hoy);
  const cumplidasSemanaActual = Math.round(fechasSemanaActual.reduce((sum, a) => sum + fraccionDeAsignacion(a), 0) * 10) / 10;
  let insightTexto = null;
  if (fechasSemanaActual.length > 0) {
    insightTexto = `${cumplidasSemanaActual} de las ${fechasSemanaActual.length} sesiones que ya le tocaban esta semana hechas (según el trabajo completado)`;
    insightTexto += rachaSemanas > 0 ? `, dentro de una racha de ${rachaSemanas} ${rachaSemanas === 1 ? "semana cumpliendo" : "semanas cumpliendo"} el plan.` : ".";
  } else if (rachaSemanas > 0) {
    insightTexto = `Sin sesiones asignadas todavía esta semana. Lleva una racha de ${rachaSemanas} ${rachaSemanas === 1 ? "semana cumpliendo" : "semanas cumpliendo"} el plan.`;
  }

  // record-callout: el récord de carga (e1RM) más reciente de este jugador,
  // mismo motor que alimenta las gráficas de fuerza (calcularRecordsCargaJugador,
  // compartido con la pestaña Progreso) — solo se muestra si es de los
  // últimos 30 días; si no hay ninguno reciente, se omite el banner en vez
  // de inventarlo.
  const recordsCarga = calcularRecordsCargaJugador([...items, ...refItems]);
  const recordMasReciente = recordsCarga.length
    ? [...recordsCarga].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))[0]
    : null;
  const hace30Dias = sumarDiasFecha(hoy, -30);
  const recordParaBanner = recordMasReciente && recordMasReciente.fecha >= hace30Dias ? recordMasReciente : null;

  return (
    <div>
      {insightTexto && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "11px 13px", marginBottom: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: dsR.sm, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={12} />
          </div>
          <p style={{ fontSize: 12, color: ds.ink, lineHeight: 1.5, margin: 0 }}>{insightTexto}</p>
        </div>
      )}

      {recordParaBanner && (
        <div style={{ display: "flex", gap: 11, alignItems: "center", background: `linear-gradient(90deg, ${ds.accentSubtle}, transparent)`, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "11px 13px", marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: dsR.full, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={15} />
          </div>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
            <b style={{ color: ds.ink, fontWeight: 700 }}>Nuevo récord el {fmtDateShort(recordParaBanner.fecha)}:</b> {recordParaBanner.nombre} — {recordParaBanner.valor} kg (1RM est.)
            {recordParaBanner.pctSobreAnterior != null && (
              <span style={{ color: ds.success, fontWeight: 700 }}> +{Math.round(recordParaBanner.pctSobreAnterior)}% sobre su récord anterior</span>
            )}
          </div>
        </div>
      )}

      <ObjetivoActualCardReal jugador={jugador} onGuardar={onGuardarObjetivo} />

      {/* Una sola tira de 5 indicadores, todos con el mismo lenguaje visual
          (antes eran dos componentes distintos — 4 MiniStat + 1 DsStatTile
          suelto — que hacían parecer la pantalla más desordenada de lo que
          en realidad eran sus propios datos). "Próxima sesión" (que siempre
          era el mismo texto de relleno, sin dato real detrás todavía) se ha
          quitado de aquí; volverá cuando Calendario tenga algo real que
          mostrar. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, margin: "16px 0 18px" }}>
        <MiniStat
          icon={<TrendingUp size={12} />}
          label="Adherencia"
          value={adherenciaActual != null ? `${adherenciaActual}%` : "—"}
          sub={deltaAdherencia != null ? `${deltaAdherencia > 0 ? "+" : ""}${deltaAdherencia} vs sem. pasada` : "sin datos aún"}
          accent
        />
        <MiniStat
          icon={<Zap size={12} />}
          label="Racha"
          value={`${rachaSemanas} sem.`}
          sub="cumpliendo el plan"
        />
        <MiniStat
          icon={<CalendarClock size={12} />}
          label="Última sesión"
          value={ultimaAsignacionHecha ? fmtHaceDias(ultimaAsignacionHecha.fecha).replace(/^./, (c) => c.toUpperCase()) : "—"}
          sub={ultimaAsignacionHecha ? fmtDateShort(ultimaAsignacionHecha.fecha) : "sin registros aún"}
        />
        <MiniStat
          icon={<Activity size={12} />}
          label="vs. equipo"
          value={deltaVsEquipo != null ? `${deltaVsEquipo > 0 ? "+" : ""}${deltaVsEquipo} pts` : "—"}
          sub={adherenciaEquipo != null ? `equipo: ${adherenciaEquipo}%` : "sin datos de equipo"}
        />
        <MiniStat
          icon={<Dumbbell size={12} />}
          label="Fuerza vs. habitual"
          value={variacionPct != null ? `${variacionPct > 0 ? "+" : ""}${Math.round(variacionPct)}%` : "—"}
          sub={variacionPct == null ? "sin datos suficientes" : variacionPct <= -8 ? "caída relevante" : variacionPct < -3 ? "algo por debajo" : "dentro de lo normal"}
        />
      </div>

      {cambiosE1rmSemana.length > 0 && (
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 8 }}>Fuerza esta semana · ejercicio a ejercicio</div>
          <ListaCambiosEjerciciosReal cambios={[...cambiosE1rmSemana].sort((a, b) => a.pct - b.pct)} />
        </div>
      )}

      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 10 }}>Últimos registros</div>
      {ultimosRegistros.length === 0 ? (
        <div style={{ color: ds.inkMuted, fontSize: 12.5 }}>Todavía no hay sesiones asignadas a {jugador.name}.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ultimosRegistros.map((a, i) => (
            <div
              key={`${a.sesion.id}::${a.fecha}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 2px",
                borderBottom: i < ultimosRegistros.length - 1 ? `1px solid ${ds.border}` : "none",
                fontSize: 12.5,
              }}
            >
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 82, flexShrink: 0 }}>{fmtDateShort(a.fecha)}</span>
              <span style={{ flex: 1, minWidth: 0, color: ds.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.sesion.nombre || a.sesion.objetivo || "Sesión"}
              </span>
              {(() => {
                const f = fraccionDeAsignacion(a);
                return <DsBadge tone={f >= 0.8 ? "success" : f > 0 ? "neutral" : "danger"}>{f >= 0.8 ? "Realizada" : f > 0 ? `Parcial · ${Math.round(f * 100)} %` : "No realizada"}</DsBadge>;
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mini-card "Objetivo actual" (Resumen de la ficha) — único dato de esta
// pestaña sin equivalente real todavía (jugador.objetivoActual, ver
// sql/add_objetivo_actual_jugador.sql): texto libre corto, editable en el
// sitio, sin un panel aparte.
function ObjetivoActualCardReal({ jugador, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(jugador.objetivoActual || "");
  const [guardando, setGuardando] = useState(false);

  if (editando) {
    return (
      <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: ds.ink, marginBottom: 6 }}>
          <Target size={13} color={ds.accent} /> Objetivo actual
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          placeholder="Ej. Recuperar fuerza en tren inferior tras la molestia de rodilla..."
          style={{ width: "100%", minHeight: 56, resize: "vertical", background: ds.canvas, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px", color: ds.ink, fontFamily: dsF.sans, fontSize: 11.5, outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
          <button onClick={() => { setTexto(jugador.objetivoActual || ""); setEditando(false); }} style={{ font: `600 11px ${dsF.sans}`, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            disabled={guardando}
            onClick={async () => {
              setGuardando(true);
              await onGuardar?.(texto.trim());
              setGuardando(false);
              setEditando(false);
            }}
            style={{ font: `700 11px ${dsF.sans}`, padding: "6px 11px", borderRadius: dsR.md, border: "none", background: ds.accent, color: ds.accentInk, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: ds.ink, marginBottom: 6 }}>
        <Target size={13} color={ds.accent} /> Objetivo actual
      </div>
      <p style={{ fontSize: 11.5, color: ds.inkMuted, lineHeight: 1.5, margin: 0 }}>
        {jugador.objetivoActual || "Todavía no se ha definido un objetivo para este jugador."}
      </p>
      <span onClick={() => setEditando(true)} style={{ fontSize: 10.5, color: ds.accent, fontWeight: 600, marginTop: 6, display: "inline-block", cursor: "pointer" }}>
        Editar objetivo
      </span>
    </div>
  );
}

// Extiende el patrón de gráfica SVG de GraficaProgresoCargaReal (línea +
// puntos, sin librería externa) a varias variables del motor CMJ
// SUPERPUESTAS en la misma gráfica (una línea de color por variable, con
// leyenda debajo) — sin traer recharts (que usaba el panel original y que
// aquí no es una dependencia). Todas las series comparten el mismo eje X
// (mismos registros) y el mismo eje Y, igual que hacía el panel original en
// su vista "valores reales".
function CmjGraficaEvolucionMultiReal({ series, decimalesEje = 1 }) {
  const nPuntos = series[0]?.puntos.length || 0;
  if (nPuntos < 2) {
    return (
      <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "24px 0", textAlign: "center" }}>
        {nPuntos === 0 ? "Sin registros para esta selección de variables en este filtro." : "Hace falta al menos 2 registros para trazar la evolución."}
      </div>
    );
  }
  const width = 660;
  const height = 200;
  const padLeft = 6;
  const padRight = 48;
  const padY = 22;
  const allValores = series.flatMap((s) => s.puntos.map((p) => p.valorMostrado));
  const minV = Math.min(...allValores);
  const maxV = Math.max(...allValores);
  const rango = maxV - minV || 1;
  const stepX = (width - padLeft - padRight) / (nPuntos - 1);
  const coordX = (i) => padLeft + i * stepX;
  const coordY = (v) => height - padY - ((v - minV) / rango) * (height - padY * 2);

  // Igual criterio que GraficaProgresoCargaReal (sin números de eje fijos:
  // el valor final va pegado a la línea) pero con varias series a la vez,
  // así que las etiquetas se reparten en una pequeña columna a la derecha,
  // separadas un mínimo vertical entre sí, para que no se pisen aunque dos
  // líneas terminen muy cerca la una de la otra.
  const xUltimo = coordX(nPuntos - 1);
  const etiquetas = series
    .map((s) => {
      const ultimo = s.puntos[s.puntos.length - 1];
      return { key: s.key, color: s.color, texto: ultimo.valorMostrado.toFixed(decimalesEje), y: coordY(ultimo.valorMostrado) };
    })
    .sort((a, b) => a.y - b.y);
  const GAP_MIN = 13;
  for (let i = 1; i < etiquetas.length; i++) {
    if (etiquetas[i].y - etiquetas[i - 1].y < GAP_MIN) etiquetas[i].y = etiquetas[i - 1].y + GAP_MIN;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
        {series.map((s) => {
          const pathD = s.puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valorMostrado).toFixed(1)}`).join(" ");
          return (
            <g key={s.key}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.puntos.map((p, i) => (
                <circle key={i} cx={coordX(i)} cy={coordY(p.valorMostrado)} r={i === s.puntos.length - 1 ? 4 : 3} fill={ds.canvas} stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {etiquetas.map((e) => (
          <text key={e.key} x={xUltimo + 8} y={e.y + 3.5} fontSize="10.5" fontWeight="700" fill={e.color} textAnchor="start">{e.texto}</text>
        ))}
        <text x={padLeft} y={height - 5} fontSize="9.5" fill={ds.inkMuted}>{fmtDateShort(series[0].puntos[0].date)}</text>
        <text x={xUltimo} y={height - 5} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{fmtDateShort(series[0].puntos[nPuntos - 1].date)}</text>
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: ds.inkSecondary, fontWeight: 600 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pequeño múltiplo por variable (estilo VALD ForceDecks, como en el mockup
// de Fase 6): línea + puntos de los últimos tests, con bandas de fondo
// verde/ámbar/rojo cuando la variable lleva umbral propio (ambarPct/rojoPct
// ya individualizado por cmjBuildPlayers) — la referencia de la banda es el
// mejor valor de la ventana mostrada, igual idea que "mejor marca" en
// GraficaProgresoCargaReal. Sin umbral (velocidad), se dibuja solo la línea.
function CmjMiniMultiploReal({ metric, puntos, umbral, color }) {
  if (puntos.length < 2) {
    return (
      <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `700 11.5px ${dsF.sans}`, color: ds.ink, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
          {metric.label}
        </div>
        <div style={{ color: ds.inkMuted, fontSize: 11, padding: "18px 0", textAlign: "center" }}>Sin suficientes tests para trazar la evolución.</div>
      </div>
    );
  }
  const width = 280;
  const height = 78;
  const padX = 10;
  const padTop = 8;
  const padBottom = 16;
  const valores = puntos.map((p) => p.valor);
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  const deltaUltimo = cmjPct(ultimo.valor, primero.valor);
  const referencia = Math.max(...valores);
  const bandas = umbral ? { verdeHasta: referencia * (1 - umbral.ambarPct / 100), ambarHasta: referencia * (1 - umbral.rojoPct / 100) } : null;
  const allVals = bandas ? [...valores, bandas.verdeHasta, bandas.ambarHasta] : valores;
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rango = maxV - minV || 1;
  const coordY = (v) => height - padBottom - ((v - minV) / rango) * (height - padTop - padBottom);
  const stepX = (width - padX * 2) / (puntos.length - 1);
  const coordX = (i) => padX + i * stepX;
  return (
    <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px 10px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `700 11.5px ${dsF.sans}`, color: ds.ink }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
          {metric.label}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ font: `800 16px ${dsF.display}`, color: ds.ink }}>{cmjFmt(ultimo.valor, metric.decimals)}</span>
          <span style={{ font: `600 9.5px ${dsF.mono}`, color: ds.inkMuted, marginLeft: 2 }}>{metric.unit}</span>
          {umbral && deltaUltimo != null && (
            <div style={{ font: `700 10px ${dsF.mono}`, color: deltaUltimo < 0 ? ds.warning : ds.success, marginTop: 1 }}>{cmjSigned(deltaUltimo, 0)}</div>
          )}
          {!umbral && <div style={{ font: `700 10px ${dsF.mono}`, color: ds.inkMuted, marginTop: 1 }}>informativa</div>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 78, display: "block" }}>
        {bandas && (
          <>
            <rect x={0} y={0} width={width} height={Math.max(0, coordY(bandas.verdeHasta))} fill={`${ds.success}1E`} />
            <rect x={0} y={Math.max(0, coordY(bandas.verdeHasta))} width={width} height={Math.max(0, coordY(bandas.ambarHasta) - coordY(bandas.verdeHasta))} fill={`${ds.warning}1E`} />
            <rect x={0} y={Math.max(0, coordY(bandas.ambarHasta))} width={width} height={Math.max(0, height - coordY(bandas.ambarHasta))} fill={`${ds.danger}1E`} />
          </>
        )}
        <polyline points={puntos.map((p, i) => `${coordX(i).toFixed(1)},${coordY(p.valor).toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        {puntos.map((p, i) => (
          <circle key={i} cx={coordX(i)} cy={coordY(p.valor)} r={i === puntos.length - 1 ? 5.5 : 4} fill={i === puntos.length - 1 ? color : ds.surfaceRaised} stroke={color} strokeWidth={2} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, padding: "0 2px" }}>
        {puntos.map((p, i) => (
          <span key={i} style={{ font: `600 8px ${dsF.mono}`, color: ds.inkMuted }}>{p.tag ? CMJ_TAG_META[p.tag].label : fmtDateShort(p.date)}</span>
        ))}
      </div>
    </div>
  );
}

// Pestaña "CMJ" de la ficha de jugador: evolución de hasta 4 variables
// SUPERPUESTAS en la misma gráfica (Altura/Potencia relativa/Fuerza
// relativa/Velocidad), con vista "Valores reales" o "% respecto a su
// media" (para comparar variables de unidades distintas en el mismo eje),
// en temporada completa, un rango de fechas o un microciclo concreto, con
// el mismo filtro de Momento que Ranking. La tabla de registros muestra
// además el % de cambio frente a su referencia (MD-2/MD+1 vs el Inicio de
// esa semana; un Inicio vs el Inicio anterior) — igual criterio que usaba
// el panel original. A diferencia de Ranking (que compara jugadores entre
// sí), aquí solo se cargan los saltos de ESTE jugador, ya vinculados a su
// jugadorId.
// Sección "Fuerza y salto por microciclo" de la ficha CMJ (Fase 2). Cada fila
// junta lo que el jugador levantó esa semana con lo que le pasó al salto en
// MD-2 y MD-1 frente a su Inicio. Solo lectura, sin conclusiones fuertes: con
// pocas semanas dice cuántas faltan en vez de inventar una tendencia.
function FuerzaSaltoMicrociclosReal({ filas, resumen, cargando, jugadorNombre }) {
  const colorDelta = (status) => ({ red: ds.danger, amber: ds.warning, green: ds.success, gray: ds.inkMuted }[status || "gray"]);
  const celdaDelta = (delta, status) => (
    <div style={{ textAlign: "right", fontFamily: dsF.mono, fontSize: 12, fontWeight: 700, color: delta == null ? ds.inkMuted : colorDelta(status) }}>{delta == null ? "—" : cmjSigned(delta, 1)}</div>
  );
  const cabecera = { fontSize: 10, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" };
  const columnas = "48px minmax(150px, 1.6fr) 62px 70px 70px";
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 3 }}>Fuerza y salto por microciclo</div>
      <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 9, lineHeight: 1.45 }}>
        La carga de fuerza de cada semana (solo bloque Fuerza) junto a la variación de la altura de salto en MD-2 y MD-1 frente al Inicio.
      </div>
      {cargando ? (
        <div style={{ fontSize: 12, color: ds.inkMuted }}>Cargando historial de fuerza…</div>
      ) : filas.length === 0 ? (
        <DsCard style={{ padding: 16, textAlign: "center", color: ds.inkMuted, fontSize: 12 }}>
          Aún no hay microciclos con fecha de Inicio que cruzar con sesiones de fuerza o tests de salto.
        </DsCard>
      ) : (
        <>
          {resumen.suficiente ? (
            <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10, fontSize: 11.5, color: ds.inkSecondary, lineHeight: 1.5 }}>
              En las <b style={{ color: ds.ink }}>{resumen.alta.n}</b> semanas de carga de fuerza alta de {jugadorNombre}, el peor test de altura de la semana quedó de media en <b style={{ color: ds.ink }}>{cmjSigned(resumen.alta.media, 1)}</b> frente al Inicio; en las <b style={{ color: ds.ink }}>{resumen.resto.n}</b> semanas normales o bajas, en <b style={{ color: ds.ink }}>{cmjSigned(resumen.resto.media, 1)}</b>.
              <div style={{ marginTop: 4, color: ds.inkMuted, fontSize: 10.5 }}>Es una coincidencia, no una causa: aquí no entra la carga de partido ni ningún otro factor.</div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 10 }}>
              Para comparar hacen falta al menos 6 semanas con carga relativa y test de salto (y 2 en cada grupo). Ahora hay {resumen.n}.
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 420 }}>
              <div style={{ display: "grid", gridTemplateColumns: columnas, gap: 8, padding: "0 6px 6px", borderBottom: `1px solid ${ds.border}` }}>
                <div style={cabecera}>Micro</div>
                <div style={cabecera}>Fuerza de la semana</div>
                <div style={{ ...cabecera, textAlign: "right" }}>Carga</div>
                <div style={{ ...cabecera, textAlign: "right" }}>Altura MD-2</div>
                <div style={{ ...cabecera, textAlign: "right" }}>Altura MD-1</div>
              </div>
              {filas.slice(0, 12).map((f, i) => {
                const c = f.carga;
                const meta = c.nivel ? NIVEL_CARGA_FUERZA_META[c.nivel] : null;
                return (
                  <div key={c.microId} style={{ display: "grid", gridTemplateColumns: columnas, gap: 8, alignItems: "center", padding: "8px 6px", borderBottom: `1px solid ${ds.borderSoft}`, background: i % 2 === 0 ? "transparent" : `${ds.bgElevated}55` }}>
                    <div style={{ fontFamily: dsF.mono, fontSize: 12, color: ds.ink }}>Nº {c.numero}</div>
                    <div style={{ fontSize: 11.5, color: c.hayDatos ? ds.ink : ds.inkMuted, lineHeight: 1.35 }}>
                      {c.hayDatos ? (
                        <>
                          {c.sesiones} sesión{c.sesiones === 1 ? "" : "es"} · {c.series} series
                          {c.intensidad != null && ` · ${Math.round(c.intensidad * 100)} % del 1RM`}
                          {c.fechasPesadas.length > 0 && <span style={{ color: ds.warning }}> · {c.fechasPesadas.length} pesada{c.fechasPesadas.length === 1 ? "" : "s"}</span>}
                        </>
                      ) : (
                        "sin fuerza registrada"
                      )}
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: meta ? meta.color() : ds.inkMuted }}>{meta ? meta.label : "—"}</div>
                    {celdaDelta(f.altura?.md2Delta, f.altura?.md2Status)}
                    {celdaDelta(f.altura?.md1Delta, f.altura?.md1Status)}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 6, lineHeight: 1.45 }}>
            Carga = series de la semana frente a la media de sus hasta 4 microciclos anteriores (baja &lt; 75 %, alta &gt; 125 %). Las sesiones se asignan al microciclo por fecha: desde el día de Inicio hasta la víspera del siguiente Inicio (el último, máx. 14 días).
          </div>
        </>
      )}
    </div>
  );
}

function CmjFichaJugadorReal({ jugadorId, jugadorNombre }) {
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [metricKeys, setMetricKeys] = useState(() => new Set(["altura", "potenciaRel", "fuerzaRel"]));
  const [modoValores, setModoValores] = useState("reales"); // 'reales' | 'pct'
  const [periodo, setPeriodo] = useState("temporada"); // 'temporada' | 'rango' | 'microciclo'
  const [rango, setRango] = useState({ start: "", end: "" });
  const [microSel, setMicroSel] = useState(null);
  const [filtroTags, setFiltroTags] = useState(() => new Set(["inicio", "md2", "md1", "sin"]));
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  function toggleMetric(k) {
    setMetricKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k); // siempre queda al menos una variable seleccionada
      } else {
        next.add(k);
      }
      return next;
    });
  }

  const cargar = useCallback(async () => {
    const [saltosRes, microRes] = await Promise.all([
      supabase.from("cmj_saltos").select("*").eq("jugador_id", jugadorId),
      supabase.from("cmj_microciclos").select("*"),
    ]);
    if (!saltosRes.error) setSaltos(saltosRes.data || []);
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setLoaded(true);
  }, [jugadorId]);

  useEffect(() => { cargar(); }, [cargar]);
  // Fase 2: historial de fuerza del jugador para cruzarlo con sus microciclos.
  const { loaded: histFuerzaLoaded, items: histFuerza } = usePlayerHistory(jugadorId);
  const { items: refFS } = useReferenciasFuerza(jugadorId);

  function toggleTag(k) {
    setFiltroTags((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (!loaded) return <LoadingBlock />;

  const filasParaMotor = saltos.filter((s) => !s.excluido).map((s) => ({
    jugadorId: s.jugador_id,
    nombre: jugadorNombre,
    dateKey: s.fecha,
    date: s.fecha_hora,
    peso: s.peso,
    hp0: s.hp0,
    altura: s.altura,
    fuerza: s.fuerza,
    potencia: s.potencia,
    velocidad: s.velocidad,
    kineticsValid: s.kinetics_valid,
    pesoValid: s.peso_valid,
    hp0Valid: s.hp0_valid,
  }));

  const { players: builtPlayers, microList } = cmjBuildPlayers(
    filasParaMotor,
    microciclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );
  const player = builtPlayers[0] || null;

  if (!player) {
    return <CmjProximamente titulo="Sin tests CMJ todavía" texto="En cuanto subas un CSV con saltos de este jugador y queden vinculados a él (pestaña Subir CSV, dentro de Control de fatiga), aparecerán aquí." />;
  }

  const metricasSel = CMJ_METRIC_LIST.filter((m) => metricKeys.has(m.key));
  const microRows = microList.map((m) => ({ m, r: player.microResults.get(m.id) })).filter(({ r }) => r);
  const microSelActivo = microSel ?? (microRows.length ? microRows[microRows.length - 1].m.id : null);

  const dentroDeRango = (r) => {
    if (periodo !== "rango" || !rango.start || !rango.end) return periodo !== "rango";
    const t = new Date(r.date).getTime();
    return t >= new Date(rango.start).getTime() && t <= new Date(rango.end + "T23:59:59").getTime();
  };

  // Registros base del periodo/filtro elegido (sin reducir todavía a una
  // variable) — a diferencia de antes, aquí se parte de los registros
  // crudos para poder superponer varias variables en la misma gráfica.
  let registrosBase = [];
  if (periodo === "microciclo") {
    const sel = microRows.find(({ m }) => m.id === microSelActivo);
    if (sel) registrosBase = CMJ_FIELDS.filter((k) => sel.r[k]).map((k) => sel.r[k]);
  } else {
    registrosBase = player.sorted.filter((r) => filtroTags.has(r.tag || "sin") && dentroDeRango(r));
  }
  // Solo entran a la gráfica y a la tabla los registros que tienen valor en
  // TODAS las variables seleccionadas — así las líneas superpuestas y las
  // filas de la tabla comparten siempre el mismo eje de fechas.
  const registros = registrosBase.filter((r) => metricasSel.every((m) => m.get(r) != null));

  // Misma referencia que en el panel original: MD-2/MD+1 se comparan con el
  // Inicio de esa misma semana; un Inicio se compara con el Inicio anterior
  // (tendencia semana a semana). Sin ninguna referencia válida, no se
  // muestra ningún %.
  function referenciaDelta(r, metric) {
    if (r.tag === "md2" || r.tag === "md1") {
      if (r.microId == null) return null;
      const mr = player.microResults.get(r.microId);
      if (!mr || !mr.inicio) return null;
      const baseVal = metric.get(mr.inicio);
      return baseVal != null ? cmjPct(metric.get(r), baseVal) : null;
    }
    if (r.tag === "inicio") {
      const idx = player.inicios.findIndex((x) => x.date === r.date);
      if (idx <= 0) return null;
      const baseVal = metric.get(player.inicios[idx - 1]);
      return baseVal != null ? cmjPct(metric.get(r), baseVal) : null;
    }
    return null;
  }

  const seriesGrafica = metricasSel.map((m) => {
    const valoresReales = registros.map((r) => m.get(r));
    const media = valoresReales.length ? valoresReales.reduce((a, b) => a + b, 0) / valoresReales.length : 0;
    return {
      key: m.key,
      label: m.label,
      color: CMJ_METRIC_CHART_COLOR[m.key],
      puntos: registros.map((r, i) => ({
        date: r.date,
        valorMostrado: modoValores === "pct" ? (media ? (valoresReales[i] / media) * 100 : 0) : valoresReales[i],
      })),
    };
  });

  const statusMeta = CMJ_STATUS_META[player.combinedStatus];

  // ---- Bloque de cabecera del mockup (banner de estado + alerta de
  // divergencia + tira de 4 métricas con "mejor histórico" + pequeños
  // múltiplos con bandas de color) — se antepone a la vista detallada de
  // filtros/tabla que ya existía, reutilizando EXACTAMENTE los mismos datos
  // del motor CMJ (cmjBuildPlayers/cmjMotivoDia/cmjMotivoRecuperacion,
  // player.umbral con su ambarPct/rojoPct ya individualizado) — sin
  // recalcular ni inventar ningún umbral nuevo.
  const ultimoRegistro = player.sorted[player.sorted.length - 1];
  const dayFieldBanner = player.lastMicro
    ? player.lastMicro.md1 && (!player.lastMicro.md2 || new Date(player.lastMicro.md1.date) >= new Date(player.lastMicro.md2.date))
      ? "md1"
      : player.lastMicro.md2
      ? "md2"
      : null
    : null;
  const motivoBanner = player.lastMicro
    ? dayFieldBanner
      ? cmjMotivoDia(player.lastMicro, dayFieldBanner, player.umbral)
      : cmjMotivoRecuperacion(player.lastMicro.recuperacion, player.umbral)
    : { status: "gray", motivo: "Sin tests suficientes todavía para valorar su estado.", nivel: null };
  const bannerMeta = CMJ_STATUS_META[motivoBanner.status];
  const tagUltimo = ultimoRegistro.tag ? CMJ_TAG_META[ultimoRegistro.tag] : null;

  const mejorHistoricoMetrica = (metric) => {
    const vals = player.sorted.map((r) => metric.get(r)).filter((v) => v != null);
    return vals.length ? Math.max(...vals) : null;
  };
  const deltaUltimoMetrica = (metric) => {
    if (!player.lastMicro) return null;
    if (dayFieldBanner === "md1") return player.lastMicro.metrics[metric.key]?.md1Delta ?? null;
    if (dayFieldBanner === "md2") return player.lastMicro.metrics[metric.key]?.md2Delta ?? null;
    return player.lastMicro.recuperacion ? player.lastMicro.recuperacion.metrics[metric.key]?.delta ?? null : null;
  };
  const statusUltimoMetrica = (metric) => {
    if (!player.lastMicro) return "gray";
    if (dayFieldBanner === "md1") return player.lastMicro.metrics[metric.key]?.md1Status ?? "gray";
    if (dayFieldBanner === "md2") return player.lastMicro.metrics[metric.key]?.md2Status ?? "gray";
    return player.lastMicro.recuperacion ? player.lastMicro.recuperacion.metrics[metric.key]?.status ?? "gray" : "gray";
  };
  // Últimos 4 tests con valor en cada variable, para los pequeños múltiplos.
  const ultimos4 = player.sorted.slice(-4);

  // Fase 2 · fuerza y salto por microciclo (ver calcularCargaFuerzaPorMicro).
  const ventanasFS = cmjVentanasMicrociclo(microciclos);
  const cargasFS = histFuerzaLoaded ? calcularCargaFuerzaPorMicro([...histFuerza, ...refFS], ventanasFS) : [];
  const filasFS = cargasFS
    .map((c) => {
      const r = player.microResults.get(c.microId);
      return { carga: c, numero: c.numero, r, altura: r?.metrics?.altura || null };
    })
    .filter((f) => f.carga.hayDatos || f.r)
    .reverse();
  const resumenFS = resumenFuerzaSalto(filasFS);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px",
          borderRadius: dsR.lg,
          marginBottom: 14,
          border: `1px solid ${bannerMeta.color}55`,
          background: bannerMeta.bg,
        }}
      >
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: bannerMeta.color, marginTop: 3, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 13, color: ds.ink }}>Estado CMJ: {bannerMeta.label}</b>
          <p style={{ fontSize: 11.5, color: ds.inkSecondary, lineHeight: 1.5, margin: "4px 0 0" }}>{motivoBanner.motivo}</p>
        </div>
        <div style={{ font: `600 10px ${dsF.mono}`, color: ds.inkMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
          Test del {fmtDateShort(ultimoRegistro.date)}{tagUltimo ? ` · ${tagUltimo.label}` : ""}
        </div>
      </div>

      {player.lastMicro?.divergente && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: `${ds.warning}15`, border: `1px dashed ${ds.warning}66`, borderRadius: dsR.md, padding: "11px 13px", marginBottom: 16 }}>
          <div style={{ color: ds.warning, fontSize: 15, flexShrink: 0, lineHeight: 1 }}>⚠</div>
          <p style={{ fontSize: 11.5, color: ds.inkSecondary, lineHeight: 1.5, margin: 0 }}>
            <b style={{ color: ds.ink }}>Divergencia detectada:</b> la altura no delata la caída, pero potencia y/o fuerza relativas sí — es señal de que {jugadorNombre} está saltando "igual de alto" con otra estrategia, menos explosiva. La altura sola lo estaría ocultando.
          </p>
        </div>
      )}

      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 9 }}>Sus marcas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 9, marginBottom: 16 }}>
        {CMJ_METRIC_LIST.map((m) => {
          const valorActual = m.get(ultimoRegistro);
          const mejor = mejorHistoricoMetrica(m);
          const delta = m.drivesStatus ? deltaUltimoMetrica(m) : null;
          const dotStatus = m.drivesStatus ? statusUltimoMetrica(m) : "gray";
          const dotColor = { red: ds.danger, amber: ds.warning, green: ds.success, gray: ds.inkMuted }[dotStatus];
          return (
            <div key={m.key} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, font: `600 9px ${dsF.mono}`, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                {m.label}
              </div>
              <div style={{ font: `800 16px ${dsF.display}`, color: ds.ink }}>
                {cmjFmt(valorActual, m.decimals)}
                <span style={{ fontSize: 11, fontWeight: 400, color: ds.inkMuted, marginLeft: 2 }}>{m.unit}</span>
                {m.drivesStatus ? (
                  delta != null && <span style={{ font: `700 10.5px ${dsF.mono}`, marginLeft: 5, color: delta < 0 ? (dotStatus === "gray" ? ds.inkMuted : ds.danger) : ds.inkMuted }}>{cmjSigned(delta, 0)}</span>
                ) : (
                  <span style={{ font: `700 10.5px ${dsF.mono}`, marginLeft: 5, color: ds.inkMuted }}>informativa</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginTop: 7, paddingTop: 7, borderTop: `1px solid ${ds.border}`, font: `600 9px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Mejor <b style={{ font: `800 13px ${dsF.display}`, color: ds.accent, textTransform: "none", letterSpacing: "normal" }}>{mejor != null ? `${cmjFmt(mejor, m.decimals)} ${m.unit}` : "—"}</b>
              </div>
            </div>
          );
        })}
      </div>

      <DatosPorRevisarCmjReal saltos={saltos} onCambio={cargar} />
      <FuerzaSaltoMicrociclosReal filas={filasFS} resumen={resumenFS} cargando={!histFuerzaLoaded} jugadorNombre={jugadorNombre} />

      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 9 }}>Evolución por variable — últimos {ultimos4.length} tests</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "2px 0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `600 10px ${dsF.sans}`, color: ds.inkSecondary }}>
          <span style={{ width: 11, height: 8, borderRadius: 2, background: `${ds.success}30`, border: `1px solid ${ds.success}`, flexShrink: 0 }} />Dentro de su umbral
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `600 10px ${dsF.sans}`, color: ds.inkSecondary }}>
          <span style={{ width: 11, height: 8, borderRadius: 2, background: `${ds.warning}30`, border: `1px solid ${ds.warning}`, flexShrink: 0 }} />Zona de atención
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: `600 10px ${dsF.sans}`, color: ds.inkSecondary }}>
          <span style={{ width: 11, height: 8, borderRadius: 2, background: `${ds.danger}30`, border: `1px solid ${ds.danger}`, flexShrink: 0 }} />Zona de riesgo
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 8 }}>
        {CMJ_METRIC_LIST.map((m) => {
          const puntos = ultimos4.filter((r) => m.get(r) != null).map((r) => ({ date: r.date, tag: r.tag, valor: m.get(r) }));
          const color = m.key === "velocidad" ? ds.chart2 : CMJ_METRIC_CHART_COLOR[m.key];
          return <CmjMiniMultiploReal key={m.key} metric={m} puntos={puntos} umbral={m.drivesStatus ? player.umbral[m.key] : null} color={color} />;
        })}
      </div>
      <div style={{ fontSize: 10.5, color: ds.inkMuted, marginBottom: 18 }}>
        Cada variable en su propia escala, con las bandas de su umbral individualizado ({player.umbral.altura?.personalizado ? "personalizado a este jugador" : "umbral general del equipo, todavía sin Inicios suficientes para individualizarlo"}) — la velocidad no lleva bandas porque no determina el estado.
      </div>

      <div style={{ fontFamily: dsF.display, fontSize: 13, fontWeight: 700, color: ds.ink, marginBottom: 4 }}>Explorar en detalle</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: ds.inkMuted }}>
          {player.nTests} tests · primer test {fmtDateShort(player.sorted[0].date)} · último {fmtDateShort(player.sorted[player.sorted.length - 1].date)}
        </div>
        <DsBadge tone={player.combinedStatus === "red" ? "danger" : player.combinedStatus === "green" ? "success" : player.combinedStatus === "amber" ? "accent" : "neutral"}>
          {statusMeta.label}
        </DsBadge>
      </div>

      <button onClick={() => setMostrarFiltros((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, margin: "10px 0 12px" }}>
        {mostrarFiltros ? "▾ ocultar filtros" : "▸ filtros"}
      </button>

      {mostrarFiltros && (
        <DsCard style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Variables ({metricasSel.length} de {CMJ_METRIC_LIST.length})</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CMJ_METRIC_LIST.map((m) => {
                const activo = metricKeys.has(m.key);
                const color = CMJ_METRIC_CHART_COLOR[m.key];
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? color : ds.border}`, background: activo ? `${color}1E` : "transparent", color: activo ? color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, opacity: activo ? 1 : 0.35, flexShrink: 0 }} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Vista</div>
            <DsTabSwitcher
              tabs={[
                { id: "reales", label: "Valores reales" },
                { id: "pct", label: "% respecto a su media" },
              ]}
              active={modoValores}
              onChange={setModoValores}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Periodo</div>
            <DsTabSwitcher
              tabs={[
                { id: "temporada", label: "Temporada completa" },
                { id: "rango", label: "Rango de fechas" },
                { id: "microciclo", label: "Microciclo concreto" },
              ]}
              active={periodo}
              onChange={setPeriodo}
            />
          </div>

          {periodo === "rango" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Fechas</div>
              <div style={{ display: "flex", gap: 12 }}>
                <DsInput type="date" value={rango.start} onChange={(e) => setRango({ ...rango, start: e.target.value })} />
                <DsInput type="date" value={rango.end} onChange={(e) => setRango({ ...rango, end: e.target.value })} />
              </div>
            </div>
          )}

          {periodo === "microciclo" && (
            microRows.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Microciclo</div>
                <DsSelect value={microSelActivo || ""} onChange={(e) => setMicroSel(e.target.value)} style={{ maxWidth: 220 }}>
                  {microRows.map(({ m }) => (
                    <option key={m.id} value={m.id}>Nº {m.numero}</option>
                  ))}
                </DsSelect>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: ds.inkMuted }}>Este jugador todavía no tiene tests dentro de ningún microciclo registrado.</div>
            )
          )}

          {periodo !== "microciclo" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Momento</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "inicio", label: "Inicio", color: CMJ_TAG_META.inicio.color },
                  { key: "md2", label: "MD-2", color: CMJ_TAG_META.md2.color },
                  { key: "md1", label: "MD+1", color: CMJ_TAG_META.md1.color },
                  { key: "sin", label: "Sin etiqueta", color: ds.inkMuted },
                ].map((op) => {
                  const activo = filtroTags.has(op.key);
                  return (
                    <button
                      key={op.key}
                      onClick={() => toggleTag(op.key)}
                      style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? op.color : ds.border}`, background: activo ? `${op.color}1E` : "transparent", color: activo ? op.color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DsCard>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>
        {periodo === "microciclo" ? `Microciclo Nº ${microRows.find(({ m }) => m.id === microSelActivo)?.m.numero ?? "—"}` : "Evolución"}
      </div>

      <DsCard style={{ padding: 14, marginBottom: 16 }}>
        <CmjGraficaEvolucionMultiReal series={seriesGrafica} decimalesEje={modoValores === "pct" ? 0 : 1} />
      </DsCard>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>
        Registros ({metricasSel.map((m) => m.label).join(" · ")})
      </div>
      {registros.length === 0 ? (
        <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Ningún registro coincide con el filtro seleccionado (o falta alguna de las variables elegidas en esos días).</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 280 + metricasSel.length * 130 }}>
            <div style={{ display: "grid", gridTemplateColumns: `100px 96px repeat(${metricasSel.length}, minmax(120px, 1fr))`, padding: "0 10px 8px", borderBottom: `1px solid ${ds.border}` }}>
              <div style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha</div>
              <div style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Momento</div>
              {metricasSel.map((m) => (
                <div key={m.key} style={{ fontSize: 10.5, color: CMJ_METRIC_CHART_COLOR[m.key], textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>{m.label}</div>
              ))}
            </div>
            {[...registros].reverse().map((r, i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: `100px 96px repeat(${metricasSel.length}, minmax(120px, 1fr))`, padding: "9px 10px", borderBottom: `1px solid ${ds.borderSoft}`, background: i % 2 === 0 ? "transparent" : ds.bgElevated + "55" }}
              >
                <div style={{ fontSize: 12, color: ds.ink }}>{fmtDateShort(r.date)}</div>
                <div style={{ fontSize: 11.5, color: r.tag ? CMJ_TAG_META[r.tag].color : ds.inkMuted }}>{r.tag ? CMJ_TAG_META[r.tag].label : "—"}</div>
                {metricasSel.map((m) => {
                  const delta = periodo !== "microciclo" ? referenciaDelta(r, m) : null;
                  return (
                    <div key={m.key} style={{ textAlign: "right", fontFamily: dsF.mono, fontSize: 12.5, color: ds.ink }}>
                      {cmjFmt(m.get(r), m.decimals)} <span style={{ color: ds.inkMuted, fontSize: 10.5 }}>{m.unit}</span>
                      {delta != null && <span style={{ marginLeft: 6, fontWeight: 700, color: delta >= 0 ? ds.success : ds.danger }}>{cmjSigned(delta)}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini-gráfica semanal compacta (adherencia / volumen de la pestaña
// Progreso) — mismo lenguaje visual que las mini-gráficas de Control de
// fatiga (línea + puntos + referencia discontinua), pero con una única
// serie y una referencia que puede ser fija (80% = semana cumplida) o "su
// propia mejor semana" (con anillo verde en el punto que la alcanza), igual
// patrón que GraficaProgresoCargaReal.
function MiniGraficaSemanalReal({ puntos, refValor, refLabel, resaltarMejor }) {
  if (puntos.length < 2) {
    return <div style={{ color: ds.inkMuted, fontSize: 11.5, padding: "18px 0", textAlign: "center" }}>Hace falta más historial para trazar la evolución.</div>;
  }
  const width = 280;
  const height = 74;
  const padX = 10;
  const padTop = 16;
  const padBottom = 14;
  const valores = puntos.map((p) => p.valor);
  const maxSerie = Math.max(...valores);
  const refLinea = refValor != null ? refValor : resaltarMejor ? maxSerie : null;
  const allVals = refLinea != null ? [...valores, refLinea] : valores;
  const minV = Math.min(...allVals, 0);
  const maxV = Math.max(...allVals);
  const rango = maxV - minV || 1;
  const stepX = (width - padX * 2) / (puntos.length - 1);
  const coordX = (i) => padX + i * stepX;
  const coordY = (v) => height - padBottom - ((v - minV) / rango) * (height - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valor).toFixed(1)}`).join(" ");
  const indiceMejor = resaltarMejor ? valores.indexOf(maxSerie) : -1;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
        {refLinea != null && (
          <>
            <line x1={padX} y1={coordY(refLinea)} x2={width - padX} y2={coordY(refLinea)} stroke={ds.inkMuted} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 4" />
            {refLabel && <text x={width - padX} y={coordY(refLinea) - 4} fontSize="7.5" fill={ds.inkMuted} textAnchor="end">{refLabel}</text>}
          </>
        )}
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => {
          const esUltimo = i === puntos.length - 1;
          const esMejor = i === indiceMejor;
          return (
            <g key={i}>
              {esMejor && <circle cx={coordX(i)} cy={coordY(p.valor)} r={7} fill="none" stroke={ds.success} strokeWidth={2} />}
              <circle cx={coordX(i)} cy={coordY(p.valor)} r={esUltimo ? 5.5 : 4} fill={esUltimo ? ds.accent : ds.surfaceRaised} stroke={ds.accent} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, padding: "0 2px" }}>
        {puntos.map((p, i) => (
          <span key={i} style={{ font: `600 8px ${dsF.mono}`, color: ds.inkMuted }}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}



// Mensaje común cuando falta ejecutar sql/add_calidad_datos.sql.
function mensajeErrorCalidad(e) {
  return /ignorar|revisado|excluido|column/i.test(e?.message || "") ? "Falta ejecutar sql/add_calidad_datos.sql en Supabase." : "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.";
}

// Registros de fuerza de un jugador que se salen de lo habitual. El
// entrenador decide: está bien, corregir el dato, o ignorarlo (deja de contar
// para e1RM y cargas, pero la sesión sigue contando como hecha).
function DatosPorRevisarFuerzaReal({ items, onCambio }) {
  const atipicos = detectarRegistrosAtipicos(items);
  const ignorados = items.filter((it) => it.ignorar);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ carga: "", reps: "", rir: "" });
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  if (!atipicos.length && !ignorados.length) return null;
  const actualizar = async (id, cambios) => {
    setError("");
    setTrabajando(true);
    try {
      const { error: e } = await supabase.from("registros").update(cambios).eq("id", id);
      if (e) throw new Error(e.message);
      invalidateEntityCache("registros");
      setEditando(null);
      onCambio?.();
    } catch (e) {
      setError(mensajeErrorCalidad(e));
    } finally {
      setTrabajando(false);
    }
  };
  const guardarCorreccion = (it) => {
    const carga = Number(String(form.carga).replace(",", "."));
    const reps = Number(form.reps);
    const rir = Number(form.rir);
    if (!Number.isFinite(carga) || carga <= 0 || !Number.isFinite(reps) || reps < 1 || form.rir === "" || !Number.isFinite(rir) || rir < 0) return setError("Revisa carga, repeticiones y RIR.");
    actualizar(it.id, { carga_kg: carga, reps_hechas: reps, rir, revisado: true });
  };
  const campo = { background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.ink, fontSize: 12, padding: "5px 7px", width: 64 };
  const textoRegistro = (it) => `${it.cargaOriginal} kg × ${it.repsOriginal || "?"}${it.rirOriginal !== "" ? ` @ RIR ${it.rirOriginal}` : ""}`;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 4 }}>
        Datos por revisar {atipicos.length > 0 && <DsBadge tone="danger">{atipicos.length}</DsBadge>}
      </div>
      <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 10 }}>
        Registros que se salen de lo habitual de este jugador en ese ejercicio. Nada se cambia solo: si es un error de tecleo, corrígelo o ignóralo para que no distorsione el e1RM ni las cargas.
      </div>
      {error && <div style={{ fontSize: 12, color: ds.danger, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {atipicos.map(({ item: it, motivos }) => (
          <div key={it.id} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted }}>{fmtDateShort(it.date)}</span>
              <span style={{ fontWeight: 700, color: ds.ink, fontSize: 13 }}>{it.name}</span>
              <span style={{ color: ds.inkSecondary, fontSize: 12.5 }}>{textoRegistro(it)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: ds.warning, margin: "4px 0 8px" }}>{motivos.join(" · ")}</div>
            {editando === it.id ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input placeholder="kg" inputMode="decimal" value={form.carga} onChange={(e) => setForm({ ...form, carga: e.target.value })} style={campo} />
                <input placeholder="reps" inputMode="numeric" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} style={campo} />
                <input placeholder="RIR" inputMode="numeric" value={form.rir} onChange={(e) => setForm({ ...form, rir: e.target.value })} style={campo} />
                <DsButton size="sm" disabled={trabajando} onClick={() => guardarCorreccion(it)}>Guardar</DsButton>
                <DsButton size="sm" variant="secondary" onClick={() => setEditando(null)}>Cancelar</DsButton>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <DsButton size="sm" variant="secondary" disabled={trabajando} onClick={() => actualizar(it.id, { revisado: true })}>Está bien</DsButton>
                <DsButton size="sm" variant="secondary" disabled={trabajando} onClick={() => { setEditando(it.id); setForm({ carga: String(it.cargaOriginal), reps: String(it.repsOriginal), rir: String(it.rirOriginal) }); }}>Corregir</DsButton>
                <DsButton size="sm" variant="secondary" disabled={trabajando} onClick={() => actualizar(it.id, { ignorar: true, revisado: true })}>Ignorar dato</DsButton>
              </div>
            )}
          </div>
        ))}
      </div>
      {ignorados.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 6 }}>Ignorados (no cuentan para e1RM ni cargas):</div>
          {ignorados.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: ds.inkSecondary, padding: "4px 0" }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 60 }}>{fmtDateShort(it.date)}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name} · {textoRegistro(it)}</span>
              <button onClick={() => actualizar(it.id, { ignorar: false })} disabled={trabajando} style={{ background: "transparent", border: "none", color: ds.accent, cursor: "pointer", fontSize: 11.5 }}>Restaurar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Saltos CMJ que se alejan de la mediana del jugador. "Excluir" saca ese test
// del análisis (semáforos, umbrales individuales); se puede restaurar.
function DatosPorRevisarCmjReal({ saltos, onCambio }) {
  const atipicos = detectarCmjAtipicos(saltos);
  const excluidos = saltos.filter((s) => s.excluido);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  if (!atipicos.length && !excluidos.length) return null;
  const actualizar = async (s, cambios) => {
    setError("");
    setTrabajando(true);
    try {
      const { error: e } = await supabase.from("cmj_saltos").update(cambios).eq("nombre_csv", s.nombre_csv).eq("fecha", s.fecha);
      if (e) throw new Error(e.message);
      onCambio?.();
    } catch (e) {
      setError(mensajeErrorCalidad(e));
    } finally {
      setTrabajando(false);
    }
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 4 }}>
        Saltos por revisar {atipicos.length > 0 && <DsBadge tone="danger">{atipicos.length}</DsBadge>}
      </div>
      <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 10 }}>
        Tests cuya altura se aleja de lo habitual de este jugador (mala medición, salto con otra estrategia…). Si lo excluyes, deja de contar en semáforos y umbrales.
      </div>
      {error && <div style={{ fontSize: 12, color: ds.danger, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {atipicos.map(({ salto: s, motivos }) => (
          <div key={`${s.nombre_csv}|${s.fecha}`} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted }}>{fmtDateShort(String(s.fecha).slice(0, 10))}</span>
              <span style={{ fontSize: 12.5, color: ds.warning }}>{motivos.join(" · ")}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <DsButton size="sm" variant="secondary" disabled={trabajando} onClick={() => actualizar(s, { revisado: true })}>Está bien</DsButton>
              <DsButton size="sm" variant="secondary" disabled={trabajando} onClick={() => actualizar(s, { excluido: true, revisado: true })}>Excluir del análisis</DsButton>
            </div>
          </div>
        ))}
      </div>
      {excluidos.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 6 }}>Excluidos del análisis:</div>
          {excluidos.map((s) => (
            <div key={`${s.nombre_csv}|${s.fecha}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: ds.inkSecondary, padding: "4px 0" }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 60 }}>{fmtDateShort(String(s.fecha).slice(0, 10))}</span>
              <span style={{ flex: 1 }}>{Number(s.altura).toFixed(1)} cm</span>
              <button onClick={() => actualizar(s, { excluido: false })} disabled={trabajando} style={{ background: "transparent", border: "none", color: ds.accent, cursor: "pointer", fontSize: 11.5 }}>Restaurar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------- Informe exportable por jugador ----------
// Resumen de fuerza, carga, CMJ y adherencia para compartir con el cuerpo
// técnico o médico sin darles acceso a la app. Se abre como página imprimible
// (Imprimir → Guardar como PDF) y se puede bajar el detalle en CSV.
function escaparHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function construirInformeHtml(d) {
  const tabla = (cabeceras, filas) =>
    filas.length
      ? `<table><thead><tr>${cabeceras.map((h) => `<th>${escaparHtml(h)}</th>`).join("")}</tr></thead><tbody>${filas
          .map((f) => `<tr>${f.map((c) => `<td>${escaparHtml(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      : `<p class="nd">Sin datos en este periodo.</p>`;
  const fmtF = (f) => (f ? String(f).slice(8, 10) + "/" + String(f).slice(5, 7) + "/" + String(f).slice(0, 4) : "");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe · ${escaparHtml(d.nombre)}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px;line-height:1.4}
h1{font-size:22px;margin:0 0 2px}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
.sub{color:#555;font-size:12.5px;margin-bottom:8px}.nd{color:#777;font-size:12.5px}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #d5d5d5;padding:4px 7px;text-align:left}th{background:#f3f3f3}
.nota{font-size:11px;color:#666;margin-top:22px}
@media print{body{margin:8mm}}
</style></head><body>
<h1>${escaparHtml(d.nombre)}</h1>
<div class="sub">Informe generado el ${escaparHtml(fmtF(d.generado))} · datos de la app de fuerza y control de fatiga (CMJ)</div>
<h2>Adherencia semanal (trabajo completado sobre lo asignado)</h2>
${tabla(["Semana", "Adherencia"], d.adherencia.map((a) => [a.label, `${a.valor} %`]))}
<h2>Fuerza: 1RM estimado por ejercicio</h2>
${tabla(["Ejercicio", "e1RM actual (kg)", "Fecha", "Cambio vs. marca anterior"], d.records.map((r) => [r.nombre, r.valor, fmtF(r.fecha), r.pctSobreAnterior != null ? `${r.pctSobreAnterior > 0 ? "+" : ""}${Math.round(r.pctSobreAnterior)} %` : "—"]))}
<h2>Cumplimiento de la pauta (últimas 4 semanas)</h2>
${tabla(["Indicador", "Valor"], d.cumplimiento)}
<h2>Carga de fuerza por microciclo</h2>
${tabla(["Microciclo", "Series", "Sesiones", "Sesiones pesadas (≥85 % 1RM)", "Carga relativa"], d.cargas)}
<h2>CMJ: últimos tests</h2>
${tabla(["Fecha", "Altura (cm)", "Potencia rel. (W/kg)", "Fuerza rel. (N/kg)", "Velocidad (m/s)"], d.cmj)}
<div class="nota">El 1RM se estima a partir de carga, repeticiones y RIR de las series registradas por el jugador (y de las marcas de referencia del entrenador). Es una estimación, no un test directo. La adherencia pondera el trabajo completado por bloque (fuerza pesa más que movilidad). Los datos marcados como atípicos e ignorados por el entrenador no se incluyen en los cálculos de fuerza.</div>
</body></html>`;
}
function construirCsvRegistros(items, refItems) {
  const cab = ["fecha", "ejercicio", "material", "series_pautadas", "series_hechas", "reps", "carga_kg", "rir", "e1rm_estimado_kg", "tipo", "ignorado"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = [...items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque === "Fuerza"), ...refItems].map((it) => {
    const e1 = e1rmDeValores(it.cargaOriginal ?? it.cargaReal, it.repsOriginal ?? it.repsReal, it.rirOriginal ?? it.rirReal);
    return [
      it.date,
      it.name,
      materialEfectivo(it),
      it.esReferencia ? "" : it.sets ?? "",
      it.esReferencia ? "" : it.seriesHechas ?? "",
      it.repsOriginal ?? it.repsReal ?? "",
      it.cargaOriginal ?? it.cargaReal ?? "",
      it.rirOriginal ?? it.rirReal ?? "",
      e1 != null ? Math.round(e1 * 10) / 10 : "",
      it.esReferencia ? (it.tipoReferencia === "test" ? "referencia (test)" : "referencia (histórica)") : "sesión",
      it.ignorar ? "sí" : "",
    ].map(esc).join(",");
  });
  return "\uFEFF" + [cab.map(esc).join(","), ...filas].join("\n");
}
function descargarArchivo(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function BotonesInformeJugadorReal({ jugador, items, refItems, puntosAdherencia, cumplimiento, textoRir }) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const abrirInforme = async () => {
    setError("");
    setTrabajando(true);
    try {
      const [saltosRes, microRes] = await Promise.all([
        supabase.from("cmj_saltos").select("*").eq("jugador_id", jugador.id),
        supabase.from("cmj_microciclos").select("*"),
      ]);
      const todos = [...items, ...refItems];
      const ventanas = cmjVentanasMicrociclo(microRes.error ? [] : microRes.data || []);
      const cargas = calcularCargaFuerzaPorMicro(todos, ventanas).filter((c) => c.hayDatos);
      const saltos = (saltosRes.error ? [] : saltosRes.data || [])
        .filter((r) => !r.excluido)
        .sort((a, b) => (String(a.fecha) < String(b.fecha) ? 1 : -1))
        .slice(0, 12);
      const num = (v, d = 1) => (v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toFixed(d));
      const cumpl = [];
      if (cumplimiento.series) cumpl.push(["Series hechas / pautadas", `${cumplimiento.series.hechas} de ${cumplimiento.series.pautadas} (${cumplimiento.series.pct} %)`]);
      if (cumplimiento.reps) cumpl.push(["Reps objetivo alcanzadas", `${cumplimiento.reps.ok} de ${cumplimiento.reps.total} tareas (${cumplimiento.reps.pct} %)`]);
      if (cumplimiento.rirDif) cumpl.push(["RIR real vs. pauta", `${cumplimiento.rirDif.media > 0 ? "+" : ""}${cumplimiento.rirDif.media.toFixed(1)} (${textoRir(cumplimiento.rirDif.media)})`]);
      const html = construirInformeHtml({
        nombre: jugador.name,
        generado: todayStr(),
        adherencia: puntosAdherencia,
        records: calcularRecordsCargaJugador(todos),
        cumplimiento: cumpl,
        cargas: cargas.map((c) => [`Micro ${c.numero} (${c.desde} → ${c.hasta})`, c.series, c.sesiones, c.fechasPesadas.length, c.nivel ? `${c.nivel} (${Math.round(c.relativa * 100)} % de su media)` : "—"]),
        cmj: saltos.map((r) => [
          String(r.fecha).slice(0, 10),
          num(r.altura),
          r.kinetics_valid && r.peso ? num(r.potencia / r.peso) : "—",
          r.kinetics_valid && r.peso ? num(r.fuerza / r.peso) : "—",
          num(r.velocidad, 2),
        ]),
      });
      const w = window.open("", "_blank");
      if (!w) throw new Error("popup");
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      setError(e?.message === "popup" ? "El navegador ha bloqueado la ventana del informe. Permite las ventanas emergentes para esta página." : "No se pudo generar el informe. Inténtalo de nuevo.");
    } finally {
      setTrabajando(false);
    }
  };
  return (
    <div style={{ marginTop: 22, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <DsButton variant="secondary" size="sm" disabled={trabajando} onClick={abrirInforme}>{trabajando ? "Preparando…" : "Informe imprimible (PDF)"}</DsButton>
      <DsButton variant="secondary" size="sm" onClick={() => descargarArchivo(`fuerza_${jugador.name.replace(/\s+/g, "_")}_${todayStr()}.csv`, construirCsvRegistros(items, refItems), "text/csv;charset=utf-8")}>Descargar registros (CSV)</DsButton>
      {error && <span style={{ fontSize: 12, color: ds.danger }}>{error}</span>}
    </div>
  );
}

// Editor de referencias de fuerza de un jugador (pestaña Progreso): tops de
// serie de antes de usar la app, o resultados de un test. Con ellas el e1RM y
// la carga sugerida quedan calibrados desde el primer día.
function ReferenciasFuerzaFichaReal({ jugador, filas, recargar }) {
  const [ejercicios, , ejerciciosLoaded] = useEntityList("ejercicios");
  const [materiales] = useMaterialesDisponibles();
  const vacio = { ejercicio: "", material: "std", fecha: todayStr(), carga: "", reps: "", rir: "", tipo: "historico", nota: "" };
  const [form, setForm] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const listaEjercicios = ejercicios.filter((e) => e.bloque === "Fuerza").map((e) => e.nombre).sort((a, b) => a.localeCompare(b));
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const guardar = async () => {
    setError("");
    const carga = Number(String(form.carga).replace(",", "."));
    const reps = Number(form.reps);
    const rir = Number(form.rir);
    if (!form.ejercicio) return setError("Elige el ejercicio.");
    if (!Number.isFinite(carga) || carga <= 0) return setError("Pon la carga en kg.");
    if (!Number.isFinite(reps) || reps < 1 || reps > REPS_MAX_RIR_FIABLE) return setError(`Las repeticiones deben estar entre 1 y ${REPS_MAX_RIR_FIABLE}: con más, el e1RM deja de ser fiable.`);
    if (form.rir === "" || !Number.isFinite(rir) || rir < 0 || rir > 10) return setError("Pon el RIR (0 = al fallo). Sin él no se puede estimar el 1RM.");
    if (!form.fecha) return setError("Pon la fecha (aproximada si no la sabes).");
    setGuardando(true);
    try {
      await api.save("referenciasFuerza", {
        jugador_id: jugador.id,
        ejercicio: form.ejercicio,
        material: form.material || "std",
        fecha: form.fecha,
        carga_kg: carga,
        reps,
        rir,
        tipo: form.tipo,
        nota: form.nota.trim(),
      });
      setForm({ ...vacio, ejercicio: form.ejercicio, material: form.material });
      setAbierto(false);
      recargar();
    } catch (e) {
      setError(/referencias_fuerza|relation|does not exist/i.test(e?.message || "") ? "Falta crear la tabla: ejecuta sql/add_referencias_fuerza.sql en Supabase." : "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };
  const borrar = async (id) => {
    try {
      await api.delete("referenciasFuerza", id);
      recargar();
    } catch {
      setError("No se pudo borrar.");
    }
  };
  const campo = { background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px", width: "100%", boxSizing: "border-box" };
  const etiqueta = { fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 };
  // Antes recalculaba aquí mismo sin las validaciones de e1rmDeValores
  // (ver BUGS_ENCONTRADOS.md punto 1) — ahora delega en la función
  // compartida, igual que el resto de la app.
  const e1rmDe = (r) => {
    const v = e1rmDeValores(r.carga_kg, r.reps, r.rir);
    return v != null ? Math.round(v) : null;
  };
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
        <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink }}>Referencias de fuerza</div>
        <DsButton size="sm" variant="secondary" onClick={() => setAbierto((v) => !v)}>{abierto ? "Cancelar" : "+ Añadir marca"}</DsButton>
      </div>
      <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 10 }}>
        Top series de antes de usar la app o resultados de un test. Calibran el e1RM y las cargas sugeridas desde el primer día; no cuentan como sesión hecha ni como volumen.
      </div>
      {abierto && (
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: 14, marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={etiqueta}>Ejercicio</span>
            <select value={form.ejercicio} onChange={(e) => set("ejercicio", e.target.value)} style={campo} disabled={!ejerciciosLoaded}>
              <option value="">Elige un ejercicio de Fuerza…</option>
              {listaEjercicios.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={etiqueta}>Material</span>
            <select value={form.material} onChange={(e) => set("material", e.target.value)} style={campo}>
              <option value="std">Sin material concreto</option>
              {materiales.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={etiqueta}>Fecha</span>
            <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} style={campo} />
          </label>
          <label>
            <span style={etiqueta}>Carga (kg)</span>
            <input inputMode="decimal" value={form.carga} onChange={(e) => set("carga", e.target.value)} style={campo} />
          </label>
          <label>
            <span style={etiqueta}>Reps</span>
            <input inputMode="numeric" value={form.reps} onChange={(e) => set("reps", e.target.value)} style={campo} />
          </label>
          <label>
            <span style={etiqueta}>RIR</span>
            <input inputMode="numeric" value={form.rir} onChange={(e) => set("rir", e.target.value)} style={campo} placeholder="0 = al fallo" />
          </label>
          <label>
            <span style={etiqueta}>Tipo</span>
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={campo}>
              <option value="historico">Top serie histórica</option>
              <option value="test">Test</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={etiqueta}>Nota (opcional)</span>
            <input value={form.nota} onChange={(e) => set("nota", e.target.value)} style={campo} />
          </label>
          {error && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: ds.danger }}>{error}</div>}
          <div style={{ gridColumn: "1 / -1" }}>
            <DsButton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar marca"}</DsButton>
          </div>
        </div>
      )}
      {!abierto && error && <div style={{ fontSize: 12, color: ds.danger, marginBottom: 8 }}>{error}</div>}
      {filas.length === 0 ? (
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "16px", textAlign: "center", color: ds.inkMuted, fontSize: 12 }}>
          Sin marcas de referencia todavía.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...filas].sort((a, b) => (normalizarFecha(a.fecha) < normalizarFecha(b.fecha) ? 1 : -1)).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "8px 12px", fontSize: 12.5 }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 70, flexShrink: 0 }}>{fmtDateShort(normalizarFecha(r.fecha))}</span>
              <span style={{ flex: 1, minWidth: 0, color: ds.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.ejercicio}{r.material && r.material !== "std" ? ` (${r.material})` : ""}
              </span>
              <span style={{ color: ds.inkSecondary, flexShrink: 0 }}>{r.carga_kg} kg × {r.reps} @ RIR {r.rir}{e1rmDe(r) ? ` → e1RM ${e1rmDe(r)} kg` : ""}</span>
              <DsBadge tone={r.tipo === "test" ? "accent" : "neutral"}>{r.tipo === "test" ? "Test" : "Histórica"}</DsBadge>
              <button onClick={() => borrar(r.id)} title="Borrar marca" style={{ background: "transparent", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 15 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Pestaña "Progreso" de la ficha — NO es un placeholder: reutiliza el mismo
// motor que ya está verificado en GraficaProgresoCargaReal/e1RM
// (calcularRecordsCargaJugador, compartido con el record-callout de
// Resumen) para mostrar adherencia semanal, volumen de entrenamiento por
// semana y récords personales de los últimos 30 días — todo con datos
// reales de usePlayerHistory, nada inventado.
function ProgresoFichaJugadorReal({ jugador }) {
  const { loaded, items, retry: recargarHistorial } = usePlayerHistory(jugador.id);
  const { sesiones: sesionesProg, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const { items: refItems, rows: refRows, loaded: refLoaded, recargar: recargarRefs } = useReferenciasFuerza(jugador.id);
  if (!loaded || !progLoaded || !refLoaded) return <LoadingBlock />;

  const hoy = todayStr();
  const lunes = inicioSemanaCalendario(hoy);
  const fechasConRegistro = new Set(items.filter((it) => it.done).map((it) => it.date));

  // 6 últimas semanas de calendario (S-5 .. Actual), mismo límite superior
  // "hoy" en la semana en curso que el resto de la ficha. Cada semana
  // muestra su propia adherencia (cumplidas/asignadas por calendario, sin
  // sesiones asignadas todavía) — no hay dato de "sesiones que tocaban" en
  // usePlayerHistory por sí solo, así que aquí se recorren directamente los
  // registros HECHOS por semana como aproximación de adherencia (misma
  // fuente que fechasConRegistro), etiquetando cada semana con la fecha de
  // su lunes.
  const N_SEMANAS = 6;
  const semanas = [];
  for (let i = N_SEMANAS - 1; i >= 0; i--) {
    const inicio = sumarDiasFecha(lunes, -7 * i);
    const fin = i === 0 ? hoy : sumarDiasFecha(inicio, 6);
    semanas.push({ inicio, fin, esActual: i === 0 });
  }
  // Volumen: nº de series completadas de fuerza (mismo filtro que cargaMedia
  // en ResumenFichaJugadorReal: done, sin Resistencia, sin CMJ) por semana —
  // reutiliza el campo `sets` ya presente en cada item de usePlayerHistory.
  // Adherencia semanal: la misma ponderada por tareas (ENT-07) que el resto
  // de la app — sesiones asignadas a este jugador en la semana (hasta hoy) y
  // qué fracción de su trabajo se hizo.
  const hechasProgreso = tareasHechasPorJugadorFecha(items.map((it) => ({ ...it, jugadorId: jugador.id })));
  const fraccionProgreso = crearFraccionCumplida(tareasProg);
  const puntosAdherencia = semanas.map((s) => {
    let asignadas = 0;
    let cumplidas = 0;
    sesionesProg
      .filter((se) => se.enviada)
      .forEach((se) => {
        const incluye = se.jugadores_destino && se.jugadores_destino.length ? se.jugadores_destino.includes(jugador.id) : jugador.estado === "activo";
        if (!incluye) return;
        (se.fechas || []).forEach((f) => {
          if (f < s.inicio || f > s.fin) return;
          asignadas++;
          cumplidas += fraccionProgreso(se.id, f, hechasProgreso.get(`${jugador.id}::${f}`), jugador.id);
        });
      });
    return { label: s.esActual ? "Actual" : fmtDateShort(s.inicio), valor: asignadas ? Math.round((cumplidas / asignadas) * 100) : 0 };
  });
  const puntosVolumen = semanas.map((s) => {
    const series = items
      .filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ" && it.date >= s.inicio && it.date <= s.fin)
      .reduce((sum, it) => sum + (it.seriesHechas !== "" && it.seriesHechas != null ? Number(it.seriesHechas) || 0 : Number(it.sets) || 0), 0);
    return { label: s.esActual ? "Actual" : fmtDateShort(s.inicio), valor: series };
  });
  const adherenciaActualVal = puntosAdherencia[puntosAdherencia.length - 1]?.valor;
  const volumenActualVal = puntosVolumen[puntosVolumen.length - 1]?.valor;
  const mejorSemanaVolumen = Math.max(...puntosVolumen.map((p) => p.valor));

  // Récords personales de los últimos 30 días — mismo motor que el
  // record-callout de Resumen. Si ninguno cae en la ventana, se muestra el
  // estado vacío honesto en vez de forzar algo.
  const hace30Dias = sumarDiasFecha(hoy, -30);
  const recordsRecientes = calcularRecordsCargaJugador([...items, ...refItems])
    .filter((r) => r.fecha >= hace30Dias)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  // Cumplimiento de la pauta de las últimas 4 semanas (ejecutado vs prescrito).
  const cumplimiento = calcularCumplimientoPauta(items, sumarDiasFecha(hoy, -27), hoy);
  const hayCumplimiento = cumplimiento.series || cumplimiento.reps || cumplimiento.rirDif;
  const textoRir = (d) => (Math.abs(d) < 0.25 ? "como pautado" : d < 0 ? `${Math.abs(d).toFixed(1)} más cerca del fallo de lo pautado` : `${d.toFixed(1)} más lejos del fallo de lo pautado`);

  return (
    <div>
      <DatosPorRevisarFuerzaReal items={items} onCambio={recargarHistorial} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 8 }}>
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px 10px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, font: `700 11.5px ${dsF.sans}`, color: ds.ink }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: ds.accent, flexShrink: 0 }} />Adherencia semanal
            </div>
            <span style={{ font: `800 16px ${dsF.display}`, color: ds.ink }}>{adherenciaActualVal}<small style={{ font: `600 9.5px ${dsF.mono}`, color: ds.inkMuted, marginLeft: 2 }}>%</small></span>
          </div>
          <MiniGraficaSemanalReal puntos={puntosAdherencia} refValor={80} refLabel="80% = semana cumplida" />
        </div>
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px 10px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, font: `700 11.5px ${dsF.sans}`, color: ds.ink }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: ds.accent, flexShrink: 0 }} />Volumen de entrenamiento
            </div>
            <span style={{ font: `800 16px ${dsF.display}`, color: ds.ink }}>{volumenActualVal}<small style={{ font: `600 9.5px ${dsF.mono}`, color: ds.inkMuted, marginLeft: 2 }}>series</small></span>
          </div>
          <MiniGraficaSemanalReal puntos={puntosVolumen} refLabel={`mejor semana · ${mejorSemanaVolumen}`} resaltarMejor />
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: ds.inkMuted, marginBottom: 18 }}>
        Cada cajón lleva su línea de referencia (umbral real de "semana cumplida" en Adherencia; su propia mejor semana en Volumen) y destaca el punto que la alcanza.
      </div>

      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 9 }}>Cumplimiento de la pauta · últimas 4 semanas</div>
      {!hayCumplimiento ? (
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "20px 16px", textAlign: "center", color: ds.inkMuted, fontSize: 12, marginBottom: 18 }}>
          Aún no hay registros con series, repeticiones o RIR para comparar con lo pautado.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
          {cumplimiento.series && (
            <MiniStat icon={<Dumbbell size={12} />} label="Series hechas" value={`${cumplimiento.series.pct}%`} sub={`${cumplimiento.series.hechas} de ${cumplimiento.series.pautadas} pautadas`} />
          )}
          {cumplimiento.reps && (
            <MiniStat icon={<Target size={12} />} label="Reps objetivo" value={`${cumplimiento.reps.pct}%`} sub={`${cumplimiento.reps.ok} de ${cumplimiento.reps.total} tareas alcanzadas`} />
          )}
          {cumplimiento.rirDif && (
            <MiniStat icon={<Activity size={12} />} label="RIR real vs. pauta" value={`${cumplimiento.rirDif.media > 0 ? "+" : ""}${cumplimiento.rirDif.media.toFixed(1)}`} sub={textoRir(cumplimiento.rirDif.media)} />
          )}
        </div>
      )}

      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 9 }}>Récords personales · últimos 30 días</div>
      {recordsRecientes.length === 0 ? (
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "20px 16px", textAlign: "center", color: ds.inkMuted, fontSize: 12 }}>
          Sin récords nuevos en los últimos 30 días.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {recordsRecientes.map((r) => (
            <div key={r.clave} style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: "12px 14px 10px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, font: `700 11.5px ${dsF.sans}`, color: ds.ink, minWidth: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ds.success, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</span>
                </div>
                <span style={{ font: `800 16px ${dsF.display}`, color: ds.ink, flexShrink: 0 }}>
                  {r.valor}<small style={{ font: `600 9.5px ${dsF.mono}`, color: ds.inkMuted, marginLeft: 2 }}>kg</small>
                  {r.pctSobreAnterior != null && <span style={{ font: `700 10px ${dsF.mono}`, color: ds.success, marginLeft: 5 }}>▲{Math.round(r.pctSobreAnterior)}%</span>}
                </span>
              </div>
              <GraficaProgresoCargaReal puntos={r.puntos} unidad="kg" mostrarListaCompleta={false} />
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 10 }}>
        Solo se listan los ejercicios donde se ha batido récord (1RM estimado) en los últimos 30 días — mismo motor que "Tus récords" del jugador y mismo lenguaje visual que las gráficas de fuerza.
      </div>
      <ReferenciasFuerzaFichaReal jugador={jugador} filas={refRows} recargar={recargarRefs} />
      <BotonesInformeJugadorReal jugador={jugador} items={items} refItems={refItems} puntosAdherencia={puntosAdherencia} cumplimiento={cumplimiento} textoRir={textoRir} />
    </div>
  );
}

// Pestaña "Notas" — campo nuevo (tabla notas_jugador, ver
// sql/add_notas_jugador.sql): textarea + lista de notas anteriores con
// autor y fecha, mismo patrón CRUD genérico (api.list/save) que el resto de
// entidades de la app.
// Selector secundario dentro de una pestaña de la ficha (p. ej. Progreso | Historial).
function FichaSubPestanasReal({ valor, opciones, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, marginBottom: 14, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 999, padding: 3 }}>
      {opciones.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: "5px 12px", border: "none", borderRadius: 999, cursor: "pointer", background: valor === id ? ds.accent : "transparent", color: valor === id ? ds.accentInk : ds.inkSecondary }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Lo que el entrenador escribió y lo que falta por registrar, a la vista en el Resumen
// (antes las notas y las referencias de fuerza vivían en pestañas que casi nadie abría).
function PendientesFichaReal({ jugador, onNavigateTab }) {
  const [notas, , notasLoaded] = useEntityList("notasJugador", { jugador_id: jugador.id });
  const { rows: refRows, loaded: refLoaded } = useReferenciasFuerza(jugador.id);
  const propias = notas.filter((n) => n.jugador_id === jugador.id).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const ultima = propias[0];
  const sinRefs = refLoaded && (refRows || []).length === 0;
  if (!notasLoaded) return null;
  return (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.08em", color: ds.inkMuted, marginBottom: 3 }}>ÚLTIMA NOTA{propias.length > 1 ? ` · ${propias.length} EN TOTAL` : ""}</div>
          {ultima ? (
            <div style={{ fontSize: 13, color: ds.ink, lineHeight: 1.45 }}>
              {ultima.texto.length > 220 ? `${ultima.texto.slice(0, 220)}…` : ultima.texto} <span style={{ color: ds.inkMuted, fontSize: 11.5 }}>· {ultima.fecha}</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: ds.inkSecondary }}>Sin notas todavía.</div>
          )}
        </div>
        <button type="button" onClick={() => onNavigateTab("notas")} style={{ fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
          {ultima ? "Ver / añadir nota" : "+ Añadir nota"}
        </button>
      </div>
      {sinRefs && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
          <span style={{ fontSize: 12.5, color: ds.inkSecondary, flex: "1 1 240px" }}>Sin marcas de referencia de fuerza: añade sus tops de serie anteriores para que el e1RM y las cargas sugeridas partan de datos reales.</span>
          <button type="button" onClick={() => onNavigateTab("progreso")} style={{ fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
            Añadir referencias
          </button>
        </div>
      )}
    </div>
  );
}

function NotasFichaJugadorReal({ jugador }) {
  const [notas, saveNotas, loaded] = useEntityList("notasJugador", { jugador_id: jugador.id });
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (!loaded) return <LoadingBlock />;

  const ordenadas = [...notas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  const guardarNota = async () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setError("");
    setGuardando(true);
    const ok = await saveNotas([...notas, { jugador_id: jugador.id, autor: "David", fecha: todayStr(), texto: limpio }]);
    setGuardando(false);
    if (ok) setTexto("");
    else setError("No se pudo guardar la nota. Comprueba tu conexión e inténtalo de nuevo.");
  };

  return (
    <div>
      <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.lg, padding: 13, marginBottom: 16 }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Escribe una nota sobre ${jugador.name} — molestias, observaciones, acuerdos...`}
          style={{ width: "100%", minHeight: 56, resize: "vertical", background: ds.canvas, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "9px 11px", color: ds.ink, fontFamily: dsF.sans, fontSize: 12, outline: "none" }}
        />
        {error && <div style={{ color: ds.danger, fontSize: 11.5, marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <DsButton size="sm" disabled={!texto.trim() || guardando} onClick={guardarNota}>
            {guardando ? "Guardando..." : "Guardar nota"}
          </DsButton>
        </div>
      </div>
      <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, marginBottom: 4 }}>Notas anteriores</div>
      {ordenadas.length === 0 ? (
        <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "10px 0" }}>Todavía no hay ninguna nota sobre {jugador.name}.</div>
      ) : (
        <div>
          {ordenadas.map((n) => (
            <div key={n.id} style={{ borderBottom: `1px solid ${ds.border}`, padding: "11px 0" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                <span style={{ font: `700 11.5px ${dsF.sans}`, color: ds.ink }}>{n.autor}</span>
                <span style={{ font: `600 10px ${dsF.mono}`, color: ds.inkMuted }}>{fmtDateShort(n.fecha)}</span>
              </div>
              <p style={{ fontSize: 12, color: ds.inkSecondary, lineHeight: 1.5, margin: 0 }}>{n.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Pestaña "Datos y accesos" — resumen de datos que YA existen (grupo,
// categoría, estado, PIN) + danger zone que llama a las MISMAS acciones que
// ya expone MenuAccionesReal (onAccion "suspender"/"activar"/"eliminar"),
// sin duplicar esa lógica aquí.
function DatosAccesosFichaJugadorReal({ jugador, categorias, grupos, onAccion }) {
  const [pinVisible, setPinVisible] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresGrupos = (jugador.gruposIds || []).map((id) => grupos.find((g) => g.id === id)?.nombre).filter(Boolean);
  const nombresCategorias = (jugador.groupIds || []).map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean);

  const Dato = ({ label, value }) => (
    <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "11px 13px" }}>
      <div style={{ font: `600 9px ${dsF.mono}`, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: ds.ink }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, maxWidth: 640, marginBottom: 18 }}>
        <Dato label="Grupo" value={nombresGrupos.length ? nombresGrupos.join(", ") : "Independiente"} />
        <Dato label="Categoría preventiva" value={nombresCategorias.length ? nombresCategorias.join(", ") : "Ninguna"} />
        <Dato label="Estado" value={suspendido ? "Suspendido" : "Activo"} />
        <div style={{ background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "11px 13px" }}>
          <div style={{ font: `600 9px ${dsF.mono}`, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>PIN de acceso</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ds.ink, display: "flex", alignItems: "center", gap: 8 }}>
            {pinVisible ? jugador.pin : "••••"}
            <span onClick={() => setPinVisible((v) => !v)} style={{ color: ds.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {pinVisible ? "ocultar" : "mostrar"}
            </span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 640, border: `1px solid ${ds.dangerBorderSubtle}`, background: `${ds.danger}12`, borderRadius: dsR.lg, padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 11.5, color: ds.inkSecondary, maxWidth: 340, lineHeight: 1.4, margin: 0 }}>
          Suspender el acceso bloquea su PIN sin borrar su historial. Eliminar el usuario es permanente.
        </p>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onAccion(jugador.id, suspendido ? "activar" : "suspender")}
            style={{ font: `700 11.5px ${dsF.sans}`, padding: "8px 13px", borderRadius: dsR.md, border: `1px solid ${suspendido ? ds.successBorderSubtle : ds.dangerBorderSubtle}`, background: "transparent", color: suspendido ? ds.success : ds.danger, cursor: "pointer" }}
          >
            {suspendido ? "Activar usuario" : "Suspender usuario"}
          </button>
          {confirmarEliminar ? (
            <button
              onClick={() => onAccion(jugador.id, "eliminar")}
              style={{ font: `700 11.5px ${dsF.sans}`, padding: "8px 13px", borderRadius: dsR.md, border: `1px solid ${ds.danger}`, background: `${ds.danger}22`, color: ds.danger, cursor: "pointer" }}
            >
              ¿Seguro? Confirmar
            </button>
          ) : (
            <button
              onClick={() => setConfirmarEliminar(true)}
              style={{ font: `700 11.5px ${dsF.sans}`, padding: "8px 13px", borderRadius: dsR.md, border: `1px solid ${ds.dangerBorderSubtle}`, background: "transparent", color: ds.danger, cursor: "pointer" }}
            >
              Eliminar perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Ficha de un jugador concreto, abierta desde Usuarios ("Ver ficha").
// Cabecera de identidad + las pestañas del mockup de Fase 6 (Equipos y
// usuarios) que ya tienen un dato o flujo real detrás: Resumen, Historial
// (es HistorialPorJugador tal cual ya existía, sin cambios — la misma pieza
// que usa el módulo de Historial general) y Control de fatiga (Parte 5),
// más las añadidas aquí (Progreso, Notas, Datos y accesos). Calendario se
// deja como placeholder honesto, igual que el propio mockup: no hay
// calendario_asignaciones todavía (llega con Fase 6 → Calendario).
// Mini-calendario de solo lectura para la ficha de jugador (pestaña
// "Calendario") — ahora con datos reales (llegó Fase 6 → Calendario, el
// placeholder ya no aplica). A diferencia del Calendario del jugador, aquí
// SÍ se ve el contenido completo de cada sesión: es la vista del
// entrenador, que necesita visibilidad total para planificar, no la del
// jugador (esa es la única que tiene la regla de "solo marcador").
function CalendarioFichaJugadorReal({ jugador, onAbrirModulo }) {
  const { loaded: bootLoaded, sesiones, tareas, ejercicios } = useBootstrapProgramacion();
  const hoy = todayStr();
  const [mesRef, setMesRef] = useState(inicioMes(hoy));
  const [diaSel, setDiaSel] = useState(hoy);

  if (!bootLoaded) return <LoadingBlock />;

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const sesionIdsSet = new Set(sesiones.map((s) => s.id));
  const tareasBySesion = new Map();
  tareas
    .filter((t) => sesionIdsSet.has(t.sesion_id))
    .forEach((t) => {
      if (!tareasBySesion.has(t.sesion_id)) tareasBySesion.set(t.sesion_id, []);
      const e = ejerciciosById.get(t.ejercicio_id) || {};
      tareasBySesion.get(t.sesion_id).push({ ...t, nombreEjercicio: e.nombre || "(ejercicio eliminado)", gif_url: e.gif_url, sin_lateralidad: e.sin_lateralidad });
    });
  const conTareas = sesiones.map((s) => ({ ...s, tareas: tareasBySesion.get(s.id) || [] }));

  const sesionesDeJugador = conTareas.filter((s) => !s.jugadores_destino || !s.jugadores_destino.length || s.jugadores_destino.includes(jugador.id));
  const sesionesEnFecha = (fecha) => sesionesDeJugador.filter((s) => (s.fechas || []).includes(fecha));
  const dias = generarCuadriculaMes(mesRef);
  const sesionesDiaSel = sesionesEnFecha(diaSel);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <h4 style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink, margin: 0 }}>Calendario de {jugador.name}</h4>
        {onAbrirModulo && (
          <button onClick={() => onAbrirModulo("calendario")} style={{ background: "transparent", border: "none", color: ds.accent, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
            Abrir el Calendario completo →
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => setMesRef((m) => sumarMeses(m, -1))} style={navMesBtnCalendarioStyle} aria-label="Mes anterior">
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontFamily: dsF.display, fontSize: 13.5, fontWeight: 700 }}>{labelMes(mesRef)}</div>
        <button onClick={() => setMesRef((m) => sumarMeses(m, 1))} style={navMesBtnCalendarioStyle} aria-label="Mes siguiente">
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4, maxWidth: 360 }}>
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, padding: "2px 0" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 16, maxWidth: 360 }}>
        {dias.map((d) => {
          const sesionesDia = sesionesEnFecha(d.fecha);
          const estado = estadoDiaCalendario(sesionesDia, d.fecha, hoy);
          const esSel = d.fecha === diaSel;
          const colorDot = estado === "ok" ? ds.success : estado === "pending" ? ds.accent : "transparent";
          return (
            <button
              key={d.fecha}
              onClick={() => setDiaSel(d.fecha)}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderRadius: dsR.sm,
                border: esSel ? `1.5px solid ${ds.accent}` : d.fecha === hoy ? `1px solid ${ds.accentBorderSubtle}` : "1px solid transparent",
                background: esSel ? ds.accentSubtle : ds.surface,
                opacity: d.fuera ? 0.3 : 1,
                color: ds.ink,
                cursor: "pointer",
                fontSize: 10.5,
                fontWeight: d.fecha === hoy ? 800 : 500,
              }}
            >
              <span>{d.dayNum}</span>
              <span style={{ width: 4, height: 4, borderRadius: dsR.full, background: colorDot }} />
            </button>
          );
        })}
      </div>
      <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 8, textTransform: "uppercase" }}>
        {fmtDateLabel(diaSel)}
        {diaSel === hoy ? " · hoy" : ""}
      </div>
      {sesionesDiaSel.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
          {sesionesDiaSel.map((s) => (
            <TarjetaSesionReal key={s.id} sesion={s} esHoy={diaSel === hoy} soloLectura />
          ))}
        </div>
      ) : (
        <div style={{ color: ds.inkMuted, fontSize: 13, padding: "14px 0", textAlign: "center", border: `1px dashed ${ds.border}`, borderRadius: dsR.md, maxWidth: 520 }}>
          Sin sesión programada este día.
        </div>
      )}
    </div>
  );
}

// Arriba del Resumen de la ficha: cómo va y qué requiere atención de este
// jugador (mismas reglas que la bandeja de Inicio), con acceso directo a su semana.
function FichaAtencionReal({ jugador, onNavigateTab, onAbrirModulo }) {
  const c = useCarteraEntrenador();
  if (!c.loaded) return null;
  const f = c.filas.get(jugador.id);
  if (!f) return null;
  const meta = ESTADO_JUGADOR_META[f.estado];
  const accion = (alerta, a) => {
    if (a.tipo === "ficha") onNavigateTab(a.pestana || "resumen");
    else if (a.tipo === "cal") onAbrirModulo(`calendario:j:${jugador.id}`);
    else if (a.tipo === "fatiga") onAbrirModulo("fatiga");
  };
  return (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}66`, background: `${meta.color}14`, borderRadius: 999, padding: "2px 10px" }}>{meta.label}</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => onAbrirModulo(`calendario:j:${jugador.id}`)} style={{ fontSize: 12.5, fontWeight: 700, color: ds.accent, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>Ver / planificar su semana →</button>
      </div>
      <div>
        <b style={{ fontSize: 13 }}>Requiere tu atención</b>
        {f.alertas.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 4 }}>Nada pendiente con {jugador.name.split(" ")[0]}. Todo al día.</div>}
        {f.alertas.map((a) => (
          <FilaAlertaReal key={a.id} alerta={a} onAccion={accion} />
        ))}
      </div>
    </div>
  );
}

function FichaJugadorModuloReal({ jugador, onBack, onAbrirModulo, onCerrarSesion, pestanaInicial }) {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  const [pestana, setPestana] = useState(pestanaInicial || "resumen");
  const [errorAccion, setErrorAccion] = useState("");
  const { loaded: historialLoaded, sesiones, tareas, registros, ejercicios, retry: retryHistorial } = useHistorialData();
  useEffect(() => {
    if (pestana === "historial") retryHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, jugador?.id]);
  const tareasById = useMemo(() => new Map(tareas.map((t) => [t.id, t])), [tareas]);
  const ejerciciosById = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);
  const sesionesById = useMemo(() => new Map(sesiones.map((s) => [s.id, s])), [sesiones]);

  if (!playersLoaded || !categoriasLoaded || !gruposLoaded) return <LoadingBlock />;

  // El jugador puede haber cambiado (categoría, grupo, estado, PIN) desde
  // que se abrió esta ficha — se resuelve siempre contra la lista fresca de
  // usePlayers() en vez de quedarse con el objeto que llegó por prop.
  const actual = players.find((p) => p.id === jugador?.id) || jugador;

  // Mismas acciones que ya expone MenuAccionesReal en Usuarios (suspender /
  // activar / eliminar) — se reutiliza la función, no se duplica la lógica,
  // solo se expone también desde la pestaña "Datos y accesos" de la ficha.
  const manejarAccionDatos = async (id, accion) => {
    setErrorAccion("");
    let ok = true;
    if (accion === "suspender") ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "suspendido" } : p)));
    else if (accion === "activar") ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "activo" } : p)));
    else if (accion === "eliminar") {
      ok = await savePlayers(players.filter((p) => p.id !== id));
      if (ok) onBack?.();
    }
    if (!ok) setErrorAccion("No se pudo completar la acción. Comprueba tu conexión e inténtalo de nuevo.");
  };
  const guardarObjetivo = async (nuevoTexto) => {
    const ok = await savePlayers(players.map((p) => (p.id === actual.id ? { ...p, objetivoActual: nuevoTexto } : p)));
    if (!ok) setErrorAccion("No se pudo guardar el objetivo. Comprueba tu conexión e inténtalo de nuevo.");
  };

  if (!actual) {
    return (
      <PantallaEntrenadorAncha activo="roster" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver a Usuarios
        </button>
        <div style={{ color: ds.inkMuted, fontSize: 13, marginTop: 20 }}>Este jugador ya no existe.</div>
      </PantallaEntrenadorAncha>
    );
  }

  return (
    <PantallaEntrenadorAncha activo="roster" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver a Usuarios
        </button>
        <CabeceraFichaJugadorReal jugador={actual} categorias={categorias} grupos={grupos} onNavigateTab={setPestana} />
        {errorAccion && (
          <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", margin: "12px 0 0" }}>
            {errorAccion}
          </div>
        )}
        {/* Rail de navegación de la ficha — mismo patrón que el mockup de
            Fase 6 (Equipos y usuarios): un carril vertical de pestañas, con
            las 7 secciones del mockup (Calendario se deja como placeholder
            honesto, sin calendario_asignaciones todavía). */}
        <div style={{ display: "flex", gap: 16, margin: "16px 0 0", alignItems: "flex-start" }}>
          <nav style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { id: "resumen", label: "Resumen", icon: <Home size={14} /> },
              { id: "calendario", label: "Calendario", icon: <Calendar size={14} /> },
              { id: "progreso", label: "Progreso", icon: <TrendingUp size={14} /> },
              { id: "cmj", label: "Control de fatiga", icon: <Activity size={14} /> },
            ].map((v) => (
              <DsNavItem key={v.id} active={pestana === v.id || (v.id === "progreso" && pestana === "historial")} icon={v.icon} onClick={() => setPestana(v.id)}>
                {v.label}
              </DsNavItem>
            ))}
            <div style={{ height: 1, background: ds.border, margin: "6px 4px" }} />
            <DsNavItem active={pestana === "notas" || pestana === "datos"} icon={<BookOpen size={14} />} onClick={() => setPestana("notas")}>
              Notas y accesos
            </DsNavItem>
          </nav>
          <div style={{ flex: 1, minWidth: 0 }}>
            {pestana === "resumen" ? (
              <>
                <FichaAtencionReal jugador={actual} onNavigateTab={setPestana} onAbrirModulo={onAbrirModulo} />
                <PendientesFichaReal jugador={actual} onNavigateTab={setPestana} />
                <ResumenFichaJugadorReal jugador={actual} onNavigateTab={setPestana} onGuardarObjetivo={guardarObjetivo} />
              </>
            ) : pestana === "calendario" ? (
              <CalendarioFichaJugadorReal jugador={actual} onAbrirModulo={onAbrirModulo} />
            ) : pestana === "historial" ? (
              <>
                <FichaSubPestanasReal valor="historial" onChange={setPestana} opciones={[["progreso", "Progreso"], ["historial", "Historial de sesiones"]]} />
              {!historialLoaded ? (
                <LoadingBlock />
              ) : (
                <HistorialPorJugador
                  players={players}
                  jugadorInicial={actual.id}
                  tareasById={tareasById}
                  ejerciciosById={ejerciciosById}
                  sesionesById={sesionesById}
                  registros={registros}
                />
              )}
              </>
            ) : pestana === "cmj" ? (
              <CmjFichaJugadorReal jugadorId={actual.id} jugadorNombre={actual.name} />
            ) : pestana === "progreso" ? (
              <>
                <FichaSubPestanasReal valor="progreso" onChange={setPestana} opciones={[["progreso", "Progreso"], ["historial", "Historial de sesiones"]]} />
                <ProgresoFichaJugadorReal jugador={actual} />
              </>
            ) : pestana === "notas" ? (
              <>
                <FichaSubPestanasReal valor="notas" onChange={setPestana} opciones={[["notas", "Notas"], ["datos", "Datos y accesos"]]} />
                <NotasFichaJugadorReal jugador={actual} />
              </>
            ) : (
              <>
                <FichaSubPestanasReal valor="datos" onChange={setPestana} opciones={[["notas", "Notas"], ["datos", "Datos y accesos"]]} />
                <DatosAccesosFichaJugadorReal jugador={actual} categorias={categorias} grupos={grupos} onAccion={manejarAccionDatos} />
              </>
            )}
          </div>
        </div>
      </div>
    </PantallaEntrenadorAncha>
  );
}
