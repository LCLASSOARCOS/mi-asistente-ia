import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const chatStorageKey = "mi-asistente-ia:mensajes";

function recuperarMensajes() {
  try {
    const mensajesGuardados = JSON.parse(localStorage.getItem(chatStorageKey));

    return Array.isArray(mensajesGuardados) ? mensajesGuardados : [];
  } catch {
    return [];
  }
}

function App() {
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState(recuperarMensajes);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const finalDelChat = useRef(null);

  useEffect(() => {
    localStorage.setItem(chatStorageKey, JSON.stringify(mensajes));
  }, [mensajes]);

  useEffect(() => {
    finalDelChat.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, error]);

  const preguntarIA = async () => {
    if (!pregunta.trim() || cargando) return;

    const preguntaActual = pregunta;

    const historialActual = [...mensajes];

    setError("");

    setMensajes((mensajesAnteriores) => [
      ...mensajesAnteriores,
      {
        tipo: "usuario",
        texto: preguntaActual,
      },
    ]);

    setPregunta("");
    setCargando(true);

    try {
      const response = await fetch(`${apiUrl}/api/preguntar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pregunta: preguntaActual,
          historial: historialActual,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "El servidor respondió con un error.");
      }

      setMensajes((mensajesAnteriores) => [
        ...mensajesAnteriores,
        {
          tipo: "ia",
          texto: data.respuesta,
        },
      ]);
    } catch (error) {
      console.error(error);
      setError(error.message || "No pude comunicarme con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const manejarTecla = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      preguntarIA();
    }
  };

  const limpiarChat = () => {
    setMensajes([]);
    setError("");
    localStorage.removeItem(chatStorageKey);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🤖 Mi Asistente IA</h1>
          <p>Asistente personal</p>
        </div>

        <button
          className="boton-limpiar"
          onClick={limpiarChat}
          disabled={mensajes.length === 0}
        >
          Limpiar
        </button>
      </header>

      <main className="chat">
        {mensajes.length === 0 && (
          <div className="bienvenida">
            <h2>¿En qué puedo ayudarte hoy Crack?</h2>
            <p>
              Pregúntame sobre gestión pública, programación, proyectos,
              tecnología o cualquier otro tema.
            </p>
          </div>
        )}

        {mensajes.map((mensaje, index) => (
          <div
            key={index}
            className={`mensaje ${
              mensaje.tipo === "usuario" ? "mensaje-usuario" : "mensaje-ia"
            }`}
          >
            <div className="nombre">
              {mensaje.tipo === "usuario" ? "Tú" : "🤖 Asistente"}
            </div>

            <div className="texto">
              {mensaje.tipo === "ia" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {mensaje.texto}
                </ReactMarkdown>
              ) : (
                mensaje.texto
              )}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="mensaje mensaje-ia">
            <div className="nombre">🤖 Asistente</div>
            <div className="texto">Pensando...</div>
          </div>
        )}

        {error && (
          <div className="error-chat" role="alert">
            {error}
          </div>
        )}

        <div ref={finalDelChat} />
      </main>

      <footer className="entrada">
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={manejarTecla}
          placeholder="Escribe tu pregunta..."
          disabled={cargando}
          rows="1"
          aria-label="Escribe tu pregunta"
        />

        <button onClick={preguntarIA} disabled={cargando}>
          {cargando ? "..." : "Enviar"}
        </button>
      </footer>
      <p className="ayuda-entrada">Enter para enviar · Shift + Enter para nueva línea</p>
    </div>
  );
}

export default App;
