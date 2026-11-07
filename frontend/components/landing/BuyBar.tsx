"use client";

import { Bell, ShoppingBag } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { stockLabel } from "@/components/ui/StockBadge";
import { isBuyable, priceInfo, stockState } from "@/lib/catalog";
import { FEATURED, type ConfigFinish } from "@/lib/featured";
import { cn } from "@/lib/utils";

/** Barra de compra fixa: reflete o acabamento escolhido no configurador. */
export function BuyBar({ cfg, onAdd, visible }: { cfg: ConfigFinish; onAdd: () => void; visible: boolean }) {
  const { t, fmt } = useI18n();
  const product = FEATURED[cfg.finish];
  const buyable = isBuyable(product);
  const stock = stockState(product);
  const names = t.finishes[cfg.finish];

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 left-1/2 z-30 box-border flex w-[min(660px,calc(100%-120px))] -translate-x-1/2 items-center gap-3.5 rounded-[18px] border border-[rgba(244,233,220,0.12)] bg-[rgba(28,18,13,0.92)] py-2.5 pl-4 pr-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-md transition-[opacity,translate] duration-500 max-[640px]:left-3 max-[640px]:w-[calc(100%-96px)] max-[640px]:translate-x-0 max-[640px]:pl-3",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <span aria-hidden="true" className="size-[30px] shrink-0 rounded-full" style={{ background: cfg.swatch }} />
      <span className="flex min-w-0 grow flex-col leading-tight">
        <strong className="truncate text-sm">{names.short}</strong>
        <span className="truncate text-xs text-em-muted">{names.name}</span>
      </span>
      <span className="flex flex-col items-end leading-tight max-[640px]:hidden">
        <strong className="tabular font-display text-lg">{fmt.money(priceInfo(product).current)}</strong>
        <span className="text-[11px] text-em-muted">{stockLabel(t, stock.kind, stock.count)}</span>
      </span>
      <a href="#escolha" className="px-1.5 text-[13px] text-em-text-2 max-[640px]:hidden">
        {t.buybar.change}
      </a>
      {buyable ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#F4E9DC] px-4 text-sm font-bold text-[#1F0F08]"
        >
          <ShoppingBag size={16} strokeWidth={1.9} aria-hidden="true" />
          {t.buybar.add}
        </button>
      ) : (
        <a
          href="#escolha"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#F4E9DC] px-4 text-sm font-bold text-[#1F0F08] no-underline"
        >
          <Bell size={16} strokeWidth={1.9} aria-hidden="true" />
          {t.buybar.notify}
        </a>
      )}
    </div>
  );
}
