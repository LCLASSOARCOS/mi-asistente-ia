import { generarRespuesta } from "./ai/ai.service.js";

/**
 * ORQUESTADOR
 *
 * El bucle que convierte al modelo en algo que ACTUA en vez de solo
 * responder:
 *
 *   modelo → "necesito consultar_documentos('las 13 propuestas')"
 *          → ejecutamos y le devolvemos el resultado
 *   modelo → "ahora buscar_en_web('reforma tributaria 2026')"
 *          → ejecutamos y le devolvemos el resultado
 *   modelo → respuesta final
 *
 * El tope de vueltas no es paranoia: un modelo confundido puede
 * pedir la misma herramienta indefinidamente, y cada vuelta es una
 * llamada de pago con la conversacion entera dentro. En la ultima
 * vuelta le retiramos las herramientas, asi que no le queda mas
 * remedio que responder con lo que tenga.
 */
const MAX_VUELTAS = 4;

export async function orquestar({
  modelo,
  system,
  messages,
  herramientas = [],
  maxVueltas = MAX_VUELTAS,
}) {
  const conversacion = [...messages];
  const usoHerramientas = [];
  const fuentes = new Set();
  const fuentesWeb = [];
  const intentos = [];

  let recuperacion = null;

  for (let vuelta = 1; vuelta <= maxVueltas; vuelta += 1) {
    const ofrecidas = vuelta < maxVueltas ? herramientas : [];

    const respuesta = await generarRespuesta({
      modelo,
      system,
      messages: conversacion,
      herramientas: ofrecidas,
    });

    intentos.push(...respuesta.intentos);

    if (!respuesta.llamadas?.length) {
      return {
        texto: respuesta.texto,
        modelo: respuesta.modelo,
        intentos,
        usoHerramientas,
        fuentes: [...fuentes],
        fuentesWeb,
        recuperacion,
        vueltas: vuelta,
      };
    }

    conversacion.push({
      rol: "asistente",
      texto: respuesta.texto,
      llamadas: respuesta.llamadas,
    });

    const resultados = [];

    for (const llamada of respuesta.llamadas) {
      const registro = {
        nombre: llamada.nombre,
        argumentos: llamada.argumentos,
        vuelta,
      };

      const inicio = Date.now();
      const herramienta = herramientas.find((h) => h.nombre === llamada.nombre);

      if (!herramienta) {
        // El modelo se invento una herramienta o pidio una sin
        // permiso. Se lo decimos y que siga: no es motivo para
        // tumbar la respuesta entera.
        registro.ok = false;
        registro.error = "Herramienta no disponible.";

        resultados.push({
          id: llamada.id,
          nombre: llamada.nombre,
          contenido: `Error: la herramienta "${llamada.nombre}" no está disponible. Responde sin ella y avisa al usuario.`,
          error: true,
        });
      } else {
        try {
          const salida = await herramienta.ejecutar(llamada.argumentos || {});

          resultados.push({
            id: llamada.id,
            nombre: llamada.nombre,
            contenido: salida.contenido,
          });

          registro.ok = true;
          registro.caracteres = salida.contenido.length;

          for (const fuente of salida.datos?.fuentes || []) fuentes.add(fuente);
          fuentesWeb.push(...(salida.datos?.fuentesWeb || []));
          if (salida.datos?.recuperacion) recuperacion = salida.datos.recuperacion;
        } catch (error) {
          console.error(`[herramienta] ${llamada.nombre} falló:`, error.message);

          registro.ok = false;
          registro.error = error.message;

          resultados.push({
            id: llamada.id,
            nombre: llamada.nombre,
            contenido: `Error al ejecutar la herramienta: ${error.message}`,
            error: true,
          });
        }
      }

      registro.ms = Date.now() - inicio;
      usoHerramientas.push(registro);
    }

    conversacion.push({ rol: "herramienta", resultados });
  }

  throw new Error("El orquestador agotó las vueltas sin obtener una respuesta.");
}
