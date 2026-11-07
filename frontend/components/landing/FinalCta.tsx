"use client";

import { ArrowUpRight } from "lucide-react";
import { forwardRef } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Instrument3D } from "@/components/instrument/Instrument3D";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { isBuyable } from "@/lib/catalog";
import { FEATURED, type ConfigFinish } from "@/lib/featured";
import { FULL_ADDRESS, STORE } from "@/lib/store";

interface FinalCtaProps {
  cfg: ConfigFinish;
  qty: number;
  onAdd: () => void;
}

/** Fechamento: instrumento escolhido à esquerda, chamada à direita. */
export const FinalCta = forwardRef<HTMLElement, FinalCtaProps>(function FinalCta({ cfg, qty, onAdd }, ref) {
  const { t, locale } = useI18n();
  const f = t.final;
  const product = FEATURED[cfg.finish];
  const buyable = isBuyable(product);
  const names = t.finishes[cfg.finish];
  const phone = locale === "en" ? STORE.phoneIntl : STORE.phone;

  return (
    <section id="loja" ref={ref} className="scroll-mt-24 border-t border-em-line bg-em-bg pt-24 max-[640px]:pt-16">
      <div className="em-wrap grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-x-16 gap-y-10 max-[900px]:grid-cols-1">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-[14%] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,69,0.12),rgba(255,122,69,0))]"
          />
          <Instrument3D finish={cfg.finish} frame={3} tilt={-14} height={560} />
        </div>

        <div className="flex flex-col">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-em-muted">{f.label}</span>
          <h2 className="mb-0 mt-5 whitespace-pre-line font-display text-[clamp(44px,4.8vw,70px)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            {f.title}
          </h2>
          <p className="mb-0 mt-5 max-w-[380px] text-sm leading-relaxed text-em-text-2">
            {t.brand.slogan} {f.body}
          </p>
          <div className="mt-7 flex items-end gap-5">
            <span className="pb-1.5 font-mono text-[10px] tracking-[0.14em] text-em-muted">{f.price}</span>
            <PriceBlock product={product} layout="inline" size="lg" withPromoLabel={false} />
          </div>
          <p className="mb-0 mt-4 flex items-center gap-2.5 text-xs text-em-text-2">
            <span aria-hidden="true" className="size-3.5 rounded-full shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.25)]" style={{ background: cfg.swatch }} />
            {names.short} · {names.name} / {f.qty(qty)}
            <a href="#escolha" className="font-semibold text-em-text underline underline-offset-4">
              {f.change}
            </a>
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
            {buyable ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex h-[46px] items-center gap-4 rounded-[10px] bg-[#F4E9DC] px-5 text-[13.5px] font-semibold text-[#1F0F08]"
              >
                {f.add}
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <a
                href="#escolha"
                className="inline-flex h-[46px] items-center gap-4 rounded-[10px] bg-[#F4E9DC] px-5 text-[13.5px] font-semibold text-[#1F0F08] no-underline"
              >
                {f.otherFinishes}
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
            )}
            <a href={STORE.phoneHref} className="text-[13px] font-semibold text-em-text underline underline-offset-4">
              {f.call(phone)}
            </a>
          </div>
          <p className="mb-0 mt-6 max-w-[420px] text-[11.5px] leading-relaxed text-em-faint">
            {FULL_ADDRESS} · {t.hours.table.map((h) => `${h.days} ${h.hours}`).join(" · ")}
          </p>
        </div>
      </div>

      <footer className="mt-24 border-t border-em-line py-7">
        <div className="em-wrap flex flex-wrap justify-between gap-3 text-xs text-em-muted">
          <span>
            {f.copyright} {STORE.founded}
          </span>
          <span>{f.onlyInstruments}</span>
        </div>
      </footer>
    </section>
  );
});
