import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ds } from "./designSystem.jsx";
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
