import { chromium } from "playwright";

export interface BillboardTrackResult {
  pos: number;
  artist: string;
  title: string;
}

/**
 * Milisegundos de espera adicional tras la carga inicial del DOM,
 * para darle tiempo al JavaScript del sitio a poblar la lista de
 * canciones (elementos .chart-card).
 */
const ESPERA_EXTRA_MS = 5000;

const MESES_ES: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const DIAS_ISO: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

/** Fecha en formato YYYY-MM-DD, zona horaria Bogotá, con offset opcional en días. */
function getFechaBogotaISO(offsetDias = 0): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const momento = new Date(Date.now() + offsetDias * 24 * 60 * 60 * 1000);
  return fmt.format(momento);
}

/** Fecha (YYYY-MM-DD) del lunes de la semana actual, según hora Bogotá. */
function getFechaLunesActualBogota(): string {
  const nombreDia = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "long",
  }).format(new Date());
  const diaISO = DIAS_ISO[nombreDia] ?? 1;
  const offsetDias = -(diaISO - 1);
  return getFechaBogotaISO(offsetDias);
}

/**
 * Convierte un texto tipo "SEMANA DEL 7 DE SEPTIEMBRE, 2026" a "2026-09-07".
 * Devuelve null si no logra reconocer el formato.
 */
function parseFechaBadge(texto: string): string | null {
  const match = /(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÑ]+),?\s+(\d{4})/i.exec(texto);
  if (!match) return null;

  const [, diaStr, mesStr, anioStr] = match;
  const mes = MESES_ES[mesStr.toLowerCase()];
  if (!mes) return null;

  const dia = diaStr.padStart(2, "0");
  return `${anioStr}-${mes}-${dia}`;
}

/**
 * Trae el chart de una página de Billboard (o cualquier página que use
 * la misma estructura .chart-card / .rank-number / .track-title / .artist-link)
 * renderizando el JavaScript con un navegador headless, ya que estos charts
 * no vienen en el HTML inicial.
 *
 * Antes de devolver los datos, valida que el ".week-badge" de la página
 * corresponda al lunes de la semana ACTUAL (hora Bogotá). Si el chart
 * todavía no se actualizó a la semana en curso, lanza un error para que
 * el cron descarte este resultado en vez de guardarlo como si fuera de hoy.
 */
export async function getBillboardChart(
  url: string
): Promise<BillboardTrackResult[]> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page
      .waitForSelector(".chart-card", { timeout: 30000 })
      .catch(() => {
        // seguimos igual: la espera fija de abajo es el respaldo
      });

    await page.waitForTimeout(ESPERA_EXTRA_MS);

    const { items, badgeTexto } = await page.evaluate(() => {
      const tarjetas = Array.from(document.querySelectorAll(".chart-card"));
      const filas = tarjetas.map((tarjeta) => {
        const rankTexto =
          tarjeta.querySelector(".rank-number")?.textContent?.trim() ?? "";
        const title =
          tarjeta.querySelector(".track-title")?.textContent?.trim() ?? "";
        const artist =
          tarjeta.querySelector(".artist-link")?.textContent?.trim() ?? "";
        return { rankTexto, title, artist };
      });

      const badge =
        document.querySelector(".week-badge")?.textContent?.trim() ?? "";

      return { items: filas, badgeTexto: badge };
    });

    const fechaBadge = parseFechaBadge(badgeTexto);
    const fechaLunesActual = getFechaLunesActualBogota();

    if (!fechaBadge) {
      throw new Error(
        `No se pudo leer la fecha del ".week-badge" (texto encontrado: "${badgeTexto}").`
      );
    }

    if (fechaBadge !== fechaLunesActual) {
      throw new Error(
        `El chart todavía no se actualizó a la semana actual. ` +
          `Badge dice "${fechaBadge}", se esperaba la semana del "${fechaLunesActual}".`
      );
    }

    return items
      .map(({ rankTexto, title, artist }) => ({
        pos: parseInt(rankTexto, 10),
        title,
        artist,
      }))
      .filter(
        (item) => !Number.isNaN(item.pos) && item.title !== "" && item.artist !== ""
      );
  } finally {
    await browser.close();
  }
}
