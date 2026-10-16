// Funciones de fecha compartidas por toda la app. Extraídas de App.jsx sin
// cambiar su comportamiento — ver BUGS_ENCONTRADOS.md punto 4 sobre la
// duplicación parcial entre fechaISO/normalizarFecha/todayStr.

// "Hoy" en la fecha local del dispositivo — NUNCA en UTC. España está por
// delante de UTC (+1 invierno, +2 verano), así que usar
// `new Date().toISOString()` devolvía el día de ayer durante las primeras
// horas de la madrugada (medianoche a 1-2 de la mañana): una sesión de hoy
// se guardaba fechada ayer.
export const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

// A veces Google Sheets convierte por su cuenta un texto de fecha
// ("2026-08-31") en un valor de fecha real de la hoja, sin que nadie se lo
// pida — pasa con solo que la columna "parezca" una fecha. Al leerlo de
// vuelta, Apps Script lo devuelve como fecha completa con hora ("2026-08-30
// T22:00:00.000Z"), no como el texto plano "YYYY-MM-DD" que el resto de la
// app espera — y eso es lo que producía "Fecha inválida" en el Historial.
// Ese "T22:00:00.000Z" es la medianoche del 31 en la zona horaria de la
// hoja (Madrid, UTC+1/+2) expresada en UTC — por eso tomar el día en UTC
// (getUTCDate) daba sistemáticamente el día anterior. Al estar la app y la
// hoja en la misma zona horaria, hay que leer el día en hora LOCAL del
// dispositivo, no en UTC, para recuperar la fecha que de verdad se guardó.
export const normalizarFecha = (d) => {
  if (!d) return "";
  const s = String(d);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, "0");
    const da = String(dt.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return s;
};

export const fmtDateLabel = (d) => {
  const dt = new Date(normalizarFecha(d) + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

export const fmtDateShort = (d) => {
  const dt = new Date(normalizarFecha(d) + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
};

// "hace N días" en vez de una fecha absoluta — para cajones compactos
// (dashboard del jugador) donde el dato relevante es "qué tan reciente es
// esto", no la fecha exacta.
export const fmtHaceDias = (fecha) => {
  const dt = new Date(normalizarFecha(fecha) + "T00:00:00");
  const hoy = new Date(todayStr() + "T00:00:00");
  const dias = Math.round((hoy - dt) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
};

export function diasEntreFechas(desde, hasta) {
  return Math.round((new Date(hasta + "T00:00:00") - new Date(desde + "T00:00:00")) / 86400000);
}

// Fechas auxiliares para las métricas semanales del dashboard de
// escritorio: aquí "semana" SÍ es la semana natural (lunes a domingo) que
// contiene hoy, a propósito distinta de la ventana corrediza de 7 días que
// se usa en el dashboard del jugador — esta tarjeta necesita poder mostrar
// también los días de la semana que aún no han llegado (p. ej. "6 sesiones
// esta semana, 3 ya realizadas"), y eso solo tiene sentido con una semana
// de calendario, no con una ventana que siempre termina hoy.
export function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inicioSemanaCalendario(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  const diaSemana = d.getDay();
  const offset = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - offset);
  return fechaISO(d);
}

export function sumarDiasFecha(fechaStr, dias) {
  const d = new Date(fechaStr + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

// Cuadrícula de 6 semanas (42 días, L-D) para pintar un mes de calendario —
// compartida por el Calendario del entrenador, la mini-vista de la ficha de
// jugador y el Calendario del propio jugador. Siempre arranca en lunes y
// siempre son 42 días exactos (6 filas completas), para que la cuadrícula no
// cambie de alto de un mes a otro. `mesRef` es cualquier fecha "YYYY-MM-DD"
// dentro del mes que se quiere mostrar.
export function generarCuadriculaMes(mesRef) {
  const primerDiaMes = mesRef.slice(0, 8) + "01";
  const inicio = inicioSemanaCalendario(primerDiaMes);
  const mesNumero = Number(mesRef.slice(5, 7));
  const dias = [];
  for (let i = 0; i < 42; i++) {
    const f = sumarDiasFecha(inicio, i);
    dias.push({ fecha: f, fuera: Number(f.slice(5, 7)) !== mesNumero, dayNum: Number(f.slice(8, 10)) });
  }
  return dias;
}

export function inicioMes(fechaStr) {
  return fechaStr.slice(0, 8) + "01";
}

export function sumarMeses(mesRef, n) {
  const d = new Date(mesRef + "T00:00:00");
  d.setMonth(d.getMonth() + n, 1);
  return fechaISO(d);
}

export function labelMes(mesRef) {
  const d = new Date(mesRef + "T00:00:00");
  const s = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
