import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ds, dsF, dsR, DsButton, DsCard, DsBadge, DsInput, DsSelect, DsTabSwitcher, DsToggle } from "../core/designSystem.jsx";
import { LoadingBlock } from "../core/components.jsx";
import { CMJ_STATUS_META, CMJ_TAG_META, CMJ_METRIC_CHART_COLOR } from "../core/cmjDisplay.jsx";
import { api, supabase, genId } from "../core/backend.js";
import { sharedDataCache, usePlayers, useMicrociclosTipo, usePartidos } from "../core/hooks.js";
import { todayStr, fmtDateShort } from "../calc/fechas.js";
import {
  CMJ_FIELDS,
  CMJ_METRICS,
  CMJ_METRIC_LIST,
  CMJ_POSICIONES,
  CMJ_UMBRAL_DEFECTO,
  cmjBuildPlayers,
  cmjDateKeyFromDate,
  cmjFindCurrentMicroId,
  cmjFmt,
  cmjHoyDe,
  cmjMicroRefDate,
  cmjNormalizarNombre,
  cmjOrderedMicroList,
  cmjParseCSV,
  cmjPosicionLabel,
  cmjSigned,
  cmjSuggestNextNumero,
} from "../calc/cmj.js";

// cmjNormalizarNombre ahora en src/calc/cmj.js — importada arriba.

// Alias guardados (nombre del CSV -> jugador ya vinculado a mano antes) —
// la red de seguridad de la que se habló: una vez vinculado un nombre que
// no coincidía, no hay que repetirlo en el próximo CSV.
function useCmjAlias() {
  const [alias, setAlias] = useState(new Map());
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setLoaded(false);
    supabase
      .from("cmj_alias_nombre")
      .select("*")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (!error && data) {
          setAlias(new Map(data.map((r) => [r.nombre_normalizado, { jugadorId: r.jugador_id, nombreOriginal: r.nombre_original }])));
        }
        setLoaded(true);
      });
    return () => { cancelado = true; };
  }, [reloadKey]);
  const recargar = useCallback(() => setReloadKey((k) => k + 1), []);
  return [alias, loaded, recargar];
}

export function ControlFatigaModuloReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [vista, setVista] = useState("subir");
  const TABS = [
    { id: "subir", label: "Subir CSV" },
    { id: "estado", label: "Estado actual" },
    { id: "microciclos", label: "Microciclos" },
    { id: "ranking", label: "Ranking" },
  ];
  return (
    <PantallaEntrenadorAncha activo="fatiga" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>CONTROL DE FATIGA</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Salto CMJ</h1>
        </div>
        <DsTabSwitcher tabs={TABS} active={vista} onChange={setVista} />
        <div style={{ marginTop: 16 }}>
          {vista === "subir" && <CmjSubirCsvReal />}
          {vista === "estado" && <CmjEstadoActualReal />}
          {vista === "microciclos" && <CmjMicrociclosReal />}
          {vista === "ranking" && <CmjRankingReal />}
        </div>
      </div>
    </PantallaEntrenadorAncha>
  );
}

export function CmjProximamente({ titulo, texto }) {
  return (
    <DsCard style={{ padding: 20, textAlign: "center", color: ds.inkMuted }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 420, margin: "0 auto" }}>{texto}</div>
    </DsCard>
  );
}

const CMJ_MICROCICLO_FORM_VACIO = { id: null, numero: "", inicio: "", md2: "", md1: "" };

function CmjMicrociclosReal() {
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(CMJ_MICROCICLO_FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  // Fecha del partido para rellenar MD-2 / MD+1 sin teclear (por defecto, el
  // próximo día de partido definido en el microciclo tipo del Calendario).
  const { todos: microTipoCmj, loaded: microTipoCmjLoaded } = useMicrociclosTipo();
  const { todos: partidosCmj, loaded: partidosCmjLoaded } = usePartidos();
  const [partidoRef, setPartidoRef] = useState("");
  useEffect(() => {
    if (!microTipoCmjLoaded || !partidosCmjLoaded || partidoRef) return;
    // Primero el próximo partido real del calendario; si no hay, el día de partido semanal.
    const proximo = partidosCmj.map((x) => x.fecha).filter((f) => f >= todayStr()).sort()[0];
    if (proximo) return setPartidoRef(proximo);
    const m = Object.values(microTipoCmj).find((x) => x && x.diaPartido != null);
    if (!m) return;
    const hoyP = todayStr();
    const f = sumarDiasFecha(inicioSemanaCalendario(hoyP), m.diaPartido);
    setPartidoRef(f >= hoyP ? f : sumarDiasFecha(f, 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microTipoCmjLoaded, partidosCmjLoaded]);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("cmj_microciclos").select("*");
    if (!error) setMicrociclos(data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ordenados = useMemo(() => cmjOrderedMicroList(microciclos), [microciclos]);
  const actual = useMemo(() => cmjFindCurrentMicroId(ordenados), [ordenados]);
  const isEditing = form.id != null;

  const empezarNuevo = useCallback(() => {
    setForm({ ...CMJ_MICROCICLO_FORM_VACIO, numero: cmjSuggestNextNumero(microciclos) });
  }, [microciclos]);

  // En cuanto se cargan los microciclos por primera vez, se rellena el
  // formulario con el siguiente número sugerido — así el campo nunca
  // aparece vacío sin motivo.
  useEffect(() => {
    if (loaded && form.id == null && form.numero === "") empezarNuevo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function empezarEdicion(m) {
    setForm({
      id: m.id,
      numero: m.numero || "",
      inicio: m.inicio ? m.inicio.slice(0, 10) : "",
      md2: m.md2 ? m.md2.slice(0, 10) : "",
      md1: m.md1 ? m.md1.slice(0, 10) : "",
    });
  }

  async function guardar() {
    if (!form.numero.trim()) return;
    setGuardando(true);
    setError("");
    const row = {
      id: form.id || genId("cmjmicro"),
      numero: form.numero.trim(),
      inicio: form.inicio || null,
      md2: form.md2 || null,
      md1: form.md1 || null,
    };
    const { error } = await supabase.from("cmj_microciclos").upsert(row, { onConflict: "id" });
    if (error) {
      setError(error.message);
    } else {
      sharedDataCache.delete("cmj_microciclos");
      await cargar();
      empezarNuevo();
    }
    setGuardando(false);
  }

  async function eliminar(id) {
    const { error } = await supabase.from("cmj_microciclos").delete().eq("id", id);
    if (!error) {
      sharedDataCache.delete("cmj_microciclos");
      await cargar();
      if (form.id === id) empezarNuevo();
    }
  }

  if (!loaded) return <LoadingBlock />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{isEditing ? `Editando microciclo Nº ${form.numero || "—"}` : "Nuevo microciclo"}</div>
        <div style={{ fontSize: 12, color: ds.inkMuted, lineHeight: 1.5 }}>
          Número y fechas de Inicio / MD-2 / MD+1. Puedes dejar alguna fecha en blanco si esa semana no toca ese test, y programar fechas futuras.
        </div>
      </div>

      <DsCard style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${ds.border}` }}>
          <span style={{ fontSize: 12, color: ds.inkSecondary }}>Rellenar desde el partido:</span>
          <DsInput type="date" value={partidoRef} onChange={(e) => setPartidoRef(e.target.value)} style={{ width: 170 }} />
          <DsButton size="sm" variant="secondary" disabled={!partidoRef} onClick={() => setForm((f) => ({ ...f, md2: sumarDiasFecha(partidoRef, -2), md1: sumarDiasFecha(partidoRef, 1), inicio: f.inicio || inicioSemanaCalendario(partidoRef) }))}>
            Calcular MD-2 y MD+1
          </DsButton>
          <span style={{ fontSize: 11.5, color: ds.inkMuted }}>El día de partido sale de tu microciclo tipo del Calendario. «Inicio» solo se rellena si está vacío (lunes de esa semana).</span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Número</div>
            <DsInput value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="ej. 12" style={{ width: 80 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.inicio.color, marginBottom: 4 }}>Inicio microciclo</div>
            <DsInput type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.md2.color, marginBottom: 4 }}>MD-2</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <DsInput type="date" value={form.md2} onChange={(e) => setForm({ ...form, md2: e.target.value })} />
              {form.md2 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, md2: "" })}
                  title="Borrar fecha"
                  style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 14, cursor: "pointer", padding: 2, lineHeight: 1 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.md1.color, marginBottom: 4 }}>MD+1</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <DsInput type="date" value={form.md1} onChange={(e) => setForm({ ...form, md1: e.target.value })} />
              {form.md1 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, md1: "" })}
                  title="Borrar fecha"
                  style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 14, cursor: "pointer", padding: 2, lineHeight: 1 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: ds.danger }}>{error}</div>}
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <DsButton size="sm" onClick={guardar} disabled={guardando || !form.numero.trim()}>
            {guardando ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar microciclo"}
          </DsButton>
          {isEditing && (
            <DsButton size="sm" variant="secondary" onClick={empezarNuevo} disabled={guardando}>
              Cancelar edición
            </DsButton>
          )}
        </div>
      </DsCard>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>Microciclos registrados</div>
      {ordenados.length === 0 ? (
        <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Aún no hay ninguno guardado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordenados.map((m) => {
            const ref = cmjMicroRefDate(m);
            const refDate = ref ? new Date(ref + "T00:00:00") : null;
            const cuando = m.id === actual.id ? "Actual" : refDate && refDate > today ? "Futuro" : "Pasado";
            const cuandoColor = cuando === "Actual" ? ds.accent : cuando === "Futuro" ? ds.chart2 : ds.inkMuted;
            return (
              <DsCard key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", flexWrap: "wrap" }}>
                <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13, minWidth: 40 }}>Nº{m.numero}</div>
                <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 220, fontSize: 12 }}>
                  <div><span style={{ color: CMJ_TAG_META.inicio.color }}>Inicio</span> {m.inicio ? fmtDateShort(m.inicio) : "—"}</div>
                  <div><span style={{ color: CMJ_TAG_META.md2.color }}>MD-2</span> {m.md2 ? fmtDateShort(m.md2) : "—"}</div>
                  <div><span style={{ color: CMJ_TAG_META.md1.color }}>MD+1</span> {m.md1 ? fmtDateShort(m.md1) : "—"}</div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: cuandoColor }}>{cuando}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => empezarEdicion(m)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    Editar
                  </button>
                  <button onClick={() => eliminar(m.id)} style={{ background: "transparent", border: "none", color: ds.danger, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    Eliminar
                  </button>
                </div>
              </DsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// CMJ_UMBRAL_DEFECTO y cmjHoyDe ahora en src/calc/cmj.js — importadas
// arriba.

function CmjAjustesUmbralReal({ umbral, onGuardado }) {
  const [form, setForm] = useState(umbral);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    await api.setConfig("cmj_umbral", form);
    setGuardando(false);
    onGuardado(form);
  }

  return (
    <DsCard style={{ padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Ajustes del umbral</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Ámbar general (%)</div>
          <DsInput type="number" min="1" max="40" value={form.ambarPct} onChange={(e) => setForm({ ...form, ambarPct: Number(e.target.value) })} style={{ width: 70 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Rojo general (%)</div>
          <DsInput type="number" min="1" max="60" value={form.rojoPct} onChange={(e) => setForm({ ...form, rojoPct: Number(e.target.value) })} style={{ width: 70 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
          <DsToggle on={form.individualizar} onClick={() => setForm({ ...form, individualizar: !form.individualizar })} />
          Individualizar por jugador (con 4+ Inicios de historial)
        </label>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Usar Inicios desde (cambio de protocolo)</div>
          <DsInput type="date" value={form.protocoloDesde || ""} onChange={(e) => setForm({ ...form, protocoloDesde: e.target.value })} />
        </div>
        <DsButton size="sm" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ajustes"}</DsButton>
      </div>
    </DsCard>
  );
}

function CmjEstadoActualReal() {
  const [players, , playersLoaded] = usePlayers();
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [umbral, setUmbral] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(new Set(["red", "amber", "green", "gray"]));
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [expandedMetrics, setExpandedMetrics] = useState(new Set());
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  const cargar = useCallback(async () => {
    const [saltosRes, microRes, umbralGuardado] = await Promise.all([
      supabase.from("cmj_saltos").select("*").not("jugador_id", "is", null),
      supabase.from("cmj_microciclos").select("*"),
      api.config("cmj_umbral"),
    ]);
    if (!saltosRes.error) setSaltos((saltosRes.data || []).filter((s) => !s.excluido));
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setUmbral(umbralGuardado || CMJ_UMBRAL_DEFECTO);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const filasParaMotor = useMemo(
    () =>
      saltos
        .filter((s) => playersById.has(s.jugador_id))
        .map((s) => ({
          jugadorId: s.jugador_id,
          nombre: playersById.get(s.jugador_id).name,
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
        })),
    [saltos, playersById]
  );

  function toggleFiltro(s) {
    setFiltroEstado((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }
  function toggleCard(id) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleMetrica(id) {
    setExpandedMetrics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!playersLoaded || !loaded || !umbral) return <LoadingBlock />;

  const { players: builtPlayers, microList } = cmjBuildPlayers(filasParaMotor, microciclos, umbral.ambarPct, umbral.rojoPct, umbral.individualizar, umbral.protocoloDesde);
  const current = cmjFindCurrentMicroId(microList);

  const cabecera = (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setMostrarAjustes((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: mostrarAjustes ? 10 : 0 }}>
        {mostrarAjustes ? "▾ ocultar ajustes del umbral" : "▸ ajustes del umbral"}
      </button>
      {mostrarAjustes && <CmjAjustesUmbralReal umbral={umbral} onGuardado={setUmbral} />}
    </div>
  );

  if (microList.length === 0) {
    return (
      <div>
        {cabecera}
        <CmjProximamente titulo="Sin microciclos definidos" texto="Ve a la pestaña Microciclos y crea al menos uno (Inicio, MD-2, MD+1) para poder ver el estado semanal." />
      </div>
    );
  }
  if (current.id == null) {
    const next = microList[0];
    return (
      <div>
        {cabecera}
        <CmjProximamente
          titulo="El primer microciclo programado aún no ha empezado"
          texto={`Microciclo Nº ${next.numero} · inicio previsto ${next.inicio ? fmtDateShort(next.inicio) : "sin fecha"}. En cuanto se registren tests para esa fecha, aparecerán aquí.`}
        />
      </div>
    );
  }

  const meta = microList.find((m) => m.id === current.id);
  const todayKey = cmjDateKeyFromDate(new Date());
  const todayTag = CMJ_FIELDS.find((f) => meta[f] === todayKey) || null;

  const conHoy = builtPlayers.map((p) => ({ p, hoy: cmjHoyDe(p, todayTag) }));

  const porPosicion = new Map(CMJ_POSICIONES.map((pos) => [pos.key, []]));
  porPosicion.set(null, []);
  conHoy.forEach(({ p, hoy }) => {
    if (!filtroEstado.has(hoy.status)) return;
    const jugador = playersById.get(p.jugadorId);
    const pos = jugador?.posicion || null;
    (porPosicion.has(pos) ? porPosicion.get(pos) : porPosicion.get(null)).push({ p, hoy, jugador });
  });
  const totalFiltrados = [...porPosicion.values()].reduce((s, l) => s + l.length, 0);

  return (
    <div>
      {cabecera}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 8 }}>
          Microciclo Nº {meta.numero} · inicio {meta.inicio ? fmtDateShort(meta.inicio) : "—"} · {todayTag ? `hoy: ${CMJ_TAG_META[todayTag]?.label || "Inicio microciclo"}` : "hoy no hay test programado — última lectura de la semana"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["red", "amber", "green", "gray"].map((s) => {
            const activo = filtroEstado.has(s);
            const meta2 = CMJ_STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => toggleFiltro(s)}
                style={{
                  fontSize: 12,
                  padding: "6px 11px",
                  borderRadius: dsR.md,
                  border: `1px solid ${activo ? meta2.color : ds.border}`,
                  background: activo ? meta2.bg : "transparent",
                  color: activo ? meta2.color : ds.inkMuted,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {meta2.label}
              </button>
            );
          })}
        </div>
      </div>

      {totalFiltrados === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Ningún jugador coincide con el filtro seleccionado.</div>}

      {[...CMJ_POSICIONES.map((p) => p.key), null].map((posKey) => {
        const lista = porPosicion.get(posKey) || [];
        if (lista.length === 0) return null;
        const label = posKey ? cmjPosicionLabel(posKey) : "Sin posición";
        return (
          <div key={posKey ?? "sin"} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${ds.borderSoft}` }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>{lista.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
              {lista
                .sort((a, b) => a.jugador.name.localeCompare(b.jugador.name))
                .map(({ p, hoy }) => {
                  const cardId = p.jugadorId;
                  const cardOpen = expandedCards.has(cardId);
                  const statusMeta = CMJ_STATUS_META[hoy.status];
                  return (
                    <DsCard
                      key={cardId}
                      style={{
                        padding: "11px 13px",
                        gap: 6,
                        background: hoy.status !== "gray" ? `linear-gradient(180deg, ${statusMeta.color}18 0%, ${ds.surface} 65%)` : undefined,
                        borderColor: hoy.status !== "gray" ? statusMeta.color + "55" : ds.borderSoft,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>{p.nombre}</span>
                        {hoy.nivel && <span style={{ fontSize: 10.5, color: ds.inkMuted }}>|</span>}
                        {hoy.nivel && <span style={{ fontSize: 10.5, fontWeight: 700, color: statusMeta.color, textTransform: "uppercase" }}>{hoy.nivel}</span>}
                        {hoy.m?.divergente && <span title="Divergencia: la altura no muestra fatiga, pero potencia y/o fuerza sí caen." style={{ color: ds.warning, fontSize: 12 }}>⚠</span>}
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: statusMeta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{statusMeta.label}</span>
                      </div>

                      {hoy.rows.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {hoy.rows.map((row) => {
                            const mkey = `${cardId}::${row.key}`;
                            const mOpen = expandedMetrics.has(mkey);
                            const rowMeta = CMJ_STATUS_META[row.status];
                            return (
                              <div key={row.key}>
                                <div onClick={() => toggleMetrica(mkey)} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, cursor: "pointer", padding: "1px 0" }}>
                                  <span style={{ color: ds.inkSecondary }}>› {row.label}</span>
                                  <span style={{ color: rowMeta.color, fontWeight: 700, fontFamily: dsF.mono }}>{cmjSigned(row.delta)}</span>
                                </div>
                                {mOpen && <div style={{ fontSize: 11, color: ds.inkMuted, lineHeight: 1.5, padding: "2px 0 4px 12px" }}>{row.explicacion}</div>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Sin valores todavía</div>
                      )}

                      {hoy.motivo && (
                        <>
                          <div onClick={() => toggleCard(cardId)} style={{ fontSize: 11, color: ds.inkMuted, cursor: "pointer" }}>
                            {cardOpen ? "▾ ocultar recomendación" : "› ver recomendación"}
                          </div>
                          {cardOpen && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: ds.inkSecondary }}>{hoy.motivo}</div>}
                        </>
                      )}
                    </DsCard>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Ranking histórico: la mejor marca de cada jugador en la variable y el
// periodo elegidos (histórico completo, un microciclo concreto o un rango
// de fechas), filtrable por momento del test (Inicio/MD-2/MD+1/sin
// etiqueta) y por posición — igual que en el panel independiente. Los
// umbrales de alerta no influyen aquí (el ranking no evalúa fatiga, solo
// compara marcas), así que se usa cmjBuildPlayers con el umbral por
// defecto solo para reutilizar el mismo agrupado por jugador y microciclo.
function CmjRankingReal() {
  const [players, , playersLoaded] = usePlayers();
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [metricKey, setMetricKey] = useState("altura");
  const [periodo, setPeriodo] = useState("historico"); // 'historico' | 'microciclo' | 'rango'
  const [microSel, setMicroSel] = useState(null);
  const [rango, setRango] = useState({ start: "", end: "" });
  const [filtroTags, setFiltroTags] = useState(() => new Set(["inicio", "md2", "md1", "sin"]));
  const [filtroPosicion, setFiltroPosicion] = useState(() => new Set([...CMJ_POSICIONES.map((p) => p.key), "sin"]));
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const cargar = useCallback(async () => {
    const [saltosRes, microRes] = await Promise.all([
      supabase.from("cmj_saltos").select("*").not("jugador_id", "is", null),
      supabase.from("cmj_microciclos").select("*"),
    ]);
    if (!saltosRes.error) setSaltos((saltosRes.data || []).filter((s) => !s.excluido));
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const filasParaMotor = useMemo(
    () =>
      saltos
        .filter((s) => playersById.has(s.jugador_id))
        .map((s) => ({
          jugadorId: s.jugador_id,
          nombre: playersById.get(s.jugador_id).name,
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
        })),
    [saltos, playersById]
  );

  function toggleTag(k) {
    setFiltroTags((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }
  function toggleFiltroPosicion(k) {
    setFiltroPosicion((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (!playersLoaded || !loaded) return <LoadingBlock />;

  const { players: builtPlayers, microList } = cmjBuildPlayers(
    filasParaMotor,
    microciclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );

  const microSelActivo = microSel ?? (microList.length ? microList[microList.length - 1].id : null);
  const metric = CMJ_METRICS[metricKey];

  const candidatosDe = (p) => {
    if (periodo === "microciclo") {
      const m = p.microResults.get(microSelActivo);
      if (!m) return [];
      return CMJ_FIELDS.filter((k) => m[k] && filtroTags.has(k)).map((k) => m[k]);
    }
    const dentroDeRango = (r) => {
      if (periodo !== "rango" || !rango.start || !rango.end) return periodo !== "rango";
      const t = new Date(r.date).getTime();
      return t >= new Date(rango.start).getTime() && t <= new Date(rango.end + "T23:59:59").getTime();
    };
    return p.sorted.filter((r) => filtroTags.has(r.tag || "sin") && dentroDeRango(r));
  };

  const filaDe = (p) => {
    const candidatos = candidatosDe(p).map((r) => ({ r, v: metric.get(r) })).filter((c) => c.v != null);
    if (candidatos.length === 0) return null;
    const mejor = candidatos.reduce((a, b) => (b.v > a.v ? b : a));
    return { player: p, valor: mejor.v, fecha: mejor.r.date, tag: mejor.r.tag };
  };

  const posicionDe = (p) => playersById.get(p.jugadorId)?.posicion || "sin";

  const filas = builtPlayers
    .filter((p) => filtroPosicion.has(posicionDe(p)))
    .map(filaDe)
    .filter(Boolean)
    .sort((a, b) => b.valor - a.valor);

  const sinDatos = builtPlayers.filter((p) => filtroPosicion.has(posicionDe(p)) && !filaDe(p));

  const RANK_COLOR = { 0: ds.accent, 1: ds.inkSecondary, 2: ds.chart1 };
  const RANK_BG = { 0: `${ds.accent}1A`, 1: `${ds.inkSecondary}14`, 2: `${ds.chart1}14` };
  const esReciente = (fecha) => (Date.now() - new Date(fecha).getTime()) / 86400000 <= 14;

  const opcionesMomento = [
    { key: "inicio", label: "Inicio", color: CMJ_TAG_META.inicio.color },
    { key: "md2", label: "MD-2", color: CMJ_TAG_META.md2.color },
    { key: "md1", label: "MD+1", color: CMJ_TAG_META.md1.color },
    { key: "sin", label: "Sin etiqueta", color: ds.inkMuted },
  ];
  const opcionesPosicion = [...CMJ_POSICIONES.map((p) => ({ key: p.key, label: p.label })), { key: "sin", label: "Sin posición" }];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Mejor marca por jugador</div>
        <div style={{ fontSize: 12, color: ds.inkMuted, lineHeight: 1.5 }}>
          Mejor valor de cada jugador en la variable y el periodo elegidos. El podio (1º-3º) se resalta, y "▲ reciente" indica una marca de los últimos 14 días.
        </div>
      </div>

      <button onClick={() => setMostrarFiltros((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: mostrarFiltros ? 12 : 16 }}>
        {mostrarFiltros ? "▾ ocultar filtros" : "▸ filtros"}
      </button>

      {mostrarFiltros && (
        <DsCard style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Variable</div>
            <DsTabSwitcher tabs={CMJ_METRIC_LIST.map((m) => ({ id: m.key, label: m.label }))} active={metricKey} onChange={setMetricKey} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Periodo</div>
            <DsTabSwitcher
              tabs={[
                { id: "historico", label: "Histórico completo" },
                { id: "microciclo", label: "Microciclo concreto" },
                { id: "rango", label: "Rango de fechas" },
              ]}
              active={periodo}
              onChange={setPeriodo}
            />
          </div>

          {periodo === "microciclo" && (
            microList.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Microciclo</div>
                <DsSelect value={microSelActivo || ""} onChange={(e) => setMicroSel(e.target.value)} style={{ maxWidth: 220 }}>
                  {microList.map((m) => (
                    <option key={m.id} value={m.id}>Nº {m.numero}</option>
                  ))}
                </DsSelect>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: ds.inkMuted }}>Todavía no hay ningún microciclo registrado.</div>
            )
          )}

          {periodo === "rango" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Fechas</div>
              <div style={{ display: "flex", gap: 12 }}>
                <DsInput type="date" value={rango.start} onChange={(e) => setRango({ ...rango, start: e.target.value })} />
                <DsInput type="date" value={rango.end} onChange={(e) => setRango({ ...rango, end: e.target.value })} />
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Momento</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opcionesMomento.map((op) => {
                const activo = filtroTags.has(op.key);
                return (
                  <button
                    key={op.key}
                    onClick={() => toggleTag(op.key)}
                    style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? op.color : ds.border}`, background: activo ? `${op.color}1E` : "transparent", color: activo ? op.color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Posición</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opcionesPosicion.map((op) => {
                const activo = filtroPosicion.has(op.key);
                return (
                  <button
                    key={op.key}
                    onClick={() => toggleFiltroPosicion(op.key)}
                    style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accentSubtle : "transparent", color: activo ? ds.accent : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        </DsCard>
      )}

      {filas.length === 0 ? (
        <CmjProximamente titulo="Sin datos para este filtro" texto="Prueba a ampliar el momento, la posición o el periodo seleccionados." />
      ) : (
        <DsCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 130px 110px 100px", padding: "12px 16px", borderBottom: `1px solid ${ds.border}` }}>
                {["Nº", "Jugador", "Posición", metric.label.toUpperCase(), "Fecha", "Momento"].map((h, hi) => (
                  <div key={h} style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: hi >= 3 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {filas.map((f, i) => {
                const jugador = playersById.get(f.player.jugadorId);
                const posLabel = jugador?.posicion ? cmjPosicionLabel(jugador.posicion) : "—";
                return (
                  <div
                    key={f.player.jugadorId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr 130px 130px 110px 100px",
                      padding: "11px 16px",
                      alignItems: "center",
                      borderBottom: `1px solid ${ds.borderSoft}`,
                      borderLeft: RANK_COLOR[i] ? `3px solid ${RANK_COLOR[i]}` : "3px solid transparent",
                      background: RANK_BG[i] || (i % 2 === 1 ? ds.bgElevated + "40" : "transparent"),
                    }}
                  >
                    <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13.5, color: RANK_COLOR[i] || ds.inkMuted }}>{i + 1}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{f.player.nombre}</div>
                    <div style={{ fontSize: 12, color: ds.inkSecondary }}>{posLabel}</div>
                    <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13.5, color: CMJ_METRIC_CHART_COLOR[metricKey], textAlign: "right" }}>
                      {cmjFmt(f.valor, metric.decimals)} {metric.unit}
                    </div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted, textAlign: "right" }}>
                      {fmtDateShort(f.fecha)}
                      {esReciente(f.fecha) && <span style={{ display: "block", color: ds.success, fontWeight: 600, fontSize: 10.5 }}>▲ reciente</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted, textAlign: "right" }}>{f.tag ? CMJ_TAG_META[f.tag].label : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </DsCard>
      )}

      {sinDatos.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 11.5, color: ds.inkMuted, lineHeight: 1.5 }}>
          Sin marca en este filtro: {sinDatos.map((p) => p.nombre).join(", ")}.
        </div>
      )}
    </div>
  );
}

function CmjSubirCsvReal() {
  const [players, , playersLoaded] = usePlayers();
  const [alias, aliasLoaded, recargarAlias] = useCmjAlias();
  const [parsed, setParsed] = useState(null); // { rows, issues }
  const [vinculos, setVinculos] = useState(new Map()); // nombreCsv -> jugadorId | "ignorar" | null
  const [origenVinculo, setOrigenVinculo] = useState(new Map()); // nombreCsv -> "alias" | "nombre" | "manual" | null
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState("");
  const fileInputRef = useRef(null);

  const jugadoresPorNombreNorm = useMemo(() => {
    const m = new Map();
    players.forEach((p) => m.set(cmjNormalizarNombre(p.name), p.id));
    return m;
  }, [players]);

  function resolverAutomatico(nombreCsv) {
    const norm = cmjNormalizarNombre(nombreCsv);
    const porAlias = alias.get(norm);
    if (porAlias) return { jugadorId: porAlias.jugadorId, origen: "alias" };
    const porNombre = jugadoresPorNombreNorm.get(norm);
    if (porNombre) return { jugadorId: porNombre, origen: "nombre" };
    return { jugadorId: null, origen: null };
  }

  function limpiarSeleccion() {
    setParsed(null);
    setVinculos(new Map());
    setOrigenVinculo(new Map());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, issues } = cmjParseCSV(ev.target.result);
      const nuevosVinculos = new Map();
      const nuevosOrigenes = new Map();
      [...new Set(rows.map((r) => r.nombreCsv))].forEach((n) => {
        const { jugadorId, origen } = resolverAutomatico(n);
        nuevosVinculos.set(n, jugadorId);
        nuevosOrigenes.set(n, origen);
      });
      setParsed({ rows, issues });
      setVinculos(nuevosVinculos);
      setOrigenVinculo(nuevosOrigenes);
      setResultado(null);
      setErrorGuardado("");
    };
    reader.readAsText(file, "utf-8");
  }

  const nombresUnicos = useMemo(() => (parsed ? [...new Set(parsed.rows.map((r) => r.nombreCsv))] : []), [parsed]);
  const pendientes = nombresUnicos.filter((n) => vinculos.get(n) == null).length;

  async function confirmarGuardado() {
    if (!parsed) return;
    setGuardando(true);
    setErrorGuardado("");
    try {
      // 1) Guardar como alias los vínculos que ha elegido David a mano ahora
      // mismo (no los que ya venían de un alias guardado antes) — así la
      // próxima vez que aparezca este mismo nombre en un CSV, se vincula solo.
      const aliasNuevos = nombresUnicos
        .filter((n) => {
          const v = vinculos.get(n);
          return v && v !== "ignorar" && origenVinculo.get(n) === "manual";
        })
        .map((n) => ({ nombre_normalizado: cmjNormalizarNombre(n), jugador_id: vinculos.get(n), nombre_original: n }));

      if (aliasNuevos.length) {
        const { error } = await supabase.from("cmj_alias_nombre").upsert(aliasNuevos, { onConflict: "nombre_normalizado" });
        if (error) throw new Error(error.message);
      }

      // 2) Guardar los saltos — solo de los nombres vinculados a un jugador
      // real. Los "ignorados" y los que siguen sin vincular no se guardan:
      // así nunca se crea un jugador fantasma por un nombre que no coincide.
      const filas = parsed.rows
        .filter((r) => {
          const v = vinculos.get(r.nombreCsv);
          return v && v !== "ignorar";
        })
        .map((r) => ({
          id: genId("cmjsalto"),
          jugador_id: vinculos.get(r.nombreCsv),
          nombre_csv: r.nombreCsv,
          equipo: r.equipo || null,
          fecha: r.dateKey,
          fecha_hora: r.date,
          peso: r.peso,
          hp0: r.hp0,
          altura: r.altura,
          fuerza: r.fuerza,
          potencia: r.potencia,
          velocidad: r.velocidad,
          kinetics_valid: r.kineticsValid,
          peso_valid: r.pesoValid,
          hp0_valid: r.hp0Valid,
          n_saltos: r.nSaltos,
        }));

      if (filas.length) {
        const { error } = await supabase.from("cmj_saltos").upsert(filas, { onConflict: "nombre_csv,fecha" });
        if (error) throw new Error(error.message);
      }

      const ignorados = nombresUnicos.filter((n) => vinculos.get(n) === "ignorar").length;
      const pendientesFinal = nombresUnicos.filter((n) => vinculos.get(n) == null).length;
      setResultado({
        guardados: filas.length,
        jugadoresGuardados: nombresUnicos.length - ignorados - pendientesFinal,
        ignorados,
        pendientes: pendientesFinal,
      });
      if (aliasNuevos.length) recargarAlias();
      limpiarSeleccion();
    } catch (err) {
      setErrorGuardado(err.message || "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Subir CSV de My Jump Lab</div>
        <div style={{ fontSize: 12.5, color: ds.inkMuted, lineHeight: 1.5 }}>
          Cada exportación se trata como tu historial completo hasta la fecha — puedes subir el mismo archivo varias veces, no se duplica (se actualiza el test de ese jugador y ese día).
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} id="cmj-csv-input" />
      <label htmlFor="cmj-csv-input" className="ds-button ds-button--secondary" style={{ display: "inline-flex", cursor: "pointer" }}>
        Elegir archivo CSV
      </label>

      {!playersLoaded || !aliasLoaded ? (
        parsed && <LoadingBlock />
      ) : parsed ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12.5, color: ds.inkMuted, marginBottom: 10 }}>
            {parsed.rows.length} test{parsed.rows.length === 1 ? "" : "s"} de {nombresUnicos.length} jugador{nombresUnicos.length === 1 ? "" : "es"} detectados en el CSV.
            {parsed.issues.dupCount > 0 && ` ${parsed.issues.dupCount} fila(s) duplicada(s) ignoradas.`}
            {parsed.issues.hp0Suspect > 0 && ` ${parsed.issues.hp0Suspect} test(s) sin calibración válida — fuerza y potencia no se calcularán para esos.`}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nombresUnicos.map((nombreCsv) => {
              const v = vinculos.get(nombreCsv);
              const origen = origenVinculo.get(nombreCsv);
              const nTests = parsed.rows.filter((r) => r.nombreCsv === nombreCsv).length;
              return (
                <DsCard key={nombreCsv} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{nombreCsv}</div>
                    <div style={{ fontSize: 11, color: ds.inkMuted }}>{nTests} test{nTests === 1 ? "" : "s"}</div>
                  </div>
                  {v && v !== "ignorar" ? (
                    <DsBadge tone={origen === "manual" ? "accent" : "success"}>
                      {origen === "alias" ? "vinculado (alias)" : origen === "nombre" ? "vinculado por nombre" : "vinculado"}
                    </DsBadge>
                  ) : v === "ignorar" ? (
                    <DsBadge tone="neutral">ignorado</DsBadge>
                  ) : (
                    <DsBadge tone="danger">sin vincular</DsBadge>
                  )}
                  <DsSelect
                    value={v && v !== "ignorar" ? v : v === "ignorar" ? "ignorar" : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVinculos((prev) => new Map(prev).set(nombreCsv, val === "" ? null : val));
                      setOrigenVinculo((prev) => new Map(prev).set(nombreCsv, val === "" || val === "ignorar" ? null : "manual"));
                    }}
                    style={{ width: 200 }}
                  >
                    <option value="">— Sin vincular —</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="ignorar">No es mi jugador (ignorar)</option>
                  </DsSelect>
                </DsCard>
              );
            })}
          </div>

          {pendientes > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: ds.warning }}>
              {pendientes} jugador{pendientes === 1 ? "" : "es"} todavía sin vincular ni ignorar — sus tests no se guardarán hasta que elijas una opción para cada uno.
            </div>
          )}

          {errorGuardado && <div style={{ marginTop: 12, fontSize: 12.5, color: ds.danger }}>{errorGuardado}</div>}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <DsButton onClick={confirmarGuardado} disabled={guardando}>{guardando ? "Guardando…" : "Guardar en Control de fatiga"}</DsButton>
            <DsButton variant="secondary" onClick={limpiarSeleccion} disabled={guardando}>Cancelar</DsButton>
          </div>
        </div>
      ) : null}

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <DsCard status="done" style={{ padding: 14, fontSize: 13 }}>
            Guardado: {resultado.guardados} test{resultado.guardados === 1 ? "" : "s"} de {resultado.jugadoresGuardados} jugador{resultado.jugadoresGuardados === 1 ? "" : "es"}.
            {resultado.ignorados > 0 && ` ${resultado.ignorados} jugador(es) ignorados.`}
            {resultado.pendientes > 0 && ` ${resultado.pendientes} quedaron sin vincular (no se guardaron sus tests) — vuelve a subir el mismo CSV cuando quieras resolverlo.`}
          </DsCard>
        </div>
      )}
    </div>
  );
}
