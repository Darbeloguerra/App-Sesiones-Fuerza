// ============================================================
// SISTEMA DE DISEÑO "FUERZA" — extraído de App.jsx (antes eran 3 archivos
// aparte: theme.js, GlobalStyles.jsx, ui-components.jsx; luego se incrustó
// todo en App.jsx; ahora vuelve a vivir en su propio módulo, importado por
// todas las pantallas). Nada de lo que hay aquí depende de nada externo.
// ============================================================

// ---------- theme.js (tokens: colores, tamaños, tipografías) ----------
export const ds = {
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
export const dsSp = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 16, 7: 20, 8: 24, 9: 28 };
export const dsR = { sm: 5, md: 8, lg: 10, xl: 14, xxl: 16, full: "50%" };
export const dsSh = {
  elevation1: "0 1px 2px rgba(0,0,0,0.3)",
  elevation2: "0 6px 16px rgba(0,0,0,0.35)",
  elevation3: "0 12px 28px rgba(0,0,0,0.45)",
  accentGlow: "0 4px 14px rgba(240,180,41,0.32)",
};
export const dsF = {
  display: "'Manrope', sans-serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
};

// ---------- GlobalStyles.jsx (hover/pulsado/foco de los controles) ----------
export function GlobalStyles() {
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

      /* Selects "sueltos" (los que usan campoSelectReal() en vez del
         componente DsSelect) seguían con la flecha nativa del sistema
         operativo — resto visible del estilo antiguo, antes de que el
         propio design system trajera su chevron. Se normalizan aquí a
         nivel global para no tener que tocar cada uno de los ~20 sitios
         donde aparecen. */
      .ds-reset select:not(.ds-select) {
        appearance: none; -webkit-appearance: none; -moz-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238CA0BC' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        padding-right: 28px !important;
      }
      .ds-reset select:not(.ds-select)::-ms-expand { display: none; }
      /* Igual con el <input type="date"> nativo: el icono de calendario y
         los controles del picker venían con el tema claro del sistema por
         defecto, chocando contra el fondo oscuro de la app. */
      .ds-reset input[type="date"] { color-scheme: dark; }

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

      /* <details>/<summary> sin el marcador nativo — usado para el
         despliegue por clic de cada fila de "Quién necesita atención", sin
         JS aparte. */
      .ds-details-plain > summary { list-style: none; cursor: pointer; }
      .ds-details-plain > summary::-webkit-details-marker { display: none; }
    `}</style>
  );
}

// ---------- ui-components.jsx (piezas reutilizables) ----------
export function dsCx(...parts) {
  return parts.filter(Boolean).join(" ");
}
export function DsButton({ variant = "primary", size = "md", disabled, className, children, ...rest }) {
  return (
    <button type={rest.type || "button"} disabled={disabled} className={dsCx("ds-button", `ds-button--${variant}`, size === "sm" && "ds-button--sm", className)} {...rest}>
      {children}
    </button>
  );
}
export function DsCard({ status = "default", interactive, className, children, ...rest }) {
  return (
    <div className={dsCx("ds-card", interactive && "ds-card--interactive", status !== "default" && `ds-card--${status}`, className)} {...rest}>
      {children}
    </div>
  );
}
export function DsToggle({ on, disabled, label, className, ...rest }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={!!on} aria-label={label || (on ? "Completado" : "Marcar como completado")} className={dsCx("ds-toggle", on && "ds-toggle--on", className)} {...rest}>
      {on ? "✓" : ""}
    </button>
  );
}
export function DsBadge({ tone = "neutral", className, children }) {
  return <span className={dsCx("ds-badge", tone !== "neutral" && `ds-badge--${tone}`, className)}>{children}</span>;
}
export function DsInput({ error, className, ...rest }) {
  return <input className={dsCx("ds-input", error && "ds-input--error", className)} {...rest} />;
}
export function DsSelect({ error, className, children, ...rest }) {
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
export function DsTabSwitcher({ tabs, active, onChange, className }) {
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
export function DsProgressRing({ value = 0, size = 86, strokeWidth = 8, showLabel = true, className }) {
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
export function DsAvatar({ size = 32, style, className, children }) {
  return (
    <div className={dsCx("ds-avatar", className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.4), ...style }}>
      {children}
    </div>
  );
}
export function DsNavItem({ active, icon, onClick, className, children }) {
  return (
    <button type="button" onClick={onClick} className={dsCx("ds-navitem", active && "ds-navitem--active", className)}>
      {icon}
      {children}
    </button>
  );
}
export function DsStatTile({ label, value, icon, delta, style, className }) {
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
