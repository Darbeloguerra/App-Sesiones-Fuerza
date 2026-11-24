import React, { useState, useRef, useEffect } from "react";
import { ds, dsF } from "../core/designSystem.jsx";
import { api } from "../core/backend.js";
import { optimizarVideo, soportaOptimizarVideo } from "../core/optimizarVideo.js";

// ───────────────────────────────────────────────────────────────────────────
// Subida de vídeos de ejercicios desde el iPad.
//  · Cada vídeo se optimiza en el propio dispositivo (720p, sin audio) antes de
//    subirse, de uno en uno (ver core/optimizarVideo.js).
//  · Se sube a Supabase Storage (bucket público "videos") y el enlace se guarda en
//    el mismo campo de vídeo que ya usa la app (gif_url); YouTube sigue valiendo.
//  · Límite de 50 MB por archivo (plan gratuito de Supabase), comprobado sobre el
//    vídeo ya optimizado.
// ───────────────────────────────────────────────────────────────────────────

export const LIMITE_VIDEO_BYTES = 50 * 1024 * 1024;
const mb = (b) => `${(b / 1048576).toFixed(1).replace(".", ",")} MB`;
const seg = (d) => (d ? `${Math.round(d)} s` : "…");
const sinVideoDe = (e) => !(e.gif_url || Object.values(e.videos_variantes || {}).some(Boolean));
const extDe = (file) => (file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "mp4");

export function mensajeErrorSubida(e) {
  const m = String(e?.message || e || "");
  if (/row-level security|not authorized|unauthorized|403|permission/i.test(m)) return "No tienes permiso para subir vídeos. Comprueba que has entrado como entrenador y que el SQL de vídeos está aplicado en Supabase.";
  if (/bucket not found|not found|404/i.test(m)) return "Falta crear el espacio de vídeos en Supabase (SQL de vídeos).";
  if (/mime|not supported|invalid.*type/i.test(m)) return "Supabase no acepta este tipo de archivo. Debe ser MP4, WebM o MOV.";
  if (/too large|exceeded|payload|413|size/i.test(m)) return "El archivo supera el límite de tamaño de Supabase (50 MB).";
  return `No se pudo subir el vídeo: ${m || "error de conexión"}.`;
}

const chip = (extra = {}) => ({ fontSize: 11, fontWeight: 600, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", ...extra });
const chipOk = chip({ color: ds.success, borderColor: ds.successBorderSubtle });
const chipErr = chip({ color: ds.danger, borderColor: ds.dangerBorderSubtle, whiteSpace: "normal" });
const botonBase = { minHeight: 44, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: dsF.sans, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" };
const botonAcento = { ...botonBase, border: `1px solid ${ds.accentBorderSubtle}`, background: "transparent", color: ds.accent };
const botonSolido = { ...botonBase, border: "none", background: ds.accent, color: ds.accentInk, fontWeight: 700 };
const botonSuave = { ...botonBase, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary };

function Barra({ valor }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: ds.border, overflow: "hidden", minWidth: 90, flex: 1 }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, valor))}%`, background: ds.accent, transition: "width .15s" }} />
    </div>
  );
}

// ---------- Cola de vídeos: optimiza de uno en uno y sube ----------
function useColaVideos({ ejercicios, onGuardar }) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const colaRef = useRef([]);
  const corriendoRef = useRef(false);
  const contRef = useRef(0);
  const ejerciciosRef = useRef(ejercicios);
  ejerciciosRef.current = ejercicios;
  const onGuardarRef = useRef(onGuardar);
  onGuardarRef.current = onGuardar;

  const fijar = (lista) => {
    itemsRef.current = lista;
    setItems(lista);
  };
  const actualizar = (id, cambios) => fijar(itemsRef.current.map((x) => (x.id === id ? { ...x, ...cambios } : x)));

  useEffect(
    () => () => {
      itemsRef.current.forEach((x) => URL.revokeObjectURL(x.url));
    },
    []
  );

  const subir = async (id) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it) return;
    const origen = it.out || it.file;
    const ext = it.out ? it.ext : extDe(it.file);
    if (origen.size > LIMITE_VIDEO_BYTES) {
      actualizar(id, { estado: "error", error: `Pesa ${mb(origen.size)}; el límite es 50 MB.` });
      return;
    }
    let url = it.urlSubida;
    if (!url) {
      actualizar(id, { estado: "subiendo", error: "" });
      try {
        const r = await api.subirVideoEjercicio(origen, ext);
        url = r.url;
        actualizar(id, { urlSubida: url });
      } catch (e) {
        actualizar(id, { estado: "error", error: mensajeErrorSubida(e) });
        return;
      }
    }
    const ej = ejerciciosRef.current.find((x) => x.id === it.ejId);
    if (!ej) {
      actualizar(id, { estado: "error", error: "Ese ejercicio ya no existe." });
      return;
    }
    actualizar(id, { estado: "guardando", error: "" });
    let ok = false;
    try {
      ok = await onGuardarRef.current(ej, url);
    } catch {
      ok = false;
    }
    actualizar(id, ok ? { estado: "ok", error: "" } : { estado: "error", error: "Se subió, pero no se pudo guardar el enlace. Reintenta." });
  };

  const procesar = async () => {
    if (corriendoRef.current) return;
    corriendoRef.current = true;
    while (colaRef.current.length) {
      const id = colaRef.current.shift();
      const it = itemsRef.current.find((x) => x.id === id);
      if (!it) continue;
      actualizar(id, { estado: "opt", pOpt: 0 });
      let ultimo = 0;
      try {
        const { blob, ext } = await optimizarVideo(it.file, (p) => {
          const ahora = Date.now();
          if (ahora - ultimo > 250) {
            ultimo = ahora;
            actualizar(id, { pOpt: p });
          }
        });
        actualizar(id, { estado: "listo", out: blob, ext, pOpt: 100, optError: "" });
        if (it.auto) subir(id);
      } catch (e) {
        const cabe = it.file.size <= LIMITE_VIDEO_BYTES;
        if (cabe) {
          actualizar(id, { estado: "listo", out: null, optError: `${e.message} Se subirá tal cual.` });
          if (it.auto) subir(id);
        } else {
          actualizar(id, { estado: "error", error: `${e.message} Pesa ${mb(it.file.size)} y el límite es 50 MB.` });
        }
      }
    }
    corriendoRef.current = false;
  };

  const anadir = (files, ejId = "", auto = false) => {
    const nuevos = [...files].map((file) => ({
      id: `v${++contRef.current}`,
      file,
      url: URL.createObjectURL(file),
      dur: 0,
      ejId,
      auto,
      estado: "cola",
      pOpt: 0,
      out: null,
      ext: "",
      optError: "",
      error: "",
      urlSubida: "",
    }));
    fijar([...itemsRef.current, ...nuevos]);
    nuevos.forEach((n) => colaRef.current.push(n.id));
    procesar();
  };
  const quitar = (id) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (it) URL.revokeObjectURL(it.url);
    fijar(itemsRef.current.filter((x) => x.id !== id));
  };
  const quitarGuardados = () => {
    itemsRef.current.filter((x) => x.estado === "ok").forEach((x) => URL.revokeObjectURL(x.url));
    fijar(itemsRef.current.filter((x) => x.estado !== "ok"));
  };
  return { items, anadir, quitar, quitarGuardados, subir, actualizar };
}

function Miniatura({ it, onDur, pequena = false }) {
  return (
    <video
      src={`${it.url}#t=0.5`}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => onDur(it.id, e.currentTarget.duration)}
      style={{ width: pequena ? 64 : 96, height: pequena ? 36 : 54, borderRadius: 8, background: "#000", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

function tamanoTxt(it) {
  if (!it.out) return mb(it.file.size);
  return (
    <>
      {mb(it.file.size)} → <b style={{ color: ds.success }}>{mb(it.out.size)}</b>
    </>
  );
}

function EstadoItem({ it }) {
  if (it.estado === "cola") return <span style={chip()}>En cola</span>;
  if (it.estado === "opt")
    return (
      <>
        <Barra valor={it.pOpt} />
        <span style={chip()}>Optimizando {Math.round(it.pOpt)} %</span>
      </>
    );
  if (it.estado === "subiendo") return <span style={chip({ color: ds.accent, borderColor: ds.accentBorderSubtle })}>Subiendo…</span>;
  if (it.estado === "guardando") return <span style={chip()}>Guardando…</span>;
  if (it.estado === "ok") return <span style={chipOk}>Guardado</span>;
  if (it.estado === "error") return <span style={chipErr}>{it.error}</span>;
  if (it.optError) return <span style={chipErr}>{it.optError}</span>;
  return null;
}

// Lista del prototipo: ejercicios sin vídeo, con enlace pegado o vídeo subido.
export function ListaEnlacesVideoReal({ ejercicios, onGuardar }) {
  const [borradores, setBorradores] = useState({});
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const { items, anadir, quitar, quitarGuardados, subir, actualizar } = useColaVideos({ ejercicios, onGuardar });
  const sin = ejercicios.filter(sinVideoDe);
  const lote = items.filter((x) => !x.auto);
  const suelto = (ejId) => items.find((x) => x.auto && x.ejId === ejId);
  const onDur = (id, d) => actualizar(id, { dur: d });
  const usados = new Set(lote.map((x) => x.ejId).filter(Boolean));
  const listos = lote.filter((x) => x.ejId && x.estado === "listo").length;
  const enProceso = lote.some((x) => x.estado === "subiendo" || x.estado === "guardando");
  const optimizando = lote.filter((x) => x.estado === "cola" || x.estado === "opt").length;
  const conErrorReintentable = lote.filter((x) => x.estado === "error" && (x.urlSubida || (x.out || x.file).size <= LIMITE_VIDEO_BYTES)).length;
  const hayGuardados = lote.some((x) => x.estado === "ok");

  const asignarEnOrden = () => {
    const libres = sin.filter((e) => !usados.has(e.id));
    lote
      .filter((x) => !x.ejId && x.estado !== "ok" && x.estado !== "error")
      .forEach((x) => {
        const e = libres.shift();
        if (e) actualizar(x.id, { ejId: e.id });
      });
  };

  if (!sin.length && !lote.length) return <div style={{ fontSize: 13, color: ds.inkSecondary, padding: 12 }}>Todos los ejercicios tienen vídeo. 🎉</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: ds.inkSecondary, flex: "1 1 240px" }}>{sin.length} ejercicios sin vídeo — pega un enlace (YouTube o vídeo directo) o sube el vídeo desde el iPad.</div>
        <label style={{ ...botonSolido, cursor: "pointer" }}>
          Subir varios vídeos
          <input
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(ev) => {
              anadir(ev.target.files);
              ev.target.value = "";
            }}
          />
        </label>
      </div>
      {!soportaOptimizarVideo() && (
        <div style={{ fontSize: 11.5, color: ds.warning }}>Este navegador no puede optimizar vídeos: solo se subirán tal cual los que pesen menos de 50 MB.</div>
      )}
      {error && <div style={{ color: ds.danger, fontSize: 12 }}>{error}</div>}

      {lote.length > 0 && (
        <div style={{ border: `1.5px solid ${ds.accent}`, background: ds.accentSubtle, borderRadius: 13, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 13, color: ds.accent }}>Vídeos elegidos ({lote.length})</b>
          <div style={{ fontSize: 12, color: ds.inkSecondary }}>
            Asigna cada vídeo a su ejercicio. Los que ya están en otra fila no se repiten.{optimizando ? ` ${optimizando} optimizándose: no cierres la pantalla.` : ""}
          </div>
          {lote.map((x) => (
            <div key={x.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 10, padding: 8 }}>
              <Miniatura it={x} onDur={onDur} />
              <div style={{ flex: "1 1 150px", minWidth: 0, fontSize: 12, color: ds.inkSecondary }}>
                <b style={{ display: "block", color: ds.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.file.name}</b>
                {tamanoTxt(x)} · {seg(x.dur)}
              </div>
              {x.estado === "ok" ? (
                <span style={chip()}>{(ejercicios.find((e) => e.id === x.ejId) || {}).nombre || "Guardado"}</span>
              ) : (
                <select
                  aria-label="Ejercicio"
                  value={x.ejId}
                  disabled={x.estado === "subiendo" || x.estado === "guardando"}
                  onChange={(ev) => actualizar(x.id, { ejId: ev.target.value })}
                  style={{ minHeight: 44, flex: "1 1 180px", minWidth: 0, background: ds.canvas, color: ds.ink, border: `1px solid ${ds.border}`, borderRadius: 8, padding: "0 8px", fontSize: 13, fontFamily: dsF.sans }}
                >
                  <option value="">¿Qué ejercicio?</option>
                  {sin
                    .filter((e) => e.id === x.ejId || !usados.has(e.id))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                </select>
              )}
              <EstadoItem it={x} />
              {x.estado === "error" && (x.urlSubida || (x.out || x.file).size <= LIMITE_VIDEO_BYTES) && x.ejId && (
                <button type="button" style={botonSuave} onClick={() => subir(x.id)}>
                  Reintentar
                </button>
              )}
              {x.estado !== "subiendo" && x.estado !== "guardando" && x.estado !== "ok" && (
                <button type="button" aria-label="Quitar" style={botonSuave} onClick={() => quitar(x.id)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={botonSuave} disabled={enProceso} onClick={asignarEnOrden}>
                Asignar en orden
              </button>
              {hayGuardados && (
                <button type="button" style={botonSuave} onClick={quitarGuardados}>
                  Quitar los guardados
                </button>
              )}
            </div>
            <button
              type="button"
              style={{ ...botonSolido, opacity: !listos || enProceso ? 0.4 : 1 }}
              disabled={!listos || enProceso}
              onClick={() => lote.filter((x) => x.ejId && x.estado === "listo").forEach((x) => subir(x.id))}
            >
              Subir {listos || ""} vídeo{listos === 1 ? "" : "s"}
            </button>
          </div>
          {conErrorReintentable > 0 && <div style={{ fontSize: 12, color: ds.inkSecondary }}>{conErrorReintentable} con error: reinténtalos o quítalos.</div>}
        </div>
      )}

      {sin.map((e) => {
        const s = suelto(e.id);
        return (
          <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 8px", border: `1px solid ${ds.border}`, borderRadius: 8 }}>
            <div style={{ flex: "1 1 170px", minWidth: 0 }}>
              <div style={{ fontSize: 13, color: ds.ink }}>{e.nombre}</div>
              <div style={{ fontSize: 10.5, color: ds.inkMuted, fontFamily: dsF.mono }}>{[e.bloque, ...(e.tags_descriptivos || [])].filter(Boolean).join(" · ")}</div>
            </div>
            {s ? (
              <>
                <Miniatura it={s} onDur={onDur} pequena />
                <div style={{ flex: "1 1 120px", fontSize: 12, color: ds.inkSecondary }}>{tamanoTxt(s)}</div>
                <EstadoItem it={s} />
                {s.estado === "error" && (s.urlSubida || (s.out || s.file).size <= LIMITE_VIDEO_BYTES) && (
                  <button type="button" style={botonSuave} onClick={() => subir(s.id)}>
                    Reintentar
                  </button>
                )}
                {(s.estado === "error" || s.estado === "listo" || s.estado === "cola" || s.estado === "opt") && (
                  <button type="button" aria-label="Quitar" style={botonSuave} onClick={() => quitar(s.id)}>
                    ✕
                  </button>
                )}
              </>
            ) : (
              <>
                <input
                  aria-label={`Enlace de ${e.nombre}`}
                  value={borradores[e.id] || ""}
                  onChange={(ev) => setBorradores((b) => ({ ...b, [e.id]: ev.target.value }))}
                  placeholder="https://youtu.be/…"
                  style={{ flex: "2 1 200px", minHeight: 44, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 8, color: ds.ink, padding: "0 10px", fontSize: 13, fontFamily: dsF.sans }}
                />
                <button
                  type="button"
                  disabled={!(borradores[e.id] || "").trim() || guardando === e.id}
                  onClick={async () => {
                    setGuardando(e.id);
                    setError("");
                    const ok = await onGuardar(e, borradores[e.id].trim());
                    if (!ok) setError("No se pudo guardar. Inténtalo de nuevo.");
                    setGuardando("");
                  }}
                  style={{ ...botonAcento, opacity: !(borradores[e.id] || "").trim() || guardando === e.id ? 0.4 : 1 }}
                >
                  {guardando === e.id ? "Guardando…" : "Guardar"}
                </button>
                <label style={{ ...botonAcento, cursor: "pointer" }}>
                  Subir vídeo
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(ev) => {
                      const f = ev.target.files && ev.target.files[0];
                      ev.target.value = "";
                      if (f) anadir([f], e.id, true);
                    }}
                  />
                </label>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Botón «Subir vídeo» para el panel de un ejercicio (vídeo genérico o de variante):
// optimiza, sube y devuelve el enlace con onSubido(url). El enlace queda en el campo;
// se conserva al guardar el ejercicio.
export function BotonSubirVideo({ onSubido }) {
  const [fase, setFase] = useState("reposo"); // reposo | opt | subiendo
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const elegir = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    setMensaje({ tipo: "", texto: "" });
    let origen = file;
    let ext = extDe(file);
    setFase("opt");
    setProgreso(0);
    try {
      const r = await optimizarVideo(file, (p) => setProgreso(Math.round(p)));
      origen = r.blob;
      ext = r.ext;
    } catch (e) {
      if (file.size > LIMITE_VIDEO_BYTES) {
        setFase("reposo");
        setMensaje({ tipo: "error", texto: `${e.message} Pesa ${mb(file.size)} y el límite es 50 MB.` });
        return;
      }
    }
    if (origen.size > LIMITE_VIDEO_BYTES) {
      setFase("reposo");
      setMensaje({ tipo: "error", texto: `Pesa ${mb(origen.size)}; el límite es 50 MB.` });
      return;
    }
    setFase("subiendo");
    try {
      const r = await api.subirVideoEjercicio(origen, ext);
      setFase("reposo");
      setMensaje({ tipo: "ok", texto: `Subido (${mb(origen.size)}). Pulsa Guardar para conservar el enlace.` });
      onSubido(r.url);
    } catch (e) {
      setFase("reposo");
      setMensaje({ tipo: "error", texto: mensajeErrorSubida(e) });
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label style={{ ...botonAcento, cursor: fase === "reposo" ? "pointer" : "default", opacity: fase === "reposo" ? 1 : 0.5 }}>
        {fase === "opt" ? `Optimizando ${progreso} %` : fase === "subiendo" ? "Subiendo…" : "Subir vídeo"}
        <input type="file" accept="video/*" hidden disabled={fase !== "reposo"} onChange={elegir} />
      </label>
      {mensaje.texto && <span style={{ fontSize: 11.5, color: mensaje.tipo === "error" ? ds.danger : ds.success }}>{mensaje.texto}</span>}
    </div>
  );
}
