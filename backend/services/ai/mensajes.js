/**
 * Convierte el historial del frontend en mensajes validos.
 *
 * Los proveedores tienen reglas que hay que respetar: la
 * conversacion empieza con el usuario, los roles se alternan y no
 * se aceptan mensajes vacios. Normalizamos aqui, una sola vez,
 * para que ningun provider tenga que saber de esto.
 *
 * Es una funcion pura: misma entrada, misma salida, sin efectos.
 * Por eso se puede probar sin arrancar el servidor.
 */
export function construirMensajes(historial = [], pregunta = "") {
  const mensajes = [];

  const agregar = (rol, texto) => {
    const limpio = String(texto ?? "").trim();
    if (!limpio) return;

    const ultimo = mensajes.at(-1);

    // Sin un turno previo del usuario, un mensaje del asistente
    // no tiene a que responder: lo descartamos.
    if (!ultimo && rol === "asistente") return;

    // Dos turnos seguidos del mismo rol se funden en uno.
    if (ultimo?.rol === rol) {
      ultimo.texto += `\n\n${limpio}`;
      return;
    }

    mensajes.push({ rol, texto: limpio });
  };

  for (const mensaje of historial) {
    agregar(mensaje.tipo === "usuario" ? "usuario" : "asistente", mensaje.texto);
  }

  agregar("usuario", pregunta);

  return mensajes;
}
