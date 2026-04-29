"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Frame } from "../frames";
import { ExportButton } from "./ExportButton";

type Props = {
  paused: boolean;
  index: number;
  total: number;
  frames: Frame[];
  onTogglePause: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPauseRequest: () => void;
};

export function PlaybackControls(props: Props) {
  const {
    paused,
    index,
    total,
    frames,
    onTogglePause,
    onRestart,
    onPrev,
    onNext,
    onPauseRequest,
  } = props;
  const [visible, setVisible] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // While exporting, we render visibility from `exporting` directly in the
    // className below — skip the auto-hide subscription entirely so it doesn't
    // race with the export UI.
    if (exporting) return;
    let timeout: number | undefined;
    const show = () => {
      setVisible(true);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setVisible(false), 2500);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
    };
  }, [exporting]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transition-opacity duration-300 ${
        visible || paused || exporting ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1.5 font-mono text-xs text-white backdrop-blur-md">
        <Btn label="Restart (r)" onClick={onRestart}>
          <RestartIcon />
        </Btn>
        <Btn label="Previous" onClick={onPrev}>
          <PrevIcon />
        </Btn>
        <Btn
          label={paused ? "Play (space)" : "Pause (space)"}
          onClick={onTogglePause}
          wide
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </Btn>
        <Btn label="Next" onClick={onNext}>
          <NextIcon />
        </Btn>
        <span className="px-3 tabular-nums text-white/60">
          {total === 0 ? "0 / 0" : `${index + 1} / ${total}`}
        </span>
        <ExportButton
          frames={frames}
          onExportingChange={setExporting}
          onPauseRequest={onPauseRequest}
        />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-8 items-center gap-1.5 rounded-full px-3 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <GearIcon />
          <span>settings</span>
        </Link>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 ${
        wide ? "w-10" : "w-8"
      } items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white`}
    >
      {children}
    </button>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 5v14l-11-7 11-7z" />
      <rect x="5" y="5" width="2" height="14" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 5v14l11-7L5 5z" />
      <rect x="17" y="5" width="2" height="14" />
    </svg>
  );
}
function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
