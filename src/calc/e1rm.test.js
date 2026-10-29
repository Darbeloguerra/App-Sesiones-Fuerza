import test from "node:test";
import assert from "node:assert/strict";
import {
  TABLA_PCT_1RM_POR_RTF,
  REPS_MAX_RIR_FIABLE,
  pct1RMporRTF,
  e1rmDeValores,
  e1rmDeItem,
  medianaNum,
  materialEfectivo,
  claveDisenoTarea,
  calcularRecordsCargaJugador,
  calcularCambiosE1rm,
  cambiosRobustosE1rm,
  evaluarRendimientoEquipo,
  calcularCargaFuerzaPorMicro,
  calcularCargaSugerida,
  fatigaTarea,
  interpretarFatiga,
} from "./e1rm.js";

test("pct1RMporRTF: valores exactos de tabla y punto medio interpolado", () => {
  assert.equal(pct1RMporRTF(1), TABLA_PCT_1RM_POR_RTF[1]);
  assert.equal(pct1RMporRTF(10), TABLA_PCT_1RM_POR_RTF[10]);
  assert.equal(pct1RMporRTF(2.5), (TABLA_PCT_1RM_POR_RTF[2] + TABLA_PCT_1RM_POR_RTF[3]) / 2);
});

test("pct1RMporRTF: RTF fuera de rango se acota a [1, 10] (comportamiento original, sin ampliar)", () => {
  assert.equal(pct1RMporRTF(0), TABLA_PCT_1RM_POR_RTF[1]);
  assert.equal(pct1RMporRTF(15), TABLA_PCT_1RM_POR_RTF[10]);
  assert.equal(pct1RMporRTF(20), 0.75);
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

test("e1rmDeItem: delega en e1rmDeValores leyendo los campos *Real del registro", () => {
  const it = { cargaReal: 100, repsReal: 5, rirReal: 2 };
  assert.equal(e1rmDeItem(it), e1rmDeValores(100, 5, 2));
  assert.equal(e1rmDeItem({ cargaReal: 0, repsReal: 5, rirReal: 2 }), null);
});

test("medianaNum: par e impar, vacío es null", () => {
  assert.equal(medianaNum([]), null);
  assert.equal(medianaNum([5]), 5);
  assert.equal(medianaNum([1, 3, 2]), 2);
  assert.equal(medianaNum([1, 2, 3, 4]), 2.5);
});

test("materialEfectivo: un solo equipo real se usa tal cual; sin materiales, 'std'", () => {
  assert.equal(materialEfectivo({ materiales: ["Barra"] }), "Barra");
  assert.equal(materialEfectivo({ materiales: [] }), "std");
});

test("materialEfectivo: un accesorio sin carga no cuenta como ambiguo, pero se devuelve tal cual si es el único", () => {
  // "banco" está en ACCESORIOS_SIN_CARGA: no dispara la pregunta de "¿qué
  // equipo usaste?", pero sigue siendo el material que hay, no "std".
  assert.equal(materialEfectivo({ materiales: ["banco"] }), "banco");
});

test("materialEfectivo: dos equipos ambiguos a la vez -> se resuelve con subtipoCorporal si lo hay", () => {
  const it = { materiales: ["Barra", "Multipower"], subtipoCorporal: "Multipower" };
  assert.equal(materialEfectivo(it), "Multipower");
  assert.equal(materialEfectivo({ materiales: ["Barra", "Multipower"] }), "Barra"); // sin subtipo: el primero
});

test("claveDisenoTarea: combina nombre/equipo/lateralidad/objetivo en una clave estable", () => {
  assert.equal(claveDisenoTarea("Sentadilla", "Barra", false, 8, 2), "sentadilla::Barra::bi::8::2");
  assert.equal(claveDisenoTarea("Sentadilla", null, true, null, null), "sentadilla::std::uni::::");
});

test("calcularRecordsCargaJugador: toma el e1RM más alto por ejercicio+equipo y el % sobre el anterior", () => {
  const items = [
    { id: "a", done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-01" },
    { id: "b", done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 110, repsReal: 5, rirReal: 2, date: "2026-01-08" },
  ];
  const records = calcularRecordsCargaJugador(items);
  assert.equal(records.length, 1);
  assert.equal(records[0].nombre, "Sentadilla");
  assert.equal(records[0].fecha, "2026-01-08");
  assert.ok(records[0].pctSobreAnterior > 0);
});

test("calcularCambiosE1rm: compara el último valor dentro de la ventana contra la media de antes", () => {
  const items = [
    { id: "a", done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-01" },
    { id: "b", done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 120, repsReal: 5, rirReal: 2, date: "2026-01-15" },
  ];
  const cambios = calcularCambiosE1rm(items, "2026-01-10", "2026-01-20");
  assert.equal(cambios.length, 1);
  assert.equal(cambios[0].conCarga, true);
  assert.ok(cambios[0].pct > 0);
});

test("calcularCambiosE1rm: ejercicio sin carga compara en reps+RIR (RTF), no en kg", () => {
  const items = [
    { id: "a", done: true, bloque: "Fuerza", name: "Dominadas", materiales: [], cargaReal: "", repsReal: 8, rirReal: 2, date: "2026-01-01" },
    { id: "b", done: true, bloque: "Fuerza", name: "Dominadas", materiales: [], cargaReal: "", repsReal: 10, rirReal: 2, date: "2026-01-15" },
  ];
  const cambios = calcularCambiosE1rm(items, "2026-01-10", "2026-01-20");
  assert.equal(cambios.length, 1);
  assert.equal(cambios[0].conCarga, false);
  assert.equal(cambios[0].actual, 12); // reps + rir
});

test("cambiosRobustosE1rm: necesita al menos minPrevios series antes de la ventana", () => {
  const unaSola = [{ id: "a", done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-01" }];
  assert.deepEqual(cambiosRobustosE1rm(unaSola, "2026-02-01", "2026-02-10"), []);
});

test("evaluarRendimientoEquipo: un cambio sistémico (muchos jugadores a la vez) se excluye y se marca", () => {
  const jugadores = [{ id: "j1" }, { id: "j2" }, { id: "j3" }, { id: "j4" }, { id: "j5" }];
  const itemsPorJugador = new Map();
  jugadores.forEach((j) => {
    itemsPorJugador.set(j.id, [
      { id: `${j.id}-a`, done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-01" },
      { id: `${j.id}-a2`, done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-08" },
      { id: `${j.id}-b`, done: true, bloque: "Fuerza", name: "Sentadilla", materiales: ["Barra"], cargaReal: 60, repsReal: 5, rirReal: 2, date: "2026-02-05" },
    ]);
  });
  const { sistemicos, resultados } = evaluarRendimientoEquipo(itemsPorJugador, jugadores, "2026-02-01", "2026-02-10");
  assert.equal(sistemicos.length, 1);
  assert.equal(resultados.size, 0); // excluido por sistémico: nadie queda con alerta individual
});

test("calcularCargaFuerzaPorMicro: series por microciclo y nivel relativo frente a los anteriores", () => {
  const items = [
    { id: "a", done: true, bloque: "Fuerza", esResistencia: false, esElastica: false, name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-02", seriesHechas: 3, sets: 3 },
    { id: "b", done: true, bloque: "Fuerza", esResistencia: false, esElastica: false, name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-09", seriesHechas: 3, sets: 3 },
    { id: "c", done: true, bloque: "Fuerza", esResistencia: false, esElastica: false, name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-16", seriesHechas: 3, sets: 3 },
    { id: "d", done: true, bloque: "Fuerza", esResistencia: false, esElastica: false, name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-23", seriesHechas: 3, sets: 3 },
    { id: "e", done: true, bloque: "Fuerza", esResistencia: false, esElastica: false, name: "Sentadilla", materiales: ["Barra"], cargaReal: 100, repsReal: 5, rirReal: 2, date: "2026-01-30", seriesHechas: 9, sets: 9 },
  ];
  const ventanas = [
    { id: "m1", numero: 1, desde: "2026-01-01", hasta: "2026-01-07" },
    { id: "m2", numero: 2, desde: "2026-01-08", hasta: "2026-01-14" },
    { id: "m3", numero: 3, desde: "2026-01-15", hasta: "2026-01-21" },
    { id: "m4", numero: 4, desde: "2026-01-22", hasta: "2026-01-28" },
    { id: "m5", numero: 5, desde: "2026-01-29", hasta: "2026-02-04" },
  ];
  const cargas = calcularCargaFuerzaPorMicro(items, ventanas);
  assert.equal(cargas.length, 5);
  assert.equal(cargas[0].series, 3);
  assert.equal(cargas[4].series, 9);
  assert.equal(cargas[4].nivel, "alta"); // 9 series frente a una media de 3 en los 4 microciclos anteriores
});

test("calcularCargaSugerida: traslada una marca previa a un diseño de hoy distinto", () => {
  // Marca previa: 100 kg a 5 reps @ RIR 2 (RTF 7 -> 0.83). Hoy: mismo RTF -> misma carga.
  const sugerida = calcularCargaSugerida({ cargaReal: 100, repsReal: 5, rirReal: 2 }, 5, 2, 2.5);
  assert.equal(sugerida, 100);
});

test("calcularCargaSugerida: sin marca de referencia o salto de reps demasiado grande -> null", () => {
  assert.equal(calcularCargaSugerida(null, 5, 2), null);
  assert.equal(calcularCargaSugerida({ cargaReal: 100, repsReal: 5, rirReal: 2 }, 12, 2), null); // salto de 7 reps
});

test("fatigaTarea: sin datos de última serie -> null (no se asume sin fatiga)", () => {
  assert.equal(fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 2 }), null);
  assert.equal(fatigaTarea(null), null);
});

test("fatigaTarea: misma carga, menos reps y menos RIR -> caída de e1RM y reps perdidas", () => {
  const f = fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 2, ultimaRepsReal: 3, ultimaRirReal: 0 });
  assert.equal(f.mismaCarga, true);
  assert.equal(f.repsPerdidas, 2);
  // RTF 7 (83 %) -> RTF 3 (92 %): e1RM 120,5 -> 108,7 = ~9,8 % de caída
  assert.ok(f.caidaPct > 9 && f.caidaPct < 10.5);
  assert.equal(f.nivel, "moderada");
});

test("fatigaTarea: última serie igual a la mejor -> 0 % y nivel baja; carga vacía = misma carga", () => {
  const f = fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 2, ultimaCargaReal: "", ultimaRepsReal: 5, ultimaRirReal: 2 });
  assert.equal(Math.round(f.caidaPct), 0);
  assert.equal(f.nivel, "baja");
});

test("fatigaTarea: falta RIR de la última serie -> null", () => {
  assert.equal(fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 2, ultimaRepsReal: 4, ultimaRirReal: "" }), null);
});

test("fatigaTarea: % de reps perdidas contado con la misma carga; soloRir si la caída es solo de RIR", () => {
  const f = fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 2, ultimaRepsReal: 3, ultimaRirReal: 0 });
  assert.equal(Math.round(f.repsPerdidasPct), 40);
  assert.equal(f.soloRir, false);
  const g = fatigaTarea({ cargaReal: 100, repsReal: 5, rirReal: 3, ultimaRepsReal: 5, ultimaRirReal: 1 });
  assert.equal(g.repsPerdidas, 0);
  assert.equal(g.soloRir, true);
  assert.ok(g.caidaPct > 0);
});

test("interpretarFatiga: un texto por nivel y null sin dato", () => {
  assert.equal(interpretarFatiga(null), null);
  assert.match(interpretarFatiga({ nivel: "baja" }), /Fatiga baja/);
  assert.match(interpretarFatiga({ nivel: "moderada" }), /Fatiga moderada/);
  assert.match(interpretarFatiga({ nivel: "alta" }), /Fatiga alta/);
});
