import fs from "fs";
import path from "path";
import {
  getDeezerChart,
  getDeezerArtistChart,
  getDeezerAlbumChart,
} from "../lib/deezer";
import { getBillboardChart } from "../lib/billboard";
import type { HistoricoEntry, Historico } from "../lib/diff";

interface Chart {
  id: string;
  name: string;
  source?: "deezer" | "billboard";
  contentType?: "tracks" | "artists" | "albums";
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

/**
 * Coincidencia EXACTA de nombre de artista (tras normalizar). A diferencia
 * de un match por "includes", esto evita falsos positivos con nombres muy
 * cortos como "RM" o "V", que de otro modo combinarían con cualquier texto
 * que simplemente contenga esas letras (ej. "Daylight Storms" contiene "rm").
 */
function coincideArtista(nombreEnChart: string, nombreBuscado: string): boolean {
  return normaliza(nombreEnChart) === normaliza(nombreBuscado);
}

/** Trae el top de CANCIONES de un chart, según su "source". */
async function traerTopCanciones(
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

/** Trae el top de ARTISTAS de un chart, según su "source". */
async function traerTopArtistas(
  chart: Chart
): Promise<{ pos: number; name: string }[]> {
  if (chart.source === "deezer") {
    return getDeezerArtistChart(100);
  }

  throw new Error(
    `Chart de artistas con source "${chart.source}" todavía no está soportado.`
  );
}

/** Trae el top de ÁLBUMES de un chart, según su "source". */
async function traerTopAlbumes(
  chart: Chart
): Promise<{ pos: number; artist: string; title: string }[]> {
  if (chart.source === "deezer") {
    return getDeezerAlbumChart(100);
  }

  throw new Error(
    `Chart de álbumes con source "${chart.source}" todavía no está soportado.`
  );
}

async function main(): Promise<void> {
  const charts = readJson<Chart[]>("charts.json");
  const tracked = readJson<Tracked[]>("tracked.json");
  const artistasRastreados = readJson<string[]>("tracked-artists.json");
  const historico = readJson<Historico>("historico.json");

  const fechaHoy = getFechaBogota();
  const esLunes = esLunesBogota();
  const entradasHoy: HistoricoEntry[] = [];

  for (const chart of charts) {
    const frecuencia = chart.frequency ?? "daily";
    const contentType = chart.contentType ?? "tracks";
    const forzarTodos = process.env.FORZAR_TODOS === "true";

    // Charts semanales (Billboard) solo se consultan los lunes,
    // salvo que se fuerce manualmente.
    if (frecuencia === "weekly" && !esLunes && !forzarTodos) {
      console.log(
        `\n⏭️  "${chart.name}" es semanal y hoy no es lunes; se omite.`
      );
      continue;
    }

    console.log(
      `\n📊 Consultando "${chart.name}" (${chart.source ?? "deezer"}, ${contentType}, ${frecuencia})...`
    );

    // --- Charts de tipo "artists": posición del ARTISTA en el chart ---
    if (contentType === "artists") {
      let topArtistas: { pos: number; name: string }[];
      try {
        topArtistas = await traerTopArtistas(chart);
      } catch (err) {
        console.error(`  ⚠️ No se pudo actualizar "${chart.name}":`, err);
        continue;
      }

      console.log(`  Se obtuvieron ${topArtistas.length} artistas.`);

      for (const artista of artistasRastreados) {
        const match = topArtistas.find((a) => coincideArtista(a.name, artista));

        entradasHoy.push({
          artist: "",
          title: artista,
          chartId: chart.id,
          pos: match ? match.pos : null,
        });

        if (match) {
          console.log(`  ✓ ${artista}: #${match.pos}`);
        } else {
          console.log(`  ✗ ${artista}: no está en el top (match exacto)`);
          const pistaParcial = topArtistas.find((a) =>
            normaliza(a.name).includes(normaliza(artista))
          );
          if (pistaParcial) {
            console.log(
              `     ℹ️ Pista: hay un nombre parecido en el chart: "${pistaParcial.name}" (#${pistaParcial.pos}). Si es el mismo artista con nombre distinto, avisa para ajustar tracked-artists.json.`
            );
          }
        }
      }

      continue;
    }

    // --- Charts de tipo "albums": posición de CUALQUIER álbum del artista ---
    if (contentType === "albums") {
      let topAlbumes: { pos: number; artist: string; title: string }[];
      try {
        topAlbumes = await traerTopAlbumes(chart);
      } catch (err) {
        console.error(`  ⚠️ No se pudo actualizar "${chart.name}":`, err);
        continue;
      }

      console.log(`  Se obtuvieron ${topAlbumes.length} álbumes.`);

      for (const artista of artistasRastreados) {
        // Puede haber más de un álbum del mismo artista en el chart;
        // nos quedamos con el de mejor posición (número más bajo).
        const coincidencias = topAlbumes.filter((a) =>
          coincideArtista(a.artist, artista)
        );
        const mejor = coincidencias.sort((a, b) => a.pos - b.pos)[0];

        entradasHoy.push({
          artist: "",
          title: artista,
          chartId: chart.id,
          pos: mejor ? mejor.pos : null,
          detail: mejor ? mejor.title : undefined,
        });

        if (mejor) {
          console.log(`  ✓ ${artista}: #${mejor.pos} (álbum: ${mejor.title})`);
        } else {
          console.log(`  ✗ ${artista}: ningún álbum en el top (match exacto)`);
          const pistaParcial = topAlbumes.find((a) =>
            normaliza(a.artist).includes(normaliza(artista))
          );
          if (pistaParcial) {
            console.log(
              `     ℹ️ Pista: hay un artista parecido en el chart: "${pistaParcial.artist}" (álbum: ${pistaParcial.title}). Si es el mismo artista con nombre distinto, avisa para ajustar tracked-artists.json.`
            );
          }
        }
      }

      continue;
    }

    // --- Charts de tipo "tracks" (comportamiento original) ---
    let top100: { pos: number; artist: string; title: string }[];
    try {
      top100 = await traerTopCanciones(chart);
    } catch (err) {
      console.error(`  ⚠️ No se pudo actualizar "${chart.name}":`, err);
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
