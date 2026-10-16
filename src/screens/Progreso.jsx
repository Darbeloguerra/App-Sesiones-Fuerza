import { useState } from "react";
import { Zap, Activity } from "lucide-react";
import { ds, dsF, dsR, DsSelect, DsCard } from "../core/designSystem.jsx";
import { LoadingBlock, GraficaProgresoCargaReal } from "../core/components.jsx";
import { REPS_MAX_RIR_FIABLE, pct1RMporRTF, materialEfectivo } from "../calc/e1rm.js";

// "Mi progreso" — para la propia vista del jugador: sin selector de jugador
// (siempre es el suyo), sin filtro de fechas, sin herramientas de entrenador.
// Tres secciones:
//  1. Progreso por ejercicio — 1RM estimado (o RTF en reps si el ejercicio
//     nunca lleva carga, p. ej. dominadas) agrupado solo por EJERCICIO, no
//     por esquema exacto de reps/RIR — así periodizar no "resetea" la curva.
//     El gráfico solo aparece tras elegir un ejercicio, y en el jugador se
//     recortan a los últimos 5 registros (el histórico completo lo ve el
//     entrenador en Historial, con el mismo componente sin recortar).
//  2. Constancia — racha de semanas cumpliendo el plan, más allá de la
//     semana actual que ya se ve en el Dashboard.
//  3. Volumen de entrenamiento — series completadas por semana.
export function MiProgresoJugadorReal({ items, loaded, historialSemanas = [], rachaSemanas = 0 }) {
  const [ejercicioSel, setEjercicioSel] = useState("");

  if (!loaded) return <LoadingBlock />;

  const elegibles = items.filter((it) => it.done && !it.esResistencia && !it.esElastica && it.bloque !== "CMJ");

  // ¿Este ejercicio+EQUIPO se ha trabajado alguna vez con carga registrada?
  // Si sí, se compara en 1RM estimado (kg); si nunca lleva carga (dominadas,
  // fondos...), se compara en RTF — reps estimadas hasta el fallo — mismo
  // motor que ya usamos para las recomendaciones de carga y "Tus récords"
  // del Dashboard, solo que aquí no se da el último paso a kg cuando no hay
  // con qué darlo. Se agrupa por ejercicio+equipo (no solo por ejercicio):
  // un multipower y una barra libre no pesan lo mismo, así que cuentan como
  // progresos distintos — el nombre solo lleva el equipo entre paréntesis
  // cuando de verdad se ha trabajado el mismo ejercicio con más de uno.
  const equiposPorNombre = new Map();
  elegibles.forEach((it) => {
    const eq = materialEfectivo(it);
    if (!equiposPorNombre.has(it.name)) equiposPorNombre.set(it.name, new Set());
    equiposPorNombre.get(it.name).add(eq);
  });
  const tieneCargaPorClave = new Set();
  elegibles.forEach((it) => {
    if (it.cargaReal !== "" && it.cargaReal != null && Number(it.cargaReal) > 0) tieneCargaPorClave.add(`${it.name}::${materialEfectivo(it)}`);
  });

  const datosPorNombre = new Map();
  elegibles.forEach((it) => {
    const reps = Number(it.repsReal);
    const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
    if (it.repsReal === "" || it.repsReal == null || Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return;
    if (reps > REPS_MAX_RIR_FIABLE) return;
    const equipo = materialEfectivo(it);
    const clave = `${it.name}::${equipo}`;
    const conCarga = tieneCargaPorClave.has(clave);
    let valor;
    let unidad;
    if (conCarga) {
      const carga = Number(it.cargaReal);
      if (!carga || Number.isNaN(carga)) return; // este registro concreto no tiene carga -> no comparable en esta rama
      const pct = pct1RMporRTF(reps + rir);
      if (!pct) return;
      valor = Math.round((carga / pct) * 10) / 10;
      unidad = "kg";
    } else {
      valor = reps + rir;
      unidad = " reps";
    }
    const etiqueta = (equiposPorNombre.get(it.name)?.size || 0) > 1 && equipo && equipo !== "std" ? `${it.name} (${equipo})` : it.name;
    if (!datosPorNombre.has(etiqueta)) datosPorNombre.set(etiqueta, { unidad, puntos: [] });
    datosPorNombre.get(etiqueta).puntos.push({ date: it.date, valor, rir: it.rirReal, reps: it.repsReal });
  });
  datosPorNombre.forEach((v) => v.puntos.sort((a, b) => (a.date < b.date ? -1 : 1)));

  const combinaciones = [...datosPorNombre.keys()].sort((a, b) => a.localeCompare(b));
  const datosActivos = ejercicioSel ? datosPorNombre.get(ejercicioSel) : null;
  const puntos = datosActivos ? datosActivos.puntos.slice(-5) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. PROGRESO POR EJERCICIO */}
      <div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 8, letterSpacing: "0.05em" }}>PROGRESO POR EJERCICIO</div>
        <DsSelect value={ejercicioSel} onChange={(e) => setEjercicioSel(e.target.value)} style={{ marginBottom: ejercicioSel ? 10 : 0 }}>
          <option value="">Elige un ejercicio…</option>
          {combinaciones.length === 0 && <option value="" disabled>Sin registros todavía</option>}
          {combinaciones.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </DsSelect>
        {ejercicioSel && (
          <DsCard style={{ padding: "16px 18px" }}>
            {puntos.length >= 2 ? (
              <>
                <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 10 }}>
                  {datosActivos.unidad === "kg" ? "1RM estimado" : "Reps estimadas al fallo"} · últimos {puntos.length} registros
                  {datosActivos.puntos.length > 5 ? " (el histórico completo lo ve tu entrenador)" : ""}
                </div>
                <GraficaProgresoCargaReal puntos={puntos} unidad={datosActivos.unidad} mostrarListaCompleta={false} />
              </>
            ) : (
              <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "12px 0", textAlign: "center" }}>
                Hace falta al menos 2 registros de este ejercicio para trazar la evolución.
              </div>
            )}
          </DsCard>
        )}
      </div>

      {/* 2. CONSTANCIA — desplegable, con mini-preview siempre visible */}
      {historialSemanas.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", listStyle: "none", display: "block" }}>
            <div style={{ background: `linear-gradient(135deg, ${ds.success}14, ${ds.bgElevated})`, border: `1px solid ${ds.success}55`, borderRadius: dsR.lg, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${ds.success}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.success }}>
                <Zap size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 2 }}>CONSTANCIA</div>
                <div style={{ fontSize: 14 }}>
                  <b style={{ color: ds.ink, fontWeight: 800 }}>{rachaSemanas} {rachaSemanas === 1 ? "semana" : "semanas"}</b> <span style={{ color: ds.inkSecondary }}>cumpliendo tu plan</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 26, flexShrink: 0 }}>
                {historialSemanas.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: `${s.pct != null ? Math.max(15, s.pct) : 15}%`,
                      background: i === historialSemanas.length - 1 ? ds.accent : s.pct != null && s.pct >= 80 ? ds.success : ds.border,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <span style={{ color: ds.inkMuted, fontSize: 15, flexShrink: 0 }}>▸</span>
            </div>
          </summary>
          <div style={{ marginTop: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: "16px 18px" }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginBottom: 6 }}>ÚLTIMAS {historialSemanas.length} SEMANAS</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
              {historialSemanas.map((s, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${s.pct != null ? Math.max(6, s.pct) : 6}%`,
                      background: s.pct != null && s.pct >= 80 ? ds.success : s.pct != null ? `${ds.success}55` : ds.border,
                      borderRadius: 3,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginTop: 6 }}>
              <span>hace {historialSemanas.length} sem.</span>
              <span>esta semana</span>
            </div>
            <div style={{ fontSize: 11, color: ds.inkSecondary, marginTop: 10 }}>Cumples ≥80% de lo pautado esa semana → cuenta como semana en racha.</div>
          </div>
        </details>
      )}

      {/* 3. VOLUMEN DE ENTRENAMIENTO — desplegable, con mini-sparkline */}
      {historialSemanas.length > 0 && (() => {
        const volActual = historialSemanas[historialSemanas.length - 1]?.volumen ?? 0;
        const maxVol = Math.max(1, ...historialSemanas.map((s) => s.volumen));
        const puntosSpark = historialSemanas.map((s, i) => `${(i / (historialSemanas.length - 1 || 1)) * 44 + 1},${25 - (s.volumen / maxVol) * 22}`).join(" ");
        return (
          <details>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "block" }}>
              <div style={{ background: `linear-gradient(135deg, ${ds.accent}14, ${ds.bgElevated})`, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.lg, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: ds.accentSubtle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.accent }}>
                  <Activity size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 2 }}>VOLUMEN</div>
                  <div style={{ fontSize: 14 }}>
                    <b style={{ color: ds.ink, fontWeight: 800 }}>{volActual} series</b> <span style={{ color: ds.inkSecondary }}>esta semana</span>
                  </div>
                </div>
                <svg width="46" height="26" viewBox="0 0 46 26" style={{ flexShrink: 0 }}>
                  <polyline points={puntosSpark} fill="none" stroke={ds.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ color: ds.inkMuted, fontSize: 15, flexShrink: 0 }}>▸</span>
              </div>
            </summary>
            <div style={{ marginTop: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: "16px 18px" }}>
              <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 10 }}>series completadas por semana · últimas {historialSemanas.length} semanas</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                {historialSemanas.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: `${Math.max(6, (s.volumen / maxVol) * 100)}%`, background: ds.accent, borderRadius: 3 }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: ds.inkSecondary, marginTop: 10 }}>Sube el número de series completadas, no solo el peso — para ver si el volumen total de trabajo también progresa.</div>
            </div>
          </details>
        );
      })()}
    </div>
  );
}
