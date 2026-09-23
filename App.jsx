import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Trash2, Check, Dumbbell, ChevronLeft, ChevronRight, ChevronDown, User, ClipboardList, Loader2, Lock, Eye, EyeOff, RefreshCw, Play, Target, Send, CalendarClock, History, Pencil, BookOpen, Search, Zap, Bell, Calendar, AlertTriangle, Home, TrendingUp, Activity } from "lucide-react";

// ============================================================
// SISTEMA DE DISEÑO "FUERZA" — incrustado aquí mismo (antes eran 3
// archivos aparte: theme.js, GlobalStyles.jsx, ui-components.jsx). Se
// integra dentro de este único archivo porque así es como trabajas tú:
// sustituyendo App.jsx entero, sin ir añadiendo archivos sueltos al
// repositorio. Nada de lo que hay debajo depende de nada más external.
// ============================================================

// ---------- theme.js (tokens: colores, tamaños, tipografías) ----------
const ds = {
  canvas: "#0A1220",
  bgElevated: "#0D1A2E",
  surface: "#111F35",
  surfaceRaised: "#152744",
  border: "#1E3355",
  borderSoft: "#1A3050",
  borderMuted: "#2A4A75",
  ink: "#F3F6FA",
  inkSecondary: "#8CA0BC",
  inkMuted: "#5A7291",
  accent: "#F0B429",
  accentInk: "#16130A",
  accentSubtle: "#F0B42922",
  accentBorderSubtle: "#F0B42955",
  success: "#3FBF6F",
  successBorderSubtle: "#3FBF6F55",
  warning: "#FB923C",
  danger: "#F0605C",
  dangerBorderSubtle: "#F0605C55",
  focusRing: "#F0B429",
  chart1: "#B8872B",
  chart2: "#2F8FBF",
  chart3: "#9B6BC7",
};
const dsSp = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 16, 7: 20, 8: 24, 9: 28 };
const dsR = { sm: 5, md: 8, lg: 10, xl: 14, xxl: 16, full: "50%" };
const dsSh = {
  elevation1: "0 1px 2px rgba(0,0,0,0.3)",
  elevation2: "0 6px 16px rgba(0,0,0,0.35)",
  elevation3: "0 12px 28px rgba(0,0,0,0.45)",
  accentGlow: "0 4px 14px rgba(240,180,41,0.32)",
};
const dsF = {
  display: "'Manrope', sans-serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
};

// ---------- GlobalStyles.jsx (hover/pulsado/foco de los controles) ----------
function GlobalStyles() {
  return (
    <style>{`
      .ds-reset { box-sizing: border-box; font-family: ${dsF.sans}; color: ${ds.ink}; }
      .ds-reset *, .ds-reset *::before, .ds-reset *::after { box-sizing: border-box; }

      .ds-button {
        display: inline-flex; align-items: center; justify-content: center;
        gap: ${dsSp[3]}px; font-family: ${dsF.sans}; font-size: 14px; font-weight: 700;
        line-height: 1; border-radius: ${dsR.lg}px; padding: 12px ${dsSp[6]}px;
        border: 1.5px solid transparent; cursor: pointer; outline: none;
        -webkit-tap-highlight-color: transparent;
        transition: transform 140ms ease-out, box-shadow 140ms ease-out,
          background-color 140ms ease-out, border-color 140ms ease-out, opacity 140ms ease-out;
      }
      .ds-button--sm { padding: 8px ${dsSp[5]}px; font-size: 12.5px; }
      .ds-button:focus-visible { box-shadow: 0 0 0 2px ${ds.canvas}, 0 0 0 4px ${ds.focusRing}; }

      .ds-button--primary { background: ${ds.accent}; border-color: ${ds.accent}; color: ${ds.accentInk}; box-shadow: ${dsSh.accentGlow}; }
      .ds-button--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(245,197,24,0.45); }
      .ds-button--primary:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: ${dsSh.accentGlow}; }

      .ds-button--secondary { background: transparent; border-color: ${ds.border}; color: ${ds.ink}; }
      .ds-button--secondary:hover:not(:disabled) { background: ${ds.surfaceRaised}; border-color: ${ds.borderMuted}; }
      .ds-button--secondary:active:not(:disabled) { transform: scale(0.98); }

      .ds-button--danger { background: transparent; border-color: ${ds.dangerBorderSubtle}; color: ${ds.danger}; }
      .ds-button--danger:hover:not(:disabled) { background: rgba(239,68,68,0.12); border-color: ${ds.danger}; }
      .ds-button--danger:active:not(:disabled) { transform: scale(0.98); }

      .ds-button:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }

      .ds-card {
        background: linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%);
        border: 1px solid ${ds.borderSoft}; border-radius: ${dsR.xl}px;
        padding: ${dsSp[6]}px; display: flex; flex-direction: column; gap: ${dsSp[4]}px;
        box-shadow: ${dsSh.elevation2}, inset 0 1px 0 rgba(255,255,255,0.03);
        transition: box-shadow 160ms ease-out, border-color 160ms ease-out, transform 160ms ease-out;
      }
      .ds-card--interactive { cursor: pointer; }
      .ds-card--interactive:hover { box-shadow: ${dsSh.elevation3}, inset 0 1px 0 rgba(255,255,255,0.05); border-color: ${ds.borderMuted}; transform: translateY(-2px); }
      .ds-card--interactive:active { transform: translateY(0) scale(0.995); }
      .ds-card--done { border-color: ${ds.successBorderSubtle}; background: linear-gradient(180deg, ${ds.success}0d, ${ds.surface} 40%); }
      .ds-card--error { border-color: ${ds.dangerBorderSubtle}; }

      .ds-input {
        width: 100%; background: ${ds.canvas}; border: 1.5px solid ${ds.border}; border-radius: ${dsR.md}px;
        padding: 10px 12px; color: ${ds.ink}; font-family: ${dsF.sans}; font-size: 14px; outline: none;
        transition: border-color 140ms ease-out, box-shadow 140ms ease-out;
      }
      .ds-input::placeholder { color: ${ds.inkMuted}; }
      .ds-input:hover { border-color: ${ds.borderMuted}; }
      .ds-input:focus-visible { border-color: ${ds.accent}; box-shadow: 0 0 0 3px ${ds.accentSubtle}; }
      .ds-input--error { border-color: ${ds.danger}; }
      .ds-input--error:focus-visible { box-shadow: 0 0 0 3px ${ds.dangerBorderSubtle}; }

      .ds-select-wrap { position: relative; }
      .ds-select {
        width: 100%; appearance: none; -webkit-appearance: none; -moz-appearance: none;
        background: ${ds.canvas}; border: 1.5px solid ${ds.border}; border-radius: ${dsR.md}px;
        padding: 11px 36px 11px 13px; color: ${ds.ink}; font-family: ${dsF.sans}; font-size: 14px;
        cursor: pointer; outline: none;
        transition: border-color 140ms ease-out, box-shadow 140ms ease-out;
      }
      .ds-select:hover { border-color: ${ds.borderMuted}; }
      .ds-select:focus-visible { border-color: ${ds.accent}; box-shadow: 0 0 0 3px ${ds.accentSubtle}; }
      .ds-select--error { border-color: ${ds.danger}; }
      .ds-select-wrap .ds-select__chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: ${ds.inkSecondary}; }

      .ds-badge {
        display: inline-flex; align-items: center; font-family: ${dsF.mono}; font-size: 9px; letter-spacing: 0.02em;
        padding: 2px ${dsSp[3]}px; border-radius: ${dsR.sm}px; border: 1px solid ${ds.border};
        color: ${ds.inkSecondary}; background: transparent;
        transition: background-color 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out;
      }
      .ds-badge--accent { color: ${ds.accent}; border-color: ${ds.accentBorderSubtle}; background: ${ds.accentSubtle}; }
      .ds-badge--success { color: ${ds.success}; border-color: ${ds.successBorderSubtle}; background: rgba(34,197,94,0.1); }
      .ds-badge--danger { color: ${ds.danger}; border-color: ${ds.dangerBorderSubtle}; background: rgba(239,68,68,0.1); }

      .ds-toggle {
        width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid ${ds.border}; background: transparent;
        color: ${ds.inkMuted}; font-size: 17px; display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; outline: none;
        transition: transform 160ms cubic-bezier(0.34,1.56,0.64,1), background-color 160ms ease-out,
          border-color 160ms ease-out, box-shadow 160ms ease-out;
      }
      .ds-toggle:hover:not(:disabled) { border-color: ${ds.borderMuted}; }
      .ds-toggle:focus-visible { box-shadow: 0 0 0 2px ${ds.canvas}, 0 0 0 4px ${ds.focusRing}; }
      .ds-toggle--on { border-color: ${ds.success}; background: ${ds.success}; color: ${ds.accentInk}; transform: scale(1.06); }
      .ds-toggle--on:hover { transform: scale(1.1); }
      .ds-toggle:active:not(:disabled) { transform: scale(0.92); }

      .ds-avatar {
        display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;
        font-family: ${dsF.display}; font-weight: 600; color: ${ds.accentInk}; background: ${ds.accent};
        flex-shrink: 0; user-select: none;
      }

      .ds-navitem {
        display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 9px; border: none;
        background: transparent; color: ${ds.inkSecondary}; font-family: ${dsF.sans}; font-size: 13.5px;
        font-weight: 500; cursor: pointer; width: 100%; text-align: left;
        transition: background-color 140ms ease-out, color 140ms ease-out;
      }
      .ds-navitem:hover { background: ${ds.surface}; color: ${ds.ink}; }
      .ds-navitem--active { background: ${ds.accentSubtle}; color: ${ds.accent}; font-weight: 600; }
      .ds-navitem svg { flex-shrink: 0; }

      .ds-stattile {
        background: linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%);
        border: 1px solid ${ds.borderSoft}; border-radius: ${dsR.xl}px;
        padding: ${dsSp[6]}px; display: flex; flex-direction: column; gap: ${dsSp[4]}px;
        box-shadow: ${dsSh.elevation2}, inset 0 1px 0 rgba(255,255,255,0.03); transition: transform 160ms ease-out, box-shadow 160ms ease-out;
      }
      .ds-stattile:hover { transform: translateY(-2px); box-shadow: ${dsSh.elevation3}, inset 0 1px 0 rgba(255,255,255,0.05); }
      .ds-stattile__label { font-family: ${dsF.mono}; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: ${ds.inkMuted}; text-transform: uppercase; }
      .ds-stattile__value { font-family: ${dsF.display}; font-size: 32px; font-weight: 800; color: ${ds.ink}; line-height: 1.05; }
      .ds-stattile__delta { display: flex; align-items: center; gap: 4px; font-size: 11.5px; }
      .ds-stattile__delta--up { color: ${ds.success}; }
      .ds-stattile__delta--down { color: ${ds.danger}; }
      .ds-stattile__delta--neutral { color: ${ds.inkMuted}; }

      .ds-tabswitcher { display: flex; gap: ${dsSp[3]}px; }
      .ds-tabswitcher__pill {
        display: inline-flex; align-items: center; gap: 6px;
        font-family: ${dsF.sans}; font-size: 13px; font-weight: 600; padding: 8px ${dsSp[6]}px;
        border-radius: 999px; border: 1px solid ${ds.border}; background: transparent; color: ${ds.inkSecondary};
        cursor: pointer; outline: none;
        transition: background-color 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out;
      }
      .ds-tabswitcher__pill svg { flex-shrink: 0; }
      .ds-tabswitcher__pill:focus-visible { box-shadow: 0 0 0 2px ${ds.canvas}, 0 0 0 4px ${ds.focusRing}; }
      .ds-tabswitcher__pill--active { background: ${ds.accentSubtle}; border-color: ${ds.accentBorderSubtle}; color: ${ds.accent}; }

      .ds-progressring__track { fill: none; stroke: ${ds.surface}; }
      .ds-progressring__value { fill: none; stroke: ${ds.accent}; stroke-linecap: round; transition: stroke-dashoffset 300ms ease-out; }
      .ds-progressring__label { font-family: ${dsF.display}; font-weight: 700; fill: ${ds.ink}; }
    `}</style>
  );
}

// ---------- ui-components.jsx (piezas reutilizables) ----------
function dsCx(...parts) {
  return parts.filter(Boolean).join(" ");
}
function DsButton({ variant = "primary", size = "md", disabled, className, children, ...rest }) {
  return (
    <button type={rest.type || "button"} disabled={disabled} className={dsCx("ds-button", `ds-button--${variant}`, size === "sm" && "ds-button--sm", className)} {...rest}>
      {children}
    </button>
  );
}
function DsCard({ status = "default", interactive, className, children, ...rest }) {
  return (
    <div className={dsCx("ds-card", interactive && "ds-card--interactive", status !== "default" && `ds-card--${status}`, className)} {...rest}>
      {children}
    </div>
  );
}
function DsToggle({ on, disabled, label, className, ...rest }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={!!on} aria-label={label || (on ? "Completado" : "Marcar como completado")} className={dsCx("ds-toggle", on && "ds-toggle--on", className)} {...rest}>
      {on ? "✓" : ""}
    </button>
  );
}
function DsBadge({ tone = "neutral", className, children }) {
  return <span className={dsCx("ds-badge", tone !== "neutral" && `ds-badge--${tone}`, className)}>{children}</span>;
}
function DsInput({ error, className, ...rest }) {
  return <input className={dsCx("ds-input", error && "ds-input--error", className)} {...rest} />;
}
function DsSelect({ error, className, children, ...rest }) {
  return (
    <div className={dsCx("ds-select-wrap", className)}>
      <select className={dsCx("ds-select", error && "ds-select--error")} {...rest}>
        {children}
      </select>
      <svg className="ds-select__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
function DsTabSwitcher({ tabs, active, onChange, className }) {
  return (
    <div className={dsCx("ds-tabswitcher", className)}>
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange && onChange(t.id)} aria-pressed={active === t.id} className={dsCx("ds-tabswitcher__pill", active === t.id && "ds-tabswitcher__pill--active")}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
function DsProgressRing({ value = 0, size = 86, strokeWidth = 8, showLabel = true, className }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (v / 100) * circumference;
  const center = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <circle className="ds-progressring__track" cx={center} cy={center} r={r} strokeWidth={strokeWidth} />
      <circle className="ds-progressring__value" cx={center} cy={center} r={r} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${center} ${center})`} />
      {showLabel && (
        <text x={center} y={center + size * 0.06} textAnchor="middle" className="ds-progressring__label" style={{ fontSize: Math.round(size * 0.22) }}>
          {Math.round(v)}%
        </text>
      )}
    </svg>
  );
}
// ============================================================
function DsAvatar({ size = 32, style, className, children }) {
  return (
    <div className={dsCx("ds-avatar", className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.4), ...style }}>
      {children}
    </div>
  );
}
function DsNavItem({ active, icon, onClick, className, children }) {
  return (
    <button type="button" onClick={onClick} className={dsCx("ds-navitem", active && "ds-navitem--active", className)}>
      {icon}
      {children}
    </button>
  );
}
function DsStatTile({ label, value, icon, delta, style, className }) {
  return (
    <div className={dsCx("ds-stattile", className)} style={style}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="ds-stattile__label">{label}</span>
        {icon}
      </div>
      <div className="ds-stattile__value">{value}</div>
      {delta && <div className={`ds-stattile__delta ds-stattile__delta--${delta.direction || "neutral"}`}>{delta.label}</div>}
    </div>
  );
}
// FIN sistema de diseño incrustado
// ============================================================

// ====== Backend remoto (Supabase) ======
// Sustituye a Google Sheets/Apps Script. Las tablas viven ahora en Postgres
// (ver schema_supabase.sql + fix_columnas_faltantes.sql + fix_ejercicios.sql,
// que añaden columnas que faltaban del esquema original: sesiones.objetivo,
// sesiones.tipo, sesiones.nombre, tareas.fecha, ejercicios.sin_lateralidad).
// La clave "publishable" es pública a propósito — va dentro del código de la
// app, igual que antes el token compartido de Apps Script — el candado real
// de acceso son las políticas RLS creadas en Supabase (politicas_acceso.sql).
const SUPABASE_URL = "https://ozarscohvitkopamnbtt.supabase.co";
const SUPABASE_KEY = "sb_publishable_iUxpTZzSNfACaGacbUawFA_uZi3qpN-";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ENTITY_TABLE = {
  jugadores: "jugadores",
  ejercicios: "ejercicios",
  categoriasPreventivas: "categorias_preventivas",
  sesiones: "sesiones",
  tareas: "tareas",
  circuitos: "circuitos",
  registros: "registros",
  grupos: "grupos",
};

const ID_PREFIX = { jugadores: "jug", ejercicios: "ejc", categoriasPreventivas: "cat", sesiones: "ses", tareas: "tar", circuitos: "cir", registros: "reg", grupos: "grp" };
function genId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// Con Google Sheets, la columna "material" y "resistencia_data" de Tareas
// NUNCA se interpretaban en el propio backend — el resto de la app las
// trata como texto y las interpreta ella misma (parseMateriales /
// parseResistenciaData). En Postgres esos dos campos son un array/jsonb de
// verdad, así que aquí se hace la conversión de ida y vuelta.
function transformFromDb(entity, row) {
  if (!row || entity !== "tareas") return row;
  return {
    ...row,
    material: JSON.stringify(row.material || []),
    resistencia_data: row.resistencia_data ? JSON.stringify(row.resistencia_data) : "",
  };
}

// Con Sheets, un número o una referencia "vacíos" y "sin escribir" eran la
// misma cosa: una celda en blanco. En Postgres, una columna numérica o una
// referencia a otra tabla exigen un valor real o NULL — un texto vacío ""
// las rompe. Esto lo traduce automáticamente para cada columna así de cada
// tabla, en vez de tener que acordarse de arreglarlo cada vez que aparece
// una nueva (fue precisamente lo que falló varias veces seguidas).
const NUMERIC_DEFAULTS = {
  ejercicios: { orden_rotacion: null },
  sesiones: { preventivo_activo: 0 },
  circuitos: { rondas: null },
  tareas: { series: null, cantidad: null, rir: null, pct1rm: null, orden_en_circuito: null },
  registros: { reps_hechas: null, carga_kg: null, rir: null },
};
function sanitizeNumericos(entity, out) {
  const cols = NUMERIC_DEFAULTS[entity];
  if (!cols) return;
  Object.keys(cols).forEach((col) => {
    if (!(col in out)) return;
    const val = out[col];
    if (val === "" || val === undefined || val === null) {
      out[col] = cols[col];
    } else if (typeof val !== "number") {
      const n = Number(val);
      out[col] = Number.isFinite(n) ? n : cols[col];
    }
  });
}

// Cuando eliges "Todo el equipo" al diseñar una sesión, la app guarda
// internamente `null` como forma de decir "sin restricción" (en vez de una
// lista vacía). Con Google Sheets esto nunca daba problema porque Code.gs
// convertía automáticamente CUALQUIER campo de lista que llegara como
// null/vacío en una lista vacía real antes de escribirlo (`value || []`,
// igual para fechas, categorías, destinatarios...). Aquí se hace lo mismo,
// en genérico, para no tener que acordarse columna por columna.
const ARRAY_COLUMNS = {
  jugadores: ["categorias_preventivas", "grupos_ids"],
  ejercicios: ["tags_descriptivos"],
  sesiones: ["fechas", "jugadores_destino"],
  tareas: ["material"],
};
function sanitizeArrays(entity, out) {
  const cols = ARRAY_COLUMNS[entity];
  if (!cols) return;
  cols.forEach((col) => {
    if (!(col in out)) return;
    if (out[col] === null || out[col] === undefined) out[col] = [];
  });
}

function transformToDb(entity, record) {
  const out = { ...record };
  if (entity === "tareas") {
    if (typeof out.material === "string") {
      try {
        out.material = JSON.parse(out.material || "[]");
      } catch {
        out.material = [];
      }
    }
    if (!out.material) out.material = [];
    if (typeof out.resistencia_data === "string") {
      out.resistencia_data = out.resistencia_data ? JSON.parse(out.resistencia_data) : null;
    }
    if (out.resistencia_data === "") out.resistencia_data = null;
    // "modo" tiene una lista cerrada de valores válidos en la base de datos
    // (reps/tiempo/metros/minutos) — a diferencia de "bloque" en ejercicios,
    // aquí "" NO está en la lista permitida. Las tareas de Movilidad y
    // Preventivo (todavía sin usar) mandan "" para "no aplica"; en NULL sí
    // es válido, así que se traduce aquí.
    if (out.modo === "") out.modo = null;
  }
  if (entity === "ejercicios") {
    // categoria_preventiva_id es una referencia a otra tabla: no admite
    // texto vacío, solo NULL. ejercicio_base_id (variante de) es lo mismo.
    if (out.categoria_preventiva_id === "") out.categoria_preventiva_id = null;
    if (out.ejercicio_base_id === "") out.ejercicio_base_id = null;
  }
  if (entity === "sesiones") {
    // lote_origen_id es una referencia a otra sesión (para cuando una
    // sesión viene de duplicar un lote) — mismo caso que categoria_
    // preventiva_id: "" no es una fila válida, solo NULL lo es.
    if (out.lote_origen_id === "") out.lote_origen_id = null;
  }
  sanitizeNumericos(entity, out);
  sanitizeArrays(entity, out);
  return out;
}

function throwIfError(error) {
  if (error) throw new Error(error.message);
}

function applyFilters(query, filters) {
  Object.keys(filters || {}).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "") return;
    const values = String(value).split(",").map((s) => s.trim()).filter(Boolean);
    query = values.length > 1 ? query.in(key, values) : query.eq(key, values[0]);
  });
  return query;
}

const api = {
  list: async (entity, filters) => {
    let query = supabase.from(ENTITY_TABLE[entity]).select("*");
    query = applyFilters(query, filters);
    const { data, error } = await query;
    throwIfError(error);
    return (data || []).map((row) => transformFromDb(entity, row));
  },
  get: async (entity, id) => {
    const { data, error } = await supabase.from(ENTITY_TABLE[entity]).select("*").eq("id", id).maybeSingle();
    throwIfError(error);
    return transformFromDb(entity, data);
  },
  save: async (entity, record) => {
    const toSave = transformToDb(entity, record);
    if (!toSave.id) toSave.id = genId(ID_PREFIX[entity] || "id");
    const { data, error } = await supabase.from(ENTITY_TABLE[entity]).upsert(toSave, { onConflict: "id" }).select().maybeSingle();
    throwIfError(error);
    return transformFromDb(entity, data);
  },
  delete: async (entity, id) => {
    const { error } = await supabase.from(ENTITY_TABLE[entity]).delete().eq("id", id);
    throwIfError(error);
    return { deleted: true };
  },
  materiales: async () => {
    const { data, error } = await supabase.from("materiales").select("nombre").order("nombre");
    throwIfError(error);
    return (data || []).map((r) => r.nombre);
  },
  guardarMaterial: async (nombre) => {
    const { error } = await supabase.from("materiales").upsert({ nombre }, { onConflict: "nombre" });
    throwIfError(error);
    return api.materiales();
  },
  eliminarMaterial: async (nombre) => {
    const { error } = await supabase.from("materiales").delete().eq("nombre", nombre);
    throwIfError(error);
    return api.materiales();
  },
  categoriasPreventivas: async () => {
    const { data, error } = await supabase.from("categorias_preventivas").select("*");
    throwIfError(error);
    return data || [];
  },
  config: async (clave) => {
    const { data, error } = await supabase.from("config").select("valor").eq("clave", clave).maybeSingle();
    throwIfError(error);
    return data ? data.valor : null;
  },
  setConfig: async (clave, valor) => {
    const { error } = await supabase.from("config").upsert({ clave, valor }, { onConflict: "clave" });
    throwIfError(error);
    return { clave, valor };
  },
  rotacion: async (categoriaId) => {
    if (categoriaId) {
      const { data, error } = await supabase.from("rotacion").select("*").eq("categoria_id", categoriaId).maybeSingle();
      throwIfError(error);
      return data || null;
    }
    const { data, error } = await supabase.from("rotacion").select("*");
    throwIfError(error);
    return data || [];
  },
  setRotacion: async (categoriaId, punteroActual) => {
    const { error } = await supabase.from("rotacion").upsert({ categoria_id: categoriaId, puntero_actual: punteroActual }, { onConflict: "categoria_id" });
    throwIfError(error);
    return { categoria_id: categoriaId, puntero_actual: punteroActual };
  },
  // OJO: hace falta un bucket de Storage llamado "gifs" (público) en
  // Supabase para que esto funcione — no está creado todavía. Ningún botón
  // de la app llama a esto hoy, así que no bloquea nada.
  uploadGif: async (dataUri) => {
    const match = /^data:(.+?);base64,(.+)$/.exec(dataUri || "");
    if (!match) throw new Error("dataUri inválida");
    const [, mimeType, base64] = match;
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const fileName = `ejercicio_${Date.now()}.gif`;
    const { error } = await supabase.storage.from("gifs").upload(fileName, new Blob([bytes], { type: mimeType }), { contentType: mimeType, upsert: true });
    throwIfError(error);
    const { data } = supabase.storage.from("gifs").getPublicUrl(fileName);
    return { fileId: fileName, url: data.publicUrl };
  },
  bootstrapJugador: async (jugadorId, fecha) => {
    const { data: todasSesiones, error: e1 } = await supabase.from("sesiones").select("*").eq("enviada", true);
    throwIfError(e1);
    const sesionesHoy = (todasSesiones || []).filter((s) => {
      const fechas = s.fechas || [];
      const destino = s.jugadores_destino || [];
      return fechas.includes(fecha) && (!destino.length || destino.includes(jugadorId));
    });
    // Próxima sesión futura de este jugador (para el Dashboard): mismo
    // conjunto de sesiones que ya se ha traído arriba para calcular las de
    // hoy, así que no hace falta ninguna llamada extra — solo mirar, de
    // las suyas, cuál es la fecha futura más próxima.
    let proximaSesion = null;
    (todasSesiones || []).forEach((s) => {
      const destino = s.jugadores_destino || [];
      if (destino.length && !destino.includes(jugadorId)) return;
      (s.fechas || []).forEach((f) => {
        if (f <= fecha) return;
        if (!proximaSesion || f < proximaSesion.fecha) proximaSesion = { sesion: s, fecha: f };
      });
    });
    const sesionIds = sesionesHoy.map((s) => s.id);
    let tareas = [];
    if (sesionIds.length) {
      const { data, error } = await supabase.from("tareas").select("*").in("sesion_id", sesionIds);
      throwIfError(error);
      tareas = (data || []).map((row) => transformFromDb("tareas", row));
    }
    const ejercicioIds = [...new Set(tareas.map((t) => t.ejercicio_id).filter(Boolean))];
    const circuitoIds = [...new Set(tareas.map((t) => t.circuito_id).filter(Boolean))];
    let ejercicios = [];
    if (ejercicioIds.length) {
      const { data, error } = await supabase.from("ejercicios").select("*").in("id", ejercicioIds);
      throwIfError(error);
      ejercicios = data || [];
    }
    let circuitos = [];
    if (circuitoIds.length) {
      const { data, error } = await supabase.from("circuitos").select("*").in("id", circuitoIds);
      throwIfError(error);
      circuitos = data || [];
    }
    return { sesiones: sesionesHoy, tareas, ejercicios, circuitos, proximaSesion };
  },
  bootstrapProgramacion: async () => {
    const { data: sesiones, error: e1 } = await supabase.from("sesiones").select("*");
    throwIfError(e1);
    const sesionIds = (sesiones || []).map((s) => s.id);
    let tareas = [];
    if (sesionIds.length) {
      const { data, error } = await supabase.from("tareas").select("*").in("sesion_id", sesionIds);
      throwIfError(error);
      tareas = (data || []).map((row) => transformFromDb("tareas", row));
    }
    const { data: ejercicios, error: e3 } = await supabase.from("ejercicios").select("*");
    throwIfError(e3);
    return { sesiones: sesiones || [], tareas, ejercicios: ejercicios || [] };
  },
};
// ====== Fin backend remoto ======

// ====== Sistema de diseño ======
// Colores y tipografía centralizados — antes cada pantalla llevaba sus
// propios valores sueltos repetidos (#0E1E35, #1A3050...) sin ningún sitio
// común. Se introduce aquí, y las pantallas se van pasando a usarlo una a
// una (no todas de golpe) para poder comprobar cada una por separado.
// Paleta pensada para esto en concreto — fútbol, sub-19, sala de
// readaptación — no la plantilla "panel oscuro + un acento" por defecto:
// fondo con un pelín de calidez (no negro plano), el dorado reservado para
// lo que de verdad destaca en vez de repetido en cada etiqueta, y un verde
// con carácter propio para "hecho/positivo" en vez del verde genérico de
// cualquier interfaz.
const TEMA = {
  fondo: "#0A1220",
  fondoElevado: "#0D1A2E",
  superficie: "#111F35",
  superficieAlta: "#152744",
  borde: "#1E3355",
  bordeSuave: ds.border,
  texto: "#F3F6FA",
  textoMuted: "#8CA0BC",
  textoTenue: "#5A7291",
  acento: "#F0B429",
  acentoSuave: "#F0B42922",
  exito: "#3FBF6F",
  alerta: "#FB923C",
  error: "#F0605C",
  fuenteTitular: dsF.display,
  fuenteTexto: dsF.sans,
};

// "Hoy" en la fecha local del dispositivo — NUNCA en UTC. España está por
// delante de UTC (+1 invierno, +2 verano), así que usar
// `new Date().toISOString()` devolvía el día de ayer durante las primeras
// horas de la madrugada (medianoche a 1-2 de la mañana): una sesión de hoy
// se guardaba fechada ayer.
const todayStr = () => {
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
const normalizarFecha = (d) => {
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

const fmtDateLabel = (d) => {
  const dt = new Date(normalizarFecha(d) + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
};

const fmtDateShort = (d) => {
  const dt = new Date(normalizarFecha(d) + "T00:00:00");
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
};

// "hace N días" en vez de una fecha absoluta — para cajones compactos
// (dashboard del jugador) donde el dato relevante es "qué tan reciente es
// esto", no la fecha exacta.
const fmtHaceDias = (fecha) => {
  const dt = new Date(normalizarFecha(fecha) + "T00:00:00");
  const hoy = new Date(todayStr() + "T00:00:00");
  const dias = Math.round((hoy - dt) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
};

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

// Caché en memoria compartida entre TODAS las pantallas de la app (vive
// mientras la pestaña del navegador esté abierta). Sin esto, cada vez que
// cambias de pantalla se vuelve a pedir todo desde cero a Apps Script, que
// es lento por naturaleza — con la caché, la segunda vez que hace falta un
// dato ya está en memoria y no hay que esperar a la red.
const sharedDataCache = new Map();

// Para los sitios que guardan directamente con api.save/api.delete sin pasar
// por useEntityList (p. ej. el guardado de Diseñar sesión, que escribe
// Sesiones/Tareas/Circuitos en varias llamadas sueltas) — limpia la caché de
// esa entidad para que la próxima pantalla que la necesite pida datos frescos
// en vez de mostrar lo de antes de guardar.
function invalidateEntityCache(entity) {
  for (const k of sharedDataCache.keys()) {
    if (k.startsWith(`list:${entity}:`)) sharedDataCache.delete(k);
  }
}

// invalidateEntityCache() solo limpia las listas genéricas (list:entity:...).
// Las pantallas de "bootstrap" (Programación, pantalla del jugador) usan sus
// propias claves de caché ("bootstrap:programacion", "bootstrap:<jugadorId>:<fecha>")
// que NO empiezan por "list:", así que sobrevivían a esa limpieza — por eso
// una sesión guardada desde el botón directo "Diseñar sesión" del dashboard
// no aparecía en Programación hasta cerrar y reabrir la app (lo que vacía
// toda la memoria y fuerza a pedirlo todo de nuevo). Se llama a esto junto a
// invalidateEntityCache cada vez que se guarda o borra una sesión.
function invalidateBootstrapCache() {
  for (const k of sharedDataCache.keys()) {
    if (k.startsWith("bootstrap:")) sharedDataCache.delete(k);
  }
}

// Sustituye a usePersistentList: sincroniza el array COMPLETO de una entidad
// (jugadores, ejercicios, sesiones, tareas, registros...) contra su pestaña.
// save(next) recibe la lista completa deseada (igual que antes) y por debajo
// solo guarda los registros que cambiaron (comparando por referencia) y borra
// los que ya no están — así el resto del código que hace `players.map(...)`,
// `[...items, nuevo]`, `.filter(...)` no necesita cambiar de forma.
function useEntityList(entity, filters) {
  const filtersKey = JSON.stringify(filters || null);
  const cacheKey = `list:${entity}:${filtersKey}`;
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  // Se mantiene siempre al día, de forma síncrona, independientemente de
  // cuándo React decida re-renderizar. save() compara contra esta referencia
  // en vez de contra el "items" cerrado en el momento en que se creó la
  // función — así, si guardas dos veces seguidas muy rápido, el segundo
  // guardado ve de verdad el resultado del primero y no lo deshace ni
  // duplica nada por comparar contra una foto vieja.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let cancelled = false;
    // filters === false es la señal explícita de "todavía no hay nada que pedir"
    // (p. ej. ningún jugador seleccionado aún) — evita traer la pestaña entera sin filtrar.
    if (filters === false) {
      setItems([]);
      setLoaded(true);
      return;
    }
    // Si ya está en caché y no es un refresco explícito (tick), se usa tal
    // cual, sin ir a la red — esto es lo que hace que volver a una pantalla
    // ya visitada sea instantáneo.
    if (tick === 0 && sharedDataCache.has(cacheKey)) {
      setItems(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      try {
        const res = await api.list(entity, filters);
        if (cancelled) return;
        sharedDataCache.set(cacheKey, res || []);
        setItems(res || []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setError(e?.message || "No se pudo cargar. Comprueba tu conexión.");
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
      const previous = itemsRef.current;
      itemsRef.current = next; // optimista e inmediato: la siguiente llamada a save(), aunque sea milisegundos después, ya lo ve
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
        // Si mientras esta llamada estaba en marcha llegó OTRA más reciente
        // (itemsRef.current ya no es "next"), no pisamos su resultado — nos
        // limitamos a fusionar los ids reales que acabamos de crear.
        if (itemsRef.current === next) {
          itemsRef.current = reconciled;
          setItems(reconciled);
        } else {
          const finalItems = itemsRef.current.map((item) => {
            const idx = next.indexOf(item);
            return idx !== -1 && toSaveIdx.includes(idx) ? reconciled[idx] : item;
          });
          itemsRef.current = finalItems;
          setItems(finalItems);
        }
        sharedDataCache.set(cacheKey, itemsRef.current);
        // Cualquier otra pantalla que tenga esta misma entidad cacheada con
        // OTRO filtro (p. ej. "registros de este jugador" vs "todos los
        // registros") puede haberse quedado desactualizada — se invalida
        // para que la próxima vez que se visite, se vuelva a pedir.
        for (const k of sharedDataCache.keys()) {
          if (k.startsWith(`list:${entity}:`) && k !== cacheKey) sharedDataCache.delete(k);
        }
        setError(null);
        return true;
      } catch (e) {
        setItems(previous);
        setError("No se pudo guardar. Inténtalo de nuevo.");
        return false;
      }
    },
    [entity, cacheKey]
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);

  // Añade un registro ya guardado (con id real) directamente al estado local
  // y a la caché compartida, sin pasar por la red ni tocar `loaded` — a
  // diferencia de retry(), no provoca ningún parpadeo de carga. Se usa
  // cuando algo ya se guardó por su cuenta (p. ej. resolveEjercicio) y solo
  // hace falta que esta lista en memoria se entere.
  const addLocal = useCallback(
    (item) => {
      itemsRef.current = [...itemsRef.current, item];
      setItems(itemsRef.current);
      sharedDataCache.set(cacheKey, itemsRef.current);
    },
    [cacheKey]
  );

  return [items, save, loaded, error, retry, addLocal];
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
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setValue(null);
        setError(e?.message || "No se pudo cargar. Comprueba tu conexión.");
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
// gruposIds es un concepto distinto y nuevo: los "grupos" que tú creas
// (equipos, agrupaciones libres) — un usuario puede estar en varios a la
// vez, igual mecánica que groupIds pero sin relación con lo preventivo.
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
        gruposIds: Array.isArray(r.grupos_ids) ? r.grupos_ids : [],
        // Posición de juego (portero/central/...) — añadida para el módulo
        // Control de fatiga (Parte 5), pero es un dato del jugador en
        // general, no exclusivo del CMJ.
        posicion: r.posicion || null,
      })),
    [rows]
  );

  const savePlayers = useCallback(
    (nextPlayers) => {
      const nextRows = nextPlayers.map((p) => {
        const original = p.id ? rowsById.get(p.id) : null;
        const groupIds = p.groupIds || [];
        const gruposIds = p.gruposIds || [];
        const estado = p.estado || "activo";
        if (
          original &&
          original.nombre === p.name &&
          original.pin === p.pin &&
          original.estado === estado &&
          JSON.stringify(original.categorias_preventivas || []) === JSON.stringify(groupIds) &&
          JSON.stringify(original.grupos_ids || []) === JSON.stringify(gruposIds)
        ) {
          return original; // sin cambios reales: misma referencia -> no se reguarda
        }
        return { id: p.id, nombre: p.name, pin: p.pin, estado, categorias_preventivas: groupIds, grupos_ids: gruposIds };
      });
      return saveRows(nextRows);
    },
    [saveRows, rowsById]
  );

  return [players, savePlayers, loaded, error, retry];
}

const MD_TAGS = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "Sin MD"];

const inputStyle = {
  width: "100%",
  background: ds.canvas,
  border: `1px solid ${ds.border}`,
  borderRadius: dsR.md,
  padding: "10px 12px",
  color: ds.ink,
  fontFamily: dsF.sans,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

// Extrae el ID de un enlace de YouTube en cualquiera de sus formatos habituales
// (watch?v=, youtu.be/, shorts/, embed/). Devuelve null si no es de YouTube —
// así el resto de la app puede seguir aceptando enlaces antiguos (GIFs de
// Drive de antes de este cambio) sin romperse.
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Un enlace "de vídeo directo" es cualquier URL que termine en una extensión
// de vídeo reproducible por <video> nativo — es lo que da Cloudflare R2 (o
// cualquier bucket de objetos): la URL pública del archivo tal cual, sin
// intermediario de por medio.
function esVideoDirecto(url) {
  return !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.trim());
}

// Miniatura para las tarjetas de tarea/biblioteca: si es un vídeo de YouTube,
// usa la miniatura oficial de YouTube. Un vídeo directo (R2 y similares) no
// trae miniatura propia — se resuelve con un icono de play sobre fondo liso
// en el sitio donde se pinta (ver TareaCardReal/TarjetaEjercicioReal). Si no
// es ninguna de las dos cosas (GIF antiguo de Drive), se usa el enlace tal
// cual como imagen.
function miniaturaTarea(url) {
  const videoId = extractYouTubeId(url);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  if (esVideoDirecto(url)) return null;
  return url;
}

// El material seleccionado se guarda como texto JSON en la columna `material`
// de Tareas. Este helper lo interpreta de forma segura en cualquier sitio
// donde haga falta mostrarlo (nunca deja caer una excepción si el campo está
// vacío o corrupto).
function parseMateriales(material) {
  if (!material) return [];
  try {
    const v = JSON.parse(material);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Todo lo propio de una tarea de Resistencia (tipo continuo/HIIT/RSA y sus
// campos) se guarda como JSON en la columna `resistencia_data`. Este par de
// helpers lo interpreta de forma segura y construye el texto legible que ve
// tanto el entrenador (Programación) como el jugador — un solo sitio para
// los dos, así no se desincronizan.
function parseResistenciaData(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Convierte un registro de "tareas" del backend en el objeto de trabajo
// (draft) que usan los editores de sesión — un solo mapeo compartido para
// tres casos: editar una sesión existente, reutilizar una pasada como
// plantilla, y (más adelante) cualquier otro sitio que necesite lo mismo.
// Con opts.nuevo=true se genera una key local nueva y se borra tareaId/
// circuito_id/orden — así, al guardar, se crea una fila nueva en vez de
// sobreescribir la tarea original (que sigue intacta en su sesión de origen).
function tareaADraft(t, ejerciciosById, opts = {}) {
  const nuevo = !!opts.nuevo;
  let materiales = [];
  try {
    materiales = t.material ? JSON.parse(t.material) : [];
  } catch {
    materiales = [];
  }
  let resistencia = { tipo: "", bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", recuperacion: "", recuperacionUnidad: "seg" };
  if (t.resistencia_data) {
    try {
      resistencia = { ...resistencia, ...JSON.parse(t.resistencia_data) };
    } catch {
      /* se queda el valor por defecto */
    }
  } else if (t.bloque_sesion === "Resistencia" && (t.series || t.cantidad || t.rir)) {
    resistencia = { ...resistencia, tipo: "hiit", intervalos: t.series ?? "", tiempo: t.cantidad ?? "", recuperacion: t.rir ?? "" };
  }
  const e = ejerciciosById.get(t.ejercicio_id) || {};
  return {
    key: nuevo ? Date.now() + Math.random() : t.id,
    tareaId: nuevo ? undefined : t.id,
    nombre: e.nombre || "(ejercicio eliminado)",
    ejercicioId: t.ejercicio_id,
    modo: t.modo || "reps",
    series: t.series ?? "",
    cantidad: t.cantidad ?? "",
    rir: t.rir ?? "",
    modoCarga: t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
    pct1rm: t.pct1rm ?? "",
    tipoResistencia: t.tipo_resistencia || "Peso libre",
    materiales,
    lateralidad: t.lateralidad || "bilateral",
    nota: t.nota || "",
    tipoResistenciaCardio: resistencia.tipo,
    bloques: resistencia.bloques,
    intervalos: resistencia.intervalos,
    tiempo: resistencia.tiempo,
    tiempoUnidad: resistencia.tiempoUnidad,
    intensidad: resistencia.intensidad,
    distancia: resistencia.distancia,
    recuperacion: resistencia.recuperacion,
    recuperacionUnidad: resistencia.recuperacionUnidad,
    circuito_id: nuevo ? "" : t.circuito_id || "",
    orden_en_circuito: nuevo ? "" : t.orden_en_circuito || "",
  };
}

// Agrupa las tareas de un bloque que comparten circuito_id, a partir
// únicamente de la lista de tareas (no hace falta la entidad "circuitos"
// aparte: cada tarea ya sabe a qué circuito y bloque pertenece). Se usa para
// reconstruir el borrador de "reutilizar sesión" sin tener que pedir los
// circuitos al backend sesión por sesión.
function agruparCircuitosDeTareas(tareas, ejerciciosById, nombreBloque, opts = {}) {
  const nuevo = !!opts.nuevo;
  const porCircuito = new Map();
  tareas
    .filter((t) => t.circuito_id && t.bloque_sesion === nombreBloque)
    .forEach((t) => {
      if (!porCircuito.has(t.circuito_id)) porCircuito.set(t.circuito_id, []);
      porCircuito.get(t.circuito_id).push(t);
    });
  return [...porCircuito.entries()].map(([circuitoId, tareasDelCircuito]) => ({
    key: nuevo ? Date.now() + Math.random() : circuitoId,
    circuitoId: nuevo ? undefined : circuitoId,
    tareas: tareasDelCircuito
      .slice()
      .sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0))
      .map((t) => tareaADraft(t, ejerciciosById, opts)),
  }));
}

function formatearObjetivoResistencia(r) {
  if (!r || !r.tipo) return "Sin configurar";
  const conUnidad = (v, u) => (v !== "" && v != null ? `${v} ${u === "min" ? "min" : "seg"}` : null);
  if (r.tipo === "continuo") {
    return [
      r.series && `${r.series} series`,
      conUnidad(r.tiempo, r.tiempoUnidad),
      r.intensidad && `${r.intensidad}% FCmáx`,
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (r.tipo === "hiit") {
    return [
      r.bloques && `${r.bloques} bloques`,
      r.intervalos && `${r.intervalos} intervalos`,
      conUnidad(r.tiempo, r.tiempoUnidad),
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (r.tipo === "rsa") {
    return [
      r.bloques && `${r.bloques} bloques`,
      r.series && `${r.series} series`,
      r.distancia && `${r.distancia} m`,
      conUnidad(r.recuperacion, r.recuperacionUnidad) && `${conUnidad(r.recuperacion, r.recuperacionUnidad)} recuperación`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

// Reproductor incrustado. Tres casos:
// - YouTube: iframe embebido (16:9, sin marca ni vídeos relacionados de más).
// - Vídeo directo (R2 u otro bucket): <video> nativo, con su propio estado
//   de carga (spinner mientras hace buffer) y de error visible si la URL no
//   responde — antes esto fallaba en silencio, ahora nunca lo hace.
// - Cualquier otra cosa (GIF antiguo de Drive, de antes de este cambio):
//   se muestra como imagen normal, para no romper lo que ya hubiera.
function VideoEmbed({ url }) {
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error
  useEffect(() => setEstado("cargando"), [url]);

  if (!url) return null;
  const videoId = extractYouTubeId(url);

  if (videoId) {
    return (
      <div style={{ marginTop: 8, position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }} onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
          title="Demostración del ejercicio"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
        />
      </div>
    );
  }

  if (esVideoDirecto(url)) {
    return (
      <div style={{ marginTop: 8, position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", background: "#000", minHeight: estado === "error" ? 0 : 160 }} onClick={(e) => e.stopPropagation()}>
        {estado === "cargando" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary, background: ds.surface }}>
            <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}
        {estado === "error" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 12px", background: ds.surface, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: 8, color: ds.danger, fontSize: 12.5, textAlign: "center" }}>
            <span>No se pudo cargar el vídeo.</span>
            <span style={{ color: ds.inkSecondary, fontSize: 11.5 }}>Comprueba tu conexión o que el enlace siga siendo válido.</span>
          </div>
        ) : (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            onCanPlay={() => setEstado("listo")}
            onError={() => setEstado("error")}
            style={{ width: "100%", maxHeight: 320, display: "block", opacity: estado === "listo" ? 1 : 0 }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      <img src={url} alt="Demostración de la tarea" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, display: "block", background: ds.canvas }} />
    </div>
  );
}

function LoadingBlock() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40, color: ds.inkSecondary }}>
      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Contenedor compartido de cada pantalla. Sustituye a los `minHeight: "100vh"`
// sueltos que había en cada componente (crecían sin límite hacia abajo, dando
// el efecto de scroll infinito). Ahora es una caja del tamaño exacto de la
// pantalla (100dvh, no 100vh — así no salta con la barra de Safari en móvil),
// centrada horizontal y verticalmente, con scroll solo dentro del contenido.
// - rol="entrenador" (por defecto): ancho adaptado al dispositivo, cómodo en
//   tablet/escritorio, hasta el maxWidth indicado por cada pantalla.
// - rol="jugador": ancho fijo tipo móvil, siempre vertical — no se adapta a
//   pantallas grandes aunque se abra en la tablet del entrenador.
// - centrarContenido: para estados pequeños (carga, error, PIN) en vez de
//   contenido de página completa — centra el bloque también verticalmente.
// Safari en iPad no siempre reporta bien 100vh/100dvh (varía con la barra de
// pestañas, el rebote, la rotación...), y eso es lo que llevaba causando el
// descentrado del portal por más vueltas que le diéramos a las unidades CSS.
// El primer intento medía window.innerHeight — pero en iPadOS ese valor
// puede incluir alto "de más" oculto detrás de la barra de pestañas/dirección
// (el "viewport de diseño", no lo que de verdad se ve). Eso deja la caja más
// alta de lo real, con el sobrante fuera de la pantalla por abajo, y el
// centrado calculado sobre esa caja inflada queda desplazado hacia arriba en
// lo que sí se ve — exactamente el síntoma. window.visualViewport.height
// existe justo para esto: el alto realmente visible en cada momento.
function useAlturaVentana() {
  const medirAhora = () => {
    if (typeof window === "undefined") return 900;
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  };
  const [alto, setAlto] = useState(medirAhora);
  useEffect(() => {
    const medir = () => setAlto(medirAhora());
    medir();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", medir);
      vv.addEventListener("scroll", medir);
    } else {
      window.addEventListener("resize", medir);
    }
    window.addEventListener("orientationchange", medir);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", medir);
        vv.removeEventListener("scroll", medir);
      } else {
        window.removeEventListener("resize", medir);
      }
      window.removeEventListener("orientationchange", medir);
    };
  }, []);
  return alto;
}

function useAnchoVentana() {
  const medirAhora = () => {
    if (typeof window === "undefined") return 1200;
    return window.innerWidth;
  };
  const [ancho, setAncho] = useState(medirAhora);
  useEffect(() => {
    const medir = () => setAncho(medirAhora());
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
    };
  }, []);
  return ancho;
}

function PantallaBase({ children, rol = "entrenador", maxWidth, centrarContenido = false }) {
  const alto = useAlturaVentana();
  const anchoMax = maxWidth || (rol === "jugador" ? 420 : 640);
  return (
    <div
      className="ds-reset"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: alto,
        background: TEMA.fondo,
        color: TEMA.texto,
        fontFamily: TEMA.fuenteTexto,
        display: "flex",
        justifyContent: "center",
        // Capa 1: SOLO scroll. No lleva justifyContent ni ninguna alineación —
        // mezclar overflow:auto con centrado flex en el mismo elemento es
        // justo lo que causaba que el centrado se ignorase.
        overflowY: "auto",
      }}
    >
      <GlobalStyles />
      <div
        style={{
          width: "100%",
          maxWidth: anchoMax,
          boxSizing: "border-box",
          // Capa 2: SOLO centrado. Ocupa como mínimo toda la altura visible
          // (min-height, no height — así, si el contenido es más alto que la
          // pantalla, esta capa crece y es la de fuera la que hace scroll,
          // en vez de recortar nada) y no tiene overflow propio.
          minHeight: centrarContenido ? alto : undefined,
          display: centrarContenido ? "flex" : "block",
          flexDirection: "column",
          justifyContent: centrarContenido ? "center" : "flex-start",
          padding: centrarContenido ? "24px" : rol === "jugador" ? "22px 20px 40px" : "24px 16px 40px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PinInput({ value, onChange, autoFocus }) {
  return (
    <DsInput
      autoFocus={autoFocus}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      style={{ textAlign: "center", fontSize: 22, letterSpacing: 10, fontWeight: 700, fontFamily: dsF.mono }}
      placeholder="····"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
    />
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
    videos_variantes: def.videos_variantes !== undefined ? def.videos_variantes : match?.videos_variantes || {},
    sin_lateralidad: def.sin_lateralidad !== undefined ? def.sin_lateralidad : match?.sin_lateralidad || "",
    orden_rotacion: match?.orden_rotacion || "",
  };
  const saved = await api.save("ejercicios", record);
  invalidateEntityCache("ejercicios"); // escribe directo, sin pasar por useEntityList
  return saved;
}

// Actualiza solo la zona corporal de un ejercicio ya existente en tu
// biblioteca — se usa cuando eliges un ejercicio antiguo (creado antes de
// que la zona fuera obligatoria) desde el buscador de "Diseñar sesión": en
// vez de dejarlo sin clasificar, se le asigna ahí mismo y queda guardado
// para siempre en ese ejercicio.
async function actualizarZonaEjercicio(ejercicio, zona) {
  const record = { ...ejercicio, tags_descriptivos: [zona] };
  const saved = await api.save("ejercicios", record);
  invalidateEntityCache("ejercicios");
  return saved;
}

// ---------- SESIONES / TAREAS / REGISTROS (en vivo, sin caché) ----------

function useCategoriasPreventivas() {
  const cacheKey = "categoriasPreventivas";
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  useEffect(() => {
    if (sharedDataCache.has(cacheKey)) return; // fija (lista de 12 categorías) — no cambia entre pantallas
    let cancelled = false;
    api
      .categoriasPreventivas()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res || []);
          setItems(res || []);
        }
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

// Igual que useCategoriasPreventivas: caché compartida entre pantallas, para
// no volver a pedir el listado de materiales cada vez que se entra a Diseñar
// sesión o a Dinámicas complementarias (antes cada una lo pedía por su cuenta,
// sin caché, en cada visita).
function useMaterialesDisponibles() {
  const cacheKey = "materiales";
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  useEffect(() => {
    if (sharedDataCache.has(cacheKey)) return;
    let cancelled = false;
    api
      .materiales()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res || []);
          setItems(res || []);
        }
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
  const agregar = useCallback(async (m) => {
    if (sharedDataCache.get(cacheKey)?.includes(m)) return;
    const next = [...(sharedDataCache.get(cacheKey) || items), m];
    sharedDataCache.set(cacheKey, next);
    setItems(next);
    await api.guardarMaterial(m);
  }, [items]);
  return [items, loaded, agregar];
}

// Carga las tareas de una o varias sesiones en una sola llamada (usa el filtro "IN" del backend).
function useTareasForSesiones(sesionIds) {
  const key = sesionIds.slice().sort().join(",");
  const sesionIdsSet = new Set(sesionIds);
  const cacheKey = `list:tareas:bySesiones:${key}`;
  const [tareas, setTareas] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => !key || sharedDataCache.has(cacheKey));
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setTareas([]);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setTareas(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list("tareas", { sesion_id: key })
      .then((res) => {
        if (!cancelled) {
          // CRÍTICO: nunca fiarse de que el backend filtre de verdad por
          // sesion_id — se ha confirmado que no lo hace y devuelve TODAS las
          // tareas de TODAS las sesiones que hayan existido nunca. Sin este
          // filtro, un jugador vería mezcladas tareas de sesiones antiguas
          // que no le corresponden.
          const filtradas = (res || []).filter((t) => sesionIdsSet.has(t.sesion_id));
          sharedDataCache.set(cacheKey, filtradas);
          setTareas(filtradas);
        }
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
  }, [key, cacheKey]);
  return [tareas, loaded];
}

// Trae varias filas de una entidad por id en una sola llamada (usa el filtro "IN" del backend).
function useEntityByIds(entity, ids) {
  const key = [...new Set(ids)].sort().join(",");
  // Comparte el mismo prefijo de caché que useEntityList("entity") para que,
  // si se guarda algo en esa entidad desde otra pantalla, esta caché también
  // se invalide junto con la otra (ver invalidación cruzada en save() de arriba).
  const cacheKey = `list:${entity}:byIds:${key}`;
  const [items, setItems] = useState(() => sharedDataCache.get(cacheKey) || []);
  const [loaded, setLoaded] = useState(() => !key || sharedDataCache.has(cacheKey));
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setItems([]);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setItems(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .list(entity, { id: key })
      .then((res) => {
        if (!cancelled) {
          // Igual que en el resto de hooks: no fiarse de que el filtro "IN"
          // del backend haga de verdad solo lo que pide — se re-filtra aquí
          // por si acaso devuelve más filas de las pedidas.
          const idsSet = new Set(ids);
          const filtrado = (res || []).filter((r) => idsSet.has(r.id));
          sharedDataCache.set(cacheKey, filtrado);
          setItems(filtrado);
        }
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
  }, [entity, key, cacheKey]);
  return [items, loaded];
}

// Historial completo de un jugador: sus Registros, unidos con la Tarea (series/reps/RIR
// prescritos) y el Ejercicio (nombre, tipos, GIF) correspondientes. Todo en vivo, sin caché.
function usePlayerHistory(playerId) {
  const [registrosTraidos, , registrosLoaded] = useEntityList("registros", playerId ? { jugador_id: playerId } : false);
  // Mismo blindaje que en la pantalla del jugador: el backend no filtra de
  // verdad por jugador_id, así que se filtra siempre aquí también.
  const registros = playerId ? registrosTraidos.filter((r) => r.jugador_id === playerId) : [];
  const tareaIds = registros.map((r) => r.tarea_id);
  const [tareas, tareasLoaded] = useEntityByIds("tareas", tareaIds);
  const ejercicioIds = tareas.map((t) => t.ejercicio_id);
  const [ejercicios, ejerciciosLoaded] = useEntityByIds("ejercicios", ejercicioIds);
  // Solo para poder comparar el CMJ de hoy con el de la última vez que hubo
  // el mismo MD — el resto de tareas no necesita saber de qué sesión vino.
  const sesionIds = [...new Set(tareas.map((t) => t.sesion_id).filter(Boolean))];
  const [sesiones, sesionesLoaded] = useEntityByIds("sesiones", sesionIds);

  const loaded = registrosLoaded && tareasLoaded && ejerciciosLoaded && sesionesLoaded;
  if (!loaded) return { loaded: false, items: [] };

  const tareasById = new Map(tareas.map((t) => [t.id, t]));
  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  const sesionesById = new Map(sesiones.map((s) => [s.id, s]));

  const items = registros.map((r) => {
    const t = tareasById.get(r.tarea_id) || {};
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const s = sesionesById.get(t.sesion_id) || {};
    return {
      id: r.id,
      date: normalizarFecha(r.fecha),
      sesionId: t.sesion_id || "",
      md: s.md || "",
      name: e.nombre || "(tarea eliminada)",
      sets: t.series,
      reps: t.cantidad,
      rir: t.rir,
      tipos: e.tags_descriptivos || [],
      done: !!r.hecho,
      cargaReal: r.carga_kg ?? "",
      rirReal: r.rir ?? "",
      repsReal: r.reps_hechas ?? "",
      unidad: UNIDAD_POR_MODO[t.modo] || "reps",
      bloque: t.bloque_sesion || "General",
      nota: t.nota || "",
      materiales: parseMateriales(t.material),
      subtipoCorporal: r.subtipo_corporal || "",
      unilateral: t.lateralidad === "unilateral",
      esResistencia: t.bloque_sesion === "Resistencia",
      objetivoResistencia: t.bloque_sesion === "Resistencia" ? formatearObjetivoResistencia(parseResistenciaData(t.resistencia_data)) : null,
    };
  });

  return { loaded: true, items };
}

// Igual que usePlayerHistory, pero sin filtrar por jugador — trae los
// registros de TODO el equipo de una vez. Se usa solo en el Dashboard del
// entrenador, para "Quién necesita atención" (variación de carga media por
// jugador esta semana vs. la anterior). Trae menos campos que
// usePlayerHistory a propósito: aquí solo hace falta saber de quién es cada
// registro, cuándo fue y cuánta carga llevaba, no todo el detalle que
// necesita la ficha completa de un jugador.
function useEquipoHistory() {
  const [registros, , registrosLoaded] = useEntityList("registros");
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
      jugadorId: r.jugador_id,
      date: normalizarFecha(r.fecha),
      name: e.nombre || "",
      done: !!r.hecho,
      cargaReal: r.carga_kg ?? "",
      esResistencia: t.bloque_sesion === "Resistencia",
      bloque: t.bloque_sesion || "General",
    };
  });
  return { loaded: true, items };
}

// Junta en una sola petición lo que antes eran 3 en cadena para la pantalla
// del jugador (sesiones -> tareas -> ejercicios/circuitos, cada una
// esperando a que resolviera la anterior). Apps Script tiene un coste fijo
// de 1-3 segundos por petición solo de arranque, pase lo que pase con el
// tamaño de las tablas — con 3 peticiones en cadena eso son varios segundos
// de espera SIEMPRE, tenga el equipo 10 filas o 10.000. Ver
// bootstrapJugador_ en Code.gs.
function useBootstrapJugador(jugadorId, fecha) {
  const cacheKey = jugadorId ? `bootstrap:${jugadorId}:${fecha}` : null;
  const [data, setData] = useState(() => (cacheKey && sharedDataCache.get(cacheKey)) || null);
  const [loaded, setLoaded] = useState(() => !jugadorId || (cacheKey && sharedDataCache.has(cacheKey)));
  useEffect(() => {
    let cancelled = false;
    if (!jugadorId) {
      setData(null);
      setLoaded(true);
      return;
    }
    if (sharedDataCache.has(cacheKey)) {
      setData(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .bootstrapJugador(jugadorId, fecha)
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res);
          setData(res);
        }
      })
      .catch(() => {
        if (!cancelled) setData({ sesiones: [], tareas: [], ejercicios: [], circuitos: [] });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [jugadorId, fecha, cacheKey]);
  return {
    loaded,
    sesiones: data?.sesiones || [],
    tareas: data?.tareas || [],
    ejercicios: data?.ejercicios || [],
    circuitos: data?.circuitos || [],
    proximaSesion: data?.proximaSesion || null,
  };
}

// Mismo tratamiento para Programación (entrenador): antes eran 2 peticiones
// en cadena (sesiones -> tareas, ejercicios en paralelo) — aquí de nuevo se
// junta todo en una sola llamada. A diferencia de la del jugador, esta no
// filtra por fecha ni destinatario: el entrenador ve todas las sesiones
// (hoy, futuras, historial), así que se traen todas de una vez.
function useBootstrapProgramacion() {
  const cacheKey = "bootstrap:programacion";
  const [data, setData] = useState(() => sharedDataCache.get(cacheKey) || null);
  const [loaded, setLoaded] = useState(() => sharedDataCache.has(cacheKey));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (tick === 0 && sharedDataCache.has(cacheKey)) {
      setData(sharedDataCache.get(cacheKey));
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api
      .bootstrapProgramacion()
      .then((res) => {
        if (!cancelled) {
          sharedDataCache.set(cacheKey, res);
          setData(res);
        }
      })
      .catch(() => {
        if (!cancelled) setData({ sesiones: [], tareas: [], ejercicios: [] });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return {
    loaded,
    sesiones: data?.sesiones || [],
    tareas: data?.tareas || [],
    ejercicios: data?.ejercicios || [],
    retry,
  };
}

// Pantalla dedicada solo al portal de acceso — independiente de PantallaBase
// a propósito. Ninguna de las variantes de PantallaBase (flexbox + alto
// medido por JS) conseguía centrar de verdad en el dispositivo real, así
// que aquí se usa la técnica de centrado más antigua y con menos piezas
// móviles que hay en CSS: posición absoluta + transform, calculada sobre un
// contenedor fijo anclado a los 4 bordes de la ventana. No depende de medir
// ninguna altura, ni de flexbox, ni de que el navegador soporte dvh/vh bien.
function PantallaPortal({ children, maxWidth = 320 }) {
  return (
    <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas }}>
      <GlobalStyles />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth,
          padding: "0 24px",
          boxSizing: "border-box",
          color: ds.ink,
          fontFamily: dsF.sans,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- PORTAL DE ACCESO ÚNICO ----------
// Calca el diseño validado de portal-acceso.jsx: pantalla completa,
// sin la cabecera antigua, tipografía monoespaciada, un solo código de
// entrada que dirige según coincida con el PIN de un jugador o con el
// código de entrenador (creándolo la primera vez si no existe).
function PortalAcceso({ onEnterCoach, onEnterPlayer }) {
  const [players, , playersLoaded, playersError, retryPlayers] = usePlayers();
  const [coachPin, saveCoachPin, coachPinLoaded, coachPinError, retryCoachPin] = useConfigValue("coach_pin");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "entrenador" } | { tipo: "jugador", nombre, id }
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  const loaded = playersLoaded && coachPinLoaded;
  // Distingue "todavía no existe código de entrenador" (coachPin === null,
  // sin error) de "no se ha podido comprobar" (fallo real de conexión,
  // p. ej. Apps Script atascado o sin responder a tiempo). Sin esta
  // distinción, un simple fallo de red parecía "primer acceso" y ofrecía
  // crear un código nuevo, arriesgando pisar el que ya existe.
  const fallosDeConexion = !!playersError || !!coachPinError;

  const validar = () => {
    const valor = codigo.trim();
    if (!valor) return;
    const jugador = players.find((p) => String(p.pin).trim() === valor);
    const esCoach = coachPin != null && valor === String(coachPin).trim();
    // Si el código coincide a la vez con el del entrenador y con el PIN de
    // un jugador (colisión ya guardada en la Sheet, de antes de este
    // cambio), nunca se concede acceso de entrenador por esa vía — se entra
    // como jugador, el privilegio mínimo, y hay que corregir cuanto antes el
    // PIN de ese jugador desde Roster.
    if (jugador) {
      // Un jugador suspendido no debe poder entrar y ver nada — el PIN
      // seguía siendo válido y esto no se comprobaba nunca.
      if (jugador.estado === "suspendido") {
        setError("Tu acceso está desactivado. Habla con tu entrenador.");
        setResultado(null);
        return;
      }
      setError(false);
      setResultado({ tipo: "jugador", nombre: jugador.name, id: jugador.id });
      return;
    }
    if (esCoach) {
      setError(false);
      setResultado({ tipo: "entrenador" });
      return;
    }
    setError("Código no reconocido. Revisa e inténtalo de nuevo.");
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

  const screenWrap = (content) => <PantallaPortal>{content}</PantallaPortal>;

  if (!loaded) return screenWrap(<LoadingBlock />);

  // Fallo real de conexión (no "todavía no hay código") — nunca se ofrece
  // "crear código de entrenador" aquí, para no arriesgarse a pisar uno que
  // sí existe pero que ahora mismo no se ha podido leer.
  if (fallosDeConexion && coachPin == null && !resultado) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginBottom: 10, color: ds.danger }}>No se pudo conectar</div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          No se ha podido comprobar tu código — puede ser un problema de conexión o que el servidor esté tardando en
          responder. No es que falte crear uno nuevo.
        </div>
        <DsButton
          onClick={() => {
            retryPlayers();
            retryCoachPin();
          }}
          style={{ width: "100%" }}
        >
          Reintentar
        </DsButton>
      </div>
    );
  }

  if (coachPin == null && !creatingPin && !resultado) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Primer acceso</div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          Todavía no tienes un código de entrenador. Créalo ahora; si eres jugador, pídeselo a tu entrenador antes de
          entrar.
        </div>
        <DsButton onClick={() => setCreatingPin(true)} style={{ width: "100%" }}>
          Crear mi código de entrenador
        </DsButton>
      </div>
    );
  }

  if (creatingPin) {
    return screenWrap(
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
            ENTRENAMIENTO DE FUERZA
          </div>
          <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700 }}>Crea tu código de entrenador</div>
        </div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>
          CÓDIGO (4 DÍGITOS)
        </div>
        <div style={{ marginBottom: 10 }}>
          <PinInput value={pinA} onChange={setPinA} autoFocus />
        </div>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>
          REPITE EL CÓDIGO
        </div>
        <div style={{ marginBottom: 14 }}>
          <PinInput value={pinB} onChange={setPinB} />
        </div>
        {createError && <div style={{ color: ds.danger, fontSize: 12, textAlign: "center", marginBottom: 10 }}>{createError}</div>}
        <DsButton onClick={crearPin} disabled={saving} style={{ width: "100%" }}>
          {saving ? "Guardando..." : "Crear código"}
        </DsButton>
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
            borderRadius: dsR.full,
            background: ds.bgElevated,
            border: `2px solid ${ds.success}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            color: ds.success,
            margin: "0 auto 16px",
          }}
        >
          ✓
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {resultado.tipo === "entrenador" ? "Acceso como entrenador" : `Hola, ${resultado.nombre}`}
        </div>
        <div style={{ fontSize: 13, color: ds.inkSecondary, lineHeight: 1.5, marginBottom: 20 }}>
          {resultado.tipo === "entrenador" ? "Entrando al panel del entrenador..." : "Entrando a tu sesión de hoy..."}
        </div>
        <DsButton onClick={() => (resultado.tipo === "entrenador" ? onEnterCoach() : onEnterPlayer(resultado.id))} style={{ width: "100%" }}>
          Continuar
        </DsButton>
      </div>
    );
  }

  return screenWrap(
    <div style={{ width: "100%", maxWidth: 320 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.1em", color: ds.inkSecondary, marginBottom: 6 }}>
          ENTRENAMIENTO DE FUERZA
        </div>
        <div style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700 }}>Introduce tu código</div>
        <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 6 }}>El PIN de jugador o el código de entrenador</div>
      </div>

      <DsInput
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
        error={!!error}
        style={{
          fontSize: 20,
          letterSpacing: "0.2em",
          textAlign: "center",
          padding: "14px 12px",
          fontFamily: dsF.mono,
          marginBottom: 10,
        }}
      />

      {error && (
        <div style={{ color: ds.danger, fontSize: 12, textAlign: "center", marginBottom: 10 }}>
          {error === true ? "Código no reconocido. Revisa e inténtalo de nuevo." : error}
        </div>
      )}

      <DsButton onClick={validar} style={{ width: "100%" }}>
        Entrar
      </DsButton>
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
    neutro: { color: ds.inkSecondary, border: `${ds.border}99` },
    verde: { color: ds.accent, border: ds.accentBorderSubtle },
    ambar: { color: ds.warning, border: `${ds.warning}55` },
    azul: { color: ds.chart2, border: `${ds.chart2}55` },
  };
  const t = tonos[tono];
  return (
    <span
      style={{
        fontFamily: dsF.mono,
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

// Fondo invisible a pantalla completa para cerrar desplegables al tocar fuera.
// Sustituye a onMouseLeave, que no existe en pantallas táctiles (tablet/iPad) —
// sin esto, un menú abierto con el dedo nunca se cerraba solo, solo ejecutando
// una de sus opciones. zIndex bajo: se coloca por debajo de cualquier contenido
// de menú real (todos usan zIndex >= 10) pero por encima del resto de la app.
function CerrablePorFuera({ onCerrar, children }) {
  return (
    <>
      <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
      {children}
    </>
  );
}

function SelectorCategoriasReal({ categorias, seleccionadas, onCambiar, onCerrar }) {
  const tipos = ["Muscular", "Tendinosa", "Articular"];
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "120%",
        zIndex: 20,
        width: 200,
        background: ds.bgElevated,
        border: `1px solid ${ds.border}`,
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 8,
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, padding: "2px 4px 6px" }}>
        CATEGORÍAS PREVENTIVAS
      </div>
      {tipos.map((tipo) => {
        const delTipo = categorias.filter((c) => c.tipo_tejido === tipo);
        if (!delTipo.length) return null;
        return (
          <div key={tipo}>
            <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.05em", color: ds.accent, padding: "6px 6px 3px" }}>
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
                    color: activa ? ds.accent : ds.inkSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: `1.5px solid ${activa ? ds.accent : ds.border}`,
                      background: activa ? ds.accent : "transparent",
                      color: ds.accentInk,
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
    </CerrablePorFuera>
  );
}

// Mismo patrón que SelectorCategoriasReal, pero para "grupos" (equipos,
// agrupaciones libres) — una lista plana, sin sub-tipos, y sin relación
// alguna con las categorías preventivas.
function SelectorGruposReal({ grupos, seleccionados, onCambiar, onCerrar }) {
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "120%",
          zIndex: 20,
          width: 200,
          background: ds.bgElevated,
          border: `1px solid ${ds.border}`,
          borderRadius: 10,
          boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
          padding: 8,
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, padding: "2px 4px 6px" }}>GRUPOS</div>
        {grupos.length === 0 && <div style={{ fontSize: 11.5, color: ds.inkMuted, padding: "4px 6px" }}>Todavía no has creado ningún grupo.</div>}
        {grupos.map((g) => {
          const activo = seleccionados.includes(g.id);
          return (
            <div
              key={g.id}
              onClick={() => onCambiar(activo ? seleccionados.filter((id) => id !== g.id) : [...seleccionados, g.id])}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, color: ds.ink }}
              onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: `1.5px solid ${activo ? ds.chart2 : ds.border}`,
                  background: activo ? ds.chart2 : "transparent",
                  color: ds.accentInk,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {activo ? "✓" : ""}
              </span>
              <span style={{ flex: 1 }}>{g.nombre}</span>
            </div>
          );
        })}
      </div>
    </CerrablePorFuera>
  );
}

function MenuAccionesReal({ jugador, onAccion, onCerrar }) {
  const acciones = [
    { id: "reset", label: "Resetear PIN" },
    { id: "historial", label: "Ver ficha" },
    jugador.estado === "activo"
      ? { id: "suspender", label: "Suspender jugador", tono: "ambar" }
      : { id: "activar", label: "Activar jugador", tono: "verde" },
    { id: "eliminar", label: "Eliminar perfil", tono: "peligro" },
  ];
  return (
    <CerrablePorFuera onCerrar={onCerrar}>
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "110%",
        zIndex: 20,
        width: 190,
        background: ds.bgElevated,
        border: `1px solid ${ds.border}`,
        borderRadius: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        padding: 6,
      }}
    >
      {acciones.map((a) => {
        const color = a.tono === "peligro" ? ds.danger : a.tono === "ambar" ? ds.warning : a.tono === "verde" ? ds.success : ds.ink;
        return (
          <div
            key={a.id}
            onClick={() => {
              onAccion(a.id);
              onCerrar();
            }}
            style={{ padding: "8px 10px", borderRadius: 6, fontSize: 12.5, color, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {a.label}
          </div>
        );
      })}
    </div>
    </CerrablePorFuera>
  );
}

function FilaJugadorReal({ jugador, categorias, grupos, onAccion, onCambiarCategorias, onCambiarGrupos }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [selectorGruposAbierto, setSelectorGruposAbierto] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresCategorias = jugador.groupIds
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);
  const nombresGrupos = (jugador.gruposIds || [])
    .map((id) => grupos.find((g) => g.id === id)?.nombre)
    .filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 15px",
        background: `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)`,
        border: `1px solid ${suspendido ? `${ds.warning}40` : ds.borderSoft}`,
        borderRadius: dsR.xl,
        boxShadow: `${dsSh.elevation1}, inset 0 1px 0 rgba(255,255,255,0.03)`,
        opacity: suspendido ? 0.75 : 1,
        transition: "border-color 140ms ease-out, box-shadow 140ms ease-out",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: dsR.full,
          background: suspendido ? `${ds.warning}1E` : `${ds.success}1E`,
          border: `1.5px solid ${suspendido ? ds.warning : ds.success}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: dsR.full, background: suspendido ? ds.warning : ds.success }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: ds.ink }}>{jugador.name}</span>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {nombresGrupos.length > 0 ? (
            nombresGrupos.map((g) => (
              <ChipReal key={g} tono="azul">
                {g}
              </ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Independiente</span>
          )}
          <span
            onClick={() => setSelectorGruposAbierto((v) => !v)}
            style={{ fontSize: 11, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px" }}
            title="Editar grupos"
          >
            +
          </span>
          {selectorGruposAbierto && (
            <SelectorGruposReal
              grupos={grupos}
              seleccionados={jugador.gruposIds || []}
              onCambiar={(nuevos) => onCambiarGrupos(jugador.id, nuevos)}
              onCerrar={() => setSelectorGruposAbierto(false)}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {nombresCategorias.length > 0 ? (
            nombresCategorias.map((c) => (
              <ChipReal key={c} tono="verde">
                {c}
              </ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Sin categoría preventiva</span>
          )}
          <span
            onClick={() => setSelectorAbierto((v) => !v)}
            style={{ fontSize: 11, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px" }}
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
      <button
        onClick={() => setPinVisible((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: dsF.mono,
          fontSize: 12.5,
          fontWeight: 600,
          color: ds.inkSecondary,
          cursor: "pointer",
          minWidth: 68,
          justifyContent: "center",
          background: ds.canvas,
          border: `1px solid ${ds.border}`,
          borderRadius: dsR.md,
          padding: "6px 9px",
        }}
        title="Mostrar/ocultar PIN"
        type="button"
      >
        {pinVisible ? jugador.pin : "••••"}
        {pinVisible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          style={{
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: menuAbierto ? ds.surfaceRaised : "transparent",
            border: `1px solid ${menuAbierto ? ds.borderMuted : "transparent"}`,
            borderRadius: dsR.md,
            color: ds.inkMuted,
            fontSize: 18,
            cursor: "pointer",
            flexShrink: 0,
          }}
          type="button"
        >
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
        style={{ width: "100%", maxWidth: 480, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>Añadir usuario</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NOMBRE</span>
          <DsInput autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Pablo Fernández" />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>PIN DE ACCESO</span>
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
                  borderRadius: dsR.md,
                  border: `1px solid ${modoPin === op.id ? ds.accent : ds.border}`,
                  background: modoPin === op.id ? ds.accentSubtle : "transparent",
                  color: modoPin === op.id ? ds.accent : ds.inkSecondary,
                  cursor: "pointer",
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
          {modoPin === "manual" && (
            <div>
              <DsInput
                value={pinManual}
                onChange={(e) => setPinManual(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 dígitos"
                inputMode="numeric"
                error={pinManualDuplicado}
                style={{
                  width: 100,
                  fontSize: 15,
                  fontFamily: dsF.mono,
                  textAlign: "center",
                  letterSpacing: "0.15em",
                }}
              />
              {pinManualDuplicado && <div style={{ fontSize: 11, color: ds.danger, marginTop: 5 }}>Ese código ya está en uso (por otro jugador o por el entrenador) — elige otro.</div>}
            </div>
          )}
          {modoPin === "auto" && <div style={{ fontSize: 11, color: ds.inkMuted }}>Se generará un PIN de 4 dígitos que no coincide con ningún otro del roster ni con el código de entrenador.</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <DsButton variant="secondary" onClick={onCerrar}>Cancelar</DsButton>
          <DsButton
            disabled={!puedeGuardar || guardando}
            onClick={async () => {
              setGuardando(true);
              const pin = modoPin === "auto" ? genUniquePin(pinsExistentes) : pinManual;
              await onGuardar({ nombre: nombre.trim(), pin });
              setGuardando(false);
            }}
          >
            {guardando ? "Guardando..." : "Añadir usuario"}
          </DsButton>
        </div>
      </div>
    </div>
  );
}

// Crear y borrar grupos — panel mínimo, mismo estilo que PanelAltaReal.
// Renombrar un grupo no hace falta todavía: se borra y se crea de nuevo si
// hace falta, dado lo poco que van a cambiar de nombre en la práctica.
function PanelGestionGruposReal({ grupos, onCrear, onEliminar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(null);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }} onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>Grupos</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {grupos.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Todavía no has creado ningún grupo.</div>}
          {grupos.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
              <span style={{ flex: 1, fontSize: 13, color: ds.ink }}>{g.nombre}</span>
              {confirmarBorrado === g.id ? (
                <>
                  <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>¿Seguro?</span>
                  <button onClick={() => onEliminar(g.id)} style={{ background: "transparent", border: `1px solid ${ds.dangerBorderSubtle}`, color: ds.danger, borderRadius: dsR.sm, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}>
                    Sí, borrar
                  </button>
                  <button onClick={() => setConfirmarBorrado(null)} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: dsR.sm, padding: "4px 8px", fontSize: 11.5, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmarBorrado(g.id)} style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 15, cursor: "pointer" }} title="Eliminar grupo">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NUEVO GRUPO</span>
          <div style={{ display: "flex", gap: 8 }}>
            <DsInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Delanteros" style={{ flex: 1 }} />
            <DsButton
              disabled={!nombre.trim() || guardando}
              onClick={async () => {
                setGuardando(true);
                const ok = await onCrear(nombre.trim());
                setGuardando(false);
                if (ok) setNombre("");
              }}
            >
              {guardando ? "..." : "Crear"}
            </DsButton>
          </div>
        </label>
        <DsButton variant="secondary" onClick={onCerrar} style={{ alignSelf: "flex-end" }}>
          Cerrar
        </DsButton>
      </div>
    </div>
  );
}

function GestionRosterReal({ onBack, onOpenHistory, onAbrirModulo, onCerrarSesion }) {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [grupos, saveGrupos, gruposLoaded] = useEntityList("grupos");
  const [coachPin, , coachPinLoaded] = useConfigValue("coach_pin");
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [panelAltaAbierto, setPanelAltaAbierto] = useState(false);
  const [panelGrupoAbierto, setPanelGrupoAbierto] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  if (!playersLoaded || !categoriasLoaded || !coachPinLoaded || !gruposLoaded) return <LoadingBlock />;

  // El código de entrenador nunca puede coincidir con el PIN de un jugador
  // (si coinciden, quien entra con ese número accede como entrenador a todo
  // el sistema de gestión) — se incluye siempre en el conjunto de PINs
  // "ocupados" al generar o comprobar duplicados.
  const pinsOcupados = (excluirId) =>
    players.filter((p) => p.id !== excluirId).map((p) => p.pin).concat(coachPin != null ? [coachPin] : []);

  const manejarAccion = async (id, accion) => {
    setErrorAccion("");
    let ok = true;
    if (accion === "suspender") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "suspendido" } : p)));
    } else if (accion === "activar") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, estado: "activo" } : p)));
    } else if (accion === "eliminar") {
      ok = await savePlayers(players.filter((p) => p.id !== id));
    } else if (accion === "reset") {
      ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, pin: genUniquePin(pinsOcupados(id)) } : p)));
    } else if (accion === "historial") {
      const jugador = players.find((p) => p.id === id);
      onOpenHistory?.(jugador);
    }
    if (!ok) setErrorAccion("No se pudo completar la acción. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const agregarJugador = async ({ nombre, pin }) => {
    const ok = await savePlayers([...players, { name: nombre, pin, estado: "activo", groupIds: [], gruposIds: [] }]);
    if (ok) setPanelAltaAbierto(false);
  };

  const cambiarCategorias = async (id, nuevas) => {
    setErrorAccion("");
    const ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, groupIds: nuevas } : p)));
    if (!ok) setErrorAccion("No se pudo guardar el cambio de categoría. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const cambiarGrupos = async (id, nuevos) => {
    setErrorAccion("");
    const ok = await savePlayers(players.map((p) => (p.id === id ? { ...p, gruposIds: nuevos } : p)));
    if (!ok) setErrorAccion("No se pudo guardar el cambio de grupo. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const crearGrupo = async (nombre) => {
    setErrorAccion("");
    const ok = await saveGrupos([...grupos, { nombre }]);
    if (!ok) setErrorAccion("No se pudo crear el grupo. Comprueba tu conexión e inténtalo de nuevo.");
    return ok;
  };

  const eliminarGrupo = async (id) => {
    setErrorAccion("");
    // Al borrar un grupo, se desengancha automáticamente de cualquier
    // usuario que lo tuviera — no deja referencias sueltas.
    const ok1 = await saveGrupos(grupos.filter((g) => g.id !== id));
    const afectados = players.filter((p) => (p.gruposIds || []).includes(id));
    const ok2 = afectados.length
      ? await savePlayers(players.map((p) => (p.gruposIds || []).includes(id) ? { ...p, gruposIds: p.gruposIds.filter((g) => g !== id) } : p))
      : true;
    if (!ok1 || !ok2) setErrorAccion("No se pudo eliminar el grupo del todo. Comprueba tu conexión e inténtalo de nuevo.");
    if (filtro === id) setFiltro("todos");
  };

  const visibles = players
    .filter((j) => {
      if (filtro === "todos") return true;
      if (filtro === "activo" || filtro === "suspendido") return j.estado === filtro;
      if (filtro === "independientes") return (j.gruposIds || []).length === 0;
      return (j.gruposIds || []).includes(filtro); // filtro = id de un grupo concreto
    })
    .filter((j) => j.name.toLowerCase().includes(busqueda.toLowerCase()));
  const activos = players.filter((j) => j.estado === "activo").length;
  const suspendidos = players.filter((j) => j.estado === "suspendido").length;
  const independientes = players.filter((j) => (j.gruposIds || []).length === 0).length;

  return (
    <PantallaEntrenadorAncha activo="roster" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>USUARIOS</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Usuarios</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
            {activos} activos · {suspendidos} suspendidos · {independientes} independientes
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <DsInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuario..."
            style={{ flex: 1, minWidth: 160 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "activo", label: "Activos" },
            { id: "suspendido", label: "Suspendidos" },
            { id: "independientes", label: "Independientes" },
            ...grupos.map((g) => ({ id: g.id, label: g.nombre })),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                fontSize: 12.5,
                padding: "8px 12px",
                borderRadius: dsR.md,
                border: `1px solid ${filtro === f.id ? ds.accent : ds.border}`,
                background: filtro === f.id ? ds.accentSubtle : "transparent",
                color: filtro === f.id ? ds.accent : ds.inkSecondary,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setPanelGrupoAbierto(true)}
            style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: dsR.md, border: `1px dashed ${ds.chart2}66`, background: "transparent", color: ds.chart2, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Grupo
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {errorAccion && <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px" }}>{errorAccion}</div>}
          {visibles.map((j) => (
            <FilaJugadorReal key={j.id} jugador={j} categorias={categorias} grupos={grupos} onAccion={manejarAccion} onCambiarCategorias={cambiarCategorias} onCambiarGrupos={cambiarGrupos} />
          ))}
          {visibles.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin usuarios en este filtro</div>}
        </div>
        <DsButton variant="secondary" onClick={() => setPanelAltaAbierto(true)} style={{ width: "100%", marginTop: 16, borderStyle: "dashed", borderColor: ds.accentBorderSubtle, color: ds.accent }}>
          + Añadir usuario
        </DsButton>
      </div>
      {panelAltaAbierto && <PanelAltaReal pinsExistentes={pinsOcupados()} onGuardar={agregarJugador} onCerrar={() => setPanelAltaAbierto(false)} />}
      {panelGrupoAbierto && (
        <PanelGestionGruposReal grupos={grupos} onCrear={crearGrupo} onEliminar={eliminarGrupo} onCerrar={() => setPanelGrupoAbierto(false)} />
      )}
    </PantallaEntrenadorAncha>
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
    case "rayo":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    // Icono para "Control de fatiga" — un pulso/zigzag, dibujado a mano en
    // el mismo estilo que el resto de este set (no es un icono de librería,
    // para no mezclar dos sistemas de iconos distintos en este único menú).
    case "pulso":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M2 13h4l2.5-7L13 19l2.5-9.5L17 13h5" />
        </svg>
      );
    default:
      return null;
  }
}

const MODULOS_DASHBOARD = [
  { id: "programacion", nombre: "Programación", descripcion: "Sesión de hoy y próximas programadas", icono: "calendario" },
  { id: "diseno", nombre: "Diseñar sesión", descripcion: "Crear una sesión nueva", icono: "lapiz" },
  { id: "complementarias", nombre: "Dinámicas complementarias", descripcion: "Programas puntuales (ej. Miembro Superior) para días concretos", icono: "rayo" },
  { id: "roster", nombre: "Usuarios", descripcion: "Usuarios, grupos, PINs y categorías preventivas", icono: "personas" },
  { id: "biblioteca", nombre: "Biblioteca", descripcion: "Ejercicios, categorías y rotación", icono: "libro" },
  { id: "historial", nombre: "Historial", descripcion: "Registro diario por jugador", icono: "reloj" },
  { id: "fatiga", nombre: "Control de fatiga", descripcion: "Salto CMJ, microciclos y estado del equipo", icono: "pulso" },
];

function TarjetaModuloCompactaReal({ modulo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        background: TEMA.superficie,
        border: `1px solid ${TEMA.borde}`,
        borderRadius: 10,
        padding: "12px 12px",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: TEMA.fondoElevado, display: "flex", alignItems: "center", justifyContent: "center", color: TEMA.textoMuted }}>
        <IconoModulo tipo={modulo.icono} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: TEMA.texto, lineHeight: 1.25 }}>{modulo.nombre}</div>
    </button>
  );
}

// Tarjeta de estado de hoy — lo primero que se ve al entrar. Antes el
// Dashboard era solo una lista de botones sin decir nada; esto reutiliza
// datos que ya se cargan en Programación para responder de un vistazo a
// "¿tengo algo pendiente hoy?" sin tener que entrar a mirarlo. El texto
// evita hablar de "sesión" como si fuera lo único que puede pasar hoy —
// hoy es lo único que hay, pero la tarjeta no lo da por sentado para
// siempre (cuando haya otros tipos de trabajo, esto es lo primero que
// habrá que generalizar).
function TarjetaEstadoHoyReal({ onAbrirModulo }) {
  const { sesiones, loaded } = useBootstrapProgramacion();
  const hoy = todayStr();
  const sesionHoy = sesiones.find((s) => (s.fechas || []).includes(hoy));
  const borradores = sesiones.filter((s) => !s.enviada).length;

  if (!loaded) {
    return <div style={{ background: TEMA.superficie, border: `1px solid ${TEMA.borde}`, borderRadius: 16, padding: "22px 22px", marginBottom: 14, minHeight: 96 }} />;
  }

  let titulo, detalle, accionLabel, accionModulo;
  if (!sesionHoy) {
    titulo = "Nada planificado para hoy";
    detalle = "Cuando quieras, prepara el trabajo del día.";
    accionLabel = "Planificar";
    accionModulo = "diseno";
  } else if (!sesionHoy.enviada) {
    titulo = "Hay un borrador de hoy sin publicar";
    detalle = sesionHoy.md ? `Marcado como ${sesionHoy.md}, a falta de enviarlo.` : "A falta de enviarlo para que lo vean.";
    accionLabel = "Retomar borrador";
    accionModulo = "programacion";
  } else {
    titulo = "Trabajo de hoy publicado";
    detalle = sesionHoy.md ? `Marcado como ${sesionHoy.md}.` : "Ya está visible.";
    accionLabel = "Ver quién ha registrado";
    accionModulo = "historial";
  }
  const colorEstado = !sesionHoy ? TEMA.textoTenue : sesionHoy.enviada ? TEMA.exito : TEMA.alerta;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${TEMA.superficieAlta}, ${TEMA.superficie})`,
        border: `1px solid ${colorEstado}44`,
        borderRadius: 16,
        padding: "22px 22px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: colorEstado }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: TEMA.texto, marginBottom: 5 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: TEMA.textoMuted, marginBottom: 16, maxWidth: 420 }}>{detalle}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => onAbrirModulo(accionModulo)}
          style={{ background: TEMA.acento, border: `1px solid ${TEMA.acento}`, color: ds.accentInk, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          {accionLabel}
        </button>
        {borradores > 0 && (
          <span style={{ fontSize: 12, color: TEMA.textoTenue }}>
            {borradores} {borradores === 1 ? "borrador más pendiente de enviar" : "borradores más pendientes de enviar"}
          </span>
        )}
      </div>
    </div>
  );
}

// Resumen de usuarios y grupos — datos que ya existen (usePlayers, grupos)
// pero que hasta ahora solo se veían al entrar en Usuarios. "Independiente"
// se cuenta como dato neutro, no como aviso: es un estado válido y buscado,
// no un problema por resolver.
function TarjetaUsuariosGruposReal({ onAbrirModulo }) {
  const [players, , playersLoaded] = usePlayers();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  if (!playersLoaded || !gruposLoaded) {
    return <div style={{ background: TEMA.superficie, border: `1px solid ${TEMA.borde}`, borderRadius: 14, padding: "16px 16px", minHeight: 110 }} />;
  }
  const activos = players.filter((p) => p.estado === "activo").length;
  const independientes = players.filter((p) => (p.gruposIds || []).length === 0).length;
  return (
    <button
      onClick={() => onAbrirModulo("roster")}
      style={{ textAlign: "left", cursor: "pointer", background: TEMA.superficie, border: `1px solid ${TEMA.borde}`, borderRadius: 14, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ fontSize: 12, color: TEMA.textoMuted, fontWeight: 600 }}>Usuarios</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: TEMA.texto, fontFamily: TEMA.fuenteTitular }}>{activos}</span>
        <span style={{ fontSize: 12.5, color: TEMA.textoMuted }}>activos</span>
      </div>
      <div style={{ fontSize: 12, color: TEMA.textoTenue }}>
        {grupos.length} {grupos.length === 1 ? "grupo" : "grupos"} · {independientes} {independientes === 1 ? "independiente" : "independientes"}
      </div>
    </button>
  );
}

function DashboardEntrenadorCompactoReal({ onAbrirModulo, onCerrarSesion }) {
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  return (
    <PantallaBase rol="entrenador" maxWidth={720}>
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: TEMA.fuenteTitular, fontSize: 27, fontWeight: 600, margin: "0 0 4px" }}>Buenas, David</h1>
            <div style={{ fontSize: 12.5, color: TEMA.textoMuted, textTransform: "capitalize" }}>{hoy}</div>
          </div>
          <button
            onClick={onCerrarSesion}
            style={{ fontSize: 11.5, color: TEMA.textoMuted, background: "transparent", border: `1px solid ${TEMA.bordeSuave}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", flexShrink: 0, marginTop: 4 }}
          >
            Cerrar sesión
          </button>
        </div>

        <TarjetaEstadoHoyReal onAbrirModulo={onAbrirModulo} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 22 }}>
          <TarjetaUsuariosGruposReal onAbrirModulo={onAbrirModulo} />
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 600, color: TEMA.textoTenue, marginBottom: 8 }}>Ir a</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {MODULOS_DASHBOARD.map((m) => (
            <TarjetaModuloCompactaReal key={m.id} modulo={m} onClick={() => onAbrirModulo(m.id)} />
          ))}
        </div>
      </div>
    </PantallaBase>
  );
}

// Fechas auxiliares para las métricas semanales del dashboard de
// escritorio: aquí "semana" SÍ es la semana natural (lunes a domingo) que
// contiene hoy, a propósito distinta de la ventana corrediza de 7 días que
// se usa en el dashboard del jugador — esta tarjeta necesita poder mostrar
// también los días de la semana que aún no han llegado (p. ej. "6 sesiones
// esta semana, 3 ya realizadas"), y eso solo tiene sentido con una semana
// de calendario, no con una ventana que siempre termina hoy.
function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function inicioSemanaCalendario(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  const diaSemana = d.getDay();
  const offset = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - offset);
  return fechaISO(d);
}
function sumarDiasFecha(fechaStr, dias) {
  const d = new Date(fechaStr + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

function SidebarEntrenadorReal({ activo, onAbrirModulo, onCerrarSesion }) {
  const SIDEBAR_ITEMS = [{ id: "dashboard", nombre: "Dashboard", icono: "grid" }, ...MODULOS_DASHBOARD];
  return (
    <div style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", padding: "18px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 22 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: ds.accent, color: ds.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}><Zap size={15} fill={ds.accentInk} /></div>
        <div>
          <div style={{ fontFamily: dsF.display, fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>FUERZA</div>
          <div style={{ fontFamily: dsF.mono, fontSize: 8.5, color: ds.inkMuted, letterSpacing: "0.06em" }}>PANEL DE ENTRENADOR</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {SIDEBAR_ITEMS.map((m) => (
          <DsNavItem key={m.id} active={m.id === activo} onClick={() => onAbrirModulo(m.id)} icon={m.id === "dashboard" ? <IconoGridSidebar /> : <IconoModulo tipo={m.icono} />}>
            {m.nombre}
          </DsNavItem>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${ds.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DsAvatar size={30}>D</DsAvatar>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>David</div>
            <div style={{ fontSize: 10.5, color: ds.inkMuted }}>Entrenador</div>
          </div>
        </div>
        <DsButton variant="secondary" size="sm" onClick={onCerrarSesion}>Cerrar sesión</DsButton>
      </div>
    </div>
  );
}

// Envoltorio para las pantallas "sueltas" del entrenador (Programación,
// Biblioteca, Historial, Usuarios): en escritorio/iPad (≥1000px) llevan la
// misma barra lateral fija que el Dashboard, para que se sienta como un
// panel de verdad al moverte entre secciones — no una pantalla aparte con
// un enlace de "volver" cada vez. Por debajo de eso, se queda con la
// pantalla estrecha de móvil de siempre (con su propio botón de volver).
function PantallaEntrenadorAncha({ activo, onAbrirModulo, onCerrarSesion, maxWidthCompacto = 560, children }) {
  const ancho = useAnchoVentana();
  if (ancho < 1000) {
    return (
      <PantallaBase rol="entrenador" maxWidth={maxWidthCompacto}>
        <div>
          <button onClick={() => onAbrirModulo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Volver a Dashboard
          </button>
          {children}
        </div>
      </PantallaBase>
    );
  }
  return (
    <div className="ds-reset" style={{ position: "fixed", inset: 0, background: ds.canvas, color: ds.ink, fontFamily: dsF.sans, display: "flex" }}>
      <GlobalStyles />
      <SidebarEntrenadorReal activo={activo} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px 48px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>{children}</div>
      </div>
    </div>
  );
}

function DashboardEntrenadorSidebarReal({ onAbrirModulo, onCerrarSesion }) {
  const [players, , playersLoaded] = usePlayers();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  const { sesiones, loaded: progLoaded } = useBootstrapProgramacion();
  const { items: equipoHistory, loaded: historyLoaded } = useEquipoHistory();
  const loaded = playersLoaded && gruposLoaded && progLoaded && historyLoaded;

  if (!loaded) return <LoadingBlock />;

  const hoy = todayStr();
  const hoyLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  const activos = players.filter((p) => p.estado === "activo");
  const independientes = activos.filter((p) => (p.gruposIds || []).length === 0).length;
  const gruposById = new Map(grupos.map((g) => [g.id, g.nombre || g.name || "Grupo"]));

  const sesionHoy = sesiones.find((s) => s.enviada && (s.fechas || []).includes(hoy));

  const lunes = inicioSemanaCalendario(hoy);
  const domingo = sumarDiasFecha(lunes, 6);
  const lunesAnterior = sumarDiasFecha(lunes, -7);
  const domingoAnterior = sumarDiasFecha(lunes, -1);

  // Ocurrencias de sesión (sesión × fecha) dentro de la semana de
  // calendario, y cuántas de esas fechas ya han llegado (<= hoy).
  let ocurrenciasSemana = 0;
  let ocurrenciasRealizadas = 0;
  const asignacionesSemana = []; // [{ jugadorId, date }] — solo fechas ya llegadas, para adherencia
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : activos.map((p) => p.id);
      (s.fechas || []).forEach((f) => {
        if (f < lunes || f > domingo) return;
        ocurrenciasSemana++;
        if (f <= hoy) {
          ocurrenciasRealizadas++;
          destino.forEach((jugadorId) => asignacionesSemana.push({ jugadorId, date: f }));
        }
      });
    });

  // Adherencia: de las asignaciones ya llegadas esta semana, cuántas tienen
  // al menos un registro de ese jugador ese día. Aproximación: no distingue
  // A QUÉ sesión pertenece el registro si un jugador tuviera más de una
  // sesión el mismo día (caso raro, pero posible) — cuenta "algo registró
  // ese día" como cumplido.
  const registroPorJugadorFecha = new Set(equipoHistory.map((it) => `${it.jugadorId}::${it.date}`));
  const calcularAdherencia = (asignaciones) => {
    if (!asignaciones.length) return null;
    const cumplidas = asignaciones.filter(({ jugadorId, date }) => registroPorJugadorFecha.has(`${jugadorId}::${date}`)).length;
    return Math.round((cumplidas / asignaciones.length) * 100);
  };
  const adherenciaActual = calcularAdherencia(asignacionesSemana);

  const asignacionesSemanaAnterior = [];
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : activos.map((p) => p.id);
      (s.fechas || []).forEach((f) => {
        if (f < lunesAnterior || f > domingoAnterior) return;
        destino.forEach((jugadorId) => asignacionesSemanaAnterior.push({ jugadorId, date: f }));
      });
    });
  const adherenciaAnterior = calcularAdherencia(asignacionesSemanaAnterior);
  const deltaAdherencia = adherenciaActual != null && adherenciaAnterior != null ? adherenciaActual - adherenciaAnterior : null;

  // "Quién necesita atención": variación de la carga media de cada jugador
  // esta semana vs. la anterior (mismo criterio de ventana que arriba).
  // Bloque CMJ y tareas de Resistencia quedan fuera por no ser carga
  // comparable de la misma forma.
  const cargaMedia = (jugadorId, desde, hasta) => {
    const regs = equipoHistory.filter((it) => it.jugadorId === jugadorId && it.done && !it.esResistencia && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null && it.date >= desde && it.date <= hasta);
    if (!regs.length) return null;
    return regs.reduce((s, it) => s + Number(it.cargaReal), 0) / regs.length;
  };
  const variaciones = activos
    .map((p) => {
      const actual = cargaMedia(p.id, lunes, hoy);
      const anterior = cargaMedia(p.id, lunesAnterior, domingoAnterior);
      if (actual == null || anterior == null || anterior === 0) return null;
      const pct = ((actual - anterior) / anterior) * 100;
      return { jugador: p, pct };
    })
    .filter(Boolean)
    .sort((a, b) => a.pct - b.pct);
  const jugadorEnRiesgo = variaciones.find((v) => v.pct <= -10) || null;

  return (
    <div style={{ position: "fixed", inset: 0, background: ds.canvas, color: ds.ink, fontFamily: dsF.sans, display: "flex" }}>
      <GlobalStyles />
      <SidebarEntrenadorReal activo="dashboard" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />

      {/* ---------- Contenido ---------- */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 16 }}>
          <div style={{ flex: 1, maxWidth: 360, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "9px 12px", color: ds.inkMuted, fontSize: 13 }}>
            🔍 Buscar jugador, ejercicio...
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>{hoyLabel}</span>
            <div style={{ width: 34, height: 34, borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary }}><Bell size={15} /></div>
            <DsAvatar size={34}>D</DsAvatar>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>Buenas, David</h1>
          <div style={{ fontSize: 12.5, color: ds.inkMuted, textTransform: "capitalize" }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>

        <TarjetaEstadoHoyReal onAbrirModulo={onAbrirModulo} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 22 }}>
          <DsStatTile label="Usuarios activos" value={activos.length} />
          <DsStatTile label="Grupos" value={grupos.length} delta={{ direction: "neutral", label: `${independientes} independientes` }} />
          <DsStatTile label="Sesiones / semana" value={ocurrenciasSemana} delta={{ direction: "neutral", label: `${ocurrenciasRealizadas} ya realizadas` }} />
          {adherenciaActual != null ? (
            <DsStatTile
              label="Adherencia"
              value={`${adherenciaActual}%`}
              delta={deltaAdherencia != null ? { direction: deltaAdherencia >= 0 ? "up" : "down", label: `${deltaAdherencia > 0 ? "+" : ""}${deltaAdherencia} vs semana pasada` } : undefined}
            />
          ) : (
            <DsStatTile label="Adherencia" value="—" delta={{ direction: "neutral", label: "sin datos aún esta semana" }} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.xl, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Quién necesita atención</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: ds.inkMuted }}>
                <span><span style={{ color: ds.success }}>●</span> Sube carga</span>
                <span><span style={{ color: ds.danger }}>●</span> Baja carga</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: ds.inkMuted, marginBottom: 16 }}>
              Variación de carga media vs. la semana pasada
              {jugadorEnRiesgo ? ` — ${variaciones.filter((v) => v.pct < 0).length} jugadores a la baja, ${jugadorEnRiesgo.jugador.name} necesita seguimiento.` : "."}
            </div>
            {variaciones.length === 0 ? (
              <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "12px 0" }}>Todavía no hay suficiente carga registrada esta semana y la anterior para comparar.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {variaciones.map(({ jugador, pct }) => {
                  const positivo = pct >= 0;
                  const anchoBarra = Math.min(100, Math.abs(pct)) * 1.4;
                  return (
                    <div key={jugador.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 50px", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 12.5, color: ds.ink, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {jugador.name}
                        {pct <= -10 && <span title="Necesita seguimiento" style={{ color: ds.warning }}>△</span>}
                      </div>
                      <div style={{ position: "relative", height: 6, background: ds.bgElevated, borderRadius: 3 }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            height: "100%",
                            borderRadius: 3,
                            background: positivo ? ds.success : ds.danger,
                            left: positivo ? "50%" : `${50 - anchoBarra / 2}%`,
                            width: `${anchoBarra / 2}%`,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: positivo ? ds.success : ds.danger, textAlign: "right" }}>
                        {positivo ? "+" : ""}
                        {pct.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.xl, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Usuarios</div>
              <button onClick={() => onAbrirModulo("roster")} style={{ background: "transparent", border: "none", color: ds.accent, fontSize: 11.5, cursor: "pointer" }}>Ver todos</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activos.slice(0, 6).map((p) => {
                const registradoHoy = sesionHoy ? registroPorJugadorFecha.has(`${p.id}::${hoy}`) : null;
                const nombreGrupo = (p.gruposIds || []).map((id) => gruposById.get(id)).filter(Boolean)[0];
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <DsAvatar size={32} style={{ background: ds.chart2 }}>{(p.name || "?").slice(0, 2).toUpperCase()}</DsAvatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: ds.inkMuted }}>
                        {nombreGrupo || "Independiente"}
                        {sesionHoy ? ` · ${registradoHoy ? "registrado" : "pendiente"}` : ""}
                      </div>
                    </div>
                    {sesionHoy && <span style={{ width: 8, height: 8, borderRadius: dsR.full, background: registradoHoy ? ds.success : ds.warning, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconoGridSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

// Punto de entrada real: en pantallas de escritorio/iPad (≥1000px) se
// muestra el dashboard con barra lateral; por debajo de eso, el compacto de
// siempre — el layout con barra lateral fija no está pensado para caber en
// una pantalla estrecha.
function DashboardEntrenadorReal({ onAbrirModulo, onCerrarSesion }) {
  const ancho = useAnchoVentana();
  return ancho >= 1000 ? (
    <DashboardEntrenadorSidebarReal onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
  ) : (
    <DashboardEntrenadorCompactoReal onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />
  );
}


// ---------- HISTORIAL (calcado de historial.jsx) ----------

function PuntoEstadoReal({ hecho }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: dsR.full,
        background: hecho ? ds.success : ds.border,
        border: hecho ? "none" : `1px solid ${ds.danger}`,
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
        <span style={{ fontSize: 12, color: t.done ? ds.ink : ds.inkMuted, flex: 1 }}>{t.name}</span>
        {t.done && t.esResistencia && (
          <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: t.subtipoCorporal === "parcial" ? ds.accent : ds.success, textAlign: "right" }}>
            {t.subtipoCorporal === "parcial" ? `Hizo menos: ${t.cargaReal || "sin detalle"}` : "Cumplido completo"}
          </span>
        )}
        {t.done && !t.esResistencia && (
          <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, textAlign: "right" }}>
            {t.repsReal !== "" && t.repsReal != null ? t.repsReal : t.reps} {t.unidad || "reps"}
            {t.cargaReal !== "" && t.cargaReal != null ? (t.subtipoCorporal === "asistencia" ? ` · banda ${t.cargaReal}` : ` · ${t.cargaReal}kg`) : ""}
            {t.subtipoCorporal === "lastre"
              ? " (lastre)"
              : t.subtipoCorporal && EQUIPOS_AMBIGUOS.includes(t.subtipoCorporal)
              ? ` (${t.subtipoCorporal})`
              : !t.subtipoCorporal && (t.materiales || []).some((m) => EQUIPOS_AMBIGUOS.includes(m))
              ? ` (${(t.materiales || []).find((m) => EQUIPOS_AMBIGUOS.includes(m))})`
              : ""}
            {t.rirReal !== "" && t.rirReal != null ? ` · RIR${t.rirReal}` : ""}
            {t.cambioPct != null && (
              <span style={{ color: t.cambioPct > 0 ? ds.success : t.cambioPct < 0 ? ds.warning : ds.inkMuted, fontWeight: 700 }}>
                {" "}
                · {t.cambioPct > 0 ? "+" : ""}
                {t.cambioPct.toFixed(0)}%
              </span>
            )}
          </span>
        )}
      </div>
      {t.nota && (
        <div style={{ marginLeft: 20, display: "flex", gap: 5, fontSize: 10.5, color: ds.inkSecondary }}>
          <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={12} /></span>
          <span>{t.nota}</span>
        </div>
      )}
    </div>
  );
}

function TarjetaDiaReal({ fecha, tareasDelDia, etiqueta }) {
  const [abierto, setAbierto] = useState(false);
  const total = tareasDelDia.length;
  const hechas = tareasDelDia.filter((t) => t.done).length;
  const bloques = {};
  tareasDelDia.forEach((t) => {
    if (!bloques[t.bloque]) bloques[t.bloque] = [];
    bloques[t.bloque].push(t);
  });

  return (
    <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, overflow: "hidden" }}>
      <div onClick={() => setAbierto((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink, textTransform: "capitalize" }}>
            {fmtDateLabel(fecha)}
            {etiqueta && <span style={{ textTransform: "none", color: ds.inkSecondary, fontWeight: 400 }}> · {etiqueta}</span>}
          </div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginTop: 2 }}>
            {hechas}/{total} tareas completadas
          </div>
        </div>
        <span style={{ color: ds.inkMuted, fontSize: 12, transform: abierto ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierto && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(bloques).map(([nombreBloque, tareas]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12, fontWeight: 600, color: ds.inkSecondary, marginBottom: 5 }}>{nombreBloque}</div>
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

// Gráfica simple de progreso de carga en el tiempo para una tarea concreta —
// SVG a mano, sin librería externa (esta app no tiene ninguna cargada).
// Cada punto es un registro con carga válida; se traza una línea recta entre
// ellos en el orden de las fechas.
// P4 (Fase 3): punto → detalle de esa sesión, en vez de una gráfica muda.
// El punto pulsado (táctil o click, no solo hover — en móvil no hay hover)
// queda seleccionado y su ficha se lee justo encima, con todo lo que el
// registro trae (reps, RIR) además de la fecha y el valor que ya se veían.
// Por defecto el último punto está seleccionado, para no cambiar lo que ya
// se veía si nadie toca nada.
function GraficaProgresoCargaReal({ puntos, unidad = "kg" }) {
  // Id único por instancia: puede haber varias de estas gráficas montadas a
  // la vez en la misma pantalla (una por tarea), y los <defs> de SVG son
  // globales al documento — sin esto, dos gráficas compartirían el mismo
  // degradado y una de las dos se vería mal.
  const [gradId] = useState(() => `gpc-${Math.random().toString(36).slice(2, 9)}`);
  const [seleccionado, setSeleccionado] = useState(puntos.length - 1);
  // Si cambian los puntos (p. ej. se elige otra tarea en el desplegable) y
  // el índice seleccionado ya no existe, vuelve a caer en el último.
  const indiceActivo = seleccionado != null && seleccionado < puntos.length ? seleccionado : puntos.length - 1;

  if (puntos.length < 2) {
    return (
      <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "24px 0", textAlign: "center" }}>
        {puntos.length === 0 ? "Sin registros de carga para esta tarea en este rango." : "Hace falta al menos 2 registros para trazar la evolución."}
      </div>
    );
  }
  const width = 640;
  const height = 210;
  const padX = 6;
  const padTop = 34;
  const padBottom = 30;
  const valores = puntos.map((p) => p.valor);
  const minV = Math.min(...valores);
  const maxV = Math.max(...valores);
  const rango = maxV - minV || 1;
  const stepX = puntos.length > 1 ? (width - padX * 2) / (puntos.length - 1) : 0;
  const coordX = (i) => padX + i * stepX;
  const coordY = (v) => height - padBottom - ((v - minV) / rango) * (height - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valor).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${coordX(puntos.length - 1).toFixed(1)} ${height - padBottom} L ${coordX(0).toFixed(1)} ${height - padBottom} Z`;
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const activo = puntos[indiceActivo];
  // Sin ejes ni cuadrícula — minimalista, al estilo de referencia: el valor
  // inicial y el final se leen pegados a su propio punto de la línea, no en
  // una columna de ejes aparte.
  const yUltimo = coordY(ultimo.valor);
  const yPrimero = coordY(primero.valor);
  const labelUltimoArriba = yUltimo < height / 2;

  return (
    <div>
      {/* Ficha de la sesión seleccionada — lo que antes solo estaba en la
          fila de la lista de abajo, ahora también arriba del todo, pegado
          al punto que se acaba de tocar. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", rowGap: 4 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted }}>{fmtDateLabel(activo.date)}</div>
        <div style={{ fontFamily: dsF.mono, fontSize: 12.5, color: ds.ink, fontWeight: 700 }}>
          {activo.valor}{unidad}
          {activo.reps !== "" && activo.reps != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · {activo.reps} reps</span>}
          {activo.rir !== "" && activo.rir != null && <span style={{ color: ds.inkSecondary, fontWeight: 400 }}> · RIR {activo.rir}</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 210, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={ds.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
        {indiceActivo != null && (
          <line x1={coordX(indiceActivo)} y1={padTop - 10} x2={coordX(indiceActivo)} y2={height - padBottom} stroke={ds.accent} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3" />
        )}
        {puntos.map((p, i) => (
          <g key={i} onClick={() => setSeleccionado(i)} style={{ cursor: "pointer" }}>
            {/* Círculo invisible más grande solo para que el dedo tenga margen de sobra al tocar — el visible sigue fino */}
            <circle cx={coordX(i)} cy={coordY(p.valor)} r={14} fill="transparent" />
            <circle
              cx={coordX(i)}
              cy={coordY(p.valor)}
              r={i === indiceActivo ? 5.5 : i === 0 || i === puntos.length - 1 ? 4 : 3}
              fill={i === indiceActivo ? ds.accent : ds.canvas}
              stroke={ds.accent}
              strokeWidth={2.25}
            />
          </g>
        ))}
        <text x={coordX(0)} y={yPrimero + (labelUltimoArriba ? 18 : -12)} fontSize="10.5" fill={ds.inkMuted} textAnchor="start">{primero.valor}{unidad}</text>
        <text x={coordX(puntos.length - 1)} y={yUltimo + (labelUltimoArriba ? -12 : 18)} fontSize="11.5" fontWeight="700" fill={ds.ink} textAnchor="end">{ultimo.valor}{unidad}</text>
        <text x={coordX(0)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="start">{fmtDateShort(primero.date)}</text>
        <text x={coordX(puntos.length - 1)} y={height - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{fmtDateShort(ultimo.date)}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {[...puntos].reverse().map((p, iRev) => {
          const i = puntos.length - 1 - iRev;
          const esActivo = i === indiceActivo;
          return (
            <div
              key={i}
              onClick={() => setSeleccionado(i)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                color: ds.inkSecondary,
                fontFamily: dsF.mono,
                cursor: "pointer",
                padding: "3px 6px",
                margin: "0 -6px",
                borderRadius: dsR.sm,
                background: esActivo ? ds.accentSubtle : "transparent",
              }}
            >
              <span style={{ color: esActivo ? ds.accent : ds.inkSecondary, fontWeight: esActivo ? 700 : 400 }}>{fmtDateShort(p.date)}</span>
              <span style={{ color: ds.ink }}>
                {p.valor}{unidad}{p.rir !== "" && p.rir != null ? ` · RIR${p.rir}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
// analiza (CmjBuildPlayers y en adelante) trabaja sobre el
// jugador_id real de Supabase — el mismo que usa el resto de la
// app. El nombre del CSV solo se usa para la vinculación inicial
// (ver la sección de subida de CSV), nunca como identidad para el
// análisis. Así se evita el riesgo de que una variación de un
// nombre (una tilde, un apellido de más) cree en silencio un
// "jugador" distinto del que ya tienes en el roster.
// ============================================================

function cmjNum(v) {
  if (v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "---") return null;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function cmjParseDateTime(raw) {
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

function cmjDateKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Columnas reales del export de My Jump Lab, en el orden en que vienen.
const CMJ_CSV_COLS = [
  "fecha", "equipo", "nombre", "peso", "hp0", "tipo", "altCajon", "carga",
  "altura", "rsiMod", "tDespegue", "tVuelo", "tContacto", "dri", "fuerza",
  "velocidad", "potencia", "impulse", "ifr", "stiffness", "color",
];

function cmjMean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

// Si un jugador tiene más de un salto registrado el mismo día (protocolo de
// varios intentos por sesión), se promedian en un único test representativo
// de ese día — igual que en el panel original.
function cmjAggregateByDay(rows) {
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
function cmjParseCSV(text) {
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

function cmjPct(a, b) { return b ? ((a - b) / b) * 100 : null; }

// Compara el último test de un día de medida (tag: "inicio"/"md2"/"md1")
// contra el mismo día de medida del microciclo anterior en el que exista
// ese dato — evita la trampa de comparar linealmente test contra test sin
// mirar qué día de medida era cada uno (un MD-2 no es comparable con un
// Inicio: son estímulos distintos, no una caída de rendimiento real).
function cmjDeltaMismoDiaCicloAnterior(cmjPlayer, cmjMicroList, tag, metric) {
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
function cmjFmt(v, d = 1) { return v === null || v === undefined ? "—" : v.toFixed(d); }
function cmjSigned(v, d = 1) { return v == null ? "—" : `${v > 0 ? "+" : ""}${cmjFmt(v, d)}%`; }
function cmjSdMuestral(arr) {
  if (arr.length < 2) return null;
  const m = cmjMean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}
function cmjClamp(v, min, max) { return v == null ? null : Math.min(max, Math.max(min, v)); }

const CMJ_MIN_INICIOS_PARA_INDIVIDUALIZAR = 4;
const CMJ_MIN_INICIOS_PARA_RESPALDO_RECUPERACION = 3;

// Qué mide cada variable a nivel fisiológico y por qué una caída importa —
// se combina con la severidad y el estado (verde/ámbar/rojo) para construir
// la explicación que ve el entrenador en cada tarjeta.
const CMJ_METRIC_PHYSIO = {
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
function cmjSeveridad(delta, status, ambarPct, rojoPct) {
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

function cmjNivelPalabra(delta, status, ambarPct, rojoPct) {
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
function cmjNivelAccion(delta, status, ambarPct, rojoPct, dayField) {
  if (status === "gray") return "Sin datos suficientes todavía para valorar.";
  if (status === "green") return "Dentro del rango normal respecto al Inicio de esta semana — estado óptimo, no se requiere ninguna intervención sobre la carga.";
  if (delta == null) return "";

  const esMD2 = dayField === "md2";

  if (status === "red") {
    const ratio = Math.abs(delta) / rojoPct;
    if (esMD2) {
      if (ratio < 1.15) return "Cae por debajo del Inicio de esta semana, justo por encima del umbral rojo. No habrá otro test antes del partido para confirmarlo: reduce su carga en las próximas 48h o valora ajustar su papel en el once.";
      if (ratio < 1.5) return "Cae por debajo del Inicio de esta semana, claramente por encima del umbral rojo. No habrá otro test antes del partido: reduce de forma notable su exposición o valora que no salga de inicio.";
      return "Cae muy por debajo del Inicio de esta semana, muy por encima del umbral rojo. No habrá otro test antes del partido: prioriza no exponerlo a esfuerzo máximo.";
    }
    if (dayField === "md1") {
      if (ratio < 1.15) return "Cae por debajo del Inicio de esta semana, justo por encima del umbral rojo. Ajusta un poco la sesión regenerativa de hoy; con varios días por delante hasta el próximo test, confirma que remonta.";
      if (ratio < 1.5) return "Cae por debajo del Inicio de esta semana, claramente por encima del umbral rojo. Ajusta con claridad la regenerativa y el resto de la semana, y confirma la evolución en el Inicio del próximo microciclo.";
      return "Cae muy por debajo del Inicio de esta semana, muy por encima del umbral rojo. Prioriza la recuperación esta semana antes de cualquier carga alta, y vigila de cerca cómo llega al MD-2.";
    }
    if (ratio < 1.15) return "Justo por encima del umbral rojo. Reduce ligeramente la carga y confírmalo en el MD-2 de esta semana.";
    if (ratio < 1.5) return "Claramente por encima del umbral rojo. Ajusta volumen/intensidad ya, y vigila de cerca hasta el MD-2.";
    return "Muy por encima del umbral rojo. Prioriza la recuperación antes de seguir cargando esta semana.";
  }

  const rango = rojoPct - ambarPct;
  const progreso = rango > 0 ? (Math.abs(delta) - ambarPct) / rango : 0;
  if (esMD2) {
    if (progreso > 0.66) return "Cae por debajo del Inicio de esta semana, cerca del umbral rojo. No habrá otro test antes del partido para confirmarlo: decide ya si ajustas su participación.";
    if (progreso > 0.33) return "Cae por debajo del Inicio de esta semana, a mitad de camino del umbral rojo. No habrá otro test antes de jugar: valora ahora si conviene ajustar minutos o rol.";
    return "Apenas por debajo del Inicio de esta semana, dentro de lo normal. Aunque es la última medición antes del partido, la magnitud no justifica cambios — puede jugar con normalidad.";
  }
  if (dayField === "md1") {
    if (progreso > 0.66) return "Cae por debajo del Inicio de esta semana, cerca del umbral rojo. Vigila de cerca los próximos días; si se mantiene al llegar al Inicio de la próxima semana, sí conviene ajustar carga.";
    if (progreso > 0.33) return "Cae por debajo del Inicio de esta semana, a mitad de camino del umbral rojo. Probablemente se resuelva con los días de descanso — confírmalo en el Inicio de la próxima semana.";
    return "Apenas por debajo del Inicio de esta semana, dentro de lo esperable el día después de competir — no hace falta ninguna acción, solo confirmarlo cuando toque el próximo test.";
  }
  if (progreso > 0.66) return "Cerca del umbral rojo. Si no mejora en el MD-2 de esta semana, habrá que intervenir.";
  if (progreso > 0.33) return "A mitad de camino del umbral rojo. Vigila la evolución hasta el próximo test antes de decidir.";
  return "Apenas por encima de lo normal — probablemente no haga falta ningún cambio, confírmalo en el próximo test.";
}

function cmjExplicacionMetrica(metricKey, delta, status, ambarPct, rojoPct) {
  const info = CMJ_METRIC_PHYSIO[metricKey];
  if (status === "gray") return `${info.concepto} Sin datos suficientes todavía para comparar esta variable en este punto.`;
  const sev = cmjSeveridad(delta, status, ambarPct, rojoPct);
  const texto = status === "red" ? info.rojo : status === "amber" ? info.ambar : info.verde;
  return `${info.concepto} ${texto}${sev ? ` (${sev}).` : ""}`;
}

const CMJ_STATUS_META = {
  red: { label: "Intervenir", color: ds.danger, bg: `${ds.danger}22` },
  amber: { label: "Vigilar", color: ds.warning, bg: `${ds.warning}22` },
  green: { label: "Normal", color: ds.success, bg: `${ds.success}1E` },
  gray: { label: "Sin datos", color: ds.inkMuted, bg: `${ds.inkMuted}22` },
};
const CMJ_TAG_META = {
  inicio: { label: "Inicio microciclo", color: ds.chart2 },
  md2: { label: "MD-2", color: ds.accent },
  md1: { label: "MD+1", color: ds.chart1 },
};
const CMJ_FIELDS = ["inicio", "md2", "md1"];

// Altura, Potencia y Fuerza se relativizan por kg para poder comparar entre
// jugadores y en el tiempo; Velocidad se deriva matemáticamente de la altura
// (v = √(2gh)), así que se muestra como lectura alternativa pero no dispara
// alertas (sería contar la misma señal dos veces) — igual que en el panel
// original.
const CMJ_METRICS = {
  altura: { key: "altura", label: "Altura", unit: "cm", decimals: 1, get: (r) => r.altura, drivesStatus: true },
  potenciaRel: { key: "potenciaRel", label: "Potencia relativa", unit: "W/kg", decimals: 1, get: (r) => (r.kineticsValid && r.peso) ? r.potencia / r.peso : null, drivesStatus: true },
  fuerzaRel: { key: "fuerzaRel", label: "Fuerza relativa", unit: "N/kg", decimals: 1, get: (r) => (r.kineticsValid && r.peso) ? r.fuerza / r.peso : null, drivesStatus: true },
  velocidad: { key: "velocidad", label: "Velocidad", unit: "m/s", decimals: 2, get: (r) => r.velocidad, drivesStatus: false },
};
const CMJ_METRIC_LIST = Object.values(CMJ_METRICS);
// Colores de línea por métrica en las gráficas — se usan los tokens de
// gráfico que ya tiene la app (ds.accent/ds.chart1/ds.chart2), no colores
// nuevos, para que encaje con el resto del sistema de diseño.
const CMJ_METRIC_CHART_COLOR = { altura: ds.accent, potenciaRel: ds.chart2, fuerzaRel: ds.chart3, velocidad: ds.inkMuted };
const CMJ_STATUS_ORDER = { red: 0, amber: 1, green: 2, gray: 3 };

// Filas de métrica (Altura / Potencia relativa / Fuerza relativa) para un
// día concreto del microciclo (md2 o md1), con el umbral propio de cada
// jugador para esa métrica.
function cmjFilasDia(microResult, dayField, umbral) {
  return CMJ_METRIC_LIST.filter((x) => x.drivesStatus).map((metric) => {
    const mm = microResult.metrics[metric.key];
    const delta = mm[`${dayField}Delta`];
    const status = mm[`${dayField}Status`];
    const u = umbral[metric.key];
    return { key: metric.key, label: metric.label, delta, status, explicacion: cmjExplicacionMetrica(metric.key, delta, status, u.ambarPct, u.rojoPct) };
  });
}
function cmjFilasRecuperacion(recuperacion, umbral) {
  return CMJ_METRIC_LIST.filter((x) => x.drivesStatus).map((metric) => {
    const mm = recuperacion ? recuperacion.metrics[metric.key] : { delta: null, status: "gray" };
    const u = umbral[metric.key];
    return { key: metric.key, label: metric.label, delta: mm.delta, status: mm.status, explicacion: cmjExplicacionMetrica(metric.key, mm.delta, mm.status, u.ambarPct, u.rojoPct) };
  });
}

// Estado global del día (peor de las 3 métricas) + la recomendación
// graduada — el desglose fisiológico por variable vive en cmjFilasDia.
function cmjMotivoDia(microResult, dayField, umbral) {
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
function cmjMotivoRecuperacion(recuperacion, umbral) {
  if (!recuperacion) return { status: "gray", motivo: "Sin MD+1 del microciclo anterior con el que comparar.", nivel: null };
  const esFallback = recuperacion.modo === "media_inicios";
  if (recuperacion.status === "gray") {
    return {
      status: "gray", nivel: null, motivo: esFallback
        ? `Esta semana no hubo MD+1 con el que comparar, y todavía no hay suficientes Inicios previos de este jugador para usar como respaldo (tiene ${recuperacion.nPrevios} de los ${CMJ_MIN_INICIOS_PARA_RESPALDO_RECUPERACION} necesarios).`
        : "Aún sin datos suficientes para valorar la recuperación.",
    };
  }
  let worstDelta = null, worstKey = null;
  CMJ_METRIC_LIST.filter((x) => x.drivesStatus).forEach((metric) => {
    const mm = recuperacion.metrics[metric.key];
    if (mm.status === recuperacion.status && mm.delta != null && (worstDelta == null || Math.abs(mm.delta) > Math.abs(worstDelta))) { worstDelta = mm.delta; worstKey = metric.key; }
  });
  const u = umbral[worstKey] || umbral.altura;
  let prefijo;
  if (esFallback) {
    prefijo = recuperacion.status === "green"
      ? `Sin MD+1 esta semana: comparado con su media de los últimos ${recuperacion.nPrevios} Inicios, está dentro de lo habitual. `
      : `Sin MD+1 esta semana: comparado con su media de los últimos ${recuperacion.nPrevios} Inicios, está por debajo de lo habitual. `;
  } else {
    prefijo = recuperacion.status === "green"
      ? "Recuperación adecuada respecto al MD+1 del microciclo anterior. "
      : "No muestra la recuperación esperada tras el descanso. ";
  }
  return { status: recuperacion.status, motivo: prefijo + cmjNivelAccion(worstDelta, recuperacion.status, u.ambarPct, u.rojoPct, "inicio"), nivel: cmjNivelPalabra(worstDelta, recuperacion.status, u.ambarPct, u.rojoPct) };
}

// Posiciones para agrupar/ordenar en las pantallas de grupo. A diferencia
// del panel original (donde vivían en un "roster" aparte), aquí la posición
// es un campo del propio jugador (jugador.posicion en Supabase).
const CMJ_POSICIONES = [
  { key: "portero", label: "Porteros", singular: "Portero" },
  { key: "central", label: "Centrales", singular: "Central" },
  { key: "lateral", label: "Laterales", singular: "Lateral" },
  { key: "mediocentro", label: "Mediocentros", singular: "Mediocentro" },
  { key: "interior", label: "Interiores", singular: "Interior" },
  { key: "extremo", label: "Extremos", singular: "Extremo" },
  { key: "delantero", label: "Delanteros", singular: "Delantero" },
];
function cmjPosicionLabel(key) { return CMJ_POSICIONES.find((p) => p.key === key)?.singular || "Sin posición"; }
function cmjPosicionOrder(key) { const idx = CMJ_POSICIONES.findIndex((p) => p.key === key); return idx === -1 ? 99 : idx; }

function cmjMicroRefDate(m) {
  const defined = CMJ_FIELDS.map((f) => m[f]).filter(Boolean).sort();
  return defined.length ? defined[0] : null;
}
function cmjBuildDateIndex(microciclos) {
  const map = new Map();
  microciclos.forEach((m) => {
    CMJ_FIELDS.forEach((f) => {
      if (m[f]) map.set(cmjDateKeyFromDate(new Date(m[f])), { microId: m.id, tag: f, numero: m.numero });
    });
  });
  return map;
}
function cmjOrderedMicroList(microciclos) {
  return [...microciclos].filter((m) => cmjMicroRefDate(m)).sort((a, b) => new Date(cmjMicroRefDate(a)) - new Date(cmjMicroRefDate(b)));
}
function cmjStatusFromDelta(d, ambarPct, rojoPct) {
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
function cmjBuildPlayers(rows, microciclos, ambarPct, rojoPct, individualizar, protocoloDesde) {
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

    // Chequeo de recuperación: el Inicio de cada microciclo se compara con
    // el MD+1 del microciclo ANTERIOR. Si esa semana no tuvo MD+1, se usa
    // como respaldo la media de los Inicios anteriores de ESTE jugador.
    microList.forEach((meta, idx) => {
      const curr = microResults.get(meta.id);
      if (!curr || !curr.inicio || idx === 0) return;
      const prev = microResults.get(microList[idx - 1].id);
      const hayMd1Anterior = prev && prev.md1;
      const modo = hayMd1Anterior ? "md1_anterior" : "media_inicios";
      const iniciosPrevios = hayMd1Anterior ? [] : inicios.filter((r) => new Date(r.date) < new Date(curr.inicio.date)).slice(-10);

      const recMetrics = {};
      let worst = "gray";
      CMJ_METRIC_LIST.filter((m) => m.drivesStatus).forEach((metric) => {
        let baseVal;
        if (hayMd1Anterior) {
          baseVal = metric.get(prev.md1);
        } else {
          const valoresPrevios = iniciosPrevios.map((r) => metric.get(r)).filter((v) => v != null);
          baseVal = valoresPrevios.length >= CMJ_MIN_INICIOS_PARA_RESPALDO_RECUPERACION ? cmjMean(valoresPrevios) : null;
        }
        const nowVal = metric.get(curr.inicio);
        const delta = (baseVal != null && nowVal != null) ? cmjPct(nowVal, baseVal) : null;
        const u = umbral[metric.key] || { ambarPct, rojoPct };
        const status = cmjStatusFromDelta(delta, u.ambarPct, u.rojoPct);
        recMetrics[metric.key] = { delta, status };
        if (CMJ_STATUS_ORDER[status] < CMJ_STATUS_ORDER[worst]) worst = status;
      });
      curr.recuperacion = { metrics: recMetrics, status: worst, modo, nPrevios: iniciosPrevios.length };
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

function cmjFindCurrentMicroId(microList) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const past = microList.filter((m) => { const d = new Date(cmjMicroRefDate(m)); d.setHours(0, 0, 0, 0); return d <= today; });
  if (past.length === 0) return { id: null, mode: microList.length > 0 ? "solo-futuro" : "vacio" };
  return { id: past[past.length - 1].id, mode: "ok" };
}
function cmjSuggestNextNumero(microciclos) {
  const nums = microciclos.map((m) => parseInt(m.numero, 10)).filter((n) => Number.isFinite(n));
  return nums.length === 0 ? "1" : String(Math.max(...nums) + 1);
}

// "Mi progreso" — versión ligera de la pestaña "Progreso por tarea" de
// HistorialPorJugador, para la propia vista del jugador: sin selector de
// jugador (siempre es el suyo), sin filtro de fechas, sin herramientas de
// entrenador. Deliberadamente sencilla — solo lo que pidió: información de
// interés a partir de datos que ya se registran, sin profundizar más.
function MiProgresoJugadorReal({ items, loaded }) {
  const [tareaSel, setTareaSel] = useState("");

  if (!loaded) return <LoadingBlock />;

  // Resumen de cumplimiento: sesiones distintas (fecha) con al menos una
  // tarea completada, en los últimos 30 días — un número de un vistazo,
  // no un informe.
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  const hace30str = hace30dias.toISOString().slice(0, 10);
  const fechasCompletadas = new Set(items.filter((it) => it.done && it.date >= hace30str).map((it) => it.date));

  const combinacionesPorClave = new Map();
  items
    .filter((it) => it.done && !it.esResistencia && it.cargaReal !== "" && it.cargaReal != null)
    .forEach((it) => {
      const equipo = materialEfectivo(it);
      const clave = claveDisenoTarea(it.name, equipo, it.unilateral, it.reps, it.rir);
      if (combinacionesPorClave.has(clave)) return;
      const detalleEquipo = equipo && equipo !== "std" ? ` · ${equipo}` : "";
      const detalleRir = it.rir !== "" && it.rir != null ? ` · RIR${it.rir}` : "";
      const detalleLateral = it.unilateral ? " · unilateral" : "";
      combinacionesPorClave.set(clave, { clave, etiqueta: `${it.name}${detalleEquipo} · ${it.reps} ${it.unidad || "reps"}${detalleRir}${detalleLateral}` });
    });
  const combinaciones = [...combinacionesPorClave.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  const claveActiva = tareaSel || combinaciones[0]?.clave || "";
  const puntos = claveActiva
    ? items
        .filter((it) => it.done && !it.esResistencia && it.cargaReal !== "" && it.cargaReal != null && claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir) === claveActiva)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((it) => ({ date: it.date, valor: Number(it.cargaReal), rir: it.rirReal, reps: it.repsReal }))
    : [];

  // Cabecera de número grande: valor más reciente + variación desde el
  // primer registro visible, en semanas — mismo criterio de jerarquía por
  // tamaño (WHOOP) que el resto de la app: el dato que más importa se lee
  // antes que ningún otro elemento de la pantalla.
  let cabeceraProgreso = null;
  if (puntos.length >= 2) {
    const primero = puntos[0];
    const ultimo = puntos[puntos.length - 1];
    const deltaValor = ultimo.valor - primero.valor;
    const semanas = Math.max(1, Math.round((new Date(ultimo.date) - new Date(primero.date)) / (7 * 86400000)));
    cabeceraProgreso = { valor: ultimo.valor, deltaValor, semanas };
  }

  return (
    <div>
      <DsCard style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 4 }}>ÚLTIMOS 30 DÍAS</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: ds.ink }}>
          {fechasCompletadas.size} {fechasCompletadas.size === 1 ? "sesión completada" : "sesiones completadas"}
        </div>
      </DsCard>

      <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6, letterSpacing: "0.05em" }}>PROGRESO POR EJERCICIO</div>
      <DsSelect value={claveActiva} onChange={(e) => setTareaSel(e.target.value)} style={{ marginBottom: 14 }}>
        {combinaciones.length === 0 && <option value="">Sin tareas con carga registrada todavía</option>}
        {combinaciones.map((c) => (
          <option key={c.clave} value={c.clave}>
            {c.etiqueta}
          </option>
        ))}
      </DsSelect>

      <DsCard style={{ padding: "16px 18px" }}>
        {cabeceraProgreso && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: dsF.display, fontSize: 34, fontWeight: 800, color: ds.ink, lineHeight: 1 }}>
              {cabeceraProgreso.valor}<span style={{ fontSize: 18, fontWeight: 700, color: ds.inkSecondary }}>kg</span>
            </span>
            {cabeceraProgreso.deltaValor !== 0 && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: cabeceraProgreso.deltaValor > 0 ? ds.success : ds.danger, marginLeft: "auto" }}>
                {cabeceraProgreso.deltaValor > 0 ? "+" : ""}{cabeceraProgreso.deltaValor}kg en {cabeceraProgreso.semanas} {cabeceraProgreso.semanas === 1 ? "semana" : "semanas"}
              </span>
            )}
          </div>
        )}
        <GraficaProgresoCargaReal puntos={puntos} />
      </DsCard>
    </div>
  );
}

function HistorialPorJugador({ players, jugadorInicial }) {
  const [jugadorSel, setJugadorSel] = useState(jugadorInicial || players[0]?.id || "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [vista, setVista] = useState("dia");
  const [tareaSel, setTareaSel] = useState("");
  const { loaded, items } = usePlayerHistory(jugadorSel || null);

  // % de cambio de carga respecto a la vez anterior que se hizo la MISMA
  // tarea en las mismas condiciones (mismo ejercicio, mismo equipo, misma
  // lateralidad, mismas reps y RIR objetivo — igual criterio que la
  // referencia que ve el jugador al diseñar sesión). Se calcula sobre TODO
  // el historial, no solo el rango de fechas filtrado, para que el primer
  // registro visible en un rango corto igualmente pueda compararse con lo
  // de antes del rango.
  const cambioPctPorId = {};
  [...items]
    .filter((it) => it.done && !it.esResistencia && it.cargaReal !== "" && it.cargaReal != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .reduce((ultimoPorClave, it) => {
      const clave = claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir);
      const anterior = ultimoPorClave[clave];
      if (anterior && Number(anterior.cargaReal) > 0) {
        cambioPctPorId[it.id] = ((Number(it.cargaReal) - Number(anterior.cargaReal)) / Number(anterior.cargaReal)) * 100;
      }
      ultimoPorClave[clave] = it;
      return ultimoPorClave;
    }, {});

  if (!players.length) {
    return <div style={{ color: ds.inkSecondary, fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no hay usuarios dados de alta.</div>;
  }

  // Se agrupa por fecha + sesión de origen, no solo por fecha — dos sesiones
  // distintas mandadas el mismo día (una al equipo, otra puntual a este
  // jugador, por ejemplo) antes se mezclaban en una sola tarjeta con un
  // total conjunto que no correspondía a ninguna de las dos sesiones reales.
  const porGrupo = {};
  items
    .filter((it) => (!desde || it.date >= desde) && (!hasta || it.date <= hasta))
    .forEach((it) => {
      const f = normalizarFecha(it.date);
      const clave = `${f}::${it.sesionId || ""}`;
      if (!porGrupo[clave]) porGrupo[clave] = { fecha: f, tareas: [] };
      porGrupo[clave].tareas.push(cambioPctPorId[it.id] != null ? { ...it, cambioPct: cambioPctPorId[it.id] } : it);
    });
  const gruposPorFecha = {};
  Object.values(porGrupo).forEach((g) => {
    if (!gruposPorFecha[g.fecha]) gruposPorFecha[g.fecha] = [];
    gruposPorFecha[g.fecha].push(g);
  });
  const fechas = Object.keys(gruposPorFecha).sort().reverse();

  // Para el modo "Progreso por tarea": la comparación debe ser entre
  // registros con EXACTAMENTE las mismas condiciones planificadas ese día
  // (mismo ejercicio, mismo material, misma lateralidad, mismas reps y
  // mismo RIR objetivo) — el mismo criterio que ya usa el % de arriba.
  // Agrupar solo por nombre de ejercicio mezclaba esquemas distintos (ej.
  // 130kg a RIR2 con 100kg a RIR4) y hacía parecer una caída de rendimiento
  // que en realidad era un estímulo distinto y más ligero a propósito.
  const combinacionesPorClave = new Map();
  items
    .filter((it) => it.done && !it.esResistencia && it.cargaReal !== "" && it.cargaReal != null)
    .forEach((it) => {
      const equipo = materialEfectivo(it);
      const clave = claveDisenoTarea(it.name, equipo, it.unilateral, it.reps, it.rir);
      if (combinacionesPorClave.has(clave)) return;
      const detalleEquipo = equipo && equipo !== "std" ? ` · ${equipo}` : "";
      const detalleRir = it.rir !== "" && it.rir != null ? ` · RIR${it.rir}` : "";
      const detalleLateral = it.unilateral ? " · unilateral" : "";
      combinacionesPorClave.set(clave, { clave, etiqueta: `${it.name}${detalleEquipo} · ${it.reps} ${it.unidad || "reps"}${detalleRir}${detalleLateral}` });
    });
  const combinaciones = [...combinacionesPorClave.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  const claveActiva = tareaSel || combinaciones[0]?.clave || "";
  const puntosTarea = claveActiva
    ? items
        .filter(
          (it) =>
            it.done &&
            !it.esResistencia &&
            it.cargaReal !== "" &&
            it.cargaReal != null &&
            claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir) === claveActiva &&
            (!desde || it.date >= desde) &&
            (!hasta || it.date <= hasta)
        )
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((it) => ({ date: it.date, valor: Number(it.cargaReal), rir: it.rirReal, reps: it.repsReal }))
    : [];

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>JUGADOR</span>
        <DsSelect value={jugadorSel} onChange={(e) => setJugadorSel(e.target.value)} style={{ maxWidth: 240 }}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </DsSelect>
      </label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { id: "dia", label: "Por día" },
          { id: "tarea", label: "Progreso por tarea" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            style={{
              fontSize: 12.5,
              padding: "7px 12px",
              borderRadius: dsR.md,
              border: `1px solid ${vista === v.id ? ds.accent : ds.border}`,
              background: vista === v.id ? ds.accentSubtle : "transparent",
              color: vista === v.id ? ds.accent : ds.inkSecondary,
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      {vista === "tarea" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>TAREA (MISMO EJERCICIO, MATERIAL, REPS Y RIR)</span>
          <DsSelect value={claveActiva} onChange={(e) => setTareaSel(e.target.value)} style={{ maxWidth: 280 }}>
            {combinaciones.length === 0 && <option value="">Sin tareas con carga registrada</option>}
            {combinaciones.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.etiqueta}
              </option>
            ))}
          </DsSelect>
        </label>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>DESDE</span>
          <DsInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ fontSize: 12.5, padding: "7px 8px" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>HASTA</span>
          <DsInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ fontSize: 12.5, padding: "7px 8px" }} />
        </label>
      </div>
      {!loaded ? (
        <LoadingBlock />
      ) : vista === "tarea" ? (
        <GraficaProgresoCargaReal puntos={puntosTarea} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fechas.map((f) =>
            gruposPorFecha[f].map((g, i) => (
              <TarjetaDiaReal key={`${f}::${i}`} fecha={g.fecha} tareasDelDia={g.tareas} etiqueta={gruposPorFecha[f].length > 1 ? `sesión ${i + 1} de ${gruposPorFecha[f].length}` : null} />
            ))
          )}
          {fechas.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin sesiones registradas en este rango</div>}
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
  const [registrosTodos, , registrosLoaded] = useEntityList("registros");
  const registros = tareaIds.length ? registrosTodos.filter((r) => tareaIds.includes(r.tarea_id)) : [];

  if (!sesionesLoaded) return <LoadingBlock />;
  if (!enviadas.length) {
    return <div style={{ color: ds.inkSecondary, fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no se ha enviado ninguna sesión.</div>;
  }

  const targets = sesionSel?.jugadores_destino?.length ? players.filter((p) => sesionSel.jugadores_destino.includes(p.id)) : players;
  const loaded = tareasLoaded && (tareaIds.length ? registrosLoaded : true);
  const estados = loaded
    ? targets.map((p) => {
        // Antes exigía TODAS las tareas hechas para contar como "enviada" —
        // una sola tarea sin registrar (o añadida a mitad de semana) dejaba
        // a un jugador como "sin enviar" aunque hubiera mandado casi todo.
        // Ahora "enviada" es "ha mandado algo", con la fracción real al lado
        // (ej. 8/10) para que se vea de un vistazo cuánto le falta.
        const hechas = tareas.filter((t) => registros.some((r) => r.tarea_id === t.id && r.jugador_id === p.id && r.hecho)).length;
        const enviado = hechas > 0;
        return { jugador: p.name, enviado, hechas, total: tareas.length };
      })
    : [];
  const enviadosCount = estados.filter((e) => e.enviado).length;

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>SESIÓN</span>
        <DsSelect value={sesionSel?.id || ""} onChange={(e) => setFechaSesionSel(e.target.value)} style={{ maxWidth: 280 }}>
          {enviadas.map((s) => (
            <option key={s.id} value={s.id}>
              {(s.fechas || []).map((f) => fmtDateShort(f)).join(", ")}
              {s.md ? ` · ${s.md}` : ""}
              {s.objetivo ? ` · ${s.objetivo}` : ""}
            </option>
          ))}
        </DsSelect>
      </label>
      {!loaded ? (
        <LoadingBlock />
      ) : (
        <>
          <div style={{ fontSize: 12, color: ds.inkSecondary, marginBottom: 12, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 12px" }}>
            <strong style={{ color: enviadosCount === estados.length && estados.length > 0 ? ds.success : ds.warning }}>
              {enviadosCount}/{estados.length}
            </strong>{" "}
            jugadores han enviado esta sesión
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {estados.map((e) => {
              const completo = e.enviado && e.hechas === e.total;
              const color = e.enviado ? (completo ? ds.success : ds.accent) : ds.warning;
              return (
                <div key={e.jugador} style={{ display: "flex", alignItems: "center", gap: 10, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: "10px 14px" }}>
                  <span style={{ width: 9, height: 9, borderRadius: dsR.full, background: e.enviado ? color : ds.border, border: e.enviado ? "none" : `1px solid ${ds.warning}`, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: ds.ink }}>{e.jugador}</span>
                  <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color }}>
                    {e.enviado ? `✓ Enviada (${e.hechas}/${e.total})` : "Sin enviar"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ---------- Historial por tarea (para el entrenador) ----------
// Progresión de carga de UN diseño de tarea concreto para un jugador — no
// solo el ejercicio en general, sino la combinación exacta de ejercicio +
// material + modo + reps objetivo + RIR objetivo.
function HistorialPorTarea({ players }) {
  const [jugadorSel, setJugadorSel] = useState(players[0]?.id || "");
  const [ejercicioSel, setEjercicioSel] = useState("");
  const [disenoSel, setDisenoSel] = useState("");
  const { loaded, items } = usePlayerHistory(jugadorSel || null);

  if (!players.length) {
    return <div style={{ color: ds.inkSecondary, fontSize: 14, textAlign: "center", padding: "20px 0" }}>Todavía no hay usuarios dados de alta.</div>;
  }

  const ejerciciosDisponibles = [...new Set(items.map((it) => it.name))].sort();

  const itemsDelEjercicio = ejercicioSel ? items.filter((it) => it.name === ejercicioSel) : [];
  const disenosPorClave = new Map();
  itemsDelEjercicio.forEach((it) => {
    const eq = materialEfectivo(it);
    const clave = claveDisenoTarea(it.name, eq, it.unilateral, it.reps, it.rir);
    if (!disenosPorClave.has(clave)) {
      disenosPorClave.set(clave, { clave, equipo: eq, unilateral: it.unilateral, reps: it.reps, rir: it.rir, registros: [] });
    }
    disenosPorClave.get(clave).registros.push(it);
  });
  const disenos = [...disenosPorClave.values()].sort((a, b) => b.registros.length - a.registros.length);

  const disenoActivo = disenoSel ? disenosPorClave.get(disenoSel) : null;
  const puntos = disenoActivo
    ? disenoActivo.registros
        .filter((it) => it.cargaReal !== "" && it.cargaReal != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((it) => ({ fecha: it.date, carga: Number(it.cargaReal), rir: it.rirReal, reps: it.repsReal }))
    : [];

  const etiquetaDiseno = (d) =>
    `${d.equipo === "std" ? "Sin material" : d.equipo} · ${d.unilateral ? "Unilateral" : "Bilateral"} · ${d.reps || "—"} reps · RIR ${
      d.rir !== "" && d.rir != null ? d.rir : "—"
    }`;

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>JUGADOR</span>
        <DsSelect
          value={jugadorSel}
          onChange={(e) => {
            setJugadorSel(e.target.value);
            setEjercicioSel("");
            setDisenoSel("");
          }}
          style={{ maxWidth: 240 }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </DsSelect>
      </label>

      {!loaded ? (
        <LoadingBlock />
      ) : (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>EJERCICIO</span>
            <DsSelect
              value={ejercicioSel}
              onChange={(e) => {
                setEjercicioSel(e.target.value);
                setDisenoSel("");
              }}
              style={{ maxWidth: 280 }}
            >
              <option value="">— Elige un ejercicio —</option>
              {ejerciciosDisponibles.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </DsSelect>
          </label>

          {ejercicioSel && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {disenos.map((d) => (
                <button
                  key={d.clave}
                  onClick={() => setDisenoSel(d.clave)}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: dsR.md,
                    border: `1px solid ${disenoSel === d.clave ? ds.accent : ds.border}`,
                    background: disenoSel === d.clave ? ds.accentSubtle : "transparent",
                    color: disenoSel === d.clave ? ds.accent : ds.inkSecondary,
                    cursor: "pointer",
                  }}
                >
                  {etiquetaDiseno(d)} ({d.registros.length})
                </button>
              ))}
            </div>
          )}

          {disenoActivo &&
            (puntos.length ? (
              <GraficoProgresionCarga puntos={puntos} />
            ) : (
              <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin registros de carga todavía para esta variante.</div>
            ))}
        </>
      )}
    </>
  );
}

// Gráfico de progresión de carga con SVG plano — sin añadir ninguna
// librería nueva al proyecto (ni recharts, ni chart.js). Mismo tratamiento
// minimalista que GraficaProgresoCargaReal (degradado bajo la línea,
// etiquetas pegadas a los puntos de inicio/fin, sin cuadrícula ni columna
// de ejes) para que las gráficas del modo entrenador se sientan del mismo
// sistema que las del jugador — antes era un componente aparte que nunca
// había recibido ese pase.
function GraficoProgresionCarga({ puntos }) {
  const [gradId] = useState(() => `gpc2-${Math.random().toString(36).slice(2, 9)}`);
  const ancho = 640, alto = 210;
  const padX = 6, padTop = 34, padBottom = 30;
  const cargas = puntos.map((p) => p.carga);
  const min = Math.min(...cargas);
  const max = Math.max(...cargas);
  const rango = max - min || 1;
  const x = (i) => padX + (puntos.length > 1 ? (i / (puntos.length - 1)) * (ancho - padX * 2) : (ancho - padX * 2) / 2);
  const y = (v) => alto - padBottom - ((v - min) / rango) * (alto - padTop - padBottom);
  const pathD = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.carga).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${x(puntos.length - 1).toFixed(1)} ${alto - padBottom} L ${x(0).toFixed(1)} ${alto - padBottom} Z`;
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const yUltimo = y(ultimo.carga);
  const yPrimero = y(primero.carga);
  const labelUltimoArriba = yUltimo < alto / 2;

  return (
    <DsCard style={{ padding: 14 }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ width: "100%", height: 210, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={ds.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        <path d={pathD} fill="none" stroke={ds.accent} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.carga)} r={i === 0 || i === puntos.length - 1 ? 4 : 3} fill={ds.canvas} stroke={ds.accent} strokeWidth={2.25} />
        ))}
        <text x={x(0)} y={yPrimero + (labelUltimoArriba ? 18 : -12)} fontSize="10.5" fill={ds.inkMuted} textAnchor="start">{primero.carga}kg</text>
        <text x={x(puntos.length - 1)} y={yUltimo + (labelUltimoArriba ? -12 : 18)} fontSize="11.5" fontWeight="700" fill={ds.ink} textAnchor="end">{ultimo.carga}kg</text>
        <text x={x(0)} y={alto - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="start">{primero.fecha}</text>
        <text x={x(puntos.length - 1)} y={alto - 6} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{ultimo.fecha}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {puntos
          .slice()
          .reverse()
          .map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: ds.inkSecondary }}>
              <span>{p.fecha}</span>
              <span>
                {p.carga}kg{p.reps !== "" && p.reps != null ? ` · ${p.reps} reps` : ""}
                {p.rir !== "" && p.rir != null ? ` · RIR ${p.rir}` : ""}
              </span>
            </div>
          ))}
      </div>
    </DsCard>
  );
}

function HistorialReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [players, , playersLoaded] = usePlayers();
  const [vista, setVista] = useState("jugador");

  return (
    <PantallaEntrenadorAncha activo="historial" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>HISTORIAL</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Registro diario</h1>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[
            { id: "jugador", label: "Por jugador" },
            { id: "sesion", label: "Por sesión" },
            { id: "tarea", label: "Por tarea" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              style={{
                fontSize: 12.5,
                padding: "7px 12px",
                borderRadius: dsR.md,
                border: `1px solid ${vista === v.id ? ds.accent : ds.border}`,
                background: vista === v.id ? ds.accentSubtle : "transparent",
                color: vista === v.id ? ds.accent : ds.inkSecondary,
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        {!playersLoaded ? (
          <LoadingBlock />
        ) : vista === "jugador" ? (
          <HistorialPorJugador players={players} />
        ) : vista === "sesion" ? (
          <HistorialPorSesion players={players} />
        ) : (
          <HistorialPorTarea players={players} />
        )}
      </div>
    </PantallaEntrenadorAncha>
  );
}

// ============================================================
// CONTROL DE FATIGA (CMJ) — módulo de entrenador
// ------------------------------------------------------------
// Pantalla nueva (22/09/2026), fusión del panel de fatiga independiente de
// David. Por ahora solo la pestaña "Subir CSV" tiene contenido real — el
// resto se entrega en pasos siguientes, cada uno verificado por separado.
// ============================================================

// Normaliza un nombre para comparar "Alex Pérez", "alex perez" y "Alex  Pérez "
// como el mismo jugador: minúsculas, sin tildes, sin espacios de sobra.
function cmjNormalizarNombre(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Alias guardados (nombre del CSV -> jugador ya vinculado a mano antes) —
// la red de seguridad de la que se habló: una vez vinculado un nombre que
// no coincidía, no hay que repetirlo en el próximo CSV.
function useCmjAlias() {
  const [alias, setAlias] = useState(new Map());
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setLoaded(false);
    supabase
      .from("cmj_alias_nombre")
      .select("*")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (!error && data) {
          setAlias(new Map(data.map((r) => [r.nombre_normalizado, { jugadorId: r.jugador_id, nombreOriginal: r.nombre_original }])));
        }
        setLoaded(true);
      });
    return () => { cancelado = true; };
  }, [reloadKey]);
  const recargar = useCallback(() => setReloadKey((k) => k + 1), []);
  return [alias, loaded, recargar];
}

function ControlFatigaModuloReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [vista, setVista] = useState("subir");
  const TABS = [
    { id: "subir", label: "Subir CSV" },
    { id: "estado", label: "Estado actual" },
    { id: "microciclos", label: "Microciclos" },
    { id: "ranking", label: "Ranking" },
  ];
  return (
    <PantallaEntrenadorAncha activo="fatiga" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>CONTROL DE FATIGA</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Salto CMJ</h1>
        </div>
        <DsTabSwitcher tabs={TABS} active={vista} onChange={setVista} />
        <div style={{ marginTop: 16 }}>
          {vista === "subir" && <CmjSubirCsvReal />}
          {vista === "estado" && <CmjEstadoActualReal />}
          {vista === "microciclos" && <CmjMicrociclosReal />}
          {vista === "ranking" && <CmjRankingReal />}
        </div>
      </div>
    </PantallaEntrenadorAncha>
  );
}

function CmjProximamente({ titulo, texto }) {
  return (
    <DsCard style={{ padding: 20, textAlign: "center", color: ds.inkMuted }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 420, margin: "0 auto" }}>{texto}</div>
    </DsCard>
  );
}

const CMJ_MICROCICLO_FORM_VACIO = { id: null, numero: "", inicio: "", md2: "", md1: "" };

function CmjMicrociclosReal() {
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(CMJ_MICROCICLO_FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("cmj_microciclos").select("*");
    if (!error) setMicrociclos(data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ordenados = useMemo(() => cmjOrderedMicroList(microciclos), [microciclos]);
  const actual = useMemo(() => cmjFindCurrentMicroId(ordenados), [ordenados]);
  const isEditing = form.id != null;

  const empezarNuevo = useCallback(() => {
    setForm({ ...CMJ_MICROCICLO_FORM_VACIO, numero: cmjSuggestNextNumero(microciclos) });
  }, [microciclos]);

  // En cuanto se cargan los microciclos por primera vez, se rellena el
  // formulario con el siguiente número sugerido — así el campo nunca
  // aparece vacío sin motivo.
  useEffect(() => {
    if (loaded && form.id == null && form.numero === "") empezarNuevo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function empezarEdicion(m) {
    setForm({
      id: m.id,
      numero: m.numero || "",
      inicio: m.inicio ? m.inicio.slice(0, 10) : "",
      md2: m.md2 ? m.md2.slice(0, 10) : "",
      md1: m.md1 ? m.md1.slice(0, 10) : "",
    });
  }

  async function guardar() {
    if (!form.numero.trim()) return;
    setGuardando(true);
    setError("");
    const row = {
      id: form.id || genId("cmjmicro"),
      numero: form.numero.trim(),
      inicio: form.inicio || null,
      md2: form.md2 || null,
      md1: form.md1 || null,
    };
    const { error } = await supabase.from("cmj_microciclos").upsert(row, { onConflict: "id" });
    if (error) {
      setError(error.message);
    } else {
      await cargar();
      empezarNuevo();
    }
    setGuardando(false);
  }

  async function eliminar(id) {
    const { error } = await supabase.from("cmj_microciclos").delete().eq("id", id);
    if (!error) {
      await cargar();
      if (form.id === id) empezarNuevo();
    }
  }

  if (!loaded) return <LoadingBlock />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{isEditing ? `Editando microciclo Nº ${form.numero || "—"}` : "Nuevo microciclo"}</div>
        <div style={{ fontSize: 12, color: ds.inkMuted, lineHeight: 1.5 }}>
          Número y fechas de Inicio / MD-2 / MD+1. Puedes dejar alguna fecha en blanco si esa semana no toca ese test, y programar fechas futuras.
        </div>
      </div>

      <DsCard style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 90 }}>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Número</div>
            <DsInput value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="ej. 12" style={{ width: 80 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.inicio.color, marginBottom: 4 }}>Inicio microciclo</div>
            <DsInput type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.md2.color, marginBottom: 4 }}>MD-2</div>
            <DsInput type="date" value={form.md2} onChange={(e) => setForm({ ...form, md2: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: CMJ_TAG_META.md1.color, marginBottom: 4 }}>MD+1</div>
            <DsInput type="date" value={form.md1} onChange={(e) => setForm({ ...form, md1: e.target.value })} />
          </div>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: ds.danger }}>{error}</div>}
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <DsButton size="sm" onClick={guardar} disabled={guardando || !form.numero.trim()}>
            {guardando ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar microciclo"}
          </DsButton>
          {isEditing && (
            <DsButton size="sm" variant="secondary" onClick={empezarNuevo} disabled={guardando}>
              Cancelar edición
            </DsButton>
          )}
        </div>
      </DsCard>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>Microciclos registrados</div>
      {ordenados.length === 0 ? (
        <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Aún no hay ninguno guardado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordenados.map((m) => {
            const ref = cmjMicroRefDate(m);
            const refDate = ref ? new Date(ref + "T00:00:00") : null;
            const cuando = m.id === actual.id ? "Actual" : refDate && refDate > today ? "Futuro" : "Pasado";
            const cuandoColor = cuando === "Actual" ? ds.accent : cuando === "Futuro" ? ds.chart2 : ds.inkMuted;
            return (
              <DsCard key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", flexWrap: "wrap" }}>
                <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13, minWidth: 40 }}>Nº{m.numero}</div>
                <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 220, fontSize: 12 }}>
                  <div><span style={{ color: CMJ_TAG_META.inicio.color }}>Inicio</span> {m.inicio ? fmtDateShort(m.inicio) : "—"}</div>
                  <div><span style={{ color: CMJ_TAG_META.md2.color }}>MD-2</span> {m.md2 ? fmtDateShort(m.md2) : "—"}</div>
                  <div><span style={{ color: CMJ_TAG_META.md1.color }}>MD+1</span> {m.md1 ? fmtDateShort(m.md1) : "—"}</div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: cuandoColor }}>{cuando}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => empezarEdicion(m)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    Editar
                  </button>
                  <button onClick={() => eliminar(m.id)} style={{ background: "transparent", border: "none", color: ds.danger, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    Eliminar
                  </button>
                </div>
              </DsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CMJ_UMBRAL_DEFECTO = { ambarPct: 6, rojoPct: 12, individualizar: true, protocoloDesde: "" };

// Igual que en el panel original: qué mostrar HOY para un jugador depende
// de qué día es dentro del microciclo actual. Si hoy es "Inicio", se enseña
// el chequeo de recuperación (¿se ha recuperado del MD+1 de la semana
// pasada?); si es MD-2 o MD+1, el estado de ese test frente al Inicio de
// esta semana; si no hay test programado hoy, se enseña la última lectura
// disponible de esta semana (a modo de contexto).
function cmjHoyDe(player, todayTag) {
  const m = player.lastMicro;
  if (!todayTag) {
    const dayField = m?.md1 ? "md1" : m?.md2 ? "md2" : null;
    if (!dayField) return { status: "gray", motivo: "Sin tests registrados en este microciclo todavía.", rows: [], nivel: null };
    const d = cmjMotivoDia(m, dayField, player.umbral);
    return { status: d.status, motivo: `Última lectura (${CMJ_TAG_META[dayField].label}): ${d.motivo}`, rows: cmjFilasDia(m, dayField, player.umbral), nivel: d.nivel, m };
  }
  if (todayTag === "inicio") {
    if (!m || !m.inicio) return { status: "gray", motivo: "Test de inicio de hoy aún no registrado.", rows: [], nivel: null };
    const r = cmjMotivoRecuperacion(m.recuperacion, player.umbral);
    return { status: r.status, motivo: r.motivo, rows: cmjFilasRecuperacion(m.recuperacion, player.umbral), nivel: r.nivel, m };
  }
  if (!m || !m[todayTag]) return { status: "gray", motivo: `Test de hoy (${CMJ_TAG_META[todayTag].label}) aún no registrado.`, rows: [], nivel: null };
  const d = cmjMotivoDia(m, todayTag, player.umbral);
  return { status: d.status, motivo: d.motivo, rows: cmjFilasDia(m, todayTag, player.umbral), nivel: d.nivel, m };
}

function CmjAjustesUmbralReal({ umbral, onGuardado }) {
  const [form, setForm] = useState(umbral);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    await api.setConfig("cmj_umbral", form);
    setGuardando(false);
    onGuardado(form);
  }

  return (
    <DsCard style={{ padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Ajustes del umbral</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Ámbar general (%)</div>
          <DsInput type="number" min="1" max="40" value={form.ambarPct} onChange={(e) => setForm({ ...form, ambarPct: Number(e.target.value) })} style={{ width: 70 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Rojo general (%)</div>
          <DsInput type="number" min="1" max="60" value={form.rojoPct} onChange={(e) => setForm({ ...form, rojoPct: Number(e.target.value) })} style={{ width: 70 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
          <DsToggle on={form.individualizar} onClick={() => setForm({ ...form, individualizar: !form.individualizar })} />
          Individualizar por jugador (con 4+ Inicios de historial)
        </label>
        <div>
          <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 4 }}>Usar Inicios desde (cambio de protocolo)</div>
          <DsInput type="date" value={form.protocoloDesde || ""} onChange={(e) => setForm({ ...form, protocoloDesde: e.target.value })} />
        </div>
        <DsButton size="sm" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ajustes"}</DsButton>
      </div>
    </DsCard>
  );
}

function CmjEstadoActualReal() {
  const [players, , playersLoaded] = usePlayers();
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [umbral, setUmbral] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(new Set(["red", "amber", "green", "gray"]));
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [expandedMetrics, setExpandedMetrics] = useState(new Set());
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  const cargar = useCallback(async () => {
    const [saltosRes, microRes, umbralGuardado] = await Promise.all([
      supabase.from("cmj_saltos").select("*").not("jugador_id", "is", null),
      supabase.from("cmj_microciclos").select("*"),
      api.config("cmj_umbral"),
    ]);
    if (!saltosRes.error) setSaltos(saltosRes.data || []);
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setUmbral(umbralGuardado || CMJ_UMBRAL_DEFECTO);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const filasParaMotor = useMemo(
    () =>
      saltos
        .filter((s) => playersById.has(s.jugador_id))
        .map((s) => ({
          jugadorId: s.jugador_id,
          nombre: playersById.get(s.jugador_id).name,
          dateKey: s.fecha,
          date: s.fecha_hora,
          peso: s.peso,
          hp0: s.hp0,
          altura: s.altura,
          fuerza: s.fuerza,
          potencia: s.potencia,
          velocidad: s.velocidad,
          kineticsValid: s.kinetics_valid,
          pesoValid: s.peso_valid,
          hp0Valid: s.hp0_valid,
        })),
    [saltos, playersById]
  );

  function toggleFiltro(s) {
    setFiltroEstado((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }
  function toggleCard(id) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleMetrica(id) {
    setExpandedMetrics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!playersLoaded || !loaded || !umbral) return <LoadingBlock />;

  const { players: builtPlayers, microList } = cmjBuildPlayers(filasParaMotor, microciclos, umbral.ambarPct, umbral.rojoPct, umbral.individualizar, umbral.protocoloDesde);
  const current = cmjFindCurrentMicroId(microList);

  const cabecera = (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setMostrarAjustes((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: mostrarAjustes ? 10 : 0 }}>
        {mostrarAjustes ? "▾ ocultar ajustes del umbral" : "▸ ajustes del umbral"}
      </button>
      {mostrarAjustes && <CmjAjustesUmbralReal umbral={umbral} onGuardado={setUmbral} />}
    </div>
  );

  if (microList.length === 0) {
    return (
      <div>
        {cabecera}
        <CmjProximamente titulo="Sin microciclos definidos" texto="Ve a la pestaña Microciclos y crea al menos uno (Inicio, MD-2, MD+1) para poder ver el estado semanal." />
      </div>
    );
  }
  if (current.id == null) {
    const next = microList[0];
    return (
      <div>
        {cabecera}
        <CmjProximamente
          titulo="El primer microciclo programado aún no ha empezado"
          texto={`Microciclo Nº ${next.numero} · inicio previsto ${next.inicio ? fmtDateShort(next.inicio) : "sin fecha"}. En cuanto se registren tests para esa fecha, aparecerán aquí.`}
        />
      </div>
    );
  }

  const meta = microList.find((m) => m.id === current.id);
  const todayKey = cmjDateKeyFromDate(new Date());
  const todayTag = CMJ_FIELDS.find((f) => meta[f] === todayKey) || null;

  const conHoy = builtPlayers.map((p) => ({ p, hoy: cmjHoyDe(p, todayTag) }));

  const porPosicion = new Map(CMJ_POSICIONES.map((pos) => [pos.key, []]));
  porPosicion.set(null, []);
  conHoy.forEach(({ p, hoy }) => {
    if (!filtroEstado.has(hoy.status)) return;
    const jugador = playersById.get(p.jugadorId);
    const pos = jugador?.posicion || null;
    (porPosicion.has(pos) ? porPosicion.get(pos) : porPosicion.get(null)).push({ p, hoy, jugador });
  });
  const totalFiltrados = [...porPosicion.values()].reduce((s, l) => s + l.length, 0);

  return (
    <div>
      {cabecera}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: ds.inkSecondary, marginBottom: 8 }}>
          Microciclo Nº {meta.numero} · inicio {meta.inicio ? fmtDateShort(meta.inicio) : "—"} · {todayTag ? `hoy: ${CMJ_TAG_META[todayTag]?.label || "Inicio microciclo"}` : "hoy no hay test programado — última lectura de la semana"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["red", "amber", "green", "gray"].map((s) => {
            const activo = filtroEstado.has(s);
            const meta2 = CMJ_STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => toggleFiltro(s)}
                style={{
                  fontSize: 12,
                  padding: "6px 11px",
                  borderRadius: dsR.md,
                  border: `1px solid ${activo ? meta2.color : ds.border}`,
                  background: activo ? meta2.bg : "transparent",
                  color: activo ? meta2.color : ds.inkMuted,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {meta2.label}
              </button>
            );
          })}
        </div>
      </div>

      {totalFiltrados === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Ningún jugador coincide con el filtro seleccionado.</div>}

      {[...CMJ_POSICIONES.map((p) => p.key), null].map((posKey) => {
        const lista = porPosicion.get(posKey) || [];
        if (lista.length === 0) return null;
        const label = posKey ? cmjPosicionLabel(posKey) : "Sin posición";
        return (
          <div key={posKey ?? "sin"} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${ds.borderSoft}` }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: ds.inkSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontSize: 11, color: ds.inkMuted, fontFamily: dsF.mono }}>{lista.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
              {lista
                .sort((a, b) => a.jugador.name.localeCompare(b.jugador.name))
                .map(({ p, hoy }) => {
                  const cardId = p.jugadorId;
                  const cardOpen = expandedCards.has(cardId);
                  const statusMeta = CMJ_STATUS_META[hoy.status];
                  return (
                    <DsCard
                      key={cardId}
                      style={{
                        padding: "11px 13px",
                        gap: 6,
                        background: hoy.status !== "gray" ? `linear-gradient(180deg, ${statusMeta.color}18 0%, ${ds.surface} 65%)` : undefined,
                        borderColor: hoy.status !== "gray" ? statusMeta.color + "55" : ds.borderSoft,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: ds.ink }}>{p.nombre}</span>
                        {hoy.nivel && <span style={{ fontSize: 10.5, color: ds.inkMuted }}>|</span>}
                        {hoy.nivel && <span style={{ fontSize: 10.5, fontWeight: 700, color: statusMeta.color, textTransform: "uppercase" }}>{hoy.nivel}</span>}
                        {hoy.m?.divergente && <span title="Divergencia: la altura no muestra fatiga, pero potencia y/o fuerza sí caen." style={{ color: ds.warning, fontSize: 12 }}>⚠</span>}
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: statusMeta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{statusMeta.label}</span>
                      </div>

                      {hoy.rows.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {hoy.rows.map((row) => {
                            const mkey = `${cardId}::${row.key}`;
                            const mOpen = expandedMetrics.has(mkey);
                            const rowMeta = CMJ_STATUS_META[row.status];
                            return (
                              <div key={row.key}>
                                <div onClick={() => toggleMetrica(mkey)} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, cursor: "pointer", padding: "1px 0" }}>
                                  <span style={{ color: ds.inkSecondary }}>› {row.label}</span>
                                  <span style={{ color: rowMeta.color, fontWeight: 700, fontFamily: dsF.mono }}>{cmjSigned(row.delta)}</span>
                                </div>
                                {mOpen && <div style={{ fontSize: 11, color: ds.inkMuted, lineHeight: 1.5, padding: "2px 0 4px 12px" }}>{row.explicacion}</div>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Sin valores todavía</div>
                      )}

                      {hoy.motivo && (
                        <>
                          <div onClick={() => toggleCard(cardId)} style={{ fontSize: 11, color: ds.inkMuted, cursor: "pointer" }}>
                            {cardOpen ? "▾ ocultar recomendación" : "› ver recomendación"}
                          </div>
                          {cardOpen && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: ds.inkSecondary }}>{hoy.motivo}</div>}
                        </>
                      )}
                    </DsCard>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Ranking histórico: la mejor marca de cada jugador en la variable y el
// periodo elegidos (histórico completo, un microciclo concreto o un rango
// de fechas), filtrable por momento del test (Inicio/MD-2/MD+1/sin
// etiqueta) y por posición — igual que en el panel independiente. Los
// umbrales de alerta no influyen aquí (el ranking no evalúa fatiga, solo
// compara marcas), así que se usa cmjBuildPlayers con el umbral por
// defecto solo para reutilizar el mismo agrupado por jugador y microciclo.
function CmjRankingReal() {
  const [players, , playersLoaded] = usePlayers();
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [metricKey, setMetricKey] = useState("altura");
  const [periodo, setPeriodo] = useState("historico"); // 'historico' | 'microciclo' | 'rango'
  const [microSel, setMicroSel] = useState(null);
  const [rango, setRango] = useState({ start: "", end: "" });
  const [filtroTags, setFiltroTags] = useState(() => new Set(["inicio", "md2", "md1", "sin"]));
  const [filtroPosicion, setFiltroPosicion] = useState(() => new Set([...CMJ_POSICIONES.map((p) => p.key), "sin"]));
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const cargar = useCallback(async () => {
    const [saltosRes, microRes] = await Promise.all([
      supabase.from("cmj_saltos").select("*").not("jugador_id", "is", null),
      supabase.from("cmj_microciclos").select("*"),
    ]);
    if (!saltosRes.error) setSaltos(saltosRes.data || []);
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setLoaded(true);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const filasParaMotor = useMemo(
    () =>
      saltos
        .filter((s) => playersById.has(s.jugador_id))
        .map((s) => ({
          jugadorId: s.jugador_id,
          nombre: playersById.get(s.jugador_id).name,
          dateKey: s.fecha,
          date: s.fecha_hora,
          peso: s.peso,
          hp0: s.hp0,
          altura: s.altura,
          fuerza: s.fuerza,
          potencia: s.potencia,
          velocidad: s.velocidad,
          kineticsValid: s.kinetics_valid,
          pesoValid: s.peso_valid,
          hp0Valid: s.hp0_valid,
        })),
    [saltos, playersById]
  );

  function toggleTag(k) {
    setFiltroTags((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }
  function toggleFiltroPosicion(k) {
    setFiltroPosicion((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (!playersLoaded || !loaded) return <LoadingBlock />;

  const { players: builtPlayers, microList } = cmjBuildPlayers(
    filasParaMotor,
    microciclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );

  const microSelActivo = microSel ?? (microList.length ? microList[microList.length - 1].id : null);
  const metric = CMJ_METRICS[metricKey];

  const candidatosDe = (p) => {
    if (periodo === "microciclo") {
      const m = p.microResults.get(microSelActivo);
      if (!m) return [];
      return CMJ_FIELDS.filter((k) => m[k] && filtroTags.has(k)).map((k) => m[k]);
    }
    const dentroDeRango = (r) => {
      if (periodo !== "rango" || !rango.start || !rango.end) return periodo !== "rango";
      const t = new Date(r.date).getTime();
      return t >= new Date(rango.start).getTime() && t <= new Date(rango.end + "T23:59:59").getTime();
    };
    return p.sorted.filter((r) => filtroTags.has(r.tag || "sin") && dentroDeRango(r));
  };

  const filaDe = (p) => {
    const candidatos = candidatosDe(p).map((r) => ({ r, v: metric.get(r) })).filter((c) => c.v != null);
    if (candidatos.length === 0) return null;
    const mejor = candidatos.reduce((a, b) => (b.v > a.v ? b : a));
    return { player: p, valor: mejor.v, fecha: mejor.r.date, tag: mejor.r.tag };
  };

  const posicionDe = (p) => playersById.get(p.jugadorId)?.posicion || "sin";

  const filas = builtPlayers
    .filter((p) => filtroPosicion.has(posicionDe(p)))
    .map(filaDe)
    .filter(Boolean)
    .sort((a, b) => b.valor - a.valor);

  const sinDatos = builtPlayers.filter((p) => filtroPosicion.has(posicionDe(p)) && !filaDe(p));

  const RANK_COLOR = { 0: ds.accent, 1: ds.inkSecondary, 2: ds.chart1 };
  const RANK_BG = { 0: `${ds.accent}1A`, 1: `${ds.inkSecondary}14`, 2: `${ds.chart1}14` };
  const esReciente = (fecha) => (Date.now() - new Date(fecha).getTime()) / 86400000 <= 14;

  const opcionesMomento = [
    { key: "inicio", label: "Inicio", color: CMJ_TAG_META.inicio.color },
    { key: "md2", label: "MD-2", color: CMJ_TAG_META.md2.color },
    { key: "md1", label: "MD+1", color: CMJ_TAG_META.md1.color },
    { key: "sin", label: "Sin etiqueta", color: ds.inkMuted },
  ];
  const opcionesPosicion = [...CMJ_POSICIONES.map((p) => ({ key: p.key, label: p.label })), { key: "sin", label: "Sin posición" }];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Mejor marca por jugador</div>
        <div style={{ fontSize: 12, color: ds.inkMuted, lineHeight: 1.5 }}>
          Mejor valor de cada jugador en la variable y el periodo elegidos. El podio (1º-3º) se resalta, y "▲ reciente" indica una marca de los últimos 14 días.
        </div>
      </div>

      <button onClick={() => setMostrarFiltros((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: mostrarFiltros ? 12 : 16 }}>
        {mostrarFiltros ? "▾ ocultar filtros" : "▸ filtros"}
      </button>

      {mostrarFiltros && (
        <DsCard style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Variable</div>
            <DsTabSwitcher tabs={CMJ_METRIC_LIST.map((m) => ({ id: m.key, label: m.label }))} active={metricKey} onChange={setMetricKey} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Periodo</div>
            <DsTabSwitcher
              tabs={[
                { id: "historico", label: "Histórico completo" },
                { id: "microciclo", label: "Microciclo concreto" },
                { id: "rango", label: "Rango de fechas" },
              ]}
              active={periodo}
              onChange={setPeriodo}
            />
          </div>

          {periodo === "microciclo" && (
            microList.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Microciclo</div>
                <DsSelect value={microSelActivo || ""} onChange={(e) => setMicroSel(e.target.value)} style={{ maxWidth: 220 }}>
                  {microList.map((m) => (
                    <option key={m.id} value={m.id}>Nº {m.numero}</option>
                  ))}
                </DsSelect>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: ds.inkMuted }}>Todavía no hay ningún microciclo registrado.</div>
            )
          )}

          {periodo === "rango" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Fechas</div>
              <div style={{ display: "flex", gap: 12 }}>
                <DsInput type="date" value={rango.start} onChange={(e) => setRango({ ...rango, start: e.target.value })} />
                <DsInput type="date" value={rango.end} onChange={(e) => setRango({ ...rango, end: e.target.value })} />
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Momento</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opcionesMomento.map((op) => {
                const activo = filtroTags.has(op.key);
                return (
                  <button
                    key={op.key}
                    onClick={() => toggleTag(op.key)}
                    style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? op.color : ds.border}`, background: activo ? `${op.color}1E` : "transparent", color: activo ? op.color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Posición</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opcionesPosicion.map((op) => {
                const activo = filtroPosicion.has(op.key);
                return (
                  <button
                    key={op.key}
                    onClick={() => toggleFiltroPosicion(op.key)}
                    style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accentSubtle : "transparent", color: activo ? ds.accent : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        </DsCard>
      )}

      {filas.length === 0 ? (
        <CmjProximamente titulo="Sin datos para este filtro" texto="Prueba a ampliar el momento, la posición o el periodo seleccionados." />
      ) : (
        <DsCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 560 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 130px 110px 100px", padding: "12px 16px", borderBottom: `1px solid ${ds.border}` }}>
                {["Nº", "Jugador", "Posición", metric.label.toUpperCase(), "Fecha", "Momento"].map((h, hi) => (
                  <div key={h} style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: hi >= 3 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {filas.map((f, i) => {
                const jugador = playersById.get(f.player.jugadorId);
                const posLabel = jugador?.posicion ? cmjPosicionLabel(jugador.posicion) : "—";
                return (
                  <div
                    key={f.player.jugadorId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr 130px 130px 110px 100px",
                      padding: "11px 16px",
                      alignItems: "center",
                      borderBottom: `1px solid ${ds.borderSoft}`,
                      borderLeft: RANK_COLOR[i] ? `3px solid ${RANK_COLOR[i]}` : "3px solid transparent",
                      background: RANK_BG[i] || (i % 2 === 1 ? ds.bgElevated + "40" : "transparent"),
                    }}
                  >
                    <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13.5, color: RANK_COLOR[i] || ds.inkMuted }}>{i + 1}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{f.player.nombre}</div>
                    <div style={{ fontSize: 12, color: ds.inkSecondary }}>{posLabel}</div>
                    <div style={{ fontFamily: dsF.mono, fontWeight: 700, fontSize: 13.5, color: CMJ_METRIC_CHART_COLOR[metricKey], textAlign: "right" }}>
                      {cmjFmt(f.valor, metric.decimals)} {metric.unit}
                    </div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted, textAlign: "right" }}>
                      {fmtDateShort(f.fecha)}
                      {esReciente(f.fecha) && <span style={{ display: "block", color: ds.success, fontWeight: 600, fontSize: 10.5 }}>▲ reciente</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: ds.inkMuted, textAlign: "right" }}>{f.tag ? CMJ_TAG_META[f.tag].label : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </DsCard>
      )}

      {sinDatos.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 11.5, color: ds.inkMuted, lineHeight: 1.5 }}>
          Sin marca en este filtro: {sinDatos.map((p) => p.nombre).join(", ")}.
        </div>
      )}
    </div>
  );
}

function CmjSubirCsvReal() {
  const [players, , playersLoaded] = usePlayers();
  const [alias, aliasLoaded, recargarAlias] = useCmjAlias();
  const [parsed, setParsed] = useState(null); // { rows, issues }
  const [vinculos, setVinculos] = useState(new Map()); // nombreCsv -> jugadorId | "ignorar" | null
  const [origenVinculo, setOrigenVinculo] = useState(new Map()); // nombreCsv -> "alias" | "nombre" | "manual" | null
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState("");
  const fileInputRef = useRef(null);

  const jugadoresPorNombreNorm = useMemo(() => {
    const m = new Map();
    players.forEach((p) => m.set(cmjNormalizarNombre(p.name), p.id));
    return m;
  }, [players]);

  function resolverAutomatico(nombreCsv) {
    const norm = cmjNormalizarNombre(nombreCsv);
    const porAlias = alias.get(norm);
    if (porAlias) return { jugadorId: porAlias.jugadorId, origen: "alias" };
    const porNombre = jugadoresPorNombreNorm.get(norm);
    if (porNombre) return { jugadorId: porNombre, origen: "nombre" };
    return { jugadorId: null, origen: null };
  }

  function limpiarSeleccion() {
    setParsed(null);
    setVinculos(new Map());
    setOrigenVinculo(new Map());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, issues } = cmjParseCSV(ev.target.result);
      const nuevosVinculos = new Map();
      const nuevosOrigenes = new Map();
      [...new Set(rows.map((r) => r.nombreCsv))].forEach((n) => {
        const { jugadorId, origen } = resolverAutomatico(n);
        nuevosVinculos.set(n, jugadorId);
        nuevosOrigenes.set(n, origen);
      });
      setParsed({ rows, issues });
      setVinculos(nuevosVinculos);
      setOrigenVinculo(nuevosOrigenes);
      setResultado(null);
      setErrorGuardado("");
    };
    reader.readAsText(file, "utf-8");
  }

  const nombresUnicos = useMemo(() => (parsed ? [...new Set(parsed.rows.map((r) => r.nombreCsv))] : []), [parsed]);
  const pendientes = nombresUnicos.filter((n) => vinculos.get(n) == null).length;

  async function confirmarGuardado() {
    if (!parsed) return;
    setGuardando(true);
    setErrorGuardado("");
    try {
      // 1) Guardar como alias los vínculos que ha elegido David a mano ahora
      // mismo (no los que ya venían de un alias guardado antes) — así la
      // próxima vez que aparezca este mismo nombre en un CSV, se vincula solo.
      const aliasNuevos = nombresUnicos
        .filter((n) => {
          const v = vinculos.get(n);
          return v && v !== "ignorar" && origenVinculo.get(n) === "manual";
        })
        .map((n) => ({ nombre_normalizado: cmjNormalizarNombre(n), jugador_id: vinculos.get(n), nombre_original: n }));

      if (aliasNuevos.length) {
        const { error } = await supabase.from("cmj_alias_nombre").upsert(aliasNuevos, { onConflict: "nombre_normalizado" });
        if (error) throw new Error(error.message);
      }

      // 2) Guardar los saltos — solo de los nombres vinculados a un jugador
      // real. Los "ignorados" y los que siguen sin vincular no se guardan:
      // así nunca se crea un jugador fantasma por un nombre que no coincide.
      const filas = parsed.rows
        .filter((r) => {
          const v = vinculos.get(r.nombreCsv);
          return v && v !== "ignorar";
        })
        .map((r) => ({
          id: genId("cmjsalto"),
          jugador_id: vinculos.get(r.nombreCsv),
          nombre_csv: r.nombreCsv,
          equipo: r.equipo || null,
          fecha: r.dateKey,
          fecha_hora: r.date,
          peso: r.peso,
          hp0: r.hp0,
          altura: r.altura,
          fuerza: r.fuerza,
          potencia: r.potencia,
          velocidad: r.velocidad,
          kinetics_valid: r.kineticsValid,
          peso_valid: r.pesoValid,
          hp0_valid: r.hp0Valid,
          n_saltos: r.nSaltos,
        }));

      if (filas.length) {
        const { error } = await supabase.from("cmj_saltos").upsert(filas, { onConflict: "nombre_csv,fecha" });
        if (error) throw new Error(error.message);
      }

      const ignorados = nombresUnicos.filter((n) => vinculos.get(n) === "ignorar").length;
      const pendientesFinal = nombresUnicos.filter((n) => vinculos.get(n) == null).length;
      setResultado({
        guardados: filas.length,
        jugadoresGuardados: nombresUnicos.length - ignorados - pendientesFinal,
        ignorados,
        pendientes: pendientesFinal,
      });
      if (aliasNuevos.length) recargarAlias();
      limpiarSeleccion();
    } catch (err) {
      setErrorGuardado(err.message || "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Subir CSV de My Jump Lab</div>
        <div style={{ fontSize: 12.5, color: ds.inkMuted, lineHeight: 1.5 }}>
          Cada exportación se trata como tu historial completo hasta la fecha — puedes subir el mismo archivo varias veces, no se duplica (se actualiza el test de ese jugador y ese día).
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} id="cmj-csv-input" />
      <label htmlFor="cmj-csv-input" className="ds-button ds-button--secondary" style={{ display: "inline-flex", cursor: "pointer" }}>
        Elegir archivo CSV
      </label>

      {!playersLoaded || !aliasLoaded ? (
        parsed && <LoadingBlock />
      ) : parsed ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12.5, color: ds.inkMuted, marginBottom: 10 }}>
            {parsed.rows.length} test{parsed.rows.length === 1 ? "" : "s"} de {nombresUnicos.length} jugador{nombresUnicos.length === 1 ? "" : "es"} detectados en el CSV.
            {parsed.issues.dupCount > 0 && ` ${parsed.issues.dupCount} fila(s) duplicada(s) ignoradas.`}
            {parsed.issues.hp0Suspect > 0 && ` ${parsed.issues.hp0Suspect} test(s) sin calibración válida — fuerza y potencia no se calcularán para esos.`}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nombresUnicos.map((nombreCsv) => {
              const v = vinculos.get(nombreCsv);
              const origen = origenVinculo.get(nombreCsv);
              const nTests = parsed.rows.filter((r) => r.nombreCsv === nombreCsv).length;
              return (
                <DsCard key={nombreCsv} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{nombreCsv}</div>
                    <div style={{ fontSize: 11, color: ds.inkMuted }}>{nTests} test{nTests === 1 ? "" : "s"}</div>
                  </div>
                  {v && v !== "ignorar" ? (
                    <DsBadge tone={origen === "manual" ? "accent" : "success"}>
                      {origen === "alias" ? "vinculado (alias)" : origen === "nombre" ? "vinculado por nombre" : "vinculado"}
                    </DsBadge>
                  ) : v === "ignorar" ? (
                    <DsBadge tone="neutral">ignorado</DsBadge>
                  ) : (
                    <DsBadge tone="danger">sin vincular</DsBadge>
                  )}
                  <DsSelect
                    value={v && v !== "ignorar" ? v : v === "ignorar" ? "ignorar" : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVinculos((prev) => new Map(prev).set(nombreCsv, val === "" ? null : val));
                      setOrigenVinculo((prev) => new Map(prev).set(nombreCsv, val === "" || val === "ignorar" ? null : "manual"));
                    }}
                    style={{ width: 200 }}
                  >
                    <option value="">— Sin vincular —</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="ignorar">No es mi jugador (ignorar)</option>
                  </DsSelect>
                </DsCard>
              );
            })}
          </div>

          {pendientes > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: ds.warning }}>
              {pendientes} jugador{pendientes === 1 ? "" : "es"} todavía sin vincular ni ignorar — sus tests no se guardarán hasta que elijas una opción para cada uno.
            </div>
          )}

          {errorGuardado && <div style={{ marginTop: 12, fontSize: 12.5, color: ds.danger }}>{errorGuardado}</div>}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <DsButton onClick={confirmarGuardado} disabled={guardando}>{guardando ? "Guardando…" : "Guardar en Control de fatiga"}</DsButton>
            <DsButton variant="secondary" onClick={limpiarSeleccion} disabled={guardando}>Cancelar</DsButton>
          </div>
        </div>
      ) : null}

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <DsCard status="done" style={{ padding: 14, fontSize: 13 }}>
            Guardado: {resultado.guardados} test{resultado.guardados === 1 ? "" : "s"} de {resultado.jugadoresGuardados} jugador{resultado.jugadoresGuardados === 1 ? "" : "es"}.
            {resultado.ignorados > 0 && ` ${resultado.ignorados} jugador(es) ignorados.`}
            {resultado.pendientes > 0 && ` ${resultado.pendientes} quedaron sin vincular (no se guardaron sus tests) — vuelve a subir el mismo CSV cuando quieras resolverlo.`}
          </DsCard>
        </div>
      )}
    </div>
  );
}

// ---------- PROGRAMACIÓN (calcado de programacion.jsx) ----------

function TareaVisualReal({ tarea }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
      {tarea.gif ? (
        <div style={{ position: "relative", width: 42, height: 42, borderRadius: dsR.md, flexShrink: 0, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {miniaturaTarea(tarea.gif) && (
            <img src={miniaturaTarea(tarea.gif)} alt="" style={{ width: 42, height: 42, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
          )}
          {(extractYouTubeId(tarea.gif) || esVideoDirecto(tarea.gif)) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(tarea.gif) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
              <Play size={13} color={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} fill={miniaturaTarea(tarea.gif) ? "#fff" : ds.accent} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: dsR.md, background: ds.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ds.inkMuted, fontSize: 9, fontFamily: dsF.mono }}>
          VÍDEO
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: ds.ink }}>{tarea.nombre}</div>
        <div style={{ fontSize: 10.5, color: ds.inkMuted, fontFamily: dsF.mono }}>{tarea.detalle}</div>
        {tarea.materiales && tarea.materiales.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
            {tarea.materiales.map((m) => (
              <span key={m} style={{ fontSize: 9.5, color: ds.accent, fontFamily: dsF.mono }}>
                {m}
              </span>
            ))}
          </div>
        )}
        {tarea.nota && (
          <div style={{ display: "flex", gap: 4, marginTop: 3, fontSize: 10, color: ds.inkSecondary }}>
            <span style={{ color: ds.warning, display: "inline-flex" }}><AlertTriangle size={12} /></span>
            <span>{tarea.nota}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Línea de detalle de una tarea en el resumen del entrenador (Programación).
// Antes daba por hecho que toda tarea era "series × cantidad" tipo Fuerza —
// una tarea por tiempo (Activación, modo "minutos"/"tiempo", sin series) se
// quedaba en "× 8" sin unidad, porque el molde no sabía que ese modo existe.
// Aquí sí se usa el modo real de la tarea para elegir el formato y la
// unidad — igual que ya hace la pantalla del jugador con UNIDAD_POR_MODO.
function formatearDetalleTareaCoach(t) {
  if (t.bloque_sesion === "Resistencia") return formatearObjetivoResistencia(parseResistenciaData(t.resistencia_data));
  const porTiempo = t.modo === "minutos" || t.modo === "tiempo";
  // Antes, si la tarea era "por tiempo" (isométricos: plancha, puente...),
  // se descartaba el dato de series aunque estuviera guardado — aquí, igual
  // que en la pantalla del jugador, las series se muestran siempre que
  // existan, sea cual sea el modo (reps/tiempo/minutos/metros).
  const unidad = porTiempo ? ` ${UNIDAD_POR_MODO[t.modo] || ""}`.trimEnd() : "";
  const cantidad = `${t.series ? `${t.series} × ` : ""}${t.cantidad}${unidad}`;
  // Igual que en la pantalla del jugador: la lateralidad depende solo de si
  // el ejercicio la tiene desactivada, no de si la tarea es por tiempo.
  const lateralidad = t.sin_lateralidad !== "si" ? ` · ${t.lateralidad === "unilateral" ? "Unilateral" : "Bilateral"}` : "";
  const cargaObjetivo =
    t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null
      ? ` · ${t.pct1rm}% 1RM`
      : t.rir !== "" && t.rir != null
      ? ` · RIR ${t.rir}`
      : "";
  return `${cantidad}${lateralidad}${cargaObjetivo}`;
}

function TarjetaSesionReal({ sesion, esHoy, onEditar, onEliminar, onReutilizar }) {
  const [abierta, setAbierta] = useState(esHoy);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const bloques = {};
  const circuitoBuffer = {};
  (sesion.tareas || []).forEach((t) => {
    // Si la tarea tiene fecha propia (Movilidad/Preventivo con varias fechas
    // en la misma sesión), se agrupa aparte con su fecha en la etiqueta, para
    // no mezclar el ejercicio de un día con el de otro bajo el mismo nombre.
    const nombreBloque = t.fecha ? `${t.bloque_sesion || "General"} · ${fmtDateShort(t.fecha)}` : t.bloque_sesion || "General";
    if (t.circuito_id) {
      if (!circuitoBuffer[t.circuito_id]) circuitoBuffer[t.circuito_id] = { nombreBloque, tareas: [] };
      circuitoBuffer[t.circuito_id].tareas.push(t);
    } else {
      if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
      bloques[nombreBloque].push({ tipo: "suelta", tarea: t });
    }
  });
  Object.entries(circuitoBuffer).forEach(([circuitoId, datos]) => {
    if (!bloques[datos.nombreBloque]) bloques[datos.nombreBloque] = [];
    bloques[datos.nombreBloque].push({
      tipo: "circuito",
      circuitoId,
      tareas: datos.tareas.slice().sort((a, b) => (Number(a.orden_en_circuito) || 999) - (Number(b.orden_en_circuito) || 999)),
    });
  });

  return (
    <div style={{ background: ds.surface, border: `1px solid ${esHoy ? ds.accentBorderSubtle : ds.border}`, borderRadius: dsR.lg, overflow: "hidden" }}>
      <div onClick={() => setAbierta((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {sesion.nombre && <div style={{ fontSize: 13.5, fontWeight: 700, color: ds.accent, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sesion.nombre}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esHoy && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>
                HOY
              </span>
            )}
            {(sesion.fechas || []).map((f) => (
              <span key={f} style={{ fontSize: 13, fontWeight: 600, color: ds.ink }}>
                {fmtDateShort(f)}
              </span>
            ))}
            {!(sesion.fechas || []).length && <span style={{ fontSize: 13, fontWeight: 600, color: ds.inkMuted }}>Sin fecha todavía</span>}
            {sesion.md && (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 4, padding: "1px 6px" }}>{sesion.md}</span>
            )}
            {sesion.enviada ? (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, border: `1px solid ${ds.successBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>✓ ENVIADA</span>
            ) : (
              <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.warning, border: `1px solid ${ds.warning}55`, borderRadius: 4, padding: "1px 6px" }}>BORRADOR</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 3 }}>
            {!sesion.jugadores_destino || !sesion.jugadores_destino.length ? "Todo el equipo" : `${sesion.jugadores_destino.length} jugador(es)`}
            {(sesion.fechas || []).length > 1 && ` · lote de ${sesion.fechas.length} fechas`}
          </div>
        </div>
        <span style={{ color: ds.inkMuted, fontSize: 12, transform: abierta ? "rotate(90deg)" : "none" }}>›</span>
      </div>
      {abierta && (
        <div style={{ borderTop: `1px solid ${ds.border}`, padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {sesion.objetivo && (
            <div style={{ fontSize: 12, color: ds.inkSecondary }}>
              <strong style={{ color: ds.ink }}>Objetivo:</strong> {sesion.objetivo}
            </div>
          )}
          {Object.entries(bloques).map(([nombreBloque, items]) => (
            <div key={nombreBloque}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 6 }}>{nombreBloque}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) =>
                  item.tipo === "circuito" ? (
                    <div key={item.circuitoId} style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: 8, display: "flex", flexDirection: "column", gap: 6, background: `${ds.surface}40` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 6px" }}>CIRCUITO</span>
                      </div>
                      {item.tareas.map((t, i) => (
                        <TareaVisualReal
                          key={t.id}
                          tarea={{
                            nombre: `${i + 1}. ${t.nombreEjercicio}`,
                            detalle: formatearDetalleTareaCoach(t),
                            gif: t.gif_url,
                            nota: t.nota,
                            materiales: parseMateriales(t.material),
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <TareaVisualReal
                      key={item.tarea.id}
                      tarea={{
                        nombre: item.tarea.nombreEjercicio,
                        detalle: formatearDetalleTareaCoach(item.tarea),
                        gif: item.tarea.gif_url,
                        nota: item.tarea.nota,
                        materiales: parseMateriales(item.tarea.material),
                      }}
                    />
                  )
                )}
              </div>
            </div>
          ))}
          <DsButton variant="secondary" size="sm" onClick={() => onEditar(sesion)} style={{ alignSelf: "flex-start" }}>
            Editar esta sesión
          </DsButton>
          {onReutilizar && (
            <DsButton variant="secondary" size="sm" onClick={() => onReutilizar(sesion)} style={{ alignSelf: "flex-start", borderColor: ds.accentBorderSubtle, color: ds.accent }}>
              Reutilizar como nueva
            </DsButton>
          )}
          {confirmando ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: ds.danger }}>
                {sesion.enviada ? "Esta sesión ya se envió — ¿eliminarla igualmente?" : "¿Eliminar esta sesión? No se puede deshacer."}
              </span>
              <button
                onClick={async () => {
                  setBorrando(true);
                  await onEliminar(sesion.id);
                }}
                disabled={borrando}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.danger}`, background: `${ds.danger}22`, color: ds.danger, cursor: "pointer", fontWeight: 600, opacity: borrando ? 0.6 : 1 }}
              >
                {borrando ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button onClick={() => setConfirmando(false)} disabled={borrando} style={{ fontSize: 12, padding: "6px 12px", borderRadius: dsR.sm, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          ) : (
            <DsButton variant="danger" size="sm" onClick={() => setConfirmando(true)} style={{ alignSelf: "flex-start" }}>
              Eliminar sesión
            </DsButton>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramacionReal({ players, onBack, onAbrirModulo, onCerrarSesion }) {
  // Antes: sesiones -> tareas en cadena (ejercicios en paralelo) — 2
  // peticiones encadenadas. Ahora: 1 sola, con las 3 cosas ya juntas.
  const { loaded: bootLoaded, sesiones, tareas, ejercicios, retry } = useBootstrapProgramacion();
  const [editingSesion, setEditingSesion] = useState(null);
  const [plantillaSesion, setPlantillaSesion] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [historialVisible, setHistorialVisible] = useState(15);
  const [verBiblioteca, setVerBiblioteca] = useState(false);
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState("");
  const [errorBorrado, setErrorBorrado] = useState("");

  if (showEditor) {
    const esComplementaria = (editingSesion || plantillaSesion)?.tipo === "complementaria";
    const EditorComponent = esComplementaria ? DinamicaComplementariaReal : DisenoSesionReal;
    const cerrar = () => {
      setShowEditor(false);
      setEditingSesion(null);
      setPlantillaSesion(null);
    };
    return (
      <EditorComponent
        sesionExistente={editingSesion || undefined}
        plantilla={plantillaSesion || undefined}
        onBack={cerrar}
        onGuardado={() => {
          retry();
          cerrar();
        }}
      />
    );
  }


  if (!bootLoaded) return <LoadingBlock />;

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  // Defensa igual que en el resto de la app: no fiarse de que el backend
  // haya filtrado de verdad las tareas por sesión.
  const sesionIdsSet = new Set(sesiones.map((s) => s.id));
  const tareasBySesion = new Map();
  tareas
    .filter((t) => sesionIdsSet.has(t.sesion_id))
    .forEach((t) => {
      if (!tareasBySesion.has(t.sesion_id)) tareasBySesion.set(t.sesion_id, []);
      const e = ejerciciosById.get(t.ejercicio_id) || {};
      tareasBySesion.get(t.sesion_id).push({ ...t, nombreEjercicio: e.nombre || "(ejercicio eliminado)", gif_url: e.gif_url, sin_lateralidad: e.sin_lateralidad });
    });

  const today = todayStr();
  const conTareas = sesiones.map((s) => ({ ...s, tareas: tareasBySesion.get(s.id) || [] }));
  const hoy = conTareas.filter((s) => (s.fechas || []).includes(today));
  const futuras = conTareas
    // Un borrador sin fecha todavía (guardado a medias, para retomar luego)
    // no encaja en "hoy" ni en "pasadas" — se cuela aquí, en Próximas, que
    // es donde pediste verlo mezclado con las que sí están listas.
    .filter((s) => !(s.fechas || []).includes(today) && ((s.fechas || []).some((f) => f > today) || !(s.fechas || []).length))
    .sort((a, b) => ((a.fechas || [])[0] || "") < ((b.fechas || [])[0] || "") ? -1 : 1);
  // Historial: todas las fechas de la sesión ya pasaron (ni hoy ni futuras).
  // Se ordena de la más reciente a la más antigua, que es como interesa
  // revisarlo — y es también lo que hace más útil "Reutilizar", al tener las
  // sesiones más parecidas a lo que se necesita ahora arriba del todo.
  const pasadas = conTareas
    .filter((s) => !(s.fechas || []).includes(today) && !(s.fechas || []).some((f) => f > today) && (s.fechas || []).length)
    .sort((a, b) => {
      const maxA = (a.fechas || []).reduce((m, f) => (f > m ? f : m), "");
      const maxB = (b.fechas || []).reduce((m, f) => (f > m ? f : m), "");
      return maxA < maxB ? 1 : -1;
    });

  // Biblioteca de sesiones: cualquier sesión con nombre puesto por el
  // entrenador, esté o no ya programada/pasada — es ortogonal al calendario
  // (igual patrón que TeamBuildr/TrainHeroic: la plantilla vive aparte de
  // cuándo se usó). Se busca por texto sobre ese nombre, sin distinguir
  // mayúsculas.
  const plantillas = conTareas
    .filter((s) => s.nombre && s.nombre.trim())
    .filter((s) => !busquedaBiblioteca.trim() || s.nombre.toLowerCase().includes(busquedaBiblioteca.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const editar = (s) => {
    setEditingSesion(s);
    setShowEditor(true);
  };

  // Reutilizar: abre el editor con el mismo contenido (bloques, tareas,
  // circuitos, destinatarios, objetivo...) pero como sesión NUEVA — sin id,
  // sin fechas heredadas (las elige de nuevo el entrenador) y sin arrastrar
  // los ids de tarea/circuito originales, así guardar no toca ni borra nada
  // de la sesión de la que se partió.
  const reutilizar = (s) => {
    setPlantillaSesion(s);
    setEditingSesion(null);
    setShowEditor(true);
  };

  // Borra la sesión y todo lo que le pertenece (sus tareas y sus circuitos)
  // — nada queda huérfano apuntando a una sesión que ya no existe. Los
  // registros que los jugadores ya hubieran enviado de esas tareas se
  // quedan tal cual en el historial (igual que cuando se borra un ejercicio
  // de la Biblioteca): dejan de poder resolver el nombre y se muestran como
  // "(tarea eliminada)", pero no se pierde el dato de que se hizo algo ese día.
  const eliminarSesion = async (sesionId) => {
    setErrorBorrado("");
    try {
      const tareasDeSesion = tareas.filter((t) => t.sesion_id === sesionId);
      const circuitoIds = [...new Set(tareasDeSesion.filter((t) => t.circuito_id).map((t) => t.circuito_id))];
      await Promise.all(tareasDeSesion.map((t) => api.delete("tareas", t.id)));
      await Promise.all(circuitoIds.map((id) => api.delete("circuitos", id)));
      await api.delete("sesiones", sesionId);
      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();
      retry();
    } catch (e) {
      setErrorBorrado("No se pudo borrar la sesión. Comprueba tu conexión e inténtalo de nuevo.");
    }
  };

  return (
    <PantallaEntrenadorAncha activo="programacion" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>PROGRAMACIÓN</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Sesiones</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{hoy.length > 0 ? "Sesión de hoy y próximas programadas" : "Próximas sesiones programadas"}</div>
        </div>
        {errorBorrado && <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 14 }}>{errorBorrado}</div>}
        {hoy.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 8 }}>HOY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hoy.map((s) => (
                <TarjetaSesionReal key={s.id} sesion={s} esHoy onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} />
              ))}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, marginBottom: 8 }}>PRÓXIMAS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {futuras.map((s) => (
              <TarjetaSesionReal key={s.id} sesion={s} esHoy={false} onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} />
            ))}
            {futuras.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>No hay más sesiones programadas</div>}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setVerBiblioteca((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "10px 14px", cursor: "pointer", color: ds.ink, fontSize: 13, fontWeight: 600 }}
          >
            <BookOpen size={14} color={ds.accent} />
            Biblioteca de sesiones{plantillas.length || busquedaBiblioteca ? ` (${plantillas.length})` : ""}
            <span style={{ marginLeft: "auto", color: ds.inkMuted, fontSize: 12, transform: verBiblioteca ? "rotate(90deg)" : "none" }}>›</span>
          </button>
          {verBiblioteca && (
            <div style={{ marginTop: 10 }}>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} color={ds.inkMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <DsInput
                  value={busquedaBiblioteca}
                  onChange={(e) => setBusquedaBiblioteca(e.target.value)}
                  placeholder="Buscar por nombre..."
                  style={{ paddingLeft: 32 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plantillas.map((s) => (
                  <TarjetaSesionReal key={s.id} sesion={s} esHoy={false} onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} />
                ))}
                {plantillas.length === 0 && (
                  <div style={{ color: ds.inkMuted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>
                    {busquedaBiblioteca ? "Ninguna plantilla coincide con esa búsqueda." : 'Todavía no has puesto nombre a ninguna sesión. Ponle uno al diseñarla para que aparezca aquí.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setVerHistorial((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "10px 14px", cursor: "pointer", color: ds.ink, fontSize: 13, fontWeight: 600 }}
          >
            <History size={14} color={ds.inkSecondary} />
            Historial de sesiones{pasadas.length ? ` (${pasadas.length})` : ""}
            <span style={{ marginLeft: "auto", color: ds.inkMuted, fontSize: 12, transform: verHistorial ? "rotate(90deg)" : "none" }}>›</span>
          </button>
          {verHistorial && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {pasadas.slice(0, historialVisible).map((s) => (
                <TarjetaSesionReal key={s.id} sesion={s} esHoy={false} onEditar={editar} onEliminar={eliminarSesion} onReutilizar={reutilizar} />
              ))}
              {pasadas.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Todavía no hay sesiones pasadas</div>}
              {pasadas.length > historialVisible && (
                <DsButton variant="secondary" size="sm" onClick={() => setHistorialVisible((v) => v + 15)} style={{ alignSelf: "center" }}>
                  Mostrar más
                </DsButton>
              )}
            </div>
          )}
        </div>
      </div>
    </PantallaEntrenadorAncha>
  );
}



// ---------- PANTALLA DEL JUGADOR (calcado de pantalla-jugador.jsx) ----------

// Chip pequeño de selección (banda elástica, corporal/asistencia/lastre,
// elegir material, completo/parcial en Resistencia) — no existe como
// componente en ui-components.jsx, así que se resuelve aquí mismo con los
// mismos tokens del sistema nuevo (ds.*) en vez de hex sueltos, para que
// visualmente sea parte de la misma familia que Button/Badge/Toggle.
function ChipSeleccionableReal({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 10.5,
        padding: "6px 9px",
        borderRadius: dsR.sm,
        border: `1px solid ${activo ? ds.accent : ds.border}`,
        background: activo ? ds.accentSubtle : "transparent",
        color: activo ? ds.accent : ds.inkSecondary,
        cursor: "pointer",
        fontFamily: dsF.sans,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function EtiquetaCampoReal({ children, color }) {
  return (
    <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: color || ds.inkMuted, letterSpacing: "0.02em" }}>{children}</span>
  );
}

// Texto de una línea con lo registrado, para cuando la tarea ya está
// marcada como hecha — sustituye a los campos editables, que no aportan
// nada una vez rellenados y solo dan sensación de formulario a medias.
function resumenRegistroReal(tarea, registro) {
  if (tarea.esResistencia) {
    return registro.subtipo === "parcial" ? `Hizo menos: ${registro.carga || "sin detalle"}` : "Cumplido completo";
  }
  if (tarea.esCmj) {
    return registro.carga !== "" && registro.carga != null ? `${registro.carga} cm` : "Registrado";
  }
  const partes = [];
  if (registro.reps !== "" && registro.reps != null) partes.push(`${registro.reps} ${tarea.unidad || "reps"}`);
  if (registro.carga !== "" && registro.carga != null) {
    partes.push(registro.subtipo === "asistencia" ? `banda ${registro.carga}` : `${registro.carga}kg`);
  }
  if (registro.rir !== "" && registro.rir != null) partes.push(`RIR ${registro.rir}`);
  return partes.length ? partes.join(" · ") : "Registrado";
}

function TareaCardReal({ tarea, hecho, onToggle, registro, onCambiarRegistro, onAmpliarGif, orden, mostrarRegistro = true, esRecordNuevo = false }) {
  const videoEfectivo = videoEfectivoTarea(tarea, registro);
  const [expandido, setExpandido] = useState(false);
  // Con la tarea ya hecha, los campos de registro se colapsan en una línea
  // de resumen — verlos vacíos otra vez, ya rellenados, es lo que hacía que
  // una sesión a medio hacer pareciera siempre un formulario sin terminar.
  // Mientras no está hecha, el formulario solo se ve si tocas la tarjeta
  // para desplegarla — colapsada, la tarjeta es solo nombre + meta + check.
  // El CMJ ya no se despliega para editar nada: la altura ya no la
  // introduce el jugador (viene del CSV que sube el entrenador), así que no
  // hay campo que rellenar — solo queda marcarla como hecha cuando la haga.
  const puedeDesplegar = mostrarRegistro && !hecho && !tarea.esCmj;
  const mostrarFormulario = puedeDesplegar && expandido;
  return (
    <DsCard
      status={hecho ? "done" : "default"}
      style={{
        padding: 14,
        gap: 12,
        borderRadius: dsR.xl,
        // P6: la tarea donde se acaba de superar el récord se queda con un
        // halo dorado persistente, no solo el toast puntual del momento en
        // que se guarda — así el jugador ve el logro también si vuelve a
        // esta pantalla más tarde en la misma sesión.
        borderColor: esRecordNuevo ? ds.accent : hecho ? ds.successBorderSubtle : "transparent",
        background: esRecordNuevo ? `${ds.accent}1A` : undefined,
        boxShadow: dsSh.elevation2,
      }}
    >
      <div
        onClick={() => puedeDesplegar && setExpandido((v) => !v)}
        style={{ display: "flex", gap: 11, alignItems: "center", cursor: puedeDesplegar ? "pointer" : "default" }}
      >
        {orden != null && (
          <span style={{ width: 19, height: 19, borderRadius: dsR.full, background: ds.bgElevated, color: ds.accent, fontFamily: dsF.mono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        {videoEfectivo ? (
          <div onClick={(e) => { e.stopPropagation(); onAmpliarGif(); }} style={{ position: "relative", width: 44, height: 44, borderRadius: dsR.md, flexShrink: 0, cursor: "pointer", background: ds.bgElevated, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {miniaturaTarea(videoEfectivo) && (
              <img src={miniaturaTarea(videoEfectivo)} alt={`Demostración: ${tarea.nombre}`} style={{ width: 44, height: 44, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
            )}
            {(extractYouTubeId(videoEfectivo) || esVideoDirecto(videoEfectivo)) && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(videoEfectivo) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
                <Play size={14} color={miniaturaTarea(videoEfectivo) ? "#fff" : ds.accent} fill={miniaturaTarea(videoEfectivo) ? "#fff" : ds.accent} />
              </div>
            )}
          </div>
        ) : tarea.eligeEquipo ? (
          <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkMuted, fontSize: 7, fontFamily: dsF.mono, textAlign: "center", lineHeight: 1.2, padding: 3 }}>
            MATERIAL
          </div>
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkMuted, fontSize: 8.5, fontFamily: dsF.mono }}>
            VÍDEO
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tarea.esResistencia ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
              <div style={{ fontFamily: dsF.mono, fontSize: 11.5, color: hecho ? ds.success : ds.inkSecondary, marginTop: 3, fontWeight: hecho ? 700 : 400 }}>
                {hecho ? resumenRegistroReal(tarea, registro) : tarea.objetivoResistencia}
              </div>
            </>
          ) : tarea.esCmj ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
              <div style={{ fontFamily: hecho ? dsF.mono : dsF.sans, fontSize: hecho ? 11.5 : 11, fontWeight: hecho ? 700 : 400, color: hecho ? ds.success : ds.inkMuted, marginTop: 3 }}>
                {hecho
                  ? resumenRegistroReal(tarea, registro)
                  : tarea.referenciaCmj
                  ? `Último salto ${tarea.referenciaCmj.altura} cm${tarea.referenciaCmj.md ? ` (${tarea.referenciaCmj.md})` : ""}`
                  : "Sin registro previo"}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: ds.ink, letterSpacing: "-0.01em" }}>{tarea.nombre}</div>
                {esRecordNuevo && (
                  <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.accentInk, background: ds.accent, borderRadius: 4, padding: "1.5px 5px" }}>
                    RÉCORD
                  </span>
                )}
                {tarea.mostrarLateralidad !== false && (
                  <DsBadge tone={tarea.unilateral ? "accent" : "neutral"}>{tarea.unilateral ? "Unilateral" : "Bilateral"}</DsBadge>
                )}
              </div>
              {hecho && mostrarRegistro ? (
                <div style={{ fontFamily: dsF.mono, fontSize: 12, color: ds.success, marginTop: 3, fontWeight: 700 }}>{resumenRegistroReal(tarea, registro)}</div>
              ) : (
                <div style={{ fontFamily: dsF.mono, fontSize: 12, color: ds.inkSecondary, marginTop: 3 }}>
                  {tarea.series ? `${tarea.series} × ` : ""}
                  {tarea.cantidad} {tarea.unidad}
                  {tarea.unilateral ? " · cada lado" : ""}
                  {tarea.modoCarga === "pct1rm" && tarea.pct1rmObjetivo != null ? (
                    <span style={{ color: ds.accent, fontWeight: 700 }}> · {tarea.pct1rmObjetivo}% 1RM</span>
                  ) : (
                    tarea.rirObjetivo != null && <span style={{ color: ds.accent, fontWeight: 700 }}> · RIR {tarea.rirObjetivo}</span>
                  )}
                  {/* En modo %1RM la carga sugerida ES el objetivo a levantar, no
                      un dato secundario — se ve directamente sin desplegar la
                      tarjeta, a diferencia de la referencia por RIR. */}
                  {tarea.modoCarga === "pct1rm" && tarea.cargaSugeridaPct1rm != null && (
                    <div style={{ color: ds.ink, fontWeight: 700, marginTop: 2 }}>Carga recomendada: ~{tarea.cargaSugeridaPct1rm} kg</div>
                  )}
                  {tarea.modoCarga === "pct1rm" && tarea.pct1rmObjetivo != null && tarea.cargaSugeridaPct1rm == null && (
                    <div style={{ color: ds.inkMuted, marginTop: 2 }}>Sin datos suficientes para estimar tu 1RM todavía</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {puedeDesplegar && (
          <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: expandido ? ds.accent : ds.inkMuted, transition: "color 140ms ease-out" }}>
            <Pencil size={13} />
          </span>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <DsToggle on={hecho} onClick={onToggle} label={`Marcar "${tarea.nombre}" como hecha`} />
        </div>
      </div>
      {mostrarFormulario && !tarea.esResistencia && !tarea.esCmj && (() => {
        // Si no hay marca con este mismo diseño (reps/RIR), se muestra
        // igualmente la más reciente con otro diseño, dejándolo claro, en
        // vez de "sin registro" solo porque cambió el RIR — y, en ese caso,
        // una carga sugerida para el diseño de hoy (ver calcularCargaSugerida).
        const subtipoEquipoValido = tarea.eligeEquipo && registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo);
        const referenciaTexto = tarea.eligeEquipo ? (subtipoEquipoValido ? tarea.referenciasPorEquipo?.[registro.subtipo] : null) : tarea.referencia;
        const mismoDiseno = tarea.eligeEquipo ? tarea.referenciasPorEquipoMismoDiseno?.[registro.subtipo] : tarea.referenciaMismoDiseno;
        const cargaSugerida = tarea.eligeEquipo ? tarea.cargasSugeridasPorEquipo?.[registro.subtipo] : tarea.cargaSugerida;
        const sufijoEquipo = tarea.eligeEquipo ? ` (${registro.subtipo})` : "";
        return (
          <div style={{ fontSize: 11.5, color: ds.inkMuted, marginLeft: 55, display: "flex", flexDirection: "column", gap: 2 }}>
            <div>
              {tarea.eligeEquipo && !subtipoEquipoValido
                ? "Elige qué material vas a utilizar"
                : referenciaTexto
                ? `${mismoDiseno ? "Última vez" : "Tu referencia más reciente"}${sufijoEquipo}: ${referenciaTexto}`
                : tarea.eligeEquipo
                ? `Sin registro previo con ${registro.subtipo}`
                : "Sin registro previo"}
            </div>
            {cargaSugerida != null && (
              <div style={{ color: ds.accent, fontWeight: 600 }}>Carga recomendada: ~{cargaSugerida} kg</div>
            )}
          </div>
        );
      })()}
      {tarea.materiales && tarea.materiales.length > 0 && (
        <div style={{ marginLeft: 55, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tarea.materiales.map((m) => (
            <DsBadge key={m} tone="accent">{m}</DsBadge>
          ))}
        </div>
      )}
      {tarea.nota && (
        <div style={{ marginLeft: 55, display: "flex", gap: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "8px 10px" }}>
          <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={12} /></span>
          <span style={{ fontSize: 12, color: ds.inkSecondary, lineHeight: 1.4 }}>{tarea.nota}</span>
        </div>
      )}
      {mostrarFormulario && tarea.esResistencia && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 55 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "completo", label: "Cumplido completo" },
              { v: "parcial", label: "Hice menos" },
            ].map((op) => (
              <ChipSeleccionableReal key={op.v} activo={(registro.subtipo || "completo") === op.v} onClick={() => onCambiarRegistro({ ...registro, subtipo: op.v })}>
                {op.label}
              </ChipSeleccionableReal>
            ))}
          </div>
          {registro.subtipo === "parcial" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <EtiquetaCampoReal>¿CUÁNTO HAS HECHO?</EtiquetaCampoReal>
              <DsInput
                value={registro.carga}
                onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
                placeholder="ej. 2 de 3 series, 8 min..."
                style={{ padding: "9px 11px", fontSize: 13 }}
              />
            </label>
          )}
        </div>
      )}
      {mostrarFormulario && !tarea.esResistencia && !tarea.esCmj && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 55 }}>
          {tarea.eligeEquipo && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <EtiquetaCampoReal color={ds.accent}>¿QUÉ MATERIAL VAS A UTILIZAR?</EtiquetaCampoReal>
              <div style={{ display: "flex", gap: 6 }}>
                {(tarea.equiposElegibles || []).map((op) => (
                  <ChipSeleccionableReal key={op} activo={registro.subtipo === op} onClick={() => onCambiarRegistro({ ...registro, subtipo: op })}>
                    {op}
                  </ChipSeleccionableReal>
                ))}
              </div>
            </div>
          )}
          {tarea.esCorporal && (
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { v: "", label: "Corporal" },
                { v: "asistencia", label: "Con asistencia" },
                { v: "lastre", label: "Con lastre" },
              ].map((op) => (
                <ChipSeleccionableReal key={op.v || "corporal"} activo={(registro.subtipo || "") === op.v} onClick={() => onCambiarRegistro({ ...registro, subtipo: op.v, carga: "" })}>
                  {op.label}
                </ChipSeleccionableReal>
              ))}
            </div>
          )}
          <div style={{ background: ds.bgElevated, borderRadius: dsR.lg, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <EtiquetaCampoReal>Registra tu carga máxima del día</EtiquetaCampoReal>
            <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                <EtiquetaCampoReal>{(tarea.unidad || "reps").toUpperCase()}</EtiquetaCampoReal>
                <input
                  value={registro.reps}
                  onChange={(e) => onCambiarRegistro({ ...registro, reps: e.target.value })}
                  placeholder="—"
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.border}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                />
              </label>
              <div style={{ width: 1, background: ds.border, margin: "0 12px" }} />
            {registro.subtipo === "asistencia" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1.3 }}>
                <EtiquetaCampoReal>BANDA</EtiquetaCampoReal>
                <div style={{ display: "flex", gap: 5, paddingTop: 4 }}>
                  {["Ligera", "Media", "Dura"].map((r) => (
                    <ChipSeleccionableReal key={r} activo={registro.carga === r} onClick={() => onCambiarRegistro({ ...registro, carga: r })}>
                      {r}
                    </ChipSeleccionableReal>
                  ))}
                </div>
              </label>
            ) : tarea.esCorporal && registro.subtipo === "" ? (
              <div style={{ flex: 1.3 }} />
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1.3 }}>
                <EtiquetaCampoReal>
                  {registro.subtipo === "lastre"
                    ? "KG LASTRE"
                    : tarea.eligeEquipo
                    ? registro.subtipo && tarea.equiposElegibles?.includes(registro.subtipo)
                      ? `KG (${registro.subtipo.toUpperCase()})`
                      : "CARGA KG"
                    : tarea.equipoUnico
                    ? `KG (${tarea.equipoUnico.toUpperCase()})`
                    : "CARGA KG"}
                </EtiquetaCampoReal>
                <input
                  value={registro.carga}
                  onChange={(e) => onCambiarRegistro({ ...registro, carga: e.target.value })}
                  placeholder="—"
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.accent}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                />
              </label>
            )}
              {tarea.pideRir !== false && (
                <>
                  <div style={{ width: 1, background: ds.border, margin: "0 12px" }} />
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <EtiquetaCampoReal>RIR</EtiquetaCampoReal>
                    <input
                      value={registro.rir}
                      onChange={(e) => onCambiarRegistro({ ...registro, rir: e.target.value })}
                      placeholder="—"
                      style={{ background: "transparent", border: "none", borderBottom: `2px solid ${ds.border}`, color: ds.ink, fontFamily: dsF.mono, fontSize: 17, fontWeight: 700, padding: "2px 0 6px", textAlign: "center", outline: "none", width: "100%" }}
                    />
                  </label>
                </>
              )}
            </div>
            {tarea.pideRir === false && (
              // Carga ligera (<65% 1RM): a esa intensidad el RIR autopercibido
              // pierde fiabilidad, así que no se le pide al jugador. La carga
              // sugerida ya viene calculada a partir de su 1RM estimado.
              <div style={{ fontSize: 11, color: ds.inkMuted }}>Carga ligera: no hace falta indicar RIR</div>
            )}
          </div>
        </div>
      )}
    </DsCard>
  );
}

function CircuitoJugadorReal({ tareas, rondas = 1, hechoDraft, onToggle, getRegistro, onCambiarRegistro, onAmpliarGif, mostrarRegistro = true }) {
  return (
    <div style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.xl, padding: 14, display: "flex", flexDirection: "column", gap: 12, background: `${ds.surface}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 2 }}>
        <DsBadge tone="accent">CIRCUITO</DsBadge>
        <span style={{ fontSize: 11, color: ds.inkMuted }}>seguir orden</span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: dsF.mono,
            fontSize: 11,
            fontWeight: 700,
            color: ds.accent,
            background: ds.accentSubtle,
            border: `1px solid ${ds.accentBorderSubtle}`,
            borderRadius: dsR.sm,
            padding: "3px 8px",
          }}
        >
          {rondas} {rondas === 1 ? "RONDA" : "RONDAS"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tareas.map((t, i) => (
          <TareaCardReal
            key={t.id}
            tarea={t}
            orden={i + 1}
            hecho={!!hechoDraft[t.id]}
            onToggle={() => onToggle(t)}
            registro={getRegistro(t.id)}
            onCambiarRegistro={(val) => onCambiarRegistro(t.id, val)}
            onAmpliarGif={() => {
              const v = videoEfectivoTarea(t, getRegistro(t.id));
              if (v) onAmpliarGif(v);
            }}
            mostrarRegistro={mostrarRegistro}
          />
        ))}
      </div>
    </div>
  );
}

// Barra de navegación inferior del jugador — flotante, separada de los tres
// bordes (no incrustada a ras de pantalla), con esquinas redondeadas y
// sombra, y un resalte redondeado detrás del icono activo — igual que la
// referencia (My Jump Lab) que enseñó David, no la versión "a ras" de la
// primera pasada. Solo se usa dentro de PantallaJugadorReal — no toca
// PantallaBase ni ninguna pantalla de entrenador.
//
// Adaptación a iOS: el margen inferior sale de env(safe-area-inset-bottom)
// para no quedar tapada por (ni pegada a) la barra de gestos del home de
// iPhone. Esto SOLO funciona si el <meta name="viewport"> de index.html
// incluye viewport-fit=cover — si no lo tiene, env() siempre devuelve 0 y la
// barra se ve bien mientras no revisemos ese archivo aparte (no vive en
// App.jsx, lo edita David directamente). El wrapper exterior no bloquea
// toques fuera de la píldora (pointerEvents: "none", solo la píldora en sí
// los recibe) para no interferir con el contenido de detrás.
const PLAYER_TAB_ICONS = { dashboard: Home, progreso: TrendingUp, cmj: Activity };

function BarraInferiorJugadorReal({ tabs, active, onChange }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px calc(16px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 420,
          display: "flex",
          background: ds.bgElevated,
          border: `1px solid ${ds.border}`,
          borderRadius: 26,
          boxShadow: dsSh.elevation3,
          padding: 6,
        }}
      >
        {tabs.map((t) => {
          const Icono = PLAYER_TAB_ICONS[t.id];
          const activo = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={activo ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: activo ? ds.accentSubtle : "transparent",
                border: "none",
                borderRadius: 20,
                padding: "8px 4px 7px",
                color: activo ? ds.accent : ds.inkMuted,
                cursor: "pointer",
              }}
            >
              {Icono && <Icono size={19} strokeWidth={activo ? 2.4 : 2} />}
              <span style={{ fontSize: 10, fontWeight: activo ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PantallaJugadorReal({ presetPlayerId, onExit }) {
  const [players, , playersLoaded] = usePlayers();
  const player = players.find((p) => p.id === presetPlayerId) || null;
  const date = todayStr();

  // Antes: 3 peticiones en cadena (sesiones -> tareas -> ejercicios/
  // circuitos), cada una esperando a que resolviera la anterior. Ahora: 1
  // sola petición que ya trae las 4 cosas juntas, resueltas dentro de la
  // misma ejecución de Apps Script.
  const { loaded: bootstrapLoaded, sesiones: sesionesBootstrap, tareas: tareasBootstrap, ejercicios, circuitos, proximaSesion } = useBootstrapJugador(player?.id, date);
  // Defensa igual que en el resto de la app: no fiarse de que el filtrado
  // del backend sea correcto, se re-aplica aquí siempre.
  const todaySesiones = player
    ? sesionesBootstrap.filter((s) => s.enviada && (s.fechas || []).includes(date) && (!s.jugadores_destino || !s.jugadores_destino.length || s.jugadores_destino.includes(player.id)))
    : [];
  const sesionIds = todaySesiones.map((s) => s.id);
  const sesionIdsSet = new Set(sesionIds);
  const tareas = tareasBootstrap.filter((t) => sesionIdsSet.has(t.sesion_id));
  const tareaIds = tareas.map((t) => t.id);
  // Filtrado en el propio backend por jugador — mucho más rápido que traer
  // toda la tabla de Registros del equipo entero cada vez que se abre esta
  // pantalla.
  const [registrosJugador, saveRegistrosJugador, registrosLoaded] = useEntityList("registros", player ? { jugador_id: player.id } : false);
  // OJO: nunca fiarse de que el backend filtre de verdad por jugador_id — se
  // ha confirmado que no lo hace (devuelve la tabla entera). Filtramos aquí
  // siempre, sea cual sea el comportamiento real del backend en cada momento.
  const registros =
    player && tareaIds.length ? registrosJugador.filter((r) => r.jugador_id === player.id && tareaIds.includes(r.tarea_id)) : [];
  const registrosByTarea = new Map(registros.map((r) => [r.tarea_id, r]));
  const { loaded: historyLoaded, items: historyItems } = usePlayerHistory(player?.id);

  // Adherencia semanal para la cabecera del dashboard (P5 — Fase 3): mismo
  // cálculo que ya usa el entrenador en ResumenFichaJugadorReal
  // (calcularAdherencia sobre fechasAsignadas), no una métrica nueva. Hace
  // falta el programa completo (no solo el bootstrap de hoy) para saber qué
  // fechas de la semana tenían sesión asignada.
  const { sesiones: sesionesProgramacion } = useBootstrapProgramacion();

  // Datos reales de salto (altura/potencia/fuerza/velocidad), vinculados por
  // jugador_id — el mismo pipeline que ya usa el entrenador en la ficha de
  // jugador (CmjFichaJugadorReal): no se recalcula nada nuevo, se reutiliza
  // cmjBuildPlayers para tener la comparación "mismo día de medida, ciclo
  // anterior" ya validada ahí, en vez de reinventar el cálculo aquí.
  const [cmjSaltos, setCmjSaltos] = useState([]);
  const [cmjMicrociclos, setCmjMicrociclos] = useState([]);
  useEffect(() => {
    let cancelled = false;
    if (!player?.id) return;
    Promise.all([
      supabase.from("cmj_saltos").select("*").eq("jugador_id", player.id),
      supabase.from("cmj_microciclos").select("*"),
    ]).then(([saltosRes, microRes]) => {
      if (cancelled) return;
      setCmjSaltos(saltosRes.error ? [] : saltosRes.data || []);
      setCmjMicrociclos(microRes.error ? [] : microRes.data || []);
    });
    return () => { cancelled = true; };
  }, [player?.id]);

  // Cuando hoy hay más de una sesión distinta enviada a este jugador, se
  // tratan como unidades independientes — cada una con su propio progreso y
  // su propio envío — en vez de mezclar sus tareas en una sola lista donde
  // enviar una bloqueaba también la otra sin haberse tocado.
  const [sesionSeleccionadaId, setSesionSeleccionadaId] = useState(null);
  // "dashboard" es ahora la pantalla de entrada — antes se entraba directo
  // en "hoy". "sesion" es la antigua pestaña "Hoy", a la que solo se llega
  // pulsando "Ver sesión" desde el dashboard. "cmj" es nueva.
  const [vistaJugador, setVistaJugador] = useState("dashboard");
  const sesionActual = todaySesiones.length === 1 ? todaySesiones[0] : todaySesiones.find((s) => s.id === sesionSeleccionadaId) || null;
  const necesitaElegirSesion = todaySesiones.length > 1 && !sesionActual;
  const estadoPorSesion = todaySesiones.map((s) => {
    const idsS = tareas.filter((t) => t.sesion_id === s.id).map((t) => t.id);
    const hechas = idsS.filter((id) => registrosByTarea.has(id)).length;
    return { sesion: s, total: idsS.length, hechas, completa: idsS.length > 0 && hechas === idsS.length };
  });

  const [registrosDraft, setRegistrosDraft] = useState({});
  const [hechoDraft, setHechoDraft] = useState({}); // solo local hasta confirmar envío
  const [gifAmpliado, setGifAmpliado] = useState(null);
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  // P6: ids de tareas cuyo aviso puntual de "nuevo récord" ya se ha
  // descartado a mano en esta sesión — el halo/badge de la tarea se queda
  // igualmente, solo se oculta el aviso.
  const [recordsDescartados, setRecordsDescartados] = useState([]);

  if (!playersLoaded) return <LoadingBlock />;
  if (!player) {
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>No se encontró tu perfil.</div>
          <DsButton onClick={onExit}>Volver al portal</DsButton>
        </div>
      </PantallaBase>
    );
  }
  // Comprobación de refuerzo: si te suspenden mientras ya tenías la app
  // abierta, esto te saca en cuanto los datos del roster se refresquen —
  // no hace falta esperar a un cierre y una nueva entrada por el portal.
  if (player.estado === "suspendido") {
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ textAlign: "center", maxWidth: 260 }}>
          <div style={{ marginBottom: 12 }}>Tu acceso está desactivado. Habla con tu entrenador.</div>
          <DsButton onClick={onExit}>Volver al portal</DsButton>
        </div>
      </PantallaBase>
    );
  }

  const loaded = bootstrapLoaded && registrosLoaded && historyLoaded;

  if (loaded && vistaJugador === "sesion" && necesitaElegirSesion) {
    return (
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <button onClick={() => setVistaJugador("dashboard")} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Volver al dashboard
          </button>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>SESIONES DE HOY</div>
            <h1 style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{player.name}</h1>
            <div style={{ fontSize: 12.5, color: ds.inkSecondary, textTransform: "capitalize" }}>{fmtDateLabel(date)} · elige cuál trabajar ahora</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {estadoPorSesion.map(({ sesion, total, hechas, completa }) => (
              <DsCard key={sesion.id} interactive onClick={() => setSesionSeleccionadaId(sesion.id)} style={{ textAlign: "left", padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>{sesion.objetivo || sesion.md || "Sesión"}</span>
                  {completa && <DsBadge tone="success">✓ ENVIADA</DsBadge>}
                </div>
                <span style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkSecondary }}>
                  {total} tarea{total === 1 ? "" : "s"}
                  {hechas > 0 && !completa ? ` · ${hechas}/${total} en progreso` : ""}
                </span>
              </DsCard>
            ))}
          </div>
        </div>
      </PantallaBase>
    );
  }

  const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
  // Si ya hay registros guardados de hoy para las tareas de ESTA sesión en
  // concreto, es que esta sesión ya se confirmó y envió antes — se trata
  // como ya enviada, sin dejar reabrirla. Antes esto miraba las tareas de
  // TODAS las sesiones de hoy juntas, así que enviar una bloqueaba también
  // la otra sin haberse tocado.
  const tareaIdsSesionActual = sesionActual ? tareas.filter((t) => t.sesion_id === sesionActual.id).map((t) => t.id) : [];
  const yaEnviadaAntes = loaded && tareaIdsSesionActual.length > 0 && tareaIdsSesionActual.some((id) => registrosByTarea.has(id));

  // La referencia de "última vez" se guarda por ejercicio + equipo usado —
  // la carga con cada uno de estos no es directamente comparable entre sí
  // (una Barra, un Multipower, una Mancuerna, una Kettlebell, una Máquina o
  // un Trineo no cargan igual aunque el número de kg coincida), así que
  // mezclarlas en el mismo "última vez" confundiría más que ayudar. Cuando
  // una tarea tiene dos o más de estos seleccionados a la vez (el
  // entrenador dejó elegir), lo que de verdad se usó ese día es lo que el
  // jugador marcó (subtipo_corporal, reaprovechado aquí igual que para
  // asistencia/lastre) — no basta con mirar el material de la tarea, porque
  // ese campo dice qué estaba disponible, no cuál se usó.
  // ---- Datos reales para el Dashboard y la pestaña CMJ ----
  // Única fuente: cmj_saltos (el CSV del dispositivo que sube el
  // entrenador). El jugador ya no introduce el salto a mano dentro de una
  // sesión, así que ya no existe un histórico "por sesión" en paralelo —
  // habría dos números de altura distintos conviviendo, y solo uno es el
  // real. Todo (altura, potencia, fuerza, velocidad, récord y comparativas)
  // sale de aquí.
  const filasCmjMotor = cmjSaltos.map((s) => ({
    jugadorId: s.jugador_id,
    nombre: player?.name,
    dateKey: s.fecha,
    date: s.fecha_hora,
    peso: s.peso,
    hp0: s.hp0,
    altura: s.altura,
    fuerza: s.fuerza,
    potencia: s.potencia,
    velocidad: s.velocidad,
    kineticsValid: s.kinetics_valid,
    pesoValid: s.peso_valid,
    hp0Valid: s.hp0_valid,
  }));
  const { players: cmjBuiltPlayers, microList: cmjMicroList } = cmjBuildPlayers(
    filasCmjMotor,
    cmjMicrociclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );
  const cmjPlayer = cmjBuiltPlayers[0] || null;
  const mejorDeMetrica = (metric) => {
    if (!cmjPlayer) return null;
    const valores = cmjPlayer.sorted.map((r) => metric.get(r)).filter((v) => v != null);
    return valores.length ? Math.max(...valores) : null;
  };
  const cmjMejores = cmjPlayer
    ? { altura: mejorDeMetrica(CMJ_METRICS.altura), potenciaRel: mejorDeMetrica(CMJ_METRICS.potenciaRel), fuerzaRel: mejorDeMetrica(CMJ_METRICS.fuerzaRel), velocidad: mejorDeMetrica(CMJ_METRICS.velocidad) }
    : null;
  const ultimoTestCmj = cmjPlayer && cmjPlayer.sorted.length ? cmjPlayer.sorted[cmjPlayer.sorted.length - 1] : null;
  const ultimoTestCmjTag = ultimoTestCmj ? ultimoTestCmj.tag : null;
  // Para la referencia dentro de la tarea de sesión ("Último salto X cm"):
  // el último test ANTES de hoy, no el de hoy mismo si ya se hubiera subido
  // — es una referencia de lo anterior, no el dato que se está a punto de
  // registrar.
  const ultimoTestCmjAntesDeHoy = cmjPlayer
    ? [...cmjPlayer.sorted].filter((r) => r.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null
    : null;
  const cmjComparativaCicloAnterior = ultimoTestCmjTag ? cmjDeltaMismoDiaCicloAnterior(cmjPlayer, cmjMicroList, ultimoTestCmjTag, CMJ_METRICS.altura) : null;
  const cmjDashboardDelta = ultimoTestCmj
    ? {
        valor: CMJ_METRICS.altura.get(ultimoTestCmj),
        fechaLabel: fmtHaceDias(ultimoTestCmj.date),
        tagLabel: ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : null,
        pct: cmjComparativaCicloAnterior ? cmjComparativaCicloAnterior.pct : null,
        color:
          !cmjComparativaCicloAnterior || cmjComparativaCicloAnterior.pct == null
            ? ds.inkMuted
            : cmjComparativaCicloAnterior.pct > 0
            ? ds.success
            : cmjComparativaCicloAnterior.pct < 0
            ? ds.danger
            : ds.accent,
      }
    : null;

  // "Esta semana destaca" y "récord de carga": ventana corrediza de 7 días
  // naturales (hoy + 6 anteriores) contra los 7 días previos a esa — es
  // nuestra definición de "semana" para este cálculo, no tiene por qué
  // coincidir con tu semana de trabajo real (p. ej. lunes-domingo o tu
  // propio microciclo); si prefieres esa referencia en vez de esta ventana
  // corrediza, se cambia solo aquí.
  const haceDias = (dias) => {
    const d = new Date(date);
    d.setDate(d.getDate() - dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const inicioSemanaActual = haceDias(6);

  // Adherencia esta semana vs. la semana pasada — semana de calendario
  // (lunes-domingo), igual criterio que ResumenFichaJugadorReal, no la
  // ventana corrediza de 7 días que usan mejorasSemana/descensosSemana (son
  // preguntas distintas: "¿cumplo lo que me mandan?" vs. "¿progreso en cada
  // ejercicio?").
  const lunesSemana = inicioSemanaCalendario(date);
  const lunesSemanaAnterior = sumarDiasFecha(lunesSemana, -7);
  const domingoSemanaAnterior = sumarDiasFecha(lunesSemana, -1);
  const fechasConRegistro = new Set(historyItems.map((it) => it.date));
  const fechasAsignadasJugador = (desde, hasta) => {
    if (!player) return [];
    const fechas = [];
    sesionesProgramacion
      .filter((s) => s.enviada)
      .forEach((s) => {
        const incluyeAJugador = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino.includes(player.id) : player.estado === "activo";
        if (!incluyeAJugador) return;
        (s.fechas || []).forEach((f) => {
          if (f >= desde && f <= hasta) fechas.push(f);
        });
      });
    return fechas;
  };
  const calcularAdherenciaJugador = (fechas) => {
    if (!fechas.length) return null;
    const cumplidas = fechas.filter((f) => fechasConRegistro.has(f)).length;
    return Math.round((cumplidas / fechas.length) * 100);
  };
  // OJO: el límite superior es HOY, no el domingo de la semana — igual
  // criterio que ResumenFichaJugadorReal (fechasAsignadas(lunes, hoy)). Si se
  // usara el domingo, a mitad de semana se contarían como "pendientes"
  // sesiones que todavía no han llegado, y el jugador vería una adherencia
  // baja aunque hubiera cumplido el 100% de lo que ya tocaba hasta hoy.
  const adherenciaSemanaActual = calcularAdherenciaJugador(fechasAsignadasJugador(lunesSemana, date));
  const adherenciaSemanaAnterior = calcularAdherenciaJugador(fechasAsignadasJugador(lunesSemanaAnterior, domingoSemanaAnterior));
  const deltaAdherenciaSemana = adherenciaSemanaActual != null && adherenciaSemanaAnterior != null ? adherenciaSemanaActual - adherenciaSemanaAnterior : null;

  // Paso 2 (calendario semanal, versión mínima): qué días concretos de esta
  // semana tienen sesión pautada para este jugador, y su estado — no solo el
  // % agregado. "L M X J V S D", lunes-domingo, igual semana que la
  // adherencia de arriba.
  const DIAS_SEMANA_ETIQUETA = ["L", "M", "X", "J", "V", "S", "D"];
  const diasSemana = DIAS_SEMANA_ETIQUETA.map((etiqueta, i) => {
    const fecha = sumarDiasFecha(lunesSemana, i);
    const pautado = fechasAsignadasJugador(fecha, fecha).length > 0;
    const cumplido = fechasConRegistro.has(fecha);
    const esHoy = fecha === date;
    const esFuturo = fecha > date;
    let estado = "sin-sesion";
    if (pautado) {
      if (cumplido) estado = "cumplido";
      else if (esHoy) estado = "hoy";
      else if (esFuturo) estado = "futuro";
      else estado = "pendiente"; // pautado, ya pasó, no se hizo
    }
    return { fecha, etiqueta, pautado, estado, esHoy };
  });

  const registrosConCarga = historyItems.filter((it) => it.done && !it.esResistencia && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null);

  // Récord de carga: se agrupa por NOMBRE de ejercicio (no por diseño exacto
  // de tarea) porque un PR es del ejercicio, no de una variante concreta de
  // reps/RIR — y se destaca el PR más reciente, con el % sobre el máximo
  // anterior a ese PR: 110kg de sentadilla no es "más logro" que 90kg de
  // press banca, así que el kg en bruto no es comparable entre ejercicios,
  // el % sobre el propio récord anterior sí.
  const registrosPorEjercicio = new Map();
  registrosConCarga.forEach((it) => {
    if (!registrosPorEjercicio.has(it.name)) registrosPorEjercicio.set(it.name, []);
    registrosPorEjercicio.get(it.name).push(it);
  });
  let recordCarga = null;
  registrosPorEjercicio.forEach((regs, nombre) => {
    const ordenados = [...regs].sort((a, b) => Number(b.cargaReal) - Number(a.cargaReal));
    const maxActual = ordenados[0];
    const maxAnterior = ordenados.find((it) => it.id !== maxActual.id && Number(it.cargaReal) < Number(maxActual.cargaReal));
    const pctSobreAnterior = maxAnterior ? ((Number(maxActual.cargaReal) - Number(maxAnterior.cargaReal)) / Number(maxAnterior.cargaReal)) * 100 : null;
    if (!recordCarga || maxActual.date > recordCarga.fecha) {
      recordCarga = { nombre, valor: Number(maxActual.cargaReal), fecha: maxActual.date, pctSobreAnterior };
    }
  });

  // P6 — récord en vivo: el mejor valor de carga ya registrado (antes de
  // hoy) por ejercicio, para poder avisar al jugador EN EL MOMENTO en que
  // supera su marca dentro de la propia sesión, sin esperar a que se envíe
  // ni a que aparezca en el resumen del dashboard.
  const mejorHistoricoPorNombre = new Map();
  registrosPorEjercicio.forEach((regs, nombre) => {
    mejorHistoricoPorNombre.set(nombre, Math.max(...regs.map((it) => Number(it.cargaReal))));
  });

  // Modo %1RM: cuando el entrenador pauta la tarea como porcentaje del 1RM
  // en vez de por RIR, hace falta un 1RM estimado (e1RM) del jugador para
  // ese ejercicio. Se calcula el e1RM implícito de CADA marca histórica
  // (carga / %1RM de su propio RTF, ver pct1RMporRTF) y se toma el mayor —
  // es la mejor estimación disponible con los datos que hay, igual que un
  // e1RM calculado a partir de cualquier serie con reps y RIR conocidos.
  // Agrupado solo por nombre de ejercicio (no por material), mismo criterio
  // que mejorHistoricoPorNombre / el récord de carga.
  const mejorE1rmPorNombre = new Map();
  registrosPorEjercicio.forEach((regs, nombre) => {
    const e1rms = regs
      .map((it) => {
        const reps = Number(it.repsReal);
        const rir = it.rirReal !== "" && it.rirReal != null ? Number(it.rirReal) : null;
        const carga = Number(it.cargaReal);
        if (!carga || Number.isNaN(carga) || Number.isNaN(reps) || rir == null || Number.isNaN(rir)) return null;
        if (reps > REPS_MAX_RIR_FIABLE) return null;
        const pct = pct1RMporRTF(reps + rir);
        return pct ? carga / pct : null;
      })
      .filter((v) => v != null);
    if (e1rms.length) mejorE1rmPorNombre.set(nombre, Math.max(...e1rms));
  });

  // Cambios de carga esta semana frente a la propia media histórica de cada
  // tarea, agrupando por diseño exacto (ejercicio + material + lateralidad +
  // reps + RIR objetivo — igual criterio que cambioPctPorId en el
  // historial). No nos quedamos solo con el mayor: se guardan todos los
  // deltas (positivos, negativos y empatados) para poder mostrar el mayor de
  // cada signo + cuántos más se movieron en la misma dirección, en vez de
  // una tendencia por zona corporal que mezclaba ejercicios distintos.
  const historialPorClave = new Map();
  registrosConCarga.forEach((it) => {
    const clave = claveDisenoTarea(it.name, materialEfectivo(it), it.unilateral, it.reps, it.rir);
    if (!historialPorClave.has(clave)) historialPorClave.set(clave, []);
    historialPorClave.get(clave).push(it);
  });
  const cambiosSemana = [];
  historialPorClave.forEach((regs) => {
    const deEstaSemana = regs.filter((it) => it.date >= inicioSemanaActual);
    const deAntes = regs.filter((it) => it.date < inicioSemanaActual);
    if (!deEstaSemana.length || !deAntes.length) return;
    const mediaAntes = deAntes.reduce((s, it) => s + Number(it.cargaReal), 0) / deAntes.length;
    if (mediaAntes <= 0) return;
    const ultimoEstaSemana = [...deEstaSemana].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const pct = ((Number(ultimoEstaSemana.cargaReal) - mediaAntes) / mediaAntes) * 100;
    cambiosSemana.push({ nombre: ultimoEstaSemana.name, pct });
  });
  const mejorasSemana = cambiosSemana.filter((c) => c.pct > 0).sort((a, b) => b.pct - a.pct);
  const descensosSemana = cambiosSemana.filter((c) => c.pct < 0).sort((a, b) => a.pct - b.pct);
  const sinCambioSemana = cambiosSemana.filter((c) => c.pct === 0);

  // Referencia de "última vez que hice esto": se busca primero por diseño
  // EXACTO (mismas reps/RIR objetivo) porque es la comparación más fiel,
  // pero si el entrenador cambia el RIR o las reps de una semana a otra
  // (algo habitual al periodizar) esa clave exacta no existe todavía y el
  // jugador se quedaba sin ninguna referencia aunque tenga historial de
  // sobra con ese ejercicio. lastValueByExercise es el resultado más
  // reciente para el mismo ejercicio + material + lateralidad, sea cual sea
  // el diseño — sirve de respaldo, y como el texto que se muestra incluye
  // siempre las reps/RIR de esa marca (ver formatearReferencia), el jugador
  // ve igualmente con qué reps/RIR se consiguió.
  const lastValueByName = {};
  const lastValueByExercise = {};
  [...historyItems]
    .filter((it) => it.date < date && (it.cargaReal !== "" || it.rirReal !== "" || it.repsReal !== ""))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      const eq = materialEfectivo(it);
      lastValueByName[claveDisenoTarea(it.name, eq, it.unilateral, it.reps, it.rir)] = it;
      lastValueByExercise[`${(it.name || "").toLowerCase()}::${eq}::${it.unilateral ? "uni" : "bi"}`] = it;
    });

  // Resuelve la referencia de un ejercicio+material+lateralidad para el
  // diseño (reps/RIR) de la tarea de hoy: exacta si existe, si no la más
  // reciente con otro diseño. Cuando cae al respaldo (mismoDiseno=false),
  // además calcula una carga sugerida para el diseño de hoy vía RIR/RTF
  // (ver calcularCargaSugerida) — no tiene sentido "sugerir" nada cuando ya
  // hay una marca con el mismo diseño exacto, ahí la referencia ya es
  // directamente aplicable.
  const resolverReferencia = (nombreEj, equipo, unilateral, repsHoy, rirHoy) => {
    const claveExacta = claveDisenoTarea(nombreEj, equipo, unilateral, repsHoy, rirHoy);
    const exacto = lastValueByName[claveExacta];
    if (exacto) return { registro: exacto, mismoDiseno: true, cargaSugerida: null };
    const fallback = lastValueByExercise[`${(nombreEj || "").toLowerCase()}::${equipo}::${unilateral ? "uni" : "bi"}`];
    return {
      registro: fallback || null,
      mismoDiseno: false,
      cargaSugerida: fallback ? calcularCargaSugerida(fallback, repsHoy, rirHoy) : null,
    };
  };

  // Última vez que esta misma tarea se hizo con peso corporal, qué eligió el
  // jugador (corporal puro / con asistencia / con lastre) — o, si la tarea
  // dejaba elegir entre varios equipos, cuál usó — para preseleccionarlo
  // solo y que no tenga que volver a elegirlo cada vez que se repita.
  const lastSubtipoByName = {};
  [...historyItems]
    .filter((it) => it.date < date && it.subtipoCorporal)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((it) => {
      lastSubtipoByName[(it.name || "").toLowerCase()] = it.subtipoCorporal;
    });

  // Cada elemento de un bloque es { tipo: "suelta", tarea } o
  // { tipo: "circuito", circuitoId, tareas: [...] } — así el jugador ve
  // los circuitos agrupados y numerados en vez de mezclados sueltos.
  const bloques = {};
  const circuitosById = new Map(circuitos.map((c) => [c.id, c]));
  const circuitoBuffer = {}; // circuito_id -> { nombreBloque, tareas: [...] }

  const formatearReferencia = (lv) =>
    lv
      ? `${lv.repsReal !== "" && lv.repsReal != null ? `${lv.repsReal} ${lv.unidad || "reps"} · ` : ""}${
          lv.subtipoCorporal === "asistencia" ? `banda ${lv.cargaReal || "—"}` : `${lv.cargaReal || "—"}kg${lv.subtipoCorporal && !EQUIPOS_AMBIGUOS.includes(lv.subtipoCorporal) ? ` (${lv.subtipoCorporal})` : ""}`
        }${lv.rirReal !== "" && lv.rirReal != null ? ` · RIR${lv.rirReal}` : ""}`
      : null;

  const construirTareaVisual = (t) => {
    const e = ejerciciosById.get(t.ejercicio_id) || {};
    const materiales = parseMateriales(t.material);
    const equiposEnTarea = materiales.filter((m) => EQUIPOS_AMBIGUOS.includes(m));
    const equipoUnico = equiposEnTarea.length === 1 ? equiposEnTarea[0] : null;
    const eligeEquipo = equiposEnTarea.length >= 2;
    const esCorporal = (t.tipo_resistencia || "") === "Peso corporal";
    const esResistencia = t.bloque_sesion === "Resistencia";
    const resistencia = esResistencia ? parseResistenciaData(t.resistencia_data) : null;
    const nombre = e.nombre || "";
    return {
      id: t.id,
      nombre: e.nombre || "(ejercicio eliminado)",
      series: t.series,
      cantidad: t.cantidad,
      rirObjetivo: t.rir !== "" && t.rir != null ? t.rir : null,
      unidad: UNIDAD_POR_MODO[t.modo] || "reps",
      nota: t.nota || "",
      // Alternativa al RIR para pautar la carga: un % directo del 1RM
      // estimado del jugador, para las cargas ligeras donde el RIR deja de
      // ser una herramienta fiable (por debajo de ~10 reps hasta el fallo /
      // ~75% 1RM la relación reps-%1RM ya no es lineal ni la autopercepción
      // del RIR es precisa — ver conversación). Se calcula sobre
      // mejorE1rmPorNombre, el mejor e1RM estimado de ESTE jugador para
      // este ejercicio a partir de su propio historial.
      modoCarga: !esResistencia && t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
      pct1rmObjetivo: !esResistencia && t.pct1rm !== "" && t.pct1rm != null ? Number(t.pct1rm) : null,
      cargaSugeridaPct1rm:
        !esResistencia && t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null && mejorE1rmPorNombre.has(nombre)
          ? Math.round(((mejorE1rmPorNombre.get(nombre) * Number(t.pct1rm)) / 100 / 2.5)) * 2.5
          : null,
      // A menos del 65% del 1RM el RIR autopercibido deja de ser fiable (a
      // esa intensidad el fallo está muy lejos y cuesta "sentir" cuántas
      // repeticiones quedan en la recámara), así que en cargas por %1RM por
      // debajo de ese umbral no se le pide RIR al jugador.
      pideRir: !(!esResistencia && t.modo_carga === "pct1rm" && t.pct1rm !== "" && t.pct1rm != null && Number(t.pct1rm) < 65),
      // Vídeo por variante (material + modo): si hay uno grabado para la
      // combinación exacta, se usa; si no, cae al vídeo genérico del
      // ejercicio. Cuando la tarea deja elegir material, no se fija un solo
      // "gif" — se calcula uno por cada equipo posible y se revela al elegir
      // (ver videoEfectivoTarea).
      gif: eligeEquipo ? e.gif_url || "" : e.videos_variantes?.[claveVideoVariante(equipoUnico || "std", t.lateralidad === "unilateral")] || e.gif_url || "",
      videosPorEquipo: eligeEquipo
        ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, e.videos_variantes?.[claveVideoVariante(eq, t.lateralidad === "unilateral")] || e.gif_url || ""]))
        : null,
      materiales,
      equipoUnico,
      esCorporal,
      esResistencia,
      objetivoResistencia: esResistencia ? formatearObjetivoResistencia(resistencia) : null,
      unilateral: t.lateralidad === "unilateral",
      esCmj: t.bloque_sesion === "CMJ",
      // El MD de la sesión de hoy no importa aquí — se recuerda el último
      // test CMJ del CSV, sea de cuando sea, con su día de medida entre
      // paréntesis. Ya no es un dato que metiera el jugador: es solo
      // contexto de lo último que se le midió con el dispositivo.
      referenciaCmj:
        t.bloque_sesion === "CMJ" && ultimoTestCmjAntesDeHoy
          ? { md: ultimoTestCmjAntesDeHoy.tag && CMJ_TAG_META[ultimoTestCmjAntesDeHoy.tag] ? CMJ_TAG_META[ultimoTestCmjAntesDeHoy.tag].label : "", altura: CMJ_METRICS.altura.get(ultimoTestCmjAntesDeHoy) }
          : null,
      // Ahora que Activación admite cualquier ejercicio de la biblioteca (no
      // solo la bici estática), ya no se asume automáticamente por bloque —
      // depende solo de si el propio ejercicio se marcó como "sin lateralidad".
      mostrarLateralidad: e.sin_lateralidad !== "si",
      eligeEquipo,
      equiposElegibles: eligeEquipo ? equiposEnTarea : null,
      subtipoDefault: esCorporal || eligeEquipo ? lastSubtipoByName[nombre.toLowerCase()] || "" : "",
      // Si la tarea deja elegir entre varios equipos, se lleva una referencia
      // por cada uno por separado — la que se muestre depende de qué elija
      // el jugador en pantalla, no de una sola fija de antemano.
      // La clave incluye también modo, reps y RIR objetivo: cambiar el RIR o
      // pasar de bilateral a unilateral cuenta como una tarea distinta, con
      // su propia referencia — solo el número de series (volumen) no la
      // cambia. Si no hay marca con ese diseño exacto, se cae a la última
      // marca de ese mismo ejercicio+material sea cual sea el diseño
      // (mismoDiseno = false), para no dejar al jugador sin ninguna
      // referencia solo porque cambió el RIR o las reps — y en ese caso se
      // añade además una carga sugerida (ver resolverReferencia).
      ...(() => {
        const refPrincipal = eligeEquipo ? null : resolverReferencia(nombre, equipoUnico || "std", t.lateralidad === "unilateral", t.cantidad, t.rir);
        const refsPorEquipo = eligeEquipo
          ? Object.fromEntries(equiposEnTarea.map((eq) => [eq, resolverReferencia(nombre, eq, t.lateralidad === "unilateral", t.cantidad, t.rir)]))
          : null;
        return {
          referencia: refPrincipal ? formatearReferencia(refPrincipal.registro) : null,
          referenciaMismoDiseno: refPrincipal ? refPrincipal.mismoDiseno : null,
          cargaSugerida: refPrincipal ? refPrincipal.cargaSugerida : null,
          referenciasPorEquipo: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, formatearReferencia(r.registro)])) : null,
          referenciasPorEquipoMismoDiseno: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, r.mismoDiseno])) : null,
          cargasSugeridasPorEquipo: refsPorEquipo ? Object.fromEntries(Object.entries(refsPorEquipo).map(([eq, r]) => [eq, r.cargaSugerida])) : null,
        };
      })(),
    };
  };

  tareas
    .filter((t) => (!t.fecha || t.fecha === date) && sesionActual && t.sesion_id === sesionActual.id)
    .forEach((t) => {
      const nombreBloque = t.bloque_sesion || "General";
      const tareaVisual = construirTareaVisual(t);
      if (t.circuito_id && circuitosById.has(t.circuito_id)) {
        if (!circuitoBuffer[t.circuito_id]) circuitoBuffer[t.circuito_id] = { nombreBloque, tareas: [] };
        circuitoBuffer[t.circuito_id].tareas.push({ ...tareaVisual, orden: Number(t.orden_en_circuito) || 999 });
      } else {
        if (!bloques[nombreBloque]) bloques[nombreBloque] = [];
        bloques[nombreBloque].push({ tipo: "suelta", tarea: tareaVisual });
      }
    });

  Object.entries(circuitoBuffer).forEach(([circuitoId, datos]) => {
    if (!bloques[datos.nombreBloque]) bloques[datos.nombreBloque] = [];
    bloques[datos.nombreBloque].push({
      tipo: "circuito",
      circuitoId,
      rondas: circuitosById.get(circuitoId)?.rondas || 1,
      tareas: datos.tareas.sort((a, b) => a.orden - b.orden),
    });
  });

  const todasLasTareas = Object.values(bloques)
    .flat()
    .flatMap((item) => (item.tipo === "circuito" ? item.tareas : [item.tarea]));
  const totalTareas = todasLasTareas.length;
  const totalHechas = todasLasTareas.filter((t) => !!hechoDraft[t.id]).length;

  const tareasVisualesById = new Map(todasLasTareas.map((t) => [t.id, t]));
  const getRegistro = (id) => {
    if (registrosDraft[id]) return registrosDraft[id];
    const t = tareasVisualesById.get(id);
    return { reps: "", carga: "", rir: "", subtipo: t?.subtipoDefault || "" };
  };
  const setRegistroDraft = (id, val) => setRegistrosDraft((prev) => ({ ...prev, [id]: val }));

  // Qué exige cada tipo de tarea, tal como me lo has descrito:
  // - Resistencia y CMJ tienen su propio registro (no reps/carga) -> fuera de esta comprobación.
  // - Corporal con banda de asistencia (resistencia elástica): exige reps, no carga (la banda no es un número de kg).
  // - Corporal con lastre: sí es peso añadido -> exige carga (el lastre) y reps.
  // - Corporal sin equipo (peso del propio cuerpo, sin lastre): no es peso libre -> exige reps, no carga.
  // - Cualquier otra (peso libre, con o sin elegir equipo): exige carga y reps.
  const registroIncompleto = (t) => {
    if (t.esResistencia || t.esCmj) return false;
    const r = getRegistro(t.id);
    if (t.esCorporal) {
      if (r.subtipo === "lastre") return !r.carga || !r.reps;
      return !r.reps;
    }
    return !r.carga || !r.reps;
  };
  const tareasSinRegistroCompleto = todasLasTareas.filter((t) => hechoDraft[t.id] && registroIncompleto(t));


  // Marcar/desmarcar hecho es SOLO local mientras no se confirme el envío —
  // así una tarea tocada pero nunca enviada no genera ningún registro real
  // en el backend, y la sesión no se bloquea para el entrenador antes de
  // tiempo.
  const toggle = (t) => {
    setHechoDraft((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
  };

  const confirmarEnvio = async () => {
    setEnviando(true);
    setErrorEnvio("");
    try {
      const nuevos = todasLasTareas
        .filter((t) => hechoDraft[t.id])
        .map((t) => {
          const draft = getRegistro(t.id);
          return {
            jugador_id: player.id,
            tarea_id: t.id,
            fecha: date,
            hecho: true,
            reps_hechas: draft.reps,
            carga_kg: draft.carga,
            rir: draft.rir,
            subtipo_corporal: draft.subtipo || "",
          };
        });
      // CRÍTICO: si esto falla o se queda a medias (Apps Script atascado,
      // sin conexión...) y no se comprueba, el jugador ve "Sesión enviada"
      // sin que se haya guardado nada de verdad — y el entrenador se queda
      // sin ningún registro sin ninguna pista de qué pasó. Por eso, aquí SÍ
      // se exige que el guardado haya confirmado éxito antes de dar el envío
      // por bueno.
      const ok = nuevos.length ? await saveRegistrosJugador([...registrosJugador, ...nuevos]) : true;
      if (ok) {
        setEnviado(true);
      } else {
        setErrorEnvio("No se pudo enviar. Sigues aquí con tu progreso guardado en pantalla — comprueba tu conexión y vuelve a intentarlo.");
      }
    } finally {
      setEnviando(false);
      setPidiendoConfirmacion(false);
    }
  };

  // Las tres pestañas compartidas entre Dashboard/Progreso/CMJ — "Sesión de
  // hoy" ya no es una pestaña, se abre aparte al pulsar "Ver sesión" desde
  // el Dashboard (ver JugadorHoy/JugadorDashboard del sistema de diseño).
  // Se muestran en BarraInferiorJugadorReal (barra fija abajo), ya no en el
  // DsTabSwitcher de arriba.
  const PLAYER_TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "progreso", label: "Progreso" },
    { id: "cmj", label: "CMJ" },
  ];

  if (vistaJugador === "dashboard") {
    const sesionesEnviadasHoy = todaySesiones.length > 0 && estadoPorSesion.every((e) => e.completa);
    const session = sesionesEnviadasHoy
      ? { status: "completada" }
      : todaySesiones.length > 0
      ? { status: "hoy", tag: todaySesiones.length > 1 ? `${todaySesiones.length} sesiones hoy` : sesionActual?.objetivo || sesionActual?.md, taskCount: tareas.length }
      : proximaSesion
      ? { status: "proxima", dateLabel: fmtDateLabel(proximaSesion.fecha), detail: proximaSesion.sesion.objetivo, mdTag: proximaSesion.sesion.md }
      : { status: "ninguna" };
    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>
                HOY · {fmtDateLabel(date).toUpperCase()}
              </div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 23, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Hola, {player.name}</h1>
              {adherenciaSemanaActual != null && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <DsBadge tone={adherenciaSemanaActual >= 80 ? "success" : adherenciaSemanaActual >= 50 ? "accent" : "danger"}>
                    Adherencia esta semana: {adherenciaSemanaActual}%
                  </DsBadge>
                  {deltaAdherenciaSemana != null && deltaAdherenciaSemana !== 0 && (
                    <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: deltaAdherenciaSemana > 0 ? ds.success : ds.danger }}>
                      {deltaAdherenciaSemana > 0 ? "▲" : "▼"} {Math.abs(deltaAdherenciaSemana)} vs. semana pasada
                    </span>
                  )}
                </div>
              )}
              {diasSemana.some((d) => d.pautado) && (
                <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
                  {diasSemana.map((d) => {
                    const colorFondo =
                      d.estado === "cumplido" ? ds.success : d.estado === "pendiente" ? ds.danger : d.estado === "hoy" ? ds.accent : d.estado === "futuro" ? ds.bgElevated : "transparent";
                    const colorTexto = d.estado === "cumplido" || d.estado === "pendiente" ? ds.accentInk : d.estado === "hoy" ? ds.accentInk : d.estado === "futuro" ? ds.inkSecondary : ds.inkMuted;
                    return (
                      <div
                        key={d.fecha}
                        title={`${fmtDateLabel(d.fecha)}${d.pautado ? (d.estado === "cumplido" ? " · sesión hecha" : d.estado === "hoy" ? " · sesión de hoy" : d.estado === "futuro" ? " · sesión pautada" : " · sesión no hecha") : " · sin sesión"}`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: dsR.full,
                          background: colorFondo,
                          border: d.pautado ? "none" : `1px solid ${ds.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: dsF.mono,
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: d.pautado ? colorTexto : ds.inkMuted,
                        }}
                      >
                        {d.etiqueta}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          <div style={{ marginTop: 20, marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Sesión</div>
          {session.status === "hoy" && (
            <DsCard style={{ borderColor: ds.accentBorderSubtle, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.accentSubtle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.accent }}><Zap size={19} fill={ds.accent} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Tienes una sesión disponible hoy</div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>
                    {session.tag}
                    {session.taskCount != null ? ` · ${session.taskCount} tareas` : ""}
                  </div>
                </div>
              </div>
              <DsButton onClick={() => setVistaJugador("sesion")} style={{ width: "100%", marginTop: 12 }}>
                Ver sesión →
              </DsButton>
            </DsCard>
          )}
          {session.status === "completada" && (
            <DsCard status="done" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: `${ds.success}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.success, fontSize: 18 }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Sesión de hoy enviada</div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>Tu próxima sesión aparecerá aquí cuando toque.</div>
                </div>
              </div>
            </DsCard>
          )}
          {session.status === "proxima" && (
            <DsCard style={{ padding: "14px 16px", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: dsR.md, background: ds.bgElevated, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary }}><Calendar size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                  {session.dateLabel}
                  {session.detail ? ` · ${session.detail}` : ""}
                </div>
                <div style={{ fontSize: 11.5, color: ds.inkMuted, marginTop: 2 }}>Hoy no tienes sesión — esta es la próxima</div>
              </div>
              {session.mdTag && <DsBadge>{session.mdTag}</DsBadge>}
            </DsCard>
          )}
          {session.status === "ninguna" && (
            <div style={{ background: ds.surface, border: `1px dashed ${ds.border}`, borderRadius: dsR.lg, padding: 16, textAlign: "center", color: ds.inkMuted, fontSize: 13 }}>
              Aún no tienes sesiones disponibles. Cuando tu entrenador publique una, aparecerá aquí.
            </div>
          )}

          {(recordCarga || (cmjMejores && cmjMejores.altura != null)) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Tus récords</div>
              <div style={{ display: "flex", gap: 8 }}>
                {recordCarga && (
                  <div style={{ flex: 1, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                    <Dumbbell size={16} color={ds.accent} strokeWidth={1.75} />
                    <div style={{ fontFamily: dsF.display, fontSize: 19, fontWeight: 700, marginTop: 6 }}>
                      {recordCarga.valor}<span style={{ fontSize: 12.5, fontWeight: 400, color: ds.inkSecondary }}> kg</span>
                    </div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginTop: 2 }}>{recordCarga.nombre} · récord</div>
                    {recordCarga.pctSobreAnterior != null && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, marginTop: 4 }}>
                        +{recordCarga.pctSobreAnterior.toFixed(0)}% sobre tu récord anterior
                      </div>
                    )}
                  </div>
                )}
                {cmjMejores && cmjMejores.altura != null && (
                  <div style={{ flex: 1, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                    <Dumbbell size={16} color={ds.accent} strokeWidth={1.75} />
                    <div style={{ fontFamily: dsF.display, fontSize: 19, fontWeight: 700, marginTop: 6 }}>
                      {cmjMejores.altura.toFixed(1)}<span style={{ fontSize: 12.5, fontWeight: 400, color: ds.inkSecondary }}> cm</span>
                    </div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginTop: 2 }}>Salto CMJ · mejor</div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9, color: ds.inkMuted, marginTop: 4, letterSpacing: "0.02em" }}>
                      P {cmjMejores.potenciaRel != null ? cmjMejores.potenciaRel.toFixed(1) : "—"} · F {cmjMejores.fuerzaRel != null ? cmjMejores.fuerzaRel.toFixed(1) : "—"} · V {cmjMejores.velocidad != null ? cmjMejores.velocidad.toFixed(2) : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mejorasSemana.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <details style={{ background: `${ds.success}1A`, border: `1px solid ${ds.success}55`, borderRadius: dsR.md, padding: "12px 14px" }}>
                <summary style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ color: ds.success, flexShrink: 0 }}>↗</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Mejora destacada</div>
                    <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>
                      {mejorasSemana[0].nombre}: <b style={{ color: ds.success, fontWeight: 700 }}>+{mejorasSemana[0].pct.toFixed(0)}%</b> respecto a tu media reciente.
                    </div>
                    {mejorasSemana.length > 1 && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.success, marginTop: 6 }}>
                        y {mejorasSemana.length - 1} ejercicio{mejorasSemana.length - 1 === 1 ? "" : "s"} más {mejorasSemana.length - 1 === 1 ? "mejoró" : "mejoraron"} esta semana ▾
                      </div>
                    )}
                  </div>
                </summary>
                {mejorasSemana.length > 1 && (
                  <div style={{ margin: "10px 0 0 26px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {mejorasSemana.slice(1).map((c, i) => (
                      <div key={`${c.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: ds.ink }}>{c.nombre}</span>
                        <span style={{ color: ds.success, fontWeight: 600 }}>+{c.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          )}

          {descensosSemana.length > 0 && (
            <div style={{ marginTop: mejorasSemana.length > 0 ? 8 : 20 }}>
              <details style={{ background: `${ds.danger}1A`, border: `1px solid ${ds.danger}55`, borderRadius: dsR.md, padding: "12px 14px" }}>
                <summary style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ color: ds.danger, flexShrink: 0 }}>↘</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Descenso destacado</div>
                    <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>
                      {descensosSemana[0].nombre}: <b style={{ color: ds.danger, fontWeight: 700 }}>{descensosSemana[0].pct.toFixed(0)}%</b> respecto a tu media reciente.
                    </div>
                    {descensosSemana.length > 1 && (
                      <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.danger, marginTop: 6 }}>
                        y {descensosSemana.length - 1} ejercicio{descensosSemana.length - 1 === 1 ? "" : "s"} más {descensosSemana.length - 1 === 1 ? "bajó" : "bajaron"} ▾
                      </div>
                    )}
                  </div>
                </summary>
                {descensosSemana.length > 1 && (
                  <div style={{ margin: "10px 0 0 26px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {descensosSemana.slice(1).map((c, i) => (
                      <div key={`${c.nombre}-${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: ds.ink }}>{c.nombre}</span>
                        <span style={{ color: ds.danger, fontWeight: 600 }}>{c.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          )}

          {mejorasSemana.length === 0 && descensosSemana.length === 0 && sinCambioSemana.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", gap: 10 }}>
                <span style={{ color: ds.accent, flexShrink: 0 }}>–</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Sin cambios esta semana</div>
                  <div style={{ fontSize: 12.5, color: ds.inkSecondary, marginTop: 2, lineHeight: 1.4 }}>{sinCambioSemana[0].nombre}: misma carga que tu media reciente.</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkMuted, textTransform: "uppercase" }}>Salto (CMJ)</div>
            {cmjDashboardDelta ? (
              <div
                onClick={() => setVistaJugador("cmj")}
                style={{ background: `${cmjDashboardDelta.color}1A`, border: `1px solid ${cmjDashboardDelta.color}55`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {cmjDashboardDelta.valor} cm <span style={{ color: ds.inkSecondary, fontWeight: 400, fontSize: 12 }}>· {cmjDashboardDelta.fechaLabel}</span>
                  </div>
                  <div style={{ fontFamily: dsF.mono, fontSize: 10.5, color: cmjDashboardDelta.color, marginTop: 3 }}>
                    {cmjDashboardDelta.pct == null
                      ? "aún sin ciclo anterior con el que comparar"
                      : `${cmjDashboardDelta.pct >= 0 ? "▲" : "▼"} ${Math.abs(cmjDashboardDelta.pct).toFixed(1)}% vs tu último ${cmjDashboardDelta.tagLabel || "test"}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: ds.accent, flexShrink: 0 }}>Ver →</span>
              </div>
            ) : (
              <div style={{ background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px", color: ds.inkMuted, fontSize: 12.5, lineHeight: 1.4 }}>
                Aún no hay tests CMJ vinculados a ti. En cuanto tu entrenador suba un CSV con tus saltos, aparecerán aquí.
              </div>
            )}
          </div>
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="dashboard" onChange={setVistaJugador} />
      </>
    );
  }

  if (vistaJugador === "cmj") {
    // Comparativas de la pestaña, ambas sobre "altura" (la métrica que ya
    // "drivesStatus" como principal en toda la app):
    // 1) dentro del propio microciclo, MD-2/MD+1 contra el Inicio de esa
    //    semana — reutiliza el cálculo que ya hace cmjBuildPlayers para el
    //    entrenador (metrics.altura.md2Delta/md1Delta), no se recalcula.
    // 2) mismo día de medida (p. ej. MD-2 contra MD-2), microciclo anterior
    //    contra el actual — cmjDeltaMismoDiaCicloAnterior, arriba.
    const microActualCmj = cmjPlayer && ultimoTestCmj && ultimoTestCmj.microId != null ? cmjPlayer.microResults.get(ultimoTestCmj.microId) : null;
    const withinCicloDeltaCmj =
      microActualCmj && microActualCmj.metrics && microActualCmj.metrics.altura
        ? ultimoTestCmjTag === "md2"
          ? microActualCmj.metrics.altura.md2Delta
          : ultimoTestCmjTag === "md1"
          ? microActualCmj.metrics.altura.md1Delta
          : null
        : null;

    // Tendencia: solo los puntos con el MISMO día de medida que el último
    // test (p. ej. solo MD-2 de cada microciclo) — comparar entre sí
    // microciclos distintos con el mismo estímulo, no mezclar MD-2 con
    // Inicio en la misma línea.
    const tendenciaMismoDiaCmj = ultimoTestCmjTag
      ? cmjMicroList
          .map((m) => {
            const r = cmjPlayer.microResults.get(m.id);
            const fila = r ? r[ultimoTestCmjTag] : null;
            return fila ? { date: fila.date, valor: CMJ_METRICS.altura.get(fila), rir: "" } : null;
          })
          .filter((p) => p && p.valor != null)
      : [];

    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{player.name}</div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Salto (CMJ)</h1>
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          {cmjPlayer && ultimoTestCmj ? (
            <>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.05em", color: ds.accent, marginTop: 14, marginBottom: 10, textTransform: "uppercase" }}>
                Última medición{ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? ` · ${CMJ_TAG_META[ultimoTestCmjTag].label}` : ""} · {fmtHaceDias(ultimoTestCmj.date)}
              </div>

              {/* 4 tiles con la marca cruda de cada variable + su mejor marca — sin
                  necesitar una tarjeta de PR aparte, cada tile lleva la suya. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {CMJ_METRIC_LIST.map((m) => {
                  const valor = m.get(ultimoTestCmj);
                  const mejor = cmjMejores ? cmjMejores[m.key] : null;
                  const esMejorMarca = valor != null && mejor != null && Math.abs(valor - mejor) < 1e-9;
                  return (
                    <div key={m.key} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px" }}>
                      <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontFamily: dsF.display, fontSize: 20, fontWeight: 700, marginTop: 6 }}>
                        {valor != null ? valor.toFixed(m.decimals) : "—"}
                        <span style={{ fontSize: 12, color: ds.inkSecondary, fontWeight: 400 }}> {m.unit}</span>
                      </div>
                      {esMejorMarca ? (
                        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.success, marginTop: 4 }}>★ Es tu mejor marca</div>
                      ) : (
                        <div style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.accent, marginTop: 4 }}>{mejor != null ? `Mejor: ${mejor.toFixed(m.decimals)} ${m.unit}` : "Sin dato aún"}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dos comparativas, no una — cada una responde una pregunta distinta
                  y mezclarlas en un solo % induce a error (ver mockup/discusión). */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.inkMuted, textTransform: "uppercase" }}>Dentro de ese microciclo</div>
                    <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 3 }}>vs. el Inicio de ese microciclo</div>
                  </div>
                  <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 700, color: ds.inkSecondary }}>
                    {withinCicloDeltaCmj == null ? "—" : `${withinCicloDeltaCmj >= 0 ? "▲" : "▼"} ${Math.abs(withinCicloDeltaCmj).toFixed(1)}%`}
                  </div>
                </div>
                <div style={{ background: `${ds.success}1A`, border: `1px solid ${ds.success}55`, borderRadius: dsR.md, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: dsF.mono, fontSize: 9.5, letterSpacing: "0.05em", color: ds.inkSecondary, textTransform: "uppercase" }}>
                      Frente a tu último {ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : "test"}
                    </div>
                    <div style={{ fontSize: 12, color: ds.ink, marginTop: 3 }}>Mismo punto del microciclo anterior</div>
                  </div>
                  <div style={{ fontFamily: dsF.display, fontSize: 17, fontWeight: 700, color: cmjComparativaCicloAnterior == null ? ds.inkMuted : cmjComparativaCicloAnterior.pct >= 0 ? ds.success : ds.danger }}>
                    {cmjComparativaCicloAnterior == null ? "—" : `${cmjComparativaCicloAnterior.pct >= 0 ? "▲" : "▼"} ${Math.abs(cmjComparativaCicloAnterior.pct).toFixed(1)}%`}
                  </div>
                </div>
              </div>

              {tendenciaMismoDiaCmj.length >= 2 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.05em", color: ds.inkMuted, textTransform: "uppercase", marginBottom: 2 }}>
                    Altura en {ultimoTestCmjTag && CMJ_TAG_META[ultimoTestCmjTag] ? CMJ_TAG_META[ultimoTestCmjTag].label : "el mismo día"} · últimos microciclos
                  </div>
                  <div style={{ fontSize: 10.5, color: ds.inkMuted, marginBottom: 8 }}>Compara siempre el mismo día de medida — no se mezcla con otros días.</div>
                  <DsCard>
                    <GraficaProgresoCargaReal puntos={tendenciaMismoDiaCmj} unidad="cm" />
                  </DsCard>
                </div>
              )}
            </>
          ) : (
            <div style={{ border: `1px dashed ${ds.border}`, borderRadius: dsR.lg, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, color: ds.inkMuted, marginTop: 18 }}>
              <div style={{ fontSize: 13.5, color: ds.ink, fontWeight: 600 }}>Aún no hay tests CMJ vinculados</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 260 }}>En cuanto tu entrenador suba un CSV con tus saltos y queden vinculados a ti, aparecerán aquí.</div>
            </div>
          )}
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="cmj" onChange={setVistaJugador} />
      </>
    );
  }

  // "Mi progreso" es su propia pantalla, independiente de si la sesión de
  // hoy está enviada o no — así se ve igual entres por la pestaña o por el
  // botón de la pantalla de "Sesión enviada". Se comprueba ANTES que el
  // "enviado", que si no, esa pantalla no dejaba llegar aquí nunca: era el
  // fallo que has visto.
  if (vistaJugador === "progreso") {
    return (
      <>
      <PantallaBase rol="jugador" maxWidth={480}>
        <div>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.09em", color: ds.inkSecondary, marginBottom: 4, textTransform: "uppercase" }}>{player.name}</div>
              <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Tu progreso</h1>
            </div>
            <button onClick={onExit} aria-label="Cambiar de jugador" style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${ds.border}`, background: ds.surface, color: ds.inkSecondary, cursor: "pointer", flexShrink: 0 }}>
              ⟳
            </button>
          </div>
          <div style={{ marginTop: 18 }} />
          <MiProgresoJugadorReal items={historyItems} loaded={historyLoaded} />
          <div style={{ height: 100 }} />
        </div>
      </PantallaBase>
      <BarraInferiorJugadorReal tabs={PLAYER_TABS} active="progreso" onChange={setVistaJugador} />
      </>
    );
  }

  if (vistaJugador === "sesion" && (enviado || yaEnviadaAntes)) {
    const otrasPendientes = todaySesiones.length > 1 && estadoPorSesion.some((e) => e.sesion.id !== sesionActual?.id && !e.completa);
    return (
      <PantallaBase rol="jugador" centrarContenido>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: dsR.full, background: ds.bgElevated, border: `2px solid ${ds.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: ds.success }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: ds.ink }}>Sesión enviada</div>
          <div style={{ fontSize: 13, color: ds.inkSecondary, maxWidth: 260, lineHeight: 1.5 }}>
            {otrasPendientes ? "Todavía te queda otra sesión de hoy por hacer." : "Tu próxima sesión estará disponible aquí cuando toque."}
          </div>
          {otrasPendientes && (
            <DsButton
              onClick={() => {
                setSesionSeleccionadaId(null);
                setEnviado(false);
                setHechoDraft({});
                setRegistrosDraft({});
              }}
              style={{ marginTop: 4 }}
            >
              Ver la otra sesión de hoy
            </DsButton>
          )}
          <DsButton variant="secondary" onClick={() => setVistaJugador("progreso")} style={{ marginTop: 8, borderColor: ds.accentBorderSubtle, color: ds.accent }}>
            Ver mi progreso
          </DsButton>
          <DsButton variant="secondary" onClick={() => setVistaJugador("dashboard")}>← Volver al dashboard</DsButton>
        </div>
      </PantallaBase>
    );
  }

  // P6 — récord en vivo: cualquier tarea de Fuerza marcada como hecha cuya
  // carga registrada ahora mismo supera su mejor marca histórica (antes de
  // hoy). El halo/badge de la tarea se calcula para todas ellas; el toast
  // puntual solo se muestra para la primera que no se haya descartado a
  // mano, para no apilar varios avisos a la vez.
  const recordsEnVivo = todasLasTareas
    .filter((t) => !t.esResistencia && !t.esCmj && hechoDraft[t.id])
    .map((t) => {
      const r = getRegistro(t.id);
      const cargaNum = r.carga !== "" && r.carga != null ? Number(r.carga) : null;
      if (cargaNum == null || Number.isNaN(cargaNum)) return null;
      const mejorPrevio = mejorHistoricoPorNombre.get(t.nombre);
      if (mejorPrevio != null && cargaNum <= mejorPrevio) return null;
      const pct = mejorPrevio ? ((cargaNum - mejorPrevio) / mejorPrevio) * 100 : null;
      return { id: t.id, nombre: t.nombre, valor: cargaNum, mejorPrevio: mejorPrevio ?? null, pct };
    })
    .filter(Boolean);
  const recordsEnVivoIds = new Set(recordsEnVivo.map((r) => r.id));
  const toastRecordActivo = recordsEnVivo.find((r) => !recordsDescartados.includes(r.id)) || null;

  return (
    <PantallaBase rol="jugador" maxWidth={480}>
      <div>
        <button
          onClick={() => setVistaJugador("dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver al dashboard
        </button>
        {todaySesiones.length > 1 && (
          <button
            onClick={() => setSesionSeleccionadaId(null)}
            style={{ display: "block", background: "transparent", border: "none", color: ds.accent, fontSize: 11.5, cursor: "pointer", padding: 0, marginBottom: 10 }}
          >
            Elegir otra sesión de hoy
          </button>
        )}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>
            HOY · {fmtDateLabel(date).toUpperCase()}
          </div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Sesión de hoy</h1>
          {totalTareas > 0 && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 16 }}>
              <DsProgressRing value={totalTareas ? (totalHechas / totalTareas) * 100 : 0} size={72} strokeWidth={7} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {totalHechas} de {totalTareas} tarea{totalTareas === 1 ? "" : "s"} completada{totalTareas === 1 ? "" : "s"}
                </div>
                {(sesionActual?.objetivo || sesionActual?.md) && (
                  <div style={{ marginTop: 6 }}>
                    <DsBadge tone="accent">
                      {[sesionActual?.objetivo, sesionActual?.md].filter(Boolean).join(" · ").toUpperCase()}
                    </DsBadge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* P6: toast momentáneo, en el flujo normal del layout (empuja el
            resto hacia abajo en vez de flotar encima) — así nunca puede
            solaparse ni con la cabecera ni con la lista de tareas. */}
        {toastRecordActivo && (
          <div
            style={{
              marginBottom: 18,
              background: ds.surface,
              border: `1px solid ${ds.accent}`,
              borderRadius: dsR.xl,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: dsSh.elevation2,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: dsR.full, background: ds.accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ds.accentInk} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 9 9l-7 1 5 5-1.5 7L12 18l6.5 4L17 15l5-5-7-1-3-7Z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: dsF.display, fontSize: 14.5, fontWeight: 700, color: ds.ink }}>¡Nuevo récord!</div>
              <div style={{ fontSize: 12, color: ds.inkSecondary, marginTop: 2 }}>
                {toastRecordActivo.nombre} · {toastRecordActivo.valor} kg
              </div>
              {toastRecordActivo.pct != null && (
                <div style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.accent, marginTop: 3 }}>
                  ▲ {toastRecordActivo.pct >= 0 ? "+" : ""}
                  {toastRecordActivo.pct.toFixed(1)}% sobre tu marca anterior ({toastRecordActivo.mejorPrevio} kg)
                </div>
              )}
            </div>
            <button
              onClick={() => setRecordsDescartados((prev) => [...prev, toastRecordActivo.id])}
              aria-label="Descartar aviso de récord"
              style={{ background: "transparent", border: "none", color: ds.inkMuted, fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {!loaded ? (
          <LoadingBlock />
        ) : totalTareas === 0 ? (
          <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.lg, padding: 20, textAlign: "center", color: ds.inkSecondary }}>
            <div style={{ marginBottom: 6 }}>No tienes sesión de fuerza asignada hoy.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              {Object.entries(bloques).map(([nombreBloque, tareasBloque]) => (
                <div key={nombreBloque}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingLeft: 2 }}>
                    <span style={{ width: 5, height: 5, borderRadius: dsR.full, background: ds.accent, flexShrink: 0 }} />
                    <span style={{ fontFamily: dsF.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: ds.inkSecondary, textTransform: "uppercase" }}>{nombreBloque}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tareasBloque.map((item, idx) =>
                      item.tipo === "circuito" ? (
                        <CircuitoJugadorReal
                          key={item.circuitoId}
                          tareas={item.tareas}
                          rondas={item.rondas}
                          hechoDraft={hechoDraft}
                          onToggle={toggle}
                          getRegistro={getRegistro}
                          onCambiarRegistro={setRegistroDraft}
                          onAmpliarGif={setGifAmpliado}
                          mostrarRegistro={nombreBloque === "Fuerza"}
                        />
                      ) : (
                        <TareaCardReal
                          key={item.tarea.id}
                          tarea={item.tarea}
                          hecho={!!hechoDraft[item.tarea.id]}
                          onToggle={() => toggle(item.tarea)}
                          registro={getRegistro(item.tarea.id)}
                          onCambiarRegistro={(val) => setRegistroDraft(item.tarea.id, val)}
                          onAmpliarGif={() => {
                            const v = videoEfectivoTarea(item.tarea, getRegistro(item.tarea.id));
                            if (v) setGifAmpliado(v);
                          }}
                          mostrarRegistro={nombreBloque === "Fuerza" || nombreBloque === "CMJ"}
                          esRecordNuevo={recordsEnVivoIds.has(item.tarea.id)}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errorEnvio && (
              <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "10px 12px", marginTop: 22 }}>{errorEnvio}</div>
            )}
            {pidiendoConfirmacion ? (
              <div style={{ marginTop: 22 }}>
                {totalHechas < totalTareas && (
                  <div style={{ display: "flex", gap: 8, background: `${ds.warning}18`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10 }}>
                    <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={14} /></span>
                    <span style={{ fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
                      Vas a enviar la sesión con {totalTareas - totalHechas} tarea{totalTareas - totalHechas === 1 ? "" : "s"} sin hacer. Tu entrenador la verá como incompleta.
                    </span>
                  </div>
                )}
                {tareasSinRegistroCompleto.length > 0 && (
                  <div style={{ display: "flex", gap: 8, background: `${ds.warning}18`, border: `1px solid ${ds.warning}55`, borderRadius: dsR.md, padding: "10px 12px", marginBottom: 10 }}>
                    <span style={{ color: ds.warning, flexShrink: 0, display: "inline-flex" }}><AlertTriangle size={14} /></span>
                    <span style={{ fontSize: 12.5, color: ds.ink, lineHeight: 1.45 }}>
                      {tareasSinRegistroCompleto.length === 1 ? "Esta tarea está marcada como hecha pero le falta" : "Estas tareas están marcadas como hechas pero les falta"} registrar carga o repeticiones:{" "}
                      {tareasSinRegistroCompleto.map((t) => t.nombre).join(", ")}.
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <DsButton variant="secondary" onClick={() => setPidiendoConfirmacion(false)} disabled={enviando} style={{ flex: 1 }}>
                    Cancelar
                  </DsButton>
                  <button
                    onClick={confirmarEnvio}
                    disabled={enviando}
                    style={{ flex: 2, background: ds.success, border: `1px solid ${ds.success}`, color: ds.accentInk, borderRadius: dsR.lg, padding: "13px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: enviando ? 0.6 : 1 }}
                  >
                    {enviando ? "Enviando..." : totalHechas < totalTareas ? "Enviar de todos modos" : "Confirmar envío"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPidiendoConfirmacion(true)}
                disabled={totalHechas === 0}
                style={{
                  width: "100%",
                  marginTop: 22,
                  background: totalHechas === totalTareas ? ds.success : totalHechas > 0 ? ds.bgElevated : ds.bgElevated,
                  border: `1px solid ${totalHechas === totalTareas ? ds.success : ds.border}`,
                  color: totalHechas === totalTareas ? ds.accentInk : totalHechas > 0 ? ds.ink : ds.inkMuted,
                  borderRadius: dsR.lg,
                  padding: "13px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: totalHechas === 0 ? "not-allowed" : "pointer",
                  opacity: totalHechas === 0 ? 0.6 : 1,
                }}
              >
                {totalHechas === totalTareas ? "Enviar sesión completada" : totalHechas > 0 ? `Enviar progreso (${totalHechas}/${totalTareas})` : "Marca al menos una tarea para enviar"}
              </button>
            )}
          </>
        )}
      </div>

      {gifAmpliado && (
        <div onClick={() => setGifAmpliado(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <VideoEmbed url={gifAmpliado} />
          </div>
          <button
            onClick={() => setGifAmpliado(null)}
            style={{ position: "absolute", top: 20, right: 20, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, width: 34, height: 34, borderRadius: dsR.full, fontSize: 16, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}
    </PantallaBase>
  );
}


// ---------- BIBLIOTECA DE EJERCICIOS (calcado de biblioteca-ejercicios.jsx) ----------

// Unidad real de cada tarea según su "modo" (elegido al diseñarla) — antes
// se mostraba siempre "reps" tanto en la pantalla del jugador como en el
// historial del entrenador, sin mirar este campo, aunque la tarea fuera de
// tiempo o de distancia.
// Equipos cuya carga no es comparable entre sí aunque el número de kg
// coincida (una Barra, un Multipower, una Mancuerna, una Kettlebell, una
// Máquina y un Trineo cargan de forma distinta) — cuando una tarea tiene dos
// o más de estos seleccionados a la vez, se le pregunta al jugador cuál usó
// de verdad, en vez de asumir uno.
const EQUIPOS_AMBIGUOS = ["Barra", "Multipower", "Kettlebell", "Mancuerna", "Máquina", "Trineo"];

// Define qué hace que dos tareas sean "la misma" a efectos de comparar
// carga entre sesiones: mismo ejercicio, mismo equipo efectivamente usado,
// mismo modo (uni/bilateral) y mismo objetivo de reps + RIR. Las series NO
// entran en la clave — cambiar el número de series es solo volumen, no un
// diseño de tarea distinto.
function materialEfectivo(it) {
  const mats = it.materiales || [];
  const ambiguos = mats.filter((m) => EQUIPOS_AMBIGUOS.includes(m));
  if (ambiguos.length >= 2) return it.subtipoCorporal || ambiguos[0];
  if (ambiguos.length === 1) return ambiguos[0];
  return mats[0] || "std";
}

function claveDisenoTarea(nombre, equipo, unilateral, repsObjetivo, rirObjetivo) {
  return [(nombre || "").toLowerCase(), equipo || "std", unilateral ? "uni" : "bi", repsObjetivo ?? "", rirObjetivo ?? ""].join("::");
}

// Tabla RTF (repeticiones hasta el fallo) -> %1RM. RTF = reps realizadas +
// RIR: el puente que conecta una marca con un diseño (reps/RIR) distinto al
// de hoy. Valores medios de las fórmulas de Epley y Brzycki, coherentes con
// la literatura de RIR/RPE en entrenamiento de fuerza (Zourdos et al. 2016)
// y el mismo principio que usan los sistemas de autorregulación tipo RP o
// RTS/Tuchscherer. Es una tabla GENERALISTA (mismo valor para cualquier
// ejercicio) — el margen de error real es de varios puntos porcentuales,
// mayor cuanto más se aleje el RTF de 1-10 o más difieran las reps.
const TABLA_PCT_1RM_POR_RTF = { 1: 1.0, 2: 0.96, 3: 0.92, 4: 0.9, 5: 0.87, 6: 0.85, 7: 0.83, 8: 0.8, 9: 0.77, 10: 0.75 };
// Por encima de ~12 repeticiones, el RIR reportado por el jugador deja de
// ser fiable (la relación reps-%1RM ya no es lineal y la autopercepción del
// RIR se degrada mucho en series largas — ver conversación) y la tabla de
// arriba ni siquiera cubre ese RTF. Cualquier cálculo de e1RM basado en RIR
// descarta las series por encima de este umbral en vez de forzarlas dentro
// de la tabla (lo que antes producía un e1RM muy por debajo del real).
const REPS_MAX_RIR_FIABLE = 12;
function pct1RMporRTF(rtf) {
  const rtfClamp = Math.max(1, Math.min(10, rtf));
  const base = Math.floor(rtfClamp);
  const resto = rtfClamp - base;
  if (resto === 0 || base >= 10) return TABLA_PCT_1RM_POR_RTF[base];
  return TABLA_PCT_1RM_POR_RTF[base] + (TABLA_PCT_1RM_POR_RTF[base + 1] - TABLA_PCT_1RM_POR_RTF[base]) * resto;
}

// A partir de una marca previa con OTRO diseño (reps/RIR distinto al de
// hoy), estima una carga de partida para el diseño de hoy: calcula el e1RM
// implícito en la marca previa (carga / %1RM de su RTF) y lo vuelve a bajar
// al %1RM del RTF de hoy. Es una estimación de PARTIDA para que el jugador
// ajuste en el primer set según cómo se sienta el RIR real — no una
// prescripción cerrada. Por eso, si el salto de reps es mayor de 4, se
// prefiere no sugerir nada (el margen de error ya no es útil) antes que dar
// un número con falsa precisión.
function calcularCargaSugerida(registroRef, repsHoy, rirHoy, redondeo = 2.5) {
  if (!registroRef) return null;
  const repsRef = Number(registroRef.repsReal);
  const rirRef = registroRef.rirReal !== "" && registroRef.rirReal != null ? Number(registroRef.rirReal) : null;
  const cargaRef = Number(registroRef.cargaReal);
  const repsObjetivo = Number(repsHoy);
  const rirObjetivo = rirHoy !== "" && rirHoy != null ? Number(rirHoy) : null;
  if (!cargaRef || Number.isNaN(cargaRef) || Number.isNaN(repsRef) || rirRef == null || Number.isNaN(repsObjetivo) || rirObjetivo == null) return null;
  if (repsRef > REPS_MAX_RIR_FIABLE || repsObjetivo > REPS_MAX_RIR_FIABLE) return null;
  if (Math.abs(repsObjetivo - repsRef) > 4) return null;
  const pctRef = pct1RMporRTF(repsRef + rirRef);
  const pctHoy = pct1RMporRTF(repsObjetivo + rirObjetivo);
  if (!pctRef) return null;
  const e1RM = cargaRef / pctRef;
  return Math.round((e1RM * pctHoy) / redondeo) * redondeo;
}

// Clave para el vídeo de demostración de una variante concreta. Más simple
// que claveDisenoTarea a propósito: el gesto no cambia con el RIR ni con las
// reps objetivo, solo con el material usado y si es uni o bilateral.
function claveVideoVariante(material, unilateral) {
  return `${material || "std"}::${unilateral ? "uni" : "bi"}`;
}

// Resuelve qué vídeo debe verse para una tarea ya construida (ver
// construirTareaVisual) según el registro en curso del jugador. Si la tarea
// deja elegir material y el jugador todavía no ha elegido, no hay vídeo que
// mostrar todavía — se revela justo al elegir.
function videoEfectivoTarea(tarea, registro) {
  if (tarea.eligeEquipo) {
    const elegido = registro?.subtipo;
    if (!elegido || !tarea.equiposElegibles?.includes(elegido)) return null;
    return tarea.videosPorEquipo?.[elegido] || tarea.gif || null;
  }
  return tarea.gif || null;
}

const UNIDAD_POR_MODO = { reps: "reps", tiempo: "seg", minutos: "min", metros: "m" };

const BLOQUES_BIBLIOTECA = ["Fuerza", "Específicas", "Core", "Movilidad", "Preventivo", "Resistencia"];
const TAGS_DESCRIPTIVOS_BIBLIOTECA = ["Miembro superior", "Miembro inferior", "Zona media", "Global"];
const TIPOS_TEJIDO_BIBLIOTECA = ["Muscular", "Tendinosa", "Articular"];

function TagChipReal({ tag, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: dsF.mono,
        fontSize: 11,
        letterSpacing: "0.02em",
        color: activo ? ds.accentInk : ds.inkSecondary,
        background: activo ? ds.accent : "transparent",
        border: `1px solid ${activo ? ds.accent : ds.border}`,
        borderRadius: dsR.sm,
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
  return { background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.sm, color: ds.ink, fontSize: 13, padding: "8px 9px", ...extra };
}

const btnIconoReal = { background: "transparent", border: `1px solid ${ds.border}`, borderRadius: dsR.sm, color: ds.inkMuted, width: 26, height: 26, cursor: "pointer", fontSize: 12.5 };

function TarjetaEjercicioReal({ ejercicio, categorias, esVariante, onEditar, onEliminar, onCrearVariante }) {
  const nombreCategoria = categorias.find((c) => c.id === ejercicio.categoria_preventiva_id)?.nombre;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginLeft: esVariante ? 20 : 0, background: esVariante ? ds.canvas : ds.surface, border: `1px solid ${esVariante ? `${ds.border}88` : ds.border}`, borderRadius: dsR.lg }}>
      {ejercicio.gif_url ? (
        <div style={{ position: "relative", width: 40, height: 40, borderRadius: dsR.md, flexShrink: 0, background: ds.bgElevated, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {miniaturaTarea(ejercicio.gif_url) && (
            <img src={miniaturaTarea(ejercicio.gif_url)} alt="" style={{ width: 40, height: 40, borderRadius: dsR.md, objectFit: "cover", display: "block", position: "absolute", inset: 0 }} />
          )}
          {(extractYouTubeId(ejercicio.gif_url) || esVideoDirecto(ejercicio.gif_url)) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: miniaturaTarea(ejercicio.gif_url) ? "rgba(0,0,0,0.25)" : "transparent", borderRadius: dsR.md }}>
              <Play size={13} color={miniaturaTarea(ejercicio.gif_url) ? "#fff" : ds.accent} fill={miniaturaTarea(ejercicio.gif_url) ? "#fff" : ds.accent} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: dsR.md, background: ds.bgElevated, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ds.inkMuted, fontSize: 9, fontFamily: dsF.mono }}>
          —
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {esVariante && <span style={{ color: ds.inkMuted, fontSize: 12 }}>↳</span>}
          <div style={{ fontSize: 13.5, fontWeight: 600, color: ds.ink }}>{ejercicio.nombre}</div>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {esVariante && (
            <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkSecondary, border: `1px solid ${ds.border}`, borderRadius: 4, padding: "1px 5px" }}>VARIANTE</span>
          )}
          {nombreCategoria && (
            <span style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "1px 5px" }}>{nombreCategoria}</span>
          )}
          {(ejercicio.tags_descriptivos || []).map((t) => (
            <span key={t} style={{ fontFamily: dsF.mono, fontSize: 9.5, color: ds.inkMuted, border: `1px solid ${ds.border}`, borderRadius: 4, padding: "1px 5px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      {!esVariante && onCrearVariante && (
        <button onClick={onCrearVariante} style={btnIconoReal} title="Crear variante de este ejercicio">
          +V
        </button>
      )}
      <button onClick={onEditar} style={btnIconoReal} title="Editar ejercicio">
        <Pencil size={13} />
      </button>
      <button onClick={onEliminar} style={btnIconoReal} title="Eliminar ejercicio">
        ×
      </button>
    </div>
  );
}

function PanelNuevoEjercicioReal({ categorias, ejercicios, onGuardar, onCerrar, ejercicioEditar, matrizPreset, error }) {
  // matrizPreset: cuando se abre desde el botón "+V" de un ejercicio ya
  // existente, trae el bloque/categoría/etiquetas de partida ya rellenos —
  // el nombre y el vídeo siguen siendo del todo propios de la variante.
  const base = ejercicioEditar || matrizPreset;
  const [nombre, setNombre] = useState(ejercicioEditar?.nombre || "");
  const [ejercicioBaseId, setEjercicioBaseId] = useState(ejercicioEditar?.ejercicio_base_id || matrizPreset?.id || "");
  const [bloque, setBloque] = useState(base?.bloque || "Fuerza");
  const [categoriaId, setCategoriaId] = useState(base?.categoria_preventiva_id || categorias[0]?.id || "");
  const [tagsSel, setTagsSel] = useState(base?.tags_descriptivos || []);
  const [videoUrl, setVideoUrl] = useState(ejercicioEditar?.gif_url || "");
  const [sinLateralidad, setSinLateralidad] = useState(ejercicioEditar?.sin_lateralidad === "si");
  const [materialesDisponibles] = useMaterialesDisponibles();
  const [filasVariantes, setFilasVariantes] = useState(() =>
    Object.entries(ejercicioEditar?.videos_variantes || {}).map(([clave, url]) => {
      const [material, modo] = clave.split("::");
      return { key: Math.random().toString(36).slice(2), material: material === "std" ? "" : material, unilateral: modo === "uni", url };
    })
  );
  const [guardando, setGuardando] = useState(false);

  const esPreventivo = bloque === "Preventivo";
  // Selección única: con "Global" cubriendo el caso de superior+inferior a
  // la vez, cada ejercicio pertenece a una sola zona corporal — ya no tiene
  // sentido dejar marcar varias a la vez como antes.
  const seleccionarZona = (t) => setTagsSel([t]);
  const videoIdValido = extractYouTubeId(videoUrl);
  const esDirectoValido = esVideoDirecto(videoUrl);
  const enlaceReconocido = !!videoIdValido || esDirectoValido;
  const enlaceNoReconocido = videoUrl.trim().length > 0 && !enlaceReconocido;

  const actualizarFila = (key, cambios) => setFilasVariantes((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  const quitarFila = (key) => setFilasVariantes((prev) => prev.filter((f) => f.key !== key));
  const anadirFila = () => setFilasVariantes((prev) => [...prev, { key: Math.random().toString(36).slice(2), material: materialesDisponibles[0] || "", unilateral: false, url: "" }]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 30 }} onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: "16px 16px 0 0", padding: 18, display: "flex", flexDirection: "column", gap: 14, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: ds.ink }}>{ejercicioEditar ? "Editar ejercicio" : "Nuevo ejercicio"}</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NOMBRE</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sentadilla frontal" style={campoSelectReal()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>VARIANTE DE (OPCIONAL — SOLO PARA AGRUPARLO EN LA BIBLIOTECA)</span>
          <select value={ejercicioBaseId} onChange={(e) => setEjercicioBaseId(e.target.value)} style={campoSelectReal()}>
            <option value="">Ninguno — es un ejercicio matriz</option>
            {(ejercicios || [])
              .filter((e) => !e.ejercicio_base_id && e.id !== ejercicioEditar?.id)
              .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>BLOQUE (único, obligatorio)</span>
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
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>CATEGORÍA PREVENTIVA (obligatoria, solo aplica a este bloque)</span>
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
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>ZONA CORPORAL (obligatoria)</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => (
              <TagChipReal key={t} tag={t} activo={tagsSel.includes(t)} onClick={() => seleccionarZona(t)} />
            ))}
          </div>
        </div>
        <div onClick={() => setSinLateralidad((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `1.5px solid ${sinLateralidad ? ds.accent : ds.border}`,
              background: sinLateralidad ? ds.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: ds.accentInk,
              fontSize: 12,
            }}
          >
            {sinLateralidad ? "✓" : ""}
          </span>
          <span style={{ fontSize: 12.5, color: ds.inkSecondary }}>Sin lateralidad (ej. bici estática — no mostrar etiqueta Bilateral/Unilateral)</span>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>VÍDEO GENÉRICO (respaldo si una variante no tiene el suyo propio)</span>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/... o https://pub-xxxx.r2.dev/....mp4"
            style={{ ...campoSelectReal(), borderColor: enlaceNoReconocido ? ds.danger : undefined }}
          />
          {enlaceNoReconocido && (
            <span style={{ fontSize: 11, color: ds.danger }}>No reconozco este enlace — debe ser de YouTube o terminar en .mp4/.webm/.mov.</span>
          )}
          {enlaceReconocido && <VideoEmbed url={videoUrl} />}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>
            VÍDEOS POR VARIANTE (opcional — para cuando el gesto cambia según el material)
          </span>
          {filasVariantes.map((f) => {
            const idValido = extractYouTubeId(f.url);
            const directoValido = esVideoDirecto(f.url);
            const reconocido = !!idValido || directoValido;
            const noReconocido = f.url.trim().length > 0 && !reconocido;
            return (
              <div key={f.key} style={{ border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={f.material} onChange={(e) => actualizarFila(f.key, { material: e.target.value })} style={{ ...campoSelectReal(), flex: 1 }}>
                    <option value="">— Material —</option>
                    {materialesDisponibles.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => actualizarFila(f.key, { unilateral: !f.unilateral })}
                    style={{
                      fontSize: 11,
                      padding: "0 10px",
                      borderRadius: dsR.sm,
                      border: `1px solid ${f.unilateral ? ds.accent : ds.border}`,
                      background: f.unilateral ? ds.accentSubtle : "transparent",
                      color: f.unilateral ? ds.accent : ds.inkSecondary,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.unilateral ? "Unilateral" : "Bilateral"}
                  </button>
                  <button onClick={() => quitarFila(f.key)} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.danger, borderRadius: dsR.sm, padding: "0 10px", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={f.url}
                  onChange={(e) => actualizarFila(f.key, { url: e.target.value })}
                  placeholder="https://youtu.be/... de esta variante"
                  style={{ ...campoSelectReal(), borderColor: noReconocido ? ds.danger : undefined }}
                />
                {noReconocido && <span style={{ fontSize: 11, color: ds.danger }}>No reconozco este enlace.</span>}
                {reconocido && <VideoEmbed url={f.url} />}
              </div>
            );
          })}
          <button
            onClick={anadirFila}
            style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", background: "transparent", border: `1px dashed ${ds.border}`, color: ds.inkSecondary, borderRadius: dsR.md, padding: "8px 10px", fontSize: 12.5, cursor: "pointer" }}
          >
            <Plus size={13} /> Añadir variante
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          {error && <div style={{ color: ds.danger, fontSize: 12, flex: 1, alignSelf: "center" }}>{error}</div>}
          <DsButton variant="secondary" onClick={onCerrar}>Cancelar</DsButton>
          <DsButton
            disabled={guardando}
            onClick={async () => {
              if (!nombre.trim() || tagsSel.length === 0) return;
              setGuardando(true);
              await onGuardar({
                id: ejercicioEditar?.id,
                nombre: nombre.trim(),
                bloque,
                categoria_preventiva_id: esPreventivo ? categoriaId : "",
                ejercicio_base_id: ejercicioBaseId || "",
                tags_descriptivos: tagsSel,
                sin_lateralidad: sinLateralidad ? "si" : "",
                gif_url: videoUrl,
                videos_variantes: Object.fromEntries(
                  filasVariantes.filter((f) => f.material && f.url.trim()).map((f) => [claveVideoVariante(f.material, f.unilateral), f.url.trim()])
                ),
                orden_rotacion: ejercicioEditar?.orden_rotacion || "",
              });
              setGuardando(false);
            }}
          >
            {guardando ? "Guardando..." : ejercicioEditar ? "Guardar cambios" : "Guardar ejercicio"}
          </DsButton>
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
        <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>CATEGORÍA PREVENTIVA</span>
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
      <div style={{ fontSize: 11.5, color: ds.inkMuted, marginBottom: 10 }}>
        Solo ejercicios con bloque "Preventivo" y esa categoría. Este orden queda guardado en cada ejercicio, listo para cuando la selección automática por rotación esté conectada.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "12px 0" }}>Sin ejercicios en esta categoría todavía.</div>}
        {lista.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.md }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkMuted, width: 16 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: ds.ink }}>{e.nombre}</span>
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

function BibliotecaEjerciciosReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [ejercicios, saveEjercicios, ejerciciosLoaded, ejerciciosError] = useEntityList("ejercicios");
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [bloqueFiltro, setBloqueFiltro] = useState("Todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [matrizParaVariante, setMatrizParaVariante] = useState(null);
  const [vista, setVista] = useState("lista");
  const [errorBorrado, setErrorBorrado] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");

  if (!ejerciciosLoaded || !categoriasLoaded) return <LoadingBlock />;

  const visibles = ejercicios
    .filter((e) => (bloqueFiltro === "Todos" ? true : e.bloque === bloqueFiltro))
    .filter((e) => (categoriaFiltro === "Todas" ? true : e.categoria_preventiva_id === categoriaFiltro))
    .filter((e) => (e.nombre || "").toLowerCase().includes(busqueda.toLowerCase()));

  const guardarEjercicio = async (datos) => {
    setErrorGuardado("");
    // CRÍTICO: si esto fallaba (por lo que fuera — el cuelgue de Apps
    // Script que ya vimos, o cualquier otro fallo de conexión) y no se
    // comprobaba, el panel se cerraba igualmente dando la sensación de que
    // el cambio se había guardado, cuando en realidad no había llegado a la
    // Sheet. Es exactamente lo que probablemente pasó con el cambio de
    // "Sentadilla" hace unos días.
    const ok = await saveEjercicios(datos.id ? ejercicios.map((e) => (e.id === datos.id ? { ...e, ...datos } : e)) : [...ejercicios, datos]);
    if (ok) {
      setPanelAbierto(false);
      setEjercicioEditando(null);
    } else {
      setErrorGuardado("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo — el panel sigue abierto para que no pierdas lo escrito.");
    }
  };

  const eliminarEjercicio = async (id) => {
    setErrorBorrado("");
    if (!id) {
      // Sin id real no hay fila que borrar en la Sheet — normalmente pasa
      // con filas creadas o tocadas antes de este arreglo, o metidas a mano
      // directamente en la hoja de cálculo sin id. Quitarlo aquí solo lo
      // ocultaría un instante: en la próxima carga volvería a aparecer.
      setErrorBorrado('Este ejercicio no tiene un identificador válido en la hoja de cálculo, así que no se puede borrar desde aquí — bórralo directamente en la pestaña "ejercicios" de la Sheet.');
      return;
    }
    const ok = await saveEjercicios(ejercicios.filter((e) => e.id !== id));
    if (!ok) setErrorBorrado("No se pudo borrar. Comprueba tu conexión e inténtalo de nuevo.");
  };

  const reordenarCategoria = async (listaOrdenada) => {
    setErrorBorrado("");
    const idsOrdenados = new Set(listaOrdenada.map((e) => e.id));
    const actualizados = ejercicios.map((e) => {
      if (!idsOrdenados.has(e.id)) return e;
      const nuevoOrden = listaOrdenada.findIndex((x) => x.id === e.id) + 1;
      return { ...e, orden_rotacion: nuevoOrden };
    });
    const ok = await saveEjercicios(actualizados);
    if (!ok) setErrorBorrado("No se pudo guardar el nuevo orden. Comprueba tu conexión e inténtalo de nuevo.");
  };

  return (
    <PantallaEntrenadorAncha activo="biblioteca" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>BIBLIOTECA</div>
            <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Ejercicios</h1>
            <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{ejercicios.length} ejercicios creados</div>
          </div>
          <button
            onClick={() => {
              setEjercicioEditando(null);
              setPanelAbierto(true);
            }}
            title="Nuevo ejercicio"
            style={{
              width: 42,
              height: 42,
              borderRadius: dsR.full,
              background: ds.accent,
              border: "none",
              color: ds.accentInk,
              fontSize: 22,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: dsSh.accentGlow,
            }}
          >
            +
          </button>
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
                borderRadius: dsR.md,
                border: `1px solid ${vista === v.id ? ds.accent : ds.border}`,
                background: vista === v.id ? ds.accentSubtle : "transparent",
                color: vista === v.id ? ds.accent : ds.inkSecondary,
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        {vista === "lista" ? (
          <>
            <DsInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ejercicio..."
              style={{ marginBottom: 10 }}
            />
            <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>FILTRAR POR BLOQUE</span>
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
              <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>FILTRAR POR CATEGORÍA PREVENTIVA</span>
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
              {errorBorrado && <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px" }}>{errorBorrado}</div>}
              {(() => {
                // Agrupa matriz + variantes para que la lista deje de ser 60
                // ejercicios sueltos y pase a ser familias de movimiento: la
                // matriz arriba, sus variantes plegadas justo debajo. Una
                // familia se muestra si la matriz o cualquiera de sus
                // variantes pasa los filtros/búsqueda actuales.
                const idsVisibles = new Set(visibles.map((e) => e.id));
                const idsExistentes = new Set(ejercicios.map((e) => e.id));
                const variantesPorMatriz = {};
                ejercicios.forEach((e) => {
                  if (e.ejercicio_base_id && idsExistentes.has(e.ejercicio_base_id)) {
                    (variantesPorMatriz[e.ejercicio_base_id] = variantesPorMatriz[e.ejercicio_base_id] || []).push(e);
                  }
                });
                const matrices = ejercicios.filter((e) => !e.ejercicio_base_id || !idsExistentes.has(e.ejercicio_base_id));
                const familias = matrices
                  .map((m) => ({ matriz: m, variantes: variantesPorMatriz[m.id] || [] }))
                  .filter((f) => idsVisibles.has(f.matriz.id) || f.variantes.some((v) => idsVisibles.has(v.id)));

                if (familias.length === 0) {
                  return <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Sin resultados</div>;
                }
                return familias.map(({ matriz, variantes }) => (
                  <React.Fragment key={matriz.id}>
                    <TarjetaEjercicioReal
                      ejercicio={matriz}
                      categorias={categorias}
                      onEditar={() => {
                        setEjercicioEditando(matriz);
                        setPanelAbierto(true);
                      }}
                      onEliminar={() => eliminarEjercicio(matriz.id)}
                      onCrearVariante={() => {
                        setMatrizParaVariante(matriz);
                        setEjercicioEditando(null);
                        setPanelAbierto(true);
                      }}
                    />
                    {variantes
                      .filter((v) => idsVisibles.has(v.id))
                      .map((v) => (
                        <TarjetaEjercicioReal
                          key={v.id}
                          ejercicio={v}
                          categorias={categorias}
                          esVariante
                          onEditar={() => {
                            setEjercicioEditando(v);
                            setPanelAbierto(true);
                          }}
                          onEliminar={() => eliminarEjercicio(v.id)}
                        />
                      ))}
                  </React.Fragment>
                ));
              })()}
            </div>
          </>
        ) : (
          <VistaOrdenRotacionReal ejercicios={ejercicios} categorias={categorias} onReordenar={reordenarCategoria} />
        )}
      </div>
      {panelAbierto && (
        <PanelNuevoEjercicioReal
          categorias={categorias}
          ejercicios={ejercicios}
          ejercicioEditar={ejercicioEditando}
          matrizPreset={matrizParaVariante}
          onGuardar={guardarEjercicio}
          error={errorGuardado}
          onCerrar={() => {
            setPanelAbierto(false);
            setEjercicioEditando(null);
            setMatrizParaVariante(null);
          }}
        />
      )}
    </PantallaEntrenadorAncha>
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
  { id: "cmj", numero: 6, nombre: "CMJ", modo: "manual", descripcion: "Día de medición de salto — el jugador lo ve señalado en su sesión" },
  { id: "fuerza", numero: 7, nombre: "Fuerza", modo: "manual", descripcion: "Diseño manual — con reps/series y RIR (incluye Específicas)" },
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
    case "cmj":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3v6" />
          <path d="M8 6l4 3 4-3" />
          <path d="M6 21c1-5 3-8 6-8s5 3 6 8" />
          <path d="M4 21h16" />
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
    rotativo: { texto: "ROTATIVO AUTO", color: ds.accent },
    "rotativo-categoria": { texto: "ROTATIVO · POR CATEGORÍA", color: ds.accent },
    manual: { texto: "MANUAL", color: ds.warning },
  };
  const cfg = map[modo];
  return (
    <span style={{ fontFamily: dsF.mono, fontSize: 10.5, letterSpacing: "0.06em", color: cfg.color, border: `1px solid ${cfg.color}55`, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
      {cfg.texto}
    </span>
  );
}

function CampoEtiquetadoDiseno({ etiqueta, children, w }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, width: w }}>
      <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, whiteSpace: "nowrap" }}>{etiqueta}</span>
      {children}
    </label>
  );
}

function campoStyleDiseno(w) {
  return { width: w, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 5, color: ds.ink, fontFamily: dsF.mono, fontSize: 12, padding: "5px 6px", textAlign: "center", boxSizing: "border-box" };
}

const botonMiniStyleDiseno = { background: "none", border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.inkMuted, cursor: "pointer", fontSize: 12, lineHeight: 1, width: 24, height: 24, flexShrink: 0 };

function SelectorMaterialReal({ seleccionados, disponibles, onCambiar, onAgregarMaterial }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState("");
  const toggle = (m) => onCambiar(seleccionados.includes(m) ? seleccionados.filter((x) => x !== m) : [...seleccionados, m]);

  return (
    <div style={{ position: "relative", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, marginBottom: 3 }}>MATERIAL</div>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", textAlign: "left", fontSize: 11.5, color: seleccionados.length ? ds.ink : ds.inkMuted, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 5, padding: "5px 8px", cursor: "pointer" }}
      >
        {seleccionados.length ? seleccionados.join(", ") : "Ninguno"}
      </button>
      {abierto && (
        <CerrablePorFuera onCerrar={() => setAbierto(false)}>
        <div style={{ position: "absolute", zIndex: 15, top: "100%", left: 0, marginTop: 4, width: 220, maxHeight: 260, overflowY: "auto", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 8, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", padding: 6 }}>
          {disponibles.map((m) => {
            const activo = seleccionados.includes(m);
            return (
              <div
                key={m}
                onClick={() => toggle(m)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: activo ? ds.accent : ds.inkSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ds.border)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${activo ? ds.accent : ds.border}`, background: activo ? ds.accent : "transparent", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {activo ? "✓" : ""}
                </span>
                {m}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 5, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${ds.border}` }}>
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
              style={{ flex: 1, background: ds.bgElevated, border: `1px dashed ${ds.border}`, borderRadius: 5, color: ds.ink, fontSize: 11, padding: "5px 6px" }}
            />
            <button
              onClick={() => {
                if (nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              style={{ background: "transparent", border: `1px solid ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 5, padding: "0 10px", cursor: "pointer", fontSize: 12 }}
            >
              +
            </button>
          </div>
        </div>
        </CerrablePorFuera>
      )}
    </div>
  );
}

function NotaTareaReal({ nota, onCambiar }) {
  const [abierta, setAbierta] = useState(!!nota);
  if (!abierta) {
    return (
      <button onClick={() => setAbierta(true)} style={{ alignSelf: "flex-start", fontSize: 11, color: ds.inkMuted, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
        + Nota
      </button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted }}>NOTA PARA ESTA TAREA</span>
        {!nota && (
          <button onClick={() => setAbierta(false)} style={{ background: "none", border: "none", color: ds.inkMuted, cursor: "pointer", fontSize: 11 }}>
            cancelar
          </button>
        )}
      </div>
      <textarea
        value={nota || ""}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Ej. Baja el ritmo si nota molestia..."
        rows={2}
        style={{ width: "100%", boxSizing: "border-box", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.ink, fontSize: 12, padding: "6px 8px", fontFamily: dsF.sans, resize: "vertical" }}
      />
    </div>
  );
}

function FilaTareaReal({ tarea, onCambiar, onEliminar, mostrarCarga, materialesDisponibles, onAgregarMaterial, orden, onSubir, onBajar }) {
  const modosDisponibles = mostrarCarga ? ["reps", "tiempo", "minutos", "metros"] : ["reps", "tiempo", "minutos"];
  const etiquetaModo = { reps: "REPS", tiempo: "SEG", minutos: "MIN", metros: "M" };
  const ciclarModo = () => {
    const idx = modosDisponibles.indexOf(tarea.modo);
    onCambiar({ ...tarea, modo: modosDisponibles[(idx + 1) % modosDisponibles.length] });
  };
  const tipoResistencia = tarea.tipoResistencia || "Peso libre";

  return (
    <div style={{ padding: "10px 12px", background: ds.bgElevated, borderRadius: 8, border: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: ds.border, color: ds.accent, fontFamily: dsF.mono, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        <div style={{ color: ds.ink, fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{tarea.nombre}</div>
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
          <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, marginBottom: 4 }}>TIPO DE RESISTENCIA</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Peso libre", "Elástica", "Peso corporal"].map((t) => (
              <button
                key={t}
                onClick={() => onCambiar({ ...tarea, tipoResistencia: t })}
                style={{ fontSize: 11, padding: "5px 9px", borderRadius: 6, border: `1px solid ${tipoResistencia === t ? ds.accent : ds.border}`, background: tipoResistencia === t ? ds.accentSubtle : "transparent", color: tipoResistencia === t ? ds.accent : ds.inkSecondary, cursor: "pointer" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoEtiquetadoDiseno etiqueta="MODO" w={50}>
          <button onClick={ciclarModo} style={{ fontFamily: dsF.mono, fontSize: 10.5, color: ds.inkSecondary, background: ds.border, border: `1px solid ${ds.border}`, borderRadius: 5, padding: "5px 4px", width: "100%", textAlign: "center", cursor: "pointer" }} title="Alternar reps / seg / min / metros">
            {etiquetaModo[tarea.modo]}
          </button>
        </CampoEtiquetadoDiseno>
        <CampoEtiquetadoDiseno etiqueta="LADO" w={92}>
          <button
            onClick={() => onCambiar({ ...tarea, lateralidad: tarea.lateralidad === "unilateral" ? "bilateral" : "unilateral" })}
            style={{
              fontFamily: dsF.mono,
              fontSize: 10.5,
              color: tarea.lateralidad === "unilateral" ? ds.accent : ds.inkSecondary,
              background: tarea.lateralidad === "unilateral" ? ds.accentSubtle : ds.border,
              border: `1px solid ${tarea.lateralidad === "unilateral" ? ds.accent : ds.border}`,
              borderRadius: 5,
              padding: "5px 4px",
              width: "100%",
              textAlign: "center",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Bilateral: a la vez con las dos piernas/brazos. Unilateral: se repite cada lado por separado."
          >
            {tarea.lateralidad === "unilateral" ? "Unilateral" : "Bilateral"}
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
            {/* Alternativa al RIR: pautar por % directo del 1RM estimado del
                jugador. El RIR deja de ser una herramienta fiable a cargas
                ligeras (por debajo de ~10 reps hasta el fallo la relación
                reps-%1RM ya no es lineal, y la autopercepción del RIR se
                degrada mucho en series largas) — para esos casos, %1RM. */}
            <CampoEtiquetadoDiseno etiqueta="CARGA POR" w={62}>
              <button
                onClick={() => onCambiar({ ...tarea, modoCarga: tarea.modoCarga === "pct1rm" ? "rir" : "pct1rm" })}
                style={{
                  fontFamily: dsF.mono,
                  fontSize: 10,
                  color: tarea.modoCarga === "pct1rm" ? ds.accent : ds.inkSecondary,
                  background: tarea.modoCarga === "pct1rm" ? ds.accentSubtle : ds.border,
                  border: `1px solid ${tarea.modoCarga === "pct1rm" ? ds.accent : ds.border}`,
                  borderRadius: 5,
                  padding: "5px 4px",
                  width: "100%",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                title="Alternar entre pautar por RIR o por % directo del 1RM estimado (recomendado para cargas ligeras)"
              >
                {tarea.modoCarga === "pct1rm" ? "%1RM" : "RIR"}
              </button>
            </CampoEtiquetadoDiseno>
            {tarea.modoCarga === "pct1rm" ? (
              <CampoEtiquetadoDiseno etiqueta="% 1RM" w={48}>
                <input value={tarea.pct1rm ?? ""} onChange={(e) => onCambiar({ ...tarea, pct1rm: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
              </CampoEtiquetadoDiseno>
            ) : (
              <CampoEtiquetadoDiseno etiqueta="RIR" w={40}>
                <input value={tarea.rir} onChange={(e) => onCambiar({ ...tarea, rir: e.target.value })} placeholder="—" style={campoStyleDiseno("100%")} />
              </CampoEtiquetadoDiseno>
            )}
            <div style={{ flex: "1 1 100px", minWidth: 100 }}>
              <div style={{ fontFamily: dsF.mono, fontSize: 9, letterSpacing: "0.04em", color: ds.inkMuted, marginBottom: 3 }}>REF. ANTERIOR (informativo)</div>
              <div style={{ fontSize: 11, color: ds.inkSecondary, lineHeight: 1.3 }}>{tarea.referencia ? tarea.referencia : "Sin registro previo"}</div>
            </div>
          </>
        )}
        <SelectorMaterialReal seleccionados={tarea.materiales || []} disponibles={materialesDisponibles} onCambiar={(nuevos) => onCambiar({ ...tarea, materiales: nuevos })} onAgregarMaterial={onAgregarMaterial} />
      </div>
      <NotaTareaReal nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

const TIPOS_RESISTENCIA_CARDIO = [
  { id: "continuo", label: "Continuo" },
  { id: "hiit", label: "HIIT" },
  { id: "rsa", label: "RSA" },
];

// Un número + un selector de MIN/SEG al lado — se repite para tiempo y para
// recuperación en los tres tipos de trabajo de Resistencia.
function CampoTiempoConUnidadDiseno({ etiqueta, valor, unidad, onCambiarValor, onCambiarUnidad, w }) {
  return (
    <CampoEtiquetadoDiseno etiqueta={etiqueta} w={w}>
      <div style={{ display: "flex", gap: 4 }}>
        <input value={valor} onChange={(e) => onCambiarValor(e.target.value)} placeholder="—" style={{ ...campoStyleDiseno("100%"), flex: 1, minWidth: 0 }} />
        <select value={unidad || "seg"} onChange={(e) => onCambiarUnidad(e.target.value)} style={{ background: ds.border, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.inkSecondary, fontSize: 10.5, padding: "0 3px" }}>
          <option value="min">min</option>
          <option value="seg">seg</option>
        </select>
      </div>
    </CampoEtiquetadoDiseno>
  );
}

function CampoResistenciaTareaReal({ tarea, onCambiar, orden, onSubir, onBajar, onEliminar }) {
  const tipo = tarea.tipoResistenciaCardio || "";
  const set = (campo) => (valor) => onCambiar({ ...tarea, [campo]: valor });

  return (
    <div style={{ padding: "10px 12px", background: ds.bgElevated, borderRadius: 8, border: `1px solid ${ds.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: ds.border, color: ds.accent, fontFamily: dsF.mono, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {orden}
          </span>
        )}
        <div style={{ color: ds.ink, fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{tarea.nombre}</div>
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

      <div style={{ display: "flex", gap: 6 }}>
        {TIPOS_RESISTENCIA_CARDIO.map((op) => (
          <button
            key={op.id}
            onClick={() => onCambiar({ ...tarea, tipoResistenciaCardio: op.id })}
            style={{
              flex: 1,
              fontSize: 12.5,
              fontWeight: 600,
              padding: "8px 0",
              borderRadius: 7,
              border: `1px solid ${tipo === op.id ? ds.accent : ds.border}`,
              background: tipo === op.id ? ds.accentSubtle : "transparent",
              color: tipo === op.id ? ds.accent : ds.inkSecondary,
              cursor: "pointer",
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

      {!tipo && <div style={{ fontSize: 11.5, color: ds.inkMuted }}>Elige el tipo de trabajo para configurar los campos.</div>}

      {tipo === "continuo" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CampoEtiquetadoDiseno etiqueta="SERIES" w={60}>
            <input value={tarea.series} onChange={(e) => set("series")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoTiempoConUnidadDiseno etiqueta="TIEMPO" valor={tarea.tiempo} unidad={tarea.tiempoUnidad} onCambiarValor={set("tiempo")} onCambiarUnidad={set("tiempoUnidad")} w={100} />
          <CampoEtiquetadoDiseno etiqueta="INTENSIDAD (% FCMÁX)" w={148}>
            <input value={tarea.intensidad} onChange={(e) => set("intensidad")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} w={100} />
        </div>
      )}

      {tipo === "hiit" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CampoEtiquetadoDiseno etiqueta="BLOQUES" w={60}>
            <input value={tarea.bloques} onChange={(e) => set("bloques")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoEtiquetadoDiseno etiqueta="INTERVALOS" w={72}>
            <input value={tarea.intervalos} onChange={(e) => set("intervalos")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoTiempoConUnidadDiseno etiqueta="TIEMPO" valor={tarea.tiempo} unidad={tarea.tiempoUnidad} onCambiarValor={set("tiempo")} onCambiarUnidad={set("tiempoUnidad")} w={100} />
          <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} w={100} />
        </div>
      )}

      {tipo === "rsa" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CampoEtiquetadoDiseno etiqueta="BLOQUES" w={60}>
            <input value={tarea.bloques} onChange={(e) => set("bloques")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoEtiquetadoDiseno etiqueta="SERIES" w={60}>
            <input value={tarea.series} onChange={(e) => set("series")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoEtiquetadoDiseno etiqueta="DISTANCIA (M)" w={104}>
            <input value={tarea.distancia} onChange={(e) => set("distancia")(e.target.value)} placeholder="—" style={campoStyleDiseno("100%")} />
          </CampoEtiquetadoDiseno>
          <CampoTiempoConUnidadDiseno etiqueta="RECUPERACIÓN" valor={tarea.recuperacion} unidad={tarea.recuperacionUnidad} onCambiarValor={set("recuperacion")} onCambiarUnidad={set("recuperacionUnidad")} w={100} />
        </div>
      )}

      <NotaTareaReal nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

function SelectorEjercicioReal({ ejercicios, bloque, onAdd, onAsignarZona }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  // Ejercicio (ya existente sin zona, o { nombre, nuevo: true } recién
  // escrito) que está esperando a que se le asigne zona corporal antes de
  // poder añadirse a la sesión — la zona es obligatoria desde ahora, así
  // que ningún ejercicio pasa de aquí sin ella.
  const [pendienteZona, setPendienteZona] = useState(null);
  const [guardandoZona, setGuardandoZona] = useState(false);
  const coincideBloque = (e) => !bloque || e.bloque === bloque || (bloque === "Fuerza" && e.bloque === "Específicas");
  const coincideTexto = (e) => (e.nombre || "").toLowerCase().includes(filtro.toLowerCase());

  // Igual que en la Biblioteca: la matriz aparece primero, y justo debajo,
  // indentadas, sus variantes — en vez de una lista alfabética plana donde
  // "Sentadilla" y "Sentadilla + salto" quedan sin relación aparente.
  const idsExistentes = new Set(ejercicios.map((e) => e.id));
  const variantesPorMatriz = {};
  ejercicios.forEach((e) => {
    if (e.ejercicio_base_id && idsExistentes.has(e.ejercicio_base_id)) {
      (variantesPorMatriz[e.ejercicio_base_id] = variantesPorMatriz[e.ejercicio_base_id] || []).push(e);
    }
  });
  const matrices = ejercicios.filter((e) => !e.ejercicio_base_id || !idsExistentes.has(e.ejercicio_base_id));
  const opciones = [];
  matrices.forEach((m) => {
    // Igual que en la Biblioteca: la familia se muestra si la MATRIZ o
    // CUALQUIERA de sus variantes encaja con el bloque/texto buscado — antes
    // se exigía que la matriz en sí encajara con el bloque, así que una
    // variante guardada en otro bloque (p. ej. matriz en "Movilidad" con una
    // variante pensada para "Fuerza") quedaba invisible aquí aunque sí
    // apareciera en la Biblioteca general.
    const matrizCoincide = coincideBloque(m) && coincideTexto(m);
    const variantesCoinciden = (variantesPorMatriz[m.id] || []).filter((v) => coincideBloque(v) && coincideTexto(v));
    if (matrizCoincide || variantesCoinciden.length) {
      opciones.push(m);
      variantesCoinciden.forEach((v) => opciones.push({ ...v, esVariante: true }));
    }
  });

  const cerrarTodo = () => {
    setAbierto(false);
    setFiltro("");
    setPendienteZona(null);
  };

  const elegirZona = async (zona) => {
    setGuardandoZona(true);
    try {
      if (pendienteZona.nuevo) {
        // Todavía no existe en la base de datos — la zona viaja junto con
        // el resto de datos hasta el sitio donde de verdad se crea.
        onAdd({ nombre: pendienteZona.nombre, nuevo: true, tags_descriptivos: [zona] });
      } else {
        // Ya existe: se actualiza ese ejercicio en tu biblioteca para
        // siempre, y se añade a la sesión con la zona ya puesta.
        const actualizado = await onAsignarZona(pendienteZona, zona);
        onAdd(actualizado);
      }
      cerrarTodo();
    } catch (e) {
      // Se deja el aviso abierto para que puedas reintentar sin perder la
      // búsqueda ni tener que volver a encontrar el ejercicio.
    }
    setGuardandoZona(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setAbierto((v) => !v)} style={{ fontSize: 12.5, color: ds.accent, background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontWeight: 500 }}>
        + Añadir tarea desde biblioteca
      </button>
      {abierto && (
        <CerrablePorFuera onCerrar={cerrarTodo}>
        <div style={{ position: "absolute", zIndex: 10, top: "110%", left: 0, width: 260, background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 10, boxShadow: "0 12px 28px rgba(0,0,0,0.45)", padding: 8 }}>
          {!pendienteZona && (
            <>
              <input
                autoFocus
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar ejercicio..."
                style={{ width: "100%", background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: 6, color: ds.ink, fontSize: 12.5, padding: "6px 8px", marginBottom: 6, boxSizing: "border-box" }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {opciones.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 12, padding: "8px 4px" }}>Sin resultados — se creará uno nuevo con este nombre al escribirlo</div>}
                {opciones.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      if (!(e.tags_descriptivos && e.tags_descriptivos.length)) {
                        setPendienteZona(e);
                        return;
                      }
                      onAdd(e);
                      cerrarTodo();
                    }}
                    style={{ padding: "7px 8px", paddingLeft: e.esVariante ? 18 : 8, borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = ds.border)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ color: e.esVariante ? ds.inkSecondary : ds.ink, fontSize: e.esVariante ? 12.5 : 13 }}>
                      {e.esVariante && "↳ "}
                      {e.nombre}
                    </span>
                    <span style={{ color: ds.inkMuted, fontSize: 10.5, fontFamily: dsF.mono }}>{(e.tags_descriptivos || []).join(" · ")}</span>
                  </div>
                ))}
                {filtro.trim() && (
                  <div
                    onClick={() => setPendienteZona({ nombre: filtro.trim(), nuevo: true })}
                    style={{ padding: "7px 8px", borderRadius: 6, cursor: "pointer", color: ds.accent, fontSize: 12.5, borderTop: `1px solid ${ds.border}`, marginTop: 4 }}
                  >
                    + Crear "{filtro.trim()}" como nuevo ejercicio
                  </div>
                )}
              </div>
            </>
          )}
          {pendienteZona && (
            <div style={{ padding: 4 }}>
              <div style={{ fontSize: 11.5, color: ds.accent, marginBottom: 8, lineHeight: 1.4 }}>
                "{pendienteZona.nombre}" no tiene zona corporal — asígnasela para {pendienteZona.nuevo ? "crearlo" : "añadirla"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAGS_DESCRIPTIVOS_BIBLIOTECA.map((t) => (
                  <TagChipReal key={t} tag={t} activo={false} onClick={() => elegirZona(t)} />
                ))}
              </div>
              <button
                onClick={() => setPendienteZona(null)}
                disabled={guardandoZona}
                style={{ marginTop: 8, fontSize: 11, color: ds.inkSecondary, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                {guardandoZona ? "Guardando..." : "Cancelar"}
              </button>
            </div>
          )}
        </div>
        </CerrablePorFuera>
      )}
    </div>
  );
}

function CajaCircuitoReal({ circuito, bloque, mostrarCarga, ejercicios, onEjercicioCreado, onAsignarZona, onError, materialesDisponibles, onAgregarMaterial, onCambiarTareas, onCambiarRondas, onEliminarCircuito }) {
  const tareas = circuito.tareas;
  const rondas = circuito.rondas || 1;
  const actualizarTarea = (key, nueva) => onCambiarTareas(tareas.map((t) => (t.key === key ? nueva : t)));
  const eliminarTarea = (key) => onCambiarTareas(tareas.filter((t) => t.key !== key));
  const mover = (index, dir) => {
    const destino = index + dir;
    if (destino < 0 || destino >= tareas.length) return;
    const nueva = [...tareas];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
    onCambiarTareas(nueva);
  };

  // Si el ejercicio es nuevo (escrito a mano, todavía no existe en la
  // Biblioteca — viene sin `id`), hay que crearlo de verdad antes de usar su
  // id. Antes esto solo se hacía para tareas sueltas; dentro de un circuito
  // se guardaba con ejercicioId vacío y el nombre se perdía para siempre
  // (aparecía luego como "(ejercicio eliminado)" sin haberse eliminado nada).
  const agregarEjercicioAlCircuito = async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    if (!ejercicioId) {
      // Si crear el ejercicio falla (sin conexión, backend atascado...) hay
      // que avisar y parar aquí — si no, se seguía intentando añadir la
      // tarea con un ejercicioId vacío, sin decir nada, y quedaba con el
      // nombre perdido para siempre.
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        onEjercicioCreado?.(creado);
      } catch (e) {
        onError?.("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    const base =
      bloque === "Resistencia"
        ? { key: Date.now() + Math.random(), nombre, ejercicioId, tipoResistenciaCardio: "", bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", recuperacion: "", recuperacionUnidad: "seg", nota: "" }
        : { key: Date.now() + Math.random(), nombre, ejercicioId, modo: "reps", series: "", cantidad: "", rir: "", modoCarga: "rir", pct1rm: "", tipoResistencia: "Peso libre", materiales: [], lateralidad: "bilateral", nota: "" };
    onCambiarTareas([...tareas, base]);
  };

  return (
    <div style={{ border: `1.5px solid ${ds.accentBorderSubtle}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: `${ds.surface}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.06em", color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 4, padding: "2px 7px" }}>CIRCUITO</span>
        <span style={{ fontSize: 11, color: ds.inkMuted, flex: 1 }}>
          {tareas.length} {tareas.length === 1 ? "ejercicio" : "ejercicios"} · en orden
        </span>
        <button onClick={onEliminarCircuito} style={botonMiniStyleDiseno} title="Eliminar circuito completo">
          ×
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: ds.bgElevated, border: `1px solid ${ds.accentSubtle}`, borderRadius: 8, padding: "8px 10px" }}>
        <span style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.06em", color: ds.accent, fontWeight: 600 }}>RONDAS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => onCambiarRondas(Math.max(1, rondas - 1))}
            style={{ width: 26, height: 26, borderRadius: 6, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
          >
            −
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: ds.ink, minWidth: 22, textAlign: "center" }}>{rondas}</span>
          <button
            type="button"
            onClick={() => onCambiarRondas(rondas + 1)}
            style={{ width: 26, height: 26, borderRadius: 6, background: ds.surface, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
          >
            +
          </button>
        </div>
        <span style={{ fontSize: 11.5, color: ds.inkSecondary }}>{rondas === 1 ? "vuelta al circuito" : "vueltas al circuito"}</span>
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
      <SelectorEjercicioReal ejercicios={ejercicios} bloque={bloque} onAdd={agregarEjercicioAlCircuito} onAsignarZona={onAsignarZona} />
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
    modoCarga: "rir",
    pct1rm: "",
    tipoResistencia: "Peso libre",
    materiales: [],
    lateralidad: "bilateral",
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

// Igual que elegirSiguienteRotacion pero para cuando ese día se quieren N
// ejercicios seguidos de la misma categoría en vez de solo 1 (p. ej. una
// sesión dedicada por completo al trabajo preventivo). Una sola lectura y
// una sola escritura del puntero, no N — importa porque cada llamada a Apps
// Script tiene latencia propia.
async function elegirVariosRotacion(claveCategoria, poolOrdenado, cantidad) {
  if (!poolOrdenado.length || cantidad <= 0) return [];
  const actual = await api.rotacion(claveCategoria);
  const punteroInicial = actual ? Number(actual.puntero_actual) || 0 : 0;
  const elegidos = [];
  for (let i = 0; i < cantidad; i++) {
    elegidos.push(poolOrdenado[(punteroInicial + i) % poolOrdenado.length]);
  }
  await api.setRotacion(claveCategoria, punteroInicial + cantidad);
  return elegidos;
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

function ListaJugadoresCheckReal({ players, seleccionados, onCambiar }) {
  const alternar = (id) => {
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto", border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 8 }}>
      {players.length === 0 && <div style={{ fontSize: 12.5, color: ds.inkMuted, padding: "8px 4px" }}>No hay jugadores para elegir.</div>}
      {players.map((p) => {
        const activo = seleccionados.includes(p.id);
        return (
          <div
            key={p.id}
            onClick={() => alternar(p.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: dsR.sm, cursor: "pointer", background: activo ? ds.accentSubtle : "transparent" }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: `1.5px solid ${activo ? ds.accent : ds.border}`,
                background: activo ? ds.accent : "transparent",
                color: ds.accentInk,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {activo ? "✓" : ""}
            </span>
            <span style={{ fontSize: 13.5, color: ds.ink }}>{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function DisenoSesionReal({ sesionExistente, plantilla, onBack, onGuardado }) {
  const isEditing = !!sesionExistente;
  // Reutilizar: misma configuración base que editar (destinatarios, objetivo,
  // activación, preventivo...), pero SIN heredar id ni fechas — es una sesión
  // nueva de arriba a abajo, solo "inspirada" en la anterior.
  const esReutilizacion = !!plantilla;
  const base = sesionExistente || plantilla;
  const [players, , playersLoaded] = usePlayers();
  const [categoriasPreventivas, categoriasLoaded] = useCategoriasPreventivas();
  const [ejercicios, , ejerciciosLoaded, , , addEjercicioLocal] = useEntityList("ejercicios");
  const [materialesDisponibles, materialesLoaded, agregarMaterial] = useMaterialesDisponibles();
  // Le dice a SelectorEjercicioReal cómo guardar la zona corporal de un
  // ejercicio antiguo que todavía no la tenía, y refresca la lista local
  // para que el cambio se vea sin recargar la pantalla.
  const asignarZonaYActualizar = async (ejercicio, zona) => {
    const actualizado = await actualizarZonaEjercicio(ejercicio, zona);
    addEjercicioLocal(actualizado);
    return actualizado;
  };

  const [md, setMd] = useState(isEditing ? base?.md || "" : "");
  const [objetivo, setObjetivo] = useState(base?.objetivo || "");
  // Nombre de plantilla, opcional — es lo que permite luego encontrarla en
  // la Biblioteca de sesiones y reutilizarla sin tener que reconocerla por
  // la fecha en la que se programó. Se hereda tanto al editar como al
  // reutilizar (con "Reutilizar como nueva" seguramente quieras el mismo
  // nombre — puedes cambiarlo aquí mismo si no).
  const [nombre, setNombre] = useState(base?.nombre || "");
  const [fechas, setFechas] = useState(sesionExistente?.fechas?.length ? sesionExistente.fechas : [todayStr()]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [targetPlayerIds, setTargetPlayerIds] = useState(base?.jugadores_destino ?? null);
  const [activacionActiva, setActivacionActiva] = useState(base ? !!base.activacion_activa : true);
  const [activacionEjercicioId, setActivacionEjercicioId] = useState("");
  const [activacionEjercicioNombre, setActivacionEjercicioNombre] = useState("");
  const [duracionActivacion, setDuracionActivacion] = useState("8");
  const [unidadActivacion, setUnidadActivacion] = useState("minutos");
  // A diferencia de Activación, CMJ no es rutina de cada sesión — es un día
  // de medición puntual, así que por defecto va desactivado en una sesión
  // nueva (nunca se enciende solo). Tampoco hace falta elegir ejercicio: es
  // siempre el mismo test, así que se resuelve solo al guardar (más abajo).
  const [cmjActiva, setCmjActiva] = useState(base ? !!base.cmj_activo : false);
  // preventivo_activo pasa de booleano a número (cuántos ejercicios de la
  // categoría se aplican ese día, 0 = no se aplica) sin cambiar el nombre de
  // la columna en la Sheet — las sesiones antiguas guardaron ahí un booleano
  // (true/false), así que se convierten a 1/0 la primera vez que se leen;
  // las nuevas guardan directamente el número elegido.
  const [preventivoCantidad, setPreventivoCantidad] = useState(() => {
    if (!base) return 1;
    const v = base.preventivo_activo;
    if (typeof v === "boolean") return v ? 1 : 0;
    return Number(v) || 0;
  });

  const [tareasCore, setTareasCore] = useState([]);
  const [circuitosCore, setCircuitosCore] = useState([]);
  const [tareasResistencia, setTareasResistencia] = useState([]);
  const [circuitosResistencia, setCircuitosResistencia] = useState([]);
  const [tareasFuerza, setTareasFuerza] = useState([]);
  const [circuitosFuerza, setCircuitosFuerza] = useState([]);

  const [previousTareaIds, setPreviousTareaIds] = useState([]);
  const [activacionTareaId, setActivacionTareaId] = useState(null);
  const [cmjTareaId, setCmjTareaId] = useState(null);
  const [movilidadTareaIdsPorFecha, setMovilidadTareaIdsPorFecha] = useState({});
  const [preventivoTareaIdsPorFecha, setPreventivoTareaIdsPorFecha] = useState({}); // fecha -> [id, id, ...]
  const [previousCircuitoIds, setPreviousCircuitoIds] = useState([]);
  const [cargandoExistente, setCargandoExistente] = useState(isEditing || esReutilizacion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  // Solo se bloquea si algún jugador ya registró datos reales sobre esta
  // sesión (no basta con que esté "enviada" — ese campo solo indica que tú
  // la publicaste, se pone a true en cuanto guardas). Se determina de forma
  // asíncrona en el efecto de carga de abajo, mirando la tabla de registros.
  const [readOnly, setReadOnly] = useState(false);
  // Los dos efectos de abajo (reutilizar / cargar sesión existente) reparten
  // el borrador SOLO la primera vez que hay ejercicios cargados. Sin este
  // guard, cualquier cosa que refresque la lista de ejercicios más tarde
  // (p. ej. crear un ejercicio nuevo desde el propio editor) hace que
  // `ejerciciosLoaded` pase a false y vuelva a true, y el efecto se repetía
  // — reconstruyendo el borrador desde cero y borrando lo que ya se hubiera
  // añadido en esta sesión de edición, incluida la tarea recién creada.
  const borradorCargadoRef = useRef(false);

  // Reutilizar una sesión pasada: reparte sus tareas/circuitos en los mismos
  // bloques, pero generados como registros NUEVOS (sin tareaId/circuitoId
  // heredado) — al guardar se crean filas nuevas, la sesión original de la
  // que se partió no se toca. No hay llamada al backend: todo sale de las
  // tareas que Programación ya tenía cargadas para esa sesión.
  useEffect(() => {
    if (!esReutilizacion || !ejerciciosLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
    const tareas = plantilla.tareas || [];
    const porBloque = (nombreBloque) => tareas.filter((t) => t.bloque_sesion === nombreBloque && !t.circuito_id).map((t) => tareaADraft(t, ejerciciosById, { nuevo: true }));
    setTareasCore(porBloque("Core"));
    setCircuitosCore(agruparCircuitosDeTareas(tareas, ejerciciosById, "Core", { nuevo: true }));
    setTareasResistencia(porBloque("Resistencia"));
    setCircuitosResistencia(agruparCircuitosDeTareas(tareas, ejerciciosById, "Resistencia", { nuevo: true }));
    setTareasFuerza(porBloque("Fuerza"));
    setCircuitosFuerza(agruparCircuitosDeTareas(tareas, ejerciciosById, "Fuerza", { nuevo: true }));
    const activacionTarea = tareas.find((t) => t.bloque_sesion === "Activación");
    if (activacionTarea) {
      setDuracionActivacion(String(activacionTarea.cantidad || "8"));
      setUnidadActivacion(activacionTarea.modo === "tiempo" ? "segundos" : "minutos");
      const eAct = ejerciciosById.get(activacionTarea.ejercicio_id);
      if (eAct) {
        setActivacionEjercicioId(eAct.id);
        setActivacionEjercicioNombre(eAct.nombre || "(ejercicio eliminado)");
      }
    }
    const cmjTarea = tareas.find((t) => t.bloque_sesion === "CMJ");
    if (cmjTarea) setCmjActiva(true);
    setCargandoExistente(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esReutilizacion, ejerciciosLoaded]);

  // Carga de sesión existente (edición): reparte tareas/circuitos en su bloque real.
  useEffect(() => {
    if (!isEditing || !ejerciciosLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    let cancelled = false;
    (async () => {
      // Nunca fiarse del filtro del backend — se ha confirmado que no
      // filtra de verdad. Se filtra siempre aquí también, o al editar
      // cualquier sesión aparecerían mezcladas tareas y circuitos de todas
      // las demás sesiones que existan.
      const todasLasTareas = await api.list("tareas", { sesion_id: sesionExistente.id });
      const tareas = todasLasTareas.filter((t) => t.sesion_id === sesionExistente.id);
      const todosLosCircuitos = await api.list("circuitos", { sesion_id: sesionExistente.id });
      const circuitos = todosLosCircuitos.filter((c) => c.sesion_id === sesionExistente.id);
      // Se bloquea la sesión entera solo si ALGÚN jugador ya registró datos
      // reales para alguna de sus tareas — mientras nadie la haya rellenado,
      // se edita con normalidad, esté "enviada" o no.
      const tareaIds = new Set(tareas.map((t) => t.id));
      const todosLosRegistros = tareaIds.size ? await api.list("registros", {}) : [];
      const hayRegistro = todosLosRegistros.some((r) => tareaIds.has(r.tarea_id));
      if (cancelled) return;
      setReadOnly(hayRegistro);
      const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
      const toDraft = (t) => {
        let materiales = [];
        try {
          materiales = t.material ? JSON.parse(t.material) : [];
        } catch {
          materiales = [];
        }
        // Sesiones diseñadas antes de este cambio guardaban Resistencia como
        // "intervalos/trabajo/descanso" en las columnas genéricas de series/
        // cantidad/rir — se leen igual si no hay resistencia_data, para no
        // perder lo ya diseñado.
        let resistencia = { tipo: "", bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", recuperacion: "", recuperacionUnidad: "seg" };
        if (t.resistencia_data) {
          try {
            resistencia = { ...resistencia, ...JSON.parse(t.resistencia_data) };
          } catch {
            /* se queda el valor por defecto */
          }
        } else if (t.bloque_sesion === "Resistencia" && (t.series || t.cantidad || t.rir)) {
          resistencia = { ...resistencia, tipo: "hiit", intervalos: t.series ?? "", tiempo: t.cantidad ?? "", recuperacion: t.rir ?? "" };
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
          modoCarga: t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
          pct1rm: t.pct1rm ?? "",
          tipoResistencia: t.tipo_resistencia || "Peso libre",
          materiales,
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          tipoResistenciaCardio: resistencia.tipo,
          bloques: resistencia.bloques,
          intervalos: resistencia.intervalos,
          tiempo: resistencia.tiempo,
          tiempoUnidad: resistencia.tiempoUnidad,
          intensidad: resistencia.intensidad,
          distancia: resistencia.distancia,
          recuperacion: resistencia.recuperacion,
          recuperacionUnidad: resistencia.recuperacionUnidad,
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
            rondas: c.rondas || 1,
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
        setDuracionActivacion(String(activacionTarea.cantidad || "8"));
        setUnidadActivacion(activacionTarea.modo === "tiempo" ? "segundos" : "minutos");
        setActivacionTareaId(activacionTarea.id);
        const eAct = ejerciciosById.get(activacionTarea.ejercicio_id);
        if (eAct) {
          setActivacionEjercicioId(eAct.id);
          setActivacionEjercicioNombre(eAct.nombre || "(ejercicio eliminado)");
        }
      }
      const cmjTarea = tareas.find((t) => t.bloque_sesion === "CMJ");
      if (cmjTarea) {
        setCmjActiva(true);
        setCmjTareaId(cmjTarea.id);
      }
      const mapaPorFecha = (nombreBloque) => {
        const mapa = {};
        tareas.filter((t) => t.bloque_sesion === nombreBloque).forEach((t) => {
          mapa[t.fecha || ""] = t.id;
        });
        return mapa;
      };
      const mapaPorFechaArray = (nombreBloque) => {
        const mapa = {};
        tareas.filter((t) => t.bloque_sesion === nombreBloque).forEach((t) => {
          const clave = t.fecha || "";
          if (!mapa[clave]) mapa[clave] = [];
          mapa[clave].push(t.id);
        });
        return mapa;
      };
      setMovilidadTareaIdsPorFecha(mapaPorFecha("Movilidad"));
      setPreventivoTareaIdsPorFecha(mapaPorFechaArray("Preventivo"));
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
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        addEjercicioLocal(creado);
      } catch (e) {
        setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    bloqueSetter((prev) => [...prev, nuevaTareaBase({ id: ejercicioId, nombre })]);
  };

  const elegirEjercicioActivacion = async (ejercicioOClic) => {
    let ejercicioId = ejercicioOClic.id;
    let nombre = ejercicioOClic.nombre;
    if (!ejercicioId) {
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        addEjercicioLocal(creado);
      } catch (e) {
        setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
    }
    setActivacionEjercicioId(ejercicioId);
    setActivacionEjercicioNombre(nombre);
  };

  const guardar = async (comoBorrador = false) => {
    setError("");
    setOk(false);
    // Un borrador puede guardarse a medias (sin fecha todavía) para
    // retomarlo luego — la fecha solo es obligatoria al publicar de verdad,
    // porque ahí sí determina cuándo lo verá el jugador.
    if (!comoBorrador && !fechas.length) {
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
        nombre: nombre.trim(),
        jugadores_destino: targetPlayerIds,
        preventivo_activo: preventivoCantidad,
        activacion_activa: activacionActiva,
        cmj_activo: cmjActiva,
        lote_origen_id: "",
        // "enviada" aquí significa "publicada, visible para el jugador" —
        // no que el jugador ya haya mandado datos. Un borrador se guarda con
        // esto en false, así que bootstrapJugador_ (que filtra por
        // s.enviada) sigue sin mostrárselo, y en Programación se distingue
        // con la etiqueta "BORRADOR" mezclada entre las próximas.
        enviada: !comoBorrador,
      };
      const savedSesion = await api.save("sesiones", sesionRecord);

      const keepTareaIds = new Set();
      const keepCircuitoIds = new Set();

      // Todo lo propio de Resistencia (tipo continuo/HIIT/RSA y sus campos)
      // va en una sola columna JSON — los campos genéricos de series/cantidad/
      // rir se dejan vacíos para estas tareas, ya no se reaprovechan como antes.
      const serializarResistencia = (t) =>
        JSON.stringify({
          tipo: t.tipoResistenciaCardio || "",
          bloques: t.bloques || "",
          series: t.series || "",
          intervalos: t.intervalos || "",
          tiempo: t.tiempo || "",
          tiempoUnidad: t.tiempoUnidad || "",
          intensidad: t.intensidad || "",
          distancia: t.distancia || "",
          recuperacion: t.recuperacion || "",
          recuperacionUnidad: t.recuperacionUnidad || "",
        });

      const guardarTareaSuelta = async (t, bloqueNombre, mostrarCarga) => {
        const ejercicioId = t.ejercicioId;
        const esResistencia = bloqueNombre === "Resistencia";
        const saved = await api.save("tareas", {
          id: t.tareaId,
          sesion_id: savedSesion.id,
          bloque_sesion: bloqueNombre,
          ejercicio_id: ejercicioId,
          modo: esResistencia ? "" : t.modo,
          series: esResistencia ? "" : t.series,
          cantidad: esResistencia ? "" : t.cantidad,
          rir: esResistencia ? "" : t.rir,
          modo_carga: esResistencia ? "" : t.modoCarga || "rir",
          pct1rm: esResistencia ? "" : t.pct1rm || "",
          resistencia_data: esResistencia ? serializarResistencia(t) : "",
          tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
          material: JSON.stringify(t.materiales || []), // el material se guarda siempre, aunque el bloque no muestre carga (antes se perdía en Core)
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      };

      const guardarCircuito = async (c, bloqueNombre, mostrarCarga) => {
        const esResistencia = bloqueNombre === "Resistencia";
        const savedCircuito = await api.save("circuitos", { id: c.circuitoId, sesion_id: savedSesion.id, bloque_sesion: bloqueNombre, rondas: c.rondas || 1 });
        keepCircuitoIds.add(savedCircuito.id);
        await Promise.all(
          c.tareas.map(async (t, i) => {
            const saved = await api.save("tareas", {
              id: t.tareaId,
              sesion_id: savedSesion.id,
              bloque_sesion: bloqueNombre,
              ejercicio_id: t.ejercicioId,
              modo: esResistencia ? "" : t.modo,
              series: esResistencia ? "" : t.series,
              cantidad: esResistencia ? "" : t.cantidad,
              rir: esResistencia ? "" : t.rir,
              modo_carga: esResistencia ? "" : t.modoCarga || "rir",
              pct1rm: esResistencia ? "" : t.pct1rm || "",
              resistencia_data: esResistencia ? serializarResistencia(t) : "",
              tipo_resistencia: mostrarCarga ? t.tipoResistencia || "" : "",
              material: JSON.stringify(t.materiales || []), // idem: antes se perdía en Core al ir dentro de un circuito
              lateralidad: t.lateralidad || "bilateral",
              nota: t.nota || "",
              circuito_id: savedCircuito.id,
              orden_en_circuito: i + 1,
            });
            keepTareaIds.add(saved.id);
          })
        );
      };

      // Activación: una única tarea con el ejercicio que el entrenador elija
      // de la biblioteca (ya no fijo a "Bici estática").
      if (activacionActiva && activacionEjercicioId) {
        const saved = await api.save("tareas", {
          id: activacionTareaId || undefined,
          sesion_id: savedSesion.id,
          bloque_sesion: "Activación",
          ejercicio_id: activacionEjercicioId,
          modo: unidadActivacion === "segundos" ? "tiempo" : "minutos",
          series: "",
          cantidad: duracionActivacion,
          rir: "",
          tipo_resistencia: "",
          material: "",
          nota: "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      }

      // CMJ: día de medición puntual — no es una tarea configurable, es
      // siempre el mismo test. No hace falta que el entrenador elija nada:
      // se resuelve aquí solo (se crea la primera vez, luego se reutiliza).
      // Sin series/reps/RIR — no es una prescripción de carga, es un aviso
      // de que hoy toca test de salto.
      if (cmjActiva) {
        const ejercicioCmj = await resolveEjercicio(ejercicios, { nombre: "CMJ", bloque: "", sin_lateralidad: "si" });
        const saved = await api.save("tareas", {
          id: cmjTareaId || undefined,
          sesion_id: savedSesion.id,
          bloque_sesion: "CMJ",
          ejercicio_id: ejercicioCmj.id,
          modo: "reps",
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
      // Preventivo: versión simple — de 0 a N ejercicios por fecha (elegidos
      // por el entrenador, no fijo a 1), según la categoría común a todos
      // los jugadores destinatarios. Igual que Movilidad, cada fecha avanza
      // el puntero por separado (aquí, N posiciones en vez de 1). Si no hay
      // una única categoría común, se omite sin avisar con error — es una
      // omisión esperada.
      if (preventivoCantidad > 0) {
        const catId = categoriaComunEntreJugadores(targetPlayerIds, players);
        if (catId) {
          const poolPreventivo = ejercicios
            .filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId)
            .slice()
            .sort((a, b) => (Number(a.orden_rotacion) || 999) - (Number(b.orden_rotacion) || 999));
          if (poolPreventivo.length) {
            for (const fecha of fechas) {
              const elegidos = await elegirVariosRotacion(catId, poolPreventivo, preventivoCantidad);
              const idsExistentes = preventivoTareaIdsPorFecha[fecha] || [];
              for (let i = 0; i < elegidos.length; i++) {
                const saved = await api.save("tareas", {
                  id: idsExistentes[i] || undefined,
                  sesion_id: savedSesion.id,
                  bloque_sesion: "Preventivo",
                  ejercicio_id: elegidos[i].id,
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

      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();

      setOk(comoBorrador ? "borrador" : true);
      onGuardado?.();
    } catch (e) {
      setError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const loaded = playersLoaded && categoriasLoaded && ejerciciosLoaded && materialesLoaded && !cargandoExistente;
  if (!loaded) return <LoadingBlock />;

  return (
    <PantallaBase rol="entrenador" maxWidth={640}>
      <div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        {readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "10px 12px", marginBottom: 18, fontSize: 12.5, color: ds.accent }}>
            <Lock size={13} style={{ flexShrink: 0 }} />
            Un jugador ya registró datos de esta sesión — solo lectura. Para cambiar algo, vuelve al listado y usa "Reutilizar como nueva".
          </div>
        )}
        <div style={{ marginBottom: 22, pointerEvents: readOnly ? "none" : undefined }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>{isEditing ? (readOnly ? "YA REGISTRADA" : "EDITAR SESIÓN") : "NUEVA SESIÓN"}</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Diseño de sesión</h1>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.accent }}>NOMBRE DE PLANTILLA (OPCIONAL — PARA BUSCARLA LUEGO EN LA BIBLIOTECA)</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder='Ej. "Fuerza tren inferior — pretemporada"'
              style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 13, padding: "8px 10px" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>OBJETIVO (OPCIONAL)</span>
            <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 13, padding: "8px 10px" }} />
          </label>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>PARA</div>
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
                    border: `1px solid ${ds.border}`,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    background: (t.id === "equipo") === (targetPlayerIds === null) ? ds.accentSubtle : "transparent",
                    color: (t.id === "equipo") === (targetPlayerIds === null) ? ds.accent : ds.inkSecondary,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {targetPlayerIds !== null && (
              <ListaJugadoresCheckReal players={players} seleccionados={targetPlayerIds} onCambiar={setTargetPlayerIds} />
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>FECHAS EN LAS QUE SE APLICA ESTA SESIÓN</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {fechas.map((f) => (
                <span key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: dsF.mono, fontSize: 11.5, color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "4px 8px" }}>
                  {f}
                  <span onClick={() => removeFecha(f)} style={{ cursor: "pointer", color: ds.inkMuted }}>
                    ×
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }} />
              <button onClick={addFecha} style={{ background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
                + Añadir fecha
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>MD (OPCIONAL)</div>
            <select value={md} onChange={(e) => setMd(e.target.value)} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px", maxWidth: 160 }}>
              <option value="">Sin clasificar</option>
              {MD_TAGS.filter((t) => t !== "Sin MD").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, pointerEvents: readOnly ? "none" : undefined }}>
          {BLOQUES_DISENO.map((b) => (
            <div key={b.id} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${ds.border}` }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: ds.bgElevated, display: "flex", alignItems: "center", justifyContent: "center", color: ds.inkSecondary, flexShrink: 0 }}>
                  <IconoBloqueDiseno id={b.id} />
                </div>
                <div style={{ fontFamily: dsF.mono, fontSize: 11, color: ds.inkMuted, width: 14 }}>{String(b.numero).padStart(2, "0")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{b.nombre}</div>
                  <div style={{ fontSize: 11.5, color: ds.inkMuted }}>{b.descripcion}</div>
                </div>
                <EtiquetaModoDiseno modo={b.modo} />
              </div>
              <div style={{ padding: 14 }}>
                {b.id === "activacion" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div onClick={() => setActivacionActiva((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <span style={{ width: 34, height: 20, borderRadius: 10, background: activacionActiva ? ds.accent : ds.border, position: "relative", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: 2, left: activacionActiva ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: ds.canvas }} />
                      </span>
                      <span style={{ fontSize: 13, color: activacionActiva ? ds.ink : ds.inkMuted }}>{activacionActiva ? "Activada para esta sesión" : "Sin acceso a activación — sesión empieza en Movilidad"}</span>
                    </div>
                    {activacionActiva && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: ds.inkSecondary }}>Ejercicio</span>
                          <span style={{ fontSize: 13, color: activacionEjercicioNombre ? ds.ink : ds.inkMuted, fontWeight: activacionEjercicioNombre ? 600 : 400 }}>
                            {activacionEjercicioNombre || "Sin elegir todavía"}
                          </span>
                        </div>
                        <SelectorEjercicioReal ejercicios={ejercicios} bloque={null} onAdd={elegirEjercicioActivacion} onAsignarZona={asignarZonaYActualizar} />
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 13, color: ds.inkSecondary }}>Duración</span>
                          <input value={duracionActivacion} onChange={(e) => setDuracionActivacion(e.target.value)} style={campoStyleDiseno(50)} />
                          <button
                            onClick={() => setUnidadActivacion((u) => (u === "minutos" ? "segundos" : "minutos"))}
                            style={{
                              fontSize: 11,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: `1px solid ${ds.border}`,
                              background: ds.border,
                              color: ds.accent,
                              cursor: "pointer",
                            }}
                          >
                            {unidadActivacion === "minutos" ? "min" : "seg"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {b.id === "movilidad" && (() => {
                  const poolMov = ejercicios.filter((e) => e.bloque === "Movilidad");
                  return (
                    <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                      {poolMov.length
                        ? `La app elegirá automáticamente el siguiente ejercicio del pool de Movilidad (${poolMov.length} en el pool) al guardar. No requiere acción aquí.`
                        : "No hay ejercicios en el pool de Movilidad todavía — añade alguno en Biblioteca para que este bloque se aplique."}
                    </div>
                  );
                })()}
                {b.id === "preventivo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: ds.inkSecondary }}>Ejercicios ese día</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setPreventivoCantidad((v) => Math.max(0, v - 1))}
                          style={{ width: 26, height: 26, borderRadius: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
                        >
                          −
                        </button>
                        <span style={{ width: 24, textAlign: "center", fontFamily: dsF.mono, fontSize: 14, color: preventivoCantidad > 0 ? ds.accent : ds.inkMuted }}>
                          {preventivoCantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreventivoCantidad((v) => v + 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, background: ds.bgElevated, border: `1px solid ${ds.border}`, color: ds.ink, fontSize: 15, cursor: "pointer", lineHeight: 1 }}
                        >
                          +
                        </button>
                      </div>
                      <span style={{ fontSize: 12, color: ds.inkMuted }}>{preventivoCantidad === 0 ? "no se aplicará hoy" : "de la categoría común detectada"}</span>
                    </div>
                    {preventivoCantidad > 0 &&
                      (() => {
                        const catId = categoriaComunEntreJugadores(targetPlayerIds, players);
                        const cat = catId ? categoriasPreventivas.find((c) => c.id === catId) : null;
                        if (!cat) {
                          return (
                            <div style={{ fontSize: 11.5, color: ds.warning }}>
                              No hay una única categoría preventiva común a todos los jugadores destinatarios — este bloque se omitirá al guardar. Dirige la sesión a jugadores que compartan una sola categoría para que se aplique.
                            </div>
                          );
                        }
                        const poolPrev = ejercicios.filter((e) => e.bloque === "Preventivo" && e.categoria_preventiva_id === catId);
                        return (
                          <>
                            <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                              Categoría detectada para este roster: <span style={{ color: ds.accent, fontWeight: 500 }}>{cat.nombre}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: poolPrev.length ? ds.inkMuted : ds.warning }}>
                              {poolPrev.length
                                ? `${poolPrev.length} ejercicio(s) en el pool de esta categoría${preventivoCantidad > poolPrev.length ? " — al pedir más de los que hay, el ciclo se repetirá ese día." : "."}`
                                : "Esta categoría no tiene ejercicios en su pool todavía — el bloque se omitirá."}
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
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosCore((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onEliminarCircuito={() => setCircuitosCore((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal ejercicios={ejercicios} bloque="Core" onAdd={agregarTarea(setTareasCore)} onAsignarZona={asignarZonaYActualizar} />
                      <button
                        onClick={() => setCircuitosCore((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
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
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosResistencia((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onEliminarCircuito={() => setCircuitosResistencia((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal
                        ejercicios={ejercicios}
                        bloque="Resistencia"
                        onAsignarZona={asignarZonaYActualizar}
                        onAdd={async (eOClic) => {
                          let ejercicioId = eOClic.id;
                          let nombre = eOClic.nombre;
                          if (!ejercicioId) {
                            try {
                              const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "", tags_descriptivos: eOClic.tags_descriptivos || [] });
                              ejercicioId = creado.id;
                              addEjercicioLocal(creado);
                            } catch (e) {
                              setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
                              return;
                            }
                          }
                          setTareasResistencia((prev) => [...prev, { key: Date.now() + Math.random(), nombre, ejercicioId, tipoResistenciaCardio: "", bloques: "", series: "", intervalos: "", tiempo: "", tiempoUnidad: "seg", intensidad: "", distancia: "", recuperacion: "", recuperacionUnidad: "seg", nota: "" }]);
                        }}
                      />
                      <button
                        onClick={() => setCircuitosResistencia((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}
                {b.id === "cmj" && (
                  <div onClick={() => setCmjActiva((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, background: cmjActiva ? ds.accent : ds.border, position: "relative", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: cmjActiva ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: ds.canvas }} />
                    </span>
                    <span style={{ fontSize: 13, color: cmjActiva ? ds.ink : ds.inkMuted }}>{cmjActiva ? "Hoy toca medición CMJ" : "Sin medición CMJ esta sesión"}</span>
                  </div>
                )}
                {b.id === "fuerza" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasFuerza.map((t, i) => (
                      <FilaTareaReal
                        key={t.key}
                        tarea={t}
                        orden={i + 1}
                        mostrarCarga={true}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) => setTareasFuerza((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                        onEliminar={() => setTareasFuerza((prev) => prev.filter((x) => x.key !== t.key))}
                        onSubir={
                          i > 0
                            ? () =>
                                setTareasFuerza((prev) => {
                                  const nueva = [...prev];
                                  [nueva[i - 1], nueva[i]] = [nueva[i], nueva[i - 1]];
                                  return nueva;
                                })
                            : null
                        }
                        onBajar={
                          i < tareasFuerza.length - 1
                            ? () =>
                                setTareasFuerza((prev) => {
                                  const nueva = [...prev];
                                  [nueva[i], nueva[i + 1]] = [nueva[i + 1], nueva[i]];
                                  return nueva;
                                })
                            : null
                        }
                      />
                    ))}
                    {circuitosFuerza.map((c) => (
                      <CajaCircuitoReal
                        key={c.key}
                        circuito={c}
                        bloque="Fuerza"
                        mostrarCarga={true}
                        ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                        onCambiarRondas={(r) => setCircuitosFuerza((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                        onEliminarCircuito={() => setCircuitosFuerza((prev) => prev.filter((x) => x.key !== c.key))}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicioReal ejercicios={ejercicios} bloque="Fuerza" onAdd={agregarTarea(setTareasFuerza)} onAsignarZona={asignarZonaYActualizar} />
                      <button
                        onClick={() => setCircuitosFuerza((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                        style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
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

        {!readOnly && error && <div style={{ color: ds.danger, fontSize: 13, marginTop: 14 }}>{error}</div>}
        {!readOnly && ok && <div style={{ color: ds.success, fontSize: 13, marginTop: 14 }}>{ok === "borrador" ? "Guardado como borrador." : "Guardado y enviado."}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: 8, padding: "10px 16px", fontSize: 13.5, cursor: "pointer" }}>
            {readOnly ? "Volver" : "Cancelar"}
          </button>
          {!readOnly && (
            <>
              <button
                onClick={() => guardar(true)}
                disabled={guardando}
                title="Se guarda tal cual está, sin fecha obligatoria, y no se envía al jugador hasta que la publiques"
                style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                onClick={() => guardar(false)}
                disabled={guardando}
                style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 8, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? "Guardando..." : "Guardar y enviar"}
              </button>
            </>
          )}
        </div>
      </div>
    </PantallaBase>
  );
}

// ---------- DINÁMICAS COMPLEMENTARIAS ----------
// Sesión "de pleno derecho" pero con tipo:"complementaria" y un único bloque
// de nombre libre (en vez de los 6 fijos de Diseñar sesión) — pensada para
// programas puntuales (ej. "Miembro Superior") que se activan solo los días
// concretos que elijas, para el equipo entero o para jugadores concretos.
// Al guardarse como una Sesión más, la pantalla del jugador la fusiona sola
// junto a lo que tenga programado ese día (o la muestra sola si no hay nada
// más), sin ningún cambio en PantallaJugadorReal — ya agrupa por bloque_sesion
// cualquier sesión que coincida con la fecha y el jugador.
function DinamicaComplementariaReal({ sesionExistente, plantilla, onBack, onGuardado }) {
  const isEditing = !!sesionExistente;
  const esReutilizacion = !!plantilla;
  const base = sesionExistente || plantilla;
  const [players, , playersLoaded] = usePlayers();
  const [ejercicios, , ejerciciosLoaded, , , addEjercicioLocal] = useEntityList("ejercicios");
  const [materialesDisponibles, materialesLoaded, agregarMaterial] = useMaterialesDisponibles();
  const asignarZonaYActualizar = async (ejercicio, zona) => {
    const actualizado = await actualizarZonaEjercicio(ejercicio, zona);
    addEjercicioLocal(actualizado);
    return actualizado;
  };

  const [nombreBloque, setNombreBloque] = useState("");
  const [fechas, setFechas] = useState(sesionExistente?.fechas?.length ? sesionExistente.fechas : [todayStr()]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [targetPlayerIds, setTargetPlayerIds] = useState(base?.jugadores_destino ?? null);
  const [tareasBloque, setTareasBloque] = useState([]);
  const [circuitosBloque, setCircuitosBloque] = useState([]);

  const [previousTareaIds, setPreviousTareaIds] = useState([]);
  const [previousCircuitoIds, setPreviousCircuitoIds] = useState([]);
  const [cargandoExistente, setCargandoExistente] = useState(isEditing || esReutilizacion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  // Solo se bloquea si algún jugador ya registró datos reales sobre esta
  // dinámica — se determina de forma asíncrona en el efecto de carga.
  const [readOnly, setReadOnly] = useState(false);
  // Mismo guard que en Diseñar sesión: reparte el borrador una sola vez,
  // para que crear un ejercicio nuevo durante la edición (que refresca la
  // lista de ejercicios) no vuelva a machacar lo ya añadido.
  const borradorCargadoRef = useRef(false);

  // Reutilizar: mismo nombre de dinámica y tareas, generadas como registros
  // nuevos — la sesión original no se toca al guardar.
  useEffect(() => {
    if (!esReutilizacion || !ejerciciosLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    const ejerciciosById = new Map(ejercicios.map((e) => [e.id, e]));
    const tareas = plantilla.tareas || [];
    const nombreDetectado = tareas[0]?.bloque_sesion || "";
    setNombreBloque(nombreDetectado);
    setTareasBloque(tareas.filter((t) => !t.circuito_id).map((t) => tareaADraft(t, ejerciciosById, { nuevo: true })));
    setCircuitosBloque(nombreDetectado ? agruparCircuitosDeTareas(tareas, ejerciciosById, nombreDetectado, { nuevo: true }) : []);
    setCargandoExistente(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esReutilizacion, ejerciciosLoaded]);

  useEffect(() => {
    if (!isEditing || !ejerciciosLoaded || borradorCargadoRef.current) return;
    borradorCargadoRef.current = true;
    let cancelled = false;
    (async () => {
      const todasLasTareas = await api.list("tareas", { sesion_id: sesionExistente.id });
      const tareas = todasLasTareas.filter((t) => t.sesion_id === sesionExistente.id);
      const todosLosCircuitos = await api.list("circuitos", { sesion_id: sesionExistente.id });
      const circuitos = todosLosCircuitos.filter((c) => c.sesion_id === sesionExistente.id);
      const tareaIds = new Set(tareas.map((t) => t.id));
      const todosLosRegistros = tareaIds.size ? await api.list("registros", {}) : [];
      const hayRegistro = todosLosRegistros.some((r) => tareaIds.has(r.tarea_id));
      if (cancelled) return;
      setReadOnly(hayRegistro);
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
          modoCarga: t.modo_carga === "pct1rm" ? "pct1rm" : "rir",
          pct1rm: t.pct1rm ?? "",
          tipoResistencia: t.tipo_resistencia || "Peso libre",
          materiales,
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          circuito_id: t.circuito_id || "",
          orden_en_circuito: t.orden_en_circuito || "",
        };
      };
      // El nombre del bloque no se guarda aparte — se lee directamente de
      // bloque_sesion de sus propias tareas, así no hace falta ninguna
      // columna nueva en Sesiones solo para esto.
      const nombreDetectado = tareas[0]?.bloque_sesion || circuitos[0]?.bloque_sesion || "";
      setNombreBloque(nombreDetectado);
      setTareasBloque(tareas.filter((t) => !t.circuito_id).map(toDraft));
      setCircuitosBloque(
        circuitos.map((c) => ({
          key: c.id,
          circuitoId: c.id,
          rondas: c.rondas || 1,
          tareas: tareas
            .filter((t) => t.circuito_id === c.id)
            .sort((a, b) => (Number(a.orden_en_circuito) || 0) - (Number(b.orden_en_circuito) || 0))
            .map(toDraft),
        }))
      );
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
      try {
        const creado = await resolveEjercicio(ejercicios, { nombre, bloque: "", tags_descriptivos: ejercicioOClic.tags_descriptivos || [] });
        ejercicioId = creado.id;
        addEjercicioLocal(creado);
      } catch (e) {
        setError("No se pudo crear el ejercicio nuevo. Comprueba tu conexión e inténtalo de nuevo.");
        return;
      }
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
    if (!nombreBloque.trim()) {
      setError("Ponle un nombre a esta dinámica (ej. Miembro Superior).");
      return;
    }
    setGuardando(true);
    try {
      const sesionRecord = {
        id: sesionExistente?.id,
        tipo: "complementaria",
        fechas,
        md: "",
        objetivo: "",
        jugadores_destino: targetPlayerIds,
        preventivo_activo: 0,
        activacion_activa: false,
        lote_origen_id: "",
        enviada: true,
      };
      const savedSesion = await api.save("sesiones", sesionRecord);

      const keepTareaIds = new Set();
      const keepCircuitoIds = new Set();
      const nombre = nombreBloque.trim();

      const guardarTareaSuelta = async (t) => {
        const saved = await api.save("tareas", {
          id: t.tareaId,
          sesion_id: savedSesion.id,
          bloque_sesion: nombre,
          ejercicio_id: t.ejercicioId,
          modo: t.modo,
          series: t.series,
          cantidad: t.cantidad,
          rir: t.rir,
          tipo_resistencia: t.tipoResistencia || "",
          material: JSON.stringify(t.materiales || []),
          lateralidad: t.lateralidad || "bilateral",
          nota: t.nota || "",
          circuito_id: "",
          orden_en_circuito: "",
        });
        keepTareaIds.add(saved.id);
      };

      const guardarCircuito = async (c) => {
        const savedCircuito = await api.save("circuitos", { id: c.circuitoId, sesion_id: savedSesion.id, bloque_sesion: nombre, rondas: c.rondas || 1 });
        keepCircuitoIds.add(savedCircuito.id);
        await Promise.all(
          c.tareas.map(async (t, i) => {
            const saved = await api.save("tareas", {
              id: t.tareaId,
              sesion_id: savedSesion.id,
              bloque_sesion: nombre,
              ejercicio_id: t.ejercicioId,
              modo: t.modo,
              series: t.series,
              cantidad: t.cantidad,
              rir: t.rir,
              tipo_resistencia: t.tipoResistencia || "",
              material: JSON.stringify(t.materiales || []),
              lateralidad: t.lateralidad || "bilateral",
              nota: t.nota || "",
              circuito_id: savedCircuito.id,
              orden_en_circuito: i + 1,
            });
            keepTareaIds.add(saved.id);
          })
        );
      };

      await Promise.all(tareasBloque.map(guardarTareaSuelta));
      await Promise.all(circuitosBloque.map(guardarCircuito));

      const tareasABorrar = previousTareaIds.filter((id) => !keepTareaIds.has(id));
      const circuitosABorrar = previousCircuitoIds.filter((id) => !keepCircuitoIds.has(id));
      await Promise.all(tareasABorrar.map((id) => api.delete("tareas", id)));
      await Promise.all(circuitosABorrar.map((id) => api.delete("circuitos", id)));

      invalidateEntityCache("sesiones");
      invalidateEntityCache("tareas");
      invalidateEntityCache("circuitos");
      invalidateBootstrapCache();

      setOk(true);
      onGuardado?.();
    } catch (e) {
      setError("No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const loaded = playersLoaded && ejerciciosLoaded && materialesLoaded && !cargandoExistente;
  if (!loaded) return <LoadingBlock />;

  return (
    <PantallaBase rol="entrenador" maxWidth={640}>
      <div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ← Volver a Dashboard
        </button>
        {readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: ds.accentSubtle, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 8, padding: "10px 12px", marginBottom: 18, fontSize: 12.5, color: ds.accent }}>
            <Lock size={13} style={{ flexShrink: 0 }} />
            Un jugador ya registró datos de esta dinámica — solo lectura. Para cambiar algo, vuelve al listado y usa "Reutilizar como nueva".
          </div>
        )}
        <div style={{ marginBottom: 22, pointerEvents: readOnly ? "none" : undefined }}>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>{isEditing ? (readOnly ? "YA REGISTRADA" : "EDITAR DINÁMICA") : "NUEVA DINÁMICA"}</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 26, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Dinámica complementaria</h1>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <span style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>NOMBRE DE LA DINÁMICA</span>
            <input value={nombreBloque} onChange={(e) => setNombreBloque(e.target.value)} placeholder="Ej. Miembro Superior" style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 13, padding: "8px 10px" }} />
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Es lo que verá el jugador como título de este bloque en su pantalla.</span>
          </label>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>PARA</div>
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
                    border: `1px solid ${ds.border}`,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    background: (t.id === "equipo") === (targetPlayerIds === null) ? ds.accentSubtle : "transparent",
                    color: (t.id === "equipo") === (targetPlayerIds === null) ? ds.accent : ds.inkSecondary,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {targetPlayerIds !== null && (
              <ListaJugadoresCheckReal players={players} seleccionados={targetPlayerIds} onCambiar={setTargetPlayerIds} />
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted, marginBottom: 6 }}>DÍAS EN LOS QUE SE ACTIVA</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {fechas.map((f) => (
                <span key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: dsF.mono, fontSize: 11.5, color: ds.accent, border: `1px solid ${ds.accentBorderSubtle}`, borderRadius: 6, padding: "4px 8px" }}>
                  {f}
                  <span onClick={() => removeFecha(f)} style={{ cursor: "pointer", color: ds.inkMuted }}>
                    ×
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 7, color: ds.ink, fontSize: 12.5, padding: "7px 9px" }} />
              <button onClick={addFecha} style={{ background: "transparent", border: `1px dashed ${ds.accentBorderSubtle}`, color: ds.accent, borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13 }}>
                + Añadir fecha
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 12, padding: 14, pointerEvents: readOnly ? "none" : undefined }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 10 }}>Tareas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tareasBloque.map((t) => (
              <FilaTareaReal
                key={t.key}
                tarea={t}
                mostrarCarga={true}
                materialesDisponibles={materialesDisponibles}
                onAgregarMaterial={agregarMaterial}
                onCambiar={(nuevo) => setTareasBloque((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))}
                onEliminar={() => setTareasBloque((prev) => prev.filter((x) => x.key !== t.key))}
              />
            ))}
            {circuitosBloque.map((c) => (
              <CajaCircuitoReal
                key={c.key}
                circuito={c}
                bloque={nombreBloque || "Complementaria"}
                mostrarCarga={true}
                ejercicios={ejercicios}
                        onEjercicioCreado={addEjercicioLocal}
                        onAsignarZona={asignarZonaYActualizar}
                        onError={setError}
                materialesDisponibles={materialesDisponibles}
                onAgregarMaterial={agregarMaterial}
                onCambiarTareas={(nuevas) => setCircuitosBloque((prev) => prev.map((x) => (x.key === c.key ? { ...x, tareas: nuevas } : x)))}
                onCambiarRondas={(r) => setCircuitosBloque((prev) => prev.map((x) => (x.key === c.key ? { ...x, rondas: r } : x)))}
                onEliminarCircuito={() => setCircuitosBloque((prev) => prev.filter((x) => x.key !== c.key))}
              />
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <SelectorEjercicioReal ejercicios={ejercicios} bloque={null} onAdd={agregarTarea(setTareasBloque)} onAsignarZona={asignarZonaYActualizar} />
              <button
                onClick={() => setCircuitosBloque((prev) => [...prev, { key: Date.now() + Math.random(), tareas: [], rondas: 1 }])}
                style={{ fontSize: 12.5, color: ds.inkSecondary, background: "transparent", border: `1px dashed ${ds.border}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
              >
                + Añadir circuito
              </button>
            </div>
          </div>
        </div>

        {!readOnly && error && <div style={{ color: ds.danger, fontSize: 13, marginTop: 14 }}>{error}</div>}
        {!readOnly && ok && <div style={{ color: ds.success, fontSize: 13, marginTop: 14 }}>Guardado y enviado.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${ds.border}`, color: ds.inkSecondary, borderRadius: 8, padding: "10px 16px", fontSize: 13.5, cursor: "pointer" }}>
            {readOnly ? "Volver" : "Cancelar"}
          </button>
          {!readOnly && (
            <button
              onClick={guardar}
              disabled={guardando}
              style={{ background: ds.accent, border: `1px solid ${ds.accent}`, color: ds.accentInk, borderRadius: 8, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? "Guardando..." : "Guardar y enviar"}
            </button>
          )}
        </div>
      </div>
    </PantallaBase>
  );
}

// Al entrar en modo entrenador, adelanta la carga de los datos que casi
// nunca cambian de un minuto a otro (jugadores, ejercicios, categorías
// preventivas, materiales) — una sola vez, en paralelo — dejándolos ya en
// sharedDataCache. Así, cuando cualquier pantalla (Roster, Diseño,
// Biblioteca...) monte su propio usePlayers()/useEntityList("ejercicios")/etc.,
// se los encuentra ya en caché y no repite la petición a Apps Script. Si ya
// estaban cacheados (se volvió a entrar en la misma sesión), no hace nada.
function precalentarDatosEntrenador() {
  if (!sharedDataCache.has("list:jugadores:null")) {
    api.list("jugadores").then((res) => sharedDataCache.set("list:jugadores:null", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("list:ejercicios:null")) {
    api.list("ejercicios").then((res) => sharedDataCache.set("list:ejercicios:null", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("categoriasPreventivas")) {
    api.categoriasPreventivas().then((res) => sharedDataCache.set("categoriasPreventivas", res || [])).catch(() => {});
  }
  if (!sharedDataCache.has("materiales")) {
    api.materiales().then((res) => sharedDataCache.set("materiales", res || [])).catch(() => {});
  }
}

export default function App() {
  const [screen, setScreen] = useState("portal"); // "portal" | "coach" | "player"
  const [playerId, setPlayerId] = useState(null);
  const [coachModulo, setCoachModulo] = useState(null); // null = dashboard
  const [historialJugador, setHistorialJugador] = useState(null); // jugador para "Ver ficha" desde Usuarios

  useEffect(() => {
    if (screen === "coach") precalentarDatosEntrenador();
  }, [screen]);

  return (
    <>
      {/* Sin esto, el "rebote" elástico de Safari en iPad al hacer scroll deja
          ver un instante el blanco por defecto de la página detrás de la app
          (líneas blancas en el borde) — con el fondo del propio documento ya
          oscuro y el rebote desactivado, no hay nada blanco que se pueda
          asomar. PantallaBase, además, usa position:fixed en vez de depender
          del alto del documento, así que ya no compite con este reset. */}
      <style>{`
        html, body { background: ${ds.canvas}; margin: 0; padding: 0; height: 100%; overscroll-behavior: none; }
        #root { height: 100%; }
      `}</style>
      <AppRouter
        screen={screen}
        setScreen={setScreen}
        playerId={playerId}
        setPlayerId={setPlayerId}
        coachModulo={coachModulo}
        setCoachModulo={setCoachModulo}
        historialJugador={historialJugador}
        setHistorialJugador={setHistorialJugador}
      />
    </>
  );
}

function AppRouter({ screen, setScreen, playerId, setPlayerId, coachModulo, setCoachModulo, historialJugador, setHistorialJugador }) {

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
  if (historialJugador) {
    return <FichaJugadorModuloReal jugador={historialJugador} onBack={() => setHistorialJugador(null)} />;
  }
  if (coachModulo === "roster") {
    return <GestionRosterReal onBack={() => setCoachModulo(null)} onOpenHistory={setHistorialJugador} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "historial") {
    return <HistorialReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "biblioteca") {
    return <BibliotecaEjerciciosReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "diseno") {
    return <DisenoSesionReal onBack={() => setCoachModulo(null)} onGuardado={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "complementarias") {
    return <DinamicaComplementariaReal onBack={() => setCoachModulo(null)} onGuardado={() => setCoachModulo(null)} />;
  }
  if (coachModulo === "programacion") {
    return <ProgramacionModuloReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }
  if (coachModulo === "fatiga") {
    return <ControlFatigaModuloReal onBack={() => setCoachModulo(null)} onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
  }

  return <DashboardEntrenadorReal onAbrirModulo={setCoachModulo} onCerrarSesion={() => setScreen("portal")} />;
}

// Envoltorio: ProgramacionReal necesita la lista de jugadores para el editor de sesiones.
function ProgramacionModuloReal({ onBack, onAbrirModulo, onCerrarSesion }) {
  const [players, , playersLoaded] = usePlayers();
  if (!playersLoaded) return <LoadingBlock />;
  return <ProgramacionReal players={players} onBack={onBack} onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion} />;
}

// Cabecera de identidad de la ficha de jugador. Reutiliza exactamente las
// mismas piezas visuales que ya existían en FilaJugadorReal (punto de
// estado, chips de grupo, chips de categoría preventiva, PIN con
// mostrar/ocultar) — aquí solo cambia el layout, de fila a cabecera. No
// permite editar grupos/categorías desde aquí a propósito: eso ya se hace
// desde la fila en Usuarios, y duplicar esa lógica de guardado en un
// segundo sitio no aporta nada en este primer paso.
function CabeceraFichaJugadorReal({ jugador, categorias, grupos }) {
  const [pinVisible, setPinVisible] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresGrupos = (jugador.gruposIds || [])
    .map((id) => grupos.find((g) => g.id === id)?.nombre)
    .filter(Boolean);
  const nombresCategorias = (jugador.groupIds || [])
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);
  const iniciales =
    jugador.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?";

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: dsR.xl, padding: 18 }}>
      <DsAvatar size={52} style={{ flexShrink: 0 }}>{iniciales}</DsAvatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ width: 8, height: 8, borderRadius: dsR.full, background: suspendido ? ds.warning : ds.success, flexShrink: 0 }} />
          <h1 style={{ fontFamily: dsF.display, fontSize: 21, fontWeight: 700, margin: 0, color: ds.ink }}>{jugador.name}</h1>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {nombresGrupos.length > 0 ? (
            nombresGrupos.map((g) => (
              <ChipReal key={g} tono="azul">
                {g}
              </ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Independiente</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {nombresCategorias.length > 0 ? (
            nombresCategorias.map((c) => (
              <ChipReal key={c} tono="verde">
                {c}
              </ChipReal>
            ))
          ) : (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Sin categoría preventiva</span>
          )}
        </div>
      </div>
      <div
        onClick={() => setPinVisible((v) => !v)}
        style={{ fontFamily: dsF.mono, fontSize: 12.5, color: ds.inkMuted, cursor: "pointer", textAlign: "center", flexShrink: 0 }}
        title="Mostrar/ocultar PIN"
      >
        <div style={{ fontSize: 9, letterSpacing: "0.08em", marginBottom: 3 }}>PIN</div>
        {pinVisible ? jugador.pin : "••••"}
      </div>
    </div>
  );
}

// Pestaña "Resumen" de la ficha: adherencia de esta semana y variación de
// la carga media semanal de ESTE jugador. Mismo criterio de ventana y de
// "cumplido" que "Quién necesita atención" en DashboardEntrenadorSidebarReal
// (calcularAdherencia, cargaMedia) — aquí reescrito para un único jugador en
// vez de para todo el equipo, no es una métrica nueva.
function ResumenFichaJugadorReal({ jugador }) {
  const { sesiones, loaded: progLoaded } = useBootstrapProgramacion();
  const { loaded: historyLoaded, items } = usePlayerHistory(jugador.id);

  if (!progLoaded || !historyLoaded) return <LoadingBlock />;

  const hoy = todayStr();
  const lunes = inicioSemanaCalendario(hoy);
  const domingo = sumarDiasFecha(lunes, 6);
  const lunesAnterior = sumarDiasFecha(lunes, -7);
  const domingoAnterior = sumarDiasFecha(lunes, -1);

  const fechasConRegistro = new Set(items.map((it) => it.date));
  const fechasAsignadas = (desde, hasta) => {
    const fechas = [];
    sesiones
      .filter((s) => s.enviada)
      .forEach((s) => {
        const incluyeAJugador = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino.includes(jugador.id) : jugador.estado === "activo";
        if (!incluyeAJugador) return;
        (s.fechas || []).forEach((f) => {
          if (f >= desde && f <= hasta) fechas.push(f);
        });
      });
    return fechas;
  };
  const calcularAdherencia = (fechas) => {
    if (!fechas.length) return null;
    const cumplidas = fechas.filter((f) => fechasConRegistro.has(f)).length;
    return Math.round((cumplidas / fechas.length) * 100);
  };
  const adherenciaActual = calcularAdherencia(fechasAsignadas(lunes, hoy));
  const adherenciaAnterior = calcularAdherencia(fechasAsignadas(lunesAnterior, domingoAnterior));
  const deltaAdherencia = adherenciaActual != null && adherenciaAnterior != null ? adherenciaActual - adherenciaAnterior : null;

  const cargaMedia = (desde, hasta) => {
    const regs = items.filter(
      (it) => it.done && !it.esResistencia && it.bloque !== "CMJ" && it.cargaReal !== "" && it.cargaReal != null && it.date >= desde && it.date <= hasta
    );
    if (!regs.length) return null;
    return regs.reduce((s, it) => s + Number(it.cargaReal), 0) / regs.length;
  };
  const cargaActual = cargaMedia(lunes, hoy);
  const cargaAnterior = cargaMedia(lunesAnterior, domingoAnterior);
  const variacionPct = cargaActual != null && cargaAnterior != null && cargaAnterior !== 0 ? ((cargaActual - cargaAnterior) / cargaAnterior) * 100 : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
      {adherenciaActual != null ? (
        <DsStatTile
          label="Adherencia esta semana"
          value={`${adherenciaActual}%`}
          delta={deltaAdherencia != null ? { direction: deltaAdherencia >= 0 ? "up" : "down", label: `${deltaAdherencia > 0 ? "+" : ""}${deltaAdherencia} vs semana pasada` } : undefined}
        />
      ) : (
        <DsStatTile label="Adherencia esta semana" value="—" delta={{ direction: "neutral", label: "sin sesiones asignadas aún" }} />
      )}
      {variacionPct != null ? (
        <DsStatTile
          label="Carga media vs. semana pasada"
          value={`${variacionPct > 0 ? "+" : ""}${Math.round(variacionPct)}%`}
          delta={{ direction: variacionPct <= -10 ? "down" : "neutral", label: variacionPct <= -10 ? "caída relevante" : "dentro de lo normal" }}
        />
      ) : (
        <DsStatTile label="Carga media vs. semana pasada" value="—" delta={{ direction: "neutral", label: "sin datos suficientes" }} />
      )}
    </div>
  );
}

// Extiende el patrón de gráfica SVG de GraficaProgresoCargaReal (línea +
// puntos, sin librería externa) a varias variables del motor CMJ
// SUPERPUESTAS en la misma gráfica (una línea de color por variable, con
// leyenda debajo) — sin traer recharts (que usaba el panel original y que
// aquí no es una dependencia). Todas las series comparten el mismo eje X
// (mismos registros) y el mismo eje Y, igual que hacía el panel original en
// su vista "valores reales".
function CmjGraficaEvolucionMultiReal({ series, decimalesEje = 1 }) {
  const nPuntos = series[0]?.puntos.length || 0;
  if (nPuntos < 2) {
    return (
      <div style={{ color: ds.inkMuted, fontSize: 12.5, padding: "24px 0", textAlign: "center" }}>
        {nPuntos === 0 ? "Sin registros para esta selección de variables en este filtro." : "Hace falta al menos 2 registros para trazar la evolución."}
      </div>
    );
  }
  const width = 660;
  const height = 200;
  const padLeft = 6;
  const padRight = 48;
  const padY = 22;
  const allValores = series.flatMap((s) => s.puntos.map((p) => p.valorMostrado));
  const minV = Math.min(...allValores);
  const maxV = Math.max(...allValores);
  const rango = maxV - minV || 1;
  const stepX = (width - padLeft - padRight) / (nPuntos - 1);
  const coordX = (i) => padLeft + i * stepX;
  const coordY = (v) => height - padY - ((v - minV) / rango) * (height - padY * 2);

  // Igual criterio que GraficaProgresoCargaReal (sin números de eje fijos:
  // el valor final va pegado a la línea) pero con varias series a la vez,
  // así que las etiquetas se reparten en una pequeña columna a la derecha,
  // separadas un mínimo vertical entre sí, para que no se pisen aunque dos
  // líneas terminen muy cerca la una de la otra.
  const xUltimo = coordX(nPuntos - 1);
  const etiquetas = series
    .map((s) => {
      const ultimo = s.puntos[s.puntos.length - 1];
      return { key: s.key, color: s.color, texto: ultimo.valorMostrado.toFixed(decimalesEje), y: coordY(ultimo.valorMostrado) };
    })
    .sort((a, b) => a.y - b.y);
  const GAP_MIN = 13;
  for (let i = 1; i < etiquetas.length; i++) {
    if (etiquetas[i].y - etiquetas[i - 1].y < GAP_MIN) etiquetas[i].y = etiquetas[i - 1].y + GAP_MIN;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
        {series.map((s) => {
          const pathD = s.puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${coordX(i).toFixed(1)} ${coordY(p.valorMostrado).toFixed(1)}`).join(" ");
          return (
            <g key={s.key}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.puntos.map((p, i) => (
                <circle key={i} cx={coordX(i)} cy={coordY(p.valorMostrado)} r={i === s.puntos.length - 1 ? 4 : 3} fill={ds.canvas} stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {etiquetas.map((e) => (
          <text key={e.key} x={xUltimo + 8} y={e.y + 3.5} fontSize="10.5" fontWeight="700" fill={e.color} textAnchor="start">{e.texto}</text>
        ))}
        <text x={padLeft} y={height - 5} fontSize="9.5" fill={ds.inkMuted}>{fmtDateShort(series[0].puntos[0].date)}</text>
        <text x={xUltimo} y={height - 5} fontSize="9.5" fill={ds.inkMuted} textAnchor="end">{fmtDateShort(series[0].puntos[nPuntos - 1].date)}</text>
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: ds.inkSecondary, fontWeight: 600 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pestaña "CMJ" de la ficha de jugador: evolución de hasta 4 variables
// SUPERPUESTAS en la misma gráfica (Altura/Potencia relativa/Fuerza
// relativa/Velocidad), con vista "Valores reales" o "% respecto a su
// media" (para comparar variables de unidades distintas en el mismo eje),
// en temporada completa, un rango de fechas o un microciclo concreto, con
// el mismo filtro de Momento que Ranking. La tabla de registros muestra
// además el % de cambio frente a su referencia (MD-2/MD+1 vs el Inicio de
// esa semana; un Inicio vs el Inicio anterior) — igual criterio que usaba
// el panel original. A diferencia de Ranking (que compara jugadores entre
// sí), aquí solo se cargan los saltos de ESTE jugador, ya vinculados a su
// jugadorId.
function CmjFichaJugadorReal({ jugadorId, jugadorNombre }) {
  const [saltos, setSaltos] = useState([]);
  const [microciclos, setMicrociclos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [metricKeys, setMetricKeys] = useState(() => new Set(["altura", "potenciaRel", "fuerzaRel"]));
  const [modoValores, setModoValores] = useState("reales"); // 'reales' | 'pct'
  const [periodo, setPeriodo] = useState("temporada"); // 'temporada' | 'rango' | 'microciclo'
  const [rango, setRango] = useState({ start: "", end: "" });
  const [microSel, setMicroSel] = useState(null);
  const [filtroTags, setFiltroTags] = useState(() => new Set(["inicio", "md2", "md1", "sin"]));
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  function toggleMetric(k) {
    setMetricKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k); // siempre queda al menos una variable seleccionada
      } else {
        next.add(k);
      }
      return next;
    });
  }

  const cargar = useCallback(async () => {
    const [saltosRes, microRes] = await Promise.all([
      supabase.from("cmj_saltos").select("*").eq("jugador_id", jugadorId),
      supabase.from("cmj_microciclos").select("*"),
    ]);
    if (!saltosRes.error) setSaltos(saltosRes.data || []);
    if (!microRes.error) setMicrociclos(microRes.data || []);
    setLoaded(true);
  }, [jugadorId]);

  useEffect(() => { cargar(); }, [cargar]);

  function toggleTag(k) {
    setFiltroTags((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (!loaded) return <LoadingBlock />;

  const filasParaMotor = saltos.map((s) => ({
    jugadorId: s.jugador_id,
    nombre: jugadorNombre,
    dateKey: s.fecha,
    date: s.fecha_hora,
    peso: s.peso,
    hp0: s.hp0,
    altura: s.altura,
    fuerza: s.fuerza,
    potencia: s.potencia,
    velocidad: s.velocidad,
    kineticsValid: s.kinetics_valid,
    pesoValid: s.peso_valid,
    hp0Valid: s.hp0_valid,
  }));

  const { players: builtPlayers, microList } = cmjBuildPlayers(
    filasParaMotor,
    microciclos,
    CMJ_UMBRAL_DEFECTO.ambarPct,
    CMJ_UMBRAL_DEFECTO.rojoPct,
    CMJ_UMBRAL_DEFECTO.individualizar,
    CMJ_UMBRAL_DEFECTO.protocoloDesde
  );
  const player = builtPlayers[0] || null;

  if (!player) {
    return <CmjProximamente titulo="Sin tests CMJ todavía" texto="En cuanto subas un CSV con saltos de este jugador y queden vinculados a él (pestaña Subir CSV, dentro de Control de fatiga), aparecerán aquí." />;
  }

  const metricasSel = CMJ_METRIC_LIST.filter((m) => metricKeys.has(m.key));
  const microRows = microList.map((m) => ({ m, r: player.microResults.get(m.id) })).filter(({ r }) => r);
  const microSelActivo = microSel ?? (microRows.length ? microRows[microRows.length - 1].m.id : null);

  const dentroDeRango = (r) => {
    if (periodo !== "rango" || !rango.start || !rango.end) return periodo !== "rango";
    const t = new Date(r.date).getTime();
    return t >= new Date(rango.start).getTime() && t <= new Date(rango.end + "T23:59:59").getTime();
  };

  // Registros base del periodo/filtro elegido (sin reducir todavía a una
  // variable) — a diferencia de antes, aquí se parte de los registros
  // crudos para poder superponer varias variables en la misma gráfica.
  let registrosBase = [];
  if (periodo === "microciclo") {
    const sel = microRows.find(({ m }) => m.id === microSelActivo);
    if (sel) registrosBase = CMJ_FIELDS.filter((k) => sel.r[k]).map((k) => sel.r[k]);
  } else {
    registrosBase = player.sorted.filter((r) => filtroTags.has(r.tag || "sin") && dentroDeRango(r));
  }
  // Solo entran a la gráfica y a la tabla los registros que tienen valor en
  // TODAS las variables seleccionadas — así las líneas superpuestas y las
  // filas de la tabla comparten siempre el mismo eje de fechas.
  const registros = registrosBase.filter((r) => metricasSel.every((m) => m.get(r) != null));

  // Misma referencia que en el panel original: MD-2/MD+1 se comparan con el
  // Inicio de esa misma semana; un Inicio se compara con el Inicio anterior
  // (tendencia semana a semana). Sin ninguna referencia válida, no se
  // muestra ningún %.
  function referenciaDelta(r, metric) {
    if (r.tag === "md2" || r.tag === "md1") {
      if (r.microId == null) return null;
      const mr = player.microResults.get(r.microId);
      if (!mr || !mr.inicio) return null;
      const baseVal = metric.get(mr.inicio);
      return baseVal != null ? cmjPct(metric.get(r), baseVal) : null;
    }
    if (r.tag === "inicio") {
      const idx = player.inicios.findIndex((x) => x.date === r.date);
      if (idx <= 0) return null;
      const baseVal = metric.get(player.inicios[idx - 1]);
      return baseVal != null ? cmjPct(metric.get(r), baseVal) : null;
    }
    return null;
  }

  const seriesGrafica = metricasSel.map((m) => {
    const valoresReales = registros.map((r) => m.get(r));
    const media = valoresReales.length ? valoresReales.reduce((a, b) => a + b, 0) / valoresReales.length : 0;
    return {
      key: m.key,
      label: m.label,
      color: CMJ_METRIC_CHART_COLOR[m.key],
      puntos: registros.map((r, i) => ({
        date: r.date,
        valorMostrado: modoValores === "pct" ? (media ? (valoresReales[i] / media) * 100 : 0) : valoresReales[i],
      })),
    };
  });

  const statusMeta = CMJ_STATUS_META[player.combinedStatus];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: ds.inkMuted }}>
          {player.nTests} tests · primer test {fmtDateShort(player.sorted[0].date)} · último {fmtDateShort(player.sorted[player.sorted.length - 1].date)}
        </div>
        <DsBadge tone={player.combinedStatus === "red" ? "danger" : player.combinedStatus === "green" ? "success" : player.combinedStatus === "amber" ? "accent" : "neutral"}>
          {statusMeta.label}
        </DsBadge>
      </div>

      <button onClick={() => setMostrarFiltros((v) => !v)} style={{ background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12, cursor: "pointer", padding: 0, margin: "10px 0 12px" }}>
        {mostrarFiltros ? "▾ ocultar filtros" : "▸ filtros"}
      </button>

      {mostrarFiltros && (
        <DsCard style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Variables ({metricasSel.length} de {CMJ_METRIC_LIST.length})</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CMJ_METRIC_LIST.map((m) => {
                const activo = metricKeys.has(m.key);
                const color = CMJ_METRIC_CHART_COLOR[m.key];
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? color : ds.border}`, background: activo ? `${color}1E` : "transparent", color: activo ? color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, opacity: activo ? 1 : 0.35, flexShrink: 0 }} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Vista</div>
            <DsTabSwitcher
              tabs={[
                { id: "reales", label: "Valores reales" },
                { id: "pct", label: "% respecto a su media" },
              ]}
              active={modoValores}
              onChange={setModoValores}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Periodo</div>
            <DsTabSwitcher
              tabs={[
                { id: "temporada", label: "Temporada completa" },
                { id: "rango", label: "Rango de fechas" },
                { id: "microciclo", label: "Microciclo concreto" },
              ]}
              active={periodo}
              onChange={setPeriodo}
            />
          </div>

          {periodo === "rango" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Fechas</div>
              <div style={{ display: "flex", gap: 12 }}>
                <DsInput type="date" value={rango.start} onChange={(e) => setRango({ ...rango, start: e.target.value })} />
                <DsInput type="date" value={rango.end} onChange={(e) => setRango({ ...rango, end: e.target.value })} />
              </div>
            </div>
          )}

          {periodo === "microciclo" && (
            microRows.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Microciclo</div>
                <DsSelect value={microSelActivo || ""} onChange={(e) => setMicroSel(e.target.value)} style={{ maxWidth: 220 }}>
                  {microRows.map(({ m }) => (
                    <option key={m.id} value={m.id}>Nº {m.numero}</option>
                  ))}
                </DsSelect>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: ds.inkMuted }}>Este jugador todavía no tiene tests dentro de ningún microciclo registrado.</div>
            )
          )}

          {periodo !== "microciclo" && (
            <div>
              <div style={{ fontSize: 11, color: ds.inkMuted, marginBottom: 6 }}>Momento</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "inicio", label: "Inicio", color: CMJ_TAG_META.inicio.color },
                  { key: "md2", label: "MD-2", color: CMJ_TAG_META.md2.color },
                  { key: "md1", label: "MD+1", color: CMJ_TAG_META.md1.color },
                  { key: "sin", label: "Sin etiqueta", color: ds.inkMuted },
                ].map((op) => {
                  const activo = filtroTags.has(op.key);
                  return (
                    <button
                      key={op.key}
                      onClick={() => toggleTag(op.key)}
                      style={{ fontSize: 12, padding: "6px 11px", borderRadius: dsR.md, border: `1px solid ${activo ? op.color : ds.border}`, background: activo ? `${op.color}1E` : "transparent", color: activo ? op.color : ds.inkMuted, cursor: "pointer", fontWeight: 600 }}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DsCard>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>
        {periodo === "microciclo" ? `Microciclo Nº ${microRows.find(({ m }) => m.id === microSelActivo)?.m.numero ?? "—"}` : "Evolución"}
      </div>

      <DsCard style={{ padding: 14, marginBottom: 16 }}>
        <CmjGraficaEvolucionMultiReal series={seriesGrafica} decimalesEje={modoValores === "pct" ? 0 : 1} />
      </DsCard>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: ds.inkSecondary, marginBottom: 8 }}>
        Registros ({metricasSel.map((m) => m.label).join(" · ")})
      </div>
      {registros.length === 0 ? (
        <div style={{ fontSize: 12.5, color: ds.inkMuted }}>Ningún registro coincide con el filtro seleccionado (o falta alguna de las variables elegidas en esos días).</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 280 + metricasSel.length * 130 }}>
            <div style={{ display: "grid", gridTemplateColumns: `100px 96px repeat(${metricasSel.length}, minmax(120px, 1fr))`, padding: "0 10px 8px", borderBottom: `1px solid ${ds.border}` }}>
              <div style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha</div>
              <div style={{ fontSize: 10.5, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Momento</div>
              {metricasSel.map((m) => (
                <div key={m.key} style={{ fontSize: 10.5, color: CMJ_METRIC_CHART_COLOR[m.key], textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>{m.label}</div>
              ))}
            </div>
            {[...registros].reverse().map((r, i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: `100px 96px repeat(${metricasSel.length}, minmax(120px, 1fr))`, padding: "9px 10px", borderBottom: `1px solid ${ds.borderSoft}`, background: i % 2 === 0 ? "transparent" : ds.bgElevated + "55" }}
              >
                <div style={{ fontSize: 12, color: ds.ink }}>{fmtDateShort(r.date)}</div>
                <div style={{ fontSize: 11.5, color: r.tag ? CMJ_TAG_META[r.tag].color : ds.inkMuted }}>{r.tag ? CMJ_TAG_META[r.tag].label : "—"}</div>
                {metricasSel.map((m) => {
                  const delta = periodo !== "microciclo" ? referenciaDelta(r, m) : null;
                  return (
                    <div key={m.key} style={{ textAlign: "right", fontFamily: dsF.mono, fontSize: 12.5, color: ds.ink }}>
                      {cmjFmt(m.get(r), m.decimals)} <span style={{ color: ds.inkMuted, fontSize: 10.5 }}>{m.unit}</span>
                      {delta != null && <span style={{ marginLeft: 6, fontWeight: 700, color: delta >= 0 ? ds.success : ds.danger }}>{cmjSigned(delta)}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Ficha de un jugador concreto, abierta desde Usuarios ("Ver ficha").
// Cabecera de identidad + tres pestañas: Resumen (nuevo), Historial (es
// HistorialPorJugador tal cual ya existía, sin cambios — la misma pieza que
// usa el módulo de Historial general, aquí preseleccionando a este jugador
// pero sin perder la posibilidad de cambiar a otro desde su desplegable) y
// CMJ (Parte 5: evolución del salto de este jugador, independiente de
// Historial porque son cosas diferentes — fuerza vs. salto).
function FichaJugadorModuloReal({ jugador, onBack }) {
  const [players, , playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [grupos, , gruposLoaded] = useEntityList("grupos");
  const [pestana, setPestana] = useState("resumen");

  if (!playersLoaded || !categoriasLoaded || !gruposLoaded) return <LoadingBlock />;

  // El jugador puede haber cambiado (categoría, grupo, estado, PIN) desde
  // que se abrió esta ficha — se resuelve siempre contra la lista fresca de
  // usePlayers() en vez de quedarse con el objeto que llegó por prop.
  const actual = players.find((p) => p.id === jugador?.id) || jugador;

  if (!actual) {
    return (
      <PantallaBase rol="entrenador" maxWidth={900}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver a Usuarios
        </button>
        <div style={{ color: ds.inkMuted, fontSize: 13, marginTop: 20 }}>Este jugador ya no existe.</div>
      </PantallaBase>
    );
  }

  return (
    <PantallaBase rol="entrenador" maxWidth={900}>
      <div>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}
        >
          ← Volver a Usuarios
        </button>
        <CabeceraFichaJugadorReal jugador={actual} categorias={categorias} grupos={grupos} />
        <div style={{ display: "flex", gap: 6, margin: "16px 0 14px" }}>
          {[
            { id: "resumen", label: "Resumen" },
            { id: "historial", label: "Historial" },
            { id: "cmj", label: "CMJ" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setPestana(v.id)}
              style={{
                fontSize: 12.5,
                padding: "7px 12px",
                borderRadius: dsR.md,
                border: `1px solid ${pestana === v.id ? ds.accent : ds.border}`,
                background: pestana === v.id ? ds.accentSubtle : "transparent",
                color: pestana === v.id ? ds.accent : ds.inkSecondary,
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        {pestana === "resumen" ? (
          <ResumenFichaJugadorReal jugador={actual} />
        ) : pestana === "historial" ? (
          <HistorialPorJugador players={players} jugadorInicial={actual.id} />
        ) : (
          <CmjFichaJugadorReal jugadorId={actual.id} jugadorNombre={actual.name} />
        )}
      </div>
    </PantallaBase>
  );
}
