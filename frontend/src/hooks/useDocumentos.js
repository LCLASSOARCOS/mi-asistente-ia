import { useCallback, useEffect, useState } from "react";
import { listarDocumentos, subirDocumento } from "../api/cliente.js";

export function useDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    try {
      const datos = await listarDocumentos();
      setDocumentos(datos.documentos || []);
      setError("");
    } catch (fallo) {
      setError(fallo.message);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const subir = useCallback(async (archivo) => {
    if (!archivo) return;

    setError("");
    setSubiendo(true);

    try {
      const datos = await subirDocumento(archivo);
      setDocumentos((anteriores) => [datos.documento, ...anteriores]);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setSubiendo(false);
    }
  }, []);

  return { documentos, subiendo, error, subir, recargar };
}
