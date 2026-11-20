# CADCraft MCP

Servidor MCP para conectar un asistente de IA con CADCraft, una aplicación de dibujo CAD instalada en macOS. Permite consultar capas y entidades del dibujo abierto, crear geometría y etiquetas en el editor y guardar una copia editable. El caso académico muestra cómo preparar una planta de vivienda para una corrección de taller.

El servidor se comunica con el cliente de IA por `stdio` y con CADCraft por TCP en `127.0.0.1:7979`. Está basado en [mcp-starter-kit](https://github.com/Maurichilean3d/mcp-starter-kit), rama `main`. El código de la plantilla se distribuye con su [licencia MIT](LICENSE).

## Requisitos

- macOS con CADCraft instalado en `/Applications/CADCraft.app` y con soporte para `--control`. La instalación usada en el proyecto es CADCraft 0.13.0. El repositorio incluye el servidor MCP. CADCraft se instala por separado mediante el distribuidor de la aplicación, ArtCraft.
- Git y Node.js con npm. La compilación y la prueba de humo se verificaron con Node.js 24.20.0 y npm 11.19.0.
- OpenCode y acceso a un modelo con herramientas, o un cliente compatible con MCP local por `stdio`.

## Instalar y conectar

1. Clona el proyecto e instala las dependencias fijadas en el archivo de bloqueo.

   ```bash
   git clone https://github.com/weinsteinpedro-tech/cadcraft-mcp.git
   cd cadcraft-mcp
   npm ci
   npm run build
   npm test
   ```

2. Abre CADCraft en una instancia con canal de control. Si ya tienes una instancia con control en el puerto 7979, úsala.

   ```bash
   open -n -a /Applications/CADCraft.app --args --control 7979
   ```

   CADCraft genera su token de sesión automáticamente. El servidor lo lee desde `$XDG_RUNTIME_DIR` si está definido o desde `~/.cache`. No hace falta copiar el token.

3. Desde la carpeta del repositorio, registra el servidor en la configuración local de OpenCode y abre el cliente.

   ```bash
   npm run configurar -- --nombre=cadcraft
   opencode
   ```

   En otro cliente MCP, registra el comando `node` con la ruta absoluta a `dist/index.js` como argumento y selecciona transporte `stdio`. Si usas otro puerto, configura el mismo valor de `CADCRAFT_CONTROL_PORT` en el entorno del servidor y en el arranque de CADCraft.

4. Pide «Usa `estado_cadcraft` y dime qué dibujo está activo y cuántas entidades tiene». Si aparece un error de conexión, comprueba que la instancia que estás usando se abrió con `--control` y que CADCraft y el servidor se ejecutan con la misma cuenta local.

## Herramientas

| Herramienta | Operación y argumentos principales |
|---|---|
| `estado_cadcraft` | Comprueba la conexión y resume el dibujo activo, sus capas, extensión y número de entidades. |
| `inspeccionar_dibujo` | Devuelve información del dibujo. `entidades` incluye la geometría y `limite` acota la cantidad devuelta. |
| `listar_comandos` | Consulta el catálogo CAD. Admite `filtro` y `limite`. |
| `ejecutar_comando` | Envía un comando del catálogo a CADCraft con `comando` y `parametros`. |
| `dibujar_polilinea` | Traza un contorno con `puntos` y las opciones `cerrada`, `capa` y `grosor`. |
| `dibujar_rectangulo` | Dibuja entre las esquinas `p1` y `p2`. Admite capa, rotación y grosor. |
| `poner_texto` | Inserta `texto` en `at`, con opciones de altura, giro, justificación y capa. |
| `guardar_dibujo` | Guarda en una `ruta` absoluta con extensión DXF o DWG. Exige `confirmar: true` y puede sobrescribir. |

## Ejemplos

- «Inspecciona el dibujo activo y enumera sus capas. Antes de proponer cambios, dime qué información obtuviste directamente de CADCraft».
- «En la copia de trabajo, dibuja un rectángulo de 8 × 8 unidades en la capa ENSAYO y agrega un rótulo. Verifica ambos elementos con `inspeccionar_dibujo`».
- [Demostración de revisión de vivienda](docs/DEMOSTRACION.md), con prompt, comprobaciones y guion para presentarla en vivo.

## Evidencia y alcance

La [planta base en DXF](ejemplos/casa-3-dormitorios-2-banos.dxf) y su [vista previa](ejemplos/casa-render.png) son archivos del ejemplo previo del proyecto. La prueba de humo verifica el arranque del servidor, el intercambio MCP y el registro de las ocho herramientas. La demostración comprueba las operaciones en la aplicación de escritorio y se ejecuta por separado.

Consulta el [texto de utilidad académica](docs/UTILIDAD_ACADEMICA.md) y la [declaración de IA, límites y seguridad](docs/RESPONSABILIDAD.md).
