import test from "node:test";
import assert from "node:assert/strict";
import { TABLA_PCT_1RM_POR_RTF, REPS_MAX_RIR_FIABLE, pct1RMporRTF, e1rmDeValores } from "./e1rm.js";

test("pct1RMporRTF: valores exactos de tabla y punto medio interpolado", () => {
  assert.equal(pct1RMporRTF(1), TABLA_PCT_1RM_POR_RTF[1]);
  assert.equal(pct1RMporRTF(10), TABLA_PCT_1RM_POR_RTF[10]);
  assert.equal(pct1RMporRTF(2.5), (TABLA_PCT_1RM_POR_RTF[2] + TABLA_PCT_1RM_POR_RTF[3]) / 2);
});

test("pct1RMporRTF: RTF fuera de rango se acota a [1, 10]", () => {
  assert.equal(pct1RMporRTF(0), TABLA_PCT_1RM_POR_RTF[1]);
  assert.equal(pct1RMporRTF(15), TABLA_PCT_1RM_POR_RTF[10]);
});

test("e1rmDeValores: carga dividida por el %1RM del RTF", () => {
  // RTF = 5+2 = 7 -> %1RM = 0.83 -> e1RM = 100 / 0.83
  const e1rm = e1rmDeValores(100, 5, 2);
  assert.equal(Math.round(e1rm * 100) / 100, Math.round((100 / 0.83) * 100) / 100);
});

test("e1rmDeValores: sin carga o sin RIR informado -> null", () => {
  assert.equal(e1rmDeValores(0, 5, 2), null);
  assert.equal(e1rmDeValores(100, 5, ""), null); // RIR vacío no es "0", es sin dato
  assert.equal(e1rmDeValores(100, 5, null), null);
});

test("e1rmDeValores: reps no numéricas (NaN real, no '') también dan null", () => {
  assert.equal(e1rmDeValores(100, "abc", 2), null);
});

test(`e1rmDeValores: más de ${REPS_MAX_RIR_FIABLE} reps no es fiable, aunque haya RIR`, () => {
  assert.equal(e1rmDeValores(100, REPS_MAX_RIR_FIABLE + 1, 2), null);
  assert.ok(e1rmDeValores(100, REPS_MAX_RIR_FIABLE, 2) != null);
});

test("e1rmDeValores: RIR 0 (al fallo) sí es un dato válido, distinto de RIR vacío", () => {
  assert.ok(e1rmDeValores(100, 5, 0) != null);
});
