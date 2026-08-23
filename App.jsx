import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Check, Dumbbell, ChevronLeft, ChevronRight, ChevronDown, User, ClipboardList, Loader2, Lock, Eye, EyeOff, RefreshCw, Play, Target, Send, CalendarClock, History, Pencil } from "lucide-react";

// ====== Backend remoto (Google Sheets vía Apps Script) ======
// Lee y escribe directamente sobre las 10 pestañas de la Sheet (ver
// backend/Code.gs y backend/README.md). Nada de almacén clave-valor genérico:
// cada llamada opera sobre una entidad concreta (jugadores, ejercicios, ...).
// 1) Pega aquí la URL que te da Apps Script al desplegar (termina en /exec).
// 2) Pon el mismo token que hayas puesto en el Code.gs (Script Properties → TOKEN).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxOacDckJsPpSkd2A0i8hRoHgP2xUh0BmqUUyr3uTZUqzg7YJM_cCcboDQJ9rosuBt6NA/exec";
const SHARED_TOKEN = "7f3a9c2e5b8d1f4a6c0e2b9d7a5f3c1e";

const API_GET_ACTIONS = new Set(["list", "get", "materiales", "categoriasPreventivas", "config", "rotacion"]);

async function apiCall(action, params = {}) {
  if (API_GET_ACTIONS.has(action)) {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null) cleanParams[k] = params[k];
    });
    const qs = new URLSearchParams({ action, token: SHARED_TOKEN, ...cleanParams }).toString();
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

function unwrapApi(data) {
  if (data && data.error) throw new Error(data.error);
  return data;
}

// Entidades con CRUD genérico: jugadores, ejercicios, categoriasPreventivas,
// sesiones, tareas, circuitos, registros (ver backend/Code.gs).
const api = {
  list: (entity, filters) => apiCall("list", { entity, ...(filters || {}) }).then(unwrapApi),
  get: (entity, id) => apiCall("get", { entity, id }).then(unwrapApi),
  save: (entity, record) => apiCall("save", { entity, record }).then(unwrapApi),
  delete: (entity, id) => apiCall("delete", { entity, id }).then(unwrapApi),
  materiales: () => apiCall("materiales").then(unwrapApi),
  guardarMaterial: (nombre) => apiCall("guardarMaterial", { nombre }).then(unwrapApi),
  eliminarMaterial: (nombre) => apiCall("eliminarMaterial", { nombre }).then(unwrapApi),
  categoriasPreventivas: () => apiCall("categoriasPreventivas").then(unwrapApi),
  config: (clave) => apiCall("config", { clave }).then(unwrapApi),
  setConfig: (clave, valor) => apiCall("setConfig", { clave, valor }).then(unwrapApi),
  rotacion: (categoriaId) => apiCall("rotacion", categoriaId ? { categoria_id: categoriaId } : {}).then(unwrapApi),
  setRotacion: (categoriaId, punteroActual) =>
    apiCall("setRotacion", { categoria_id: categoriaId, puntero_actual: punteroActual }).then(unwrapApi),
  uploadGif: (dataUri) => apiCall("uploadGif", { dataUri }).then(unwrapApi),
};
// ====== Fin backend remoto ======

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

function VideoEmbed({ url }) {
  const [attempt, setAttempt] = useState(0); // 0 = lh3, 1 = uc?export=view, 2 = give up (link)

  if (!url) return null;

  // GIFs subidos desde esta app: enlace directo de Drive (lh3.googleusercontent.com) o,
  // en local antes de subir, un data: URI. Se muestran como imagen directamente.
  if (url.startsWith("data:") || url.includes("lh3.googleusercontent.com")) {
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

// Sustituye a usePersistentList: sincroniza el array COMPLETO de una entidad
// (jugadores, ejercicios, sesiones, tareas, registros...) contra su pestaña.
// save(next) recibe la lista completa deseada (igual que antes) y por debajo
// solo guarda los registros que cambiaron (comparando por referencia) y borra
// los que ya no están — así el resto del código que hace `players.map(...)`,
// `[...items, nuevo]`, `.filter(...)` no necesita cambiar de forma.
function useEntityList(entity, filters) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const filtersKey = JSON.stringify(filters || null);

  useEffect(() => {
    let cancelled = false;
    // filters === false es la señal explícita de "todavía no hay nada que pedir"
    // (p. ej. ningún jugador seleccionado aún) — evita traer la pestaña entera sin filtrar.
    if (filters === false) {
      setItems([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      try {
        const res = await api.list(entity, filters);
        if (cancelled) return;
        setItems(res || []);
      } catch (e) {
        if (cancelled) return;
        setItems([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, filtersKey, tick]);

  const save = useCallback(
    async (next) => {
      const previous = items;
      setItems(next);
      try {
        const previousById = new Map(previous.filter((i) => i.id).map((i) => [i.id, i]));
        const nextIds = new Set(next.map((i) => i.id).filter(Boolean));
        const toDelete = previous.filter((i) => i.id && !nextIds.has(i.id));
        const toSaveIdx = [];
        next.forEach((item, idx) => {
          if (previousById.get(item.id) !== item) toSaveIdx.push(idx);
        });
        const savedResults = await Promise.all(toSaveIdx.map((idx) => api.save(entity, next[idx])));
        await Promise.all(toDelete.map((item) => api.delete(entity, item.id)));
        const reconciled = next.slice();
        toSaveIdx.forEach((idx, i) => {
          reconciled[idx] = savedResults[i];
        });
        setItems(reconciled);
        setError(null);
        return true;
      } catch (e) {
        setItems(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [entity, items]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return [items, save, loaded, error, retry];
}

// Sustituye a usePersistentValue, para la pestaña Config (clave/valor).
function useConfigValue(clave) {
  const [value, setValue] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const res = await api.config(clave);
        if (cancelled) return;
        setValue(res);
      } catch (e) {
        if (cancelled) return;
        setValue(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clave, tick]);

  const save = useCallback(
    async (next) => {
      const previous = value;
      setValue(next);
      try {
        await api.setConfig(clave, next);
        setError(null);
        return true;
      } catch (e) {
        setValue(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [clave, value]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return [value, save, loaded, error, retry];
}

// Adaptador sobre la pestaña Jugadores: el resto de la app sigue usando
// player.name/player.groupIds tal cual (evita renombrar decenas de sitios),
// y aquí se traduce a las columnas reales (nombre, estado, categorias_preventivas).
// groupIds es un array (un jugador puede tener varias categorías preventivas).
function usePlayers() {
  const [rows, saveRows, loaded, error, retry] = useEntityList("jugadores");

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const players = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.nombre,
        pin: r.pin,
        groupIds: Array.isArray(r.categorias_preventivas) ? r.categorias_preventivas : [],
      })),
    [rows]
  );

  const savePlayers = useCallback(
    (nextPlayers) => {
      const nextRows = nextPlayers.map((p) => {
        const original = p.id ? rowsById.get(p.id) : null;
        const groupIds = p.groupIds || [];
        if (
          original &&
          original.nombre === p.name &&
          original.pin === p.pin &&
          JSON.stringify(original.categorias_preventivas || []) === JSON.stringify(groupIds)
        ) {
          return original; // sin cambios reales: misma referencia -> no se reguarda
        }
        return { id: p.id, nombre: p.name, pin: p.pin, estado: "activo", categorias_preventivas: groupIds };
      });
      return saveRows(nextRows);
    },
    [saveRows, rowsById]
  );

  return [players, savePlayers, loaded, error, retry];
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


function ExerciseRow({ ex, onConfirm, isLast, lastValue }) {
  const [carga, setCarga] = useState(ex.cargaReal ?? "");
  const [rir, setRir] = useState(ex.rirReal ?? "");

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
              {ex.sets} × {ex.reps} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
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
            {ex.sets} × {ex.reps} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
          </div>
          {ex.notas && <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>{ex.notas}</div>}
          <VideoEmbed url={ex.videoUrl} />
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
  const [coachPin, saveCoachPin, loaded, loadError, retryLoad] = useConfigValue("coach_pin");
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

// Para cada jugador: ¿tiene tareas asignadas hoy (equipo, individuales o de su/s
// categoría/s preventiva/s) que todavía no ha registrado como hechas? Se calcula
// una sola vez para toda la plantilla (no una llamada por fila).
function usePendingToday(players) {
  const today = todayStr();
  const [sesiones, , sesionesLoaded] = useEntityList("sesiones");
  const todaySesiones = sesiones.filter((s) => s.enviada && (s.fechas || []).includes(today));
  const sesionIds = todaySesiones.map((s) => s.id);
  const [tareas, tareasLoaded] = useTareasForSesiones(sesionIds);
  const tareaIds = tareas.map((t) => t.id);
  const [registros, , registrosLoaded] = useEntityList("registros", tareaIds.length ? { tarea_id: tareaIds.join(",") } : false);

  const loaded = sesionesLoaded && tareasLoaded && (tareaIds.length ? registrosLoaded : true);
  if (!loaded) return { loaded: false, pendingByPlayer: {} };

  const pendingByPlayer = {};
  players.forEach((p) => {
    const asignadas = todaySesiones.filter((s) => !s.jugadores_destino?.length || s.jugadores_destino.includes(p.id));
    const asignadasIds = new Set(asignadas.map((s) => s.id));
    const tareasDelJugador = tareas.filter((t) => asignadasIds.has(t.sesion_id));
    const total = tareasDelJugador.length;
    const done = tareasDelJugador.filter((t) => registros.some((r) => r.tarea_id === t.id && r.jugador_id === p.id && r.hecho)).length;
    pendingByPlayer[p.id] = { total, pending: total > 0 && done < total };
  });
  return { loaded: true, pendingByPlayer };
}

function PlayerRosterRow({ player, savePlayers, players, categorias, pendingToday, onRemove, onOpenHistory }) {
  const [revealed, setRevealed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(player.name);
  const [nameError, setNameError] = useState("");
  const [pickingCategorias, setPickingCategorias] = useState(false);

  const resetPin = async () => {
    const otherPins = players.filter((p) => p.id !== player.id).map((p) => p.pin);
    const next = players.map((p) => (p.id === player.id ? { ...p, pin: genUniquePin(otherPins) } : p));
    await savePlayers(next);
    setRevealed(true);
  };

  const toggleCategoria = async (catId) => {
    const current = player.groupIds || [];
    const nextIds = current.includes(catId) ? current.filter((id) => id !== catId) : [...current, catId];
    const next = players.map((p) => (p.id === player.id ? { ...p, groupIds: nextIds } : p));
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

  const activeCategorias = player.groupIds || [];

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
          <button
            type="button"
            onClick={() => setPickingCategorias((v) => !v)}
            style={{
              background: "#060D1A",
              color: activeCategorias.length ? "#EF4444" : "#8BA4C0",
              border: "1px solid #1A3050",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            {activeCategorias.length ? `${activeCategorias.length} categoría${activeCategorias.length !== 1 ? "s" : ""}` : "Sin categoría"}
          </button>
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
      {pickingCategorias && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {!categorias.length ? (
            <div style={{ fontSize: 11, color: "#4A6680" }}>No hay categorías preventivas configuradas en el Sheet.</div>
          ) : (
            categorias.map((c) => {
              const active = activeCategorias.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategoria(c.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 9px",
                    borderRadius: 20,
                    cursor: "pointer",
                    border: "1px solid #EF4444",
                    background: active ? "#EF4444" : "transparent",
                    color: active ? "#060D1A" : "#EF4444",
                  }}
                >
                  {c.nombre}
                </button>
              );
            })
          )}
        </div>
      )}
      {nameError && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>{nameError}</div>}
      {confirmingDelete && (
        <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
          Toca la papelera otra vez para confirmar que quieres eliminar a {player.name}.
        </div>
      )}
    </div>
  );
}


function PlayerPinManager({ players, savePlayers, categorias, onRemovePlayer }) {
  const [viewingHistoryPlayer, setViewingHistoryPlayer] = useState(null);
  const { loaded, pendingByPlayer } = usePendingToday(players);

  if (!players.length) return null;

  if (viewingHistoryPlayer) {
    return <PlayerHistoryScreen player={viewingHistoryPlayer} onBack={() => setViewingHistoryPlayer(null)} />;
  }

  const pendingList = loaded ? players.filter((p) => pendingByPlayer[p.id]?.pending) : [];

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
            categorias={categorias}
            pendingToday={!!pendingByPlayer[p.id]?.pending}
            onRemove={onRemovePlayer}
            onOpenHistory={() => setViewingHistoryPlayer(p)}
          />
        ))}
      </div>
    </>
  );
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
            Prescrito: {ex.sets} × {ex.reps} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
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

// Busca (por nombre, sin distinguir mayúsculas) o crea la fila de Ejercicios
// correspondiente y devuelve el registro guardado (con su id real). Es lo que
// da a cada tarea embebida un ejercicio_id estable y reutilizable.
async function resolveEjercicio(ejercicios, def) {
  const nombre = (def.nombre || "").trim();
  const match = ejercicios.find((e) => (e.nombre || "").toLowerCase() === nombre.toLowerCase());
  const record = {
    id: match?.id,
    nombre,
    bloque: match?.bloque || "",
    categoria_preventiva_id: match?.categoria_preventiva_id || "",
    tags_descriptivos: def.tags_descriptivos || [],
    gif_url: def.gif_url !== undefined ? def.gif_url : match?.gif_url || "",
    orden_rotacion: match?.orden_rotacion || "",
  };
  return api.save("ejercicios", record);
}

const emptyDraft = { name: "", sets: 3, reps: 8, rir: "", notas: "", videoUrl: "", tipos: [] };

function ExerciseBuilderBlock({ exercises, onAdd, onUpdate, onRemove, categoria, accentColor = "#F5C518", onScreenActive }) {
  const [ejercicios, , , , retryEjercicios] = useEntityList("ejercicios");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [screen, setScreen] = useState("list"); // "list" | "form" | "biblioteca"
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      try {
        const upload = await api.uploadGif(reader.result);
        if (!upload?.fileId) throw new Error("sin fileId");
        setDraft((d) => ({ ...d, videoUrl: `https://lh3.googleusercontent.com/d/${upload.fileId}` }));
      } catch {
        setFileError("No se pudo guardar el GIF. Comprueba tu conexión e inténtalo de nuevo.");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setFileError("No se pudo leer el archivo. Inténtalo de nuevo.");
    };
    reader.readAsDataURL(file);
  };

  const pickFromLibrary = (item) => {
    setDraft({
      ...emptyDraft,
      name: item.nombre,
      videoUrl: item.gif_url || "",
      tipos: item.tags_descriptivos || [],
    });
    setScreen("form");
  };

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setDraft({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rir: ex.rir ?? "",
      notas: ex.notas || "",
      videoUrl: ex.videoUrl || "",
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

  const handleAdd = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const saved = await resolveEjercicio(ejercicios, {
        nombre: draft.name,
        tags_descriptivos: draft.tipos,
        gif_url: draft.videoUrl,
      });
      retryEjercicios();
      const base = {
        // id de instancia LOCAL a esta sesión (para poder editar/quitar cada tarea
        // aunque el mismo ejercicio aparezca dos veces); ejercicioId es la referencia
        // estable a la pestaña Ejercicios, la que se guarda en Tareas.ejercicio_id.
        id: editingId || `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ejercicioId: saved.id,
        name: draft.name.trim(),
        sets: draft.sets,
        reps: draft.reps,
        rir: draft.rir,
        notas: draft.notas,
        videoUrl: draft.videoUrl,
        tipos: draft.tipos,
        categoria,
      };
      if (editingId) onUpdate(editingId, base);
      else onAdd(base);
      backToList();
    } finally {
      setSaving(false);
    }
  };

  const filteredLibrary = ejercicios.filter((item) => {
    const matchesSearch = !librarySearch.trim() || (item.nombre || "").toLowerCase().includes(librarySearch.trim().toLowerCase());
    const matchesType = !libraryTypeFilter || (item.tags_descriptivos || []).includes(libraryTypeFilter);
    return matchesSearch && matchesType;
  });

  // ─── Pantalla: Biblioteca ────────────────────────────────────────────────
  if (screen === "biblioteca") {
    return (
      <>
        <BackHeader title="Biblioteca" subtitle={`${ejercicios.length} guardadas`} onBack={() => setScreen("form")} />
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
                const item = filteredLibrary.find((it) => it.id === e.target.value);
                if (item) pickFromLibrary(item);
              }}
              style={inputStyle}
            >
              <option value="" disabled>
                Toca para elegir...
              </option>
              {filteredLibrary.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                  {item.tags_descriptivos?.length ? ` — ${item.tags_descriptivos.join(", ")}` : ""}
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
        {ejercicios.length > 0 && !editingId && (
          <button
            type="button"
            onClick={() => setScreen("biblioteca")}
            style={{ ...primaryBtn, width: "100%", marginBottom: 14, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF" }}
          >
            Elegir desde la biblioteca ({ejercicios.length})
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
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
            <div style={miniLabel}>RIR</div>
            <input style={inputStyle} value={draft.rir} onChange={(e) => setDraft({ ...draft, rir: e.target.value })} />
          </div>
        </div>
        {(() => {
          const w = numericWarning(draft.rir, { min: 0, max: 10, label: "El RIR" });
          return w ? <div style={{ fontSize: 11, color: "#F5C518", marginBottom: 8 }}>{w}</div> : null;
        })()}
        <div style={miniLabel}>GIF del ejercicio (opcional, máx. 1,5 MB)</div>
        {draft.videoUrl ? (
          <div style={{ marginBottom: 8 }}>
            <VideoEmbed url={draft.videoUrl} />
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, videoUrl: "" }))}
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
        <button onClick={handleAdd} disabled={saving} style={{ ...primaryBtn, width: "100%", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar tarea"}
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
                {ex.sets} × {ex.reps} {ex.rir !== "" && ex.rir != null ? `· RIR ${ex.rir}` : ""}
              </div>
              {ex.notas && <div style={{ fontSize: 12, color: "#4A6680", marginTop: 4 }}>{ex.notas}</div>}
              <TagBadges tipos={ex.tipos} />
              <VideoEmbed url={ex.videoUrl} />
            </div>
            <Trash2
              size={16}
              onClick={() => onRemove(ex.id)}
              style={{ cursor: "pointer", color: "#8BA4C0", flexShrink: 0, marginLeft: 8 }}
            />
          </div>
        </div>
      ))}
      <button onClick={startNew} style={{ ...primaryBtn, width: "100%", marginBottom: 4 }}>
        <Plus size={16} style={{ marginRight: 6 }} />
        Añadir tarea
      </button>
    </>
  );
}

// ---------- SESIONES / TAREAS / REGISTROS (en vivo, sin caché) ----------

function useCategoriasPreventivas() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api
      .categoriasPreventivas()
      .then((res) => {
        if (!cancelled) setItems(res || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return [items, loaded];
}

// Carga las tareas de una o varias sesiones en una sola llamada (usa el filtro "IN" del backend).
function useTareasForSesiones(sesionIds) {
  const [tareas, setTareas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const key = sesionIds.slice().sort().join(",");
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setTareas([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list("tareas", { sesion_id: key })
      .then((res) => {
        if (!cancelled) setTareas(res || []);
      })
      .catch(() => {
        if (!cancelled) setTareas([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return [tareas, loaded];
}

// ¿Algún jugador ya registró algo de esta sesión? Si es así, se bloquea la edición
// para no invalidar un historial que el jugador ya vio y completó.
async function sesionHasRegistros(sesionId) {
  try {
    const tareas = await api.list("tareas", { sesion_id: sesionId });
    if (!tareas.length) return false;
    const ids = tareas.map((t) => t.id).join(",");
    const registros = await api.list("registros", { tarea_id: ids });
    return registros.length > 0;
  } catch {
    return false;
  }
}

// Guarda una Sesión y sus Tareas juntas. `previousTareaIds` son los ids de las
// tareas que ya existían (si se está editando); las que ya no están en
// `exercisesDraft` se borran, el resto se actualiza o se crea.
async function guardarSesionConTareas(sesionRecord, exercisesDraft, previousTareaIds) {
  const savedSesion = await api.save("sesiones", sesionRecord);
  const keepIds = new Set();
  await Promise.all(
    exercisesDraft.map(async (ex) => {
      const isExisting = previousTareaIds.includes(ex.id);
      const saved = await api.save("tareas", {
        id: isExisting ? ex.id : undefined,
        sesion_id: savedSesion.id,
        bloque_sesion: ex.categoria || "",
        ejercicio_id: ex.ejercicioId,
        modo: "",
        series: ex.sets,
        cantidad: ex.reps,
        rir: ex.rir,
        tipo_resistencia: "",
        material: "",
        nota: ex.notas || "",
        circuito_id: "",
        orden_en_circuito: "",
      });
      keepIds.add(saved.id);
    })
  );
  const toDelete = previousTareaIds.filter((id) => !keepIds.has(id));
  await Promise.all(toDelete.map((id) => api.delete("tareas", id)));
  return savedSesion;
}

function SesionSummaryRow({ sesion, onOpen }) {
  const today = todayStr();
  const primeraFecha = (sesion.fechas || [])[0] || "";
  const status = primeraFecha && primeraFecha > today ? { label: "Programada", color: "#1E6FD9" } : { label: "Enviada", color: "#F5C518" };
  const destinatarios =
    !sesion.jugadores_destino || !sesion.jugadores_destino.length
      ? "Todo el equipo"
      : `${sesion.jugadores_destino.length} jugador${sesion.jugadores_destino.length !== 1 ? "es" : ""}`;
  return (
    <div onClick={onOpen} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {sesion.md} {sesion.objetivo ? `· ${sesion.objetivo}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 4 }}>{(sesion.fechas || []).map((f) => fmtDateShort(f)).join(", ")}</div>
          <div style={{ fontSize: 12, color: "#4A6680", marginTop: 2 }}>{destinatarios}</div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: status.color,
            border: `1px solid ${status.color}`,
            borderRadius: 20,
            padding: "2px 8px",
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}

// Pantalla única para crear/editar una sesión (colectiva, individual o preventiva).
// Sustituye a todo el antiguo flujo de períodos/ciclos con recurrencia semanal:
// aquí una sesión se manda a una o varias fechas concretas, sin más.
function SesionEditScreen({ sesion, players, presetPreventivo, onBack, onSaved }) {
  const isEditing = !!sesion;
  const [objetivo, setObjetivo] = useState(sesion?.objetivo || "");
  const [mdTag, setMdTag] = useState(sesion?.md || "MD");
  const [fechas, setFechas] = useState(sesion?.fechas?.length ? sesion.fechas : [todayStr()]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [targetPlayerIds, setTargetPlayerIds] = useState(sesion?.jugadores_destino ?? null);
  const [exercises, setExercises] = useState([]);
  const [existingTareaIds, setExistingTareaIds] = useState([]);
  const [rawTareas, setRawTareas] = useState(isEditing ? null : []);
  const [hasData, setHasData] = useState(false);
  const [checkedData, setCheckedData] = useState(!isEditing);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState(false);
  const [taskScreenActive, setTaskScreenActive] = useState(false);
  const [ejercicios, , ejerciciosLoaded] = useEntityList("ejercicios");

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    api.list("tareas", { sesion_id: sesion.id }).then((res) => {
      if (!cancelled) setRawTareas(res || []);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, sesion?.id]);

  useEffect(() => {
    if (rawTareas === null || !ejerciciosLoaded) return;
    const byId = new Map(ejercicios.map((e) => [e.id, e]));
    setExistingTareaIds(rawTareas.map((t) => t.id));
    setExercises(
      rawTareas.map((t) => {
        const def = byId.get(t.ejercicio_id) || {};
        return {
          id: t.id,
          ejercicioId: t.ejercicio_id,
          name: def.nombre || "(ejercicio eliminado)",
          sets: t.series,
          reps: t.cantidad,
          rir: t.rir,
          notas: t.nota || "",
          videoUrl: def.gif_url || "",
          tipos: def.tags_descriptivos || [],
          categoria: t.bloque_sesion || "",
        };
      })
    );
    (async () => {
      const found = isEditing && sesion?.enviada ? await sesionHasRegistros(sesion.id) : false;
      setHasData(found);
      setCheckedData(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTareas, ejerciciosLoaded]);

  const addFecha = () => {
    if (!nuevaFecha) return;
    if (!fechas.includes(nuevaFecha)) setFechas((prev) => [...prev, nuevaFecha].sort());
    setNuevaFecha("");
  };
  const removeFecha = (f) => setFechas((prev) => prev.filter((d) => d !== f));

  const guardar = async () => {
    setSendError("");
    setSendOk(false);
    if (!fechas.length) {
      setSendError("Añade al menos una fecha.");
      return;
    }
    if (!exercises.length) {
      setSendError("Añade al menos una tarea antes de guardar.");
      return;
    }
    setSending(true);
    try {
      const sesionRecord = {
        id: sesion?.id,
        fechas,
        md: mdTag,
        objetivo,
        jugadores_destino: presetPreventivo ? presetPreventivo.memberIds : targetPlayerIds,
        preventivo_activo: !!presetPreventivo,
        activacion_activa: false,
        lote_origen_id: "",
        enviada: true,
      };
      await guardarSesionConTareas(sesionRecord, exercises, existingTareaIds);
      setSendOk(true);
      onSaved?.();
    } catch {
      setSendError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const loaded = ejerciciosLoaded && rawTareas !== null && checkedData;
  if (!loaded) return <LoadingBlock />;

  return (
    <>
      <BackHeader title={isEditing ? "Editar sesión" : "Nueva sesión"} onBack={onBack} />
      {hasData ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Lock size={20} style={{ color: "#4A6680", marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "#8BA4C0" }}>
            Ya hay datos registrados por jugadores para esta sesión — queda bloqueada para proteger ese historial.
          </div>
        </div>
      ) : (
        <>
          {!taskScreenActive && (
            <>
              <div style={miniLabel}>Objetivo de la sesión</div>
              <input style={{ ...inputStyle, marginBottom: 10 }} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
              <MDSelect value={mdTag} onChange={setMdTag} />

              <div style={miniLabel}>Fechas</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="date" style={dateInputStyle} value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
                <button type="button" onClick={addFecha} style={{ ...primaryBtn, padding: "0 14px" }}>
                  <Plus size={16} />
                </button>
              </div>
              {fechas.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {fechas.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: 12,
                        background: "#0E1E35",
                        border: "1px solid #1A3050",
                        borderRadius: 20,
                        padding: "4px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {fmtDateShort(f)}
                      <Trash2 size={12} onClick={() => removeFecha(f)} style={{ cursor: "pointer" }} />
                    </span>
                  ))}
                </div>
              )}

              {!presetPreventivo && <RecipientPicker players={players} targetPlayerIds={targetPlayerIds} onChange={setTargetPlayerIds} />}
              {presetPreventivo && (
                <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 10 }}>
                  Para: {presetPreventivo.memberIds.length} jugador{presetPreventivo.memberIds.length !== 1 ? "es" : ""} de "
                  {presetPreventivo.nombre}"
                </div>
              )}
            </>
          )}

          <ExerciseBuilderBlock
            exercises={exercises}
            onAdd={(ex) => setExercises((prev) => [...prev, ex])}
            onUpdate={(id, updated) => setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)))}
            onRemove={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
            categoria={presetPreventivo ? "PREVENTIVA" : targetPlayerIds ? "INDIVIDUAL" : "COLECTIVA"}
            accentColor={presetPreventivo ? "#EF4444" : "#1E6FD9"}
            onScreenActive={setTaskScreenActive}
          />

          {!taskScreenActive && (
            <>
              {sendError && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>{sendError}</div>}
              {sendOk && <div style={{ color: "#F5C518", fontSize: 13, marginBottom: 10, padding: "0 4px" }}>Guardado y enviado.</div>}
              <button onClick={guardar} disabled={sending} style={{ ...primaryBtn, width: "100%", opacity: sending ? 0.6 : 1 }}>
                <Send size={14} style={{ marginRight: 6 }} />
                {sending ? "Guardando..." : "Guardar y enviar"}
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

function SessionsListView({ players }) {
  const [sesiones, , loaded, , retry] = useEntityList("sesiones");
  const [showEditor, setShowEditor] = useState(false);
  const [editingSesion, setEditingSesion] = useState(null);

  if (showEditor) {
    return (
      <SesionEditScreen
        sesion={editingSesion}
        players={players}
        onBack={() => setShowEditor(false)}
        onSaved={() => {
          retry();
          setShowEditor(false);
        }}
      />
    );
  }

  if (!loaded) return <LoadingBlock />;

  const today = todayStr();
  const noPreventivas = sesiones.filter((s) => !s.preventivo_activo);
  const proximas = noPreventivas
    .filter((s) => (s.fechas || []).some((f) => f >= today))
    .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? -1 : 1));
  const pasadas = noPreventivas
    .filter((s) => !(s.fechas || []).some((f) => f >= today))
    .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? 1 : -1));

  const abrir = (s) => {
    setEditingSesion(s);
    setShowEditor(true);
  };

  return (
    <>
      <button
        onClick={() => {
          setEditingSesion(null);
          setShowEditor(true);
        }}
        style={{ ...primaryBtn, width: "100%", marginBottom: 16 }}
      >
        <Plus size={16} style={{ marginRight: 6 }} />
        Nueva sesión
      </button>

      <Collapsible title="Próximas / de hoy" subtitle={`${proximas.length}`} defaultOpen>
        {!proximas.length ? (
          <div style={{ color: "#8BA4C0", fontSize: 13, padding: "8px 0" }}>No hay ninguna programada.</div>
        ) : (
          proximas.map((s) => <SesionSummaryRow key={s.id} sesion={s} onOpen={() => abrir(s)} />)
        )}
      </Collapsible>
      <Collapsible title="Pasadas" subtitle={`${pasadas.length}`}>
        {!pasadas.length ? (
          <div style={{ color: "#8BA4C0", fontSize: 13, padding: "8px 0" }}>Todavía no hay ninguna.</div>
        ) : (
          pasadas.map((s) => <SesionSummaryRow key={s.id} sesion={s} onOpen={() => abrir(s)} />)
        )}
      </Collapsible>
    </>
  );
}

function TeamSessionManager({ players }) {
  return <SessionsListView players={players} />;
}

function CategoryListRow({ categoria, memberCount, onOpen }) {
  return (
    <div onClick={onOpen} style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{categoria.nombre}</div>
          {categoria.tipo_tejido && <div style={{ fontSize: 11, color: "#4A6680", marginTop: 2 }}>{categoria.tipo_tejido}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#8BA4C0" }}>
            {memberCount} jugador{memberCount !== 1 ? "es" : ""}
          </span>
          <ChevronRight size={16} color="#8BA4C0" />
        </div>
      </div>
    </div>
  );
}

// Las "categorías preventivas" son una taxonomía fija (pestaña CategoriasPreventivas
// del Sheet, gestionada fuera de la app). Aquí solo se asignan jugadores a ellas
// (varias por jugador, ver Jugadores) y se gestionan sus sesiones preventivas.
function InjuryGroupManager({ players }) {
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [activeCategoria, setActiveCategoria] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSesion, setEditingSesion] = useState(null);
  const [sesiones, , sesionesLoaded, , retrySesiones] = useEntityList("sesiones");

  if (!categoriasLoaded) return <LoadingBlock />;

  if (activeCategoria) {
    const memberIds = players.filter((p) => (p.groupIds || []).includes(activeCategoria.id)).map((p) => p.id);

    if (showEditor) {
      return (
        <SesionEditScreen
          sesion={editingSesion}
          players={players}
          presetPreventivo={{ id: activeCategoria.id, nombre: activeCategoria.nombre, memberIds }}
          onBack={() => setShowEditor(false)}
          onSaved={() => {
            retrySesiones();
            setShowEditor(false);
          }}
        />
      );
    }

    const categoriaSesiones = sesionesLoaded
      ? sesiones
          .filter((s) => s.preventivo_activo && (s.jugadores_destino || []).some((id) => memberIds.includes(id)))
          .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? 1 : -1))
      : [];

    return (
      <>
        <BackHeader title={activeCategoria.nombre} subtitle="Preventivos" onBack={() => setActiveCategoria(null)} />
        <Collapsible title="Jugadores con esta categoría" subtitle={`${memberIds.length} asignados`} defaultOpen>
          {!memberIds.length ? (
            <div style={{ color: "#8BA4C0", fontSize: 13 }}>
              Ninguno todavía. Asígnasela desde "Jugadores en plantilla", en la vista de Jugadores.
            </div>
          ) : (
            <div style={{ border: "1px solid #1A3050", borderRadius: 8, overflow: "hidden" }}>
              {players
                .filter((p) => memberIds.includes(p.id))
                .map((p, i, arr) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#F0F4FF",
                      borderBottom: i < arr.length - 1 ? "1px solid #060D1A" : "none",
                    }}
                  >
                    {p.name}
                  </div>
                ))}
            </div>
          )}
        </Collapsible>

        <button
          onClick={() => {
            setEditingSesion(null);
            setShowEditor(true);
          }}
          style={{ ...primaryBtn, width: "100%", marginBottom: 16 }}
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Nueva sesión preventiva
        </button>

        <div style={miniLabel}>Sesiones de esta categoría</div>
        {!sesionesLoaded ? (
          <LoadingBlock />
        ) : !categoriaSesiones.length ? (
          <div style={{ color: "#8BA4C0", fontSize: 13, padding: "8px 0" }}>Todavía no hay ninguna.</div>
        ) : (
          categoriaSesiones.map((s) => (
            <SesionSummaryRow
              key={s.id}
              sesion={s}
              onOpen={() => {
                setEditingSesion(s);
                setShowEditor(true);
              }}
            />
          ))
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Categorías preventivas
      </div>
      {!categorias.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          No hay categorías preventivas configuradas en la pestaña CategoriasPreventivas del Sheet.
        </div>
      ) : (
        <div className="fp-grid">
          {categorias.map((c) => (
            <CategoryListRow
              key={c.id}
              categoria={c}
              memberCount={players.filter((p) => (p.groupIds || []).includes(c.id)).length}
              onOpen={() => setActiveCategoria(c)}
            />
          ))}
        </div>
      )}
    </>
  );
}


// Trae varias filas de una entidad por id en una sola llamada (usa el filtro "IN" del backend).
function useEntityByIds(entity, ids) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const key = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setItems([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list(entity, { id: key })
      .then((res) => {
        if (!cancelled) setItems(res || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, key]);
  return [items, loaded];
}

// Historial completo de un jugador: sus Registros, unidos con la Tarea (series/reps/RIR
// prescritos) y el Ejercicio (nombre, tipos, GIF) correspondientes. Todo en vivo, sin caché.
function usePlayerHistory(playerId) {
  const [registros, , registrosLoaded] = useEntityList("registros", playerId ? { jugador_id: playerId } : false);
  const tareaIds = registros.map((r) => r.tarea_id);
  const [tareas, tareasLoaded] = useEntityByIds("tareas", tareaIds);
  const ejercicioIds = tareas.map((t) => t.ejercicio_id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", ejercicioIds);

  const loaded = registrosLoaded && tareasLoaded && ejerciciosLoaded;
  if (!loaded) return { loaded: false, items: [] };

  const tareasById = new Map(tareas.map((t) => [t.id, t]));
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));

  const items = registros.map((r) => {
    const t = tareasById.get(r.tarea_id) || {};
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    return {
      id: r.id,
      date: r.fecha,
      name: e.nombre || "(tarea eliminada)",
      sets: t.series,
      reps: t.cantidad,
      rir: t.rir,
      tipos: e.tags_descriptivos || [],
      done: !!r.hecho,
      cargaReal: r.carga_kg ?? "",
      rirReal: r.rir ?? "",
    };
  });

  return { loaded: true, items };
}

function PlayerHistoryScreen({ player, onBack }) {
  const { loaded, items } = usePlayerHistory(player.id);
  const [openDate, setOpenDate] = useState(null);

  if (!loaded) return <LoadingBlock />;

  const byDate = {};
  items.forEach((it) => {
    if (!byDate[it.date]) byDate[it.date] = [];
    byDate[it.date].push(it);
  });
  const summaries = Object.entries(byDate).map(([date, list]) => ({
    date,
    total: list.length,
    done: list.filter((i) => i.done).length,
  }));
  const grouped = groupByMonth(summaries, (s) => s.date);

  return (
    <>
      <BackHeader title={player.name} subtitle="Historial" onBack={onBack} />
      {!summaries.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Todavía no hay sesiones registradas para este jugador.
        </div>
      ) : (
        grouped.map(([mKey, monthItems], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${monthItems.length}`} defaultOpen={idx === 0}>
            {[...monthItems]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map(({ date: d, total, done }) => (
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
                    <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>{fmtDateLabel(d)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: done === total && total > 0 ? "#F5C518" : "#8BA4C0" }}>
                      {done}/{total} hechos
                    </div>
                  </div>
                  {openDate === d && (
                    <div style={{ marginTop: 4, marginBottom: 8 }}>
                      {byDate[d].map((ex, i) => (
                        <ReadOnlyExerciseRow key={`${ex.id}-${i}`} ex={ex} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </Collapsible>
        ))
      )}
    </>
  );
}

// Detalle de una sesión ya enviada: sus tareas y cuántos de los jugadores
// destinatarios registraron cada una. Todo calculado en vivo.
function SesionHistoryDetail({ sesion, players, onBack }) {
  const [tareas, tareasLoaded] = useTareasForSesiones([sesion.id]);
  const tareaIds = tareas.map((t) => t.id);
  const ejercicioIds = tareas.map((t) => t.ejercicio_id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", ejercicioIds);
  const [registros, , registrosLoaded] = useEntityList("registros", tareaIds.length ? { tarea_id: tareaIds.join(",") } : false);

  const loaded = tareasLoaded && ejerciciosLoaded && registrosLoaded;
  if (!loaded) return <LoadingBlock />;

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const targets = sesion.jugadores_destino?.length ? sesion.jugadores_destino : players.map((p) => p.id);

  return (
    <>
      <BackHeader
        title={`${sesion.md || ""}${sesion.objetivo ? " · " + sesion.objetivo : ""}`}
        subtitle={(sesion.fechas || []).map((f) => fmtDateShort(f)).join(", ")}
        onBack={onBack}
      />
      <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 12 }}>
        {!sesion.jugadores_destino || !sesion.jugadores_destino.length
          ? "Todo el equipo"
          : `Para: ${players.filter((p) => sesion.jugadores_destino.includes(p.id)).map((p) => p.name).join(", ")}`}
      </div>
      {!tareas.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 13 }}>Esta sesión no tiene tareas.</div>
      ) : (
        tareas.map((t) => {
          const e = ejerciciosById.get(t.ejercicio_id) || {};
          const doneCount = registros.filter((r) => r.tarea_id === t.id && r.hecho).length;
          return (
            <div key={t.id} style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nombre || "(ejercicio eliminado)"}</div>
              <div style={{ fontSize: 13, color: "#8BA4C0", marginTop: 4 }}>
                {t.series} × {t.cantidad} {t.rir !== "" && t.rir != null ? `· RIR ${t.rir}` : ""}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: doneCount === targets.length && targets.length > 0 ? "#F5C518" : "#8BA4C0", marginTop: 6 }}>
                {doneCount}/{targets.length} jugador{targets.length !== 1 ? "es" : ""} completaron el registro
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

// Historial general del entrenador: todas las sesiones ya enviadas (colectivas,
// individuales y preventivas juntas), agrupadas por mes, con detalle al abrir.
function HistorialGeneralView({ players }) {
  const [sesiones, , loaded] = useEntityList("sesiones");
  const [viewing, setViewing] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState("");

  if (viewing) return <SesionHistoryDetail sesion={viewing} players={players} onBack={() => setViewing(null)} />;
  if (!loaded) return <LoadingBlock />;

  const today = todayStr();
  const texto = filtroTexto.trim().toLowerCase();
  const pasadas = sesiones
    .filter((s) => s.enviada && (s.fechas || []).some((f) => f <= today))
    .filter((s) => !texto || (s.objetivo || "").toLowerCase().includes(texto) || (s.md || "").toLowerCase().includes(texto))
    .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? 1 : -1));
  const grouped = groupByMonth(pasadas, (s) => (s.fechas || [])[0] || "");

  return (
    <>
      <input
        style={{ ...inputStyle, marginBottom: 12 }}
        placeholder="Buscar por objetivo o MD..."
        value={filtroTexto}
        onChange={(e) => setFiltroTexto(e.target.value)}
      />
      {!pasadas.length ? (
        <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
          Todavía no se ha enviado ninguna sesión.
        </div>
      ) : (
        grouped.map(([mKey, items], idx) => (
          <Collapsible key={mKey} title={monthLabelOf(mKey)} subtitle={`${items.length}`} defaultOpen={idx === 0}>
            {items.map((s) => (
              <SesionSummaryRow key={s.id} sesion={s} onOpen={() => setViewing(s)} />
            ))}
          </Collapsible>
        ))
      )}
    </>
  );
}


function CoachView() {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias] = useCategoriasPreventivas();
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
    const next = [...players, { name, pin, groupIds: [] }];
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

  if (!playersLoaded) return <LoadingBlock />;

  return (
    <div style={{ padding: "0 20px" }}>
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
        <InjuryGroupManager players={players} />
      ) : section === "equipo" ? (
        <TeamSessionManager players={players} />
      ) : section === "historial" ? (
        <HistorialGeneralView players={players} />
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
            categorias={categorias}
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
  const [players, , playersLoaded, playersError, retryPlayers] = usePlayers();
  const [selected, setSelected] = useState(null);
  const date = todayStr();
  const player = players.find((p) => p.id === selected) || null;

  const [sesiones, , sesionesLoaded] = useEntityList("sesiones");
  const todaySesiones = player
    ? sesiones.filter(
        (s) =>
          s.enviada &&
          (s.fechas || []).includes(date) &&
          (!s.jugadores_destino || !s.jugadores_destino.length || s.jugadores_destino.includes(player.id))
      )
    : [];
  const sesionIds = todaySesiones.map((s) => s.id);
  const [tareas, tareasLoaded] = useTareasForSesiones(sesionIds);
  const tareaIds = tareas.map((t) => t.id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds(
    "ejercicios",
    tareas.map((t) => t.ejercicio_id)
  );
  const [registros, saveRegistros, registrosLoaded] = useEntityList(
    "registros",
    player && tareaIds.length ? { tarea_id: tareaIds.join(","), jugador_id: player.id } : false
  );
  const { loaded: historyLoaded, items: historyItems } = usePlayerHistory(player?.id);

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const registrosByTarea = new Map(registros.map((r) => [r.tarea_id, r]));
  const sesionesById = new Map(todaySesiones.map((s) => [s.id, s]));

  const lastValueByName = {};
  [...historyItems]
    .filter((it) => it.date < date && (it.cargaReal !== "" || it.rirReal !== ""))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      lastValueByName[it.name.toLowerCase()] = { cargaReal: it.cargaReal, rirReal: it.rirReal };
    });

  const allExercises = tareas.map((t) => {
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const r = registrosByTarea.get(t.id);
    return {
      id: t.id,
      name: e.nombre || "(ejercicio eliminado)",
      sets: t.series,
      reps: t.cantidad,
      rir: t.rir,
      notas: t.nota || "",
      videoUrl: e.gif_url || "",
      tipos: e.tags_descriptivos || [],
      done: !!r?.hecho,
      cargaReal: r?.carga_kg ?? "",
      rirReal: r?.rir ?? "",
      mdTag: sesionesById.get(t.sesion_id)?.md || "Sin MD",
    };
  });

  const confirmExercise = async (ex, cargaReal, rirReal) => {
    const existing = registrosByTarea.get(ex.id);
    const wasDone = !!existing?.hecho;
    const record = {
      id: existing?.id,
      jugador_id: player.id,
      tarea_id: ex.id,
      fecha: date,
      hecho: !wasDone,
      reps_hechas: "",
      carga_kg: cargaReal,
      rir: rirReal,
      subtipo_corporal: "",
    };
    const nextRegistros = existing ? registros.map((r) => (r.id === existing.id ? record : r)) : [...registros, record];
    await saveRegistros(nextRegistros);
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
          <PlayerPinLookup players={players} onLogin={(id) => setSelected(id)} />
        )}
      </div>
    );
  }

  const doneCount = allExercises.filter((e) => e.done).length;
  const total = allExercises.length;
  const undoneCount = total - doneCount;
  const missingCargaCount = allExercises.filter((e) => e.done && (e.cargaReal === "" || e.cargaReal == null)).length;
  const loaded = sesionesLoaded && tareasLoaded && ejerciciosLoaded && registrosLoaded && historyLoaded;
  const allDone = total > 0 && doneCount === total;

  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{player.name}</div>
        <button onClick={() => setSelected(null)} style={{ ...iconBtnStyle, fontSize: 12, color: "#8BA4C0" }}>
          Cambiar
        </button>
      </div>
      <div style={{ textTransform: "capitalize", color: "#8BA4C0", fontSize: 13, marginBottom: 14 }}>{fmtDateLabel(date)}</div>

      {!loaded ? (
        <LoadingBlock />
      ) : total === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: "#8BA4C0" }}>
          <ClipboardList size={24} style={{ marginBottom: 8, opacity: 0.6 }} />
          <div>No tienes sesión de fuerza asignada hoy.</div>
        </div>
      ) : allDone ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Check size={22} color="#F5C518" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sesión de hoy completada</div>
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
                  key={ex.id}
                  ex={ex}
                  onConfirm={confirmExercise}
                  isLast={ii === items.length - 1}
                  lastValue={lastValueByName[ex.name.toLowerCase()]}
                />
              ))}
            </div>
          ))}

          {(undoneCount > 0 || missingCargaCount > 0) && (
            <div style={{ fontSize: 12, color: "#F5C518", marginBottom: 8, padding: "0 2px" }}>
              {undoneCount > 0 && `${undoneCount} tarea${undoneCount !== 1 ? "s" : ""} sin marcar como hecha`}
              {undoneCount > 0 && missingCargaCount > 0 && " · "}
              {missingCargaCount > 0 && `${missingCargaCount} sin carga registrada`}
            </div>
          )}
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
