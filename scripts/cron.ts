import fs from "fs";
import path from "path";
import { getDeezerChart } from "../lib/deezer";
import type { HistoricoEntry, Historico } from "../lib/diff";

interface Chart {
  id: string;
  name: string;
  playlistId: string;
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

/** Normaliza texto para comparar sin distinguir mayúsculas ni tildes. */
function normaliza(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function main(): Promise<void> {
  const charts = readJson<Chart[]>("charts.json");
  const tracked = readJson<Tracked[]>("tracked.json");
  const historico = readJson<Historico>("historico.json");

  const fechaHoy = getFechaBogota();
  const entradasHoy: HistoricoEntry[] = [];

  for (const chart of charts) {
    console.log(`\n📊 Consultando "${chart.name}" (playlist ${chart.playlistId})...`);

    let top100: Awaited<ReturnType<typeof getDeezerChart>>;
    try {
      top100 = await getDeezerChart(chart.playlistId);
    } catch (err) {
      console.error(`  ⚠️ Error consultando ${chart.name}:`, err);
      continue;
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
