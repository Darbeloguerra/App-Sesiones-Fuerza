import test from "node:test";
import assert from "node:assert/strict";
import { clasificarTarea, valorarTareaFuerza, valorarSesionFuerza, nivelCaida, textoZona } from "./fatigaSesion.js";

const it = (o) => ({ modo: "reps", seriesPautadas: 4, ...o });

test("clasificarTarea: potencia es sin fallo; RIR>=4 sin fallo; RIR<=3 exigente; sin datos null", () => {
  assert.equal(clasificarTarea({ objetivo: "potencia", rirPautado: 2 }).tipo, "sf");
  assert.equal(clasificarTarea({ objetivo: "", rirPautado: 4 }).tipo, "sf");
  assert.equal(clasificarTarea({ objetivo: "", rirPautado: 3 }).tipo, "ex");
  assert.equal(clasificarTarea({ objetivo: "hipertrofia", rirPautado: "" }).tipo, "ex");
  assert.equal(clasificarTarea({ objetivo: "", rirPautado: "" }).tipo, null);
});

test("clasificarTarea: zona del objetivo, o RIR pautado ±1 si queda fuera o no hay objetivo", () => {
  assert.deepEqual(clasificarTarea({ objetivo: "fuerza", rirPautado: 4 }).zona, { min: 3, max: 5 });
  const fuera = clasificarTarea({ objetivo: "fuerza", rirPautado: 0 });
  assert.deepEqual(fuera.zona, { min: 0, max: 1 });
  assert.equal(fuera.fuente, "RIR pautado ±1");
  assert.deepEqual(clasificarTarea({ objetivo: "", rirPautado: 2 }).zona, { min: 1, max: 3 });
  assert.equal(textoZona({ min: 3, max: null }), "RIR ≥ 3");
  assert.equal(textoZona({ min: 3, max: 5 }), "RIR 3–5");
  assert.equal(textoZona({ min: 2, max: 2 }), "RIR 2");
  assert.equal(textoZona(null), "—");
});

test("valorarTareaFuerza: caída por e1RM y cumplimiento", () => {
  const v = valorarTareaFuerza(it({ cargaReal: 80, repsReal: 5, rirReal: 3, ultimaRepsReal: 4, ultimaRirReal: 3, rirPautado: 3, objetivo: "fuerza" }));
  assert.ok(v.caida > 0 && v.caida < 20);
  assert.equal(v.clase.tipo, "ex");
  assert.equal(v.estado, "ok");
  assert.equal(v.rirReal, 3);
});

test("valorarTareaFuerza: RIR real por debajo de la zona = intensidad excedida", () => {
  const v = valorarTareaFuerza(it({ cargaReal: 60, repsReal: 5, rirReal: 4, ultimaRepsReal: 5, ultimaRirReal: 1, rirPautado: 4, objetivo: "potencia" }));
  assert.equal(v.estado, "exc");
});

test("valorarTareaFuerza: sin fallo con caída > 5 % = rendimiento no mantenido", () => {
  const v = valorarTareaFuerza(it({ cargaReal: 60, repsReal: 5, rirReal: 4, ultimaRepsReal: 3, ultimaRirReal: 4, rirPautado: 4, objetivo: "potencia" }));
  assert.ok(v.caida > 5);
  assert.equal(v.estado, "cal");
});

test("valorarTareaFuerza: motivos por los que no hay caída", () => {
  assert.equal(valorarTareaFuerza(it({ cargaReal: 80, repsReal: 5, rirReal: 3, rirPautado: 3 })).motivo, "Sin última serie");
  assert.match(valorarTareaFuerza(it({ seriesPautadas: 2, cargaReal: 80, repsReal: 5, rirReal: 3, ultimaRepsReal: 4, ultimaRirReal: 2, rirPautado: 3 })).motivo, /Menos de 3 series/);
  assert.equal(valorarTareaFuerza(it({ cargaReal: 80, repsReal: 5, rirReal: "", ultimaRepsReal: 4, ultimaRirReal: 2, rirPautado: 3 })).motivo, "Sin RIR");
  assert.match(valorarTareaFuerza(it({ cargaReal: 20, repsReal: 15, rirReal: 3, ultimaRepsReal: 13, ultimaRirReal: 2, rirPautado: 3 })).motivo, /Más de 12/);
});

test("valorarTareaFuerza: no aplica sin carga/reps o fuera de modo reps", () => {
  assert.equal(valorarTareaFuerza(it({ cargaReal: "", repsReal: 5 })), null);
  assert.equal(valorarTareaFuerza({ modo: "tiempo", cargaReal: 10, repsReal: 30 }), null);
  assert.equal(valorarTareaFuerza(null), null);
});

test("valorarSesionFuerza: índice solo con exigentes, ponderado por volumen; sin fallo solo cuenta en volumen", () => {
  const ex = it({ nombre: "Sentadilla", cargaReal: 80, repsReal: 5, rirReal: 3, ultimaRepsReal: 4, ultimaRirReal: 2, rirPautado: 3, objetivo: "fuerza" });
  const sf = it({ nombre: "Salto", cargaReal: 40, repsReal: 3, rirReal: 5, ultimaRepsReal: 3, ultimaRirReal: 4, rirPautado: 5, objetivo: "potencia" });
  const r = valorarSesionFuerza([ex, sf]);
  assert.equal(r.filas.length, 2);
  assert.equal(r.exigentes.length, 1);
  assert.equal(r.validas.length, 1);
  assert.equal(r.indice, r.validas[0].caida);
  assert.equal(r.cobertura, 100);
  assert.ok(r.volumen > r.exigentes[0].volumen);
  assert.equal(r.evaluables, 2);
});

test("valorarSesionFuerza: todo sin fallo no tiene índice; sin datos devuelve null", () => {
  const sf = it({ cargaReal: 40, repsReal: 3, rirReal: 5, ultimaRepsReal: 3, ultimaRirReal: 4, rirPautado: 5, objetivo: "potencia" });
  const r = valorarSesionFuerza([sf]);
  assert.equal(r.indice, null);
  assert.equal(r.nivel, null);
  assert.equal(valorarSesionFuerza([]), null);
  assert.equal(valorarSesionFuerza([{ modo: "reps" }]), null);
});

test("nivelCaida usa los umbrales de FATIGA_CFG (5 y 10)", () => {
  assert.equal(nivelCaida(null), null);
  assert.equal(nivelCaida(2), "baja");
  assert.equal(nivelCaida(5), "moderada");
  assert.equal(nivelCaida(10), "alta");
});
