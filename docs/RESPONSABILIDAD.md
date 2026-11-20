# Uso de IA, límites y seguridad

## Uso de IA

CADCraft MCP parte del starter kit del curso. Para esta entrega se utilizó ChatGPT como apoyo para revisar y documentar el código existente, redactar el README y la justificación académica, y preparar el guion de demostración. En la demostración OpenCode permite que el modelo llame las herramientas MCP. La comprobación del dibujo se hace en CADCraft y la evaluación proyectual queda a cargo del estudiante. El alcance exacto del apoyo de IA en la implementación original corresponde al proceso de quien la desarrolló.

## Límites del proyecto

- El caso se enfoca en dibujo 2D. La salida de la demostración es DXF. La herramienta admite la extensión DWG, cuyo funcionamiento no se ha validado para esta entrega.
- CADCraft debe estar abierto con su canal de control activo. Si hay varias ventanas, confirma el dibujo activo con `estado_cadcraft` antes de editar.
- Los parámetros de geometría se expresan en unidades del dibujo. El asistente puede equivocarse al interpretar recintos, coordenadas o escalas. Comprueba la posición de las etiquetas y la geometría en CADCraft.
- La prueba de humo verifica el servidor MCP. La ejecución sobre el editor y la revisión de su salida se comprueban en la demostración.

## Seguridad

- El MCP usa el canal de control de CADCraft en loopback y el token local generado por la aplicación. Se ejecuta con los permisos del usuario que abrió el cliente.
- El comando CAD genérico puede modificar el dibujo activo. El servidor no restringe esa herramienta a un catálogo de lectura ni limita el guardado a una carpeta concreta. Para este caso usa una copia local de un plano propio o autorizado y las herramientas específicas de inspección y rotulación.
- `guardar_dibujo` exige una confirmación explícita y puede sobrescribir la ruta indicada. El guion pide al asistente esperar la autorización del estudiante y utilizar un nombre nuevo.
- Se excluyen configuraciones locales, archivos de sesión, perfiles, registros y credenciales. Un modelo remoto puede recibir el prompt y los resultados de las herramientas, incluida información del dibujo. Para la demostración usa únicamente material autorizado para compartir con el proveedor del modelo.
