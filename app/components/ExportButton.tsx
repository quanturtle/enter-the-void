"use client";

import { useEffect, useRef, useState } from "react";
import type { Frame } from "../frames";

type Format = "gif" | "mp4";

type Props = {
  frames: Frame[];
  onExportingChange?: (exporting: boolean) => void;
  onPauseRequest?: () => void;
};

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButton({
  frames,
  onExportingChange,
  onPauseRequest,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onExportingChange?.(busy !== null);
  }, [busy, onExportingChange]);

  useEffect(() => {
    if (!open || busy) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, busy]);

  async function runExport(format: Format) {
    if (busy) return;
    if (frames.length === 0) {
      setError("No frames to export.");
      return;
    }
    setError(null);
    setStatusNote(null);
    setBusy(format);
    setProgress(0);
    onPauseRequest?.();

    try {
      if (format === "gif") {
        const { encodeGif } = await import("../lib/exportGif");
        const blob = await encodeGif(frames, setProgress);
        downloadBlob(blob, `lettering-${timestamp()}.gif`);
      } else {
        const { encodeVideo } = await import("../lib/exportVideo");
        const result = await encodeVideo(frames, setProgress);
        if (result.ext === "webm") {
          setStatusNote(
            "MP4 not supported in this browser; saved as WebM instead.",
          );
        }
        downloadBlob(result.blob, `lettering-${timestamp()}.${result.ext}`);
      }
      // close popover after success unless we left a note for the user
      if (!statusNote) setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  const pct = Math.round(progress * 100);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Export"
        title="Export"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <DownloadIcon />
        <span>export</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Export options"
          className="absolute bottom-[calc(100%+8px)] right-0 w-56 rounded-lg border border-white/10 bg-black/85 p-2 text-xs text-white shadow-xl backdrop-blur-md"
        >
          {busy ? (
            <div className="space-y-2 px-2 py-1">
              <div className="flex items-center justify-between">
                <span className="text-white/80">
                  encoding {busy.toUpperCase()}…
                </span>
                <span className="tabular-nums text-white/60">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-white/80 transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-white/40">
                {busy === "gif" ? "1920x1080 — large file." : "1920x1080 H.264."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <FormatRow
                label="GIF"
                hint="universal, larger file"
                onClick={() => runExport("gif")}
              />
              <FormatRow
                label="MP4"
                hint="H.264, smaller file"
                onClick={() => runExport("mp4")}
              />
              {statusNote ? (
                <p className="px-2 pt-1 text-[10px] text-amber-200/80">
                  {statusNote}
                </p>
              ) : null}
              {error ? (
                <p className="px-2 pt-1 text-[10px] text-red-300">{error}</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FormatRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/10"
    >
      <span className="font-mono text-white">{label}</span>
      <span className="text-white/40">{hint}</span>
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v12" />
      <path d="m6 12 6 6 6-6" />
      <path d="M5 20h14" />
    </svg>
  );
}
