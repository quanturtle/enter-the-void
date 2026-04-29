import type { Frame } from "../frames";

const FONTS = [
  "font-bebas",
  "font-anton",
  "font-playfair",
  "font-inter",
  "font-major-mono",
  "font-space-mono",
  "font-bungee",
  "font-caveat",
] as const;

const SIZES_HUGE = [
  "text-[40vw]",
  "text-[35vw]",
  "text-[30vw]",
  "text-[28vw]",
  "text-[26vw]",
  "text-[22vw]",
] as const;

const SIZES_LARGE = [
  "text-[20vw]",
  "text-[18vw]",
  "text-[14vw]",
  "text-[12vw]",
  "text-[10vw]",
] as const;

const SIZES_MEDIUM = ["text-9xl", "text-7xl", "text-5xl", "text-4xl"] as const;

const SIZES_SMALL = ["text-3xl", "text-2xl"] as const;

const COLOR_PAIRS: Array<{ text: string; bg: string }> = [
  { text: "text-white", bg: "bg-black" },
  { text: "text-black", bg: "bg-white" },
  { text: "text-yellow-300", bg: "bg-black" },
  { text: "text-black", bg: "bg-yellow-300" },
  { text: "text-white", bg: "bg-red-600" },
  { text: "text-yellow-300", bg: "bg-red-600" },
  { text: "text-white", bg: "bg-blue-700" },
  { text: "text-black", bg: "bg-lime-400" },
  { text: "text-lime-400", bg: "bg-black" },
  { text: "text-pink-400", bg: "bg-black" },
  { text: "text-white", bg: "bg-pink-400" },
  { text: "text-red-600", bg: "bg-yellow-300" },
];

const TRANSFORMS = ["uppercase", "lowercase", "normal-case"] as const;

const TRACKING = [
  undefined,
  "tracking-tight",
  "tracking-tighter",
  "tracking-widest",
  "tracking-[0.3em]",
  "tracking-[0.4em]",
  "tracking-[0.5em]",
  "tracking-[0.6em]",
] as const;

const ALIGNS = [
  undefined,
  undefined,
  undefined,
  "items-start justify-start",
  "items-start justify-end",
  "items-end justify-start",
  "items-end justify-end",
] as const;

const PADDINGS = ["p-8", "p-10", "p-12", "p-16"] as const;

const ROTATIONS = [0, 0, 0, 0, -8, 8, -12, 12, -4, 4, -15, 15, 90] as const;

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function pickSizeFor(text: string): string {
  const len = text.trim().length;
  if (len <= 1) return pick(SIZES_HUGE);
  if (len <= 4) return pick(SIZES_HUGE);
  if (len <= 8) return pick(SIZES_LARGE);
  if (len <= 14) return pick([...SIZES_LARGE, ...SIZES_MEDIUM]);
  return pick(SIZES_SMALL);
}

export function randomStyleFor(text: string): Omit<Frame, "text" | "durationMs"> {
  const pair = pick(COLOR_PAIRS);
  const align = pick(ALIGNS);
  const style: Omit<Frame, "text" | "durationMs"> = {
    fontClass: pick(FONTS),
    sizeClass: pickSizeFor(text),
    colorClass: pair.text,
    bgClass: pair.bg,
    transformClass: pick(TRANSFORMS),
  };
  const tracking = pick(TRACKING);
  if (tracking) style.trackingClass = tracking;
  if (align) {
    style.alignClass = align;
    style.paddingClass = pick(PADDINGS);
  }
  const rot = pick(ROTATIONS);
  if (rot) style.rotateDeg = rot;
  if (Math.random() < 0.15) style.italic = true;
  if (Math.random() < 0.08) style.underline = true;
  if (Math.random() < 0.06) style.strokeOnly = true;
  if (Math.random() < 0.05) style.blendDifference = true;
  return style;
}

export function randomFrame(text: string, durationMs = 220): Frame {
  return { text, durationMs, ...randomStyleFor(text) };
}

export function reshuffleStyle(frame: Frame): Frame {
  return { text: frame.text, durationMs: frame.durationMs, ...randomStyleFor(frame.text) };
}
