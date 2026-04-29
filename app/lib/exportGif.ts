"use client";

import type { Frame } from "../frames";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "./exportStyleResolver";
import { paintAllFrames } from "./exportRenderer";

export async function encodeGif(
  frames: Frame[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const gif = GIFEncoder();

  let i = 0;
  for await (const { canvas, durationMs } of paintAllFrames(frames)) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to read canvas data");
    const data = ctx.getImageData(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT).data;
    const palette = quantize(data, 256, { format: "rgb565" });
    const index = applyPalette(data, palette, "rgb565");
    gif.writeFrame(index, EXPORT_WIDTH, EXPORT_HEIGHT, {
      palette,
      delay: Math.max(20, Math.round(durationMs / 10) * 10),
    });
    i++;
    onProgress?.(i / frames.length);
    // yield to UI between frames
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  gif.finish();
  // bytes() shares its underlying buffer with the encoder; copy into a fresh
  // ArrayBuffer so the Blob owns standalone memory and TS's BlobPart type is happy.
  const owned = new Uint8Array(gif.bytes());
  return new Blob([owned], { type: "image/gif" });
}
