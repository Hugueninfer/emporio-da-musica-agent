"use client";

import { Bell, Box, Check, Drum, Guitar, MessageCircle, Piano } from "lucide-react";
import { useState } from "react";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { StockBadge } from "@/components/ui/StockBadge";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CARD_IMAGES, isBuyable, priceInfo, type Product } from "@/lib/catalog";
import { categoryLabel, specValue } from "@/lib/i18n/text";
import { cn } from "@/lib/utils";
import { useEmChat } from "../ChatProvider";
import { useChatSurface } from "../ChatSurface";

function CategoryIcon({ category, size }: { category: string; size: number }) {
  const Icon = category.startsWith("Bateria") ? Drum : category.startsWith("Teclado") ? Piano : Guitar;
  return <Icon size={size} strokeWidth={1.2} aria-hidden="true" />;
}

/** Foto do render 3/4 ou, sem render, um placeholder em tom de madeira com o ícone da categoria. */
export function ProductImage({ product, className, iconSize = 40 }: { product: Product; className?: string; iconSize?: number }) {
  const dim = !isBuyable(product);
  if (product.finish) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={CARD_IMAGES[product.finish]}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover object-[45%_50%]", dim && "[filter:grayscale(.55)_brightness(.75)]", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-full items-center justify-center bg-[#2A1A12] bg-[repeating-linear-gradient(97deg,rgba(255,220,180,0.035)_0_2px,transparent_2px_9px)] text-[#B98A5E]",
        dim && "opacity-60",
        className,
      )}
    >
      <CategoryIcon category={product.category} size={iconSize} />
    </span>
  );
}

function NotifyButton({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setDone(true)}
      disabled={done}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-em-line-strong font-semibold text-em-text",
        compact ? "h-[34px] px-3 text-[12.5px]" : "mt-1.5 h-10 text-[13.5px]",
      )}
    >
      {done ? <Check size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}
      {done ? t.product.notifyDone : t.product.notify}
    </button>
  );
}

export function ProductCard({ product, active }: { product: Product; active?: boolean }) {
  const { variant, onViewProduct } = useChatSurface();
  const { sendText } = useEmChat();
  const { t } = useI18n();
  const info = priceInfo(product);
  const buyable = isBuyable(product);
  const ask = () => sendText(t.product.askAbout(product.name));

  const action = product.finish ? (
    <button
      type="button"
      onClick={() => onViewProduct(product)}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[11px] border font-semibold",
        variant === "widget" ? "h-[34px] px-3 text-[12.5px]" : "mt-1.5 h-10 text-[13.5px]",
        active
          ? "border-em-accent bg-em-accent text-em-on-accent"
          : variant === "widget"
            ? "border-transparent bg-em-ink text-[#F4E9DC]"
            : "border-em-line-strong text-em-text",
      )}
    >
      <Box size={15} strokeWidth={1.9} aria-hidden="true" />
      {active ? t.product.inFocus : t.product.viewIn3d}
    </button>
  ) : !buyable && product.status === "active" ? (
    <NotifyButton compact={variant === "widget"} />
  ) : (
    <button
      type="button"
      onClick={ask}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[11px] border font-semibold",
        variant === "widget"
          ? "h-[34px] border-transparent bg-em-ink px-3 text-[12.5px] text-[#F4E9DC]"
          : "mt-1.5 h-10 border-em-line-strong text-[13.5px] text-em-text",
      )}
    >
      <MessageCircle size={15} strokeWidth={1.9} aria-hidden="true" />
      {t.product.ask}
    </button>
  );

  if (variant === "widget") {
    // Card horizontal compacto, creme, como no design do widget.
    return (
      <div role="listitem" className="flex gap-3 rounded-2xl bg-[#F4E9DC] p-2.5 text-em-ink">
        <span className="relative size-[76px] shrink-0 overflow-hidden rounded-xl bg-[#120B08]">
          <ProductImage product={product} iconSize={30} />
        </span>
        <span className="flex min-w-0 grow flex-col gap-1">
          <strong className="text-sm leading-tight">{product.name}</strong>
          <StockBadge product={product} className="self-start px-2 py-px text-[11.5px]" />
          <span className="mt-0.5 flex items-end justify-between gap-2">
            <PriceBlock product={product} size="sm" tone="cream" withPromoLabel={false} muted={!buyable} />
            {action}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      role="listitem"
      className={cn(
        "flex flex-col overflow-hidden rounded-[18px] border-[1.5px] bg-em-card",
        active ? "border-em-accent" : "border-em-line",
      )}
    >
      <div className="relative h-[132px] overflow-hidden bg-[#120B08]">
        <ProductImage product={product} />
        <StockBadge product={product} className="absolute left-[9px] top-[9px] px-[9px] py-0.5 text-[11.5px]" />
        {info.percent && (
          <span className="absolute right-[9px] top-[9px] rounded-full bg-em-accent px-[9px] py-0.5 text-[11.5px] font-extrabold text-em-on-accent">
            −{info.percent}%
          </span>
        )}
      </div>
      <div className="flex grow flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-em-faint">{categoryLabel(t, product.categoryLabel)}</span>
        <strong className="text-[14.5px] leading-snug">{product.name}</strong>
        <span className="text-[12.5px] text-em-muted">
          {product.specs
            .slice(0, 3)
            .map((s) => specValue(t, s.value))
            .join(" · ")}
        </span>
        <PriceBlock product={product} className="mt-auto pt-1" muted={!buyable} />
        {action}
      </div>
    </div>
  );
}

export function ProductList({ products, activeId }: { products: Product[]; activeId?: number }) {
  const { variant } = useChatSurface();
  const { t } = useI18n();
  if (products.length === 0) return null;
  return (
    <div
      role="list"
      aria-label={t.product.listLabel}
      className={cn(
        variant === "widget" ? "flex flex-col gap-2" : "grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] gap-3",
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} active={variant === "full" && p.id === activeId} />
      ))}
    </div>
  );
}
