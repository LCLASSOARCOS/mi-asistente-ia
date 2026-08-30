import { useEffect, useState } from "react";
import { obtenerEstado } from "../api/cliente.js";

const MODELOS_DE_RESPALDO = [
  { id: "gemini", nombre: "Gemini", disponible: true },
  { id: "claude", nombre: "Claude", disponible: true },
];

/**
 * Lee /api/estado.
 *
 * La lista de modelos ya no esta escrita a mano en el frontend:
 * la publica el registro de proveedores del backend. Cuando anadas
 * OpenAI (Fase 8), aparecera aqui sin tocar una sola linea de React.
 *
 * Tambien trae el contexto temporal, que mostramos en la barra
 * lateral como prueba visible de que el sistema sabe que dia es.
 */
export function useEstadoSistema() {
  const [contexto, setContexto] = useState(null);
  const [modelos, setModelos] = useState(MODELOS_DE_RESPALDO);
  const [enLinea, setEnLinea] = useState(null);

  useEffect(() => {
    let cancelado = false;

    const consultar = async () => {
      try {
        const datos = await obtenerEstado();
        if (cancelado) return;

        setContexto(datos.contexto || null);
        if (datos.modelos?.length) setModelos(datos.modelos);
        setEnLinea(true);
      } catch {
        if (!cancelado) setEnLinea(false);
      }
    };

    consultar();

    // Refrescamos cada minuto para que la hora no quede congelada.
    const temporizador = setInterval(consultar, 60_000);

    return () => {
      cancelado = true;
      clearInterval(temporizador);
    };
  }, []);

  return { contexto, modelos, enLinea };
}
