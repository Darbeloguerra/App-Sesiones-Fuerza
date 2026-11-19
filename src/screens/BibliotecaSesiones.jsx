import React, { useEffect, useMemo, useRef, useState } from "react";
import { ds, dsF, dsR, DsButton, DsInput } from "../core/designSystem.jsx";
import { useAnchoVentana, AnchoForzadoContext } from "../core/layout.jsx";
import {
  useConfigValue,
  useEntityList,
  useMaterialesDisponibles,
  actualizarZonaEjercicio,
  resolveEjercicio,
  invalidateEntityCache,
  invalidateBootstrapCache,
} from "../core/hooks.js";
import { todayStr, fmtHaceDias } from "../calc/fechas.js";
import { OBJETIVOS_SESION, avisoDeTarea } from "../calc/guiaObjetivo.js";
import { estimarBloqueTareasSeg } from "../calc/duracionTarea.js";
import { formatearMinutosDiseno } from "../calc/tiempoDisponible.js";
import {
  TIPOS_PLANTILLA,
  MD_FILTRO,
  SIN_TIPO,
  claveNombre,
  parseMeta,
  serializarMeta,
  actualizarMeta,
  describirPlantilla,
  filtrarPlantillas,
  ordenarPlantillas,
  agruparPorTipo,
  contarPorTipo,
  diasDisponibles,
  resolverDestinatarios,
  itemsAsignacion,
  resumenAsignacion,
  atajoFechas,
  mdDe,
  nombreCopia,
  tareasDeCopia,
} from "../calc/biblioteca.js";
import {
  DisenoSesionReal,
  FilaTareaReal,
  TarjetaBloqueDiseno,
  COLOR_BLOQUE_DISENO,
  ResumenAvisosCarga,
  SelectorEjercicioReal,
  datosSuperserie,
  nuevaTareaBase,
  heredarDeAnterior,
  tareaADraft,
} from "./DisenoSesion.jsx";
import { EtiquetaAccion } from "./ControlesTarea.jsx";

// Biblioteca de sesiones (vista «Sesiones» de Biblioteca). Lista de plantillas
// con filtros desplegables (tipo, MD, favoritas, orden). Cada sesión se
// despliega al pulsarla: a la izquierda se edita con los mismos controles del
// diseñador (motor de carga, avisos, tiempo) y a la derecha se asigna a días,
// equipos o jugadores.
//
// Regla: modificar una sesión NUNCA cambia la original. «Guardar como sesión
// nueva» crea otra (borrador sin fechas, con el mismo guardado del diseñador).
// Asignar publica con ese mismo guardado (montado oculto), igual que el
// Calendario: una sesión por día con todos los destinatarios dentro.

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const CLAVE_CONFIG = "biblioteca_plantillas";

const selectEstilo = {
  height: 38,
  background: ds.surfaceRaised,
  border: `1px solid ${ds.border}`,
  borderRadius: dsR.md,
  color: ds.ink,
  fontSize: 13,
  padding: "0 10px",
  minWidth: 0,
};

const etiquetaMono = { fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: ds.inkMuted, fontWeight: 600 };

const COLOR_TIPO = {
  Fuerza: ds.chart2,
  Específicas: ds.chart3,
  Core: ds.warning,
  Movilidad: ds.success,
  Preventivo: ds.accent,
  Resistencia: ds.chart1,
};

function Chip({ activo, onClick, children, ...resto }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!activo}
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: dsR.md,
        border: `1px solid ${activo ? ds.accent : ds.border}`,
        background: activo ? ds.accentSubtle : "transparent",
        color: activo ? ds.accent : ds.inkSecondary,
        fontSize: 12,
        fontWeight: activo ? 700 : 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
      {...resto}
    >
      {children}
    </button>
  );
}

function Pastilla({ children, tipo, color }) {
  return (
    <span
      style={{
        height: 21,
        padding: "0 8px",
        borderRadius: 7,
        border: `1px solid ${tipo ? ds.accentBorderSubtle : ds.border}`,
        background: tipo ? ds.accentSubtle : "transparent",
        color: tipo ? ds.accent : ds.inkSecondary,
        fontFamily: tipo ? undefined : dsF.mono,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />}
      {children}
    </span>
  );
}

const etiquetaUso = (g) =>
  g.nUsos ? `${fmtHaceDias(g.ultima)} · ${g.nUsos} ${g.nUsos === 1 ? "uso" : "usos"}` : g.proxima ? "planificada, sin usar" : "sin usar todavía";

const fechaLarga = (f) => new Date(`${f}T00:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

// ---------------------------------------------------------------------------
// Fila de la lista (acordeón)
// ---------------------------------------------------------------------------
function FilaPlantilla({ g, d, abierta, onToggle, onFav, onDetalle, onDiseno }) {
  const [menu, setMenu] = useState(false);
  const md = mdDe(g);
  const n = (g.rep.tareas || []).length;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={abierta}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "34px minmax(0,1fr) auto 34px 18px",
        alignItems: "center",
        gap: 8,
        padding: abierta ? "7px 7px 7px 5px" : "8px 8px 8px 6px",
        background: abierta ? ds.accentSubtle : ds.surface,
        border: abierta ? `2px solid ${ds.accent}` : `1px solid ${ds.border}`,
        borderRadius: abierta ? `${dsR.lg || 11}px ${dsR.lg || 11}px 0 0` : dsR.lg || 11,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <button
        type="button"
        aria-label={d.fav ? "Quitar de favoritas" : "Marcar como favorita"}
        aria-pressed={d.fav}
        onClick={(e) => {
          e.stopPropagation();
          onFav();
        }}
        style={{ width: 34, height: 34, border: 0, background: "transparent", color: d.fav ? ds.accent : ds.inkMuted, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}
      >
        {d.fav ? "★" : "☆"}
      </button>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ds.ink, overflowWrap: "anywhere" }}>{g.nombre}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pastilla tipo color={COLOR_TIPO[d.tipo] || ds.inkMuted}>
            {d.tipo}
          </Pastilla>
          {md && md !== "Sin MD" && <Pastilla>{md}</Pastilla>}
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: ds.inkSecondary, display: "flex", flexDirection: "column", gap: 1 }}>
        <span>
          <b style={{ color: ds.ink }}>
            {n} {n === 1 ? "tarea" : "tareas"}
          </b>
        </span>
        <span style={{ fontSize: 11.5 }}>{etiquetaUso(g)}</span>
      </div>
      <button
        type="button"
        aria-label="Más acciones"
        aria-expanded={menu}
        onClick={(e) => {
          e.stopPropagation();
          setMenu((v) => !v);
        }}
        style={{ width: 34, height: 34, borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, fontSize: 16, cursor: "pointer", padding: 0 }}
      >
        ⋯
      </button>
      <span aria-hidden="true" style={{ color: abierta ? ds.accent : ds.inkMuted, fontSize: 13, textAlign: "center" }}>
        {abierta ? "▴" : "▾"}
      </span>
      {menu && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", right: 34, top: 44, zIndex: 20, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 10, padding: 4, display: "flex", flexDirection: "column", minWidth: 200, boxShadow: "0 12px 28px rgba(0,0,0,0.45)" }}
        >
          {[
            ["Ver detalle y uso", onDetalle],
            ["Abrir en el diseñador", onDiseno],
          ].map(([t, fn]) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                fn();
              }}
              style={{ height: 38, padding: "0 12px", border: 0, borderRadius: 8, background: "transparent", color: ds.ink, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer" }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor inline (mismos controles y motor que el diseñador)
// ---------------------------------------------------------------------------
// La columna del editor es estrecha: las filas se colocan en dos niveles (como en móvil).
const ANCHO_EDITOR = 600;

const objetivoDeTarea = (t) => OBJETIVOS_SESION.find((o) => o.id === t.objetivo) || null;

// Para comparar «¿ha cambiado algo?» sin las marcas internas.
const huella = (lista) =>
  JSON.stringify(
    lista.map((t) => {
      const { key, abrirEditor, avisoOk, cargaAuto, pct1rmOrigen, tareaId, ...resto } = t;
      return resto;
    })
  );

function EditorSesion({ g, d, tipoInicial, onGuardarCopia, guardando, errorGuardado, existentes }) {
  const [ejercicios, , ejerciciosCargados, , , addEjercicioLocal] = useEntityList("ejercicios");
  const [materialesDisponibles, , agregarMaterial] = useMaterialesDisponibles();
  const [estado, setEstado] = useState(null);
  const [nombre, setNombre] = useState(g.rep.nombre || g.nombre);
  const [tipo, setTipo] = useState(tipoInicial);
  const [md, setMd] = useState(mdDe(g));
  const [bloqueAbierto, setBloqueAbierto] = useState("fuerza");
  const [sustituyendo, setSustituyendo] = useState(null);
  const base = useRef(null);

  const tareas = g.rep.tareas || [];
  useEffect(() => {
    if (!ejerciciosCargados || estado) return;
    const porId = new Map(ejercicios.map((e) => [e.id, e]));
    const aDraft = (b) => tareas.filter((t) => t.bloque_sesion === b && !t.circuito_id).map((t) => tareaADraft(t, porId, { nuevo: true }));
    const inicial = { fuerza: aDraft("Fuerza"), core: aDraft("Core") };
    base.current = { fuerza: huella(inicial.fuerza), core: huella(inicial.core) };
    setEstado(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejerciciosCargados]);

  if (!estado) return <div style={{ fontSize: 12.5, color: ds.inkMuted, padding: 12 }}>Cargando sesión…</div>;
  const { fuerza, core } = estado;
  const setFuerza = (fn) => setEstado((e) => ({ ...e, fuerza: typeof fn === "function" ? fn(e.fuerza) : fn }));
  const setCore = (fn) => setEstado((e) => ({ ...e, core: typeof fn === "function" ? fn(e.core) : fn }));

  const sucio = huella(fuerza) !== base.current.fuerza || huella(core) !== base.current.core || nombre.trim() !== (g.rep.nombre || g.nombre).trim() || tipo !== tipoInicial || md !== mdDe(g);

  const alternarEnlace = (setLista, i) => () =>
    setLista((prev) =>
      prev.map((x, k) => {
        if (k !== i) return x;
        const sig = prev[i + 1];
        if (!sig) return x;
        return x.alternaCon && x.alternaCon === sig.ejercicioId ? { ...x, alternaCon: "", alternaConNombre: "" } : { ...x, alternaCon: sig.ejercicioId, alternaConNombre: sig.nombre };
      })
    );

  const asignarZona = async (ejercicio, zona) => {
    const actualizado = await actualizarZonaEjercicio(ejercicio, zona);
    addEjercicioLocal(actualizado);
    return actualizado;
  };
  const resolver = async (ej) => {
    if (ej.id) return { id: ej.id, nombre: ej.nombre, gif_url: ej.gif_url || "" };
    const creado = await resolveEjercicio(ejercicios, { nombre: ej.nombre, bloque: ej.bloque || "", tags_descriptivos: ej.tags_descriptivos || [] });
    addEjercicioLocal(creado);
    return creado;
  };
  const agregar = (setLista, conCarga) => async (ej) => {
    const e = await resolver(ej);
    setLista((prev) => [...prev, heredarDeAnterior({ ...nuevaTareaBase({ id: e.id, nombre: e.nombre, gif_url: e.gif_url }), abrirEditor: undefined }, prev[prev.length - 1], conCarga)]);
  };
  // Sustituir: cambia solo el ejercicio; series, repeticiones, carga y descanso se mantienen.
  const sustituir = (setLista, key) => async (ej) => {
    const e = await resolver(ej);
    setLista((prev) => prev.map((t) => (t.key === key ? { ...t, nombre: e.nombre, ejercicioId: e.id, gif: e.gif_url || "", alternaCon: "", alternaConNombre: "" } : t)));
    setSustituyendo(null);
  };

  const segFuerza = estimarBloqueTareasSeg(fuerza, [], "Fuerza");
  const segCore = estimarBloqueTareasSeg(core, [], "Core");
  const nAvisos = fuerza.filter((t) => {
    const o = objetivoDeTarea(t);
    const a = o ? avisoDeTarea(o, t) : null;
    return a && a.estado !== "info";
  }).length;

  const bloqueEditable = (id, lista, setLista, mostrarCarga, nombreBloque) => (
    <TarjetaBloqueDiseno
      id={id}
      abierto={bloqueAbierto === id}
      onToggle={() => setBloqueAbierto((p) => (p === id ? null : id))}
      resumen={lista.length ? `${lista.length} tarea(s)` : ""}
      vacio={!lista.length}
      color={COLOR_BLOQUE_DISENO[id]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {mostrarCarga && <ResumenAvisosCarga tareas={lista} />}
        {lista.map((t, i) => {
          const ss = datosSuperserie(lista, nombreBloque);
          return (
            <div key={t.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <FilaTareaReal
                tarea={t}
                orden={ss[i].etiqueta}
                superserie={ss[i]}
                onAlternarEnlace={alternarEnlace(setLista, i)}
                mostrarCarga={mostrarCarga}
                materialesDisponibles={materialesDisponibles}
                onAgregarMaterial={agregarMaterial}
                referenciasPorEjercicio={{}}
                onCambiar={(nuevo) => setLista((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                onEliminar={() => setLista((prev) => prev.filter((x) => x.key !== t.key))}
                onSubir={
                  i > 0
                    ? () =>
                        setLista((prev) => {
                          const n = [...prev];
                          [n[i - 1], n[i]] = [n[i], n[i - 1]];
                          return n;
                        })
                    : null
                }
                onBajar={
                  i < lista.length - 1
                    ? () =>
                        setLista((prev) => {
                          const n = [...prev];
                          [n[i], n[i + 1]] = [n[i + 1], n[i]];
                          return n;
                        })
                    : null
                }
              />
              <div style={{ display: "flex", gap: 6, paddingLeft: 4 }}>
                <EtiquetaAccion texto={sustituyendo === t.key ? "⇄ Cancelar sustitución" : "⇄ Sustituir ejercicio"} onClick={() => setSustituyendo((s) => (s === t.key ? null : t.key))} />
              </div>
              {sustituyendo === t.key && (
                <div style={{ border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 10, padding: 8, background: ds.bgElevated, display: "flex", flexDirection: "column", gap: 6 }}>
                  <SelectorEjercicioReal ejercicios={ejercicios} bloque={nombreBloque} onAdd={sustituir(setLista, t.key)} onAsignarZona={asignarZona} />
                  <span style={{ fontSize: 11, color: ds.inkMuted }}>Se mantienen series, repeticiones, carga y descanso. Elige el nuevo ejercicio (o una variante).</span>
                </div>
              )}
            </div>
          );
        })}
        <SelectorEjercicioReal acoplable ejercicios={ejercicios} bloque={nombreBloque} onAdd={agregar(setLista, mostrarCarga)} onAsignarZona={asignarZona} />
      </div>
    </TarjetaBloqueDiseno>
  );

  // Bloques que esta pantalla no edita: se conservan tal cual en la copia.
  const otros = ["Activación", "Movilidad", "Preventivo", "Resistencia", "CMJ"]
    .map((b) => ({ b, n: tareas.filter((t) => t.bloque_sesion === b).length }))
    .filter((x) => x.n)
    .concat(tareas.some((t) => (t.bloque_sesion === "Fuerza" || t.bloque_sesion === "Core") && t.circuito_id) ? [{ b: "Circuitos", n: tareas.filter((t) => t.circuito_id).length }] : []);

  const nombreFinal = nombreCopia(nombre, g.rep.nombre || g.nombre, existentes);
  const nombreCambiado = nombre.trim() && claveNombre(nombre) !== claveNombre(g.rep.nombre || g.nombre);

  return (
    <AnchoForzadoContext.Provider value={ANCHO_EDITOR}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 124px 100px", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 3, ...etiquetaMono }}>
          Nombre
          <DsInput value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ textTransform: "none", letterSpacing: 0, fontFamily: dsF.sans }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3, ...etiquetaMono }}>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ ...selectEstilo, textTransform: "none", letterSpacing: 0, fontFamily: dsF.sans }}>
            <option value="">Elige…</option>
            {TIPOS_PLANTILLA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3, ...etiquetaMono }}>
          MD
          <select value={md} onChange={(e) => setMd(e.target.value)} style={{ ...selectEstilo, textTransform: "none", letterSpacing: 0, fontFamily: dsF.sans }}>
            <option value="">Sin MD</option>
            {MD_FILTRO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <span style={{ marginRight: "auto", fontSize: 12, color: ds.inkSecondary }}>
          {fuerza.length + core.length} tareas editables
          {otros.length > 0 && ` · más ${otros.map((x) => `${x.b} (${x.n})`).join(", ")}`}
        </span>
        <span style={{ fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, color: ds.accent }} title="Estimado de Fuerza y Core">
          ~{formatearMinutosDiseno(segFuerza + segCore)}
        </span>
        {nAvisos > 0 && (
          <span style={{ height: 30, padding: "0 11px", borderRadius: 15, border: `1px solid ${ds.danger}`, color: ds.danger, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
            ⚠ {nAvisos}
          </span>
        )}
      </div>

      {bloqueEditable("core", core, setCore, false, "Core")}
      {bloqueEditable("fuerza", fuerza, setFuerza, true, "Fuerza")}
      {otros.length > 0 && (
        <div style={{ fontSize: 11.5, color: ds.inkMuted, lineHeight: 1.45, padding: "0 4px" }}>
          {otros.map((x) => x.b).join(", ")}: se conservan tal cual en la copia. Para cambiarlos, abre la sesión en el diseñador (⋯ → Abrir en el diseñador).
        </div>
      )}

      {sucio ? (
        <div role="status" style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: ds.ink }}>
          <span style={{ flex: "1 1 220px" }}>
            <b>Has modificado la sesión.</b> Se guardará como una sesión nueva{nombreCambiado ? ` («${nombreFinal}»)` : ` («${nombreFinal}»)`}. La original no cambia.
          </span>
          <DsButton size="sm" disabled={!tipo || guardando || !(fuerza.length + core.length + otros.length)} onClick={() => onGuardarCopia({ nombre: nombreFinal, tipo, md, fuerza, core })}>
            {guardando ? "Guardando…" : "Guardar como sesión nueva"}
          </DsButton>
          <DsButton size="sm" variant="secondary" disabled={guardando} onClick={() => {
            const porId = new Map(ejercicios.map((e) => [e.id, e]));
            const aDraft = (b) => tareas.filter((t) => t.bloque_sesion === b && !t.circuito_id).map((t) => tareaADraft(t, porId, { nuevo: true }));
            setEstado({ fuerza: aDraft("Fuerza"), core: aDraft("Core") });
            setNombre(g.rep.nombre || g.nombre);
            setTipo(tipoInicial);
            setMd(mdDe(g));
            setSustituyendo(null);
          }}>
            Descartar
          </DsButton>
          {!tipo && <span style={{ flexBasis: "100%", fontSize: 12, color: ds.warning }}>El tipo es obligatorio para guardar.</span>}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: ds.inkMuted }}>Puedes modificar nombre, tipo, MD y ejercicios. Al guardar se crea una sesión nueva y esta no se toca.</div>
      )}
      {errorGuardado && (
        <div role="alert" style={{ fontSize: 12.5, color: ds.danger }}>
          {errorGuardado}
        </div>
      )}
    </div>
    </AnchoForzadoContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Asignar (derecha del acordeón)
// ---------------------------------------------------------------------------
function PanelAsignar({ g, activos, grupos, asig, setAsig, onAsignar, ocupado, resultado, fallos }) {
  const hoy = todayStr();
  const dias = useMemo(() => diasDisponibles(hoy, 14), [hoy]);
  const destinos = resolverDestinatarios(asig.grupos, asig.jug, activos);
  const resumen = resumenAsignacion(asig.fechas, destinos);
  const listo = resumen.sesiones > 0 && resumen.jugadores > 0 && (g.rep.tareas || []).length > 0;
  const enTira = new Set(dias.map((x) => x.fecha));
  const extra = asig.fechas.filter((f) => !enTira.has(f)).sort();
  const alternar = (lista, v) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const jugFiltrados = activos.filter((p) => (p.name || "").toLowerCase().includes(asig.qj.trim().toLowerCase()));
  const ocupadas = useMemo(() => new Set((g.usos || []).map((u) => u.fecha)), [g]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={etiquetaMono}>1 · Días</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
          {dias.map((x) => {
            const on = asig.fechas.includes(x.fecha);
            return (
              <button
                key={x.fecha}
                type="button"
                aria-pressed={on}
                title={fechaLarga(x.fecha)}
                onClick={() => setAsig((a) => ({ ...a, fechas: alternar(a.fechas, x.fecha) }))}
                style={{
                  position: "relative",
                  height: 46,
                  borderRadius: dsR.md,
                  border: `1px solid ${on ? ds.accent : ds.border}`,
                  background: on ? ds.accent : ds.surfaceRaised,
                  color: on ? ds.accentInk : ds.ink,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: dsF.mono, fontSize: 9.5, textTransform: "uppercase", color: on ? ds.accentInk : ds.inkMuted, fontWeight: 600 }}>{DIAS_CORTOS[x.dow]}</span>
                <b style={{ fontSize: 14 }}>{Number(x.fecha.slice(8, 10))}</b>
                {ocupadas.has(x.fecha) && <span aria-hidden="true" style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: on ? ds.accentInk : ds.accent }} />}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: ds.inkMuted }}>
          Del {fechaLarga(dias[0].fecha)} al {fechaLarga(dias[dias.length - 1].fecha)}
          {[...ocupadas].some((f) => enTira.has(f)) ? " · el punto marca un día en el que esta sesión ya está programada" : ""}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Chip onClick={() => setAsig((a) => ({ ...a, fechas: atajoFechas("resto-semana", hoy, dias) }))}>Resto de esta semana</Chip>
          <Chip onClick={() => setAsig((a) => ({ ...a, fechas: atajoFechas("lmv-proxima", hoy, dias) }))}>Lun · mié · vie próxima</Chip>
          <Chip onClick={() => setAsig((a) => ({ ...a, fechas: [] }))}>Quitar</Chip>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: ds.inkSecondary }}>Otra fecha</span>
          <input
            type="date"
            min={hoy}
            value=""
            onChange={(e) => {
              const f = e.target.value;
              if (f && f >= hoy) setAsig((a) => (a.fechas.includes(f) ? a : { ...a, fechas: [...a.fechas, f] }));
            }}
            aria-label="Añadir otra fecha"
            style={{ ...selectEstilo, height: 34 }}
          />
          {extra.map((f) => (
            <Chip key={f} activo onClick={() => setAsig((a) => ({ ...a, fechas: a.fechas.filter((x) => x !== f) }))} title="Quitar esta fecha">
              {fechaLarga(f)} ✕
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={etiquetaMono}>2 · Para quién</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {grupos.length === 0 && <span style={{ fontSize: 12, color: ds.inkMuted }}>Todavía no hay equipos. Elige jugadores sueltos.</span>}
          {grupos.map((gr) => {
            const n = activos.filter((p) => (p.gruposIds || []).includes(gr.id)).length;
            return (
              <Chip key={gr.id} activo={asig.grupos.includes(gr.id)} onClick={() => setAsig((a) => ({ ...a, grupos: alternar(a.grupos, gr.id) }))}>
                {gr.nombre}
                <span style={{ fontFamily: dsF.mono, fontSize: 10.5, opacity: 0.75, marginLeft: 5 }}>{n}</span>
              </Chip>
            );
          })}
        </div>
        <DsInput value={asig.qj} onChange={(e) => setAsig((a) => ({ ...a, qj: e.target.value }))} placeholder="Añadir jugadores sueltos" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto", border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 4, background: ds.surfaceRaised }}>
          {jugFiltrados.length === 0 && <div style={{ fontSize: 12, color: ds.inkMuted, padding: 8 }}>Ningún jugador coincide.</div>}
          {jugFiltrados.map((p) => {
            const on = asig.jug.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setAsig((a) => ({ ...a, jug: alternar(a.jug, p.id) }))}
                style={{ display: "flex", alignItems: "center", gap: 10, height: 36, flexShrink: 0, padding: "0 10px", border: 0, borderRadius: 8, background: on ? ds.accentSubtle : "transparent", color: ds.ink, fontSize: 13, textAlign: "left", cursor: "pointer" }}
              >
                <span style={{ width: 16, height: 16, borderRadius: 5, border: `1px solid ${on ? ds.accent : ds.border}`, background: on ? ds.accent : "transparent", flexShrink: 0 }} />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "10px 12px", fontSize: 13, color: ds.ink }}>
        {resumen.sesiones && resumen.jugadores ? (
          <>
            <b style={{ color: ds.accent }}>
              {resumen.sesiones} {resumen.sesiones === 1 ? "día" : "días"} · {resumen.jugadores} {resumen.jugadores === 1 ? "jugador" : "jugadores"}
            </b>
            . Se crea {resumen.sesiones === 1 ? "1 sesión" : `${resumen.sesiones} sesiones`} con todos los destinatarios dentro, no una por jugador. Cada asignación es una copia independiente. La carga no se modifica.
          </>
        ) : (
          "Elige al menos un día y un equipo o un jugador."
        )}
      </div>
      <DsButton disabled={!listo || ocupado} onClick={onAsignar}>
        {ocupado ? "Publicando…" : "Asignar y publicar"}
      </DsButton>
      {resultado && (
        <div role="status" style={{ fontSize: 12.5, color: ds.success }}>
          {resultado}
        </div>
      )}
      {fallos.length > 0 && (
        <div role="alert" style={{ fontSize: 12.5, color: ds.danger, display: "flex", flexDirection: "column", gap: 2 }}>
          {fallos.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
export function ListaPlantillasReal({ plantillas, players, grupos, onDetalle, onEditar, onNueva, onRefrescar }) {
  const ancho = useAnchoVentana();
  const dosColumnas = ancho >= 1000;
  const [metaRaw, saveMeta, metaCargada] = useConfigValue(CLAVE_CONFIG);
  const meta = useMemo(() => parseMeta(metaRaw), [metaRaw]);
  const [filtros, setFiltros] = useState({ tipo: "Todas", md: "Todos", fav: false, q: "", orden: "tipo" });
  const [abierta, setAbierta] = useState(null);
  const [nuevaClave, setNuevaClave] = useState(null);
  const [asig, setAsig] = useState({ fechas: [], grupos: [], jug: [], qj: "" });
  const [errorMeta, setErrorMeta] = useState("");
  const [cola, setCola] = useState(null);
  const [idx, setIdx] = useState(0);
  const [fallos, setFallos] = useState([]);
  const [resultado, setResultado] = useState("");
  const [copia, setCopia] = useState(null);
  const [errorCopia, setErrorCopia] = useState("");
  const [aviso, setAviso] = useState("");

  const activos = useMemo(() => players.filter((p) => p.estado === "activo"), [players]);
  const visibles = filtrarPlantillas(plantillas, filtros, meta);
  const lista = ordenarPlantillas(visibles, filtros.orden);
  const secciones = filtros.orden === "tipo" ? agruparPorTipo(lista, meta) : null;
  const conteo = contarPorTipo(plantillas, meta);
  const nFav = plantillas.filter((g) => describirPlantilla(g, meta).fav).length;
  const tiposConDatos = [...TIPOS_PLANTILLA, SIN_TIPO].filter((t) => conteo[t]);
  const mdsConDatos = ["Sin MD", ...MD_FILTRO].filter((m) => plantillas.some((g) => (m === "Sin MD" ? !mdDe(g) || mdDe(g) === "Sin MD" : mdDe(g) === m)));
  const nombres = plantillas.map((g) => g.nombre);

  const alternarFila = (g) => {
    const k = claveNombre(g.nombre);
    setNuevaClave(null);
    setResultado("");
    setFallos([]);
    setErrorCopia("");
    if (abierta === k) {
      setAbierta(null);
      return;
    }
    setAsig({ fechas: [], grupos: [], jug: [], qj: "" });
    setAbierta(k);
  };
  const clasificar = async (g, cambios) => {
    setErrorMeta("");
    const ok = await saveMeta(serializarMeta(actualizarMeta(meta, g.nombre, cambios)));
    if (!ok) setErrorMeta("No se pudo guardar la clasificación. Comprueba la conexión e inténtalo de nuevo.");
    return ok;
  };

  const lanzar = (g) => {
    const items = itemsAsignacion(g.rep, asig.fechas, resolverDestinatarios(asig.grupos, asig.jug, activos), todayStr());
    if (!items.length) return;
    setFallos([]);
    setResultado("");
    setIdx(0);
    setCola(items);
  };
  const refrescarTodo = () => {
    invalidateEntityCache("sesiones");
    invalidateEntityCache("tareas");
    invalidateEntityCache("circuitos");
    invalidateBootstrapCache();
    onRefrescar();
  };
  const siguiente = (huboFallo) => {
    const nuevo = idx + 1;
    if (nuevo >= cola.length) {
      const nFallos = fallos.length + (huboFallo ? 1 : 0);
      const n = cola.length - nFallos;
      setCola(null);
      if (n > 0) setAsig((a) => ({ ...a, fechas: [] }));
      setResultado(n > 0 ? `${n} ${n === 1 ? "día publicado" : "días publicados"}${nFallos ? ` · ${nFallos} con error` : ""}.` : "");
      refrescarTodo();
    } else setIdx(nuevo);
  };
  const actual = cola ? cola[idx] : null;

  // Guardar una copia: el diseñador la crea como borrador sin fechas (montado
  // oculto) y después se clasifica con el tipo elegido.
  const guardarCopia = (g, datos) => {
    setErrorCopia("");
    setCopia({ g, ...datos, plantilla: { ...g.rep, nombre: datos.nombre, md: datos.md, tareas: tareasDeCopia(g.rep.tareas, datos.fuerza, datos.core) } });
  };
  const copiaGuardada = async () => {
    const c = copia;
    setCopia(null);
    await saveMeta(serializarMeta(actualizarMeta(meta, c.nombre, { tipo: c.tipo })));
    refrescarTodo();
    const k = claveNombre(c.nombre);
    setAbierta(k);
    setNuevaClave(k);
    setAsig({ fechas: [], grupos: [], jug: [], qj: "" });
    setAviso(`Sesión nueva guardada: «${c.nombre}». La original no ha cambiado.`);
    setTimeout(() => setAviso(""), 5000);
  };

  const fila = (g) => {
    const k = claveNombre(g.nombre);
    const d = describirPlantilla(g, meta);
    const esAbierta = abierta === k;
    return (
      <div key={g.id} style={{ display: "flex", flexDirection: "column", outline: nuevaClave === k ? `2px solid ${ds.success}` : "none", borderRadius: 12 }}>
        <FilaPlantilla g={g} d={d} abierta={esAbierta} onToggle={() => alternarFila(g)} onFav={() => clasificar(g, { fav: !d.fav })} onDetalle={() => onDetalle(g.id)} onDiseno={() => onEditar(g.id)} />
        {esAbierta && (
          <div
            style={{
              background: ds.surface,
              border: `2px solid ${ds.accent}`,
              borderTop: 0,
              borderRadius: `0 0 ${dsR.lg || 11}px ${dsR.lg || 11}px`,
              padding: 14,
              display: "grid",
              gridTemplateColumns: dosColumnas ? "minmax(0, 1.25fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <EditorSesion
              key={`${g.id}-${(g.rep.tareas || []).length}`}
              g={g}
              d={d}
              tipoInicial={d.tipo === SIN_TIPO ? "" : d.tipo}
              guardando={!!copia}
              errorGuardado={errorCopia}
              existentes={nombres}
              onGuardarCopia={(datos) => guardarCopia(g, datos)}
            />
            <PanelAsignar g={g} activos={activos} grupos={grupos} asig={asig} setAsig={setAsig} onAsignar={() => lanzar(g)} ocupado={!!cola} resultado={resultado} fallos={fallos} />
          </div>
        )}
      </div>
    );
  };

  const barra = (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.xl, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: "span 2", ...etiquetaMono }}>
        Buscar
        <DsInput value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} placeholder="Nombre de la sesión" style={{ minWidth: 0, textTransform: "none", letterSpacing: 0, fontFamily: dsF.sans }} />
      </label>
      {[
        ["Tipo", filtros.tipo, (v) => setFiltros((f) => ({ ...f, tipo: v })), [["Todas", `Todos los tipos (${plantillas.length})`], ...tiposConDatos.map((t) => [t, `${t} (${conteo[t]})`])]],
        ["MD", filtros.md, (v) => setFiltros((f) => ({ ...f, md: v })), [["Todos", "Todos los MD"], ...mdsConDatos.map((m) => [m, m])]],
        ["Mostrar", filtros.fav ? "fav" : "todas", (v) => setFiltros((f) => ({ ...f, fav: v === "fav" })), [["todas", "Todas"], ["fav", `★ Solo favoritas (${nFav})`]]],
        ["Orden", filtros.orden, (v) => setFiltros((f) => ({ ...f, orden: v })), [["tipo", "Agrupar por tipo"], ["reciente", "Más recientes"], ["az", "A–Z"]]],
      ].map(([et, val, fn, ops]) => (
        <label key={et} style={{ display: "flex", flexDirection: "column", gap: 3, ...etiquetaMono }}>
          {et}
          <select aria-label={et} value={val} onChange={(e) => fn(e.target.value)} style={{ ...selectEstilo, textTransform: "none", letterSpacing: 0, fontFamily: dsF.sans }}>
            {ops.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );

  const listado =
    plantillas.length === 0 ? (
      <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Todavía no has puesto nombre a ninguna sesión. Ponle uno al diseñarla (en «Diseñar sesión») para que aparezca aquí.</div>
    ) : lista.length === 0 ? (
      <div style={{ color: ds.inkSecondary, fontSize: 13, padding: 22, textAlign: "center", background: ds.surface, border: `1px dashed ${ds.border}`, borderRadius: dsR.xl }}>
        No hay sesiones con estos filtros. Prueba con otro tipo o crea una nueva desde cero.
      </div>
    ) : secciones ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {secciones.map((s) => (
          <div key={s.tipo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h2 style={{ margin: 0, fontFamily: dsF.display, fontSize: 14, fontWeight: 700 }}>{s.tipo}</h2>
              <span style={{ fontSize: 12, color: ds.inkMuted }}>{s.items.length}</span>
            </div>
            {s.items.map(fila)}
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lista.map(fila)}</div>
    );

  const publicando = cola && actual && (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: ds.bgElevated, color: ds.ink, border: `1px solid ${ds.border}`, borderRadius: 12, padding: "18px 22px", minWidth: 260, textAlign: "center" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Publicando…</div>
          <div style={{ fontSize: 13, color: ds.inkSecondary }}>
            Día {idx + 1} de {cola.length} · {fechaLarga(actual.fecha)}
          </div>
        </div>
      </div>
      <div style={{ display: "none" }}>
        <DisenoSesionReal
          key={`${idx}-${actual.fecha}`}
          plantilla={actual.sesion}
          fechasSugeridas={[actual.fecha]}
          destinatariosSugeridos={actual.destinos}
          forzarDestino
          sinProgresion
          autoEnviar
          onBack={() => {}}
          onFallo={(msg) => {
            setFallos((f) => [...f, `${fechaLarga(actual.fecha)}: ${msg}`]);
            siguiente(true);
          }}
          onGuardado={() => siguiente(false)}
        />
      </div>
    </>
  );

  // Copia en curso: el diseñador (oculto) la guarda como borrador sin fechas.
  const guardandoCopia = copia && (
    <div style={{ display: "none" }}>
      <DisenoSesionReal
        key={`copia-${copia.nombre}`}
        plantilla={copia.plantilla}
        mdForzado={copia.md || undefined}
        sinFechas
        sinProgresion
        autoBorrador
        onBack={() => {}}
        onFallo={(msg) => {
          setErrorCopia(`No se pudo guardar la sesión nueva: ${msg}`);
          setCopia(null);
        }}
        onGuardado={copiaGuardada}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: ds.inkMuted, fontWeight: 600 }}>Sesiones</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Biblioteca de sesiones</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{plantillas.length} plantillas guardadas</div>
        </div>
        <DsButton onClick={onNueva}>+ Nueva sesión desde cero</DsButton>
      </div>
      {errorMeta && (
        <div role="alert" style={{ color: ds.danger, fontSize: 12.5, marginBottom: 10 }}>
          {errorMeta}
        </div>
      )}
      {aviso && (
        <div role="status" style={{ color: ds.success, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
          {aviso}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {barra}
        {!metaCargada && <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Cargando clasificación…</div>}
        {listado}
      </div>
      {publicando}
      {guardandoCopia}
    </div>
  );
}
