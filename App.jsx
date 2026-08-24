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
  const existentesTexto = existingPins.map((p) => String(p).trim());
  let pin;
  let guard = 0;
  do {
    pin = genPin();
    guard++;
  } while (existentesTexto.includes(pin) && guard < 200);
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
        estado: r.estado || "activo",
        groupIds: Array.isArray(r.categorias_preventivas) ? r.categorias_preventivas : [],
      })),
    [rows]
  );

  const savePlayers = useCallback(
    (nextPlayers) => {
      const nextRows = nextPlayers.map((p) => {
        const original = p.id ? rowsById.get(p.id) : null;
        const groupIds = p.groupIds || [];
        const estado = p.estado || "activo";
        if (
          original &&
          original.nombre === p.name &&
          original.pin === p.pin &&
          original.estado === estado &&
          JSON.stringify(original.categorias_preventivas || []) === JSON.stringify(groupIds)
        ) {
          return original; // sin cambios reales: misma referencia -> no se reguarda
        }
        return { id: p.id, nombre: p.name, pin: p.pin, estado, categorias_preventivas: groupIds };
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
      bloque: t.bloque_sesion || "General",
      nota: t.nota || "",
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

function PlayerView({ presetPlayerId, onExit }) {
  const [players, , playersLoaded, playersError, retryPlayers] = usePlayers();
  const [selected, setSelected] = useState(presetPlayerId || null);
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
        <button onClick={() => (onExit ? onExit() : setSelected(null))} style={{ ...iconBtnStyle, fontSize: 12, color: "#8BA4C0" }}>
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

// ---------- PORTAL DE ACCESO ÚNICO ----------
// Calca el diseño validado de portal-acceso.jsx: pantalla completa,
// sin la cabecera antigua, tipografía monoespaciada, un solo código de
// entrada que dirige según coincida con el PIN de un jugador o con el
// código de entrenador (creándolo la primera vez si no existe).
function PortalAcceso({ onEnterCoach, onEnterPlayer }) {
  const [players, , playersLoaded] = usePlayers();
  const [coachPin, saveCoachPin, coachPinLoaded] = useConfigValue("coach_pin");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "entrenador" } | { tipo: "jugador", nombre, id }
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  const loaded = playersLoaded && coachPinLoaded;

  const validar = () => {
    const valor = codigo.trim();
    if (!valor) return;
    if (coachPin != null && valor === String(coachPin).trim()) {
      setError(false);
      setResultado({ tipo: "entrenador" });
      return;
    }
    const jugador = players.find((p) => String(p.pin).trim() === valor);
    if (jugador) {
      setError(false);
      setResultado({ tipo: "jugador", nombre: jugador.name, id: jugador.id });
      return;
    }
    setError(true);
    setResultado(null);
  };

  const crearPin = async () => {
    if (pinA.length !== 4) return setCreateError("El código debe tener 4 dígitos.");
    if (pinA !== pinB) return setCreateError("Los dos códigos no coinciden.");
    setSaving(true);
    const ok = await saveCoachPin(pinA);
    setSaving(false);
    if (!ok) {
      setCreateError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    setCreatingPin(false);
    setResultado({ tipo: "entrenador" });
  };

  const screenWrap = (content) => (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {content}
    </div>
  );

  if (!loaded) return screenWrap(<LoadingBlock />);

  if (coachPin == null && !creatingPin && !resultado) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: "#F5C518", marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Primer acceso</div>
        <div style={{ fontSize: 13, color: "#8BA4C0", marginBottom: 20, lineHeight: 1.5 }}>
          Todavía no tienes un código de entrenador. Créalo ahora; si eres jugador, pídeselo a tu entrenador antes de
          entrar.
        </div>
        <button
          onClick={() => setCreatingPin(true)}
          style={{ width: "100%", background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Crear mi código de entrenador
        </button>
      </div>
    );
  }

  if (creatingPin) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: "#F5C518", marginBottom: 6 }}>
            ENTRENAMIENTO DE FUERZA
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Crea tu código de entrenador</div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>
          CÓDIGO (4 DÍGITOS)
        </div>
        <div style={{ marginBottom: 10 }}>
          <PinInput value={pinA} onChange={setPinA} autoFocus />
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>
          REPITE EL CÓDIGO
        </div>
        <div style={{ marginBottom: 14 }}>
          <PinInput value={pinB} onChange={setPinB} />
        </div>
        {createError && <div style={{ color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 10 }}>{createError}</div>}
        <button
          onClick={crearPin}
          disabled={saving}
          style={{ width: "100%", background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Guardando..." : "Crear código"}
        </button>
      </div>
    );
  }

  if (resultado) {
    return screenWrap(
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "#0E1E35",
            border: "2px solid #22C55E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            color: "#22C55E",
            margin: "0 auto 16px",
          }}
        >
          ✓
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {resultado.tipo === "entrenador" ? "Acceso como entrenador" : `Hola, ${resultado.nombre}`}
        </div>
        <div style={{ fontSize: 13, color: "#8BA4C0", lineHeight: 1.5, marginBottom: 20 }}>
          {resultado.tipo === "entrenador" ? "Entrando al panel del entrenador..." : "Entrando a tu sesión de hoy..."}
        </div>
        <button
          onClick={() => (resultado.tipo === "entrenador" ? onEnterCoach() : onEnterPlayer(resultado.id))}
          style={{ width: "100%", background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Continuar
        </button>
      </div>
    );
  }

  return screenWrap(
    <div style={{ width: "100%", maxWidth: 320 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: "#F5C518", marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Introduce tu código</div>
        <div style={{ fontSize: 12.5, color: "#8BA4C0", marginTop: 6 }}>El PIN de jugador o el código de entrenador</div>
      </div>

      <input
        value={codigo}
        onChange={(e) => {
          setCodigo(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && validar()}
        placeholder="••••"
        autoFocus
        type="password"
        inputMode="numeric"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#0E1E35",
          border: `1.5px solid ${error ? "#EF4444" : "#1A3050"}`,
          borderRadius: 10,
          color: "#F0F4FF",
          fontSize: 20,
          letterSpacing: "0.2em",
          textAlign: "center",
          padding: "14px 12px",
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 10,
        }}
      />

      {error && (
        <div style={{ color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 10 }}>
          Código no reconocido. Revisa e inténtalo de nuevo.
        </div>
      )}

      <button
        onClick={validar}
        style={{ width: "100%", background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        Entrar
      </button>
    </div>
  );
}


// ==================================================================
// PANTALLAS REALES (calcadas de los mockups, sin componentes de la
// interfaz antigua) — la lógica de datos (api, hooks) es la misma
// capa de persistencia ya probada; el frontend visible es el diseñado.
// ==================================================================

function ChipReal({ children, tono = "neutro" }) {
  const tonos = {
    neutro: { color: "#8BA4C0", border: "#1A305033" },
    verde: { color: "#F5C518", border: "#F5C51855" },
    ambar: { color: "#F97316", border: "#F9731655" },
  };
  const t = tonos[tono];
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.03em",
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SelectorCategoriasReal({ categorias, seleccionadas, onCambiar, onCerrar }) {
  const tipos = ["Muscular", "Tendinosa", "Articular"];
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "120%",
        zIndex: 20,
        width: 200,
        background: "#122440",
        border: "1px solid #1A3050",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 8,
        maxHeight: 320,
        overflowY: "auto",
      }}
      onMouseLeave={onCerrar}
    >
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680", padding: "2px 4px 6px" }}>
        CATEGORÍAS PREVENTIVAS
      </div>
      {tipos.map((tipo) => {
        const delTipo = categorias.filter((c) => c.tipo_tejido === tipo);
        if (!delTipo.length) return null;
        return (
          <div key={tipo}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.05em", color: "#F5C518", padding: "6px 6px 3px" }}>
              {tipo.toUpperCase()}
            </div>
            {delTipo.map((cat) => {
              const activa = seleccionadas.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => onCambiar(activa ? seleccionadas.filter((c) => c !== cat.id) : [...seleccionadas, cat.id])}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 6px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: activa ? "#F5C518" : "#8BA4C0",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: `1.5px solid ${activa ? "#F5C518" : "#1A3050"}`,
                      background: activa ? "#F5C518" : "transparent",
                      color: "#060D1A",
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {activa ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>{cat.nombre}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MenuAccionesReal({ jugador, onAccion, onCerrar }) {
  const acciones = [
    { id: "reset", label: "Resetear PIN" },
    { id: "historial", label: "Ver historial" },
    jugador.estado === "activo"
      ? { id: "suspender", label: "Suspender jugador", tono: "ambar" }
      : { id: "activar", label: "Activar jugador", tono: "verde" },
    { id: "eliminar", label: "Eliminar perfil", tono: "peligro" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "110%",
        zIndex: 20,
        width: 190,
        background: "#122440",
        border: "1px solid #1A3050",
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 6,
      }}
      onMouseLeave={onCerrar}
    >
      {acciones.map((a) => {
        const color = a.tono === "peligro" ? "#EF4444" : a.tono === "ambar" ? "#F97316" : a.tono === "verde" ? "#22C55E" : "#F0F4FF";
        return (
          <div
            key={a.id}
            onClick={() => {
              onAccion(a.id);
              onCerrar();
            }}
            style={{ padding: "8px 10px", borderRadius: 6, fontSize: 12.5, color, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {a.label}
          </div>
        );
      })}
    </div>
  );
}

function FilaJugadorReal({ jugador, categorias, onAccion, onCambiarCategorias }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresCategorias = jugador.groupIds
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px",
        background: "#0E1E35",
        border: `1px solid ${suspendido ? "#F9731633" : "#1A3050"}`,
        borderRadius: 10,
        opacity: suspendido ? 0.7 : 1,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: suspendido ? "#F97316" : "#22C55E", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>{jugador.name}</span>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {nombresCategorias.length > 0 ? (
            nombresCategorias.map((c) => (
              <ChipReal key={c} tono="verde">
                {c}
              </ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: "#4A6680" }}>Sin categoría preventiva</span>
          )}
          <span
            onClick={() => setSelectorAbierto((v) => !v)}
            style={{ fontSize: 11, color: "#4A6680", cursor: "pointer", border: "1px dashed #1A3050", borderRadius: 4, padding: "0px 5px" }}
            title="Editar categorías preventivas"
          >
            +
          </span>
          {selectorAbierto && (
            <SelectorCategoriasReal
              categorias={categorias}
              seleccionadas={jugador.groupIds}
              onCambiar={(nuevas) => onCambiarCategorias(jugador.id, nuevas)}
              onCerrar={() => setSelectorAbierto(false)}
            />
          )}
        </div>
      </div>
      <div
        onClick={() => setPinVisible((v) => !v)}
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "#4A6680", cursor: "pointer", minWidth: 50, textAlign: "center" }}
        title="Mostrar/ocultar PIN"
      >
        {pinVisible ? jugador.pin : "••••"}
      </div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setMenuAbierto((v) => !v)} style={{ background: "transparent", border: "none", color: "#4A6680", fontSize: 18, cursor: "pointer", padding: "2px 6px" }}>
          ⋮
        </button>
        {menuAbierto && <MenuAccionesReal jugador={jugador} onAccion={(id) => onAccion(jugador.id, id)} onCerrar={() => setMenuAbierto(false)} />}
      </div>
    </div>
  );
}

function PanelAltaReal({ pinsExistentes, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [modoPin, setModoPin] = useState("auto");
  const [pinManual, setPinManual] = useState("");
  const [guardando, setGuardando] = useState(false);

  const pinManualDuplicado = modoPin === "manual" && pinManual.length === 4 && pinsExistentes.map((p) => String(p).trim()).includes(pinManual);
  const puedeGuardar = nombre.trim().length > 0 && (modoPin === "auto" || (pinManual.length === 4 && !pinManualDuplicado));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "#0E1E35", border: "1px solid #1A3050", borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F4FF" }}>Añadir jugador</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>NOMBRE</span>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Pablo Fernández"
            style={{ background: "#122440", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 13.5, padding: "9px 10px" }}
          />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>PIN DE ACCESO</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "auto", label: "Generar automáticamente" },
              { id: "manual", label: "Introducir el mío" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => setModoPin(op.id)}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: "8px 8px",
                  borderRadius: 7,
                  border: `1px solid ${modoPin === op.id ? "#F5C518" : "#1A3050"}`,
                  background: modoPin === op.id ? "#F5C51822" : "transparent",
                  color: modoPin === op.id ? "#F5C518" : "#8BA4C0",
                  cursor: "pointer",
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
          {modoPin === "manual" && (
            <div>
              <input
                value={pinManual}
                onChange={(e) => setPinManual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 dígitos"
                inputMode="numeric"
                style={{
                  width: 100,
                  background: "#122440",
                  border: `1px solid ${pinManualDuplicado ? "#EF4444" : "#1A3050"}`,
                  borderRadius: 7,
                  color: "#F0F4FF",
                  fontSize: 15,
                  padding: "8px 10px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  textAlign: "center",
                  letterSpacing: "0.15em",
                }}
              />
              {pinManualDuplicado && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5 }}>Ese PIN ya lo usa otro jugador — elige otro.</div>}
            </div>
          )}
          {modoPin === "auto" && <div style={{ fontSize: 11, color: "#4A6680" }}>Se generará un PIN de 4 dígitos que no coincide con ningún otro del roster.</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onCerrar} style={{ background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            disabled={!puedeGuardar || guardando}
            onClick={async () => {
              setGuardando(true);
              const pin = modoPin === "auto" ? genUniquePin(pinsExistentes) : pinManual;
              await onGuardar({ nombre: nombre.trim(), pin });
              setGuardando(false);
            }}
            style={{
              background: puedeGuardar ? "#F5C518" : "#1A3050",
              border: `1px solid ${puedeGuardar ? "#F5C518" : "#1A3050"}`,
              color: puedeGuardar ? "#060D1A" : "#4A6680",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: puedeGuardar ? "pointer" : "not-allowed",
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? "Guardando..." : "Añadir jugador"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GestionRosterReal({ onBack, onOpenHistory }) {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [panelAltaAbierto, setPanelAltaAbierto] = useState(false);

  if (!playersLoaded || !categoriasLoaded) return <LoadingBlock />;

  const manejarAccion = async (id, accion) => {
    if (accion === "suspender") {
      await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "suspendido" } : p)));
    } else if (accion === "activar") {
      await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "activo" } : p)));
    } else if (accion === "eliminar") {
      await savePlayers(players.filter((p) => p.id !== id));
    } else if (accion === "reset") {
      const otherPins = players.filter((p) => p.id !== id).map((p) => p.pin);
      await savePlayers(players.map((p) => (p.id === id ? { ...p, pin: genUniquePin(otherPins) } : p)));
    } else if (accion === "historial") {
      const jugador = players.find((p) => p.id === id);
      onOpenHistory?.(jugador);
    }
  };

  const agregarJugador = async ({ nombre, pin }) => {
    const ok = await savePlayers([...players, { name: nombre, pin, estado: "activo", groupIds: [] }]);
    if (ok) setPanelAltaAbierto(false);
  };

  const cambiarCategorias = async (id, nuevas) => {
    await savePlayers(players.map((p) => (p.id === id ? { ...p, groupIds: nuevas } : p)));
  };

  const visibles = players
    .filter((j) => (filtro === "todos" ? true : j.estado === filtro))
    .filter((j) => j.name.toLowerCase().includes(busqueda.toLowerCase()));
  const activos = players.filter((j) => j.estado === "activo").length;
  const suspendidos = players.filter((j) => j.estado === "suspendido").length;

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>ROSTER · SUB-19</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>Jugadores</h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
            {activos} activos · {suspendidos} suspendidos
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar jugador..."
            style={{ flex: 1, minWidth: 160, background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 13, padding: "8px 10px" }}
          />
          {[
            { id: "todos", label: "Todos" },
            { id: "activo", label: "Activos" },
            { id: "suspendido", label: "Suspendidos" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                fontSize: 12.5,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${filtro === f.id ? "#F5C518" : "#1A3050"}`,
                background: filtro === f.id ? "#F5C51822" : "transparent",
                color: filtro === f.id ? "#F5C518" : "#8BA4C0",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibles.map((j) => (
            <FilaJugadorReal key={j.id} jugador={j} categorias={categorias} onAccion={manejarAccion} onCambiarCategorias={cambiarCategorias} />
          ))}
          {visibles.length === 0 && <div style={{ color: "#4A6680", fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin jugadores en este filtro</div>}
        </div>
        <button
          onClick={() => setPanelAltaAbierto(true)}
          style={{ width: "100%", marginTop: 16, background: "transparent", border: "1px dashed #F5C51866", color: "#F5C518", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
        >
          + Añadir jugador
        </button>
      </div>
      {panelAltaAbierto && <PanelAltaReal pinsExistentes={players.map((j) => j.pin)} onGuardar={agregarJugador} onCerrar={() => setPanelAltaAbierto(false)} />}
    </div>
  );
}

function IconoModulo({ tipo }) {
  const common = { width: 20, height: 20, stroke: "currentColor", fill: "none", strokeWidth: 1.6 };
  switch (tipo) {
    case "calendario":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "lapiz":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "personas":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
          <circle cx="17.5" cy="9" r="2.4" />
          <path d="M15.8 14.2c2.7.3 4.7 2.4 4.7 5.3" />
        </svg>
      );
    case "libro":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "reloj":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    default:
      return null;
  }
}

const MODULOS_DASHBOARD = [
  { id: "programacion", nombre: "Programación", descripcion: "Sesión de hoy y próximas programadas", icono: "calendario" },
  { id: "diseno", nombre: "Diseñar sesión", descripcion: "Crear una sesión nueva", icono: "lapiz" },
  { id: "roster", nombre: "Jugadores", descripcion: "Roster, PINs y categorías preventivas", icono: "personas" },
  { id: "biblioteca", nombre: "Biblioteca", descripcion: "Ejercicios, categorías y rotación", icono: "libro" },
  { id: "historial", nombre: "Historial", descripcion: "Registro diario por jugador", icono: "reloj" },
];

function TarjetaModuloReal({ modulo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 12, padding: "16px 16px", cursor: "pointer" }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 10, background: "#122440", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", flexShrink: 0 }}>
        <IconoModulo tipo={modulo.icono} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#F0F4FF" }}>{modulo.nombre}</div>
        <div style={{ fontSize: 12, color: "#8BA4C0", marginTop: 2 }}>{modulo.descripcion}</div>
      </div>
      <span style={{ color: "#4A6680", fontSize: 16 }}>›</span>
    </button>
  );
}

function DashboardEntrenadorReal({ onAbrirModulo, onCerrarSesion }) {
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518" }}>MODO ENTRENADOR</div>
            <button
              onClick={onCerrarSesion}
              style={{ fontSize: 11.5, color: "#8BA4C0", background: "transparent", border: "1px solid #1A3050", borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}
            >
              Cerrar sesión
            </button>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>Buenas, David</h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0", textTransform: "capitalize" }}>{hoy}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODULOS_DASHBOARD.map((m) => (
            <TarjetaModuloReal key={m.id} modulo={m} onClick={() => onAbrirModulo(m.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}


// ---------- HISTORIAL (calcado de historial.jsx) ----------

function PuntoEstadoReal({ hecho }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: hecho ? "#22C55E" : "#1A3050",
        border: hecho ? "none" : "1px solid #EF4444",
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

function FilaTareaHistorialReal({ tarea: t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PuntoEstadoReal hecho={t.done} />
        <span style={{ fontSize: 12, color: t.done ? "#F0F4FF" : "#4A6680", flex: 1 }}>{t.name}</span>
        {t.done && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#4A6680", textAlign: "right" }}>
            {t.reps} reps
            {t.cargaReal !== "" && t.cargaReal != null ? ` · ${t.cargaReal}kg` : ""}
            {t.rirReal !== "" && t.rirReal != null ? ` · RIR${t.rirReal}` : ""}
          </span>
        )}
      </div>
      {t.nota && (
        <div style={{ marginLeft: 20, display: "flex", gap: 5, fontSize: 10.5, color: "#8BA4C0" }}>
          <span style={{ color: "#F97316", flexShrink: 0 }}>📝</span>
          <span>{t.nota}</span>
        </div>
      )}
    </div>
  );
}

function TarjetaDiaReal({ fecha, tareasDelDia }) {
  const [abierto, setAbierto] = useState(false);
  const total = tareasDelDia.length;
  const hechas = tareasDelDia.filter((t) => t.done).length;
  const bloques = {};
  tareasDelDia.forEach((t) => {
    if (!bloques[t.bloque]) bloques[t.bloque] = [];
    bloques[t.bloque].push(t);
  });

  return (
    <div style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setAbierto((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F0F4FF", textTransform: "capitalize" }}>{fmtDateLabel(fecha)}</div>
          <div style={{ fontSize: 11, color: "#4A6680", marginTop: 2 }}>
            {hechas}/{total} tareas completadas
          </div>
        </div>
        <span style={{ color: "#4A6680", fontSize: 12, transform: abierto ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierto && (
        <div style={{ borderTop: "1px solid #1A3050", padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(bloques).map(([nombreBloque, tareas]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8BA4C0", marginBottom: 5 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tareas.map((t) => (
                  <FilaTareaHistorialReal key={t.id} tarea={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistorialPorJugador({ players }) {
  const [jugadorSel, setJugadorSel] = useState(players[0]?.id || "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const { loaded, items } = usePlayerHistory(jugadorSel || null);

  if (!players.length) {
    return <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no hay jugadores en el roster.</div>;
  }

  const porFecha = {};
  items
    .filter((it) => (!desde || it.date >= desde) && (!hasta || it.date <= hasta))
    .forEach((it) => {
      if (!porFecha[it.date]) porFecha[it.date] = [];
      porFecha[it.date].push(it);
    });
  const fechas = Object.keys(porFecha).sort().reverse();

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>JUGADOR</span>
        <select
          value={jugadorSel}
          onChange={(e) => setJugadorSel(e.target.value)}
          style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 13, padding: "8px 10px", maxWidth: 240 }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>DESDE</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 12.5, padding: "7px 8px" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>HASTA</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 12.5, padding: "7px 8px" }} />
        </label>
      </div>
      {!loaded ? (
        <LoadingBlock />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fechas.map((f) => (
            <TarjetaDiaReal key={f} fecha={f} tareasDelDia={porFecha[f]} />
          ))}
          {fechas.length === 0 && <div style={{ color: "#4A6680", fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin sesiones registradas en este rango</div>}
        </div>
      )}
    </>
  );
}

function HistorialPorSesion({ players }) {
  const [sesiones, , sesionesLoaded] = useEntityList("sesiones");
  const [fechaSesionSel, setFechaSesionSel] = useState("");
  const enviadas = sesiones
    .filter((s) => s.enviada)
    .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? 1 : -1));
  const sesionSel = enviadas.find((s) => s.id === fechaSesionSel) || enviadas[0] || null;

  const sesionIdForTareas = sesionSel?.id;
  const [tareas, tareasLoaded] = useTareasForSesiones(sesionIdForTareas ? [sesionIdForTareas] : []);
  const tareaIds = tareas.map((t) => t.id);
  const [registros, , registrosLoaded] = useEntityList("registros", tareaIds.length ? { tarea_id: tareaIds.join(",") } : false);

  if (!sesionesLoaded) return <LoadingBlock />;
  if (!enviadas.length) {
    return <div style={{ color: "#8BA4C0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no se ha enviado ninguna sesión.</div>;
  }

  const targets = sesionSel?.jugadores_destino?.length ? players.filter((p) => sesionSel.jugadores_destino.includes(p.id)) : players;
  const loaded = tareasLoaded && (tareaIds.length ? registrosLoaded : true);
  const estados = loaded
    ? targets.map((p) => {
        const enviado = tareas.length > 0 && tareas.every((t) => registros.some((r) => r.tarea_id === t.id && r.jugador_id === p.id && r.hecho));
        return { jugador: p.name, enviado };
      })
    : [];
  const enviadosCount = estados.filter((e) => e.enviado).length;

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>SESIÓN</span>
        <select
          value={sesionSel?.id || ""}
          onChange={(e) => setFechaSesionSel(e.target.value)}
          style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 13, padding: "8px 10px", maxWidth: 280 }}
        >
          {enviadas.map((s) => (
            <option key={s.id} value={s.id}>
              {(s.fechas || []).map((f) => fmtDateShort(f)).join(", ")}
              {s.md ? ` · ${s.md}` : ""}
              {s.objetivo ? ` · ${s.objetivo}` : ""}
            </option>
          ))}
        </select>
      </label>
      {!loaded ? (
        <LoadingBlock />
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#8BA4C0", marginBottom: 12, background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, padding: "8px 12px" }}>
            <strong style={{ color: enviadosCount === estados.length && estados.length > 0 ? "#22C55E" : "#F97316" }}>
              {enviadosCount}/{estados.length}
            </strong>{" "}
            jugadores han enviado esta sesión
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {estados.map((e) => (
              <div key={e.jugador} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: e.enviado ? "#22C55E" : "#1A3050", border: e.enviado ? "none" : "1px solid #F97316", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: "#F0F4FF" }}>{e.jugador}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: e.enviado ? "#22C55E" : "#F97316" }}>{e.enviado ? "✓ Enviada" : "Sin enviar"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function HistorialReal({ onBack }) {
  const [players, , playersLoaded] = usePlayers();
  const [vista, setVista] = useState("jugador");

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>HISTORIAL</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>Registro diario</h1>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[
            { id: "jugador", label: "Por jugador" },
            { id: "sesion", label: "Por sesión" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              style={{
                fontSize: 12.5,
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${vista === v.id ? "#F5C518" : "#1A3050"}`,
                background: vista === v.id ? "#F5C51822" : "transparent",
                color: vista === v.id ? "#F5C518" : "#8BA4C0",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        {!playersLoaded ? <LoadingBlock /> : vista === "jugador" ? <HistorialPorJugador players={players} /> : <HistorialPorSesion players={players} />}
      </div>
    </div>
  );
}


// ---------- PROGRAMACIÓN (calcado de programacion.jsx) ----------

function TareaVisualReal({ tarea }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#122440", border: "1px solid #1A3050", borderRadius: 8, padding: "8px 10px" }}>
      {tarea.gif ? (
        <img src={tarea.gif} alt="" style={{ width: 42, height: 42, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: 7, background: "#0E1E35", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#4A6680", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
          GIF
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "#F0F4FF" }}>{tarea.nombre}</div>
        <div style={{ fontSize: 10.5, color: "#4A6680", fontFamily: "'IBM Plex Mono', monospace" }}>{tarea.detalle}</div>
        {tarea.nota && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, fontSize: 10, color: "#8BA4C0" }}>
            <span style={{ color: "#F97316" }}>📝</span>
            <span>{tarea.nota}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaSesionReal({ sesion, esHoy, onEditar }) {
  const [abierta, setAbierta] = useState(esHoy);
  const bloques = {};
  (sesion.tareas || []).forEach((t) => {
    // Si la tarea tiene fecha propia (Movilidad/Preventivo con varias fechas
    // en la misma sesión), se agrupa aparte con su fecha en la etiqueta, para
    // no mezclar el ejercicio de un día con el de otro bajo el mismo nombre.
    const nombreBloque = t.fecha ? `${t.bloque_sesion || "General"} · ${fmtDateShort(t.fecha)}` : t.bloque_sesion || "General";
    if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
    bloques[nombreBloque].push(t);
  });

  return (
    <div style={{ background: "#0E1E35", border: `1px solid ${esHoy ? "#F5C51866" : "#1A3050"}`, borderRadius: 12, overflow: "hidden" }}>
      <div onClick={() => setAbierta((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esHoy && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: "0.05em", color: "#F5C518", border: "1px solid #F5C51855", borderRadius: 4, padding: "1px 6px" }}>
                HOY
              </span>
            )}
            {(sesion.fechas || []).map((f) => (
              <span key={f} style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>
                {fmtDateShort(f)}
              </span>
            ))}
            {sesion.md && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#8BA4C0", border: "1px solid #1A3050", borderRadius: 4, padding: "1px 6px" }}>{sesion.md}</span>
            )}
            {sesion.enviada && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#22C55E", border: "1px solid #22C55E55", borderRadius: 4, padding: "1px 6px" }}>✓ ENVIADA</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "#4A6680", marginTop: 3 }}>
            {!sesion.jugadores_destino || !sesion.jugadores_destino.length ? "Todo el equipo" : `${sesion.jugadores_destino.length} jugador(es)`}
            {(sesion.fechas || []).length > 1 && ` · lote de ${sesion.fechas.length} fechas`}
          </div>
        </div>
        <span style={{ color: "#4A6680", fontSize: 12, transform: abierta ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierta && (
        <div style={{ borderTop: "1px solid #1A3050", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {sesion.enviada && (
            <div style={{ fontSize: 11.5, color: "#F97316", background: "#F9731618", border: "1px solid #F9731655", borderRadius: 6, padding: "8px 10px" }}>
              🔒 Ya hay registros de jugadores en esta sesión — solo visualización, no se puede modificar.
            </div>
          )}
          {sesion.objetivo && (
            <div style={{ fontSize: 12, color: "#8BA4C0" }}>
              <strong style={{ color: "#F0F4FF" }}>Objetivo:</strong> {sesion.objetivo}
            </div>
          )}
          {Object.entries(bloques).map(([nombreBloque, tareas]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#8BA4C0", marginBottom: 6 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tareas.map((t) => (
                  <TareaVisualReal
                    key={t.id}
                    tarea={{ nombre: t.nombreEjercicio, detalle: `${t.series} × ${t.cantidad}${t.rir !== "" && t.rir != null ? ` · RIR ${t.rir}` : ""}`, gif: t.gif_url, nota: t.nota }}
                  />
                ))}
              </div>
            </div>
          ))}
          {!sesion.enviada && (
            <button
              onClick={() => onEditar(sesion)}
              style={{ alignSelf: "flex-start", fontSize: 12.5, padding: "8px 14px", borderRadius: 8, border: "1px solid #1A3050", background: "transparent", color: "#8BA4C0", cursor: "pointer", fontWeight: 600 }}
            >
              Editar esta sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramacionReal({ players, onBack }) {
  const [sesiones, , sesionesLoaded, , retry] = useEntityList("sesiones");
  const [ejercicios, , ejerciciosLoaded] = useEntityList("ejercicios");
  const [editingSesion, setEditingSesion] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const sesionIds = sesiones.map((s) => s.id);
  const [tareas, tareasLoaded] = useTareasForSesiones(sesionIds);

  if (showEditor) {
    return (
      <DisenoSesionReal
        sesionExistente={editingSesion}
        onBack={() => setShowEditor(false)}
        onGuardado={() => {
          retry();
          setShowEditor(false);
        }}
      />
    );
  }


  if (!sesionesLoaded || !ejerciciosLoaded || !tareasLoaded) return <LoadingBlock />;

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const tareasBySesion = new Map();
  tareas.forEach((t) => {
    if (!tareasBySesion.has(t.sesion_id)) tareasBySesion.set(t.sesion_id, []);
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    tareasBySesion.get(t.sesion_id).push({ ...t, nombreEjercicio: e.nombre || "(ejercicio eliminado)", gif_url: e.gif_url });
  });

  const today = todayStr();
  const conTareas = sesiones.map((s) => ({ ...s, tareas: tareasBySesion.get(s.id) || [] }));
  const hoy = conTareas.filter((s) => (s.fechas || []).includes(today));
  const futuras = conTareas
    .filter((s) => !(s.fechas || []).includes(today) && (s.fechas || []).some((f) => f > today))
    .sort((a, b) => ((a.fechas || [])[0] < (b.fechas || [])[0] ? -1 : 1));

  const editar = (s) => {
    setEditingSesion(s);
    setShowEditor(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>PROGRAMACIÓN</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>Sesiones</h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>{hoy.length > 0 ? "Sesión de hoy y próximas programadas" : "Próximas sesiones programadas"}</div>
        </div>
        {hoy.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.05em", color: "#4A6680", marginBottom: 8 }}>HOY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hoy.map((s) => (
                <TarjetaSesionReal key={s.id} sesion={s} esHoy onEditar={editar} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.05em", color: "#4A6680", marginBottom: 8 }}>PRÓXIMAS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {futuras.map((s) => (
              <TarjetaSesionReal key={s.id} sesion={s} esHoy={false} onEditar={editar} />
            ))}
            {futuras.length === 0 && <div style={{ color: "#4A6680", fontSize: 13, padding: "16px 0", textAlign: "center" }}>No hay más sesiones programadas</div>}
          </div>
        </div>
      </div>
    </div>
  );
}



// ---------- PANTALLA DEL JUGADOR (calcado de pantalla-jugador.jsx) ----------

function TareaCardReal({ tarea, hecho, onToggle, registro, onCambiarRegistro, onAmpliarGif, orden }) {
  return (
    <div style={{ background: "#0E1E35", border: `1px solid ${hecho ? "#22C55E55" : "#1A3050"}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#122440", color: "#F5C518", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        {tarea.gif ? (
          <img src={tarea.gif} alt={`Demostración: ${tarea.nombre}`} onClick={onAmpliarGif} style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: 8, background: "#122440", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#4A6680", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
            GIF
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F4FF" }}>{tarea.nombre}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#8BA4C0", marginTop: 2 }}>
            {tarea.series ? `${tarea.series} × ` : ""}
            {tarea.cantidad} {tarea.unidad}
          </div>
          <div style={{ fontSize: 10.5, color: "#4A6680", marginTop: 3 }}>{tarea.referencia ? `Última vez: ${tarea.referencia}` : "Sin registro previo"}</div>
        </div>
        <button
          onClick={onToggle}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `1.5px solid ${hecho ? "#22C55E" : "#1A3050"}`,
            background: hecho ? "#22C55E" : "transparent",
            color: hecho ? "#060D1A" : "#4A6680",
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {hecho ? "✓" : ""}
        </button>
      </div>
      {tarea.nota && (
        <div style={{ marginLeft: 56, display: "flex", gap: 6, background: "#122440", border: "1px solid #1A3050", borderRadius: 6, padding: "6px 8px" }}>
          <span style={{ color: "#F97316", fontSize: 11.5, flexShrink: 0 }}>📝</span>
          <span style={{ fontSize: 11.5, color: "#8BA4C0", lineHeight: 1.35 }}>{tarea.nota}</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 56 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680" }}>CARGA KG</span>
            <input
              value={registro.carga}
              onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
              placeholder="—"
              style={{ width: 60, background: "#122440", border: "1px solid #1A3050", borderRadius: 6, color: "#F0F4FF", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "6px 7px", textAlign: "center" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680" }}>RIR</span>
            <input
              value={registro.rir}
              onChange={(e) => onCambiarRegistro({ ...registro, rir: e.target.value })}
              placeholder="—"
              style={{ width: 46, background: "#122440", border: "1px solid #1A3050", borderRadius: 6, color: "#F0F4FF", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "6px 7px", textAlign: "center" }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function PantallaJugadorReal({ presetPlayerId, onExit }) {
  const [players, , playersLoaded] = usePlayers();
  const player = players.find((p) => p.id === presetPlayerId) || null;
  const date = todayStr();

  const [sesiones, , sesionesLoaded] = useEntityList("sesiones");
  const todaySesiones = player
    ? sesiones.filter((s) => s.enviada && (s.fechas || []).includes(date) && (!s.jugadores_destino || !s.jugadores_destino.length || s.jugadores_destino.includes(player.id)))
    : [];
  const sesionIds = todaySesiones.map((s) => s.id);
  const [tareas, tareasLoaded] = useTareasForSesiones(sesionIds);
  const tareaIds = tareas.map((t) => t.id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", tareas.map((t) => t.ejercicio_id));
  const [registros, saveRegistros, registrosLoaded] = useEntityList("registros", player && tareaIds.length ? { tarea_id: tareaIds.join(","), jugador_id: player.id } : false);
  const { loaded: historyLoaded, items: historyItems } = usePlayerHistory(player?.id);

  const [registrosDraft, setRegistrosDraft] = useState({});
  const [gifAmpliado, setGifAmpliado] = useState(null);
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!playersLoaded) return <LoadingBlock />;
  if (!player) {
    return (
      <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>No se encontró tu perfil.</div>
          <button onClick={onExit} style={{ background: "#F5C518", border: "none", color: "#060D1A", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>
            Volver al portal
          </button>
        </div>
      </div>
    );
  }

  const loaded = sesionesLoaded && tareasLoaded && ejerciciosLoaded && registrosLoaded && historyLoaded;
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const registrosByTarea = new Map(registros.map((r) => [r.tarea_id, r]));

  const lastValueByName = {};
  [...historyItems]
    .filter((it) => it.date < date && (it.cargaReal !== "" || it.rirReal !== ""))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      lastValueByName[it.name.toLowerCase()] = it;
    });

  const bloques = {};
  tareas
    .filter((t) => !t.fecha || t.fecha === date)
    .forEach((t) => {
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const nombreBloque = t.bloque_sesion || "General";
    if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
    const lv = lastValueByName[(e.nombre || "").toLowerCase()];
    bloques[nombreBloque].push({
      id: t.id,
      nombre: e.nombre || "(ejercicio eliminado)",
      series: t.series,
      cantidad: t.cantidad,
      unidad: "reps",
      nota: t.nota || "",
      gif: e.gif_url || "",
      referencia: lv ? `${lv.cargaReal || "—"}kg${lv.rirReal !== "" && lv.rirReal != null ? ` · RIR${lv.rirReal}` : ""}` : null,
    });
  });

  const todasLasTareas = Object.values(bloques).flat();
  const totalTareas = todasLasTareas.length;
  const totalHechas = todasLasTareas.filter((t) => !!registrosByTarea.get(t.id)?.hecho).length;

  const getRegistro = (id) => registrosDraft[id] || { carga: registrosByTarea.get(id)?.carga_kg ?? "", rir: registrosByTarea.get(id)?.rir ?? "" };
  const setRegistroDraft = (id, val) => setRegistrosDraft((prev) => ({ ...prev, [id]: val }));

  const toggle = async (t) => {
    const existing = registrosByTarea.get(t.id);
    const wasDone = !!existing?.hecho;
    const draft = getRegistro(t.id);
    const record = {
      id: existing?.id,
      jugador_id: player.id,
      tarea_id: t.id,
      fecha: date,
      hecho: !wasDone,
      reps_hechas: "",
      carga_kg: draft.carga,
      rir: draft.rir,
      subtipo_corporal: "",
    };
    const next = existing ? registros.map((r) => (r.id === existing.id ? record : r)) : [...registros, record];
    await saveRegistros(next);
  };

  if (enviado) {
    return (
      <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#0E1E35", border: "2px solid #22C55E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#22C55E" }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#F0F4FF" }}>Sesión enviada</div>
          <div style={{ fontSize: 13, color: "#8BA4C0", maxWidth: 260, lineHeight: 1.5 }}>Tu próxima sesión estará disponible aquí cuando toque.</div>
          <button onClick={onExit} style={{ marginTop: 8, background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 10, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>
            ← Volver al portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 14px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button onClick={onExit} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Cambiar de jugador
        </button>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>SESIÓN DE HOY</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>{player.name}</h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0", textTransform: "capitalize" }}>{fmtDateLabel(date)}</div>
          {totalTareas > 0 && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: "#1A3050", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(totalHechas / totalTareas) * 100}%`, background: "#F5C518", transition: "width 0.25s ease" }} />
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4A6680" }}>
                {totalHechas}/{totalTareas}
              </span>
            </div>
          )}
        </div>

        {!loaded ? (
          <LoadingBlock />
        ) : totalTareas === 0 ? (
          <div style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 12, padding: 20, textAlign: "center", color: "#8BA4C0" }}>
            <div style={{ marginBottom: 6 }}>No tienes sesión de fuerza asignada hoy.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(bloques).map(([nombreBloque, tareasBloque]) => (
                <div key={nombreBloque}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#8BA4C0" }}>{nombreBloque}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasBloque.map((t) => (
                      <TareaCardReal
                        key={t.id}
                        tarea={t}
                        hecho={!!registrosByTarea.get(t.id)?.hecho}
                        onToggle={() => toggle(t)}
                        registro={getRegistro(t.id)}
                        onCambiarRegistro={(val) => setRegistroDraft(t.id, val)}
                        onAmpliarGif={() => t.gif && setGifAmpliado(t.gif)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pidiendoConfirmacion ? (
              <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
                <button
                  onClick={() => setPidiendoConfirmacion(false)}
                  style={{ flex: 1, background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setEnviado(true);
                    setPidiendoConfirmacion(false);
                  }}
                  style={{ flex: 2, background: "#22C55E", border: "1px solid #22C55E", color: "#060D1A", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  Confirmar envío
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPidiendoConfirmacion(true)}
                style={{
                  width: "100%",
                  marginTop: 22,
                  background: totalHechas === totalTareas ? "#22C55E" : "#122440",
                  border: `1px solid ${totalHechas === totalTareas ? "#22C55E" : "#1A3050"}`,
                  color: totalHechas === totalTareas ? "#060D1A" : "#4A6680",
                  borderRadius: 10,
                  padding: "13px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {totalHechas === totalTareas ? "Enviar sesión completada" : "Enviar progreso"}
              </button>
            )}
          </>
        )}
      </div>

      {gifAmpliado && (
        <div onClick={() => setGifAmpliado(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 24 }}>
          <img src={gifAmpliado} alt="Demostración ampliada" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }} />
          <button
            onClick={() => setGifAmpliado(null)}
            style={{ position: "absolute", top: 20, right: 20, background: "#0E1E35", border: "1px solid #1A3050", color: "#F0F4FF", width: 34, height: 34, borderRadius: "50%", fontSize: 16, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}


// ---------- BIBLIOTECA DE EJERCICIOS (calcado de biblioteca-ejercicios.jsx) ----------

const BLOQUES_BIBLIOTECA = ["Fuerza", "Específicas", "Core", "Movilidad", "Preventivo", "Resistencia"];
const TAGS_DESCRIPTIVOS_BIBLIOTECA = ["Miembro superior", "Miembro inferior"];
const TIPOS_TEJIDO_BIBLIOTECA = ["Muscular", "Tendinosa", "Articular"];

function TagChipReal({ tag, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.02em",
        color: activo ? "#060D1A" : "#8BA4C0",
        background: activo ? "#F5C518" : "transparent",
        border: `1px solid ${activo ? "#F5C518" : "#1A3050"}`,
        borderRadius: 6,
        padding: "4px 9px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </button>
  );
}

function campoSelectReal(extra = {}) {
  return { background: "#122440", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 13, padding: "8px 9px", ...extra };
}

const btnIconoReal = { background: "transparent", border: "1px solid #1A3050", borderRadius: 6, color: "#4A6680", width: 26, height: 26, cursor: "pointer", fontSize: 12.5 };

function TarjetaEjercicioReal({ ejercicio, categorias, onEditar, onEliminar }) {
  const nombreCategoria = categorias.find((c) => c.id === ejercicio.categoria_preventiva_id)?.nombre;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 10 }}>
      {ejercicio.gif_url ? (
        <img src={ejercicio.gif_url} alt="" style={{ width: 40, height: 40, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 7, background: "#122440", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#4A6680", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
          —
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F0F4FF" }}>{ejercicio.nombre}</div>
        <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {nombreCategoria && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#F5C518", border: "1px solid #F5C51855", borderRadius: 4, padding: "1px 5px" }}>{nombreCategoria}</span>
          )}
          {(ejercicio.tags_descriptivos || []).map((t) => (
            <span key={t} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#4A6680", border: "1px solid #1A3050", borderRadius: 4, padding: "1px 5px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onEditar} style={btnIconoReal} title="Editar ejercicio">
        ✎
      </button>
      <button onClick={onEliminar} style={btnIconoReal} title="Eliminar ejercicio">
        ×
      </button>
    </div>
  );
}

function PanelNuevoEjercicioReal({ categorias, onGuardar, onCerrar, ejercicioEditar }) {
  const [nombre, setNombre] = useState(ejercicioEditar?.nombre || "");
  const [bloque, setBloque] = useState(ejercicioEditar?.bloque || "Fuerza");
  const [categoriaId, setCategoriaId] = useState(ejercicioEditar?.categoria_preventiva_id || categorias[0]?.id || "");
  const [tagsSel, setTagsSel] = useState(ejercicioEditar?.tags_descriptivos || []);
  const [gifUrl, setGifUrl] = useState(ejercicioEditar?.gif_url || "");
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = React.useRef(null);

  const esPreventivo = bloque === "Preventivo";
  const toggleTag = (t) => setTagsSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const subirGif = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setSubiendo(true);
      try {
        const upload = await api.uploadGif(reader.result);
        if (upload?.fileId) setGifUrl(`https://lh3.googleusercontent.com/d/${upload.fileId}`);
      } finally {
        setSubiendo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }} onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#0E1E35", border: "1px solid #1A3050", borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F4FF" }}>{ejercicioEditar ? "Editar ejercicio" : "Nuevo ejercicio"}</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>NOMBRE</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sentadilla frontal" style={campoSelectReal()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>BLOQUE (único, obligatorio)</span>
          <select value={bloque} onChange={(e) => setBloque(e.target.value)} style={campoSelectReal()}>
            {BLOQUES_BIBLIOTECA.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        {esPreventivo && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#F5C518" }}>CATEGORÍA PREVENTIVA (obligatoria, solo aplica a este bloque)</span>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={campoSelectReal()}>
              {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
                <optgroup key={tipo} label={tipo}>
                  {categorias
                    .filter((c) => c.tipo_tejido === tipo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>TAGS DESCRIPTIVOS (solo para buscar — no afectan a la rotación)</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => (
              <TagChipReal key={t} tag={t} activo={tagsSel.includes(t)} onClick={() => toggleTag(t)} />
            ))}
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>GIF</span>
          {gifUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={gifUrl} alt="Vista previa del GIF" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid #1A3050" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#F5C518" }}>GIF cargado</span>
                <button onClick={() => setGifUrl("")} style={{ background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, cursor: "pointer", width: "fit-content" }}>
                  Quitar y subir otro
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()} style={{ border: "1px dashed #1A3050", borderRadius: 8, padding: 14, textAlign: "center", color: "#4A6680", fontSize: 12, cursor: "pointer" }}>
              {subiendo ? "Subiendo..." : "Subir GIF del ejercicio"}
              <input ref={fileInputRef} type="file" accept="image/gif,image/*" onChange={subirGif} style={{ display: "none" }} />
            </div>
          )}
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onCerrar} style={{ background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            disabled={guardando}
            onClick={async () => {
              if (!nombre.trim()) return;
              setGuardando(true);
              await onGuardar({
                id: ejercicioEditar?.id,
                nombre: nombre.trim(),
                bloque,
                categoria_preventiva_id: esPreventivo ? categoriaId : "",
                tags_descriptivos: tagsSel,
                gif_url: gifUrl,
                orden_rotacion: ejercicioEditar?.orden_rotacion || "",
              });
              setGuardando(false);
            }}
            style={{ background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : ejercicioEditar ? "Guardar cambios" : "Guardar ejercicio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VistaOrdenRotacionReal({ ejercicios, categorias, onReordenar }) {
  const [categoriaSel, setCategoriaSel] = useState(categorias[0]?.id || "");
  const lista = ejercicios
    .filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === categoriaSel)
    .slice()
    .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));

  const mover = async (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= lista.length) return;
    const nueva = [...lista];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
    await onReordenar(nueva);
  };

  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>CATEGORÍA PREVENTIVA</span>
        <select value={categoriaSel} onChange={(e) => setCategoriaSel(e.target.value)} style={campoSelectReal({ maxWidth: 240 })}>
          {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
            <optgroup key={tipo} label={tipo}>
              {categorias
                .filter((c) => c.tipo_tejido === tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div style={{ fontSize: 11.5, color: "#4A6680", marginBottom: 10 }}>
        Solo ejercicios con bloque "Preventivo" y esa categoría. Este orden queda guardado en cada ejercicio, listo para cuando la selección automática por rotación esté conectada.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.length === 0 && <div style={{ color: "#4A6680", fontSize: 12.5, padding: "12px 0" }}>Sin ejercicios en esta categoría todavía.</div>}
        {lista.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#4A6680", width: 16 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: "#F0F4FF" }}>{e.nombre}</span>
            <button onClick={() => mover(i, -1)} style={btnIconoReal} disabled={i === 0}>
              ↑
            </button>
            <button onClick={() => mover(i, 1)} style={btnIconoReal} disabled={i === lista.length - 1}>
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BibliotecaEjerciciosReal({ onBack }) {
  const [ejercicios, saveEjercicios, ejerciciosLoaded] = useEntityList("ejercicios");
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [bloqueFiltro, setBloqueFiltro] = useState("Todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [vista, setVista] = useState("lista");

  if (!ejerciciosLoaded || !categoriasLoaded) return <LoadingBlock />;

  const visibles = ejercicios
    .filter((e) => (bloqueFiltro === "Todos" ? true : e.bloque === bloqueFiltro))
    .filter((e) => (categoriaFiltro === "Todas" ? true : e.categoria_preventiva_id === categoriaFiltro))
    .filter((e) => (e.nombre || "").toLowerCase().includes(busqueda.toLowerCase()));

  const guardarEjercicio = async (datos) => {
    await saveEjercicios(datos.id ? ejercicios.map((e) => (e.id === datos.id ? { ...e, ...datos } : e)) : [...ejercicios, datos]);
    setPanelAbierto(false);
    setEjercicioEditando(null);
  };

  const eliminarEjercicio = async (id) => {
    await saveEjercicios(ejercicios.filter((e) => e.id !== id));
  };

  const reordenarCategoria = async (listaOrdenada) => {
    const idsOrdenados = new Set(listaOrdenada.map((e) => e.id));
    const actualizados = ejercicios.map((e) => {
      if (!idsOrdenados.has(e.id)) return e;
      const nuevoOrden = listaOrdenada.findIndex((x) => x.id === e.id) + 1;
      return { ...e, orden_rotacion: nuevoOrden };
    });
    await saveEjercicios(actualizados);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>BIBLIOTECA</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>Ejercicios</h1>
          <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>{ejercicios.length} ejercicios creados</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { id: "lista", label: "Lista y filtros" },
            { id: "rotacion", label: "Orden de rotación" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              style={{
                fontSize: 12.5,
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${vista === v.id ? "#F5C518" : "#1A3050"}`,
                background: vista === v.id ? "#F5C51822" : "transparent",
                color: vista === v.id ? "#F5C518" : "#8BA4C0",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        {vista === "lista" ? (
          <>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ejercicio..."
              style={{ width: "100%", boxSizing: "border-box", background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 8, color: "#F0F4FF", fontSize: 13, padding: "9px 10px", marginBottom: 10 }}
            />
            <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>FILTRAR POR BLOQUE</span>
              <select value={bloqueFiltro} onChange={(e) => setBloqueFiltro(e.target.value)} style={campoSelectReal({ maxWidth: 220 })}>
                <option value="Todos">Todos</option>
                {BLOQUES_BIBLIOTECA.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#F5C518" }}>FILTRAR POR CATEGORÍA PREVENTIVA</span>
              <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={campoSelectReal({ maxWidth: 220 })}>
                <option value="Todas">Todas</option>
                {TIPOS_TEJIDO_BIBLIOTECA.map((tipo) => (
                  <optgroup key={tipo} label={tipo}>
                    {categorias
                      .filter((c) => c.tipo_tejido === tipo)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibles.map((e) => (
                <TarjetaEjercicioReal
                  key={e.id}
                  ejercicio={e}
                  categorias={categorias}
                  onEditar={() => {
                    setEjercicioEditando(e);
                    setPanelAbierto(true);
                  }}
                  onEliminar={() => eliminarEjercicio(e.id)}
                />
              ))}
              {visibles.length === 0 && <div style={{ color: "#4A6680", fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin resultados</div>}
            </div>
            <button
              onClick={() => {
                setEjercicioEditando(null);
                setPanelAbierto(true);
              }}
              style={{ width: "100%", marginTop: 16, background: "transparent", border: "1px dashed #F5C51866", color: "#F5C518", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
            >
              + Nuevo ejercicio
            </button>
          </>
        ) : (
          <VistaOrdenRotacionReal ejercicios={ejercicios} categorias={categorias} onReordenar={reordenarCategoria} />
        )}
      </div>
      {panelAbierto && (
        <PanelNuevoEjercicioReal
          categorias={categorias}
          ejercicioEditar={ejercicioEditando}
          onGuardar={guardarEjercicio}
          onCerrar={() => {
            setPanelAbierto(false);
            setEjercicioEditando(null);
          }}
        />
      )}
    </div>
  );
}


// ---------- DISEÑAR SESIÓN (calcado de diseno-sesion.jsx) ----------
// Los 6 bloques fijos: Activación y Movilidad no llevan tareas manuales
// (Activación genera su propia tarea de bici; Movilidad es 100% automática
// y todavía no tiene algoritmo de selección — igual que en el propio mockup,
// que tampoco deja editar nada ahí). Preventivo es un interruptor + info,
// sin tareas manuales (selección automática por categoría, sin algoritmo
// todavía). Core, Resistencia y Fuerza sí llevan tareas y circuitos reales.

const BLOQUES_DISENO = [
  { id: "activacion", numero: 1, nombre: "Activación", modo: "manual", descripcion: "Bici estática, opcional — se omite si no hay acceso" },
  { id: "movilidad", numero: 2, nombre: "Movilidad", modo: "rotativo", descripcion: "Pool rotativo — la app elige el ejercicio del día" },
  { id: "preventivo", numero: 3, nombre: "Preventivo", modo: "rotativo-categoria", descripcion: "Según categoría común a los jugadores destinatarios" },
  { id: "core", numero: 4, nombre: "Core", modo: "manual", descripcion: "Diseño manual — sin registro de carga" },
  { id: "resistencia", numero: 5, nombre: "Resistencia", modo: "manual", descripcion: "Intervalos, tiempo y recuperación" },
  { id: "fuerza", numero: 6, nombre: "Fuerza", modo: "manual", descripcion: "Diseño manual — con reps/series y RIR (incluye Específicas)" },
];

function IconoBloqueDiseno({ id }) {
  const common = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 1.6 };
  switch (id) {
    case "activacion":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l4-8h4l3 8M10 9l2-3h3" />
        </svg>
      );
    case "movilidad":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 12a8 8 0 0 1 14-5" />
          <path d="M20 12a8 8 0 0 1-14 5" />
          <path d="M18 4v3h-3M6 20v-3h3" />
        </svg>
      );
    case "preventivo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case "core":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="4" y="9" width="16" height="6" rx="1.5" />
          <path d="M4 12h16" />
        </svg>
      );
    case "resistencia":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h3l2-6 4 12 2-6h7" />
        </svg>
      );
    case "fuerza":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 12h2M19 12h2M6 9v6M18 9v6" />
          <rect x="8" y="10.5" width="8" height="3" rx="0.6" />
        </svg>
      );
    default:
      return null;
  }
}

function EtiquetaModoDiseno({ modo }) {
  const map = {
    rotativo: { texto: "ROTATIVO AUTO", color: "#F5C518" },
    "rotativo-categoria": { texto: "ROTATIVO · POR CATEGORÍA", color: "#F5C518" },
    manual: { texto: "MANUAL", color: "#F97316" },
  };
  const cfg = map[modo];
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.06em", color: cfg.color, border: `1px solid ${cfg.color}55`, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
      {cfg.texto}
    </span>
  );
}

function CampoEtiquetadoDiseno({ etiqueta, children, w }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, width: w }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680", whiteSpace: "nowrap" }}>{etiqueta}</span>
      {children}
    </label>
  );
}

function campoStyleDiseno(w) {
  return { width: w, background: "#122440", border: "1px solid #1A3050", borderRadius: 5, color: "#F0F4FF", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: "5px 6px", textAlign: "center", boxSizing: "border-box" };
}

const botonMiniStyleDiseno = { background: "none", border: "1px solid #1A3050", borderRadius: 6, color: "#4A6680", cursor: "pointer", fontSize: 12, lineHeight: 1, width: 24, height: 24, flexShrink: 0 };

function SelectorMaterialReal({ seleccionados, disponibles, onCambiar, onAgregarMaterial }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState("");
  const toggle = (m) => onCambiar(seleccionados.includes(m) ? seleccionados.filter((x) => x !== m) : [...seleccionados, m]);

  return (
    <div style={{ position: "relative", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680", marginBottom: 3 }}>MATERIAL</div>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", textAlign: "left", fontSize: 11.5, color: seleccionados.length ? "#F0F4FF" : "#4A6680", background: "#122440", border: "1px solid #1A3050", borderRadius: 5, padding: "5px 8px", cursor: "pointer" }}
      >
        {seleccionados.length ? seleccionados.join(", ") : "Ninguno"}
      </button>
      {abierto && (
        <div onMouseLeave={() => setAbierto(false)} style={{ position: "absolute", zIndex: 15, top: "100%", left: 0, marginTop: 4, width: 220, maxHeight: 260, overflowY: "auto", background: "#122440", border: "1px solid #1A3050", borderRadius: 8, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", padding: 6 }}>
          {disponibles.map((m) => {
            const activo = seleccionados.includes(m);
            return (
              <div
                key={m}
                onClick={() => toggle(m)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: activo ? "#F5C518" : "#8BA4C0" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${activo ? "#F5C518" : "#1A3050"}`, background: activo ? "#F5C518" : "transparent", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {activo ? "✓" : ""}
                </span>
                {m}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 5, marginTop: 6, paddingTop: 6, borderTop: "1px solid #1A3050" }}>
            <input
              value={nuevoMaterial}
              onChange={(e) => setNuevoMaterial(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              placeholder="Añadir material..."
              style={{ flex: 1, background: "#122440", border: "1px dashed #1A3050", borderRadius: 5, color: "#F0F4FF", fontSize: 11, padding: "5px 6px" }}
            />
            <button
              onClick={() => {
                if (nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              style={{ background: "transparent", border: "1px solid #F5C51866", color: "#F5C518", borderRadius: 5, padding: "0 10px", cursor: "pointer", fontSize: 12 }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotaTareaReal({ nota, onCambiar }) {
  const [abierta, setAbierta] = useState(!!nota);
  if (!abierta) {
    return (
      <button onClick={() => setAbierta(true)} style={{ alignSelf: "flex-start", fontSize: 11, color: "#4A6680", background: "transparent", border: "1px dashed #1A3050", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
        + Nota
      </button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680" }}>NOTA PARA ESTA TAREA</span>
        {!nota && (
          <button onClick={() => setAbierta(false)} style={{ background: "none", border: "none", color: "#4A6680", cursor: "pointer", fontSize: 11 }}>
            cancelar
          </button>
        )}
      </div>
      <textarea
        value={nota || ""}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Ej. Baja el ritmo si nota molestia..."
        rows={2}
        style={{ width: "100%", boxSizing: "border-box", background: "#122440", border: "1px solid #1A3050", borderRadius: 6, color: "#F0F4FF", fontSize: 12, padding: "6px 8px", fontFamily: "'Inter', sans-serif", resize: "vertical" }}
      />
    </div>
  );
}

function FilaTareaReal({ tarea, onCambiar, onEliminar, mostrarCarga, materialesDisponibles, onAgregarMaterial, orden, onSubir, onBajar }) {
  const modosDisponibles = mostrarCarga ? ["reps", "tiempo", "metros"] : ["reps", "tiempo"];
  const etiquetaModo = { reps: "REPS", tiempo: "SEG", metros: "M" };
  const ciclarModo = () => {
    const idx = modosDisponibles.indexOf(tarea.modo);
    onCambiar({ ...tarea, modo: modosDisponibles[(idx + 1) % modosDisponibles.length] });
  };
  const tipoResistencia = tarea.tipoResistencia || "Peso libre";

  return (
    <div style={{ padding: "10px 12px", background: "#122440", borderRadius: 8, border: "1px solid #1A3050", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1A3050", color: "#F5C518", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        <div style={{ color: "#F0F4FF", fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{tarea.nombre}</div>
        {onSubir && (
          <button onClick={onSubir} style={botonMiniStyleDiseno} title="Mover antes">
            ↑
          </button>
        )}
        {onBajar && (
          <button onClick={onBajar} style={botonMiniStyleDiseno} title="Mover después">
            ↓
          </button>
        )}
        <button onClick={onEliminar} style={botonMiniStyleDiseno} title="Quitar tarea">
          ×
        </button>
      </div>
      {mostrarCarga && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680", marginBottom: 4 }}>TIPO DE RESISTENCIA</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Peso libre", "Elástica", "Peso corporal"].map((t) => (
              <button
                key={t}
                onClick={() => onCambiar({ ...tarea, tipoResistencia: t })}
                style={{ fontSize: 11, padding: "5px 9px", borderRadius: 6, border: `1px solid ${tipoResistencia === t ? "#F5C518" : "#1A3050"}`, background: tipoResistencia === t ? "#F5C51822" : "transparent", color: tipoResistencia === t ? "#F5C518" : "#8BA4C0", cursor: "pointer" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoEtiquetadoDiseno etiqueta="MODO" w={50}>
          <button onClick={ciclarModo} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#8BA4C0", background: "#1A3050", border: "1px solid #1A3050", borderRadius: 5, padding: "5px 4px", width: "100%", textAlign: "center", cursor: "pointer" }} title="Alternar reps / tiempo / metros">
            {etiquetaModo[tarea.modo]}
          </button>
        </CampoEtiquetadoDiseno>
        <CampoEtiquetadoDiseno etiqueta="SERIES" w={44}>
          <input value={tarea.series} onChange={(e) => onCambiar({ ...tarea, series: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
        </CampoEtiquetadoDiseno>
        <CampoEtiquetadoDiseno etiqueta={etiquetaModo[tarea.modo]} w={44}>
          <input value={tarea.cantidad} onChange={(e) => onCambiar({ ...tarea, cantidad: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
        </CampoEtiquetadoDiseno>
        {mostrarCarga && (
          <>
            <CampoEtiquetadoDiseno etiqueta="RIR" w={40}>
              <input value={tarea.rir} onChange={(e) => onCambiar({ ...tarea, rir: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
            </CampoEtiquetadoDiseno>
            <div style={{ flex: "1 1 100px", minWidth: 100 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680", marginBottom: 3 }}>REF. ANTERIOR (informativo)</div>
              <div style={{ fontSize: 11, color: "#8BA4C0", lineHeight: 1.3 }}>{tarea.referencia ? tarea.referencia : "Sin registro previo"}</div>
            </div>
          </>
        )}
        <SelectorMaterialReal seleccionados={tarea.materiales || []} disponibles={materialesDisponibles} onCambiar={(nuevos) => onCambiar({ ...tarea, materiales: nuevos })} onAgregarMaterial={onAgregarMaterial} />
      </div>
      <NotaTareaReal nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

function CampoResistenciaTareaReal({ tarea, onCambiar, orden, onSubir, onBajar, onEliminar }) {
  return (
    <div style={{ padding: "10px 12px", background: "#122440", borderRadius: 8, border: "1px solid #1A3050", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1A3050", color: "#F5C518", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        <div style={{ color: "#F0F4FF", fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{tarea.nombre}</div>
        {onSubir && (
          <button onClick={onSubir} style={botonMiniStyleDiseno} title="Mover antes">
            ↑
          </button>
        )}
        {onBajar && (
          <button onClick={onBajar} style={botonMiniStyleDiseno} title="Mover después">
            ↓
          </button>
        )}
        <button onClick={onEliminar} style={botonMiniStyleDiseno} title="Quitar tarea">
          ×
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoEtiquetadoDiseno etiqueta="INTERVALOS" w={72}>
          <input value={tarea.intervalos} onChange={(e) => onCambiar({ ...tarea, intervalos: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
        </CampoEtiquetadoDiseno>
        <CampoEtiquetadoDiseno etiqueta="TIEMPO (SEG)" w={92}>
          <input value={tarea.trabajo} onChange={(e) => onCambiar({ ...tarea, trabajo: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
        </CampoEtiquetadoDiseno>
        <CampoEtiquetadoDiseno etiqueta="RECUPERACIÓN (SEG)" w={128}>
          <input value={tarea.descanso} onChange={(e) => onCambiar({ ...tarea, descanso: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
        </CampoEtiquetadoDiseno>
      </div>
      <NotaTareaReal nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

function SelectorEjercicioReal({ ejercicios, bloque, onAdd }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const opciones = ejercicios.filter((e) => {
    const coincideBloque = e.bloque === bloque || (bloque === "Fuerza" && e.bloque === "Específicas");
    const coincideTexto = (e.nombre || "").toLowerCase().includes(filtro.toLowerCase());
    return coincideBloque && coincideTexto;
  });

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setAbierto((v) => !v)} style={{ fontSize: 12.5, color: "#F5C518", background: "transparent", border: "1px dashed #F5C51866", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontWeight: 500 }}>
        + Añadir tarea desde biblioteca
      </button>
      {abierto && (
        <div style={{ position: "absolute", zIndex: 10, top: "110%", left: 0, width: 260, background: "#122440", border: "1px solid #1A3050", borderRadius: 10, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", padding: 8 }}>
          <input
            autoFocus
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar ejercicio..."
            style={{ width: "100%", background: "#122440", border: "1px solid #1A3050", borderRadius: 6, color: "#F0F4FF", fontSize: 12.5, padding: "6px 8px", marginBottom: 6, boxSizing: "border-box" }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {opciones.length === 0 && <div style={{ color: "#4A6680", fontSize: 12, padding: "8px 4px" }}>Sin resultados — se creará uno nuevo con este nombre al escribirlo</div>}
            {opciones.map((e) => (
              <div
                key={e.id}
                onClick={() => {
                  onAdd(e);
                  setAbierto(false);
                  setFiltro("");
                }}
                style={{ padding: "7px 8px", borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1A3050")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: "#F0F4FF", fontSize: 13 }}>{e.nombre}</span>
                <span style={{ color: "#4A6680", fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace" }}>{(e.tags_descriptivos || []).join(" · ")}</span>
              </div>
            ))}
            {filtro.trim() && (
              <div
                onClick={() => {
                  onAdd({ nombre: filtro.trim(), nuevo: true });
                  setAbierto(false);
                  setFiltro("");
                }}
                style={{ padding: "7px 8px", borderRadius: 6, cursor: "pointer", color: "#F5C518", fontSize: 12.5, borderTop: "1px solid #1A3050", marginTop: 4 }}
              >
                + Crear "{filtro.trim()}" como nuevo ejercicio
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CajaCircuitoReal({ circuito, bloque, mostrarCarga, ejercicios, materialesDisponibles, onAgregarMaterial, onCambiarTareas, onEliminarCircuito }) {
  const tareas = circuito.tareas;
  const actualizarTarea = (key, nueva) => onCambiarTareas(tareas.map((t) => (t.key === key ? nueva : t)));
  const eliminarTarea = (key) => onCambiarTareas(tareas.filter((t) => t.key !== key));
  const mover = (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= tareas.length) return;
    const nueva = [...tareas];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
    onCambiarTareas(nueva);
  };

  const agregarEjercicioAlCircuito = (ejercicio) => {
    const base =
      bloque === "Resistencia"
        ? { key: Date.now() + Math.random(), nombre: ejercicio.nombre, ejercicioId: ejercicio.id, intervalos: "", trabajo: "", descanso: "", nota: "" }
        : { key: Date.now() + Math.random(), nombre: ejercicio.nombre, ejercicioId: ejercicio.id, modo: "reps", series: "", cantidad: "", rir: "", tipoResistencia: "Peso libre", materiales: [], nota: "" };
    onCambiarTareas([...tareas, base]);
  };

  return (
    <div style={{ border: "1.5px solid #F5C51855", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#0E1E3540" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: "#F5C518", border: "1px solid #F5C51855", borderRadius: 4, padding: "2px 7px" }}>CIRCUITO</span>
        <span style={{ fontSize: 11, color: "#4A6680", flex: 1 }}>
          {tareas.length} {tareas.length === 1 ? "ejercicio" : "ejercicios"} · en orden
        </span>
        <button onClick={onEliminarCircuito} style={botonMiniStyleDiseno} title="Eliminar circuito completo">
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tareas.map((t, i) =>
          bloque === "Resistencia" ? (
            <CampoResistenciaTareaReal key={t.key} tarea={t} orden={i + 1} onCambiar={(nueva) => actualizarTarea(t.key, nueva)} onEliminar={() => eliminarTarea(t.key)} onSubir={i > 0 ? () => mover(i, -1) : null} onBajar={i < tareas.length - 1 ? () => mover(i, 1) : null} />
          ) : (
            <FilaTareaReal
              key={t.key}
              tarea={t}
              orden={i + 1}
              mostrarCarga={mostrarCarga}
              materialesDisponibles={materialesDisponibles}
              onAgregarMaterial={onAgregarMaterial}
              onCambiar={(nueva) => actualizarTarea(t.key, nueva)}
              onEliminar={() => eliminarTarea(t.key)}
              onSubir={i > 0 ? () => mover(i, -1) : null}
              onBajar={i < tareas.length - 1 ? () => mover(i, 1) : null}
            />
          )
        )}
      </div>
      <SelectorEjercicioReal ejercicios={ejercicios} bloque={bloque} onAdd={agregarEjercicioAlCircuito} />
    </div>
  );
}

function nuevaTareaBase(ejercicio, mostrarCarga) {
  return {
    key: Date.now() + Math.random(),
    nombre: ejercicio.nombre,
    ejercicioId: ejercicio.id,
    modo: "reps",
    series: "",
    cantidad: "",
    rir: "",
    tipoResistencia: "Peso libre",
    materiales: [],
    nota: "",
  };
}

// Avanza el puntero de rotación de una categoría (o del pool global de
// Movilidad, con la clave reservada "movilidad") y devuelve el ejercicio
// que toca esta vez. El pool debe venir ya ordenado por orden_rotacion.
async function elegirSiguienteRotacion(claveCategoria, poolOrdenado) {
  if (!poolOrdenado.length) return null;
  const actual = await api.rotacion(claveCategoria);
  const punteroActual = actual ? Number(actual.puntero_actual) || 0 : 0;
  const elegido = poolOrdenado[punteroActual % poolOrdenado.length];
  await api.setRotacion(claveCategoria, punteroActual + 1);
  return elegido;
}

// Categoría preventiva común a TODOS los jugadores destinatarios (versión
// "simple" elegida: un único ejercicio por sesión, no uno por jugador).
// Devuelve null si no hay una única categoría compartida por todos.
function categoriaComunEntreJugadores(targetPlayerIds, allPlayers) {
  const objetivo = targetPlayerIds === null ? allPlayers : allPlayers.filter((p) => targetPlayerIds.includes(p.id));
  if (!objetivo.length) return null;
  const listas = objetivo.map((p) => new Set(p.groupIds || []));
  let interseccion = [...listas[0]];
  for (let i = 1; i < listas.length; i++) interseccion = interseccion.filter((id) => listas[i].has(id));
  return interseccion.length === 1 ? interseccion[0] : null;
}

function DisenoSesionReal({ sesionExistente, onBack, onGuardado }) {
  const isEditing = !!sesionExistente;
  const [players, , playersLoaded] = usePlayers();
  const [categoriasPreventivas, categoriasLoaded] = useCategoriasPreventivas();
  const [ejercicios, , ejerciciosLoaded, , retryEjercicios] = useEntityList("ejercicios");
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [materialesLoaded, setMaterialesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .materiales()
      .then((res) => {
        if (!cancelled) setMaterialesDisponibles(res || []);
      })
      .catch(() => {
        if (!cancelled) setMaterialesDisponibles([]);
      })
      .finally(() => {
        if (!cancelled) setMaterialesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const agregarMaterial = async (m) => {
    if (materialesDisponibles.includes(m)) return;
    setMaterialesDisponibles((prev) => [...prev, m]);
    await api.guardarMaterial(m);
  };

  const [md, setMd] = useState(sesionExistente?.md || "");
  const [objetivo, setObjetivo] = useState(sesionExistente?.objetivo || "");
  const [fechas, setFechas] = useState(sesionExistente?.fechas?.length ? sesionExistente.fechas : [todayStr()]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [targetPlayerIds, setTargetPlayerIds] = useState(sesionExistente?.jugadores_destino ?? null);
  const [activacionActiva, setActivacionActiva] = useState(sesionExistente ? !!sesionExistente.activacion_activa : true);
  const [duracionBici, setDuracionBici] = useState("8");
  const [preventivoActivo, setPreventivoActivo] = useState(sesionExistente ? !!sesionExistente.preventivo_activo : true);

  const [tareasCore, setTareasCore] = useState([]);
  const [circuitosCore, setCircuitosCore] = useState([]);
  const [tareasResistencia, setTareasResistencia] = useState([]);
  const [circuitosResistencia, setCircuitosResistencia] = useState([]);
  const [tareasFuerza, setTareasFuerza] = useState([]);
  const [circuitosFuerza, setCircuitosFuerza] = useState([]);

  const [previousTareaIds, setPreviousTareaIds] = useState([]);
  const [activacionTareaId, setActivacionTareaId] = useState(null);
  const [movilidadTareaIdsPorFecha, setMovilidadTareaIdsPorFecha] = useState({});
  const [preventivoTareaIdsPorFecha, setPreventivoTareaIdsPorFecha] = useState({});
  const [previousCircuitoIds, setPreviousCircuitoIds] = useState([]);
  const [cargandoExistente, setCargandoExistente] = useState(isEditing);
  const [hasData, setHasData] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  // Carga de sesión existente (edición): reparte tareas/circuitos en su bloque real.
  useEffect(() => {
    if (!isEditing || !ejerciciosLoaded) return;
    let cancelled = false;
    (async () => {
      const found = sesionExistente.enviada ? await sesionHasRegistros(sesionExistente.id) : false;
      if (cancelled) return;
      setHasData(found);
      if (found) {
        setCargandoExistente(false);
        return;
      }
      const tareas = await api.list("tareas", { sesion_id: sesionExistente.id });
      const circuitos = await api.list("circuitos", { sesion_id: sesionExistente.id });
      if (cancelled) return;
      const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
      const toDraft = (t) => {
        let materiales = [];
        try {
          materiales = t.material ? JSON.parse(t.material) : [];
        } catch {
          materiales = [];
        }
        const e = ejerciciosById.get(t.ejercicio_id) || {};
        return {
          key: t.id,
          tareaId: t.id,
          nombre: e.nombre || "(ejercicio eliminado)",
          ejercicioId: t.ejercicio_id,
          modo: t.modo || "reps",
          series: t.series ?? "",
          cantidad: t.cantidad ?? "",
          rir: t.rir ?? "",
          tipoResistencia: t.tipo_resistencia || "Peso libre",
          materiales,
          nota: t.nota || "",
          intervalos: t.series ?? "",
          trabajo: t.cantidad ?? "",
          descanso: t.rir ?? "",
          circuito_id: t.circuito_id || "",
          orden_en_circuito: t.orden_en_circuito || "",
        };
      };

      const porBloque = (nombreBloque) => tareas.filter((t) => t.bloque_sesion === nombreBloque && !t.circuito_id).map(toDraft);
      const circuitosDelBloque = (nombreBloque) =>
        circuitos
          .filter((c) => c.bloque_sesion === nombreBloque)
          .map((c) => ({
            key: c.id,
            circuitoId: c.id,
            tareas: tareas
              .filter((t) => t.circuito_id === c.id)
              .sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0))
              .map(toDraft),
          }));

      setTareasCore(porBloque("Core"));
      setCircuitosCore(circuitosDelBloque("Core"));
      setTareasResistencia(porBloque("Resistencia"));
      setCircuitosResistencia(circuitosDelBloque("Resistencia"));
      setTareasFuerza(porBloque("Fuerza"));
      setCircuitosFuerza(circuitosDelBloque("Fuerza"));
      const activacionTarea = tareas.find((t) => t.bloque_sesion === "Activación");
      if (activacionTarea) {
        setDuracionBici(String(activacionTarea.cantidad || "8"));
        setActivacionTareaId(activacionTarea.id);
      }
      const mapaPorFecha = (nombreBloque) => {
        const mapa = {};
        tareas.filter((t) => t.bloque_sesion === nombreBloque).forEach((t) => {
          mapa[t.fecha || ""] = t.id;
        });
        return mapa;
      };
      setMovilidadTareaIdsPorFecha(mapaPorFecha("Movilidad"));
      setPreventivoTareaIdsPorFecha(mapaPorFecha("Preventivo"));
      setPreviousTareaIds(tareas.map((t) => t.id));
      setPreviousCircuitoIds(circuitos.map((c) => c.id));
      setCargandoExistente(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, ejerciciosLoaded]);

  const addFecha = () => {
    if (!nuevaFecha) return;
    if (!fechas.includes(nuevaFecha)) setFechas((prev) => [...prev, nuevaFecha].sort());
    setNuevaFecha("");
  };
  const removeFecha = (f) => setFechas((prev) => prev.filter((d) => d !== f));

  const agregarTarea = (bloqueSetter) => async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    if (!ejercicioId) {
      const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "" });
      ejercicioId = creado.id;
      retryEjercicios();
    }
    bloqueSetter((prev) => [...prev, nuevaTareaBase({ id: ejercicioId, nombre })]);
  };

  const guardar = async () => {
    setError("");
    setOk(false);
    if (!fechas.length) {
      setError("Añade al menos una fecha.");
      return;
    }
    setGuardando(true);
    try {
      const sesionRecord = {
        id: sesionExistente?.id,
        fechas,
        md,
        objetivo,
        jugadores_destino: targetPlayerIds,
        preventivo_activo: preventivoActivo,
        activacion_activa: activacionActiva,
        lote_origen_id: "",
        enviada: true,
      };
      const savedSesion = await api.save("sesiones", sesionRecord);

      const keepTareaIds = new Set();
      const keepCircuitoIds = new Set();

      const guardarTareaSuelta = async (t, bloqueNombre, mostrarCarga) => {
        const ejercicioId = t.ejercicioId;
        const saved = await api.save("tareas", {
          id: t.tareaId,
          sesion_id: savedSesion.id,
          bloque_sesion: bloqueNombre,
          ejercicio_id: ejercicioId,
          modo: bloqueNombre === "Resistencia" ? "intervalos" : t.modo,
          series: bloqueNombre === "Resistencia" ? t.intervalos : t.series,
          cantidad: bloqueNombre === "Resistencia" ? t.trabajo : t.cantidad,
          rir: bloqueNombre === "Resistencia" ? t.descanso : t.rir,
          tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
          material: mostrarCarga ? JSON.stringify(t.materiales || []) : "",
          nota: t.nota || "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      };

      const guardarCircuito = async (c, bloqueNombre, mostrarCarga) => {
        const savedCircuito = await api.save("circuitos", { id: c.circuitoId, sesion_id: savedSesion.id, bloque_sesion: bloqueNombre });
        keepCircuitoIds.add(savedCircuito.id);
        await Promise.all(
          c.tareas.map(async (t, i) => {
            const saved = await api.save("tareas", {
              id: t.tareaId,
              sesion_id: savedSesion.id,
              bloque_sesion: bloqueNombre,
              ejercicio_id: t.ejercicioId,
              modo: bloqueNombre === "Resistencia" ? "intervalos" : t.modo,
              series: bloqueNombre === "Resistencia" ? t.intervalos : t.series,
              cantidad: bloqueNombre === "Resistencia" ? t.trabajo : t.cantidad,
              rir: bloqueNombre === "Resistencia" ? t.descanso : t.rir,
              tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
              material: mostrarCarga ? JSON.stringify(t.materiales || []) : "",
              nota: t.nota || "",
              circuito_id: savedCircuito.id,
              orden_en_circuito: i + 1,
            });
            keepTareaIds.add(saved.id);
          })
        );
      };

      // Activación: una única tarea auto-generada si está activa.
      if (activacionActiva) {
        const ej = await resolveEjercicio(ejercicios, { nombre: "Bici estática", bloque: "" });
        const saved = await api.save("tareas", {
          id: activacionTareaId || undefined,
          sesion_id: savedSesion.id,
          bloque_sesion: "Activación",
          ejercicio_id: ej.id,
          modo: "tiempo",
          series: "",
          cantidad: duracionBici,
          rir: "",
          tipo_resistencia: "",
          material: "",
          nota: "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      }

      // Movilidad: pool global, rotación automática — una fecha, un turno.
      // Cada fecha de la sesión avanza el puntero por separado, así que
      // fechas distintas de la misma sesión pueden tocar ejercicios distintos.
      const poolMovilidad = ejercicios
        .filter((e) => e.bloque === "Movilidad")
        .slice()
        .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));
      if (poolMovilidad.length) {
        for (const fecha of fechas) {
          const elegido = await elegirSiguienteRotacion("movilidad", poolMovilidad);
          if (!elegido) continue;
          const saved = await api.save("tareas", {
            id: movilidadTareaIdsPorFecha[fecha] || undefined,
            sesion_id: savedSesion.id,
            bloque_sesion: "Movilidad",
            ejercicio_id: elegido.id,
            fecha,
            modo: "",
            series: "",
            cantidad: "",
            rir: "",
            tipo_resistencia: "",
            material: "",
            nota: "",
            circuito_id: "",
            orden_en_circuito: "",
          });
          keepTareaIds.add(saved.id);
        }
      }

      // Preventivo: versión simple — un ejercicio por fecha (no uno por
      // jugador dentro de la misma fecha), según la categoría común a
      // todos los jugadores destinatarios. Igual que Movilidad, cada fecha
      // avanza el puntero por separado. Si no hay una única categoría
      // común, se omite sin avisar con error — es una omisión esperada.
      if (preventivoActivo) {
        const catId = categoriaComunEntreJugadores(targetPlayerIds, players);
        if (catId) {
          const poolPreventivo = ejercicios
            .filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId)
            .slice()
            .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));
          if (poolPreventivo.length) {
            for (const fecha of fechas) {
              const elegido = await elegirSiguienteRotacion(catId, poolPreventivo);
              if (!elegido) continue;
              const saved = await api.save("tareas", {
                id: preventivoTareaIdsPorFecha[fecha] || undefined,
                sesion_id: savedSesion.id,
                bloque_sesion: "Preventivo",
                ejercicio_id: elegido.id,
                fecha,
                modo: "",
                series: "",
                cantidad: "",
                rir: "",
                tipo_resistencia: "",
                material: "",
                nota: "",
                circuito_id: "",
                orden_en_circuito: "",
              });
              keepTareaIds.add(saved.id);
            }
          }
        }
      }

      await Promise.all(tareasCore.map((t) => guardarTareaSuelta(t, "Core", false)));
      await Promise.all(circuitosCore.map((c) => guardarCircuito(c, "Core", false)));
      await Promise.all(tareasResistencia.map((t) => guardarTareaSuelta(t, "Resistencia", false)));
      await Promise.all(circuitosResistencia.map((c) => guardarCircuito(c, "Resistencia", false)));
      await Promise.all(tareasFuerza.map((t) => guardarTareaSuelta(t, "Fuerza", true)));
      await Promise.all(circuitosFuerza.map((c) => guardarCircuito(c, "Fuerza", true)));

      const tareasABorrar = previousTareaIds.filter((id) => !keepTareaIds.has(id));
      const circuitosABorrar = previousCircuitoIds.filter((id) => !keepCircuitoIds.has(id));
      await Promise.all(tareasABorrar.map((id) => api.delete("tareas", id)));
      await Promise.all(circuitosABorrar.map((id) => api.delete("circuitos", id)));

      setOk(true);
      onGuardado?.();
    } catch (e) {
      setError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const loaded = playersLoaded && categoriasLoaded && ejerciciosLoaded && materialesLoaded && !cargandoExistente;
  if (!loaded) return <LoadingBlock />;

  if (hasData) {
    return (
      <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "28px 16px 60px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Volver a Dashboard
          </button>
          <div style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#8BA4C0" }}>Ya hay datos registrados por jugadores para esta sesión — queda bloqueada para proteger ese historial.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#F5C518", marginBottom: 4 }}>{isEditing ? "EDITAR SESIÓN" : "NUEVA SESIÓN"}</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Diseño de sesión</h1>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>OBJETIVO (OPCIONAL)</span>
            <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 13, padding: "8px 10px" }} />
          </label>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>PARA</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[
                { id: "equipo", label: "Todo el equipo" },
                { id: "concretos", label: "Jugadores concretos" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTargetPlayerIds(t.id === "equipo" ? null : targetPlayerIds || [])}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    border: "1px solid #1A3050",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    background: (t.id === "equipo") === (targetPlayerIds === null) ? "#F5C51822" : "transparent",
                    color: (t.id === "equipo") === (targetPlayerIds === null) ? "#F5C518" : "#8BA4C0",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {targetPlayerIds !== null && (
              <select
                multiple
                value={targetPlayerIds}
                onChange={(e) => setTargetPlayerIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                style={{ width: "100%", background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 13, padding: 6, height: Math.min(160, 36 + players.length * 26) }}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>FECHAS EN LAS QUE SE APLICA ESTA SESIÓN</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {fechas.map((f) => (
                <span key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#F5C518", border: "1px solid #F5C51855", borderRadius: 6, padding: "4px 8px" }}>
                  {f}
                  <span onClick={() => removeFecha(f)} style={{ cursor: "pointer", color: "#4A6680" }}>
                    ×
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 12.5, padding: "7px 9px" }} />
              <button onClick={addFecha} style={{ background: "transparent", border: "1px dashed #F5C51866", color: "#F5C518", borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
                + Añadir fecha
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>MD (OPCIONAL)</div>
            <select value={md} onChange={(e) => setMd(e.target.value)} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 7, color: "#F0F4FF", fontSize: 12.5, padding: "7px 9px", maxWidth: 160 }}>
              <option value="">Sin clasificar</option>
              {MD_TAGS.filter((t) => t !== "Sin MD").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BLOQUES_DISENO.map((b) => (
            <div key={b.id} style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #1A3050" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "#122440", display: "flex", alignItems: "center", justifyContent: "center", color: "#8BA4C0", flexShrink: 0 }}>
                  <IconoBloqueDiseno id={b.id} />
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4A6680", width: 14 }}>{String(b.numero).padStart(2, "0")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{b.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "#4A6680" }}>{b.descripcion}</div>
                </div>
                <EtiquetaModoDiseno modo={b.modo} />
              </div>
              <div style={{ padding: 14 }}>
                {b.id === "activacion" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div onClick={() => setActivacionActiva((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <span style={{ width: 34, height: 20, borderRadius: 10, background: activacionActiva ? "#F5C518" : "#1A3050", position: "relative", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: activacionActiva ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#060D1A" }} />
                      </span>
                      <span style={{ fontSize: 13, color: activacionActiva ? "#F0F4FF" : "#4A6680" }}>{activacionActiva ? "Activada para esta sesión" : "Sin acceso a bici — sesión empieza en Movilidad"}</span>
                    </div>
                    {activacionActiva && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, color: "#8BA4C0" }}>Duración</span>
                        <input value={duracionBici} onChange={(e) => setDuracionBici(e.target.value)} style={campoStyleDiseno(50)} />
                        <span style={{ fontSize: 12, color: "#4A6680" }}>min</span>
                      </div>
                    )}
                  </div>
                )}
                {b.id === "movilidad" && (() => {
                  const poolMov = ejercicios.filter((e) => e.bloque === "Movilidad");
                  return (
                    <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
                      {poolMov.length
                        ? `La app elegirá automáticamente el siguiente ejercicio del pool de Movilidad (${poolMov.length} en el pool) al guardar. No requiere acción aquí.`
                        : "No hay ejercicios en el pool de Movilidad todavía — añade alguno en Biblioteca para que este bloque se aplique."}
                    </div>
                  );
                })()}
                {b.id === "preventivo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div onClick={() => setPreventivoActivo((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <span style={{ width: 34, height: 20, borderRadius: 10, background: preventivoActivo ? "#F5C518" : "#1A3050", position: "relative", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: preventivoActivo ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#060D1A" }} />
                      </span>
                      <span style={{ fontSize: 13, color: preventivoActivo ? "#F0F4FF" : "#4A6680" }}>{preventivoActivo ? "Activado para esta sesión" : "Desactivado — no se aplicará hoy"}</span>
                    </div>
                    {preventivoActivo &&
                      (() => {
                        const catId = categoriaComunEntreJugadores(targetPlayerIds, players);
                        const cat = catId ? categoriasPreventivas.find((c) => c.id === catId) : null;
                        if (!cat) {
                          return (
                            <div style={{ fontSize: 11.5, color: "#F97316" }}>
                              No hay una única categoría preventiva común a todos los jugadores destinatarios — este bloque se omitirá al guardar. Dirige la sesión a jugadores que compartan una sola categoría para que se aplique.
                            </div>
                          );
                        }
                        const poolPrev = ejercicios.filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId);
                        return (
                          <>
                            <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
                              Categoría detectada para este roster: <span style={{ color: "#F5C518", fontWeight: 500 }}>{cat.nombre}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: poolPrev.length ? "#4A6680" : "#F97316" }}>
                              {poolPrev.length ? `${poolPrev.length} ejercicio(s) en el pool de esta categoría.` : "Esta categoría no tiene ejercicios en su pool todavía — el bloque se omitirá."}
                            </div>
                          </>
                        );
                      })()}
                  </div>
                )}
                {b.id === "core" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasCore.map((t) => (
                      <FilaTareaReal
                        key={t.key}
                        tarea={t}
                        mostrarCarga={false}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) => setTareasCore((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasCore((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosCore.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Core"
                        mostrarCarga={false}
                        ejercicios={ejercicios}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onEliminarCircuito={() => setCircuitosCore((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal ejercicios={ejercicios} bloque="Core" onAdd={agregarTarea(setTareasCore)} />
                      <button
                        onClick={() => setCircuitosCore((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [] }])}
                        style={{ fontSize: 12.5, color: "#8BA4C0", background: "transparent", border: "1px dashed #1A3050", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
                {b.id === "resistencia" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasResistencia.map((t) => (
                      <CampoResistenciaTareaReal
                        key={t.key}
                        tarea={t}
                        onCambiar={(nuevo) => setTareasResistencia((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasResistencia((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosResistencia.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Resistencia"
                        ejercicios={ejercicios}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onEliminarCircuito={() => setCircuitosResistencia((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal
                        ejercicios={ejercicios}
                        bloque="Resistencia"
                        onAdd={async (eOClic) => {
                          let ejercicioId = eOClic.id;
                          let nombre = eOClic.nombre;
                          if (!ejercicioId) {
                            const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "" });
                            ejercicioId = creado.id;
                            retryEjercicios();
                          }
                          setTareasResistencia((prev) => [...prev, { key: Date.now() + Math.random(), nombre, ejercicioId, intervalos: "", trabajo: "", descanso: "", nota: "" }]);
                        }}
                      />
                      <button
                        onClick={() => setCircuitosResistencia((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [] }])}
                        style={{ fontSize: 12.5, color: "#8BA4C0", background: "transparent", border: "1px dashed #1A3050", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
                {b.id === "fuerza" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasFuerza.map((t) => (
                      <FilaTareaReal
                        key={t.key}
                        tarea={t}
                        mostrarCarga={true}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) => setTareasFuerza((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasFuerza((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosFuerza.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Fuerza"
                        mostrarCarga={true}
                        ejercicios={ejercicios}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onEliminarCircuito={() => setCircuitosFuerza((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal ejercicios={ejercicios} bloque="Fuerza" onAdd={agregarTarea(setTareasFuerza)} />
                      <button
                        onClick={() => setCircuitosFuerza((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [] }])}
                        style={{ fontSize: 12.5, color: "#8BA4C0", background: "transparent", border: "1px dashed #1A3050", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 14 }}>{error}</div>}
        {ok && <div style={{ color: "#22C55E", fontSize: 13, marginTop: 14 }}>Guardado y enviado.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1px solid #1A3050", color: "#8BA4C0", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            style={{ background: "#F5C518", border: "1px solid #F5C518", color: "#060D1A", borderRadius: 8, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Guardar y enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("portal"); // "portal" | "coach" | "player"
  const [playerId, setPlayerId] = useState(null);
  const [coachModulo, setCoachModulo] = useState(null); // null = dashboard

  if (screen === "portal") {
    return (
      <PortalAcceso
        onEnterCoach={() => {
          setCoachModulo(null);
          setScreen("coach");
        }}
        onEnterPlayer={(id) => {
          setPlayerId(id);
          setScreen("player");
        }}
      />
    );
  }

  if (screen === "player") {
    return <PantallaJugadorReal presetPlayerId={playerId} onExit={() => setScreen("portal")} />;
  }

  // screen === "coach"
  if (coachModulo === "roster") {
    return <GestionRosterReal onBack={() => setCoachModulo(null)} onOpenHistory={() => {}} />;
  }
  if (coachModulo === "historial") {
    return <HistorialReal onBack={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "biblioteca") {
    return <BibliotecaEjerciciosReal onBack={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "diseno") {
    return <DisenoSesionReal onBack={() => setCoachModulo(null)} onGuardado={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "programacion") {
    return <ProgramacionModuloReal onBack={() => setCoachModulo(null)} />;
  }

  if (coachModulo && !["roster", "historial", "programacion", "biblioteca", "diseno"].includes(coachModulo)) {
    // Pantallas todavía sin calcar de su mockup en esta pasada — se avisa
    // explícitamente en vez de mostrar la interfaz antigua sin decirlo.
    const nombreModulo = MODULOS_DASHBOARD.find((m) => m.id === coachModulo)?.nombre || coachModulo;
    return (
      <div style={{ minHeight: "100vh", background: "#060D1A", color: "#F0F4FF", fontFamily: "'Inter', -apple-system, sans-serif", padding: "24px 16px 60px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={() => setCoachModulo(null)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8BA4C0", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 20 }}
          >
            ← Volver a Dashboard
          </button>
          <div style={{ background: "#0E1E35", border: "1px solid #1A3050", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{nombreModulo}</div>
            <div style={{ fontSize: 13, color: "#8BA4C0", lineHeight: 1.5 }}>
              Este módulo todavía no está calcado de su mockup en esta pasada — sigue siendo trabajo pendiente, no
              algo roto. Roster, Programación e Historial ya están terminados.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardEntrenadorReal onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
}

// Envoltorio: ProgramacionReal necesita la lista de jugadores para el editor de sesiones.
function ProgramacionModuloReal({ onBack }) {
  const [players, , playersLoaded] = usePlayers();
  if (!playersLoaded) return <LoadingBlock />;
  return <ProgramacionReal players={players} onBack={onBack} />;
}
