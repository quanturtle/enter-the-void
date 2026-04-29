"use client";

import { useSyncExternalStore } from "react";
import { FRAMES as DEFAULT_FRAMES, type Frame } from "../frames";

const STORAGE_KEY = "lettering:frames:v1";
const CHANGE_EVENT = "lettering:frames-change";

let cachedRaw: string | null | undefined = undefined;
let cachedFrames: Frame[] = DEFAULT_FRAMES;

function readFromStorage(): Frame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedFrames;
    cachedRaw = raw;
    if (!raw) {
      cachedFrames = DEFAULT_FRAMES;
      return cachedFrames;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedFrames = parsed as Frame[];
      return cachedFrames;
    }
  } catch {
    // fall through
  }
  cachedFrames = DEFAULT_FRAMES;
  return cachedFrames;
}

function getSnapshot(): Frame[] {
  return readFromStorage();
}

function getServerSnapshot(): Frame[] {
  return DEFAULT_FRAMES;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useFrames(): Frame[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setFrames(next: Frame[]): void {
  const json = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // ignore quota / private mode failures
  }
  cachedRaw = json;
  cachedFrames = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetFrames(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  cachedRaw = null;
  cachedFrames = DEFAULT_FRAMES;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export { DEFAULT_FRAMES };
