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
import {
  REPS_MAX_RIR_FIABLE,
  pct1RMporRTF,
  e1rmDeValores,
  e1rmDeItem,
  medianaNum,
  ACCESORIOS_SIN_CARGA,
  EQUIPOS_AMBIGUOS,
  materialEfectivo,
  claveDisenoTarea,
  calcularRecordsCargaJugador,
  calcularCambiosE1rm,
  RENDIMIENTO_CFG,
  cambiosRobustosE1rm,
  evaluarRendimientoEquipo,
  calcularCargaFuerzaPorMicro,
  calcularCargaSugerida,
} from "./src/calc/e1rm.js";
import { TEMA, useAlturaVentana, useAnchoVentana, PantallaBase } from "./src/core/layout.jsx";
import {
  VideoEmbed,
  LoadingBlock,
  CerrablePorFuera,
  ChipReal,
  TagChipReal,
  campoSelectReal,
  TAGS_DESCRIPTIVOS_BIBLIOTECA,
  inicialesNombre,
  colorAvatarJugador,
  MiniStat,
  GraficaProgresoCargaReal,
  TareaVisualReal,
  TarjetaSesionReal,
} from "./src/core/components.jsx";
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
  destinatariosEfectivosSesion,
  etiquetaDestinoSesion,
  SEV_ALERTA,
  ESTADO_JUGADOR_META,
  useMolestiasRecientes,
  useCarteraEntrenador,
  useDatosDashboardEntrenador,
  agruparPlantillas,
  claveVideoVariante,
  videoEfectivoTarea,
  formatearDetalleTareaCoach,
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
import { GestionRosterReal } from "./src/screens/Roster.jsx";
import { InicioEntrenadorReal, FilaAlertaReal } from "./src/screens/Dashboard.jsx";
import { MiProgresoJugadorReal } from "./src/screens/Progreso.jsx";
import { FichaJugadorModuloReal } from "./src/screens/FichaJugador.jsx";
import { PantallaJugadorReal } from "./src/screens/PantallaJugador.jsx";
import { CalendarioModuloReal } from "./src/screens/Calendario.jsx";

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
// medianaNum y e1rmDeValores ahora en src/calc/e1rm.js — importadas arriba.
// MIN_REGISTROS_PARA_REVISAR, detectarRegistrosAtipicos y
// detectarCmjAtipicos ahora en src/screens/FichaJugador.jsx — importada
// arriba.


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
// PREFIJO_BORRADOR_LOCAL, claveBorradorLocal, leerBorradorLocal,
// guardarBorradorLocal, borrarBorradorLocal, limpiarBorradoresLocalesAntiguos
// y useBootstrapJugador ahora en src/screens/PantallaJugador.jsx —
// importada arriba.

// Fila de "Quién necesita atención": nadie va destacado por defecto — el
// semáforo da la severidad de un vistazo y el detalle solo se despliega al
// clicar esa fila en concreto (<details> nativo, sin JS aparte). "compact"
// (móvil): fila más baja y sin el párrafo de detalle, para poder listar
// muchos jugadores sin que cada uno ocupe tanto alto — el % ya dice lo
// esencial, el detalle no aporta tanto como para pagar ese espacio en móvil.

// Lista de TODOS los ejercicios que cambian esta semana frente a su nivel
// habitual (de peor a mejor), para que se vea qué ejercicios explican el
// semáforo y no solo el peor. `cambios` viene de calcularCambiosE1rm.
// ListaCambiosEjerciciosReal, PuntoEstadoReal, FilaTareaHistorialReal,
// TarjetaDiaReal, useHistorialData, construirItemsHistorial,
// HistorialPorJugador, CabeceraFichaJugadorReal, ResumenFichaJugadorReal y
// el resto de la Ficha de jugador (incluida FichaJugadorModuloReal) ahora
// en src/screens/FichaJugador.jsx — importada arriba.


// La pantalla de Control de fatiga (CMJ) — ControlFatigaModuloReal,
// CmjProximamente, CmjMicrociclosReal, CmjAjustesUmbralReal,
// CmjEstadoActualReal, CmjRankingReal, CmjSubirCsvReal — ahora en
// src/screens/ControlFatiga.jsx — importada arriba.
// ---------- PROGRAMACIÓN (calcado de programacion.jsx) ----------

// TareaVisualReal y TarjetaSesionReal ahora en src/core/components.jsx
// — importadas arriba (las usan el Historial de la Ficha de jugador,
// la Pantalla del jugador y el Calendario).





// ---------- CALENDARIO (Fase 6) ----------
// Módulo nuevo, independiente de Programación: mientras Programación sigue
// siendo "sesión de hoy y próximas" en una lista plana, Calendario es la
// vista de planificación — mes a mes, por equipo / grupo / jugador — pensada
// para adelantarte y dejar el trabajo de las próximas semanas ya preparado.
// No inventa ningún concepto de datos nuevo: usa exactamente el mismo
// `jugadores_destino` (null = todo el equipo activo, o un array explícito de
// ids) que ya usa el resto de la app — "grupo" y "jugador" aquí son solo
// FORMAS DE MIRAR ese mismo dato, no una columna nueva.

// sesionVisibleEnScope, itemScopeCalendarioStyle, CalendarioModuloReal,
// MICRO_TAGS_ORDEN, MICRO_VACIO, mdDeFecha y CalendarioReal ahora en
// src/screens/Calendario.jsx — importada arriba.

// ---------- PANTALLA DEL JUGADOR ----------
// TareaCardReal, CircuitoJugadorReal, BarraInferiorJugadorReal,
// CalendarioJugadorReal y PantallaJugadorReal ahora en
// src/screens/PantallaJugador.jsx — importada arriba.


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
// ACCESORIOS_SIN_CARGA, EQUIPOS_AMBIGUOS, materialEfectivo, claveDisenoTarea,
// calcularRecordsCargaJugador, calcularCambiosE1rm, cambiosRobustosE1rm,
// evaluarRendimientoEquipo, e1rmDeItem y calcularCargaFuerzaPorMicro ahora
// en src/calc/e1rm.js — importadas arriba.
// NIVEL_CARGA_FUERZA_META, etiquetaCargaFuerza y resumenFuerzaSalto ahora
// en src/screens/FichaJugador.jsx — importada arriba.

// A partir de una marca previa con OTRO diseño (reps/RIR distinto al de
// calcularCargaSugerida ahora en src/calc/e1rm.js — importada arriba.

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


