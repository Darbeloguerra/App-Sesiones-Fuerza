import React, { useState } from "react";

// Datos de ejemplo — en producción esto vendría del backend (Sheets/Apps Script)
const CODIGO_INICIAL = "6MGS-2YLD-AXGF";
const JUGADORES = [
  { nombre: "Marcos G.", pin: "4821" },
  { nombre: "Iván R.", pin: "7734" },
  { nombre: "Diego S.", pin: "5567" },
];

export default function PortalAcceso() {
  const [codigoEntrenador, setCodigoEntrenador] = useState(CODIGO_INICIAL);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "entrenador" } | { tipo: "jugador", nombre }
  const [cambiandoCodigo, setCambiandoCodigo] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [confirmarCodigo, setConfirmarCodigo] = useState("");
  const [avisoCambio, setAvisoCambio] = useState("");
  const [codigoActualizado, setCodigoActualizado] = useState(false);

  const validar = () => {
    const valor = codigo.trim();
    if (!valor) return;

    if (valor === codigoEntrenador) {
      setError(false);
      setResultado({ tipo: "entrenador" });
      return;
    }

    const jugador = JUGADORES.find((j) => j.pin === valor);
    if (jugador) {
      setError(false);
      setResultado({ tipo: "jugador", nombre: jugador.nombre });
      return;
    }

    setError(true);
    setResultado(null);
  };

  const guardarNuevoCodigo = () => {
    if (nuevoCodigo.trim().length < 6) {
      setAvisoCambio("Usa al menos 6 caracteres.");
      return;
    }
    if (nuevoCodigo !== confirmarCodigo) {
      setAvisoCambio("Los dos códigos no coinciden.");
      return;
    }
    setCodigoEntrenador(nuevoCodigo.trim());
    setAvisoCambio("");
    setCambiandoCodigo(false);
    setNuevoCodigo("");
    setConfirmarCodigo("");
    setCodigoActualizado(true);
  };

  if (resultado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060D1A",
          color: "#F0F4FF",
          fontFamily: "'Inter', -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#0E1E35",
              border: "2px solid #22C55E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              color: "#22C55E",
              margin: "0 auto 16px",
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            {resultado.tipo === "entrenador" ? "Acceso como entrenador" : `Hola, ${resultado.nombre}`}
          </div>
          <div style={{ fontSize: 13, color: "#8BA4C0", lineHeight: 1.5, marginBottom: 20 }}>
            {resultado.tipo === "entrenador"
              ? "En producción, esto te llevaría directo al Dashboard del entrenador."
              : "En producción, esto te llevaría directo a tu sesión de hoy."}
          </div>

          {resultado.tipo === "entrenador" && (
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              {codigoActualizado && (
                <div style={{ fontSize: 12, color: "#22C55E", marginBottom: 8 }}>✓ Código actualizado correctamente.</div>
              )}
              {!cambiandoCodigo ? (
                <button
                  onClick={() => setCambiandoCodigo(true)}
                  style={{
                    fontSize: 12.5,
                    color: "#F5C518",
                    background: "transparent",
                    border: "1px dashed #F5C51866",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Cambiar mi código de acceso
                </button>
              ) : (
                <div
                  style={{
                    background: "#0E1E35",
                    border: "1px solid #1A3050",
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
                    NUEVO CÓDIGO
                  </span>
                  <input
                    value={nuevoCodigo}
                    onChange={(e) => setNuevoCodigo(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{
                      background: "#122440",
                      border: "1px solid #1A3050",
                      borderRadius: 7,
                      color: "#F0F4FF",
                      fontSize: 13,
                      padding: "8px 10px",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
                    CONFIRMAR
                  </span>
                  <input
                    value={confirmarCodigo}
                    onChange={(e) => setConfirmarCodigo(e.target.value)}
                    placeholder="Repite el código"
                    style={{
                      background: "#122440",
                      border: "1px solid #1A3050",
                      borderRadius: 7,
                      color: "#F0F4FF",
                      fontSize: 13,
                      padding: "8px 10px",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  {avisoCambio && <div style={{ fontSize: 11.5, color: "#EF4444" }}>{avisoCambio}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => {
                        setCambiandoCodigo(false);
                        setAvisoCambio("");
                        setNuevoCodigo("");
                        setConfirmarCodigo("");
                      }}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid #1A3050",
                        color: "#8BA4C0",
                        borderRadius: 7,
                        padding: "8px 10px",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarNuevoCodigo}
                      style={{
                        flex: 1,
                        background: "#F5C518",
                        border: "1px solid #F5C518",
                        color: "#060D1A",
                        borderRadius: 7,
                        padding: "8px 10px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setResultado(null);
              setCodigo("");
            }}
            style={{
              background: "transparent",
              border: "1px solid #1A3050",
              color: "#8BA4C0",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Volver al portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "#F5C518",
              marginBottom: 6,
            }}
          >
            ENTRENAMIENTO DE FUERZA
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Introduce tu código</div>
          <div style={{ fontSize: 12.5, color: "#8BA4C0", marginTop: 6 }}>
            El PIN de jugador o el código de entrenador
          </div>
        </div>

        <input
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && validar()}
          placeholder="••••"
          autoFocus
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0E1E35",
            border: `1.5px solid ${error ? "#EF4444" : "#1A3050"}`,
            borderRadius: 10,
            color: "#F0F4FF",
            fontSize: 20,
            letterSpacing: "0.2em",
            textAlign: "center",
            padding: "14px 12px",
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 10,
          }}
        />

        {error && (
          <div style={{ color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 10 }}>
            Código no reconocido. Revisa e inténtalo de nuevo.
          </div>
        )}

        <button
          onClick={validar}
          style={{
            width: "100%",
            background: "#F5C518",
            border: "1px solid #F5C518",
            color: "#060D1A",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
