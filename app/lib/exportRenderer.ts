"use client";

import type { Frame } from "../frames";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  resolveFrameStyle,
  type ResolvedStyle,
} from "./exportStyleResolver";

const SAFETY_MARGIN_PX = 16;

function applyTextTransform(text: string, tt: string): string {
  if (tt === "uppercase") return text.toUpperCase();
  if (tt === "lowercase") return text.toLowerCase();
  if (tt === "capitalize") return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return text;
}

function ctxSupportsLetterSpacing(ctx: CanvasRenderingContext2D): boolean {
  return "letterSpacing" in ctx;
}

type Measured = { width: number; ascent: number; descent: number };

function measure(
  ctx: CanvasRenderingContext2D,
  text: string,
  s: ResolvedStyle,
): Measured {
  const m = ctx.measureText(text);
  let width = m.width;
  if (!ctxSupportsLetterSpacing(ctx) && s.letterSpacingPx !== 0) {
    width += s.letterSpacingPx * Math.max(0, [...text].length - 1);
  }
  // measureText sometimes returns 0 for ascent/descent on uncommon code points;
  // fall back to font metrics estimated from font size.
  const ascent =
    m.actualBoundingBoxAscent && Number.isFinite(m.actualBoundingBoxAscent)
      ? m.actualBoundingBoxAscent
      : s.fontSizePx * 0.8;
  const descent =
    m.actualBoundingBoxDescent && Number.isFinite(m.actualBoundingBoxDescent)
      ? m.actualBoundingBoxDescent
      : s.fontSizePx * 0.2;
  return { width, ascent, descent };
}

function drawTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  s: ResolvedStyle,
  stroke: boolean,
): void {
  if (ctxSupportsLetterSpacing(ctx) || s.letterSpacingPx === 0) {
    if (stroke) ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const glyph of text) {
    if (stroke) ctx.strokeText(glyph, cursor, y);
    else ctx.fillText(glyph, cursor, y);
    cursor += ctx.measureText(glyph).width + s.letterSpacingPx;
  }
}

export function paintFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  width: number = EXPORT_WIDTH,
  height: number = EXPORT_HEIGHT,
): void {
  const s = resolveFrameStyle(frame);

  ctx.save();
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const text = applyTextTransform(frame.text, s.textTransform);

  ctx.save();
  ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSizePx}px ${s.fontFamily}`;
  ctx.textBaseline = "alphabetic";
  if (ctxSupportsLetterSpacing(ctx)) {
    ctx.letterSpacing = `${s.letterSpacingPx}px`;
  }

  const m = measure(ctx, text, s);
  const visualHeight = m.ascent + m.descent;

  const rad = ((frame.rotateDeg ?? 0) * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  const rotW = m.width * cosA + visualHeight * sinA;
  const rotH = m.width * sinA + visualHeight * cosA;

  const availW = Math.max(1, width - SAFETY_MARGIN_PX * 2);
  const availH = Math.max(1, height - SAFETY_MARGIN_PX * 2);
  const scale = Math.min(availW / rotW, availH / rotH, 1);

  const padX0 = s.paddingPx.left;
  const padY0 = s.paddingPx.top;
  const padX1 = width - s.paddingPx.right;
  const padY1 = height - s.paddingPx.bottom;

  let anchorX: number;
  let anchorY: number;
  switch (s.alignH) {
    case "start":
      anchorX = padX0;
      break;
    case "end":
      anchorX = padX1;
      break;
    default:
      anchorX = (padX0 + padX1) / 2;
  }
  switch (s.alignV) {
    case "start":
      anchorY = padY0;
      break;
    case "end":
      anchorY = padY1;
      break;
    default:
      anchorY = (padY0 + padY1) / 2;
  }

  ctx.translate(anchorX, anchorY);
  ctx.scale(scale, scale);
  ctx.rotate(rad);

  let drawX: number;
  let drawY: number;
  switch (s.alignH) {
    case "start":
      drawX = 0;
      break;
    case "end":
      drawX = -m.width;
      break;
    default:
      drawX = -m.width / 2;
  }
  switch (s.alignV) {
    case "start":
      drawY = m.ascent;
      break;
    case "end":
      drawY = -m.descent;
      break;
    default:
      drawY = (m.ascent - m.descent) / 2;
  }

  if (frame.blendDifference) {
    ctx.globalCompositeOperation = "difference";
  }

  if (frame.strokeOnly) {
    ctx.strokeStyle = s.fg;
    ctx.lineWidth = Math.max(2, Math.round(s.fontSizePx * 0.012));
    ctx.lineJoin = "round";
    drawTextWithSpacing(ctx, text, drawX, drawY, s, true);
  } else {
    ctx.fillStyle = s.fg;
    drawTextWithSpacing(ctx, text, drawX, drawY, s, false);
  }

  if (frame.underline) {
    const ulY = drawY + Math.max(2, Math.round(s.fontSizePx * 0.06));
    const ulThickness = Math.max(2, Math.round(s.fontSizePx * 0.05));
    ctx.fillStyle = s.fg;
    ctx.fillRect(drawX, ulY, m.width, ulThickness);
  }

  ctx.restore();
}

export type PaintedFrame = {
  canvas: HTMLCanvasElement;
  durationMs: number;
};

export async function* paintAllFrames(
  frames: Frame[],
  onProgress?: (done: number, total: number) => void,
): AsyncGenerator<PaintedFrame> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D canvas context");

  for (let i = 0; i < frames.length; i++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintFrame(ctx, frames[i], canvas.width, canvas.height);
    yield { canvas, durationMs: frames[i].durationMs };
    onProgress?.(i + 1, frames.length);
  }
}
