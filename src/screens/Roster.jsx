import { useState } from "react";
import { Eye, EyeOff, User, TrendingUp, Zap, Pencil } from "lucide-react";
import { ds, dsR, dsSh, dsF, DsButton, DsInput, DsTabSwitcher, DsProgressRing, DsAvatar } from "../core/designSystem.jsx";
import { accesoSesion, supabase } from "../core/backend.js";
import { useAnchoVentana } from "../core/layout.jsx";
import { CerrablePorFuera, ChipReal, inicialesNombre, colorAvatarJugador, MiniStat, AVATAR_STACK_COLORES, LoadingBlock } from "../core/components.jsx";
import { IconoModulo, PantallaEntrenadorAncha } from "../core/layoutEntrenador.jsx";
import {
  genUniquePin,
  useEntityList,
  useConfigValue,
  usePlayers,
  useCategoriasPreventivas,
  useEquipoHistory,
  useBootstrapProgramacion,
  useCarteraEntrenador,
  ESTADO_JUGADOR_META,
} from "../core/hooks.js";
import { CMJ_STATUS_META } from "../core/cmjDisplay.jsx";
import { todayStr, inicioSemanaCalendario, sumarDiasFecha } from "../calc/fechas.js";
import { tareasHechasPorJugadorFecha, crearFraccionCumplida } from "../calc/adherencia.js";

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
        borderRadius: dsR.lg,
        boxShadow: dsSh.elevation3,
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
            style={{ padding: "8px 10px", borderRadius: dsR.sm, fontSize: 12.5, color, cursor: "pointer", transition: "background-color 120ms ease-out" }}
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

function FilaJugadorReal({ jugador, categorias, grupos, adherencia = null, onAccion, onCambiarCategorias, onCambiarGrupos }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [selectorGruposAbierto, setSelectorGruposAbierto] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const suspendido = jugador.estado === "suspendido";
  const nombresCategorias = jugador.groupIds
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter(Boolean);
  const nombresGrupos = (jugador.gruposIds || [])
    .map((id) => grupos.find((g) => g.id === id)?.nombre)
    .filter(Boolean);
  const colorAvatar = colorAvatarJugador(jugador.id);
  const revelado = hover || menuAbierto || pinVisible || selectorAbierto || selectorGruposAbierto;

  return (
    <div
      onClick={() => onAccion(jugador.id, "historial")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onAccion(jugador.id, "historial"); }}
      title={`Ver ficha de ${jugador.name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        background: hover ? ds.surfaceRaised : `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)`,
        border: `1px solid ${suspendido ? `${ds.warning}40` : hover ? ds.borderMuted : ds.borderSoft}`,
        borderRadius: dsR.xl,
        boxShadow: `${dsSh.elevation1}, inset 0 1px 0 rgba(255,255,255,0.03)`,
        opacity: suspendido ? 0.75 : 1,
        cursor: "pointer",
        transition: "border-color 120ms ease-out, background 120ms ease-out",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <DsAvatar
          size={38}
          style={{
            background: `${colorAvatar}22`,
            color: colorAvatar,
            border: `1.5px solid ${colorAvatar}55`,
            fontWeight: 700,
            fontFamily: dsF.display,
          }}
        >
          {inicialesNombre(jugador.name)}
        </DsAvatar>
        <div
          title={suspendido ? "Suspendido" : "Activo"}
          style={{ position: "absolute", right: -1, bottom: -1, width: 10, height: 10, borderRadius: dsR.full, background: suspendido ? ds.warning : ds.success, border: `2px solid ${ds.surface}` }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: ds.ink }}>{jugador.name}</span>
          {suspendido && <ChipReal tono="ambar">SUSPENDIDO</ChipReal>}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap", alignItems: "center", position: "relative" }} onClick={(e) => e.stopPropagation()}>
          {nombresGrupos.map((g) => (
            <ChipReal key={`g-${g}`} tono="azul">{g}</ChipReal>
          ))}
          {nombresCategorias.map((c) => (
            <ChipReal key={`c-${c}`} tono="verde">{c}</ChipReal>
          ))}
          {nombresGrupos.length === 0 && nombresCategorias.length === 0 && (
            <span style={{ fontSize: 11, color: ds.inkMuted }}>Independiente · sin categoría preventiva</span>
          )}
          <span
            onClick={() => setSelectorGruposAbierto((v) => !v)}
            style={{ fontSize: 10, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px", opacity: revelado ? 1 : 0.45, transition: "opacity 120ms" }}
            title="Editar grupos"
          >
            + grupo
          </span>
          <span
            onClick={() => setSelectorAbierto((v) => !v)}
            style={{ fontSize: 10, color: ds.inkMuted, cursor: "pointer", border: `1px dashed ${ds.border}`, borderRadius: 4, padding: "0px 5px", opacity: revelado ? 1 : 0.45, transition: "opacity 120ms" }}
            title="Editar categoría preventiva"
          >
            + categoría
          </span>
          {selectorGruposAbierto && (
            <SelectorGruposReal
              grupos={grupos}
              seleccionados={jugador.gruposIds || []}
              onCambiar={(nuevos) => onCambiarGrupos(jugador.id, nuevos)}
              onCerrar={() => setSelectorGruposAbierto(false)}
            />
          )}
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

      <div title={adherencia != null ? `${adherencia}% de adherencia esta semana` : "Sin sesiones asignadas esta semana"} style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {adherencia != null ? (
          <DsProgressRing value={adherencia} size={34} strokeWidth={3.5} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: dsR.full, border: `1.5px dashed ${ds.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: dsF.mono, fontSize: 10, color: ds.inkMuted }}>—</div>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, opacity: revelado ? 1 : 0.4, transition: "opacity 120ms" }}>
        <button
          onClick={() => setPinVisible((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: dsF.mono,
            fontSize: 12,
            fontWeight: 600,
            color: ds.inkSecondary,
            cursor: "pointer",
            minWidth: 62,
            justifyContent: "center",
            background: ds.canvas,
            border: `1px solid ${ds.border}`,
            borderRadius: dsR.md,
            padding: "6px 8px",
          }}
          title="Mostrar/ocultar PIN"
          type="button"
        >
          {pinVisible ? jugador.pin : "••••"}
          {pinVisible ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            style={{
              width: 28,
              height: 28,
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

// Lista de usuarios como cartera: estado, adherencia, última actividad y CMJ de
// cada jugador de un vistazo; ordenada con quien necesita atención arriba.
function CarteraUsuariosReal({ players, grupos, cartera, onAbrir, onAccion, onAlta, onGrupo }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [menuId, setMenuId] = useState(null);
  const ancho = useAnchoVentana();
  const estaListo = cartera && cartera.loaded;
  const filaDe = (p) => (estaListo ? cartera.filas.get(p.id) : null);
  const activos = players.filter((p) => p.estado === "activo");
  const suspendidos = players.filter((p) => p.estado !== "activo");
  const cuenta = (e) => activos.filter((p) => filaDe(p)?.estado === e).length;
  const orden = { atencion: 0, aldia: 1, sinplan: 2 };
  const lista = (filtro === "suspendidos" ? suspendidos : activos)
    .filter((p) => {
      if (filtro === "todos" || filtro === "suspendidos") return true;
      if (filtro === "atencion" || filtro === "aldia" || filtro === "sinplan") return filaDe(p)?.estado === filtro;
      if (filtro === "independientes") return (p.gruposIds || []).length === 0;
      return (p.gruposIds || []).includes(filtro);
    })
    .filter((p) => p.name.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => (orden[filaDe(a)?.estado] ?? 3) - (orden[filaDe(b)?.estado] ?? 3) || a.name.localeCompare(b.name));
  const pills = [
    { id: "todos", label: `Todos (${activos.length})` },
    { id: "atencion", label: `Atención${estaListo ? ` (${cuenta("atencion")})` : ""}` },
    { id: "aldia", label: "Al día" },
    { id: "sinplan", label: "Sin plan" },
    ...grupos.map((g) => ({ id: g.id, label: g.nombre })),
    { id: "independientes", label: "Independientes" },
    ...(suspendidos.length ? [{ id: "suspendidos", label: `Suspendidos (${suspendidos.length})` }] : []),
  ];
  const compacto = ancho < 760;
  const cols = compacto ? "minmax(120px, 1.6fr) 90px 70px 32px" : "minmax(170px, 1.7fr) 96px minmax(120px, 1.2fr) 110px 70px 32px";
  const fmtUlt = (f) => (f.diasSin === null ? "Sin registros" : f.diasSin === 0 ? "Hoy" : f.diasSin === 1 ? "Ayer" : `Hace ${f.diasSin} d`);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>USUARIOS</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Tu cartera</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
            {estaListo ? `${cuenta("atencion")} requieren atención · ${cuenta("aldia")} al día · ${activos.length} activos` : `${activos.length} activos`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onGrupo} style={{ fontSize: 12.5, fontWeight: 600, padding: "9px 14px", borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}>+ Grupo</button>
          <button type="button" onClick={onAlta} style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1px solid ${ds.accent}`, background: ds.accent, color: ds.accentInk, cursor: "pointer" }}>+ Añadir usuario</button>
        </div>
      </div>
      <DsInput value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar usuario..." style={{ width: "100%", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {pills.map((f) => (
          <button key={f.id} type="button" onClick={() => setFiltro(f.id)} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 999, border: `1px solid ${filtro === f.id ? ds.accent : ds.border}`, background: filtro === f.id ? ds.accentSubtle : "transparent", color: filtro === f.id ? ds.accent : ds.inkSecondary, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ background: ds.surface, border: `1px solid ${ds.border}`, borderRadius: 14, overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "9px 14px", fontFamily: dsF.mono, fontSize: 10, letterSpacing: "0.06em", color: ds.inkMuted, textTransform: "uppercase" }}>
          <span>Jugador</span>
          <span>Estado</span>
          {!compacto && <span>Adherencia 4 sem.</span>}
          {!compacto && <span>Última actividad</span>}
          <span>CMJ</span>
          <span />
        </div>
        {lista.map((p) => {
          const f = filaDe(p);
          const meta = f ? ESTADO_JUGADOR_META[f.estado] : null;
          const cmjMeta = f && f.cmj ? CMJ_STATUS_META[f.cmj] : null;
          const nGrupos = (p.gruposIds || []).map((g) => grupos.find((x) => x.id === g)?.nombre).filter(Boolean);
          const motivo = f && f.alertas.length ? [...f.alertas].sort((a, b) => b.sev - a.sev)[0] : null;
          return (
            <div key={p.id} style={{ position: "relative", borderTop: `1px solid ${ds.border}` }}>
              <div role="button" tabIndex={0} onClick={() => onAbrir(p)} onKeyDown={(e) => { if (e.key === "Enter") onAbrir(p); }} style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "11px 14px", alignItems: "center", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: `${colorAvatarJugador(p.id)}33`, color: colorAvatarJugador(p.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{inicialesNombre(p.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: ds.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: motivo && f.estado === "atencion" ? ds.warning : ds.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {motivo && f.estado === "atencion" ? (() => { const t = motivo.titulo.replace(`${p.name} · `, ""); return t.charAt(0).toUpperCase() + t.slice(1); })() : nGrupos.length ? nGrupos.join(" · ") : "Independiente"}
                    </span>
                  </span>
                </span>
                <span>
                  {p.estado !== "activo" ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: ds.inkMuted, border: `1px solid ${ds.border}`, borderRadius: 999, padding: "2px 9px" }}>Suspendido</span>
                  ) : meta ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}66`, background: `${meta.color}14`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{meta.label}</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: ds.inkMuted }}>…</span>
                  )}
                </span>
                {!compacto && (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, height: 6, borderRadius: 999, background: ds.border, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${f && f.adh28 !== null ? f.adh28 : 0}%`, background: f && f.adh28 !== null && f.adh28 >= 75 ? ds.success : ds.warning }} />
                    </span>
                    <b style={{ fontSize: 12, width: 38, textAlign: "right", color: f && f.adh28 !== null ? ds.ink : ds.inkMuted }}>{f && f.adh28 !== null ? `${f.adh28} %` : "—"}</b>
                  </span>
                )}
                {!compacto && <span style={{ fontSize: 12.5, color: f && f.diasSin !== null && f.diasSin >= 5 ? ds.warning : ds.inkSecondary }}>{f ? fmtUlt(f) : "…"}</span>}
                <span>
                  {cmjMeta ? (
                    <span title={cmjMeta.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: cmjMeta.color }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: cmjMeta.color }} />
                      {compacto ? "" : cmjMeta.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: ds.inkMuted }}>—</span>
                  )}
                </span>
                <span style={{ position: "relative" }}>
                  <button type="button" aria-label="Más acciones" onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: ds.inkSecondary, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>⋯</button>
                  {menuId === p.id && <MenuAccionesReal jugador={p} onAccion={(id) => onAccion(p.id, id)} onCerrar={() => setMenuId(null)} />}
                </span>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "22px 14px", textAlign: "center", borderTop: `1px solid ${ds.border}` }}>Nadie en este filtro.</div>}
      </div>
    </div>
  );
}

// Cambio del código de entrenador (se guarda cifrado en Supabase; nadie, tampoco la
// app, puede volver a leerlo). Un código largo protege mucho más que uno de 4 cifras.
function PanelCodigoEntrenadorReal({ onCerrar }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [estado, setEstado] = useState({ guardando: false, error: "", ok: false });
  const guardar = async () => {
    const v = a.trim();
    if (v.length < 4) return setEstado({ guardando: false, error: "Mínimo 4 caracteres (recomendado: 8 o más).", ok: false });
    if (v !== b.trim()) return setEstado({ guardando: false, error: "Los dos códigos no coinciden.", ok: false });
    setEstado({ guardando: true, error: "", ok: false });
    try {
      const { data, error } = await supabase.rpc("cambiar_codigo_entrenador", { p_nuevo: v });
      if (error) throw error;
      if (!data || !data.ok) {
        const msg = data?.error === "igual_que_un_jugador" ? "Ese código ya es el PIN de un jugador. Elige otro." : data?.error === "corto" ? "Demasiado corto." : "No tienes permiso para cambiarlo.";
        return setEstado({ guardando: false, error: msg, ok: false });
      }
      setA("");
      setB("");
      setEstado({ guardando: false, error: "", ok: true });
    } catch {
      setEstado({ guardando: false, error: "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.", ok: false });
    }
  };
  return (
    <div style={{ background: ds.bgElevated, border: `1px solid ${ds.border}`, borderRadius: dsR.md, padding: 14, marginBottom: 14, maxWidth: 420 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Código de entrenador</div>
      <div style={{ fontSize: 12, color: ds.inkSecondary, marginBottom: 10, lineHeight: 1.5 }}>
        Se guarda cifrado: ni tú ni la app podréis volver a verlo, solo cambiarlo. Recomendado: 8 cifras o más; con 4 es fácil de adivinar.
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <DsInput type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Código nuevo" />
        <DsInput type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Repite el código" />
      </div>
      {estado.error && <div style={{ color: ds.danger, fontSize: 12, marginBottom: 8 }}>{estado.error}</div>}
      {estado.ok && <div style={{ color: ds.success, fontSize: 12, marginBottom: 8 }}>Código cambiado. Úsalo la próxima vez que entres.</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <DsButton onClick={guardar} disabled={estado.guardando}>
          {estado.guardando ? "Guardando..." : "Guardar código"}
        </DsButton>
        <DsButton variant="secondary" onClick={onCerrar}>
          Cerrar
        </DsButton>
      </div>
    </div>
  );
}

export function GestionRosterReal({ onBack, onOpenHistory, onAbrirModulo, onCerrarSesion }) {
  const [players, savePlayers, playersLoaded] = usePlayers();
  const [categorias, categoriasLoaded] = useCategoriasPreventivas();
  const [grupos, saveGrupos, gruposLoaded] = useEntityList("grupos");
  const [coachPin, , coachPinLoaded] = useConfigValue("coach_pin");
  const { sesiones, tareas: tareasProg, loaded: progLoaded } = useBootstrapProgramacion();
  const { items: equipoHistory, loaded: equipoLoaded } = useEquipoHistory();
  const cartera = useCarteraEntrenador();
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [panelAltaAbierto, setPanelAltaAbierto] = useState(false);
  const [panelGrupoAbierto, setPanelGrupoAbierto] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");
  // Las tres vistas del mockup de Fase 6 (Equipos y usuarios): Equipos
  // (tarjetas por grupo), Independientes (página propia) y Usuarios (el
  // directorio plano que ya existía, sin tocar su lógica de filtros). Un
  // grupo real ("grupos", entidad ya existente) hace aquí de "equipo" del
  // mockup — no se crea ninguna tabla/entidad nueva para esto.
  const [vista, setVista] = useState("cartera");
  const [codigoEntrenadorAbierto, setCodigoEntrenadorAbierto] = useState(false);
  const [equipoAbiertoId, setEquipoAbiertoId] = useState(null);
  // Preseleccionado al pulsar "+ Añadir jugador" desde dentro del detalle de
  // un equipo — así el alta queda ya asignada a ese grupo sin un segundo paso.
  const [grupoAltaPreset, setGrupoAltaPreset] = useState(null);

  if (!playersLoaded || !categoriasLoaded || !coachPinLoaded || !gruposLoaded || !progLoaded || !equipoLoaded) return <LoadingBlock />;

  // Adherencia de esta semana de calendario, por jugador — para el "adh"
  // de cada fila (mockup de Fase 6 → Equipos y usuarios). Mismo criterio
  // exacto que adherenciaActual en useDatosDashboardEntrenador y en
  // ResumenFichaJugadorReal (cumplidas / asignadas, límite superior hoy),
  // calculado UNA vez aquí para todo el roster en vez de una consulta por
  // fila — reutiliza useBootstrapProgramacion/useEquipoHistory, que ya
  // traen todo el equipo de una sola vez.
  const hoyRoster = todayStr();
  const lunesRoster = inicioSemanaCalendario(hoyRoster);
  const domingoRoster = sumarDiasFecha(lunesRoster, 6);
  const hechasRoster = tareasHechasPorJugadorFecha(equipoHistory);
  const fraccionCumplidaRoster = crearFraccionCumplida(tareasProg);
  const asignadasPorJugador = new Map();
  const cumplidasPorJugador = new Map();
  sesiones
    .filter((s) => s.enviada)
    .forEach((s) => {
      const destino = s.jugadores_destino && s.jugadores_destino.length ? s.jugadores_destino : players.filter((p) => p.estado === "activo").map((p) => p.id);
      (s.fechas || []).forEach((f) => {
        if (f < lunesRoster || f > domingoRoster || f > hoyRoster) return;
        destino.forEach((jugadorId) => {
          asignadasPorJugador.set(jugadorId, (asignadasPorJugador.get(jugadorId) || 0) + 1);
          const fraccion = fraccionCumplidaRoster(s.id, f, hechasRoster.get(`${jugadorId}::${f}`), jugadorId);
          if (fraccion > 0) cumplidasPorJugador.set(jugadorId, (cumplidasPorJugador.get(jugadorId) || 0) + fraccion);
        });
      });
    });
  const adherenciaPorJugador = new Map();
  asignadasPorJugador.forEach((total, jugadorId) => {
    adherenciaPorJugador.set(jugadorId, Math.round(((cumplidasPorJugador.get(jugadorId) || 0) / total) * 100));
  });

  // Las 3 stats agregadas que pide la vista Equipos (tarjeta de grupo,
  // detalle de equipo y la página de Independientes): jugadores, adherencia
  // MEDIA DEL GRUPO (cumplidas/asignadas del conjunto, mismo criterio que
  // adherenciaEquipo en ResumenFichaJugadorReal — no la media de los
  // porcentajes individuales, que pondera distinto a quien tiene pocas
  // sesiones asignadas) y activos hoy (mismo criterio que pendientesHoy en
  // useDatosDashboardEntrenador: ya registrado hoy). grupoId === null pide
  // los independientes.
  const statsGrupo = (grupoId) => {
    const jugadoresGrupo = players.filter((p) =>
      grupoId === null ? (p.gruposIds || []).length === 0 : (p.gruposIds || []).includes(grupoId)
    );
    let asignadas = 0;
    let cumplidas = 0;
    let activosHoy = 0;
    jugadoresGrupo.forEach((p) => {
      asignadas += asignadasPorJugador.get(p.id) || 0;
      cumplidas += cumplidasPorJugador.get(p.id) || 0;
      if (hechasRoster.has(`${p.id}::${hoyRoster}`)) activosHoy++;
    });
    return {
      jugadores: jugadoresGrupo,
      total: jugadoresGrupo.length,
      adherenciaMedia: asignadas ? Math.round((cumplidas / asignadas) * 100) : null,
      activosHoy,
    };
  };

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
    const ok = await savePlayers([...players, { name: nombre, pin, estado: "activo", groupIds: [], gruposIds: grupoAltaPreset ? [grupoAltaPreset] : [] }]);
    if (ok) {
      setPanelAltaAbierto(false);
      setGrupoAltaPreset(null);
    }
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

  const grupoAbierto = vista === "equipos" && equipoAbiertoId ? grupos.find((g) => g.id === equipoAbiertoId) || null : null;
  const jugadoresEnEquipo = players.filter((p) => (p.gruposIds || []).length > 0).length;

  return (
    <PantallaEntrenadorAncha activo="roster" onAbrirModulo={onAbrirModulo} onCerrarSesion={onCerrarSesion}>
      <div>
        {/* view-switch del mockup de Fase 6 (Equipos y usuarios): tres
            vistas, no un valor binario — sigue siendo un grupo de botones
            (como DsTabSwitcher en el resto de la app), no un <select>. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {accesoSesion.token && accesoSesion.rol === "entrenador" ? (
            <button
              onClick={() => setCodigoEntrenadorAbierto((v) => !v)}
              style={{ fontSize: 12, padding: "7px 11px", borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: "transparent", color: ds.inkSecondary, cursor: "pointer" }}
            >
              Código de entrenador
            </button>
          ) : (
            <span />
          )}
          <DsTabSwitcher
            tabs={[
              { id: "cartera", label: "Cartera" },
              { id: "equipos", label: "Equipos" },
              { id: "independientes", label: "Independientes" },
            ]}
            active={vista}
            onChange={(v) => {
              setVista(v);
              setEquipoAbiertoId(null);
            }}
          />
        </div>

        {codigoEntrenadorAbierto && <PanelCodigoEntrenadorReal onCerrar={() => setCodigoEntrenadorAbierto(false)} />}

        {errorAccion && (
          <div style={{ color: ds.danger, fontSize: 12.5, background: `${ds.danger}18`, border: `1px solid ${ds.dangerBorderSubtle}`, borderRadius: dsR.md, padding: "8px 10px", marginBottom: 14 }}>
            {errorAccion}
          </div>
        )}

        {vista === "equipos" && !grupoAbierto && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>EQUIPOS</div>
                <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Equipos</h1>
                <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>
                  {grupos.length} {grupos.length === 1 ? "equipo" : "equipos"} · {jugadoresEnEquipo} jugadores en equipo · {independientes} independientes
                </div>
              </div>
              <button
                onClick={() => setPanelGrupoAbierto(true)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1.5px dashed ${ds.accentBorderSubtle}`, background: "transparent", color: ds.accent, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + Nuevo equipo
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
              {grupos.map((g) => (
                <TarjetaEquipoReal key={g.id} grupo={g} stats={statsGrupo(g.id)} onAbrir={() => setEquipoAbiertoId(g.id)} />
              ))}
              <TarjetaIndependientesReal count={independientes} onAbrir={() => setVista("independientes")} />
              {grupos.length === 0 && (
                <div style={{ gridColumn: "1 / -1", color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                  Todavía no has creado ningún equipo — usa "+ Nuevo equipo" para empezar.
                </div>
              )}
            </div>
          </div>
        )}

        {vista === "equipos" && grupoAbierto && (
          <DetalleEquipoReal
            grupo={grupoAbierto}
            stats={statsGrupo(grupoAbierto.id)}
            categorias={categorias}
            grupos={grupos}
            adherenciaPorJugador={adherenciaPorJugador}
            onAccion={manejarAccion}
            onCambiarCategorias={cambiarCategorias}
            onCambiarGrupos={cambiarGrupos}
            onBack={() => setEquipoAbiertoId(null)}
            onAddPlayer={() => {
              setGrupoAltaPreset(grupoAbierto.id);
              setPanelAltaAbierto(true);
            }}
            onEditGroup={() => setPanelGrupoAbierto(true)}
          />
        )}

        {vista === "independientes" && (
          <VistaIndependientesReal
            stats={statsGrupo(null)}
            categorias={categorias}
            grupos={grupos}
            adherenciaPorJugador={adherenciaPorJugador}
            onAccion={manejarAccion}
            onCambiarCategorias={cambiarCategorias}
            onCambiarGrupos={cambiarGrupos}
            onAddIndependiente={() => {
              setGrupoAltaPreset(null);
              setPanelAltaAbierto(true);
            }}
          />
        )}

        {vista === "cartera" && (
          <CarteraUsuariosReal
            players={players}
            grupos={grupos}
            cartera={cartera}
            onAbrir={(p) => onOpenHistory?.(p)}
            onAccion={manejarAccion}
            onAlta={() => {
              setGrupoAltaPreset(null);
              setPanelAltaAbierto(true);
            }}
            onGrupo={() => setPanelGrupoAbierto(true)}
          />
        )}
      </div>
      {panelAltaAbierto && (
        <PanelAltaReal
          pinsExistentes={pinsOcupados()}
          onGuardar={agregarJugador}
          onCerrar={() => {
            setPanelAltaAbierto(false);
            setGrupoAltaPreset(null);
          }}
        />
      )}
      {panelGrupoAbierto && (
        <PanelGestionGruposReal grupos={grupos} onCrear={crearGrupo} onEliminar={eliminarGrupo} onCerrar={() => setPanelGrupoAbierto(false)} />
      )}
    </PantallaEntrenadorAncha>
  );
}

// inicialesNombre y colorAvatarJugador ahora en src/core/components.jsx —
// importadas arriba (usadas por Roster y por la Ficha de jugador).

// Tarjeta de un equipo (grupo real) en la vista Equipos — nombre, avatar-
// stack de sus jugadores y las 3 stats agregadas (jugadores / adherencia
// media / activos hoy), calculadas en GestionRosterReal.statsGrupo.
function TarjetaEquipoReal({ grupo, stats, onAbrir }) {
  const visibles = stats.jugadores.slice(0, 3);
  const resto = stats.total - visibles.length;
  return (
    <button
      onClick={onAbrir}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: `linear-gradient(180deg, ${ds.surfaceRaised} 0%, ${ds.surface} 100%)`,
        border: `1px solid ${ds.borderSoft}`,
        borderRadius: dsR.xl,
        padding: "15px 16px",
        boxShadow: dsSh.elevation1,
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", margin: 0, color: ds.ink }}>{grupo.nombre}</h3>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 2 }}>{stats.total} {stats.total === 1 ? "jugador" : "jugadores"}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: dsR.md, background: ds.accentSubtle, color: ds.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IconoModulo tipo="personas" />
        </div>
      </div>
      {stats.total > 0 && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {visibles.map((p, i) => (
            <div
              key={p.id}
              title={p.name}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: AVATAR_STACK_COLORES[i % AVATAR_STACK_COLORES.length],
                color: "#fff",
                font: `600 9px ${dsF.sans}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${ds.surface}`,
                marginLeft: i === 0 ? 0 : -7,
                flexShrink: 0,
              }}
            >
              {inicialesNombre(p.name)}
            </div>
          ))}
          {resto > 0 && (
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: ds.border, color: ds.inkSecondary, font: `600 8.5px ${dsF.mono}`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ds.surface}`, marginLeft: -7, flexShrink: 0 }}>
              +{resto}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.total}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Jugadores</div>
        </div>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.adherenciaMedia != null ? `${stats.adherenciaMedia}%` : "—"}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Adherencia</div>
        </div>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{stats.activosHoy}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Hoy activos</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: ds.accent }}>Ver equipo →</div>
    </button>
  );
}

// Tarjeta especial "Independientes" de la vista Equipos — estilo punteado,
// lleva a su propia página (VistaIndependientesReal).
function TarjetaIndependientesReal({ count, onAbrir }) {
  return (
    <button
      onClick={onAbrir}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: "transparent",
        border: `1px dashed ${ds.border}`,
        borderRadius: dsR.xl,
        padding: "15px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", margin: 0, color: ds.ink }}>Independientes</h3>
          <div style={{ fontSize: 10.5, color: ds.inkMuted, marginTop: 2 }}>Sin equipo asignado</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: dsR.md, background: ds.border, color: ds.inkSecondary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={16} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 10 }}>
        <div>
          <div style={{ fontFamily: dsF.display, fontSize: 15, fontWeight: 800, color: ds.ink }}>{count}</div>
          <div style={{ font: `600 8.5px ${dsF.mono}`, color: ds.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>Jugadores</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: ds.accent }}>Ver independientes →</div>
    </button>
  );
}

// Fila de las 3 stats agregadas (Jugadores / Adherencia media / Activos
// hoy) — misma pieza en el detalle de un equipo y en Independientes.
function TeamStatsRowReal({ stats }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
      <MiniStat icon={<User size={12} />} label="Jugadores" value={stats.total} />
      <MiniStat icon={<TrendingUp size={12} />} label="Adherencia media" value={stats.adherenciaMedia != null ? `${stats.adherenciaMedia}%` : "—"} accent />
      <MiniStat icon={<Zap size={12} />} label="Activos hoy" value={`${stats.activosHoy} / ${stats.total}`} />
    </div>
  );
}

// Detalle de un equipo: roster filtrado a ese grupo + sus 3 stats
// agregadas. Reutiliza FilaJugadorReal tal cual (misma edición de
// categorías/grupos/PIN/menú de acciones que en Usuarios), no una fila
// nueva — así asignar/quitar del grupo desde aquí sigue funcionando igual.
function DetalleEquipoReal({ grupo, stats, categorias, grupos, adherenciaPorJugador, onAccion, onCambiarCategorias, onCambiarGrupos, onBack, onAddPlayer, onEditGroup }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: ds.inkSecondary, fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        ← Volver a Equipos
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>EQUIPO</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{grupo.nombre}</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{stats.total} {stats.total === 1 ? "jugador" : "jugadores"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onEditGroup}
            title="Gestionar equipos"
            style={{ width: 34, height: 34, borderRadius: dsR.md, border: `1px solid ${ds.border}`, background: ds.canvas, color: ds.inkSecondary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Pencil size={14} />
          </button>
          <DsButton variant="secondary" onClick={onAddPlayer}>+ Añadir jugador</DsButton>
        </div>
      </div>
      <TeamStatsRowReal stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.jugadores.map((j) => (
          <FilaJugadorReal
            key={j.id}
            jugador={j}
            categorias={categorias}
            grupos={grupos}
            adherencia={adherenciaPorJugador.has(j.id) ? adherenciaPorJugador.get(j.id) : null}
            onAccion={onAccion}
            onCambiarCategorias={onCambiarCategorias}
            onCambiarGrupos={onCambiarGrupos}
          />
        ))}
        {stats.jugadores.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Todavía no hay jugadores en este equipo.</div>}
      </div>
    </div>
  );
}

// Página propia de Independientes (no solo un chip de filtro): mismas 3
// stats agregadas + roster, reutilizando FilaJugadorReal — su "+" junto a
// los chips de grupo ya asigna a un equipo (equivalente al botón "Asignar a
// equipo" del mockup), sin duplicar esa lógica en una fila nueva.
function VistaIndependientesReal({ stats, categorias, grupos, adherenciaPorJugador, onAccion, onCambiarCategorias, onCambiarGrupos, onAddIndependiente }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: dsF.mono, fontSize: 11, letterSpacing: "0.08em", color: ds.inkSecondary, marginBottom: 4 }}>INDEPENDIENTES</div>
          <h1 style={{ fontFamily: dsF.display, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Independientes</h1>
          <div style={{ fontSize: 12.5, color: ds.inkSecondary }}>{stats.total} {stats.total === 1 ? "jugador sin equipo asignado" : "jugadores sin equipo asignado"}</div>
        </div>
        <button
          onClick={onAddIndependiente}
          style={{ fontSize: 12.5, fontWeight: 700, padding: "9px 14px", borderRadius: dsR.md, border: `1.5px dashed ${ds.accentBorderSubtle}`, background: "transparent", color: ds.accent, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + Añadir independiente
        </button>
      </div>
      <TeamStatsRowReal stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.jugadores.map((j) => (
          <FilaJugadorReal
            key={j.id}
            jugador={j}
            categorias={categorias}
            grupos={grupos}
            adherencia={adherenciaPorJugador.has(j.id) ? adherenciaPorJugador.get(j.id) : null}
            onAccion={onAccion}
            onCambiarCategorias={onCambiarCategorias}
            onCambiarGrupos={onCambiarGrupos}
          />
        ))}
        {stats.jugadores.length === 0 && <div style={{ color: ds.inkMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>No hay jugadores independientes — todos están asignados a un equipo.</div>}
      </div>
    </div>
  );
}
