// ============================================================
// CONTROL DE FATIGA (CMJ) — motor de cálculo
// ------------------------------------------------------------
// Portado del panel de fatiga independiente de David (Google Sheets
// + Apps Script) el 22/09/2026. Son funciones puras — no dependen de
// React ni de cómo se guardan los datos — así que se pueden probar
// y verificar exactamente igual que el resto del archivo.
//
// Una diferencia importante respecto al panel original, y a
// propósito: allí cada jugador se identificaba por el NOMBRE tal
// cual venía en el CSV de My Jump Lab. Aquí, en cambio, todo lo que
// analiza (cmjBuildPlayers y en adelante) trabaja sobre el
// jugador_id real de Supabase — el mismo que usa el resto de la
// app. El nombre del CSV solo se usa para la vinculación inicial
// (ver la sección de subida de CSV), nunca como identidad para el
// análisis. Así se evita el riesgo de que una variación de un
// nombre (una tilde, un apellido de más) cree en silencio un
// "jugador" distinto del que ya tienes en el roster.
//
// Nota de extracción: los colores de UI (CMJ_STATUS_META, CMJ_TAG_META,
// CMJ_METRIC_CHART_COLOR) se quedan en App.jsx porque dependen del sistema
// de diseño (`ds`) — este módulo no toca nada de presentación. Donde este
// motor necesitaba una etiqueta de texto de CMJ_TAG_META (cmjHoyDe), se
// duplica como CMJ_TAG_LABELS, solo el texto, sin color.
import { sumarDiasFecha } from "./fechas.js";

export function cmjNum(v) {
  if (v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "---") return null;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function cmjParseDateTime(raw) {
  const [datePart, timePart] = String(raw || "").split(",").map((s) => s.trim());
  if (!datePart) return null;
  const [d, m, y] = datePart.split(".").map((x) => parseInt(x, 10));
  let h = 0, mi = 0;
  if (timePart) {
    const [hh, mm] = timePart.split(":").map((x) => parseInt(x, 10));
    h = hh || 0; mi = mm || 0;
  }
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d, h, mi);
}

export function cmjDateKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Columnas reales del export de My Jump Lab, en el orden en que vienen.
export const CMJ_CSV_COLS = [
  "fecha", "equipo", "nombre", "peso", "hp0", "tipo", "altCajon", "carga",
  "altura", "rsiMod", "tDespegue", "tVuelo", "tContacto", "dri", "fuerza",
  "velocidad", "potencia", "impulse", "ifr", "stiffness", "color",
];

export function cmjMean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

// Si un jugador tiene más de un salto registrado el mismo día (protocolo de
// varios intentos por sesión), se promedian en un único test representativo
// de ese día — igual que en el panel original.
export function cmjAggregateByDay(rows) {
  const groups = new Map();
  rows.forEach((r) => {
    const key = `${r.nombreCsv}|${r.dateKey}`;
    (groups.get(key) || groups.set(key, []).get(key)).push(r);
  });
  const result = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      result.push({ ...group[0], nSaltos: 1 });
      return;
    }
    const sorted = [...group].sort((a, b) => new Date(a.date) - new Date(b.date));
    const kinRows = sorted.filter((r) => r.kineticsValid);
    const velRows = sorted.filter((r) => r.velocidad != null);
    result.push({
      nombreCsv: sorted[0].nombreCsv,
      equipo: sorted[0].equipo,
      date: sorted[0].date,
      dateKey: sorted[0].dateKey,
      peso: cmjMean(sorted.map((r) => r.peso).filter((v) => v > 0)) ?? sorted[0].peso,
      hp0: sorted[0].hp0,
      altura: cmjMean(sorted.map((r) => r.altura)),
      kineticsValid: kinRows.length > 0,
      pesoValid: sorted.some((r) => r.pesoValid),
      hp0Valid: sorted.some((r) => r.hp0Valid),
      fuerza: kinRows.length ? cmjMean(kinRows.map((r) => r.fuerza)) : null,
      potencia: kinRows.length ? cmjMean(kinRows.map((r) => r.potencia)) : null,
      velocidad: velRows.length ? cmjMean(velRows.map((r) => r.velocidad)) : null,
      nSaltos: group.length,
    });
  });
  return result;
}

// Convierte el texto crudo del CSV de My Jump Lab en filas ya agregadas por
// día, listas para vincular a un jugador y guardar en cmj_saltos. Nada de
// esto toca Supabase — es solo parseo, igual que hacía el panel original.
export function cmjParseCSV(text) {
  const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], issues: { dupCount: 0, pesoZero: 0, hp0Suspect: 0, total: 0 } };
  const rows = [];
  const seen = new Set();
  let dupCount = 0, pesoZero = 0, hp0Suspect = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(";");
    if (parts.length < 20) continue;
    const rec = {};
    CMJ_CSV_COLS.forEach((c, idx) => { rec[c] = parts[idx]; });

    const nombreCsv = (rec.nombre || "").trim().replace(/\s+/g, " ");
    if (!nombreCsv) continue;
    const date = cmjParseDateTime(rec.fecha);
    if (!date) continue;

    const peso = cmjNum(rec.peso);
    const hp0 = cmjNum(rec.hp0);
    const altura = cmjNum(rec.altura);
    if (altura === null || altura <= 0) continue;

    const pesoValid = peso !== null && peso > 0;
    const hp0Valid = hp0 !== null && hp0 >= 0.10 && hp0 <= 0.55;
    if (!pesoValid) pesoZero++;
    if (peso !== null && peso > 0 && !hp0Valid) hp0Suspect++;
    const kineticsValid = pesoValid && hp0Valid;

    const key = nombreCsv + "|" + date.getTime() + "|" + altura;
    if (seen.has(key)) { dupCount++; continue; }
    seen.add(key);

    rows.push({
      nombreCsv,
      equipo: (rec.equipo || "").trim(),
      date: date.toISOString(),
      dateKey: cmjDateKeyFromDate(date),
      peso, hp0, altura,
      fuerza: kineticsValid ? cmjNum(rec.fuerza) : null,
      potencia: kineticsValid ? cmjNum(rec.potencia) : null,
      velocidad: cmjNum(rec.velocidad),
      kineticsValid, pesoValid, hp0Valid,
    });
  }
  const aggregated = cmjAggregateByDay(rows);
  return { rows: aggregated, issues: { dupCount, pesoZero, hp0Suspect, total: aggregated.length } };
}

export function cmjPct(a, b) { return b ? ((a - b) / b) * 100 : null; }

// Compara el último test de un día de medida (tag: "inicio"/"md2"/"md1")
// contra el mismo día de medida del microciclo anterior en el que exista
// ese dato — evita la trampa de comparar linealmente test contra test sin
// mirar qué día de medida era cada uno (un MD-2 no es comparable con un
// Inicio: son estímulos distintos, no una caída de rendimiento real).
export function cmjDeltaMismoDiaCicloAnterior(cmjPlayer, cmjMicroList, tag, metric) {
  if (!cmjPlayer) return null;
  const conValor = cmjMicroList
    .map((m) => {
      const r = cmjPlayer.microResults.get(m.id);
      const fila = r ? r[tag] : null;
      const val = fila ? metric.get(fila) : null;
      return val != null ? { microId: m.id, val } : null;
    })
    .filter(Boolean);
  if (conValor.length < 2) return null;
  const prev = conValor[conValor.length - 2];
  const curr = conValor[conValor.length - 1];
  return { pct: cmjPct(curr.val, prev.val), actual: curr.val };
}
export function cmjFmt(v, d = 1) { return v === null || v === undefined ? "—" : v.toFixed(d); }
export function cmjSigned(v, d = 1) { return v == null ? "—" : `${v > 0 ? "+" : ""}${cmjFmt(v, d)}%`; }
export function cmjSdMuestral(arr) {
  if (arr.length < 2) return null;
  const m = cmjMean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}
export function cmjClamp(v, min, max) { return v == null ? null : Math.min(max, Math.max(min, v)); }

export const CMJ_MIN_INICIOS_PARA_INDIVIDUALIZAR = 4;

// Qué mide cada variable a nivel fisiológico y por qué una caída importa —
// se combina con la severidad y el estado (verde/ámbar/rojo) para construir
// la explicación que ve el entrenador en cada tarjeta.
export const CMJ_METRIC_PHYSIO = {
  altura: {
    concepto: "La altura de salto resume la capacidad global de producir fuerza explosiva en muy poco tiempo.",
    rojo: "Una caída de esta magnitud indica fatiga neuromuscular real: el sistema nervioso y el músculo ya no están generando la potencia de salida habitual. Entrenar o competir así aumenta el riesgo de sobrecarga y de lesión, y conviene reducir la carga antes de exigir el gesto explosivo del partido.",
    ambar: "Una caída moderada puede deberse tanto a fatiga incipiente como al ruido normal de un salto único (la altura varía de forma natural un 3–8% entre sesiones). No es motivo de alarma por sí sola, pero conviene confirmarlo en el próximo test antes de intervenir.",
    verde: "Se mantiene dentro de la variabilidad normal — no hay indicio de fatiga en esta variable.",
  },
  potenciaRel: {
    concepto: "La potencia relativa mide la velocidad a la que el jugador aplica fuerza por kilo de peso — es más sensible a la fatiga que la propia altura.",
    rojo: "Que caiga con esta intensidad, incluso si la altura aguanta, señala que el jugador está saltando con otra estrategia (más tiempo de contramovimiento, menos explosividad real) para lograr el mismo resultado aparente. Es precisamente la fatiga que la altura por sí sola puede ocultar, y justifica intervenir en la carga aunque el salto \"parezca\" normal.",
    ambar: "Un descenso moderado en la velocidad de aplicación de fuerza, todavía dentro de un margen que puede ser variabilidad del test — pero es la primera señal que suele adelantarse a una caída de altura, así que merece vigilancia.",
    verde: "Dentro de rango normal — el jugador sigue aplicando fuerza a la velocidad habitual.",
  },
  fuerzaRel: {
    concepto: "La fuerza relativa indica cuánta fuerza es capaz de generar el jugador por kilo de peso corporal durante el salto.",
    rojo: "Una caída de esta magnitud sugiere fatiga muscular periférica (acumulación de metabolitos, microdaño muscular tras el esfuerzo) o menor activación neural del músculo. Combinada con una caída de potencia, es una señal consistente de fatiga acumulada real, no de un mal salto puntual.",
    ambar: "Una reducción moderada de la capacidad de generar fuerza — a vigilar junto con la potencia en los próximos tests, sin que por sí sola requiera todavía cambios de carga.",
    verde: "Dentro de rango normal — la capacidad de generar fuerza no muestra signos de fatiga.",
  },
};

// Cuán lejos está un valor del umbral que lo clasificó.
export function cmjSeveridad(delta, status, ambarPct, rojoPct) {
  if (delta == null || status === "gray" || status === "green") return "";
  if (status === "red") {
    const ratio = Math.abs(delta) / rojoPct;
    if (ratio < 1.15) return "justo por encima del umbral rojo";
    if (ratio < 1.5) return "claramente por encima del umbral rojo";
    return "muy por encima del umbral rojo";
  }
  const rango = rojoPct - ambarPct;
  const progreso = rango > 0 ? (Math.abs(delta) - ambarPct) / rango : 0;
  if (progreso > 0.66) return "cerca de pasar a alerta roja";
  if (progreso > 0.33) return "vigilancia moderada, a mitad de camino del umbral rojo";
  return "poco por encima del umbral ámbar";
}

export function cmjNivelPalabra(delta, status, ambarPct, rojoPct) {
  if (delta == null || status === "gray" || status === "green") return null;
  if (status === "red") {
    const ratio = Math.abs(delta) / rojoPct;
    if (ratio < 1.15) return "leve";
    if (ratio < 1.5) return "moderada";
    return "severa";
  }
  const rango = rojoPct - ambarPct;
  const progreso = rango > 0 ? (Math.abs(delta) - ambarPct) / rango : 0;
  if (progreso > 0.66) return "severa";
  if (progreso > 0.33) return "moderada";
  return "leve";
}

// Recomendación graduada: cuánto más lejos del rango óptimo, más contundente
// la acción, y el texto depende de qué día es (en MD-2 no hay otro test
// antes del partido; en MD+1 o en el chequeo de recuperación todavía queda
// margen para observar antes de actuar).
export function cmjNivelAccion(delta, status, ambarPct, rojoPct, dayField) {
  if (status === "gray") return "Sin datos suficientes todavía para valorar.";
  if (status === "green") return "Dentro del rango normal respecto al Inicio de esta semana — estado óptimo, no se requiere ninguna intervención sobre la carga.";
  if (delta == null) return "";

  const esMD2 = dayField === "md2";

  if (status === "red") {
    const ratio = Math.abs(delta) / rojoPct;
    if (esMD2) {
      if (ratio < 1.15) return "Cae por debajo del Inicio de esta semana, justo por encima del umbral rojo. No habrá otro test antes del partido para confirmarlo: reduce su carga en las próximas 48h o valora ajustar su papel en el once.";
      if (ratio < 1.5) return "Cae por debajo del Inicio de esta semana, claramente por encima del umbral rojo. No habrá otro test antes del partido: reduce de forma notable su exposición o valora que no salga de inicio.";
      return "Cae muy por debajo del Inicio de esta semana. No habrá otro test antes del partido: el riesgo de jugar así es alto — valora seriamente no alinearlo de inicio.";
    }
    if (ratio < 1.15) return "Cae por debajo del Inicio de esta semana, justo por encima del umbral rojo. Reduce su carga en los próximos días y confírmalo en el siguiente test.";
    if (ratio < 1.5) return "Cae por debajo del Inicio de esta semana, claramente por encima del umbral rojo. Reduce de forma notable su carga hasta que se recupere.";
    return "Cae muy por debajo del Inicio de esta semana. Prioriza la recuperación antes de exigir más carga.";
  }

  const rango = rojoPct - ambarPct;
  const progreso = rango > 0 ? (Math.abs(delta) - ambarPct) / rango : 0;
  if (progreso > 0.66) return "Cae por debajo del Inicio de esta semana, cerca de pasar a alerta roja. Vigila de cerca y evita aumentar la carga hasta el próximo test.";
  if (progreso > 0.33) return "Cae por debajo del Inicio de esta semana, vigilancia moderada. Sin necesidad de reducir carga todavía, pero no conviene subirla hasta confirmar en el próximo test.";
  return "Cae ligeramente por debajo del Inicio de esta semana, dentro de lo esperable. Sigue el plan normal.";
}

export function cmjExplicacionMetrica(metricKey, delta, status, ambarPct, rojoPct) {
  const info = CMJ_METRIC_PHYSIO[metricKey];
  if (status === "gray") return `${info.concepto} Sin datos suficientes todavía para comparar esta variable en este punto.`;
  const sev = cmjSeveridad(delta, status, ambarPct, rojoPct);
  const texto = status === "red" ? info.rojo : status === "amber" ? info.ambar : info.verde;
  return `${info.concepto} ${texto}${sev ? ` (${sev}).` : ""}`;
}

export const CMJ_FIELDS = ["inicio", "md2", "md1"];

// Altura, Potencia y Fuerza se relativizan por kg para poder comparar entre
// jugadores y en el tiempo; Velocidad se deriva matemáticamente de la altura
// (v = √(2gh)), así que se muestra como lectura alternativa pero no dispara
// alertas (sería contar la misma señal dos veces) — igual que en el panel
// original.
export const CMJ_METRICS = {
  altura: { key: "altura", label: "Altura", unit: "cm", decimals: 1, get: (r) => r.altura, drivesStatus: true },
  potenciaRel: { key: "potenciaRel", label: "Potencia relativa", unit: "W/kg", decimals: 1, get: (r) => (r.kineticsValid && r.peso) ? r.potencia / r.peso : null, drivesStatus: true },
  fuerzaRel: { key: "fuerzaRel", label: "Fuerza relativa", unit: "N/kg", decimals: 1, get: (r) => (r.kineticsValid && r.peso) ? r.fuerza / r.peso : null, drivesStatus: true },
  velocidad: { key: "velocidad", label: "Velocidad", unit: "m/s", decimals: 2, get: (r) => r.velocidad, drivesStatus: false },
};
export const CMJ_METRIC_LIST = Object.values(CMJ_METRICS);
export const CMJ_STATUS_ORDER = { red: 0, amber: 1, green: 2, gray: 3 };

// Filas de métrica (Altura / Potencia relativa / Fuerza relativa) para un
// día concreto del microciclo (md2 o md1), con el umbral propio de cada
// jugador para esa métrica.
export function cmjFilasDia(microResult, dayField, umbral) {
  return CMJ_METRIC_LIST.filter((x) => x.drivesStatus).map((metric) => {
    const mm = microResult.metrics[metric.key];
    const delta = mm[`${dayField}Delta`];
    const status = mm[`${dayField}Status`];
    const u = umbral[metric.key];
    return { key: metric.key, label: metric.label, delta, status, explicacion: cmjExplicacionMetrica(metric.key, delta, status, u.ambarPct, u.rojoPct) };
  });
}
export function cmjFilasRecuperacion(recuperacion, umbral) {
  return CMJ_METRIC_LIST.filter((x) => x.drivesStatus).map((metric) => {
    const mm = recuperacion ? recuperacion.metrics[metric.key] : { delta: null, status: "gray" };
    const u = umbral[metric.key];
    return { key: metric.key, label: metric.label, delta: mm.delta, status: mm.status, explicacion: cmjExplicacionMetrica(metric.key, mm.delta, mm.status, u.ambarPct, u.rojoPct) };
  });
}

// Estado global del día (peor de las 3 métricas) + la recomendación
// graduada — el desglose fisiológico por variable vive en cmjFilasDia.
export function cmjMotivoDia(microResult, dayField, umbral) {
  const statusKey = `${dayField}Status`;
  const deltaKey = `${dayField}Delta`;
  let worst = "gray", worstDelta = null, worstKey = null;
  CMJ_METRIC_LIST.filter((x) => x.drivesStatus).forEach((metric) => {
    const mm = microResult.metrics[metric.key];
    const s = mm[statusKey];
    if (CMJ_STATUS_ORDER[s] < CMJ_STATUS_ORDER[worst]) { worst = s; worstDelta = mm[deltaKey]; worstKey = metric.key; }
    else if (s === worst && mm[deltaKey] != null && (worstDelta == null || Math.abs(mm[deltaKey]) > Math.abs(worstDelta))) { worstDelta = mm[deltaKey]; worstKey = metric.key; }
  });
  if (worst === "gray") return { status: "gray", motivo: "Test de hoy aún no registrado.", nivel: null };
  const u = umbral[worstKey];
  return { status: worst, motivo: cmjNivelAccion(worstDelta, worst, u.ambarPct, u.rojoPct, dayField), nivel: cmjNivelPalabra(worstDelta, worst, u.ambarPct, u.rojoPct) };
}
export function cmjMotivoRecuperacion(recuperacion, umbral) {
  if (!recuperacion) return { status: "gray", motivo: "Sin Inicio del microciclo anterior con el que comparar.", nivel: null };
  if (recuperacion.status === "gray") {
    return { status: "gray", nivel: null, motivo: "Aún sin datos suficientes para comparar con el Inicio anterior." };
  }
  let worstDelta = null, worstKey = null;
  CMJ_METRIC_LIST.filter((x) => x.drivesStatus).forEach((metric) => {
    const mm = recuperacion.metrics[metric.key];
    if (mm.status === recuperacion.status && mm.delta != null && (worstDelta == null || Math.abs(mm.delta) > Math.abs(worstDelta))) { worstDelta = mm.delta; worstKey = metric.key; }
  });
  const u = umbral[worstKey] || umbral.altura;
  const prefijo = recuperacion.status === "green"
    ? "En línea con el Inicio del microciclo anterior. "
    : "Por debajo del Inicio del microciclo anterior. ";
  return { status: recuperacion.status, motivo: prefijo + cmjNivelAccion(worstDelta, recuperacion.status, u.ambarPct, u.rojoPct, "inicio"), nivel: cmjNivelPalabra(worstDelta, recuperacion.status, u.ambarPct, u.rojoPct) };
}

// Posiciones para agrupar/ordenar en las pantallas de grupo. A diferencia
// del panel original (donde vivían en un "roster" aparte), aquí la posición
// es un campo del propio jugador (jugador.posicion en Supabase).
export const CMJ_POSICIONES = [
  { key: "portero", label: "Porteros", singular: "Portero" },
  { key: "central", label: "Centrales", singular: "Central" },
  { key: "lateral", label: "Laterales", singular: "Lateral" },
  { key: "mediocentro", label: "Mediocentros", singular: "Mediocentro" },
  { key: "interior", label: "Interiores", singular: "Interior" },
  { key: "extremo", label: "Extremos", singular: "Extremo" },
  { key: "delantero", label: "Delanteros", singular: "Delantero" },
];
export function cmjPosicionLabel(key) { return CMJ_POSICIONES.find((p) => p.key === key)?.singular || "Sin posición"; }
export function cmjPosicionOrder(key) { const idx = CMJ_POSICIONES.findIndex((p) => p.key === key); return idx === -1 ? 99 : idx; }

export function cmjMicroRefDate(m) {
  const defined = CMJ_FIELDS.map((f) => m[f]).filter(Boolean).sort();
  return defined.length ? defined[0] : null;
}
export function cmjBuildDateIndex(microciclos) {
  const map = new Map();
  microciclos.forEach((m) => {
    CMJ_FIELDS.forEach((f) => {
      if (m[f]) map.set(cmjDateKeyFromDate(new Date(m[f])), { microId: m.id, tag: f, numero: m.numero });
    });
  });
  return map;
}
export function cmjOrderedMicroList(microciclos) {
  return [...microciclos].filter((m) => cmjMicroRefDate(m)).sort((a, b) => new Date(cmjMicroRefDate(a)) - new Date(cmjMicroRefDate(b)));
}
export function cmjStatusFromDelta(d, ambarPct, rojoPct) {
  if (d === null || d === undefined) return "gray";
  if (d <= -rojoPct) return "red";
  if (d <= -ambarPct) return "amber";
  return "green";
}

// El corazón del análisis. A diferencia del panel original, "rows" aquí son
// ya filas de cmj_saltos vinculadas a un jugador real (jugadorId no nulo) —
// las filas todavía "sin vincular" se filtran antes de llegar aquí, en la
// pantalla de subida de CSV, así que esta función nunca agrupa por nombre
// de texto, solo por jugadorId.
export function cmjBuildPlayers(rows, microciclos, ambarPct, rojoPct, individualizar, protocoloDesde) {
  const index = cmjBuildDateIndex(microciclos);
  const microList = cmjOrderedMicroList(microciclos);
  const byJugador = new Map();
  rows.forEach((r) => {
    if (!r.jugadorId) return;
    const hit = index.get(r.dateKey);
    const tagged = { ...r, tag: hit ? hit.tag : null, microId: hit ? hit.microId : null };
    if (!byJugador.has(r.jugadorId)) byJugador.set(r.jugadorId, []);
    byJugador.get(r.jugadorId).push(tagged);
  });

  const players = [...byJugador.entries()].map(([jugadorId, recs]) => {
    const sorted = [...recs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const inicios = sorted.filter((r) => r.tag === "inicio");
    // Si se ha marcado una fecha de cambio de protocolo (p. ej. de salto
    // único a "mejor de 3"), el perfil de ruido individual solo usa Inicios
    // desde esa fecha.
    const iniciosParaUmbral = protocoloDesde
      ? inicios.filter((r) => new Date(r.date) >= new Date(protocoloDesde))
      : inicios;

    // Perfil de ruido propio del jugador: variabilidad de un Inicio al
    // siguiente (no contra la media general, para no confundir una mejora
    // sostenida con irregularidad). Con menos de 4 Inicios se usa el umbral
    // general hasta que haya datos suficientes para confiar en el propio.
    const ratioGlobal = ambarPct > 0 ? rojoPct / ambarPct : 2;
    const umbral = {};
    CMJ_METRIC_LIST.filter((m) => m.drivesStatus).forEach((metric) => {
      const valoresTodos = iniciosParaUmbral.map((r) => metric.get(r)).filter((v) => v != null);
      const valores = valoresTodos.slice(-10);
      if (individualizar && valores.length >= CMJ_MIN_INICIOS_PARA_INDIVIDUALIZAR) {
        const diffs = valores.slice(1).map((v, i) => v - valores[i]);
        const sdDiffs = cmjSdMuestral(diffs);
        const errorTipico = sdDiffs != null ? sdDiffs / Math.SQRT2 : null;
        const m_ = cmjMean(valores);
        const cv = (errorTipico != null && m_) ? (errorTipico / m_) * 100 : null;
        const ambarI = cmjClamp(cv, 3, 20);
        const rojoI = cmjClamp(ambarI * ratioGlobal, ambarI + 1, 35);
        umbral[metric.key] = { ambarPct: ambarI, rojoPct: rojoI, cv, n: valores.length, personalizado: true };
      } else {
        umbral[metric.key] = { ambarPct, rojoPct, cv: null, n: valores.length, personalizado: false };
      }
    });

    const microDataMap = new Map();
    sorted.forEach((r) => {
      if (r.microId == null) return;
      if (!microDataMap.has(r.microId)) microDataMap.set(r.microId, {});
      microDataMap.get(r.microId)[r.tag] = r;
    });

    const microResults = new Map();
    microDataMap.forEach((b, id) => {
      const metrics = {};
      let worstStatus = "gray", heightStatus = "gray";
      CMJ_METRIC_LIST.forEach((metric) => {
        const baseVal = b.inicio ? metric.get(b.inicio) : null;
        const md2Val = b.md2 ? metric.get(b.md2) : null;
        const md1Val = b.md1 ? metric.get(b.md1) : null;
        const md2Delta = (baseVal != null && md2Val != null) ? cmjPct(md2Val, baseVal) : null;
        const md1Delta = (baseVal != null && md1Val != null) ? cmjPct(md1Val, baseVal) : null;
        const u = umbral[metric.key] || { ambarPct, rojoPct };
        const md2Status = cmjStatusFromDelta(md2Delta, u.ambarPct, u.rojoPct);
        const md1Status = cmjStatusFromDelta(md1Delta, u.ambarPct, u.rojoPct);
        const mStatus = CMJ_STATUS_ORDER[md2Status] <= CMJ_STATUS_ORDER[md1Status] ? md2Status : md1Status;
        metrics[metric.key] = { base: baseVal, md2Delta, md1Delta, md2Status, md1Status, status: mStatus };
        if (metric.key === "altura") heightStatus = mStatus;
        if (metric.drivesStatus && CMJ_STATUS_ORDER[mStatus] < CMJ_STATUS_ORDER[worstStatus]) worstStatus = mStatus;
      });
      // "Divergencia": el estado combinado es peor que lo que diría la
      // altura por sí sola — potencia o fuerza están delatando fatiga que
      // la altura, saltando con otra estrategia, está enmascarando.
      const divergente = CMJ_STATUS_ORDER[worstStatus] < CMJ_STATUS_ORDER[heightStatus];
      microResults.set(id, { ...b, metrics, status: worstStatus, heightStatus, divergente });
    });

    // El Inicio de cada microciclo se compara con el Inicio del microciclo
    // ANTERIOR (mismo tipo de día, igual que MD-2/MD+1 se comparan siempre
    // contra el Inicio de su propia semana) — así el primer día de la
    // semana también tiene con qué contrastar, en vez de quedarse sin
    // comparación posible por no haber todavía MD-2/MD+1 esta semana.
    microList.forEach((meta, idx) => {
      const curr = microResults.get(meta.id);
      if (!curr || !curr.inicio || idx === 0) return;
      const prev = microResults.get(microList[idx - 1].id);
      if (!prev || !prev.inicio) return;

      const recMetrics = {};
      let worst = "gray";
      CMJ_METRIC_LIST.filter((m) => m.drivesStatus).forEach((metric) => {
        const baseVal = metric.get(prev.inicio);
        const nowVal = metric.get(curr.inicio);
        const delta = (baseVal != null && nowVal != null) ? cmjPct(nowVal, baseVal) : null;
        const u = umbral[metric.key] || { ambarPct, rojoPct };
        const status = cmjStatusFromDelta(delta, u.ambarPct, u.rojoPct);
        recMetrics[metric.key] = { delta, status };
        if (CMJ_STATUS_ORDER[status] < CMJ_STATUS_ORDER[worst]) worst = status;
      });
      curr.recuperacion = { metrics: recMetrics, status: worst, modo: "inicio_anterior" };
      // CRÍTICO: el primer día de un microciclo (antes de que haya MD-2/MD+1
      // esa semana) solo tiene esta comparación (Inicio contra Inicio
      // anterior) — si no se refleja aquí, curr.status se queda "gray" y
      // más abajo lastActiveId salta ese microciclo entero, haciendo que el
      // panel muestre el estado de una semana más VIEJA en su lugar (el
      // origen de "hoy ha saltado menos pero el panel sale en verde y con
      // un % de hace semanas").
      if (CMJ_STATUS_ORDER[worst] < CMJ_STATUS_ORDER[curr.status]) curr.status = worst;
    });

    const orderedIds = microList.map((m) => m.id);
    const lastActiveId = [...orderedIds].reverse().find((id) => microResults.has(id) && microResults.get(id).status !== "gray");
    const lastId = lastActiveId ?? [...orderedIds].reverse().find((id) => microResults.has(id));
    const lastMicro = lastId != null ? microResults.get(lastId) : null;

    const trendPoints = inicios.slice(-6);
    const trendPct = trendPoints.length >= 3 ? cmjPct(trendPoints[trendPoints.length - 1].altura, trendPoints[0].altura) : null;

    return {
      jugadorId,
      nombre: sorted[sorted.length - 1].nombre,
      sorted, inicios, microResults,
      lastMicro, combinedStatus: lastMicro ? lastMicro.status : "gray",
      trendPct, nTests: sorted.length, umbral,
    };
  });

  return { players: players.sort((a, b) => CMJ_STATUS_ORDER[a.combinedStatus] - CMJ_STATUS_ORDER[b.combinedStatus]), microList };
}

export function cmjFindCurrentMicroId(microList) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const past = microList.filter((m) => { const d = new Date(cmjMicroRefDate(m)); d.setHours(0, 0, 0, 0); return d <= today; });
  if (past.length === 0) return { id: null, mode: microList.length > 0 ? "solo-futuro" : "vacio" };
  return { id: past[past.length - 1].id, mode: "ok" };
}
export function cmjSuggestNextNumero(microciclos) {
  const nums = microciclos.map((m) => parseInt(m.numero, 10)).filter((n) => Number.isFinite(n));
  return nums.length === 0 ? "1" : String(Math.max(...nums) + 1);
}

// Normaliza un nombre para comparar "Alex Pérez", "alex perez" y "Alex  Pérez "
// como el mismo jugador: minúsculas, sin tildes, sin espacios de sobra.
export function cmjNormalizarNombre(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const CMJ_UMBRAL_DEFECTO = { ambarPct: 6, rojoPct: 12, individualizar: true, protocoloDesde: "" };

// Solo las etiquetas de texto de CMJ_TAG_META (que en App.jsx también lleva
// el color de UI) — cmjHoyDe solo necesita el texto.
const CMJ_TAG_LABELS = { inicio: "Inicio microciclo", md2: "MD-2", md1: "MD+1" };

// Igual que en el panel original: qué mostrar HOY para un jugador depende
// de qué día es dentro del microciclo actual. Si hoy es "Inicio", el propio
// microciclo todavía no tiene ningún otro test con el que compararlo, así
// que se compara contra el Inicio del microciclo ANTERIOR (mismo tipo de
// día); si es MD-2 o MD+1, el estado de ese test frente al Inicio de esta
// semana (ese sí existe siempre, es el primer test de la semana); si no hay
// test programado hoy, se enseña la última lectura disponible de esta
// semana (a modo de contexto).
export function cmjHoyDe(player, todayTag) {
  const m = player.lastMicro;
  if (!todayTag) {
    const dayField = m?.md1 ? "md1" : m?.md2 ? "md2" : null;
    if (!dayField) {
      // Sin MD-2/MD+1 todavía esta semana: si al menos hay Inicio (con su
      // comparación de recuperación contra el Inicio anterior), esa es la
      // "última lectura de la semana" — antes se descartaba aquí y la
      // tarjeta salía en gris ("sin datos") aunque el Inicio sí se hubiera
      // hecho, por ejemplo cualquier día después del propio día de Inicio.
      if (m?.inicio) {
        const r = cmjMotivoRecuperacion(m.recuperacion, player.umbral);
        return { status: r.status, motivo: `Última lectura (Inicio): ${r.motivo}`, rows: cmjFilasRecuperacion(m.recuperacion, player.umbral), nivel: r.nivel, m };
      }
      return { status: "gray", motivo: "Sin tests registrados en este microciclo todavía.", rows: [], nivel: null };
    }
    const d = cmjMotivoDia(m, dayField, player.umbral);
    return { status: d.status, motivo: `Última lectura (${CMJ_TAG_LABELS[dayField]}): ${d.motivo}`, rows: cmjFilasDia(m, dayField, player.umbral), nivel: d.nivel, m };
  }
  if (todayTag === "inicio") {
    if (!m || !m.inicio) return { status: "gray", motivo: "Test de inicio de hoy aún no registrado.", rows: [], nivel: null };
    const r = cmjMotivoRecuperacion(m.recuperacion, player.umbral);
    return { status: r.status, motivo: r.motivo, rows: cmjFilasRecuperacion(m.recuperacion, player.umbral), nivel: r.nivel, m };
  }
  if (!m || !m[todayTag]) return { status: "gray", motivo: `Test de hoy (${CMJ_TAG_LABELS[todayTag]}) aún no registrado.`, rows: [], nivel: null };
  const d = cmjMotivoDia(m, todayTag, player.umbral);
  return { status: d.status, motivo: d.motivo, rows: cmjFilasDia(m, todayTag, player.umbral), nivel: d.nivel, m };
}

// ---------- Fase 2 · carga de fuerza por microciclo ----------
// Vincula las sesiones de fuerza con los microciclos del CMJ SOLO por fecha
// (sin columnas nuevas): un microciclo abarca desde su día de Inicio hasta la
// víspera del siguiente Inicio, sea cual sea su duración. El último (sin
// siguiente que lo cierre) se acota a 14 días. Un microciclo sin fecha de
// Inicio no genera ventana.
export const MICRO_DIAS_ULTIMO = 14;
export function cmjVentanasMicrociclo(microciclos) {
  const lista = (microciclos || [])
    .filter((m) => m.inicio)
    .map((m) => ({ m, desde: String(m.inicio).slice(0, 10) }))
    .sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0));
  return lista.map((x, i) => {
    // Un microciclo dura lo que tú decidas: hasta el día anterior al Inicio del
    // siguiente, sin límite. Solo el último (sin siguiente que lo cierre) se
    // acota a MICRO_DIAS_ULTIMO días para no etiquetar fechas lejanas.
    const vispera = lista[i + 1] ? sumarDiasFecha(lista[i + 1].desde, -1) : sumarDiasFecha(x.desde, MICRO_DIAS_ULTIMO - 1);
    return { id: x.m.id, numero: x.m.numero, desde: x.desde, hasta: vispera };
  });
}
export function cmjMicroDeFecha(fecha, ventanas) {
  return ventanas.find((v) => fecha >= v.desde && fecha <= v.hasta) || null;
}
