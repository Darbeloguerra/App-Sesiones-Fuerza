import React, { useState } from "react";

// ---- Datos de ejemplo (biblioteca simulada) ----
const BIBLIOTECA = [
  { id: "sq_trasera", nombre: "Sentadilla trasera", tags: ["Fuerza", "Tren inferior"], modo: "reps" },
  { id: "sq_bulgara", nombre: "Sentadilla búlgara", tags: ["Fuerza", "Tren inferior", "Unilateral"], modo: "reps" },
  { id: "peso_muerto_rdl", nombre: "RDL a una pierna", tags: ["Fuerza", "Posterior", "Unilateral"], modo: "reps" },
  { id: "press_banca", nombre: "Press banca", tags: ["Fuerza", "Tren superior"], modo: "reps" },
  { id: "salto_lateral", nombre: "Salto lateral con freno", tags: ["Específicas"], modo: "reps" },
  { id: "cambio_direccion", nombre: "Cambio de dirección cargado", tags: ["Específicas"], modo: "reps" },
  { id: "plancha", nombre: "Plancha frontal", tags: ["Core"], modo: "tiempo" },
  { id: "dead_bug", nombre: "Dead bug", tags: ["Core"], modo: "reps" },
  { id: "nordic", nombre: "Nordic curl", tags: ["Preventivo", "Isquios"], modo: "reps" },
  { id: "copenhagen", nombre: "Copenhagen plank", tags: ["Preventivo", "Aductores"], modo: "tiempo" },
  { id: "tobillo_ecc", nombre: "Elevación talón excéntrica", tags: ["Preventivo", "Tobillo"], modo: "reps" },
  { id: "movilidad_cadera", nombre: "Movilidad cadera 90/90", tags: ["Movilidad"], modo: "tiempo" },
  { id: "movilidad_toracica", nombre: "Rotación torácica", tags: ["Movilidad"], modo: "reps" },
  { id: "hiit_sprint", nombre: "Sprint progresivo", tags: ["Resistencia"], modo: "reps" },
  { id: "hiit_bici", nombre: "Bici HIIT", tags: ["Resistencia"], modo: "tiempo" },
];

const BLOQUES = [
  {
    id: "activacion",
    numero: 1,
    nombre: "Activación",
    modo: "manual",
    descripcion: "Bici estática, opcional — se omite si no hay acceso",
  },
  {
    id: "movilidad",
    numero: 2,
    nombre: "Movilidad",
    modo: "rotativo",
    descripcion: "Pool rotativo — la app elige el ejercicio del día",
  },
  {
    id: "preventivo",
    numero: 3,
    nombre: "Preventivo",
    modo: "rotativo-categoria",
    descripcion: "Según categoría del jugador — se salta si no aplica",
  },
  {
    id: "core",
    numero: 4,
    nombre: "Core",
    modo: "manual",
    descripcion: "Diseño manual — sin registro de carga",
  },
  {
    id: "resistencia",
    numero: 5,
    nombre: "Resistencia",
    modo: "manual",
    descripcion: "Intervalos, tiempo y recuperación — se omite si no se rellena (no suele convivir con Fuerza)",
  },
  {
    id: "fuerza",
    numero: 6,
    nombre: "Fuerza",
    modo: "manual",
    descripcion: "Diseño manual — con carga, reps/series y RIR (incluye tareas Específicas)",
  },
];

function IconoBloque({ id }) {
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

function EtiquetaModo({ modo }) {
  const map = {
    fijo: { texto: "FIJO", color: "#8BA4C0" },
    rotativo: { texto: "ROTATIVO AUTO", color: "#F5C518" },
    "rotativo-categoria": { texto: "ROTATIVO · POR CATEGORÍA", color: "#F5C518" },
    manual: { texto: "MANUAL", color: "#F97316" },
  };
  const cfg = map[modo];
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        letterSpacing: "0.06em",
        color: cfg.color,
        border: `1px solid ${cfg.color}55`,
        borderRadius: 4,
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.texto}
    </span>
  );
}

function CampoEtiquetado({ etiqueta, children, w }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, width: w }}>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.04em",
          color: "#4A6680",
          whiteSpace: "nowrap",
        }}
      >
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

const MATERIALES_INICIALES = [
  "Barra",
  "Mancuerna",
  "Kettlebell",
  "Bosu",
  "Kine dynamic",
  "Banda elástica",
  "Balón medicinal",
  "Conos",
  "Picas",
  "Trineo",
  "Vallas",
  "TRX",
  "Foam Roller",
  "Fitball",
  "Rueda abdominal",
];

function SelectorMaterial({ seleccionados, disponibles, onCambiar, onAgregarMaterial }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState("");

  const toggle = (m) =>
    onCambiar(seleccionados.includes(m) ? seleccionados.filter((x) => x !== m) : [...seleccionados, m]);

  return (
    <div style={{ position: "relative", flex: "1 1 140px", minWidth: 130 }}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.04em",
          color: "#4A6680",
          marginBottom: 3,
        }}
      >
        MATERIAL
      </div>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          fontSize: 11.5,
          color: seleccionados.length ? "#F0F4FF" : "#4A6680",
          background: "#122440",
          border: "1px solid #1A3050",
          borderRadius: 5,
          padding: "5px 8px",
          cursor: "pointer",
        }}
      >
        {seleccionados.length ? seleccionados.join(", ") : "Ninguno"}
      </button>
      {abierto && (
        <div
          onMouseLeave={() => setAbierto(false)}
          style={{
            position: "absolute",
            zIndex: 15,
            top: "100%",
            left: 0,
            marginTop: 4,
            width: 220,
            maxHeight: 260,
            overflowY: "auto",
            background: "#122440",
            border: "1px solid #1A3050",
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
            padding: 6,
          }}
        >
          {disponibles.map((m) => {
            const activo = seleccionados.includes(m);
            return (
              <div
                key={m}
                onClick={() => toggle(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 6px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  color: activo ? "#F5C518" : "#8BA4C0",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1A3050")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    border: `1.5px solid ${activo ? "#F5C518" : "#1A3050"}`,
                    background: activo ? "#F5C518" : "transparent",
                    color: "#060D1A",
                    fontSize: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
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
              style={{
                flex: 1,
                background: "#122440",
                border: "1px dashed #1A3050",
                borderRadius: 5,
                color: "#F0F4FF",
                fontSize: 11,
                padding: "5px 6px",
              }}
            />
            <button
              onClick={() => {
                if (nuevoMaterial.trim()) {
                  onAgregarMaterial(nuevoMaterial.trim());
                  setNuevoMaterial("");
                }
              }}
              style={{
                background: "transparent",
                border: "1px solid #F5C51866",
                color: "#F5C518",
                borderRadius: 5,
                padding: "0 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotaTarea({ nota, onCambiar }) {
  const [abierta, setAbierta] = useState(!!nota);

  if (!abierta) {
    return (
      <button
        onClick={() => setAbierta(true)}
        style={{
          alignSelf: "flex-start",
          fontSize: 11,
          color: "#4A6680",
          background: "transparent",
          border: "1px dashed #1A3050",
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        + Nota
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em", color: "#4A6680" }}>
          NOTA PARA ESTA TAREA
        </span>
        {!nota && (
          <button
            onClick={() => setAbierta(false)}
            style={{ background: "none", border: "none", color: "#4A6680", cursor: "pointer", fontSize: 11 }}
          >
            cancelar
          </button>
        )}
      </div>
      <textarea
        value={nota || ""}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Ej. Baja el ritmo si nota molestia..."
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#122440",
          border: "1px solid #1A3050",
          borderRadius: 6,
          color: "#F0F4FF",
          fontSize: 12,
          padding: "6px 8px",
          fontFamily: "'Inter', sans-serif",
          resize: "vertical",
        }}
      />
    </div>
  );
}

function FilaTarea({
  tarea,
  onCambiar,
  onEliminar,
  mostrarCarga,
  materialesDisponibles,
  onAgregarMaterial,
  orden,
  onSubir,
  onBajar,
}) {
  const modosDisponibles = mostrarCarga ? ["reps", "tiempo", "metros"] : ["reps", "tiempo"];
  const etiquetaModo = { reps: "REPS", tiempo: "SEG", metros: "M" };
  const ciclarModo = () => {
    const idx = modosDisponibles.indexOf(tarea.modo);
    const siguiente = modosDisponibles[(idx + 1) % modosDisponibles.length];
    onCambiar({ ...tarea, modo: siguiente });
  };
  const tipoResistencia = tarea.tipoResistencia || "Peso libre";

  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#122440",
        borderRadius: 8,
        border: "1px solid #1A3050",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#1A3050",
              color: "#F5C518",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {orden}
          </span>
        )}
        <div style={{ color: "#F0F4FF", fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>
          {tarea.nombre}
        </div>
        {onSubir && (
          <button onClick={onSubir} style={botonMiniStyle} title="Mover antes">
            ↑
          </button>
        )}
        {onBajar && (
          <button onClick={onBajar} style={botonMiniStyle} title="Mover después">
            ↓
          </button>
        )}
        <button
          onClick={onEliminar}
          style={{
            background: "none",
            border: "1px solid #1A3050",
            borderRadius: 6,
            color: "#4A6680",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            width: 24,
            height: 24,
            flexShrink: 0,
          }}
          title="Quitar tarea"
        >
          ×
        </button>
      </div>

      {mostrarCarga && (
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.04em",
              color: "#4A6680",
              marginBottom: 4,
            }}
          >
            TIPO DE RESISTENCIA
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Peso libre", "Elástica", "Peso corporal"].map((t) => (
              <button
                key={t}
                onClick={() => onCambiar({ ...tarea, tipoResistencia: t })}
                style={{
                  fontSize: 11,
                  padding: "5px 9px",
                  borderRadius: 6,
                  border: `1px solid ${tipoResistencia === t ? "#F5C518" : "#1A3050"}`,
                  background: tipoResistencia === t ? "#F5C51822" : "transparent",
                  color: tipoResistencia === t ? "#F5C518" : "#8BA4C0",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoEtiquetado etiqueta="MODO" w={50}>
          <button
            onClick={ciclarModo}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              color: "#8BA4C0",
              background: "#1A3050",
              border: "1px solid #1A3050",
              borderRadius: 5,
              padding: "5px 4px",
              width: "100%",
              textAlign: "center",
              cursor: "pointer",
            }}
            title="Alternar reps / tiempo / metros"
          >
            {etiquetaModo[tarea.modo]}
          </button>
        </CampoEtiquetado>

        <CampoEtiquetado etiqueta="SERIES" w={44}>
          <input
            value={tarea.series}
            onChange={(e) => onCambiar({ ...tarea, series: e.target.value })}
            placeholder="—"
            style={campoStyle("100%")}
          />
        </CampoEtiquetado>

        <CampoEtiquetado etiqueta={etiquetaModo[tarea.modo]} w={44}>
          <input
            value={tarea.cantidad}
            onChange={(e) => onCambiar({ ...tarea, cantidad: e.target.value })}
            placeholder="—"
            style={campoStyle("100%")}
          />
        </CampoEtiquetado>

        {mostrarCarga && (
          <>
            <CampoEtiquetado etiqueta="RIR" w={40}>
              <input
                value={tarea.rir}
                onChange={(e) => onCambiar({ ...tarea, rir: e.target.value })}
                placeholder="—"
                style={campoStyle("100%")}
              />
            </CampoEtiquetado>
            <div style={{ flex: "1 1 100px", minWidth: 100 }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  color: "#4A6680",
                  marginBottom: 3,
                }}
              >
                REF. ANTERIOR (informativo)
              </div>
              <div style={{ fontSize: 11, color: "#8BA4C0", lineHeight: 1.3 }}>
                {tarea.referencia ? tarea.referencia : "Sin registro previo"}
              </div>
            </div>
          </>
        )}

        <SelectorMaterial
          seleccionados={tarea.materiales || []}
          disponibles={materialesDisponibles}
          onCambiar={(nuevos) => onCambiar({ ...tarea, materiales: nuevos })}
          onAgregarMaterial={onAgregarMaterial}
        />
      </div>

      <NotaTarea nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

function campoStyle(w) {
  return {
    width: w,
    background: "#122440",
    border: "1px solid #1A3050",
    borderRadius: 5,
    color: "#F0F4FF",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    padding: "5px 6px",
    textAlign: "center",
    boxSizing: "border-box",
  };
}

const botonMiniStyle = {
  background: "none",
  border: "1px solid #1A3050",
  borderRadius: 6,
  color: "#4A6680",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  width: 24,
  height: 24,
  flexShrink: 0,
};

function CampoResistenciaTarea({ tarea, onCambiar, materialesDisponibles, onAgregarMaterial, orden, onSubir, onBajar, onEliminar }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#122440",
        borderRadius: 8,
        border: "1px solid #1A3050",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {orden != null && (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#1A3050",
              color: "#F5C518",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {orden}
          </span>
        )}
        <div style={{ color: "#F0F4FF", fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 0 }}>
          {tarea.nombre}
        </div>
        {onSubir && (
          <button onClick={onSubir} style={botonMiniStyle} title="Mover antes">
            ↑
          </button>
        )}
        {onBajar && (
          <button onClick={onBajar} style={botonMiniStyle} title="Mover después">
            ↓
          </button>
        )}
        <button onClick={onEliminar} style={botonMiniStyle} title="Quitar tarea">
          ×
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CampoEtiquetado etiqueta="INTERVALOS" w={72}>
          <input
            value={tarea.intervalos}
            onChange={(e) => onCambiar({ ...tarea, intervalos: e.target.value })}
            placeholder="—"
            style={campoStyle("100%")}
          />
        </CampoEtiquetado>
        <CampoEtiquetado etiqueta="TIEMPO (SEG)" w={92}>
          <input
            value={tarea.trabajo}
            onChange={(e) => onCambiar({ ...tarea, trabajo: e.target.value })}
            placeholder="—"
            style={campoStyle("100%")}
          />
        </CampoEtiquetado>
        <CampoEtiquetado etiqueta="RECUPERACIÓN (SEG)" w={128}>
          <input
            value={tarea.descanso}
            onChange={(e) => onCambiar({ ...tarea, descanso: e.target.value })}
            placeholder="—"
            style={campoStyle("100%")}
          />
        </CampoEtiquetado>
      </div>

      <NotaTarea nota={tarea.nota} onCambiar={(n) => onCambiar({ ...tarea, nota: n })} />
    </div>
  );
}

function CajaCircuito({
  circuito,
  tipoBloque,
  mostrarCarga,
  materialesDisponibles,
  onAgregarMaterial,
  onCambiarTareas,
  onEliminarCircuito,
}) {
  const tareas = circuito.tareas;

  const actualizarTarea = (key, nueva) =>
    onCambiarTareas(tareas.map((t) => (t.key === key ? nueva : t)));

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
      tipoBloque === "resistencia"
        ? { key: Date.now(), nombre: ejercicio.nombre, intervalos: "", trabajo: "", descanso: "" }
        : {
            key: Date.now(),
            nombre: ejercicio.nombre,
            modo: ejercicio.modo,
            series: "",
            cantidad: "",
            carga: "",
            rir: "",
            tipoResistencia: "Peso libre",
            materiales: [],
          };
    onCambiarTareas([...tareas, base]);
  };

  const tagsBusqueda = tipoBloque === "core" ? ["Core"] : tipoBloque === "resistencia" ? ["Resistencia"] : ["Fuerza", "Específicas"];

  return (
    <div
      style={{
        border: "1.5px solid #F5C51855",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "#0E1E3540",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "#F5C518",
            border: "1px solid #F5C51855",
            borderRadius: 4,
            padding: "2px 7px",
          }}
        >
          CIRCUITO
        </span>
        <span style={{ fontSize: 11, color: "#4A6680", flex: 1 }}>
          {tareas.length} {tareas.length === 1 ? "ejercicio" : "ejercicios"} · en orden
        </span>
        <button onClick={onEliminarCircuito} style={botonMiniStyle} title="Eliminar circuito completo">
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tareas.map((t, i) =>
          tipoBloque === "resistencia" ? (
            <CampoResistenciaTarea
              key={t.key}
              tarea={t}
              orden={i + 1}
              onCambiar={(nueva) => actualizarTarea(t.key, nueva)}
              onEliminar={() => eliminarTarea(t.key)}
              onSubir={i > 0 ? () => mover(i, -1) : null}
              onBajar={i < tareas.length - 1 ? () => mover(i, 1) : null}
            />
          ) : (
            <FilaTarea
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

      <SelectorEjercicio tags={tagsBusqueda} onAdd={agregarEjercicioAlCircuito} />
    </div>
  );
}

function SelectorEjercicio({ tags, onAdd }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");

  const opciones = BIBLIOTECA.filter((e) => {
    const coincideTag = tags ? e.tags.some((t) => tags.includes(t)) : true;
    const coincideTexto = e.nombre.toLowerCase().includes(filtro.toLowerCase());
    return coincideTag && coincideTexto;
  });

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          fontSize: 12.5,
          color: "#F5C518",
          background: "transparent",
          border: "1px dashed #F5C51866",
          borderRadius: 7,
          padding: "6px 10px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        + Añadir tarea desde biblioteca
      </button>
      {abierto && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            top: "110%",
            left: 0,
            width: 260,
            background: "#122440",
            border: "1px solid #1A3050",
            borderRadius: 10,
            boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
            padding: 8,
          }}
        >
          <input
            autoFocus
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar ejercicio o tag..."
            style={{
              width: "100%",
              background: "#122440",
              border: "1px solid #1A3050",
              borderRadius: 6,
              color: "#F0F4FF",
              fontSize: 12.5,
              padding: "6px 8px",
              marginBottom: 6,
              boxSizing: "border-box",
            }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {opciones.length === 0 && (
              <div style={{ color: "#4A6680", fontSize: 12, padding: "8px 4px" }}>Sin resultados</div>
            )}
            {opciones.map((e) => (
              <div
                key={e.id}
                onClick={() => {
                  onAdd(e);
                  setAbierto(false);
                  setFiltro("");
                }}
                style={{
                  padding: "7px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1A3050")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: "#F0F4FF", fontSize: 13 }}>{e.nombre}</span>
                <span style={{ color: "#4A6680", fontSize: 10.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {e.tags.join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisenoSesion() {
  const [materialesDisponibles, setMaterialesDisponibles] = useState(MATERIALES_INICIALES);
  const agregarMaterial = (m) =>
    setMaterialesDisponibles((prev) => (prev.includes(m) ? prev : [...prev, m]));

  const [tareasCore, setTareasCore] = useState([
    { key: 1, nombre: "Plancha frontal", modo: "tiempo", series: "3", cantidad: "30", carga: "", rir: "", materiales: [] },
  ]);
  const [tareasResistencia, setTareasResistencia] = useState([]);
  const [circuitosCore, setCircuitosCore] = useState([]);
  const [circuitosFuerza, setCircuitosFuerza] = useState([]);
  const [circuitosResistencia, setCircuitosResistencia] = useState([]);
  const [tareasFuerza, setTareasFuerza] = useState([
    {
      key: 1,
      nombre: "Sentadilla trasera",
      modo: "reps",
      series: "5",
      cantidad: "5",
      carga: "",
      rir: "",
      referencia: "100kg × 5 · RIR2",
      tipoResistencia: "Peso libre",
      materiales: ["Barra"],
    },
  ]);
  const [categoriaPreventiva] = useState("Isquiotibiales (muscular)");
  const [preventivoActivo, setPreventivoActivo] = useState(true);
  const [activacionActiva, setActivacionActiva] = useState(true);
  const [jugador] = useState("Roster completo · sub-19");
  const [bici, setBici] = useState("8");
  const [fechas, setFechas] = useState(["2026-08-20"]);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [md, setMd] = useState("");

  const contador = { core: tareasCore.length + 1, fuerza: tareasFuerza.length + 1 };

  const agregarTarea = (bloque, ejercicio) => {
    const base = {
      key: contador[bloque]++,
      nombre: ejercicio.nombre,
      modo: ejercicio.modo,
      series: "",
      cantidad: "",
      carga: "",
      rir: "",
      tipoResistencia: "Peso libre",
      materiales: [],
    };
    if (bloque === "core") setTareasCore((prev) => [...prev, base]);
    else setTareasFuerza((prev) => [...prev, base]);
  };

  const agregarCircuito = (bloque) => {
    const nuevo = { key: Date.now(), tareas: [] };
    if (bloque === "core") setCircuitosCore((prev) => [...prev, nuevo]);
    else if (bloque === "fuerza") setCircuitosFuerza((prev) => [...prev, nuevo]);
    else if (bloque === "resistencia") setCircuitosResistencia((prev) => [...prev, nuevo]);
  };

  const cambiarTareasCircuito = (bloque, circuitoKey, nuevasTareas) => {
    const actualizar = (prev) =>
      prev.map((c) => (c.key === circuitoKey ? { ...c, tareas: nuevasTareas } : c));
    if (bloque === "core") setCircuitosCore(actualizar);
    else if (bloque === "fuerza") setCircuitosFuerza(actualizar);
    else if (bloque === "resistencia") setCircuitosResistencia(actualizar);
  };

  const eliminarCircuito = (bloque, circuitoKey) => {
    const quitar = (prev) => prev.filter((c) => c.key !== circuitoKey);
    if (bloque === "core") setCircuitosCore(quitar);
    else if (bloque === "fuerza") setCircuitosFuerza(quitar);
    else if (bloque === "resistencia") setCircuitosResistencia(quitar);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "28px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        <button
          onClick={() => {}}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            color: "#8BA4C0",
            fontSize: 12.5,
            cursor: "pointer",
            padding: 0,
            marginBottom: 14,
          }}
        >
          ← Volver a Dashboard
        </button>
        {/* Cabecera */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#F5C518",
              marginBottom: 4,
            }}
          >
            NUEVA SESIÓN · SESIÓN ÚNICA
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 26,
              fontWeight: 600,
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
            }}
          >
            Diseño de sesión
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "#8BA4C0" }}>
            <span>👤 {jugador}</span>
          </div>

          {/* Fechas de aplicación */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>
              FECHAS EN LAS QUE SE APLICA ESTA SESIÓN
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {fechas.map((f) => (
                <span
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    color: "#F5C518",
                    border: "1px solid #F5C51855",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  {f}
                  <span
                    onClick={() => setFechas((prev) => prev.filter((x) => x !== f))}
                    style={{ cursor: "pointer", color: "#4A6680" }}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                style={{
                  background: "#0E1E35",
                  border: "1px solid #1A3050",
                  borderRadius: 7,
                  color: "#F0F4FF",
                  fontSize: 12.5,
                  padding: "7px 9px",
                }}
              />
              <button
                onClick={() => {
                  if (nuevaFecha && !fechas.includes(nuevaFecha)) {
                    setFechas((prev) => [...prev, nuevaFecha].sort());
                    setNuevaFecha("");
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px dashed #F5C51866",
                  color: "#F5C518",
                  borderRadius: 7,
                  padding: "0 12px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + Añadir fecha
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#4A6680", marginTop: 6 }}>
              Cada fecha genera su propio turno de rotación en Movilidad y Preventivo — no comparten ejercicio entre sí.
            </div>
          </div>

          {/* MD opcional */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680", marginBottom: 6 }}>
              MD (OPCIONAL)
            </div>
            <select
              value={md}
              onChange={(e) => setMd(e.target.value)}
              style={{
                background: "#0E1E35",
                border: "1px solid #1A3050",
                borderRadius: 7,
                color: "#F0F4FF",
                fontSize: 12.5,
                padding: "7px 9px",
                maxWidth: 160,
              }}
            >
              <option value="">Sin clasificar</option>
              <option value="MD-4">MD-4</option>
              <option value="MD-3">MD-3</option>
              <option value="MD-2">MD-2</option>
              <option value="MD-1">MD-1</option>
              <option value="MD">MD</option>
              <option value="MD+1">MD+1</option>
              <option value="MD+2">MD+2</option>
            </select>
          </div>
        </div>

        {/* Línea de bloques */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BLOQUES.map((b) => (
            <div
              key={b.id}
              style={{
                background: "#0E1E35",
                border: "1px solid #1A3050",
                borderRadius: 12,
              }}
            >
              {/* Header de bloque */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderBottom: "1px solid #1A3050",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "#122440",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8BA4C0",
                    flexShrink: 0,
                  }}
                >
                  <IconoBloque id={b.id} />
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: "#4A6680",
                    width: 14,
                  }}
                >
                  {String(b.numero).padStart(2, "0")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{b.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "#4A6680" }}>{b.descripcion}</div>
                </div>
                <EtiquetaModo modo={b.modo} />
              </div>

              {/* Cuerpo de bloque */}
              <div style={{ padding: 14 }}>
                {b.id === "activacion" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      onClick={() => setActivacionActiva((v) => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 20,
                          borderRadius: 10,
                          background: activacionActiva ? "#F5C518" : "#1A3050",
                          position: "relative",
                          transition: "background 0.15s ease",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: activacionActiva ? 16 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#060D1A",
                            transition: "left 0.15s ease",
                          }}
                        />
                      </span>
                      <span style={{ fontSize: 13, color: activacionActiva ? "#F0F4FF" : "#4A6680" }}>
                        {activacionActiva ? "Activada para esta sesión" : "Sin acceso a bici — sesión empieza en Movilidad"}
                      </span>
                    </div>

                    {activacionActiva && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, color: "#8BA4C0" }}>Duración</span>
                        <input
                          value={bici}
                          onChange={(e) => setBici(e.target.value)}
                          style={campoStyle(50)}
                        />
                        <span style={{ fontSize: 12, color: "#4A6680" }}>min</span>
                      </div>
                    )}
                  </div>
                )}

                {b.id === "movilidad" && (
                  <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
                    La app asignará el siguiente ejercicio del pool de Movilidad automáticamente
                    al generar la sesión. No requiere acción aquí.
                  </div>
                )}

                {b.id === "preventivo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      onClick={() => setPreventivoActivo((v) => !v)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 20,
                          borderRadius: 10,
                          background: preventivoActivo ? "#F5C518" : "#1A3050",
                          position: "relative",
                          transition: "background 0.15s ease",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: preventivoActivo ? 16 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#060D1A",
                            transition: "left 0.15s ease",
                          }}
                        />
                      </span>
                      <span style={{ fontSize: 13, color: preventivoActivo ? "#F0F4FF" : "#4A6680" }}>
                        {preventivoActivo ? "Activado para esta sesión" : "Desactivado — no se aplicará hoy"}
                      </span>
                    </div>

                    {preventivoActivo && (
                      <>
                        <div style={{ fontSize: 12.5, color: "#8BA4C0" }}>
                          Categoría detectada para este roster:{" "}
                          <span style={{ color: "#F5C518", fontWeight: 500 }}>{categoriaPreventiva}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#4A6680" }}>
                          Jugadores sin categoría asignada, o con pool vacío, verán este bloque omitido
                          automáticamente aunque esté activado.
                        </div>
                      </>
                    )}
                  </div>
                )}

                {b.id === "core" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasCore.map((t) => (
                      <FilaTarea
                        key={t.key}
                        tarea={t}
                        mostrarCarga={false}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) =>
                          setTareasCore((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))
                        }
                        onEliminar={() => setTareasCore((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosCore.map((c) => (
                      <CajaCircuito
                        key={c.key}
                        circuito={c}
                        tipoBloque="core"
                        mostrarCarga={false}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => cambiarTareasCircuito("core", c.key, nuevas)}
                        onEliminarCircuito={() => eliminarCircuito("core", c.key)}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicio tags={["Core"]} onAdd={(e) => agregarTarea("core", e)} />
                      <button
                        onClick={() => agregarCircuito("core")}
                        style={{
                          fontSize: 12.5,
                          color: "#8BA4C0",
                          background: "transparent",
                          border: "1px dashed #1A3050",
                          borderRadius: 7,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}

                {b.id === "resistencia" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasResistencia.map((t) => (
                      <CampoResistenciaTarea
                        key={t.key}
                        tarea={t}
                        onCambiar={(nuevo) =>
                          setTareasResistencia((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))
                        }
                        onEliminar={() => setTareasResistencia((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosResistencia.map((c) => (
                      <CajaCircuito
                        key={c.key}
                        circuito={c}
                        tipoBloque="resistencia"
                        onCambiarTareas={(nuevas) => cambiarTareasCircuito("resistencia", c.key, nuevas)}
                        onEliminarCircuito={() => eliminarCircuito("resistencia", c.key)}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicio
                        tags={["Resistencia"]}
                        onAdd={(e) =>
                          setTareasResistencia((prev) => [
                            ...prev,
                            { key: Date.now(), nombre: e.nombre, intervalos: "", trabajo: "", descanso: "" },
                          ])
                        }
                      />
                      <button
                        onClick={() => agregarCircuito("resistencia")}
                        style={{
                          fontSize: 12.5,
                          color: "#8BA4C0",
                          background: "transparent",
                          border: "1px dashed #1A3050",
                          borderRadius: 7,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        + Añadir circuito
                      </button>
                    </div>
                  </div>
                )}

                {b.id === "fuerza" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tareasFuerza.map((t) => (
                      <FilaTarea
                        key={t.key}
                        tarea={t}
                        mostrarCarga={true}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiar={(nuevo) =>
                          setTareasFuerza((prev) => prev.map((x) => (x.key === t.key ? nuevo : x)))
                        }
                        onEliminar={() => setTareasFuerza((prev) => prev.filter((x) => x.key !== t.key))}
                      />
                    ))}
                    {circuitosFuerza.map((c) => (
                      <CajaCircuito
                        key={c.key}
                        circuito={c}
                        tipoBloque="fuerza"
                        mostrarCarga={true}
                        materialesDisponibles={materialesDisponibles}
                        onAgregarMaterial={agregarMaterial}
                        onCambiarTareas={(nuevas) => cambiarTareasCircuito("fuerza", c.key, nuevas)}
                        onEliminarCircuito={() => eliminarCircuito("fuerza", c.key)}
                      />
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <SelectorEjercicio tags={["Fuerza", "Específicas"]} onAdd={(e) => agregarTarea("fuerza", e)} />
                      <button
                        onClick={() => agregarCircuito("fuerza")}
                        style={{
                          fontSize: 12.5,
                          color: "#8BA4C0",
                          background: "transparent",
                          border: "1px dashed #1A3050",
                          borderRadius: 7,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
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

        {/* Pie de acción */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button
            style={{
              background: "transparent",
              border: "1px solid #1A3050",
              color: "#8BA4C0",
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            Guardar borrador
          </button>
          <button
            style={{
              background: "#F5C518",
              border: "1px solid #F5C518",
              color: "#060D1A",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Enviar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
