import { useState, useEffect } from "react";
import { Loader2, Play, AlertTriangle } from "lucide-react";
import { ds, dsF, dsR, DsButton } from "./designSystem.jsx";
import { extractYouTubeId, esVideoDirecto, miniaturaTarea, parseMateriales, formatearDetalleTareaCoach } from "./hooks.js";
import { fmtDateLabel, fmtDateShort } from "../calc/fechas.js";

// Reproductor incrustado. Tres casos:
// - YouTube: iframe embebido (16:9, sin marca ni vídeos relacionados de más).
// - Vídeo directo (R2 u otro bucket): <video> nativo, con su propio estado
//   de carga (spinner mientras hace buffer) y de error visible si la URL no
//   responde — antes esto fallaba en silencio, ahora nunca lo hace.
// - Cualquier otra cosa (GIF antiguo de Drive, de antes de este cambio):
//   se muestra como imagen normal, para no romper lo que ya hubiera.
export function VideoEmbed({ url }) {
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  useEffect(() => setEstado("cargando"), [url]);

  if (!url) return null;
  const videoId = extractYouTubeId(url);

  if (videoId) {
    return (
      <div style={{ marginTop: 8, position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }} onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
          title="Demostración del ejercicio"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
        />
      </div>
    );
  }

  if (esVideoDirecto(url)) {
    return (
      <div style={{ marginTop: 8, position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", background: "#000", minHeight: estado === "error" ? 0 : 160 }} onClick={(e) => e.stopPropagation()}>
        {estado === "cargando" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary, background: ds.surface }}>
            <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}
        {estado === "error" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 12px", background: ds.surface, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: 8, color: ds.danger, fontSize: 12.5, textAlign: "center" }}>
            <span>No se pudo cargar el vídeo.</span>
            <span style={{ color: ds.inkSecondary, fontSize: 11.5 }}>Comprueba tu conexión o que el enlace siga siendo válido.</span>
          </div>
        ) : (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            onCanPlay={() => setEstado("listo")}
            onError={() => setEstado("error")}
            style={{ width: "100%", maxHeight: 320, display: "block", opacity: estado === "listo" ? 1 : 0 }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      <img src={url} alt="Demostración de la tarea" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, display: "block", background: ds.canvas }} />
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40, color: ds.inkSecondary }}>
      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function CerrablePorFuera({ onCerrar, children }) {
  return (
    <>
      <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
      {children}
    </>
  );
}

export function ChipReal({ children, tono = "neutro" }) {
  const tonos = {
    neutro: { color: ds.inkSecondary, border: `${ds.border}99` },
    verde: { color: ds.accent, border: ds.accentBorderSubtle },
    ambar: { color: ds.warning, border: `${ds.warning}55` },
    azul: { color: ds.chart2, border: `${ds.chart2}55` },
  };
  const t = tonos[tono];
  return (
    <span
      style={{
        fontFamily: dsF.mono,
        fontSize: 10,
        letterSpacing: "0.03em",
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export const TAGS_DESCRIPTIVOS_BIBLIOTECA = ["Miembro superior", "Miembro inferior", "Zona media", "Global", "Movilidad"];
// Subetiquetas de "Movilidad" (región o articulación). Solo aparecen cuando la zona
// elegida es Movilidad y se guardan detrás de ella: ["Movilidad", región].
export const TAGS_MOVILIDAD = ["Cadera", "Rodilla", "Tobillo", "Columna lumbar", "Columna torácica", "Hombro"];
export const zonaDeTags = (tags) => (tags || []).find((t) => TAGS_DESCRIPTIVOS_BIBLIOTECA.includes(t)) || "";
export const regionDeTags = (tags) => (tags || []).find((t) => TAGS_MOVILIDAD.includes(t)) || "";
export const tagsDeZonaRegion = (zona, region) => (zona === "Movilidad" ? [zona, region] : [zona]).filter(Boolean);

// Desplegable compacto con título pequeño encima.
export function SelectCompacto({ etiqueta, valor, onCambiar, opciones, vacio, tituloVisible = true, alerta = false }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: "1 1 150px" }}>
      {tituloVisible && <span style={{ fontSize: 10, fontWeight: 600, color: ds.inkSecondary, paddingLeft: 2 }}>{etiqueta}</span>}
      <select aria-label={etiqueta} value={valor} onChange={(e) => onCambiar(e.target.value)} style={{ height: 38, boxSizing: "border-box", padding: "0 10px", borderRadius: 10, border: `1px solid ${alerta ? ds.danger : ds.border}`, background: ds.surface, color: valor ? ds.ink : ds.inkMuted, fontSize: 16, fontWeight: 600, fontFamily: dsF.sans }}>
        <option value="">{vacio}</option>
        {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// Zona corporal y, en movilidad, su región: dos desplegables.
export function SelectorZonaRegion({ zona, region, onZona, onRegion, alerta = false, tituloVisible = true }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <SelectCompacto etiqueta="Zona corporal" valor={zona} onCambiar={onZona} opciones={TAGS_DESCRIPTIVOS_BIBLIOTECA} vacio="Elige la zona…" alerta={alerta} tituloVisible={tituloVisible} />
      {zona === "Movilidad" && <SelectCompacto etiqueta="Región (opcional)" valor={region} onCambiar={onRegion} opciones={TAGS_MOVILIDAD} vacio="Sin región" tituloVisible={tituloVisible} />}
    </div>
  );
}

export function TagChipReal({ tag, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: dsF.mono,
        fontSize: 11,
        letterSpacing: "0.02em",
        color: activo ? ds.accentInk : ds.inkSecondary,
        background: activo ? ds.accent : "transparent",
        border: `1px solid ${activo ? ds.accent : ds.border}`,
        borderRadius: dsR.sm,
        padding: "4px 9px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </button>
  );
}

export function campoSelectReal(extra = {}) {
  return { background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.sm, color: ds.ink, fontSize: 13, padding: "8px 9px", ...extra };
}

// Iniciales para el avatar-stack de una tarjeta de equipo — mismo criterio
// que usa la cabecera de la ficha de jugador para su avatar grande.
export function inicialesNombre(name) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}
// Paleta decorativa para el avatar-stack — solo variación visual (quién es
// cada iniciales ya se ve en el título al pasar el ratón), no un dato nuevo.
export const AVATAR_STACK_COLORES = [ds.chart2, ds.chart3, ds.accent, ds.success, ds.chart1];

// Mismo color de avatar para el mismo jugador en toda la app (fila de
// Usuarios, cabecera de su ficha...) — determinista a partir de su id, no
// aleatorio, así "reconoces" a alguien por su color de un vistazo en vez de
// que cambie cada vez que se vuelve a renderizar.
export function colorAvatarJugador(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) >>> 0;
  return AVATAR_STACK_COLORES[hash % AVATAR_STACK_COLORES.length];
}

// Tile compacto de estadística: icono + etiqueta arriba, valor + sub abajo,
// cada línea con su propio elipsis — así una etiqueta larga en un tile
// estrecho se recorta con "…" (con el texto completo en el title, al pasar
// el ratón) en vez de desbordarse por encima del tile vecino, y la altura
// del tile no depende de si "sub" cabe o no en una línea (antes, si
// envolvía, ese tile salía más alto que el resto de la fila). "accent" = el
// tile con más peso visual (p. ej. Adherencia).
export function MiniStat({ icon, label, value, sub, accent, style }) {
  const elidido = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 0,
        background: accent ? `linear-gradient(160deg, ${ds.accent}1a, ${ds.surfaceRaised} 60%)` : ds.surfaceRaised,
        border: `1px solid ${accent ? ds.accentBorderSubtle : ds.borderSoft}`,
        borderRadius: dsR.lg,
        padding: "11px 13px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: dsR.sm, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div title={label} style={{ fontFamily: dsF.mono, fontSize: 9, fontWeight: 600, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.04em", ...elidido }}>
          {label}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div title={typeof value === "string" ? value : undefined} style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: ds.ink, lineHeight: 1.2, ...elidido }}>
          {value}
        </div>
        {sub && (
          <div title={sub} style={{ fontFamily: dsF.mono, fontSize: 9.5, fontWeight: 600, color: ds.inkMuted, marginTop: 2, ...elidido }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// Gráfica simple de progreso de carga en el tiempo para una tarea concreta —
// SVG a mano, sin librería externa (esta app no tiene ninguna cargada).
// Cada punto es un registro con carga válida; se traza una línea recta entre
// ellos en el orden de las fechas.
// P4 (Fase 3): punto → detalle de esa sesión, en vez de una gráfica muda.
// El punto pulsado (táctil o click, no solo hover — en móvil no hay hover)
// queda seleccionado y su ficha se lee justo encima, con todo lo que el
// registro trae (reps, RIR) además de la fecha y el valor que ya se veían.
// Por defecto el último punto está seleccionado, para no cambiar lo que ya
// se veía si nadie toca nada.
export function GraficaProgresoCargaReal({ puntos, unidad = "kg", mostrarListaCompleta = true }) {
  // Id único por instancia: puede haber varias de estas gráficas montadas a
  // la vez en la misma pantalla (una por tarea), y los <defs> de SVG son
  // globales al documento — sin esto, dos gráficas compartirían el mismo
  // degradado y una de las dos se vería mal.
  const [gradId] = useState(() => `gpc-${Math.random().toString(36).slice(2, 9)}`);
  const [seleccionado, setSeleccionado] = useState(puntos.length - 1);
  // Si cambian los puntos (p. ej. se elige otra tarea en el desplegable) y
  // el índice seleccionado ya no existe, vuelve a caer en el último.
  const indiceActivo = seleccionado != null && seleccionado < puntos.length ? seleccionado : puntos.length - 1;

  if (puntos.length < 2) {
    return (
      <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "24px 0", textAlign: "center" }}>
        {puntos.length === 0 ? "Sin registros de carga para esta tarea en este rango." : "Hace falta al menos 2 registros para trazar la evolución."}
      </div>
    );
  }
  const width = 640;
  const height = 210;
  const padX = 6;
  const padTop = 34;
  const padBottom = 30;
  const valores = puntos.map((p) => p.valor);
  const minV = Math.min(...valores);
  const maxV = Math.max(...valores);
  const rango = maxV - minV || 1;
  const stepX = puntos.length > 1 ? (width - padX * 2) / (puntos.length - 1) : 0;
  const coordX = (i) => padX + i * stepX;
  const coordY = (v) => height - padBottom - ((v - minV) / rango) * (height - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valor).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${coordX(puntos.length - 1).toFixed(1)} ${height - padBottom} L ${coordX(0).toFixed(1)} ${height - padBottom} Z`;
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const activo = puntos[indiceActivo];
  // Sin ejes ni cuadrícula — minimalista, al estilo de referencia: el valor
  // inicial y el final se leen pegados a su propio punto de la línea, no en
  // una columna de ejes aparte.
  const yUltimo = coordY(ultimo.valor);
  const yPrimero = coordY(primero.valor);
  const labelUltimoArriba = yUltimo < height / 2;

  return (
    <div>
      {/* Ficha de la sesión seleccionada — lo que antes solo estaba en la
          fila de la lista de abajo, ahora también arriba del todo, pegado
          al punto que se acaba de tocar. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", rowGap: 4 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted }}>{fmtDateLabel(activo.date)}</div>
        <div style={{ fontFamily: dsF.mono, fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>
          {activo.valor}{unidad}
          {activo.reps !== "" && activo.reps != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · {activo.reps} reps</span>}
          {activo.rir !== "" && activo.rir != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · RIR {activo.rir}</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 210, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={ds.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        {/* Línea de referencia a su propia mejor marca del periodo — no es un
            umbral clínico inventado, es simplemente su máximo real, para leer
            cada punto contra sí mismo (mismo principio que ya usamos en CMJ:
            comparar contra la referencia individual, no contra un valor fijo). */}
        <line x1={padX} y1={coordY(maxV)} x2={width - padX} y2={coordY(maxV)} stroke={ds.inkMuted} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 4" />
        <text x={width - padX} y={coordY(maxV) - 5} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">mejor marca · {maxV}{unidad}</text>
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
        {indiceActivo != null && (
          <line x1={coordX(indiceActivo)} y1={padTop - 10} x2={coordX(indiceActivo)} y2={height - padBottom} stroke={ds.accent} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
        )}
        {puntos.map((p, i) => {
          const esRecord = p.valor === maxV;
          return (
            <g key={i} onClick={() => setSeleccionado(i)} style={{ cursor: "pointer" }}>
              {/* Círculo invisible más grande solo para que el dedo tenga margen de sobra al tocar — el visible sigue fino */}
              <circle cx={coordX(i)} cy={coordY(p.valor)} r={14} fill="transparent" />
              {esRecord && (
                <circle cx={coordX(i)} cy={coordY(p.valor)} r={i === indiceActivo ? 9 : 7.5} fill="none" stroke={ds.success} strokeWidth={2} />
              )}
              <circle
                cx={coordX(i)}
                cy={coordY(p.valor)}
                r={i === indiceActivo ? 5.5 : i === 0 || i === puntos.length - 1 ? 4 : 3}
                fill={i === indiceActivo ? ds.accent : ds.canvas}
                stroke={ds.accent}
                strokeWidth={2.25}
              />
            </g>
          );
        })}
        <text x={coordX(0)} y={yPrimero + (labelUltimoArriba ? 18 : -12)} fontSize="10.5" fill={ds.inkMuted} textAnchor="start">{primero.valor}{unidad}</text>
        <text x={coordX(puntos.length - 1)} y={yUltimo + (labelUltimoArriba ? -12 : 18)} fontSize="11.5" fontWeight="700" fill={ds.ink} textAnchor="end">{ultimo.valor}{unidad}</text>
        <text x={coordX(0)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="start">{fmtDateShort(primero.date)}</text>
        <text x={coordX(puntos.length - 1)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{fmtDateShort(ultimo.date)}</text>
      </svg>
      {puntos.some((p) => p.valor === maxV) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: ds.inkMuted, marginTop: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: `2px solid ${ds.success}`, flexShrink: 0 }} />
          récord personal en este periodo
        </div>
      )}
      {mostrarListaCompleta ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
          {[...puntos].reverse().map((p, iRev) => {
            const i = puntos.length - 1 - iRev;
            const esActivo = i === indiceActivo;
            return (
              <div
                key={i}
                onClick={() => setSeleccionado(i)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: ds.inkSecondary,
                  fontFamily: dsF.mono,
                  cursor: "pointer",
                  padding: "3px 6px",
                  margin: "0 -6px",
                  borderRadius: dsR.sm,
                  background: esActivo ? ds.accentSubtle : "transparent",
                }}
              >
                <span style={{ color: esActivo ? ds.accent : ds.inkSecondary, fontWeight: esActivo ? 700 : 400 }}>{fmtDateShort(p.date)}</span>
                <span style={{ color: ds.ink }}>
                  {p.valor}{unidad}{p.rir !== "" && p.rir != null ? ` · RIR${p.rir}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista jugador: no se enseña el histórico completo (eso lo reserva
        // el entrenador), solo el registro más reciente — la ficha de arriba
        // ya cubre el resto al tocar cualquier punto de la gráfica.
        (() => {
          const iUltimo = puntos.length - 1;
          const pUltimo = puntos[iUltimo];
          const esActivo = iUltimo === indiceActivo;
          return (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginBottom: 4 }}>MÁS RECIENTE</div>
              <div
                onClick={() => setSeleccionado(iUltimo)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: ds.inkSecondary,
                  fontFamily: dsF.mono,
                  cursor: "pointer",
                  padding: "3px 6px",
                  margin: "0 -6px",
                  borderRadius: dsR.sm,
                  background: esActivo ? ds.accentSubtle : "transparent",
                }}
              >
                <span style={{ color: esActivo ? ds.accent : ds.inkSecondary, fontWeight: esActivo ? 700 : 400 }}>{fmtDateShort(pUltimo.date)}</span>
                <span style={{ color: ds.ink }}>
                  {pUltimo.valor}{unidad}{pUltimo.rir !== "" && pUltimo.rir != null ? ` · RIR${pUltimo.rir}` : ""}
                </span>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

export function TareaVisualReal({ tarea }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
      {tarea.gif ? (
        <div style={{ position: "relative", width: 42, height: 42, borderRadius: dsR.md, flexShrink: 0, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {miniaturaTarea(tarea.gif) && (
            <img src={miniaturaTarea(tarea.gif)} alt="" style={{ width: 42, height: 42, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
          )}
          {(extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif)) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(tarea.gif) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
              <Play size={13} color={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} fill={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: dsR.md, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ds.inkMuted, fontSize: 9, fontFamily: dsF.mono }}>
          VÍDEO
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: ds.ink }}>{tarea.nombre}</div>
        <div style={{ fontSize: 10.5, color: ds.inkMuted, fontFamily: dsF.mono }}>{tarea.detalle}</div>
        {tarea.materiales && tarea.materiales.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
            {tarea.materiales.map((m) => (
              <span key={m} style={{ fontSize: 9.5, color: ds.accent, fontFamily: dsF.mono }}>
                {m}
              </span>
            ))}
          </div>
        )}
        {tarea.nota && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, fontSize: 10, color: ds.inkSecondary }}>
            <span style={{ color: ds.warning, display: "inline-flex" }}><AlertTriangle size={12} /></span>
            <span>{tarea.nota}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// formatearDetalleTareaCoach ahora en src/core/hooks.js — importada arriba.

// useReferenciasPorEjercicio ahora en src/screens/DisenoSesion.jsx (único
// consumidor: el Diseñador de sesiones).

export function TarjetaSesionReal({ sesion, esHoy, onEditar, onEliminar, onReutilizar, soloLectura, compacta, abiertaInicial, jugadoresConRegistros = 0 }) {
  const [abierta, setAbierta] = useState(abiertaInicial ?? esHoy);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const bloques = {};
  const circuitoBuffer = {};
  (sesion.tareas || []).forEach((t) => {
    // Si la tarea tiene fecha propia (Movilidad/Preventivo con varias fechas
    // en la misma sesión), se agrupa aparte con su fecha en la etiqueta, para
    // no mezclar el ejercicio de un día con el de otro bajo el mismo nombre.
    const nombreBloque = t.fecha ? `${t.bloque_sesion || "General"} · ${fmtDateShort(t.fecha)}` : t.bloque_sesion || "General";
    if (t.circuito_id) {
      if (!circuitoBuffer[t.circuito_id]) circuitoBuffer[t.circuito_id] = { nombreBloque, tareas: [] };
      circuitoBuffer[t.circuito_id].tareas.push(t);
    } else {
      if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
      bloques[nombreBloque].push({ tipo: "suelta", tarea: t });
    }
  });
  Object.entries(circuitoBuffer).forEach(([circuitoId, datos]) => {
    if (!bloques[datos.nombreBloque]) bloques[datos.nombreBloque] = [];
    bloques[datos.nombreBloque].push({
      tipo: "circuito",
      circuitoId,
      tareas: datos.tareas.slice().sort((a, b) => (Number(a.orden_en_circuito) || 999) - (Number(b.orden_en_circuito) || 999)),
    });
  });

  return (
    <div style={{ background: ds.surface, border: `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: dsR.lg, overflow: "hidden" }}>
      <div onClick={() => setAbierta((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {sesion.nombre && <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.accent, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sesion.nombre}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esHoy && !compacta && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>
                HOY
              </span>
            )}
            {!compacta && (sesion.fechas || []).map((f) => (
              <span key={f} style={{ fontSize: 13, fontWeight: 600, color: ds.ink }}>
                {fmtDateShort(f)}
              </span>
            ))}
            {!compacta && !(sesion.fechas || []).length && <span style={{ fontSize: 13, fontWeight: 600, color: ds.inkMuted }}>Sin fecha todavía</span>}
            {sesion.md && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 4, padding: "1px 6px" }}>{sesion.md}</span>
            )}
            {sesion.enviada ? (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, border: `1px solid ${ds.successBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>✓ ENVIADA</span>
            ) : (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.warning, border: `1px solid ${ds.warning}55`, borderRadius: 4, padding: "1px 6px" }}>BORRADOR</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 3 }}>
            {!sesion.jugadores_destino || !sesion.jugadores_destino.length ? "Todo el equipo" : `${sesion.jugadores_destino.length} jugador(es)`}
            {(sesion.fechas || []).length > 1 && (compacta ? ` · también: ${sesion.fechas.slice().sort().map((f) => fmtDateShort(f)).join(", ")}` : ` · lote de ${sesion.fechas.length} fechas`)}
          </div>
        </div>
        <span style={{ color: ds.inkMuted, fontSize: 12, transform: abierta ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierta && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {sesion.objetivo && (
            <div style={{ fontSize: 12, color: ds.inkSecondary }}>
              <strong style={{ color: ds.ink }}>Objetivo:</strong> {sesion.objetivo}
            </div>
          )}
          {Object.entries(bloques).map(([nombreBloque, items]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 6 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) =>
                  item.tipo === "circuito" ? (
                    <div key={item.circuitoId} style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: 8, display: "flex", flexDirection: "column", gap: 6, background: `${ds.surface}40` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>CIRCUITO</span>
                      </div>
                      {item.tareas.map((t, i) => (
                        <TareaVisualReal
                          key={t.id}
                          tarea={{
                            nombre: `${i + 1}. ${t.nombreEjercicio}`,
                            detalle: formatearDetalleTareaCoach(t),
                            gif: t.gif_url,
                            nota: t.nota,
                            materiales: parseMateriales(t.material),
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <TareaVisualReal
                      key={item.tarea.id}
                      tarea={{
                        nombre: item.tarea.nombreEjercicio,
                        detalle: formatearDetalleTareaCoach(item.tarea),
                        gif: item.tarea.gif_url,
                        nota: item.tarea.nota,
                        materiales: parseMateriales(item.tarea.material),
                      }}
                    />
                  )
                )}
              </div>
            </div>
          ))}
          {!soloLectura && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4, borderTop: `1px solid ${ds.border}`, marginTop: 2 }}>
              <DsButton variant="secondary" size="sm" onClick={() => onEditar(sesion)} >
                Editar esta sesión
              </DsButton>
              {onReutilizar && (
                <DsButton variant="secondary" size="sm" onClick={() => onReutilizar(sesion)} style={{ borderColor: ds.accentBorderSubtle, color: ds.accent }}>
                  Reutilizar como nueva
                </DsButton>
              )}
              {confirmando ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: ds.danger }}>
                    {jugadoresConRegistros > 0
                      ? `${jugadoresConRegistros} jugador${jugadoresConRegistros === 1 ? "" : "es"} ya registr${jugadoresConRegistros === 1 ? "ó" : "aron"} esta sesión. Si la eliminas, su entrenamiento se conserva pero ya no podrá asociarse a ella. ¿Eliminarla igualmente?`
                      : sesion.enviada
                      ? "Esta sesión ya se envió — ¿eliminarla igualmente?"
                      : "¿Eliminar esta sesión? No se puede deshacer."}
                  </span>
                  <button
                    onClick={async () => {
                      setBorrando(true);
                      await onEliminar(sesion.id);
                    }}
                    disabled={borrando}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.danger}`, background: `${ds.danger}22`, color: ds.danger, cursor: "pointer", fontWeight: 600, opacity: borrando ? 0.6 : 1 }}
                  >
                    {borrando ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                  <button onClick={() => setConfirmando(false)} disabled={borrando} style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <DsButton variant="danger" size="sm" onClick={() => setConfirmando(true)} style={{ marginLeft: "auto" }}>
                  Eliminar sesión
                </DsButton>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
