import React, { useState } from "react";

const ROSTER_INICIAL = [
  { id: 1, nombre: "Marcos G.", pin: "4821", estado: "activo", categorias: ["Isquiotibiales (muscular)"] },
  { id: 2, nombre: "Iván R.", pin: "7734", estado: "activo", categorias: [] },
  { id: 3, nombre: "Adrián P.", pin: "2290", estado: "suspendido", categorias: ["Rotuliana"] },
  { id: 4, nombre: "Diego S.", pin: "5567", estado: "activo", categorias: ["Aductores", "Isquiotibiales (muscular)"] },
  { id: 5, nombre: "Rubén M.", pin: "9012", estado: "suspendido", categorias: [] },
];

const CATEGORIAS_DISPONIBLES = [
  { nombre: "Isquiotibiales (muscular)", tipo: "Muscular", ejercicios: 3 },
  { nombre: "Cuádriceps", tipo: "Muscular", ejercicios: 0 },
  { nombre: "Aductores", tipo: "Muscular", ejercicios: 2 },
  { nombre: "Sóleo/Gemelo", tipo: "Muscular", ejercicios: 0 },
  { nombre: "Rotuliana", tipo: "Tendinosa", ejercicios: 1 },
  { nombre: "Aquílea", tipo: "Tendinosa", ejercicios: 0 },
  { nombre: "Isquiotibial (tendinoso)", tipo: "Tendinosa", ejercicios: 0 },
  { nombre: "Pubalgia", tipo: "Articular", ejercicios: 0 },
  { nombre: "Cadera", tipo: "Articular", ejercicios: 0 },
  { nombre: "Rodilla", tipo: "Articular", ejercicios: 0 },
  { nombre: "Lumbar", tipo: "Articular", ejercicios: 0 },
  { nombre: "Hombro", tipo: "Articular", ejercicios: 0 },
];

function Chip({ children, tono = "neutro" }) {
  const tonos = {
    neutro: { color: "#8BA4C0", border: "#1A305033" },
    verde: { color: "#F5C518", border: "#F5C51855" },
    ambar: { color: "#F97316", border: "#F9731655" },
  };
  const t = tonos[tono];
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
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

function SelectorCategorias({ seleccionadas, onCambiar, onCerrar }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "120%",
        zIndex: 20,
        width: 180,
        background: "#122440",
        border: "1px solid #1A3050",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 8,
      }}
      onMouseLeave={onCerrar}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9.5,
          color: "#4A6680",
          padding: "2px 4px 6px",
        }}
      >
        CATEGORÍAS PREVENTIVAS
      </div>
      {["Muscular", "Tendinosa", "Articular"].map((tipo) => (
        <div key={tipo}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.05em",
              color: "#F5C518",
              padding: "6px 6px 3px",
            }}
          >
            {tipo.toUpperCase()}
          </div>
          {CATEGORIAS_DISPONIBLES.filter((c) => c.tipo === tipo).map((cat) => {
            const activa = seleccionadas.includes(cat.nombre);
            const vacia = cat.ejercicios === 0;
            return (
              <div
                key={cat.nombre}
                onClick={() =>
                  onCambiar(
                    activa ? seleccionadas.filter((c) => c !== cat.nombre) : [...seleccionadas, cat.nombre]
                  )
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 6px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: activa ? "#F5C518" : "#8BA4C0",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: `1.5px solid ${activa ? "#F5C518" : "#1A3050"}`,
                    background: activa ? "#F5C518" : "transparent",
                    color: "#060D1A",
                    fontSize: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {activa ? "✓" : ""}
                </span>
                <span style={{ flex: 1 }}>{cat.nombre}</span>
                {vacia && (
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      color: "#F97316",
                      whiteSpace: "nowrap",
                    }}
                    title="Esta categoría no tiene ejercicios en su pool todavía — no se aplicará hasta que añadas alguno"
                  >
                    sin ejerc.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MenuAcciones({ jugador, onAccion, onCerrar }) {
  const acciones = [
    { id: "pin", label: "Consultar PIN" },
    { id: "reset", label: "Resetear PIN" },
    { id: "historial", label: "Ver historial" },
    jugador.estado === "activo"
      ? { id: "suspender", label: "Suspender jugador", tono: "ambar" }
      : { id: "activar", label: "Activar jugador", tono: "verde" },
    { id: "eliminar", label: "Eliminar perfil", tono: "peligro" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "110%",
        zIndex: 20,
        width: 190,
        background: "#122440",
        border: "1px solid #1A3050",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 6,
      }}
      onMouseLeave={onCerrar}
    >
      {acciones.map((a) => {
        const color = a.tono === "peligro" ? "#EF4444" : a.tono === "ambar" ? "#F97316" : a.tono === "verde" ? "#22C55E" : "#F0F4FF";
        return (
          <div
            key={a.id}
            onClick={() => {
              onAccion(a.id);
              onCerrar();
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 12.5,
              color,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {a.label}
          </div>
        );
      })}
    </div>
  );
}

function FilaJugador({ jugador, onAccion, onCambiarCategorias }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const suspendido = jugador.estado === "suspendido";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px",
        background: "#0E1E35",
        border: `1px solid ${suspendido ? "#F9731633" : "#1A3050"}`,
        borderRadius: 10,
        opacity: suspendido ? 0.7 : 1,
      }}
    >
      {/* Indicador de estado */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: suspendido ? "#F97316" : "#22C55E",
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>{jugador.nombre}</span>
          {suspendido && <Chip tono="ambar">SUSPENDIDO</Chip>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {jugador.categorias.length > 0 ? (
            jugador.categorias.map((c) => (
              <Chip key={c} tono="verde">
                {c}
              </Chip>
            ))
          ) : (
            <span style={{ fontSize: 11, color: "#4A6680" }}>Sin categoría preventiva</span>
          )}
          <span
            onClick={() => setSelectorAbierto((v) => !v)}
            style={{
              fontSize: 11,
              color: "#4A6680",
              cursor: "pointer",
              border: "1px dashed #1A3050",
              borderRadius: 4,
              padding: "0px 5px",
            }}
            title="Editar categorías preventivas"
          >
            +
          </span>
          {selectorAbierto && (
            <SelectorCategorias
              seleccionadas={jugador.categorias}
              onCambiar={(nuevas) => onCambiarCategorias(jugador.id, nuevas)}
              onCerrar={() => setSelectorAbierto(false)}
            />
          )}
        </div>
      </div>

      {/* PIN */}
      <div
        onClick={() => setPinVisible((v) => !v)}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12.5,
          color: "#4A6680",
          cursor: "pointer",
          minWidth: 50,
          textAlign: "center",
        }}
        title="Mostrar/ocultar PIN"
      >
        {pinVisible ? jugador.pin : "••••"}
      </div>

      {/* Menú */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: "#4A6680",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ⋮
        </button>
        {menuAbierto && (
          <MenuAcciones
            jugador={jugador}
            onAccion={(id) => onAccion(jugador.id, id)}
            onCerrar={() => setMenuAbierto(false)}
          />
        )}
      </div>
    </div>
  );
}

function generarPin(existentes) {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (existentes.includes(pin));
  return pin;
}

function PanelAlta({ pinsExistentes, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [modoPin, setModoPin] = useState("auto"); // "auto" | "manual"
  const [pinManual, setPinManual] = useState("");

  const pinFinal = modoPin === "auto" ? null : pinManual;
  const pinManualDuplicado = modoPin === "manual" && pinManual.length === 4 && pinsExistentes.includes(pinManual);
  const puedeGuardar =
    nombre.trim().length > 0 && (modoPin === "auto" || (pinManual.length === 4 && !pinManualDuplicado));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 30,
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#0E1E35",
          border: "1px solid #1A3050",
          borderRadius: "16px 16px 0 0",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F4FF" }}>Añadir jugador</div>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>NOMBRE</span>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Pablo Fernández"
            style={{
              background: "#122440",
              border: "1px solid #1A3050",
              borderRadius: 7,
              color: "#F0F4FF",
              fontSize: 13.5,
              padding: "9px 10px",
            }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
            PIN DE ACCESO
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "auto", label: "Generar automáticamente" },
              { id: "manual", label: "Introducir el mío" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => setModoPin(op.id)}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: "8px 8px",
                  borderRadius: 7,
                  border: `1px solid ${modoPin === op.id ? "#F5C518" : "#1A3050"}`,
                  background: modoPin === op.id ? "#F5C51822" : "transparent",
                  color: modoPin === op.id ? "#F5C518" : "#8BA4C0",
                  cursor: "pointer",
                }}
              >
                {op.label}
              </button>
            ))}
          </div>

          {modoPin === "manual" && (
            <div>
              <input
                value={pinManual}
                onChange={(e) => setPinManual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 dígitos"
                inputMode="numeric"
                style={{
                  width: 100,
                  background: "#122440",
                  border: `1px solid ${pinManualDuplicado ? "#EF4444" : "#1A3050"}`,
                  borderRadius: 7,
                  color: "#F0F4FF",
                  fontSize: 15,
                  padding: "8px 10px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  textAlign: "center",
                  letterSpacing: "0.15em",
                }}
              />
              {pinManualDuplicado && (
                <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5 }}>
                  Ese PIN ya lo usa otro jugador — elige otro.
                </div>
              )}
            </div>
          )}
          {modoPin === "auto" && (
            <div style={{ fontSize: 11, color: "#4A6680" }}>
              Se generará un PIN de 4 dígitos que no coincide con ningún otro del roster.
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            onClick={onCerrar}
            style={{
              background: "transparent",
              border: "1px solid #1A3050",
              color: "#8BA4C0",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            disabled={!puedeGuardar}
            onClick={() => {
              const pin = modoPin === "auto" ? generarPin(pinsExistentes) : pinManual;
              onGuardar({ nombre: nombre.trim(), pin });
            }}
            style={{
              background: puedeGuardar ? "#F5C518" : "#1A3050",
              border: `1px solid ${puedeGuardar ? "#F5C518" : "#1A3050"}`,
              color: puedeGuardar ? "#060D1A" : "#4A6680",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: puedeGuardar ? "pointer" : "not-allowed",
            }}
          >
            Añadir jugador
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestionRoster() {
  const [roster, setRoster] = useState(ROSTER_INICIAL);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [panelAltaAbierto, setPanelAltaAbierto] = useState(false);

  const manejarAccion = (id, accion) => {
    if (accion === "suspender") {
      setRoster((prev) => prev.map((j) => (j.id === id ? { ...j, estado: "suspendido" } : j)));
    } else if (accion === "activar") {
      setRoster((prev) => prev.map((j) => (j.id === id ? { ...j, estado: "activo" } : j)));
    } else if (accion === "eliminar") {
      setRoster((prev) => prev.filter((j) => j.id !== id));
    }
    // pin / reset / historial son solo mockup visual aquí
  };

  const agregarJugador = ({ nombre, pin }) => {
    setRoster((prev) => [
      ...prev,
      { id: Date.now(), nombre, pin, estado: "activo", categorias: [] },
    ]);
    setPanelAltaAbierto(false);
  };

  const cambiarCategorias = (id, nuevas) => {
    setRoster((prev) => prev.map((j) => (j.id === id ? { ...j, categorias: nuevas } : j)));
  };

  const visibles = roster
    .filter((j) => (filtro === "todos" ? true : j.estado === filtro))
    .filter((j) => j.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const activos = roster.filter((j) => j.estado === "activo").length;
  const suspendidos = roster.filter((j) => j.estado === "suspendido").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "24px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <button
          onClick={() => {}}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            color: "#8BA4C0",
            fontSize: 12.5,
            cursor: "pointer",
            padding: 0,
            marginBottom: 14,
          }}
        >
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#F5C518",
              marginBottom: 4,
            }}
          >
            ROSTER · SUB-19
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
            Jugadores
          </h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
            {activos} activos · {suspendidos} suspendidos
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar jugador..."
            style={{
              flex: 1,
              minWidth: 160,
              background: "#0E1E35",
              border: "1px solid #1A3050",
              borderRadius: 8,
              color: "#F0F4FF",
              fontSize: 13,
              padding: "8px 10px",
            }}
          />
          {[
            { id: "todos", label: "Todos" },
            { id: "activo", label: "Activos" },
            { id: "suspendido", label: "Suspendidos" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                fontSize: 12.5,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${filtro === f.id ? "#F5C518" : "#1A3050"}`,
                background: filtro === f.id ? "#F5C51822" : "transparent",
                color: filtro === f.id ? "#F5C518" : "#8BA4C0",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibles.map((j) => (
            <FilaJugador key={j.id} jugador={j} onAccion={manejarAccion} onCambiarCategorias={cambiarCategorias} />
          ))}
          {visibles.length === 0 && (
            <div style={{ color: "#4A6680", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              Sin jugadores en este filtro
            </div>
          )}
        </div>

        <button
          onClick={() => setPanelAltaAbierto(true)}
          style={{
            width: "100%",
            marginTop: 16,
            background: "transparent",
            border: "1px dashed #F5C51866",
            color: "#F5C518",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Añadir jugador
        </button>
      </div>

      {panelAltaAbierto && (
        <PanelAlta
          pinsExistentes={roster.map((j) => j.pin)}
          onGuardar={agregarJugador}
          onCerrar={() => setPanelAltaAbierto(false)}
        />
      )}
    </div>
  );
}
