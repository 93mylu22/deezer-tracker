import fs from "fs";
import path from "path";
import { chromium } from "playwright";

/**
 * Este NO es el scraper final. Es un script de diagnóstico:
 * abre la página con un navegador headless, espera a que el JavaScript
 * termine de cargar las canciones, y guarda el HTML ya renderizado.
 *
 * Con ese HTML podemos identificar los selectores reales (clases CSS)
 * que usa la página para posición / título / artista, y así escribir
 * el parser definitivo en lib/billboard.ts.
 */

const URL = process.argv[2] ?? "https://billboard.com.co/billboard-hot-100/";
const ESPERA_MS = Number(process.argv[3] ?? 8000);

async function main(): Promise<void> {
  console.log(`Abriendo ${URL} ...`);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

    console.log(`Esperando ${ESPERA_MS}ms adicionales para que cargue el chart...`);
    await page.waitForTimeout(ESPERA_MS);

    const html = await page.content();

    const outDir = path.join(process.cwd(), "debug-output");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "billboard-render.html");
    fs.writeFileSync(outFile, html, "utf-8");

    console.log(`\n✅ HTML renderizado guardado en: ${outFile}`);
    console.log(`   Tamaño: ${(html.length / 1024).toFixed(1)} KB`);

    // Además, un resumen rápido en consola: buscamos todos los números
    // "sueltos" del 1 al 100 que aparezcan como texto de un elemento,
    // como pista rápida de dónde puede estar el ranking.
    const posiblesRankings = await page.evaluate(() => {
      const hallados: string[] = [];
      document.querySelectorAll("body *").forEach((el) => {
        if (el.children.length > 0) return;
        const texto = (el.textContent || "").trim();
        if (/^\d{1,3}$/.test(texto)) {
          hallados.push(`${el.tagName.toLowerCase()}.${el.className || "(sin clase)"} => "${texto}"`);
        }
      });
      return hallados.slice(0, 15);
    });

    console.log("\nPistas de posibles elementos de ranking (primeros 15):");
    posiblesRankings.forEach((p) => console.log("  " + p));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Error en el diagnóstico:", err);
  process.exit(1);
});
