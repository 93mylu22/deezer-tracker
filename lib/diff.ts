export interface HistoricoEntry {
  artist: string;
  title: string;
  chartId: string;
  pos: number | null;
}

export type Historico = Record<string, HistoricoEntry[]>;

export interface DiffResult {
  artist: string;
  title: string;
  chartId: string;
  pos: number;
  change: string;
}

/**
 * Calcula el texto de cambio de posición entre hoy y ayer.
 * - Ayer sin registro (o sin posición) y hoy con posición => "(RE)" sin emoji.
 * - Subió de posición (número más bajo es mejor) => "(+N)⬆️"
 * - Bajó de posición => "(-N)⬇️"
 * - Se mantuvo igual => "(=)"
 */
export function diffPos(hoy: number, ayer: number | null | undefined): string {
  if (ayer === null || ayer === undefined) {
    return "(RE)";
  }
  const delta = ayer - hoy;
  if (delta > 0) return `(+${delta})⬆️`;
  if (delta < 0) return `(${delta})⬇️`;
  return "(=)";
}

/**
 * Construye la lista de diffs para una fecha dada, comparando contra
 * el día anterior disponible en el histórico. Solo incluye canciones
 * que SÍ tienen posición hoy (las que no aparecen en el chart se omiten).
 */
export function buildDiffs(
  fechaHoy: string,
  historico: Historico
): DiffResult[] {
  const hoy = historico[fechaHoy] ?? [];

  const fechaAnterior = Object.keys(historico)
    .filter((f) => f < fechaHoy)
    .sort()
    .pop();

  const ayer = fechaAnterior ? historico[fechaAnterior] ?? [] : [];

  const resultados: DiffResult[] = [];

  for (const entry of hoy) {
    if (entry.pos === null) continue;

    const entryAyer = ayer.find(
      (a) =>
        a.artist === entry.artist &&
        a.title === entry.title &&
        a.chartId === entry.chartId
    );

    const change = diffPos(entry.pos, entryAyer ? entryAyer.pos : null);

    resultados.push({
      artist: entry.artist,
      title: entry.title,
      chartId: entry.chartId,
      pos: entry.pos,
      change,
    });
  }

  return resultados.sort((a, b) => a.pos - b.pos);
}
