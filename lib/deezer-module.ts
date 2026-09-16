import { chromium } from "playwright";

export interface DeezerModuleAlbumResult {
  pos: number;
  artist: string;
  title: string;
}

export interface DeezerModuleArtistResult {
  pos: number;
  name: string;
}

/**
 * Milisegundos de espera adicional tras la carga inicial del DOM, para
 * darle tiempo al JavaScript del sitio a poblar la cuadrícula de álbumes.
 */
const ESPERA_EXTRA_MS = 5000;

/**
 * Trae los álbumes de un módulo de canal de Deezer (páginas tipo
 * deezer.com/es/channels/module/<uuid>), que no tienen equivalente en la
 * API pública y se renderizan enteramente vía JavaScript. La posición se
 * infiere del orden en que aparecen los álbumes en la página (no hay un
 * número de posición explícito en el HTML).
 */
export async function getDeezerModuleAlbums(
  url: string
): Promise<DeezerModuleAlbumResult[]> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page
      .waitForSelector('[data-testid="album_thumbnail"]', { timeout: 30000 })
      .catch(() => {
        // seguimos igual: la espera fija de abajo es el respaldo
      });

    await page.waitForTimeout(ESPERA_EXTRA_MS);

    const items = await page.evaluate(() => {
      const tarjetas = Array.from(
        document.querySelectorAll('[data-testid="album_thumbnail"]')
      );
      return tarjetas.map((tarjeta) => {
        const title =
          tarjeta
            .querySelector('[data-testid="thumbnail-title"]')
            ?.textContent?.trim() ?? "";
        const artist =
          tarjeta
            .querySelector('a[href^="/es/artist/"]')
            ?.textContent?.trim() ?? "";
        return { title, artist };
      });
    });

    return items
      .map((item, index) => ({
        pos: index + 1,
        artist: item.artist,
        title: item.title,
      }))
      .filter((item) => item.title !== "" && item.artist !== "");
  } finally {
    await browser.close();
  }
}

/**
 * Trae los artistas de un módulo de canal de Deezer (misma lógica que
 * getDeezerModuleAlbums, pero el nombre del artista viene directo en
 * [data-testid="thumbnail-title"], sin necesidad de un selector aparte).
 */
export async function getDeezerModuleArtists(
  url: string
): Promise<DeezerModuleArtistResult[]> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page
      .waitForSelector('[data-testid="artist_thumbnail"]', { timeout: 30000 })
      .catch(() => {
        // seguimos igual: la espera fija de abajo es el respaldo
      });

    await page.waitForTimeout(ESPERA_EXTRA_MS);

    const nombres = await page.evaluate(() => {
      const tarjetas = Array.from(
        document.querySelectorAll('[data-testid="artist_thumbnail"]')
      );
      return tarjetas.map(
        (tarjeta) =>
          tarjeta
            .querySelector('[data-testid="thumbnail-title"]')
            ?.textContent?.trim() ?? ""
      );
    });

    return nombres
      .map((name, index) => ({ pos: index + 1, name }))
      .filter((item) => item.name !== "");
  } finally {
    await browser.close();
  }
}
