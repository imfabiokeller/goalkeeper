"use client";

// Polling for the screens: fetch JSON from `url` every `ms`, keep the last
// good value across failures, and report the error and the time of the
// last success. Vercel functions cannot hold change streams, so this is
// the whole live mechanism.

import { useEffect, useRef, useState } from "react";

export type Poll<T> = {
  data: T | null;
  error: string | null;
  at: number | null; // Date.now() of the last successful fetch
  loading: boolean; // true until the first response, success or failure
  refresh: () => void;
};

export function usePoll<T>(url: string, ms = 2000): Poll<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      try {
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as T;
        if (!alive) return;
        setData(json);
        setError(null);
        setAt(Date.now());
      } catch (err) {
        if (!alive || ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") void run();
    }, Math.max(250, ms));
    return () => {
      alive = false;
      clearInterval(timer);
      inFlight.current?.abort();
    };
  }, [url, ms, tick]);

  return { data, error, at, loading, refresh: () => setTick((t) => t + 1) };
}
