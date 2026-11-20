# Mision

Construye un servidor **MCP** (Model Context Protocol) en TypeScript que permita a un asistente de IA controlar la aplicacion **CADCraft** instalada en el computador del usuario.

| Dato | Valor |
|---|---|
| Aplicacion | CADCraft |
| Sistema operativo | macOS |
| Ubicacion / identificador | /Applications/CADCraft.app |
| Nombre del servidor MCP | cadcraft |
| Lo que el usuario quiere hacer | Quiero que la IA se comporte como un experto en CADCraft, pueda recibir instrucciones verbales o imágenes y de ellas modelar en CADCraft. |

# Antes de empezar

1. Lee `AGENTS.md` y respeta TODAS sus reglas (sin console.log, sin shell con texto del modelo, validar entradas, annotations, etc.).
2. Mira `src/tools/_ejemplo.ts` y `src/lib/` para ver el patron. Puedes crear herramientas con `npm run new-tool -- nombre`.

# Fase 1 - Investigar (NO escribas codigo todavia)

Averigua como se puede controlar **CADCraft** desde fuera, probando estas vias de la mas robusta a la mas fragil:

1. API HTTP / WebSocket / plugin oficial  2. CLI de la app  3. Archivos de datos que se puedan leer/escribir  4. Scripting del sistema operativo  5. Automatizacion de interfaz (ultimo recurso)

Pistas para macOS:
- La app suele estar en `/Applications` o `/System/Applications`. Mira `Contents/Info.plist` (`plutil -p`) y `Contents/MacOS`, `Contents/Resources` por si trae una CLI.
- **AppleScript / JXA**: comprueba si la app es "scriptable" con `sdef "/ruta/App.app"` (muestra su diccionario de comandos). Si lo es, es la mejor via: se ejecuta con `osascript` pasando los valores como ARGUMENTOS del script (`on run argv`), nunca pegados al texto.
- Revisa si la app tiene API local, un esquema de URL (`open "app://..."`) o archivos de datos en `~/Library/Application Support`.
- La primera vez macOS puede pedir permiso de Automatizacion; documentalo en el README.

Tambien puedes consultar la documentacion oficial de la app en internet (webfetch / websearch).

**Reglas de la investigacion:** usa solo comandos de LECTURA (`--help`, `--version`, listar, leer metadatos). No abras, cierres, borres ni modifiques nada del usuario mientras investigas.

Escribe tus hallazgos en `INVESTIGACION.md` (via elegida, por que, alternativas descartadas, limitaciones).

# Fase 2 - Disenar

Define entre **4 y 8 herramientas** pequenas y utiles (una accion clara cada una). Empieza por las de solo lectura. Para cada una decide: nombre en snake_case, descripcion (que hace y CUANDO usarla), parametros con `.describe()`, y si es de solo lectura, modifica datos o es destructiva.

# Fase 3 - Implementar

- Codigo en `src/tools/cadcraft.ts` (puedes dividir en varios archivos dentro de `src/tools/`). Cada archivo exporta `register(server)`.
- Declara `annotations` en cada herramienta. Las destructivas exigen un parametro `confirmar: z.literal(true)`.
- Valida toda entrada. Usa `run()` de `src/lib/exec.ts` para ejecutar programas.
- Devuelve errores con `error("mensaje que explique como corregir")`.
- Si la app debe estar abierta o instalada para que una herramienta funcione, detectalo y explicalo en el error.

# Fase 4 - Verificar

1. Ejecuta `npm run build` y `npm test` hasta que pasen.
2. Prueba tu mismo las herramientas de SOLO LECTURA contra la app real cuando sea posible (por ejemplo con un script temporal que use el cliente MCP) y corrige lo que falle. No pruebes las que modifican o borran datos.

# Fase 5 - Documentar

Crea `README.md` en espanol: que hace el MCP, tabla de herramientas (nombre, que hace, si modifica datos), 3 ejemplos de frases para pedirselas a la IA, requisitos y permisos del sistema, y limitaciones conocidas. Se honesto: si algo no pudo probarse, dilo.

# Fase 6 - Arranque conjunto (SOLO si la app lo necesita)

El proyecto ya trae un lanzador generico (`Abrir-cadcraft.bat` / `.command`) que abre **CADCraft** y opencode a la vez. Si en la Fase 1 descubriste que la app debe arrancar de forma especial para poder controlarla (un parametro como `--control`, `--port` o `--remote-debugging-port`, un servidor o puente propio, un plugin que hay que activar), NO crees `.bat` propios ni dependas de la app de escritorio de opencode. Crea en su lugar `scripts/preparar-app.mjs` (solo modulos de Node, funciona en Windows y Mac) con este contrato. Puedes importar `./lib-arranque.mjs` (`esperarPuerto`, `puertoAbierto`, `appEnEjecucion`):

```js
export default async function preparar({ raiz, app, rutaApp, slug }) {
  // 1. Abre la app con los parametros necesarios (sin cerrar instancias que el usuario ya tenga abiertas).
  // 2. Espera a que este lista (con limite de tiempo y un error claro si no lo logra).
  // 3. Si la app trae su propio puente/servidor MCP, registralo en opencode.json del proyecto como
  //    mcp.<nombre> = { type: "local", command: [...] }  (objeto plano dentro de "mcp").
  return {
    appAbierta: true,
    nombreMcp: slug + "_estado", // nombre con el que se registrara el MCP de ESTE proyecto, distinto de los que anadiste
    puente: { host: "127.0.0.1", port: 9877, ping: false, timeoutS: 60 }, // SOLO si la app expone un puerto/puente local
  };
}
```

Si la app tiene un puente local en un puerto, el lanzador lo espera antes de abrir opencode, evita abrir la app dos veces si el puente ya responde, y `Cerrar-cadcraft.bat` / `node scripts/estado-mcp.mjs` lo usan para cerrar y diagnosticar. Si el puerto es fijo y no depende de la ejecucion, puedes declararlo ademas en `.mcp-constructor.json` como `"puente": { "host", "port", "ping", "timeoutS" }`.

Si la app NO necesita nada especial, no crees ese archivo.

# Entregable

Termina SOLO cuando `npm run build` y `npm test` pasen. Cierra con un resumen breve de lo que construiste y lo que no pudiste verificar.
