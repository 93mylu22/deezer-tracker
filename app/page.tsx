import fs from "fs";
import path from "path";
import { buildEstadoChart, type Historico } from "@/lib/diff";
import ChartPanel from "./ChartPanel";

interface Chart {
  id: string;
  name: string;
  playlistId?: string;
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
  const fechaGeneral = fechas.length > 0 ? fechas[fechas.length - 1] : null;

  return (
    <main className="min-h-screen bg-bg px-4 py-6 text-[#F3EFFF] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted">
              music-tracker-co
            </p>
            <h1 className="mt-1 text-xl font-semibold leading-tight text-accentLight sm:text-3xl">
              Seguimiento diario de charts
            </h1>
          </div>
          <span className="mt-1 shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted">
            {fechaGeneral ?? "sin datos"}
          </span>
        </header>

        {!fechaGeneral && (
          <p className="mb-6 rounded-2xl border border-border bg-surface p-4 text-sm text-[#B4ADD1]">
            Aún no hay datos. Corre <code>npm run cron</code> localmente o
            espera al primer cron automático.
          </p>
        )}

        <div className="space-y-4 sm:space-y-5">
          {charts.map((chart) => {
            const estado = buildEstadoChart(chart.id, historico);
            return (
              <ChartPanel
                key={chart.id}
                chart={chart}
                items={estado.diffs}
                fechaHoy={estado.fecha}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
