# Arquitectura

## Recorrido de una pregunta

    Navegador
      └─ POST /api/preguntar { pregunta, historial, usarDocumentos, modelo }
           │
      routes/chat-routes.js          ← única capa que sabe de HTTP
           │
      services/ai-chat.service.js    ← prepara el contexto de la petición
           ├── contexto-sistema.service.js   fecha, hora, zona horaria
           ├── tools/registro.js             herramientas según permisos
           ├── prompts/assistant.prompt.js   arma el system prompt
           └── ai/mensajes.js                normaliza el historial
           │
      services/orquestador.service.js  ← el bucle de herramientas
           ├── tools/documentos.tool.js      consultar_documentos
           └── tools/web.tool.js             buscar_en_web
           │
      services/ai/ai.service.js      ← registro de proveedores + respaldo
           ├── ai/gemini.provider.js
           ├── ai/claude.provider.js
           └── ai/errores.js                 clasifica el fallo
           │
      { respuesta, modelo, modeloSolicitado, intentos, usoHerramientas,
        fuentes, fuentesWeb, contexto, recuperacion }

## El contrato con los proveedores

El núcleo **nunca** manda un string suelto. Manda:

```js
generarRespuesta({ modelo, system, messages, usarDocumentos })
```

- `system` — identidad, contexto temporal y contexto documental.
- `messages` — turnos reales `[{ rol: "usuario" | "asistente", texto }]`.

Cada proveedor traduce eso a su formato: Claude usa el parámetro nativo `system`
y roles `user`/`assistant`; Gemini usa `config.systemInstruction` y roles
`user`/`model`. Cuando llegue el *tool use*, se añadirá `tools` a ese mismo objeto
sin tocar el núcleo.

`ai/mensajes.js` normaliza antes de enviar: la conversación empieza por el
usuario, los roles se alternan y no hay mensajes vacíos. Los proveedores no
tienen que saber de esas reglas.

## Añadir un proveedor

Un proveedor es un objeto con esta forma:

```js
export const xProvider = {
  id, nombre, modelo,
  capacidades: { busquedaWeb: false },
  disponible: () => Boolean(config.xApiKey),
  motivoNoDisponible: "Falta configurar X_API_KEY en el archivo .env.",
  async generar({ system, messages }) { return { texto, fuentesWeb }; },
};
```

Se registra añadiéndolo al array de `ai.service.js` y a `ORDEN_RESPALDO`.
La interfaz lo descubre sola: la lista de modelos sale de `GET /api/estado`,
no está escrita en React.

## Cadena de respaldo

El proveedor elegido va primero; el resto, en el orden de `ORDEN_RESPALDO`,
filtrando los que no tienen API key. Qué se hace ante cada fallo:

| Tipo | Reintenta el mismo | Cambia de proveedor |
|---|---|---|
| `peticion` (400) | no | **no — aborta** |
| `credenciales` (401) | no | sí |
| `cuota` (429) | no | sí |
| `proveedor` (5xx) | sí | sí |
| `tiempo` (504) | no | sí |
| `red` | sí | sí |
| `desconocido` | no | sí |

Toda respuesta y todo error llevan `intentos`: la bitácora de qué se probó y
cómo fue. Es lo que permitirá diagnosticar una tarea que falle de madrugada.

## Herramientas

Una herramienta declara un contrato y no sabe qué modelo la llama:

```js
{
  nombre, descripcion,
  parametros,             // JSON Schema
  requierePermiso,        // "documentos" | "web" | null
  disponible(),
  async ejecutar(argumentos) { return { contenido, datos }; },
}
```

Se registra en `tools/registro.js`. `listarHerramientas(permisos)` devuelve solo
las que el usuario ha autorizado **y** que están disponibles: una herramienta sin
permiso no se le ofrece al modelo, así que no puede pedirla.

El bucle (`orquestador.service.js`): el modelo pide herramientas → se ejecutan →
se le devuelven los resultados → puede pedir más o responder. Tope de 4 vueltas;
en la última se le retiran las herramientas para forzar una respuesta. Si una
herramienta falla, el error se le devuelve como resultado y la conversación
continúa.

`buscar_en_web` es una herramienta del sistema, no una capacidad de Gemini:
cualquier modelo puede usarla, aunque por debajo la implemente `buscarConGemini()`.

## Documentos

Al subir un documento se extrae el texto **una vez** y se guarda en
`data/indice/<id>.json` con el texto limpio completo y sus fragmentos
(900 caracteres, 150 de solapamiento). Buscar es leer JSON, no reabrir PDFs.

`recuperarContexto(pregunta)` decide **cuánto** documento mandar:

| Situación | Modo |
|---|---|
| La biblioteca cabe en el presupuesto | `completo` — documentos íntegros |
| Cabe en parte | `mixto` — los más relevantes enteros, el resto en fragmentos |
| Solo caben trozos | `fragmentos` |
| No cabe nada | `insuficiente` |

Lo que queda fuera se registra en `omitidos`, se le dice al modelo y se pinta en
la interfaz. El system prompt cambia según el modo: con documentos completos el
modelo puede contar y resumir; con fragmentos se le prohíbe afirmar totales o
ausencias.

Presupuesto por defecto: 80.000 caracteres (`ASISTENTE_PRESUPUESTO_DOCUMENTAL`).

## Frontend

`App.jsx` solo compone: no hace `fetch`, no toca `localStorage`, no tiene lógica.

    src/
    ├── index.css          tokens de diseño + reset (tema oscuro)
    ├── App.jsx            composición
    ├── api/cliente.js     todas las llamadas al backend
    ├── hooks/             useChat · useDocumentos · useEstadoSistema
    └── components/        Sidebar · Chat · Mensaje · Compositor · Markdown · Iconos

Estilos con variables CSS y CSS Modules por componente. Cambiar el color de
acento o el radio de los bordes en toda la aplicación es editar una línea de
`index.css`.

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `GEMINI_API_KEY` | — | proveedor Gemini |
| `ANTHROPIC_API_KEY` | — | proveedor Claude |
| `OPENAI_API_KEY` | — | pendiente |
| `PORT` | 3000 | puerto del backend |
| `CLIENT_ORIGIN` | localhost:5173 | origen permitido por CORS |
| `ASISTENTE_ZONA_HORARIA` | America/Bogota | contexto temporal |
| `ASISTENTE_PRESUPUESTO_DOCUMENTAL` | 80000 | caracteres de documento por pregunta |
| `ASISTENTE_FALLBACK` | true | probar otro proveedor si uno falla |
| `ASISTENTE_TIEMPO_LIMITE_MS` | 60000 | espera máxima por proveedor |
| `ASISTENTE_REINTENTOS` | 1 | reintentos ante fallos transitorios |

`node --watch` **no vigila `.env`**: al cambiar una variable hay que reiniciar
el backend a mano.
