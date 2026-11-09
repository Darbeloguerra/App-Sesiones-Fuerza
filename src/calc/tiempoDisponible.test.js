import test from "node:test";
import assert from "node:assert/strict";
import { ajustarRecuperaciones, aplicarDescansos, formatearMinutosDiseno, DESCANSO_MINIMO_AJUSTE } from "./tiempoDisponible.js";
import { estimarBloqueTareasSeg } from "./duracionTarea.js";

const tarea = (key, series, cantidad, pct, extra = {}) => ({ key, ejercicioId: `e${key}`, modo: "reps", series: String(series), cantidad: String(cantidad), modoCarga: "pct1rm", pct1rm: String(pct), rir: "", descanso: "", ...extra });
// Sentadilla 4x4 al 80 % (180 s) + press 3x7 al 75 % (150 s): 17,5 min.
const A = tarea(1, 4, 4, 80);
const B = tarea(2, 3, 7, 75);

test("si ya cabe, no hay ajuste", () => {
  assert.equal(ajustarRecuperaciones([A, B], [], 20 * 60), null);
  assert.equal(ajustarRecuperaciones([A, B], [], 0), null);
});

test("estimación de partida: 17,5 min", () => {
  assert.equal(Math.round(estimarBloqueTareasSeg([A, B], [], "Fuerza")), 1048);
  assert.equal(formatearMinutosDiseno(1048), "17,5 min");
});

test("recorta recuperaciones lo justo para llegar a 15 min", () => {
  const r = ajustarRecuperaciones([A, B], [], 15 * 60);
  assert.equal(r.alcanza, true);
  assert.ok(r.totalSeg <= 900);
  assert.deepEqual(r.descansos, { 1: 150, 2: 120 });
  assert.equal(Math.round(r.totalSeg), 898);
});

test("nunca baja del mínimo ni sube una recuperación que ya era menor", () => {
  const corta = tarea(3, 4, 6, 70, { descanso: "45" });
  const r = ajustarRecuperaciones([A, B, corta], [], 5 * 60);
  assert.equal(r.alcanza, false);
  Object.values(r.descansos).forEach((s) => assert.ok(s >= DESCANSO_MINIMO_AJUSTE));
  assert.equal(r.descansos[3], undefined);
});

test("aplicarDescansos escribe la recuperación como texto y no toca el resto", () => {
  const out = aplicarDescansos([A, B], { 1: 150 });
  assert.equal(out[0].descanso, "150");
  assert.equal(out[1], B);
});

test("sin tareas con más de una serie no hay nada que recortar", () => {
  const sola = tarea(4, 1, 5, 80);
  const r = ajustarRecuperaciones([sola], [], 10);
  assert.deepEqual(r.descansos, {});
  assert.equal(r.alcanza, false);
});

test("formatearMinutosDiseno usa coma decimal", () => {
  assert.equal(formatearMinutosDiseno(1050), "17,5 min");
  assert.equal(formatearMinutosDiseno(900), "15,0 min");
});
