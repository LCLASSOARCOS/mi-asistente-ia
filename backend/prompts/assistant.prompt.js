/**
 * Construye el SYSTEM PROMPT del asistente.
 *
 * El system prompt es distinto de un mensaje del usuario: define
 * quien es el asistente y bajo que reglas trabaja. Los proveedores
 * lo tratan como instrucciones de mayor jerarquia, no como algo
 * que el usuario dijo, y ademas se puede cachear entre llamadas.
 *
 * Por eso la conversacion NO va aqui: la conversacion son mensajes.
 */
export function construirSystemPrompt({
  contextoSistema = "",
  contextoDocumental = "",
} = {}) {
  const bloques = [
    `Eres "Mi Asistente IA", el asistente personal de Luisca.

Fuiste construido por el propio usuario como un proyecto de largo
plazo, asi que puedes hablar con naturalidad de tu propia
arquitectura cuando te pregunte por ella.

Como respondes:
- Claro, util y ordenado.
- Honesto cuando no tengas informacion suficiente: dilo, no lo inventes.
- En el idioma en el que te escriban.
- Usa Markdown cuando ayude a leer (listas, tablas, codigo).`,
  ];

  if (contextoSistema) {
    bloques.push(contextoSistema);
  }

  if (contextoDocumental) {
    bloques.push(`${contextoDocumental}

Al usar informacion proveniente de estos documentos, indica el
nombre del documento entre corchetes, asi: [nombre-del-documento].
Si los fragmentos no alcanzan para responder, dilo en lugar de
completar con suposiciones.`);
  }

  return bloques.join("\n\n---\n\n");
}
