"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Quanto do elemento já foi rolado, em px, a partir do momento em que o topo dele
 * encosta no topo da viewport. Mede direto no evento de scroll (o navegador já entrega
 * no máximo um por frame) e só re-renderiza quando o valor muda.
 */
export function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ scrolled: 0, height: 0, viewport: 0 });

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = { scrolled: -rect.top, height: rect.height, viewport: window.innerHeight };
      setState((prev) =>
        Math.abs(prev.scrolled - next.scrolled) < 0.5 && prev.height === next.height && prev.viewport === next.viewport
          ? prev
          : next,
      );
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return state;
}

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

/** matchMedia reativo. `serverValue` vale no SSR e na hidratação. */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(subscribeMedia(query), () => window.matchMedia(query).matches, () => serverValue);
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
