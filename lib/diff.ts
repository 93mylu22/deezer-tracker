export interface HistoricoEntry {
  artist: string;
  title: string;
  chartId: string;
  pos: number | null;
  /** Info adicional de contexto (ej. qué álbum específico cargó), no afecta el matching. */
  detail?: string;
}

export type Historico = Record<string, HistoricoEntry[]>;

export interface DiffResult {
  artist: string;
  title: string;
  chartId: string;
  pos: number;
  change: string;
  detail?: string;
}

export interface EstadoChart {
  /** Fecha (YYYY-MM-DD) de la última vez que este chart tuvo datos registrados. */
  fecha: string | null;
  diffs: DiffResult[];
}

/**
 * Calcula el texto de cambio de posición entre una fecha y la anterior.
 * - Sin registro anterior (o sin posición) y hoy con posición => "(RE)" sin emoji.
 * - Subió de posición (número más bajo es mejor) => "(+N)⬆️"
 * - Bajó de posición => "(-N)⬇️"
 * - Se mantuvo igual => "(=)"
 */
export function diffPos(hoy: number, ayer: number | null | undefined): string {
  if (ayer === null || ayer === undefined) {
    return "(RE)";
  }
  const delta = ayer - hoy;
  if (delta > 0) return `(+${delta}) ⬆️`;
  if (delta < 0) return `(-${delta}) ⬇️`;
  return "(=)";
}

/**
 * Calcula el estado actual de UN chart específico, sin asumir que se
 * actualiza todos los días: busca la fecha más reciente en la que ese
 * chart tenga registros, y la compara contra la fecha anterior a esa
 * (no contra "ayer" en términos de calendario, sino contra el registro
 * previo real de ese mismo chart). Esto permite que charts semanales
 * (como Billboard) y diarios (como Deezer) convivan en el mismo histórico
 * sin que uno deje vacío el panel del otro.
 */
export function buildEstadoChart(
  chartId: string,
  historico: Historico
): EstadoChart {
  const fechasConDatos = Object.keys(historico)
    .filter((fecha) => (historico[fecha] ?? []).some((e) => e.chartId === chartId))
    .sort();

  if (fechasConDatos.length === 0) {
    return { fecha: null, diffs: [] };
  }

  const fechaActual = fechasConDatos[fechasConDatos.length - 1];
  const fechaAnterior = fechasConDatos[fechasConDatos.length - 2] ?? null;

  const entradasActuales = (historico[fechaActual] ?? []).filter(
    (e) => e.chartId === chartId
  );
  const entradasAnteriores = fechaAnterior
    ? (historico[fechaAnterior] ?? []).filter((e) => e.chartId === chartId)
    : [];

  const diffs: DiffResult[] = [];

  for (const entry of entradasActuales) {
    if (entry.pos === null) continue;

    const entryAnterior = entradasAnteriores.find(
      (a) => a.artist === entry.artist && a.title === entry.title
    );

    const change = diffPos(entry.pos, entryAnterior ? entryAnterior.pos : null);

    diffs.push({
      artist: entry.artist,
      title: entry.title,
      chartId,
      pos: entry.pos,
      change,
      detail: entry.detail,
    });
  }

  return {
    fecha: fechaActual,
    diffs: diffs.sort((a, b) => a.pos - b.pos),
  };
}
