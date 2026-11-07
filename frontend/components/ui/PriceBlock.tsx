"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { hasSellingPrice, priceInfo, type Product } from "@/lib/catalog";
import { offText } from "@/lib/i18n/text";
import { cn } from "@/lib/utils";

interface PriceBlockProps {
  product: Product;
  /** inline = preço riscado, preço e pill na mesma linha; stacked = um embaixo do outro */
  layout?: "inline" | "stacked";
  size?: "sm" | "md" | "lg";
  /** Tom do fundo onde o bloco aparece (muda as cores de destaque). */
  tone?: "dark" | "cream";
  /** Mostrar o nome da campanha junto do % (ex.: "−18% · Desconto Exclusivo"). */
  withPromoLabel?: boolean;
  muted?: boolean;
  className?: string;
}

const SIZES = { sm: "text-[18px]", md: "text-[21px]", lg: "text-[30px]" };

/**
 * Preço com a regra das políticas (6.2): promoção sempre junto do preço original
 * riscado e do percentual. Nunca o preço promocional sozinho.
 */
export function PriceBlock({
  product,
  layout = "stacked",
  size = "md",
  tone = "dark",
  withPromoLabel = true,
  muted = false,
  className,
}: PriceBlockProps) {
  const { t, fmt } = useI18n();
  if (!hasSellingPrice(product)) {
    return (
      <span className={cn("text-[13px]", tone === "cream" ? "text-em-ink-muted" : "text-em-faint", className)}>
        {product.status === "coming_soon" ? t.product.comingSoonPrice : t.product.discontinuedPrice}
      </span>
    );
  }

  const info = priceInfo(product);
  const old = info.original !== undefined && (
    <span className={cn("text-[13px] line-through", tone === "cream" ? "text-em-ink-muted" : "text-em-faint")}>
      <span className="sr-only">{t.product.from}</span>
      {fmt.money(info.original)}
    </span>
  );
  const current = (
    <span
      className={cn(
        "tabular font-display font-bold leading-tight tracking-[-0.01em]",
        SIZES[size],
        muted && (tone === "cream" ? "text-em-ink-muted" : "text-em-faint"),
      )}
    >
      {info.original !== undefined && <span className="sr-only">{t.product.to}</span>}
      {fmt.money(info.current)}
    </span>
  );

  if (layout === "inline") {
    return (
      <span className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
        {old}
        {current}
        {info.percent && (
          <span className="rounded-full bg-em-accent px-[9px] py-[2px] text-[12.5px] font-extrabold text-em-on-accent">
            {offText(t, info, withPromoLabel)}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col", className)}>
      {old}
      {current}
      {info.percent && (
        <span className={cn("text-xs font-bold", tone === "cream" ? "text-em-accent-on-cream" : "text-em-accent-text")}>
          {offText(t, info, withPromoLabel)}
        </span>
      )}
    </span>
  );
}
