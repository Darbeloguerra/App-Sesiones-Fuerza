import React, { useState } from "react";

const HOY = "2026-08-20";

const SESIONES_INICIALES = [
  {
    id: "s1-separada",
    fechas: ["2026-08-20"],
    md: "MD-2",
    jugadores: "Roster completo · sub-19",
    enviada: true,
    loteOriginalId: "lote-1",
    bloques: [
      {
        nombre: "Activación",
        editable: true,
        tareas: [{ key: 1, nombre: "Bici estática", detalle: "8 min" }],
      },
      {
        nombre: "Movilidad",
        editable: false,
        tareas: [{ key: 1, nombre: "Movilidad cadera 90/90", detalle: "2 × 30 seg" }],
      },
      {
        nombre: "Preventivo",
        editable: false,
        categoria: "Isquiotibiales (muscular)",
        tareas: [{ key: 1, nombre: "Nordic curl", detalle: "3 × 6 reps" }],
      },
      {
        nombre: "Core",
        editable: true,
        tareas: [{ key: 1, nombre: "Plancha frontal", detalle: "3 × 30 seg" }],
      },
      {
        nombre: "Fuerza",
        editable: true,
        tareas: [
          { key: 1, nombre: "Sentadilla trasera", detalle: "5 × 5 reps · RIR objetivo 2" },
          { key: 2, nombre: "RDL a una pierna", detalle: "3 × 8 reps" },
        ],
      },
    ],
  },
  {
    id: "s1-resto",
    fechas: ["2026-08-23", "2026-08-27"],
    md: "MD-2",
    jugadores: "Roster completo · sub-19",
    loteOriginalId: "lote-1",
    bloques: [
      {
        nombre: "Activación",
        editable: true,
        tareas: [{ key: 1, nombre: "Bici estática", detalle: "8 min" }],
      },
      {
        nombre: "Movilidad",
        editable: false,
        tareas: [{ key: 1, nombre: "Rotación torácica", detalle: "3 × 10 reps" }],
      },
      {
        nombre: "Preventivo",
        editable: false,
        categoria: "Isquiotibiales (muscular)",
        tareas: [{ key: 1, nombre: "Curl nórdico asistido", detalle: "3 × 6 reps" }],
      },
      {
        nombre: "Core",
        editable: true,
        tareas: [{ key: 1, nombre: "Plancha frontal", detalle: "3 × 30 seg" }],
      },
      {
        nombre: "Fuerza",
        editable: true,
        tareas: [
          { key: 1, nombre: "Sentadilla trasera", detalle: "5 × 5 reps · RIR objetivo 2" },
          { key: 2, nombre: "RDL a una pierna", detalle: "3 × 8 reps" },
        ],
      },
    ],
  },
  {
    id: "s2",
    fechas: ["2026-08-22", "2026-08-25", "2026-08-29"],
    md: null,
    jugadores: "Roster completo · sub-19",
    bloques: [
      {
        nombre: "Activación",
        editable: true,
        tareas: [{ key: 1, nombre: "Bici estática", detalle: "8 min" }],
      },
      {
        nombre: "Movilidad",
        editable: false,
        tareas: [{ key: 1, nombre: "Movilidad cadera 90/90", detalle: "2 × 30 seg" }],
      },
      {
        nombre: "Preventivo",
        editable: false,
        categoria: "Aductores",
        tareas: [{ key: 1, nombre: "Copenhagen plank", detalle: "3 × 20 seg" }],
      },
      {
        nombre: "Core",
        editable: true,
        tareas: [{ key: 1, nombre: "Dead bug", detalle: "3 × 12 reps" }],
      },
      {
        nombre: "Fuerza",
        editable: true,
        tareas: [{ key: 1, nombre: "Press banca", detalle: "4 × 6 reps" }],
      },
    ],
  },
  {
    id: "s3",
    fechas: ["2026-09-03"],
    md: "MD-4",
    jugadores: "Roster completo · sub-19",
    bloques: [
      { nombre: "Activación", editable: true, desactivada: true },
      {
        nombre: "Movilidad",
        editable: false,
        tareas: [{ key: 1, nombre: "Movilidad cadera 90/90", detalle: "2 × 30 seg" }],
      },
      {
        nombre: "Resistencia",
        editable: true,
        tareas: [{ key: 1, nombre: "Sprint progresivo", detalle: "6 interv. · 20s trabajo · 40s recup." }],
      },
    ],
  },
];

function formatearFecha(f) {
  const d = new Date(f + "T00:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function TareaVisual({ tarea, editable, onEliminar }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#122440",
        border: "1px solid #1A3050",
        borderRadius: 8,
        padding: "8px 10px",
      }}
    >
      {tarea.gif ? (
        <img
          src={tarea.gif}
          alt=""
          style={{ width: 42, height: 42, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 7,
            background: "#0E1E35",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#4A6680",
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          GIF
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "#F0F4FF" }}>{tarea.nombre}</div>
        <div style={{ fontSize: 10.5, color: "#4A6680", fontFamily: "'IBM Plex Mono', monospace" }}>
          {tarea.detalle}
        </div>
        {tarea.nota && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, fontSize: 10, color: "#8BA4C0" }}>
            <span style={{ color: "#F97316" }}>📝</span>
            <span>{tarea.nota}</span>
          </div>
        )}
      </div>
      {editable && onEliminar && (
        <button
          onClick={onEliminar}
          style={{
            background: "none",
            border: "1px solid #1A3050",
            borderRadius: 6,
            color: "#4A6680",
            width: 24,
            height: 24,
            cursor: "pointer",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function TarjetaSesion({ sesion, esHoy, onEliminarTarea, onAgregarTareaEjemplo }) {
  const [abierta, setAbierta] = useState(esHoy);
  const [editando, setEditando] = useState(false);

  return (
    <div
      style={{
        background: "#0E1E35",
        border: `1px solid ${esHoy ? "#F5C51866" : "#1A3050"}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setAbierta((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esHoy && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.05em",
                  color: "#F5C518",
                  border: "1px solid #F5C51855",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                HOY
              </span>
            )}
            {sesion.fechas.map((f) => (
              <span key={f} style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>
                {formatearFecha(f)}
              </span>
            ))}
            {sesion.md && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9.5,
                  color: "#8BA4C0",
                  border: "1px solid #1A3050",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                {sesion.md}
              </span>
            )}
            {sesion.enviada && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9.5,
                  color: "#22C55E",
                  border: "1px solid #22C55E55",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                ✓ ENVIADA
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "#4A6680", marginTop: 3 }}>
            {sesion.jugadores}
            {sesion.fechas.length > 1 && ` · lote de ${sesion.fechas.length} fechas`}
          </div>
        </div>
        <span style={{ color: "#4A6680", fontSize: 12, transform: abierta ? "rotate(90deg)" : "none" }}>
          ›
        </span>
      </div>

      {abierta && (
        <div style={{ borderTop: "1px solid #1A3050", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {sesion.enviada ? (
            <div
              style={{
                fontSize: 11.5,
                color: "#F97316",
                background: "#F9731618",
                border: "1px solid #F9731655",
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              🔒 El jugador ya envió esta sesión — solo visualización, no se puede modificar
              {sesion.loteOriginalId
                ? ". Al enviarse, esta fecha se separó automáticamente del resto del lote, que sigue editable."
                : "."}
            </div>
          ) : (
            (sesion.fechas.length > 1 || sesion.loteOriginalId) && (
              <div style={{ fontSize: 11, color: "#4A6680", background: "#122440", borderRadius: 6, padding: "6px 10px" }}>
                {sesion.fechas.length > 1 &&
                  `Editar aquí afecta a las ${sesion.fechas.length} fechas de este lote (${sesion.fechas.map(formatearFecha).join(" · ")}). `}
                {sesion.loteOriginalId && "Una fecha de este lote ya se envió y se gestiona aparte (solo lectura)."}
              </div>
            )
          )}

          {sesion.bloques.map((b) => (
            <div key={b.nombre}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8BA4C0" }}>{b.nombre}</span>
                {b.categoria && (
                  <span style={{ fontSize: 10, color: "#22C55E", fontFamily: "'IBM Plex Mono', monospace" }}>
                    · {b.categoria}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8.5,
                    letterSpacing: "0.05em",
                    color: b.editable ? "#F5C518" : "#22C55E",
                    border: `1px solid ${b.editable ? "#F5C51855" : "#22C55E55"}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {b.editable ? "EDITABLE" : "AUTOMÁTICO"}
                </span>
              </div>

              {b.desactivada ? (
                <div style={{ fontSize: 11.5, color: "#4A6680", fontStyle: "italic", paddingLeft: 2 }}>
                  Desactivada esta sesión — el jugador no la ve
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(b.tareas || []).map((t) => (
                    <TareaVisual
                      key={t.key}
                      tarea={t}
                      editable={editando && b.editable}
                      onEliminar={() => onEliminarTarea(sesion.id, b.nombre, t.key)}
                    />
                  ))}
                  {editando && b.editable && (
                    <button
                      onClick={() => onAgregarTareaEjemplo(sesion.id, b.nombre)}
                      style={{
                        alignSelf: "flex-start",
                        fontSize: 11,
                        color: "#F5C518",
                        background: "transparent",
                        border: "1px dashed #F5C51866",
                        borderRadius: 6,
                        padding: "5px 9px",
                        cursor: "pointer",
                      }}
                    >
                      + Añadir tarea desde biblioteca
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {!sesion.enviada && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setEditando((v) => !v)}
                style={{
                  fontSize: 12.5,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: `1px solid ${editando ? "#F5C518" : "#1A3050"}`,
                  background: editando ? "#F5C51822" : "transparent",
                  color: editando ? "#F5C518" : "#8BA4C0",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {editando ? "Terminar edición" : "Editar esta sesión"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Programacion() {
  const [sesiones, setSesiones] = useState(SESIONES_INICIALES);

  const eliminarTarea = (sesionId, nombreBloque, tareaKey) => {
    setSesiones((prev) =>
      prev.map((s) =>
        s.id !== sesionId
          ? s
          : {
              ...s,
              bloques: s.bloques.map((b) =>
                b.nombre !== nombreBloque ? b : { ...b, tareas: (b.tareas || []).filter((t) => t.key !== tareaKey) }
              ),
            }
      )
    );
  };

  const agregarTareaEjemplo = (sesionId, nombreBloque) => {
    setSesiones((prev) =>
      prev.map((s) =>
        s.id !== sesionId
          ? s
          : {
              ...s,
              bloques: s.bloques.map((b) =>
                b.nombre !== nombreBloque
                  ? b
                  : {
                      ...b,
                      tareas: [
                        ...(b.tareas || []),
                        { key: Date.now(), nombre: "Nuevo ejercicio", detalle: "Pendiente de configurar" },
                      ],
                    }
              ),
            }
      )
    );
  };

  const hoy = sesiones.filter((s) => s.fechas.includes(HOY));
  const futuras = sesiones
    .filter((s) => !s.fechas.includes(HOY))
    .slice()
    .sort((a, b) => a.fechas[0].localeCompare(b.fechas[0]));

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
            PROGRAMACIÓN
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
            Sesiones
          </h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
            {hoy.length > 0 ? "Sesión de hoy y próximas programadas" : "Próximas sesiones programadas"}
          </div>
        </div>

        {hoy.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.05em",
                color: "#4A6680",
                marginBottom: 8,
              }}
            >
              HOY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hoy.map((s) => (
                <TarjetaSesion
                  key={s.id}
                  sesion={s}
                  esHoy
                  onEliminarTarea={eliminarTarea}
                  onAgregarTareaEjemplo={agregarTareaEjemplo}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.05em",
              color: "#4A6680",
              marginBottom: 8,
            }}
          >
            PRÓXIMAS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {futuras.map((s) => (
              <TarjetaSesion
                key={s.id}
                sesion={s}
                esHoy={false}
                onEliminarTarea={eliminarTarea}
                onAgregarTareaEjemplo={agregarTareaEjemplo}
              />
            ))}
            {futuras.length === 0 && (
              <div style={{ color: "#4A6680", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
                No hay más sesiones programadas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
