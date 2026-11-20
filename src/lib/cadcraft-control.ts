/**
 * Cliente del canal de control de CADCraft.
 *
 * CADCraft (app de escritorio) expone un servidor local cuando se arranca con
 * `--control PUERTO` (o la variable CADCRAFT_CONTROL_PORT). Escucha en 127.0.0.1
 * y habla JSON por lineas: una peticion por linea, una respuesta por linea.
 *
 * Cada peticion lleva un token de sesion que la app escribe en un archivo:
 *   $XDG_RUNTIME_DIR/cadcraft-control-<puerto>.token  (o ~/.cache/...)
 *
 * Metodos que usamos: ping, drawing.inspect, engine.execute, engine.commands, app.save.
 */
import net from "node:net";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const CONTROL_HOST = "127.0.0.1";
export const PUERTO_POR_DEFECTO = 7979;

/** Puerto de control configurado (variable de entorno o 7979). */
export function puertoControl(): number {
  const crudo = process.env.CADCRAFT_CONTROL_PORT ?? process.env.CADCRAFT_PORT ?? String(PUERTO_POR_DEFECTO);
  const n = Number(crudo);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(`Puerto de control invalido: "${crudo}". Usa un entero entre 1 y 65535.`);
  }
  return n;
}

function dirRuntime(): string {
  const xdg = process.env.XDG_RUNTIME_DIR;
  if (xdg && xdg.trim()) return xdg;
  return path.join(os.homedir(), ".cache");
}

/** Ruta del archivo con el token de sesion del canal de control. */
export function rutaToken(puerto = puertoControl()): string {
  return path.join(dirRuntime(), `cadcraft-control-${puerto}.token`);
}

async function leerToken(puerto: number): Promise<string> {
  try {
    const token = (await readFile(rutaToken(puerto), "utf8")).trim();
    if (!token) throw new Error("vacio");
    return token;
  } catch {
    throw new Error(
      `No encuentro el token de control de CADCraft en ${rutaToken(puerto)}. ` +
        `Abre CADCraft con el canal de control (Abrir-cadcraft.command, o "--control ${puerto}").`,
    );
  }
}

export interface RespuestaControl {
  ok: boolean;
  result?: unknown;
  error?: string;
  state?: string;
}

/**
 * Envia una peticion al canal de control y espera SU respuesta (por id).
 * Rechaza solo ante fallos de red; los errores del protocolo vienen en `{ ok:false }`.
 */
export async function llamar(
  method: string,
  params: Record<string, unknown> = {},
  opciones: { timeoutMs?: number } = {},
): Promise<RespuestaControl> {
  const puerto = puertoControl();
  const token = await leerToken(puerto);
  const timeoutMs = opciones.timeoutMs ?? 25_000;
  const id = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  return new Promise<RespuestaControl>((resolve, reject) => {
    const socket = net.createConnection({ host: CONTROL_HOST, port: puerto });
    let buffer = "";
    let terminado = false;

    const cerrar = (fn: () => void) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      socket.destroy();
      fn();
    };

    const temporizador = setTimeout(() => {
      cerrar(() =>
        reject(
          new Error(
            `CADCraft no respondio en ${Math.round(timeoutMs / 1000)} s. ` +
              `Si el dibujo es muy grande, vuelve a intentarlo; si sigue igual, revisa que la app responda.`,
          ),
        ),
      );
    }, timeoutMs);

    socket.on("connect", () => {
      socket.write(JSON.stringify({ id, method, params, token }) + "\n");
    });

    socket.on("data", (datos) => {
      buffer += datos.toString("utf8");
      let corte: number;
      while ((corte = buffer.indexOf("\n")) >= 0) {
        const linea = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 1);
        if (!linea.trim()) continue;
        let mensaje: { id?: unknown; ok?: unknown; result?: unknown; error?: unknown; state?: unknown };
        try {
          mensaje = JSON.parse(linea);
        } catch {
          continue;
        }
        if (mensaje.id !== id) continue;
        if (mensaje.ok === true) {
          cerrar(() => resolve({ ok: true, result: mensaje.result }));
        } else {
          cerrar(() =>
            resolve({
              ok: false,
              error: String(mensaje.error ?? "error desconocido"),
              state: typeof mensaje.state === "string" ? mensaje.state : undefined,
            }),
          );
        }
        return;
      }
    });

    socket.on("error", (e) => {
      const code = (e as NodeJS.ErrnoException).code;
      const mensaje =
        code === "ECONNREFUSED"
          ? `No puedo conectar con CADCraft en ${CONTROL_HOST}:${puerto}. ` +
            `Abre la app con el canal de control (Abrir-cadcraft.command, o "--control ${puerto}").`
          : `Error de conexion con CADCraft (${CONTROL_HOST}:${puerto}): ${e.message}`;
      cerrar(() => reject(new Error(mensaje)));
    });
  });
}

/** Ejecuta un comando CAD con parametros JSON; lanza Error si la app responde ok:false. */
export async function ejecutar(command: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const r = await llamar("engine.execute", { command, params });
  if (!r.ok) throw new Error(`CADCraft rechazo "${command}": ${r.error}`);
  return r.result;
}

/**
 * Deja `nombre` como capa actual. Si no existe, la crea.
 * Los comandos de dibujo (pline, rectang, text...) usan la capa actual.
 */
export async function usarCapa(nombre: string): Promise<void> {
  const actual = await llamar("engine.execute", { command: "layer.current", params: { name: nombre } });
  if (actual.ok) return;
  const creada = await llamar("engine.execute", {
    command: "layer.new",
    params: { name: nombre, current: true },
  });
  if (!creada.ok) throw new Error(`No pude activar ni crear la capa "${nombre}": ${creada.error}`);
}
