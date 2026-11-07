"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { STOCK_STYLES, stockState, type Product, type StockKind } from "@/lib/catalog";
import type { Dictionary } from "@/lib/i18n/pt";
import { cn } from "@/lib/utils";

export function stockLabel(t: Dictionary, kind: StockKind, count: number): string {
  const s = t.product.stock;
  return { in_stock: s.in(count), low: s.low(count), out: s.out, discontinued: s.discontinued, coming_soon: s.comingSoon }[kind];
}

export function StockBadge({ product, className }: { product: Product; className?: string }) {
  const { t } = useI18n();
  const { kind, count } = stockState(product);
  const style = STOCK_STYLES[kind];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] text-xs font-bold leading-tight", className)}
      style={{ background: style.bg, color: style.fg }}
    >
      {stockLabel(t, kind, count)}
    </span>
  );
}
