import { useState } from "react";
import { Chat } from "./components/Chat.jsx";
import { Compositor } from "./components/Compositor.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { IconoMenu } from "./components/Iconos.jsx";
import { useChat } from "./hooks/useChat.js";
import { useDocumentos } from "./hooks/useDocumentos.js";
import { useEstadoSistema } from "./hooks/useEstadoSistema.js";
import estilos from "./App.module.css";

const CLAVE_MODELO = "mi-asistente-ia:modelo";

/**
 * App solo COMPONE. No hace fetch, no habla con localStorage y no
 * contiene logica de negocio: eso vive en los hooks y en api/cliente.
 * Cuando lleguen las Fases 11-13 (tareas, monitores, notificaciones)
 * se anaden vistas aqui sin que este archivo crezca sin control.
 */
export default function App() {
  const [pregunta, setPregunta] = useState("");
  const [usarDocumentos, setUsarDocumentos] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [modelo, setModelo] = useState(
    () => localStorage.getItem(CLAVE_MODELO) || "gemini"
  );

  const { mensajes, cargando, error, intentosFallidos, enviar, limpiar } = useChat();
  const documentos = useDocumentos();
  const { contexto, modelos, enLinea } = useEstadoSistema();

  const cambiarModelo = (nuevo) => {
    setModelo(nuevo);
    localStorage.setItem(CLAVE_MODELO, nuevo);
  };

  const enviarPregunta = (texto = pregunta) => {
    if (!texto.trim() || cargando) return;

    setPregunta("");
    enviar(texto, { modelo, usarDocumentos });
  };

  const modeloActual = modelos.find((opcion) => opcion.id === modelo);

  return (
    <div className={estilos.app}>
      <Sidebar
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        modelo={modelo}
        onCambiarModelo={cambiarModelo}
        modelos={modelos}
        documentos={documentos.documentos}
        usarDocumentos={usarDocumentos}
        onCambiarUsarDocumentos={setUsarDocumentos}
        onSubirDocumento={documentos.subir}
        subiendoDocumento={documentos.subiendo}
        errorDocumento={documentos.error}
        contexto={contexto}
        enLinea={enLinea}
        onLimpiar={limpiar}
        puedeLimpiar={mensajes.length > 0}
      />

      {menuAbierto && (
        <button
          type="button"
          className={estilos.velo}
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        />
      )}

      <main className={estilos.principal}>
        <header className={estilos.barra}>
          <button
            type="button"
            className={estilos.menu}
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <IconoMenu tamano={18} />
          </button>

          <span className={estilos.barraTitulo}>Conversación</span>

          {usarDocumentos && documentos.documentos.length > 0 && (
            <span className={estilos.barraEtiqueta}>
              {documentos.documentos.length} documento
              {documentos.documentos.length === 1 ? "" : "s"} en contexto
            </span>
          )}
        </header>

        <Chat
          mensajes={mensajes}
          cargando={cargando}
          error={error}
          intentosFallidos={intentosFallidos}
          modelo={modelo}
          onSugerencia={enviarPregunta}
        />

        <Compositor
          valor={pregunta}
          onCambiar={setPregunta}
          onEnviar={() => enviarPregunta()}
          cargando={cargando}
          pistaModelo={modeloActual?.nombre}
        />
      </main>
    </div>
  );
}
