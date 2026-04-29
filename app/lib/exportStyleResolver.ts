"use client";

import type { Frame } from "../frames";

export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;

export type ResolvedStyle = {
  bg: string;
  fg: string;
  fontFamily: string;
  fontWeight: string;
  fontSizePx: number;
  fontStyle: string;
  letterSpacingPx: number;
  paddingPx: { top: number; right: number; bottom: number; left: number };
  textTransform: string;
  alignH: "start" | "center" | "end";
  alignV: "start" | "center" | "end";
};

let probeRoot: HTMLDivElement | null = null;

function ensureProbe(): HTMLDivElement {
  if (probeRoot && probeRoot.isConnected) return probeRoot;
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = [
    "position: fixed",
    "top: -99999px",
    "left: 0",
    `width: ${EXPORT_WIDTH}px`,
    `height: ${EXPORT_HEIGHT}px`,
    "pointer-events: none",
    "contain: strict",
    "visibility: hidden",
  ].join(";");
  document.body.appendChild(root);
  probeRoot = root;
  return root;
}

export function disposeProbe(): void {
  if (probeRoot) {
    probeRoot.remove();
    probeRoot = null;
  }
}

function parseArbitrary(cls: string | undefined, prefix: string): string | null {
  if (!cls) return null;
  const re = new RegExp(`(?:^|\\s)${prefix}-\\[([^\\]]+)\\](?:\\s|$)`);
  const m = cls.match(re);
  return m ? m[1] : null;
}

function lengthToPx(
  raw: string,
  baseFontPx: number,
  viewportW: number,
  viewportH: number,
): number | null {
  const v = raw.trim();
  if (v.endsWith("vw")) return (parseFloat(v) / 100) * viewportW;
  if (v.endsWith("vh")) return (parseFloat(v) / 100) * viewportH;
  if (v.endsWith("vmin"))
    return (parseFloat(v) / 100) * Math.min(viewportW, viewportH);
  if (v.endsWith("vmax"))
    return (parseFloat(v) / 100) * Math.max(viewportW, viewportH);
  if (v.endsWith("rem")) return parseFloat(v) * 16;
  if (v.endsWith("em")) return parseFloat(v) * baseFontPx;
  if (v.endsWith("px")) return parseFloat(v);
  if (/^-?[\d.]+$/.test(v)) return parseFloat(v) * baseFontPx;
  return null;
}

function alignFromCss(value: string): "start" | "center" | "end" {
  if (value.includes("start")) return "start";
  if (value.includes("end")) return "end";
  return "center";
}

export function resolveFrameStyle(frame: Frame): ResolvedStyle {
  const root = ensureProbe();

  const wrapClasses = [
    "flex overflow-hidden w-full h-full",
    frame.alignClass ?? "items-center justify-center",
    frame.bgClass,
    frame.paddingClass ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const spanClasses = [
    frame.fontClass,
    frame.sizeClass,
    frame.weightClass ?? "",
    frame.colorClass,
    frame.trackingClass ?? "",
    frame.transformClass ?? "",
    frame.italic ? "italic" : "",
    "inline-block whitespace-nowrap leading-none",
  ]
    .filter(Boolean)
    .join(" ");

  const wrap = document.createElement("div");
  wrap.className = wrapClasses;
  const span = document.createElement("span");
  span.className = spanClasses;
  span.textContent = frame.text || " ";
  wrap.appendChild(span);
  root.replaceChildren(wrap);

  const wrapCs = getComputedStyle(wrap);
  const cs = getComputedStyle(span);

  let fontSizePx = parseFloat(cs.fontSize) || 16;
  const arbSize = parseArbitrary(frame.sizeClass, "text");
  if (arbSize) {
    const px = lengthToPx(arbSize, fontSizePx, EXPORT_WIDTH, EXPORT_HEIGHT);
    if (px != null) fontSizePx = px;
  }

  let letterSpacingPx =
    cs.letterSpacing === "normal"
      ? 0
      : parseFloat(cs.letterSpacing) || 0;
  const arbTrack = parseArbitrary(frame.trackingClass, "tracking");
  if (arbTrack) {
    const px = lengthToPx(arbTrack, fontSizePx, EXPORT_WIDTH, EXPORT_HEIGHT);
    if (px != null) letterSpacingPx = px;
  }

  const paddingPx = {
    top: parseFloat(wrapCs.paddingTop) || 0,
    right: parseFloat(wrapCs.paddingRight) || 0,
    bottom: parseFloat(wrapCs.paddingBottom) || 0,
    left: parseFloat(wrapCs.paddingLeft) || 0,
  };

  return {
    bg: wrapCs.backgroundColor,
    fg: cs.color,
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontSizePx,
    fontStyle: cs.fontStyle,
    letterSpacingPx,
    paddingPx,
    textTransform: cs.textTransform,
    alignH: alignFromCss(wrapCs.justifyContent),
    alignV: alignFromCss(wrapCs.alignItems),
  };
}
