import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { HistoricoEntry, Historico } from "../lib/diff";

const DATA_DIR = path.join(process.cwd(), "data");
const RAW_DIR = path.join(DATA_DIR, "raw");

const CHART_ID_ARTISTAS = "deezer_top_artistas_global";
const CHART_ID_ALBUMES = "deezer_top_albumes_global";

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

/** Coincidencia EXACTA de nombre de artista (tras normalizar). */
function coincideArtista(nombreEnChart: string, nombreBuscado: string): boolean {
  return normaliza(nombreEnChart) === normaliza(nombreBuscado);
}

function parseArtistasHtml(html: string): { pos: number; name: string }[] {
  const $ = cheerio.load(html);
  const nombres: string[] = [];

  $('[data-testid="artist_thumbnail"]').each((_, el) => {
    const nombre = $(el)
      .find('[data-testid="thumbnail-title"]')
      .first()
      .text()
      .trim();
    if (nombre) nombres.push(nombre);
  });

  return nombres.map((name, index) => ({ pos: index + 1, name }));
}

function parseAlbumesHtml(
  html: string
): { pos: number; artist: string; title: string }[] {
  const $ = cheerio.load(html);
  const items: { artist: string; title: string }[] = [];

  $('[data-testid="album_thumbnail"]').each((_, el) => {
    const title = $(el)
      .find('[data-testid="thumbnail-title"]')
      .first()
      .text()
      .trim();
    const artist = $(el).find('a[href^="/es/artist/"]').first().text().trim();
    if (title && artist) items.push({ title, artist });
  });

  return items.map((item, index) => ({ pos: index + 1, ...item }));
}

async function main(): Promise<void> {
  const historico = readJson<Historico>("historico.json");
  const artistasRastreados = readJson<string[]>("tracked-artists.json");
  const fechaHoy = getFechaBogota();

  // Conservamos cualquier entrada de HOY que no sea de estos dos charts
  // (por si el cron normal de Deezer/Billboard ya corrió hoy también).
  const entradasPrevias = (historico[fechaHoy] ?? []).filter(
    (e) => e.chartId !== CHART_ID_ARTISTAS && e.chartId !== CHART_ID_ALBUMES
  );

  const entradasHoy: HistoricoEntry[] = [...entradasPrevias];

  const rutaArtistas = path.join(RAW_DIR, "artistas.html");
  if (fs.existsSync(rutaArtistas)) {
    const html = fs.readFileSync(rutaArtistas, "utf-8");
    const topArtistas = parseArtistasHtml(html);
    console.log(`\n📊 artistas.html: ${topArtistas.length} artistas encontrados.`);

    for (const artista of artistasRastreados) {
      const match = topArtistas.find((a) => coincideArtista(a.name, artista));
      entradasHoy.push({
        artist: "",
        title: artista,
        chartId: CHART_ID_ARTISTAS,
        pos: match ? match.pos : null,
      });
      console.log(
        match ? `  ✓ ${artista}: #${match.pos}` : `  ✗ ${artista}: no encontrado`
      );
    }
  } else {
    console.log(
      `\n⏭️  No se encontró ${rutaArtistas}; se omite el chart de artistas hoy.`
    );
  }

  const rutaAlbumes = path.join(RAW_DIR, "albumes.html");
  if (fs.existsSync(rutaAlbumes)) {
    const html = fs.readFileSync(rutaAlbumes, "utf-8");
    const topAlbumes = parseAlbumesHtml(html);
    console.log(`\n📊 albumes.html: ${topAlbumes.length} álbumes encontrados.`);

    for (const artista of artistasRastreados) {
      const coincidencias = topAlbumes.filter((a) =>
        coincideArtista(a.artist, artista)
      );
      const mejor = coincidencias.sort((a, b) => a.pos - b.pos)[0];
      entradasHoy.push({
        artist: "",
        title: artista,
        chartId: CHART_ID_ALBUMES,
        pos: mejor ? mejor.pos : null,
        detail: mejor ? mejor.title : undefined,
      });
      console.log(
        mejor
          ? `  ✓ ${artista}: #${mejor.pos} (álbum: ${mejor.title})`
          : `  ✗ ${artista}: ningún álbum encontrado`
      );
    }
  } else {
    console.log(
      `\n⏭️  No se encontró ${rutaAlbumes}; se omite el chart de álbumes hoy.`
    );
  }

  historico[fechaHoy] = entradasHoy;
  writeJson("historico.json", historico);

  console.log(`\n✅ historico.json actualizado para ${fechaHoy}.`);
}

main().catch((err) => {
  console.error("❌ Error parseando el HTML:", err);
  process.exit(1);
});
