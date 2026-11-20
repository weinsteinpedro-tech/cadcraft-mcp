#!/usr/bin/env node
/**
 * Gancho de arranque para CADCraft.
 *
 * CADCraft solo expone su canal de control (JSON por TCP en 127.0.0.1) si se abre
 * con `--control PUERTO`. Este script:
 *   1. Comprueba si el puerto de control ya responde (la app ya esta lista).
 *   2. Si no, abre CADCraft con `--control PUERTO` (en macOS con `open -n`).
 *   3. Espera a que el puerto acepte conexiones, con limite de tiempo.
 *
 * No cierra ninguna instancia que el usuario ya tenga abierta.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { esperarPuerto, puertoAbierto } from "./lib-arranque.mjs";

const PUERTO = Number(process.env.CADCRAFT_CONTROL_PORT || 7979);
const HOST = "127.0.0.1";

function abrirConControl(rutaApp) {
  return new Promise((resolve) => {
    try {
      let hijo;
      if (process.platform === "darwin" && rutaApp && existsSync(rutaApp)) {
        // -n: nueva instancia; --args: pasa los argumentos a la app.
        hijo = spawn("open", ["-n", "-a", rutaApp, "--args", "--control", String(PUERTO)], {
          stdio: "ignore",
          detached: true,
        });
      } else {
        const exe = rutaApp && existsSync(rutaApp) ? rutaApp : "cadcraft";
        hijo = spawn(exe, ["--control", String(PUERTO)], { stdio: "ignore", detached: true });
      }
      hijo.on("error", () => resolve(false));
      hijo.on("spawn", () => {
        hijo.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

export default async function preparar({ app, rutaApp, slug }) {
  const nombreMcp = slug || "cadcraft";
  const puente = { host: HOST, port: PUERTO, ping: false, timeoutS: 60 };

  process.stdout.write(`CADCraft: usando canal de control en ${HOST}:${PUERTO}\n`);

  if (await puertoAbierto(HOST, PUERTO)) {
    process.stdout.write(`CADCraft ya escucha en ${HOST}:${PUERTO}; no abro otra instancia.\n`);
    return { appAbierta: true, nombreMcp, puente };
  }

  process.stdout.write(`Abriendo ${app || "CADCraft"} con --control ${PUERTO} ...\n`);
  const lanzado = await abrirConControl(rutaApp);
  if (!lanzado) {
    console.log(
      `Aviso: no pude ejecutar el lanzador de CADCraft. Abrelo tu con: "${rutaApp || app}" --control ${PUERTO}`,
    );
  }

  const listo = await esperarPuerto({
    host: HOST,
    port: PUERTO,
    timeoutMs: 55_000,
    etiqueta: "el canal de control de CADCraft",
  });

  if (!listo) {
    console.log(
      `\nAviso: el canal de control no respondio en ${HOST}:${PUERTO}. ` +
        `Abre CADCraft manualmente con "--control ${PUERTO}" y vuelve a lanzar.`,
    );
    return { appAbierta: true, nombreMcp };
  }

  process.stdout.write(`CADCraft listo: canal de control activo en ${HOST}:${PUERTO}.\n`);
  return { appAbierta: true, nombreMcp, puente };
}
