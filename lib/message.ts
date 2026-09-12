import type { DiffResult } from "./diff";

/**
 * Construye el mensaje de WhatsApp para UN chart específico.
 * Si no hay canciones rastreadas presentes hoy, igual arma un mensaje
 * indicándolo (útil como referencia, aunque el botón de copiar se
 * deshabilita en ese caso desde el componente).
 */
export function buildMensajeChart(
  chartName: string,
  items: DiffResult[],
  fechaHoy: string | null
): string {
  if (!fechaHoy) {
    return "Aún no hay datos disponibles. Corre el cron primero.";
  }

  const lineas: string[] = ["Actualización de charts 💜"];

  if (items.length === 0) {
    lineas.push("");
    lineas.push(`Ninguna canción rastreada aparece hoy en ${chartName}.`);
  } else {
    lineas.push("");
    lineas.push(`${chartName}:`);
    for (const item of items) {
      const sufijo = item.change ? ` ${item.change}` : "";
      lineas.push(`* #${item.pos} ${item.title}${sufijo}`);
    }
  }

  lineas.push("");
  lineas.push("- *ARMY 🇨🇴 on Deezer*");

  return lineas.join("\n");
}
