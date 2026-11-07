"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, MoveHorizontal, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";
import { StoreStatusMono } from "@/components/brand/StoreHours";
import { useEmChat } from "@/components/chat/ChatProvider";
import { CardFallback } from "@/components/instrument/Instrument3D";
import { defaultTarget, type InstrumentTarget } from "@/components/instrument/three/InstrumentCanvas";
import { useDragYaw } from "@/components/instrument/use-drag-yaw";
import { useI18n } from "@/components/i18n/I18nProvider";
import { priceInfo, type Product } from "@/lib/catalog";
import { offText } from "@/lib/i18n/text";
import { STORE } from "@/lib/store";
import { clamp, easeInOut, lerp, useMediaQuery, useScrolledPast } from "@/lib/use-scroll";
import { cn } from "@/lib/utils";
import { ChapterTabs } from "./ChapterTabs";
import { buildChapters, STAGES, type Pose } from "./chapters";

const InstrumentCanvas = dynamic(() => import("@/components/instrument/three/InstrumentCanvas").then((m) => m.InstrumentCanvas), {
  ssr: false,
});

/** Rolagem (em alturas de tela) para avançar um capítulo. */
const STEP = 0.9;
/** Fração do capítulo em que o instrumento fica parado antes de ir para a próxima pose. */
const HOLD = 0.5;
/** Giro extra enquanto o capítulo está parado, em graus (o instrumento "respira" com a rolagem). */
const DRIFT = 35;
/** Rolagem extra no último capítulo antes de soltar o pin. */
const TAIL = 0.5;

const N = STAGES.length;

function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scale: lerp(a.scale, b.scale, t),
    tilt: lerp(a.tilt, b.tilt, t),
    frame: lerp(a.frame, b.frame, t),
  };
}

function HeroPrice({ product, note }: { product: Product | null; note: string }) {
  const { t, fmt } = useI18n();
  if (!product) return <span className="text-xs text-em-muted">{note}</span>;
  const info = priceInfo(product);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-xs">
      {info.original !== undefined && (
        <span className="text-em-faint line-through">
          <span className="sr-only">{t.product.from}</span>
          {fmt.money(info.original)}
        </span>
      )}
      <strong className="tabular text-[13px] font-bold text-em-text">
        {info.original !== undefined && <span className="sr-only">{t.product.to}</span>}
        {fmt.money(info.current)}
      </strong>
      {info.percent && <span className="font-bold text-em-accent-text">{offText(t, info, false)}</span>}
      <span className="text-em-muted">{note}</span>
    </span>
  );
}

export function Hero() {
  const { setWidgetOpen } = useEmChat();
  const { t, fmt, locale } = useI18n();
  const CHAPTERS = buildChapters(t, fmt, locale === "en" ? STORE.phoneIntl : STORE.phone);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrolled, viewport } = useScrolledPast(sectionRef);
  const mobile = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const { offset, setOffset, dragging, handlers } = useDragYaw();

  const vh = viewport || 900;
  const sectionHeight = vh * (1 + (N - 1) * STEP + TAIL);
  const pinEnd = sectionHeight - vh;

  // p: posição contínua no roteiro (0 = capítulo 01, 4 = capítulo 05).
  const p = clamp(scrolled / (vh * STEP), 0, N - 1);
  const i = Math.min(N - 1, Math.floor(p));
  const tr = i === N - 1 ? 0 : easeInOut(clamp((p - i - HOLD) / (1 - HOLD)));
  const next = Math.min(N - 1, i + 1);
  const active = tr > 0.5 ? next : i;

  // Barra da aba ativa: de quando o capítulo entra até quando sai.
  const start = active === 0 ? 0 : active - 1 + (1 + HOLD) / 2;
  const end = active === N - 1 ? N - 1 + TAIL / STEP : active + (1 + HOLD) / 2;
  const fill = clamp((p - start) / (end - start));

  // Saída: depois do pin, o texto escurece enquanto o instrumento segue visível.
  const exit = clamp((scrolled - pinEnd) / (vh * 0.6));

  const poseOf = (k: number) => (mobile ? CHAPTERS[k].poseMobile : CHAPTERS[k].pose);
  const pose = mixPose(poseOf(i), poseOf(next), tr);
  // Gira um pouco durante o capítulo e chega exatamente no ângulo do próximo (sem salto).
  const drift = reducedMotion ? 0 : DRIFT * (p - i);
  const yaw = lerp(poseOf(i).frame * 10 + drift, poseOf(next).frame * 10, i === next ? 0 : tr) + offset;
  const fromFinish = CHAPTERS[i].finish;
  const toFinish = CHAPTERS[next].finish;

  // Alvo do 3D: a rolagem só escreve aqui; o canvas persegue com amortecimento a cada frame.
  const target = useRef<InstrumentTarget>(defaultTarget(STAGES[0].finish, { ...STAGES[0].pose, yaw: STAGES[0].pose.frame * 10 }));
  useLayoutEffect(() => {
    Object.assign(target.current, {
      x: pose.x,
      y: pose.y,
      scale: pose.scale * (mobile ? 0.8 : 1),
      tilt: pose.tilt,
      yaw,
      pitch: 4,
      from: fromFinish,
      to: toFinish,
      mix: fromFinish === toFinish ? 0 : tr,
    });
  });

  const goTo = (k: number) => {
    const top = (sectionRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    window.scrollTo({ top: top + k * vh * STEP + 2, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const shownDeg = ((Math.round(yaw) % 360) + 360) % 360;

  return (
    <section id="topo" ref={sectionRef} className="relative" style={{ height: sectionHeight }} aria-label={t.hero.region}>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Palavras-fantasma (uma por capítulo, em crossfade) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[19%] max-[767px]:top-[17%]" style={{ opacity: 1 - exit * 0.8 }}>
          {CHAPTERS.map((c, k) => (
            <span
              key={c.n}
              className="absolute inset-x-0 whitespace-nowrap text-center font-display text-[clamp(120px,21vw,310px)] font-extrabold leading-[0.85] tracking-[-0.05em] text-[rgba(244,233,220,0.045)] transition-opacity duration-700"
              style={{ opacity: k === active ? 1 : 0 }}
            >
              {c.ghost}
            </span>
          ))}
        </div>

        {/* Brilho atrás do instrumento (acompanha a pose com transição) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[70vh] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,69,0.15),rgba(255,122,69,0))] transition-transform duration-1000 ease-out"
          style={{ transform: `translate(calc(-50% + ${pose.x}vw), calc(-50% + ${pose.y}vh)) scale(${0.6 + pose.scale * 0.4})` }}
        />

        {/* Instrumento 3D: pose interpolada pela rolagem, arraste para girar */}
        <div
          role="img"
          aria-label={t.hero.stageLabel}
          className={cn("absolute inset-0 z-10 touch-pan-y select-none", dragging ? "cursor-grabbing" : "cursor-grab")}
          {...handlers}
        >
          <InstrumentCanvas target={target} className="absolute inset-0" fallback={<CardFallback finish={CHAPTERS[active].finish} />} />
        </div>

        {/* Texto + abas */}
        <div className="em-wrap pointer-events-none relative z-20 flex h-full flex-col pb-7 pt-[106px] max-[640px]:pb-5 max-[640px]:pt-[90px]">
          <div
            className="flex flex-wrap justify-between gap-x-4 gap-y-2 font-mono text-[10.5px] tracking-[0.14em] text-em-muted"
            style={{ opacity: 1 - exit * 0.75 }}
          >
            <span>
              {t.hero.topLine}<span className="max-[640px]:hidden">{t.hero.since}</span>
            </span>
            <StoreStatusMono className="text-[10.5px]" />
          </div>

          <div className="relative flex-1" style={{ opacity: 1 - exit * 0.75 }}>
            {CHAPTERS.map((c, k) => {
              const isActive = k === active;
              const Title = k === 0 ? "h1" : "h2";
              return (
                <div
                  key={c.n}
                  aria-hidden={!isActive}
                  className={cn(
                    "absolute inset-0 flex items-center transition-[opacity,transform] duration-500 ease-out max-[767px]:items-end max-[767px]:pb-6",
                    c.side === "right" && "min-[768px]:justify-end",
                    isActive ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
                  )}
                >
                  <div className={cn("flex w-full max-w-[470px] flex-col gap-5 max-[767px]:gap-3.5", isActive && "pointer-events-auto")}>
                    <span className="inline-flex items-center gap-2.5 font-mono text-[10.5px] font-medium tracking-[0.14em] text-em-text-2">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-em-accent" />
                      {c.eyebrow}
                    </span>
                    <Title className="m-0 whitespace-pre-line font-display text-[clamp(40px,5.3vw,78px)] font-extrabold leading-[0.92] tracking-[-0.035em]">
                      {c.title}
                    </Title>
                    <p className="m-0 max-w-[400px] text-[15px] leading-relaxed text-em-text-2">{c.body}</p>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-em-text-2 max-[767px]:hidden">
                      {c.chips[0]}
                      <span aria-hidden="true" className="text-em-faint">
                        ·
                      </span>
                      {c.chips[1]}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3 max-[767px]:gap-x-4">
                      <a
                        href="#escolha"
                        tabIndex={isActive ? undefined : -1}
                        className="inline-flex h-[46px] items-center gap-4 rounded-[10px] bg-[#F4E9DC] px-5 text-[13.5px] font-semibold text-[#1F0F08] no-underline"
                      >
                        {t.hero.choose}
                        <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        tabIndex={isActive ? undefined : -1}
                        onClick={() => setWidgetOpen(true)}
                        className="inline-flex h-11 items-center gap-2 text-[13px] font-semibold text-em-text hover:text-em-accent-text"
                      >
                        {t.hero.ask}
                        <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    <HeroPrice product={c.product} note={c.note} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pointer-events-auto flex flex-col gap-3.5" style={{ opacity: 1 - exit * 0.75 }}>
            <div className="flex items-end justify-between gap-4 max-[767px]:hidden">
              <span className="label-mono pb-1 text-[10.5px] text-em-muted max-[767px]:hidden">{t.hero.explore}</span>
              <div className="flex items-center gap-0.5 rounded-full border border-[rgba(244,233,220,0.12)] bg-[rgba(18,11,8,0.72)] p-1 backdrop-blur-md max-[767px]:hidden">
                <button
                  type="button"
                  onClick={() => setOffset((o) => o + 30)}
                  aria-label={t.viewer.left}
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <ChevronLeft size={17} strokeWidth={1.9} aria-hidden="true" />
                </button>
                <span aria-live="polite" className="tabular inline-flex min-w-[64px] items-center justify-center gap-1.5 font-mono text-[11px] text-em-text-2">
                  <MoveHorizontal size={13} aria-hidden="true" />
                  {String(shownDeg).padStart(3, "0")}°
                </span>
                <button
                  type="button"
                  onClick={() => setOffset((o) => o - 30)}
                  aria-label={t.viewer.right}
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <ChevronRight size={17} strokeWidth={1.9} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(0)}
                  aria-label={t.viewer.resetLabel}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold hover:bg-white/10"
                >
                  <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
                  {t.viewer.reset}
                </button>
              </div>
            </div>
            <ChapterTabs chapters={CHAPTERS} active={active} fill={fill} onPick={goTo} label={t.hero.chapterGroup} />
          </div>
        </div>
      </div>
    </section>
  );
}
