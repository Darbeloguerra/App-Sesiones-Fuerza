import test from "node:test";
import assert from "node:assert/strict";
import { claveCelda, agruparPendientes, asignarCeldas, filasEfectivas, anadirFilas, resumenPublicacion, cumplimientoDeEstados } from "./planJugadores.js";

test("agrupa por sesión y fecha: una sesión con varios jugadores", () => {
  const pend = {
    [claveCelda("a", "2026-11-16")]: "s1",
    [claveCelda("b", "2026-11-16")]: "s1",
    [claveCelda("c", "2026-11-16")]: "s2",
    [claveCelda("a", "2026-11-18")]: "s1",
  };
  const g = agruparPendientes(pend);
  assert.equal(g.length, 3);
  assert.deepEqual(g[0], { fecha: "2026-11-16", sesionId: "s1", jugadores: ["a", "b"] });
  assert.deepEqual(g[1], { fecha: "2026-11-16", sesionId: "s2", jugadores: ["c"] });
  assert.equal(g[2].fecha, "2026-11-18");
});

test("los ids de jugador pueden contener guiones y números", () => {
  const g = agruparPendientes({ [claveCelda("j-12ab", "2026-11-16")]: "s-9" });
  assert.deepEqual(g, [{ fecha: "2026-11-16", sesionId: "s-9", jugadores: ["j-12ab"] }]);
});

test("pendientes vacíos o sin sesión no generan elementos", () => {
  assert.deepEqual(agruparPendientes({}), []);
  assert.deepEqual(agruparPendientes(null), []);
  assert.deepEqual(agruparPendientes({ "a::2026-11-16": null }), []);
});

test("asignarCeldas respeta las celdas no permitidas y puede quitar", () => {
  const puede = (j, f) => !(j === "b" && f === "2026-11-16");
  const p = asignarCeldas({}, ["a", "b"], ["2026-11-16", "2026-11-17"], "s1", puede);
  assert.deepEqual(Object.keys(p).sort(), ["a::2026-11-16", "a::2026-11-17", "b::2026-11-17"]);
  const q = asignarCeldas(p, ["a"], ["2026-11-16"], null);
  assert.equal(q["a::2026-11-16"], undefined);
  assert.equal(p["a::2026-11-16"], "s1"); // no muta el original
});

test("filas: la selección manual solo vale en su ámbito", () => {
  assert.deepEqual(filasEfectivas({ scopeId: "equipo", ids: ["x"] }, "equipo", ["a", "b"]), ["x"]);
  assert.deepEqual(filasEfectivas({ scopeId: "equipo", ids: ["x"] }, "g:1", ["a", "b"]), ["a", "b"]);
  assert.deepEqual(filasEfectivas(null, "equipo", ["a"]), ["a"]);
});

test("anadirFilas no duplica y conserva el orden", () => {
  assert.deepEqual(anadirFilas(["a", "b"], ["b", "c", "c", "d"]), ["a", "b", "c", "d"]);
});

test("resumen de publicación cuenta celdas y sesiones agrupadas", () => {
  const r = resumenPublicacion({ "a::2026-11-16": "s1", "b::2026-11-16": "s1", "a::2026-11-17": "s1" });
  assert.deepEqual(r, { celdas: 3, sesiones: 2 });
});

test("cumplimiento solo cuenta sesiones ya pasadas", () => {
  assert.equal(cumplimientoDeEstados(["hecho", "falta", "futuro", "borrador", "hoy"]), 50);
  assert.equal(cumplimientoDeEstados(["futuro", "hoy"]), null);
  assert.equal(cumplimientoDeEstados(["hecho", "parcial"]), 50);
});
