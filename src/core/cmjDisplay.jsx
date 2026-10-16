import { ds } from "./designSystem.jsx";

// Metadata de presentación del CMJ (colores/etiquetas) — separada del motor
// de cálculo puro (src/calc/cmj.js) porque depende del sistema de diseño
// (`ds`). Usada por la pantalla de Control de fatiga, el Dashboard, la
// pantalla del jugador, el Diseñador de sesiones y la Ficha de jugador.
export const CMJ_STATUS_META = {
  red: { label: "Intervenir", color: ds.danger, bg: `${ds.danger}22` },
  amber: { label: "Vigilar", color: ds.warning, bg: `${ds.warning}22` },
  green: { label: "Normal", color: ds.success, bg: `${ds.success}1E` },
  gray: { label: "Sin datos", color: ds.inkMuted, bg: `${ds.inkMuted}22` },
};
export const CMJ_TAG_META = {
  inicio: { label: "Inicio microciclo", color: ds.chart2 },
  md2: { label: "MD-2", color: ds.accent },
  md1: { label: "MD+1", color: ds.chart1 },
};
// Colores de línea por métrica en las gráficas — se usan los tokens de
// gráfico que ya tiene la app (ds.accent/ds.chart1/ds.chart2), no colores
// nuevos, para que encaje con el resto del sistema de diseño.
export const CMJ_METRIC_CHART_COLOR = { altura: ds.accent, potenciaRel: ds.chart2, fuerzaRel: ds.chart3, velocidad: ds.inkMuted };
