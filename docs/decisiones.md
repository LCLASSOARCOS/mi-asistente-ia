# Registro de decisiones

Por qué el proyecto está construido así. Cada entrada guarda el problema, la
decisión, **lo que se descartó** y lo que costó.

Este archivo existe porque dentro de unos meses vas a recordar *qué* hace el
código pero no *por qué*, y ese "por qué" es lo que evita deshacer una buena
decisión por accidente.

---

## D1 · El núcleo habla con mensajes, no con un string

**Problema.** Se construía un único texto gigante con la conversación dentro y se
mandaba a Claude como un solo mensaje de usuario.

**Decisión.** El contrato es `{ system, messages }`. Cada proveedor traduce a su
formato.

**Se descartó** seguir con el string y añadir la fecha dentro de él. Habría
funcionado ese día y habría obligado a reescribir los tres proveedores dos fases
después.

**Consecuencias.** Se usa el `system` nativo (mayor jerarquía y cacheable), los
turnos se distinguen de verdad, y `tools` cabe en el mismo objeto sin tocar el
núcleo. Es el cambio que desbloqueó las Fases 6 y 8.

---

## D2 · La fecha la pone el backend, no el modelo

**Problema.** Gemini contestaba la fecha porque busca en Google; Claude decía que
no tenía acceso a la hora. La misma pregunta, dos comportamientos.

**Decisión.** `contexto-sistema.service.js` calcula fecha, hora y zona horaria y
los inyecta en el `system` de **todos** los proveedores, marcados como
autoritativos frente al conocimiento del modelo.

**Se descartó** dejar que cada modelo se las arreglara.

**Consecuencias.** Saber qué día es dejó de ser una capacidad del proveedor y
pasó a ser un dato del sistema. Efecto lateral: mejoró también el razonamiento de
Gemini sobre qué es "reciente".

---

## D3 · Registro de proveedores en vez de `switch`

**Decisión.** Cada proveedor es un objeto con `id`, `disponible()`,
`capacidades` y `generar()`. `listarProveedores()` los publica en `/api/estado`.

**Consecuencias.** Añadir OpenAI es una línea. La interfaz no tiene la lista
escrita a mano: descubre los modelos y si tienen API key configurada. El modo
AUTO y la cadena de respaldo se apoyan en `disponible()`.

---

## D4 · El índice documental es persistente

**Problema.** Cada pregunta con documentos reabría **todos** los PDF, extraía su
texto y lo re-fragmentaba. Trabajo pesado repetido en cada consulta.

**Decisión.** Se extrae y fragmenta una vez, al subir, en `data/indice/<id>.json`.
Buscar es leer JSON. Si falta el índice o cambia la versión, se reconstruye solo.

**Consecuencias.** De segundos a milisegundos. Y es el sitio donde vivirán los
embeddings cuando hagan falta: cambiará la búsqueda, no la estructura.

---

## D5 · El índice guarda el texto completo (versión 2)

Los fragmentos se solapan 150 caracteres: concatenarlos **no** reconstruye el
original, duplicaría cada costura. Como se necesita el texto íntegro para el modo
`completo`, el índice lo guarda aparte. Cuesta el doble de disco y evita una
clase entera de errores sutiles.

---

## D6 · Ranking con IDF

El puntaje era "cuántos términos de la pregunta aparecen", así que una palabra
común pesaba igual que un término raro. Ahora cada término pesa
`log(1 + N/(1+df))`. Sin dependencias nuevas.

**Pendiente:** no hay lista de palabras vacías; algunas palabras muy comunes
todavía puntúan.

---

## D7 · RAG solo cuando el documento no cabe

**Problema.** Preguntas globales ("¿cuántas partes tiene el plan?") fallaban. Se
mandaban 6 fragmentos de 30: el 24% del documento.

**Medición.** El plan real pesa 22.816 caracteres, unos 6.500 tokens. Cabe entero
en el contexto de cualquiera de los dos modelos. Se estaba troceando algo que
cabía.

**Decisión.** `recuperarContexto()` mira el tamaño primero: si la biblioteca cabe
en el presupuesto, van los documentos **enteros**; si no, se ranquean documentos
y se combinan enteros y fragmentos.

**Se descartó** ir directo a embeddings. Los embeddings mejoran *encontrar el
pasaje adecuado*, no *ver el documento completo*: son un problema de similitud y
este era de cobertura. Habrían dado 6 fragmentos mejor elegidos y la misma
incapacidad de contar.

**Principio.** RAG no es una mejora: es un mal necesario cuando el documento no
cabe. La pregunta correcta no es "¿cómo hago mejor RAG?" sino "¿cuánto cabe y qué
es lo mínimo que debo descartar?".

**Consecuencias.** La pregunta que fallaba ahora se responde: el modelo enumera
las 13 propuestas en orden, algo imposible con fragmentos sueltos. Los embeddings
vuelven a la mesa cuando el modo `fragmentos` sea el habitual.

---

## D8 · Decirle al modelo cuánto documento tiene

El `system` cambia según el modo: con documentos completos se le autoriza a
contar, resumir y comparar; con fragmentos se le prohíbe afirmar totales o
ausencias ("el documento no menciona X"). Los documentos que no cupieron se
listan explícitamente.

**Por qué.** Un modelo no sabe lo que **no** le mandaste. Antes recibía el 24% del
documento y hablaba como si tuviera el 100%.

---

## D9 · Los errores se clasifican antes de reintentar

**Problema.** Gemini devuelve 503 por sobrecarga y la petición se perdía.

**Decisión.** `ai/errores.js` clasifica el fallo y de ahí sale la política:

- `peticion` (400) → **abortar**. Es un bug nuestro; los tres proveedores darían
  el mismo error, tres facturas y un mensaje final que oculta la causa.
- `credenciales` / `cuota` → siguiente proveedor, sin insistir.
- `proveedor` (5xx) / `red` → un reintento y luego cambiar.
- `tiempo` (504) → cambiar ya. Reintentar duplicaría la espera; con el límite
  real serían 120 segundos antes del respaldo.

**Se descartó** el "si falla, prueba con otro" indiscriminado.

**Consecuencias.** Toda respuesta y todo error llevan `intentos`. Cuando una
tarea programada falle de madrugada, habrá bitácora en vez de un log vacío.

---

## D10 · El modo AUTO es deliberadamente tonto

Unas expresiones regulares sobre la pregunta: si huele a tiempo real va al
proveedor con búsqueda web; si hay documentos activos va al que **no** busca en
la web, para que no se vaya a buscar por su cuenta ni mezcle fuentes sin avisar.

No pretende ser inteligencia. Existe para que haya un punto de decisión visible
que el orquestador (Fase 6) ocupará y sustituirá.

---

## D11 · Frontend con tokens CSS, no Tailwind

`index.css` y `App.css` se contradecían: dos sistemas de estilos peleando, con
restos de la plantilla de Vite (`#root { width: 1126px; text-align: center }`) y
un tema oscuro declarado que nadie usaba.

**Decisión.** Variables CSS para color, espacio, radios y tipografía, más CSS
Modules por componente. Cero dependencias nuevas.

**Se descartó** Tailwind: añade dependencia y configuración de build, ensucia el
JSX y es un lenguaje más que aprender mientras se aprende React.

**Consecuencias.** Cambiar el acento en toda la aplicación es una línea. El tema
claro, si algún día se quiere, son valores alternativos en `:root` sin tocar
ningún componente.

---

## D12 · Los mensajes de la IA no van en burbuja

Solo los del usuario. Una tabla de tres columnas dentro de una burbuja al 75% es
ilegible; a ancho completo se lee. Las tablas anchas hacen scroll en su propia
caja, no rompen la página.

---

## D13 · Decisiones pequeñas que evitan problemas grandes

- **Rutas ancladas con `import.meta.url`.** `path.resolve("data")` dependía del
  directorio desde el que se arrancaba node.
- **`pdf-parse` se importa dinámicamente.** Arrastra binarios nativos pesados;
  solo se carga si hay un PDF que leer.
- **Los updaters de React son puros.** Leer estado desde dentro de un updater
  falla de forma intermitente: no se ejecutan de forma síncrona y en StrictMode
  se llaman dos veces.
- **`grid-template-rows: minmax(0, 1fr)`.** Un grid con altura fija no limita sus
  filas si no se lo dices: el compositor quedaba fuera de la pantalla.

---

## D14 · Las herramientas son contratos, no código pegado a un modelo

**Decisión.** Una herramienta declara `nombre`, `descripcion`, `parametros`
(JSON Schema) y `ejecutar()`. Cada proveedor traduce ese contrato a su formato:
Anthropic usa `tools` con bloques `tool_use`/`tool_result`; Gemini usa
`functionDeclarations` con `functionCall`/`functionResponse`.

**Consecuencias.** La herramienta no sabe qué modelo la llamó, y añadir un
proveedor no obliga a reescribir ninguna herramienta. Es el principio
"modelo ≠ herramienta" hecho código.

---

## D15 · La búsqueda web salió del proveedor y subió a herramienta

**Problema.** `googleSearch` vivía dentro del provider de Gemini. La web era una
capacidad **suya**; Claude simplemente no tenía internet.

**Decisión.** `buscar_en_web` es una herramienta del sistema, disponible para
todos los modelos. Por debajo la implementa `buscarConGemini()`.

**Motivo técnico añadido.** La API de Gemini no permite mezclar `googleSearch`
con `functionDeclarations` en la misma petición. O renunciábamos a la web con
Gemini, o la subíamos a herramienta. La segunda es la correcta por diseño *y* la
única que funciona.

**Consecuencias.** Claude ganó búsqueda web sin tocar su provider. Cuando
conectemos un buscador propio (Fase 7) cambiará una función y nada más: el
contrato ya no se mueve. Coste: una llamada extra a Gemini por búsqueda.

---

## D16 · Los interruptores son permisos, no órdenes

**Antes.** "Usar documentos en las respuestas" era una orden: encendido =
siempre se mandaban fragmentos.

**Ahora.** "Consultar mis documentos" y "Buscar en internet" son permisos. El
usuario autoriza; el orquestador decide si hacen falta.

**Detalle importante.** Un permiso apagado no se filtra *después*: la herramienta
**no se le ofrece** al modelo, así que no puede pedirla. Es la diferencia entre
pedir perdón y pedir permiso.

---

## D17 · El bucle tiene tope de vueltas

Cuatro. En la última se le retiran las herramientas, así que no le queda más
remedio que responder con lo que tenga.

**Por qué.** Un modelo confundido puede pedir la misma herramienta
indefinidamente, y cada vuelta es una llamada de pago que arrastra la
conversación entera. Probado: un modelo en bucle se corta en la vuelta 4 y
responde igualmente.

Los fallos de herramienta no tumban la respuesta: se le devuelve el error al
modelo como resultado y sigue. Una fuente caída degrada la respuesta; no la
cancela.

---

## D18 · Se borró la heurística del modo AUTO

AUTO enrutaba por capacidades: si la pregunta olía a tiempo real, iba al
proveedor que sabía buscar en la web. **Ese trabajo desapareció** cuando la
búsqueda pasó a ser herramienta: ahora todos los modelos pueden buscar.

Se borró la heurística en vez de inventarle una tarea nueva. AUTO significa hoy
"elige tú y aguanta si alguno se cae". Cuando los proveedores vuelvan a
diferenciarse en algo medible (coste, ventana de contexto, calidad), ahí es donde
irá la lógica.

**Lección.** Una buena refactorización a veces **borra** código en otro sitio. Si
un cambio solo añade, conviene sospechar.
