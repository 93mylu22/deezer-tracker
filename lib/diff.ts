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
