import test from "node:test";
import assert from "node:assert/strict";
import {
  aSegundosDiseno,
  descansoRecomendadoSeg,
  descansoEfectivoSeg,
  trabajoSerieSeg,
  estimarTareaSeg,
  estimarParSeg,
  estimarResistenciaSeg,
  estimarCircuitoSeg,
  emparejarTareasAlternadas,
  estimarBloqueTareasSeg,
  sugerirAlternancias,
  formatearDuracionDiseno,
} from "./duracionTarea.js";

test("aSegundosDiseno: convierte minutos a segundos, deja segundos igual", () => {
  assert.equal(aSegundosDiseno(2, "min"), 120);
  assert.equal(aSegundosDiseno(2, "minutos"), 120);
  assert.equal(aSegundosDiseno(45, "seg"), 45);
  assert.equal(aSegundosDiseno(0, "min"), 0);
  assert.equal(aSegundosDiseno(-5, "min"), 0);
  assert.equal(aSegundosDiseno(null, "min"), 0);
});

test("descansoRecomendadoSeg: bloques que no son Fuerza descansan 45s fijos", () => {
  assert.equal(descansoRecomendadoSeg({}, "Core"), 45);
  assert.equal(descansoRecomendadoSeg({}, "Preventivo"), 45);
});

test("descansoRecomendadoSeg: Fuerza con modo distinto de reps descansa 60s", () => {
  assert.equal(descansoRecomendadoSeg({ modo: "tiempo" }, "Fuerza"), 60);
});

test("descansoRecomendadoSeg: Fuerza por %1RM escala con la intensidad", () => {
  assert.equal(descansoRecomendadoSeg({ modoCarga: "pct1rm", pct1rm: 92 }, "Fuerza"), 240);
  assert.equal(descansoRecomendadoSeg({ modoCarga: "pct1rm", pct1rm: 82 }, "Fuerza"), 180);
  assert.equal(descansoRecomendadoSeg({ modoCarga: "pct1rm", pct1rm: 50 }, "Fuerza"), 90);
  assert.equal(descansoRecomendadoSeg({ modoCarga: "pct1rm", pct1rm: null }, "Fuerza"), 120);
});

test("descansoRecomendadoSeg: Fuerza por RIR escala con la cercanía al fallo", () => {
  assert.equal(descansoRecomendadoSeg({ rir: 0 }, "Fuerza"), 180);
  assert.equal(descansoRecomendadoSeg({ rir: 2 }, "Fuerza"), 150);
  assert.equal(descansoRecomendadoSeg({ rir: 3 }, "Fuerza"), 120);
  assert.equal(descansoRecomendadoSeg({ rir: 5 }, "Fuerza"), 90);
  assert.equal(descansoRecomendadoSeg({ rir: "" }, "Fuerza"), 120);
});

test("descansoEfectivoSeg: usa el descanso escrito en la tarea si lo hay", () => {
  assert.equal(descansoEfectivoSeg({ descanso: 75 }, "Fuerza"), 75);
  assert.equal(descansoEfectivoSeg({ descanso: 0, rir: 0 }, "Fuerza"), 180);
});

test("trabajoSerieSeg: según el modo, y duplica si es unilateral", () => {
  assert.equal(trabajoSerieSeg({ modo: "tiempo", cantidad: 40 }), 40);
  assert.equal(trabajoSerieSeg({ modo: "minutos", cantidad: 1 }), 60);
  assert.equal(trabajoSerieSeg({ modo: "metros", cantidad: 100 }), 30);
  assert.equal(trabajoSerieSeg({ modo: "reps", cantidad: 10 }), 40); // 10 * SEG_POR_REP(4)
  assert.equal(trabajoSerieSeg({ modo: "reps", cantidad: 10, lateralidad: "unilateral" }), 80);
  assert.equal(trabajoSerieSeg({ modo: "reps", cantidad: 0 }), 0);
});

test("estimarTareaSeg: series * trabajo + descansos entre series + transición", () => {
  // 3 series de 10 reps (40s trabajo cada una) con RIR 2 (150s descanso) -> 3*40 + 2*150 + 30
  const seg = estimarTareaSeg({ modo: "reps", cantidad: 10, series: 3, rir: 2 }, "Fuerza");
  assert.equal(seg, 3 * 40 + 2 * 150 + 30);
});

test("estimarTareaSeg: sin cantidad válida, devuelve 0 (no hay transición de vacío)", () => {
  assert.equal(estimarTareaSeg({ modo: "reps", cantidad: 0 }, "Fuerza"), 0);
});

test("estimarParSeg: si falta trabajo en alguno, cae a la suma de estimarTareaSeg", () => {
  const a = { modo: "reps", cantidad: 0 };
  const b = { modo: "reps", cantidad: 10, series: 2, rir: 2 };
  assert.equal(estimarParSeg(a, b, "Fuerza"), estimarTareaSeg(a, "Fuerza") + estimarTareaSeg(b, "Fuerza"));
});

test("estimarResistenciaSeg: continuo, hiit y rsa", () => {
  assert.equal(estimarResistenciaSeg({ tipoResistenciaCardio: "continuo", series: 2, tiempo: 5, tiempoUnidad: "min", recuperacion: 1, recuperacionUnidad: "min" }), 2 * 300 + 1 * 60);
  assert.equal(estimarResistenciaSeg({ tipoResistenciaCardio: "hiit", bloques: 1, intervalos: 4, tiempo: 30, tiempoUnidad: "seg", recuperacion: 15, recuperacionUnidad: "seg" }), 4 * 30 + 3 * 15);
  assert.equal(estimarResistenciaSeg({ tipoResistenciaCardio: "rsa", bloques: 1, series: 6, duracion: 10, recuperacion: 20, recuperacionUnidad: "seg" }), 6 * 10 + 5 * 20);
  assert.equal(estimarResistenciaSeg({ tipoResistenciaCardio: "" }), 0);
});

test("estimarCircuitoSeg: rondas * (trabajo + transición por tarea) + pausas entre rondas", () => {
  const c = { rondas: 3, tareas: [{ modo: "reps", cantidad: 10 }, { modo: "reps", cantidad: 10 }] };
  // porRonda = (40+15)+(40+15) = 110; total = 3*110 + 2*60 + 30
  assert.equal(estimarCircuitoSeg(c, "Fuerza"), 3 * 110 + 2 * 60 + 30);
});

test("emparejarTareasAlternadas: agrupa por alternaCon y deja el resto como sueltas", () => {
  const a = { key: "a", ejercicioId: "ex1", alternaCon: "ex2" };
  const b = { key: "b", ejercicioId: "ex2", alternaCon: "ex1" };
  const c = { key: "c", ejercicioId: "ex3" };
  const { pares, sueltas } = emparejarTareasAlternadas([a, b, c]);
  assert.equal(pares.length, 1);
  assert.deepEqual(pares[0], [a, b]);
  assert.deepEqual(sueltas, [c]);
});

test("estimarBloqueTareasSeg: suma pares + sueltas + circuitos", () => {
  const sueltaUnica = { key: "s", modo: "reps", cantidad: 10, series: 2, rir: 2 };
  const total = estimarBloqueTareasSeg([sueltaUnica], [], "Fuerza");
  assert.equal(total, estimarTareaSeg(sueltaUnica, "Fuerza"));
});

test("sugerirAlternancias: no sugiere nada si las zonas coinciden o el descanso es corto", () => {
  const a = { key: "a", modo: "reps", cantidad: 10, series: 3, rir: 0 };
  const b = { key: "b", modo: "reps", cantidad: 10, series: 3, rir: 0 };
  const mismaZona = sugerirAlternancias([a, b], "Fuerza", () => "pierna");
  assert.deepEqual(mismaZona, []);
});

test("formatearDuracionDiseno: minutos y horas+minutos, 0 es un guion", () => {
  assert.equal(formatearDuracionDiseno(0), "—");
  assert.equal(formatearDuracionDiseno(600), "10 min");
  assert.equal(formatearDuracionDiseno(3660), "1 h 01 min");
});
