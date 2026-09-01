import {
  IconoCerrar,
  IconoDocumento,
  IconoLogo,
  IconoMas,
  IconoPapelera,
  IconoReloj,
} from "./Iconos.jsx";
import estilos from "./Sidebar.module.css";

function tamanoLegible(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Sidebar({
  abierto,
  onCerrar,
  modelo,
  onCambiarModelo,
  modelos,
  documentos,
  permisos,
  onCambiarPermiso,
  onSubirDocumento,
  subiendoDocumento,
  errorDocumento,
  contexto,
  enLinea,
  onLimpiar,
  puedeLimpiar,
}) {
  return (
    <aside className={`${estilos.sidebar} ${abierto ? estilos.abierto : ""}`}>
      <div className={estilos.marca}>
        <span className={estilos.logo}>
          <IconoLogo tamano={17} />
        </span>

        <div className={estilos.marcaTexto}>
          <strong>Mi Asistente IA</strong>
          <small>Asistente personal</small>
        </div>

        <button
          type="button"
          className={estilos.cerrar}
          onClick={onCerrar}
          aria-label="Cerrar menú"
        >
          <IconoCerrar tamano={17} />
        </button>
      </div>

      <button
        type="button"
        className={estilos.nueva}
        onClick={onLimpiar}
        disabled={!puedeLimpiar}
      >
        <IconoPapelera tamano={15} />
        Nueva conversación
      </button>

      <div className={estilos.contenido}>
        <section className={estilos.seccion}>
          <h2 className={estilos.titulo}>Modelo</h2>

          <div className={estilos.opciones}>
            {modelos.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                className={`${estilos.opcion} ${
                  modelo === opcion.id ? estilos.opcionActiva : ""
                }`}
                onClick={() => onCambiarModelo(opcion.id)}
                disabled={opcion.disponible === false}
                title={
                  opcion.disponible === false
                    ? "Falta configurar la API key de este proveedor."
                    : opcion.modelo
                }
              >
                <span className={estilos.punto} data-activo={modelo === opcion.id} />
                <span className={estilos.opcionNombre}>{opcion.nombre}</span>

              </button>
            ))}
          </div>
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.titulo}>Permisos</h2>

          <p className={estilos.explicacion}>
            Tú autorizas; el asistente decide si le hacen falta. Lo que
            apagues aquí no se le ofrece siquiera.
          </p>

          <label className={estilos.interruptor}>
            <input
              type="checkbox"
              checked={permisos.documentos}
              onChange={(evento) =>
                onCambiarPermiso("documentos", evento.target.checked)
              }
              disabled={documentos.length === 0}
            />

            <span className={estilos.pista} aria-hidden="true">
              <span className={estilos.bola} />
            </span>

            Consultar mis documentos
          </label>

          <label className={estilos.interruptor}>
            <input
              type="checkbox"
              checked={permisos.web}
              onChange={(evento) => onCambiarPermiso("web", evento.target.checked)}
            />

            <span className={estilos.pista} aria-hidden="true">
              <span className={estilos.bola} />
            </span>

            Buscar en internet
          </label>

          {permisos.web && (
            <p className={estilos.aviso}>
              Tus preguntas pueden salir hacia un buscador externo cuando el
              asistente decida buscar.
            </p>
          )}
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.titulo}>
            Documentos
            {documentos.length > 0 && (
              <span className={estilos.contador}>{documentos.length}</span>
            )}
          </h2>

          {documentos.length === 0 ? (
            <p className={estilos.vacio}>Aún no has cargado documentos.</p>
          ) : (
            <ul className={estilos.lista}>
              {documentos.map((documento) => (
                <li key={documento.id} className={estilos.documento}>
                  <IconoDocumento tamano={15} />

                  <span className={estilos.documentoNombre} title={documento.nombre}>
                    {documento.nombre}
                  </span>

                  <span className={estilos.documentoMeta}>
                    {documento.fragmentos
                      ? `${documento.fragmentos} frag.`
                      : tamanoLegible(documento.tamano)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <label className={estilos.anadir} data-ocupado={subiendoDocumento}>
            <IconoMas tamano={15} />
            {subiendoDocumento ? "Procesando…" : "Añadir documento"}

            <input
              type="file"
              accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                evento.target.value = "";
                onSubirDocumento(archivo);
              }}
              disabled={subiendoDocumento}
            />
          </label>

          {errorDocumento && (
            <p className={estilos.errorDocumento} role="alert">
              {errorDocumento}
            </p>
          )}

          <p className={estilos.privacidad}>
            Los documentos y su índice se quedan en este equipo.
          </p>
        </section>
      </div>

      <footer className={estilos.pie}>
        <div className={estilos.reloj}>
          <IconoReloj tamano={13} />

          {contexto ? (
            <span>
              {contexto.fechaCorta || contexto.fecha} · {contexto.hora}
            </span>
          ) : (
            <span>Sin contexto del sistema</span>
          )}
        </div>

        <div className={estilos.conexion} data-estado={String(enLinea)}>
          <span className={estilos.led} />
          {enLinea === false ? "Backend sin conexión" : "Backend conectado"}
        </div>
      </footer>
    </aside>
  );
}
