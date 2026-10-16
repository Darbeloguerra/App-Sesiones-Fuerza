import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ds, dsF, dsR } from "./designSystem.jsx";
import { extractYouTubeId, esVideoDirecto } from "./hooks.js";

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

export const TAGS_DESCRIPTIVOS_BIBLIOTECA = ["Miembro superior", "Miembro inferior", "Zona media", "Global"];

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
