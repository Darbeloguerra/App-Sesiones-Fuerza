import test from "node:test";
import assert from "node:assert/strict";
import {
  parseResistenciaData,
  pesoTareaAdherencia,
  tareaEsParaJugador,
  crearFraccionCumplida,
  tareasHechasPorJugadorFecha,
  calcularCumplimientoPauta,
} from "./adherencia.js";

test("parseResistenciaData: JSON válido, inválido y vacío", () => {
  assert.deepEqual(parseResistenciaData('{"tipo":"continuo"}'), { tipo: "continuo" });
  assert.equal(parseResistenciaData("no es json"), null);
  assert.equal(parseResistenciaData(null), null);
  assert.equal(parseResistenciaData(""), null);
});

test("pesoTareaAdherencia: CMJ no pesa nada", () => {
  assert.equal(pesoTareaAdherencia({ bloque_sesion: "CMJ" }), 0);
});

test("pesoTareaAdherencia: Fuerza con datos válidos usa la duración estimada", () => {
  const t = { bloque_sesion: "Fuerza", modo: "reps", series: 3, cantidad: 10, rir: 2 };
  const peso = pesoTareaAdherencia(t);
  assert.ok(peso > 0);
});

test("pesoTareaAdherencia: sin datos suficientes cae al peso por defecto del bloque", () => {
  assert.equal(pesoTareaAdherencia({ bloque_sesion: "Core" }), 300);
  assert.equal(pesoTareaAdherencia({ bloque_sesion: "Preventivo" }), 180);
  assert.equal(pesoTareaAdherencia({ bloque_sesion: "Movilidad" }), 300);
});

test("pesoTareaAdherencia: Resistencia usa resistencia_data (JSON)", () => {
  const t = { bloque_sesion: "Resistencia", resistencia_data: JSON.stringify({ tipo: "continuo", series: 2, tiempo: 5, tiempoUnidad: "min", recuperacion: 1, recuperacionUnidad: "min" }) };
  assert.equal(pesoTareaAdherencia(t), 2 * 300 + 1 * 60);
});

test("tareaEsParaJugador: sin para_jugadores es para todos", () => {
  assert.equal(tareaEsParaJugador({}, "j1"), true);
  assert.equal(tareaEsParaJugador({ para_jugadores: "" }, "j1"), true);
});

test("tareaEsParaJugador: con lista, solo para los incluidos", () => {
  const t = { para_jugadores: JSON.stringify(["j1", "j2"]) };
  assert.equal(tareaEsParaJugador(t, "j1"), true);
  assert.equal(tareaEsParaJugador(t, "j3"), false);
});

test("crearFraccionCumplida: 0 si no hay nada hecho, 1 si todo pesado está hecho", () => {
  const tareas = [
    { id: "t1", sesion_id: "s1", fecha: "2026-08-10", bloque_sesion: "Fuerza", modo: "reps", series: 3, cantidad: 10, rir: 2 },
    { id: "t2", sesion_id: "s1", fecha: "2026-08-10", bloque_sesion: "Core" },
  ];
  const fraccionCumplida = crearFraccionCumplida(tareas);
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(), null), 0);
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(["t1", "t2"]), null), 1);
});

test("crearFraccionCumplida: sin tareas con peso, cualquier cosa hecha cuenta como cumplida", () => {
  const tareas = [{ id: "t1", sesion_id: "s1", fecha: "2026-08-10", bloque_sesion: "CMJ" }];
  const fraccionCumplida = crearFraccionCumplida(tareas);
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(), null), 0);
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(["t1"]), null), 1);
});

test("crearFraccionCumplida: respeta para_jugadores al filtrar lo relevante", () => {
  const tareas = [
    { id: "t1", sesion_id: "s1", fecha: "2026-08-10", bloque_sesion: "Fuerza", modo: "reps", series: 3, cantidad: 10, rir: 2, para_jugadores: JSON.stringify(["jB"]) },
  ];
  const fraccionCumplida = crearFraccionCumplida(tareas);
  // La tarea es solo para jB: para jA no hay nada relevante -> 0 relevantes, nada hecho -> 0.
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(), "jA"), 0);
  assert.equal(fraccionCumplida("s1", "2026-08-10", new Set(["t1"]), "jB"), 1);
});

test("tareasHechasPorJugadorFecha: agrupa por jugador::fecha, ignora lo no hecho", () => {
  const items = [
    { done: true, tareaId: "t1", jugadorId: "j1", date: "2026-08-10" },
    { done: false, tareaId: "t2", jugadorId: "j1", date: "2026-08-10" },
    { done: true, tareaId: null, jugadorId: "j1", date: "2026-08-10" },
  ];
  const mapa = tareasHechasPorJugadorFecha(items);
  assert.equal(mapa.size, 1);
  assert.deepEqual(mapa.get("j1::2026-08-10"), new Set(["t1"]));
});

test("calcularCumplimientoPauta: series, reps y RIR se calculan solo donde hay dato", () => {
  const items = [
    { done: true, date: "2026-08-10", sets: 3, seriesHechas: 2, unidad: "reps", reps: 10, repsReal: 10, rir: 2, rirReal: 1 },
    { done: true, date: "2026-08-11", sets: 3, seriesHechas: "", unidad: "reps", reps: 10, repsReal: 8, rir: "", rirReal: "" },
    { done: false, date: "2026-08-12", sets: 3, seriesHechas: 3 },
    { done: true, date: "2026-08-10", bloque: "CMJ", sets: 1 },
  ];
  const r = calcularCumplimientoPauta(items, "2026-08-01", "2026-08-31");
  assert.equal(r.tareas, 2); // excluye CMJ y lo no hecho
  assert.deepEqual(r.series, { hechas: 2, pautadas: 3, pct: 67 });
  assert.deepEqual(r.reps, { ok: 1, total: 2, pct: 50 });
  assert.deepEqual(r.rirDif, { media: -1, n: 1 });
});
