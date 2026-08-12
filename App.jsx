import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, Dumbbell, ChevronLeft, ChevronRight, ChevronDown, User, ClipboardList, Loader2, Lock, Eye, EyeOff, RefreshCw, Play, Target, Send, CalendarClock, History, Download, Pencil } from "lucide-react";

// ====== Almacenamiento remoto (Google Sheets vía Apps Script) ======
// Sustituye a window.storage para que el artefacto funcione sin cuenta de Claude.
// 1) Pega aquí la URL que te da Apps Script al desplegar (termina en /exec).
// 2) Pon el mismo token que hayas puesto en el Code.gs.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwy4zCpwCKDYLZjkHAg0Rmj3dieYQm30TOf8WpYfQy97Rn7PueJEp8hfiDuXNT2WTPHwQ/exec";
const SHARED_TOKEN = "7f3a9c2e5b8d1f4a6c0e2b9d7a5f3c1e";

async function callBackend(action, params = {}) {
  const isWrite = action === "set" || action === "delete" || action === "uploadGif";
  if (!isWrite) {
    const qs = new URLSearchParams({ action, token: SHARED_TOKEN, ...params }).toString();
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
    return res.json();
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS en Apps Script
    body: JSON.stringify({ action, token: SHARED_TOKEN, ...params }),
  });
  return res.json();
}

const remoteStorage = {
  async get(key) {
    const data = await callBackend("get", { key });
    if (data && data.error) throw new Error(data.error);
    return data; // null si no existe, o { key, value, shared }
  },
  async set(key, value) {
    const data = await callBackend("set", { key, value });
    if (data && data.error) throw new Error(data.error);
    return { key, value, shared: true };
  },
  async delete(key) {
    const data = await callBackend("delete", { key });
    if (data && data.error) throw new Error(data.error);
    return { key, deleted: true, shared: true };
  },
  async list(prefix) {
    const data = await callBackend("list", { prefix: prefix || "" });
    if (data && data.error) throw new Error(data.error);
    return data; // { keys: [...] }
  },
};

if (typeof window !== "undefined") {
  window.storage = remoteStorage;
}
// ====== Fin almacenamiento remoto ======

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDateLabel = (d) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

const fmtDateShort = (d) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
};

function numericWarning(value, { min, max, label }) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return `${label} debe ser un número.`;
  if (min != null && n < min) return `${label} no debería ser menor que ${min}.`;
  if (max != null && n > max) return `${label} no debería ser mayor que ${max}.`;
  return null;
}

const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

function genUniquePin(existingPins) {
  let pin;
  let guard = 0;
  do {
    pin = genPin();
    guard++;
  } while (existingPins.includes(pin) && guard < 200);
  return pin;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractDriveFileId(url) {
  if (!url) return null;
  const patterns = [/drive\.google\.com\/file\/d\/([\w-]+)/, /[?&]id=([\w-]+)/];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function VideoEmbed({ url, gifId }) {
  const [attempt, setAttempt] = useState(0); // 0 = lh3, 1 = uc?export=view, 2 = give up (link)
  const [gifData, setGifData] = useState(null);
  const [gifLoading, setGifLoading] = useState(!!gifId);
  const [gifFailed, setGifFailed] = useState(false);

  useEffect(() => {
    if (!gifId) return;
    let cancelled = false;
    setGifLoading(true);
    setGifFailed(false);
    loadGifAsset(gifId).then((data) => {
      if (cancelled) return;
      if (data) setGifData(data);
      else setGifFailed(true);
      setGifLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [gifId]);

  if (gifId) {
    if (gifLoading) {
      return <div style={{ marginTop: 8, fontSize: 12, color: "#8BA4C0" }}>Cargando GIF...</div>;
    }
    if (gifFailed || !gifData) {
      return <div style={{ marginTop: 8, fontSize: 12, color: "#4A6680" }}>No se pudo cargar el GIF.</div>;
    }
    return (
      <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        <img src={gifData} alt="GIF de la tarea" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, display: "block", background: "#060D1A" }} />
      </div>
    );
  }

  if (!url) return null;

  // Compatibilidad con GIFs guardados antes de este cambio (data: URI incrustada directamente,
  // sin referencia compartida). Sigue funcionando, solo que no se deduplica.
  if (url.startsWith("data:")) {
    return (
      <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        <img src={url} alt="GIF de la tarea" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, display: "block", background: "#060D1A" }} />
      </div>
    );
  }

  const videoId = extractYouTubeId(url);
  const driveId = !videoId ? extractDriveFileId(url) : null;

  // Para enlaces de Google Drive, probamos a mostrarlo como imagen incrustada (funciona con GIFs
  // e imágenes). Probamos dos dominios distintos por si el entorno bloquea uno mas no el otro;
  // si ambos fallan, caemos al enlace normal.
  if (driveId && attempt < 2) {
    const directUrl =
      attempt === 0
        ? `https://lh3.googleusercontent.com/d/${driveId}`
        : `https://drive.google.com/uc?export=view&id=${driveId}`;
    return (
      <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        <img
          src={directUrl}
          alt="Vista previa de la tarea"
          onError={() => setAttempt((a) => a + 1)}
          style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, display: "block", background: "#060D1A" }}
        />
      </div>
    );
  }

  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 8,
        padding: "8px 10px",
        borderRadius: 8,
        background: "#060D1A",
        border: "1px solid #1A3050",
        textDecoration: "none",
      }}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt="Miniatura del vídeo"
          style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 40,
            borderRadius: 4,
            background: "#0E1E35",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={16} color="#F5C518" />
        </div>
      )}
      <span style={{ color: "#F5C518", fontSize: 13, fontWeight: 600 }}>Ver vídeo de la tarea</span>
    </a>
  );
}

function isNotFoundError(e) {
  const msg = (e && e.message ? e.message : String(e || "")).toLowerCase();
  return msg.includes("not found") || msg.includes("404") || msg.includes("no existe") || msg.includes("does not exist");
}

function usePersistentList(key, shared = true) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(key, shared);
        if (cancelled) return;
        setItems(res ? JSON.parse(res.value) : []);
      } catch (e) {
        // La clave no existe todavía (caso normal la primera vez) o hay un problema puntual de lectura.
        // No lo tratamos como error visible: simplemente no hay datos aún.
        if (cancelled) return;
        setItems([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, shared, tick]);

  const save = useCallback(
    async (next) => {
      const previous = items;
      setItems(next);
      try {
        const result = await window.storage.set(key, JSON.stringify(next), shared);
        if (!result) {
          setItems(previous);
          setError("No se pudo guardar. Inténtalo de nuevo.");
          return false;
        }
        setError(null);
        return true;
      } catch (e) {
        setItems(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [key, shared, items]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return [items, save, loaded, error, retry];
}

function usePersistentValue(key, shared = true) {
  const [value, setValue] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(key, shared);
        if (cancelled) return;
        setValue(res ? JSON.parse(res.value) : null);
      } catch (e) {
        // La clave no existe todavía (caso normal la primera vez) o hay un problema puntual de lectura.
        // No lo tratamos como error visible: simplemente no hay datos aún.
        if (cancelled) return;
        setValue(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, shared, tick]);

  const save = useCallback(
    async (next) => {
      const previous = value;
      setValue(next);
      try {
        const result = await window.storage.set(key, JSON.stringify(next), shared);
        if (!result) {
          setValue(previous);
          setError("No se pudo guardar. Inténtalo de nuevo.");
          return false;
        }
        setError(null);
        return true;
      } catch (e) {
        setValue(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [key, shared, value]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return [value, save, loaded, error, retry];
}

function useSession(id, date, prefix = "session") {
  const key = `${prefix}:${id}:${date}`;
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id || !date) {
      setSession({ exercises: [], completed: false, preventiveDone: {}, preventiveActuals: {}, teamDone: {}, teamActuals: {} });
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(key, true);
        setSession(res ? JSON.parse(res.value) : { exercises: [], completed: false, preventiveDone: {}, preventiveActuals: {}, teamDone: {}, teamActuals: {} });
      } catch {
        setSession({ exercises: [], completed: false, preventiveDone: {}, preventiveActuals: {}, teamDone: {}, teamActuals: {} });
      } finally {
        setLoaded(true);
      }
    })();
  }, [key, id, date]);

  const save = useCallback(
    async (next) => {
      setSession(next);
      try {
        await window.storage.set(key, JSON.stringify(next), true);
      } catch (e) {
        console.error("Error guardando sesión", e);
      }
    },
    [key]
  );

  return [session, save, loaded];
}

const PLATE_COLORS = ["#F5C518", "#F5C518", "#EF4444", "#1E6FD9"];

const CATEGORIES = ["INDIVIDUAL", "COLECTIVA", "PREVENTIVA"];
const CATEGORY_COLORS = {
  INDIVIDUAL: "#F5C518",
  COLECTIVA: "#1E6FD9",
  PREVENTIVA: "#EF4444",
};

const MD_TAGS = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "Sin MD"];

const EXERCISE_TYPES = ["Fuerza", "Resistencia", "Core", "Movilidad", "Equilibrio", "Pliometría", "Técnica"];

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

function computeRecurrenceDates(recurrence) {
  // recurrence: { type: 'unica'|'semanal', fecha, fechaInicio, fechaFin, dias: [0-6] }
  if (!recurrence) return [];
  if (recurrence.type === "unica") {
    return recurrence.fecha ? [recurrence.fecha] : [];
  }
  const { fechaInicio, fechaFin, dias } = recurrence;
  if (!fechaInicio || !fechaFin || !dias || !dias.length) return [];
  const dates = [];
  let cursor = new Date(fechaInicio + "T00:00:00");
  const end = new Date(fechaFin + "T00:00:00");
  let guard = 0;
  while (cursor <= end && guard < 400) {
    if (dias.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return dates;
}

function groupByCategory(exercises) {
  const groups = {};
  exercises.forEach((ex) => {
    const cat = ex.categoria || "Sin categoría";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ex);
  });
  const order = [...CATEGORIES, "Sin categoría"];
  return order.filter((cat) => groups[cat]?.length).map((cat) => [cat, groups[cat]]);
}

function groupByMdTag(exercises) {
  const groups = {};
  exercises.forEach((ex) => {
    const tag = ex.mdTag || "Sin MD";
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(ex);
  });
  return MD_TAGS.filter((tag) => groups[tag]?.length).map((tag) => [tag, groups[tag]]);
}

function CategoryBadge({ categoria }) {
  if (!categoria) return null;
  const color = CATEGORY_COLORS[categoria] || "#8BA4C0";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        color,
        border: `1px solid ${color}`,
        borderRadius: 20,
        padding: "2px 8px",
        marginBottom: 4,
      }}
    >
      {categoria}
    </span>
  );
}

function WeekdayPicker({ value, onChange }) {
  const selected = value || [];
  const shortLabels = { 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 0: "D" };
  const toggle = (day) => {
    onChange(selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day]);
  };
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      {WEEKDAYS.map((d) => {
        const active = selected.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            title={d.label}
            style={{
              flex: 1,
              aspectRatio: "1",
              borderRadius: "50%",
              border: `1px solid ${active ? "#F5C518" : "#1A3050"}`,
              background: active ? "#F5C518" : "#0E1E35",
              color: active ? "#0E1210" : "#8BA4C0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {shortLabels[d.value]}
          </button>
        );
      })}
    </div>
  );
}

function ListPicker({ options, value, onChange, multi = false }) {
  const normalized = options.map((opt) => ({
    value: typeof opt === "object" ? opt.value : opt,
    label: typeof opt === "object" ? opt.label : opt,
  }));

  if (multi) {
    const selected = value || [];
    return (
      <select
        multiple
        value={selected}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
        style={{ ...inputStyle, height: Math.min(220, 40 + normalized.length * 34), padding: 4 }}
      >
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ padding: "6px 8px" }}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {normalized.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function MDSelect({ value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniLabel}>Match day (MD)</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {MD_TAGS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

function RecipientPicker({ players, targetPlayerIds, onChange }) {
  const isTeamWide = targetPlayerIds === null || targetPlayerIds === undefined;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[
          { id: "equipo", label: "Todo el equipo" },
          { id: "concretos", label: "Jugadores concretos" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id === "equipo" ? null : targetPlayerIds || [])}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: "1px solid #1A3050",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: (t.id === "equipo") === isTeamWide ? "#F5C518" : "#060D1A",
              color: (t.id === "equipo") === isTeamWide ? "#060D1A" : "#F0F4FF",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!isTeamWide && (
        <>
          {!players.length ? (
            <div style={{ color: "#8BA4C0", fontSize: 13 }}>No hay jugadores en plantilla todavía.</div>
          ) : (
            <ListPicker
              options={players.map((p) => ({ value: p.id, label: p.name }))}
              value={targetPlayerIds || []}
              onChange={onChange}
              multi
              accentColor="#F5C518"
            />
          )}
        </>
      )}
    </div>
  );
}

function CategoryPicker({ value, onChange, options = CATEGORIES }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
      {options.map((cat) => {
        const active = value === cat;
        const color = CATEGORY_COLORS[cat];
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(active ? "" : cat)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 20,
              cursor: "pointer",
              border: `1px solid ${color}`,
              background: active ? color : "transparent",
              color: active ? "#060D1A" : color,
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

function BackHeader({ title, subtitle, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <button
        onClick={onBack}
        style={{
          background: "#0E1E35",
          border: "1px solid #1A3050",
          borderRadius: 8,
          padding: "8px 10px",
          cursor: "pointer",
          color: "#F0F4FF",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Collapsible({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#F0F4FF",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <ChevronDown
          size={18}
          color="#8BA4C0"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}
        />
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

function RecurrencePicker({ recurrence, onChange, ciclo }) {
  const setType = (type) => {
    if (type === "unica") {
      onChange({ type: "unica", fecha: recurrence.fecha || ciclo?.fechaInicio || todayStr() });
    } else {
      onChange({
        type: "semanal",
        dias: recurrence.dias || [],
        fechaInicio: ciclo?.fechaInicio || recurrence.fechaInicio || todayStr(),
        fechaFin: ciclo?.fechaFin || recurrence.fechaFin || todayStr(),
      });
    }
  };

  useEffect(() => {
    if (!ciclo) return;
    if (recurrence.type === "semanal") {
      if (recurrence.fechaInicio !== ciclo.fechaInicio || recurrence.fechaFin !== ciclo.fechaFin) {
        onChange({ ...recurrence, fechaInicio: ciclo.fechaInicio, fechaFin: ciclo.fechaFin });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclo?.id, ciclo?.fechaInicio, ciclo?.fechaFin, recurrence.type]);

  return (
    <div style={{ marginBottom: 10 }}>
      {ciclo && (
        <div
          style={{
            fontSize: 11,
            color: "#4A6680",
            marginBottom: 8,
          }}
        >
          Del {fmtDateShort(ciclo.fechaInicio)} al {fmtDateShort(ciclo.fechaFin)}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[
          { id: "unica", label: "Fecha única" },
          { id: "semanal", label: "Repetir semanalmente" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: "1px solid #1A3050",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: recurrence.type === t.id ? "#F5C518" : "#060D1A",
              color: recurrence.type === t.id ? "#060D1A" : "#F0F4FF",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {recurrence.type === "unica" ? (
        <div>
          <div style={miniLabel}>Fecha{ciclo ? " (dentro del período)" : ""}</div>
          <input
            type="date"
            style={dateInputStyle}
            value={recurrence.fecha || ""}
            min={ciclo?.fechaInicio}
            max={ciclo?.fechaFin}
            onChange={(e) => onChange({ ...recurrence, fecha: e.target.value })}
          />
        </div>
      ) : (
        <>
          <div style={miniLabel}>¿Qué días de la semana se repite?</div>
          <WeekdayPicker value={recurrence.dias || []} onChange={(dias) => onChange({ ...recurrence, dias })} />
          {!ciclo && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
                <div style={miniLabel}>Desde</div>
                <input
                  type="date"
                  style={dateInputStyle}
                  value={recurrence.fechaInicio || ""}
                  onChange={(e) => onChange({ ...recurrence, fechaInicio: e.target.value })}
                />
              </div>
              <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
                <div style={miniLabel}>Hasta</div>
                <input
                  type="date"
                  style={dateInputStyle}
                  value={recurrence.fechaFin || ""}
                  onChange={(e) => onChange({ ...recurrence, fechaFin: e.target.value })}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExerciseRow({ ex, onConfirm, isLast, playerId }) {
  const [carga, setCarga] = useState(ex.cargaReal ?? "");
  const [rir, setRir] = useState(ex.rirReal ?? "");
  const [lastValue, setLastValue] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!ex.done && playerId) {
      loadPlayerLastValue(playerId, ex.name).then((v) => {
        if (!cancelled) setLastValue(v);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [playerId, ex.name, ex.done]);

  const confirm = () => {
    onConfirm(ex, carga, rir);
  };

  const undo = (e) => {
    e.stopPropagation();
    onConfirm(ex, "", "");
  };

  const rowStyle = {
    background: "#0E1E35",
    border: "1px solid #1A3050",
    borderRadius: 10,
    padding: 14,
    marginBottom: isLast ? 0 : 10,
  };

  if (ex.done) {
    return (
      <div style={{ ...rowStyle, opacity: 0.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            onClick={undo}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#F5C518",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            <Check size={15} color="#060D1A" />
          </div>
          <div style={{ flex: 1 }}>
            <TagBadges tipos={ex.tipos} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
            <div style={{ fontSize: 13, color: "#8BA4C0" }}>
              {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "#F5C518", marginTop: 2 }}>
              Carga máxima: {ex.cargaReal !== "" ? `${ex.cargaReal} kg` : "—"} · RIR {ex.rirReal !== "" ? ex.rirReal : "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={rowStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          onClick={confirm}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "2px solid #1A3050",
            flexShrink: 0,
            cursor: "pointer",
            marginTop: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <TagBadges tipos={ex.tipos} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
          <div style={{ fontSize: 13, color: "#8BA4C0" }}>
            {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
          </div>
          {ex.notas && <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>{ex.notas}</div>}
          <VideoEmbed url={ex.videoUrl} gifId={ex.gifId} />
          {lastValue && (
            <div style={{ fontSize: 12, color: "#4A6680", marginTop: 6 }}>
              Última vez: {lastValue.cargaReal !== "" && lastValue.cargaReal != null ? `${lastValue.cargaReal} kg` : "—"}
              {" · "}RIR {lastValue.rirReal !== "" && lastValue.rirReal != null ? lastValue.rirReal : "—"}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <div>
              <div style={miniLabel}>Carga máx. (kg)</div>
              <input style={inputStyle} value={carga} onChange={(e) => setCarga(e.target.value)} onClick={(e) => e.stopPropagation()} />
            </div>
            <div>
              <div style={miniLabel}>RIR de esa serie</div>
              <input style={inputStyle} value={rir} onChange={(e) => setRir(e.target.value)} onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
          {(() => {
            const w =
              numericWarning(carga, { min: 0, label: "La carga" }) ||
              numericWarning(rir, { min: 0, max: 10, label: "El RIR" });
            return w ? <div style={{ fontSize: 11, color: "#F5C518", marginTop: 6 }}>{w}</div> : null;
          })()}
          <div style={{ fontSize: 11, color: "#4A6680", marginTop: 6 }}>
            Toca el círculo cuando termines la tarea.
          </div>
        </div>
      </div>
    </div>
  );
}

function PlateStack({ total, done }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${i < done ? PLATE_COLORS[i % PLATE_COLORS.length] : "#1A3050"}`,
            background: i < done ? PLATE_COLORS[i % PLATE_COLORS.length] : "transparent",
            transition: "all .2s ease",
          }}
        />
      ))}
    </div>
  );
}

function CyclePicker({ ciclos, saveCiclos, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniLabel}>Período de planificación (opcional)</div>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">Sin período</option>
        {ciclos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: "#4A6680", marginTop: 4 }}>
        Solo para organizar — no añade esto a las sesiones de ese período. Si no existe todavía el que buscas,
        créalo desde "Crear período".
      </div>
    </div>
  );
}

function Shell({ children, mode, coachUnlocked }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @media (min-width: 720px) {
          .fp-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            align-items: start;
          }
          .fp-grid > * {
            margin-bottom: 0 !important;
          }
          .fp-form-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: mode === "coach" && coachUnlocked ? 900 : 480, padding: "0 0 40px" }}>{children}</div>
    </div>
  );
}

function TopBar({ mode, setMode }) {
  return (
    <div style={{ padding: "24px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <Dumbbell size={22} color="#F5C518" style={{ flexShrink: 0, marginTop: 2 }} />
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: 0.2,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Entrenamiento de Fuerza y Prevención de Lesiones
        </h1>
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontStyle: "italic",
          fontSize: 12,
          color: "#4A6680",
          marginBottom: 18,
          marginLeft: 32,
        }}
      >
        David Arbelo · Preparador físico
      </div>
      <div
        style={{
          display: "flex",
          background: "#0E1E35",
          borderRadius: 10,
          padding: 4,
          gap: 4,
        }}
      >
        {[
          { id: "coach", label: "Entrenador" },
          { id: "player", label: "Jugador" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              background: mode === t.id ? "#F5C518" : "transparent",
              color: mode === t.id ? "#060D1A" : "#8BA4C0",
              transition: "all .15s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateNav({ date, setDate }) {
  const shift = (n) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0E1E35",
        borderRadius: 10,
        padding: "10px 14px",
        margin: "0 20px 16px",
      }}
    >
      <button onClick={() => shift(-1)} style={iconBtnStyle}>
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize", color: "#F0F4FF" }}>
        {fmtDateLabel(date)}
      </span>
      <button onClick={() => shift(1)} style={iconBtnStyle}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

const iconBtnStyle = {
  background: "none",
  border: "none",
  color: "#8BA4C0",
  cursor: "pointer",
  padding: 4,
  display: "flex",
};

const inputStyle = {
  width: "100%",
  background: "#060D1A",
  border: "1px solid #1A3050",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#F0F4FF",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const dateInputStyle = {
  ...inputStyle,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "block",
};

const cardStyle = {
  background: "#0E1E35",
  border: "1px solid #1A3050",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
};

const miniLabel = { fontSize: 11, color: "#4A6680", marginBottom: 4, fontWeight: 600 };

const primaryBtn = {
  background: "#F5C518",
  color: "#060D1A",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function LoadingBlock() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "#8BA4C0" }}>
      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PinInput({ value, onChange, autoFocus }) {
  return (
    <input
      autoFocus={autoFocus}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700 }}
      placeholder="····"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
    />
  );
}

// ---------- COACH GATE ----------

function CoachGate({ children, unlocked, setUnlocked }) {
  const [coachPin, saveCoachPin, loaded, loadError, retryLoad] = usePersistentValue("coach-pin", true);
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!loaded) return <LoadingBlock />;

  if (loadError) {
    return (
      <div style={{ padding: "0 20px" }}>
        <div style={cardStyle}>
          <div style={{ color: "#EF4444", fontSize: 14, marginBottom: 12 }}>{loadError}</div>
          <button onClick={retryLoad} style={{ ...primaryBtn, width: "100%" }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (unlocked) return children;

  if (coachPin == null) {
    const submit = async () => {
      if (pinA.length !== 4) return setError("El PIN debe tener 4 dígitos.");
      if (pinA !== pinB) return setError("Los dos PIN no coinciden.");
      setSaving(true);
      const ok = await saveCoachPin(pinA);
      setSaving(false);
      if (!ok) {
        setError("No se pudo guardar el PIN. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
      setError("");
      setUnlocked(true);
    };
    return (
      <div style={{ padding: "0 20px" }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lock size={18} color="#F5C518" />
            <div style={{ fontWeight: 700, fontSize: 15 }}>Crea tu PIN de entrenador</div>
          </div>
          <div style={{ fontSize: 13, color: "#8BA4C0", marginBottom: 14 }}>
            Solo tú deberías conocer este PIN. Te lo pedirá cada vez que entres en la vista Entrenador.
          </div>
          <div style={miniLabel}>PIN (4 dígitos)</div>
          <div style={{ marginBottom: 10 }}>
            <PinInput value={pinA} onChange={setPinA} autoFocus />
          </div>
          <div style={miniLabel}>Repite el PIN</div>
          <div style={{ marginBottom: 12 }}>
            <PinInput value={pinB} onChange={setPinB} />
          </div>
          {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={submit} disabled={saving} style={{ ...primaryBtn, width: "100%", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando..." : "Crear PIN"}
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (pinA === coachPin) {
      setUnlocked(true);
      setError("");
    } else {
      setError("PIN incorrecto.");
      setPinA("");
    }
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Lock size={18} color="#F5C518" />
          <div style={{ fontWeight: 700, fontSize: 15 }}>PIN de entrenador</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <PinInput value={pinA} onChange={setPinA} autoFocus />
        </div>
        {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} style={{ ...primaryBtn, width: "100%" }}>
          Entrar
        </button>
      </div>
    </div>
  );
}

// ---------- COACH VIEW ----------

function PlayerRosterRow({ player, savePlayers, players, injuryGroups, onRemove, onStatusChange, onOpenHistory }) {
  const [revealed, setRevealed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(player.name);
  const [nameError, setNameError] = useState("");

  const today = todayStr();
  const [todaySession] = useSession(player.id, today);
  const [todayTeam] = useSession("squad", today, "team-session");
  const [todayGroup] = useSession(player.groupId || null, today, "preventive");

  const todayPersonalCount = todaySession?.exercises?.length || 0;
  const todayTeamCount = todayTeam?.sent ? todayTeam.exercises?.length || 0 : 0;
  const todayGroupCount = todayGroup?.sent ? todayGroup.exercises?.length || 0 : 0;
  const todayTotal = todayPersonalCount + todayTeamCount + todayGroupCount;
  const todaySignature = [
    ...(todaySession?.exercises || []).map((e) => `personal-${e.id}`),
    ...(todayTeamCount ? (todayTeam.exercises || []).map((e) => `team-${e.id}`) : []),
    ...(todayGroupCount ? (todayGroup.exercises || []).map((e) => `group-${e.id}`) : []),
  ]
    .sort()
    .join(",");
  const isFullySubmittedToday =
    !!todaySession?.completed && todaySignature !== "" && todaySession?.completedSignature === todaySignature;
  const pendingToday = todayTotal > 0 && !isFullySubmittedToday;

  useEffect(() => {
    onStatusChange?.(player.id, pendingToday, todayTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToday, todayTotal]);

  const resetPin = async () => {
    const otherPins = players.filter((p) => p.id !== player.id).map((p) => p.pin);
    const next = players.map((p) => (p.id === player.id ? { ...p, pin: genUniquePin(otherPins) } : p));
    await savePlayers(next);
    setRevealed(true);
  };

  const assignGroup = async (groupId) => {
    const next = players.map((p) => (p.id === player.id ? { ...p, groupId: groupId || null } : p));
    await savePlayers(next);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError("El nombre no puede quedar vacío.");
      return;
    }
    const next = players.map((p) => (p.id === player.id ? { ...p, name: trimmed } : p));
    await savePlayers(next);
    setEditingName(false);
    setNameError("");
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 120 }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 14 }}
            />
            <button onClick={saveName} style={{ ...iconBtnStyle, color: "#F5C518" }} title="Guardar">
              <Check size={15} />
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNameDraft(player.name);
                setNameError("");
              }}
              style={iconBtnStyle}
              title="Cancelar"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF", display: "flex", alignItems: "center", gap: 6 }}>
            {player.name}
            <Pencil
              size={13}
              color="#4A6680"
              onClick={() => {
                setNameDraft(player.name);
                setEditingName(true);
              }}
              style={{ cursor: "pointer" }}
            />
            {pendingToday && (
              <span
                title="Sin completar hoy"
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#F5C518", display: "inline-block" }}
              />
            )}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={player.groupId || ""}
            onChange={(e) => assignGroup(e.target.value)}
            style={{
              background: "#060D1A",
              color: player.groupId ? "#EF4444" : "#8BA4C0",
              border: "1px solid #1A3050",
              borderRadius: 6,
              fontSize: 12,
              padding: "4px 6px",
            }}
          >
            <option value="">Sin grupo</option>
            {injuryGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: 2, color: "#F5C518" }}>
            {revealed ? player.pin : "••••"}
          </span>
          <button onClick={() => setRevealed((r) => !r)} style={iconBtnStyle} title="Mostrar/ocultar">
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button onClick={resetPin} style={iconBtnStyle} title="Generar nuevo PIN">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => onOpenHistory?.(player)} style={iconBtnStyle} title="Ver historial">
            <History size={15} />
          </button>
          <Trash2
            size={15}
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              onRemove(player.id);
            }}
            style={{ cursor: "pointer", color: confirmingDelete ? "#EF4444" : "#8BA4C0" }}
          />
        </div>
      </div>
      {nameError && (
        <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>{nameError}</div>
      )}
      {confirmingDelete && (
        <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
          Toca la papelera otra vez para confirmar que quieres eliminar a {player.name}.
        </div>
      )}
    </div>
  );
}

function PlayerPinManager({ players, savePlayers, injuryGroups, onRemovePlayer }) {
  const [statusByPlayer, setStatusByPlayer] = useState({});
  const [viewingHistoryPlayer, setViewingHistoryPlayer] = useState(null);

  const handleStatusChange = useCallback((playerId, pending, total) => {
    setStatusByPlayer((prev) => {
      const current = prev[playerId];
      if (current && current.pending === pending && current.total === total) return prev;
      return { ...prev, [playerId]: { pending, total } };
    });
  }, []);

  if (!players.length) return null;

  if (viewingHistoryPlayer) {
    return <PlayerHistoryScreen player={viewingHistoryPlayer} onBack={() => setViewingHistoryPlayer(null)} />;
  }

  const pendingList = players.filter((p) => statusByPlayer[p.id]?.pending);

  return (
    <>
      {pendingList.length > 0 && (
        <div
          style={{
            ...cardStyle,
            border: "1px solid #F5C518",
            background: "#2A2114",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F5C518", marginBottom: 4 }}>
            {pendingList.length} jugador{pendingList.length !== 1 ? "es" : ""} sin completar hoy
          </div>
          <div style={{ fontSize: 12, color: "#8BA4C0" }}>{pendingList.map((p) => p.name).join(", ")}</div>
        </div>
      )}
      <div className="fp-grid">
        {players.map((p) => (
          <PlayerRosterRow
            key={p.id}
            player={p}
            players={players}
            savePlayers={savePlayers}
            injuryGroups={injuryGroups}
            onRemove={onRemovePlayer}
            onStatusChange={handleStatusChange}
            onOpenHistory={() => setViewingHistoryPlayer(p)}
          />
        ))}
      </div>
    </>
  );
}

function useSessionSummaries(playerId, kind = "") {
  const key = playerId ? `session-summary${kind ? "-" + kind : ""}:${playerId}` : `session-summary${kind ? "-" + kind : ""}:none`;
  const [summaries, save, loaded] = usePersistentList(key, true);

  const upsert = useCallback(
    async (date, patch) => {
      const idx = summaries.findIndex((s) => s.date === date);
      let next;
      if (idx === -1) {
        next = [...summaries, { date, total: 0, done: 0, completed: false, ...patch }];
      } else {
        next = summaries.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      }
      await save(next);
    },
    [summaries, save]
  );

  return [summaries, upsert, loaded];
}

function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7);
}

function monthLabelOf(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function groupByMonth(items, dateAccessor) {
  const groups = {};
  items.forEach((item) => {
    const k = monthKeyOf(dateAccessor(item));
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  });
  return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function ReadOnlyExerciseRow({ ex }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <CategoryBadge categoria={ex.categoria} />
          <TagBadges tipos={ex.tipos} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
          <div style={{ fontSize: 13, color: "#8BA4C0", marginTop: 4 }}>
            Prescrito: {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""}{" "}
            {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
          </div>
          {ex.done ? (
            <div style={{ fontSize: 13, color: "#F5C518", marginTop: 4, fontWeight: 600 }}>
              ✓ Registrado: {ex.cargaReal !== "" && ex.cargaReal != null ? `${ex.cargaReal} kg` : "sin carga"} · RIR{" "}
              {ex.rirReal !== "" && ex.rirReal != null ? ex.rirReal : "—"}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#4A6680", marginTop: 4 }}>No marcado como hecho</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayDetailView({ playerId, date, scope, players }) {
  const [session, , sessionLoaded] = useSession(playerId, date);
  const groupId = players?.find((p) => p.id === playerId)?.groupId || null;
  const [groupSession, , groupLoaded] = useSession(groupId, date, "preventive");
  const [teamSession, , teamLoaded] = useSession("squad", date, "team-session");

  const loaded = sessionLoaded && groupLoaded && teamLoaded;
  if (!loaded) return <LoadingBlock />;

  const preventiveDone = session?.preventiveDone || {};
  const preventiveActuals = session?.preventiveActuals || {};
  const teamDone = session?.teamDone || {};
  const teamActuals = session?.teamActuals || {};

  const groupExercises = groupSession?.sent
    ? (groupSession.exercises || []).map((ex) => ({
        ...ex,
        categoria: ex.categoria || "PREVENTIVA",
        done: !!preventiveDone[ex.id],
        cargaReal: preventiveActuals[ex.id]?.cargaReal ?? "",
        rirReal: preventiveActuals[ex.id]?.rirReal ?? "",
      }))
    : [];
  const teamExercises = teamSession?.sent
    ? (teamSession.exercises || []).map((ex) => ({
        ...ex,
        done: !!teamDone[ex.id],
        cargaReal: teamActuals[ex.id]?.cargaReal ?? "",
        rirReal: teamActuals[ex.id]?.rirReal ?? "",
      }))
    : [];
  const personalExercises = (session?.exercises || []).map((ex) => ({
    ...ex,
    cargaReal: ex.cargaReal ?? "",
    rirReal: ex.rirReal ?? "",
  }));

  const list = scope === "preventivo" ? groupExercises : [...personalExercises, ...teamExercises, ...groupExercises];

  return (
    <div style={{ marginTop: 4, marginBottom: 8 }}>
      {!list.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 13, padding: "8px 4px" }}>
          No hay tareas registradas para este día.
        </div>
      ) : (
        list.map((ex, i) => <ReadOnlyExerciseRow key={`${ex.id}-${i}`} ex={ex} />)
      )}
    </div>
  );
}

function HistoryPanel({ summaries, playerId, scope = "general", players }) {
  const [openDate, setOpenDate] = useState(null);
  const grouped = groupByMonth(summaries, (s) => s.date);

  return (
    <>
      {!summaries.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Todavía no hay sesiones registradas para este jugador.
        </div>
      ) : (
        grouped.map(([mKey, items], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${items.length}`} defaultOpen={idx === 0}>
            {[...items]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map(({ date: d, total, done, completed }) => (
                <div key={d}>
                  <div
                    onClick={() => setOpenDate((cur) => (cur === d ? null : d))}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #060D1A",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>{fmtDateLabel(d)}</div>
                      <div style={{ fontSize: 12, color: "#8BA4C0" }}>
                        {completed ? "Completada por el jugador" : "Pendiente"}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: done === total && total > 0 ? "#F5C518" : "#8BA4C0" }}>
                      {done}/{total} hechos
                    </div>
                  </div>
                  {openDate === d && <DayDetailView playerId={playerId} date={d} scope={scope} players={players} />}
                </div>
              ))}
          </Collapsible>
        ))
      )}
    </>
  );
}

function getCicloStatus(ciclo) {
  const today = todayStr();
  if (today < ciclo.fechaInicio) return { label: "Planificado (futuro)", color: "#1E6FD9" };
  if (today > ciclo.fechaFin) return { label: "Finalizado", color: "#4A6680" };
  return { label: "En curso", color: "#F5C518" };
}

function TagPicker({ value, onChange }) {
  const selected = value || [];
  const toggle = (tag) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {EXERCISE_TYPES.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 20,
              cursor: "pointer",
              border: `1px solid ${active ? "#F5C518" : "#1A3050"}`,
              background: active ? "#F5C518" : "#0E1E35",
              color: active ? "#0E1210" : "#8BA4C0",
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function TagBadges({ tipos }) {
  if (!tipos || !tipos.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {tipos.map((t) => (
        <span
          key={t}
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#F5C518",
            border: "1px solid #F5C518",
            borderRadius: 20,
            padding: "1px 7px",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

const emptyDraft = { name: "", sets: 3, reps: 8, carga: "", rir: "", notas: "", videoUrl: "", gifId: null, tipos: [] };

function ExerciseBuilderBlock({ exercises, onAdd, onUpdate, onRemove, categoria, accentColor = "#F5C518", onScreenActive }) {
  const [exerciseLibrary, saveExerciseLibrary] = usePersistentList("exercise-library", true);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [screen, setScreen] = useState("list"); // "list" | "form" | "biblioteca"
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    onScreenActive?.(screen !== "list");
  }, [screen]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    const maxBytes = 1.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError(
        `Ese archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB — el máximo es 1,5 MB. Un GIF corto (2-3 segundos) y de pocos colores suele bastar; comprímelo con una herramienta como ezgif.com o similar.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      const id = await saveGifAsset(reader.result);
      setUploading(false);
      if (!id) {
        setFileError("No se pudo guardar el GIF. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
      setDraft((d) => ({ ...d, gifId: id, videoUrl: "" }));
    };
    reader.onerror = () => {
      setFileError("No se pudo leer el archivo. Inténtalo de nuevo.");
    };
    reader.readAsDataURL(file);
  };

  const pickFromLibrary = (item) => {
    setDraft({
      ...emptyDraft,
      name: item.name,
      notas: item.notas || "",
      videoUrl: item.videoUrl || "",
      gifId: item.gifId || null,
      tipos: item.tipos || [],
    });
    setScreen("form");
  };

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setDraft({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      carga: ex.carga,
      rir: ex.rir ?? "",
      notas: ex.notas || "",
      videoUrl: ex.videoUrl || "",
      gifId: ex.gifId || null,
      tipos: ex.tipos || [],
    });
    setScreen("form");
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setFileError("");
    setScreen("form");
  };

  const backToList = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setFileError("");
    setScreen("list");
  };

  const saveToLibrary = async (ex) => {
    const existingIdx = exerciseLibrary.findIndex((it) => it.name.toLowerCase() === ex.name.toLowerCase());
    const libItem = { name: ex.name, tipos: ex.tipos || [], videoUrl: ex.videoUrl || "", gifId: ex.gifId || null, notas: ex.notas || "" };
    if (existingIdx === -1) {
      await saveExerciseLibrary([...exerciseLibrary, libItem]);
    } else {
      await saveExerciseLibrary(exerciseLibrary.map((it, i) => (i === existingIdx ? libItem : it)));
    }
  };

  const handleAdd = async () => {
    if (!draft.name.trim()) return;
    if (editingId) {
      const updated = { id: editingId, ...draft, name: draft.name.trim(), categoria };
      onUpdate(editingId, updated);
      await saveToLibrary(updated);
    } else {
      const ex = { id: `e_${Date.now()}`, ...draft, name: draft.name.trim(), categoria };
      onAdd(ex);
      await saveToLibrary(ex);
    }
    backToList();
  };

  const filteredLibrary = exerciseLibrary.filter((item) => {
    const matchesSearch = !librarySearch.trim() || item.name.toLowerCase().includes(librarySearch.trim().toLowerCase());
    const matchesType = !libraryTypeFilter || (item.tipos || []).includes(libraryTypeFilter);
    return matchesSearch && matchesType;
  });

  // ─── Pantalla: Biblioteca ────────────────────────────────────────────────
  if (screen === "biblioteca") {
    return (
      <>
        <BackHeader title="Biblioteca" subtitle={`${exerciseLibrary.length} guardadas`} onBack={() => setScreen("form")} />
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          placeholder="Buscar en la biblioteca..."
          value={librarySearch}
          onChange={(e) => setLibrarySearch(e.target.value)}
        />
        <div style={miniLabel}>Tipo de tarea</div>
        <select
          value={libraryTypeFilter}
          onChange={(e) => setLibraryTypeFilter(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        >
          <option value="">Todos los tipos</option>
          {EXERCISE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {!filteredLibrary.length ? (
          <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            Ninguna tarea coincide con el filtro.
          </div>
        ) : (
          <>
            <div style={miniLabel}>Elegir tarea ({filteredLibrary.length})</div>
            <select
              value=""
              onChange={(e) => {
                const item = filteredLibrary.find((it) => it.name === e.target.value);
                if (item) pickFromLibrary(item);
              }}
              style={inputStyle}
            >
              <option value="" disabled>
                Toca para elegir...
              </option>
              {filteredLibrary.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                  {item.tipos?.length ? ` — ${item.tipos.join(", ")}` : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </>
    );
  }

  // ─── Pantalla: Nueva tarea / Editando tarea ─────────────────────────────
  if (screen === "form") {
    return (
      <>
        <BackHeader title={editingId ? "Editando tarea" : "Nueva tarea"} onBack={backToList} />
        {exerciseLibrary.length > 0 && !editingId && (
          <button
            type="button"
            onClick={() => setScreen("biblioteca")}
            style={{ ...primaryBtn, width: "100%", marginBottom: 14, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF" }}
          >
            Elegir desde la biblioteca ({exerciseLibrary.length})
          </button>
        )}
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Nombre de la tarea"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <div style={miniLabel}>Tipo de tarea</div>
        <div style={{ marginBottom: 8 }}>
          <TagPicker value={draft.tipos} onChange={(tipos) => setDraft({ ...draft, tipos })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={miniLabel}>Series</div>
            <input
              type="number"
              style={inputStyle}
              value={draft.sets}
              onChange={(e) => setDraft({ ...draft, sets: Number(e.target.value) })}
            />
          </div>
          <div>
            <div style={miniLabel}>Reps</div>
            <input
              type="number"
              style={inputStyle}
              value={draft.reps}
              onChange={(e) => setDraft({ ...draft, reps: Number(e.target.value) })}
            />
          </div>
          <div>
            <div style={miniLabel}>Carga (kg)</div>
            <input style={inputStyle} value={draft.carga} onChange={(e) => setDraft({ ...draft, carga: e.target.value })} />
          </div>
          <div>
            <div style={miniLabel}>RIR</div>
            <input style={inputStyle} value={draft.rir} onChange={(e) => setDraft({ ...draft, rir: e.target.value })} />
          </div>
        </div>
        {(() => {
          const w =
            numericWarning(draft.carga, { min: 0, label: "La carga" }) ||
            numericWarning(draft.rir, { min: 0, max: 10, label: "El RIR" });
          return w ? <div style={{ fontSize: 11, color: "#F5C518", marginBottom: 8 }}>{w}</div> : null;
        })()}
        <div style={miniLabel}>GIF del ejercicio (opcional, máx. 1,5 MB)</div>
        {draft.gifId ? (
          <div style={{ marginBottom: 8 }}>
            <VideoEmbed gifId={draft.gifId} />
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, gifId: null }))}
              style={{ ...iconBtnStyle, fontSize: 12, border: "1px solid #1A3050", borderRadius: 8, padding: "6px 10px", marginTop: 6 }}
            >
              Quitar GIF
            </button>
          </div>
        ) : (
          <input type="file" accept="image/gif,image/*" onChange={handleFileUpload} disabled={uploading} style={{ ...inputStyle, marginBottom: 8, padding: 8 }} />
        )}
        {uploading && <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 8 }}>Guardando GIF...</div>}
        {fileError && <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>{fileError}</div>}
        <input
          style={{ ...inputStyle, marginBottom: 14 }}
          placeholder="Notas (opcional)"
          value={draft.notas}
          onChange={(e) => setDraft({ ...draft, notas: e.target.value })}
        />
        <button onClick={handleAdd} style={{ ...primaryBtn, width: "100%" }}>
          {editingId ? "Guardar cambios" : "Guardar tarea"}
        </button>
      </>
    );
  }

  // ─── Pantalla: lista de tareas ───────────────────────────────────────────
  return (
    <>
      {exercises.map((ex) => (
        <div key={ex.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => startEdit(ex)}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
              <div style={{ fontSize: 13, color: "#8BA4C0", marginTop: 4 }}>
                {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
              </div>
              {ex.notas && <div style={{ fontSize: 12, color: "#4A6680", marginTop: 4 }}>{ex.notas}</div>}
              <TagBadges tipos={ex.tipos} />
              <VideoEmbed url={ex.videoUrl} gifId={ex.gifId} />
            </div>
            <Trash2
              size={16}
              onClick={() => onRemove(ex.id)}
              style={{ cursor: "pointer", color: "#8BA4C0", flexShrink: 0, marginLeft: 8 }}
            />
          </div>
        </div>
      ))}
      <button
        onClick={startNew}
        style={{ ...primaryBtn, width: "100%", marginBottom: 4 }}
      >
        <Plus size={16} style={{ marginRight: 6 }} />
        Añadir tarea
      </button>
    </>
  );
}

async function markHasPlayerData(prefix, id, date) {
  const key = `${prefix}:${id}:${date}`;
  try {
    const res = await window.storage.get(key, true);
    if (!res) return;
    const data = JSON.parse(res.value);
    if (!data.hasPlayerData) {
      await window.storage.set(key, JSON.stringify({ ...data, hasPlayerData: true }), true);
    }
  } catch {
    // no existing record yet; nothing to mark
  }
}

function normalizeTaskName(name) {
  return (name || "").trim().toLowerCase();
}

async function savePlayerLastValue(playerId, name, cargaReal, rirReal, date) {
  if (!playerId || !name) return;
  if ((cargaReal === "" || cargaReal == null) && (rirReal === "" || rirReal == null)) return;
  const key = `player-last-value:${playerId}:${normalizeTaskName(name)}`;
  try {
    await window.storage.set(key, JSON.stringify({ cargaReal, rirReal, date }), true);
  } catch {
    // best-effort; not critical if this fails
  }
}

async function loadPlayerLastValue(playerId, name) {
  if (!playerId || !name) return null;
  const key = `player-last-value:${playerId}:${normalizeTaskName(name)}`;
  try {
    const res = await window.storage.get(key, true);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}

async function checkHasPlayerData(prefix, id, dates) {
  const results = await Promise.all(
    dates.map(async (d) => {
      try {
        const res = await window.storage.get(`${prefix}:${id}:${d}`, true);
        if (!res) return false;
        const data = JSON.parse(res.value);
        return !!data.hasPlayerData;
      } catch {
        return false;
      }
    })
  );
  return results.some(Boolean);
}

async function checkHasPlayerDataMulti(prefix, ids, dates) {
  const results = await Promise.all(ids.map((id) => checkHasPlayerData(prefix, id, dates)));
  return results.some(Boolean);
}

// Cuenta cuántos jugadores (de una lista) marcaron como hechas TODAS las tareas de una sesión
// de equipo o preventiva, para una fecha concreta.
async function countCompletions(playerIds, date, exerciseIds, kind) {
  if (!exerciseIds.length || !playerIds.length) return { completed: 0, total: playerIds.length };
  let completed = 0;
  await Promise.all(
    playerIds.map(async (pid) => {
      try {
        const res = await window.storage.get(`session:${pid}:${date}`, true);
        if (!res) return;
        const data = JSON.parse(res.value);
        const doneMap = kind === "preventive" ? data.preventiveDone : data.teamDone;
        if (doneMap && exerciseIds.every((id) => doneMap[id])) completed++;
      } catch {
        // sin registro para este jugador en esta fecha
      }
    })
  );
  return { completed, total: playerIds.length };
}

// Para sesiones individuales (dirigidas a jugadores concretos): cuenta cuántos de esos jugadores
// marcaron como hecha una tarea con ese nombre ese día (las tareas individuales tienen ids propios
// por jugador, así que se compara por nombre).
async function countCompletionsIndividual(playerIds, date, exerciseNames) {
  if (!exerciseNames.length || !playerIds.length) return { completed: 0, total: playerIds.length };
  let completed = 0;
  await Promise.all(
    playerIds.map(async (pid) => {
      try {
        const res = await window.storage.get(`session:${pid}:${date}`, true);
        if (!res) return;
        const data = JSON.parse(res.value);
        const exs = data.exercises || [];
        const ok = exerciseNames.every((name) =>
          exs.some((e) => e.name === name && e.done)
        );
        if (ok) completed++;
      } catch {
        // sin registro para este jugador en esta fecha
      }
    })
  );
  return { completed, total: playerIds.length };
}

async function mergeAppendPersonalExercises(playerId, date, newExercises, mdTag) {
  const key = `session:${playerId}:${date}`;
  let existing = { exercises: [], completed: false };
  try {
    const res = await window.storage.get(key, true);
    if (res) existing = JSON.parse(res.value);
  } catch {
    // no existing record; start fresh
  }
  const toAppend = newExercises.map((ex) => ({
    ...ex,
    mdTag: mdTag || ex.mdTag,
    id: `${ex.id}_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }));
  const merged = { ...existing, exercises: [...(existing.exercises || []), ...toAppend] };
  return directSaveSession(key, merged);
}

async function saveGifAsset(dataUri) {
  // El GIF en sí (base64) es demasiado grande para una celda de Sheets, así que
  // se sube a Drive vía Apps Script y solo guardamos en la Sheet el enlace directo,
  // que es lo que loadGifAsset ya sabía leer y VideoEmbed ya sabía mostrar.
  try {
    const upload = await callBackend("uploadGif", { dataUri });
    if (!upload || upload.error || !upload.fileId) return null;
    const directUrl = `https://lh3.googleusercontent.com/d/${upload.fileId}`;
    const id = `gif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await window.storage.set(`gif-asset:${id}`, directUrl, true);
    return result ? id : null;
  } catch {
    return null;
  }
}

async function loadGifAsset(id) {
  try {
    const res = await window.storage.get(`gif-asset:${id}`, true);
    return res ? res.value : null;
  } catch {
    return null;
  }
}

async function exportBackup() {
  const listRes = await window.storage.list(undefined, true);
  const keys = listRes?.keys || [];
  const data = {};
  await Promise.all(
    keys.map(async (k) => {
      try {
        const res = await window.storage.get(k, true);
        if (res) data[k] = res.value;
      } catch {
        // clave sin poder leerse; se omite del backup
      }
    })
  );
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Sesiones de Fuerza",
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `copia-seguridad-sesiones-fuerza-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return keys.length;
}

async function directSaveSession(key, payload) {
  try {
    const result = await window.storage.set(key, JSON.stringify(payload), true);
    return !!result;
  } catch {
    return false;
  }
}

function CicloSummaryRow({ ciclo, onToggle, onDeleted }) {
  const [sesiones, saveSesiones] = usePersistentList(`ciclo-sesiones:${ciclo.id}`, true);
  const [sentLog, saveSentLog] = usePersistentList("team-session-index", true);
  const status = getCicloStatus(ciclo);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const eliminarPeriodo = async (e) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    setError("");
    const sentSesiones = sesiones.filter((s) => s.sent !== false);
    const allDatesBySesion = sentSesiones.map((s) => computeRecurrenceDates(reconstructRecurrence(s)));
    const allDates = allDatesBySesion.flat();
    for (const d of allDates) {
      try {
        await window.storage.delete(`team-session:squad:${d}`, true);
      } catch {
        // key may not exist; ignore
      }
    }
    await saveSentLog(sentLog.filter((l) => !allDates.includes(l.date)));
    await saveSesiones([]);
    setDeleting(false);
    onDeleted(ciclo.id);
  };

  return (
    <div onClick={onToggle} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{ciclo.nombre}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: status.color,
              border: `1px solid ${status.color}`,
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {status.label}
          </span>
          <Trash2
            size={15}
            onClick={eliminarPeriodo}
            style={{ cursor: "pointer", color: confirming ? "#EF4444" : "#8BA4C0", opacity: deleting ? 0.5 : 1 }}
          />
          <ChevronRight size={16} color="#8BA4C0" />
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>
        {fmtDateShort(ciclo.fechaInicio)} a {fmtDateShort(ciclo.fechaFin)} · {sesiones.length} {sesiones.length !== 1 ? "sesiones" : "sesión"} planificada
        {sesiones.length !== 1 ? "s" : ""}
      </div>
      {confirming && !error && (
        <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
          Toca la papelera otra vez para confirmar. Se eliminará el período y todas sus sesiones, incluidos los
          datos que hayan registrado los jugadores. No se puede deshacer.
        </div>
      )}
      {error && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function SesionUnicaSummaryRow({ entry, onOpen }) {
  const today = todayStr();
  const status =
    entry.date <= today ? { label: "Enviada", color: "#F5C518" } : { label: "Programada", color: "#1E6FD9" };
  return (
    <div onClick={() => onOpen(entry.date)} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{fmtDateLabel(entry.date)}</div>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>
            {entry.mdTag} {entry.objetivo ? `· ${entry.objetivo}` : ""} · {entry.exerciseCount} tarea{entry.exerciseCount !== 1 ? "s" : ""}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: status.color,
            border: `1px solid ${status.color}`,
            borderRadius: 20,
            padding: "2px 8px",
          }}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}

function SesionUnicaEditScreen({ date, players, onBack }) {
  const [session, saveSession, loaded] = useSession("squad", date, "team-session");
  const [objetivo, setObjetivo] = useState("");
  const [mdTag, setMdTag] = useState("MD");
  const [exercises, setExercises] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [checkedData, setCheckedData] = useState(false);
  const [sentLog, saveSentLog] = usePersistentList("team-session-index", true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [taskScreenActive, setTaskScreenActive] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setObjetivo(session?.objetivo || "");
    setMdTag(session?.mdTag || "MD");
    setExercises(session?.exercises || []);
    (async () => {
      const found = session?.sent ? await checkHasPlayerData("team-session", "squad", [date]) : false;
      setHasData(found);
      setCheckedData(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const guardarCambios = async () => {
    setSendError("");
    setSendOk(false);
    if (!exercises.length) {
      setSendError("Añade al menos una tarea antes de guardar.");
      return;
    }
    setSending(true);
    const ok = await directSaveSession(`team-session:squad:${date}`, {
      ...session,
      exercises,
      objetivo,
      mdTag,
      sent: true,
    });
    if (ok) {
      const nextLog = [...sentLog];
      const idx = nextLog.findIndex((l) => l.date === date && !l.individual);
      const entry = { date, objetivo, mdTag, cicloId: session?.cicloId || null, cicloNombre: null, exerciseCount: exercises.length, exercises };
      if (idx === -1) nextLog.push(entry);
      else nextLog[idx] = entry;
      await saveSentLog(nextLog);
      setSendOk(true);
    } else {
      setSendError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setSending(false);
  };

  if (!loaded || !checkedData) return <LoadingBlock />;

  return (
    <>
      <BackHeader title={fmtDateLabel(date)} subtitle="Sesión única" onBack={onBack} />
      {hasData ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Lock size={20} style={{ color: "#4A6680", marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "#8BA4C0" }}>
            Ya hay datos registrados por jugadores para este día — queda bloqueada para proteger ese historial.
          </div>
        </div>
      ) : (
        <>
          {!taskScreenActive && (
            <>
              <div style={miniLabel}>Objetivo de la sesión</div>
              <input
                style={{ ...inputStyle, marginBottom: 10 }}
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
              />
              <MDSelect value={mdTag} onChange={setMdTag} />
            </>
          )}
          <ExerciseBuilderBlock
            exercises={exercises}
            onAdd={(ex) => setExercises((prev) => [...prev, ex])}
            onUpdate={(id, updated) => setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)))}
            onRemove={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
            categoria="COLECTIVA"
            accentColor="#1E6FD9"
            onScreenActive={setTaskScreenActive}
          />
          {!taskScreenActive && (
            <>
              {sendError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>{sendError}</div>}
              {sendOk && <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>Cambios guardados.</div>}
              <button onClick={guardarCambios} disabled={sending} style={{ ...primaryBtn, width: "100%", opacity: sending ? 0.6 : 1 }}>
                {sending ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

function CiclosPlanificadosView({ ciclos, saveCiclos, players, expandedCicloId, onToggleCiclo, onOpenSesionUnica }) {
  const [sentLog] = usePersistentList("team-session-index", true);
  const today = todayStr();
  const sesionesUnicas = sentLog
    .filter((l) => !l.cicloId && !l.individual && l.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const eliminarDelListado = async (id) => {
    await saveCiclos(ciclos.filter((c) => c.id !== id));
    if (expandedCicloId === id) onToggleCiclo(id);
  };

  const [editingUnicaFecha, setEditingUnicaFecha] = useState(null);
  if (editingUnicaFecha) {
    return (
      <SesionUnicaEditScreen date={editingUnicaFecha} players={players} onBack={() => setEditingUnicaFecha(null)} />
    );
  }

  const activeCiclo = ciclos.find((c) => c.id === expandedCicloId) || null;

  if (activeCiclo) {
    return (
      <>
        <BackHeader title={activeCiclo.nombre} subtitle="Períodos" onBack={() => onToggleCiclo(expandedCicloId)} />
        <PlanificarCicloView
          ciclos={ciclos}
          saveCiclos={saveCiclos}
          players={players}
          initialCicloId={activeCiclo.id}
          lockCicloPicker
          allowCreate={false}
        />
      </>
    );
  }

  const statusGroups = [
    { key: "curso", label: "En curso" },
    { key: "futuro", label: "Programados" },
  ];
  const cicloBucket = (c) => {
    const s = getCicloStatus(c).label;
    if (s.startsWith("En curso")) return "curso";
    if (s.startsWith("Finalizada") || s.startsWith("Finalizado")) return "fin";
    return "futuro";
  };
  const periodosGrouped = statusGroups
    .map((g) => ({
      ...g,
      items: ciclos.filter((c) => cicloBucket(c) === g.key).sort((a, b) => (a.fechaInicio < b.fechaInicio ? -1 : 1)),
    }))
    .filter((g) => g.items.length);

  const sesionesGrouped = groupByMonth(sesionesUnicas, (e) => e.date);

  const renderCiclo = (c) => (
    <CicloSummaryRow key={c.id} ciclo={c} onToggle={() => onToggleCiclo(c.id)} onDeleted={eliminarDelListado} />
  );

  return (
    <>
      <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 2px 8px" }}>
        Períodos
      </div>
      {!ciclos.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "12px 0 20px" }}>
          Todavía no has planificado ningún período. Ve a "Crear período" para crear el primero.
        </div>
      ) : (
        periodosGrouped.map((g, idx) => (
          <Collapsible key={g.key} title={g.label} subtitle={`${g.items.length}`} defaultOpen={g.key !== "fin"}>
            <div className="fp-grid">{g.items.map(renderCiclo)}</div>
          </Collapsible>
        ))
      )}

      <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 2px 8px" }}>
        Sesiones únicas
      </div>
      {!sesionesUnicas.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
          Todavía no hay sesiones únicas programadas. Ve a "Sesión única" para crear la primera.
        </div>
      ) : (
        sesionesGrouped.map(([mKey, items], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${items.length}`} defaultOpen={idx === 0}>
            <div className="fp-grid">
              {items.map((entry) => (
                <SesionUnicaSummaryRow key={entry.date} entry={entry} onOpen={setEditingUnicaFecha} />
              ))}
            </div>
          </Collapsible>
        ))
      )}
    </>
  );
}

function reconstructRecurrence(s) {
  if (s.fecha) return { type: "unica", fecha: s.fecha };
  return { type: "semanal", dias: s.dias || [], fechaInicio: s.fechaInicio, fechaFin: s.fechaFin };
}

function CicloSessionRow({ s, players, onEdit, onDelete, onSend, sending }) {
  const [hasData, setHasData] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (s.sent === false) {
        if (!cancelled) {
          setChecked(true);
          setHasData(false);
        }
        return;
      }
      const dates = computeRecurrenceDates(reconstructRecurrence(s));
      const found =
        s.targetPlayerIds && s.targetPlayerIds.length
          ? await checkHasPlayerDataMulti("session", s.targetPlayerIds, dates)
          : await checkHasPlayerData("team-session", "squad", dates);
      if (!cancelled) {
        setHasData(found);
        setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [s.id, s.sent]);

  const today = todayStr();
  let statusLabel, statusColor;
  if (s.sent === false) {
    statusLabel = "Borrador · sin enviar";
    statusColor = "#8BA4C0";
  } else if (s.fecha) {
    statusLabel = s.fecha <= today ? "Enviada" : `Programada para ${fmtDateLabel(s.fecha)}`;
    statusColor = s.fecha <= today ? "#F5C518" : "#1E6FD9";
  } else if (today < s.fechaInicio) {
    statusLabel = `Programada · empieza ${s.fechaInicio}`;
    statusColor = "#1E6FD9";
  } else if (today > s.fechaFin) {
    statusLabel = "Finalizada";
    statusColor = "#4A6680";
  } else {
    statusLabel = "En curso · enviándose cada semana";
    statusColor = "#F5C518";
  }

  const diasLabel =
    s.dias && s.dias.length
      ? s.dias.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).filter(Boolean).join(", ")
      : s.fecha
      ? fmtDateLabel(s.fecha)
      : "";

  const isLegacy = !Array.isArray(s.exercises);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {s.mdTag} {s.objetivo ? `· ${s.objetivo}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4, textTransform: "capitalize" }}>{diasLabel}</div>
          <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>
            {s.targetPlayerIds && s.targetPlayerIds.length
              ? `Para: ${s.targetPlayerIds
                  .map((id) => players?.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}`
              : "Todo el equipo"}
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              fontSize: 11,
              fontWeight: 700,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {statusLabel}
          </span>
        </div>
        {checked && hasData && <Lock size={16} style={{ color: "#4A6680", flexShrink: 0 }} />}
      </div>

      <div style={{ fontSize: 12, color: "#4A6680", marginTop: 6 }}>
        {s.exercises?.length || 0} tarea{(s.exercises?.length || 0) !== 1 ? "s" : ""}
      </div>

      {checked && !hasData && !isLegacy && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onEdit(s)}
            style={{ ...iconBtnStyle, fontSize: 12, border: "1px solid #1A3050", borderRadius: 8, padding: "6px 10px" }}
          >
            Editar
          </button>
          {s.sent === false && (
            <button
              onClick={() => onSend(s)}
              disabled={sending}
              style={{ ...primaryBtn, flex: 1, padding: "6px 10px", opacity: sending ? 0.6 : 1 }}
            >
              <Send size={14} style={{ marginRight: 6 }} />
              Enviar
            </button>
          )}
          <Trash2
            size={16}
            onClick={() => onDelete(s)}
            style={{ cursor: "pointer", color: "#8BA4C0", alignSelf: "center" }}
          />
        </div>
      )}
      {checked && hasData && (
        <div style={{ fontSize: 11, color: "#4A6680", marginTop: 8 }}>
          Ya hay datos registrados por jugadores para esta sesión — queda bloqueada para proteger ese historial.
        </div>
      )}
      {checked && !hasData && isLegacy && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "#4A6680", marginBottom: 8 }}>
            Esta sesión se creó con una versión anterior de la app y no guardó las tareas completas, así que no
            se puede editar aquí. Puedes borrarla y crearla de nuevo.
          </div>
          <button
            onClick={() => onDelete(s)}
            style={{ ...iconBtnStyle, fontSize: 12, border: "1px solid #1A3050", borderRadius: 8, padding: "6px 10px" }}
          >
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function EditPeriodoBlock({ ciclo, ciclos, saveCiclos }) {
  const [nombre, setNombre] = useState(ciclo.nombre);
  const [fechaInicio, setFechaInicio] = useState(ciclo.fechaInicio);
  const [fechaFin, setFechaFin] = useState(ciclo.fechaFin);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [warning, setWarning] = useState("");
  const [confirmingShrink, setConfirmingShrink] = useState(false);
  const [cicloSesiones] = usePersistentList(`ciclo-sesiones:${ciclo.id}`, true);

  useEffect(() => {
    setNombre(ciclo.nombre);
    setFechaInicio(ciclo.fechaInicio);
    setFechaFin(ciclo.fechaFin);
    setOk(false);
    setError("");
    setWarning("");
    setConfirmingShrink(false);
  }, [ciclo.id]);

  const sesionesFueraDeRango = (nuevoInicio, nuevoFin) => {
    return cicloSesiones.filter((s) => {
      const dates = computeRecurrenceDates(reconstructRecurrence(s));
      return dates.some((d) => d < nuevoInicio || d > nuevoFin);
    });
  };

  const guardar = async () => {
    setError("");
    setOk(false);
    setWarning("");
    if (!nombre.trim() || !fechaInicio || !fechaFin) {
      setError("Completa el nombre y las dos fechas.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError('La fecha "Hasta" no puede ser anterior a "Desde".');
      return;
    }
    if (!confirmingShrink) {
      const afectadas = sesionesFueraDeRango(fechaInicio, fechaFin);
      if (afectadas.length) {
        setWarning(
          `${afectadas.length} sesión${afectadas.length !== 1 ? "es" : ""} de este período (${afectadas
            .map((s) => s.mdTag)
            .join(", ")}) tiene${afectadas.length !== 1 ? "n" : ""} fechas fuera del nuevo rango. No se moverán ni se borrarán, pero quedarán fuera del período. Toca "Guardar" otra vez para confirmar.`
        );
        setConfirmingShrink(true);
        return;
      }
    }
    const updated = ciclos.map((c) =>
      c.id === ciclo.id ? { ...c, nombre: nombre.trim(), fechaInicio, fechaFin } : c
    );
    const result = await saveCiclos(updated);
    if (result === false) {
      setError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    setOk(true);
    setConfirmingShrink(false);
    setWarning("");
  };

  return (
    <Collapsible title="Editar período" subtitle={`${fmtDateShort(fechaInicio)} a ${fmtDateShort(fechaFin)}`}>
      <div style={{ fontSize: 11, color: "#4A6680", marginBottom: 10 }}>
        Cambiar las fechas aquí actualiza el período en sí. Las sesiones que ya creaste con repetición semanal
        conservan el rango que tenían al guardarlas — si quieres que usen el nuevo rango, edítalas y guárdalas de
        nuevo.
      </div>
      <div style={miniLabel}>Nombre del período</div>
      <input style={{ ...inputStyle, marginBottom: 10 }} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
          <div style={miniLabel}>Desde</div>
          <input
            type="date"
            style={dateInputStyle}
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              setConfirmingShrink(false);
              setWarning("");
            }}
          />
        </div>
        <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
          <div style={miniLabel}>Hasta</div>
          <input
            type="date"
            style={dateInputStyle}
            value={fechaFin}
            onChange={(e) => {
              setFechaFin(e.target.value);
              setConfirmingShrink(false);
              setWarning("");
            }}
          />
        </div>
      </div>
      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {warning && <div style={{ color: "#F5C518", fontSize: 12, marginBottom: 10 }}>{warning}</div>}
      {ok && <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10 }}>Cambios guardados.</div>}
      <button onClick={guardar} style={{ ...primaryBtn, width: "100%" }}>
        {confirmingShrink ? "Confirmar y guardar" : "Guardar cambios del período"}
      </button>
    </Collapsible>
  );
}

function PlanificarCicloView({ ciclos, saveCiclos, players, initialCicloId, lockCicloPicker, showSessionsList = true, allowCreate = true, onTaskScreenChange }) {
  const [cicloId, setCicloId] = useState(initialCicloId || "");
  const [editingId, setEditingId] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [mdTag, setMdTag] = useState("MD");
  const [recurrence, setRecurrence] = useState({ type: "unica", fecha: todayStr() });
  const [targetPlayerIds, setTargetPlayerIds] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sentLog, saveSentLog] = usePersistentList("team-session-index", true);
  const [cicloSesiones, saveCicloSesiones] = usePersistentList(
    cicloId ? `ciclo-sesiones:${cicloId}` : "ciclo-sesiones:none",
    true
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [taskScreenActive, setTaskScreenActive] = useState(false);

  const ciclo = ciclos.find((c) => c.id === cicloId) || null;

  const resetForm = () => {
    setEditingId(null);
    setCreatingNew(false);
    setObjetivo("");
    setMdTag("MD");
    setRecurrence({ type: "unica", fecha: ciclo?.fechaInicio || todayStr() });
    setTargetPlayerIds(null);
    setExercises([]);
  };

  // Tras guardar una sesión nueva, mantenemos fecha/MD/destinatarios: lo habitual es planificar
  // varias sesiones seguidas del mismo período, y volver a teclear todo cada vez era una fricción real.
  const resetFormKeepContext = () => {
    setEditingId(null);
    setObjetivo("");
    setExercises([]);
  };

  const editarSesion = (s) => {
    setEditingId(s.id);
    setCreatingNew(false);
    setObjetivo(s.objetivo || "");
    setMdTag(s.mdTag || "MD");
    setRecurrence(reconstructRecurrence(s));
    setTargetPlayerIds(s.targetPlayerIds || null);
    setExercises(s.exercises || []);
    setSendError("");
    setSendOk(false);
  };

  const eliminarSesion = async (s) => {
    if (s.sent) {
      const dates = computeRecurrenceDates(reconstructRecurrence(s));
      if (s.targetPlayerIds && s.targetPlayerIds.length) {
        // Sesiones ya enviadas a jugadores concretos no se limpian automáticamente
        // (podrían compartir el registro con otras tareas de ese jugador).
      } else {
        for (const d of dates) {
          try {
            await window.storage.delete(`team-session:squad:${d}`, true);
          } catch {
            // key may not exist; ignore
          }
        }
        await saveSentLog(sentLog.filter((l) => !dates.includes(l.date)));
      }
    }
    await saveCicloSesiones(cicloSesiones.filter((x) => x.id !== s.id));
    if (editingId === s.id) resetForm();
  };

  const pushToDates = async (entry) => {
    const dates = computeRecurrenceDates(reconstructRecurrence(entry));
    if (!dates.length) return { ok: false, reason: "sin-fechas" };
    let allOk = true;
    if (entry.targetPlayerIds && entry.targetPlayerIds.length) {
      for (const d of dates) {
        for (const pid of entry.targetPlayerIds) {
          const ok = await mergeAppendPersonalExercises(pid, d, entry.exercises, entry.mdTag);
          if (!ok) allOk = false;
        }
      }
      const names = entry.targetPlayerIds.map((id) => players?.find((p) => p.id === id)?.name).filter(Boolean);
      const nextLog = [...sentLog];
      dates.forEach((d) => {
        const idx = nextLog.findIndex((l) => l.date === d && l.individual && l.cicloId === cicloId);
        const logEntry = {
          date: d,
          objetivo: entry.objetivo,
          mdTag: entry.mdTag,
          cicloId,
          cicloNombre: ciclo.nombre,
          exerciseCount: entry.exercises.length,
          individual: true,
          targetNames: names,
          exercises: entry.exercises,
        };
        if (idx === -1) nextLog.push(logEntry);
        else nextLog[idx] = logEntry;
      });
      await saveSentLog(nextLog);
      return { ok: allOk };
    }
    for (const d of dates) {
      const ok = await directSaveSession(`team-session:squad:${d}`, {
        exercises: entry.exercises,
        objetivo: entry.objetivo,
        mdTag: entry.mdTag,
        cicloId,
        completed: false,
        preventiveDone: {},
        sent: true,
      });
      if (!ok) allOk = false;
    }
    const nextLog = [...sentLog];
    dates.forEach((d) => {
      const idx = nextLog.findIndex((l) => l.date === d && !l.individual);
      const logEntry = {
        date: d,
        objetivo: entry.objetivo,
        mdTag: entry.mdTag,
        cicloId,
        cicloNombre: ciclo.nombre,
        exerciseCount: entry.exercises.length,
        exercises: entry.exercises,
      };
      if (idx === -1) nextLog.push(logEntry);
      else nextLog[idx] = logEntry;
    });
    await saveSentLog(nextLog);
    return { ok: allOk };
  };

  const guardarBorrador = async () => {
    setSendError("");
    setSendOk(false);
    if (!ciclo) {
      setSendError("Selecciona o crea un período primero.");
      return;
    }
    const dates = computeRecurrenceDates(recurrence);
    if (!dates.length) {
      setSendError("No hay fechas válidas dentro del período para esta configuración.");
      return;
    }
    if (!exercises.length) {
      setSendError("Añade al menos una tarea antes de guardar.");
      return;
    }
    if (targetPlayerIds !== null && targetPlayerIds !== undefined && !targetPlayerIds.length) {
      setSendError("Selecciona al menos un jugador en Destinatarios, o cambia a 'Todo el equipo'.");
      return;
    }
    const entryBase = {
      objetivo,
      mdTag,
      dias: recurrence.type === "semanal" ? recurrence.dias : null,
      fecha: recurrence.type === "unica" ? recurrence.fecha : null,
      fechaInicio: recurrence.type === "semanal" ? ciclo.fechaInicio : null,
      fechaFin: recurrence.type === "semanal" ? ciclo.fechaFin : null,
      targetPlayerIds: targetPlayerIds && targetPlayerIds.length ? targetPlayerIds : null,
      exercises,
    };

    setSending(true);
    if (editingId) {
      const existing = cicloSesiones.find((s) => s.id === editingId);
      const updated = { ...existing, ...entryBase };
      let result = { ok: true };
      if (existing.sent) {
        result = await pushToDates(updated);
      }
      await saveCicloSesiones(cicloSesiones.map((s) => (s.id === editingId ? updated : s)));
      setSending(false);
      if (result.ok) {
        setSendOk(true);
        resetForm();
      } else {
        setSendError("No se pudieron actualizar todas las fechas. Comprueba tu conexión.");
      }
    } else {
      const newEntry = { id: `cs_${Date.now()}`, sent: false, ...entryBase };
      await saveCicloSesiones([...cicloSesiones, newEntry]);
      setSending(false);
      setSendOk(true);
      resetFormKeepContext();
    }
  };

  const enviarSesion = async (s) => {
    setSending(true);
    const result = await pushToDates(s);
    if (result.ok) {
      await saveCicloSesiones(cicloSesiones.map((x) => (x.id === s.id ? { ...x, sent: true } : x)));
    } else {
      setSendError("No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setSending(false);
  };

  if (ciclo && (editingId || creatingNew || !showSessionsList)) {
    return (
      <>
        {!taskScreenActive && (
          <>
            {showSessionsList && (
              <BackHeader
                title={editingId ? "Editando sesión" : "Nueva sesión"}
                subtitle={ciclo.nombre}
                onBack={resetForm}
              />
            )}
            <div style={{ fontSize: 11, color: "#4A6680", marginBottom: 10 }}>
              {showSessionsList
                ? 'Guardar deja la sesión como borrador, sin que los jugadores la vean. Tú decides cuándo tocar "Enviar". Si ya la enviaste y aún no hay datos registrados por jugadores, puedes seguir editándola.'
                : `Diseña una sesión para "${ciclo.nombre}". Puedes guardar varias seguidas. Para modificarlas más tarde, ve a "Ver y modificar".`}
            </div>
            <div style={miniLabel}>Objetivo de la sesión</div>
            <input
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="Ej. Activación general + fuerza tren inferior"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
            />
            <MDSelect value={mdTag} onChange={setMdTag} />
            <div style={{ marginBottom: 10 }}>
              <div style={miniLabel}>Destinatarios</div>
              <RecipientPicker players={players} targetPlayerIds={targetPlayerIds} onChange={setTargetPlayerIds} />
            </div>
            <div style={miniLabel}>{ciclo.nombre}</div>
            <RecurrencePicker recurrence={recurrence} onChange={setRecurrence} ciclo={ciclo} />
          </>
        )}

        <ExerciseBuilderBlock
          exercises={exercises}
          onAdd={(ex) => setExercises((prev) => [...prev, ex])}
          onUpdate={(id, updated) => setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)))}
          onRemove={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
          categoria="COLECTIVA"
          accentColor="#1E6FD9"
          onScreenActive={(active) => {
            setTaskScreenActive(active);
            onTaskScreenChange?.(active);
          }}
        />

        {!taskScreenActive && (
          <>
            {sendError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>{sendError}</div>}
            {sendOk && (
              <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>
                {editingId ? "Cambios guardados." : "Sesión guardada como borrador."}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <button
                onClick={resetForm}
                style={{ ...primaryBtn, flex: 1, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF" }}
              >
                {showSessionsList ? "Cancelar" : "Limpiar"}
              </button>
              <button
                onClick={guardarBorrador}
                disabled={sending}
                style={{ ...primaryBtn, flex: 2, opacity: sending ? 0.6 : 1 }}
              >
                {sending ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar borrador"}
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {!lockCicloPicker && (
        <Collapsible title="Período" defaultOpen>
          <CyclePicker ciclos={ciclos} saveCiclos={saveCiclos} value={cicloId} onChange={setCicloId} />
        </Collapsible>
      )}
      {lockCicloPicker && ciclo && <EditPeriodoBlock ciclo={ciclo} ciclos={ciclos} saveCiclos={saveCiclos} />}

      {!ciclo ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Selecciona o crea un período para empezar a planificar sesiones dentro de él.
        </div>
      ) : (
        <>
          {showSessionsList && (
            <Collapsible title={`Sesiones planificadas en ${ciclo.nombre}`} subtitle={`${cicloSesiones.length} registradas`} defaultOpen>
              {!cicloSesiones.length ? (
                <div style={{ color: "#8BA4C0", fontSize: 13 }}>Todavía no hay sesiones planificadas en este período.</div>
              ) : (
                <div className="fp-grid">
                  {cicloSesiones.map((s) => (
                    <CicloSessionRow
                      key={s.id}
                      s={s}
                      players={players}
                      onEdit={editarSesion}
                      onDelete={eliminarSesion}
                      onSend={enviarSesion}
                      sending={sending}
                    />
                  ))}
                </div>
              )}
            </Collapsible>
          )}

          {!allowCreate && (
            <button
              onClick={() => setCreatingNew(true)}
              style={{ ...primaryBtn, width: "100%", marginBottom: 16, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF" }}
            >
              <Plus size={16} style={{ marginRight: 6 }} />
              Añadir sesión a este período
            </button>
          )}
        </>
      )}
    </>
  );
}

function SesionUnicaView({ players, initialFecha }) {
  const [objetivo, setObjetivo] = useState("");
  const [mdTag, setMdTag] = useState("MD");
  const [fecha, setFecha] = useState(initialFecha || todayStr());
  const [targetPlayerIds, setTargetPlayerIds] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sentLog, saveSentLog] = usePersistentList("team-session-index", true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [checkedExisting, setCheckedExisting] = useState(false);
  const [taskScreenActive, setTaskScreenActive] = useState(false);

  const isTargeted = targetPlayerIds !== null && targetPlayerIds !== undefined;
  const today = todayStr();

  useEffect(() => {
    setSendError("");
    setSendOk(false);
    setCheckedExisting(false);
    (async () => {
      try {
        const res = await window.storage.get(`team-session:squad:${fecha}`, true);
        const data = res ? JSON.parse(res.value) : null;
        setAlreadyExists(!!(data && data.exercises?.length));
      } catch {
        setAlreadyExists(false);
      }
      setCheckedExisting(true);
    })();
  }, [fecha]);

  const guardar = async (sendNow) => {
    setSendError("");
    setSendOk(false);
    if (!exercises.length) {
      setSendError("Añade al menos una tarea antes de guardar.");
      return;
    }
    if (isTargeted && (!targetPlayerIds || !targetPlayerIds.length)) {
      setSendError("Selecciona al menos un jugador en Destinatarios.");
      return;
    }
    setSending(true);
    if (isTargeted) {
      let allOk = true;
      for (const pid of targetPlayerIds) {
        const ok = await mergeAppendPersonalExercises(pid, fecha, exercises, mdTag);
        if (!ok) allOk = false;
      }
      if (allOk) {
        const names = targetPlayerIds.map((id) => players?.find((p) => p.id === id)?.name).filter(Boolean);
        const nextLog = [...sentLog];
        const idx = nextLog.findIndex((l) => l.date === fecha && l.individual && !l.cicloId);
        const entry = {
          date: fecha,
          objetivo,
          mdTag,
          cicloId: null,
          cicloNombre: null,
          exerciseCount: exercises.length,
          individual: true,
          targetNames: names,
          exercises,
        };
        if (idx === -1) nextLog.push(entry);
        else nextLog[idx] = entry;
        await saveSentLog(nextLog);
      }
      setSending(false);
      if (allOk) {
        setSendOk(true);
        setExercises([]);
        setObjetivo("");
      } else {
        setSendError("No se pudo guardar para todos los jugadores. Comprueba tu conexión.");
      }
      return;
    }
    const key = `team-session:squad:${fecha}`;
    const ok = await directSaveSession(key, {
      exercises,
      objetivo,
      mdTag,
      cicloId: null,
      completed: false,
      preventiveDone: {},
      sent: sendNow,
    });
    if (ok) {
      if (sendNow) {
        const nextLog = [...sentLog];
        const idx = nextLog.findIndex((l) => l.date === fecha);
        const entry = { date: fecha, objetivo, mdTag, cicloId: null, cicloNombre: null, exerciseCount: exercises.length, exercises };
        if (idx === -1) nextLog.push(entry);
        else nextLog[idx] = entry;
        await saveSentLog(nextLog);
      }
      setSendOk(true);
      setAlreadyExists(true);
    } else {
      setSendError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setSending(false);
  };

  return (
    <>
      {!taskScreenActive && (
        <>
          <div style={{ fontSize: 11, color: "#4A6680", marginBottom: 10 }}>
            Esto es solo para planificar una sesión rápida y nueva. Para modificar una ya existente, ve a
            "Ver y modificar".
          </div>
          <Collapsible title="Objetivo, MD y fecha" defaultOpen>
            <div style={miniLabel}>Objetivo de la sesión</div>
            <input
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="Ej. Activación general + fuerza tren inferior"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
            />
            <MDSelect value={mdTag} onChange={setMdTag} />
            <div style={{ marginBottom: 10 }}>
              <div style={miniLabel}>Destinatarios</div>
              <RecipientPicker players={players} targetPlayerIds={targetPlayerIds} onChange={setTargetPlayerIds} />
            </div>
            <div style={miniLabel}>Fecha</div>
            <input type="date" style={dateInputStyle} min={today} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Collapsible>
        </>
      )}

      {!checkedExisting ? (
        <LoadingBlock />
      ) : !isTargeted && alreadyExists ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Lock size={20} style={{ color: "#4A6680", marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "#8BA4C0" }}>
            Ya existe una sesión para {fmtDateLabel(fecha)}. Para modificarla, ve a "Ver y modificar". Elige otra
            fecha para planificar algo nuevo aquí.
          </div>
        </div>
      ) : (
        <>
          <ExerciseBuilderBlock
            exercises={exercises}
            onAdd={(ex) => setExercises((prev) => [...prev, ex])}
            onUpdate={(id, updated) => setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)))}
            onRemove={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
            categoria="COLECTIVA"
            accentColor="#1E6FD9"
            onScreenActive={setTaskScreenActive}
          />

          {!taskScreenActive && (
            <>
              {sendError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>{sendError}</div>}
              {sendOk && (
                <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>
                  {isTargeted ? "Enviada a los jugadores seleccionados." : `Enviada a los jugadores para ${fmtDateLabel(fecha)}.`}
                </div>
              )}
              {isTargeted ? (
                <button
                  onClick={() => guardar(true)}
                  disabled={sending}
                  style={{ ...primaryBtn, width: "100%", marginBottom: 16, opacity: sending ? 0.6 : 1 }}
                >
                  <Send size={14} style={{ marginRight: 6 }} />
                  {sending ? "Enviando..." : "Enviar a jugadores seleccionados"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button
                    onClick={() => guardar(false)}
                    disabled={sending}
                    style={{ ...primaryBtn, flex: 1, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF", opacity: sending ? 0.6 : 1 }}
                  >
                    Guardar borrador
                  </button>
                  <button onClick={() => guardar(true)} disabled={sending} style={{ ...primaryBtn, flex: 1, opacity: sending ? 0.6 : 1 }}>
                    <Send size={14} style={{ marginRight: 6 }} />
                    Enviar ahora
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

function PlanificarPeriodoView({ ciclos, saveCiclos, players }) {
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState("");
  const [nuevoCicloId, setNuevoCicloId] = useState(null);
  const [taskScreenActive, setTaskScreenActive] = useState(false);

  const crear = async () => {
    setError("");
    if (!nombre.trim() || !fechaInicio || !fechaFin) {
      setError("Completa el nombre y las dos fechas.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError('La fecha "Hasta" no puede ser anterior a "Desde".');
      return;
    }
    const id = `c_${Date.now()}`;
    const ok = await saveCiclos([...ciclos, { id, nombre: nombre.trim(), fechaInicio, fechaFin }]);
    if (ok === false) {
      setError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    setNuevoCicloId(id);
  };

  if (nuevoCicloId) {
    return (
      <>
        {!taskScreenActive && (
          <div style={{ ...cardStyle, background: "#0E1E35" }}>
            <div style={{ fontSize: 13, color: "#F5C518", fontWeight: 700, marginBottom: 4 }}>Período creado ✓</div>
            <div style={{ fontSize: 12, color: "#8BA4C0" }}>
              Diseña ahora su primera sesión. Cuando termines, puedes crear otro período o ir a "Ver y modificar" para
              revisar o modificar lo que has creado.
            </div>
            <button
              onClick={() => {
                setNuevoCicloId(null);
                setNombre("");
                setFechaInicio("");
                setFechaFin("");
                setError("");
              }}
              style={{ ...primaryBtn, width: "100%", marginTop: 10, background: "#060D1A", border: "1px solid #1A3050", color: "#F0F4FF" }}
            >
              Crear otro período distinto
            </button>
          </div>
        )}
        <PlanificarCicloView
          ciclos={ciclos}
          saveCiclos={saveCiclos}
          players={players}
          initialCicloId={nuevoCicloId}
          lockCicloPicker
          showSessionsList={false}
          onTaskScreenChange={setTaskScreenActive}
        />
      </>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Crear nuevo período
      </div>
      <div style={miniLabel}>Nombre del período</div>
      <input
        style={{ ...inputStyle, marginBottom: 10 }}
        placeholder="Ej. Pretemporada"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
          <div style={miniLabel}>Desde</div>
          <input type="date" style={dateInputStyle} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div style={{ width: "calc(50% - 4px)", overflow: "hidden" }}>
          <div style={miniLabel}>Hasta</div>
          <input type="date" style={dateInputStyle} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
      </div>
      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <button onClick={crear} style={{ ...primaryBtn, width: "100%" }}>
        Crear período y diseñar su primera sesión
      </button>
    </div>
  );
}

function TeamSessionManager({ ciclos, saveCiclos, players, injuryGroups }) {
  const [subView, setSubView] = useState("ciclos");
  const [expandedCicloId, setExpandedCicloId] = useState(null);
  const [sesionUnicaFecha, setSesionUnicaFecha] = useState(null);

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#0E1E35", borderRadius: 10, padding: 4 }}>
        {[
          { id: "ciclos", label: "Ver y modificar" },
          { id: "planificar-ciclo", label: "Crear período" },
          { id: "sesion-unica", label: "Sesión única" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubView(t.id)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 11,
              background: subView === t.id ? "#1E6FD9" : "transparent",
              color: subView === t.id ? "#060D1A" : "#8BA4C0",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subView === "ciclos" && (
        <CiclosPlanificadosView
          ciclos={ciclos}
          saveCiclos={saveCiclos}
          players={players}
          expandedCicloId={expandedCicloId}
          onToggleCiclo={(id) => setExpandedCicloId((cur) => (cur === id ? null : id))}
          onOpenSesionUnica={(fecha) => {
            setSesionUnicaFecha(fecha);
            setSubView("sesion-unica");
          }}
        />
      )}
      {subView === "planificar-ciclo" && <PlanificarPeriodoView ciclos={ciclos} saveCiclos={saveCiclos} players={players} />}
      {subView === "sesion-unica" && <SesionUnicaView players={players} initialFecha={sesionUnicaFecha} />}
    </>
  );
}

function GroupListRow({ group, memberCount, onOpen, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div onClick={onOpen} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{group.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#8BA4C0" }}>
            {memberCount} jugador{memberCount !== 1 ? "es" : ""}
          </span>
          <Trash2
            size={15}
            onClick={(e) => {
              e.stopPropagation();
              if (!confirming) {
                setConfirming(true);
                return;
              }
              onDelete();
            }}
            style={{ cursor: "pointer", color: confirming ? "#EF4444" : "#8BA4C0" }}
          />
          <ChevronRight size={16} color="#8BA4C0" />
        </div>
      </div>
      {confirming && (
        <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
          Toca la papelera otra vez para confirmar que quieres eliminar "{group.name}".
        </div>
      )}
    </div>
  );
}

function InjuryGroupManager({ injuryGroups, saveInjuryGroups, players, savePlayers, ciclos, saveCiclos }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [objetivo, setObjetivo] = useState("");
  const [mdTag, setMdTag] = useState("MD");
  const [cicloId, setCicloId] = useState("");
  const [recurrence, setRecurrence] = useState({ type: "unica", fecha: todayStr() });
  const [exercises, setExercises] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [taskScreenActive, setTaskScreenActive] = useState(false);

  const refDate = recurrence.type === "unica" ? recurrence.fecha : null;
  const [existingSession, , existingLoaded] = useSession(activeGroup && refDate ? activeGroup : null, refDate, "preventive");
  const [sentLog, saveSentLog] = usePersistentList(activeGroup ? `group-session-index:${activeGroup}` : "group-session-index:none", true);

  useEffect(() => {
    if (recurrence.type !== "unica") return;
    setSendError("");
    setSendOk(false);
    if (existingLoaded && existingSession) {
      if (existingSession.exercises?.length) {
        setExercises(existingSession.exercises || []);
        setObjetivo(existingSession.objetivo || "");
        setMdTag(existingSession.mdTag || "MD");
        setCicloId(existingSession.cicloId || "");
      }
      setIsSent(!!existingSession.sent);
      (async () => {
        const found = existingSession.sent && activeGroup && refDate ? await checkHasPlayerData("preventive", activeGroup, [refDate]) : false;
        setHasData(found);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, refDate, existingLoaded]);

  const addGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = `g_${Date.now()}`;
    await saveInjuryGroups([...injuryGroups, { id, name }]);
    setNewGroupName("");
    setActiveGroup(id);
  };

  const removeGroup = async (id) => {
    await saveInjuryGroups(injuryGroups.filter((g) => g.id !== id));
    await savePlayers(players.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)));
    if (activeGroup === id) setActiveGroup(null);
  };

  const guardar = async (sendNow) => {
    setSendError("");
    setSendOk(false);
    if (!activeGroup) return;
    const dates = computeRecurrenceDates(recurrence);
    if (!dates.length) {
      setSendError("No hay fechas válidas. Revisa la fecha o el rango de repetición.");
      return;
    }
    if (!exercises.length) {
      setSendError("Añade al menos una tarea antes de guardar.");
      return;
    }
    setSending(true);
    const cicloNombre = ciclos.find((c) => c.id === cicloId)?.nombre || null;
    const willSend = sendNow || isSent;
    let allOk = true;
    for (const d of dates) {
      const key = `preventive:${activeGroup}:${d}`;
      const ok = await directSaveSession(key, {
        exercises,
        objetivo,
        mdTag,
        cicloId: cicloId || null,
        completed: false,
        preventiveDone: {},
        sent: willSend,
      });
      if (!ok) allOk = false;
    }
    if (willSend) {
      const nextLog = [...sentLog];
      dates.forEach((d) => {
        const idx = nextLog.findIndex((l) => l.date === d);
        const entry = { date: d, objetivo, mdTag, cicloId: cicloId || null, cicloNombre, exerciseCount: exercises.length, exercises };
        if (idx === -1) nextLog.push(entry);
        else nextLog[idx] = entry;
      });
      await saveSentLog(nextLog);
      setIsSent(true);
    }
    setSending(false);
    if (allOk) setSendOk(true);
    else setSendError("Algunas fechas no se pudieron guardar. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const membersOfActiveGroup = players.filter((p) => p.groupId === activeGroup);
  const activeGroupObj = injuryGroups.find((g) => g.id === activeGroup);

  if (activeGroupObj) {
    return (
      <>
        <BackHeader title={activeGroupObj.name} subtitle="Preventivos" onBack={() => setActiveGroup(null)} />

        {!taskScreenActive && (
          <>
            <Collapsible title="Jugadores en este grupo" subtitle={`${membersOfActiveGroup.length} asignados`} defaultOpen>
              {!membersOfActiveGroup.length ? (
                <div style={{ color: "#8BA4C0", fontSize: 13 }}>
                  Ninguno todavía. Asígnalos desde "Jugadores en plantilla", en la vista de Jugadores.
                </div>
              ) : (
                <div style={{ border: "1px solid #1A3050", borderRadius: 8, overflow: "hidden" }}>
                  {membersOfActiveGroup.map((p, i) => (
                    <div
                      key={p.id}
                      style={{
                        padding: "10px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#F0F4FF",
                        borderBottom: i < membersOfActiveGroup.length - 1 ? "1px solid #060D1A" : "none",
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </Collapsible>

            <div style={miniLabel}>Objetivo del trabajo preventivo</div>
            <input
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="Ej. Prevención isquiotibiales tras recaída"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
            />
            <MDSelect value={mdTag} onChange={setMdTag} />
            <CyclePicker ciclos={ciclos} saveCiclos={saveCiclos} value={cicloId} onChange={setCicloId} />

            <div style={miniLabel}>¿Cuándo se aplica?</div>
            <RecurrencePicker recurrence={recurrence} onChange={setRecurrence} ciclo={ciclos.find((c) => c.id === cicloId) || null} />
          </>
        )}

        {hasData ? (
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <Lock size={20} style={{ color: "#4A6680", marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: "#8BA4C0" }}>
              Ya hay datos registrados por jugadores para esta fecha — queda bloqueada para proteger ese
              historial. Elige otra fecha para planificar algo nuevo.
            </div>
          </div>
        ) : (
          <>
            <ExerciseBuilderBlock
              exercises={exercises}
              onAdd={(ex) => setExercises((prev) => [...prev, ex])}
              onUpdate={(id, updated) => setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)))}
              onRemove={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
              categoria="PREVENTIVA"
              accentColor="#EF4444"
              onScreenActive={setTaskScreenActive}
            />

            {!taskScreenActive && (
              <>
                {sendError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>{sendError}</div>}
                {sendOk && (
                  <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>
                    {isSent ? "Enviado al grupo." : "Guardado como borrador."}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button
                    onClick={() => guardar(false)}
                    disabled={sending}
                    style={{
                      ...primaryBtn,
                      flex: 1,
                      background: "#0E1E35",
                      border: "1px solid #1A3050",
                      color: "#F0F4FF",
                      opacity: sending ? 0.6 : 1,
                    }}
                  >
                    {isSent ? "Guardar cambios" : "Guardar borrador"}
                  </button>
                  <button
                    onClick={() => guardar(true)}
                    disabled={sending}
                    style={{ ...primaryBtn, flex: 1, opacity: sending ? 0.6 : 1 }}
                  >
                    <Send size={14} style={{ marginRight: 6 }} />
                    {isSent ? "Actualizar envío" : "Enviar al grupo"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {!taskScreenActive && (
          <div style={{ fontSize: 11, color: "#4A6680", marginTop: 4 }}>
            El trabajo ya enviado a este grupo se consulta desde "Historial", en Diseño de sesiones.
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Preventivos
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={inputStyle}
            placeholder="Nombre del grupo (ej. Isquiotibiales)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
          />
          <button onClick={addGroup} style={{ ...primaryBtn, padding: "0 14px" }}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      {!injuryGroups.length && (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Crea un grupo preventivo para empezar a asignar trabajo compartido.
        </div>
      )}

      <div className="fp-grid">
        {injuryGroups.map((g) => (
          <GroupListRow
            key={g.id}
            group={g}
            memberCount={players.filter((p) => p.groupId === g.id).length}
            onOpen={() => setActiveGroup(g.id)}
            onDelete={() => removeGroup(g.id)}
          />
        ))}
      </div>
    </>
  );
}

function PlayerHistoryScreen({ player, onBack }) {
  const [summaries] = useSessionSummaries(player.id, "");
  return (
    <>
      <BackHeader title={player.name} subtitle="Historial" onBack={onBack} />
      <HistoryPanel summaries={summaries} playerId={player.id} scope="general" players={[player]} />
    </>
  );
}

function CompletionBadge({ playerIds, date, exerciseIds, kind }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fn = kind === "individual" ? countCompletionsIndividual(playerIds, date, exerciseIds) : countCompletions(playerIds, date, exerciseIds, kind);
    fn.then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, JSON.stringify(exerciseIds), JSON.stringify(playerIds)]);

  if (!result) return <span style={{ fontSize: 11, color: "#4A6680" }}>Comprobando quién completó...</span>;
  const ok = result.total > 0 && result.completed === result.total;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: ok ? "#F5C518" : "#8BA4C0" }}>
      {result.completed}/{result.total} jugador{result.total !== 1 ? "es" : ""} completaron el registro
    </span>
  );
}

function SesionUnicaHistoryCard({ entry, players }) {
  const [expanded, setExpanded] = useState(false);
  const relevantPlayerIds = entry.individual
    ? players.filter((p) => entry.targetNames?.includes(p.name)).map((p) => p.id)
    : players.map((p) => p.id);
  const exerciseIds = (entry.exercises || []).map((e) => e.id);
  const exerciseNames = (entry.exercises || []).map((e) => e.name);

  return (
    <div onClick={() => setExpanded((e) => !e)} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{fmtDateLabel(entry.date)}</div>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>
            {entry.mdTag} {entry.objetivo ? `· ${entry.objetivo}` : ""} · {entry.exerciseCount} tarea
            {entry.exerciseCount !== 1 ? "s" : ""}
          </div>
          {entry.individual && (
            <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>
              Para: {entry.targetNames?.join(", ") || "jugador(es)"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: entry.individual ? "#F5C518" : "#1E6FD9",
              border: `1px solid ${entry.individual ? "#F5C518" : "#1E6FD9"}`,
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {entry.individual ? "Individual" : "Grupal"}
          </span>
          <ChevronDown
            size={16}
            color="#8BA4C0"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}
          />
        </div>
      </div>
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ marginTop: 8 }}>
            {relevantPlayerIds.length > 0 &&
              (entry.individual ? (
                <CompletionBadge playerIds={relevantPlayerIds} date={entry.date} exerciseIds={exerciseNames} kind="individual" />
              ) : (
                <CompletionBadge playerIds={relevantPlayerIds} date={entry.date} exerciseIds={exerciseIds} kind="team" />
              ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {!Array.isArray(entry.exercises) || !entry.exercises.length ? (
              <div style={{ fontSize: 12, color: "#4A6680" }}>Enviada antes de este cambio, sin detalle guardado.</div>
            ) : (
              entry.exercises.map((ex, i) => (
                <div key={ex.id || i} style={{ background: "#060D1A", border: "1px solid #1A3050", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: "#8BA4C0" }}>
                    {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""}
                    {ex.rir !== "" && ex.rir != null ? ` · RIR ${ex.rir}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreventivoHistoryCard({ entry, groupMemberIds }) {
  const [expanded, setExpanded] = useState(false);
  const exerciseIds = (entry.exercises || []).map((e) => e.id);

  return (
    <div onClick={() => setExpanded((e) => !e)} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>
            {fmtDateLabel(entry.date)} — {entry.mdTag}
          </div>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>
            {entry.groupName} {entry.objetivo ? `· ${entry.objetivo}` : ""} · {entry.exerciseCount} tarea
            {entry.exerciseCount !== 1 ? "s" : ""}
          </div>
        </div>
        <ChevronDown
          size={16}
          color="#8BA4C0"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}
        />
      </div>
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ marginTop: 8 }}>
            {groupMemberIds?.length > 0 && (
              <CompletionBadge playerIds={groupMemberIds} date={entry.date} exerciseIds={exerciseIds} kind="preventive" />
            )}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {!Array.isArray(entry.exercises) || !entry.exercises.length ? (
              <div style={{ fontSize: 12, color: "#4A6680" }}>Enviada antes de este cambio, sin detalle guardado.</div>
            ) : (
              entry.exercises.map((ex, i) => (
                <div key={ex.id || i} style={{ background: "#060D1A", border: "1px solid #1A3050", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: "#8BA4C0" }}>
                    {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""}
                    {ex.rir !== "" && ex.rir != null ? ` · RIR ${ex.rir}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodoSessionReadOnlyRow({ s, players }) {
  const [expanded, setExpanded] = useState(false);
  const dates = computeRecurrenceDates(reconstructRecurrence(s));
  const pastDate = [...dates].filter((d) => d <= todayStr()).sort().pop();
  const exerciseIds = (s.exercises || []).map((e) => e.id);
  const targetIds = s.targetPlayerIds && s.targetPlayerIds.length ? s.targetPlayerIds : players.map((p) => p.id);

  return (
    <div onClick={() => setExpanded((e) => !e)} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {s.mdTag} {s.objetivo ? `· ${s.objetivo}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>
            {s.targetPlayerIds && s.targetPlayerIds.length
              ? `Para: ${s.targetPlayerIds.map((id) => players?.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}`
              : "Todo el equipo"}
          </div>
        </div>
        <ChevronDown
          size={16}
          color="#8BA4C0"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}
        />
      </div>
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ marginTop: 8 }}>
            {pastDate && exerciseIds.length > 0 && (
              <CompletionBadge
                playerIds={targetIds}
                date={pastDate}
                exerciseIds={s.targetPlayerIds?.length ? (s.exercises || []).map((e) => e.name) : exerciseIds}
                kind={s.targetPlayerIds?.length ? "individual" : "team"}
              />
            )}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {!Array.isArray(s.exercises) || !s.exercises.length ? (
              <div style={{ fontSize: 12, color: "#4A6680" }}>Sin detalle de tareas guardado.</div>
            ) : (
              s.exercises.map((ex, i) => (
                <div key={ex.id || i} style={{ background: "#060D1A", border: "1px solid #1A3050", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: "#8BA4C0" }}>
                    {ex.sets} × {ex.reps} {ex.carga ? `· ${ex.carga} kg` : ""}
                    {ex.rir !== "" && ex.rir != null ? ` · RIR ${ex.rir}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodoHistorialDetail({ ciclo, players, onBack }) {
  const [sesiones] = usePersistentList(`ciclo-sesiones:${ciclo.id}`, true);
  return (
    <>
      <BackHeader title={ciclo.nombre} subtitle="Historial · Período finalizado" onBack={onBack} />
      {!sesiones.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Este período no tiene sesiones planificadas.
        </div>
      ) : (
        <div className="fp-grid">
          {sesiones.map((s) => (
            <PeriodoSessionReadOnlyRow key={s.id} s={s} players={players} />
          ))}
        </div>
      )}
    </>
  );
}

function HistorialGeneralView({ ciclos, players, injuryGroups }) {
  const [sentLog] = usePersistentList("team-session-index", true);
  const [preventivoLog, setPreventivoLog] = useState([]);
  const [loadedPreventivo, setLoadedPreventivo] = useState(false);
  const [viewingCicloId, setViewingCicloId] = useState(null);

  const [search, setSearch] = useState("");
  const [mdFilter, setMdFilter] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = [];
      for (const g of injuryGroups) {
        try {
          const res = await window.storage.get(`group-session-index:${g.id}`, true);
          const list = res ? JSON.parse(res.value) : [];
          list.forEach((l) => all.push({ ...l, groupName: g.name, memberIds: players.filter((p) => p.groupId === g.id).map((p) => p.id) }));
        } catch {
          // sin registro para este grupo
        }
      }
      if (!cancelled) {
        setPreventivoLog(all);
        setLoadedPreventivo(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [injuryGroups, players]);

  const viewingCiclo = ciclos.find((c) => c.id === viewingCicloId) || null;
  if (viewingCiclo) {
    return <PeriodoHistorialDetail ciclo={viewingCiclo} players={players} onBack={() => setViewingCicloId(null)} />;
  }

  const today = todayStr();
  const q = search.trim().toLowerCase();
  const matchesText = (fields) => !q || fields.some((f) => (f || "").toLowerCase().includes(q));
  const matchesMd = (tag) => !mdFilter || tag === mdFilter;
  const matchesDate = (date) => (!desde || date >= desde) && (!hasta || date <= hasta);

  const periodosFinalizados = ciclos
    .filter((c) => {
      const s = getCicloStatus(c).label;
      return s.startsWith("Finalizada") || s.startsWith("Finalizado");
    })
    .filter((c) => matchesText([c.nombre]) && (!desde || c.fechaFin >= desde) && (!hasta || c.fechaInicio <= hasta))
    .sort((a, b) => (a.fechaFin < b.fechaFin ? 1 : -1));

  const sesionesPasadas = sentLog
    .filter((l) => !l.cicloId && l.date < today)
    .filter((l) => matchesDate(l.date) && matchesMd(l.mdTag) && matchesText([l.objetivo, l.mdTag, ...(l.exercises || []).map((e) => e.name), ...(l.targetNames || [])]))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const sesionesGrouped = groupByMonth(sesionesPasadas, (l) => l.date);

  const preventivoFiltered = preventivoLog.filter(
    (l) => matchesDate(l.date) && matchesMd(l.mdTag) && matchesText([l.objetivo, l.mdTag, l.groupName, ...(l.exercises || []).map((e) => e.name)])
  );
  const preventivoGrouped = groupByMonth(preventivoFiltered, (l) => l.date);
  const hayFiltrosActivos = q || mdFilter || desde || hasta;

  return (
    <>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Filtros
        </div>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          placeholder="Buscar por objetivo, tarea, grupo o jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="fp-form-row" style={{ marginBottom: 10 }}>
          <div>
            <div style={miniLabel}>Desde</div>
            <input type="date" style={dateInputStyle} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <div style={miniLabel}>Hasta</div>
            <input type="date" style={dateInputStyle} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        <div style={miniLabel}>Match day (MD)</div>
        <select value={mdFilter} onChange={(e) => setMdFilter(e.target.value)} style={inputStyle}>
          <option value="">Todos</option>
          {MD_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {hayFiltrosActivos && (
          <button
            onClick={() => {
              setSearch("");
              setMdFilter("");
              setDesde("");
              setHasta("");
            }}
            style={{ ...primaryBtn, width: "100%", marginTop: 10, background: "#060D1A", border: "1px solid #1A3050", color: "#F0F4FF" }}
          >
            Quitar filtros
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 2px 8px" }}>
        Períodos finalizados
      </div>
      {!periodosFinalizados.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "12px 0 20px" }}>
          {hayFiltrosActivos ? "Ningún período finalizado coincide con los filtros." : "Todavía no hay períodos finalizados."}
        </div>
      ) : (
        <div className="fp-grid">
          {periodosFinalizados.map((c) => (
            <div key={c.id} onClick={() => setViewingCicloId(c.id)} style={{ ...cardStyle, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</div>
                <ChevronRight size={16} color="#8BA4C0" />
              </div>
              <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>
                {fmtDateShort(c.fechaInicio)} a {fmtDateShort(c.fechaFin)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 2px 8px" }}>
        Sesiones únicas pasadas
      </div>
      {!sesionesPasadas.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
          {hayFiltrosActivos ? "Ninguna sesión única coincide con los filtros." : "Todavía no hay sesiones únicas pasadas."}
        </div>
      ) : (
        sesionesGrouped.map(([mKey, items], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${items.length}`} defaultOpen={idx === 0 || hayFiltrosActivos}>
            <div className="fp-grid">
              {items.map((entry) => (
                <SesionUnicaHistoryCard key={`${entry.date}-${entry.individual ? "i" : "g"}`} entry={entry} players={players} />
              ))}
            </div>
          </Collapsible>
        ))
      )}

      <div style={{ fontSize: 12, color: "#8BA4C0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 2px 8px" }}>
        Preventivos
      </div>
      {!loadedPreventivo ? (
        <LoadingBlock />
      ) : !preventivoFiltered.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
          {hayFiltrosActivos ? "Ningún trabajo preventivo coincide con los filtros." : "Todavía no hay trabajo preventivo registrado."}
        </div>
      ) : (
        preventivoGrouped.map(([mKey, items], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${items.length}`} defaultOpen={idx === 0 || hayFiltrosActivos}>
            <div className="fp-grid">
              {items.map((l, i) => (
                <PreventivoHistoryCard key={`${l.date}-${i}`} entry={l} groupMemberIds={l.memberIds} />
              ))}
            </div>
          </Collapsible>
        ))
      )}
    </>
  );
}

function CoachView() {
  const [players, savePlayers, playersLoaded] = usePersistentList("players-list", true);
  const [injuryGroups, saveInjuryGroups] = usePersistentList("injury-groups", true);
  const [ciclos, saveCiclos] = usePersistentList("ciclos-planificacion", true);
  const [section, setSection] = useState("jugadores");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPin, setNewPlayerPin] = useState("");
  const [addError, setAddError] = useState("");

  const addPlayer = async () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const existingPins = players.map((p) => p.pin);
    let pin = newPlayerPin;
    if (pin.length !== 4) {
      pin = genUniquePin(existingPins);
    } else if (existingPins.includes(pin)) {
      setAddError("Ese PIN ya lo usa otro jugador. Elige otro o deja el campo en blanco para generarlo automático.");
      return;
    }
    const id = `p_${Date.now()}`;
    const next = [...players, { id, name, pin }];
    const ok = await savePlayers(next);
    if (!ok) {
      setAddError("No se pudo guardar el jugador. Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    setNewPlayerName("");
    setNewPlayerPin("");
    setAddError("");
  };

  const removePlayer = async (id) => {
    await savePlayers(players.filter((p) => p.id !== id));
  };

  const [backingUp, setBackingUp] = useState(false);
  const [backupOk, setBackupOk] = useState(false);
  const handleBackup = async () => {
    setBackingUp(true);
    setBackupOk(false);
    try {
      await exportBackup();
      setBackupOk(true);
    } catch {
      // el propio botón mostrará el estado normal si falla; no hay más que hacer aquí
    }
    setBackingUp(false);
  };

  if (!playersLoaded) return <LoadingBlock />;

  return (
    <div style={{ padding: "0 20px" }}>
      <button
        onClick={handleBackup}
        disabled={backingUp}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          background: "#0E1E35",
          border: "1px solid #1A3050",
          borderRadius: 8,
          padding: "8px 0",
          marginBottom: 10,
          cursor: "pointer",
          color: backupOk ? "#F5C518" : "#8BA4C0",
          fontSize: 12,
          fontWeight: 600,
          opacity: backingUp ? 0.6 : 1,
        }}
      >
        <Download size={13} />
        {backingUp ? "Preparando copia..." : backupOk ? "Descargada ✓ Vuelve a tocar para otra copia" : "Descargar copia de seguridad"}
      </button>
      <div
        style={{
          display: "flex",
          background: "#0E1E35",
          borderRadius: 10,
          padding: 4,
          gap: 4,
          marginBottom: 16,
        }}
      >
        {[
          { id: "jugadores", label: "Jugadores" },
          { id: "equipo", label: "Diseño de sesiones" },
          { id: "grupos", label: "Preventivos" },
          { id: "historial", label: "Historial" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              background: section === t.id ? "#EF4444" : "transparent",
              color: section === t.id ? "#060D1A" : "#8BA4C0",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "grupos" ? (
        <InjuryGroupManager
          injuryGroups={injuryGroups}
          saveInjuryGroups={saveInjuryGroups}
          players={players}
          savePlayers={savePlayers}
          ciclos={ciclos}
          saveCiclos={saveCiclos}
        />
      ) : section === "equipo" ? (
        <TeamSessionManager ciclos={ciclos} saveCiclos={saveCiclos} players={players} injuryGroups={injuryGroups} />
      ) : section === "historial" ? (
        <HistorialGeneralView ciclos={ciclos} players={players} injuryGroups={injuryGroups} />
      ) : (
      <>
      <Collapsible title="Jugadores" defaultOpen subtitle={`${players.length} en plantilla`}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={inputStyle}
            placeholder="Nombre del jugador"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <PinInput value={newPlayerPin} onChange={setNewPlayerPin} />
          </div>
          <button onClick={addPlayer} style={{ ...primaryBtn, padding: "0 14px" }}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#4A6680", marginTop: 6 }}>
          Deja el PIN en blanco para que se genere uno automático (lo verás abajo, en "Jugadores en plantilla").
        </div>
        {addError && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 6 }}>{addError}</div>}
      </Collapsible>

      {players.length > 0 && (
        <Collapsible title="Jugadores en plantilla" defaultOpen>
          <PlayerPinManager
            players={players}
            savePlayers={savePlayers}
            injuryGroups={injuryGroups}
            onRemovePlayer={removePlayer}
          />
        </Collapsible>
      )}

      {!players.length && (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Añade jugadores para empezar a planificar sesiones.
        </div>
      )}

      </>
      )}
    </div>
  );
}

// ---------- PLAYER VIEW ----------

function PlayerPinLookup({ players, onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const match = players.find((p) => p.pin === pin);
    if (match) {
      setError("");
      onLogin(match.id);
    } else {
      setError("PIN incorrecto.");
      setPin("");
    }
  };

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Lock size={18} color="#F5C518" />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Introduce tu PIN</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <PinInput value={pin} onChange={setPin} autoFocus />
        </div>
        {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} style={{ ...primaryBtn, width: "100%" }}>
          Entrar
        </button>
        <div style={{ fontSize: 11, color: "#4A6680", marginTop: 10 }}>
          ¿No recuerdas tu PIN? Pídeselo a tu entrenador.
        </div>
      </div>
    </div>
  );
}

function PlayerView() {
  const [players, , playersLoaded, playersError, retryPlayers] = usePersistentList("players-list", true);
  const [selected, setSelected] = useState(null);
  const [verified, setVerified] = useState(false);
  const date = todayStr();
  const [session, saveSession, sessionLoaded] = useSession(selected, date);
  const [, upsertSummary] = useSessionSummaries(selected);
  const [, upsertPreventivoSummary] = useSessionSummaries(selected, "preventivo");
  const groupId = players.find((p) => p.id === selected)?.groupId || null;
  const [groupSession, , groupSessionLoaded] = useSession(groupId, date, "preventive");
  const [teamSession, , teamSessionLoaded] = useSession("squad", date, "team-session");

  const preventiveDone = session?.preventiveDone || {};
  const preventiveActuals = session?.preventiveActuals || {};
  const teamDone = session?.teamDone || {};
  const teamActuals = session?.teamActuals || {};

  const groupSent = !!groupSession?.sent;
  const teamSent = !!teamSession?.sent;

  const groupExercises = groupSent
    ? (groupSession?.exercises || []).map((ex) => ({
        ...ex,
        categoria: ex.categoria || "PREVENTIVA",
        mdTag: groupSession?.mdTag || ex.mdTag,
        done: !!preventiveDone[ex.id],
        cargaReal: preventiveActuals[ex.id]?.cargaReal ?? "",
        rirReal: preventiveActuals[ex.id]?.rirReal ?? "",
        _source: "group",
      }))
    : [];
  const teamExercises = teamSent
    ? (teamSession?.exercises || []).map((ex) => ({
        ...ex,
        mdTag: teamSession?.mdTag || ex.mdTag,
        done: !!teamDone[ex.id],
        cargaReal: teamActuals[ex.id]?.cargaReal ?? "",
        rirReal: teamActuals[ex.id]?.rirReal ?? "",
        _source: "team",
      }))
    : [];
  const personalExercises = (session?.exercises || []).map((ex) => ({
    ...ex,
    cargaReal: ex.cargaReal ?? "",
    rirReal: ex.rirReal ?? "",
    _source: "personal",
  }));
  const allExercises = [...personalExercises, ...teamExercises, ...groupExercises];
  const currentSignature = allExercises
    .map((e) => `${e._source}-${e.id}`)
    .sort()
    .join(",");
  const isLockedSubmitted = !!session?.completed && currentSignature !== "" && session?.completedSignature === currentSignature;

  const computeTotals = (personalList, prevDoneMap, teamDoneMap) => {
    const doneCount =
      personalList.filter((e) => e.done).length +
      groupExercises.filter((e) => prevDoneMap[e.id]).length +
      teamExercises.filter((e) => teamDoneMap[e.id]).length;
    const total = personalList.length + groupExercises.length + teamExercises.length;
    return { total, doneCount };
  };

  const persistAndSummarize = async (patch) => {
    const nextSession = { ...session, ...patch };
    await saveSession(nextSession);
    const { total, doneCount } = computeTotals(
      nextSession.exercises || [],
      nextSession.preventiveDone || {},
      nextSession.teamDone || {}
    );
    await upsertSummary(date, { total, done: doneCount, completed: nextSession.completed });
  };

  const confirmExercise = async (ex, cargaReal, rirReal) => {
    await savePlayerLastValue(selected, ex.name, cargaReal, rirReal, date);
    if (ex._source === "personal") {
      const nextExercises = session.exercises.map((e) =>
        e.id === ex.id ? { ...e, done: !e.done, cargaReal, rirReal } : e
      );
      await persistAndSummarize({ exercises: nextExercises });
      await markHasPlayerData("session", selected, date);
    } else if (ex._source === "group") {
      const wasDone = !!preventiveDone[ex.id];
      const nextDone = { ...preventiveDone, [ex.id]: !wasDone };
      const nextActuals = { ...preventiveActuals, [ex.id]: { cargaReal, rirReal } };
      await persistAndSummarize({ preventiveDone: nextDone, preventiveActuals: nextActuals });
      if (groupId) await markHasPlayerData("preventive", groupId, date);
      const preventivoDoneCount = groupExercises.filter((e) => nextDone[e.id]).length;
      await upsertPreventivoSummary(date, {
        total: groupExercises.length,
        done: preventivoDoneCount,
        completed: preventivoDoneCount === groupExercises.length && groupExercises.length > 0,
      });
    } else if (ex._source === "team") {
      const wasDone = !!teamDone[ex.id];
      const nextDone = { ...teamDone, [ex.id]: !wasDone };
      const nextActuals = { ...teamActuals, [ex.id]: { cargaReal, rirReal } };
      await persistAndSummarize({ teamDone: nextDone, teamActuals: nextActuals });
      await markHasPlayerData("team-session", "squad", date);
    }
  };

  const submitSession = async () => {
    await persistAndSummarize({ completed: true, completedSignature: currentSignature });
  };

  if (!playersLoaded) return <LoadingBlock />;

  if (playersError) {
    return (
      <div style={{ padding: "0 20px" }}>
        <div style={cardStyle}>
          <div style={{ color: "#EF4444", fontSize: 14, marginBottom: 12 }}>{playersError}</div>
          <button onClick={retryPlayers} style={{ ...primaryBtn, width: "100%" }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div style={{ padding: "0 20px" }}>
        {!players.length ? (
          <div style={{ color: "#8BA4C0", fontSize: 14 }}>
            Tu entrenador aún no ha añadido jugadores. Pídele que te añada desde la vista Entrenador.
          </div>
        ) : (
          <PlayerPinLookup
            players={players}
            onLogin={(id) => {
              setSelected(id);
              setVerified(true);
            }}
          />
        )}
      </div>
    );
  }

  const playerObj = players.find((p) => p.id === selected);

  const doneCount = allExercises.filter((e) => e.done).length;
  const total = allExercises.length;
  const undoneCount = total - doneCount;
  const missingCargaCount = allExercises.filter((e) => e.done && (e.cargaReal === "" || e.cargaReal == null)).length;
  const bothLoaded = sessionLoaded && groupSessionLoaded && teamSessionLoaded;

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{playerObj.name}</div>
        <button
          onClick={() => {
            setSelected(null);
            setVerified(false);
          }}
          style={{ ...iconBtnStyle, fontSize: 12, color: "#8BA4C0" }}
        >
          Cambiar
        </button>
      </div>
      <div style={{ textTransform: "capitalize", color: "#8BA4C0", fontSize: 13, marginBottom: 14 }}>{fmtDateLabel(date)}</div>

      {!bothLoaded ? (
        <LoadingBlock />
      ) : total === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: "#8BA4C0" }}>
          <ClipboardList size={24} style={{ marginBottom: 8, opacity: 0.6 }} />
          <div>No tienes sesión de fuerza asignada hoy.</div>
        </div>
      ) : isLockedSubmitted ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Check size={22} color="#F5C518" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sesión de hoy enviada con éxito</div>
          <div style={{ fontSize: 13, color: "#8BA4C0" }}>
            {doneCount}/{total} tareas registradas. Si tu entrenador añade algo nuevo para hoy, aparecerá aquí
            automáticamente.
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "#8BA4C0" }}>Progreso</span>
            <PlateStack total={total} done={doneCount} />
          </div>
          {groupByMdTag(allExercises).map(([tag, items]) => (
            <div key={tag} style={{ ...cardStyle, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{tag}</div>
              {items.map((ex, ii) => (
                <ExerciseRow
                  key={`${ex._source}-${ex.id}`}
                  ex={ex}
                  onConfirm={confirmExercise}
                  isLast={ii === items.length - 1}
                  playerId={selected}
                />
              ))}
            </div>
          ))}

          {(undoneCount > 0 || missingCargaCount > 0) && (
            <div style={{ fontSize: 12, color: "#F5C518", marginBottom: 8, padding: "0 2px" }}>
              {undoneCount > 0 && `${undoneCount} tarea${undoneCount !== 1 ? "s" : ""} sin marcar como hecha`}
              {undoneCount > 0 && missingCargaCount > 0 && " · "}
              {missingCargaCount > 0 &&
                `${missingCargaCount} sin carga registrada`}
            </div>
          )}
          <button
            onClick={submitSession}
            disabled={doneCount === 0}
            style={{
              ...primaryBtn,
              width: "100%",
              marginTop: 4,
              opacity: doneCount === 0 ? 0.5 : 1,
              cursor: doneCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            {session.completed ? "Actualizar sesión" : "Guardar sesión"}
          </button>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("coach");
  const [coachUnlocked, setCoachUnlocked] = useState(false);
  return (
    <Shell mode={mode} coachUnlocked={coachUnlocked}>
      <TopBar mode={mode} setMode={setMode} />
      {mode === "coach" ? (
        <CoachGate unlocked={coachUnlocked} setUnlocked={setCoachUnlocked}>
          <CoachView />
        </CoachGate>
      ) : (
        <PlayerView />
      )}
    </Shell>
  );
}
