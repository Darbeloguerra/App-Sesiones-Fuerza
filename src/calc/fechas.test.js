import test from "node:test";
import assert from "node:assert/strict";
import {
  todayStr,
  normalizarFecha,
  fmtDateLabel,
  fmtDateShort,
  fmtHaceDias,
  diasEntreFechas,
  fechaISO,
  inicioSemanaCalendario,
  sumarDiasFecha,
  generarCuadriculaMes,
  inicioMes,
  sumarMeses,
  labelMes,
} from "./fechas.js";

test("todayStr: devuelve YYYY-MM-DD en hora local, igual que los campos locales de Date", () => {
  const resultado = todayStr();
  assert.match(resultado, /^\d{4}-\d{2}-\d{2}$/);
  const d = new Date();
  const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  assert.equal(resultado, esperado);
});

test("normalizarFecha: ya en formato YYYY-MM-DD (con o sin hora) se queda igual", () => {
  assert.equal(normalizarFecha("2026-08-31"), "2026-08-31");
  assert.equal(normalizarFecha("2026-08-31T22:00:00.000Z"), "2026-08-31");
});

test("normalizarFecha: vacío o nulo devuelve cadena vacía", () => {
  assert.equal(normalizarFecha(""), "");
  assert.equal(normalizarFecha(null), "");
  assert.equal(normalizarFecha(undefined), "");
});

test("normalizarFecha: un objeto Date se normaliza usando sus campos locales", () => {
  const d = new Date(2026, 7, 31); // 31 agosto 2026, hora local
  const resultado = normalizarFecha(d);
  assert.equal(resultado, "2026-08-31");
});

test("fmtDateLabel: incluye el mes en español", () => {
  const resultado = fmtDateLabel("2026-08-31");
  assert.match(resultado, /agosto/i);
});

test("fmtDateShort: incluye día, mes abreviado y año", () => {
  const resultado = fmtDateShort("2026-08-31");
  assert.match(resultado, /31/);
  assert.match(resultado, /2026/);
});

test("fmtHaceDias: hoy, ayer y hace varios días", () => {
  const hoy = todayStr();
  assert.equal(fmtHaceDias(hoy), "hoy");
  assert.equal(fmtHaceDias(sumarDiasFecha(hoy, -1)), "hace 1 día");
  assert.equal(fmtHaceDias(sumarDiasFecha(hoy, -3)), "hace 3 días");
});

test("diasEntreFechas: cuenta días naturales entre dos fechas", () => {
  assert.equal(diasEntreFechas("2026-08-01", "2026-08-10"), 9);
  assert.equal(diasEntreFechas("2026-08-10", "2026-08-10"), 0);
  assert.equal(diasEntreFechas("2026-08-10", "2026-08-01"), -9);
});

test("fechaISO: formatea un objeto Date como YYYY-MM-DD en hora local", () => {
  assert.equal(fechaISO(new Date(2026, 0, 5)), "2026-01-05");
});

test("inicioSemanaCalendario: siempre devuelve el lunes de esa semana", () => {
  // 2024-01-01 es lunes.
  assert.equal(inicioSemanaCalendario("2024-01-01"), "2024-01-01");
  assert.equal(inicioSemanaCalendario("2024-01-03"), "2024-01-01"); // miércoles
  assert.equal(inicioSemanaCalendario("2024-01-07"), "2024-01-01"); // domingo
});

test("sumarDiasFecha: suma y resta días, incluso cruzando de año", () => {
  assert.equal(sumarDiasFecha("2024-01-01", 10), "2024-01-11");
  assert.equal(sumarDiasFecha("2024-01-01", -1), "2023-12-31");
});

test("generarCuadriculaMes: 42 días empezando en lunes, marca los días fuera de mes", () => {
  const dias = generarCuadriculaMes("2024-01-15");
  assert.equal(dias.length, 42);
  assert.equal(dias[0].fecha, "2024-01-01");
  assert.equal(dias[0].fuera, false);
  assert.equal(dias[0].dayNum, 1);
  const ultimo = dias[41];
  assert.equal(ultimo.fecha, "2024-02-11");
  assert.equal(ultimo.fuera, true);
});

test("inicioMes: devuelve el día 1 del mes de la fecha dada", () => {
  assert.equal(inicioMes("2024-03-17"), "2024-03-01");
});

test("sumarMeses: avanza o retrocede meses, siempre al día 1", () => {
  assert.equal(sumarMeses("2024-01-15", 1), "2024-02-01");
  assert.equal(sumarMeses("2024-01-15", -1), "2023-12-01");
});

test("labelMes: nombre del mes en español con mayúscula inicial", () => {
  const resultado = labelMes("2024-03-01");
  assert.match(resultado, /^M/);
  assert.match(resultado, /2024/);
  assert.match(resultado, /marzo/i);
});
