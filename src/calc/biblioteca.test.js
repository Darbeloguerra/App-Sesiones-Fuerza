import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMeta, serializarMeta, metaDe, actualizarMeta, renombrarMeta, tipoDominante, describirPlantilla,
  filtrarPlantillas, ordenarPlantillas, agruparPorTipo, contarPorTipo, diasDisponibles, resolverDestinatarios,
  itemsAsignacion, resumenAsignacion, atajoFechas, SIN_TIPO, nombreCopia, tareaDraftADb, tareasDeCopia, mdDe,
} from "./biblioteca.js";

const g = (nombre, bloques = [], extra = {}) => ({ nombre, rep: { tareas: bloques.map((b) => ({ bloque_sesion: b })) }, ultima: null, ...extra });

test("parseMeta tolera texto roto, vacío y valores no válidos", () => {
  assert.deepEqual(parseMeta(null), {});
  assert.deepEqual(parseMeta("no es json"), {});
  assert.deepEqual(parseMeta("[1,2]"), {});
  assert.deepEqual(parseMeta({ a: { tipo: "Inventado", fav: false } }), {});
  assert.deepEqual(parseMeta(serializarMeta({ a: { tipo: "Fuerza", fav: true } })), { a: { tipo: "Fuerza", fav: true } });
});

test("actualizarMeta no muta, normaliza el nombre y limpia las entradas vacías", () => {
  const base = {};
  const m1 = actualizarMeta(base, "  Fuerza A ", { tipo: "Fuerza" });
  assert.deepEqual(base, {});
  assert.deepEqual(metaDe(m1, "fuerza a"), { tipo: "Fuerza", fav: false });
  const m2 = actualizarMeta(m1, "Fuerza A", { tipo: null });
  assert.deepEqual(m2, {});
  assert.deepEqual(actualizarMeta({}, "", { fav: true }), {});
});

test("renombrar conserva la clasificación", () => {
  const m = actualizarMeta({}, "Vieja", { tipo: "Core", fav: true });
  const r = renombrarMeta(m, "Vieja", "Nueva");
  assert.deepEqual(metaDe(r, "nueva"), { tipo: "Core", fav: true });
  assert.equal(r["vieja"], undefined);
});

test("tipo dominante: el bloque más repetido que sea un tipo conocido", () => {
  assert.equal(tipoDominante([{ bloque_sesion: "Fuerza" }, { bloque_sesion: "Core" }, { bloque_sesion: "Fuerza" }]), "Fuerza");
  assert.equal(tipoDominante([{ bloque_sesion: "General" }]), null);
  assert.equal(tipoDominante([]), null);
});

test("describir: el tipo del entrenador manda sobre el deducido", () => {
  const p = g("A", ["Fuerza"]);
  assert.deepEqual(describirPlantilla(p, {}), { tipo: "Fuerza", tipoAuto: true, fav: false });
  const m = actualizarMeta({}, "A", { tipo: "Movilidad" });
  assert.equal(describirPlantilla(p, m).tipo, "Movilidad");
  assert.equal(describirPlantilla(p, m).tipoAuto, false);
  assert.equal(describirPlantilla(g("B", ["General"]), {}).tipo, SIN_TIPO);
});

test("filtros combinados: tipo, MD, favoritas y búsqueda", () => {
  const lista = [g("Fuerza A", ["Fuerza"], { rep: { md: "MD-4", tareas: [{ bloque_sesion: "Fuerza" }] } }), g("Fuerza B", ["Fuerza"]), g("Movilidad cadera", ["Movilidad"], { rep: { md: "MD-1", tareas: [{ bloque_sesion: "Movilidad" }] } })];
  let m = actualizarMeta({}, "Fuerza A", { fav: true });
  const n = (f) => filtrarPlantillas(lista, f, m).map((x) => x.nombre);
  assert.deepEqual(n({}), ["Fuerza A", "Fuerza B", "Movilidad cadera"]);
  assert.deepEqual(n({ tipo: "Fuerza" }), ["Fuerza A", "Fuerza B"]);
  assert.deepEqual(n({ tipo: "Fuerza", md: "MD-4" }), ["Fuerza A"]);
  assert.deepEqual(n({ md: "MD-1" }), ["Movilidad cadera"]);
  assert.deepEqual(n({ md: "Sin MD" }), ["Fuerza B"]);
  assert.deepEqual(n({ fav: true }), ["Fuerza A"]);
  assert.deepEqual(n({ q: "  CADERA " }), ["Movilidad cadera"]);
  assert.deepEqual(n({ tipo: "Todas", md: "Todos" }).length, 3);
});

test("orden alfabético y por uso reciente (nunca usadas al final)", () => {
  const l = [g("Zeta", [], { ultima: "2026-11-01" }), g("Alfa", [], { ultima: null }), g("Beta", [], { ultima: "2026-11-10" })];
  assert.deepEqual(ordenarPlantillas(l, "az").map((x) => x.nombre), ["Alfa", "Beta", "Zeta"]);
  assert.deepEqual(ordenarPlantillas(l, "reciente").map((x) => x.nombre), ["Beta", "Zeta", "Alfa"]);
});

test("agrupar por tipo respeta el orden fijo y deja «Sin clasificar» al final", () => {
  const l = [g("Z", ["General"]), g("B", ["Movilidad"]), g("A", ["Fuerza"]), g("C", ["Fuerza"])];
  const r = agruparPorTipo(l, {});
  assert.deepEqual(r.map((x) => x.tipo), ["Fuerza", "Movilidad", SIN_TIPO]);
  assert.deepEqual(r[0].items.map((x) => x.nombre), ["A", "C"]);
  assert.deepEqual(contarPorTipo(l, {}), { Fuerza: 2, Movilidad: 1, [SIN_TIPO]: 1 });
});

test("días disponibles: 14 consecutivos desde hoy con su día de la semana", () => {
  const d = diasDisponibles("2026-11-19", 14);
  assert.equal(d.length, 14);
  assert.equal(d[0].fecha, "2026-11-19");
  assert.equal(d[0].dow, 4); // jueves
  assert.equal(d[13].fecha, "2026-12-02");
});

test("destinatarios: equipos + sueltos, solo activos y sin repetir", () => {
  const activos = [
    { id: "a", gruposIds: ["g1"] },
    { id: "b", gruposIds: ["g1", "g2"] },
    { id: "c", gruposIds: [] },
  ];
  assert.deepEqual(resolverDestinatarios(["g1"], ["c", "a", "zzz"], activos), ["a", "b", "c"]);
  assert.deepEqual(resolverDestinatarios([], [], activos), []);
  assert.deepEqual(resolverDestinatarios(["g2"], null, activos), ["b"]);
});

test("asignación: una sesión por fecha con todos dentro, sin pasado ni repetidos", () => {
  const s = { id: "s1" };
  const it = itemsAsignacion(s, ["2026-11-23", "2026-11-20", "2026-11-23", "2026-11-10"], ["a", "b"], "2026-11-19");
  assert.deepEqual(it.map((x) => x.fecha), ["2026-11-20", "2026-11-23"]);
  assert.deepEqual(it[0].destinos, ["a", "b"]);
  assert.notEqual(it[0].destinos, it[1].destinos);
  assert.deepEqual(itemsAsignacion(s, ["2026-11-20"], [], "2026-11-19"), []);
  assert.deepEqual(itemsAsignacion(null, ["2026-11-20"], ["a"]), []);
  assert.deepEqual(resumenAsignacion(["x", "x", "y"], ["a", "b", "c"]), { sesiones: 2, jugadores: 3 });
});

test("atajos de fechas desde un jueves", () => {
  const hoy = "2026-11-19"; // jueves
  const dias = diasDisponibles(hoy, 14);
  assert.deepEqual(atajoFechas("resto-semana", hoy, dias), ["2026-11-19", "2026-11-20"]);
  assert.deepEqual(atajoFechas("lmv-proxima", hoy, dias), ["2026-11-23", "2026-11-25", "2026-11-27"]);
  assert.deepEqual(atajoFechas("otro", hoy, dias), []);
});

test("atajos desde domingo y lunes", () => {
  const dom = "2026-11-22";
  assert.deepEqual(atajoFechas("resto-semana", dom, diasDisponibles(dom, 14)), []);
  assert.deepEqual(atajoFechas("lmv-proxima", dom, diasDisponibles(dom, 14)), ["2026-11-23", "2026-11-25", "2026-11-27"]);
  const lun = "2026-11-23";
  assert.deepEqual(atajoFechas("resto-semana", lun, diasDisponibles(lun, 14)), ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
  assert.deepEqual(atajoFechas("lmv-proxima", lun, diasDisponibles(lun, 14)), ["2026-11-30", "2026-12-02", "2026-12-04"]);
});

test("nombreCopia: respeta el nombre editado y evita duplicados", () => {
  assert.equal(nombreCopia("Fuerza nueva", "Fuerza A", ["Fuerza A"]), "Fuerza nueva");
  assert.equal(nombreCopia("", "Fuerza A", ["fuerza a"]), "Fuerza A (copia)");
  assert.equal(nombreCopia("  Fuerza A ", "Fuerza A", ["Fuerza A", "Fuerza A (copia)"]), "Fuerza A (copia 2)");
});

test("tareaDraftADb: modo_carga y pct1rm nunca van como cadena vacía", () => {
  const d = tareaDraftADb({ key: 7, ejercicioId: "e1", modo: "reps", series: "4", cantidad: "5", rir: "3", modoCarga: "rir", pct1rm: "", materiales: ["Barra"], descanso: "120" }, "Fuerza");
  assert.equal(d.pct1rm, null);
  assert.equal(d.modo_carga, "rir");
  assert.equal(d.material, '["Barra"]');
  assert.equal(d.descanso_seg, "120");
  assert.equal(tareaDraftADb({ key: 1, ejercicioId: "e", modoCarga: "pct1rm", pct1rm: "80" }, "Core").pct1rm, "80");
});

test("tareasDeCopia: sustituye solo Fuerza y Core sueltas; el resto se conserva", () => {
  const orig = [{ id: "a", bloque_sesion: "Movilidad" }, { id: "b", bloque_sesion: "Fuerza" }, { id: "c", bloque_sesion: "Fuerza", circuito_id: "x" }, { id: "d", bloque_sesion: "Resistencia" }];
  const r = tareasDeCopia(orig, [{ key: 1, ejercicioId: "e1" }], [{ key: 2, ejercicioId: "e2" }]);
  assert.deepEqual(r.map((t) => t.bloque_sesion), ["Movilidad", "Fuerza", "Resistencia", "Fuerza", "Core"]);
  assert.equal(r.find((t) => t.id === "b"), undefined);
  assert.equal(mdDe({ rep: { md: " MD-2 " } }), "MD-2");
});
