// Valoración de la sesión en la ficha del jugador (vista del entrenador):
// tarjetas de resumen + tabla por ejercicio. Todo se calcula con
// src/calc/fatigaSesion.js a partir de lo que el jugador registró.
import { ds, dsF, dsR } from "../core/designSystem.jsx";
import { valorarSesionFuerza, valorarTareaFuerza, ESTADOS, textoZona } from "../calc/fatigaSesion.js";

const MIN_SESIONES_REFERENCIA = 2;
const MAX_SESIONES_REFERENCIA = 5;

const f1 = (n) => (n == null ? "—" : Number(n).toFixed(1).replace(".", ","));
const f0 = (n) => (n == null ? "—" : Math.round(Number(n)).toLocaleString("es-ES"));

// Un registro del historial → item de valorarTareaFuerza.
export function itemDeRegistro(t) {
  return {
    nombre: t.name,
    cargaReal: t.cargaReal,
    repsReal: t.repsReal,
    rirReal: t.rirReal,
    ultimaCargaReal: t.ultimaCargaReal,
    ultimaRepsReal: t.ultimaRepsReal,
    ultimaRirReal: t.ultimaRirReal,
    seriesHechas: t.seriesHechas,
    seriesPautadas: t.sets,
    rirPautado: t.rir,
    objetivo: t.objetivo,
    modo: t.modo,
  };
}

export function valoracionDeTarea(t) {
  if (!t || !t.done || t.ignorar || t.bloque !== "Fuerza") return null;
  return valorarTareaFuerza(itemDeRegistro(t));
}

// Valoración de la sesión de un grupo (fecha + sesión) de registros.
export function valoracionDeSesion(tareasDelDia) {
  const items = (tareasDelDia || []).filter((t) => t.done && !t.ignorar && t.bloque === "Fuerza").map(itemDeRegistro);
  return valorarSesionFuerza(items);
}

// Referencia propia: media del índice de las sesiones anteriores (hasta 5)
// de este mismo jugador. Devuelve Map(clave "fecha::sesion" → número|null).
export function referenciasPropias(items, normalizarFecha) {
  const grupos = {};
  items.forEach((it) => {
    const f = normalizarFecha(it.date);
    const clave = `${f}::${it.sesionId || ""}`;
    if (!grupos[clave]) grupos[clave] = { clave, fecha: f, tareas: [] };
    grupos[clave].tareas.push(it);
  });
  const orden = Object.values(grupos).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const previos = [];
  const out = new Map();
  orden.forEach((g) => {
    const ult = previos.slice(-MAX_SESIONES_REFERENCIA);
    out.set(g.clave, ult.length >= MIN_SESIONES_REFERENCIA ? ult.reduce((a, b) => a + b, 0) / ult.length : null);
    const v = valoracionDeSesion(g.tareas);
    if (v && v.indice != null) previos.push(v.indice);
  });
  return out;
}

const TONO = { bien: "success", aviso: "danger", medio: "warning" };
const colorEstado = (estado) => {
  const n = ESTADOS[estado]?.nivel;
  return n ? ds[TONO[n]] : ds.inkMuted;
};
const colorNivel = (nivel) => (nivel === "alta" ? ds.danger : nivel === "moderada" ? ds.warning : ds.success);

export function ChipValoracion({ valoracion }) {
  if (!valoracion) return null;
  const c = colorEstado(valoracion.estado);
  return (
    <span style={{ fontFamily: dsF.mono, fontSize: 10, fontWeight: 700, color: c, border: `1px solid ${c}`, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>
      {ESTADOS[valoracion.estado].etiqueta}
    </span>
  );
}

function Tarjeta({ titulo, valor, color, detalle }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 0, background: ds.surfaceRaised, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{titulo}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: color || ds.ink, fontFamily: dsF.mono }}>{valor}</span>
      {detalle && <span style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: 1.4 }}>{detalle}</span>}
    </div>
  );
}

export default function ResumenFatigaSesion({ tareasDelDia, referencia = null }) {
  const v = valoracionDeSesion(tareasDelDia);
  if (!v) return null;
  const dif = v.indice != null && referencia != null ? v.indice - referencia : null;
  const th = { textAlign: "left", fontFamily: dsF.mono, fontSize: 10, fontWeight: 600, color: ds.inkMuted, textTransform: "uppercase", padding: "4px 8px", whiteSpace: "nowrap" };
  const td = { fontSize: 12, color: ds.inkSecondary, padding: "6px 8px", whiteSpace: "nowrap", borderTop: `1px solid ${ds.border}` };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontFamily: dsF.mono, fontSize: 11, fontWeight: 700, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Valoración de la sesión</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Tarjeta
          titulo="Cumplimiento del plan"
          valor={v.evaluables ? `${v.cumplidas} de ${v.evaluables}` : "—"}
          detalle={v.evaluables ? "ejercicios dentro de lo pautado" : "Sin referencia para valorar"}
          color={v.evaluables && v.cumplidas < v.evaluables ? ds.warning : undefined}
        />
        <Tarjeta
          titulo="Índice de fatiga (solo exigentes)"
          valor={v.indice != null ? `${f1(v.indice)} %` : "—"}
          color={v.indice != null ? colorNivel(v.nivel) : ds.inkMuted}
          detalle={
            v.indice != null
              ? `Caída ${v.nivel} · cobertura ${Math.round(v.cobertura)} % del volumen exigente${v.seriesExigentes ? ` · ${v.efectivas} de ${v.seriesExigentes} series cerca del fallo` : ""}${dif != null ? ` · ${dif >= 0 ? "+" : ""}${f1(dif)} puntos sobre su referencia (${f1(referencia)} %)` : referencia == null ? " · sin referencia propia todavía" : ""}`
              : v.exigentes.length ? "Ninguna tarea exigente cumple los criterios (mín. 3 series y última serie registrada)" : "Sin tareas exigentes: no se calcula caída"
          }
        />
        <Tarjeta titulo="Volumen-carga total" valor={`${f0(v.volumen)} kg`} />
        <Tarjeta titulo="Desviación respecto al plan" valor={v.desviacion != null ? `${v.desviacion > 0 ? "+" : ""}${f1(v.desviacion)} RIR` : "—"} detalle={v.desviacion != null ? (v.desviacion < 0 ? "Más cerca del fallo de lo pautado" : v.desviacion > 0 ? "Más lejos del fallo de lo pautado" : "Según lo pautado") : "Sin RIR pautado y registrado"} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 640, width: "100%" }}>
          <thead>
            <tr>
              {["Ejercicio", "Tipo", "Zona", "RIR real", "e1RM mejor → última", "Caída", "Valoración", "Volumen"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {v.filas.map((o, i) => (
              <tr key={i}>
                <td style={{ ...td, color: ds.ink, fontWeight: 600, whiteSpace: "normal" }}>{o.item.nombre}</td>
                <td style={td}>{o.clase.tipo === "ex" ? "Exigente" : o.clase.tipo === "sf" ? "Sin fallo" : "—"}</td>
                <td style={td}>{textoZona(o.clase.zona) || "—"}</td>
                <td style={td}>{o.rirReal != null ? o.rirReal : "—"}</td>
                <td style={td}>{o.e1rmMejor != null ? `${f1(o.e1rmMejor)} → ${f1(o.e1rmUltima)} kg` : "—"}</td>
                <td style={td} title={o.caida == null ? o.motivo : ""}>{o.caida != null ? `${f1(o.caida)} %` : o.motivo || "—"}</td>
                <td style={td}><ChipValoracion valoracion={o} /></td>
                <td style={td}>{f0(o.volumen)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
