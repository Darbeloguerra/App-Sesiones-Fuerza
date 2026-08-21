import React, { useState } from "react";

const BLOQUES = ["Fuerza", "Específicas", "Core", "Movilidad", "Preventivo", "Resistencia"];
const CATEGORIAS_PREVENTIVAS = [
  { nombre: "Isquiotibiales (muscular)", tipo: "Muscular" },
  { nombre: "Cuádriceps", tipo: "Muscular" },
  { nombre: "Aductores", tipo: "Muscular" },
  { nombre: "Sóleo/Gemelo", tipo: "Muscular" },
  { nombre: "Rotuliana", tipo: "Tendinosa" },
  { nombre: "Aquílea", tipo: "Tendinosa" },
  { nombre: "Isquiotibial (tendinoso)", tipo: "Tendinosa" },
  { nombre: "Pubalgia", tipo: "Articular" },
  { nombre: "Cadera", tipo: "Articular" },
  { nombre: "Rodilla", tipo: "Articular" },
  { nombre: "Lumbar", tipo: "Articular" },
  { nombre: "Hombro", tipo: "Articular" },
];
const TIPOS_TEJIDO = ["Muscular", "Tendinosa", "Articular"];
const TAGS_DESCRIPTIVOS = ["Miembro superior", "Miembro inferior"];

const BIBLIOTECA_INICIAL = [
  { id: 1, nombre: "Sentadilla trasera", bloque: "Fuerza", categoria: null, tags: ["Miembro inferior"], gif: null },
  { id: 2, nombre: "Sentadilla búlgara", bloque: "Fuerza", categoria: null, tags: ["Miembro inferior"], gif: null },
  { id: 3, nombre: "RDL a una pierna", bloque: "Fuerza", categoria: null, tags: ["Miembro inferior"], gif: null },
  { id: 4, nombre: "Plancha frontal", bloque: "Core", categoria: null, tags: [], gif: null },
  { id: 5, nombre: "Dead bug", bloque: "Core", categoria: null, tags: [], gif: null },
  { id: 6, nombre: "Nordic curl", bloque: "Preventivo", categoria: "Isquiotibiales (muscular)", tags: ["Miembro inferior"], gif: null },
  { id: 7, nombre: "Curl nórdico asistido", bloque: "Preventivo", categoria: "Isquiotibiales (muscular)", tags: ["Miembro inferior"], gif: null },
  { id: 8, nombre: "Puente isquios a una pierna", bloque: "Preventivo", categoria: "Isquiotibiales (muscular)", tags: ["Miembro inferior"], gif: null },
  { id: 9, nombre: "Copenhagen plank", bloque: "Preventivo", categoria: "Aductores", tags: [], gif: null },
  { id: 10, nombre: "Elevación talón excéntrica", bloque: "Preventivo", categoria: "Rotuliana", tags: [], gif: null },
  { id: 11, nombre: "Movilidad cadera 90/90", bloque: "Movilidad", categoria: null, tags: [], gif: null },
  { id: 12, nombre: "Rotación torácica", bloque: "Movilidad", categoria: null, tags: [], gif: null },
];

function TagChip({ tag, activo, onClick }) {
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

function campoSelect(extra = {}) {
  return {
    background: "#122440",
    border: "1px solid #1A3050",
    borderRadius: 7,
    color: "#F0F4FF",
    fontSize: 13,
    padding: "8px 9px",
    ...extra,
  };
}

function TarjetaEjercicio({ ejercicio, onEditar, onEliminar }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "#0E1E35",
        border: "1px solid #1A3050",
        borderRadius: 10,
      }}
    >
      {ejercicio.gif ? (
        <img
          src={ejercicio.gif}
          alt=""
          style={{ width: 40, height: 40, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 7,
            background: "#122440",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#4A6680",
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          —
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F0F4FF" }}>{ejercicio.nombre}</div>
        <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {ejercicio.categoria && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9.5,
                color: "#F5C518",
                border: "1px solid #F5C51855",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {ejercicio.categoria}
            </span>
          )}
          {ejercicio.tags.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9.5,
                color: "#4A6680",
                border: "1px solid #1A3050",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onEditar} style={btnIcono} title="Editar ejercicio">
        ✎
      </button>
      <button onClick={onEliminar} style={btnIcono} title="Eliminar ejercicio">
        ×
      </button>
    </div>
  );
}

const btnIcono = {
  background: "transparent",
  border: "1px solid #1A3050",
  borderRadius: 6,
  color: "#4A6680",
  width: 26,
  height: 26,
  cursor: "pointer",
  fontSize: 12.5,
};

function PanelNuevoEjercicio({ onGuardar, onCerrar, ejercicioEditar }) {
  const [nombre, setNombre] = useState(ejercicioEditar?.nombre || "");
  const [bloque, setBloque] = useState(ejercicioEditar?.bloque || "Fuerza");
  const [categoria, setCategoria] = useState(ejercicioEditar?.categoria || CATEGORIAS_PREVENTIVAS[0].nombre);
  const [tagsSel, setTagsSel] = useState(ejercicioEditar?.tags || []);
  const [gifData, setGifData] = useState(ejercicioEditar?.gif || null);
  const fileInputRef = React.useRef(null);

  const esPreventivo = bloque === "Preventivo";
  const toggleTag = (t) => setTagsSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 30,
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#0E1E35",
          border: "1px solid #1A3050",
          borderRadius: "16px 16px 0 0",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F4FF" }}>
          {ejercicioEditar ? "Editar ejercicio" : "Nuevo ejercicio"}
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>NOMBRE</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Sentadilla frontal"
            style={campoSelect()}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
            BLOQUE (único, obligatorio)
          </span>
          <select value={bloque} onChange={(e) => setBloque(e.target.value)} style={campoSelect()}>
            {BLOQUES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {esPreventivo && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#F5C518" }}>
              CATEGORÍA PREVENTIVA (obligatoria, solo aplica a este bloque)
            </span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={campoSelect()}>
              {TIPOS_TEJIDO.map((tipo) => (
                <optgroup key={tipo} label={tipo}>
                  {CATEGORIAS_PREVENTIVAS.filter((c) => c.tipo === tipo).map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
            TAGS DESCRIPTIVOS (solo para buscar — no afectan a la rotación)
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAGS_DESCRIPTIVOS.map((t) => (
              <TagChip key={t} tag={t} activo={tagsSel.includes(t)} onClick={() => toggleTag(t)} />
            ))}
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>GIF</span>
          {gifData ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={gifData}
                alt="Vista previa del GIF"
                style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid #1A3050" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#F5C518" }}>GIF cargado</span>
                <button
                  onClick={() => setGifData(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid #1A3050",
                    color: "#8BA4C0",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11.5,
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  Quitar y subir otro
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "1px dashed #1A3050",
                borderRadius: 8,
                padding: "14px",
                textAlign: "center",
                color: "#4A6680",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Subir GIF del ejercicio
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setGifData(reader.result);
                  reader.readAsDataURL(file);
                }}
                style={{ display: "none" }}
              />
            </div>
          )}
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            onClick={onCerrar}
            style={{
              background: "transparent",
              border: "1px solid #1A3050",
              color: "#8BA4C0",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!nombre.trim()) return;
              onGuardar({
                id: ejercicioEditar?.id,
                nombre,
                bloque,
                categoria: esPreventivo ? categoria : null,
                tags: tagsSel,
                gif: gifData,
              });
            }}
            style={{
              background: "#F5C518",
              border: "1px solid #F5C518",
              color: "#060D1A",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {ejercicioEditar ? "Guardar cambios" : "Guardar ejercicio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VistaOrdenRotacion({ ejercicios }) {
  const [categoriaSel, setCategoriaSel] = useState(CATEGORIAS_PREVENTIVAS[0].nombre);
  const [ordenes, setOrdenes] = useState(() => {
    const map = {};
    CATEGORIAS_PREVENTIVAS.forEach((cat) => {
      map[cat.nombre] = ejercicios.filter((e) => e.bloque === "Preventivo" && e.categoria === cat.nombre);
    });
    return map;
  });

  const lista = ordenes[categoriaSel] || [];

  const mover = (index, dir) => {
    setOrdenes((prev) => {
      const nueva = [...prev[categoriaSel]];
      const destino = index + dir;
      if (destino < 0 || destino >= nueva.length) return prev;
      [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];
      return { ...prev, [categoriaSel]: nueva };
    });
  };

  return (
    <div>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
          CATEGORÍA PREVENTIVA
        </span>
        <select
          value={categoriaSel}
          onChange={(e) => setCategoriaSel(e.target.value)}
          style={campoSelect({ maxWidth: 240 })}
        >
          {TIPOS_TEJIDO.map((tipo) => (
            <optgroup key={tipo} label={tipo}>
              {CATEGORIAS_PREVENTIVAS.filter((c) => c.tipo === tipo).map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre} ({(ordenes[c.nombre] || []).length} en el pool)
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div style={{ fontSize: 11.5, color: "#4A6680", marginBottom: 10 }}>
        Solo ejercicios con bloque "Preventivo" y categoría "{categoriaSel}" — no se mezclan con ejercicios de
        otros bloques aunque compartan tags descriptivos.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.length === 0 && (
          <div style={{ color: "#4A6680", fontSize: 12.5, padding: "12px 0" }}>
            Sin ejercicios en esta categoría todavía.
          </div>
        )}
        {lista.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              background: "#0E1E35",
              border: "1px solid #1A3050",
              borderRadius: 8,
            }}
          >
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#4A6680", width: 16 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: "#F0F4FF" }}>{e.nombre}</span>
            <button onClick={() => mover(i, -1)} style={btnIcono} disabled={i === 0}>
              ↑
            </button>
            <button onClick={() => mover(i, 1)} style={btnIcono} disabled={i === lista.length - 1}>
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BibliotecaEjercicios() {
  const [ejercicios, setEjercicios] = useState(BIBLIOTECA_INICIAL);
  const [bloqueFiltro, setBloqueFiltro] = useState("Todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState(null);
  const [vista, setVista] = useState("lista");

  const visibles = ejercicios
    .filter((e) => (bloqueFiltro === "Todos" ? true : e.bloque === bloqueFiltro))
    .filter((e) => (categoriaFiltro === "Todas" ? true : e.categoria === categoriaFiltro))
    .filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const guardarEjercicio = (datos) => {
    if (datos.id) {
      setEjercicios((prev) => prev.map((e) => (e.id === datos.id ? { ...e, ...datos } : e)));
    } else {
      setEjercicios((prev) => [...prev, { id: Date.now(), ...datos }]);
    }
    setPanelAbierto(false);
    setEjercicioEditando(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060D1A",
        color: "#F0F4FF",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "24px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

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
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "#F5C518",
              marginBottom: 4,
            }}
          >
            BIBLIOTECA
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
            Ejercicios
          </h1>
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
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#0E1E35",
                border: "1px solid #1A3050",
                borderRadius: 8,
                color: "#F0F4FF",
                fontSize: 13,
                padding: "9px 10px",
                marginBottom: 10,
              }}
            />

            <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#4A6680" }}>
                FILTRAR POR BLOQUE
              </span>
              <select
                value={bloqueFiltro}
                onChange={(e) => setBloqueFiltro(e.target.value)}
                style={campoSelect({ maxWidth: 220 })}
              >
                <option value="Todos">Todos</option>
                {BLOQUES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#F5C518" }}>
                FILTRAR POR CATEGORÍA PREVENTIVA
              </span>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                style={campoSelect({ maxWidth: 220 })}
              >
                <option value="Todas">Todas</option>
                {TIPOS_TEJIDO.map((tipo) => (
                  <optgroup key={tipo} label={tipo}>
                    {CATEGORIAS_PREVENTIVAS.filter((c) => c.tipo === tipo).map((c) => (
                      <option key={c.nombre} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibles.map((e) => (
                <TarjetaEjercicio
                  key={e.id}
                  ejercicio={e}
                  onEditar={() => {
                    setEjercicioEditando(e);
                    setPanelAbierto(true);
                  }}
                  onEliminar={() => setEjercicios((prev) => prev.filter((x) => x.id !== e.id))}
                />
              ))}
              {visibles.length === 0 && (
                <div style={{ color: "#4A6680", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                  Sin resultados
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setEjercicioEditando(null);
                setPanelAbierto(true);
              }}
              style={{
                width: "100%",
                marginTop: 16,
                background: "transparent",
                border: "1px dashed #F5C51866",
                color: "#F5C518",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              + Nuevo ejercicio
            </button>
          </>
        ) : (
          <VistaOrdenRotacion ejercicios={ejercicios} />
        )}
      </div>

      {panelAbierto && (
        <PanelNuevoEjercicio
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
