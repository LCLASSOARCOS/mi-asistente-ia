import { useEffect, useRef } from "react";
import { IconoEnviar } from "./Iconos.jsx";
import estilos from "./Compositor.module.css";

const ALTURA_MAXIMA = 200;

export function Compositor({ valor, onCambiar, onEnviar, cargando, pistaModelo }) {
  const areaRef = useRef(null);

  // El textarea crece con el contenido hasta un tope y a partir de
  // ahi hace scroll. Se recalcula poniendo la altura en auto antes
  // de medir, porque scrollHeight nunca decrece por si solo.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, ALTURA_MAXIMA)}px`;
  }, [valor]);

  const manejarTecla = (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      onEnviar();
    }
  };

  const puedeEnviar = valor.trim().length > 0 && !cargando;

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.caja}>
        <textarea
          ref={areaRef}
          className={estilos.area}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          onKeyDown={manejarTecla}
          placeholder="Pregunta lo que necesites…"
          rows={1}
          aria-label="Escribe tu pregunta"
        />

        <button
          type="button"
          className={estilos.enviar}
          onClick={onEnviar}
          disabled={!puedeEnviar}
          aria-label="Enviar pregunta"
        >
          <IconoEnviar tamano={17} />
        </button>
      </div>

      <p className={estilos.pista}>
        <kbd>Enter</kbd> enviar · <kbd>Shift</kbd> + <kbd>Enter</kbd> nueva línea
        {pistaModelo && <span className={estilos.pistaModelo}>· {pistaModelo}</span>}
      </p>
    </div>
  );
}
