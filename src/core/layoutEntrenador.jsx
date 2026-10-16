import { Zap, Bell } from "lucide-react";
import { ds, dsF, dsR, GlobalStyles, DsNavItem, DsAvatar, DsButton } from "./designSystem.jsx";
import { useAnchoVentana, PantallaBase } from "./layout.jsx";
import { useEntityList } from "./hooks.js";

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
  const SIDEBAR_ITEMS = [{ id: "dashboard", nombre: "Inicio", icono: "grid" }, ...MODULOS_DASHBOARD];
  // Aviso de peticiones de sesión sin mirar (Calendario → jugador pide un
  // día) — solo dentro de la app, un badge aquí es lo más parecido a una
  // notificación que hay sin infraestructura de push/email.
  const pendientesCount = useSolicitudesPendientesCount();
  return (
    <div style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", padding: "18px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 22 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}><Zap size={15} fill={ds.accentInk} /></div>
        <div>
          <div style={{ fontFamily: dsF.display, fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>FUERZA</div>
          <div style={{ fontFamily: dsF.mono, fontSize: 8.5, color: ds.inkMuted, letterSpacing: "0.06em" }}>PANEL DE ENTRENADOR</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {SIDEBAR_ITEMS.map((m) => (
          <DsNavItem key={m.id} active={m.id === activo} onClick={() => onAbrirModulo(m.id)} icon={m.id === "dashboard" ? <IconoGridSidebar /> : <IconoModulo tipo={m.icono} />}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              {m.nombre}
              {m.id === "calendario" && pendientesCount > 0 && (
                <span style={{ marginLeft: "auto", background: ds.warning, color: "#1A0F00", fontFamily: dsF.mono, fontSize: 9.5, fontWeight: 800, borderRadius: dsR.full, padding: "1px 6px", minWidth: 16, textAlign: "center" }}>
                  {pendientesCount}
                </span>
              )}
            </span>
          </DsNavItem>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${ds.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DsAvatar size={30}>D</DsAvatar>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>David</div>
            <div style={{ fontSize: 10.5, color: ds.inkMuted }}>Entrenador</div>
          </div>
        </div>
        <DsButton variant="secondary" size="sm" onClick={onCerrarSesion}>Cerrar sesión</DsButton>
      </div>
    </div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16 }}>
            <div style={{ flex: 1, maxWidth: 280, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "6px 12px", color: ds.inkMuted, fontSize: 12 }}>
              🔍 Buscar jugador, ejercicio...
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <div style={{ width: 27, height: 27, borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary, flexShrink: 0 }}>
                <Bell size={13} />
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
