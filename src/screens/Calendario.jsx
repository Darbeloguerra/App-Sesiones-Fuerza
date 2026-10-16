import { useState } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { ds, dsR, dsSh, dsF, DsButton, DsInput } from "../core/designSystem.jsx";
import { api } from "../core/backend.js";
import {
  todayStr,
  fmtDateLabel,
  diasEntreFechas,
  inicioSemanaCalendario,
  sumarDiasFecha,
  generarCuadriculaMes,
  inicioMes,
  sumarMeses,
  labelMes,
} from "../calc/fechas.js";
import { useAnchoVentana } from "../core/layout.jsx";
import { LoadingBlock, TarjetaSesionReal } from "../core/components.jsx";
import {
  invalidateEntityCache,
  invalidateBootstrapCache,
  useEntityList,
  usePlayers,
  MD_TAGS,
  useBootstrapProgramacion,
  useMicrociclosTipo,
  usePartidos,
  destinatariosEfectivosSesion,
  etiquetaDestinoSesion,
  agruparPlantillas,
} from "../core/hooks.js";
import { DisenoSesionReal } from "./DisenoSesion.jsx";
import { PantallaEntrenadorAncha } from "../core/layoutEntrenador.jsx";

// destinatariosEfectivosSesion y etiquetaDestinoSesion ahora en
// src/core/hooks.js — importadas arriba.

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
// estadoDiaCalendario (usado por el calendario de la Ficha de jugador)
// ahora en src/screens/FichaJugador.jsx — importada arriba.

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
export function CalendarioModuloReal({ onBack, onAbrirModulo, onCerrarSesion, scopeInicial }) {
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
