# Mi Asistente IA — Plan del proyecto

> Estado a 31 de agosto de 2026. Actualiza este archivo cuando cierres una fase.

## Qué es esto

Un asistente personal de IA propio, **multimodelo y modular**. No es un chatbot:
la meta a largo plazo es un sistema que converse, recuerde, consulte documentos,
vigile fuentes, ejecute automatizaciones y avise por varios canales.

El chat web **no es el sistema**: es un cliente del sistema. Hoy es la única
puerta de entrada, pero la arquitectura debe permitir que un planificador o un
monitor entren por la misma puerta interna sin duplicar lógica.

    CANALES        Web · (futuro: push, correo, mensajería, voz)
                        │
                        ▼
    NÚCLEO         Orquestador · Herramientas · Memoria · Modelos
                        ▲
                        │
    DISPARADORES   Tú · (futuro: planificador, monitor, evento externo)

La prueba de fuego de la arquitectura, en cualquier momento del proyecto:

> **¿Puede un proceso automático llamar exactamente a lo mismo que llama el chat?**

Si la respuesta es "no, habría que duplicar la lógica", el canal se comió al núcleo.

## Estado real

| Fase | Qué es | Estado |
|---|---|---|
| 1 | Base: chat, backend, frontend, Git | ✅ |
| 2 | Biblioteca documental | ✅ |
| 3 | Multimodelo (Gemini + Claude) | ✅ |
| 4 | Contexto del sistema (fecha, hora, identidad) | ✅ |
| 5 | RAG: índice persistente, IDF, recuperación adaptativa | ✅ |
| 6 | Orquestador con herramientas | ⬜ siguiente |
| 7 | Búsqueda web propia (sin depender de Gemini) | ⬜ |
| 8 | Fallback entre proveedores y modo AUTO | ✅ |
| 9 | Memoria persistente | ⬜ |
| 10 | Catálogo de herramientas | ⬜ |
| 11 | Automatizaciones y planificador | ⬜ |
| 12 | Monitoreo de fuentes | ⬜ |
| 13 | Notificaciones y canales | ⬜ |
| 14 | Infraestructura propia (NAS / servidor) | ⬜ |
| 15 | Autenticación y seguridad | ⬜ |
| 16 | Frontend profesional | ✅ (adelantada) |

Lo que ya funciona en concreto:

- Chat con historial, Markdown, tablas, bloques de código con copiar.
- Dos proveedores intercambiables, más un modo **Automático**.
- Si un proveedor falla, responde otro y queda registrado por qué.
- Fecha y hora reales inyectadas a todos los modelos por igual.
- Biblioteca de PDF, TXT y Markdown con índice persistente.
- Recuperación adaptativa: documentos enteros si caben, fragmentos si no.
- Interfaz con barra lateral, tokens de diseño y tema oscuro.

## Lo siguiente: Fase 6, el orquestador

Hoy tú decides con un interruptor si se usan los documentos. El orquestador debe
decidirlo solo, y con él el sistema deja de ser "un chat con extras".

Requiere:

1. Definir herramientas como contratos (nombre, descripción, parámetros).
2. Traducir esos contratos a los dos formatos de *tool use* (Anthropic y Gemini).
3. Un bucle: el modelo pide una herramienta → la ejecutamos → le devolvemos el
   resultado → puede pedir otra o responder.
4. Generalizar la entrada del núcleo. La firma de hoy tiene forma de chat:

       responderPregunta(pregunta, historial, usarDocumentos, modelo)

   Un monitor no tiene "pregunta" ni "historial": tiene una instrucción guardada,
   un estado anterior y un resultado nuevo. Hará falta algo como:

       ejecutar({ instruccion, contexto, herramientas, origen })

   donde `origen` decide a dónde va la respuesta: pantalla, notificación o registro.

## Deuda conocida

- `backend/services/ai/openai.provider.js` está vacío; falta la API key.
- Los encabezados y pies de página de los PDF se cuelan en el texto extraído.
- `node --watch` no vigila `.env`: cambiar una variable exige reiniciar a mano.
- El modo AUTO es una expresión regular; lo sustituirá el orquestador.
- No hay pruebas automatizadas.
- No hay autenticación: el backend asume un único usuario en red local (Fase 15).

## Principios que no se negocian

1. Modularidad y separación de responsabilidades.
2. **Modelo ≠ herramienta.** La web, los documentos y la memoria no pertenecen a
   ningún proveedor.
3. Las API keys viven solo en el backend. Nunca al navegador, nunca a GitHub.
4. Los documentos privados y su índice no salen del equipo.
5. `services/` no sabe que existe un navegador; `routes/` es quien habla HTTP.
6. Commits pequeños y frecuentes.
7. No reconstruir lo que ya funciona.
