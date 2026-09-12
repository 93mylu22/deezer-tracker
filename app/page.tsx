import fs from "fs";
import path from "path";
import { buildDiffs, type DiffResult, type Historico } from "@/lib/diff";
import MessagePanel, { type ChartGroup } from "./MessagePanel";

interface Chart {
  id: string;
  name: string;
  playlistId: string;
  url: string;
}

function readData(): { charts: Chart[]; historico: Historico } {
  const dataDir = path.join(process.cwd(), "data");
  const charts: Chart[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "charts.json"), "utf-8")
  );
  const historico: Historico = JSON.parse(
    fs.readFileSync(path.join(dataDir, "historico.json"), "utf-8")
  );
  return { charts, historico };
}

export default function Home() {
  const { charts, historico } = readData();

  const fechas = Object.keys(historico).sort();
  const fechaHoy = fechas.length > 0 ? fechas[fechas.length - 1] : null;
  const diffs: DiffResult[] = fechaHoy ? buildDiffs(fechaHoy, historico) : [];

  const porChart: ChartGroup[] = charts.map((chart) => ({
    chart,
    items: diffs.filter((d) => d.chartId === chart.id),
  }));

  return (
    <main className="min-h-screen px-4 py-8 text-[#F3EFFF] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-md sm:max-w-lg">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wide text-muted">
            deezer-tracker
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-accentLight sm:text-3xl">
            Seguimiento diario de charts
          </h1>
          <p className="mt-2 text-sm text-[#B4ADD1]">
            {fechaHoy
              ? `Última actualización: ${fechaHoy}`
              : "Aún no hay datos. Corre 'npm run cron' o espera al primer cron automático."}
          </p>
        </header>

        {porChart.map(({ chart, items }) => (
          <section
            key={chart.id}
            className="mb-6 rounded-2xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium text-white">{chart.name}</h2>
              <a
                href={chart.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-[#9B7BFF] underline underline-offset-2"
              >
                Ver en Deezer
              </a>
            </div>
            <ul className="mt-3 space-y-2">
              {items.length === 0 && (
                <li className="text-sm text-muted">
                  Ninguna canción rastreada está en este chart hoy.
                </li>
              )}
              {items.map((item) => (
                <li
                  key={`${item.artist}-${item.title}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {item.title}{" "}
                    <span className="text-muted">— {item.artist}</span>
                  </span>
                  <span className="font-mono text-accentLight">
                    #{item.pos} {item.change}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <MessagePanel porChart={porChart} fechaHoy={fechaHoy} />
      </div>
    </main>
  );
}
