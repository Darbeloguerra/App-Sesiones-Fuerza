import test from "node:test";
import assert from "node:assert/strict";
import {
  cmjNum,
  cmjParseDateTime,
  cmjDateKeyFromDate,
  cmjMean,
  cmjAggregateByDay,
  cmjParseCSV,
  cmjPct,
  cmjDeltaMismoDiaCicloAnterior,
  cmjFmt,
  cmjSigned,
  cmjSdMuestral,
  cmjClamp,
  cmjSeveridad,
  cmjNivelPalabra,
  cmjStatusFromDelta,
  cmjPosicionLabel,
  cmjPosicionOrder,
  cmjMicroRefDate,
  cmjOrderedMicroList,
  cmjBuildPlayers,
  cmjFindCurrentMicroId,
  cmjSuggestNextNumero,
  cmjNormalizarNombre,
  cmjHoyDe,
  cmjVentanasMicrociclo,
  cmjMicroDeFecha,
  CMJ_METRICS,
} from "./cmj.js";

test("cmjNum: formato europeo (coma decimal, punto de miles), vacíos y '---'", () => {
  assert.equal(cmjNum("1.234,5"), 1234.5);
  assert.equal(cmjNum("42"), 42);
  assert.equal(cmjNum(""), null);
  assert.equal(cmjNum("---"), null);
  assert.equal(cmjNum(undefined), null);
});

test("cmjParseDateTime: fecha y hora con formato dd.mm.yyyy,HH:mm", () => {
  const d = cmjParseDateTime("05.03.2026,14:30");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2); // marzo = índice 2
  assert.equal(d.getDate(), 5);
  assert.equal(d.getHours(), 14);
  assert.equal(d.getMinutes(), 30);
  assert.equal(cmjParseDateTime(""), null);
  assert.equal(cmjParseDateTime("sin fecha"), null);
});

test("cmjDateKeyFromDate: YYYY-MM-DD en hora local", () => {
  assert.equal(cmjDateKeyFromDate(new Date(2026, 2, 5)), "2026-03-05");
});

test("cmjMean: media simple, vacío es null", () => {
  assert.equal(cmjMean([1, 2, 3]), 2);
  assert.equal(cmjMean([]), null);
});

test("cmjAggregateByDay: un salto se deja igual, varios se promedian", () => {
  const unico = cmjAggregateByDay([{ nombreCsv: "Ana", dateKey: "2026-03-05", date: "2026-03-05T10:00:00.000Z", peso: 60, altura: 40, kineticsValid: true, pesoValid: true, hp0Valid: true, fuerza: 1000, potencia: 2000, velocidad: 2.5 }]);
  assert.equal(unico.length, 1);
  assert.equal(unico[0].nSaltos, 1);

  const varios = cmjAggregateByDay([
    { nombreCsv: "Ana", dateKey: "2026-03-05", date: "2026-03-05T10:00:00.000Z", peso: 60, altura: 40, kineticsValid: true, pesoValid: true, hp0Valid: true, fuerza: 1000, potencia: 2000, velocidad: 2.5 },
    { nombreCsv: "Ana", dateKey: "2026-03-05", date: "2026-03-05T10:05:00.000Z", peso: 62, altura: 42, kineticsValid: true, pesoValid: true, hp0Valid: true, fuerza: 1100, potencia: 2100, velocidad: 2.6 },
  ]);
  assert.equal(varios.length, 1);
  assert.equal(varios[0].nSaltos, 2);
  assert.equal(varios[0].altura, 41);
});

test("cmjParseCSV: parsea cabecera + filas válidas, descarta sin altura", () => {
  const cabecera = "fecha;equipo;nombre;peso;hp0;tipo;altCajon;carga;altura;rsiMod;tDespegue;tVuelo;tContacto;dri;fuerza;velocidad;potencia;impulse;ifr;stiffness;color";
  const fila = "05.03.2026,10:00;Sub19;Ana Pérez;60,5;0,30;CMJ;0;0;40,2;1;0;0;0;0;1000;2,5;2000;0;0;0;verde";
  const { rows, issues } = cmjParseCSV([cabecera, fila].join("\n"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nombreCsv, "Ana Pérez");
  assert.equal(rows[0].altura, 40.2);
  assert.equal(issues.total, 1);
});

test("cmjParseCSV: texto vacío o sin filas no rompe", () => {
  assert.deepEqual(cmjParseCSV(""), { rows: [], issues: { dupCount: 0, pesoZero: 0, hp0Suspect: 0, total: 0 } });
});

test("cmjPct: variación porcentual, sin base es null", () => {
  assert.equal(cmjPct(110, 100), 10);
  assert.equal(cmjPct(90, 100), -10);
  assert.equal(cmjPct(10, 0), null);
});

test("cmjFmt y cmjSigned: formateo con signo y guion para null", () => {
  assert.equal(cmjFmt(null), "—");
  assert.equal(cmjFmt(3.456, 1), "3.5");
  assert.equal(cmjSigned(null), "—");
  assert.equal(cmjSigned(5.2), "+5.2%");
  assert.equal(cmjSigned(-5.2), "-5.2%");
});

test("cmjSdMuestral: desviación muestral, menos de 2 valores es null", () => {
  assert.equal(cmjSdMuestral([1]), null);
  assert.equal(Math.round(cmjSdMuestral([2, 4, 4, 4, 5, 5, 7, 9]) * 100) / 100, 2.14);
});

test("cmjClamp: limita entre min y max, null se queda null", () => {
  assert.equal(cmjClamp(50, 0, 10), 10);
  assert.equal(cmjClamp(-5, 0, 10), 0);
  assert.equal(cmjClamp(5, 0, 10), 5);
  assert.equal(cmjClamp(null, 0, 10), null);
});

test("cmjStatusFromDelta: verde/ámbar/rojo/gris según umbrales", () => {
  assert.equal(cmjStatusFromDelta(null, 6, 12), "gray");
  assert.equal(cmjStatusFromDelta(-2, 6, 12), "green");
  assert.equal(cmjStatusFromDelta(-8, 6, 12), "amber");
  assert.equal(cmjStatusFromDelta(-15, 6, 12), "red");
});

test("cmjSeveridad y cmjNivelPalabra: vacío en verde/gris, graduado en rojo/ámbar", () => {
  assert.equal(cmjSeveridad(-5, "green", 6, 12), "");
  assert.equal(cmjNivelPalabra(-5, "gray", 6, 12), null);
  assert.equal(cmjNivelPalabra(-13, "red", 6, 12), "leve");
  assert.equal(cmjNivelPalabra(-20, "red", 6, 12), "severa");
});

test("cmjPosicionLabel y cmjPosicionOrder: orden estable, desconocida al final", () => {
  assert.equal(cmjPosicionLabel("central"), "Central");
  assert.equal(cmjPosicionLabel("inventada"), "Sin posición");
  assert.ok(cmjPosicionOrder("portero") < cmjPosicionOrder("delantero"));
  assert.equal(cmjPosicionOrder("inventada"), 99);
});

test("cmjMicroRefDate y cmjOrderedMicroList: la fecha más temprana define el orden", () => {
  const m1 = { id: "a", inicio: "2026-02-10" };
  const m2 = { id: "b", md2: "2026-01-05" };
  const m3 = { id: "c" }; // sin fechas, se descarta
  assert.equal(cmjMicroRefDate(m1), "2026-02-10");
  const ordenado = cmjOrderedMicroList([m1, m2, m3]);
  assert.deepEqual(ordenado.map((m) => m.id), ["b", "a"]);
});

test("cmjNormalizarNombre: minúsculas, sin tildes, sin espacios dobles", () => {
  assert.equal(cmjNormalizarNombre("  Alex  Pérez "), "alex perez");
  assert.equal(cmjNormalizarNombre("ALEX PEREZ"), "alex perez");
});

test("cmjFindCurrentMicroId: el último microciclo cuyo inicio ya pasó", () => {
  const pasado = new Date();
  pasado.setDate(pasado.getDate() - 3);
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 10);
  const microList = [
    { id: "m1", inicio: pasado.toISOString().slice(0, 10) },
    { id: "m2", inicio: futuro.toISOString().slice(0, 10) },
  ];
  const r = cmjFindCurrentMicroId(microList);
  assert.equal(r.id, "m1");
  assert.equal(r.mode, "ok");
  assert.equal(cmjFindCurrentMicroId([]).mode, "vacio");
});

test("cmjSuggestNextNumero: siguiente entero tras el máximo, 1 si no hay ninguno", () => {
  assert.equal(cmjSuggestNextNumero([{ numero: "3" }, { numero: "7" }]), "8");
  assert.equal(cmjSuggestNextNumero([]), "1");
});

test("cmjVentanasMicrociclo y cmjMicroDeFecha: ventanas consecutivas por fecha de inicio", () => {
  const ventanas = cmjVentanasMicrociclo([
    { id: "m1", numero: "1", inicio: "2026-01-01" },
    { id: "m2", numero: "2", inicio: "2026-01-08" },
  ]);
  assert.deepEqual(ventanas[0], { id: "m1", numero: "1", desde: "2026-01-01", hasta: "2026-01-07" });
  assert.equal(ventanas[1].hasta, "2026-01-21"); // último: +14 días desde el inicio
  assert.equal(cmjMicroDeFecha("2026-01-05", ventanas).id, "m1");
  assert.equal(cmjMicroDeFecha("2026-01-09", ventanas).id, "m2");
  assert.equal(cmjMicroDeFecha("2025-12-01", ventanas), null);
});

test("cmjBuildPlayers: construye estado verde/rojo según la caída de altura respecto al Inicio", () => {
  const microciclos = [
    { id: "m1", numero: "1", inicio: "2026-01-05" },
  ];
  const rows = [
    { jugadorId: "j1", nombre: "Ana", dateKey: "2026-01-05", date: "2026-01-05T10:00:00.000Z", altura: 40, kineticsValid: true, peso: 60, fuerza: 1200, potencia: 2400, velocidad: 2.8 },
    { jugadorId: "j1", nombre: "Ana", dateKey: "2026-01-07", date: "2026-01-07T10:00:00.000Z", altura: 32, kineticsValid: true, peso: 60, fuerza: 1200, potencia: 2400, velocidad: 2.8 }, // -20% en MD-2
  ];
  // Vincular manualmente la segunda fila al día MD-2 del microciclo vía fecha real:
  // cmjBuildPlayers usa cmjBuildDateIndex internamente con m.md2/m.inicio, así que
  // añadimos md2 al microciclo para que la segunda fecha se etiquete como tal.
  microciclos[0].md2 = "2026-01-07";
  const { players } = cmjBuildPlayers(rows, microciclos, 6, 12, false, "");
  assert.equal(players.length, 1);
  const p = players[0];
  assert.equal(p.jugadorId, "j1");
  assert.equal(p.combinedStatus, "red");
  assert.equal(p.lastMicro.metrics.altura.md2Status, "red");
});

test("cmjHoyDe: sin ningún test registrado en el microciclo, estado gris", () => {
  const player = { lastMicro: null, umbral: { altura: { ambarPct: 6, rojoPct: 12 } } };
  const r = cmjHoyDe(player, "inicio");
  assert.equal(r.status, "gray");
});

test("cmjDeltaMismoDiaCicloAnterior: compara el mismo tag entre los dos últimos microciclos con dato", () => {
  const metric = CMJ_METRICS.altura;
  const microList = [{ id: "m1" }, { id: "m2" }];
  const cmjPlayer = {
    microResults: new Map([
      ["m1", { inicio: { altura: 40 } }],
      ["m2", { inicio: { altura: 36 } }],
    ]),
  };
  const r = cmjDeltaMismoDiaCicloAnterior(cmjPlayer, microList, "inicio", metric);
  assert.equal(r.actual, 36);
  assert.equal(r.pct, -10);
});
