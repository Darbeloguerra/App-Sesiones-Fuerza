import { useState, useEffect } from "react";
import { ds, dsF, GlobalStyles } from "./designSystem.jsx";

// Paleta pensada para esto en concreto — fútbol, sub-19, sala de
// readaptación — no la plantilla "panel oscuro + un acento" por defecto:
// fondo con un pelín de calidez (no negro plano), el dorado reservado para
// lo que de verdad destaca en vez de repetido en cada etiqueta, y un verde
// con carácter propio para "hecho/positivo" en vez del verde genérico de
// cualquier interfaz.
export const TEMA = {
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
export function useAlturaVentana() {
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

export function useAnchoVentana() {
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
export function PantallaBase({ children, rol = "entrenador", maxWidth, centrarContenido = false, layoutFijo = false }) {
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
        // layoutFijo: la pantalla no hace scroll; lo hace solo una zona
        // interna (cabecera y botones quedan siempre visibles).
        overflowY: layoutFijo ? "hidden" : "auto",
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
          display: centrarContenido || layoutFijo ? "flex" : "block",
          flexDirection: "column",
          justifyContent: centrarContenido ? "center" : "flex-start",
          height: layoutFijo ? "100%" : undefined,
          padding: centrarContenido ? "24px" : layoutFijo ? "14px 16px 12px" : rol === "jugador" ? "22px 20px 40px" : "24px 16px 40px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
