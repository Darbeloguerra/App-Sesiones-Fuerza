import React from "react";

const MODULOS = [
  {
    id: "programacion",
    nombre: "Programación",
    descripcion: "Sesión de hoy y próximas programadas",
    icono: "calendario",
  },
  {
    id: "diseno",
    nombre: "Diseñar sesión",
    descripcion: "Crear una sesión nueva",
    icono: "lapiz",
  },
  {
    id: "roster",
    nombre: "Jugadores",
    descripcion: "Roster, PINs y categorías preventivas",
    icono: "personas",
  },
  {
    id: "biblioteca",
    nombre: "Biblioteca",
    descripcion: "Ejercicios, categorías y rotación",
    icono: "libro",
  },
  {
    id: "historial",
    nombre: "Historial",
    descripcion: "Registro diario por jugador",
    icono: "reloj",
  },
];

function Icono({ tipo }) {
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
    default:
      return null;
  }
}

function TarjetaModulo({ modulo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        background: "#0E1E35",
        border: "1px solid #1A3050",
        borderRadius: 12,
        padding: "16px 16px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: "#122440",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F5C518",
          flexShrink: 0,
        }}
      >
        <Icono tipo={modulo.icono} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#F0F4FF" }}>{modulo.nombre}</div>
        <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 2 }}>{modulo.descripcion}</div>
      </div>
      <span style={{ color: "#4A6680", fontSize: 16 }}>›</span>
    </button>
  );
}

export default function DashboardEntrenador() {
  const [moduloAbierto, setModuloAbierto] = React.useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "28px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#F5C518",
              marginBottom: 4,
            }}
          >
            MODO ENTRENADOR
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>
            Buenas, David
          </h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>Jueves, 20 ago 2026</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODULOS.map((m) => (
            <TarjetaModulo key={m.id} modulo={m} onClick={() => setModuloAbierto(m.id)} />
          ))}
        </div>

        {moduloAbierto && (
          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#4A6680",
              background: "#0E1E35",
              border: "1px solid #1A3050",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            En producción, esto navegaría a <strong style={{ color: "#8BA4C0" }}>{moduloAbierto}.jsx</strong>. Aquí
            son pantallas independientes — cada módulo abre su propio archivo.
          </div>
        )}
      </div>
    </div>
  );
}
