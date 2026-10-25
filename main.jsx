import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Red de seguridad: si una pantalla falla al dibujarse, en vez de dejar la página en
// blanco se muestra el error (y un botón para volver a intentarlo). Así se puede
// copiar el mensaje exacto y arreglarlo rápido.
class ErrorPantalla extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Error de pantalla:", error, info && info.componentStack);
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#0A1220", color: "#F3F6FA", fontFamily: "Inter, sans-serif", padding: 24, boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Algo ha fallado al mostrar esta pantalla</h1>
        <p style={{ color: "#8CA0BC", fontSize: 14, margin: "0 0 14px" }}>Haz una captura de este mensaje y envíala para poder arreglarlo.</p>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#111F35", border: "1px solid #1E3355", borderRadius: 10, padding: 14, fontSize: 12.5, color: "#F0605C" }}>{String((error && (error.stack || error.message)) || error).slice(0, 1500)}</pre>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 14, minHeight: 44, padding: "0 16px", borderRadius: 10, border: "1px solid #F0B429", background: "#F0B429", color: "#16130A", fontWeight: 700, cursor: "pointer" }}>
          Recargar
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorPantalla>
      <App />
    </ErrorPantalla>
  </React.StrictMode>
);
