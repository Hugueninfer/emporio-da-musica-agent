"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CARD_IMAGES, type Finish } from "@/lib/catalog";
import { useMediaQuery } from "@/lib/use-scroll";
import { cn } from "@/lib/utils";
import { defaultTarget, type InstrumentTarget } from "./three/InstrumentCanvas";
import { useDragYaw } from "./use-drag-yaw";

// WebGL só no cliente.
const InstrumentCanvas = dynamic(() => import("./three/InstrumentCanvas").then((m) => m.InstrumentCanvas), { ssr: false });

export interface Instrument3DProps {
  finish: Finish;
  /** Ângulo inicial em "quadros" de 10° (compatível com o antigo giro por sprites). */
  frame?: number;
  tilt?: number;
  scale?: number;
  /** Altura máxima do palco em px (encolhe para caber na largura). */
  height?: number;
  autoSpin?: boolean;
  controls?: boolean;
  /** Giro extra controlado de fora (ex.: pela rolagem), em quadros de 10°. */
  frameOffset?: number;
  className?: string;
}

export function CardFallback({ finish }: { finish: Finish }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CARD_IMAGES[finish]} alt="" className="size-full object-contain" />
  );
}

/** Instrumento 3D com arraste, teclado e controles de giro. */
export function Instrument3D({
  finish,
  frame = 4,
  tilt = 0,
  scale = 1,
  height = 640,
  autoSpin = false,
  controls = true,
  frameOffset = 0,
  className,
}: Instrument3DProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const { offset, setOffset, dragging, handlers } = useDragYaw();

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const yaw = (frame + frameOffset) * 10 + offset;
  // O alvo é um objeto mutável lido a cada frame pelo canvas (sem re-render do WebGL).
  const target = useRef<InstrumentTarget>(defaultTarget(finish, { yaw, tilt, scale }));
  const spinning = autoSpin && !reducedMotion && !paused && !dragging;
  useLayoutEffect(() => {
    Object.assign(target.current, { from: finish, to: finish, mix: 0, tilt, scale, yaw, autoSpin: spinning ? 36 : 0 });
  });

  const fitH = width ? Math.min(height, Math.max(300, width * 1.35)) : height;
  const shown = ((Math.round(yaw / 10) % 36) + 36) % 36;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setOffset((o) => o + 10);
    else if (e.key === "ArrowRight") setOffset((o) => o - 10);
    else if (e.key === "Home") setOffset(-(frame + frameOffset) * 10);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="img"
      aria-label={t.viewer.label}
      aria-roledescription={t.viewer.roleDescription}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn(
        "relative w-full touch-pan-y select-none rounded-3xl outline-offset-4",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ height: fitH }}
    >
      <InstrumentCanvas target={target} className="absolute inset-0" fallback={<CardFallback finish={finish} />} />

      {controls && (
        <div
          className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full border border-[rgba(244,233,220,0.12)] bg-[rgba(18,11,8,0.72)] p-1 text-[#F4E9DC] backdrop-blur-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setOffset((o) => o + 30)}
            aria-label={t.viewer.left}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <span aria-live="polite" className="tabular min-w-[52px] text-center font-mono text-xs tracking-[0.06em] text-[#D8C3AF]">
            {String(shown * 10).padStart(3, "0")}°
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o - 30)}
            aria-label={t.viewer.right}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <ChevronRight size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setOffset(-(frame + frameOffset) * 10)}
            aria-label={t.viewer.front}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <RotateCcw size={17} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
