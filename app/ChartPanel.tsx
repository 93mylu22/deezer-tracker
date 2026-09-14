"use client";

import { useRef, useState } from "react";
import type { DiffResult } from "@/lib/diff";
import { buildMensajeChart } from "@/lib/message";

interface Chart {
  id: string;
  name: string;
  playlistId: string;
  url: string;
}

type EstadoCopiado = "idle" | "copiado" | "error";

function colorDeCambio(change: string): string {
  if (change.includes("⬆️")) return "text-up";
  if (change.includes("⬇️")) return "text-down";
  if (change === "(RE)") return "text-accentLight";
  return "text-muted";
}

/**
 * Copia texto al portapapeles con fallback para navegadores o contextos
 * donde navigator.clipboard no está disponible o falla en silencio.
 */
async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // sigue al fallback de abajo
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function ChartPanel({
  chart,
  items,
  fechaHoy,
}: {
  chart: Chart;
  items: DiffResult[];
  fechaHoy: string | null;
}) {
  const [estado, setEstado] = useState<EstadoCopiado>("idle");
  const preRef = useRef<HTMLPreElement>(null);
  const mensaje = buildMensajeChart(chart.name, items, fechaHoy);
  const hayCanciones = items.length > 0;

  async function manejarCopiar() {
    if (!hayCanciones) return;
    const ok = await copiarAlPortapapeles(mensaje);
    setEstado(ok ? "copiado" : "error");
    setTimeout(() => setEstado("idle"), 2500);
  }

  function seleccionarTextoManual() {
    if (!preRef.current || typeof window === "undefined") return;
    const seleccion = window.getSelection();
    const rango = document.createRange();
    rango.selectNodeContents(preRef.current);
    seleccion?.removeAllRanges();
    seleccion?.addRange(rango);
  }

  const etiquetaBoton =
    estado === "copiado"
      ? "Copiado ✓"
      : estado === "error"
      ? "No se pudo copiar — toca el texto"
      : "Copiar mensaje";

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-white sm:text-base">
          {chart.name}
        </h2>
        
          href={chart.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-[#9B7BFF] underline underline-offset-2"
        >
          Ver en Deezer
        </a>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {items.length === 0 && (
          <li className="py-3 text-sm text-muted">
            Ninguna canción rastreada está en este chart hoy.
          </li>
        )}
        {items.map((item) => (
          <li
            key={`${item.artist}-${item.title}`}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {item.title}
              </p>
              <p className="truncate text-xs text-muted">{item.artist}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-lg bg-surfaceRaised px-2 py-1 font-mono text-sm text-accentLight">
                #{item.pos}
              </span>
              <span
                className={`text-xs font-medium ${colorDeCambio(
                  item.change
                )}`}
              >
                {item.change}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={manejarCopiar}
          disabled={!hayCanciones}
          className={`w-full rounded-xl py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
            estado === "error" ? "bg-down" : "bg-accent"
          }`}
        >
          {hayCanciones ? etiquetaBoton : "Sin canciones para copiar"}
        </button>
        {estado === "error" && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">
              Tu navegador bloqueó el copiado automático. Toca el mensaje de
              abajo para seleccionar el texto y cópialo manualmente.
            </p>
            <pre
              ref={preRef}
              onClick={seleccionarTextoManual}
              className="cursor-text select-all whitespace-pre-wrap rounded-xl bg-[#0F0C1B] p-3 text-sm leading-relaxed text-[#E4DCFF]"
            >
              {mensaje}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
