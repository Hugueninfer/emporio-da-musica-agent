"use client";

import { ArrowRight, Bell, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { AssistantAvatar } from "@/components/brand/Logo";
import { useEmChat } from "@/components/chat/ChatProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Instrument3D } from "@/components/instrument/Instrument3D";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { StockBadge } from "@/components/ui/StockBadge";
import { isBuyable, priceInfo } from "@/lib/catalog";
import { description } from "@/lib/i18n/text";
import { CONFIG_FINISHES, FEATURED } from "@/lib/featured";
import { clamp, useScrolledPast } from "@/lib/use-scroll";
import { cn } from "@/lib/utils";

interface ConfiguratorProps {
  selected: number;
  onSelect: (i: number) => void;
  qty: number;
  onQty: (qty: number) => void;
  onAdd: () => void;
  added: boolean;
}

/** 02 / Escolha o seu: compra à esquerda, violão preso à direita girando com a rolagem. */
export function Configurator({ selected, onSelect, qty, onQty, onAdd, added }: ConfiguratorProps) {
  const { setWidgetOpen, sendText } = useEmChat();
  const { t, fmt } = useI18n();
  const c = t.configurator;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrolled, height, viewport } = useScrolledPast(sectionRef);
  const [notified, setNotified] = useState<number[]>([]);
  const cfg = CONFIG_FINISHES[selected];
  const product = FEATURED[cfg.finish];
  const buyable = isBuyable(product);

  // Meia volta (de −50° a +130°) enquanto a seção atravessa a tela: de frente no meio dela.
  const vh = viewport || 900;
  const spin = height ? (clamp((scrolled + vh) / (height + vh)) - 0.5) * 18 : 0;
  const stageH = Math.max(480, Math.min(720, vh - 150));

  const pick = (i: number) => onSelect((i + CONFIG_FINISHES.length) % CONFIG_FINISHES.length);

  const stage = (h: number) => (
    <Instrument3D finish={cfg.finish} frame={4} tilt={-8} height={h} frameOffset={spin} className="mx-auto" />
  );

  return (
    <section id="escolha" ref={sectionRef} className="scroll-mt-24 border-t border-em-line bg-em-bg py-28 max-[640px]:py-16">
      <div className="em-wrap grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-x-16 max-[900px]:grid-cols-1">
        <div className="flex flex-col py-4">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-em-accent-text">{c.label}</span>
          <h2 className="mb-0 mt-4 whitespace-pre-line font-display text-[clamp(36px,3.9vw,54px)] font-bold leading-[1.02] tracking-[-0.03em]">
            {c.title}
          </h2>
          <p className="mb-0 mt-4 max-w-[400px] text-sm leading-relaxed text-em-text-2">
            {c.body}
          </p>

          <div className="mt-6 min-[901px]:hidden">{stage(440)}</div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs font-semibold" id="acabamento-label">
              {c.finishLabel}
            </span>
            <span className="font-mono text-[10.5px] text-em-faint">
              0{selected + 1} — 0{CONFIG_FINISHES.length}
            </span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="acabamento-label"
            className="mt-3 grid grid-cols-3 gap-2.5"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") pick(selected + 1);
              else if (e.key === "ArrowUp" || e.key === "ArrowLeft") pick(selected - 1);
              else return;
              e.preventDefault();
            }}
          >
            {CONFIG_FINISHES.map((f, i) => {
              const active = i === selected;
              return (
                <button
                  key={f.finish}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onSelect(i)}
                  className={cn(
                    "flex aspect-[1.08] flex-col items-center justify-center gap-2.5 rounded-xl border px-2 text-center transition-colors",
                    active ? "border-em-accent bg-em-surface-2" : "border-em-line-strong hover:border-[rgba(244,233,220,0.3)]",
                  )}
                >
                  <span className="relative">
                    <span
                      aria-hidden="true"
                      className="block size-[30px] rounded-full shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]"
                      style={{ background: f.swatch }}
                    />
                    {active && (
                      <span className="absolute -bottom-1 -right-1.5 inline-flex size-4 items-center justify-center rounded-full bg-em-accent text-em-on-accent">
                        <Check size={10} strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col">
                    <strong className="text-xs font-semibold">{t.finishes[f.finish].name}</strong>
                    <span className="tabular text-[11px] text-em-muted">{fmt.money(priceInfo(FEATURED[f.finish]).current)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <strong className="text-sm font-semibold">{product.name}</strong>
            <StockBadge product={product} />
          </div>
          <p className="mb-0 mt-2 text-[13px] leading-relaxed text-em-text-2">{description(t, product)}</p>
          <p className="mb-0 mt-3 text-[11.5px] text-em-faint">{c.renderNote}</p>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-em-line pt-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold">{c.quantity}</span>
              <div className="inline-flex items-center rounded-lg border border-em-line-strong">
                <button
                  type="button"
                  onClick={() => onQty(Math.max(1, qty - 1))}
                  aria-label={c.qtyLess}
                  disabled={!buyable}
                  className="inline-flex size-10 items-center justify-center disabled:opacity-40"
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <span aria-live="polite" aria-label={c.qtyValue(qty)} className="tabular min-w-6 text-center text-sm font-bold">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => onQty(Math.min(Math.min(9, product.stock || 9), qty + 1))}
                  aria-label={c.qtyMore}
                  disabled={!buyable}
                  className="inline-flex size-10 items-center justify-center disabled:opacity-40"
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-[11px] text-em-muted">{product.promo ? c.promoPrice : c.storePrice}</span>
              <PriceBlock product={product} size="lg" className="items-end" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {buyable ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-[52px] items-center gap-3 rounded-[10px] bg-[#F4E9DC] px-5 text-sm font-semibold text-[#1F0F08]"
              >
                {added ? <Check size={17} aria-hidden="true" /> : <ShoppingBag size={17} strokeWidth={1.9} aria-hidden="true" />}
                <span aria-live="polite" className="grow text-left">
                  {added ? c.inBag : c.addToBag}
                </span>
                <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNotified((n) => [...n, product.id])}
                className="flex h-[52px] items-center gap-3 rounded-[10px] border border-dashed border-[rgba(244,233,220,0.4)] px-5 text-sm font-semibold"
              >
                {notified.includes(product.id) ? <Check size={17} aria-hidden="true" /> : <Bell size={17} strokeWidth={1.8} aria-hidden="true" />}
                <span aria-live="polite" className="grow text-left">
                  {notified.includes(product.id) ? c.notified : c.notify}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setWidgetOpen(true);
                sendText(t.product.askAbout(product.name));
              }}
              className="flex h-[52px] items-center justify-center gap-2 rounded-[10px] border border-em-line-strong text-sm font-semibold text-em-text"
            >
              <AssistantAvatar size={24} />
              {c.askAbout}
            </button>
          </div>
          <p className="mb-0 mt-4 flex items-center gap-2 text-[11.5px] text-em-text-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-em-accent" />
            {c.freeShipping}
          </p>
          <p className="mb-0 mt-1.5 text-[11.5px] text-em-faint">{c.installments}</p>
        </div>

        <div className="relative max-[900px]:hidden">
          <div className="sticky top-[96px] flex items-center" style={{ height: stageH }}>
            <div
              aria-hidden="true"
              className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,69,0.12),rgba(255,122,69,0))]"
            />
            {stage(stageH)}
          </div>
        </div>
      </div>
    </section>
  );
}
