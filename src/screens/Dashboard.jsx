import { useState, useEffect, useMemo } from "react";
import { ds, dsF, GlobalStyles } from "../core/designSystem.jsx";
import { LoadingBlock } from "../core/components.jsx";
import { useAnchoVentana, PantallaBase } from "../core/layout.jsx";
import { IconoModulo, MODULOS_DASHBOARD, useSolicitudesPendientesCount, SidebarEntrenadorReal, PanelCodigoEntrenadorReal } from "../core/layoutEntrenador.jsx";
import { CMJ_STATUS_META, CMJ_TAG_META } from "../core/cmjDisplay.jsx";
import { accesoSesion, api, supabase } from "../core/backend.js";
import { SEV_ALERTA, sharedDataCache, useCarteraEntrenador, usePartidos, useMicrociclosTipo, useBootstrapProgramacion, useEntityList, usePlayers, destinatariosEfectivosSesion } from "../core/hooks.js";
import { cmjBuildPlayers, cmjFindCurrentMicroId, cmjHoyDe, cmjSigned, cmjDateKeyFromDate, CMJ_FIELDS, CMJ_UMBRAL_DEFECTO } from "../calc/cmj.js";
import { diasEntreFechas, inicioSemanaCalendario, sumarDiasFecha, todayStr } from "../calc/fechas.js";

// ───────────────────────────────────────────────────────────────────────────
// Inicio del entrenador. Todo lo que se muestra sale de datos reales:
//  · Calendario: sesiones (enviada / borrador), partidos por ámbito, microciclo
//    tipo (días "por programar"), peticiones pendientes y fechas de test CMJ.
//  · Alertas: la bandeja de useCarteraEntrenador (dolor, carga a la baja,
//    incumplimiento), sin mezclar equipos e individuales.
//  · Pendiente: borradores sin publicar, días del microciclo sin sesión, próxima
//    semana sin programar y peticiones de jugadores.
//  · Control de fatiga: el mismo cálculo que el módulo (cmjBuildPlayers + cmjHoyDe).
// "Equipo" = jugador activo con algún grupo; "Individual" = sin grupo (gruposIds vacío).
// ───────────────────────────────────────────────────────────────────────────

const MICRO_VACIO = { diaPartido: null, sesiones: {}, manual: {} };

// Misma regla que el Calendario: MD de una fecha según el microciclo tipo y los partidos reales.
function mdDeFecha(micro, fecha, partidosReales = []) {
  const manual = (micro.manual || {})[fecha];
  if (manual === "-") return "";
  if (manual) return manual;
  const lunes = inicioSemanaCalendario(fecha);
  const partidos = new Set();
  [-7, 0, 7, 14].forEach((d) => {
    if (micro.diaPartido == null) return;
    const p = sumarDiasFecha(lunes, d + micro.diaPartido);
    const m = (micro.manual || {})[p];
    if (!m || m === "MD") partidos.add(p);
  });
  Object.entries(micro.manual || {}).forEach(([f, t]) => {
    if (t === "MD" && Math.abs(diasEntreFechas(fecha, f)) <= 14) partidos.add(f);
  });
  partidosReales.forEach((f) => {
    if (Math.abs(diasEntreFechas(fecha, f)) <= 14) partidos.add(f);
  });
  if (partidos.has(fecha)) return "MD";
  let dPrev = Infinity;
  let dNext = Infinity;
  partidos.forEach((p) => {
    const d = diasEntreFechas(p, fecha);
    if (d > 0 && d < dPrev) dPrev = d;
    if (d < 0 && -d < dNext) dNext = -d;
  });
  if (dPrev === 1) return "MD+1";
  if (dNext <= 6) return `MD-${dNext}`;
  if (dPrev === 2) return "MD+2";
  return "";
}

// Agrupa las alertas repetitivas (una por jugador) en una sola fila con los
// nombres dentro. Molestias fuertes siguen siendo una fila por jugador.
const PLANTILLA_GRUPO_ALERTA = {
  molestia: (n) => ({ titulo: `${n} jugadores con molestia`, detalle: "Indicada al enviar su última sesión." }),
  inactivo: (n) => ({ titulo: `${n} jugadores sin registrar desde hace 5 días o más`, detalle: "Tenían sesiones asignadas en las últimas dos semanas." }),
  adherencia: (n) => ({ titulo: `${n} jugadores por debajo del 60 % de adherencia`, detalle: "Cumplimiento de las últimas 4 semanas." }),
  rendimiento: (n) => ({ titulo: `${n} jugadores con la carga estimada a la baja esta semana`, detalle: "Dato orientativo: se calcula con el RIR que indican." }),
};
function agruparAlertas(alertas) {
  const salida = [];
  const porTipo = new Map();
  alertas.forEach((a) => {
    const individual = !a.jugadorId || !PLANTILLA_GRUPO_ALERTA[a.tipo] || (a.tipo === "molestia" && a.sev >= 3);
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
      jugadoresIds: lista.map((a) => a.jugadorId),
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

// ---------- Fatiga (CMJ): mismo cálculo que el módulo Control de fatiga ----------
// Devuelve solo a quienes hay que vigilar (rojo / ámbar) con el último test, y
// las fechas de test CMJ (cmj_microciclos) para marcarlas en el calendario.
function useFatigaDashboard(players, playersLoaded) {
  const [datos, setDatos] = useState({ loaded: false, tarjetas: [], marcas: new Map() });
  useEffect(() => {
    if (!playersLoaded) return undefined;
    const claveCache = `dash_fatiga:${players.length}`;
    if (sharedDataCache.has(claveCache)) {
      setDatos(sharedDataCache.get(claveCache));
      return undefined;
    }
    let cancelado = false;
    (async () => {
      try {
        const [saltosRes, microRes, umbralGuardado] = await Promise.all([supabase.from("cmj_saltos").select("jugador_id,excluido,fecha,fecha_hora,peso,hp0,altura,fuerza,potencia,velocidad,kinetics_valid,peso_valid,hp0_valid").not("jugador_id", "is", null), supabase.from("cmj_microciclos").select("*"), api.config("cmj_umbral")]);
        if (saltosRes.error || microRes.error) throw new Error("cmj");
        const umbral = umbralGuardado || CMJ_UMBRAL_DEFECTO;
        const porId = new Map(players.map((p) => [p.id, p]));
        const filas = (saltosRes.data || [])
          .filter((s) => !s.excluido && porId.has(s.jugador_id))
          .map((s) => ({
            jugadorId: s.jugador_id,
            nombre: porId.get(s.jugador_id).name,
            dateKey: s.fecha,
            date: s.fecha_hora,
            peso: s.peso,
            hp0: s.hp0,
            altura: s.altura,
            fuerza: s.fuerza,
            potencia: s.potencia,
            velocidad: s.velocidad,
            kineticsValid: s.kinetics_valid,
            pesoValid: s.peso_valid,
            hp0Valid: s.hp0_valid,
          }));
        const micros = microRes.data || [];
        const { players: construidos, microList } = cmjBuildPlayers(filas, micros, umbral.ambarPct, umbral.rojoPct, umbral.individualizar, umbral.protocoloDesde);
        const marcas = new Map();
        micros.forEach((m) => {
          CMJ_FIELDS.forEach((campo) => {
            const f = String(m[campo] || "").slice(0, 10);
            if (f) marcas.set(f, (CMJ_TAG_META[campo] || {}).label || "CMJ");
          });
        });
        let tarjetas = [];
        const actual = cmjFindCurrentMicroId(microList);
        if (actual.id != null) {
          const meta = microList.find((m) => m.id === actual.id);
          const hoyKey = cmjDateKeyFromDate(new Date());
          const todayTag = CMJ_FIELDS.find((f) => meta[f] === hoyKey) || null;
          tarjetas = construidos
            .map((p) => ({ p, hoy: cmjHoyDe(p, todayTag) }))
            .filter(({ hoy }) => hoy.status === "red" || hoy.status === "amber")
            .map(({ p, hoy }) => ({
              jugadorId: p.jugadorId,
              nombre: p.nombre,
              status: hoy.status,
              divergente: !!(hoy.m && hoy.m.divergente),
              rows: hoy.rows || [],
            }));
        }
        const resultado = { loaded: true, tarjetas, marcas };
        sharedDataCache.set(claveCache, resultado);
        if (!cancelado) setDatos(resultado);
      } catch (e) {
        if (!cancelado) setDatos({ loaded: true, tarjetas: [], marcas: new Map() });
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersLoaded, players.length]);
  return datos;
}

const ABREV_METRICA = { altura: "Alt", potenciaRel: "Pot", fuerzaRel: "Fza" };
const TAG_ALERTA = { molestia: "DOLOR", rendimiento: "CARGA ↓", inactivo: "INCUMPL.", adherencia: "INCUMPL." };
const TIPOS_ALERTA_DASHBOARD = new Set(["molestia", "rendimiento", "inactivo", "adherencia"]);
const fmtDia = (f) => new Date(`${f}T00:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }).replace(".", "");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const ESTILOS = `
.dsh-btn{font-family:inherit;cursor:pointer;transition:border-color 140ms ease-out,background 140ms ease-out,color 140ms ease-out}
.dsh-btn:focus-visible,.dsh-sel:focus-visible{outline:2px solid ${ds.accent};outline-offset:2px}
.dsh-row:hover{background:${ds.surfaceRaised} !important}
.dsh-scroll{scrollbar-width:thin}
`;

function Seccion({ titulo, contador, contadorColor, derecha, children, style }) {
  return (
    <section style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.35)", padding: "12px 14px 10px", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, boxSizing: "border-box", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, flexWrap: "nowrap" }}>
        <h2 style={{ fontFamily: dsF.display, fontSize: 16, lineHeight: "22px", fontWeight: 600, margin: 0, whiteSpace: "nowrap", color: ds.ink }}>{titulo}</h2>
        {contador != null && <span style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 500, background: contadorColor || ds.warning, color: contadorColor ? ds.ink : "#1A0F00", border: contadorColor ? `1px solid ${ds.borderMuted}` : "none", borderRadius: 999, padding: "0 9px", lineHeight: "18px" }}>{contador}</span>}
        <span style={{ flex: 1 }} />
        {derecha}
      </div>
      {children}
    </section>
  );
}


export function InicioEntrenadorReal({ onAbrirModulo, onCerrarSesion, onOpenHistory }) {
  const c = useCarteraEntrenador();
  const [players, , playersLoaded] = usePlayers();
  const { todos: partidos } = usePartidos();
  const { todos: microTodos } = useMicrociclosTipo();
  const { sesiones, loaded: progLoaded } = useBootstrapProgramacion();
  const [gruposRows, , gruposLoaded] = useEntityList("grupos");
  const [solicitudes] = useEntityList("solicitudesSesion", { estado: "pendiente" });
  const fatiga = useFatigaDashboard(players, playersLoaded);
  const ancho = useAnchoVentana();
  const pendientesCount = useSolicitudesPendientesCount();
  const [ambitoElegido, setAmbitoElegido] = useState(null);
  const [equipoFatiga, setEquipoFatiga] = useState(null);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [abiertas, setAbiertas] = useState({});
  const [codigoAbierto, setCodigoAbierto] = useState(false);
  const puedeCambiarCodigo = accesoSesion.token && accesoSesion.rol === "entrenador";

  const accion = (alerta, a) => {
    const jugador = a.jugadorId || alerta.jugadorId ? playersById.get(a.jugadorId || alerta.jugadorId) : null;
    if (a.tipo === "ficha" && jugador) onOpenHistory?.(jugador, a.pestana);
    else if (a.tipo === "cal") onAbrirModulo(a.scopeJugador && alerta.jugadorId ? `calendario:j:${alerta.jugadorId}` : jugador ? `calendario:j:${jugador.id}` : "calendario");
    else if (a.tipo === "fatiga") onAbrirModulo("fatiga");
  };

  const listo = playersLoaded && gruposLoaded && progLoaded;
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  // Todo lo que NO depende del historial pesado se calcula ya (jugadores, grupos,
  // sesiones): el calendario, Pendiente y Fatiga se pintan sin esperar a las alertas.
  const datos = useMemo(() => {
    if (!listo) return null;
    const hoy = todayStr();
    const activos = players.filter((p) => p.estado === "activo");
    const gruposNombre = new Map(gruposRows.map((g) => [g.id, g.nombre || g.name || "Grupo"]));
    const esIndiv = (p) => !(p.gruposIds || []).some((g) => gruposNombre.has(g));
    const equiposRows = gruposRows
      .map((g) => ({ id: g.id, nombre: g.nombre || g.name || "Grupo", ids: new Set(activos.filter((p) => (p.gruposIds || []).includes(g.id)).map((p) => p.id)), scopeKey: `g:${g.id}` }))
      .filter((g) => g.ids.size > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    const individuales = activos.filter(esIndiv).sort((a, b) => a.name.localeCompare(b.name));
    const idsEquipos = new Set(equiposRows.flatMap((g) => [...g.ids]));
    const idsIndiv = new Set(individuales.map((p) => p.id));
    const equipoDe = (id) => {
      const p = playersById.get(id);
      const g = p && (p.gruposIds || []).find((x) => gruposNombre.has(x));
      return g ? gruposNombre.get(g) : "";
    };
    // Destinatarios efectivos de cada sesión, calculados una sola vez.
    const destinos = new Map(sesiones.map((s) => [s.id, new Set(destinatariosEfectivosSesion(s, activos))]));
    // Índice fecha -> sesiones, para no recorrer todas las sesiones en cada celda.
    const porFecha = new Map();
    sesiones.forEach((s) => (s.fechas || []).forEach((f) => {
      if (!porFecha.has(f)) porFecha.set(f, []);
      porFecha.get(f).push(s);
    }));
    return { hoy, activos, equiposRows, individuales, idsEquipos, idsIndiv, hayEquipos: equiposRows.length > 0, hayIndiv: individuales.length > 0, equipoDe, destinos, porFecha };
  }, [listo, players, gruposRows, sesiones, playersById]);

  if (!datos) {
    const cargando = <LoadingBlock />;
    return ancho >= 1000 ? (
      <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas, color: ds.ink, fontFamily: dsF.sans, display: "flex" }}>
        <GlobalStyles />
        <style>{ESTILOS}</style>
        <SidebarEntrenadorReal activo="dashboard" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
        <div style={{ flex: 1, padding: 28 }}>{cargando}</div>
      </div>
    ) : (
      <PantallaBase rol="entrenador" maxWidth={560}>
        {cargando}
      </PantallaBase>
    );
  }

  const { hoy, activos, equiposRows, individuales, idsEquipos, idsIndiv, hayEquipos, hayIndiv, equipoDe, destinos, porFecha } = datos;
  // Las alertas salen del historial completo (lo más pesado): llegan después y no bloquean el resto.
  const alertasDe = (ids) => (c.loaded ? agruparAlertas(c.alertas.filter((a) => TIPOS_ALERTA_DASHBOARD.has(a.tipo) && a.jugadorId && ids.has(a.jugadorId))) : []);
  const alEq = alertasDe(idsEquipos);
  const alIn = alertasDe(idsIndiv);
  const resumenAl = (l) => ({ n: l.length, u: l.filter((a) => a.sev === 3).length });
  const rEq = resumenAl(alEq);
  const rIn = resumenAl(alIn);
  const hayAmbos = hayEquipos && hayIndiv;
  const ambito = !hayAmbos ? (hayEquipos ? "equipos" : "individuales") : ambitoElegido || "equipos";
  const esEq = ambito === "equipos";
  const idsAmbito = esEq ? idsEquipos : idsIndiv;
  const bandeja = esEq ? alEq : alIn;

  // ---------- Calendario ----------
  const lunes = inicioSemanaCalendario(sumarDiasFecha(hoy, offsetSemana * 7));
  const dias = Array.from({ length: 7 }, (_, i) => sumarDiasFecha(lunes, i));
  const interseca = (s, ids) => {
    const d = destinos.get(s.id);
    if (!d) return false;
    for (const id of ids) if (d.has(id)) return true;
    return false;
  };
  const ENTREGADAS_HOY = new Map((c.loaded ? c.sesionesHoy || [] : []).map((x) => [x.sesion.id, x]));
  const solPend = solicitudes || [];

  const filasBase = esEq
    ? equiposRows.map((g) => ({ clave: g.id, nombre: g.nombre, sub: `${g.ids.size} ${g.ids.size === 1 ? "jugador" : "jugadores"}`, ids: g.ids, scopeKey: g.scopeKey, equipo: true }))
    : individuales.map((p) => ({ clave: p.id, nombre: p.name, sub: "Individual", ids: new Set([p.id]), scopeKey: `j:${p.id}`, equipo: false }));

  const construirFila = (f) => {
    const micro = { ...MICRO_VACIO, ...(microTodos[f.scopeKey] || {}) };
    const partidosScope = partidos.filter((x) => x.ambito === f.scopeKey);
    const fechasPartido = partidosScope.map((x) => x.fecha);
    const partidoPorFecha = new Map(partidosScope.map((x) => [x.fecha, x]));
    const hayMicro = micro.diaPartido != null || Object.keys(micro.manual || {}).length > 0 || fechasPartido.length > 0;
    const celdas = dias.map((fecha) => {
      const items = [];
      const tag = hayMicro ? mdDeFecha(micro, fecha, fechasPartido) : "";
      (porFecha.get(fecha) || [])
        .forEach((s) => {
          const d = destinos.get(s.id);
          let nProp = 0;
          if (d) for (const id of f.ids) if (d.has(id)) nProp += 1;
          if (!nProp) return;
          let sub = s.enviada ? "Publicada" : "Borrador";
          const hoyInfo = s.enviada && fecha === hoy ? ENTREGADAS_HOY.get(s.id) : null;
          if (hoyInfo) {
            const hechos = hoyInfo.completos.filter((p) => f.ids.has(p.id)).length;
            sub = `Hoy · ${hechos}/${nProp}`;
          }
          if (tag) sub += ` · ${tag}`;
          items.push({ t: s.nombre || s.objetivo || "Sesión", s: sub, tipo: s.enviada ? "pub" : "bor" });
        });
      const par = partidoPorFecha.get(fecha);
      if (par) items.push({ t: "Partido", s: par.rival || "", tipo: "par" });
      solPend
        .filter((sol) => sol.fecha === fecha && f.ids.has(sol.jugador_id))
        .forEach((sol) => {
          const p = playersById.get(sol.jugador_id);
          items.push({ t: "Petición", s: p ? p.name : "", tipo: "pet" });
        });
      if (!items.some((x) => x.tipo === "pub" || x.tipo === "bor") && fecha >= hoy && tag && micro.sesiones && micro.sesiones[tag] && !par) {
        items.push({ t: "Por programar", s: tag, tipo: "vac" });
      }
      return { fecha, items };
    });
    const actividad = celdas.some((x) => x.items.length > 0);
    return { ...f, celdas, actividad };
  };
  const filasCal = filasBase.map(construirFila).filter((f) => f.equipo || f.actividad);

  // ---------- Pendiente ----------
  const futuros = sesiones.filter((s) => !s.enviada).flatMap((s) => (s.fechas || []).filter((f) => f >= hoy).map((f) => ({ s, f })));
  const borradoresAmbito = futuros.filter(({ s }) => interseca(s, idsAmbito));
  const nombresDe = (lista) => {
    const u = [];
    lista.forEach((x) => {
      if (x && !u.includes(x)) u.push(x);
    });
    return u.length > 3 ? `${u.slice(0, 3).join(", ")} y ${u.length - 3} más` : u.join(", ");
  };
  const nombreFila = (f) => f.nombre;
  const diasPorProgramar = [];
  filasBase.forEach((f) => {
    const micro = { ...MICRO_VACIO, ...(microTodos[f.scopeKey] || {}) };
    const fechasPartido = partidos.filter((x) => x.ambito === f.scopeKey).map((x) => x.fecha);
    if (micro.diaPartido == null && !Object.keys(micro.manual || {}).length && !fechasPartido.length) return;
    for (let i = 0; i < 7; i++) {
      const fecha = sumarDiasFecha(inicioSemanaCalendario(hoy), i);
      if (fecha < hoy) continue;
      const tag = mdDeFecha(micro, fecha, fechasPartido);
      if (!tag || !micro.sesiones || !micro.sesiones[tag]) continue;
      const hay = (porFecha.get(fecha) || []).some((s) => interseca(s, f.ids));
      if (!hay) diasPorProgramar.push({ fecha, fila: f });
    }
  });
  const lunesSig = sumarDiasFecha(inicioSemanaCalendario(hoy), 7);
  const domingoSig = sumarDiasFecha(lunesSig, 6);
  const hace14 = sumarDiasFecha(hoy, -14);
  const semanaSinProgramar = filasBase.filter((f) => {
    const hayEn = (desde, dias) => {
      for (let i = 0; i < dias; i++) if ((porFecha.get(sumarDiasFecha(desde, i)) || []).some((s) => interseca(s, f.ids))) return true;
      return false;
    };
    return hayEn(hace14, 15) && !hayEn(lunesSig, 7);
  });
  const peticionesAmbito = solPend.filter((sol) => idsAmbito.has(sol.jugador_id));
  const pendientes = [];
  if (borradoresAmbito.length) pendientes.push({ n: borradoresAmbito.length, t: "Sesiones por publicar", d: borradoresAmbito.slice(0, 2).map(({ s, f }) => `${cap(fmtDia(f))}${s.nombre ? ` · ${s.nombre}` : ""}`).join(" · "), v: "Publicar", modulo: "calendario" });
  if (diasPorProgramar.length) pendientes.push({ n: diasPorProgramar.length, t: "Días por programar esta semana", d: diasPorProgramar.slice(0, 2).map((x) => `${cap(fmtDia(x.fecha))} · ${nombreFila(x.fila)}`).join(" · "), v: "Programar", modulo: "calendario" });
  if (semanaSinProgramar.length) pendientes.push({ n: semanaSinProgramar.length, t: "Próxima semana sin programar", d: nombresDe(semanaSinProgramar.map(nombreFila)), v: "Programar", modulo: "calendario" });
  if (peticionesAmbito.length) {
    const sol = peticionesAmbito[0];
    const p = playersById.get(sol.jugador_id);
    pendientes.push({ n: peticionesAmbito.length, t: peticionesAmbito.length === 1 ? "Petición de jugador" : "Peticiones de jugadores", d: `${p ? p.name : "Jugador"}${sol.nota ? ` · “${sol.nota}”` : ""}`, v: "Responder", modulo: peticionesAmbito.length === 1 ? `calendario:j:${sol.jugador_id}` : "calendario" });
  }
  const pendTotal = pendientes.reduce((s, p) => s + p.n, 0);

  // ---------- Fatiga ----------
  const tarjetasAmbito = fatiga.tarjetas.filter((t) => idsAmbito.has(t.jugadorId)).map((t) => ({ ...t, equipo: equipoDe(t.jugadorId) }));
  const equiposFatiga = [...new Set(tarjetasAmbito.map((t) => t.equipo).filter(Boolean))].sort();
  const selFatiga = esEq ? (equiposFatiga.includes(equipoFatiga) ? equipoFatiga : equiposFatiga[0]) : null;
  const tarjetasVista = (esEq ? tarjetasAmbito.filter((t) => t.equipo === selFatiga) : tarjetasAmbito).sort((a, b) => (a.status === "red" ? 0 : 1) - (b.status === "red" ? 0 : 1) || a.nombre.localeCompare(b.nombre));
  const compacta = tarjetasVista.length > 4;

  // ---------- Cabecera ----------
  const proximos = (esEq ? equiposRows : []).flatMap((g) => {
    const p = partidos.filter((x) => x.ambito === g.scopeKey && x.fecha >= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
    return p ? [`${g.nombre} ${fmtDia(p.fecha)}`] : [];
  });
  const proximosInd = !esEq ? individuales.flatMap((pl) => {
    const p = partidos.filter((x) => x.ambito === `j:${pl.id}` && x.fecha >= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
    return p ? [`${pl.name} ${fmtDia(p.fecha)}`] : [];
  }) : [];
  const listaProx = [...proximos, ...proximosInd];
  const conteoHoy = { hecho: 0, parcial: 0, pendiente: 0 };
  let nActivosAmbito = 0;
  activos.forEach((p) => {
    if (!idsAmbito.has(p.id)) return;
    nActivosAmbito += 1;
    const h = c.loaded ? c.filas.get(p.id)?.hoy : null;
    if (h) conteoHoy[h] += 1;
  });
  const hayHoy = conteoHoy.hecho + conteoHoy.parcial + conteoHoy.pendiente > 0;
  const hoyLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const nSev = (s) => bandeja.filter((a) => a.sev === s).length;
  const equipoAlerta = (a) => {
    if (!esEq) return "";
    const ids = a.jugadoresIds || (a.jugadorId ? [a.jugadorId] : []);
    const nombres = [...new Set(ids.map(equipoDe).filter(Boolean))];
    return nombres.length === 1 ? nombres[0] : "";
  };

  // ---------- Piezas ----------
  const selectorAmbito = hayAmbos && (
    <div role="group" aria-label="Ver equipos o jugadores individuales" style={{ display: "inline-flex", gap: 3, padding: 3, border: `1px solid ${ds.border}`, borderRadius: 12, background: ds.bgElevated }}>
      {[
        { id: "equipos", nombre: "Equipos", r: rEq },
        { id: "individuales", nombre: "Individuales", r: rIn },
      ].map((o) => {
        const act = ambito === o.id;
        return (
          <button key={o.id} type="button" className="dsh-btn" aria-pressed={act} aria-label={c.loaded ? `${o.nombre}, ${o.r.n} alertas${o.r.u ? `, ${o.r.u} urgentes` : ""}` : o.nombre} onClick={() => setAmbitoElegido(o.id)} style={{ fontSize: 13, fontWeight: 700, borderRadius: 9, padding: "0 12px 0 14px", minHeight: 44, display: "inline-flex", alignItems: "center", gap: 9, border: `1px solid ${act ? `${ds.accent}4D` : "transparent"}`, background: act ? ds.accentSubtle : "transparent", color: act ? ds.accent : ds.inkSecondary }}>
            {o.nombre}
            {c.loaded && <span style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 500, borderRadius: 999, padding: "0 8px", lineHeight: "18px", background: o.r.u > 0 ? ds.danger : ds.warning, color: "#1A0A0A" }}>{o.r.n}</span>}
          </button>
        );
      })}
    </div>
  );

  const cabecera = (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", minHeight: 52 }}>
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.1em", color: ds.inkSecondary, textTransform: "uppercase", lineHeight: "14px" }}>{hoyLabel}</div>
        <h1 style={{ fontFamily: dsF.display, fontSize: 26, lineHeight: "32px", fontWeight: 700, letterSpacing: "-0.01em", margin: 0, color: ds.ink }}>Inicio</h1>
      </div>
      <div style={{ flex: "1 1 280px", minWidth: 0, fontSize: 12.5, lineHeight: "19px", color: ds.inkSecondary, borderLeft: `1px solid ${ds.border}`, paddingLeft: 18 }}>
        {listaProx.length > 0 && (
          <div>
            Próximos partidos: <b style={{ color: ds.ink }}>{listaProx.slice(0, 3).join(" · ")}</b>
          </div>
        )}
        <div>
          {esEq ? "Equipos" : "Individuales"}: {nActivosAmbito} activos
          {hayHoy && (
            <>
              {" "}· hoy <b style={{ color: ds.success }}>{conteoHoy.hecho}</b> hechos · {conteoHoy.parcial} a medias · <b style={{ color: ds.warning }}>{conteoHoy.pendiente}</b> pendientes
            </>
          )}
          <button type="button" className="dsh-btn" onClick={() => onAbrirModulo("roster")} style={{ marginLeft: 6, minHeight: 32, padding: "0 8px", fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: "none" }}>
            Ver plantel →
          </button>
        </div>
      </div>
      {selectorAmbito}
      <button type="button" className="dsh-btn" onClick={() => onAbrirModulo("diseno")} style={{ fontSize: 12.5, fontWeight: 700, minHeight: 44, padding: "0 14px", borderRadius: 10, background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, boxShadow: "0 4px 14px rgba(240,180,41,0.32)", display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
        + Diseñar sesión
      </button>
    </div>
  );

  const estiloItem = (tipo) => {
    if (tipo === "pub") return { bg: ds.surfaceRaised, bd: `1px solid ${ds.border}`, d: ds.success, col: ds.ink };
    if (tipo === "bor") return { bg: ds.surfaceRaised, bd: `1px dashed ${ds.warning}`, d: ds.warning, col: ds.ink };
    if (tipo === "par") return { bg: ds.border, bd: `1px solid ${ds.borderMuted}`, d: ds.ink, col: ds.ink };
    if (tipo === "pet") return { bg: ds.surfaceRaised, bd: `1px solid ${ds.borderMuted}`, d: ds.warning, col: ds.ink };
    return { bg: "transparent", bd: `1px dashed ${ds.borderMuted}`, d: "transparent", col: ds.inkSecondary };
  };

  const rangoSemana = `${new Date(`${dias[0]}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${new Date(`${dias[6]}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
  const botonSemana = (txt, delta) => (
    <button type="button" className="dsh-btn" aria-label={txt} onClick={() => setOffsetSemana((o) => o + delta)} style={{ width: 40, minHeight: 40, borderRadius: 10, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, fontSize: 16 }}>
      {delta < 0 ? "‹" : "›"}
    </button>
  );

  const calendario = (
    <Seccion
      titulo="Esta semana"
      style={{ flex: "1 1 280px" }}
      derecha={
        <>
          <span style={{ fontSize: 12.5, color: ds.inkSecondary, whiteSpace: "nowrap" }}>{rangoSemana}</span>
          {botonSemana("Semana anterior", -1)}
          {botonSemana("Semana siguiente", 1)}
          <button type="button" className="dsh-btn" onClick={() => onAbrirModulo("calendario")} style={{ fontSize: 12.5, fontWeight: 700, color: ds.accent, background: "transparent", border: "none", minHeight: 36, padding: "0 8px", whiteSpace: "nowrap" }}>
            Abrir calendario →
          </button>
        </>
      }
    >
      {filasCal.length === 0 ? (
        <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "14px 2px" }}>{esEq ? "Ningún equipo con plantilla activa." : "Ningún jugador individual con actividad esta semana."}</div>
      ) : (
        <div className="dsh-scroll" style={{ overflowX: "auto", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ minWidth: 860, flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "112px repeat(7, minmax(0, 1fr))" }}>
              <div />
              {dias.map((f, i) => {
                const esHoy = f === hoy;
                const marca = fatiga.marcas.get(f);
                return (
                  <div key={f} style={{ padding: "4px 8px", minHeight: 34, boxSizing: "border-box", borderBottom: `2px solid ${esHoy ? ds.accent : ds.border}`, background: esHoy ? `${ds.accent}22` : "transparent" }}>
                    <div style={{ fontFamily: dsF.mono, fontSize: 10.5, lineHeight: "16px", letterSpacing: "0.1em", color: esHoy ? ds.accent : ds.inkSecondary, fontWeight: 500 }}>
                      {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"][i]} {Number(f.slice(8))}{esHoy ? " · HOY" : ""}
                    </div>
                    {marca && <div style={{ fontFamily: dsF.mono, fontSize: 9.5, lineHeight: "13px", letterSpacing: "0.04em", color: ds.chart2, fontWeight: 500 }}>CMJ · {marca}</div>}
                  </div>
                );
              })}
            </div>
            <div className="dsh-scroll" style={{ flex: "1 1 120px", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {filasCal.map((f) => (
                <div key={f.clave} style={{ flex: "1 1 0", minHeight: 64, display: "grid", gridTemplateColumns: "112px repeat(7, minmax(0, 1fr))", borderTop: `1px solid ${ds.borderSoft}` }}>
                  <div style={{ padding: "4px 8px 4px 0", display: "flex", alignItems: "center", minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: ds.ink }}>{f.nombre}</div>
                      <div style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.sub}</div>
                    </div>
                  </div>
                  {f.celdas.map((cel) => (
                    <div key={cel.fecha} style={{ padding: 3, borderLeft: `1px solid ${ds.borderSoft}`, background: cel.fecha === hoy ? "#F0B4290D" : "transparent", display: "flex", flexDirection: "column", gap: 4, minWidth: 0, minHeight: 0, overflow: "hidden", justifyContent: "center" }}>
                      {cel.items.map((it, k) => {
                        const e = estiloItem(it.tipo);
                        return (
                          <div key={k} style={{ padding: "4px 7px", borderRadius: 7, background: e.bg, border: e.bd, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.d, flexShrink: 0 }} />
                              <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: "15px", color: e.col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.t}</span>
                            </div>
                            {it.s && <div style={{ fontSize: 10.5, lineHeight: "13px", color: ds.inkSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingLeft: 12 }}>{it.s}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Seccion>
  );

  const filaAlerta = (a) => {
    const urgente = a.sev === 3;
    const col = (SEV_ALERTA[a.sev] || SEV_ALERTA[1]).color;
    const eq = equipoAlerta(a);
    const grupal = !!a.chips;
    const abierta = !!abiertas[a.id];
    const alClick = () => {
      if (grupal) {
        setAbiertas((x) => ({ ...x, [a.id]: !x[a.id] }));
        return;
      }
      const ac = (a.acciones || []).find((x) => x.tipo === "ficha") || (a.acciones || [])[0];
      if (ac) accion(a, ac);
    };
    const detalle = grupal ? a.chips.map((x) => x.label).join(" · ") : a.detalle;
    return (
      <div key={a.id}>
        <button
          type="button"
          className="dsh-btn dsh-row"
          aria-expanded={grupal ? abierta : undefined}
          onClick={alClick}
          style={urgente
            ? { color: ds.ink, display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", minHeight: 58, padding: "8px 10px", borderRadius: 12, border: `1px solid ${col}66`, background: `${col}16`, textAlign: "left", marginBottom: 6 }
            : { color: ds.ink, display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", minHeight: 48, padding: "5px 6px", border: "none", borderTop: `1px solid ${ds.borderSoft}`, background: "transparent", textAlign: "left" }}
        >
          <span style={{ flex: 1, minWidth: 0, display: "block" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em", borderRadius: 5, padding: "0 6px", lineHeight: "16px", whiteSpace: "nowrap", color: col, background: `${col}1F`, border: `1px solid ${col}55` }}>{TAG_ALERTA[a.tipo] || "AVISO"}</span>
              <span style={{ fontSize: urgente ? 13 : 12.5, lineHeight: urgente ? "18px" : "17px", fontWeight: urgente ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{a.titulo}</span>
              {eq && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 600, lineHeight: "16px", color: ds.inkSecondary, border: `1px solid ${ds.borderMuted}`, borderRadius: 999, padding: "0 8px", whiteSpace: "nowrap" }}>{eq}</span>}
            </span>
            <span style={{ display: "block", fontSize: urgente ? 11.5 : 11, lineHeight: "16px", color: ds.inkSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{detalle}</span>
          </span>
          <span aria-hidden="true" style={{ color: ds.inkSecondary, fontSize: 14 }}>{grupal ? (abierta ? "▾" : "›") : "›"}</span>
        </button>
        {grupal && abierta && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 6px 8px" }}>
            {a.chips.map((ch) => (
              <button key={ch.jugadorId + ch.label} type="button" className="dsh-btn" onClick={() => accion(a, { tipo: "ficha", pestana: ch.pestana, jugadorId: ch.jugadorId })} style={{ fontSize: 11.5, color: ds.ink, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "6px 12px", minHeight: 32 }}>
                {ch.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const cabeceraSev = (sev, n) => (
    <div key={`cab-${sev}`} style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.1em", color: (SEV_ALERTA[sev] || SEV_ALERTA[1]).color, textTransform: "uppercase", fontWeight: 500, padding: "8px 2px 4px" }}>
      {(SEV_ALERTA[sev] || SEV_ALERTA[1]).label === "Aviso" ? "Avisos" : (SEV_ALERTA[sev] || SEV_ALERTA[1]).label} · {n}
    </div>
  );

  const alertasPanel = (
    <Seccion
      titulo="Alertas"
      contador={bandeja.length > 0 ? bandeja.length : null}
      style={{ flex: "1.3 1 380px" }}
      derecha={
        bandeja.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 11.5, color: ds.inkSecondary }} aria-label={`${nSev(3)} urgentes, ${nSev(2)} de atención, ${nSev(1)} avisos`}>
            {[3, 2, 1].map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: (SEV_ALERTA[s] || SEV_ALERTA[1]).color }} />
                <b style={{ color: ds.ink }}>{nSev(s)}</b>
              </span>
            ))}
          </span>
        )
      }
    >
      {!c.loaded ? (
        <div role="status" style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 2px" }}>Calculando alertas…</div>
      ) : bandeja.length === 0 ? (
        <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 2px" }}>Nada que requiera atención en {esEq ? "los equipos" : "los jugadores individuales"}.</div>
      ) : (
        <div className="dsh-scroll" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
          {bandeja.map((a, i) => (
            <div key={a.id}>
              {(i === 0 || bandeja[i - 1].sev !== a.sev) && cabeceraSev(a.sev, nSev(a.sev))}
              {filaAlerta(a)}
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );

  const pendientePanel = (
    <Seccion titulo="Pendiente" contador={pendTotal > 0 ? pendTotal : null} contadorColor={ds.surfaceRaised} style={{ flex: "0.9 1 290px" }}>
      {pendientes.length === 0 ? (
        <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 2px" }}>Todo programado y publicado.</div>
      ) : (
        <div className="dsh-scroll" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}>
          {pendientes.map((p) => (
            <button key={p.t} type="button" className="dsh-btn dsh-row" onClick={() => onAbrirModulo(p.modulo)} style={{ color: ds.ink, display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", minHeight: 56, padding: "6px 6px", border: "none", borderTop: `1px solid ${ds.borderSoft}`, background: "transparent", textAlign: "left" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: ds.surfaceRaised, border: `1px solid ${ds.borderMuted}`, fontFamily: dsF.mono, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.n}</span>
              <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                <span style={{ display: "block", fontSize: 12.5, lineHeight: "17px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.t}</span>
                <span style={{ display: "block", fontSize: 11.5, lineHeight: "16px", color: ds.inkSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.d}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ds.accent, whiteSpace: "nowrap" }}>{p.v}</span>
              <span aria-hidden="true" style={{ color: ds.inkSecondary }}>›</span>
            </button>
          ))}
        </div>
      )}
    </Seccion>
  );

  const tarjeta = (t) => {
    const meta = CMJ_STATUS_META[t.status];
    return (
      <button key={t.jugadorId} type="button" className="dsh-btn" onClick={() => onAbrirModulo("fatiga")} aria-label={`${t.nombre}, ${meta.label}. Abrir control de fatiga`} style={{ textAlign: "left", color: ds.ink, borderRadius: 12, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0, overflow: "hidden", background: `linear-gradient(180deg, ${meta.color}18 0%, ${ds.surface} 65%)`, border: `1px solid ${meta.color}55` }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, width: "100%" }}>
          <span style={{ fontSize: 13, lineHeight: "16px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nombre}</span>
          {t.divergente && <span title="Divergencia: la altura no muestra fatiga, pero potencia y/o fuerza sí caen." aria-label="Divergencia" style={{ color: ds.warning, fontSize: 12, lineHeight: "16px" }}>⚠</span>}
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, lineHeight: "16px", color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{meta.label}</span>
        </span>
        {t.rows.length > 0 && (compacta ? (
          <span style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, borderTop: `1px solid ${ds.border}88`, paddingTop: 3, width: "100%" }}>
            {t.rows.map((r) => (
              <span key={r.key} style={{ minWidth: 0 }} title={r.label}>
                <span style={{ display: "block", fontSize: 9.5, lineHeight: "12px", color: ds.inkSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>{ABREV_METRICA[r.key] || r.label}</span>
                <span style={{ display: "block", fontSize: 11.5, lineHeight: "15px", color: (CMJ_STATUS_META[r.status] || CMJ_STATUS_META.gray).color, fontWeight: 500, fontFamily: dsF.mono, whiteSpace: "nowrap" }}>{cmjSigned(r.delta)}</span>
              </span>
            ))}
          </span>
        ) : (
          <span style={{ display: "flex", flexDirection: "column", gap: 1, borderTop: `1px solid ${ds.border}88`, paddingTop: 3, marginTop: 1, width: "100%" }}>
            {t.rows.map((r) => (
              <span key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11, lineHeight: "15px", minWidth: 0 }}>
                <span style={{ color: ds.inkSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{r.label}</span>
                <span style={{ color: (CMJ_STATUS_META[r.status] || CMJ_STATUS_META.gray).color, fontWeight: 500, fontFamily: dsF.mono, whiteSpace: "nowrap", flexShrink: 0 }}>{cmjSigned(r.delta)}</span>
              </span>
            ))}
          </span>
        ))}
      </button>
    );
  };

  const fatigaPanel = (
    <Seccion
      titulo="Control de fatiga"
      contador={fatiga.loaded && tarjetasVista.length > 0 ? tarjetasVista.length : null}
      style={{ flex: "1.3 1 380px" }}
      derecha={
        esEq && equiposFatiga.length > 1 ? (
          <select className="dsh-sel" aria-label="Elegir equipo" value={selFatiga || ""} onChange={(e) => setEquipoFatiga(e.target.value)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, minHeight: 44, padding: "0 12px", borderRadius: 10, border: `1px solid ${ds.accent}4D`, background: ds.accentSubtle, color: ds.accent, cursor: "pointer" }}>
            {equiposFatiga.map((nom) => (
              <option key={nom} value={nom} style={{ background: ds.surface, color: ds.ink }}>
                {nom} · {tarjetasAmbito.filter((t) => t.equipo === nom).length}
              </option>
            ))}
          </select>
        ) : esEq && equiposFatiga.length === 1 ? (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: ds.inkSecondary }}>{equiposFatiga[0]}</span>
        ) : !esEq ? (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: ds.inkSecondary }}>Individuales</span>
        ) : null
      }
    >
      {!fatiga.loaded ? (
        <LoadingBlock />
      ) : tarjetasVista.length === 0 ? (
        <div style={{ fontSize: 13, color: ds.inkSecondary, padding: "10px 2px" }}>Nadie a vigilar con el último test CMJ.</div>
      ) : (
        <div className="dsh-scroll" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, alignContent: "start" }}>{tarjetasVista.map(tarjeta)}</div>
        </div>
      )}
    </Seccion>
  );

  const cuerpoAncho = (
    <main style={{ flex: 1, minWidth: 0, height: "100%", boxSizing: "border-box", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
      {cabecera}
      {calendario}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch", flex: "1.3 1 340px", minHeight: 0 }}>
        {alertasPanel}
        {pendientePanel}
        {fatigaPanel}
      </div>
    </main>
  );

  if (ancho >= 1000) {
    return (
      <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas, color: ds.ink, fontFamily: dsF.sans, display: "flex" }}>
        <GlobalStyles />
        <style>{ESTILOS}</style>
        <SidebarEntrenadorReal activo="dashboard" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
        {cuerpoAncho}
      </div>
    );
  }

  // Móvil / vista estrecha: mismas piezas apiladas y con scroll de página.
  return (
    <PantallaBase rol="entrenador" maxWidth={560}>
      <style>{ESTILOS}</style>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cabecera}
          {calendario}
          {alertasPanel}
          {pendientePanel}
          {fatigaPanel}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {puedeCambiarCodigo && (
            <button type="button" onClick={() => setCodigoAbierto(true)} style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Código de entrenador</button>
          )}
          <button type="button" onClick={onCerrarSesion} style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px solid ${ds.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Cerrar sesión</button>
        </div>
        {codigoAbierto && <PanelCodigoEntrenadorReal onCerrar={() => setCodigoAbierto(false)} />}
      </div>
    </PantallaBase>
  );
}
