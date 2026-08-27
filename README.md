# Mi Asistente IA

Asistente personal con una interfaz web en React, un servidor Node.js y Gemini.

## Cómo ponerlo en marcha

Necesitas dos terminales abiertas en esta carpeta.

En la primera, ejecuta:

```bash
npm run dev
```

Esto inicia el servidor en `http://localhost:3000`.

En la segunda, ejecuta:

```bash
npm run frontend
```

Esto inicia la página web. Abre la dirección que muestre la terminal, normalmente `http://localhost:5173`.

## Organización actual

```text
mi-asistente-ia/
├── frontend/       # Página web y experiencia de chat
├── server.js       # Servidor y conexión segura con Gemini
├── .env            # Clave local (nunca se publica)
├── .env.example    # Modelo de configuración sin claves
└── docs/           # Plan y decisiones del proyecto
```

## Seguridad

La clave de Gemini va únicamente en `.env` mediante `GEMINI_API_KEY`. Git ignora ese archivo, por lo que no se sube a GitHub.
