import test from "node:test";
import assert from "node:assert/strict";
import {
  VALORES_TIPICOS_INICIALES, normalizarTipicos, leerTipicos, guardarTipicos,
  zonaPctObjetivo, enZonaPct, enZonaRir, rangoReps, objetivosQueEncajan, derivaDeObjetivo,
  objetivosEnZona, aplicarObjetivo, ligarCampo, objetivoPorId,
} from "./objetivoTarea.js";

const T = (o = {}) => ({ modo: "reps", pct1rm: "", rir: "", cantidad: "", objetivo: "", ...o });

test("zonas de %1RM por objetivo", () => {
  assert.deepEqual(zonaPctObjetivo(objetivoPorId("hipertrofia")), { min: 30, max: 100 });
  assert.deepEqual(zonaPctObjetivo(objetivoPorId("potencia")), { min: 30, max: 70 });
  assert.deepEqual(zonaPctObjetivo(objetivoPorId("potencia"), "pliometrico"), { min: 0, max: 30 });
  assert.equal(zonaPctObjetivo(objetivoPorId("fuerza")).min, 75);
});

test("un 70 % encaja con hipertrofia y potencia, no con fuerza", () => {
  const e = objetivosQueEncajan(T({ pct1rm: "70" }));
  assert.deepEqual(e, ["hipertrofia", "potencia"]);
  assert.equal(enZonaPct(objetivoPorId("fuerza"), 70), false);
});

test("RIR: hipertrofia 0-5, fuerza 3-5, potencia 3 o más", () => {
  assert.equal(enZonaRir(objetivoPorId("hipertrofia"), 5), true);
  assert.equal(enZonaRir(objetivoPorId("fuerza"), 2), false);
  assert.equal(enZonaRir(objetivoPorId("potencia"), 6), true);
});

test("rangoReps sale de la tabla y respeta el tope de potencia", () => {
  const f = rangoReps(objetivoPorId("fuerza"), T({ pct1rm: "80" }));
  assert.deepEqual(f, [3, 5]); // RTF 8 - RIR 5..3
  assert.equal(rangoReps(objetivoPorId("hipertrofia"), T({ pct1rm: "70" })), null); // sin tabla
  assert.equal(rangoReps(objetivoPorId("potencia"), T({ pct1rm: "80" })), null); // fuera de zona
});

test("deriva: fuerza con RIR 1 pasa a hipertrofia", () => {
  const t = T({ objetivo: "fuerza", pct1rm: "85", rir: "1", cantidad: "5" });
  assert.deepEqual(derivaDeObjetivo(t), ["hipertrofia"]);
  assert.equal(derivaDeObjetivo({ ...t, objetivo: "hipertrofia" }), null);
  assert.equal(derivaDeObjetivo(T({ objetivo: "fuerza" })), null); // sin valores no hay deriva
});

test("objetivosEnZona para las notas del desplegable", () => {
  assert.deepEqual(objetivosEnZona("rir", 4, T()), ["fuerza", "hipertrofia", "potencia"]);
  assert.deepEqual(objetivosEnZona("rir", 1, T()), ["hipertrofia"]);
  assert.deepEqual(objetivosEnZona("pct", 85, T()), ["fuerza", "hipertrofia"]);
});

test("elegir objetivo en tarea vacía usa los valores típicos", () => {
  const { tarea, mensaje } = aplicarObjetivo(T(), "fuerza");
  assert.equal(tarea.pct1rm, "80");
  assert.equal(tarea.rir, "4");
  assert.equal(tarea.cantidad, "4"); // RTF 8 - 4
  assert.equal(tarea.objetivo, "fuerza");
  assert.match(mensaje, /valores típicos/);
});

test("elegir objetivo con % ya puesto respeta el % y rellena RIR y reps", () => {
  const { tarea, mensaje } = aplicarObjetivo(T({ pct1rm: "75" }), "fuerza");
  assert.equal(tarea.pct1rm, "75");
  assert.equal(tarea.rir, "4");
  assert.equal(tarea.cantidad, "6"); // RTF 10 - 4
  assert.match(mensaje, /El % no se toca/);
});

test("potencia sin tabla usa las repeticiones típicas; pliométrico limita a 30 %", () => {
  const a = aplicarObjetivo(T(), "potencia").tarea;
  assert.deepEqual([a.pct1rm, a.rir, a.cantidad], ["60", "3", "4"]);
  const b = aplicarObjetivo(T({ tipoMov: "pliometrico" }), "potencia").tarea;
  assert.equal(b.pct1rm, "30");
});

test("los valores típicos editados se usan", () => {
  const tip = { ...VALORES_TIPICOS_INICIALES, fuerza: { pct: 85, rir: 3 } };
  const { tarea } = aplicarObjetivo(T(), "fuerza", tip);
  assert.deepEqual([tarea.pct1rm, tarea.rir, tarea.cantidad], ["85", "3", "3"]); // RTF 6.2 -> 6 - 3
});

test("elegir % con objetivo rellena RIR y reps para ese objetivo", () => {
  const { tarea, mensaje } = ligarCampo(T({ objetivo: "fuerza" }), "pct1rm", "85");
  assert.equal(tarea.rir, "4");
  assert.equal(tarea.cantidad, "2");
  assert.match(mensaje, /Fuerza a 85 %/);
});

test("elegir % con objetivo respeta un RIR que ya está en zona", () => {
  const { tarea } = ligarCampo(T({ objetivo: "fuerza", rir: "3", cantidad: "5", pct1rm: "80" }), "pct1rm", "75");
  assert.equal(tarea.rir, "3");
  assert.equal(tarea.cantidad, "7"); // RTF 10 - 3
});

test("elegir % con objetivo y RIR fuera de zona lo sustituye por el típico", () => {
  const { tarea } = ligarCampo(T({ objetivo: "fuerza", rir: "1", pct1rm: "80", cantidad: "7" }), "pct1rm", "80");
  assert.equal(tarea.rir, "4");
  assert.equal(tarea.cantidad, "4");
});

test("cambiar RIR recalcula repeticiones; cambiar repeticiones recalcula RIR", () => {
  const a = ligarCampo(T({ pct1rm: "80", rir: "4", cantidad: "4" }), "rir", "3");
  assert.equal(a.tarea.cantidad, "5");
  assert.match(a.mensaje, /Repeticiones 4 → 5/);
  const b = ligarCampo(T({ pct1rm: "80", rir: "4", cantidad: "4" }), "cantidad", "6");
  assert.equal(b.tarea.rir, "2");
  assert.match(b.mensaje, /RIR 4 → 2/);
});

test("sin tabla (menos de 75 %) o sin repeticiones no se ligan valores", () => {
  const a = ligarCampo(T({ pct1rm: "70", rir: "3", cantidad: "4" }), "rir", "2");
  assert.equal(a.tarea.cantidad, "4");
  assert.equal(a.mensaje, null);
  const b = ligarCampo(T({ modo: "tiempo", pct1rm: "80", rir: "4", cantidad: "30" }), "rir", "2");
  assert.equal(b.tarea.cantidad, "30");
});

test("normalizar tipicos descarta valores absurdos", () => {
  const n = normalizarTipicos({ fuerza: { pct: 500, rir: "x" }, potencia: { reps: 9, pct: 55 } });
  assert.deepEqual(n.fuerza, VALORES_TIPICOS_INICIALES.fuerza);
  assert.equal(n.potencia.pct, 55);
  assert.equal(n.potencia.reps, VALORES_TIPICOS_INICIALES.potencia.reps);
});

test("leer y guardar valores típicos en un almacén", () => {
  const mem = {}; const a = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.deepEqual(leerTipicos(a), VALORES_TIPICOS_INICIALES);
  guardarTipicos({ ...VALORES_TIPICOS_INICIALES, hipertrofia: { pct: 70, rir: 1 } }, a);
  assert.deepEqual(leerTipicos(a).hipertrofia, { pct: 70, rir: 1 });
  assert.deepEqual(leerTipicos({ getItem: () => "no es json", setItem() {} }), VALORES_TIPICOS_INICIALES);
});
