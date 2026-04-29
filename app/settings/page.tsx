"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { Frame } from "../frames";
import { useFrames, setFrames, resetFrames } from "../lib/framesStore";
import { randomFrame, reshuffleStyle } from "../lib/randomStyle";

export default function SettingsPage() {
  const frames = useFrames();

  const totalDurationMs = useMemo(
    () => frames.reduce((sum, f) => sum + f.durationMs, 0),
    [frames],
  );

  const update = useCallback(
    (i: number, patch: Partial<Frame>) => {
      const next = frames.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
      setFrames(next);
    },
    [frames],
  );

  const remove = useCallback(
    (i: number) => {
      setFrames(frames.filter((_, idx) => idx !== i));
    },
    [frames],
  );

  const duplicate = useCallback(
    (i: number) => {
      const copy = { ...frames[i] };
      const next = [...frames.slice(0, i + 1), copy, ...frames.slice(i + 1)];
      setFrames(next);
    },
    [frames],
  );

  const move = useCallback(
    (i: number, delta: -1 | 1) => {
      const j = i + delta;
      if (j < 0 || j >= frames.length) return;
      const next = [...frames];
      [next[i], next[j]] = [next[j], next[i]];
      setFrames(next);
    },
    [frames],
  );

  const addCard = useCallback(() => {
    const next = [...frames, randomFrame("NEW", 220)];
    setFrames(next);
  }, [frames]);

  const reshuffleOne = useCallback(
    (i: number) => {
      const next = frames.map((f, idx) => (idx === i ? reshuffleStyle(f) : f));
      setFrames(next);
    },
    [frames],
  );

  const reshuffleAll = useCallback(() => {
    setFrames(frames.map(reshuffleStyle));
  }, [frames]);

  const setCount = useCallback(
    (count: number) => {
      const target = Math.max(0, Math.min(200, Math.floor(count)));
      if (target === frames.length) return;
      if (target < frames.length) {
        setFrames(frames.slice(0, target));
      } else {
        const additions: Frame[] = [];
        for (let i = frames.length; i < target; i++) {
          additions.push(randomFrame("NEW", 220));
        }
        setFrames([...frames, ...additions]);
      }
    },
    [frames],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-xs text-zinc-400">
              {frames.length} card{frames.length === 1 ? "" : "s"} ·{" "}
              {(totalDurationMs / 1000).toFixed(1)}s loop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reshuffleAll}
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/10"
            >
              Reshuffle styles
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Reset to the default 25 cards? Your edits will be lost.",
                  )
                ) {
                  resetFrames();
                }
              }}
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
            >
              Reset
            </button>
            <Link
              href="/"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6">
        <section className="mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <label className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400">Number of cards</span>
            <input
              type="number"
              min={0}
              max={200}
              value={frames.length}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 rounded border border-white/15 bg-black px-2 py-1 text-sm tabular-nums focus:border-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCard}
              className="ml-auto rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              + Add card
            </button>
          </label>
          <p className="mt-2 text-xs text-zinc-500">
            Adding a card auto-generates a random visual style. Use{" "}
            <em>Reshuffle</em> on a row to re-roll its look without changing
            the text.
          </p>
        </section>

        <ol className="space-y-2">
          {frames.map((frame, i) => (
            <li
              key={i}
              className="grid grid-cols-[2.5rem_1fr_5.5rem_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <span className="text-center font-mono text-xs text-zinc-500 tabular-nums">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              <input
                type="text"
                value={frame.text}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="card text"
                className="rounded border border-white/15 bg-black px-2 py-1.5 text-sm focus:border-white/40 focus:outline-none"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input
                  type="number"
                  min={50}
                  max={5000}
                  step={10}
                  value={frame.durationMs}
                  onChange={(e) =>
                    update(i, { durationMs: Number(e.target.value) || 0 })
                  }
                  className="w-16 rounded border border-white/15 bg-black px-1.5 py-1 text-right tabular-nums focus:border-white/40 focus:outline-none"
                />
                ms
              </label>
              <div className="flex items-center gap-0.5 text-zinc-400">
                <RowBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </RowBtn>
                <RowBtn
                  label="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === frames.length - 1}
                >
                  ↓
                </RowBtn>
                <RowBtn label="Reshuffle style" onClick={() => reshuffleOne(i)}>
                  ⤺
                </RowBtn>
                <RowBtn label="Duplicate" onClick={() => duplicate(i)}>
                  ⧉
                </RowBtn>
                <RowBtn
                  label="Delete"
                  onClick={() => remove(i)}
                  className="hover:text-red-400"
                >
                  ✕
                </RowBtn>
              </div>
            </li>
          ))}
        </ol>

        {frames.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
            No cards. Click <em>+ Add card</em> above to begin.
          </div>
        )}
      </main>
    </div>
  );
}

function RowBtn({
  children,
  onClick,
  label,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent ${className}`}
    >
      {children}
    </button>
  );
}
