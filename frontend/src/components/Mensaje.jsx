import { useState } from "react";
import { Markdown } from "./Markdown.jsx";
import {
  IconoCheck,
  IconoCopiar,
  IconoDocumento,
  IconoGlobo,
  IconoHerramienta,
  IconoLogo,
} from "./Iconos.jsx";
import estilos from "./Mensaje.module.css";

function nombreModelo(modelo) {
  if (modelo === "claude") return "Claude";
  if (modelo === "gemini") return "Gemini";
  if (modelo === "openai") return "OpenAI";
  return modelo || "IA";
}

const ETIQUETA_MODO = {
  completo: "documentos completos",
  mixto: "parcialmente completo",
  fragmentos: "solo fragmentos",
  insuficiente: "no cupo nada",
};

/**
 * Muestra CUANTO documento vio el modelo, no solo cual.
 *
 * "4 de 280 fragmentos" y "documento completo" son dos respuestas
 * muy distintas, y hasta ahora la interfaz las pintaba igual.
 */
function ContextoDocumental({ recuperacion }) {
  const { modo, caracteres, presupuesto, detalle = [], omitidos = [] } = recuperacion;

  return (
    <div className={estilos.fuentes}>
      <div className={estilos.fuentesTitulo}>
        <IconoDocumento tamano={13} />
        Contexto documental
        {ETIQUETA_MODO[modo] && (
          <span className={estilos.modo} data-modo={modo}>
            {ETIQUETA_MODO[modo]}
          </span>
        )}
      </div>

      <div className={estilos.fuentesLista}>
        {detalle.map((pieza) => (
          <span
            key={pieza.documentoId || pieza.nombre}
            className={`${estilos.chip} ${
              pieza.tipo === "documento" ? estilos.chipCompleto : ""
            }`}
          >
            {pieza.nombre}
            <em className={estilos.chipDato}>
              {pieza.tipo === "documento"
                ? "completo"
                : `${pieza.fragmentos} de ${pieza.deFragmentos}`}
            </em>
          </span>
        ))}

        {omitidos.map((omitido) => (
          <span key={omitido.nombre} className={`${estilos.chip} ${estilos.chipOmitido}`}>
            {omitido.nombre}
            <em className={estilos.chipDato}>no cupo</em>
          </span>
        ))}
      </div>

      {caracteres > 0 && (
        <p className={estilos.medida}>
          {caracteres.toLocaleString("es")} de {presupuesto.toLocaleString("es")}{" "}
          caracteres de presupuesto
        </p>
      )}
    </div>
  );
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

        {mensaje.modeloSolicitado &&
          mensaje.modeloSolicitado !== "auto" &&
          mensaje.modeloSolicitado !== mensaje.modelo && (
            <span
              className={estilos.respaldo}
              title={`Pediste ${nombreModelo(mensaje.modeloSolicitado)}, pero falló y respondió ${nombreModelo(mensaje.modelo)}.`}
            >
              respaldo
            </span>
          )}

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

        {mensaje.usoHerramientas?.length > 0 && (
          <Fuentes titulo="Herramientas usadas" icono={<IconoHerramienta tamano={13} />}>
            {mensaje.usoHerramientas.map((uso, indice) => (
              <span
                key={`${uso.nombre}-${indice}`}
                className={`${estilos.chip} ${uso.ok === false ? estilos.chipOmitido : ""}`}
                title={
                  uso.argumentos?.consulta
                    ? `consulta: ${uso.argumentos.consulta}`
                    : undefined
                }
              >
                {uso.nombre}
                <em className={estilos.chipDato}>
                  {uso.ok === false ? "error" : `${uso.ms} ms`}
                </em>
              </span>
            ))}
          </Fuentes>
        )}

        {mensaje.recuperacion ? (
          <ContextoDocumental recuperacion={mensaje.recuperacion} />
        ) : (
          mensaje.fuentes?.length > 0 && (
            <Fuentes titulo="Documentos consultados" icono={<IconoDocumento tamano={13} />}>
              {mensaje.fuentes.map((fuente) => (
                <span key={fuente} className={estilos.chip}>
                  {fuente}
                </span>
              ))}
            </Fuentes>
          )
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
