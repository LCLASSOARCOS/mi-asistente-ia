import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconoCheck, IconoCopiar } from "./Iconos.jsx";
import estilos from "./Markdown.module.css";

function textoDe(nodo) {
  if (nodo == null || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join("");
  return textoDe(nodo.props?.children);
}

function BloqueCodigo({ children }) {
  const [copiado, setCopiado] = useState(false);

  const codigo = textoDe(children);
  const clase = children?.props?.className || "";
  const lenguaje = clase.replace("language-", "") || "código";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // El portapapeles necesita contexto seguro; si falla, no pasa nada.
    }
  };

  return (
    <div className={estilos.bloqueCodigo}>
      <div className={estilos.barraCodigo}>
        <span>{lenguaje}</span>

        <button type="button" onClick={copiar} aria-label="Copiar código">
          {copiado ? <IconoCheck tamano={13} /> : <IconoCopiar tamano={13} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      <pre>{children}</pre>
    </div>
  );
}

/**
 * Render de Markdown con los detalles que importan:
 * las tablas anchas hacen scroll en su propia caja en vez de
 * romper el layout, los enlaces se abren fuera, y los bloques de
 * codigo traen boton de copiar.
 */
export function Markdown({ children }) {
  return (
    <div className={estilos.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: BloqueCodigo,
          table: ({ children: hijos }) => (
            <div className={estilos.tablaScroll}>
              <table>{hijos}</table>
            </div>
          ),
          a: ({ children: hijos, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {hijos}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
