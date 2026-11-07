"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { CARD_IMAGES, type Finish } from "@/lib/catalog";
import { FEATURED } from "@/lib/featured";

const PHOTOS: Finish[] = ["natural", "spruce", "uke"];

/** 04 / Em cada detalhe (creme): galeria + fatos das políticas da loja (seções 4, 5 e 8 do manual). */
export function Gallery() {
  const { t } = useI18n();
  const g = t.gallery;
  return (
    <section className="border-t border-em-line bg-em-cream py-28 text-em-ink max-[640px]:py-16">
      <div className="em-wrap flex flex-col gap-14">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-x-16 gap-y-6 max-[900px]:grid-cols-1">
          <div className="flex flex-col">
            <span className="font-mono text-[10.5px] tracking-[0.14em] text-em-ink-muted">{g.label}</span>
            <h2 className="mb-0 mt-5 whitespace-pre-line font-display text-[clamp(36px,3.9vw,54px)] font-bold leading-[1.02] tracking-[-0.03em]">
              {g.title}
            </h2>
          </div>
          <p className="m-0 max-w-[420px] text-sm leading-relaxed text-em-ink-2">{g.body}</p>
        </div>

        <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 max-[800px]:grid-cols-1">
          {PHOTOS.map((finish, i) => (
            <li key={finish} className="flex flex-col gap-4">
              <div className="aspect-[1.1] overflow-hidden rounded-[14px] bg-[#1C120D]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CARD_IMAGES[finish]}
                  alt={FEATURED[finish].name}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                />
              </div>
              <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-y-1">
                <span className="pt-1 font-mono text-[10px] text-em-ink-muted">0{i + 1}</span>
                <strong className="text-[16px] font-semibold">{g.photos[i]}</strong>
                <span />
                <span className="text-[13px] text-em-ink-2">{FEATURED[finish].name}</span>
              </div>
            </li>
          ))}
        </ul>

        <ul className="m-0 grid list-none grid-cols-3 gap-x-8 gap-y-8 border-t border-em-cream-line p-0 pt-8 max-[800px]:grid-cols-1">
          {g.facts.map((f) => (
            <li key={f.title} className="flex flex-col gap-2">
              <strong className="text-sm font-semibold">{f.title}</strong>
              <span className="text-[13px] leading-relaxed text-em-ink-2">{f.text}</span>
              <span className="text-xs text-em-ink-muted">{f.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
