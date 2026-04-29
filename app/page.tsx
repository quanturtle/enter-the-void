"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { type Frame } from "./frames";
import { useFrames } from "./lib/framesStore";
import { FlashCard } from "./components/FlashCard";
import { PlaybackControls } from "./components/PlaybackControls";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduceMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCE_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReduceMotion() {
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const frames = useFrames();
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    () => false,
  );

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(done);
    } else {
      done();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveFrames: Frame[] = useMemo(() => {
    if (!reduceMotion) return frames;
    return frames.map((f) => ({
      ...f,
      durationMs: Math.max(1500, f.durationMs),
      rotateDeg: 0,
    }));
  }, [frames, reduceMotion]);

  const total = effectiveFrames.length;
  const safeIndex = total > 0 ? index % total : 0;

  useEffect(() => {
    if (!ready || paused || total === 0) return;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, effectiveFrames[safeIndex].durationMs);
    return () => window.clearTimeout(t);
  }, [safeIndex, paused, ready, effectiveFrames, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        setIndex(0);
        setPaused(false);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "n") {
        setPaused(true);
        setIndex((i) => (total > 0 ? (i + 1) % total : 0));
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "b") {
        setPaused(true);
        setIndex((i) => (total > 0 ? (i - 1 + total) % total : 0));
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  return (
    <>
      {ready && total > 0 ? (
        <FlashCard frame={effectiveFrames[safeIndex]} />
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-black text-white/60 font-mono text-sm">
          {ready && total === 0 ? (
            <div className="text-center">
              <div className="mb-2">no cards yet.</div>
              <a href="/settings" className="underline hover:text-white">
                open settings →
              </a>
            </div>
          ) : null}
        </div>
      )}
      <PlaybackControls
        paused={paused}
        index={safeIndex}
        total={total}
        frames={frames}
        onTogglePause={() => setPaused((p) => !p)}
        onRestart={() => {
          setIndex(0);
          setPaused(false);
        }}
        onPrev={() => {
          if (total === 0) return;
          setPaused(true);
          setIndex((i) => (i - 1 + total) % total);
        }}
        onNext={() => {
          if (total === 0) return;
          setPaused(true);
          setIndex((i) => (i + 1) % total);
        }}
        onPauseRequest={() => setPaused(true)}
      />
    </>
  );
}
