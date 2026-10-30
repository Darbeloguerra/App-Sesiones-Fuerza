import React, { useState } from "react";
import { ChevronLeft, Heart, Play, Plus, Trash2, Dumbbell, Target, Zap, RefreshCw, Activity, TrendingUp, ClipboardList } from "lucide-react";
import { ds, dsF, dsR, dsSh, DsButton, DsInput } from "../core/designSystem.jsx";
import { useAnchoVentana } from "../core/layout.jsx";
import { LoadingBlock, VideoEmbed, TagChipReal, campoSelectReal, TAGS_DESCRIPTIVOS_BIBLIOTECA, TAGS_MOVILIDAD, SelectorZonaRegion, zonaDeTags, regionDeTags, tagsDeZonaRegion } from "../core/components.jsx";
import { PantallaEntrenadorAncha } from "../core/layoutEntrenador.jsx";
import {
  useCategoriasPreventivas,
  useEntityList,
  useMaterialesDisponibles,
  usePlayers,
  useBootstrapProgramacion,
  agruparPlantillas,
  formatearDetalleTareaCoach,
  claveVideoVariante,
  miniaturaTarea,
  extractYouTubeId,
  esVideoDirecto,
  invalidateBootstrapCache,
  destinatariosEfectivosSesion,
  etiquetaDestinoSesion,
} from "../core/hooks.js";
import { todayStr, fmtHaceDias } from "../calc/fechas.js";
import { DisenoSesionReal } from "./DisenoSesion.jsx";

const BLOQUES_BIBLIOTECA = ["Fuerza", "Específicas", "Core", "Movilidad", "Preventivo", "Resistencia"];
// TAGS_DESCRIPTIVOS_BIBLIOTECA ahora en src/core/components.jsx — importada
// arriba (también usada por el Diseñador de sesiones).
const TIPOS_TEJIDO_BIBLIOTECA = ["Muscular", "Tendinosa", "Articular"];
// Naturaleza: solo tiene sentido dentro del bloque "Fuerza" (mockup v2) —
// distingue un movimiento de fuerza general de uno específico del deporte
// (p. ej. una zancada búlgara orientada al gesto de cambio de dirección).
const NATURALEZA_BIBLIOTECA = ["General", "Específica del deporte"];
// Lateralidad del ejercicio en sí (distinto de tareas.lateralidad, que es la
// elegida al añadirlo a una sesión concreta, y distinto de sin_lateralidad,
// que oculta esta etiqueta por completo cuando no aplica, p. ej. bici estática).
const LATERALIDAD_BIBLIOTECA = ["Bilateral", "Unilateral"];

// TagChipReal y campoSelectReal ahora en src/core/components.jsx —
// importadas arriba.

const btnIconoReal = { background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, color: ds.inkMuted, width: 26, height: 26, cursor: "pointer", fontSize: 12.5 };

// Un color/ícono decorativo por bloque, para que la miniatura de cada
// tarjeta dé una pista visual del tipo de trabajo antes de leer el texto —
// inspirado en la rejilla del mockup (gradiente + icono central), pero
// atado al campo real "bloque" en vez de a un color fijo por ejercicio.
const BLOQUE_COLOR_REAL = {
  Fuerza: ds.chart2,
  Específicas: ds.chart3,
  Core: ds.warning,
  Movilidad: ds.success,
  Preventivo: ds.accent,
  Resistencia: ds.chart1,
};
const BLOQUE_ICONO_REAL = {
  Fuerza: Dumbbell,
  Específicas: Target,
  Core: Zap,
  Movilidad: RefreshCw,
  Preventivo: Activity,
  Resistencia: TrendingUp,
};

function TagBibliotecaReal({ color = ds.inkSecondary, solido, children }) {
  return (
    <span
      style={{
        fontFamily: dsF.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        borderRadius: dsR.full,
        padding: "2px 7px",
        whiteSpace: "nowrap",
        color: solido ? color : color,
        background: solido ? `${color}22` : "transparent",
        border: solido ? "none" : `1px solid ${ds.border}`,
      }}
    >
      {children}
    </span>
  );
}

function MiniaturaEjercicioReal({ ejercicio, color, Icono, variantesCount, personalizado }) {
  const url = ejercicio.gif_url;
  const miniatura = url ? miniaturaTarea(url) : null;
  const tieneVideo = !!url && (extractYouTubeId(url) || esVideoDirecto(url));
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4 / 3",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${color}, ${ds.surfaceRaised})`,
      }}
    >
      {miniatura ? (
        <img src={miniatura} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Icono size={30} color="#fff" style={{ opacity: 0.5 }} />
      )}
      {tieneVideo && (
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 10,
            width: 22,
            height: 22,
            borderRadius: dsR.full,
            background: "rgba(10,18,32,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={10} color="#fff" fill="#fff" />
        </div>
      )}
      {variantesCount > 0 && (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            fontFamily: dsF.mono,
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: dsR.full,
            background: "rgba(10,18,32,0.6)",
            color: "#fff",
          }}
        >
          {variantesCount} variante{variantesCount > 1 ? "s" : ""}
        </div>
      )}
      {personalizado && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            fontFamily: dsF.mono,
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: dsR.full,
            background: ds.accent,
            color: ds.accentInk,
          }}
        >
          Personalizado
        </div>
      )}
    </div>
  );
}

// Tarjeta de familia: la matriz arriba con su miniatura y etiquetas (como
// en el mockup), y si tiene variantes, sus nombres justo debajo dentro de
// la misma tarjeta — así la rejilla visual del mockup convive con el
// agrupamiento matriz+variantes que ya funcionaba en la lista real.
function TarjetaFamiliaEjercicioReal({ matriz, variantes, categorias, onEditar, onCrearVariante, onToggleFavorito }) {
  const color = BLOQUE_COLOR_REAL[matriz.bloque] || ds.chart2;
  const Icono = BLOQUE_ICONO_REAL[matriz.bloque] || Dumbbell;
  const nombreCategoria = categorias.find((c) => c.id === matriz.categoria_preventiva_id)?.nombre;
  const botonReset = { display: "block", width: "100%", background: "transparent", border: "none", margin: 0, padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" };
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.xl, overflow: "hidden", boxShadow: dsSh.elevation1 }}>
      <button onClick={() => onEditar(matriz)} style={botonReset} title="Editar ejercicio">
        <MiniaturaEjercicioReal ejercicio={matriz} color={color} Icono={Icono} variantesCount={variantes.length} personalizado={matriz.es_personalizado !== false} />
        <div style={{ padding: "10px 12px 9px" }}>
          <div style={{ fontFamily: dsF.sans, fontSize: 13, fontWeight: 700, color: ds.ink, marginBottom: 6 }}>{matriz.nombre}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <TagBibliotecaReal color={color} solido>
              {matriz.bloque}
            </TagBibliotecaReal>
            {(matriz.tags_descriptivos || []).map((t) => (
              <TagBibliotecaReal key={t}>{t}</TagBibliotecaReal>
            ))}
            {matriz.naturaleza && (
              <TagBibliotecaReal color={ds.accent}>{matriz.naturaleza === "Específica del deporte" ? "Específica" : matriz.naturaleza}</TagBibliotecaReal>
            )}
            {matriz.lateralidad && matriz.sin_lateralidad !== "si" && <TagBibliotecaReal>{matriz.lateralidad}</TagBibliotecaReal>}
            {nombreCategoria && (
              <TagBibliotecaReal color={ds.accent} solido>
                {nombreCategoria}
              </TagBibliotecaReal>
            )}
          </div>
        </div>
      </button>
      {onToggleFavorito && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorito(matriz);
          }}
          title={matriz.favorito ? "Quitar de favoritos" : "Marcar como favorito"}
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            width: 24,
            height: 24,
            borderRadius: dsR.full,
            background: "rgba(10,18,32,0.55)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          <Heart size={12} color={matriz.favorito ? ds.accent : "#fff"} fill={matriz.favorito ? ds.accent : "none"} />
        </button>
      )}
      {variantes.length > 0 && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "4px 6px" }}>
          {variantes.map((v) => (
            <button key={v.id} onClick={() => onEditar(v)} style={{ ...botonReset, display: "flex", alignItems: "center", gap: 6, padding: "6px 6px", borderRadius: dsR.sm, fontSize: 11.5, color: ds.inkSecondary }} title="Editar variante">
              <span style={{ color: ds.inkMuted, flexShrink: 0 }}>↳</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nombre}</span>
            </button>
          ))}
        </div>
      )}
      {onCrearVariante && (
        <button
          onClick={onCrearVariante}
          style={{
            ...botonReset,
            textAlign: "center",
            padding: "7px 8px",
            fontSize: 11,
            fontWeight: 700,
            color: ds.accent,
            borderTop: `1px solid ${ds.border}`,
          }}
        >
          + Añadir variante
        </button>
      )}
    </div>
  );
}

function PanelNuevoEjercicioReal({ categorias, ejercicios, onGuardar, onCerrar, ejercicioEditar, matrizPreset, error, onEliminar, errorEliminando, onEditarOtro, onCrearVariante }) {
  // matrizPreset: cuando se abre desde el botón "+V" de un ejercicio ya
  // existente, trae el bloque/categoría/etiquetas de partida ya rellenos —
  // el nombre y el vídeo siguen siendo del todo propios de la variante.
  const base = ejercicioEditar || matrizPreset;
  const [nombre, setNombre] = useState(ejercicioEditar?.nombre || "");
  const [ejercicioBaseId, setEjercicioBaseId] = useState(ejercicioEditar?.ejercicio_base_id || matrizPreset?.id || "");
  const [bloque, setBloque] = useState(base?.bloque || "Fuerza");
  const [categoriaId, setCategoriaId] = useState(base?.categoria_preventiva_id || categorias[0]?.id || "");
  const [tagsSel, setTagsSel] = useState(base?.tags_descriptivos || []);
  const [videoUrl, setVideoUrl] = useState(ejercicioEditar?.gif_url || "");
  const [sinLateralidad, setSinLateralidad] = useState(ejercicioEditar?.sin_lateralidad === "si");
  const [naturaleza, setNaturaleza] = useState(base?.naturaleza || "");
  const [lateralidad, setLateralidad] = useState(base?.lateralidad || "");
  const [materialesDisponibles] = useMaterialesDisponibles();
  const [filasVariantes, setFilasVariantes] = useState(() =>
    Object.entries(ejercicioEditar?.videos_variantes || {}).map(([clave, url]) => {
      const [material, modo] = clave.split("::");
      return { key: Math.random().toString(36).slice(2), material: material === "std" ? "" : material, unilateral: modo === "uni", url };
    })
  );
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const esPreventivo = bloque === "Preventivo";
  // Selección única: con "Global" cubriendo el caso de superior+inferior a
  // la vez, cada ejercicio pertenece a una sola zona corporal — ya no tiene
  // sentido dejar marcar varias a la vez como antes.
  const zonaSelEd = zonaDeTags(tagsSel);
  const regionSelEd = regionDeTags(tagsSel);
  const [faltante, setFaltante] = useState("");
  const seleccionarZona = (t) => { setFaltante(""); setTagsSel(tagsDeZonaRegion(t, t === "Movilidad" ? regionSelEd : "")); };
  const seleccionarRegion = (r) => setTagsSel(tagsDeZonaRegion(zonaSelEd, r));
  const videoIdValido = extractYouTubeId(videoUrl);
  const esDirectoValido = esVideoDirecto(videoUrl);
  const enlaceReconocido = !!videoIdValido || esDirectoValido;
  const enlaceNoReconocido = videoUrl.trim().length > 0 && !enlaceReconocido;

  const actualizarFila = (key, cambios) => setFilasVariantes((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  const quitarFila = (key) => setFilasVariantes((prev) => prev.filter((f) => f.key !== key));
  const anadirFila = () => setFilasVariantes((prev) => [...prev, { key: Math.random().toString(36).slice(2), material: materialesDisponibles[0] || "", unilateral: false, url: "" }]);

  // Split-panel (mockup Fase 6): esta pantalla reemplaza la rejilla de
  // ejercicios por completo, no aparece como modal flotante encima —
  // columna izquierda con la miniatura grande y la lista de variantes
  // hermanas (misma matriz), columna derecha con el formulario de siempre.
  const anchoDesktopPanel = useAnchoVentana() >= 900;
  const colorBloquePanel = BLOQUE_COLOR_REAL[bloque] || ds.chart2;
  const IconoBloquePanel = BLOQUE_ICONO_REAL[bloque] || Dumbbell;
  const esVariante = !!ejercicioEditar?.ejercicio_base_id;
  const idMatrizReal = ejercicioEditar?.ejercicio_base_id || (ejercicioEditar && !esVariante ? ejercicioEditar.id : "") || matrizPreset?.id || "";
  const matrizHermana = esVariante && idMatrizReal ? (ejercicios || []).find((e) => e.id === idMatrizReal) : null;
  const variantesHermanas = idMatrizReal ? (ejercicios || []).filter((e) => e.ejercicio_base_id === idMatrizReal && e.id !== ejercicioEditar?.id) : [];
  const matrizParaNuevaVariante = matrizHermana || (ejercicioEditar && !esVariante ? ejercicioEditar : matrizPreset) || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button
        onClick={onCerrar}
        style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
      >
        <ChevronLeft size={16} /> Volver a Ejercicios
      </button>
      <div style={{ display: "grid", gridTemplateColumns: anchoDesktopPanel ? "1fr 1fr" : "1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: dsR.xl, overflow: "hidden", border: `1px solid ${ds.borderSoft}` }}>
            <MiniaturaEjercicioReal ejercicio={{ gif_url: videoUrl }} color={colorBloquePanel} Icono={IconoBloquePanel} variantesCount={0} />
          </div>
          {(idMatrizReal || ejercicioEditar) && (
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 8 }}>VARIANTES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {esVariante && matrizHermana && (
                  <button
                    onClick={() => onEditarOtro && onEditarOtro(matrizHermana)}
                    style={{ textAlign: "left", background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "8px 10px", fontSize: 12.5, color: ds.ink, cursor: "pointer" }}
                  >
                    {matrizHermana.nombre} <span style={{ color: ds.inkMuted, fontSize: 11 }}>(principal)</span>
                  </button>
                )}
                {variantesHermanas.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onEditarOtro && onEditarOtro(v)}
                    style={{ textAlign: "left", background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "8px 10px", fontSize: 12.5, color: ds.ink, cursor: "pointer" }}
                  >
                    {v.nombre}
                  </button>
                ))}
                {variantesHermanas.length === 0 && !esVariante && <div style={{ fontSize: 12, color: ds.inkMuted }}>Sin variantes todavía</div>}
              </div>
              {matrizParaNuevaVariante && onCrearVariante && (
                <button
                  onClick={() => onCrearVariante(matrizParaNuevaVariante)}
                  style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, justifyContent: "center", width: "100%", background: "transparent", border: `1px dashed ${ds.border}`, color: ds.inkSecondary, borderRadius: dsR.md, padding: "8px 10px", fontSize: 12.5, cursor: "pointer" }}
                >
                  <Plus size={13} /> Añadir variante
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>{ejercicioEditar ? "Editar ejercicio" : "Nuevo ejercicio"}</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NOMBRE</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sentadilla frontal" style={campoSelectReal()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>VARIANTE DE (OPCIONAL — SOLO PARA AGRUPARLO EN LA BIBLIOTECA)</span>
          <select value={ejercicioBaseId} onChange={(e) => setEjercicioBaseId(e.target.value)} style={campoSelectReal()}>
            <option value="">Ninguno — es un ejercicio matriz</option>
            {(ejercicios || [])
              .filter((e) => !e.ejercicio_base_id && e.id !== ejercicioEditar?.id)
              .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>BLOQUE (único, obligatorio)</span>
          <select value={bloque} onChange={(e) => setBloque(e.target.value)} style={campoSelectReal()}>
            {BLOQUES_BIBLIOTECA.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        {esPreventivo && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>CATEGORÍA PREVENTIVA (obligatoria, solo aplica a este bloque)</span>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={campoSelectReal()}>
              {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
                <optgroup key={tipo} label={tipo}>
                  {categorias
                    .filter((c) => c.tipo_tejido === tipo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        {bloque === "Fuerza" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NATURALEZA (solo aplica a Fuerza, opcional)</span>
            <select value={naturaleza} onChange={(e) => setNaturaleza(e.target.value)} style={campoSelectReal()}>
              <option value="">Sin especificar</option>
              {NATURALEZA_BIBLIOTECA.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>LATERALIDAD (opcional)</span>
          <select value={lateralidad} onChange={(e) => setLateralidad(e.target.value)} style={campoSelectReal()}>
            <option value="">Sin especificar</option>
            {LATERALIDAD_BIBLIOTECA.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>ZONA CORPORAL (obligatoria)</span>
          <SelectorZonaRegion zona={zonaSelEd} region={regionSelEd} onZona={seleccionarZona} onRegion={seleccionarRegion} alerta={!!faltante && !zonaSelEd} tituloVisible={false} />
        </div>
        <div onClick={() => setSinLateralidad((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `1.5px solid ${sinLateralidad ? ds.accent : ds.border}`,
              background: sinLateralidad ? ds.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: ds.accentInk,
              fontSize: 12,
            }}
          >
            {sinLateralidad ? "✓" : ""}
          </span>
          <span style={{ fontSize: 12.5, color: ds.inkSecondary }}>Sin lateralidad (ej. bici estática — no mostrar etiqueta Bilateral/Unilateral)</span>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>VÍDEO GENÉRICO (respaldo si una variante no tiene el suyo propio)</span>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/... o https://pub-xxxx.r2.dev/....mp4"
            style={{ ...campoSelectReal(), borderColor: enlaceNoReconocido ? ds.danger : undefined }}
          />
          {enlaceNoReconocido && (
            <span style={{ fontSize: 11, color: ds.danger }}>No reconozco este enlace — debe ser de YouTube o terminar en .mp4/.webm/.mov.</span>
          )}
          {enlaceReconocido && <VideoEmbed url={videoUrl} />}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>
            VÍDEOS POR VARIANTE (opcional — para cuando el gesto cambia según el material)
          </span>
          {filasVariantes.map((f) => {
            const idValido = extractYouTubeId(f.url);
            const directoValido = esVideoDirecto(f.url);
            const reconocido = !!idValido || directoValido;
            const noReconocido = f.url.trim().length > 0 && !reconocido;
            return (
              <div key={f.key} style={{ border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={f.material} onChange={(e) => actualizarFila(f.key, { material: e.target.value })} style={{ ...campoSelectReal(), flex: 1 }}>
                    <option value="">— Material —</option>
                    {materialesDisponibles.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.unilateral ? "uni" : "bi"}
                    onChange={(e) => actualizarFila(f.key, { unilateral: e.target.value === "uni" })}
                    style={{ fontSize: 11, padding: "0 8px", borderRadius: dsR.sm, border: `1px solid ${f.unilateral ? ds.accent : ds.border}`, background: f.unilateral ? ds.accentSubtle : "transparent", color: f.unilateral ? ds.accent : ds.inkSecondary, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    <option value="bi">Bilateral</option>
                    <option value="uni">Unilateral</option>
                  </select>
                  <button onClick={() => quitarFila(f.key)} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.danger, borderRadius: dsR.sm, padding: "0 10px", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={f.url}
                  onChange={(e) => actualizarFila(f.key, { url: e.target.value })}
                  placeholder="https://youtu.be/... de esta variante"
                  style={{ ...campoSelectReal(), borderColor: noReconocido ? ds.danger : undefined }}
                />
                {noReconocido && <span style={{ fontSize: 11, color: ds.danger }}>No reconozco este enlace.</span>}
                {reconocido && <VideoEmbed url={f.url} />}
              </div>
            );
          })}
          <button
            onClick={anadirFila}
            style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", background: "transparent", border: `1px dashed ${ds.border}`, color: ds.inkSecondary, borderRadius: dsR.md, padding: "8px 10px", fontSize: 12.5, cursor: "pointer" }}
          >
            <Plus size={13} /> Añadir variante
          </button>
        </div>
        {onEliminar && (
          <div style={{ borderTop: `1px solid ${ds.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {errorEliminando && <div style={{ color: ds.danger, fontSize: 12 }}>{errorEliminando}</div>}
            {confirmandoBorrado ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: ds.inkSecondary }}>¿Eliminar este ejercicio? No se puede deshacer.</span>
                <DsButton
                  variant="danger"
                  size="sm"
                  disabled={borrando}
                  onClick={async () => {
                    setBorrando(true);
                    await onEliminar();
                    setBorrando(false);
                  }}
                >
                  {borrando ? "Eliminando..." : "Sí, eliminar"}
                </DsButton>
                <DsButton variant="secondary" size="sm" onClick={() => setConfirmandoBorrado(false)}>
                  Cancelar
                </DsButton>
              </div>
            ) : (
              <DsButton variant="danger" size="sm" onClick={() => setConfirmandoBorrado(true)} style={{ alignSelf: "flex-start" }}>
                Eliminar ejercicio
              </DsButton>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {(faltante || error) && <div role="alert" style={{ color: ds.danger, fontSize: 12.5, flex: 1, alignSelf: "center" }}>{faltante || error}</div>}
          <DsButton variant="secondary" onClick={onCerrar}>Cancelar</DsButton>
          <DsButton
            disabled={guardando}
            onClick={async () => {
              if (!nombre.trim()) { setFaltante("Escribe el nombre del ejercicio."); return; }
              if (!zonaSelEd) { setFaltante("Elige la zona corporal: es obligatoria."); return; }
              setFaltante("");
              setGuardando(true);
              await onGuardar({
                id: ejercicioEditar?.id,
                nombre: nombre.trim(),
                bloque,
                categoria_preventiva_id: esPreventivo ? categoriaId : "",
                ejercicio_base_id: ejercicioBaseId || "",
                tags_descriptivos: tagsDeZonaRegion(zonaSelEd, regionSelEd),
                sin_lateralidad: sinLateralidad ? "si" : "",
                naturaleza: bloque === "Fuerza" ? naturaleza || null : null,
                lateralidad: lateralidad || null,
                gif_url: videoUrl,
                videos_variantes: Object.fromEntries(
                  filasVariantes.filter((f) => f.material && f.url.trim()).map((f) => [claveVideoVariante(f.material, f.unilateral), f.url.trim()])
                ),
                orden_rotacion: ejercicioEditar?.orden_rotacion || "",
              });
              setGuardando(false);
            }}
          >
            {guardando ? "Guardando..." : ejercicioEditar ? "Guardar cambios" : "Guardar ejercicio"}
          </DsButton>
        </div>
        </div>
      </div>
    </div>
  );
}

function VistaOrdenRotacionReal({ ejercicios, categorias, onReordenar }) {
  const [categoriaSel, setCategoriaSel] = useState(categorias[0]?.id || "");
  const lista = ejercicios
    .filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === categoriaSel)
    .slice()
    .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));

  const mover = async (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= lista.length) return;
    const nueva = [...lista];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
    await onReordenar(nueva);
  };

  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>CATEGORÍA PREVENTIVA</span>
        <select value={categoriaSel} onChange={(e) => setCategoriaSel(e.target.value)} style={campoSelectReal({ maxWidth: 240 })}>
          {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
            <optgroup key={tipo} label={tipo}>
              {categorias
                .filter((c) => c.tipo_tejido === tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 10 }}>
        Solo ejercicios con bloque "Preventivo" y esa categoría. Este orden queda guardado en cada ejercicio, listo para cuando la selección automática por rotación esté conectada.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "12px 0" }}>Sin ejercicios en esta categoría todavía.</div>}
        {lista.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 16 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: ds.ink }}>{e.nombre}</span>
            <button onClick={() => mover(i, -1)} style={btnIconoReal} disabled={i === 0}>
              ↑
            </button>
            <button onClick={() => mover(i, 1)} style={btnIconoReal} disabled={i === lista.length - 1}>
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// agruparPlantillas ahora en src/core/hooks.js — importada arriba (usada
// por Biblioteca y por Calendario).

function TarjetaPlantillaBibliotecaReal({ plantilla, onAbrir, grupo }) {
  const primeraTarea = plantilla.tareas[0];
  const color = BLOQUE_COLOR_REAL[primeraTarea?.bloque_sesion] || ds.chart2;
  const Icono = BLOQUE_ICONO_REAL[primeraTarea?.bloque_sesion] || ClipboardList;
  const ultimaFecha = grupo ? grupo.ultima : (plantilla.fechas || []).slice().sort().reverse()[0];
  const nombresTareas = plantilla.tareas.map((t) => t.nombreEjercicio).filter(Boolean);
  const preview = nombresTareas.length > 3 ? `${nombresTareas.slice(0, 3).join(" · ")} +${nombresTareas.length - 3} más` : nombresTareas.join(" · ") || "Sin tareas todavía";
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
        gap: 10,
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: dsF.display, fontSize: 14, fontWeight: 700, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plantilla.nombre}</div>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 2 }}>{grupo && grupo.nUsos ? `Usada ${grupo.nUsos} ${grupo.nUsos === 1 ? "vez" : "veces"} · última ${fmtHaceDias(ultimaFecha)}` : grupo && grupo.proxima ? "Planificada, aún sin usar" : ultimaFecha ? `Última vez: ${fmtHaceDias(ultimaFecha)}` : "Sin usar todavía"}</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: dsR.md, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icono size={15} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: 1.6, borderTop: `1px solid ${ds.border}`, paddingTop: 9 }}>{preview}</div>
      <div style={{ fontFamily: dsF.sans, fontSize: 11, fontWeight: 700, color: ds.accent, marginTop: "auto" }}>Ver plantilla →</div>
    </button>
  );
}

// Vista "Sesiones" dentro de Biblioteca (mockup v2: view-switch arriba de la
// rejilla). Reutiliza tal cual los datos y el criterio de "plantilla" que ya
// existía en ProgramacionReal (Biblioteca de sesiones: cualquier sesión con
// nombre puesto por el entrenador) y los editores reales (DisenoSesionReal /
// editor) para Editar/Asignar — no se inventa ningún
// flujo nuevo de guardado ni de asignación.
function VistaSesionesBibliotecaReal({ onAbrirModulo }) {
  const { loaded, sesiones, tareas, ejercicios, retry } = useBootstrapProgramacion();
  const [busqueda, setBusqueda] = useState("");
  const [plantillaSelId, setPlantillaSelId] = useState(null);
  const [modoEditor, setModoEditor] = useState(null); // null | "editar" | "asignar"
  const [playersBib] = usePlayers();
  const [gruposBib] = useEntityList("grupos");
  const [registrosBib] = useEntityList("registros");

  if (!loaded) return <LoadingBlock />;

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
  const conTareas = sesiones.map((s) => ({
    ...s,
    tareas: (tareasBySesion.get(s.id) || []).slice().sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0)),
  }));

  // Mismo criterio que "Biblioteca de sesiones" en Programación: cualquier
  // sesión con nombre puesto por el entrenador es una plantilla, esté o no
  // ya programada/pasada.
  const todasPlantillas = agruparPlantillas(conTareas);
  const plantillas = todasPlantillas
    .filter((g) => !busqueda.trim() || g.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const grupoSel = plantillaSelId ? todasPlantillas.find((g) => g.id === plantillaSelId) : null;
  const plantillaSel = grupoSel ? grupoSel.rep : null;

  if (modoEditor && plantillaSel) {
    const EditorComponent = DisenoSesionReal;
    const cerrar = () => setModoEditor(null);
    return (
      <EditorComponent
        sesionExistente={modoEditor === "editar" ? plantillaSel : undefined}
        plantilla={modoEditor === "asignar" ? plantillaSel : undefined}
        onBack={cerrar}
        onGuardado={() => {
          invalidateBootstrapCache();
          retry();
          cerrar();
          if (modoEditor === "asignar") setPlantillaSelId(null);
        }}
      />
    );
  }

  if (plantillaSel) {
    const tareasSel = plantillaSel.tareas;
    const primeraTarea = tareasSel[0];
    const color = BLOQUE_COLOR_REAL[primeraTarea?.bloque_sesion] || ds.chart2;
    const Icono = BLOQUE_ICONO_REAL[primeraTarea?.bloque_sesion] || ClipboardList;
    const ultimaFecha = (plantillaSel.fechas || []).slice().sort().reverse()[0];
    const esPct1rm = primeraTarea?.modo_carga === "pct1rm";
    return (
      <div>
        <button
          onClick={() => setPlantillaSelId(null)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}
        >
          ← Volver a Sesiones
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{plantillaSel.nombre}</h1>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Tareas</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.ink }}>{tareasSel.length} tarea{tareasSel.length === 1 ? "" : "s"}</div>
              </div>
              <div>
                <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Última vez</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.ink }}>{grupoSel.nUsos ? `${fmtHaceDias(grupoSel.ultima)} · ${grupoSel.nUsos} ${grupoSel.nUsos === 1 ? "uso" : "usos"}` : ultimaFecha ? fmtHaceDias(ultimaFecha) : "Sin usar todavía"}</div>
              </div>
              <div>
                <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Destinatarios</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.ink }}>
                  {!plantillaSel.jugadores_destino || !plantillaSel.jugadores_destino.length ? "Todo el equipo" : `${plantillaSel.jugadores_destino.length} jugador(es)`}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <DsButton variant="secondary" onClick={() => setModoEditor("editar")}>
              Editar
            </DsButton>
            <DsButton onClick={() => setModoEditor("asignar")}>Asignar</DsButton>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tareasSel.map((t, i) => (
              <div key={t.id} style={{ padding: "10px 11px", borderRadius: dsR.md, border: `1px solid ${ds.borderSoft}`, background: ds.surfaceRaised }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: ds.ink }}>
                  {i + 1}. {t.nombreEjercicio}
                </div>
                <div style={{ fontSize: 10, color: ds.inkMuted, marginTop: 1 }}>{formatearDetalleTareaCoach(t)}</div>
              </div>
            ))}
            {tareasSel.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 12, padding: "10px 0" }}>Esta plantilla todavía no tiene tareas.</div>}
          </div>
          <div>
            <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Historial de uso</div>
            {grupoSel.usos.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted, padding: "8px 0" }}>Todavía no se ha programado en ninguna fecha. Pulsa «Asignar» para usarla.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {grupoSel.usos.map(({ fecha, sesion }) => {
                const hoyB = todayStr();
                const activosB = playersBib.filter((p) => p.estado === "activo");
                const ids = destinatariosEfectivosSesion(sesion, activosB);
                const tareasDia = (conTareas.find((x) => x.id === sesion.id)?.tareas || []).filter((t) => !t.fecha || t.fecha === fecha);
                let completos = 0;
                if (fecha <= hoyB && sesion.enviada && tareasDia.length) {
                  ids.forEach((id) => {
                    const n = tareasDia.filter((t) => registrosBib.some((r) => r.jugador_id === id && r.tarea_id === t.id && r.fecha === fecha && (r.enviado === true || r.enviado === "true"))).length;
                    if (n === tareasDia.length) completos += 1;
                  });
                }
                const mostrarCumpl = fecha <= hoyB && sesion.enviada && ids.length > 0 && tareasDia.length > 0;
                return (
                  <div key={`${sesion.id}-${fecha}`} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: ds.surfaceRaised, border: `1px solid ${ds.borderSoft}`, borderRadius: dsR.md, padding: "9px 12px" }}>
                    <b style={{ fontSize: 12.5, minWidth: 92 }}>{new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "2-digit" })}</b>
                    <span style={{ flex: 1, minWidth: 120, fontSize: 12, color: ds.inkSecondary }}>{etiquetaDestinoSesion(sesion, playersBib, gruposBib)}</span>
                    {sesion.md ? <span style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>{sesion.md}</span> : null}
                    {!sesion.enviada && <span style={{ fontSize: 10.5, color: ds.warning, border: `1px solid ${ds.warning}66`, borderRadius: 999, padding: "1px 8px" }}>borrador</span>}
                    {fecha > hoyB && sesion.enviada && <span style={{ fontSize: 10.5, color: ds.chart2, border: `1px solid ${ds.chart2}66`, borderRadius: 999, padding: "1px 8px" }}>próxima</span>}
                    {mostrarCumpl && <span style={{ fontSize: 12, fontWeight: 700, color: completos / ids.length >= 0.8 ? ds.success : completos / ids.length >= 0.5 ? ds.warning : ds.danger }}>{completos}/{ids.length} completa</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Sesiones</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{plantillas.length} plantillas guardadas</div>
        </div>
        <DsButton onClick={() => onAbrirModulo && onAbrirModulo("diseno")}>+ Diseñar sesión</DsButton>
      </div>
      <DsInput value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar plantilla..." style={{ marginBottom: 14, maxWidth: 320 }} />
      {plantillas.length === 0 ? (
        <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
          {busqueda ? "Ninguna plantilla coincide con esa búsqueda." : 'Todavía no has puesto nombre a ninguna sesión. Ponle uno al diseñarla (en "Diseñar sesión") para que aparezca aquí.'}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {plantillas.map((p) => (
            <TarjetaPlantillaBibliotecaReal key={p.id} plantilla={p.rep} grupo={p} onAbrir={() => setPlantillaSelId(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Lista del prototipo: una fila por ejercicio (variantes indentadas) con el
// enlace de vídeo editable en la propia fila, favorito y «+ variante».
function FilasEjerciciosReal({ familias, onEditar, onToggleFavorito, onGuardarVideo, onCrearVariante }) {
  const [borradores, setBorradores] = useState({});
  const [errorId, setErrorId] = useState("");
  const guardar = async (e) => {
    const url = (borradores[e.id] ?? "").trim();
    if (borradores[e.id] === undefined || url === (e.gif_url || "")) return;
    const ok = await onGuardarVideo(e, url);
    setErrorId(ok ? "" : e.id);
    if (ok) setBorradores((b) => { const n = { ...b }; delete n[e.id]; return n; });
  };
  const fila = (e, matriz, esVariante) => {
    const color = BLOQUE_COLOR_REAL[e.bloque] || ds.chart2;
    const valor = borradores[e.id] ?? e.gif_url ?? "";
    const meta = [e.bloque, (e.tags_descriptivos || []).join(", "), e.lateralidad].filter(Boolean).join(" · ");
    return (
      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: esVariante ? "9px 16px 9px 34px" : "11px 16px", borderTop: `1px solid ${ds.border}`, background: esVariante ? ds.surfaceRaised : "transparent", flexWrap: "wrap" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div onClick={() => onEditar(e)} style={{ flex: "1 1 220px", minWidth: 0, cursor: "pointer" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>{esVariante ? "↳ " : ""}{e.nombre}</div>
          <div style={{ fontSize: 11.5, color: ds.inkSecondary }}>{meta}</div>
        </div>
        <input
          value={valor}
          onChange={(ev) => setBorradores((b) => ({ ...b, [e.id]: ev.target.value }))}
          onBlur={() => guardar(e)}
          onKeyDown={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
          placeholder="Pega aquí el enlace del vídeo"
          style={{ flex: "2 1 260px", background: "transparent", border: `1px solid ${errorId === e.id ? ds.danger : ds.border}`, borderRadius: 999, color: ds.ink, fontSize: 12.5, padding: "8px 14px" }}
        />
        {!esVariante ? (
          <button type="button" onClick={() => onCrearVariante(matriz)} style={{ background: "none", border: "none", color: ds.inkSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>+ variante</button>
        ) : <span style={{ width: 62 }} />}
        <button type="button" onClick={() => onToggleFavorito(e)} title={e.favorito ? "Quitar de favoritos" : "Marcar como favorito"} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Heart size={17} color={e.favorito ? ds.accent : ds.inkMuted} fill={e.favorito ? ds.accent : "none"} />
        </button>
      </div>
    );
  };
  return (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, overflow: "hidden" }}>
      {familias.map(({ matriz, variantes }) => (
        <React.Fragment key={matriz.id}>
          {fila(matriz, matriz, false)}
          {variantes.map((v) => fila(v, matriz, true))}
        </React.Fragment>
      ))}
    </div>
  );
}

const tieneVideoEjercicio = (e) => !!(e.gif_url || Object.values(e.videos_variantes || {}).some(Boolean));

// Vista rápida: solo los ejercicios sin vídeo, con un campo para pegar el
// enlace y guardarlo al momento, sin abrir el panel completo de cada uno.
function ListaEnlacesVideoReal({ ejercicios, onGuardar }) {
  const [borradores, setBorradores] = useState({});
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const sin = ejercicios.filter((e) => !tieneVideoEjercicio(e));
  if (!sin.length) return <div style={{ fontSize: 13, color: ds.inkSecondary, padding: 12 }}>Todos los ejercicios tienen vídeo. 🎉</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: ds.inkSecondary }}>{sin.length} ejercicios sin vídeo — pega el enlace (YouTube o vídeo directo) y pulsa Guardar.</div>
      {error && <div style={{ color: ds.danger, fontSize: 12 }}>{error}</div>}
      {sin.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 8px", border: `1px solid ${ds.border}`, borderRadius: 8 }}>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <div style={{ fontSize: 13, color: ds.ink }}>{e.nombre}</div>
            <div style={{ fontSize: 10.5, color: ds.inkMuted, fontFamily: dsF.mono }}>{[e.bloque, ...(e.tags_descriptivos || [])].filter(Boolean).join(" · ")}</div>
          </div>
          <input value={borradores[e.id] || ""} onChange={(ev) => setBorradores((b) => ({ ...b, [e.id]: ev.target.value }))} placeholder="https://youtu.be/…" style={{ flex: "2 1 240px", background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.ink, fontSize: 12.5, padding: "6px 8px" }} />
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
            style={{ fontSize: 12, fontWeight: 600, color: ds.accent, background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", opacity: (borradores[e.id] || "").trim() ? 1 : 0.5 }}
          >
            {guardando === e.id ? "Guardando…" : "Guardar"}
          </button>
        </div>
      ))}
    </div>
  );
}

export function BibliotecaEjerciciosReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [ejercicios, saveEjercicios, ejerciciosLoaded, ejerciciosError] = useEntityList("ejercicios");
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [bloqueFiltro, setBloqueFiltro] = useState("Todos");
  const [zonaFiltro, setZonaFiltro] = useState("Todas");
  const [regionFiltro, setRegionFiltro] = useState("Todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [naturalezaFiltro, setNaturalezaFiltro] = useState("Todas");
  const [lateralidadFiltro, setLateralidadFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [matrizParaVariante, setMatrizParaVariante] = useState(null);
  const [vista, setVista] = useState("lista");
  // view-switch del mockup v2: "Ejercicios" es lo de siempre; "Sesiones"
  // muestra la biblioteca de plantillas que hasta ahora vivía escondida
  // dentro de Programación (botón colapsable "Biblioteca de sesiones").
  const [vistaPrincipal, setVistaPrincipal] = useState("ejercicios");
  // lib-tabs del mockup v2: Todos / Personalizados / Favoritos.
  const [libTab, setLibTab] = useState("todos");
  const [errorBorrado, setErrorBorrado] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");

  if (!ejerciciosLoaded || !categoriasLoaded) return <LoadingBlock />;

  const hayFiltrosActivos =
    bloqueFiltro !== "Todos" || zonaFiltro !== "Todas" || (zonaFiltro === "Movilidad" && regionFiltro !== "Todas") || categoriaFiltro !== "Todas" || naturalezaFiltro !== "Todas" || lateralidadFiltro !== "Todas";

  const visibles = ejercicios
    .filter((e) => (bloqueFiltro === "Todos" ? true : e.bloque === bloqueFiltro))
    .filter((e) => (zonaFiltro === "Todas" ? true : (e.tags_descriptivos || []).includes(zonaFiltro)))
    .filter((e) => (zonaFiltro !== "Movilidad" || regionFiltro === "Todas" ? true : (e.tags_descriptivos || []).includes(regionFiltro)))
    .filter((e) => (categoriaFiltro === "Todas" ? true : e.categoria_preventiva_id === categoriaFiltro))
    .filter((e) => (naturalezaFiltro === "Todas" ? true : e.naturaleza === naturalezaFiltro))
    .filter((e) => (lateralidadFiltro === "Todas" ? true : e.lateralidad === lateralidadFiltro))
    .filter((e) => (libTab === "personalizados" ? e.es_personalizado !== false : true))
    .filter((e) => (libTab === "favoritos" ? !!e.favorito : true))
    .filter((e) => (libTab === "sinvideo" ? !tieneVideoEjercicio(e) : true))
    .filter((e) => (libTab === "convideo" ? tieneVideoEjercicio(e) : true))
    .filter((e) => (e.nombre || "").toLowerCase().includes(busqueda.toLowerCase()));

  const toggleFavorito = (ej) => {
    saveEjercicios(ejercicios.map((e) => (e.id === ej.id ? { ...e, favorito: !e.favorito } : e)));
  };

  const totalPersonalizados = ejercicios.filter((e) => e.es_personalizado !== false).length;
  const totalFavoritos = ejercicios.filter((e) => e.favorito).length;
  const totalConVideo = ejercicios.filter(tieneVideoEjercicio).length;
  const pctVideo = ejercicios.length ? Math.round((totalConVideo / ejercicios.length) * 100) : 0;

  const abrirEdicion = (ej) => {
    setEjercicioEditando(ej);
    setPanelAbierto(true);
  };

  const guardarEjercicio = async (datos) => {
    setErrorGuardado("");
    // CRÍTICO: si esto fallaba (por lo que fuera — el cuelgue de Apps
    // Script que ya vimos, o cualquier otro fallo de conexión) y no se
    // comprobaba, el panel se cerraba igualmente dando la sensación de que
    // el cambio se había guardado, cuando en realidad no había llegado a la
    // Sheet. Es exactamente lo que probablemente pasó con el cambio de
    // "Sentadilla" hace unos días.
    const ok = await saveEjercicios(datos.id ? ejercicios.map((e) => (e.id === datos.id ? { ...e, ...datos } : e)) : [...ejercicios, datos]);
    if (ok) {
      setPanelAbierto(false);
      setEjercicioEditando(null);
    } else {
      setErrorGuardado("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo — el panel sigue abierto para que no pierdas lo escrito.");
    }
  };

  const eliminarEjercicio = async (id) => {
    setErrorBorrado("");
    if (!id) {
      // Sin id real no hay fila que borrar en la Sheet — normalmente pasa
      // con filas creadas o tocadas antes de este arreglo, o metidas a mano
      // directamente en la hoja de cálculo sin id. Quitarlo aquí solo lo
      // ocultaría un instante: en la próxima carga volvería a aparecer.
      setErrorBorrado('Este ejercicio no tiene un identificador válido en la hoja de cálculo, así que no se puede borrar desde aquí — bórralo directamente en la pestaña "ejercicios" de la Sheet.');
      return false;
    }
    const ok = await saveEjercicios(ejercicios.filter((e) => e.id !== id));
    if (!ok) setErrorBorrado("No se pudo borrar. Comprueba tu conexión e inténtalo de nuevo.");
    return ok;
  };

  const reordenarCategoria = async (listaOrdenada) => {
    setErrorBorrado("");
    const idsOrdenados = new Set(listaOrdenada.map((e) => e.id));
    const actualizados = ejercicios.map((e) => {
      if (!idsOrdenados.has(e.id)) return e;
      const nuevoOrden = listaOrdenada.findIndex((x) => x.id === e.id) + 1;
      return { ...e, orden_rotacion: nuevoOrden };
    });
    const ok = await saveEjercicios(actualizados);
    if (!ok) setErrorBorrado("No se pudo guardar el nuevo orden. Comprueba tu conexión e inténtalo de nuevo.");
  };

  return (
    <PantallaEntrenadorAncha activo="biblioteca" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14, width: 200 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>BIBLIOTECA</span>
          <select value={vistaPrincipal} onChange={(e) => setVistaPrincipal(e.target.value)} style={campoSelectReal({ maxWidth: 200 })}>
            <option value="ejercicios">Ejercicios</option>
            <option value="sesiones">Sesiones</option>
          </select>
        </label>
        {vistaPrincipal === "sesiones" ? (
          <VistaSesionesBibliotecaReal onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
        ) : panelAbierto ? (
          <PanelNuevoEjercicioReal
            categorias={categorias}
            ejercicios={ejercicios}
            ejercicioEditar={ejercicioEditando}
            matrizPreset={matrizParaVariante}
            onGuardar={guardarEjercicio}
            error={errorGuardado}
            errorEliminando={errorBorrado}
            onEditarOtro={(ej) => {
              setMatrizParaVariante(null);
              setEjercicioEditando(ej);
              setErrorBorrado("");
            }}
            onCrearVariante={(matriz) => {
              setMatrizParaVariante(matriz);
              setEjercicioEditando(null);
              setErrorBorrado("");
            }}
            onEliminar={
              ejercicioEditando
                ? async () => {
                    const ok = await eliminarEjercicio(ejercicioEditando.id);
                    if (ok) {
                      setPanelAbierto(false);
                      setEjercicioEditando(null);
                    }
                  }
                : undefined
            }
            onCerrar={() => {
              setPanelAbierto(false);
              setEjercicioEditando(null);
              setMatrizParaVariante(null);
              setErrorBorrado("");
            }}
          />
        ) : (
        <>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Ejercicios</h1>
            <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
              {ejercicios.length} ejercicios · {totalConVideo} con vídeo · {totalFavoritos} favoritos
            </div>
          </div>
          <button
            onClick={() => {
              setEjercicioEditando(null);
              setPanelAbierto(true);
            }}
            title="Nuevo ejercicio"
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: dsR.full,
              background: ds.accent,
              border: "none",
              color: ds.accentInk,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
              boxShadow: dsSh.accentGlow,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuevo ejercicio
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, width: 220 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>VISTA</span>
            <select value={vista} onChange={(e) => setVista(e.target.value)} style={campoSelectReal({ maxWidth: 220 })}>
              <option value="lista">Lista y filtros</option>
              <option value="rotacion">Orden de rotación</option>
              <option value="videos">Enlaces de vídeo (rápido)</option>
            </select>
          </label>
          {vista === "lista" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 5, width: 200 }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>PESTAÑA</span>
              <select value={libTab} onChange={(e) => setLibTab(e.target.value)} style={campoSelectReal({ maxWidth: 200 })}>
                <option value="todos">Todos los ejercicios</option>
                <option value="personalizados">Personalizados</option>
                <option value="favoritos">♥ Favoritos</option>
                <option value="sinvideo">Sin vídeo</option>
                <option value="convideo">Con vídeo</option>
              </select>
            </label>
          )}
        </div>
        {vista === "videos" ? (
          <ListaEnlacesVideoReal ejercicios={ejercicios} onGuardar={(ej, url) => saveEjercicios(ejercicios.map((e) => (e.id === ej.id ? { ...e, gif_url: url } : e)))} />
        ) : vista === "lista" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, position: "relative" }}>
              <DsInput value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar ejercicio..." style={{ flex: 1 }} />
              <button
                onClick={() => setFiltrosAbiertos((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: dsF.sans,
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "0 14px",
                  borderRadius: dsR.md,
                  border: `1px solid ${filtrosAbiertos || hayFiltrosActivos ? ds.accent : ds.border}`,
                  background: filtrosAbiertos || hayFiltrosActivos ? ds.accentSubtle : "transparent",
                  color: filtrosAbiertos || hayFiltrosActivos ? ds.accent : ds.inkSecondary,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Filtros{hayFiltrosActivos ? " •" : ""}
              </button>
              {filtrosAbiertos && (
                <>
                  <div onClick={() => setFiltrosAbiertos(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      zIndex: 10,
                      width: 260,
                      maxHeight: "min(70vh, 520px)",
                      overflowY: "auto",
                      background: ds.surfaceRaised,
                      border: `1px solid ${ds.borderSoft}`,
                      borderRadius: dsR.lg,
                      boxShadow: dsSh.elevation3,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bloque</span>
                      <select value={bloqueFiltro} onChange={(e) => setBloqueFiltro(e.target.value)} style={campoSelectReal()}>
                        <option value="Todos">Todos</option>
                        {BLOQUES_BIBLIOTECA.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Zona corporal</span>
                      <select value={zonaFiltro} onChange={(e) => { setZonaFiltro(e.target.value); setRegionFiltro("Todas"); }} style={campoSelectReal()}>
                        <option value="Todas">Todas</option>
                        {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    {zonaFiltro === "Movilidad" && (
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Región</span>
                        <select value={regionFiltro} onChange={(e) => setRegionFiltro(e.target.value)} style={campoSelectReal()}>
                          <option value="Todas">Todas</option>
                          {TAGS_MOVILIDAD.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                    )}
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Naturaleza <span style={{ color: ds.inkMuted, textTransform: "none", letterSpacing: 0 }}>(solo Fuerza)</span>
                      </span>
                      <select value={naturalezaFiltro} onChange={(e) => setNaturalezaFiltro(e.target.value)} style={campoSelectReal()}>
                        <option value="Todas">Todas</option>
                        {NATURALEZA_BIBLIOTECA.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lateralidad</span>
                      <select value={lateralidadFiltro} onChange={(e) => setLateralidadFiltro(e.target.value)} style={campoSelectReal()}>
                        <option value="Todas">Todas</option>
                        {LATERALIDAD_BIBLIOTECA.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Categoría preventiva <span style={{ color: ds.inkMuted, textTransform: "none", letterSpacing: 0 }}>(solo Preventivo)</span>
                      </span>
                      <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={campoSelectReal()}>
                        <option value="Todas">Todas</option>
                        {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
                          <optgroup key={tipo} label={tipo}>
                            {categorias
                              .filter((c) => c.tipo_tejido === tipo)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}
            </div>
            <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 800 }}>{totalConVideo} de {ejercicios.length}</span>
                  <span style={{ fontSize: 13, color: ds.inkSecondary, fontWeight: 600 }}>ejercicios con vídeo</span>
                </div>
                {totalConVideo < ejercicios.length && (
                  <button type="button" onClick={() => setLibTab(libTab === "sinvideo" ? "todos" : "sinvideo")} style={{ fontSize: 12.5, fontWeight: 700, color: ds.ink, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 999, padding: "8px 14px", cursor: "pointer" }}>
                    {libTab === "sinvideo" ? "Ver todos" : `Ver los ${ejercicios.length - totalConVideo} sin vídeo`}
                  </button>
                )}
              </div>
              <div style={{ height: 6, borderRadius: 999, background: ds.border, overflow: "hidden", margin: "10px 0 8px" }}>
                <div style={{ width: `${pctVideo}%`, height: "100%", background: ds.accent }} />
              </div>
              <div style={{ fontSize: 12, color: ds.inkSecondary }}>Los jugadores ven el vídeo dentro de su sesión. Pega el enlace en cada fila y se guarda al instante.</div>
            </div>
            {errorBorrado && <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 12 }}>{errorBorrado}</div>}
            {(() => {
              // Agrupa matriz + variantes para que la rejilla deje de ser
              // ejercicios sueltos y pase a ser familias de movimiento: la
              // matriz arriba con su miniatura, sus variantes plegadas justo
              // debajo dentro de la misma tarjeta. Una familia se muestra si
              // la matriz o cualquiera de sus variantes pasa los
              // filtros/búsqueda actuales.
              const idsVisibles = new Set(visibles.map((e) => e.id));
              const idsExistentes = new Set(ejercicios.map((e) => e.id));
              const variantesPorMatriz = {};
              ejercicios.forEach((e) => {
                if (e.ejercicio_base_id && idsExistentes.has(e.ejercicio_base_id)) {
                  (variantesPorMatriz[e.ejercicio_base_id] = variantesPorMatriz[e.ejercicio_base_id] || []).push(e);
                }
              });
              const matrices = ejercicios.filter((e) => !e.ejercicio_base_id || !idsExistentes.has(e.ejercicio_base_id));
              const familias = matrices
                .map((m) => ({ matriz: m, variantes: (variantesPorMatriz[m.id] || []).filter((v) => idsVisibles.has(v.id)) }))
                .filter((f) => idsVisibles.has(f.matriz.id) || (variantesPorMatriz[f.matriz.id] || []).some((v) => idsVisibles.has(v.id)));

              if (familias.length === 0) {
                return <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin resultados</div>;
              }
              return (
                <FilasEjerciciosReal
                  familias={familias}
                  onEditar={abrirEdicion}
                  onToggleFavorito={toggleFavorito}
                  onGuardarVideo={(ej, url) => saveEjercicios(ejercicios.map((e) => (e.id === ej.id ? { ...e, gif_url: url } : e)))}
                  onCrearVariante={(matriz) => {
                    setMatrizParaVariante(matriz);
                    setEjercicioEditando(null);
                    setPanelAbierto(true);
                  }}
                />
              );
            })()}
          </>
        ) : (
          <VistaOrdenRotacionReal ejercicios={ejercicios} categorias={categorias} onReordenar={reordenarCategoria} />
        )}
        </>
        )}
      </div>
    </PantallaEntrenadorAncha>
  );
}
