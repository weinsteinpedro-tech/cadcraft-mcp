# Demostración en vivo · Rotular una vivienda en CADCraft

**Duración sugerida** de 2 a 3 minutos. Muestra en paralelo el cliente de IA y la ventana de CADCraft que tiene el canal de control activo.

1. **Antes.** Abre una copia de [la planta base](../ejemplos/casa-3-dormitorios-2-banos.dxf) en CADCraft. Haz zoom a la vivienda y muestra que todavía carece de rótulos de recintos. En el flujo manual, usarías el panel de capas y el comando de texto para repetir la operación en los tres dormitorios.
2. **Solicitud a la IA.** En OpenCode, pega el prompt que aparece abajo. Espera a que se vean las llamadas a las herramientas y al menos una respuesta de inspección.
3. **Después.** Muestra los tres nombres en el editor y la capa `ROTULOS_REVISION`. Compara el número de entidades devuelto antes y después. El DXF base contiene 112 entidades, de las cuales ninguna es de texto. Si CADCraft informa 112 al abrirlo, el resultado previsto es 115. Revisa los puntos en la vista CAD antes de guardar la copia.
4. **Cierre.** Si las etiquetas están bien posicionadas, pide guardar un archivo nuevo y reábrelo para comprobar que los rótulos siguen presentes. Explica qué criterio aplicaste al revisar la ubicación de los nombres, por ejemplo, que el texto identifica cada dormitorio y no invade muros ni símbolos.

## Prompt para la prueba

> Usa las herramientas del MCP de CADCraft. Ejecuta `estado_cadcraft` e `inspeccionar_dibujo` para verificar que está abierta la vivienda de tres dormitorios y reportar su número de entidades antes de editar. Usa `poner_texto` para colocar DORMITORIO 1 en [13.7, 9.4], DORMITORIO 2 en [12.3, 6.4] y DORMITORIO 3 en [11.4, 2.6], en la capa ROTULOS_REVISION y con altura de 0,25 unidades. Luego, inspecciona el dibujo de nuevo y reporta el número de entidades y la presencia de la capa. Conserva la geometría existente. Espera mi autorización antes de guardar.

Los tres puntos están referidos a las coordenadas de la planta base. Si hiciera falta espacio, ajusta el punto o el tamaño sobre la copia. La cota dibujada marca 18 × 12 y el DXF declara pulgadas en su cabecera. Para esta revisión usa las coordenadas del dibujo y mantén su escala. Si lo importas a otra aplicación, verifica las unidades antes de medir.

> Guarda esta copia en la ruta absoluta que te indicaré, con nombre `revision-vivienda.dxf`. Confirmo el guardado en esa ruta.

## Evidencia que debe quedar visible

| Momento | Qué mostrar |
|---|---|
| Antes | Planta abierta en la app, capas y recuento inicial de entidades. |
| Ejecución | Prompt y llamadas a `estado_cadcraft`, `inspeccionar_dibujo` y `poner_texto`. |
| Después | Capa de rotulación, tres etiquetas en sus recintos, recuento final y DXF guardado, si se autorizó. |

La vista previa ilustra la planta de partida. Las capturas o el video del antes y el después se obtienen al ejecutar este flujo.
