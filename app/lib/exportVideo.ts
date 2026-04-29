"use client";

import type { Frame } from "../frames";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "./exportStyleResolver";
import { paintAllFrames } from "./exportRenderer";

export type VideoExport = {
  blob: Blob;
  ext: "mp4" | "webm";
  mimeType: string;
};

export async function encodeVideo(
  frames: Frame[],
  onProgress?: (pct: number) => void,
): Promise<VideoExport> {
  if (
    typeof VideoEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined"
  ) {
    try {
      return await encodeMp4(frames, onProgress);
    } catch (err) {
      console.warn(
        "MP4 (WebCodecs) export failed; falling back to WebM:",
        err,
      );
    }
  }
  return await encodeWebm(frames, onProgress);
}

async function encodeMp4(
  frames: Frame[],
  onProgress?: (pct: number) => void,
): Promise<VideoExport> {
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "avc",
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
    },
    fastStart: "in-memory",
  });

  let encoderError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e;
    },
  });

  encoder.configure({
    codec: "avc1.640028",
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    bitrate: 8_000_000,
    framerate: 30,
  });

  let timeMicros = 0;
  let i = 0;
  for await (const { canvas, durationMs } of paintAllFrames(frames)) {
    if (encoderError) throw encoderError;
    const durationMicros = Math.max(1, Math.round(durationMs * 1000));
    const vf = new VideoFrame(canvas, {
      timestamp: timeMicros,
      duration: durationMicros,
    });
    encoder.encode(vf, { keyFrame: i % 30 === 0 });
    vf.close();
    timeMicros += durationMicros;
    i++;
    onProgress?.((i / frames.length) * 0.95);
  }

  await encoder.flush();
  if (encoderError) throw encoderError;
  encoder.close();
  muxer.finalize();
  onProgress?.(1);

  return {
    blob: new Blob([target.buffer], { type: "video/mp4" }),
    ext: "mp4",
    mimeType: "video/mp4",
  };
}

async function encodeWebm(
  frames: Frame[],
  onProgress?: (pct: number) => void,
): Promise<VideoExport> {
  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = EXPORT_WIDTH;
  recordCanvas.height = EXPORT_HEIGHT;
  const ctx = recordCanvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D canvas context");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  const stream = recordCanvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;

  const candidateMimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mimeType =
    candidateMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ??
    "video/webm";

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();

  let i = 0;
  for await (const { canvas: src, durationMs } of paintAllFrames(frames)) {
    ctx.drawImage(src, 0, 0);
    if (typeof track.requestFrame === "function") track.requestFrame();
    await new Promise<void>((r) => setTimeout(r, durationMs));
    i++;
    onProgress?.((i / frames.length) * 0.95);
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  onProgress?.(1);

  return {
    blob: new Blob(chunks, { type: mimeType }),
    ext: "webm",
    mimeType,
  };
}
