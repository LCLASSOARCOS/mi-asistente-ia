import { useState } from "react";
import { Markdown } from "./Markdown.jsx";
import { IconoCheck, IconoCopiar, IconoDocumento, IconoGlobo, IconoLogo } from "./Iconos.jsx";
import estilos from "./Mensaje.module.css";

function nombreModelo(modelo) {
  if (modelo === "claude") return "Claude";
  if (modelo === "gemini") return "Gemini";
  if (modelo === "openai") return "OpenAI";
  return modelo || "IA";
}

function Fuentes({ titulo, icono, children }) {
  return (
    <div className={estilos.fuentes}>
      <div className={estilos.fuentesTitulo}>
        {icono}
        {titulo}
      </div>

      <div className={estilos.fuentesLista}>{children}</div>
    </div>
  );
}

export function Mensaje({ mensaje }) {
  const [copiado, setCopiado] = useState(false);

  if (mensaje.tipo === "usuario") {
    return (
      <article className={estilos.filaUsuario}>
        <div className={estilos.burbujaUsuario}>{mensaje.texto}</div>
      </article>
    );
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Sin portapapeles disponible no hacemos nada.
    }
  };

  return (
    <article className={estilos.filaIa}>
      <div className={estilos.cabecera}>
        <span className={estilos.avatar}>
          <IconoLogo tamano={13} />
        </span>

        <span className={estilos.autor}>Asistente</span>
        <span className={estilos.insignia}>{nombreModelo(mensaje.modelo)}</span>

        <button
          type="button"
          className={estilos.copiar}
          onClick={copiar}
          aria-label="Copiar respuesta"
        >
          {copiado ? <IconoCheck tamano={14} /> : <IconoCopiar tamano={14} />}
        </button>
      </div>

      <div className={estilos.cuerpo}>
        <Markdown>{mensaje.texto}</Markdown>

        {mensaje.fuentes?.length > 0 && (
          <Fuentes titulo="Documentos consultados" icono={<IconoDocumento tamano={13} />}>
            {mensaje.fuentes.map((fuente) => (
              <span key={fuente} className={estilos.chip}>
                {fuente}
              </span>
            ))}
          </Fuentes>
        )}

        {mensaje.fuentesWeb?.length > 0 && (
          <Fuentes titulo="Fuentes web" icono={<IconoGlobo tamano={13} />}>
            {mensaje.fuentesWeb.map((fuente, indice) => (
              <a
                key={`${fuente.url}-${indice}`}
                className={estilos.chip}
                href={fuente.url}
                target="_blank"
                rel="noreferrer"
              >
                {fuente.titulo || fuente.url}
              </a>
            ))}
          </Fuentes>
        )}
      </div>
    </article>
  );
}

export function MensajePensando({ modelo }) {
  return (
    <article className={estilos.filaIa}>
      <div className={estilos.cabecera}>
        <span className={`${estilos.avatar} ${estilos.avatarActivo}`}>
          <IconoLogo tamano={13} />
        </span>

        <span className={estilos.autor}>Asistente</span>
        <span className={estilos.insignia}>{nombreModelo(modelo)}</span>
      </div>

      <div className={estilos.cuerpo}>
        <div className={estilos.puntos} role="status" aria-label="Pensando">
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  );
}
