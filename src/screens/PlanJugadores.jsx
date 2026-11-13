import { useState } from "react";
import { ds, dsR, dsF } from "../core/designSystem.jsx";
import { claveCelda } from "../calc/planJugadores.js";

// Vista «Jugadores» del Calendario: planificación por jugador y día.
// Componente de presentación: todo el estado de datos (sesiones, pendientes,
// publicación) vive en Calendario.jsx y llega por props. Aquí solo hay estado
// de interfaz (hoja abierta, buscador, panel «Añadir»).
//
// Escritorio: tabla jugadores × 7 días (celdas de tamaño fijo).
// Móvil (< ANCHO_MIN_TABLA): selector de día + lista de jugadores, sin
// desplazamiento horizontal.

export const ANCHO_MIN_TABLA = 760;
const NOMBRES_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const colorEstado = (e) =>
  e === "hecho" ? ds.success : e === "parcial" ? ds.warning : e === "falta" ? ds.danger : e === "hoy" ? ds.accent : e === "borrador" ? ds.inkSecondary : ds.accent;
const marcaEstado = (e) => (e === "hecho" ? "✓" : e === "parcial" ? "~" : e === "falta" ? "✕" : e === "borrador" ? "borrador" : "");

const botonSecundario = {
  background: "transparent", border: `1px solid ${ds.border}`, color: ds.ink, borderRadius: dsR.lg,
  padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: dsF.sans,
};
const botonPrimario = {
  background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: dsR.lg,
  padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: dsF.sans,
};

// Texto que cabe siempre en la celda: salta de línea, centrado, máx. 2 líneas
// (la tercera la ocupa la marca de estado).
const textoCelda = {
  display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
  overflowWrap: "anywhere", textAlign: "center", fontSize: 11.5, lineHeight: 1.15, fontWeight: 700, maxWidth: "100%",
};

function Celda({ sesiones, pendienteNombre, pasada, onClick, alto = 56 }) {
  const primera = sesiones[0];
  const col = primera ? colorEstado(primera.estado) : pendienteNombre ? ds.accent : ds.border;
  const vacia = !primera && !pendienteNombre;
  const deshabilitada = vacia && pasada;
  const marca = primera ? marcaEstado(primera.estado) : "";
  return (
    <button
      type="button"
      disabled={deshabilitada}
      onClick={onClick}
      style={{
        width: "100%", height: alto, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2, padding: "5px 6px", borderRadius: 10, cursor: deshabilitada ? "default" : "pointer", color: ds.ink, fontFamily: dsF.sans,
        border: primera ? `1px solid ${col}66` : pendienteNombre ? `1.5px dashed ${ds.accent}` : `1px solid ${ds.border}`,
        background: primera ? `${col}14` : pendienteNombre ? ds.accentSubtle : ds.canvas,
        opacity: deshabilitada ? 0.45 : 1,
      }}
    >
      {primera ? (
        <>
          <span style={textoCelda}>{primera.nombre || "Sesión"}</span>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, fontWeight: 700, color: col }}>
            {marca}{sesiones.length > 1 ? ` +${sesiones.length - 1}` : ""}
          </span>
        </>
      ) : pendienteNombre ? (
        <>
          <span style={textoCelda}>{pendienteNombre}</span>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>pendiente</span>
        </>
      ) : (
        <span style={{ fontSize: 11.5, color: ds.inkMuted }}>{pasada ? "—" : "+ asignar"}</span>
      )}
    </button>
  );
}

export default function PlanJugadores(props) {
  const {
    jugadores, dias, hoy, ancho, diaSel, setDiaSel, etiquetaDia, partidoEnFecha,
    sesionesCelda, resumenFila, pend, biblioteca, nombreSesion,
    activos, grupos, manualActivo, onRestablecer,
    onAsignar, onDisenar, onAbrirSesion, onPersonalizar, onQuitarFila, onAnadir,
    onCopiarSemana, onPublicar, onDescartar, publicando, resumenPub,
  } = props;

  const [sel, setSel] = useState(null); // { jid, fecha } | { todos: fecha }
  const [busca, setBusca] = useState("");
  const [anadirAbierto, setAnadirAbierto] = useState(false);
  const [tabAnadir, setTabAnadir] = useState("equipos");
  const [marcados, setMarcados] = useState({});
  const movil = ancho < ANCHO_MIN_TABLA;
  const idsFilas = new Set(jugadores.map((p) => p.id));

  const cerrar = () => { setSel(null); setBusca(""); };
  const abrirCelda = (p, f) => setSel({ jid: p.id, fecha: f });
  const abrirDia = (f) => setSel({ todos: f });

  const jugadorSel = sel && sel.jid ? jugadores.find((p) => p.id === sel.jid) : null;
  const sesionesSel = jugadorSel ? sesionesCelda(jugadorSel, sel.fecha) : [];
  const pendSel = jugadorSel ? pend[claveCelda(jugadorSel.id, sel.fecha)] : null;
  // Jugadores sin sesión en un día (a los que llega «Todos»).
  const libresEn = (f) => jugadores.filter((p) => sesionesCelda(p, f).length === 0).map((p) => p.id);

  const elegirSesion = (sesionId) => {
    if (!sel) return;
    if (sel.todos) onAsignar(libresEn(sel.todos), [sel.todos], sesionId);
    else onAsignar([sel.jid], [sel.fecha], sesionId);
    cerrar();
  };
  const disenarNueva = () => {
    if (!sel) return;
    if (sel.todos) onDisenar(libresEn(sel.todos), sel.todos);
    else onDisenar([sel.jid], sel.fecha);
    cerrar();
  };

  const q = busca.trim().toLowerCase();
  const listaBib = biblioteca.filter((o) => !q || o.nombre.toLowerCase().includes(q));

  // ---------- Hoja inferior: elegir sesión / ver sesión existente ----------
  const hoja = sel && (() => {
    const fecha = sel.todos || sel.fecha;
    const titulo = sel.todos ? `Todos · ${etiquetaDia(fecha)}` : `${jugadorSel ? jugadorSel.name : ""} · ${etiquetaDia(fecha)}`;
    const ocupada = !sel.todos && sesionesSel.length > 0;
    const nLibres = sel.todos ? libresEn(sel.todos).length : 0;
    return (
      <>
        <div onClick={cerrar} style={{ position: "fixed", inset: 0, zIndex: 69, background: "rgba(0,0,0,0.35)" }} />
        <div role="dialog" aria-label={titulo} style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70, maxHeight: "72vh", overflowY: "auto",
          background: ds.surfaceRaised, borderTop: `1px solid ${ds.accentBorderSubtle}`, boxShadow: "0 -12px 28px rgba(0,0,0,0.45)",
          padding: "14px max(16px, env(safe-area-inset-right, 0px)) calc(14px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800 }}>{titulo}</div>
            <button type="button" onClick={cerrar} style={{ ...botonSecundario, padding: "6px 12px" }}>Cerrar</button>
          </div>
          {ocupada ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sesionesSel.map((s) => (
                <div key={s.id} style={{ border: `1px solid ${colorEstado(s.estado)}66`, background: `${colorEstado(s.estado)}12`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.nombre || "Sesión"}</div>
                  <div style={{ fontSize: 11.5, color: ds.inkSecondary, margin: "2px 0 8px" }}>
                    {s.estado === "hecho" ? "Completada" : s.estado === "parcial" ? "Parcial" : s.estado === "falta" ? "Sin enviar por el jugador" : s.estado === "borrador" ? "Borrador (aún no publicada)" : s.estado === "hoy" ? "Toca hoy" : "Publicada"}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={botonSecundario} onClick={() => { cerrar(); onAbrirSesion(s.id); }}>Abrir sesión</button>
                    {!s.individual && <button type="button" style={{ ...botonSecundario, color: ds.accent, borderColor: ds.accentBorderSubtle }} onClick={() => { cerrar(); onPersonalizar(s.id, jugadorSel.id, sel.fecha); }}>Personalizar solo para {jugadorSel.name}</button>}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Para sustituir una sesión ya publicada, ábrela o personalízala: así no se pierden los registros del jugador.</div>
            </div>
          ) : (
            <>
              {sel.todos && <div style={{ fontSize: 12, color: ds.inkSecondary, marginBottom: 8 }}>{nLibres ? `Se asigna a los ${nLibres} jugadores sin sesión ese día.` : "Todos los jugadores ya tienen sesión ese día."}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar en mis sesiones…" className="ds-input" style={{ flex: 1, minWidth: 160 }} />
                <button type="button" disabled={sel.todos && !nLibres} onClick={disenarNueva} style={{ ...botonSecundario, color: ds.accent, borderColor: ds.accentBorderSubtle, opacity: sel.todos && !nLibres ? 0.5 : 1 }}>+ Diseñar nueva sesión</button>
              </div>
              <div style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Mis sesiones</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {listaBib.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>{biblioteca.length ? "Ninguna coincide con la búsqueda." : "Aún no tienes sesiones guardadas. Diseña una nueva."}</div>}
                {listaBib.map((o) => (
                  <button key={o.id} type="button" disabled={sel.todos && !nLibres} onClick={() => elegirSesion(o.id)} style={{
                    textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    background: "transparent", border: `1px solid ${ds.border}`, color: ds.ink, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: dsF.sans,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.nombre}</span>
                    <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkSecondary, whiteSpace: "nowrap" }}>{o.detalle}</span>
                  </button>
                ))}
              </div>
              {pendSel && <button type="button" onClick={() => elegirSesion(null)} style={{ ...botonSecundario, color: ds.danger, borderColor: ds.dangerBorderSubtle }}>Quitar «{nombreSesion(pendSel)}» (pendiente)</button>}
            </>
          )}
        </div>
      </>
    );
  })();

  // ---------- Panel «Añadir jugadores» ----------
  const panelAnadir = anadirAbierto && (
    <div style={{ border: `1px solid ${ds.accentBorderSubtle}`, background: ds.surface, borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Añadir a la vista</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[["equipos", "Equipos"], ["sueltos", "Jugadores sueltos"]].map(([id, lab]) => (
          <button key={id} type="button" onClick={() => setTabAnadir(id)} style={{ border: `1px solid ${tabAnadir === id ? ds.accentBorderSubtle : ds.border}`, background: tabAnadir === id ? ds.accentSubtle : "transparent", color: tabAnadir === id ? ds.accent : ds.inkSecondary, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: dsF.sans }}>{lab}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, maxHeight: 260, overflowY: "auto" }}>
        {tabAnadir === "equipos" && grupos.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>No hay equipos creados.</div>}
        {tabAnadir === "equipos" && grupos.map((g) => {
          const ids = activos.filter((p) => (p.gruposIds || []).includes(g.id)).map((p) => p.id);
          const ya = ids.length > 0 && ids.every((id) => idsFilas.has(id));
          const on = !!marcados[`g:${g.id}`];
          return (
            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${on ? ds.accentBorderSubtle : ds.border}`, background: on ? ds.accentSubtle : "transparent", borderRadius: 10, padding: "8px 12px", fontSize: 13, cursor: ya || !ids.length ? "default" : "pointer", opacity: ya || !ids.length ? 0.55 : 1 }}>
              <input type="checkbox" disabled={ya || !ids.length} checked={on} onChange={(e) => setMarcados((m) => ({ ...m, [`g:${g.id}`]: e.target.checked }))} />
              <span>{g.nombre} <span style={{ fontSize: 11, color: ds.inkMuted }}>{ids.length} jugadores{ya ? " · ya añadido" : ""}</span></span>
            </label>
          );
        })}
        {tabAnadir === "sueltos" && activos.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const ya = idsFilas.has(p.id);
          const on = !!marcados[`j:${p.id}`];
          return (
            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${on ? ds.accentBorderSubtle : ds.border}`, background: on ? ds.accentSubtle : "transparent", borderRadius: 10, padding: "8px 12px", fontSize: 13, cursor: ya ? "default" : "pointer", opacity: ya ? 0.55 : 1 }}>
              <input type="checkbox" disabled={ya} checked={on} onChange={(e) => setMarcados((m) => ({ ...m, [`j:${p.id}`]: e.target.checked }))} />
              <span>{p.name}{ya ? <span style={{ fontSize: 11, color: ds.inkMuted }}> · ya añadido</span> : null}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={botonPrimario} onClick={() => {
          const ids = [];
          Object.keys(marcados).filter((k) => marcados[k]).forEach((k) => {
            if (k.startsWith("g:")) activos.filter((p) => (p.gruposIds || []).includes(k.slice(2))).forEach((p) => ids.push(p.id));
            else ids.push(k.slice(2));
          });
          if (ids.length) onAnadir(ids);
          setMarcados({}); setAnadirAbierto(false);
        }}>Añadir selección</button>
        <button type="button" style={botonSecundario} onClick={() => { setMarcados({}); setAnadirAbierto(false); }}>Cancelar</button>
      </div>
    </div>
  );

  // ---------- Barra superior de acciones ----------
  const barra = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <button type="button" style={botonPrimario} onClick={() => setAnadirAbierto((v) => !v)}>+ Añadir jugadores</button>
      <button type="button" style={botonSecundario} onClick={onCopiarSemana} disabled={!jugadores.length}>Copiar semana a la siguiente</button>
      {manualActivo && <button type="button" style={{ ...botonSecundario, color: ds.inkSecondary, fontWeight: 600 }} onClick={onRestablecer}>Usar el ámbito</button>}
      <span style={{ fontSize: 12, color: ds.inkMuted }}>{jugadores.length ? `${jugadores.length} jugador${jugadores.length === 1 ? "" : "es"}` : ""}</span>
    </div>
  );

  // ---------- Barra de publicación ----------
  const barraPub = (
    <div style={{ position: "sticky", bottom: 0, zIndex: 5, background: ds.canvas, borderTop: `1px solid ${ds.border}`, padding: "12px 0", marginTop: 14, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <button type="button" disabled={!resumenPub.celdas || publicando} onClick={onPublicar} style={{ ...botonPrimario, padding: "11px 20px", fontSize: 13.5, opacity: !resumenPub.celdas || publicando ? 0.5 : 1 }}>
        Publicar cambios{resumenPub.celdas ? ` (${resumenPub.celdas} ${resumenPub.celdas === 1 ? "celda" : "celdas"})` : ""}
      </button>
      {resumenPub.celdas > 0 && <button type="button" onClick={onDescartar} style={{ ...botonSecundario, fontWeight: 600 }}>Descartar</button>}
      <span style={{ fontSize: 12, color: ds.inkMuted, flex: 1, minWidth: 200 }}>
        {resumenPub.celdas
          ? `Se publicarán ${resumenPub.sesiones} sesión${resumenPub.sesiones === 1 ? "" : "es"}: las celdas con la misma sesión el mismo día se agrupan en una sola con varios jugadores.`
          : "Sin cambios pendientes."}
      </span>
    </div>
  );

  const leyenda = (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11.5, color: ds.inkSecondary }}>
      <span style={{ color: ds.success }}>✓ completada</span><span style={{ color: ds.warning }}>~ parcial</span><span style={{ color: ds.danger }}>✕ sin enviar</span>
      <span style={{ color: ds.accent }}>- - pendiente de publicar</span><span>borrador = aún no publicada</span>
    </div>
  );

  const vacio = jugadores.length === 0 && (
    <div style={{ padding: 20, fontSize: 13, color: ds.inkMuted, border: `1px solid ${ds.border}`, borderRadius: 14, background: ds.surface, textAlign: "center" }}>
      No hay jugadores en esta vista. Pulsa «Añadir jugadores» o cambia el ámbito.
    </div>
  );

  // ---------- Escritorio: tabla ----------
  if (!movil) {
    return (
      <div style={{ marginBottom: 16 }}>
        {barra}
        {panelAnadir}
        {vacio || (
          <div style={{ overflowX: "auto", border: `1px solid ${ds.borderSoft}`, borderRadius: 14, background: `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)` }}>
            <div style={{ minWidth: ANCHO_MIN_TABLA }}>
              <div style={{ display: "grid", gridTemplateColumns: "160px repeat(7, minmax(0, 1fr)) 64px", borderBottom: `1px solid ${ds.borderSoft}` }}>
                <div style={{ padding: "10px 12px", fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>JUGADOR</div>
                {dias.map((f, i) => {
                  const pasada = f < hoy;
                  return (
                    <button key={f} type="button" disabled={pasada} onClick={() => abrirDia(f)} title={pasada ? "" : "Asignar a todos"} style={{ background: "transparent", border: "none", padding: "8px 4px", textAlign: "center", cursor: pasada ? "default" : "pointer", fontFamily: dsF.sans, color: f === hoy ? ds.accent : ds.inkSecondary }}>
                      <div style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{NOMBRES_DIA[i]} {Number(f.slice(8))}</div>
                      <div style={{ fontSize: 10.5, color: partidoEnFecha(f) ? ds.danger : ds.accent, fontWeight: 600 }}>{partidoEnFecha(f) ? "Partido" : pasada ? " " : "Todos ▾"}</div>
                    </button>
                  );
                })}
                <div style={{ padding: "10px 6px", textAlign: "center", fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>CUMPL.</div>
              </div>
              {jugadores.map((p) => {
                const r = resumenFila(p);
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "160px repeat(7, minmax(0, 1fr)) 64px", borderBottom: `1px solid ${ds.borderSoft}`, alignItems: "stretch" }}>
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 10.5, color: ds.inkMuted }}>{r.n} sesión{r.n === 1 ? "" : "es"} esta semana</div>
                      </div>
                      <button type="button" aria-label={`Quitar a ${p.name} de la vista`} title="Quitar de la vista" onClick={() => onQuitarFila(p.id)} style={{ background: "transparent", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button>
                    </div>
                    {dias.map((f) => {
                      const pn = pend[claveCelda(p.id, f)];
                      return (
                        <div key={f} style={{ padding: 4, display: "flex", alignItems: "center", background: f === hoy ? `${ds.accent}0d` : "transparent" }}>
                          <Celda sesiones={sesionesCelda(p, f)} pendienteNombre={pn ? nombreSesion(pn) : null} pasada={f < hoy} onClick={() => abrirCelda(p, f)} />
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, fontFamily: dsF.display, color: r.pct === null ? ds.inkMuted : r.pct >= 80 ? ds.success : r.pct >= 50 ? ds.warning : ds.danger }}>{r.pct === null ? "—" : `${r.pct} %`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {leyenda}
        {barraPub}
        {hoja}
      </div>
    );
  }

  // ---------- Móvil: día seleccionado + lista de jugadores ----------
  const fDia = dias.includes(diaSel) ? diaSel : dias.includes(hoy) ? hoy : dias[0];
  const pasadaDia = fDia < hoy;
  return (
    <div style={{ marginBottom: 16 }}>
      {barra}
      {panelAnadir}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 12 }}>
        {dias.map((f, i) => {
          const activo = f === fDia;
          const n = jugadores.filter((p) => sesionesCelda(p, f).length > 0 || pend[claveCelda(p.id, f)]).length;
          return (
            <button key={f} type="button" onClick={() => setDiaSel(f)} style={{ background: activo ? ds.accentSubtle : ds.surface, border: `1px solid ${activo ? ds.accent : f === hoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: 12, padding: "8px 2px", cursor: "pointer", color: ds.ink, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: dsF.sans }}>
              <span style={{ fontSize: 10.5, color: ds.inkSecondary }}>{NOMBRES_DIA[i]}</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: dsF.display, color: f === hoy ? ds.accent : ds.ink }}>{Number(f.slice(8))}</span>
              <span style={{ fontSize: 9.5, fontFamily: dsF.mono, color: partidoEnFecha(f) ? ds.danger : ds.inkMuted }}>{partidoEnFecha(f) ? "PART." : n ? `${n} jug.` : "·"}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800 }}>{etiquetaDia(fDia)}{partidoEnFecha(fDia) ? " · Partido" : ""}</div>
        {!pasadaDia && jugadores.length > 0 && <button type="button" onClick={() => abrirDia(fDia)} style={{ ...botonSecundario, color: ds.accent, borderColor: ds.accentBorderSubtle, padding: "7px 12px" }}>Asignar a todos ▾</button>}
      </div>
      {vacio || (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jugadores.map((p) => {
            const r = resumenFila(p);
            const pn = pend[claveCelda(p.id, fDia)];
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr) auto", gap: 8, alignItems: "center", border: `1px solid ${ds.borderSoft}`, borderRadius: 12, background: ds.surface, padding: "8px 8px 8px 12px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: ds.inkMuted }}>{r.n} ses. · {r.pct === null ? "sin cumpl." : `${r.pct} %`}</div>
                </div>
                <Celda sesiones={sesionesCelda(p, fDia)} pendienteNombre={pn ? nombreSesion(pn) : null} pasada={pasadaDia} onClick={() => abrirCelda(p, fDia)} alto={60} />
                <button type="button" aria-label={`Quitar a ${p.name} de la vista`} onClick={() => onQuitarFila(p.id)} style={{ background: "transparent", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 14, padding: "6px 4px" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      {leyenda}
      {barraPub}
      {hoja}
    </div>
  );
}
