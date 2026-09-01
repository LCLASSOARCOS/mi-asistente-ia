/**
 * CLIENTE DE API
 *
 * Toda la comunicacion con el backend pasa por aqui. Ningun
 * componente hace fetch por su cuenta: si manana cambia la URL,
 * se anaden cabeceras de autenticacion (Fase 15) o hay que
 * reintentar, se toca un solo archivo.
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function pedir(ruta, opciones) {
  let respuesta;

  try {
    respuesta = await fetch(`${API}${ruta}`, opciones);
  } catch {
    throw new Error(
      "No pude comunicarme con el servidor. ¿Está corriendo el backend?"
    );
  }

  let datos = null;

  try {
    datos = await respuesta.json();
  } catch {
    // Algunas respuestas de error no traen JSON.
  }

  if (!respuesta.ok) {
    const fallo = new Error(
      datos?.error || `El servidor respondió con un error ${respuesta.status}.`
    );

    // El cuerpo del error trae la bitacora de proveedores probados.
    fallo.datos = datos;
    throw fallo;
  }

  return datos;
}

export function obtenerEstado() {
  return pedir("/api/estado");
}

export function listarDocumentos() {
  return pedir("/api/documentos");
}

export function subirDocumento(archivo) {
  const formulario = new FormData();
  formulario.append("archivo", archivo);

  return pedir("/api/documentos", { method: "POST", body: formulario });
}

export function preguntar({ pregunta, historial, permisos, modelo }) {
  return pedir("/api/preguntar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta, historial, permisos, modelo }),
  });
}
