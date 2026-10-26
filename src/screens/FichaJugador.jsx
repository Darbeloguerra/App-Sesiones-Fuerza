import { useState, useEffect, useCallback, useMemo } from "react";
import { Dumbbell, ChevronLeft, ChevronRight, Target, CalendarClock, Pencil, BookOpen, Zap, Calendar, AlertTriangle, Home, TrendingUp, Activity } from "lucide-react";
import { ds, dsR, dsF, DsButton, DsCard, DsBadge, DsInput, DsSelect, DsTabSwitcher, DsAvatar, DsNavItem } from "../core/designSystem.jsx";
import { supabase, api } from "../core/backend.js";
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
import { parseResistenciaData, crearFraccionCumplida, tareasHechasPorJugadorFecha, calcularCumplimientoPauta } from "../calc/adherencia.js";
import {
  cmjPct,
  cmjFmt,
  cmjSigned,
  CMJ_FIELDS,
  CMJ_METRIC_LIST,
  cmjMotivoDia,
  cmjMotivoRecuperacion,
  cmjBuildPlayers,
  CMJ_UMBRAL_DEFECTO,
  cmjVentanasMicrociclo,
} from "../calc/cmj.js";
import {
  REPS_MAX_RIR_FIABLE,
  e1rmDeValores,
  medianaNum,
  EQUIPOS_AMBIGUOS,
  materialEfectivo,
  claveDisenoTarea,
  calcularRecordsCargaJugador,
  calcularCambiosE1rm,
  calcularCargaFuerzaPorMicro,
} from "../calc/e1rm.js";
import { LoadingBlock, ChipReal, inicialesNombre, colorAvatarJugador, MiniStat, GraficaProgresoCargaReal, TarjetaSesionReal } from "../core/components.jsx";
import {
  useReferenciasFuerza,
  invalidateEntityCache,
  useEntityList,
  usePlayers,
  UNIDAD_POR_MODO,
  parseMateriales,
  formatearObjetivoResistencia,
  useCategoriasPreventivas,
  useMaterialesDisponibles,
  usePlayerHistory,
  useEquipoHistory,
  useBootstrapProgramacion,
  ESTADO_JUGADOR_META,
  useCarteraEntrenador,
  useDatosDashboardEntrenador,
} from "../core/hooks.js";
import { CMJ_STATUS_META, CMJ_TAG_META, CMJ_METRIC_CHART_COLOR } from "../core/cmjDisplay.jsx";
import { CmjProximamente } from "./ControlFatiga.jsx";
import { PantallaEntrenadorAncha } from "../core/layoutEntrenador.jsx";
import { FilaAlertaReal } from "./Dashboard.jsx";

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

// GraficaProgresoCargaReal (gráfica SVG de progreso de carga en el
// tiempo) ahora en src/core/components.jsx — importada arriba (la usan
// Progreso del jugador, Ficha de jugador y Pantalla del jugador).

// El motor de cálculo del Control de Fatiga (CMJ) está en src/calc/cmj.js,
// y las 3 constantes de color/estilo en src/core/cmjDisplay.jsx —
// importados arriba.

// MiProgresoJugadorReal ("Mi progreso", la pantalla del jugador) ahora en
// src/screens/Progreso.jsx — importada arriba.

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

export function FichaJugadorModuloReal({ jugador, onBack, onAbrirModulo, onCerrarSesion, pestanaInicial }) {
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
      <PantallaEntrenadorAncha activo="roster" anchoMaximo={1280} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
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
    <PantallaEntrenadorAncha activo="roster" anchoMaximo={1280} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
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
        <div style={{ margin: "16px 0 0" }}>
          {/* Pestañas arriba (antes: carril vertical de 168px que, junto a la barra
              global, hacía una doble barra lateral y estrechaba el contenido). */}
          <div role="tablist" aria-label="Secciones de la ficha" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${ds.border}`, marginBottom: 18, overflowX: "auto" }}>
            {[
              { id: "resumen", label: "Resumen", activa: pestana === "resumen" },
              { id: "calendario", label: "Calendario", activa: pestana === "calendario" },
              { id: "progreso", label: "Progreso", activa: pestana === "progreso" || pestana === "historial" },
              { id: "cmj", label: "Control de fatiga", activa: pestana === "cmj" },
              { id: "notas", label: "Notas y accesos", activa: pestana === "notas" || pestana === "datos" },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={v.activa}
                onClick={() => setPestana(v.id)}
                style={{
                  minHeight: 44,
                  padding: "0 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${v.activa ? ds.accent : "transparent"}`,
                  marginBottom: -1,
                  color: v.activa ? ds.accent : ds.inkSecondary,
                  fontSize: 13.5,
                  fontWeight: v.activa ? 700 : 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
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

// Datos por revisar (calidad de datos).
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

// Estado del punto de cada día en el calendario de la ficha.
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
