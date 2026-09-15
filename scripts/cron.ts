import fs from "fs";
import path from "path";
import { getDeezerChart } from "../lib/deezer";
import { getBillboardChart } from "../lib/billboard";
import type { HistoricoEntry, Historico } from "../lib/diff";

interface Chart {
  id: string;
  name: string;
  source?: "deezer" | "billboard";
  frequency?: "daily" | "weekly";
  playlistId?: string;
  url: string;
}

interface Tracked {
  artist: string;
  title: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2) + "\n"
  );
}

/** Fecha de hoy en formato YYYY-MM-DD, zona horaria Bogotá. */
function getFechaBogota(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** true si hoy es lunes, según hora Bogotá. */
function esLunesBogota(): boolean {
  const nombreDia = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "long",
  }).format(new Date());
  return nombreDia === "Monday";
}

/** Normaliza texto para comparar sin distinguir mayúsculas ni tildes. */
function normaliza(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Trae el top de un chart, según su "source" (deezer por defecto). */
async function traerTop(
  chart: Chart
): Promise<{ pos: number; artist: string; title: string }[]> {
  if (chart.source === "billboard") {
    return getBillboardChart(chart.url);
  }

  if (!chart.playlistId) {
    throw new Error(
      `El chart "${chart.name}" es de Deezer pero no tiene "playlistId" en charts.json.`
    );
  }
  return getDeezerChart(chart.playlistId);
}

async function main(): Promise<void> {
  const charts = readJson<Chart[]>("charts.json");
  const tracked = readJson<Tracked[]>("tracked.json");
  const historico = readJson<Historico>("historico.json");

  const fechaHoy = getFechaBogota();
  const esLunes = esLunesBogota();
  const entradasHoy: HistoricoEntry[] = [];

  for (const chart of charts) {
    const frecuencia = chart.frequency ?? "daily";
    const forzarTodos = process.env.FORZAR_TODOS === "true";

    // Charts semanales (Billboard) solo se consultan los lunes,
    // salvo que se fuerce manualmente (por ejemplo, para sembrar el
    // primer dato o para pruebas vía workflow_dispatch).
    if (frecuencia === "weekly" && !esLunes && !forzarTodos) {
      console.log(
        `\n⏭️  "${chart.name}" es semanal y hoy no es lunes; se omite.`
      );
      continue;
    }

    console.log(
      `\n📊 Consultando "${chart.name}" (${chart.source ?? "deezer"}, ${frecuencia})...`
    );

    let top100: { pos: number; artist: string; title: string }[];
    try {
      top100 = await traerTop(chart);
    } catch (err) {
      console.error(`  ⚠️ No se pudo actualizar "${chart.name}":`, err);
      continue; // no se agrega nada para este chart hoy
    }

    console.log(`  Se obtuvieron ${top100.length} canciones.`);

    for (const song of tracked) {
      const match = top100.find(
        (t) =>
          normaliza(t.artist).includes(normaliza(song.artist)) &&
          normaliza(t.title).includes(normaliza(song.title))
      );

      entradasHoy.push({
        artist: song.artist,
        title: song.title,
        chartId: chart.id,
        pos: match ? match.pos : null,
      });

      if (match) {
        console.log(`  ✓ ${song.artist} - ${song.title}: #${match.pos}`);
      } else {
        console.log(`  ✗ ${song.artist} - ${song.title}: no está en el top 100`);
      }
    }
  }

  historico[fechaHoy] = entradasHoy;
  writeJson("historico.json", historico);

  console.log(`\n✅ historico.json actualizado para ${fechaHoy}.`);
}

main().catch((err) => {
  console.error("❌ Error ejecutando el cron:", err);
  process.exit(1);
});
