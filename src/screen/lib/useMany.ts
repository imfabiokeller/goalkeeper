"use client";

// Poll one JSON URL per key, every `ms`, keeping the last good value per
// key. A 404 (or a null body) is kept as null so the caller can tell "not
// there" from "not fetched yet" (undefined). Keys that leave the list
// stop polling; their values are dropped.

import { useEffect, useRef, useState } from "react";

export function useMany<T>(keys: string[], url: (key: string) => string, ms: number): Record<string, T | null | undefined> {
  const [values, setValues] = useState<Record<string, T | null>>({});
  const list = keys.join(",");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const ks = list ? list.split(",") : [];
    const run = async () => {
      await Promise.all(
        ks.map(async (k) => {
          try {
            const res = await fetch(url(k), { cache: "no-store" });
            if (res.status === 404) {
              if (alive.current) setValues((v) => (v[k] === null ? v : { ...v, [k]: null }));
              return;
            }
            if (!res.ok) return;
            const json = (await res.json()) as T | null;
            if (alive.current) setValues((v) => ({ ...v, [k]: json }));
          } catch {
            // keep the last good value
          }
        }),
      );
    };
    void run();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") void run();
    }, Math.max(500, ms));
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [list, ms, url]);

  const out: Record<string, T | null | undefined> = {};
  for (const k of keys) out[k] = values[k];
  return out;
}
