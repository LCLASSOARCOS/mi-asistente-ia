import { useEffect, useRef } from "react";
import { Mensaje, MensajePensando } from "./Mensaje.jsx";
import { IconoAviso, IconoLogo } from "./Iconos.jsx";
import estilos from "./Chat.module.css";

const SUGERENCIAS = [
  "¿Qué día y qué hora es ahora mismo?",
  "Resume los documentos que tengo cargados.",
  "Busca noticias recientes sobre contratación pública en Colombia.",
  "Explícame cómo está construido tú mismo, por dentro.",
];

function Bienvenida({ onSugerencia }) {
  return (
    <div className={estilos.bienvenida}>
      <span className={estilos.marca}>
        <IconoLogo tamano={26} />
      </span>

      <h2>¿En qué trabajamos hoy?</h2>

      <p>
        Pregúntame sobre gestión pública, programación, tus documentos o
        cualquier otro tema.
      </p>

      <div className={estilos.sugerencias}>
        {SUGERENCIAS.map((sugerencia) => (
          <button
            key={sugerencia}
            type="button"
            className={estilos.sugerencia}
            onClick={() => onSugerencia(sugerencia)}
          >
            {sugerencia}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chat({ mensajes, cargando, error, modelo, onSugerencia }) {
  const final = useRef(null);

  useEffect(() => {
    final.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, cargando, error]);

  return (
    <div className={estilos.scroll}>
      <div className={estilos.columna}>
        {mensajes.length === 0 && !cargando && (
          <Bienvenida onSugerencia={onSugerencia} />
        )}

        {mensajes.map((mensaje) => (
          <Mensaje key={mensaje.id} mensaje={mensaje} />
        ))}

        {cargando && <MensajePensando modelo={modelo} />}

        {error && (
          <div className={estilos.error} role="alert">
            <IconoAviso tamano={16} />
            <span>{error}</span>
          </div>
        )}

        <div ref={final} />
      </div>
    </div>
  );
}
