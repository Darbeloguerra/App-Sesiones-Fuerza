import React, { useState } from "react";

const SESION_JUGADOR = {
  jugador: "Marcos G.",
  fecha: "Jueves, 20 ago 2026",
  bloques: [
    {
      id: "activacion",
      numero: 1,
      nombre: "Activación",
      aplica: true,
      tareas: [{ id: "a1", nombre: "Bici estática", modo: "tiempo", cantidad: "8", series: null, unidad: "min" }],
    },
    {
      id: "movilidad",
      numero: 2,
      nombre: "Movilidad",
      aplica: true,
      tareas: [{ id: "m1", nombre: "Movilidad cadera 90/90", modo: "tiempo", cantidad: "30", series: "2", unidad: "seg" }],
    },
    {
      id: "preventivo",
      numero: 3,
      nombre: "Preventivo",
      aplica: true,
      categoria: "Isquios",
      tareas: [{ id: "p1", nombre: "Nordic curl", modo: "reps", cantidad: "6", series: "3", unidad: "reps" }],
    },
    {
      id: "core",
      numero: 4,
      nombre: "Core",
      aplica: true,
      tareas: [{ id: "c1", nombre: "Plancha frontal", modo: "tiempo", cantidad: "30", series: "3", unidad: "seg" }],
    },
    {
      id: "resistencia",
      numero: 5,
      nombre: "Resistencia",
      aplica: false,
      tareas: [],
    },
    {
      id: "fuerza",
      numero: 6,
      nombre: "Fuerza",
      aplica: true,
      tareas: [
        {
          id: "f1",
          nombre: "Sentadilla trasera",
          modo: "reps",
          cantidad: "5",
          series: "5",
          unidad: "reps",
          referencia: "100kg × 5 · RIR2",
          pedirCarga: true,
          tipoResistencia: "Peso libre",
        },
      ],
      circuitos: [
        {
          id: "circ1",
          tareas: [
            {
              id: "f2",
              nombre: "Dominadas",
              modo: "reps",
              cantidad: "8",
              series: "3",
              unidad: "reps",
              referencia: null,
              pedirCarga: true,
              tipoResistencia: "Peso corporal",
            },
            {
              id: "f3",
              nombre: "Zancada con salto",
              modo: "reps",
              cantidad: "10",
              series: "3",
              unidad: "reps",
              referencia: null,
              pedirCarga: true,
              tipoResistencia: "Peso libre",
            },
          ],
        },
      ],
    },
  ],
};

function IconoBloque({ id }) {
  const common = { width: 16, height: 16, stroke: "currentColor", fill: "none", strokeWidth: 1.6 };
  switch (id) {
    case "activacion":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l4-8h4l3 8M10 9l2-3h3" />
        </svg>
      );
    case "movilidad":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 12a8 8 0 0 1 14-5" />
          <path d="M20 12a8 8 0 0 1-14 5" />
          <path d="M18 4v3h-3M6 20v-3h3" />
        </svg>
      );
    case "preventivo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case "resistencia":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h3l2-6 4 12 2-6h7" />
        </svg>
      );
    case "core":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="4" y="9" width="16" height="6" rx="1.5" />
          <path d="M4 12h16" />
        </svg>
      );
    case "fuerza":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h2M19 12h2M6 9v6M18 9v6" />
          <rect x="8" y="10.5" width="8" height="3" rx="0.6" />
        </svg>
      );
    default:
      return null;
  }
}

function TareaCard({ tarea, hecho, onToggle, registro, onCambiarRegistro, onAmpliarGif, orden }) {
  return (
    <div
      style={{
        background: "#0E1E35",
        border: `1px solid ${hecho ? "#22C55E55" : "#1A3050"}`,
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {orden != null && (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#122440",
              color: "#F5C518",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {orden}
          </span>
        )}
        {tarea.gif ? (
          <img
            src={tarea.gif}
            alt={`Demostración: ${tarea.nombre}`}
            onClick={onAmpliarGif}
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              objectFit: "cover",
              flexShrink: 0,
              cursor: "pointer",
            }}
          />
        ) : (
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              background: "#122440",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4A6680",
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            GIF
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>{tarea.nombre}</div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              color: "#8BA4C0",
              marginTop: 2,
            }}
          >
            {tarea.series ? `${tarea.series} × ` : ""}
            {tarea.cantidad} {tarea.unidad}
          </div>
          {tarea.referencia !== undefined && (
            <div style={{ fontSize: 10.5, color: "#4A6680", marginTop: 3 }}>
              {tarea.referencia ? `Última vez: ${tarea.referencia}` : "Sin registro previo"}
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `1.5px solid ${hecho ? "#22C55E" : "#1A3050"}`,
            background: hecho ? "#22C55E" : "transparent",
            color: hecho ? "#060D1A" : "#4A6680",
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label={hecho ? "Marcado como hecho" : "Marcar como hecho"}
        >
          {hecho ? "✓" : ""}
        </button>
      </div>

      {tarea.nota && (
        <div
          style={{
            marginLeft: 56,
            display: "flex",
            gap: 6,
            background: "#122440",
            border: "1px solid #1A3050",
            borderRadius: 6,
            padding: "6px 8px",
          }}
        >
          <span style={{ color: "#F97316", fontSize: 11.5, flexShrink: 0 }}>📝</span>
          <span style={{ fontSize: 11.5, color: "#8BA4C0", lineHeight: 1.35 }}>{tarea.nota}</span>
        </div>
      )}

      {tarea.pedirCarga && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 56 }}>
          {tarea.tipoResistencia === "Peso corporal" && (
            <div style={{ display: "flex", gap: 6 }}>
              {["Lastre", "Asistencia"].map((sub) => (
                <button
                  key={sub}
                  onClick={() => onCambiarRegistro({ ...registro, subtipo: sub })}
                  style={{
                    fontSize: 11,
                    padding: "5px 9px",
                    borderRadius: 6,
                    border: `1px solid ${registro.subtipo === sub ? "#F5C518" : "#1A3050"}`,
                    background: registro.subtipo === sub ? "#F5C51822" : "transparent",
                    color: registro.subtipo === sub ? "#F5C518" : "#8BA4C0",
                    cursor: "pointer",
                  }}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680" }}>
                REPS HECHAS
              </span>
              <input
                value={registro.reps}
                onChange={(e) => onCambiarRegistro({ ...registro, reps: e.target.value })}
                placeholder={tarea.cantidad}
                style={{
                  width: 56,
                  background: "#122440",
                  border: "1px solid #1A3050",
                  borderRadius: 6,
                  color: "#F0F4FF",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  padding: "6px 7px",
                  textAlign: "center",
                }}
              />
            </label>

            {tarea.tipoResistencia !== "Elástica" &&
              !(tarea.tipoResistencia === "Peso corporal" && registro.subtipo === "Asistencia") && (
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680" }}>
                    CARGA KG
                  </span>
                  <input
                    value={registro.carga}
                    onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
                    placeholder="—"
                    style={{
                      width: 60,
                      background: "#122440",
                      border: "1px solid #1A3050",
                      borderRadius: 6,
                      color: "#F0F4FF",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      padding: "6px 7px",
                      textAlign: "center",
                    }}
                  />
                </label>
              )}

            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680" }}>
                RIR
              </span>
              <input
                value={registro.rir}
                onChange={(e) => onCambiarRegistro({ ...registro, rir: e.target.value })}
                placeholder="—"
                style={{
                  width: 46,
                  background: "#122440",
                  border: "1px solid #1A3050",
                  borderRadius: 6,
                  color: "#F0F4FF",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  padding: "6px 7px",
                  textAlign: "center",
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PantallaJugador() {
  const [hechos, setHechos] = useState({});
  const [registros, setRegistros] = useState({});
  const [gifAmpliado, setGifAmpliado] = useState(null);
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const toggle = (id) => setHechos((prev) => ({ ...prev, [id]: !prev[id] }));
  const registro = (id) => registros[id] || { reps: "", carga: "", rir: "", subtipo: "" };
  const setRegistro = (id, val) => setRegistros((prev) => ({ ...prev, [id]: val }));

  const totalTareas = SESION_JUGADOR.bloques
    .filter((b) => b.aplica)
    .reduce(
      (acc, b) => acc + b.tareas.length + (b.circuitos || []).reduce((a, c) => a + c.tareas.length, 0),
      0
    );
  const totalHechas = Object.values(hechos).filter(Boolean).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "24px 14px 60px",
      }}
    >
      {enviado ? (
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 12,
            padding: "0 24px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#0E1E35",
              border: "2px solid #22C55E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "#22C55E",
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#F0F4FF" }}>Sesión enviada</div>
          <div style={{ fontSize: 13, color: "#8BA4C0", maxWidth: 260, lineHeight: 1.5 }}>
            Tu próxima sesión estará disponible aquí cuando toque. Este espacio se vacía cada noche.
          </div>
        </div>
      ) : (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
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
            SESIÓN DE HOY
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>
            {SESION_JUGADOR.jugador}
          </h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>{SESION_JUGADOR.fecha}</div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: "#1A3050", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(totalHechas / totalTareas) * 100}%`,
                  background: "#F5C518",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4A6680" }}>
              {totalHechas}/{totalTareas}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SESION_JUGADOR.bloques
            .filter((b) => !(["resistencia", "activacion"].includes(b.id) && !b.aplica))
            .map((b) => (
            <div key={b.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "#122440",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8BA4C0",
                  }}
                >
                  <IconoBloque id={b.id} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#8BA4C0" }}>{b.nombre}</span>
                {b.categoria && (
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: "#F5C518",
                      border: "1px solid #F5C51855",
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    {b.categoria}
                  </span>
                )}
              </div>

              {!b.aplica ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#4A6680",
                    fontStyle: "italic",
                    padding: "8px 12px",
                    background: "#122440",
                    borderRadius: 8,
                    border: "1px dashed #1A3050",
                  }}
                >
                  No aplica hoy — bloque omitido
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {b.tareas.map((t) => (
                    <TareaCard
                      key={t.id}
                      tarea={t}
                      hecho={!!hechos[t.id]}
                      onToggle={() => toggle(t.id)}
                      registro={registro(t.id)}
                      onCambiarRegistro={(val) => setRegistro(t.id, val)}
                      onAmpliarGif={() => t.gif && setGifAmpliado(t.gif)}
                    />
                  ))}
                  {(b.circuitos || []).map((c) => (
                    <div
                      key={c.id}
                      style={{
                        border: "1.5px solid #F5C51855",
                        borderRadius: 10,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          alignSelf: "flex-start",
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 9.5,
                          letterSpacing: "0.06em",
                          color: "#F5C518",
                          border: "1px solid #F5C51855",
                          borderRadius: 4,
                          padding: "2px 7px",
                        }}
                      >
                        CIRCUITO · seguir orden
                      </span>
                      {c.tareas.map((t, i) => (
                        <TareaCard
                          key={t.id}
                          tarea={t}
                          orden={i + 1}
                          hecho={!!hechos[t.id]}
                          onToggle={() => toggle(t.id)}
                          registro={registro(t.id)}
                          onCambiarRegistro={(val) => setRegistro(t.id, val)}
                          onAmpliarGif={() => t.gif && setGifAmpliado(t.gif)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {pidiendoConfirmacion ? (
          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            <button
              onClick={() => setPidiendoConfirmacion(false)}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid #1A3050",
                color: "#8BA4C0",
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setEnviado(true);
                setPidiendoConfirmacion(false);
              }}
              style={{
                flex: 2,
                background: "#22C55E",
                border: "1px solid #22C55E",
                color: "#060D1A",
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Confirmar envío
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPidiendoConfirmacion(true)}
            style={{
              width: "100%",
              marginTop: 22,
              background: totalHechas === totalTareas ? "#22C55E" : "#122440",
              border: `1px solid ${totalHechas === totalTareas ? "#22C55E" : "#1A3050"}`,
              color: totalHechas === totalTareas ? "#060D1A" : "#4A6680",
              borderRadius: 10,
              padding: "13px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {totalHechas === totalTareas ? "Enviar sesión completada" : "Enviar progreso"}
          </button>
        )}
      </div>
      )}

      {gifAmpliado && (
        <div
          onClick={() => setGifAmpliado(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: 24,
          }}
        >
          <img
            src={gifAmpliado}
            alt="Demostración ampliada"
            style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }}
          />
          <button
            onClick={() => setGifAmpliado(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "#0E1E35",
              border: "1px solid #1A3050",
              color: "#F0F4FF",
              width: 34,
              height: 34,
              borderRadius: "50%",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
