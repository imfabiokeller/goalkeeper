"use client";

// A fixed artboard scaled to the window: the stage is laid out once at
// 1920x1080 and shrinks (or grows) as a whole, centered in the leftover
// space, so a laptop shows the same picture as the projector.

import { useEffect, useState } from "react";

export type ArtboardFit = { scale: number; left: number; top: number };

export function fitArtboard(innerWidth: number, innerHeight: number, width: number, height: number): ArtboardFit {
  const scale = Math.min(innerWidth / width, innerHeight / height);
  return { scale, left: Math.max(0, (innerWidth - width * scale) / 2), top: Math.max(0, (innerHeight - height * scale) / 2) };
}

export function useScale(width: number, height: number): ArtboardFit {
  const [fit, setFit] = useState<ArtboardFit>({ scale: 1, left: 0, top: 0 });
  useEffect(() => {
    const update = () => setFit(fitArtboard(window.innerWidth, window.innerHeight, width, height));
    update();
    window.addEventListener("resize", update);
    // Some hosts settle the window size after load without a resize event
    // (emulated viewports, fullscreen projectors): watch the root box too.
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    obs?.observe(document.documentElement);
    const late = setTimeout(update, 1000);
    return () => {
      window.removeEventListener("resize", update);
      obs?.disconnect();
      clearTimeout(late);
    };
  }, [width, height]);
  return fit;
}
