import { useState } from "react";
import { ds, dsF } from "../core/designSystem.jsx";
import { LoadingBlock } from "../core/components.jsx";
import { useAnchoVentana, PantallaBase } from "../core/layout.jsx";
import { IconoModulo, MODULOS_DASHBOARD, useSolicitudesPendientesCount, PantallaEntrenadorAncha } from "../core/layoutEntrenador.jsx";
import { SEV_ALERTA, ESTADO_JUGADOR_META, useCarteraEntrenador, usePartidos } from "../core/hooks.js";
import { diasEntreFechas } from "../calc/fechas.js";

// Agrupa las alertas repetitivas (una por jugador) en una sola fila con los
// nombres dentro, para que la bandeja sean unas pocas líneas y no una por jugador.
// CMJ en rojo y molestias fuertes siguen siendo una fila por jugador: son las
// que piden actuar ya.
const PLANTILLA_GRUPO_ALERTA = {
  cmj: (n) => ({ titulo: `${n} jugadores con el CMJ a vigilar`, detalle: "Revisa la carga de sus próximas sesiones." }),
  molestia: (n) => ({ titulo: `${n} jugadores con molestia`, detalle: "Indicada al enviar su última sesión." }),
  inactivo: (n) => ({ titulo: `${n} jugadores sin registrar desde hace 5 días o más`, detalle: "Tenían sesiones asignadas en las últimas dos semanas." }),
  adherencia: (n) => ({ titulo: `${n} jugadores por debajo del 60 % de adherencia`, detalle: "Cumplimiento de las últimas 4 semanas." }),
  rendimiento: (n) => ({ titulo: `${n} jugadores con la carga estimada a la baja esta semana`, detalle: "Dato orientativo: se calcula con el RIR que indican, compruébalo en su ficha antes de actuar." }),
};
function agruparAlertas(alertas) {
  const salida = [];
  const porTipo = new Map();
  alertas.forEach((a) => {
    const individual = !a.jugadorId || a.tipo === "solicitud" || !PLANTILLA_GRUPO_ALERTA[a.tipo] || (a.tipo === "cmj" && a.sev >= 3) || (a.tipo === "molestia" && a.sev >= 3);
    if (individual) {
      salida.push(a);
      return;
    }
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, []);
    porTipo.get(a.tipo).push(a);
  });
  porTipo.forEach((lista, tipo) => {
    if (lista.length === 1) {
      salida.push(lista[0]);
      return;
    }
    const plantilla = PLANTILLA_GRUPO_ALERTA[tipo](lista.length);
    salida.push({
      id: `grupo-${tipo}`,
      sev: Math.max(...lista.map((a) => a.sev)),
      tipo,
      titulo: plantilla.titulo,
      detalle: plantilla.detalle,
      chips: lista.map((a) => ({ label: a.chip || a.titulo, jugadorId: a.jugadorId, pestana: (a.acciones || []).find((x) => x.tipo === "ficha")?.pestana || "resumen" })),
      acciones: [],
    });
  });
  return salida.sort((a, b) => b.sev - a.sev);
}

function PuntoSev({ sev }) {
  return <span style={{ width: 9, height: 9, borderRadius: "50%", background: (SEV_ALERTA[sev] || SEV_ALERTA[1]).color, flexShrink: 0, marginTop: 5 }} />;
}

// Una fila de la bandeja: qué pasa + botones para resolverlo. También la
// usa FichaAtencionReal en la Ficha de jugador (misma bandeja, un solo
// jugador) — por eso se exporta, no es exclusiva del Dashboard.
export function FilaAlertaReal({ alerta, onAccion }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 0", borderTop: `1px solid ${ds.border}`, flexWrap: "wrap" }}>
      <PuntoSev sev={alerta.sev} />
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.ink }}>{alerta.titulo}</div>
        <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 2 }}>{alerta.detalle}</div>
        {alerta.chips && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {alerta.chips.map((c) => (
              <button key={c.jugadorId + c.label} type="button" onClick={() => onAccion(alerta, { tipo: "ficha", pestana: c.pestana, jugadorId: c.jugadorId })} style={{ fontSize: 11.5, color: ds.ink, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(alerta.acciones || []).map((a, i) => (
          <button key={a.label} type="button" onClick={() => onAccion(alerta, a)} style={{ fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "6px 11px", cursor: "pointer", border: `1px solid ${i === 0 ? ds.accent : ds.border}`, background: i === 0 ? ds.accentSubtle : "transparent", color: i === 0 ? ds.accent : ds.inkSecondary }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InicioEntrenadorReal({ onAbrirModulo, onCerrarSesion, onOpenHistory }) {
  const c = useCarteraEntrenador();
  const { todos: partidosInicio } = usePartidos();
  const ancho = useAnchoVentana();
  const pendientesCount = useSolicitudesPendientesCount();
  const [verTodas, setVerTodas] = useState(false);
  const [abiertas, setAbiertas] = useState({});
  const hoyLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const bandeja = c.loaded ? agruparAlertas(c.alertas) : [];

  const accion = (alerta, a) => {
    const jugador = a.jugadorId || alerta.jugadorId ? c.playersById.get(a.jugadorId || alerta.jugadorId) : null;
    if (a.tipo === "ficha" && jugador) onOpenHistory?.(jugador, a.pestana);
    else if (a.tipo === "cal") onAbrirModulo(a.scopeJugador && alerta.jugadorId ? `calendario:j:${alerta.jugadorId}` : jugador && alerta.tipo !== "borrador" ? `calendario:j:${jugador.id}` : "calendario");
    else if (a.tipo === "fatiga") onAbrirModulo("fatiga");
  };

  const cuerpo = !c.loaded ? (
    <LoadingBlock />
  ) : (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{hoyLabel}</div>
        <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0 }}>Inicio</h1>
        {(() => {
          const prox = partidosInicio.filter((x) => x.fecha >= c.hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
          if (!prox) return null;
          const dias = diasEntreFechas(c.hoy, prox.fecha);
          const cuando = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
          return (
            <div style={{ fontSize: 13, color: ds.inkSecondary, marginTop: 6 }}>
              Próximo partido: <b style={{ color: ds.ink }}>{new Date(`${prox.fecha}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</b>
              {prox.rival ? ` · ${prox.rival}` : ""} · {cuando}
            </div>
          );
        })()}
      </div>

      {/* HOY */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Hoy</b>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Calendario →</button>
        </div>
        {c.sesionesHoy.length === 0 && (
          <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "6px 0 2px" }}>
            No hay ninguna sesión publicada para hoy.
            <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Planificar →</button>
          </div>
        )}
        {c.sesionesHoy.map(({ sesion, completos, parciales, ninguno, total }) => {
          const pct = total ? Math.round(((completos.length + parciales.length * 0.5) / total) * 100) : 0;
          const falta = [...ninguno, ...parciales];
          const abierta = !!abiertas[sesion.id];
          return (
            <div key={sesion.id} style={{ padding: "10px 0", borderTop: `1px solid ${ds.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: ds.accent, fontSize: 14, flex: "1 1 200px", minWidth: 0 }}>{sesion.nombre || sesion.objetivo || "Sesión de hoy"}{sesion.md ? <span style={{ marginLeft: 8, fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>{sesion.md}</span> : null}</span>
                <div style={{ flex: "0 1 150px", minWidth: 80, height: 6, borderRadius: 999, background: ds.border, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${total ? (completos.length / total) * 100 : 0}%`, background: ds.success }} />
                  <div style={{ width: `${total ? (parciales.length / total) * 100 : 0}%`, background: `${ds.success}66` }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{completos.length}/{total} <span style={{ color: ds.inkMuted, fontWeight: 500 }}>· {pct} %</span></span>
                {falta.length > 0 && (
                  <button type="button" onClick={() => setAbiertas((a) => ({ ...a, [sesion.id]: !a[sesion.id] }))} style={{ fontSize: 12, color: ds.accent, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                    {abierta ? "Ocultar" : `Falta registrar (${falta.length})`}
                  </button>
                )}
              </div>
              {abierta && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {falta.map((p) => (
                    <button key={p.id} type="button" onClick={() => onOpenHistory?.(p)} style={{ fontSize: 11.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, background: "transparent", borderRadius: 999, padding: "2px 10px", cursor: "pointer" }}>
                      {p.name}{parciales.includes(p) ? " · parcial" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PLANTEL HOY */}
      {c.activos.length > 0 && (() => {
        const orden = { atencion: 0, aldia: 1, sinplan: 2 };
        const lista = [...c.activos].sort((a, b) => (orden[c.filas.get(a.id)?.estado] ?? 3) - (orden[c.filas.get(b.id)?.estado] ?? 3) || a.name.localeCompare(b.name));
        const resumen = { hecho: 0, parcial: 0, pendiente: 0 };
        lista.forEach((pl) => {
          const h = c.filas.get(pl.id)?.hoy;
          if (h) resumen[h] += 1;
        });
        return (
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Plantel</b>
              <span style={{ fontSize: 12, color: ds.inkSecondary }}>{c.activos.length} activos</span>
              <span style={{ flex: 1 }} />
              {(resumen.hecho + resumen.parcial + resumen.pendiente) > 0 && (
                <span style={{ fontSize: 12, color: ds.inkSecondary }}>
                  Hoy: <b style={{ color: ds.success }}>{resumen.hecho}</b> hecho · <b>{resumen.parcial}</b> a medias · <b style={{ color: ds.warning }}>{resumen.pendiente}</b> pendiente
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lista.map((pl) => {
                const f = c.filas.get(pl.id) || {};
                const meta = ESTADO_JUGADOR_META[f.estado];
                const etiquetas = [];
                if (f.molestia != null && f.molestia >= 3) etiquetas.push({ t: `M${f.molestia}`, color: f.molestia >= 7 ? ds.danger : ds.warning, titulo: `Molestia ${f.molestia}/10` });
                if (f.cmj === "red" || f.cmj === "amber") etiquetas.push({ t: "CMJ", color: f.cmj === "red" ? ds.danger : ds.warning, titulo: f.cmj === "red" ? "CMJ en rojo" : "CMJ a vigilar" });
                const hoyIcono = f.hoy === "hecho" ? "✓" : f.hoy === "parcial" ? "½" : f.hoy === "pendiente" ? "○" : "";
                const titulo = [meta ? meta.label : "", f.adh28 != null ? `adherencia 4 sem: ${f.adh28} %` : "", f.hoy ? `hoy: ${f.hoy}` : "sin sesión hoy"].filter(Boolean).join(" · ");
                return (
                  <button key={pl.id} type="button" title={titulo} onClick={() => onOpenHistory?.(pl)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, border: `1px solid ${ds.border}`, background: "transparent", color: ds.ink, fontSize: 12, cursor: "pointer" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta ? meta.color : ds.inkMuted, flexShrink: 0 }} />
                    {pl.name}
                    {etiquetas.map((e) => (
                      <span key={e.t} title={e.titulo} style={{ fontFamily: dsF.mono, fontSize: 10, fontWeight: 800, color: e.color }}>{e.t}</span>
                    ))}
                    {hoyIcono && <span style={{ fontFamily: dsF.mono, fontSize: 11, color: f.hoy === "hecho" ? ds.success : ds.inkMuted }}>{hoyIcono}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginTop: 10 }}>Punto = estado (naranja atención · verde al día · gris sin plan) · M = molestia ≥3 en 3 días · CMJ = a vigilar/rojo · ✓ hecho hoy · ½ a medias · ○ pendiente</div>
          </div>
        );
      })()}

      {/* REQUIERE TU ATENCIÓN */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Requiere tu atención</b>
          {bandeja.length > 0 && <span style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 800, background: ds.warning, color: "#1A0F00", borderRadius: 999, padding: "1px 8px" }}>{bandeja.length}</span>}
        </div>
        {bandeja.length === 0 && <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 0 2px" }}>Nada pendiente. Todo el equipo al día.</div>}
        {(verTodas ? bandeja : bandeja.slice(0, 6)).map((a) => (
          <FilaAlertaReal key={a.id} alerta={a} onAccion={accion} />
        ))}
        {bandeja.length > 6 && (
          <button type="button" onClick={() => setVerTodas((v) => !v)} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            {verTodas ? "Ver menos" : `Ver las ${bandeja.length - 6} restantes`}
          </button>
        )}
      </div>

      {/* ESTA SEMANA */}
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <b style={{ fontFamily: dsF.display, fontSize: 16 }}>Esta semana</b>
          {c.cumplSem !== null && <span style={{ fontSize: 12.5, color: ds.inkSecondary }}>{c.cumplSem} % de cumplimiento hasta hoy</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => onAbrirModulo("calendario")} style={{ fontSize: 12.5, fontWeight: 600, color: ds.accent, background: "transparent", border: "none", cursor: "pointer" }}>Abrir →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
          {c.semana.map((d) => (
            <button key={d.fecha} type="button" onClick={() => onAbrirModulo("calendario")} style={{ background: d.esHoy ? ds.accentSubtle : ds.surfaceRaised, border: `1px solid ${d.esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: 12, padding: "8px 4px", cursor: "pointer", color: ds.ink, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: ds.inkMuted, textTransform: "uppercase" }}>{d.dow} {d.num}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: d.env ? ds.ink : ds.inkMuted }}>{d.env ? `${d.env} ses.` : "—"}</span>
              <span style={{ fontSize: 10.5, color: d.bor ? ds.warning : "transparent" }}>{d.bor ? `${d.bor} borrador` : "·"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (ancho >= 1000) {
    return (
      <PantallaEntrenadorAncha activo="dashboard" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
        {cuerpo}
      </PantallaEntrenadorAncha>
    );
  }
  return (
    <PantallaBase rol="entrenador" maxWidth={560}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 7, marginBottom: 16 }}>
          {MODULOS_DASHBOARD.map((m) => (
            <button key={m.id} onClick={() => onAbrirModulo(m.id)} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 10, padding: "9px 4px", cursor: "pointer", color: ds.ink }}>
              {m.id === "calendario" && pendientesCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: ds.warning, color: "#1A0F00", fontFamily: dsF.mono, fontSize: 8.5, fontWeight: 800, borderRadius: 999, padding: "0 5px" }}>{pendientesCount}</span>}
              <div style={{ color: ds.inkMuted }}><IconoModulo tipo={m.icono} /></div>
              <div style={{ fontSize: 9.5, fontWeight: 600, textAlign: "center", lineHeight: 1.15 }}>{m.nombre}</div>
            </button>
          ))}
        </div>
        {cuerpo}
        <button type="button" onClick={onCerrarSesion} style={{ marginTop: 6, fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Cerrar sesión</button>
      </div>
    </PantallaBase>
  );
}
