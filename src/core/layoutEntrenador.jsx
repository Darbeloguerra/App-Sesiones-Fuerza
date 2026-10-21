import { useState } from "react";
import { Zap } from "lucide-react";
import { ds, dsF, dsR, GlobalStyles, DsNavItem, DsAvatar, DsButton, DsInput } from "./designSystem.jsx";
import { useAnchoVentana, PantallaBase } from "./layout.jsx";
import { accesoSesion, supabase } from "./backend.js";
import { useEntityList } from "./hooks.js";

// Cambio del código de entrenador (se guarda cifrado en Supabase; nadie, tampoco la
// app, puede volver a leerlo). Un código largo protege mucho más que uno de 4 cifras.
// Se abre como overlay (mismo patrón que PanelAltaReal/PanelGestionGruposReal en
// Roster.jsx) porque se dispara desde el pie de la barra lateral, disponible en
// cualquier pantalla — no cabría bien encajado en una columna de 232px.
export function PanelCodigoEntrenadorReal({ onCerrar }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [estado, setEstado] = useState({ guardando: false, error: "", ok: false });
  const guardar = async () => {
    const v = a.trim();
    if (v.length < 4) return setEstado({ guardando: false, error: "Mínimo 4 caracteres (recomendado: 8 o más).", ok: false });
    if (v !== b.trim()) return setEstado({ guardando: false, error: "Los dos códigos no coinciden.", ok: false });
    setEstado({ guardando: true, error: "", ok: false });
    try {
      const { data, error } = await supabase.rpc("cambiar_codigo_entrenador", { p_nuevo: v });
      if (error) throw error;
      if (!data || !data.ok) {
        const msg = data?.error === "igual_que_un_jugador" ? "Ese código ya es el PIN de un jugador. Elige otro." : data?.error === "corto" ? "Demasiado corto." : "No tienes permiso para cambiarlo.";
        return setEstado({ guardando: false, error: msg, ok: false });
      }
      setA("");
      setB("");
      setEstado({ guardando: false, error: "", ok: true });
    } catch {
      setEstado({ guardando: false, error: "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.", ok: false });
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }} onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>Código de entrenador</div>
        <div style={{ fontSize: 12, color: ds.inkSecondary, lineHeight: 1.5 }}>
          Se guarda cifrado: ni tú ni la app podréis volver a verlo, solo cambiarlo. Recomendado: 8 cifras o más; con 4 es fácil de adivinar.
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
          <DsInput type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Código nuevo" />
          <DsInput type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Repite el código" />
        </div>
        {estado.error && <div style={{ color: ds.danger, fontSize: 12 }}>{estado.error}</div>}
        {estado.ok && <div style={{ color: ds.success, fontSize: 12 }}>Código cambiado. Úsalo la próxima vez que entres.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <DsButton onClick={guardar} disabled={estado.guardando}>
            {estado.guardando ? "Guardando..." : "Guardar código"}
          </DsButton>
          <DsButton variant="secondary" onClick={onCerrar}>
            Cerrar
          </DsButton>
        </div>
      </div>
    </div>
  );
}

export function IconoModulo({ tipo }) {
  const common = { width: 20, height: 20, stroke: "currentColor", fill: "none", strokeWidth: 1.6 };
  switch (tipo) {
    case "calendario":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "lapiz":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "personas":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
          <circle cx="17.5" cy="9" r="2.4" />
          <path d="M15.8 14.2c2.7.3 4.7 2.4 4.7 5.3" />
        </svg>
      );
    case "libro":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "reloj":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "rayo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    // Icono para "Control de fatiga" — un pulso/zigzag, dibujado a mano en
    // el mismo estilo que el resto de este set (no es un icono de librería,
    // para no mezclar dos sistemas de iconos distintos en este único menú).
    case "pulso":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M2 13h4l2.5-7L13 19l2.5-9.5L17 13h5" />
        </svg>
      );
    default:
      return null;
  }
}

export const MODULOS_DASHBOARD = [
  { id: "calendario", nombre: "Calendario", descripcion: "Planifica sesiones futuras por equipo, grupo o jugador", icono: "calendario" },
  { id: "diseno", nombre: "Diseñar sesión", descripcion: "Crear una sesión nueva", icono: "lapiz" },
  { id: "roster", nombre: "Usuarios", descripcion: "Usuarios, grupos, PINs y categorías preventivas", icono: "personas" },
  { id: "biblioteca", nombre: "Biblioteca", descripcion: "Ejercicios, categorías y rotación", icono: "libro" },
  { id: "fatiga", nombre: "Control de fatiga", descripcion: "Salto CMJ, microciclos y estado del equipo", icono: "pulso" },
];

export function IconoGridSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

// Contador ligero para los badges de "Calendario" (menú lateral y accesos
// directos del Dashboard) — cuenta peticiones con estado='pendiente' tal
// cual están en la tabla, SIN cruzarlas contra `sesiones` (ese cruce, más
// caro, es el que hace el propio Calendario para decidir cuáles mostrar
// como accionables de verdad). Aquí basta con una señal barata de "tienes
// peticiones sin mirar" — sharedDataCache hace que llamarlo desde varios
// sitios a la vez no dispare peticiones de red repetidas.
export function useSolicitudesPendientesCount() {
  const [rows, , loaded] = useEntityList("solicitudesSesion", { estado: "pendiente" });
  return loaded ? rows.length : 0;
}

export function SidebarEntrenadorReal({ activo, onAbrirModulo, onCerrarSesion }) {
  // Barra lateral compacta (solo iconos, 72px): la misma en Inicio y en todos los
  // módulos, para que no cambie al navegar y deje todo el ancho al contenido.
  const SIDEBAR_ITEMS = [{ id: "dashboard", nombre: "Inicio", icono: "grid" }, ...MODULOS_DASHBOARD];
  // Aviso de peticiones de sesión sin mirar (Calendario → jugador pide un
  // día) — solo dentro de la app, un badge aquí es lo más parecido a una
  // notificación que hay sin infraestructura de push/email.
  const pendientesCount = useSolicitudesPendientesCount();
  // Código de entrenador: ajuste de cuenta, disponible desde cualquier pantalla.
  const [codigoAbierto, setCodigoAbierto] = useState(false);
  const puedeCambiarCodigo = accesoSesion.token && accesoSesion.rol === "entrenador";
  const estiloBoton = (act) => ({
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: "pointer",
    border: `1px solid ${act ? `${ds.accent}55` : "transparent"}`,
    background: act ? `${ds.accent}22` : "transparent",
    color: act ? ds.accent : ds.inkSecondary,
  });
  return (
    <nav aria-label="Módulos" style={{ width: 72, flexShrink: 0, boxSizing: "border-box", background: ds.bgElevated, borderRight: `1px solid ${ds.borderSoft}`, padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {SIDEBAR_ITEMS.map((m) => {
        const act = m.id === activo;
        const n = m.id === "calendario" ? pendientesCount : 0;
        return (
          <button key={m.id} type="button" title={m.nombre} aria-label={n > 0 ? `${m.nombre}, ${n} peticiones pendientes` : m.nombre} aria-current={act ? "page" : undefined} onClick={() => onAbrirModulo(m.id)} style={estiloBoton(act)}>
            {m.id === "dashboard" ? <IconoGridSidebar /> : <IconoModulo tipo={m.icono} />}
            {n > 0 && <span style={{ position: "absolute", top: 3, right: 3, fontFamily: dsF.mono, fontSize: 9, fontWeight: 500, background: ds.warning, color: "#1A0F00", borderRadius: 999, padding: "0 5px", lineHeight: "15px" }}>{n}</span>}
          </button>
        );
      })}
      <span style={{ flex: 1 }} />
      {puedeCambiarCodigo && (
        <button type="button" title="Código de entrenador" aria-label="Código de entrenador" onClick={() => setCodigoAbierto(true)} style={estiloBoton(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></svg>
        </button>
      )}
      <button type="button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={onCerrarSesion} style={estiloBoton(false)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5v16h4" /><path d="m16 8 4 4-4 4M20 12H9" /></svg>
      </button>
      {codigoAbierto && <PanelCodigoEntrenadorReal onCerrar={() => setCodigoAbierto(false)} />}
    </nav>
  );
}

// Envoltorio para las pantallas "sueltas" del entrenador (Programación,
// Biblioteca, Historial, Usuarios): en escritorio/iPad (≥1000px) llevan la
// misma barra lateral fija que el Dashboard, para que se sienta como un
// panel de verdad al moverte entre secciones — no una pantalla aparte con
// un enlace de "volver" cada vez. Por debajo de eso, se queda con la
// pantalla estrecha de móvil de siempre (con su propio botón de volver).
export function PantallaEntrenadorAncha({ activo, onAbrirModulo, onCerrarSesion, maxWidthCompacto = 560, children }) {
  const ancho = useAnchoVentana();
  if (ancho < 1000) {
    return (
      <PantallaBase rol="entrenador" maxWidth={maxWidthCompacto}>
        <div>
          <button onClick={() => onAbrirModulo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Volver a Inicio
          </button>
          {children}
        </div>
      </PantallaBase>
    );
  }
  return (
    <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas, color: ds.ink, fontFamily: dsF.sans, display: "flex" }}>
      <GlobalStyles />
      <SidebarEntrenadorReal activo={activo} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 18 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
