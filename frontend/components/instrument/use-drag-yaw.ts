"use client";

import { useRef, useState, type PointerEvent } from "react";

/** Graus de giro por pixel arrastado na horizontal. */
const DEG_PER_PX = 0.6;

/** Arrastar na horizontal para girar o instrumento. O scroll vertical continua livre (touch-action: pan-y). */
export function useDragYaw() {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; offset: number } | null>(null);

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      start.current = { x: e.clientX, offset };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!start.current) return;
      setOffset(start.current.offset + (e.clientX - start.current.x) * DEG_PER_PX);
    },
    onPointerUp: () => {
      start.current = null;
      setDragging(false);
    },
    onPointerCancel: () => {
      start.current = null;
      setDragging(false);
    },
  };

  return { offset, setOffset, dragging, handlers };
}
