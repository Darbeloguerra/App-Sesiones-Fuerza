import { useState, useEffect } from "react";
import { ds, dsF, dsR, GlobalStyles, DsInput, DsButton } from "../core/designSystem.jsx";
import { LoadingBlock } from "../core/components.jsx";
import { supabase, accesoSesion } from "../core/backend.js";
import { sharedDataCache, usePlayers, useConfigValue } from "../core/hooks.js";

function PinInput({ value, onChange, autoFocus }) {
  return (
    <DsInput
      autoFocus={autoFocus}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      style={{ textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700, fontFamily: dsF.mono }}
      placeholder="····"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
    />
  );
}

// Pantalla dedicada solo al portal de acceso — independiente de PantallaBase
// a propósito. Ninguna de las variantes de PantallaBase (flexbox + alto
// medido por JS) conseguía centrar de verdad en el dispositivo real, así
// que aquí se usa la técnica de centrado más antigua y con menos piezas
// móviles que hay en CSS: posición absoluta + transform, calculada sobre un
// contenedor fijo anclado a los 4 bordes de la ventana. No depende de medir
// ninguna altura, ni de flexbox, ni de que el navegador soporte dvh/vh bien.
function PantallaPortal({ children, maxWidth = 320 }) {
  return (
    <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas }}>
      <GlobalStyles />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth,
          padding: "0 24px",
          boxSizing: "border-box",
          color: ds.ink,
          fontFamily: dsF.sans,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Decide qué portal usar: si en Supabase ya está instalada la seguridad
// (paso2_seguridad.sql) se entra por la función `entrar`; si todavía no, se usa
// el portal anterior, para que subir la app antes que el SQL no rompa nada.
export function PortalAccesoRaiz(props) {
  const [modo, setModo] = useState(null); // null = comprobando | "seguro" | "antiguo"
  const [reintento, setReintento] = useState(0);
  const [falloRed, setFalloRed] = useState(false);
  useEffect(() => {
    let cancelado = false;
    setFalloRed(false);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("acceso_activo");
        if (cancelado) return;
        if (!error && data === true) return setModo("seguro");
        // PGRST202 / 404: la función no existe todavía => seguridad sin instalar.
        const falta = error && (error.code === "PGRST202" || error.code === "42883" || /Could not find the function|does not exist|404/i.test(`${error.message || ""}`));
        if (falta) return setModo("antiguo");
        setFalloRed(true);
      } catch {
        if (!cancelado) setFalloRed(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [reintento]);
  if (falloRed)
    return (
      <PantallaPortal>
        <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
          <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginBottom: 10, color: ds.danger }}>No se pudo conectar</div>
          <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 20, lineHeight: 1.5 }}>Comprueba tu conexión e inténtalo de nuevo.</div>
          <DsButton onClick={() => setReintento((n) => n + 1)} style={{ width: "100%" }}>
            Reintentar
          </DsButton>
        </div>
      </PantallaPortal>
    );
  if (modo === null)
    return (
      <PantallaPortal>
        <LoadingBlock />
      </PantallaPortal>
    );
  return modo === "seguro" ? <PortalAccesoSeguro {...props} /> : <PortalAcceso {...props} />;
}

// Portal con seguridad real: el código se comprueba DENTRO de Supabase
// (función entrar); el navegador nunca descarga PIN ni código de entrenador.
function PortalAccesoSeguro({ onEnterCoach, onEnterPlayer }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const validar = async () => {
    const valor = codigo.trim();
    if (!valor || entrando) return;
    setEntrando(true);
    setError("");
    try {
      const { data, error: e } = await supabase.rpc("entrar", { p_codigo: valor });
      if (e) throw e;
      if (!data || !data.ok) {
        setError(
          data?.error === "suspendido"
            ? "Tu acceso está desactivado. Habla con tu entrenador."
            : data?.error === "bloqueado"
            ? "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
            : "Código no reconocido. Revisa e inténtalo de nuevo."
        );
        return;
      }
      sharedDataCache.clear();
      accesoSesion.token = data.token;
      accesoSesion.rol = data.rol;
      accesoSesion.jugadorId = data.jugador_id || null;
      setResultado(data.rol === "entrenador" ? { tipo: "entrenador" } : { tipo: "jugador", nombre: data.nombre, id: data.jugador_id });
    } catch {
      setError("No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setEntrando(false);
    }
  };

  if (resultado) {
    return (
      <PantallaPortal>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 60, height: 60, borderRadius: dsR.full, background: ds.bgElevated, border: `2px solid ${ds.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: ds.success, margin: "0 auto 16px" }}>✓</div>
          <div style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{resultado.tipo === "entrenador" ? "Acceso como entrenador" : `Hola, ${resultado.nombre}`}</div>
          <div style={{ fontSize: 13, color: ds.inkSecondary, lineHeight: 1.5, marginBottom: 20 }}>{resultado.tipo === "entrenador" ? "Entrando al panel del entrenador..." : "Entrando a tu sesión de hoy..."}</div>
          <DsButton onClick={() => (resultado.tipo === "entrenador" ? onEnterCoach() : onEnterPlayer(resultado.id))} style={{ width: "100%" }}>
            Continuar
          </DsButton>
        </div>
      </PantallaPortal>
    );
  }
  return (
    <PantallaPortal>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>ENTRENAMIENTO DE FUERZA</div>
          <div style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700 }}>Introduce tu código</div>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 6 }}>El PIN de jugador o el código de entrenador</div>
        </div>
        <DsInput
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && validar()}
          placeholder="••••"
          autoFocus
          type="password"
          inputMode="numeric"
          error={!!error}
          style={{ fontSize: 20, letterSpacing: "0.2em", textAlign: "center", padding: "14px 12px", fontFamily: dsF.mono, marginBottom: 10 }}
        />
        {error && <div style={{ color: ds.danger, fontSize: 12, textAlign: "center", marginBottom: 10 }}>{error}</div>}
        <DsButton onClick={validar} disabled={entrando} style={{ width: "100%" }}>
          {entrando ? "Comprobando..." : "Entrar"}
        </DsButton>
      </div>
    </PantallaPortal>
  );
}

// ---------- PORTAL DE ACCESO ÚNICO ----------
// Calca el diseño validado de portal-acceso.jsx: pantalla completa,
// sin la cabecera antigua, tipografía monoespaciada, un solo código de
// entrada que dirige según coincida con el PIN de un jugador o con el
// código de entrenador (creándolo la primera vez si no existe).
function PortalAcceso({ onEnterCoach, onEnterPlayer }) {
  const [players, , playersLoaded, playersError, retryPlayers] = usePlayers();
  const [coachPin, saveCoachPin, coachPinLoaded, coachPinError, retryCoachPin] = useConfigValue("coach_pin");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "entrenador" } | { tipo: "jugador", nombre, id }
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  const loaded = playersLoaded && coachPinLoaded;
  // Distingue "todavía no existe código de entrenador" (coachPin === null,
  // sin error) de "no se ha podido comprobar" (fallo real de conexión,
  // p. ej. Apps Script atascado o sin responder a tiempo). Sin esta
  // distinción, un simple fallo de red parecía "primer acceso" y ofrecía
  // crear un código nuevo, arriesgando pisar el que ya existe.
  const fallosDeConexion = !!playersError || !!coachPinError;

  const validar = () => {
    const valor = codigo.trim();
    if (!valor) return;
    const jugador = players.find((p) => String(p.pin).trim() === valor);
    const esCoach = coachPin != null && valor === String(coachPin).trim();
    // Si el código coincide a la vez con el del entrenador y con el PIN de
    // un jugador (colisión ya guardada en la Sheet, de antes de este
    // cambio), nunca se concede acceso de entrenador por esa vía — se entra
    // como jugador, el privilegio mínimo, y hay que corregir cuanto antes el
    // PIN de ese jugador desde Roster.
    if (jugador) {
      // Un jugador suspendido no debe poder entrar y ver nada — el PIN
      // seguía siendo válido y esto no se comprobaba nunca.
      if (jugador.estado === "suspendido") {
        setError("Tu acceso está desactivado. Habla con tu entrenador.");
        setResultado(null);
        return;
      }
      setError(false);
      setResultado({ tipo: "jugador", nombre: jugador.name, id: jugador.id });
      return;
    }
    if (esCoach) {
      setError(false);
      setResultado({ tipo: "entrenador" });
      return;
    }
    setError("Código no reconocido. Revisa e inténtalo de nuevo.");
    setResultado(null);
  };

  const crearPin = async () => {
    if (pinA.length !== 4) return setCreateError("El código debe tener 4 dígitos.");
    if (pinA !== pinB) return setCreateError("Los dos códigos no coinciden.");
    setSaving(true);
    const ok = await saveCoachPin(pinA);
    setSaving(false);
    if (!ok) {
      setCreateError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    setCreatingPin(false);
    setResultado({ tipo: "entrenador" });
  };

  const screenWrap = (content) => <PantallaPortal>{content}</PantallaPortal>;

  if (!loaded) return screenWrap(<LoadingBlock />);

  // Fallo real de conexión (no "todavía no hay código") — nunca se ofrece
  // "crear código de entrenador" aquí, para no arriesgarse a pisar uno que
  // sí existe pero que ahora mismo no se ha podido leer.
  if (fallosDeConexion && coachPin == null && !resultado) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginBottom: 10, color: ds.danger }}>No se pudo conectar</div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          No se ha podido comprobar tu código — puede ser un problema de conexión o que el servidor esté tardando en
          responder. No es que falte crear uno nuevo.
        </div>
        <DsButton
          onClick={() => {
            retryPlayers();
            retryCoachPin();
          }}
          style={{ width: "100%" }}
        >
          Reintentar
        </DsButton>
      </div>
    );
  }

  if (coachPin == null && !creatingPin && !resultado) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Primer acceso</div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          Todavía no tienes un código de entrenador. Créalo ahora; si eres jugador, pídeselo a tu entrenador antes de
          entrar.
        </div>
        <DsButton onClick={() => setCreatingPin(true)} style={{ width: "100%" }}>
          Crear mi código de entrenador
        </DsButton>
      </div>
    );
  }

  if (creatingPin) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
            ENTRENAMIENTO DE FUERZA
          </div>
          <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700 }}>Crea tu código de entrenador</div>
        </div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>
          CÓDIGO (4 DÍGITOS)
        </div>
        <div style={{ marginBottom: 10 }}>
          <PinInput value={pinA} onChange={setPinA} autoFocus />
        </div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>
          REPITE EL CÓDIGO
        </div>
        <div style={{ marginBottom: 14 }}>
          <PinInput value={pinB} onChange={setPinB} />
        </div>
        {createError && <div style={{ color: ds.danger, fontSize: 12, textAlign: "center", marginBottom: 10 }}>{createError}</div>}
        <DsButton onClick={crearPin} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Guardando..." : "Crear código"}
        </DsButton>
      </div>
    );
  }

  if (resultado) {
    return screenWrap(
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: dsR.full,
            background: ds.bgElevated,
            border: `2px solid ${ds.success}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            color: ds.success,
            margin: "0 auto 16px",
          }}
        >
          ✓
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {resultado.tipo === "entrenador" ? "Acceso como entrenador" : `Hola, ${resultado.nombre}`}
        </div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, lineHeight: 1.5, marginBottom: 20 }}>
          {resultado.tipo === "entrenador" ? "Entrando al panel del entrenador..." : "Entrando a tu sesión de hoy..."}
        </div>
        <DsButton onClick={() => (resultado.tipo === "entrenador" ? onEnterCoach() : onEnterPlayer(resultado.id))} style={{ width: "100%" }}>
          Continuar
        </DsButton>
      </div>
    );
  }

  return screenWrap(
    <div style={{ width: "100%", maxWidth: 320 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700 }}>Introduce tu código</div>
        <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 6 }}>El PIN de jugador o el código de entrenador</div>
      </div>

      <DsInput
        value={codigo}
        onChange={(e) => {
          setCodigo(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && validar()}
        placeholder="••••"
        autoFocus
        type="password"
        inputMode="numeric"
        error={!!error}
        style={{
          fontSize: 20,
          letterSpacing: "0.2em",
          textAlign: "center",
          padding: "14px 12px",
          fontFamily: dsF.mono,
          marginBottom: 10,
        }}
      />

      {error && (
        <div style={{ color: ds.danger, fontSize: 12, textAlign: "center", marginBottom: 10 }}>
          {error === true ? "Código no reconocido. Revisa e inténtalo de nuevo." : error}
        </div>
      )}

      <DsButton onClick={validar} style={{ width: "100%" }}>
        Entrar
      </DsButton>
    </div>
  );
}
