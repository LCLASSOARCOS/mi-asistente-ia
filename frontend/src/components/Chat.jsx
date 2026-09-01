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

export function Chat({ mensajes, cargando, error, intentosFallidos = [], modelo, onSugerencia }) {
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

            <div>
              <span>{error}</span>

              {intentosFallidos.length > 0 && (
                <ul className={estilos.intentos}>
                  {intentosFallidos.map((intento, indice) => (
                    <li key={`${intento.modelo}-${indice}`}>
                      <strong>{intento.modelo}</strong>
                      {intento.resultado === "omitido"
                        ? ` · omitido: ${intento.motivo}`
                        : ` · ${intento.tipo}: ${intento.mensaje}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div ref={final} />
      </div>
    </div>
  );
}
