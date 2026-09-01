# Mi Asistente IA

Asistente personal de IA propio: multimodelo, modular y con los documentos
guardados en tu equipo. Interfaz web en React, servidor Node.js.

- **Modelos:** Gemini y Claude, intercambiables, más un modo automático.
  Si uno falla, responde el otro y queda registrado por qué.
- **Documentos:** PDF, TXT y Markdown con índice local. El asistente manda el
  documento entero si cabe y fragmentos si no, y te dice cuál de las dos cosas hizo.
- **Contexto real:** sabe qué día y qué hora es, sin depender del modelo.

## Puesta en marcha

Copia la configuración y añade al menos una API key:

```bash
cp .env.example .env
```

Necesitas dos terminales en esta carpeta.

```bash
npm run dev        # backend  → http://localhost:3000
```

```bash
npm run frontend   # interfaz → http://localhost:5173
```

Para comprobar que todo está en pie sin gastar una llamada a las APIs:

```bash
curl -s http://localhost:3000/api/estado | python3 -m json.tool
```

Devuelve la fecha del sistema y qué proveedores tienen su API key configurada.

## Organización

```text
mi-asistente-ia/
├── backend/        Servidor, rutas y servicios (proveedores, documentos, contexto)
├── frontend/       Interfaz de chat
├── data/           Documentos e índice locales — no se suben a GitHub
├── docs/           Plan, arquitectura y registro de decisiones
├── .env            Claves locales — nunca se publica
└── .env.example    Configuración de referencia, sin claves
```

## Documentación

- [`docs/plan-del-proyecto.md`](docs/plan-del-proyecto.md) — visión, estado y hoja de ruta.
- [`docs/arquitectura.md`](docs/arquitectura.md) — cómo está construido y cómo añadir un proveedor.
- [`docs/decisiones.md`](docs/decisiones.md) — por qué está construido así.

## Privacidad

Las API keys viven solo en `.env`, que Git ignora, y nunca llegan al navegador.
Los documentos y su índice se quedan en `data/`, también fuera del repositorio.
Al modelo solo viaja el texto documental necesario para responder tu pregunta.
