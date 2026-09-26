"use client";

// The pixel size of a container, for SVG components that take width and
// height as numbers. ResizeObserver, no layout thrash: one state per box.

import { useEffect, useRef, useState } from "react";

export function useSize<T extends HTMLElement>(): { ref: (el: T | null) => void; width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const obs = useRef<ResizeObserver | null>(null);
  const ref = (el: T | null) => {
    obs.current?.disconnect();
    obs.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.width === Math.floor(r.width) && s.height === Math.floor(r.height) ? s : { width: Math.floor(r.width), height: Math.floor(r.height) }));
    };
    update();
    obs.current = new ResizeObserver(update);
    obs.current.observe(el);
  };
  useEffect(() => () => obs.current?.disconnect(), []);
  return { ref, width: size.width, height: size.height };
}
