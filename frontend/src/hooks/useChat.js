import { useCallback, useEffect, useState } from "react";
import { preguntar } from "../api/cliente.js";

const CLAVE = "mi-asistente-ia:mensajes";

function nuevoId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function recuperar() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE));
    if (!Array.isArray(guardados)) return [];

    // Los mensajes guardados antes de este cambio no tienen id.
    // Se lo damos al cargarlos para poder usarlo como key de React.
    return guardados.map((mensaje) => ({ id: nuevoId(), ...mensaje }));
  } catch {
    return [];
  }
}

/**
 * Toda la logica de la conversacion vive aqui: estado, persistencia
 * y llamada al backend. El componente que lo use solo pinta.
 */
export function useChat() {
  const [mensajes, setMensajes] = useState(recuperar);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [intentosFallidos, setIntentosFallidos] = useState([]);

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(mensajes));
  }, [mensajes]);

  const enviar = useCallback(
    async (texto, { modelo, usarDocumentos }) => {
      const pregunta = texto.trim();
      if (!pregunta) return;

      // El historial que viaja al backend es el previo a esta
      // pregunta: la pregunta va aparte, en su propio campo.
      //
      // Se captura AQUI, no dentro del updater de setMensajes:
      // React no ejecuta los updaters de forma sincrona, y en
      // StrictMode ademas los llama dos veces. Un updater debe ser
      // puro; leer estado desde dentro de uno es un error sutil
      // que solo se manifiesta a veces.
      const historial = mensajes.map(({ tipo, texto }) => ({ tipo, texto }));

      setError("");
      setIntentosFallidos([]);
      setCargando(true);

      setMensajes((anteriores) => [
        ...anteriores,
        { id: nuevoId(), tipo: "usuario", texto: pregunta },
      ]);

      try {
        const datos = await preguntar({
          pregunta,
          historial,
          usarDocumentos,
          modelo,
        });

        setMensajes((anteriores) => [
          ...anteriores,
          {
            id: nuevoId(),
            tipo: "ia",
            texto: datos.respuesta,
            fuentes: datos.fuentes || [],
            fuentesWeb: datos.fuentesWeb || [],
            recuperacion: datos.recuperacion || null,
            modelo: datos.modelo || modelo,
            modeloSolicitado: datos.modeloSolicitado || modelo,
            intentos: datos.intentos || [],
          },
        ]);
      } catch (fallo) {
        console.error(fallo);
        setError(fallo.message);
        setIntentosFallidos(fallo.datos?.intentos || []);
      } finally {
        setCargando(false);
      }
    },
    [mensajes]
  );

  const limpiar = useCallback(() => {
    setMensajes([]);
    setError("");
    setIntentosFallidos([]);
    localStorage.removeItem(CLAVE);
  }, []);

  return { mensajes, cargando, error, intentosFallidos, enviar, limpiar };
}
