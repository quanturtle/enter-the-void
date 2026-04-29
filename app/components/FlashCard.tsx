"use client";

import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Frame } from "../frames";

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

const VIEWPORT_PADDING_PX = 16;

type InkOverhang = { left: number; right: number; top: number; bottom: number };
const ZERO_OVERHANG: InkOverhang = { left: 0, right: 0, top: 0, bottom: 0 };

let inkCanvas: HTMLCanvasElement | null = null;
const inkCache = new Map<string, InkOverhang>();

function applyTextTransform(text: string, transform: string): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/(^|\s)(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
    default:
      return text;
  }
}

// Returns how far the painted glyph ink extends past the inline-span's
// layout box on each side, in unrotated CSS px. The layout box is what
// getBoundingClientRect() reports; ink can poke past it (italic overhang,
// large display fonts, trailing letter-spacing) and get clipped by the
// parent's overflow:hidden — that's the bug we're fixing.
function getInkOverhang(
  text: string,
  fontStr: string,
  letterSpacing: string,
  fontSizePx: number,
): InkOverhang {
  if (!text || fontSizePx <= 0) return ZERO_OVERHANG;
  const key = `${fontStr}|${letterSpacing}|${text}`;
  const cached = inkCache.get(key);
  if (cached) return cached;

  if (typeof document === "undefined") return ZERO_OVERHANG;
  if (!inkCanvas) inkCanvas = document.createElement("canvas");
  const ctx = inkCanvas.getContext("2d");
  if (!ctx) return ZERO_OVERHANG;

  ctx.font = fontStr;
  ctx.textBaseline = "alphabetic";
  // letterSpacing is supported in Chromium 99+, Safari 16.4+, Firefox 116+.
  // Fall back gracefully when missing.
  if (letterSpacing && letterSpacing !== "normal" && "letterSpacing" in ctx) {
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = letterSpacing;
    } catch {
      // ignore
    }
  }

  const m = ctx.measureText(text);
  const left = Number.isFinite(m.actualBoundingBoxLeft)
    ? Math.max(0, m.actualBoundingBoxLeft)
    : 0;
  const right = Number.isFinite(m.actualBoundingBoxRight)
    ? Math.max(0, m.actualBoundingBoxRight - m.width)
    : 0;
  const ascent = Number.isFinite(m.actualBoundingBoxAscent)
    ? m.actualBoundingBoxAscent
    : 0;
  const descent = Number.isFinite(m.actualBoundingBoxDescent)
    ? m.actualBoundingBoxDescent
    : 0;
  // With `leading-none` (line-height: 1), the inline layout box is roughly
  // `fontSizePx` tall. Anything past that is vertical ink overhang. Without
  // knowing the font's exact baseline placement inside that box we can't
  // attribute the overhang to top vs bottom, so distribute evenly — this is
  // conservative (errs toward fitting) and matches what we need for the
  // viewport-edge translation step.
  const verticalOverhang = Math.max(0, ascent + descent - fontSizePx);
  const result: InkOverhang = {
    left,
    right,
    top: verticalOverhang / 2,
    bottom: verticalOverhang / 2,
  };
  inkCache.set(key, result);
  return result;
}

type StrokeStyle = CSSProperties & {
  WebkitTextStroke?: string;
  WebkitTextFillColor?: string;
};

export function FlashCard({ frame }: { frame: Frame }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  const rotate = frame.rotateDeg ? `rotate(${frame.rotateDeg}deg)` : "";

  // Rotate around the element's geometric center always. Combined with the
  // post-transform translate fixup below, this guarantees the visible
  // rotated bbox lands inside the viewport regardless of alignment.
  const style: StrokeStyle = {
    transformOrigin: "center center",
    willChange: "transform",
  };
  if (frame.strokeOnly) {
    style.WebkitTextStroke = "2px currentColor";
    style.WebkitTextFillColor = "transparent";
  }

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const fit = () => {
      // 1. Measure the unrotated layout box first. We need the pre-transform
      //    dimensions to combine with ink-overhang (which is also pre-transform).
      el.style.transform = "none";
      const unrotated = el.getBoundingClientRect();
      if (unrotated.width === 0 || unrotated.height === 0) return;

      // 2. Compute the per-side ink overhang past the inline layout box.
      //    Using getBoundingClientRect alone misses italic slant, glyph side
      //    bearings, and trailing letter-spacing — which then get clipped
      //    by the parent's overflow:hidden.
      const cs = window.getComputedStyle(el);
      const fontSizePx = parseFloat(cs.fontSize) || 0;
      const fontStr = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const transformedText = applyTextTransform(frame.text, cs.textTransform);
      const ink = getInkOverhang(
        transformedText,
        fontStr,
        cs.letterSpacing,
        fontSizePx,
      );

      // Inflated (still-unrotated) dimensions that include glyph ink.
      const inflatedW = unrotated.width + ink.left + ink.right;
      const inflatedH = unrotated.height + ink.top + ink.bottom;

      // 3. Compute rotated bbox dimensions of the inflated rect, then pick
      //    the largest scale ≤ 1 that fits inside the viewport (minus margin).
      const theta = ((frame.rotateDeg ?? 0) * Math.PI) / 180;
      const cosT = Math.abs(Math.cos(theta));
      const sinT = Math.abs(Math.sin(theta));
      const rotW = inflatedW * cosT + inflatedH * sinT;
      const rotH = inflatedW * sinT + inflatedH * cosT;

      const maxW = window.innerWidth - VIEWPORT_PADDING_PX * 2;
      const maxH = window.innerHeight - VIEWPORT_PADDING_PX * 2;
      const scale = Math.min(maxW / rotW, maxH / rotH, 1);

      // 4. Apply rotate then scale and re-measure the layout box. The
      //    layout box is centered on the same point regardless of scale;
      //    we'll inflate this rect by the rotated+scaled ink overhang
      //    to get the true visible-ink bounds.
      const rs =
        scale < 0.999 ? `${rotate} scale(${scale})`.trim() : rotate || "none";
      el.style.transform = rs;
      const box = el.getBoundingClientRect();

      // Conservative per-axis inflation of the rotated layout box. Using max
      // overhang per axis keeps this symmetric (so the inflated rect is
      // axis-aligned) and errs toward fitting.
      const horizInk = Math.max(ink.left, ink.right);
      const vertInk = Math.max(ink.top, ink.bottom);
      const inflateX = (horizInk * cosT + vertInk * sinT) * scale;
      const inflateY = (horizInk * sinT + vertInk * cosT) * scale;

      const expandedLeft = box.left - inflateX;
      const expandedRight = box.right + inflateX;
      const expandedTop = box.top - inflateY;
      const expandedBottom = box.bottom + inflateY;

      // 5. Translate the element back into the viewport if any edge of the
      //    ink-expanded rect is outside the safety margin. Translate is
      //    prepended (applied last in the transform chain) so it operates
      //    in viewport pixels and doesn't get rotated.
      let dx = 0;
      let dy = 0;
      if (expandedLeft < VIEWPORT_PADDING_PX) {
        dx = VIEWPORT_PADDING_PX - expandedLeft;
      } else if (expandedRight > window.innerWidth - VIEWPORT_PADDING_PX) {
        dx = window.innerWidth - VIEWPORT_PADDING_PX - expandedRight;
      }
      if (expandedTop < VIEWPORT_PADDING_PX) {
        dy = VIEWPORT_PADDING_PX - expandedTop;
      } else if (expandedBottom > window.innerHeight - VIEWPORT_PADDING_PX) {
        dy = window.innerHeight - VIEWPORT_PADDING_PX - expandedBottom;
      }

      if (dx !== 0 || dy !== 0) {
        el.style.transform = `translate(${dx}px, ${dy}px) ${rs}`.trim();
      }
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [frame, rotate]);

  return (
    <div
      className={cx(
        "fixed inset-0 flex overflow-hidden",
        frame.alignClass ?? "items-center justify-center",
        frame.bgClass,
        frame.paddingClass,
      )}
    >
      <span
        ref={spanRef}
        className={cx(
          frame.fontClass,
          frame.sizeClass,
          frame.weightClass,
          frame.colorClass,
          frame.trackingClass,
          frame.transformClass,
          frame.italic && "italic",
          frame.underline && "underline",
          frame.blendDifference && "mix-blend-difference",
          "inline-block whitespace-nowrap leading-none select-none",
        )}
        style={style}
      >
        {frame.text}
      </span>
    </div>
  );
}
