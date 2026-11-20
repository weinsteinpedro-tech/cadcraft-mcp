/**
 * Herramientas para controlar CADCraft desde el asistente.
 *
 * Se conectan al canal de control local de la app (127.0.0.1:7979 por defecto).
 * La app debe estar abierta con `--control 7979` (ver scripts/preparar-app.mjs).
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import path from "node:path";
import { error, json, texto } from "../lib/respuestas.js";
import {
  CONTROL_HOST,
  ejecutar,
  llamar,
  puertoControl,
  usarCapa,
} from "../lib/cadcraft-control.js";

const punto = z.tuple([z.number(), z.number()]).describe("Punto [x, y] en unidades del dibujo");
const capa = z
  .string()
  .min(1)
  .optional()
  .describe('Capa donde dibujar. Si no existe se crea. Ej.: "MUROS", "TEXTOS", "MOBILIARIO".');

interface ComandoCatalogo {
  id?: unknown;
  label?: unknown;
  aliases?: unknown;
  params?: unknown;
}

export function register(server: McpServer): void {
  server.registerTool(
    "estado_cadcraft",
    {
      title: "Estado de CADCraft",
      description:
        "Comprueba que CADCraft este abierto y con el canal de control, y resume el dibujo actual " +
        "(titulo, capa actual, numero de entidades, capas y extension). Usala al empezar o si una " +
        "herramienta de dibujo falla por conexion.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const ping = await llamar("ping");
        if (!ping.ok) return error(`CADCraft no responde al ping: ${ping.error}`);

        const insp = await llamar("drawing.inspect", { entities: false });
        if (!insp.ok) return error(`CADCraft respondio pero no pude inspeccionar el dibujo: ${insp.error}`);

        const d = insp.result as {
          title?: string;
          path?: string | null;
          currentLayer?: string;
          entityCount?: number;
          extents?: number[][] | null;
          layers?: { name?: string }[];
          space?: string;
        };
        const capas = (d.layers ?? []).map((c) => c.name).filter(Boolean);
        const lineas = [
          `CADCraft conectado en ${CONTROL_HOST}:${puertoControl()} (ping: pong).`,
          `Dibujo: ${d.title ?? "(sin titulo)"}${d.path ? ` — ${d.path}` : " — sin guardar"}`,
          `Espacio: ${d.space ?? "Model"} | Capa actual: ${d.currentLayer ?? "0"} | Entidades: ${d.entityCount ?? 0}`,
          `Capas (${capas.length}): ${capas.join(", ") || "ninguna"}`,
          `Extension: ${d.extents ? `[${d.extents[0]?.join(", ")}] a [${d.extents[1]?.join(", ")}]` : "vacia"}`,
        ];
        return texto(lineas.join("\n"));
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "inspeccionar_dibujo",
    {
      title: "Inspeccionar el dibujo",
      description:
        "Devuelve un resumen del dibujo y, si se pide, las entidades (handle, tipo, capa y geometria). " +
        "Usala para verificar lo que se dibujo antes de seguir o para ubicar objetos.",
      inputSchema: {
        entidades: z.boolean().default(true).describe("Si es true, incluye las entidades con su geometria."),
        limite: z.number().int().min(1).max(1000).default(100).describe("Maximo de entidades a devolver."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ entidades, limite }) => {
      try {
        const r = await llamar("drawing.inspect", { entities: entidades, limit: limite });
        if (!r.ok) return error(`No pude inspeccionar el dibujo: ${r.error}`);
        return json(r.result);
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "listar_comandos",
    {
      title: "Listar comandos CAD",
      description:
        "Lista los comandos que entiende CADCraft con sus parametros JSON (filtrable). Usala para " +
        "descubrir como dibujar algo con ejecutar_comando (arcos, circulos, cotas, hatch, etc.).",
      inputSchema: {
        filtro: z
          .string()
          .optional()
          .describe('Texto a buscar en id, nombre o alias. Ej.: "hatch", "dim", "circle", "layer".'),
        limite: z.number().int().min(1).max(200).default(60).describe("Maximo de comandos a devolver."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ filtro, limite }) => {
      try {
        const r = await llamar("engine.commands", {});
        if (!r.ok) return error(`No pude leer el catalogo de comandos: ${r.error}`);
        const crudo = r.result as unknown;
        const lista: ComandoCatalogo[] = Array.isArray(crudo)
          ? (crudo as ComandoCatalogo[])
          : ((crudo as { commands?: ComandoCatalogo[] })?.commands ?? []);
        const f = (filtro ?? "").toLowerCase().trim();
        const encontrados = lista.filter((c) => {
          if (!f) return true;
          const id = String(c.id ?? "").toLowerCase();
          const label = String(c.label ?? "").toLowerCase();
          const alias = Array.isArray(c.aliases) ? c.aliases.join(",").toLowerCase() : String(c.aliases ?? "").toLowerCase();
          return id.includes(f) || label.includes(f) || alias.includes(f);
        });
        const recortados = encontrados.slice(0, limite).map((c) => ({
          id: c.id,
          nombre: c.label,
          alias: c.aliases,
          parametros: c.params,
        }));
        return json({
          total: encontrados.length,
          devueltos: recortados.length,
          comandos: recortados,
          nota:
            encontrados.length > recortados.length
              ? "Hay mas coincidencias: afina el filtro o sube el limite."
              : undefined,
        });
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "ejecutar_comando",
    {
      title: "Ejecutar comando CAD",
      description:
        "Ejecuta cualquier comando de CADCraft con parametros JSON (equivale a engine.execute). Es la " +
        "herramienta general: lineas, arcos, circulos, cotas, hatch, capas, variables, etc. Consulta " +
        "listar_comandos para conocer los parametros exactos de cada comando.",
      inputSchema: {
        comando: z.string().min(1).describe('Id o alias del comando. Ej.: "line", "circle", "hatch", "dim", "layer.new".'),
        parametros: z
          .record(z.string(), z.any())
          .default({})
          .describe("Objeto JSON con los argumentos del comando (segun listar_comandos)."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ comando, parametros }) => {
      try {
        const r = await llamar("engine.execute", { command: comando, params: parametros ?? {} });
        if (!r.ok) return error(`CADCraft rechazo "${comando}": ${r.error}`);
        return json(r.result ?? null);
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "dibujar_polilinea",
    {
      title: "Dibujar polilinea",
      description:
        "Dibuja una polilinea o poligono con una lista de puntos [x,y]. Ideal para muros, contornos de " +
        "habitaciones y terrazas. Si cerrada=true une el ultimo punto con el primero.",
      inputSchema: {
        puntos: z.array(punto).min(2).describe("Puntos de la polilinea, en orden."),
        cerrada: z.boolean().default(false).describe("Cierra la polilinea (poligono)."),
        capa: capa,
        grosor: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Grosor de linea constante en unidades del dibujo (p. ej. 0.15 para muros)."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ puntos, cerrada, capa: nombreCapa, grosor }) => {
      try {
        if (nombreCapa) await usarCapa(nombreCapa);
        const params: Record<string, unknown> = { vertices: puntos, closed: cerrada };
        if (grosor !== undefined) params.width = grosor;
        const r = await ejecutar("pline", params);
        return json({ ok: true, capa: nombreCapa ?? "(actual)", resultado: r });
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "dibujar_rectangulo",
    {
      title: "Dibujar rectangulo",
      description:
        "Dibuja un rectangulo a partir de dos esquinas opuestas [x,y]. Util para habitaciones, muebles, " +
        "camas, mesas y equipamiento en planta.",
      inputSchema: {
        p1: punto.describe("Primera esquina [x, y]."),
        p2: z.tuple([z.number(), z.number()]).describe("Esquina opuesta [x, y]."),
        capa: capa,
        rotacion: z.number().optional().describe("Rotacion en grados (por defecto 0)."),
        grosor: z.number().min(0).max(100).optional().describe("Grosor de linea constante."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ p1, p2, capa: nombreCapa, rotacion, grosor }) => {
      try {
        if (nombreCapa) await usarCapa(nombreCapa);
        const params: Record<string, unknown> = { p1, p2 };
        if (rotacion !== undefined) params.rotation = rotacion;
        if (grosor !== undefined) params.width = grosor;
        const r = await ejecutar("rectang", params);
        return json({ ok: true, capa: nombreCapa ?? "(actual)", resultado: r });
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "poner_texto",
    {
      title: "Poner texto",
      description:
        "Escribe una etiqueta de texto en el dibujo (p. ej. el nombre de cada habitacion). La altura es " +
        "en unidades del dibujo; 0.35 suele verse bien en una planta en metros.",
      inputSchema: {
        at: punto.describe("Punto de insercion [x, y]."),
        texto: z.string().min(1).describe("Texto a escribir."),
        altura: z.number().positive().max(1000).default(0.35).describe("Altura de la letra."),
        rotacion: z.number().optional().describe("Rotacion en grados."),
        justificar: z
          .enum(["L", "C", "R", "M", "TL", "TC", "TR", "ML", "MC", "MR", "BL", "BC", "BR"])
          .optional()
          .describe("Justificacion del texto (L=izquierda, C=centro, R=derecha...)."),
        capa: capa,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ at, texto: contenido, altura, rotacion, justificar, capa: nombreCapa }) => {
      try {
        if (nombreCapa) await usarCapa(nombreCapa);
        const params: Record<string, unknown> = { at, text: contenido, height: altura };
        if (rotacion !== undefined) params.rotation = rotacion;
        if (justificar !== undefined) params.justify = justificar;
        const r = await ejecutar("text", params);
        return json({ ok: true, capa: nombreCapa ?? "(actual)", resultado: r });
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );

  server.registerTool(
    "guardar_dibujo",
    {
      title: "Guardar dibujo",
      description:
        "Guarda el dibujo actual en un archivo .dxf o .dwg (sobrescribe si ya existe). Requiere " +
        "confirmar=true porque puede sobrescribir trabajo previo.",
      inputSchema: {
        ruta: z
          .string()
          .min(1)
          .describe("Ruta absoluta del archivo, terminada en .dxf o .dwg. Ej.: /Users/tu/casa.dxf"),
        confirmar: z.literal(true).describe("Debe ser true: confirma que se puede sobrescribir el archivo."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ ruta }) => {
      try {
        if (!path.isAbsolute(ruta)) {
          return error(`La ruta debe ser absoluta (empieza en /). Recibi: "${ruta}".`);
        }
        if (!/\.(dxf|dwg)$/i.test(ruta)) {
          return error(`La ruta debe terminar en .dxf o .dwg. Recibi: "${ruta}".`);
        }
        const r = await llamar("app.save", { path: ruta });
        if (!r.ok) return error(`No pude guardar en "${ruta}": ${r.error}`);
        return texto(`Dibujo guardado en ${ruta}`);
      } catch (e) {
        return error((e as Error).message);
      }
    },
  );
}
