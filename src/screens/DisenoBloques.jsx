import React, { useRef, useState } from "react";
import { ds, dsF } from "../core/designSystem.jsx";
import { recuperacionRecomendadaSerieSeg, estimarTareaEfectivaSeg, estimarTareaConRecuperacionSeg, formatearSegundosDiseno } from "../calc/duracionTarea.js";

// Piezas del diseñador de sesión rediseñado: lista de bloques con casillas y
// arrastre, partes de Activación, pestañas para pantallas estrechas y caja de
// recuperación recomendada. Son presentacionales: el estado vive en
// DisenoSesionReal.

export const NOMBRE_BLOQUE = { activacion: "Activación", preventivo: "Preventivo", core: "Core", resistencia: "Resistencia", cmj: "CMJ", fuerza: "Fuerza" };

function Casilla({ on, medio = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        flexShrink: 0,
        boxSizing: "border-box",
        border: `1.5px solid ${on || medio ? ds.accent : ds.inkMuted}`,
        background: on ? ds.accent : medio ? ds.accentSubtle : "transparent",
        color: on ? ds.accentInk : ds.accent,
        display: "grid",
        placeItems: "center",
        fontSize: 14,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {on ? "✓" : medio ? "–" : ""}
    </span>
  );
}

function AvisoPunto({ n }) {
  if (!n) return null;
  return <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: ds.warning || ds.danger }}>⚠ {n}</span>;
}

function PanelConfirmar({ texto, onBorrar, onCancelar, etiquetaBorrar = "Borrar contenido" }) {
  return (
    <div role="alert" style={{ margin: "0 8px 8px", padding: "8px 10px", borderRadius: 9, border: `1px solid ${ds.danger}`, background: ds.bgElevated, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: ds.inkSecondary, lineHeight: 1.4 }}>
      <span>{texto}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={onBorrar} style={{ minHeight: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${ds.danger}`, background: "transparent", color: ds.danger, fontWeight: 700, fontSize: 12.5, fontFamily: dsF.sans, cursor: "pointer" }}>{etiquetaBorrar}</button>
        <button type="button" onClick={onCancelar} style={{ minHeight: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${ds.border}`, background: "transparent", color: ds.ink, fontWeight: 600, fontSize: 12.5, fontFamily: dsF.sans, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

// Lista de bloques: casilla + nombre (+ avisos). Los marcados se pueden
// arrastrar desde el asa; la hoja de pantallas estrechas usa flechas.
// Activación muestra debajo sus tres partes, también seleccionables.
export function ListaBloquesDiseno({
  orden,
  marcado,
  foco,
  partes,
  subAct,
  avisos,
  avisosParte,
  confirmar,
  textoConfirmar,
  onAlternar,
  onAlternarParte,
  onFoco,
  onFocoParte,
  onReordenar,
  onBorrar,
  onCancelar,
  conFlechas = false,
  bloqueado = false,
}) {
  const filas = useRef({});
  const [arrastrando, setArrastrando] = useState(null);

  const moverA = (id, destino) => {
    const desde = orden.indexOf(id);
    if (desde < 0 || destino === desde) return;
    const nuevo = orden.slice();
    nuevo.splice(desde, 1);
    nuevo.splice(destino, 0, id);
    onReordenar(nuevo);
  };
  const alMover = (ev) => {
    if (!arrastrando) return;
    const y = ev.clientY;
    let destino = orden.length - 1;
    for (let k = 0; k < orden.length; k++) {
      const el = filas.current[orden[k]];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        destino = k;
        break;
      }
    }
    moverA(arrastrando, destino);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, pointerEvents: bloqueado ? "none" : undefined }} onPointerMove={alMover} onPointerUp={() => setArrastrando(null)} onPointerCancel={() => setArrastrando(null)}>
      {orden.map((id, i) => {
        const on = marcado(id);
        const enFoco = on && (foco === id);
        const arrastrado = arrastrando === id;
        return (
          <div
            key={id}
            ref={(el) => { filas.current[id] = el; }}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: 11,
              border: `1px ${on ? "solid" : "dashed"} ${enFoco ? ds.accent : ds.border}`,
              background: enFoco ? ds.accentSubtle : on ? ds.surface : "transparent",
              boxShadow: arrastrado ? "0 10px 28px rgba(0,0,0,0.5)" : undefined,
              opacity: arrastrado ? 0.9 : 1,
              position: "relative",
              zIndex: arrastrado ? 3 : undefined,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
              {!conFlechas && (
                <button
                  type="button"
                  aria-label={`Arrastrar ${NOMBRE_BLOQUE[id]}`}
                  onPointerDown={(ev) => { if (!on) return; ev.currentTarget.setPointerCapture?.(ev.pointerId); setArrastrando(id); }}
                  style={{ width: 30, height: 40, border: 0, background: "transparent", color: ds.inkMuted, fontSize: 16, letterSpacing: -2, touchAction: "none", cursor: on ? "grab" : "default", flexShrink: 0, visibility: on ? "visible" : "hidden" }}
                >
                  ⋮⋮
                </button>
              )}
              <button type="button" aria-label={`Seleccionar ${NOMBRE_BLOQUE[id]}`} aria-pressed={on} onClick={() => onAlternar(id)} style={{ border: 0, background: "transparent", padding: conFlechas ? "0 4px 0 10px" : "0 4px", height: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>
                <Casilla on={on} />
              </button>
              <button type="button" onClick={() => (on ? onFoco(id) : onAlternar(id))} style={{ flex: 1, minWidth: 0, textAlign: "left", border: 0, background: "transparent", height: 44, padding: "0 6px", color: on ? ds.ink : ds.inkSecondary, fontWeight: on ? 700 : 500, fontSize: 14, fontFamily: dsF.sans, cursor: "pointer" }}>
                {NOMBRE_BLOQUE[id]}
              </button>
              <AvisoPunto n={on ? avisos[id] : 0} />
              {conFlechas && (
                <div style={{ display: "flex", gap: 4, padding: "0 8px" }}>
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => moverA(id, i - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${ds.border}`, background: "transparent", color: ds.ink, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                  <button type="button" aria-label="Bajar" disabled={i === orden.length - 1} onClick={() => moverA(id, i + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${ds.border}`, background: "transparent", color: ds.ink, opacity: i === orden.length - 1 ? 0.3 : 1 }}>↓</button>
                </div>
              )}
            </div>
            {confirmar === id && <PanelConfirmar texto={textoConfirmar} onBorrar={() => onBorrar(id)} onCancelar={onCancelar} />}
            {id === "activacion" && on && (
              <div style={{ display: "flex", flexDirection: "column", padding: conFlechas ? "0 8px 8px 38px" : "0 8px 8px 38px", gap: 2 }}>
                {partes.map((p) => {
                  const act = !!subAct[p.id];
                  const f = foco === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <button type="button" onClick={() => onAlternarParte(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, height: 38, borderRadius: 8, padding: "0 6px", cursor: "pointer", border: 0, background: f ? ds.accentSubtle : "transparent", textAlign: "left", width: "100%" }}>
                        <Casilla on={act} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: act ? ds.ink : ds.inkMuted, fontFamily: dsF.sans }}>{p.nombre}</span>
                        <AvisoPunto n={act ? avisosParte?.[p.id] : 0} />
                      </button>
                      {confirmar === `sub:${p.id}` && <PanelConfirmar texto={textoConfirmar} onBorrar={() => onBorrar(`sub:${p.id}`)} onCancelar={onCancelar} etiquetaBorrar="Borrar ejercicios" />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Pestañas para pantallas estrechas: un chip por bloque marcado y «＋ Bloques»
// que abre la hoja con casillas y flechas.
export function PestanasBloquesDiseno({ ids, foco, avisos, onFoco, onMas }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0" }}>
      {ids.map((id) => {
        const f = foco === id;
        return (
          <button key={id} type="button" onClick={() => onFoco(id)} style={{ flexShrink: 0, height: 34, padding: "0 12px", borderRadius: 9, border: `1px solid ${f ? ds.accent : ds.border}`, background: f ? ds.accent : "transparent", color: f ? ds.accentInk : ds.inkSecondary, fontWeight: 600, fontSize: 12.5, fontFamily: dsF.sans, whiteSpace: "nowrap", cursor: "pointer" }}>
            {NOMBRE_BLOQUE[id]}{avisos[id] ? " ⚠" : ""}
          </button>
        );
      })}
      <button type="button" onClick={onMas} style={{ flexShrink: 0, height: 34, padding: "0 12px", borderRadius: 9, border: `1px dashed ${ds.accentBorderSubtle || ds.accent}`, background: "transparent", color: ds.accent, fontWeight: 600, fontSize: 12.5, fontFamily: dsF.sans, whiteSpace: "nowrap", cursor: "pointer" }}>
        ＋ Bloques
      </button>
    </div>
  );
}

export function HojaBloquesDiseno({ abierta, onCerrar, children }) {
  if (!abierta) return null;
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(ev) => ev.stopPropagation()} className="ds-reset" style={{ width: "100%", maxWidth: 560, maxHeight: "88dvh", overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: "20px 20px 0 0", padding: 12, paddingBottom: "calc(12px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 15 }}>Bloques de la sesión</b>
          <button type="button" onClick={onCerrar} style={{ minHeight: 40, padding: "0 16px", borderRadius: 10, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700, fontFamily: dsF.sans, cursor: "pointer" }}>Listo</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Recuperación RECOMENDADA por serie (nunca se suma a la duración de la
// sesión). Siempre en segundos y siempre «por serie»; con la duración total si
// se respeta. En superserie se aclara que es la pausa tras completar A y B.
export function CajaRecuperacion({ tarea, bloque, etiquetaPar = "" }) {
  const series = Number(tarea.series);
  const trabajo = estimarTareaEfectivaSeg(tarea);
  if (!(series > 1) || !trabajo) return null;
  const rc = recuperacionRecomendadaSerieSeg(tarea, bloque);
  const total = estimarTareaConRecuperacionSeg(tarea, bloque);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", alignItems: "baseline", padding: "8px 10px", borderRadius: 9, border: `1px dashed ${ds.border}`, color: ds.inkSecondary, fontSize: 12, lineHeight: 1.4, flex: "1 1 100%" }}>
      <span style={{ color: ds.accent, fontWeight: 600 }}>Recuperación recomendada por serie{etiquetaPar ? ` · tras completar ${etiquetaPar}a y ${etiquetaPar}b` : ""}</span>
      <span style={{ color: ds.ink, fontWeight: 700 }}>{rc} s</span>
      <span style={{ flex: "1 1 100%", fontSize: 11, color: ds.inkMuted }}>
        Duración efectiva de la tarea: <b style={{ color: ds.ink }}>{formatearSegundosDiseno(trabajo)}</b>. Duración total con la recuperación recomendada: <b style={{ color: ds.ink }}>{formatearSegundosDiseno(total)}</b>. La recuperación no se incluye en la duración de la sesión.
      </span>
    </div>
  );
}

// Superserie: las tareas enlazadas van juntas en un recuadro, numeradas 1a/1b.
export function GrupoSuperserie({ etiquetas, children }) {
  return (
    <div style={{ border: `1.5px solid ${ds.accent}`, borderRadius: 13, padding: 8, display: "flex", flexDirection: "column", gap: 6, background: ds.accentSubtle }}>
      <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: ds.accent, padding: "0 4px" }}>Superserie · se alternan {etiquetas.join(" y ")}</div>
      {children}
    </div>
  );
}

// Agrupa índices consecutivos enlazados por alternaCon (misma regla que
// datosSuperserie): [[0], [1, 2], [3]].
export function gruposSuperserie(tareas, datos) {
  const grupos = [];
  tareas.forEach((_, i) => {
    if (i > 0 && datos[i].conAnt && grupos.length) grupos[grupos.length - 1].push(i);
    else grupos.push([i]);
  });
  return grupos;
}

export function TituloParte({ titulo, minutos, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <b style={{ fontSize: 13, color: ds.ink }}>{titulo}</b>
      {minutos > 0 && <span style={{ fontFamily: dsF.mono, fontSize: 11.5, color: ds.inkSecondary }}>~{minutos} min</span>}
      {extra}
    </div>
  );
}

// Caja de una parte de bloque (Cardiovascular, Movilidad, Ejercicios…): título,
// minutos efectivos a la derecha y contenido dentro de un recuadro.
export function ParteCaja({ titulo, minutos, extra, id, children }) {
  return (
    <div id={id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: `1px solid ${ds.border}`, borderRadius: 11, background: ds.bgElevated }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, flex: 1, color: ds.ink, fontFamily: dsF.sans }}>{titulo}</b>
        {minutos > 0 && <span style={{ fontSize: 12, color: ds.inkSecondary }}>~{minutos} min</span>}
        {extra}
      </div>
      {children}
    </div>
  );
}

// Tarjeta de bloque del panel derecho: título, resumen a la derecha y flecha.
// Abierta lleva el borde de acento; solo la enfocada muestra su contenido.
export function TarjetaBloque({ abierto, onToggle, titulo, resumen, avisos = 0, children }) {
  return (
    <section style={{ border: `1px solid ${abierto ? ds.accent : ds.border}`, borderRadius: 13, background: ds.surface }}>
      <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 50, padding: "0 14px", border: 0, background: "transparent", textAlign: "left", cursor: "pointer", color: ds.ink }}>
        <span style={{ fontFamily: dsF.display, fontWeight: 800, fontSize: 15, flex: 1 }}>{titulo}</span>
        <span style={{ fontSize: 12, color: ds.inkSecondary }}>{resumen}</span>
        {avisos > 0 && <span style={{ fontSize: 12, color: ds.warning || ds.danger, fontWeight: 700, whiteSpace: "nowrap" }}>⚠ {avisos}</span>}
        <span style={{ fontSize: 13, color: abierto ? ds.accent : ds.inkMuted }}>{abierto ? "▾" : "▸"}</span>
      </button>
      {abierto && <div style={{ padding: "2px 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>}
    </section>
  );
}

export function VacioParte({ children }) {
  return <div style={{ border: `1px dashed ${ds.border}`, borderRadius: 10, padding: 14, color: ds.inkSecondary, textAlign: "center", fontSize: 13 }}>{children}</div>;
}
