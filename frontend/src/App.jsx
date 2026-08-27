import { useState } from "react";
import "./App.css";

function App() {
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const preguntarIA = async () => {
    if (!pregunta.trim() || cargando) return;

    const preguntaActual = pregunta;

    const historialActual = [...mensajes];

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
      const response = await fetch("http://localhost:3000/api/preguntar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pregunta: preguntaActual,
          historial: historialActual,
        }),
      });

      if (!response.ok) {
        throw new Error("El servidor respondió con un error.");
      }

      const data = await response.json();

      setMensajes((mensajesAnteriores) => [
        ...mensajesAnteriores,
        {
          tipo: "ia",
          texto: data.respuesta,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMensajes((mensajesAnteriores) => [
        ...mensajesAnteriores,
        {
          tipo: "ia",
          texto: "No pude comunicarme con el servidor.",
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const manejarTecla = (e) => {
    if (e.key === "Enter") {
      preguntarIA();
    }
  };

  const limpiarChat = () => {
    setMensajes([]);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🤖 Mi Asistente IA</h1>
          <p>Asistente personal</p>
        </div>

        <button className="boton-limpiar" onClick={limpiarChat}>
          Limpiar
        </button>
      </header>

      <main className="chat">
        {mensajes.length === 0 && (
          <div className="bienvenida">
            <h2>¿En qué puedo ayudarte?</h2>
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

            <div className="texto">{mensaje.texto}</div>
          </div>
        ))}

        {cargando && (
          <div className="mensaje mensaje-ia">
            <div className="nombre">🤖 Asistente</div>
            <div className="texto">Pensando...</div>
          </div>
        )}
      </main>

      <footer className="entrada">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={manejarTecla}
          placeholder="Escribe tu pregunta..."
          disabled={cargando}
        />

        <button onClick={preguntarIA} disabled={cargando}>
          {cargando ? "..." : "Enviar"}
        </button>
      </footer>
    </div>
  );
}

export default App;