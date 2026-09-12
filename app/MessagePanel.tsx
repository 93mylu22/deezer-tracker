"use client";

import { useState } from "react";
import type { DiffResult } from "@/lib/diff";

interface Chart {
  id: string;
  name: string;
  playlistId: string;
  url: string;
}

export interface ChartGroup {
  chart: Chart;
  items: DiffResult[];
}

function buildMensaje(porChart: ChartGroup[], fechaHoy: string | null): string {
  if (!fechaHoy) return "Aún no hay datos disponibles. Corre el cron primero.";

  const lineas: string[] = ["Actualización de charts 💜"];
  let algunaCancion = false;

  for (const { chart, items } of porChart) {
    if (items.length === 0) continue;
    algunaCancion = true;
    lineas.push("");
    lineas.push(`${chart.name}:`);
    for (const item of items) {
      const sufijo = item.change ? ` ${item.change}` : "";
      lineas.push(`* #${item.pos} ${item.title}${sufijo}`);
    }
  }

  if (!algunaCancion) {
    lineas.push("");
    lineas.push("Ninguna canción rastreada aparece hoy en los charts.");
  }

  lineas.push("");
  lineas.push("- *ARMY 🇨🇴 on Deezer*");

  return lineas.join("\n");
}

export default function MessagePanel({
  porChart,
  fechaHoy,
}: {
  porChart: ChartGroup[];
  fechaHoy: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = buildMensaje(porChart, fechaHoy);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-3 font-medium text-white">Mensaje para WhatsApp</h2>
      <pre className="whitespace-pre-wrap rounded-xl bg-[#0F0C1B] p-3 text-sm leading-relaxed text-[#E4DCFF]">
        {mensaje}
      </pre>
      <button
        onClick={copiar}
        className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        {copiado ? "Copiado ✓" : "Copiar mensaje"}
      </button>
    </section>
  );
}
