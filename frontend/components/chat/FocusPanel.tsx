"use client";

import { Bell, Check, MoveHorizontal, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Instrument3D } from "@/components/instrument/Instrument3D";
import { PriceBlock } from "@/components/ui/PriceBlock";
import { StockBadge } from "@/components/ui/StockBadge";
import { useI18n } from "@/components/i18n/I18nProvider";
import { FINISH_POSE, isBuyable, type Product } from "@/lib/catalog";
import { specLabel, specValue } from "@/lib/i18n/text";
import { useEmChat } from "./ChatProvider";
import { ProductImage } from "./parts/ProductCard";

/** Painel "Em foco": produto em 360° + ficha técnica. */
export function FocusPanel({ product, stageHeight = 430 }: { product: Product; stageHeight?: number }) {
  const { sendText, addToCart } = useEmChat();
  const { t } = useI18n();
  const [added, setAdded] = useState<number | null>(null);
  const [notify, setNotify] = useState<number | null>(null);
  const buyable = isBuyable(product);
  const pose = product.finish ? FINISH_POSE[product.finish] : null;
  const short = product.ghost ?? product.name.split(" ").slice(0, 2).join(" ");

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[18px]">
        <span className="label-mono text-em-muted">{t.chat.focus}</span>
        {product.finish && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-em-faint">
            <MoveHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
            {t.viewer.drag}
          </span>
        )}
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-x-[12%] inset-y-[14%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,122,69,0.14),rgba(255,122,69,0))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[34%] overflow-hidden whitespace-nowrap text-center font-display text-[92px] font-extrabold tracking-[-0.05em] text-[rgba(244,233,220,0.045)] [[data-theme=light]_&]:text-[rgba(59,30,20,0.06)]"
        >
          {short}
        </div>
        {product.finish && pose ? (
          <Instrument3D
            finish={product.finish}
            frame={pose.frame}
            tilt={pose.tilt}
            scale={pose.scale}
            height={stageHeight}
            autoSpin
          />
        ) : (
          <div className="relative mx-5 my-6 aspect-[4/3] overflow-hidden rounded-2xl">
            <ProductImage product={product} iconSize={72} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5 px-5 pb-5 pt-1">
        <div className="flex flex-col gap-1.5">
          <StockBadge product={product} className="self-start" />
          <h2 className="m-0 font-display text-2xl font-bold leading-[1.1]">{product.name}</h2>
        </div>
        <PriceBlock product={product} layout="inline" size="lg" />
        {product.specs.length > 0 && (
          <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] border-t border-em-line">
            {product.specs.map((s) => (
              <div key={s.label} className="contents">
                <dt className="border-b border-em-line py-[9px] font-mono text-[11px] uppercase tracking-[0.1em] text-em-faint">
                  {specLabel(t, s.label)}
                </dt>
                <dd className="m-0 border-b border-em-line py-[9px] text-sm">{specValue(t, s.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {buyable ? (
          <button
            type="button"
            onClick={() => {
              addToCart(1);
              setAdded(product.id);
            }}
            className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[#F4E9DC] text-[15px] font-bold text-[#1F0F08] [[data-theme=light]_&]:bg-em-accent"
          >
            {added === product.id ? <Check size={17} aria-hidden="true" /> : <ShoppingBag size={17} strokeWidth={1.9} aria-hidden="true" />}
            <span aria-live="polite">{added === product.id ? t.product.added : t.product.addToBag}</span>
          </button>
        ) : (
          product.status === "active" && (
            <button
              type="button"
              onClick={() => setNotify(product.id)}
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-em-line-strong text-[15px] font-bold text-em-text"
            >
              {notify === product.id ? <Check size={17} aria-hidden="true" /> : <Bell size={17} strokeWidth={1.8} aria-hidden="true" />}
              <span aria-live="polite">{notify === product.id ? t.product.notifyDone : t.product.notifyLong}</span>
            </button>
          )
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => sendText(t.product.compareAsk(product.name))}
            className="h-[42px] rounded-xl border border-em-line-strong text-[13px] font-semibold text-em-text"
          >
            {t.product.compare}
          </button>
          <button
            type="button"
            onClick={() => sendText(t.product.askAbout(product.name))}
            className="h-[42px] rounded-xl border border-em-line-strong text-[13px] font-semibold text-em-text"
          >
            {t.product.askAboutIt}
          </button>
        </div>
      </div>
    </div>
  );
}
