// Optimización de vídeos en el propio dispositivo antes de subirlos.
//
// Un vídeo de iPad/iPhone suele ser 4K a 60 fps y pesar decenas de MB; para
// enseñar un gesto basta con 720p sin audio (unos cientos de KB). Se reproduce
// el vídeo original en un <video> oculto, se dibuja cada fotograma en un canvas
// a 720p y se graba ese canvas con MediaRecorder. Safari lo guarda en MP4
// (H.264), que se ve en iPhone y Android; otros navegadores usan WebM.
//
// La grabación va al ritmo del propio vídeo (uno de 8 s tarda unos 8 s) y la
// pantalla debe seguir encendida.

export const ALTO_VIDEO = 720;
export const BITRATE_VIDEO = 1200000;
const FPS_VIDEO = 30;
const TIPOS = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

const tipoSoportado = () => (typeof MediaRecorder === "undefined" ? null : TIPOS.find((t) => MediaRecorder.isTypeSupported(t)) || null);

export function soportaOptimizarVideo() {
  return typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined" && !!HTMLCanvasElement.prototype.captureStream && !!tipoSoportado();
}

// Devuelve { blob, ext, poster } (poster: JPEG del primer segundo, o null). Rechaza con un Error de mensaje legible para el entrenador.
// onProgreso(0-100) se llama mientras se graba.
export function optimizarVideo(file, onProgreso) {
  return new Promise((resolve, reject) => {
    if (!soportaOptimizarVideo()) {
      reject(new Error("Este navegador no puede optimizar vídeos."));
      return;
    }
    const mime = tipoSoportado();
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    // En el documento (invisible): algunos navegadores móviles no reproducen un <video> suelto.
    v.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(v);
    let activo = true;
    let rec = null;
    const limpiar = () => {
      activo = false;
      try {
        v.pause();
      } catch {
        /* nada que pausar */
      }
      v.removeAttribute("src");
      v.remove();
      URL.revokeObjectURL(url);
    };
    const fallar = (mensaje) => {
      limpiar();
      reject(new Error(mensaje));
    };
    v.onerror = () => fallar("No se pudo leer el vídeo.");
    v.onloadedmetadata = () => {
      if (!v.videoWidth || !v.videoHeight) {
        fallar("No se pudo leer el vídeo.");
        return;
      }
      const H = Math.min(ALTO_VIDEO, v.videoHeight);
      const W = Math.round((v.videoWidth * H) / v.videoHeight / 2) * 2;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      try {
        rec = new MediaRecorder(canvas.captureStream(FPS_VIDEO), { mimeType: mime, videoBitsPerSecond: BITRATE_VIDEO });
      } catch {
        fallar("Este navegador no puede optimizar vídeos.");
        return;
      }
      const partes = [];
      // Imagen de portada: Safari no enseña ningún fotograma de un MP4 grabado
      // así hasta pulsar play, por eso se guarda aparte una foto del vídeo.
      let posterP = null;
      const sacarPoster = () =>
        new Promise((res) => {
          try {
            canvas.toBlob((b) => res(b && b.size ? b : null), "image/jpeg", 0.8);
          } catch {
            res(null);
          }
        });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) partes.push(e.data);
      };
      rec.onstop = () => {
        const salida = new Blob(partes, { type: mime.split(";")[0] });
        limpiar();
        if (!salida.size) {
          reject(new Error("La optimización no produjo vídeo."));
          return;
        }
        if (onProgreso) onProgreso(100);
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        (posterP || sacarPoster()).then((poster) => resolve({ blob: salida, ext, poster }));
      };
      // Un fotograma de canvas por cada fotograma nuevo del vídeo (si el navegador lo permite).
      const siguiente = () => {
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(pintar);
        else requestAnimationFrame(pintar);
      };
      const pintar = () => {
        if (!activo) return;
        ctx.drawImage(v, 0, 0, W, H);
        if (!posterP && v.currentTime >= 0.4) posterP = sacarPoster();
        if (onProgreso && v.duration) onProgreso(Math.min(99, (v.currentTime / v.duration) * 100));
        siguiente();
      };
      v.onended = () => {
        activo = false;
        try {
          rec.stop();
        } catch {
          fallar("La optimización se interrumpió.");
        }
      };
      rec.start(250);
      v.play()
        .then(siguiente)
        .catch(() => {
          rec.onstop = null;
          try {
            rec.stop();
          } catch {
            /* ya parado */
          }
          fallar("El navegador no dejó reproducir el vídeo para optimizarlo.");
        });
    };
    v.src = url;
  });
}
