// Tiempo estimado de sesión y descanso recomendado. Extraído de App.jsx sin
// cambiar su comportamiento — lo usan tanto el Diseñador de sesiones como el
// cálculo de adherencia ponderada (ver src/calc/adherencia.js).
//
// Estimación orientativa para el diseñador: tiempo de trabajo de cada serie
// (reps × ritmo medio, o el tiempo pautado) + descanso entre series. El
// descanso sale de lo que escribas en la tarea o, si lo dejas en blanco, de
// una recomendación según la intensidad (%1RM / RIR). Alternar dos ejercicios
// de zonas distintas esconde el descanso de uno dentro del trabajo del otro.
export const SEG_POR_REP = 4;
export const SEG_TRANSICION = 30; // cambio de ejercicio / colocar material
export const SEG_TRANSICION_CIRCUITO = 15;
export const SEG_ENTRE_RONDAS = 60;
export const UMBRAL_DESCANSO_ALTERNAR = 90; // solo se sugiere alternar si el descanso da para ello

export function aSegundosDiseno(valor, unidad) {
  const n = Number(valor);
  if (!n || Number.isNaN(n) || n < 0) return 0;
  return /^min/i.test(unidad || "") ? n * 60 : n;
}

export function descansoRecomendadoSeg(t, bloque) {
  if (bloque !== "Fuerza") return 45;
  if (t.modo && t.modo !== "reps") return 60;
  if (t.modoCarga === "pct1rm") {
    const p = Number(t.pct1rm);
    if (!p || Number.isNaN(p)) return 120;
    if (p >= 90) return 240;
    if (p >= 85) return 210;
    if (p >= 80) return 180;
    if (p >= 70) return 150;
    if (p >= 60) return 120;
    return 90;
  }
  if (t.rir === "" || t.rir == null || Number.isNaN(Number(t.rir))) return 120;
  const r = Number(t.rir);
  if (r <= 1) return 180;
  if (r <= 2) return 150;
  if (r <= 3) return 120;
  return 90;
}

export function descansoEfectivoSeg(t, bloque) {
  const d = Number(t.descanso);
  return d > 0 ? d : descansoRecomendadoSeg(t, bloque);
}

export function trabajoSerieSeg(t) {
  const c = Number(t.cantidad);
  if (!c || Number.isNaN(c)) return 0;
  const base = t.modo === "tiempo" ? c : t.modo === "minutos" ? c * 60 : t.modo === "metros" ? 30 : c * SEG_POR_REP;
  return t.lateralidad === "unilateral" ? base * 2 : base;
}

export function estimarTareaSeg(t, bloque) {
  const trabajo = trabajoSerieSeg(t);
  if (!trabajo) return 0;
  const series = Math.max(1, Number(t.series) || 1);
  return series * trabajo + (series - 1) * descansoEfectivoSeg(t, bloque) + SEG_TRANSICION;
}

// Dos ejercicios alternados (A, B, A, B…): entre dos series seguidas de A
// transcurre el trabajo de B más lo que haga falta de espera, y viceversa.
export function estimarParSeg(a, b, bloque) {
  const tA = trabajoSerieSeg(a);
  const tB = trabajoSerieSeg(b);
  if (!tA || !tB) return estimarTareaSeg(a, bloque) + estimarTareaSeg(b, bloque);
  const sA = Math.max(1, Number(a.series) || 1);
  const sB = Math.max(1, Number(b.series) || 1);
  const rA = descansoEfectivoSeg(a, bloque);
  const rB = descansoEfectivoSeg(b, bloque);
  const ciclo = Math.max(tA + tB, tA + rA, tB + rB);
  const comunes = Math.min(sA, sB);
  const sobraA = sA - comunes;
  const sobraB = sB - comunes;
  return comunes * ciclo + sobraA * (tA + rA) + sobraB * (tB + rB) + SEG_TRANSICION;
}

export function estimarResistenciaSeg(t) {
  const tipo = t.tipoResistenciaCardio || "";
  const tiempo = aSegundosDiseno(t.tiempo, t.tiempoUnidad);
  const recup = aSegundosDiseno(t.recuperacion, t.recuperacionUnidad);
  const bloques = Math.max(1, Number(t.bloques) || 1);
  if (tipo === "continuo") {
    const series = Math.max(1, Number(t.series) || 1);
    return tiempo ? series * tiempo + (series - 1) * recup : 0;
  }
  if (tipo === "hiit") {
    const intervalos = Number(t.intervalos) || 0;
    if (!intervalos || !tiempo) return 0;
    return bloques * (intervalos * tiempo + (intervalos - 1) * recup) + (bloques - 1) * recup;
  }
  if (tipo === "rsa") {
    const series = Number(t.series) || 0;
    const trabajo = Number(t.duracion) || (Number(t.distancia) ? Number(t.distancia) / 5 : 0);
    if (!series || !trabajo) return 0;
    return bloques * (series * trabajo + (series - 1) * recup) + (bloques - 1) * recup;
  }
  return 0;
}

export function estimarCircuitoSeg(c, bloque) {
  const rondas = Math.max(1, Number(c.rondas) || 1);
  const porRonda = (c.tareas || []).reduce((sum, t) => sum + trabajoSerieSeg(t) + SEG_TRANSICION_CIRCUITO, 0);
  return porRonda ? rondas * porRonda + (rondas - 1) * SEG_ENTRE_RONDAS + SEG_TRANSICION : 0;
}

// Empareja tareas sueltas de un bloque según `alternaCon` (id de ejercicio del
// compañero). Devuelve { pares: [[a, b]], sueltas: [t…] }.
export function emparejarTareasAlternadas(tareas) {
  const usadas = new Set();
  const pares = [];
  tareas.forEach((a) => {
    if (usadas.has(a.key) || !a.alternaCon) return;
    const b = tareas.find((x) => x.key !== a.key && !usadas.has(x.key) && x.ejercicioId === a.alternaCon);
    if (!b) return;
    usadas.add(a.key);
    usadas.add(b.key);
    pares.push([a, b]);
  });
  return { pares, sueltas: tareas.filter((t) => !usadas.has(t.key)) };
}

export function estimarBloqueTareasSeg(tareas, circuitos, bloque) {
  const { pares, sueltas } = emparejarTareasAlternadas(tareas);
  return (
    pares.reduce((sum, [a, b]) => sum + estimarParSeg(a, b, bloque), 0) +
    sueltas.reduce((sum, t) => sum + estimarTareaSeg(t, bloque), 0) +
    circuitos.reduce((sum, c) => sum + estimarCircuitoSeg(c, bloque), 0)
  );
}

// Sugerencias: parejas de tareas sueltas de zonas distintas en las que una de
// ellas tiene descanso largo. Ahorro mínimo 2 min para no llenar de ruido.
export function sugerirAlternancias(tareas, bloque, zonaDe) {
  const { sueltas } = emparejarTareasAlternadas(tareas);
  const candidatas = sueltas.filter((t) => trabajoSerieSeg(t) > 0);
  const opciones = [];
  candidatas.forEach((a, i) => {
    if ((Number(a.series) || 1) < 2 || descansoEfectivoSeg(a, bloque) < UMBRAL_DESCANSO_ALTERNAR) return;
    candidatas.forEach((b, j) => {
      if (i === j) return;
      const za = zonaDe(a);
      const zb = zonaDe(b);
      if (!za || !zb || za === zb) return;
      const ahorro = estimarTareaSeg(a, bloque) + estimarTareaSeg(b, bloque) - estimarParSeg(a, b, bloque);
      if (ahorro >= 120) opciones.push({ a, b, ahorro });
    });
  });
  opciones.sort((x, y) => y.ahorro - x.ahorro);
  const usadas = new Set();
  const out = [];
  opciones.forEach((o) => {
    if (usadas.has(o.a.key) || usadas.has(o.b.key)) return;
    usadas.add(o.a.key);
    usadas.add(o.b.key);
    out.push(o);
  });
  return out;
}

export function formatearDuracionDiseno(seg) {
  if (!seg) return "—";
  const min = Math.round(seg / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}
