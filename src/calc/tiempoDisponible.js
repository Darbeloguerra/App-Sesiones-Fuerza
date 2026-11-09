// Tiempo disponible del bloque de Fuerza: cuando las recuperaciones
// recomendadas no caben, propone recortarlas con un mínimo razonable.
// Usa la misma estimación que el resto del diseñador (duracionTarea.js).
// Es una ayuda de diseño: no cambia nada hasta que el entrenador la aplica.
import { descansoEfectivoSeg, estimarBloqueTareasSeg } from "./duracionTarea.js";

export const DESCANSO_MINIMO_AJUSTE = 60; // s: no se baja de aquí (si ya era menor, se deja como estaba)
const PASO_REDONDEO = 15; // s

const conDescansos = (tareas, descansos) =>
  tareas.map((t) => (descansos[t.key] != null ? { ...t, descanso: String(descansos[t.key]) } : t));

// Aplica un mapa { key: segundos } a la lista de tareas.
export const aplicarDescansos = conDescansos;

// Devuelve null si el bloque ya cabe en `objetivoSeg`. Si no cabe:
// { descansos: { key: seg }, totalSeg, alcanza } con la reducción más suave
// (factor común sobre todas las recuperaciones) que lo consigue; si ni con el
// mínimo llega, `alcanza` es false y `totalSeg` es el mejor resultado posible.
export function ajustarRecuperaciones(tareas, circuitos, objetivoSeg, bloque = "Fuerza") {
  const actual = estimarBloqueTareasSeg(tareas, circuitos, bloque);
  if (!objetivoSeg || actual <= objetivoSeg) return null;
  const candidatas = tareas.filter((t) => (Number(t.series) || 0) > 1);
  const mapa = (k) => {
    const out = {};
    candidatas.forEach((t) => {
      const orig = descansoEfectivoSeg(t, bloque);
      const nuevo = Math.min(orig, Math.max(DESCANSO_MINIMO_AJUSTE, Math.round((orig * k) / PASO_REDONDEO) * PASO_REDONDEO));
      if (nuevo !== orig) out[t.key] = nuevo;
    });
    return out;
  };
  let ultimo = { descansos: {}, totalSeg: actual, alcanza: false };
  for (let k = 0.95; k >= 0.39; k -= 0.05) {
    const descansos = mapa(k);
    const totalSeg = estimarBloqueTareasSeg(conDescansos(tareas, descansos), circuitos, bloque);
    ultimo = { descansos, totalSeg, alcanza: totalSeg <= objetivoSeg };
    if (ultimo.alcanza) return ultimo;
  }
  return ultimo;
}

export function formatearMinutosDiseno(seg) {
  return `${(Math.max(0, seg) / 60).toFixed(1).replace(".", ",")} min`;
}
