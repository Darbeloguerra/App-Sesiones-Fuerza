import { useState, useEffect, useRef } from "react";
import { Dumbbell, ChevronLeft, ChevronRight, Play, Pencil, Zap, Calendar, AlertTriangle, Home, TrendingUp, Activity } from "lucide-react";
import { ds, dsR, dsSh, dsF, DsButton, DsCard, DsToggle, DsBadge, DsInput, DsProgressRing } from "../core/designSystem.jsx";
import { supabase, idRegistroFijo, api } from "../core/backend.js";
import {
  todayStr,
  normalizarFecha,
  fmtDateLabel,
  fmtDateShort,
  fmtHaceDias,
  inicioSemanaCalendario,
  sumarDiasFecha,
  generarCuadriculaMes,
  inicioMes,
  sumarMeses,
  labelMes,
} from "../calc/fechas.js";
import { formatearDuracionDiseno } from "../calc/duracionTarea.js";
import { parseResistenciaData, pesoTareaAdherencia, crearFraccionCumplida, tareasHechasPorJugadorFecha } from "../calc/adherencia.js";
import { cmjDeltaMismoDiaCicloAnterior, CMJ_METRICS, CMJ_METRIC_LIST, cmjBuildPlayers, CMJ_UMBRAL_DEFECTO } from "../calc/cmj.js";
import { e1rmDeValores, EQUIPOS_AMBIGUOS, materialEfectivo, claveDisenoTarea, calcularCargaSugerida, fatigaTarea } from "../calc/e1rm.js";
import { PantallaBase } from "../core/layout.jsx";
import { VideoEmbed, LoadingBlock, GraficaProgresoCargaReal } from "../core/components.jsx";
import {
  sharedDataCache,
  useReferenciasFuerza,
  useEntityList,
  usePlayers,
  UNIDAD_POR_MODO,
  extractYouTubeId,
  esVideoDirecto,
  miniaturaTarea,
  parseMateriales,
  formatearObjetivoResistencia,
  fichaResistenciaAplica,
  objetivoJugadorResistencia,
  usePlayerHistory,
  useBootstrapProgramacion,
  claveVideoVariante,
  videoEfectivoTarea,
} from "../core/hooks.js";
import { CMJ_TAG_META } from "../core/cmjDisplay.jsx";
import { MiProgresoJugadorReal } from "./Progreso.jsx";
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

// GestionRosterReal y sus piezas auxiliares (SelectorCategoriasReal,
// SelectorGruposReal, MenuAccionesReal, FilaJugadorReal, PanelAltaReal,
// PanelGestionGruposReal, CarteraUsuariosReal, PanelCodigoEntrenadorReal,
// TarjetaEquipoReal, TarjetaIndependientesReal, TeamStatsRowReal,
// DetalleEquipoReal, VistaIndependientesReal) ahora en
// src/screens/Roster.jsx — importada arriba.


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

// SEV_ALERTA, ESTADO_JUGADOR_META, useMolestiasRecientes y
// useCarteraEntrenador ahora en src/core/hooks.js — importadas arriba
// (usadas por Inicio entrenador, Roster y Ficha de jugador).

// PLANTILLA_GRUPO_ALERTA, agruparAlertas, PuntoSev, FilaAlertaReal e
// InicioEntrenadorReal (el Dashboard/Inicio del entrenador) ahora en
// src/screens/Dashboard.jsx — importada arriba.


// SidebarEntrenadorReal y PantallaEntrenadorAncha ahora en
// src/core/layoutEntrenador.jsx — importadas arriba.

// useDatosDashboardEntrenador ahora en src/core/hooks.js — importada
// arriba.


// MiniStat ahora en src/core/components.jsx — importada arriba.



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
            {(() => {
              // Última serie (opcional): con la mejor serie de arriba permite medir cuánta fatiga hubo dentro de la tarea.
              const pautadas = Number(tarea.series);
              const hechas = registro.series !== "" && registro.series != null ? Number(registro.series) : pautadas;
              const pideRirAqui = tarea.pideRir !== false || necesitaCalibrarE1rm(tarea, registro);
              if (!Number.isFinite(hechas) || hechas < 2 || !pideRirAqui || registro.subtipo === "asistencia" || (tarea.unidad && tarea.unidad !== "reps")) return null;
              const campo = (clave, etiqueta, placeholder, subrayado) => (
                <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  <EtiquetaCampoReal>{etiqueta}</EtiquetaCampoReal>
                  <input
                    value={registro[clave] ?? ""}
                    inputMode="decimal"
                    onChange={(e) => onCambiarRegistro({ ...registro, [clave]: e.target.value })}
                    placeholder={placeholder}
                    style={{ background: "transparent", border: "none", borderBottom: `2px solid ${subrayado}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                  />
                </label>
              );
              const igual = () => onCambiarRegistro({ ...registro, ultReps: registro.reps, ultCarga: registro.carga, ultRir: registro.rir });
              const f = fatigaTarea({ cargaReal: registro.carga, repsReal: registro.reps, rirReal: registro.rir, ultimaCargaReal: registro.ultCarga, ultimaRepsReal: registro.ultReps, ultimaRirReal: registro.ultRir });
              const colorNivel = f ? (f.nivel === "alta" ? ds.danger : f.nivel === "moderada" ? ds.accent : ds.success) : ds.inkMuted;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <EtiquetaCampoReal>ÚLTIMA SERIE (OPCIONAL)</EtiquetaCampoReal>
                    <span style={{ flex: 1 }} />
                    <ChipSeleccionableReal activo={false} onClick={igual}>Igual que la mejor</ChipSeleccionableReal>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {campo("ultReps", (tarea.unidad || "reps").toUpperCase(), registro.reps || "—", ds.border)}
                    {campo("ultCarga", "CARGA KG", registro.carga || "—", ds.border)}
                    {campo("ultRir", "RIR", "—", ds.border)}
                  </div>
                  {f ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: colorNivel }}>
                      Fatiga en la tarea: {f.caidaPct <= 0 ? "ninguna" : `−${Math.round(f.caidaPct)} %`}
                      {f.repsPerdidas > 0 ? ` · ${f.repsPerdidas} rep${f.repsPerdidas === 1 ? "" : "s"} menos que en la mejor` : ""}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: ds.inkMuted, lineHeight: 1.4 }}>Anota reps y RIR de la última serie (déjalo en blanco la carga si fue la misma). Con eso la app mide cuánto te cansaste dentro de la tarea.</div>
                  )}
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
// Botón de mes anterior/siguiente del calendario (mismo estilo que en Calendario.jsx).
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

export function PantallaJugadorReal({ presetPlayerId, onExit }) {
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
        registroInicial[id] = { reps: r.reps_hechas ?? "", carga: r.carga_kg ?? "", rir: r.rir ?? "", subtipo: r.subtipo_corporal || "", series: r.series_hechas ?? "", ultReps: r.ultima_reps ?? "", ultCarga: r.ultima_carga_kg ?? "", ultRir: r.ultima_rir ?? "" };
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
    return { reps: "", carga: "", rir: "", subtipo: t?.subtipoDefault || "", series: "", ultReps: "", ultCarga: "", ultRir: "" };
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
          // Última serie (opcional): sirve para medir la fatiga dentro de la tarea.
          ultima_reps: draft.ultReps ?? "",
          ultima_carga_kg: draft.ultCarga ?? "",
          ultima_rir: draft.ultRir ?? "",
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
