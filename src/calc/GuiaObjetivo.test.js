import test from "node:test";
import assert from "node:assert/strict";
import { OBJETIVOS_SESION, objetivoDeTexto, rtfDePct, guiaPorReps, evaluarTarea, tiraReferencia } from "./guiaObjetivo.js";

const fuerza = objetivoDeTexto("Fuerza");
const hiper = objetivoDeTexto("hipertrofia");

test("objetivoDeTexto: solo coincidencia exacta con la etiqueta", () => {
  assert.equal(fuerza.id, "fuerza");
  assert.equal(hiper.id, "hipertrofia");
  assert.equal(objetivoDeTexto("Fuerza tren inferior"), null);
  assert.equal(objetivoDeTexto(""), null);
});

test("rtfDePct: inverso de la tabla; fuera de tabla -> null", () => {
  assert.equal(rtfDePct(90), 4);
  assert.equal(rtfDePct(80), 8);
  assert.equal(rtfDePct(75), 10);
  assert.equal(rtfDePct(70), null);
  assert.equal(rtfDePct(101), null);
  assert.ok(Math.abs(rtfDePct(88.5) - 4.5) < 1e-9);
});

test("guiaPorReps fuerza: 4 reps con RIR 3-5 -> 77-83 %; 1 rep -> 85-90 %", () => {
  const g4 = guiaPorReps(fuerza, 4);
  assert.deepEqual([g4.pctMin, g4.pctMax, g4.parcial], [77, 83, false]);
  const g1 = guiaPorReps(fuerza, 1);
  assert.deepEqual([g1.pctMin, g1.pctMax], [85, 90]);
});

test("guiaPorReps: RTF fuera de tabla -> parcial o null", () => {
  assert.equal(guiaPorReps(fuerza, 5).parcial, false); // 5+5 = 10 cabe justo
  assert.equal(guiaPorReps(fuerza, 6).parcial, true); // 6+5 = 11 se sale de la tabla
  assert.equal(guiaPorReps(fuerza, 8), null); // 8+3 = 11 no cabe
  assert.equal(guiaPorReps(fuerza, 0), null);
});

test("evaluarTarea: 3x4 al 90 % para fuerza -> bajo (RIR 0)", () => {
  const r = evaluarTarea(fuerza, { reps: 4, pct1rm: 90, modoCarga: "pct1rm" });
  assert.equal(r.estado, "bajo");
  assert.match(r.mensaje, /77–83 %/);
});

test("evaluarTarea: 4 reps al 80 % -> dentro (RIR 4); 4 reps al 70 % -> alto", () => {
  assert.equal(evaluarTarea(fuerza, { reps: 4, pct1rm: 80, modoCarga: "pct1rm" }).estado, "dentro");
  assert.equal(evaluarTarea(fuerza, { reps: 4, pct1rm: 70, modoCarga: "pct1rm" }).estado, "alto");
});

test("evaluarTarea por RIR: RIR 1 -> bajo, RIR 4 -> dentro, RIR 8 -> alto; vacío -> null", () => {
  assert.equal(evaluarTarea(fuerza, { reps: 4, rir: 1, modoCarga: "rir" }).estado, "bajo");
  assert.equal(evaluarTarea(fuerza, { reps: 4, rir: 4, modoCarga: "rir" }).estado, "dentro");
  assert.equal(evaluarTarea(fuerza, { reps: 4, rir: 8, modoCarga: "rir" }).estado, "alto");
  assert.equal(evaluarTarea(fuerza, { reps: 4, rir: "", modoCarga: "rir" }), null);
  assert.equal(evaluarTarea(null, { reps: 4, rir: 4, modoCarga: "rir" }), null);
});

test("hipertrofia: RIR 0 y 5 dentro; 7 alto", () => {
  assert.equal(evaluarTarea(hiper, { reps: 8, rir: 0, modoCarga: "rir" }).estado, "dentro");
  assert.equal(evaluarTarea(hiper, { reps: 8, rir: 5, modoCarga: "rir" }).estado, "dentro");
  assert.equal(evaluarTarea(hiper, { reps: 8, rir: 7, modoCarga: "rir" }).estado, "alto");
});

test("tiraReferencia: filas por reps, la última puede ser parcial", () => {
  const t = tiraReferencia(fuerza, 6);
  assert.equal(t[0].texto, "85–90 %");
  assert.equal(t.find((x) => x.reps === 4).texto, "77–83 %");
  assert.ok(OBJETIVOS_SESION.length === 3);
});

const pot = objetivoDeTexto("Potencia");

test("potencia: RIR >= 3 sin techo; la guía da solo un máximo de %1RM", () => {
  assert.equal(pot.id, "potencia");
  const g = guiaPorReps(pot, 3);
  assert.equal(g.soloTecho, true);
  assert.equal(g.pctMax, 85); // 3 reps + RIR 3 = RTF 6 -> 85 %
  assert.equal(guiaPorReps(pot, 8), null); // 8+3 = 11 fuera de tabla
  assert.equal(tiraReferencia(pot, 3)[2].texto, "≤85 %");
});

test("potencia: RIR 1 -> bajo; RIR 3 y RIR 8 -> dentro (no hay techo)", () => {
  assert.equal(evaluarTarea(pot, { reps: 3, rir: 1, modoCarga: "rir" }).estado, "bajo");
  assert.equal(evaluarTarea(pot, { reps: 3, rir: 3, modoCarga: "rir" }).estado, "dentro");
  assert.equal(evaluarTarea(pot, { reps: 3, rir: 8, modoCarga: "rir" }).estado, "dentro");
  const r = evaluarTarea(pot, { reps: 3, pct1rm: 90, modoCarga: "pct1rm" });
  assert.equal(r.estado, "bajo");
  assert.match(r.mensaje, /hasta 85 %/);
});
