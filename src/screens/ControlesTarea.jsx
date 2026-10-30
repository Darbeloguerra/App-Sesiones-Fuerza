// Controles de la fila de tarea del diseñador (modo tabla, iPad horizontal):
// desplegables anclados a su celda, etiquetas bajo el nombre y flechas.
// Los desplegables se dibujan en un portal por encima de todo (nada los recorta),
// se abren hacia arriba si abajo no hay sitio y tienen scroll propio.
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ds, dsF } from "../core/designSystem.jsx";

export const ANCHO_COL = 66;
export const ANCHO_FLECHAS = 92;
// Por debajo de este ancho de ventana la fila pasa a dos niveles y los desplegables
// suben como hoja inferior.
export const ANCHO_MIN_TABLA = 760;
const ALTO_CELDA = 34;

function medidas() {
  const v = typeof window !== "undefined" ? window.visualViewport : null;
  return { w: window.innerWidth, h: v ? v.height : window.innerHeight, hLayout: window.innerHeight };
}

export function Desplegable({ ancla, onCerrar, ancho = 320, children }) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const calcular = () => {
      const el = ancla && ancla.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const { w, h, hLayout } = medidas();
      if (w < ANCHO_MIN_TABLA) {
        const v = window.visualViewport;
        const finVisible = v ? v.offsetTop + v.height : hLayout;
        setPos({ hoja: true, bottom: Math.max(0, hLayout - finVisible), maxHeight: Math.round(h * 0.85) });
        return;
      }
      const a = Math.min(ancho, w - 16);
      const left = Math.max(8, Math.min(r.left + r.width / 2 - a / 2, w - a - 8));
      const abajo = h - r.bottom - 12;
      const arriba = r.top - 12;
      const haciaAbajo = abajo >= 300 || abajo >= arriba;
      setPos(
        haciaAbajo
          ? { left, width: a, top: r.bottom + 6, maxHeight: Math.max(160, abajo - 6) }
          : { left, width: a, bottom: hLayout - r.top + 6, maxHeight: Math.max(160, arriba - 6) }
      );
    };
    calcular();
    window.addEventListener("resize", calcular);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("resize", calcular);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", calcular);
    };
  }, [ancla, ancho]);
  useEffect(() => {
    const alTecla = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [onCerrar]);
  if (!pos) return null;
  const hoja = !!pos.hoja;
  const estiloPos = hoja
    ? { left: 0, right: 0, bottom: pos.bottom, maxHeight: pos.maxHeight, borderRadius: "16px 16px 0 0", paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }
    : pos;
  return createPortal(
    <div className="ds-reset" style={{ position: "fixed", inset: 0, zIndex: 1300, background: hoja ? "rgba(0,0,0,0.55)" : undefined }} onClick={onCerrar}>
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "fixed", ...estiloPos, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", boxSizing: "border-box", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", fontFamily: dsF.sans, color: ds.ink, ...(hoja ? { borderRadius: "16px 16px 0 0", padding: "10px 12px max(12px, env(safe-area-inset-bottom, 0px))" } : null) }}
      >
        {hoja && <span style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, background: ds.border, flexShrink: 0 }} />}
        {children}
      </div>
    </div>,
    document.body
  );
}

function Cabecera({ titulo, subtitulo }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "0 4px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>{titulo}</span>
      {subtitulo && <span style={{ fontSize: 11.5, color: ds.inkSecondary, textAlign: "right" }}>{subtitulo}</span>}
    </div>
  );
}

function ListaOpciones({ opciones, valor, onElegir, etiqueta, altoMax = 260 }) {
  const selRef = useRef(null);
  // Al abrir, la opción elegida queda a la vista aunque la lista tenga scroll.
  useEffect(() => {
    if (selRef.current && selRef.current.scrollIntoView) selRef.current.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <div role="listbox" aria-label={etiqueta} style={{ display: "flex", flexDirection: "column", gap: 2, padding: 4, border: `1px solid ${ds.border}`, borderRadius: 10, background: ds.surface, maxHeight: altoMax, overflowY: "auto", overscrollBehavior: "contain" }}>
      {opciones.map((o) => {
        const sel = String(o.v) === String(valor);
        const base = { flexShrink: 0, height: 38, boxSizing: "border-box", padding: "0 12px", borderRadius: 8, border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: dsF.sans, width: "100%" };
        const nota = o.fuera ? (sel ? "fuera de zona" : "fuera") : (o.nota || "");
        const estilo = sel ? { ...base, background: ds.accent, color: ds.accentInk, fontWeight: 700 } : o.zona ? { ...base, background: ds.accentSubtle, color: ds.accent } : o.tenue ? { ...base, background: "transparent", color: ds.inkMuted, fontSize: 12.5 } : { ...base, background: "transparent", color: ds.ink };
        return (
          <button key={String(o.v) + o.t} ref={sel ? selRef : undefined} type="button" role="option" aria-selected={sel} onClick={() => o.onElegir ? o.onElegir() : onElegir(o.v)} style={estilo}>
            <span>{o.t}</span>
            <span style={{ fontSize: 11, color: o.fuera && !sel ? ds.danger : undefined }}>{sel ? "✓ " : ""}{nota}</span>
          </button>
        );
      })}
    </div>
  );
}

// Aviso dentro de un desplegable: motivo y botón para usar la carga sugerida.
export function BloqueAviso({ info, cerrar }) {
  if (!info) return null;
  const rojo = info.estado === "inconsistente";
  return (
    <div style={{ border: `1px solid ${rojo ? ds.danger : ds.accentBorderSubtle}`, background: rojo ? "transparent" : ds.accentSubtle, borderRadius: 10, padding: "8px 10px", fontSize: 12, lineHeight: 1.45, color: ds.ink, display: "flex", flexDirection: "column", gap: 7 }}>
      <span><b style={{ color: rojo ? ds.danger : ds.accent }}>⚠</b> {info.mensaje}</span>
      {info.textoBoton && info.onAplicar && (
        <button type="button" onClick={() => { info.onAplicar(); cerrar(); }} style={{ height: 34, borderRadius: 9, border: "none", background: ds.accent, color: ds.accentInk, fontSize: 12.5, fontWeight: 700, fontFamily: dsF.sans, cursor: "pointer" }}>{info.textoBoton}</button>
      )}
    </div>
  );
}

export function Implicaciones({ datos, sugerencia }) {
  if (!datos && !sugerencia) return null;
  return (
    <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, lineHeight: 1.4, color: ds.inkSecondary }}>
      {datos && datos.lineas.map((l) => (
        <span key={l.etq}><b style={{ color: ds.ink }}>{l.etq}</b> {l.txt}</span>
      ))}
      {(datos || sugerencia) && (
        <span style={{ fontSize: 10.5, color: ds.inkMuted }}>{datos ? datos.fuente : ""}{datos && sugerencia ? " · " : ""}{sugerencia || ""}</span>
      )}
    </div>
  );
}

export function CampoSelect({ etiqueta, valor, opciones, onCambiar }) {
  return (
    <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: ds.inkSecondary, paddingLeft: 2 }}>{etiqueta}</span>
      <select aria-label={etiqueta} value={valor} onChange={(e) => onCambiar(e.target.value)} style={{ height: 38, boxSizing: "border-box", padding: "0 10px", borderRadius: 10, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.ink, fontSize: 16, fontWeight: 600, fontFamily: dsF.sans }}>
        {opciones.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
    </label>
  );
}

// Celda numérica: muestra el valor y abre un desplegable con valores rápidos,
// "Otro valor" (teclado) y, opcionalmente, campos extra y la explicación.
export function CeldaDesplegable({ etiqueta, valor, onCambiar, opciones, titulo, subtitulo, extra = null, pie = null, placeholder = "—", sufijo = "", alerta = false, apagada = false, resaltar = false, autoOpcion = null, textoOpcionesVacio, movil = false, aviso = null, avisoInfo = null }) {
  const [abierto, setAbierto] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const [borrador, setBorrador] = useState("");
  const ref = useRef(null);
  const tiene = valor !== "" && valor != null;
  const lista = [...opciones];
  if (tiene && !lista.some((o) => String(o.v) === String(valor))) {
    lista.push({ v: String(valor), t: String(valor) });
    lista.sort((a, b) => Number(a.v) - Number(b.v));
  }
  const cerrar = () => { setAbierto(false); setTeclado(false); };
  const elegir = (v) => { onCambiar(String(v)); cerrar(); };
  const confirmarTeclado = () => { const v = borrador.replace(/[^0-9]/g, ""); if (v !== "") onCambiar(v); cerrar(); };
  const todas = [
    ...(autoOpcion ? [{ v: "", t: autoOpcion, tenue: true }] : []),
    ...lista,
    { v: "__otro", t: "Otro valor… (teclado)", tenue: true, onElegir: () => { setBorrador(tiene ? String(valor) : ""); setTeclado(true); } },
  ];
  return (
    <div style={movil ? { minWidth: 0, display: "flex", flexDirection: "column", gap: 3, opacity: apagada ? 0.5 : 1 } : { width: ANCHO_COL, flexShrink: 0, opacity: apagada ? 0.5 : 1 }}>
      {movil && <span aria-hidden="true" style={{ fontSize: 9, fontWeight: 600, color: ds.inkMuted, textAlign: "center", whiteSpace: "nowrap", fontFamily: dsF.sans }}>{etiqueta}</span>}
      <button ref={ref} type="button" aria-label={aviso ? `${etiqueta} (aviso de carga)` : etiqueta} aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}
        style={{ position: "relative", width: "100%", height: ALTO_CELDA, boxSizing: "border-box", borderRadius: 10, background: ds.surface, border: `${abierto || aviso || (resaltar && tiene) ? 2 : 1}px solid ${alerta || aviso === "inconsistente" ? ds.danger : aviso === "fuera" ? ds.accent : abierto || (resaltar && tiene) ? ds.accent : ds.border}`, color: alerta || aviso === "inconsistente" ? ds.danger : aviso === "fuera" ? ds.accent : resaltar && tiene ? ds.accent : tiene ? ds.ink : ds.inkMuted, fontWeight: tiene ? 700 : 600, fontSize: 13, fontFamily: dsF.sans, cursor: "pointer", padding: 0 }}>
        {tiene ? valor : placeholder}
        {sufijo && tiene && <span style={{ position: "absolute", right: 5, bottom: 2, fontSize: 9, color: ds.inkMuted }}>{sufijo}</span>}
        {aviso && <span aria-hidden="true" style={{ position: "absolute", top: -7, right: -4, fontSize: 10, lineHeight: "14px", padding: "0 3px", borderRadius: 6, background: aviso === "inconsistente" ? ds.danger : ds.accent, color: ds.accentInk }}>⚠</span>}
      </button>
      {abierto && (
        <Desplegable ancla={ref} onCerrar={cerrar} ancho={330}>
          <Cabecera titulo={titulo || etiqueta} subtitulo={subtitulo} />
          {avisoInfo && !teclado && <BloqueAviso info={{ ...avisoInfo, estado: aviso }} cerrar={cerrar} />}
          {extra}
          {teclado ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus aria-label={`${etiqueta}: otro valor`} inputMode="numeric" value={borrador} onChange={(e) => setBorrador(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") confirmarTeclado(); }}
                style={{ flex: 1, height: 44, boxSizing: "border-box", borderRadius: 10, border: `1px solid ${ds.accent}`, background: ds.surface, color: ds.ink, fontSize: 18, fontWeight: 700, textAlign: "center", fontFamily: dsF.sans }} />
              <button type="button" onClick={confirmarTeclado} style={{ width: 64, height: 44, borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>OK</button>
            </div>
          ) : (
            <ListaOpciones opciones={todas} valor={valor} onElegir={elegir} etiqueta={etiqueta} />
          )}
          {pie}
        </Desplegable>
      )}
    </div>
  );
}

const TONOS = {
  normal: { border: `1px solid ${ds.border}`, color: ds.inkSecondary, background: "transparent" },
  activo: { border: `1px solid ${ds.accent}`, color: ds.accent, background: ds.accentSubtle, fontWeight: 700 },
  peligro: { border: `1px solid ${ds.danger}`, color: ds.danger, background: "transparent", fontWeight: 700 },
  vacio: { border: `1px dashed ${ds.border}`, color: ds.inkMuted, background: "transparent" },
};

// Etiqueta pequeña bajo el nombre que abre un desplegable (children = función
// que recibe "cerrar" y devuelve el contenido).
export function EtiquetaDesplegable({ rotulo, tono = "normal", ancho = 300, ariaLabel, children }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  return (
    <>
      <button ref={ref} type="button" aria-label={ariaLabel || rotulo} aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}
        style={{ height: 24, padding: "0 9px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: dsF.sans, whiteSpace: "nowrap", cursor: "pointer", ...TONOS[tono] }}>
        {rotulo}
      </button>
      {abierto && <Desplegable ancla={ref} onCerrar={() => setAbierto(false)} ancho={ancho}>{children(() => setAbierto(false))}</Desplegable>}
    </>
  );
}

export function EtiquetaAccion({ texto, onClick, ariaLabel }) {
  return (
    <button type="button" aria-label={ariaLabel || texto} onClick={onClick}
      style={{ height: 24, padding: "0 9px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: dsF.sans, whiteSpace: "nowrap", cursor: "pointer", ...TONOS.normal }}>
      {texto}
    </button>
  );
}

export function EtiquetaFija({ texto }) {
  return <span style={{ height: 24, padding: "0 9px", borderRadius: 8, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", background: ds.border, color: ds.ink, whiteSpace: "nowrap" }}>{texto}</span>;
}

export function EtiquetaMaterial({ tarea, onCambiar, disponibles, onAgregarMaterial, mostrarCarga }) {
  const sel = tarea.materiales || [];
  const rotulo = sel.length ? `${sel[0]}${sel.length > 1 ? ` +${sel.length - 1}` : ""} ▾` : "Material ▾";
  return (
    <EtiquetaDesplegable rotulo={rotulo} ariaLabel="Material" tono={sel.length ? "activo" : "vacio"} ancho={290}>
      {(cerrar) => <PanelMaterial tarea={tarea} onCambiar={onCambiar} disponibles={disponibles} onAgregarMaterial={onAgregarMaterial} mostrarCarga={mostrarCarga} cerrar={cerrar} />}
    </EtiquetaDesplegable>
  );
}

function PanelMaterial({ tarea, onCambiar, disponibles, onAgregarMaterial, mostrarCarga, cerrar }) {
  const [nuevo, setNuevo] = useState("");
  const sel = tarea.materiales || [];
  const alternar = (m) => onCambiar({ ...tarea, materiales: sel.includes(m) ? sel.filter((x) => x !== m) : [...sel, m] });
  const anadir = () => { if (nuevo.trim()) { onAgregarMaterial(nuevo.trim()); setNuevo(""); } };
  return (
    <>
      <Cabecera titulo="Material" subtitulo="Puedes marcar varios" />
      {mostrarCarga && (
        <div style={{ display: "flex" }}>
          <CampoSelect etiqueta="Resistencia" valor={tarea.tipoResistencia || "Peso libre"} onCambiar={(v) => onCambiar({ ...tarea, tipoResistencia: v })} opciones={[{ v: "Peso libre", t: "Peso libre" }, { v: "Elástica", t: "Elástica" }, { v: "Peso corporal", t: "Peso corporal" }]} />
        </div>
      )}
      <div role="listbox" aria-multiselectable="true" aria-label="Material" style={{ display: "flex", flexDirection: "column", gap: 2, padding: 4, border: `1px solid ${ds.border}`, borderRadius: 10, background: ds.surface, maxHeight: 220, overflowY: "auto", overscrollBehavior: "contain" }}>
        {disponibles.length === 0 && <span style={{ fontSize: 12, color: ds.inkMuted, padding: "8px 10px" }}>Aún no hay materiales dados de alta.</span>}
        {disponibles.map((m) => {
          const activo = sel.includes(m);
          return (
            <button key={m} type="button" role="option" aria-selected={activo} onClick={() => alternar(m)} style={{ flexShrink: 0, height: 38, padding: "0 12px", borderRadius: 8, border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: activo ? 700 : 600, background: activo ? ds.accent : "transparent", color: activo ? ds.accentInk : ds.ink, cursor: "pointer", fontFamily: dsF.sans }}>
              <span>{m}</span><span>{activo ? "☑" : "☐"}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") anadir(); }} placeholder="Añadir material nuevo…" aria-label="Material nuevo" style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", borderRadius: 10, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.ink, padding: "0 10px", fontSize: 16, fontFamily: dsF.sans }} />
        <button type="button" onClick={anadir} style={{ width: 44, height: 40, borderRadius: 10, border: `1px solid ${ds.border}`, background: "transparent", color: ds.accent, fontSize: 18, cursor: "pointer" }}>+</button>
      </div>
      <button type="button" onClick={cerrar} style={{ height: 40, borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Listo</button>
    </>
  );
}

export function EtiquetaTipo({ tarea, onCambiar }) {
  const plio = tarea.tipoMov === "pliometrico";
  return (
    <EtiquetaDesplegable rotulo={`${plio ? "Pliométrico" : "No pliométrico"} ▾`} ariaLabel="Tipo de movimiento" tono="activo" ancho={270}>
      {(cerrar) => (
        <>
          <Cabecera titulo="Tipo de movimiento" subtitulo="Potencia" />
          <ListaOpciones etiqueta="Tipo de movimiento" valor={plio ? "pliometrico" : "nopliometrico"} onElegir={(v) => { onCambiar({ ...tarea, tipoMov: v }); cerrar(); }}
            opciones={[{ v: "nopliometrico", t: "No pliométrico", nota: "30–70 %" }, { v: "pliometrico", t: "Pliométrico", nota: "≤30 %" }]} />
          <span style={{ fontSize: 11, color: ds.inkMuted, padding: "0 4px", lineHeight: 1.4 }}>Pliométrico: saltos con carga, lanzamientos. No pliométrico: sentadilla, press… Soriano et al., 2015 y 2017.</span>
        </>
      )}
    </EtiquetaDesplegable>
  );
}

function PanelNota({ tarea, onCambiar, cerrar }) {
  const [texto, setTexto] = useState(tarea.nota || "");
  return (
    <>
      <Cabecera titulo="Nota para el jugador" subtitulo="Opcional" />
      <textarea autoFocus aria-label="Nota" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} style={{ boxSizing: "border-box", width: "100%", borderRadius: 10, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.ink, padding: "10px 12px", fontSize: 16, lineHeight: 1.4, fontFamily: dsF.sans, resize: "none" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={() => { onCambiar({ ...tarea, nota: "" }); cerrar(); }} style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "none", background: "transparent", color: ds.inkSecondary, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Borrar</button>
        <button type="button" onClick={() => { onCambiar({ ...tarea, nota: texto.trim() }); cerrar(); }} style={{ height: 40, padding: "0 16px", borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
      </div>
    </>
  );
}

export function EtiquetaNota({ tarea, onCambiar }) {
  return (
    <EtiquetaDesplegable rotulo={tarea.nota ? "✎ Nota ▾" : "+ Nota ▾"} ariaLabel="Nota" tono={tarea.nota ? "activo" : "vacio"} ancho={300}>
      {(cerrar) => <PanelNota tarea={tarea} onCambiar={onCambiar} cerrar={cerrar} />}
    </EtiquetaDesplegable>
  );
}

export function EtiquetaAviso({ aviso, objetivo, onAplicar, onIgnorar }) {
  const rojo = aviso.estado === "inconsistente";
  const info = aviso.estado === "info";
  const sug = aviso.sugerido ? `RIR ${aviso.sugerido.rir}${aviso.sugerido.pct1rm != null ? ` · ${aviso.sugerido.pct1rm} %` : ""}` : "";
  const botonBase = { height: 34, borderRadius: 9, fontSize: 12.5, fontFamily: dsF.sans, cursor: "pointer" };
  return (
    <EtiquetaDesplegable rotulo={`${info ? "ℹ" : "⚠"} ${aviso.corto} ▾`} tono={rojo ? "peligro" : info ? "normal" : "activo"} ancho={330} ariaLabel="Aviso de carga">
      {(cerrar) => (
        <>
          <Cabecera titulo="Guía del objetivo" subtitulo={objetivo ? `${objetivo.etiqueta} · ${objetivo.rir.max == null ? `RIR ${objetivo.rir.min}+` : `RIR ${objetivo.rir.min}–${objetivo.rir.max}`}` : ""} />
          <div style={{ border: `1px solid ${rojo ? ds.danger : info ? ds.border : ds.accentBorderSubtle}`, background: rojo || info ? "transparent" : ds.accentSubtle, borderRadius: 10, padding: "8px 10px", fontSize: 12, lineHeight: 1.45, color: ds.ink, display: "flex", flexDirection: "column", gap: 7 }}>
            <span>{aviso.mensaje}</span>
            {sug && onAplicar && <button type="button" onClick={() => { onAplicar(); cerrar(); }} style={{ ...botonBase, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700 }}>Aplicar sugerido: {sug}</button>}
            {onIgnorar && <button type="button" onClick={() => { onIgnorar(); cerrar(); }} style={{ ...botonBase, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, fontWeight: 600 }}>Dejarlo así, es intencionado</button>}
          </div>
          {aviso.fuente && <span style={{ fontSize: 10.5, color: ds.inkMuted, padding: "0 4px" }}>{aviso.fuente}</span>}
        </>
      )}
    </EtiquetaDesplegable>
  );
}

export function FlechasTarea({ onSubir, onBajar, onEliminar }) {
  const boton = (etq, simbolo, onClick, color) => (
    <button type="button" aria-label={etq} title={etq} disabled={!onClick} onClick={onClick || undefined}
      style={{ width: 28, height: ALTO_CELDA, padding: 0, borderRadius: 8, border: `1px solid ${ds.border}`, background: "transparent", color: color || ds.inkSecondary, fontSize: 14, cursor: onClick ? "pointer" : "default", opacity: onClick ? 1 : 0.35 }}>
      {simbolo}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 4, width: ANCHO_FLECHAS, flexShrink: 0 }}>
      {boton("Subir tarea", "↑", onSubir)}
      {boton("Bajar tarea", "↓", onBajar)}
      {boton("Quitar tarea", "×", onEliminar, ds.danger)}
    </div>
  );
}
